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
		categoryId: 'hazardous-waste',
		department: 'Hazardous waste and environmental response',
		queue: 'hazardous-waste',
		reason: 'Hazardous waste needs specialist waste or environmental response handling.',
	},
	{
		groupId: 'parks-open-spaces',
		categoryId: 'fallen-tree',
		department: 'Arboriculture and parks response',
		queue: 'parks-arboriculture',
		reason: 'Fallen trees are normally handled by arboriculture or parks emergency contractors.',
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
