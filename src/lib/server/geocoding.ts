type GeocodeResult = {
	label: string;
	latitude: number;
	longitude: number;
};

type PhotonFeature = {
	geometry?: {
		coordinates?: [number, number];
	};
	properties?: Record<string, string | number | null | undefined>;
};

function buildLabel(properties: Record<string, string | number | null | undefined>) {
	return [
		properties.name,
		properties.housenumber,
		properties.street,
		properties.suburb,
		properties.city,
		properties.county,
	]
		.filter(Boolean)
		.join(', ');
}

function mapPhotonFeature(feature: PhotonFeature): GeocodeResult | null {
	const coordinates = feature.geometry?.coordinates;
	const properties = feature.properties ?? {};
	if (!coordinates || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') {
		return null;
	}

	const label = buildLabel(properties);
	return {
		label: label || `${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`,
		longitude: Number(coordinates[0].toFixed(6)),
		latitude: Number(coordinates[1].toFixed(6)),
	};
}

export async function searchPhoton(query: string) {
	const response = await fetch(
		`https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=5&lang=en`,
	);
	if (!response.ok) {
		throw new Error('Photon search request failed.');
	}
	const payload = (await response.json()) as { features?: PhotonFeature[] };
	return (payload.features ?? [])
		.map((feature) => mapPhotonFeature(feature))
		.filter((feature): feature is GeocodeResult => Boolean(feature));
}

export async function reversePhoton(latitude: number, longitude: number) {
	const response = await fetch(
		`https://photon.komoot.io/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&lang=en`,
	);
	if (!response.ok) {
		throw new Error('Photon reverse request failed.');
	}
	const payload = (await response.json()) as { features?: PhotonFeature[] };
	return mapPhotonFeature(payload.features?.[0] ?? {});
}
