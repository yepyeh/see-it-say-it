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
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Textarea } from '../ui/textarea';
import { reportTaxonomy } from '../../data/report-taxonomy';
import { cn } from '../../lib/utils';
import './report-experience.css';

type RoutingState = {
	state: 'pending' | 'verified' | 'unverified' | 'unknown';
	authorityId: string | null;
	authorityName: string | null;
	departmentName: string | null;
	queueName: string | null;
	reason: string | null;
	destinationEmail: string | null;
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
	authorityId: null,
	authorityName: null,
	departmentName: null,
	queueName: null,
	reason: null,
	destinationEmail: null,
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

function ExitReportButton() {
	return (
		<Button asChild size="sm" type="button" variant="outline">
			<a className="report-exit-link" href="/reports">
				Exit report flow
			</a>
		</Button>
	);
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
	const [routingSuggestionDepartment, setRoutingSuggestionDepartment] = useState('');
	const [routingSuggestionEmail, setRoutingSuggestionEmail] = useState('');
	const [routingSuggestionNotes, setRoutingSuggestionNotes] = useState('');
	const [routingSuggestionStatus, setRoutingSuggestionStatus] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(true);
	const [queued, setQueued] = useState(false);
	const [keyboardOffset, setKeyboardOffset] = useState(0);
	const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');
	const [mobileDetailsOpen, setMobileDetailsOpen] = useState(true);
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);
	const routingTokenRef = useRef(0);
	const skipNextMapSyncRef = useRef(false);
	const placementStepRef = useRef(step === 1);
	const fullscreenShellRef = useRef<HTMLDivElement | null>(null);
	const drawerScrollRef = useRef<HTMLDivElement | null>(null);

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
	const reportStepLabel = step === 1 ? 'Map placement' : step === 2 ? 'Issue type' : 'Report';
	const isMobileViewport =
		typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
	const drawerSnapPoints = [SNAP_HALF, SNAP_FULL];

	useEffect(() => {
		placementStepRef.current = step === 1;
	}, [step]);

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
		const handleFocusIn = (event: FocusEvent) => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) return;
			const container =
				target.closest('.report-fullscreen-shell') ?? target.closest('.report-drawer-scroll');
			if (!(container instanceof HTMLElement)) return;
			window.setTimeout(() => {
				target.scrollIntoView({
					block: 'center',
					behavior: 'smooth',
				});
				container.scrollBy({
					top: -24,
					behavior: 'smooth',
				});
			}, 120);
		};
		document.addEventListener('focusin', handleFocusIn);
		return () => document.removeEventListener('focusin', handleFocusIn);
	}, []);

	useEffect(() => {
		if (!showMap || !mapContainerRef.current || mapRef.current) return;
		setMapStatus('loading');
		const archiveUrl = '/api/map/maps/uk.pmtiles';
		let mapStyle: maplibregl.StyleSpecification | string = 'https://demotiles.maplibre.org/style.json';
		const useSaferMobileStyle =
			typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

		if (useSaferMobileStyle) {
			mapStyle = {
				version: 8,
				sources: {
					osm: {
						type: 'raster',
						tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
						tileSize: 256,
						attribution:
							'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
					},
				},
				layers: [
					{
						id: 'osm',
						type: 'raster',
						source: 'osm',
					},
				],
			} satisfies maplibregl.StyleSpecification;
		}

		if (
			!useSaferMobileStyle &&
			archiveUrl &&
			typeof window !== 'undefined' &&
			'pmtiles' in window &&
			'basemaps' in window
		) {
			try {
				const protocol = new window.pmtiles.Protocol();
				maplibregl.addProtocol('pmtiles', protocol.tile);
				mapStyle = {
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
					layers: window.basemaps.layers('protomaps', window.basemaps.namedFlavor('light'), {
						lang: 'en',
					}),
				} satisfies maplibregl.StyleSpecification;
			} catch (_error) {
				mapStyle = 'https://demotiles.maplibre.org/style.json';
			}
		}

		const map = new maplibregl.Map({
			container: mapContainerRef.current,
			style: mapStyle,
			center: [draft.longitude, draft.latitude],
			zoom: 14,
			attributionControl: false,
		});
		map.dragPan.enable();
		map.touchZoomRotate.enable();
		map.on('load', () => {
			setMapStatus(mapStyle === 'https://demotiles.maplibre.org/style.json' ? 'fallback' : 'ready');
			window.setTimeout(() => map.resize(), 40);
		});
		map.on('error', () => {
			setMapStatus('fallback');
		});

		map.on('moveend', () => {
			if (!placementStepRef.current) return;
			const center = map.getCenter();
			skipNextMapSyncRef.current = true;
			setDraft((current) => {
				const nextLatitude = Number(center.lat.toFixed(6));
				const nextLongitude = Number(center.lng.toFixed(6));
				if (current.latitude === nextLatitude && current.longitude === nextLongitude) {
					return current;
				}
				return {
					...current,
					latitude: nextLatitude,
					longitude: nextLongitude,
				};
			});
		});

		mapRef.current = map;

		return () => {
			map.remove();
			mapRef.current = null;
		};
	}, [showMap]);

	useEffect(() => {
		if (!mapRef.current || !showMap) return;
		if (step === 1) {
			mapRef.current.dragPan.enable();
			mapRef.current.scrollZoom.enable();
			mapRef.current.doubleClickZoom.enable();
			mapRef.current.touchZoomRotate.enable();
			mapRef.current.keyboard.enable();
			mapRef.current.boxZoom.enable();
			return;
		}
		mapRef.current.dragPan.disable();
		mapRef.current.scrollZoom.disable();
		mapRef.current.doubleClickZoom.disable();
		mapRef.current.touchZoomRotate.disable();
		mapRef.current.keyboard.disable();
		mapRef.current.boxZoom.disable();
	}, [showMap, step]);

	useEffect(() => {
		if (!mapRef.current || !showMap) return;
		window.setTimeout(() => mapRef.current?.resize(), 120);
	}, [mobileDetailsOpen, showMap]);

	useEffect(() => {
		if (!showMap) return;
		const token = ++routingTokenRef.current;
		setRoutingState(initialRoutingState);
		const timeoutId = window.setTimeout(async () => {
			try {
				const response = await fetch(
					`/api/routing/resolve?lat=${encodeURIComponent(draft.latitude)}&lng=${encodeURIComponent(draft.longitude)}&groupId=${encodeURIComponent(draft.groupId)}&categoryId=${encodeURIComponent(draft.categoryId)}`,
				);
				const payload = await response.json();
				if (routingTokenRef.current !== token) return;
				const route = payload.route ?? null;
				const match = route?.authority ?? payload.match ?? null;
				if (!match && !route) {
					setRoutingState({
						state: 'unknown',
						authorityId: null,
						authorityName: null,
						departmentName: null,
						queueName: null,
						reason: null,
						destinationEmail: null,
					});
					return;
				}
				setRoutingState({
					state: route?.state ?? (match.contactEmail ? 'verified' : 'unverified'),
					authorityId: match.authorityId ?? null,
					authorityName: match.name ?? null,
					departmentName: route?.departmentRoute?.department ?? null,
					queueName: route?.departmentRoute?.queue ?? null,
					reason: route?.departmentRoute?.reason ?? null,
					destinationEmail: route?.destinationEmail ?? match.contactEmail ?? null,
				});
			} catch (_error) {
				if (routingTokenRef.current === token) {
					setRoutingState({
						state: 'unknown',
						authorityId: null,
						authorityName: null,
						departmentName: null,
						queueName: null,
						reason: null,
						destinationEmail: null,
					});
				}
			}
		}, 280);

		return () => window.clearTimeout(timeoutId);
	}, [draft.categoryId, draft.groupId, draft.latitude, draft.longitude, showMap]);

	useEffect(() => {
		if (step === 2) {
			setActiveSnapPoint(draft.groupId ? SNAP_FULL : SNAP_HALF);
			setDrawerOpen(true);
			setMobileDetailsOpen(true);
		} else if (step === 1) {
			setActiveSnapPoint(SNAP_HALF);
			setDrawerOpen(true);
			setMobileDetailsOpen(true);
		} else {
			setDrawerOpen(false);
		}
	}, [draft.groupId, step]);

	async function detectLocation() {
		if (!navigator.geolocation) return;
		setStatusMessage('Detecting current location...');
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const nextLatitude = Number(position.coords.latitude.toFixed(6));
				const nextLongitude = Number(position.coords.longitude.toFixed(6));
				setDraft((current) => ({
					...current,
					latitude: nextLatitude,
					longitude: nextLongitude,
				}));
				mapRef.current?.easeTo({
					center: [nextLongitude, nextLatitude],
					duration: 350,
				});
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
				`/api/geocoding/reverse?lat=${encodeURIComponent(draft.latitude)}&lng=${encodeURIComponent(draft.longitude)}`,
			);
			const payload = await response.json();
			const label = String(payload.result?.label ?? '').trim();
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
				`/api/geocoding/search?q=${encodeURIComponent(draft.locationLabel.trim())}`,
			);
			const payload = await response.json();
			const match = payload.results?.[0];
			if (!match) {
				setStatusMessage('No matching location found.');
				return;
			}
			const nextLatitude = Number(match.latitude.toFixed(6));
			const nextLongitude = Number(match.longitude.toFixed(6));
			setDraft((current) => ({
				...current,
				latitude: nextLatitude,
				longitude: nextLongitude,
				locationLabel: String(match.label ?? current.locationLabel),
			}));
			mapRef.current?.easeTo({
				center: [nextLongitude, nextLatitude],
				duration: 350,
			});
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

	async function submitRoutingSuggestion() {
		if (!routingSuggestionDepartment.trim()) {
			setRoutingSuggestionStatus('Add the team or department you think should handle this.');
			return;
		}

		setRoutingSuggestionStatus('Sending routing suggestion...');
		const response = await fetch('/api/routing/suggestions', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				authorityId: routingState.authorityId,
				latitude: draft.latitude,
				longitude: draft.longitude,
				routingState: routingState.state,
				groupId: draft.groupId,
				categoryId: draft.categoryId,
				suggestedDepartment: routingSuggestionDepartment,
				suggestedContactEmail: routingSuggestionEmail,
				notes: routingSuggestionNotes,
				submitterEmail: draft.email,
			}),
		});
		const payload = await response.json().catch(() => ({}));
		if (!response.ok) {
			setRoutingSuggestionStatus(payload.error ?? 'Unable to save your routing suggestion right now.');
			return;
		}
		setRoutingSuggestionStatus('Thanks. Your routing suggestion has been saved for review.');
		setRoutingSuggestionDepartment('');
		setRoutingSuggestionEmail('');
		setRoutingSuggestionNotes('');
	}

	function renderContributorHelpCard() {
		if (routingState.state !== 'unverified' && routingState.state !== 'unknown') return null;
		return (
			<Card className="report-contributor-card" size="sm">
				<CardHeader>
					<CardTitle>
						{routingState.state === 'unverified'
							? 'Help refine the department route'
							: 'Help identify who should handle this'}
					</CardTitle>
					<CardDescription>
						{routingState.state === 'unverified'
							? 'The council boundary is known, but the team inside that council is still uncertain.'
							: 'If you know the likely owner for this location, you can leave a suggestion to improve future routing.'}
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3">
					<div className="report-field">
						<Label htmlFor="routing-suggestion-department">Suggested team or department</Label>
						<Input
							id="routing-suggestion-department"
							onChange={(event) => setRoutingSuggestionDepartment(event.target.value)}
							placeholder="Street cleansing, parks, highways, estate management..."
							type="text"
							value={routingSuggestionDepartment}
						/>
					</div>
					<div className="report-field">
						<Label htmlFor="routing-suggestion-email">Contact email if you know it</Label>
						<Input
							id="routing-suggestion-email"
							onChange={(event) => setRoutingSuggestionEmail(event.target.value)}
							placeholder="team@example.gov.uk"
							type="email"
							value={routingSuggestionEmail}
						/>
					</div>
					<div className="report-field">
						<Label htmlFor="routing-suggestion-notes">Why do you think this is the right destination?</Label>
						<Textarea
							id="routing-suggestion-notes"
							onChange={(event) => setRoutingSuggestionNotes(event.target.value)}
							placeholder="This is usually handled by the council's parks contractor / housing association / highways team."
							rows={3}
							value={routingSuggestionNotes}
						/>
					</div>
					<div className="report-inline-actions">
						<Button onClick={submitRoutingSuggestion} type="button" variant="secondary">
							Submit routing suggestion
						</Button>
					</div>
					{routingSuggestionStatus ? <p className="report-status">{routingSuggestionStatus}</p> : null}
				</CardContent>
			</Card>
		);
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
			payload.groupId = draft.groupId;
			payload.categoryId = draft.categoryId;

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
			window.location.href = result.successUrl ?? result.reportUrl;
		} catch (error) {
			setStatusMessage(error instanceof Error ? error.message : 'Unable to submit report.');
			setSubmitting(false);
		}
	}

	function renderStepHeader(stepNumber: number, title: string, copy: string) {
		return (
			<div className="report-step-head">
				<div className="report-step-meta">
					<Badge variant="secondary">Step {stepNumber} of 5</Badge>
					{selectedGroup ? <Badge variant="outline">{selectedGroup.shortTitle}</Badge> : null}
					{selectedCategory ? <Badge variant="outline">{selectedCategory.title}</Badge> : null}
				</div>
				<Progress className="report-progress" value={getStepProgress(stepNumber - 1)} />
				<div className="report-progress-row">
					<span className="report-progress-copy">{stepNumber < 3 ? 'Map-led reporting' : 'Report details'}</span>
					{isDrawerStep && isMobileViewport ? (
						<Button
							onClick={() => setMobileDetailsOpen((current) => !current)}
							size="sm"
							type="button"
							variant="ghost"
						>
							{mobileDetailsOpen ? 'See map' : 'Open details'}
						</Button>
					) : null}
				</div>
				<h2 className="report-drawer-title">{title}</h2>
				<p className="report-drawer-copy">{copy}</p>
			</div>
		);
	}

	function renderStatusNotice() {
		if (!statusMessage && !queued) return null;
		return (
			<Alert className="report-status-alert">
				<AlertTitle>{queued ? 'Queued for sync' : 'Update'}</AlertTitle>
				<AlertDescription>
					{queued
						? 'Offline queue active. Submission will replay when connectivity returns.'
						: statusMessage}
				</AlertDescription>
			</Alert>
		);
	}

	function renderEmergencyNotice(copy: string) {
		if (!emergencyVisible) return null;
		return (
			<Alert className="report-emergency-alert" variant="destructive">
				<AlertTitle>Immediate danger? Please call 999.</AlertTitle>
				<AlertDescription>{copy}</AlertDescription>
			</Alert>
		);
	}

	function renderStepContent() {
		if (step === 0) {
			return (
				<>
					{renderStepHeader(
						1,
						'Capture and identify the reporter',
						'Start with the essentials. The next screens focus on location and category.',
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
					{renderStatusNotice()}
				<div className="report-sticky-actions">
					<ExitReportButton />
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
					{renderEmergencyNotice(
						'This warning is now visible because the category or severity indicates a public safety risk.',
					)}
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
						<ExitReportButton />
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
						<p>{routingCopy.label}{routingState.departmentName ? ` -> ${routingState.departmentName}` : ''}</p>
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
					<ExitReportButton />
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
				<div
					className="report-drawer-scroll"
					ref={drawerScrollRef}
					style={
						{
							'--report-keyboard-offset': `${keyboardOffset}px`,
						} as CSSProperties
					}
				>
					{renderStepHeader(
						2,
						'Place the report on the map',
						'Keep the map visible while you place the pin. This drawer stays at half height by default.',
					)}
					<Card className={cn('report-routing-card', `is-${routingState.state}`)} size="sm">
						<CardHeader>
							<div className="report-routing-chip">{routingCopy.label}</div>
							<CardTitle>{routingCopy.title}</CardTitle>
							<CardDescription>{routingCopy.copy}</CardDescription>
						</CardHeader>
						{routingState.departmentName ? (
							<CardContent>
								<div className="report-routing-meta">
									<strong>Suggested department</strong>
									<p>{routingState.departmentName}</p>
									{routingState.reason ? <span>{routingState.reason}</span> : null}
								</div>
							</CardContent>
						) : null}
					</Card>
					<Card className="report-location-card" size="sm">
						<CardHeader>
							<CardTitle>Pin and location</CardTitle>
							<CardDescription>Keep the pin over the exact place that needs attention.</CardDescription>
						</CardHeader>
						<CardContent className="report-location-summary">
							<div>
								<strong>Current point</strong>
								<span>
									{draft.latitude.toFixed(6)}, {draft.longitude.toFixed(6)}
								</span>
							</div>
							<div>
								<strong>Nearest label</strong>
								<span>{draft.locationLabel || 'Not confirmed yet'}</span>
							</div>
						</CardContent>
					</Card>
					{renderContributorHelpCard()}
					<Card className="report-location-edit-card" size="sm">
						<CardHeader>
							<CardTitle>Adjust the exact point</CardTitle>
							<CardDescription>
								Pan and zoom the map until the pin sits on the exact place. You can also search for a place or use your current location.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3">
							<div className="report-field">
								<Label htmlFor="report-location-label">Search place</Label>
								<Input
									id="report-location-label"
									value={draft.locationLabel}
									onChange={(event) => setDraft((current) => ({ ...current, locationLabel: event.target.value }))}
									placeholder="Search an address or landmark"
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
						</CardContent>
					</Card>
					{renderStatusNotice()}
					<div className="report-sticky-actions report-sticky-actions-drawer">
						<Button onClick={goToPreviousStep} type="button" variant="secondary">
							Back
						</Button>
						<ExitReportButton />
						<Button onClick={goToNextStep} type="button">
							Continue
						</Button>
					</div>
				</div>
			);
		}

		return (
			<div
				className="report-drawer-scroll"
				ref={drawerScrollRef}
				style={
					{
						'--report-keyboard-offset': `${keyboardOffset}px`,
					} as CSSProperties
				}
			>
				{renderStepHeader(
					3,
					'What kind of issue is it?',
					'Choose a group first, then narrow to the most accurate issue type.',
				)}
					<Card className={cn('report-routing-card', `is-${routingState.state}`)} size="sm">
						<CardHeader>
							<div className="report-routing-chip">{routingCopy.label}</div>
							<CardTitle>{routingCopy.title}</CardTitle>
							<CardDescription>{routingCopy.copy}</CardDescription>
						</CardHeader>
						{routingState.departmentName ? (
							<CardContent>
								<div className="report-routing-meta">
									<strong>Suggested department</strong>
									<p>{routingState.departmentName}</p>
									{routingState.reason ? <span>{routingState.reason}</span> : null}
									{routingState.destinationEmail ? (
										<span>Destination ready: {routingState.destinationEmail}</span>
									) : (
										<span>Department destination still needs verification for this authority.</span>
									)}
								</div>
							</CardContent>
						) : draft.groupId ? (
							<CardContent>
								<div className="report-routing-meta">
									<strong>Department routing pending</strong>
									<span>Choose the closest category to improve the dispatch suggestion.</span>
								</div>
							</CardContent>
						) : null}
					</Card>
				{selectedGroup ? (
					<Card className="report-location-card" size="sm">
						<CardHeader>
							<CardTitle>Chosen location</CardTitle>
							<CardDescription>The category you choose should describe the issue at this pinned spot.</CardDescription>
						</CardHeader>
						<CardContent className="report-location-summary">
							<div>
								<strong>Current place</strong>
								<span>{draft.locationLabel || 'Pinned location'}</span>
							</div>
							<div>
								<strong>Group selected</strong>
								<span>{selectedGroup.title}</span>
							</div>
						</CardContent>
					</Card>
				) : null}
				{renderContributorHelpCard()}
				{renderEmergencyNotice('This only appears when a dangerous category has actually been selected.')}
				{!selectedGroup ? (
					<Card className="report-selection-card" size="sm">
						<CardHeader>
							<CardTitle>Start broad, then narrow down</CardTitle>
							<CardDescription>
								Pick the group that best matches the issue first. The exact issue type appears next.
							</CardDescription>
						</CardHeader>
					</Card>
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
					<Card className="report-selected-group-card" size="sm">
						<CardContent className="flex items-center justify-between gap-3">
							<div className="grid gap-1">
								<strong>{selectedGroup.title}</strong>
								<span>{selectedGroup.subcategories.length} issue types in this group.</span>
							</div>
							{searchQuery ? <em>{filteredSubcategories.length} match{filteredSubcategories.length === 1 ? '' : 'es'}</em> : null}
						</CardContent>
					</Card>
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
										<span>{group.subcategories.length} issue types</span>
									</div>
									<em className="report-group-count">{group.subcategories.length}</em>
								</Button>
							);
						})}
					</div>
				)}
				<div className="report-sticky-actions report-sticky-actions-drawer">
					<Button onClick={goToPreviousStep} type="button" variant="secondary">
						Back
					</Button>
					<ExitReportButton />
				</div>
				{renderStatusNotice()}
			</div>
		);
	}

	return (
		<div className={`report-experience ${showMap ? 'has-map' : ''} ${isDrawerStep ? 'is-spatial' : 'is-fullscreen'}`}>
			<div className={`report-map-shell ${showMap ? 'is-visible' : ''}`}>
				<div className="report-map-surface" ref={mapContainerRef}></div>
				<div className="report-map-dim"></div>
				<div className="report-map-topbar">
					<div className="report-map-chip-row">
						<Badge variant="secondary">{reportStepLabel}</Badge>
						<Badge variant="outline">{routingCopy.label}</Badge>
						{selectedCategory ? <Badge variant="outline">{selectedCategory.title}</Badge> : null}
					</div>
					<ExitReportButton />
				</div>
				<div className="report-map-pin">
					<div className="report-map-pin-dot"></div>
					<span>Report location</span>
				</div>
				{mapStatus !== 'ready' ? (
					<div className="report-map-status" aria-live="polite">
						{mapStatus === 'loading'
							? 'Loading map...'
							: 'Using the reliable fallback map on this device.'}
					</div>
				) : null}
			</div>

			{isDrawerStep && isMobileViewport ? (
				<div className={`report-mobile-sheet ${mobileDetailsOpen ? 'is-expanded' : 'is-compact'} ${emergencyVisible ? 'is-emergency' : ''}`}>
					<div className="report-drawer-grabber" />
					{mobileDetailsOpen ? (
						renderSpatialDrawerContent()
					) : (
						<div className="report-mobile-sheet-bar">
							<div className="report-step-meta">
								<Badge variant="secondary">Step {step + 1} of 5</Badge>
								<Badge variant="outline">{reportStepLabel}</Badge>
								{selectedCategory ? <Badge variant="outline">{selectedCategory.title}</Badge> : null}
							</div>
							<div className="report-inline-actions">
								<Button onClick={() => setMobileDetailsOpen(true)} type="button" variant="secondary">
									Open details
								</Button>
								<ExitReportButton />
							</div>
						</div>
					)}
				</div>
			) : isDrawerStep ? (
				<Drawer.Root
					activeSnapPoint={activeSnapPoint}
					dismissible={false}
					handleOnly={true}
					modal={false}
					open={drawerOpen}
					setActiveSnapPoint={setActiveSnapPoint}
					setOpen={setDrawerOpen}
					shouldScaleBackground={false}
					snapPoints={drawerSnapPoints}
				>
					<Drawer.Portal>
						<Drawer.Overlay className="report-drawer-overlay" />
						<Drawer.Content className={`report-drawer ${emergencyVisible ? 'is-emergency' : ''}`}>
							<div className="report-drawer-grabber" />
							{renderSpatialDrawerContent()}
							{renderStatusNotice()}
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
						{renderStatusNotice()}
					</div>
				</div>
			)}
		</div>
	);
}
