import { authorityDirectory } from '../../data/authority-directory';
import { resolveDepartmentRoute } from '../../data/department-routing';
import { getDataBucket, getDB } from './db';

type BoundaryPoint = [number, number];
type BoundaryRing = BoundaryPoint[];
type BoundaryPolygon = BoundaryRing[];

type BoundaryFeature = {
	code: string;
	name: string;
	bbox: [number, number, number, number];
	polygons: BoundaryPolygon[];
};

type BoundaryDataset = {
	sourceName: string;
	sourceVersion: string;
	featureCount: number;
	features: BoundaryFeature[];
};

const BOUNDARY_KEY = 'boundaries/uk-lad-2024.min.json';
let boundaryDatasetPromise: Promise<BoundaryDataset | null> | null = null;

function pointInRing(latitude: number, longitude: number, ring: BoundaryRing) {
	let isInside = false;
	for (let first = 0, second = ring.length - 1; first < ring.length; second = first++) {
		const [firstLng, firstLat] = ring[first];
		const [secondLng, secondLat] = ring[second];
		const crosses =
			firstLat > latitude !== secondLat > latitude &&
			longitude <
				((secondLng - firstLng) * (latitude - firstLat)) / ((secondLat - firstLat) || Number.EPSILON) +
					firstLng;
		if (crosses) isInside = !isInside;
	}
	return isInside;
}

function pointInPolygon(latitude: number, longitude: number, polygon: BoundaryPolygon) {
	if (!polygon.length) return false;
	if (!pointInRing(latitude, longitude, polygon[0])) return false;
	for (const hole of polygon.slice(1)) {
		if (pointInRing(latitude, longitude, hole)) return false;
	}
	return true;
}

async function loadBoundaryDataset(locals: App.Locals) {
	if (!boundaryDatasetPromise) {
		boundaryDatasetPromise = (async () => {
			const object = await getDataBucket(locals).get(BOUNDARY_KEY);
			if (!object) return null;
			return (await object.json()) as BoundaryDataset;
		})();
	}
	return boundaryDatasetPromise;
}

async function ensureAuthorityRecord(
	locals: App.Locals,
	feature: BoundaryFeature,
	sourceVersion: string,
) {
	const db = getDB(locals);
	const directoryEntry =
		authorityDirectory[feature.code as keyof typeof authorityDirectory] ?? null;
	const code = directoryEntry?.slug ?? feature.code.toLowerCase();
	const contactEmail = directoryEntry?.email ?? null;
	const reportUrl = directoryEntry?.reportUrl ?? null;
	const preferredDestination = directoryEntry?.preferredDestination ?? (contactEmail ? 'email' : 'webform');
	const routingMode =
		preferredDestination === 'webform' && reportUrl
			? 'webform'
			: contactEmail
				? 'email'
				: reportUrl
					? 'webform'
					: 'manual';
	const existing = await db
		.prepare(
			'SELECT authority_id AS authorityId FROM authorities WHERE authority_id = ? OR code = ? LIMIT 1',
		)
		.bind(`lad-${feature.code.toLowerCase()}`, code)
		.first<{ authorityId: string }>();
	const authorityId = existing?.authorityId ?? `lad-${feature.code.toLowerCase()}`;

	await db
		.prepare(
			`INSERT INTO authorities (
				authority_id,
				country_code,
				code,
				name,
				authority_type,
				contact_email,
				routing_mode,
				is_active
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(authority_id) DO UPDATE SET
				code = excluded.code,
				name = excluded.name,
				contact_email = COALESCE(excluded.contact_email, authorities.contact_email),
				updated_at = CURRENT_TIMESTAMP`,
		)
		.bind(authorityId, 'GB', code, feature.name, 'council', contactEmail, routingMode, 1)
		.run();

	await db
		.prepare(
			`INSERT INTO boundary_sets (
				boundary_set_id,
				country_code,
				authority_id,
				source_name,
				source_version,
				storage_key
			) VALUES (?, ?, ?, ?, ?, ?)
			ON CONFLICT(boundary_set_id) DO UPDATE SET
				source_version = excluded.source_version,
				storage_key = excluded.storage_key`,
		)
		.bind(
			`lad-${feature.code.toLowerCase()}-${sourceVersion}`,
			'GB',
			authorityId,
			'ONS LAD 2024',
			sourceVersion,
			BOUNDARY_KEY,
		)
		.run();

	return {
		authorityId,
		code,
		name: feature.name,
		contactEmail,
		reportUrl,
		routingMode,
	};
}

export async function resolveAuthorityByPoint(
	locals: App.Locals,
	latitude: number,
	longitude: number,
) {
	const dataset = await loadBoundaryDataset(locals);
	if (!dataset) return null;

	for (const feature of dataset.features) {
		const [minLng, minLat, maxLng, maxLat] = feature.bbox;
		if (
			longitude < minLng ||
			longitude > maxLng ||
			latitude < minLat ||
			latitude > maxLat
		) {
			continue;
		}

		if (feature.polygons.some((polygon) => pointInPolygon(latitude, longitude, polygon))) {
			const authority = await ensureAuthorityRecord(locals, feature, dataset.sourceVersion);
			return {
				...authority,
				gssCode: feature.code,
				sourceName: dataset.sourceName,
				sourceVersion: dataset.sourceVersion,
			};
		}
	}

	return null;
}

export async function resolveIssueRouting(
	locals: App.Locals,
	input: {
		latitude: number;
		longitude: number;
		groupId?: string | null;
		categoryId?: string | null;
	},
) {
	const authority = await resolveAuthorityByPoint(locals, input.latitude, input.longitude);
	const departmentRoute = resolveDepartmentRoute(input.groupId, input.categoryId);

	if (!authority) {
		return {
			state: 'unknown' as const,
			authority: null,
			departmentRoute,
			destinationType: null,
			destinationTarget: null,
		};
	}

	const destinationType =
		authority.routingMode === 'webform' && authority.reportUrl
			? ('webform' as const)
			: authority.contactEmail
				? ('email' as const)
				: authority.reportUrl
					? ('webform' as const)
					: null;
	const destinationTarget =
		destinationType === 'webform'
			? authority.reportUrl
			: destinationType === 'email'
				? authority.contactEmail
				: authority.contactEmail ?? authority.reportUrl ?? null;

	return {
		state: destinationTarget ? ('verified' as const) : ('unverified' as const),
		authority,
		departmentRoute,
		destinationType,
		destinationTarget,
	};
}

export async function getBoundaryDatasetMeta(locals: App.Locals) {
	const dataset = await loadBoundaryDataset(locals);
	if (!dataset) return null;
	return {
		sourceName: dataset.sourceName,
		sourceVersion: dataset.sourceVersion,
		featureCount: dataset.featureCount,
	};
}
