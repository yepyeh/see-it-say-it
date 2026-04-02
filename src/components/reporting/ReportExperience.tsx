import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer } from 'vaul';
import maplibregl from 'maplibre-gl';
import {
	AlertTriangle,
	Binoculars,
	Construction,
	Leaf,
	ShieldAlert,
	Trees,
	Wrench,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Textarea } from '../ui/textarea';
import { reportTaxonomy } from '../../data/report-taxonomy';
import './report-experience.css';

type RoutingState = {
	state: 'pending' | 'verified' | 'unverified' | 'unknown';
	authorityName: string | null;
};

type ReportExperienceProps = {
	initialName?: string;
	initialEmail?: string;
};

type DraftPayload = {
	name: string;
	email: string;
	locationLabel: string;
	latitude: number;
	longitude: number;
	groupId: string;
	categoryId: string;
	description: string;
	notesMarkdown: string;
	severity: number;
};

const DRAFT_KEY = 'see-it-say-it:report-draft-react';
const DEFAULT_LATITUDE = 51.454514;
const DEFAULT_LONGITUDE = -2.58791;
const SNAP_HALF = 0.48;
const SNAP_FULL = 0.86;

const initialRoutingState: RoutingState = {
	state: 'pending',
	authorityName: null,
};

const groupPresentation = {
	'roads-transport': { icon: Construction, tint: 'roads' },
	'environment-waste': { icon: Leaf, tint: 'waste' },
	'parks-open-spaces': { icon: Trees, tint: 'parks' },
	'public-safety': { icon: ShieldAlert, tint: 'safety' },
	'utilities-assets': { icon: Wrench, tint: 'utilities' },
	'cultural-heritage': { icon: Binoculars, tint: 'heritage' },
} as const;

function getDefaultDraft(initialName = '', initialEmail = ''): DraftPayload {
	return {
		name: initialName,
		email: initialEmail,
		locationLabel: '',
		latitude: DEFAULT_LATITUDE,
		longitude: DEFAULT_LONGITUDE,
		groupId: '',
		categoryId: '',
		description: '',
		notesMarkdown: '',
		severity: 3,
	};
}

function getRoutingCopy(state: RoutingState) {
	switch (state.state) {
		case 'verified':
			return {
				label: 'Verified LAD',
				title: `${state.authorityName ?? 'Council'} confirmed`,
				copy: 'The current pin resolves to a council with a verified contact route.',
			};
		case 'unverified':
			return {
				label: 'Unverified LAD',
				title: `${state.authorityName ?? 'Council'} matched`,
				copy: 'The boundary match is solid, but the department destination still needs refinement.',
			};
		case 'unknown':
			return {
				label: 'Unknown zone',
				title: 'Jurisdiction still unknown',
				copy: 'The current pin is outside a confident routing match. Submission can still continue.',
			};
		default:
			return {
				label: 'Checking route',
				title: 'Looking up the matching council',
				copy: 'The ONS routing result for this pin will appear here before submission.',
			};
	}
}

function getStepProgress(step: number) {
	return ((step + 1) / 5) * 100;
}

function openDraftDatabase() {
	return new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open('see-it-say-it', 1);
		request.onupgradeneeded = () => {
			request.result.createObjectStore('queued-reports', { keyPath: 'id' });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function queueReport(payload: Record<string, unknown>, queuedMedia: Record<string, unknown>[]) {
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
				// @ts-expect-error Background Sync is not in the TS DOM lib by default.
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

function fileToDataUrl(file: File) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

async function uploadMediaFile(file: File) {
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
	return result.media;
}

export default function ReportExperience({
	initialName = '',
	initialEmail = '',
}: ReportExperienceProps) {
	const [step, setStep] = useState(0);
	const [draft, setDraft] = useState<DraftPayload>(() => getDefaultDraft(initialName, initialEmail));
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [routingState, setRoutingState] = useState<RoutingState>(initialRoutingState);
	const [searchQuery, setSearchQuery] = useState('');
	const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(SNAP_HALF);
	const [statusMessage, setStatusMessage] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(true);
	const [queued, setQueued] = useState(false);
	const [keyboardOffset, setKeyboardOffset] = useState(0);
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);
	const markerRef = useRef<maplibregl.Marker | null>(null);
	const routingTokenRef = useRef(0);
	const fullscreenShellRef = useRef<HTMLDivElement | null>(null);

	const selectedGroup = useMemo(
		() => reportTaxonomy.find((group) => group.id === draft.groupId) ?? null,
		[draft.groupId],
	);
	const selectedCategory = useMemo(
		() => selectedGroup?.subcategories.find((item) => item.id === draft.categoryId) ?? null,
		[selectedGroup, draft.categoryId],
	);
	const filteredSubcategories = useMemo(() => {
		if (!selectedGroup) return [];
		const normalized = searchQuery.trim().toLowerCase();
		return selectedGroup.subcategories.filter((item) => {
			if (!normalized) return true;
			return `${item.title} ${item.description}`.toLowerCase().includes(normalized);
		});
	}, [searchQuery, selectedGroup]);
	const routingCopy = useMemo(() => getRoutingCopy(routingState), [routingState]);
	const emergencyVisible = Boolean(selectedCategory?.isEmergency || (step >= 3 && draft.severity >= 5));
	const showMap = step >= 1 && step <= 2;
	const isDrawerStep = step === 1 || step === 2;

	useEffect(() => {
		const raw = localStorage.getItem(DRAFT_KEY);
		if (!raw) return;
		try {
			const parsed = JSON.parse(raw) as Partial<DraftPayload>;
			setDraft((current) => ({
				...current,
				...parsed,
			}));
		} catch (_error) {
			localStorage.removeItem(DRAFT_KEY);
		}
	}, []);

	useEffect(() => {
		localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
	}, [draft]);

	useEffect(() => {
		if (!window.visualViewport) return;
		const handleViewport = () => {
			const viewport = window.visualViewport;
			const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
			setKeyboardOffset(offset);
		};
		handleViewport();
		window.visualViewport.addEventListener('resize', handleViewport);
		window.visualViewport.addEventListener('scroll', handleViewport);
		return () => {
			window.visualViewport?.removeEventListener('resize', handleViewport);
			window.visualViewport?.removeEventListener('scroll', handleViewport);
		};
	}, []);

	useEffect(() => {
		const shell = fullscreenShellRef.current;
		if (!shell) return;
		const handleFocusIn = (event: FocusEvent) => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) return;
			window.setTimeout(() => {
				target.scrollIntoView({
					block: 'center',
					behavior: 'smooth',
				});
			}, 120);
		};
		shell.addEventListener('focusin', handleFocusIn);
		return () => shell.removeEventListener('focusin', handleFocusIn);
	}, [step]);

	useEffect(() => {
		if (!showMap || !mapContainerRef.current || mapRef.current) return;
		const map = new maplibregl.Map({
			container: mapContainerRef.current,
			style: {
				version: 8,
				sources: {
					osm: {
						type: 'raster',
						tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
						tileSize: 256,
						attribution: '&copy; OpenStreetMap contributors',
					},
				},
				layers: [
					{
						id: 'osm',
						type: 'raster',
						source: 'osm',
					},
				],
			},
			center: [draft.longitude, draft.latitude],
			zoom: 14,
			attributionControl: false,
		});

		const marker = new maplibregl.Marker({
			draggable: true,
			color: '#2dd4bf',
		})
			.setLngLat([draft.longitude, draft.latitude])
			.addTo(map);

		marker.on('dragend', () => {
			const lngLat = marker.getLngLat();
			setDraft((current) => ({
				...current,
				latitude: Number(lngLat.lat.toFixed(6)),
				longitude: Number(lngLat.lng.toFixed(6)),
			}));
		});

		mapRef.current = map;
		markerRef.current = marker;

		return () => {
			marker.remove();
			map.remove();
			markerRef.current = null;
			mapRef.current = null;
		};
	}, [draft.latitude, draft.longitude, showMap]);

	useEffect(() => {
		if (!mapRef.current || !markerRef.current || !showMap) return;
		markerRef.current.setLngLat([draft.longitude, draft.latitude]);
		mapRef.current.easeTo({
			center: [draft.longitude, draft.latitude],
			duration: 350,
		});
		window.setTimeout(() => mapRef.current?.resize(), 80);
	}, [draft.latitude, draft.longitude, showMap, step]);

	useEffect(() => {
		if (!showMap) return;
		const token = ++routingTokenRef.current;
		setRoutingState(initialRoutingState);
		const timeoutId = window.setTimeout(async () => {
			try {
				const response = await fetch(
					`/api/routing/resolve?lat=${encodeURIComponent(draft.latitude)}&lng=${encodeURIComponent(draft.longitude)}`,
				);
				const payload = await response.json();
				if (routingTokenRef.current !== token) return;
				const match = payload.match ?? null;
				if (!match) {
					setRoutingState({ state: 'unknown', authorityName: null });
					return;
				}
				setRoutingState({
					state: match.contactEmail ? 'verified' : 'unverified',
					authorityName: match.name ?? null,
				});
			} catch (_error) {
				if (routingTokenRef.current === token) {
					setRoutingState({ state: 'unknown', authorityName: null });
				}
			}
		}, 280);

		return () => window.clearTimeout(timeoutId);
	}, [draft.latitude, draft.longitude, showMap]);

	useEffect(() => {
		if (step === 2) {
			setActiveSnapPoint(draft.groupId ? SNAP_FULL : SNAP_HALF);
			setDrawerOpen(true);
		} else if (step === 1) {
			setActiveSnapPoint(SNAP_HALF);
			setDrawerOpen(true);
		} else {
			setDrawerOpen(false);
		}
	}, [draft.groupId, step]);

	async function detectLocation() {
		if (!navigator.geolocation) return;
		setStatusMessage('Detecting current location...');
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setDraft((current) => ({
					...current,
					latitude: Number(position.coords.latitude.toFixed(6)),
					longitude: Number(position.coords.longitude.toFixed(6)),
				}));
				setStatusMessage('Location updated from this device.');
			},
			() => {
				setStatusMessage('Location permission was denied. You can still drag the pin.');
			},
			{ enableHighAccuracy: true, timeout: 8000 },
		);
	}

	async function reverseGeocode() {
		setStatusMessage('Refreshing address...');
		try {
			const response = await fetch(
				`https://photon.komoot.io/reverse?lat=${encodeURIComponent(draft.latitude)}&lon=${encodeURIComponent(draft.longitude)}`,
			);
			const payload = await response.json();
			const feature = payload.features?.[0];
			const props = feature?.properties ?? {};
			const label = [props.name, props.street, props.city, props.county].filter(Boolean).join(', ');
			setDraft((current) => ({
				...current,
				locationLabel: label || current.locationLabel,
			}));
			setStatusMessage(label ? 'Address refreshed from the map pin.' : 'No address label found for this point.');
		} catch (_error) {
			setStatusMessage('Unable to refresh the address right now.');
		}
	}

	async function searchLocation() {
		if (!draft.locationLabel.trim()) return;
		setStatusMessage('Searching location...');
		try {
			const response = await fetch(
				`https://photon.komoot.io/api/?q=${encodeURIComponent(draft.locationLabel.trim())}&limit=1`,
			);
			const payload = await response.json();
			const feature = payload.features?.[0];
			if (!feature) {
				setStatusMessage('No matching location found.');
				return;
			}
			const [longitude, latitude] = feature.geometry.coordinates;
			setDraft((current) => ({
				...current,
				latitude: Number(latitude.toFixed(6)),
				longitude: Number(longitude.toFixed(6)),
			}));
			setStatusMessage('Location found and map pin moved.');
		} catch (_error) {
			setStatusMessage('Unable to search locations right now.');
		}
	}

	function goToNextStep() {
		setStep((current) => Math.min(current + 1, 4));
	}

	function goToPreviousStep() {
		setStep((current) => Math.max(current - 1, 0));
	}

	function selectGroup(groupId: string) {
		setDraft((current) => ({
			...current,
			groupId,
			categoryId: '',
		}));
		setSearchQuery('');
		setActiveSnapPoint(SNAP_FULL);
		navigator.vibrate?.(10);
	}

	function selectCategory(categoryId: string) {
		setDraft((current) => ({
			...current,
			categoryId,
		}));
		navigator.vibrate?.(12);
		window.setTimeout(() => setStep(3), 120);
	}

	async function submitReport() {
		if (!selectedCategory) {
			setStatusMessage('Pick a category before submitting.');
			return;
		}
		if (!draft.description.trim()) {
			setStatusMessage('Add a short description before submitting.');
			return;
		}

		setSubmitting(true);
		setStatusMessage('Submitting report...');
		const payload: Record<string, unknown> = {
			name: draft.name,
			email: draft.email,
			category: selectedCategory.title,
			description: draft.description,
			notesMarkdown: draft.notesMarkdown,
			locationLabel: draft.locationLabel,
			latitude: draft.latitude,
			longitude: draft.longitude,
			severity: draft.severity,
			sourceChannel: navigator.onLine ? 'web' : 'offline-queue',
		};

		try {
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
				setQueued(true);
				window.location.href = '/auth?next=/my-reports%3Fqueued%3D1';
				return;
			}

			if (selectedFile) {
				payload.media = [await uploadMediaFile(selectedFile)];
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
				throw new Error(result.error ?? 'Unable to submit report.');
			}

			localStorage.removeItem(DRAFT_KEY);
			window.location.href = result.reportUrl;
		} catch (error) {
			setStatusMessage(error instanceof Error ? error.message : 'Unable to submit report.');
			setSubmitting(false);
		}
	}

	function renderStepHeader(stepNumber: number, title: string, copy: string) {
		return (
			<div className="report-step-head">
				<Progress className="report-progress" value={getStepProgress(stepNumber - 1)} />
				<div className="report-progress-row">
					<span className="report-progress-copy">Step {stepNumber} of 5</span>
				</div>
				<h2 className="report-drawer-title">{title}</h2>
				<p className="report-drawer-copy">{copy}</p>
			</div>
		);
	}

	function renderStepContent() {
		if (step === 0) {
			return (
				<>
					{renderStepHeader(
						1,
						'Capture and identify the reporter',
						'Start with the basics, then the flow becomes map-led for the location and category steps.',
					)}
					<div className="report-field-grid">
						<div className="report-field">
							<Label htmlFor="reporter-name">Your name</Label>
							<Input
								id="reporter-name"
								value={draft.name}
								onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
								placeholder="Jane Smith"
								type="text"
							/>
						</div>
						<div className="report-field">
							<Label htmlFor="reporter-email">Email for status updates</Label>
							<Input
								id="reporter-email"
								value={draft.email}
								onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
								placeholder="jane@example.com"
								type="email"
							/>
						</div>
					</div>
					<div className="report-field">
						<Label htmlFor="reporter-photo">Photo upload</Label>
						<Input
							id="reporter-photo"
							accept="image/*"
							className="file:text-[hsl(var(--foreground))]"
							onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
							type="file"
						/>
					</div>
					<div className="report-sticky-actions">
						<Button onClick={() => localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))} type="button" variant="secondary">
							Save draft
						</Button>
						<Button onClick={goToNextStep} type="button">
							Continue
						</Button>
					</div>
				</>
			);
		}

		if (step === 1 || step === 2) return null;

		if (step === 3) {
			return (
				<>
					{renderStepHeader(4, 'Add detail and severity', 'Keep it short, specific, and useful to the council team.')}
					{emergencyVisible ? (
						<div className="report-emergency-card">
							<strong>Immediate danger? Please call 999.</strong>
							<p>
								This warning is now visible because the category or severity indicates a public safety risk.
							</p>
						</div>
					) : null}
					<div className="report-field">
						<Label htmlFor="report-description">Short description</Label>
						<Textarea
							id="report-description"
							onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
							placeholder="Describe what happened and why it matters."
							rows={4}
							value={draft.description}
						/>
					</div>
					<div className="report-field">
						<Label htmlFor="report-notes">Notes (Markdown supported)</Label>
						<Textarea
							id="report-notes"
							onChange={(event) => setDraft((current) => ({ ...current, notesMarkdown: event.target.value }))}
							placeholder="- blocked pavement&#10;- dangerous at school pick-up"
							rows={5}
							value={draft.notesMarkdown}
						/>
					</div>
					<div className="report-field">
						<Label htmlFor="report-severity">Severity: {draft.severity}</Label>
						<Input
							id="report-severity"
							className="report-range"
							max={5}
							min={1}
							onChange={(event) =>
								setDraft((current) => ({
									...current,
									severity: Number(event.target.value),
								}))
							}
							type="range"
							value={draft.severity}
						/>
					</div>
					<div className="report-sticky-actions">
						<Button onClick={goToPreviousStep} type="button" variant="secondary">
							Back
						</Button>
						<Button onClick={goToNextStep} type="button">
							Continue
						</Button>
					</div>
				</>
			);
		}

		return (
			<>
				{renderStepHeader(5, 'Review and submit', 'Check the essentials, then send the report into the live pipeline.')}
				<div className="report-summary-grid">
					<div>
						<strong>Reporter</strong>
						<p>{draft.name || 'Anonymous'}{draft.email ? `, ${draft.email}` : ''}</p>
					</div>
					<div>
						<strong>Category</strong>
						<p>{selectedGroup && selectedCategory ? `${selectedGroup.title} -> ${selectedCategory.title}` : 'Not selected yet'}</p>
					</div>
					<div>
						<strong>Location</strong>
						<p>{draft.locationLabel || `${draft.latitude}, ${draft.longitude}`}</p>
					</div>
					<div>
						<strong>Routing</strong>
						<p>{routingCopy.label}</p>
					</div>
					<div>
						<strong>Description</strong>
						<p>{draft.description || 'No description yet'}</p>
					</div>
					<div>
						<strong>Photo</strong>
						<p>{selectedFile?.name ?? 'No image attached'}</p>
					</div>
				</div>
				<div className="report-sticky-actions">
					<Button onClick={goToPreviousStep} type="button" variant="secondary">
						Back
					</Button>
					<Button disabled={submitting} onClick={submitReport} type="button">
						{submitting ? 'Submitting…' : 'Submit report'}
					</Button>
				</div>
			</>
		);
	}

	function renderSpatialDrawerContent() {
		if (step === 1) {
			return (
				<div className="report-drawer-scroll">
					{renderStepHeader(
						2,
						'Place the report on the map',
						'Keep the map visible while you place the pin. This drawer stays at half height by default.',
					)}
					<div className={`report-routing-card is-${routingState.state}`}>
						<div className="report-routing-chip">{routingCopy.label}</div>
						<strong>{routingCopy.title}</strong>
						<p>{routingCopy.copy}</p>
					</div>
					<div className="report-field-grid">
						<div className="report-field">
							<Label htmlFor="report-latitude">Latitude</Label>
							<Input
								id="report-latitude"
								value={draft.latitude}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										latitude: Number(event.target.value || 0),
									}))
								}
								step="0.000001"
								type="number"
							/>
						</div>
						<div className="report-field">
							<Label htmlFor="report-longitude">Longitude</Label>
							<Input
								id="report-longitude"
								value={draft.longitude}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										longitude: Number(event.target.value || 0),
									}))
								}
								step="0.000001"
								type="number"
							/>
						</div>
					</div>
					<div className="report-field">
						<Label htmlFor="report-location-label">Nearest address or landmark</Label>
						<Input
							id="report-location-label"
							value={draft.locationLabel}
							onChange={(event) => setDraft((current) => ({ ...current, locationLabel: event.target.value }))}
							placeholder="College Green, Bristol"
							type="text"
						/>
					</div>
					<div className="report-inline-actions">
						<Button onClick={searchLocation} type="button" variant="secondary">
							Search
						</Button>
						<Button onClick={reverseGeocode} type="button" variant="secondary">
							Refresh address
						</Button>
						<Button onClick={detectLocation} type="button" variant="secondary">
							Use current location
						</Button>
					</div>
					<div className="report-drawer-actions">
						<Button onClick={goToPreviousStep} type="button" variant="secondary">
							Back
						</Button>
						<Button onClick={goToNextStep} type="button">
							Continue
						</Button>
					</div>
				</div>
			);
		}

		return (
			<div className="report-drawer-scroll">
				{renderStepHeader(
					3,
					'What kind of issue is it?',
					'Tier 1 stays compact. Tier 2 expands only when you need the sub-category search and list.',
				)}
				<div className={`report-routing-card is-${routingState.state}`}>
					<div className="report-routing-chip">{routingCopy.label}</div>
					<strong>{routingCopy.title}</strong>
					<p>{routingCopy.copy}</p>
				</div>
				{emergencyVisible ? (
					<div className="report-emergency-card">
						<strong>Immediate danger? Please call 999.</strong>
						<p>This only appears when a dangerous category has actually been selected.</p>
					</div>
				) : null}
				{selectedGroup ? (
					<div className="report-subcategories-head">
						<Button
							onClick={() => setDraft((current) => ({ ...current, groupId: '', categoryId: '' }))}
							type="button"
							variant="secondary"
						>
							Back
						</Button>
						<Input
							className="report-search"
							onChange={(event) => setSearchQuery(event.target.value)}
							placeholder={`Search within ${selectedGroup.shortTitle}`}
							type="search"
							value={searchQuery}
						/>
					</div>
				) : null}
				{selectedGroup ? (
					<div className="report-subcategory-list">
						{filteredSubcategories.map((item) => (
							<Button
								className={`report-subcategory-card ${draft.categoryId === item.id ? 'is-selected' : ''}`}
								key={item.id}
								onClick={() => selectCategory(item.id)}
								type="button"
								variant="secondary"
							>
								<div>
									<strong>{item.title}</strong>
									<span>{item.description}</span>
								</div>
								{item.isEmergency ? <em>Urgent</em> : null}
							</Button>
						))}
						{filteredSubcategories.length === 0 ? (
							<p className="report-empty-state">No matching sub-categories in this group.</p>
						) : null}
					</div>
				) : (
					<div className="report-group-grid">
						{reportTaxonomy.map((group) => {
							const presentation = groupPresentation[group.id as keyof typeof groupPresentation];
							const Icon = presentation?.icon ?? AlertTriangle;
							return (
								<Button
									className={`report-group-card tint-${presentation?.tint ?? 'roads'}`}
									key={group.id}
									onClick={() => selectGroup(group.id)}
									type="button"
									variant="secondary"
								>
									<span className={`report-group-icon tint-${presentation?.tint ?? 'roads'}`}>
										<Icon size={18} strokeWidth={2.25} />
									</span>
									<div className="report-group-card-copy">
										<strong>{group.shortTitle}</strong>
										<span>{group.description}</span>
									</div>
								</Button>
							);
						})}
					</div>
				)}
				<div className="report-drawer-actions">
					<Button onClick={goToPreviousStep} type="button" variant="secondary">
						Back
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className={`report-experience ${showMap ? 'has-map' : ''} ${isDrawerStep ? 'is-spatial' : 'is-fullscreen'}`}>
			<div className={`report-map-shell ${showMap ? 'is-visible' : ''}`}>
				<div className="report-map-surface" ref={mapContainerRef}></div>
				<div className="report-map-dim"></div>
				<div className="report-map-pin">
					<div className="report-map-pin-dot"></div>
					<span>Report location</span>
				</div>
			</div>

			{isDrawerStep ? (
				<Drawer.Root
					activeSnapPoint={activeSnapPoint}
					dismissible={false}
					modal={false}
					open={drawerOpen}
					setActiveSnapPoint={setActiveSnapPoint}
					setOpen={setDrawerOpen}
					shouldScaleBackground={false}
					snapPoints={[SNAP_HALF, SNAP_FULL]}
				>
					<Drawer.Portal>
						<Drawer.Overlay className="report-drawer-overlay" />
						<Drawer.Content className={`report-drawer ${emergencyVisible ? 'is-emergency' : ''}`}>
							<div className="report-drawer-grabber" />
							{renderSpatialDrawerContent()}
							{statusMessage ? <p className="report-status">{statusMessage}</p> : null}
							{queued ? <p className="report-status">Offline queue active. Submission will replay when connectivity returns.</p> : null}
						</Drawer.Content>
					</Drawer.Portal>
				</Drawer.Root>
			) : (
				<div
					className="report-fullscreen-shell"
					ref={fullscreenShellRef}
					style={
						{
							'--report-keyboard-offset': `${keyboardOffset}px`,
						} as CSSProperties
					}
				>
					<div className="report-fullscreen-card">
						{renderStepContent()}
						{statusMessage ? <p className="report-status">{statusMessage}</p> : null}
						{queued ? <p className="report-status">Offline queue active. Submission will replay when connectivity returns.</p> : null}
					</div>
				</div>
			)}
		</div>
	);
}
