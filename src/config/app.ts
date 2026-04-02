export const appConfig = {
	name: 'See It Say It',
	defaultLocale: 'en-GB',
	supportedLocales: ['en-GB'] as const,
	initialMarket: 'GB',
	expansionModel: 'global-ready',
} as const;

export type AppLocale = (typeof appConfig.supportedLocales)[number];
