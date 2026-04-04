export type AuthorityDirectoryEntry = {
	name: string;
	slug: string;
	email?: string;
	reportUrl?: string;
	preferredDestination?: 'email' | 'webform';
};

export const authorityDirectory: Record<string, AuthorityDirectoryEntry> = {
	E06000023: {
		name: 'Bristol City Council',
		slug: 'bristol-city-council',
		email: 'highways@bristol.gov.uk',
		reportUrl: 'https://www.bristol.gov.uk/residents/streets-travel/report-a-street-issue',
		preferredDestination: 'webform',
	},
	E09000033: {
		name: 'Westminster City Council',
		slug: 'westminster-city-council',
		email: 'streetcare@westminster.gov.uk',
		reportUrl: 'https://www.westminster.gov.uk/report-it-service',
		preferredDestination: 'webform',
	},
	E08000003: {
		name: 'Manchester City Council',
		slug: 'manchester-city-council',
		email: 'environment@manchester.gov.uk',
		reportUrl: 'https://www.manchester.gov.uk/roads-and-transport/road-and-pavement-problems',
		preferredDestination: 'webform',
	},
	E08000007: {
		name: 'Stockport Metropolitan Borough Council',
		slug: 'stockport-council',
		reportUrl: 'https://www.stockport.gov.uk/topic/reporting-issues',
		preferredDestination: 'webform',
	},
	E07000008: {
		name: 'Cambridge City Council',
		slug: 'cambridge-city-council',
		reportUrl: 'https://www.cambridge.gov.uk/report-it',
		preferredDestination: 'webform',
	},
	E06000022: {
		name: 'Bath and North East Somerset Council',
		slug: 'bath-and-north-east-somerset-council',
		reportUrl: 'https://www.bathnes.gov.uk/report-it',
		preferredDestination: 'webform',
	},
	S12000036: {
		name: 'The City of Edinburgh Council',
		slug: 'city-of-edinburgh-council',
		reportUrl: 'https://www.edinburgh.gov.uk/report',
		preferredDestination: 'webform',
	},
	W06000015: {
		name: 'Cardiff Council',
		slug: 'cardiff-council',
	},
};

export type AuthorityDirectoryCode = keyof typeof authorityDirectory;
