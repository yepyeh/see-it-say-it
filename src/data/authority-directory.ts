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
	E08000025: {
		name: 'Birmingham City Council',
		slug: 'birmingham-city-council',
		reportUrl: 'https://www.birmingham.gov.uk/homepage/92/report_road_and_pavement_issues',
		preferredDestination: 'webform',
	},
	E08000035: {
		name: 'Leeds City Council',
		slug: 'leeds-city-council',
		reportUrl:
			'https://www.leeds.gov.uk/parking-roads-and-travel/report-an-issue-with-a-road-or-pavement',
		preferredDestination: 'webform',
	},
	E08000007: {
		name: 'Stockport Metropolitan Borough Council',
		slug: 'stockport-council',
		reportUrl: 'https://www.stockport.gov.uk/topic/reporting-issues',
		preferredDestination: 'webform',
	},
	E08000012: {
		name: 'Liverpool City Council',
		slug: 'liverpool-city-council',
		reportUrl: 'https://liverpool.gov.uk/parking-roads-and-travel/report-an-issue/',
		preferredDestination: 'webform',
	},
	E08000021: {
		name: 'Newcastle City Council',
		slug: 'newcastle-city-council',
		reportUrl: 'https://new.newcastle.gov.uk/travel/report',
		preferredDestination: 'webform',
	},
	E08000019: {
		name: 'Sheffield City Council',
		slug: 'sheffield-city-council',
		reportUrl: 'https://www.sheffield.gov.uk/parking-roads/report-problem-road-pavement',
		preferredDestination: 'webform',
	},
	E08000026: {
		name: 'Coventry City Council',
		slug: 'coventry-city-council',
		reportUrl: 'https://www.coventry.gov.uk/report-road-highway-problem',
		preferredDestination: 'webform',
	},
	E07000008: {
		name: 'Cambridge City Council',
		slug: 'cambridge-city-council',
		reportUrl: 'https://www.cambridge.gov.uk/report-it',
		preferredDestination: 'webform',
	},
	E06000018: {
		name: 'Nottingham City Council',
		slug: 'nottingham-city-council',
		reportUrl: 'https://www.nottinghamcity.gov.uk/report-it/',
		preferredDestination: 'webform',
	},
	E06000022: {
		name: 'Bath and North East Somerset Council',
		slug: 'bath-and-north-east-somerset-council',
		reportUrl: 'https://www.bathnes.gov.uk/report-it',
		preferredDestination: 'webform',
	},
	E06000045: {
		name: 'Southampton City Council',
		slug: 'southampton-city-council',
		reportUrl: 'https://www.southampton.gov.uk/travel-transport/report-problem-roads-pavements/',
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

export function getAuthorityDirectoryEntryBySlug(slug: string | null | undefined) {
	if (!slug) return null;
	return Object.values(authorityDirectory).find((entry) => entry.slug === slug) ?? null;
}
