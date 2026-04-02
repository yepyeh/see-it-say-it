const CACHE_NAME = 'see-it-say-it-v1';
const SHELL_PATHS = ['/', '/report', '/reports', '/my-reports', '/brief', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_PATHS)).then(() => self.skipWaiting()),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

function openDraftDatabase() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open('see-it-say-it', 1);
		request.onupgradeneeded = () => {
			request.result.createObjectStore('queued-reports', { keyPath: 'id' });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function getQueuedReports() {
	const db = await openDraftDatabase();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('queued-reports', 'readonly');
		const request = tx.objectStore('queued-reports').getAll();
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function deleteQueuedReport(id) {
	const db = await openDraftDatabase();
	return new Promise((resolve, reject) => {
		const tx = db.transaction('queued-reports', 'readwrite');
		tx.objectStore('queued-reports').delete(id);
		tx.oncomplete = () => resolve(true);
		tx.onerror = () => reject(tx.error);
	});
}

async function flushReports() {
	const queued = await getQueuedReports();
	for (const item of queued) {
		const response = await fetch('/api/reports', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify(item.payload),
		});
		if (response.ok) {
			await deleteQueuedReport(item.id);
		}
	}
}

self.addEventListener('sync', (event) => {
	if (event.tag === 'flush-reports') {
		event.waitUntil(flushReports());
	}
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'flush-reports' || event.data?.type === 'queue-report') {
		event.waitUntil(flushReports());
	}
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					return response;
				})
				.catch(async () => (await caches.match(request)) ?? caches.match('/')),
		);
		return;
	}
	if (url.origin === self.location.origin) {
		event.respondWith(
			caches.match(request).then(
				(cached) =>
					cached ??
					fetch(request).then((response) => {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
						return response;
					}),
			),
		);
	}
});
