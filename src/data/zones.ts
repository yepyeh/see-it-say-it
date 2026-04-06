export type ZoneDefinition = {
	slug: string;
	name: string;
	authorityCode: string;
	authorityName: string;
	countryCode: 'GB';
};

export const zoneDirectory: ZoneDefinition[] = [
	{
		slug: 'bristol',
		name: 'Bristol',
		authorityCode: 'bristol-city-council',
		authorityName: 'Bristol City Council',
		countryCode: 'GB',
	},
	{
		slug: 'westminster',
		name: 'Westminster',
		authorityCode: 'westminster-city-council',
		authorityName: 'Westminster City Council',
		countryCode: 'GB',
	},
	{
		slug: 'manchester',
		name: 'Manchester',
		authorityCode: 'manchester-city-council',
		authorityName: 'Manchester City Council',
		countryCode: 'GB',
	},
	{
		slug: 'bath',
		name: 'Bath and North East Somerset',
		authorityCode: 'bath-and-north-east-somerset-council',
		authorityName: 'Bath and North East Somerset Council',
		countryCode: 'GB',
	},
	{
		slug: 'edinburgh',
		name: 'Edinburgh',
		authorityCode: 'city-of-edinburgh-council',
		authorityName: 'The City of Edinburgh Council',
		countryCode: 'GB',
	},
];

export function getZoneBySlug(slug: string | null | undefined) {
	if (!slug) return null;
	return zoneDirectory.find((zone) => zone.slug === slug) ?? null;
}

export function getZoneByAuthorityCode(authorityCode: string | null | undefined) {
	if (!authorityCode) return null;
	return zoneDirectory.find((zone) => zone.authorityCode === authorityCode) ?? null;
}
