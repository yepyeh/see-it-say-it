export const authorityDirectory = {
	E06000023: {
		name: 'Bristol City Council',
		slug: 'bristol-city-council',
		email: 'highways@bristol.gov.uk',
	},
	E09000033: {
		name: 'Westminster City Council',
		slug: 'westminster-city-council',
		email: 'streetcare@westminster.gov.uk',
	},
	E08000003: {
		name: 'Manchester City Council',
		slug: 'manchester-city-council',
		email: 'environment@manchester.gov.uk',
	},
	E08000007: {
		name: 'Stockport Metropolitan Borough Council',
		slug: 'stockport-council',
	},
	E07000008: {
		name: 'Cambridge City Council',
		slug: 'cambridge-city-council',
	},
	S12000036: {
		name: 'The City of Edinburgh Council',
		slug: 'city-of-edinburgh-council',
	},
	W06000015: {
		name: 'Cardiff Council',
		slug: 'cardiff-council',
	},
} as const;

export type AuthorityDirectoryCode = keyof typeof authorityDirectory;
