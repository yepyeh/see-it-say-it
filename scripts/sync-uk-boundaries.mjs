import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DATASET_URL =
	'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_December_2024_Boundaries_UK_BGC/FeatureServer/0/query?where=1%3D1&outFields=LAD24CD%2CLAD24NM&outSR=4326&f=geojson';

function toPolygon(geometry) {
	if (!geometry) return [];
	if (geometry.type === 'Polygon') return [geometry.coordinates];
	if (geometry.type === 'MultiPolygon') return geometry.coordinates;
	return [];
}

function computeBBox(polygon) {
	let minLng = Infinity;
	let minLat = Infinity;
	let maxLng = -Infinity;
	let maxLat = -Infinity;

	for (const ring of polygon) {
		for (const [lng, lat] of ring) {
			minLng = Math.min(minLng, lng);
			minLat = Math.min(minLat, lat);
			maxLng = Math.max(maxLng, lng);
			maxLat = Math.max(maxLat, lat);
		}
	}

	return [minLng, minLat, maxLng, maxLat];
}

function mergeBBoxes(boxes) {
	return boxes.reduce(
		(accumulator, box) => [
			Math.min(accumulator[0], box[0]),
			Math.min(accumulator[1], box[1]),
			Math.max(accumulator[2], box[2]),
			Math.max(accumulator[3], box[3]),
		],
		[Infinity, Infinity, -Infinity, -Infinity],
	);
}

function normaliseFeature(feature) {
	const polygons = toPolygon(feature.geometry);
	const polygonBBoxes = polygons.map(computeBBox);
	return {
		code: feature.properties.LAD24CD,
		name: feature.properties.LAD24NM,
		bbox: mergeBBoxes(polygonBBoxes),
		polygons,
	};
}

const response = await fetch(DATASET_URL, {
	headers: {
		'accept': 'application/geo+json, application/json',
	},
});

if (!response.ok) {
	throw new Error(`Unable to download ONS LAD boundaries: ${response.status}`);
}

const geojson = await response.json();
const features = geojson.features.map(normaliseFeature);

const output = {
	sourceName: 'ONS Local Authority Districts (December 2024) Boundaries UK BGC',
	sourceVersion: '2024-12',
	downloadedAt: new Date().toISOString(),
	featureCount: features.length,
	features,
};

const outputDir = join(process.cwd(), '.generated');
await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, 'uk-lad-2024.min.json'), JSON.stringify(output));

console.log(
	JSON.stringify(
		{
			output: join(outputDir, 'uk-lad-2024.min.json'),
			featureCount: features.length,
			sourceName: output.sourceName,
			sourceVersion: output.sourceVersion,
		},
		null,
		2,
	),
);
