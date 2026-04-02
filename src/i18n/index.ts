import enGB from './en-GB';
import { appConfig, type AppLocale } from '../config/app';

const dictionaries = {
	'en-GB': enGB,
} as const;

export function getDictionary(locale: AppLocale = appConfig.defaultLocale) {
	return dictionaries[locale];
}

export function t(key: keyof typeof enGB, locale: AppLocale = appConfig.defaultLocale) {
	return getDictionary(locale)[key];
}
