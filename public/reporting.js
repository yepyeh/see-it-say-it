const form = document.querySelector('[data-report-form]');
const steps = Array.from(document.querySelectorAll('[data-step]'));
const nextButtons = Array.from(document.querySelectorAll('[data-next-step]'));
const prevButtons = Array.from(document.querySelectorAll('[data-prev-step]'));
const summary = document.querySelector('[data-summary]');
const statusBox = document.querySelector('[data-submit-status]');
const draftButton = document.querySelector('[data-save-draft]');
const locationButton = document.querySelector('[data-detect-location]');
const queuedBadge = document.querySelector('[data-queued-badge]');
const mapElement = document.querySelector('[data-location-map]');
const searchInput = document.querySelector('[data-location-search]');
const searchButton = document.querySelector('[data-search-location]');
const reverseGeocodeButton = document.querySelector('[data-reverse-geocode]');
const DRAFT_KEY = 'see-it-say-it:report-draft';

let currentStep = 0;
let locationMap = null;
let locationMarker = null;

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

async function queueReport(payload, queuedMedia) {
	const db = await openDraftDatabase();
	await new Promise((resolve, reject) => {
		const tx = db.transaction('queued-reports', 'readwrite');
		tx.objectStore('queued-reports').put({
			id: crypto.randomUUID(),
			payload,
			queuedMedia,
			queuedAt: new Date().toISOString(),
		});
		tx.oncomplete = () => resolve(true);
		tx.onerror = () => reject(tx.error);
	});
	if ('serviceWorker' in navigator) {
		const registration = await navigator.serviceWorker.ready;
		if ('sync' in registration) {
			try {
				await registration.sync.register('flush-reports');
			} catch (_error) {
				console.warn('Background sync registration failed.');
			}
		}
		if (navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({ type: 'queue-report' });
		}
	}
}

function getPhotoInput() {
	return form?.elements.namedItem('photo') ?? null;
}

function getSelectedFile() {
	const input = getPhotoInput();
	return input?.files?.[0] ?? null;
}

function formDataToPayload(formElement) {
	const data = new FormData(formElement);
	return {
		name: String(data.get('name') ?? ''),
		email: String(data.get('email') ?? ''),
		category: String(data.get('category') ?? ''),
		description: String(data.get('description') ?? ''),
		notesMarkdown: String(data.get('notesMarkdown') ?? ''),
		locationLabel: String(data.get('locationLabel') ?? ''),
		latitude: Number(data.get('latitude') ?? 0),
		longitude: Number(data.get('longitude') ?? 0),
		severity: Number(data.get('severity') ?? 3),
		sourceChannel: navigator.onLine ? 'web' : 'offline-queue',
	};
}

function setStep(stepIndex) {
	currentStep = Math.max(0, Math.min(stepIndex, steps.length - 1));
	steps.forEach((step, index) => {
		step.hidden = index !== currentStep;
	});
	if (currentStep === 1) {
		window.setTimeout(() => locationMap?.resize(), 0);
	}
	updateSummary();
}

function persistDraft() {
	if (!form) return;
	const payload = formDataToPayload(form);
	localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
}

function restoreDraft() {
	if (!form) return;
	const raw = localStorage.getItem(DRAFT_KEY);
	if (!raw) return;
	const payload = JSON.parse(raw);
	Object.entries(payload).forEach(([key, value]) => {
		const field = form.elements.namedItem(key);
		if (field && 'value' in field) field.value = String(value ?? '');
	});
}

function updateSummary() {
	if (!form || !summary) return;
	const payload = formDataToPayload(form);
	const selectedFile = getSelectedFile();
	summary.innerHTML = `
		<div><strong>Reporter</strong><p>${payload.name || 'Anonymous'}${payload.email ? `, ${payload.email}` : ''}</p></div>
		<div><strong>Category</strong><p>${payload.category || 'Not selected yet'}</p></div>
		<div><strong>Location</strong><p>${payload.locationLabel || `${payload.latitude || 0}, ${payload.longitude || 0}`}</p></div>
		<div><strong>Description</strong><p>${payload.description || 'No description yet'}</p></div>
		<div><strong>Severity</strong><p>${payload.severity}</p></div>
		<div><strong>Photo</strong><p>${selectedFile ? selectedFile.name : 'No image attached'}</p></div>
	`;
}

function setCoordinates(latitude, longitude, options = {}) {
	if (!form) return;
	form.elements.namedItem('latitude').value = Number(latitude).toFixed(6);
	form.elements.namedItem('longitude').value = Number(longitude).toFixed(6);
	if (locationMarker) {
		locationMarker.setLngLat([longitude, latitude]);
	}
	if (locationMap && options.center !== false) {
		locationMap.flyTo({ center: [longitude, latitude], zoom: Math.max(locationMap.getZoom(), 14) });
	}
	updateSummary();
}

async function reverseGeocodeLocation() {
	if (!form) return;
	const latitude = Number(form.elements.namedItem('latitude').value);
	const longitude = Number(form.elements.namedItem('longitude').value);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

	statusBox.textContent = 'Refreshing location label...';
	try {
		const response = await fetch(
			`https://photon.komoot.io/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
		);
		const payload = await response.json();
		const feature = payload.features?.[0];
		const props = feature?.properties ?? {};
		const label = [props.name, props.street, props.city, props.county].filter(Boolean).join(', ');
		if (label) {
			form.elements.namedItem('locationLabel').value = label;
			updateSummary();
		}
		statusBox.textContent = label ? 'Location label updated.' : 'Coordinates updated. Add a location label if needed.';
	} catch (_error) {
		statusBox.textContent = 'Unable to refresh the address label right now.';
	}
}

async function searchLocation() {
	if (!searchInput || !searchInput.value.trim()) return;
	statusBox.textContent = 'Searching location...';
	try {
		const response = await fetch(
			`https://photon.komoot.io/api/?q=${encodeURIComponent(searchInput.value.trim())}&limit=1`,
		);
		const payload = await response.json();
		const feature = payload.features?.[0];
		if (!feature) {
			statusBox.textContent = 'No matching location found.';
			return;
		}

		const [longitude, latitude] = feature.geometry.coordinates;
		const props = feature.properties ?? {};
		const label = [props.name, props.street, props.city, props.county].filter(Boolean).join(', ');
		setCoordinates(latitude, longitude);
		if (label && form) {
			form.elements.namedItem('locationLabel').value = label;
		}
		updateSummary();
		statusBox.textContent = 'Location found.';
	} catch (_error) {
		statusBox.textContent = 'Unable to search locations right now.';
	}
}

function initialiseMap() {
	if (!mapElement || !window.maplibregl || locationMap || !form) return;
	const latitude = Number(form.elements.namedItem('latitude').value || 51.454514);
	const longitude = Number(form.elements.namedItem('longitude').value || -2.58791);

	locationMap = new window.maplibregl.Map({
		container: mapElement,
		style: mapElement.dataset.mapStyle,
		center: [longitude, latitude],
		zoom: 13,
	});

	locationMap.addControl(new window.maplibregl.NavigationControl(), 'top-right');
	locationMarker = new window.maplibregl.Marker({ draggable: true })
		.setLngLat([longitude, latitude])
		.addTo(locationMap);

	locationMarker.on('dragend', () => {
		const lngLat = locationMarker.getLngLat();
		setCoordinates(lngLat.lat, lngLat.lng, { center: false });
		reverseGeocodeLocation();
	});
}

async function detectLocation() {
	if (!navigator.geolocation || !form) return;
	statusBox.textContent = 'Detecting location...';
	navigator.geolocation.getCurrentPosition(
		async (position) => {
			setCoordinates(position.coords.latitude, position.coords.longitude);
			await reverseGeocodeLocation();
			if (!form.elements.namedItem('locationLabel').value) {
				form.elements.namedItem('locationLabel').value = 'Current device location';
			}
			updateSummary();
		},
		() => {
			statusBox.textContent = 'Location permission was denied. You can still place the pin manually.';
		},
		{ enableHighAccuracy: true, timeout: 8000 },
	);
}

function fileToDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

async function uploadMediaFiles(files) {
	const media = [];
	for (const file of files) {
		const uploadBody = new FormData();
		uploadBody.set('file', file);
		const response = await fetch('/api/uploads/report-media', {
			method: 'POST',
			body: uploadBody,
		});
		const result = await response.json();
		if (!response.ok) {
			throw new Error(result.error ?? 'Unable to upload image.');
		}
		media.push(result.media);
	}
	return media;
}

async function flushQueuedReports() {
	if (!navigator.onLine) return;
	if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage({ type: 'flush-reports' });
	}
}

nextButtons.forEach((button) =>
	button.addEventListener('click', () => {
		persistDraft();
		setStep(currentStep + 1);
	}),
);

prevButtons.forEach((button) =>
	button.addEventListener('click', () => {
		persistDraft();
		setStep(currentStep - 1);
	}),
);

draftButton?.addEventListener('click', () => {
	persistDraft();
	statusBox.textContent = 'Draft saved on this device.';
});

locationButton?.addEventListener('click', detectLocation);
searchButton?.addEventListener('click', searchLocation);
reverseGeocodeButton?.addEventListener('click', reverseGeocodeLocation);

searchInput?.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') {
		event.preventDefault();
		searchLocation();
	}
});

form?.addEventListener('input', (event) => {
	persistDraft();
	updateSummary();
	if (event.target?.name === 'latitude' || event.target?.name === 'longitude') {
		const latitude = Number(form.elements.namedItem('latitude').value);
		const longitude = Number(form.elements.namedItem('longitude').value);
		if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
			setCoordinates(latitude, longitude);
		}
	}
});

form?.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (!form) return;
	const payload = formDataToPayload(form);
	const selectedFile = getSelectedFile();
	statusBox.textContent = 'Submitting report...';

	if (!navigator.onLine) {
		const queuedMedia = selectedFile
			? [
					{
						name: selectedFile.name,
						type: selectedFile.type,
						dataUrl: await fileToDataUrl(selectedFile),
					},
				]
			: [];
		await queueReport(payload, queuedMedia);
		localStorage.removeItem(DRAFT_KEY);
		if (queuedBadge) queuedBadge.hidden = false;
		window.location.href = '/auth?next=/my-reports%3Fqueued%3D1';
		return;
	}

	try {
		if (selectedFile) {
			payload.media = await uploadMediaFiles([selectedFile]);
		}
	} catch (error) {
		statusBox.textContent = error instanceof Error ? error.message : 'Unable to upload image.';
		return;
	}

	const response = await fetch('/api/reports', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify(payload),
	});

	const result = await response.json();
	if (!response.ok) {
		statusBox.textContent = result.error ?? 'Unable to submit report.';
		return;
	}

	localStorage.removeItem(DRAFT_KEY);
	window.location.href = result.reportUrl;
});

window.addEventListener('online', flushQueuedReports);

restoreDraft();
initialiseMap();
setStep(0);
updateSummary();
flushQueuedReports();
