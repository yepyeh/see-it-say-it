const form = document.querySelector('[data-report-form]');
const steps = Array.from(document.querySelectorAll('[data-step]'));
const nextButtons = Array.from(document.querySelectorAll('[data-next-step]'));
const prevButtons = Array.from(document.querySelectorAll('[data-prev-step]'));
const summary = document.querySelector('[data-summary]');
const statusBox = document.querySelector('[data-submit-status]');
const draftButton = document.querySelector('[data-save-draft]');
const locationButton = document.querySelector('[data-detect-location]');
const queuedBadge = document.querySelector('[data-queued-badge]');
const DRAFT_KEY = 'see-it-say-it:report-draft';

let currentStep = 0;

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

async function queueReport(payload) {
	const db = await openDraftDatabase();
	await new Promise((resolve, reject) => {
		const tx = db.transaction('queued-reports', 'readwrite');
		tx.objectStore('queued-reports').put({
			id: crypto.randomUUID(),
			payload,
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
	summary.innerHTML = `
		<div><strong>Reporter</strong><p>${payload.name || 'Anonymous'}${payload.email ? `, ${payload.email}` : ''}</p></div>
		<div><strong>Category</strong><p>${payload.category || 'Not selected yet'}</p></div>
		<div><strong>Location</strong><p>${payload.locationLabel || `${payload.latitude || 0}, ${payload.longitude || 0}`}</p></div>
		<div><strong>Description</strong><p>${payload.description || 'No description yet'}</p></div>
		<div><strong>Severity</strong><p>${payload.severity}</p></div>
	`;
}

async function detectLocation() {
	if (!navigator.geolocation || !form) return;
	statusBox.textContent = 'Detecting location...';
	navigator.geolocation.getCurrentPosition(
		(position) => {
			form.elements.namedItem('latitude').value = position.coords.latitude.toFixed(6);
			form.elements.namedItem('longitude').value = position.coords.longitude.toFixed(6);
			if (!form.elements.namedItem('locationLabel').value) {
				form.elements.namedItem('locationLabel').value = 'Current device location';
			}
			updateSummary();
			statusBox.textContent = 'Location captured.';
		},
		() => {
			statusBox.textContent = 'Location permission was denied. You can still type coordinates manually.';
		},
		{ enableHighAccuracy: true, timeout: 8000 },
	);
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

form?.addEventListener('input', () => {
	persistDraft();
	updateSummary();
});

form?.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (!form) return;
	const payload = formDataToPayload(form);
	statusBox.textContent = 'Submitting report...';
	if (!navigator.onLine) {
		await queueReport(payload);
		localStorage.removeItem(DRAFT_KEY);
		if (queuedBadge) queuedBadge.hidden = false;
		window.location.href = '/my-reports?queued=1';
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
setStep(0);
updateSummary();
flushQueuedReports();
