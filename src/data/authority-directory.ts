export type AuthorityDirectoryEntry = {
	name: string;
	slug: string;
	email?: string;
	reportUrl?: string;
};

export const authorityDirectory: Record<string, AuthorityDirectoryEntry> = {
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
		reportUrl: 'https://www.stockport.gov.uk/topic/reporting-issues',
	},
	E07000008: {
		name: 'Cambridge City Council',
		slug: 'cambridge-city-council',
		reportUrl: 'https://www.cambridge.gov.uk/report-it',
	},
	E06000022: {
		name: 'Bath and North East Somerset Council',
		slug: 'bath-and-north-east-somerset-council',
		reportUrl: 'https://www.bathnes.gov.uk/report-it',
	},
	S12000036: {
		name: 'The City of Edinburgh Council',
		slug: 'city-of-edinburgh-council',
		reportUrl: 'https://www.edinburgh.gov.uk/report',
	},
	W06000015: {
		name: 'Cardiff Council',
		slug: 'cardiff-council',
	},
};

export type AuthorityDirectoryCode = keyof typeof authorityDirectory;
