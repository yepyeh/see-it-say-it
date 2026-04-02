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
} as const;

export type AuthorityDirectoryCode = keyof typeof authorityDirectory;
