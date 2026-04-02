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
