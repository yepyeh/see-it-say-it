const THEME_KEY = 'sis:theme';
const DENSITY_KEY = 'sis:density';
const ONBOARDING_KEY = 'sis:onboarding-complete';

function applyTheme(theme) {
	const resolvedTheme =
		theme === 'system'
			? window.matchMedia('(prefers-color-scheme: dark)').matches
				? 'dark'
				: 'light'
			: theme;
	document.documentElement.dataset.theme = resolvedTheme;
}

function applyDensity(density) {
	document.documentElement.dataset.density = density;
}

function bootPreferences() {
	const theme = localStorage.getItem(THEME_KEY) ?? 'system';
	const density = localStorage.getItem(DENSITY_KEY) ?? 'comfy';
	applyTheme(theme);
	applyDensity(density);

	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if ((localStorage.getItem(THEME_KEY) ?? 'system') === 'system') {
			applyTheme('system');
		}
	});
}

function maybePromptOnboarding() {
	if (localStorage.getItem(ONBOARDING_KEY) === '1') return;
	const path = window.location.pathname;
	if (path === '/onboarding' || path.startsWith('/api/')) return;
	document.querySelectorAll('[data-onboarding-cta]').forEach((link) => {
		link.hidden = false;
	});
}

bootPreferences();
maybePromptOnboarding();

if ('serviceWorker' in navigator) {
	window.addEventListener('load', async () => {
		try {
			const registration = await navigator.serviceWorker.register('/sw.js');
			if (navigator.onLine) {
				await registration.update();
				if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
					navigator.serviceWorker.controller.postMessage({ type: 'flush-reports' });
				}
			}
		} catch (error) {
			console.error('Service worker registration failed.', error);
		}
	});
}
