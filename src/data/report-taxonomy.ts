export type ReportSubcategory = {
	id: string;
	title: string;
	description: string;
	isEmergency?: boolean;
};

export type ReportCategoryGroup = {
	id: string;
	title: string;
	shortTitle: string;
	icon: string;
	description: string;
	subcategories: ReportSubcategory[];
};

export const reportTaxonomy: ReportCategoryGroup[] = [
	{
		id: 'roads-transport',
		title: 'Roads & Transport',
		shortTitle: 'Roads',
		icon: 'RD',
		description: 'Street surfaces, traffic assets, pavements, crossings, and obstructions.',
		subcategories: [
			{
				id: 'pothole',
				title: 'Pothole',
				description: 'Road surface damage affecting drivers, cyclists, or buses.',
			},
			{
				id: 'damaged-pavement',
				title: 'Damaged pavement',
				description: 'Broken slabs, uneven surfacing, or trip hazards on footpaths.',
			},
			{
				id: 'faulty-crossing',
				title: 'Faulty crossing',
				description: 'Signals, tactile paving, or crossing controls not working as expected.',
			},
			{
				id: 'blocked-route',
				title: 'Blocked route',
				description: 'Illegal parking, abandoned obstacles, or access blocked on the street.',
				isEmergency: true,
			},
		],
	},
	{
		id: 'environment-waste',
		title: 'Environment & Waste',
		shortTitle: 'Waste',
		icon: 'EW',
		description: 'Fly-tipping, overflowing bins, littering, and public cleanliness issues.',
		subcategories: [
			{
				id: 'fly-tipping',
				title: 'Fly-tipping',
				description: 'Dumped waste, furniture, or construction debris in public space.',
			},
			{
				id: 'overflowing-bin',
				title: 'Overflowing bin',
				description: 'Public bin is full and surrounding waste is spilling out.',
			},
			{
				id: 'street-litter',
				title: 'Street litter',
				description: 'Persistent littering or missed street cleaning.',
			},
			{
				id: 'hazardous-waste',
				title: 'Hazardous waste',
				description: 'Chemicals, needles, or suspicious waste needing urgent handling.',
				isEmergency: true,
			},
		],
	},
	{
		id: 'parks-open-spaces',
		title: 'Parks & Open Spaces',
		shortTitle: 'Parks',
		icon: 'PK',
		description: 'Play areas, green spaces, benches, trees, and park maintenance.',
		subcategories: [
			{
				id: 'damaged-play-equipment',
				title: 'Damaged play equipment',
				description: 'Broken swings, unsafe climbing frames, or damaged surfaces.',
				isEmergency: true,
			},
			{
				id: 'fallen-tree',
				title: 'Fallen tree',
				description: 'Tree debris blocking routes or creating danger in public space.',
				isEmergency: true,
			},
			{
				id: 'park-maintenance',
				title: 'Park maintenance',
				description: 'Grass cutting, planting, or neglected open space upkeep.',
			},
			{
				id: 'damaged-street-furniture',
				title: 'Damaged street furniture',
				description: 'Broken benches, rails, gates, or bollards in civic spaces.',
			},
		],
	},
	{
		id: 'public-safety',
		title: 'Public Safety',
		shortTitle: 'Safety',
		icon: 'SF',
		description: 'Lighting, urgent hazards, antisocial damage, and issues affecting safety.',
		subcategories: [
			{
				id: 'streetlight-out',
				title: 'Streetlight out',
				description: 'Street or path lighting not working, affecting safety after dark.',
			},
			{
				id: 'exposed-wires',
				title: 'Exposed wires',
				description: 'Electrical hazard or damaged cabinet requiring urgent attention.',
				isEmergency: true,
			},
			{
				id: 'unsafe-structure',
				title: 'Unsafe structure',
				description: 'Loose signs, leaning barriers, or unstable street assets.',
				isEmergency: true,
			},
			{
				id: 'graffiti-vandalism',
				title: 'Graffiti or vandalism',
				description: 'Damage to civic surfaces or public-facing property.',
			},
		],
	},
	{
		id: 'utilities-assets',
		title: 'Utilities & Assets',
		shortTitle: 'Utilities',
		icon: 'UT',
		description: 'Drains, water, manhole covers, cabinets, and street infrastructure.',
		subcategories: [
			{
				id: 'blocked-drain',
				title: 'Blocked drain',
				description: 'Drainage not clearing water, causing flooding or pooling.',
			},
			{
				id: 'water-leak',
				title: 'Water leak',
				description: 'Visible water loss from pipes, hydrants, or underground assets.',
			},
			{
				id: 'damaged-cover',
				title: 'Damaged manhole cover',
				description: 'Loose, broken, or missing access covers on public routes.',
				isEmergency: true,
			},
			{
				id: 'faulty-cabinet',
				title: 'Damaged utility cabinet',
				description: 'Broken doors, open access, or vandalised street cabinets.',
			},
		],
	},
	{
		id: 'cultural-heritage',
		title: 'Cultural Heritage',
		shortTitle: 'Heritage',
		icon: 'CH',
		description: 'Monuments, plaques, memorials, and culturally significant civic assets.',
		subcategories: [
			{
				id: 'damaged-monument',
				title: 'Damaged monument',
				description: 'Visible damage to memorials, sculptures, or civic markers.',
			},
			{
				id: 'plaque-maintenance',
				title: 'Plaque maintenance',
				description: 'Cleaning, repair, or legibility issues on plaques or markers.',
			},
			{
				id: 'heritage-vandalism',
				title: 'Heritage vandalism',
				description: 'Defacement or damage on listed or culturally important assets.',
			},
			{
				id: 'unsafe-heritage-asset',
				title: 'Unsafe heritage asset',
				description: 'Stonework, fixtures, or structures creating immediate risk.',
				isEmergency: true,
			},
		],
	},
];
