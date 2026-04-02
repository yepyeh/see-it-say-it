const CACHE_NAME = 'see-it-say-it-v2';
const SHELL_PATHS = ['/', '/report', '/reports', '/my-reports', '/brief', '/auth', '/manifest.webmanifest'];

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

function dataUrlToBlob(dataUrl) {
	const [header, payload] = dataUrl.split(',');
	const mimeType = header.match(/data:(.*?);base64/)?.[1] ?? 'application/octet-stream';
	const binary = atob(payload);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return new Blob([bytes], { type: mimeType });
}

async function uploadQueuedMedia(item) {
	const media = [];
	for (const entry of item.queuedMedia ?? []) {
		const formData = new FormData();
		formData.set('file', dataUrlToBlob(entry.dataUrl), entry.name || 'queued-image.jpg');
		const response = await fetch('/api/uploads/report-media', {
			method: 'POST',
			body: formData,
		});
		if (!response.ok) {
			throw new Error('Unable to upload queued media.');
		}
		const payload = await response.json();
		media.push(payload.media);
	}
	return media;
}

async function flushReports() {
	const queued = await getQueuedReports();
	for (const item of queued) {
		try {
			const payload = { ...item.payload };
			if (item.queuedMedia?.length) {
				payload.media = await uploadQueuedMedia(item);
			}

			const response = await fetch('/api/reports', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
				},
				body: JSON.stringify(payload),
			});
			if (response.ok) {
				await deleteQueuedReport(item.id);
			}
		} catch (_error) {
			// Keep the item queued for the next replay attempt.
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
