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
const mapStage = document.querySelector('[data-map-stage]');
const searchInput = document.querySelector('[data-location-search]');
const searchButton = document.querySelector('[data-search-location]');
const reverseGeocodeButton = document.querySelector('[data-reverse-geocode]');
const routingBadge = document.querySelector('[data-routing-badge]');
const routingStateCard = document.querySelector('[data-routing-state-card]');
const routingStateChip = document.querySelector('[data-routing-state-chip]');
const routingStateTitle = document.querySelector('[data-routing-state-title]');
const routingStateCopy = document.querySelector('[data-routing-state-copy]');
const taxonomyElement = document.querySelector('[data-taxonomy]');
const taxonomyFeedback = document.querySelector('[data-taxonomy-feedback]');
const taxonomyBackButton = document.querySelector('[data-taxonomy-back]');
const taxonomySearch = document.querySelector('[data-taxonomy-search]');
const taxonomyBreadcrumb = document.querySelector('[data-taxonomy-breadcrumb]');
const subcategoryList = document.querySelector('[data-subcategory-list]');
const taxonomyEmpty = document.querySelector('[data-taxonomy-empty]');
const taxonomySheet = document.querySelector('[data-taxonomy-sheet]');
const taxonomyHandle = document.querySelector('[data-taxonomy-handle]');
const taxonomyExpandButton = document.querySelector('[data-taxonomy-expand]');
const emergencyCard = document.querySelector('[data-emergency-card]');
const drawerHandle = document.querySelector('[data-drawer-handle]');
const taxonomyDataElement = document.querySelector('[data-report-taxonomy]');
const DRAFT_KEY = 'see-it-say-it:report-draft';

const taxonomy = taxonomyDataElement ? JSON.parse(taxonomyDataElement.textContent || '[]') : [];
const taxonomyGroups = new Map(taxonomy.map((group) => [group.id, group]));

let currentStep = 0;
let locationMap = null;
let locationMarker = null;
let routingLookupToken = 0;
let routingState = { state: 'pending', authorityName: null, contactEmail: null };
let taxonomyView = 'groups';
let selectedGroupId = '';
let selectedCategoryId = '';
let drawerMode = 'half';
let dragStartY = null;
let dragStartMode = null;

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

function getFieldValue(name) {
	return form?.elements.namedItem(name)?.value ?? '';
}

function getSelectedCategoryMeta() {
	if (!selectedGroupId || !selectedCategoryId) return null;
	const group = taxonomyGroups.get(selectedGroupId);
	const category = group?.subcategories.find((item) => item.id === selectedCategoryId) ?? null;
	if (!group || !category) return null;
	return { group, category };
}

function isEmergencySelection() {
	const severity = Number(getFieldValue('severity') || 3);
	const categoryMeta = getSelectedCategoryMeta();
	return severity >= 5 || Boolean(categoryMeta?.category.isEmergency);
}

function setEmergencyState() {
	const isEmergency = isEmergencySelection();
	form?.setAttribute('data-emergency', isEmergency ? 'true' : 'false');
	if (emergencyCard) emergencyCard.hidden = !isEmergency;
	if (drawerHandle) drawerHandle.dataset.emergency = isEmergency ? 'true' : 'false';
}

function applyRoutingState(nextState) {
	routingState = nextState;
	const stateValue = nextState.state || 'pending';
	const title =
		stateValue === 'verified'
			? `${nextState.authorityName} confirmed`
			: stateValue === 'unverified'
				? `${nextState.authorityName} matched`
				: stateValue === 'unknown'
					? 'Jurisdiction still unknown'
					: 'Looking up the matching council';
	const copy =
		stateValue === 'verified'
			? 'The current pin resolves to a council with a verified contact destination.'
			: stateValue === 'unverified'
				? 'The council boundary is matched, but the department or contact route still needs refinement.'
				: stateValue === 'unknown'
					? 'The pin did not resolve to a confident authority yet. Submission still works, but this route needs review.'
					: 'The ONS routing result for this pin will appear here before submission.';
	const chip =
		stateValue === 'verified'
			? 'Verified LAD'
			: stateValue === 'unverified'
				? 'Unverified LAD'
				: stateValue === 'unknown'
					? 'Unknown zone'
					: 'Checking route';

	if (routingBadge) {
		routingBadge.dataset.routingState = stateValue;
		routingBadge.innerHTML = `<strong>${chip}</strong><p>${title}</p>`;
	}
	if (routingStateCard) routingStateCard.dataset.routingState = stateValue;
	if (routingStateChip) routingStateChip.textContent = chip;
	if (routingStateTitle) routingStateTitle.textContent = title;
	if (routingStateCopy) routingStateCopy.textContent = copy;
}

async function refreshRoutingState() {
	if (!form) return;
	const latitude = Number(form.elements.namedItem('latitude').value);
	const longitude = Number(form.elements.namedItem('longitude').value);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

	const token = ++routingLookupToken;
	applyRoutingState({ state: 'pending', authorityName: null, contactEmail: null });
	try {
		const response = await fetch(
			`/api/routing/resolve?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`,
		);
		const payload = await response.json();
		if (token !== routingLookupToken) return;
		const match = payload.match ?? null;
		if (!match) {
			applyRoutingState({ state: 'unknown', authorityName: null, contactEmail: null });
			return;
		}

		applyRoutingState({
			state: match.contactEmail ? 'verified' : 'unverified',
			authorityName: match.name,
			contactEmail: match.contactEmail ?? null,
		});
	} catch (_error) {
		if (token === routingLookupToken) {
			applyRoutingState({ state: 'unknown', authorityName: null, contactEmail: null });
		}
	}
}

function formDataToPayload(formElement) {
	const data = new FormData(formElement);
	return {
		name: String(data.get('name') ?? ''),
		email: String(data.get('email') ?? ''),
		groupId: String(data.get('groupId') ?? ''),
		categoryId: String(data.get('categoryId') ?? ''),
		category: String(data.get('category') ?? ''),
		description: String(data.get('description') ?? ''),
		notesMarkdown: String(data.get('notesMarkdown') ?? ''),
		locationLabel: String(data.get('locationLabel') ?? ''),
		latitude: Number(data.get('latitude') ?? 0),
		longitude: Number(data.get('longitude') ?? 0),
		severity: Number(data.get('severity') ?? 3),
		routingState: routingState.state,
		sourceChannel: navigator.onLine ? 'web' : 'offline-queue',
	};
}

function setDrawerMode(nextMode) {
	drawerMode = nextMode === 'full' ? 'full' : 'half';
	if (taxonomySheet) taxonomySheet.dataset.sheetMode = drawerMode;
	if (taxonomyExpandButton) {
		taxonomyExpandButton.textContent = drawerMode === 'full' ? 'Half height' : 'Expand';
	}
}

function vibrateLight() {
	try {
		navigator.vibrate?.(10);
	} catch (_error) {
		// Ignore unsupported vibration APIs.
	}
}

function setTaxonomyView(nextView) {
	taxonomyView = nextView;
	if (taxonomyElement) taxonomyElement.dataset.view = nextView;
	if (nextView === 'subcategories') {
		setDrawerMode('full');
		taxonomySearch?.focus({ preventScroll: true });
	}
}

function renderSubcategories(groupId, query = '') {
	if (!subcategoryList || !taxonomyEmpty) return;
	const group = taxonomyGroups.get(groupId);
	if (!group) return;

	const normalizedQuery = query.trim().toLowerCase();
	const categories = group.subcategories.filter((item) => {
		if (!normalizedQuery) return true;
		return `${item.title} ${item.description}`.toLowerCase().includes(normalizedQuery);
	});

	subcategoryList.innerHTML = categories
		.map(
			(item) => `
				<button
					class="taxonomy-subcategory-card"
					data-category-button
					data-group-id="${group.id}"
					data-category-id="${item.id}"
					data-emergency="${item.isEmergency ? 'true' : 'false'}"
					type="button"
				>
					<span class="taxonomy-subcategory-copy">
						<strong>${item.title}</strong>
						<span>${item.description}</span>
					</span>
					${item.isEmergency ? '<span class="taxonomy-subcategory-alert">Urgent</span>' : ''}
				</button>
			`,
		)
		.join('');

	taxonomyEmpty.hidden = categories.length > 0;
}

function syncSelectedGroupCards() {
	document.querySelectorAll('[data-group-button]').forEach((button) => {
		button.classList.toggle('is-selected', button.dataset.groupId === selectedGroupId);
	});
}

function chooseGroup(groupId) {
	const group = taxonomyGroups.get(groupId);
	if (!group) return;
	selectedGroupId = groupId;
	syncSelectedGroupCards();
	if (taxonomyBreadcrumb) taxonomyBreadcrumb.textContent = `${group.shortTitle} >`;
	if (taxonomyFeedback) taxonomyFeedback.textContent = `Choose the closest match within ${group.title}.`;
	renderSubcategories(groupId, taxonomySearch?.value ?? '');
	setTaxonomyView('subcategories');
	vibrateLight();
}

function chooseCategory(groupId, categoryId) {
	if (!form) return;
	const group = taxonomyGroups.get(groupId);
	const category = group?.subcategories.find((item) => item.id === categoryId) ?? null;
	if (!group || !category) return;

	selectedGroupId = groupId;
	selectedCategoryId = categoryId;
	form.elements.namedItem('groupId').value = group.id;
	form.elements.namedItem('categoryId').value = category.id;
	form.elements.namedItem('category').value = category.title;
	if (taxonomyFeedback) taxonomyFeedback.textContent = `Selected ${group.shortTitle} -> ${category.title}. Opening details…`;
	setEmergencyState();
	updateSummary();
	persistDraft();
	vibrateLight();
	window.setTimeout(() => setStep(3), 180);
}

function syncTaxonomyFromForm() {
	if (!form) return;
	selectedGroupId = String(form.elements.namedItem('groupId')?.value ?? '');
	selectedCategoryId = String(form.elements.namedItem('categoryId')?.value ?? '');
	if (selectedGroupId) {
		syncSelectedGroupCards();
		renderSubcategories(selectedGroupId, taxonomySearch?.value ?? '');
	}
	setEmergencyState();
}

function setStep(stepIndex) {
	currentStep = Math.max(0, Math.min(stepIndex, steps.length - 1));
	if (form) form.dataset.currentStep = String(currentStep);
	steps.forEach((step, index) => {
		step.hidden = index !== currentStep;
	});
	if (mapStage) {
		mapStage.hidden = currentStep !== 1 && currentStep !== 2;
	}
	if (currentStep === 1 || currentStep === 2) {
		window.setTimeout(() => locationMap?.resize(), 0);
	}
	if (currentStep !== 2) {
		setDrawerMode('half');
		setTaxonomyView('groups');
	}
	updateSummary();
	setEmergencyState();
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
	const categoryMeta = getSelectedCategoryMeta();
	summary.innerHTML = `
		<div><strong>Reporter</strong><p>${payload.name || 'Anonymous'}${payload.email ? `, ${payload.email}` : ''}</p></div>
		<div><strong>Category</strong><p>${payload.category ? `${categoryMeta?.group.title ?? 'Issue'} -> ${payload.category}` : 'Not selected yet'}</p></div>
		<div><strong>Location</strong><p>${payload.locationLabel || `${payload.latitude || 0}, ${payload.longitude || 0}`}</p></div>
		<div><strong>Routing state</strong><p>${routingState.state === 'verified' ? 'Verified LAD' : routingState.state === 'unverified' ? 'Unverified LAD' : routingState.state === 'unknown' ? 'Unknown zone' : 'Checking route'}</p></div>
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
	refreshRoutingState();
}

async function reverseGeocodeLocation() {
	if (!form || !statusBox) return;
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
	if (!searchInput || !searchInput.value.trim() || !statusBox) return;
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
	const archiveUrl = mapElement.dataset.mapArchiveUrl;

	if (archiveUrl && window.pmtiles && window.basemaps) {
		try {
			const protocol = new window.pmtiles.Protocol();
			window.maplibregl.addProtocol('pmtiles', protocol.tile);
			locationMap = new window.maplibregl.Map({
				container: mapElement,
				style: {
					version: 8,
					glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
					sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
					sources: {
						protomaps: {
							type: 'vector',
							url: `pmtiles://${window.location.origin}${archiveUrl}`,
							attribution:
								'<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
						},
					},
					layers: window.basemaps.layers(
						'protomaps',
						window.basemaps.namedFlavor('light'),
						{ lang: 'en' },
					),
				},
				center: [longitude, latitude],
				zoom: 13,
			});
		} catch (_error) {
			locationMap = null;
		}
	}

	if (!locationMap) {
		locationMap = new window.maplibregl.Map({
			container: mapElement,
			style: 'https://demotiles.maplibre.org/style.json',
			center: [longitude, latitude],
			zoom: 13,
		});
	}

	locationMap.addControl(new window.maplibregl.NavigationControl(), 'top-right');
	locationMarker = new window.maplibregl.Marker({ draggable: true })
		.setLngLat([longitude, latitude])
		.addTo(locationMap);

	locationMarker.on('dragend', () => {
		const lngLat = locationMarker.getLngLat();
		setCoordinates(lngLat.lat, lngLat.lng, { center: false });
		reverseGeocodeLocation();
	});

	locationMap.on('load', () => {
		refreshRoutingState();
	});
}

async function detectLocation() {
	if (!navigator.geolocation || !form || !statusBox) return;
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

function onTaxonomyClick(event) {
	const groupButton = event.target.closest('[data-group-button]');
	if (groupButton) {
		chooseGroup(groupButton.dataset.groupId || '');
		return;
	}

	const categoryButton = event.target.closest('[data-category-button]');
	if (categoryButton) {
		chooseCategory(categoryButton.dataset.groupId || '', categoryButton.dataset.categoryId || '');
	}
}

function onHandleKeydown(event) {
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault();
		setDrawerMode(drawerMode === 'half' ? 'full' : 'half');
	}
}

function onHandlePointerDown(event) {
	if (window.innerWidth > 1040) return;
	dragStartY = event.clientY;
	dragStartMode = drawerMode;
	taxonomyHandle?.setPointerCapture?.(event.pointerId);
}

function onHandlePointerMove(event) {
	if (dragStartY == null || !taxonomySheet) return;
	const delta = event.clientY - dragStartY;
	const resistance = dragStartMode === 'full' ? 1 : 0.55;
	taxonomySheet.style.transform = `translateY(${Math.max(-18, delta * resistance)}px)`;
}

function onHandlePointerUp(event) {
	if (dragStartY == null || !taxonomySheet) return;
	const delta = event.clientY - dragStartY;
	taxonomySheet.style.transform = '';
	taxonomyHandle?.releasePointerCapture?.(event.pointerId);
	if (delta > 80) {
		setDrawerMode('half');
	} else if (delta < -40) {
		setDrawerMode('full');
	}
	dragStartY = null;
	dragStartMode = null;
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
	if (statusBox) statusBox.textContent = 'Draft saved on this device.';
});

locationButton?.addEventListener('click', detectLocation);
searchButton?.addEventListener('click', searchLocation);
reverseGeocodeButton?.addEventListener('click', reverseGeocodeLocation);
taxonomyElement?.addEventListener('click', onTaxonomyClick);
taxonomyBackButton?.addEventListener('click', () => {
	setTaxonomyView('groups');
	if (taxonomyFeedback) taxonomyFeedback.textContent = 'Pick a Tier 1 group to keep the category flow fast on mobile.';
});
taxonomySearch?.addEventListener('input', () => {
	if (!selectedGroupId) return;
	renderSubcategories(selectedGroupId, taxonomySearch.value);
});
taxonomyExpandButton?.addEventListener('click', () => {
	setDrawerMode(drawerMode === 'half' ? 'full' : 'half');
});
taxonomyHandle?.addEventListener('keydown', onHandleKeydown);
taxonomyHandle?.addEventListener('pointerdown', onHandlePointerDown);
taxonomyHandle?.addEventListener('pointermove', onHandlePointerMove);
taxonomyHandle?.addEventListener('pointerup', onHandlePointerUp);
taxonomyHandle?.addEventListener('pointercancel', onHandlePointerUp);

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
	if (event.target?.name === 'severity') {
		setEmergencyState();
	}
});

form?.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (!form || !statusBox) return;
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
syncTaxonomyFromForm();
initialiseMap();
setDrawerMode('half');
applyRoutingState({ state: 'pending', authorityName: null, contactEmail: null });
setStep(0);
updateSummary();
flushQueuedReports();
