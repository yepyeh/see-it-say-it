export type DepartmentRoute = {
	groupId: string;
	categoryId?: string;
	department: string;
	queue: string;
	reason: string;
};

const categoryRoutes: DepartmentRoute[] = [
	{
		groupId: 'roads-transport',
		categoryId: 'pothole',
		department: 'Highways maintenance',
		queue: 'highways-maintenance',
		reason: 'Potholes usually sit with highways inspection and surfacing teams.',
	},
	{
		groupId: 'roads-transport',
		categoryId: 'damaged-pavement',
		department: 'Footway maintenance',
		queue: 'footway-maintenance',
		reason: 'Broken pavements and trip hazards usually sit with footway maintenance teams.',
	},
	{
		groupId: 'roads-transport',
		categoryId: 'faulty-crossing',
		department: 'Traffic signals and crossings',
		queue: 'highways-signals',
		reason: 'Crossing controls and signal faults usually sit with highways signals teams.',
	},
	{
		groupId: 'roads-transport',
		categoryId: 'blocked-route',
		department: 'Network management and street enforcement',
		queue: 'network-management',
		reason: 'Blocked routes usually need an enforcement or network-management response first.',
	},
	{
		groupId: 'environment-waste',
		categoryId: 'fly-tipping',
		department: 'Fly-tipping enforcement',
		queue: 'fly-tipping',
		reason: 'Dumped waste is often triaged through fly-tipping enforcement before generic cleansing.',
	},
	{
		groupId: 'environment-waste',
		categoryId: 'overflowing-bin',
		department: 'Public bins and street cleansing',
		queue: 'public-bins',
		reason: 'Overflowing bins usually sit with public-bin emptying routes or cleansing crews.',
	},
	{
		groupId: 'environment-waste',
		categoryId: 'street-litter',
		department: 'Street cleansing',
		queue: 'street-cleansing-litter',
		reason: 'Persistent littering and missed cleaning usually route to street cleansing operations.',
	},
	{
		groupId: 'environment-waste',
		categoryId: 'hazardous-waste',
		department: 'Hazardous waste and environmental response',
		queue: 'hazardous-waste',
		reason: 'Hazardous waste needs specialist waste or environmental response handling.',
	},
	{
		groupId: 'parks-open-spaces',
		categoryId: 'damaged-play-equipment',
		department: 'Play area safety',
		queue: 'play-equipment',
		reason: 'Unsafe play equipment normally needs a parks safety inspection route.',
	},
	{
		groupId: 'parks-open-spaces',
		categoryId: 'fallen-tree',
		department: 'Arboriculture and parks response',
		queue: 'parks-arboriculture',
		reason: 'Fallen trees are normally handled by arboriculture or parks emergency contractors.',
	},
	{
		groupId: 'parks-open-spaces',
		categoryId: 'park-maintenance',
		department: 'Parks maintenance',
		queue: 'parks-maintenance',
		reason: 'Routine open-space upkeep usually sits with parks maintenance crews.',
	},
	{
		groupId: 'parks-open-spaces',
		categoryId: 'damaged-street-furniture',
		department: 'Parks assets',
		queue: 'parks-assets',
		reason: 'Broken benches, rails, and bollards in open space usually route to parks asset teams.',
	},
	{
		groupId: 'public-safety',
		categoryId: 'streetlight-out',
		department: 'Street lighting',
		queue: 'street-lighting',
		reason: 'Streetlight faults are usually routed into the lighting maintenance queue.',
	},
	{
		groupId: 'public-safety',
		categoryId: 'exposed-wires',
		department: 'Public safety hazards',
		queue: 'public-safety-hazards',
		reason: 'Exposed electrical hazards need an urgent public-safety or contractor dispatch path.',
	},
	{
		groupId: 'public-safety',
		categoryId: 'unsafe-structure',
		department: 'Dangerous structures response',
		queue: 'dangerous-structures',
		reason: 'Loose signs, barriers, and unstable assets need dangerous structure triage.',
	},
	{
		groupId: 'public-safety',
		categoryId: 'graffiti-vandalism',
		department: 'Street scene enforcement',
		queue: 'street-scene-enforcement',
		reason: 'Graffiti and vandalism are usually routed through street scene or enforcement teams.',
	},
	{
		groupId: 'utilities-assets',
		categoryId: 'blocked-drain',
		department: 'Drainage and flooding',
		queue: 'drainage-flooding',
		reason: 'Blocked drains are usually triaged through drainage or flooding operations.',
	},
	{
		groupId: 'utilities-assets',
		categoryId: 'water-leak',
		department: 'Water network liaison',
		queue: 'water-network',
		reason: 'Visible leaks often require water utility liaison rather than a generic council inbox.',
	},
	{
		groupId: 'utilities-assets',
		categoryId: 'damaged-cover',
		department: 'Highways asset safety',
		queue: 'asset-safety',
		reason: 'Broken covers need urgent asset safety inspection because they can become immediate hazards.',
	},
	{
		groupId: 'utilities-assets',
		categoryId: 'faulty-cabinet',
		department: 'Utility liaison and street assets',
		queue: 'utility-cabinets',
		reason: 'Street cabinets often need a council-to-utility liaison or contracted asset route.',
	},
	{
		groupId: 'cultural-heritage',
		categoryId: 'damaged-monument',
		department: 'Heritage asset maintenance',
		queue: 'heritage-maintenance',
		reason: 'Visible damage to monuments usually needs a heritage asset maintenance route.',
	},
	{
		groupId: 'cultural-heritage',
		categoryId: 'plaque-maintenance',
		department: 'Civic markers and plaques',
		queue: 'heritage-plaques',
		reason: 'Plaques and markers usually sit with civic markers or heritage maintenance.',
	},
	{
		groupId: 'cultural-heritage',
		categoryId: 'heritage-vandalism',
		department: 'Heritage protection and street scene',
		queue: 'heritage-protection',
		reason: 'Defacement of heritage assets needs a heritage-aware enforcement or protection route.',
	},
	{
		groupId: 'cultural-heritage',
		categoryId: 'unsafe-heritage-asset',
		department: 'Dangerous heritage structures',
		queue: 'heritage-dangerous-structures',
		reason: 'Unsafe heritage stonework or fixtures need urgent dangerous-structure handling.',
	},
];

const groupRoutes: DepartmentRoute[] = [
	{
		groupId: 'roads-transport',
		department: 'Highways and transport',
		queue: 'highways',
		reason: 'Roads, pavements, and crossings usually sit with highways operations.',
	},
	{
		groupId: 'environment-waste',
		department: 'Street cleansing and waste',
		queue: 'street-cleansing',
		reason: 'Waste and street-cleanliness issues normally sit with cleansing or environmental services.',
	},
	{
		groupId: 'parks-open-spaces',
		department: 'Parks and green spaces',
		queue: 'parks',
		reason: 'Parks assets and open-space upkeep normally belong with parks services.',
	},
	{
		groupId: 'public-safety',
		department: 'Community safety and street scene',
		queue: 'community-safety',
		reason: 'Lighting, hazards, and street-scene safety issues need a public-safety oriented queue.',
	},
	{
		groupId: 'utilities-assets',
		department: 'Street assets and drainage',
		queue: 'street-assets',
		reason: 'Street infrastructure, drains, and utility-adjacent assets usually sit with asset maintenance.',
	},
	{
		groupId: 'cultural-heritage',
		department: 'Heritage and civic assets',
		queue: 'heritage-assets',
		reason: 'Heritage and memorial assets normally need a civic-assets or heritage maintenance route.',
	},
];

export function resolveDepartmentRoute(groupId?: string | null, categoryId?: string | null) {
	if (!groupId) return null;
	if (categoryId) {
		const categoryMatch = categoryRoutes.find(
			(route) => route.groupId === groupId && route.categoryId === categoryId,
		);
		if (categoryMatch) return categoryMatch;
	}
	return groupRoutes.find((route) => route.groupId === groupId) ?? null;
}
