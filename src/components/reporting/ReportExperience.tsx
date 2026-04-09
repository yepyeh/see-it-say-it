import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import {
	AlertTriangle,
	ArrowLeft,
	ArrowRight,
	Binoculars,
	Camera,
	ChevronRight,
	Construction,
	FileText,
	FileVideo,
	ImageIcon,
	X,
	Leaf,
	Library,
	MapPin,
	Send,
	ShieldAlert,
	Sparkles,
	Trees,
	Wrench,
} from 'lucide-react';
import { QuestionFlow } from '../tool-ui/question-flow';
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { Slider } from '../ui/slider';
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
	destinationType: 'email' | 'webform' | null;
	destinationTarget: string | null;
};

type ReportExperienceProps = {
	initialName?: string;
	initialEmail?: string;
	isSignedIn?: boolean;
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
const initialRoutingState: RoutingState = {
	state: 'pending',
	authorityId: null,
	authorityName: null,
	departmentName: null,
	queueName: null,
	reason: null,
	destinationType: null,
	destinationTarget: null,
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
				label: 'Authority matched',
				title: `${state.authorityName ?? 'Council'} confirmed`,
				copy: 'This pinned location has a verified council route.',
			};
		case 'unverified':
			return {
				label: 'Authority found',
				title: `${state.authorityName ?? 'Council'} matched`,
				copy: 'We know the council area, but the exact team route still needs refining.',
			};
		case 'unknown':
			return {
				label: 'Unknown area',
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

function getSeverityLabel(severity: number) {
	if (severity >= 5) return 'Urgent';
	if (severity >= 4) return 'High';
	if (severity === 3) return 'Standard';
	return 'Low';
}

function getStepIcon(step: number) {
	switch (step) {
		case 1:
			return Camera;
		case 2:
			return MapPin;
		case 3:
			return Sparkles;
		case 4:
			return FileText;
		default:
			return Send;
	}
}

function ExitReportButton() {
	return (
		<a className="report-exit-link" href="/reports">
			<X size={18} />
			<span className="sr-only">Exit report flow</span>
		</a>
	);
}

function getRoutingDisplayState(state: RoutingState) {
	switch (state.state) {
		case 'verified':
			return 'Authority matched';
		case 'unverified':
			return 'Authority found';
		case 'unknown':
			return 'Unknown area';
		default:
			return 'Checking route';
	}
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
	isSignedIn = false,
}: ReportExperienceProps) {
	const [step, setStep] = useState(0);
	const [draft, setDraft] = useState<DraftPayload>(() => getDefaultDraft(initialName, initialEmail));
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [routingState, setRoutingState] = useState<RoutingState>(initialRoutingState);
	const [locationQuery, setLocationQuery] = useState('');
	const [statusMessage, setStatusMessage] = useState('');
	const [routingSuggestionDepartment, setRoutingSuggestionDepartment] = useState('');
	const [routingSuggestionEmail, setRoutingSuggestionEmail] = useState('');
	const [routingSuggestionNotes, setRoutingSuggestionNotes] = useState('');
	const [routingSuggestionStatus, setRoutingSuggestionStatus] = useState('');
	const [showRoutingHelp, setShowRoutingHelp] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [queued, setQueued] = useState(false);
	const [hasMapInteraction, setHasMapInteraction] = useState(false);
	const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');
	const [mobileDetailsOpen, setMobileDetailsOpen] = useState(true);
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);
	const routingTokenRef = useRef(0);
	const skipNextMapSyncRef = useRef(false);
	const placementStepRef = useRef(step === 1);
	const fullscreenShellRef = useRef<HTMLDivElement | null>(null);

	const selectedGroup = useMemo(
		() => reportTaxonomy.find((group) => group.id === draft.groupId) ?? null,
		[draft.groupId],
	);
	const selectedCategory = useMemo(
		() => selectedGroup?.subcategories.find((item) => item.id === draft.categoryId) ?? null,
		[selectedGroup, draft.categoryId],
	);
	const reportGroupOptions = useMemo(
		() =>
			reportTaxonomy.map((group) => {
				const presentation = groupPresentation[group.id as keyof typeof groupPresentation];
				const Icon = presentation?.icon ?? AlertTriangle;
				return {
					id: group.id,
					label: group.shortTitle,
					description: group.description,
					icon: <Icon className="size-4 text-muted-foreground" strokeWidth={2.1} />,
				};
			}),
		[],
	);
	const reportCategoryOptions = useMemo(
		() =>
			(selectedGroup?.subcategories ?? []).map((item) => ({
				id: item.id,
				label: item.title,
				description: item.isEmergency ? `${item.description} Urgent issue.` : item.description,
				icon: item.isEmergency ? <AlertTriangle className="size-4 text-destructive" strokeWidth={2.1} /> : undefined,
			})),
		[selectedGroup],
	);
	const routingCopy = useMemo(() => getRoutingCopy(routingState), [routingState]);
	const emergencyVisible = Boolean(selectedCategory?.isEmergency || (step >= 3 && draft.severity >= 5));
	const showMap = step === 1;
	const isMobileViewport =
		typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
	const authGateHref = `/auth?next=${encodeURIComponent(`/onboarding?next=${encodeURIComponent('/report')}`)}`;
	const mediaPreviewUrls = useMemo(
		() =>
			selectedFiles.map((file) => ({
				file,
				url: URL.createObjectURL(file),
			})),
		[selectedFiles],
	);

	useEffect(() => {
		return () => {
			for (const media of mediaPreviewUrls) URL.revokeObjectURL(media.url);
		};
	}, [mediaPreviewUrls]);

	useEffect(() => {
		placementStepRef.current = step === 1;
	}, [step]);

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
		fullscreenShellRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
		setStatusMessage('');
	}, [step, draft.groupId]);

	useEffect(() => {
		const raw = localStorage.getItem(DRAFT_KEY);
		if (!raw) {
			setDraft(getDefaultDraft(initialName, initialEmail));
			setSelectedFiles([]);
			setLocationQuery('');
			setRoutingState(initialRoutingState);
			setStep(0);
			setHasMapInteraction(false);
			return;
		}
		try {
			const parsed = JSON.parse(raw) as Partial<DraftPayload>;
			setDraft((current) => ({
				...current,
				...parsed,
				groupId: '',
				categoryId: '',
			}));
		} catch (_error) {
			localStorage.removeItem(DRAFT_KEY);
		}
	}, []);

	useEffect(() => {
		localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
	}, [draft]);

	useEffect(() => {
		const handleFocusIn = (event: FocusEvent) => {
			const target = event.target;
			if (!(target instanceof HTMLElement)) return;
			const container =
				target.closest('.report-fullscreen-card');
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
		const osmRasterStyle = {
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

		const map = new maplibregl.Map({
			container: mapContainerRef.current,
			style: osmRasterStyle,
			center: [draft.longitude, draft.latitude],
			zoom: 14,
			attributionControl: false,
		});
		map.dragPan.enable();
		map.touchZoomRotate.enable();
		map.on('load', () => {
			setMapStatus('ready');
			window.setTimeout(() => map.resize(), 40);
		});
		map.on('error', () => {
			setMapStatus('fallback');
		});

		map.on('moveend', () => {
			if (!placementStepRef.current) return;
			const center = map.getCenter();
			setHasMapInteraction(true);
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
					locationLabel: '',
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
						destinationType: null,
						destinationTarget: null,
					});
					return;
				}
				setRoutingState({
					state: route?.state ?? (match.contactEmail || match.reportUrl ? 'verified' : 'unverified'),
					authorityId: match.authorityId ?? null,
					authorityName: match.name ?? null,
					departmentName: route?.departmentRoute?.department ?? null,
					queueName: route?.departmentRoute?.queue ?? null,
					reason: route?.departmentRoute?.reason ?? null,
					destinationType: route?.destinationType ?? (match.contactEmail ? 'email' : match.reportUrl ? 'webform' : null),
					destinationTarget: route?.destinationTarget ?? match.contactEmail ?? match.reportUrl ?? null,
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
						destinationType: null,
						destinationTarget: null,
					});
				}
			}
		}, 280);

		return () => window.clearTimeout(timeoutId);
	}, [draft.categoryId, draft.groupId, draft.latitude, draft.longitude, showMap]);

	useEffect(() => {
		if (step === 2) {
			setMobileDetailsOpen(true);
			setShowRoutingHelp(false);
		} else if (step === 1) {
			setMobileDetailsOpen(true);
			setShowRoutingHelp(false);
		}
	}, [draft.groupId, step]);

	useEffect(() => {
		if (step !== 1 || !hasMapInteraction) return;
		const timeoutId = window.setTimeout(async () => {
			setStatusMessage('Updating address...');
			const label = await reverseGeocode({ silent: true });
			setStatusMessage(label ? '' : 'Unable to determine an address for this point yet.');
		}, 320);
		return () => window.clearTimeout(timeoutId);
	}, [draft.latitude, draft.longitude, hasMapInteraction, step]);

	async function detectLocation() {
		if (!navigator.geolocation) return;
		setStatusMessage('Detecting current location...');
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const nextLatitude = Number(position.coords.latitude.toFixed(6));
				const nextLongitude = Number(position.coords.longitude.toFixed(6));
				setHasMapInteraction(true);
				setDraft((current) => ({
					...current,
					latitude: nextLatitude,
					longitude: nextLongitude,
					locationLabel: '',
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

	async function reverseGeocode(options?: { silent?: boolean }) {
		if (!options?.silent) setStatusMessage('Refreshing address...');
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
			if (!options?.silent) {
				setStatusMessage(label ? 'Address refreshed from the map pin.' : 'No address label found for this point.');
			}
			return label;
		} catch (_error) {
			if (!options?.silent) setStatusMessage('Unable to refresh the address right now.');
			return '';
		}
	}

	async function searchLocation() {
		if (!locationQuery.trim()) return;
		setStatusMessage('Searching location...');
		try {
			const response = await fetch(
				`/api/geocoding/search?q=${encodeURIComponent(locationQuery.trim())}`,
			);
			const payload = await response.json();
			const match = payload.results?.[0];
			if (!match) {
				setStatusMessage('No matching location found.');
				return;
			}
			const nextLatitude = Number(match.latitude.toFixed(6));
			const nextLongitude = Number(match.longitude.toFixed(6));
			setHasMapInteraction(true);
			setDraft((current) => ({
				...current,
				latitude: nextLatitude,
				longitude: nextLongitude,
				locationLabel: String(match.label ?? current.locationLabel),
			}));
			setLocationQuery(String(match.label ?? locationQuery));
			mapRef.current?.easeTo({
				center: [nextLongitude, nextLatitude],
				duration: 350,
			});
			setStatusMessage('');
		} catch (_error) {
			setStatusMessage('Unable to search locations right now.');
		}
	}

	function goToNextStep() {
		if (step === 0 && !isSignedIn) {
			window.location.href = authGateHref;
			return;
		}
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
		navigator.vibrate?.(10);
	}

	function selectCategory(categoryId: string) {
		setDraft((current) => ({
			...current,
			categoryId,
		}));
		navigator.vibrate?.(12);
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
		if (!isSignedIn) {
			window.location.href = authGateHref;
			return;
		}
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
				const queuedMedia = await Promise.all(
					selectedFiles.map(async (file) => ({
						name: file.name,
						type: file.type,
						dataUrl: await fileToDataUrl(file),
					})),
				);
				await queueReport(payload, queuedMedia);
				localStorage.removeItem(DRAFT_KEY);
				setDraft(getDefaultDraft(initialName, initialEmail));
				setSelectedFiles([]);
				setLocationQuery('');
				setRoutingState(initialRoutingState);
				setHasMapInteraction(false);
				setQueued(true);
				window.location.href = '/auth?next=/my-reports%3Fqueued%3D1';
				return;
			}

			if (selectedFiles.length > 0) {
				payload.media = await Promise.all(selectedFiles.map((file) => uploadMediaFile(file)));
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
			setDraft(getDefaultDraft(initialName, initialEmail));
			setSelectedFiles([]);
			setLocationQuery('');
			setRoutingState(initialRoutingState);
			setHasMapInteraction(false);
			window.location.href = result.successUrl ?? result.reportUrl;
		} catch (error) {
			setStatusMessage(error instanceof Error ? error.message : 'Unable to submit report.');
			setSubmitting(false);
		}
	}

	function renderStepHeader(stepNumber: number, title: string, copy: string) {
		const Icon = getStepIcon(stepNumber);
		return (
			<div className="report-step-head">
				<div className="report-step-meta">
					<Badge variant="secondary">Step {stepNumber} of 5</Badge>
				</div>
				<div className="report-step-lead">
					<span className="report-step-icon">
						<Icon />
					</span>
					<div className="report-step-copy">
						<h2 className="report-drawer-title">{title}</h2>
						<p className="report-drawer-copy">{copy}</p>
					</div>
				</div>
				<div className="report-progress-row">
					<Progress className="report-progress" value={getStepProgress(stepNumber - 1)} />
				</div>
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

	function renderStepActions() {
		if (step === 0) {
			if (!isSignedIn) {
				return (
					<div className="report-mobile-action-dock">
						<div className="report-sticky-actions">
							<Button asChild className="report-primary-action" type="button">
								<a href={authGateHref}>Continue with email</a>
							</Button>
						</div>
					</div>
				);
			}
			return (
				<div className="report-mobile-action-dock">
					<div className="report-sticky-actions">
						<Button className="report-primary-action" onClick={goToNextStep} type="button">
							Continue
							<ArrowRight size={16} />
						</Button>
					</div>
				</div>
			);
		}

		if (step === 1) {
			return (
				<div className="report-mobile-action-dock">
					<div className="report-sticky-actions">
						<Button onClick={goToPreviousStep} type="button" variant="secondary">
							Back
						</Button>
						<Button className="report-primary-action" disabled={!draft.locationLabel.trim()} onClick={goToNextStep} type="button">
							Continue
							<ArrowRight size={16} />
						</Button>
					</div>
				</div>
			);
		}

		if (step === 2) return null;

		if (step === 3) {
			return (
				<div className="report-mobile-action-dock">
					<div className="report-sticky-actions">
						<Button onClick={goToPreviousStep} type="button" variant="secondary">
							Back
						</Button>
						<Button className="report-primary-action" disabled={!draft.description.trim()} onClick={goToNextStep} type="button">
							Continue
							<ArrowRight size={16} />
						</Button>
					</div>
				</div>
			);
		}

		return (
			<div className="report-mobile-action-dock">
				<div className="report-sticky-actions">
					<Button onClick={goToPreviousStep} type="button" variant="secondary">
						Back
					</Button>
					<Button className="report-primary-action" disabled={submitting} onClick={submitReport} type="button">
						{submitting ? 'Submitting…' : 'Submit report'}
						{!submitting ? <ArrowRight size={16} /> : null}
					</Button>
				</div>
			</div>
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

	function renderRoutingSummaryCard(mode: 'placement' | 'category') {
		const authorityLine = routingState.authorityName ?? 'Matching the local authority...';
		const detailLine =
			routingState.state === 'verified'
				? routingState.departmentName
					? `${routingState.departmentName}${routingState.destinationType === 'webform' ? ' • official form available' : ''}`
					: 'The council route is verified for this location.'
				: routingState.state === 'unverified'
					? routingState.departmentName
						? routingState.departmentName
						: 'The council is known. The team inside that council still needs verification.'
					: routingState.state === 'unknown'
						? 'The boundary match is not confident yet.'
						: 'Checking the council match for this pin.';

		return (
			<Card className={cn('report-routing-card', `is-${routingState.state}`)} size="sm">
				<CardHeader>
					<div className="report-routing-chip">{getRoutingDisplayState(routingState)}</div>
					<CardTitle>{authorityLine}</CardTitle>
					<CardDescription>
						{mode === 'placement'
							? 'Place the pin first. The matched council will travel with the report.'
							: selectedGroup
								? `This issue will be routed from ${authorityLine} using the issue type you choose.`
								: 'Choose the issue type next.'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="report-routing-meta">
						<strong>Routing status</strong>
						<p>{detailLine}</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	function appendSelectedFiles(fileList: FileList | null) {
		if (!fileList) return;
		const incoming = Array.from(fileList);
		if (incoming.length === 0) return;
		setSelectedFiles((current) => {
			const bySignature = new Map(
				current.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, file] as const),
			);
			for (const file of incoming) {
				bySignature.set(`${file.name}-${file.size}-${file.lastModified}`, file);
			}
			return Array.from(bySignature.values());
		});
	}

	function removeSelectedFile(target: File) {
		setSelectedFiles((current) =>
			current.filter(
				(file) =>
					!(
						file.name === target.name &&
						file.size === target.size &&
						file.lastModified === target.lastModified
					),
			),
		);
	}

	function renderStepContent() {
		if (step === 0) {
			return (
				<>
					{renderStepHeader(
						1,
						'Capture and identify the issue',
						'Start with the essentials. What is it that you have seen? Document the issue with video or photos.',
					)}
					{isSignedIn ? (
						<>
								<Card size="sm">
								<CardHeader>
									<CardTitle>Report media</CardTitle>
									<CardDescription>Upload between 1 and 6 photos, or one short video, if it helps explain the issue clearly.</CardDescription>
								</CardHeader>
								<CardContent className="grid gap-4">
									{selectedFiles.length > 0 ? (
										<div className="report-media-preview-grid">
											{mediaPreviewUrls.map(({ file, url }) => (
												<div className="report-media-preview-card" key={`${file.name}-${file.size}-${file.lastModified}`}>
													{file.type.startsWith('image/') ? (
														<img alt={file.name} className="report-media-preview" src={url} />
													) : (
														<div className="report-media-preview-fallback">
															<FileVideo size={22} />
														</div>
													)}
													<div className="report-media-preview-copy">
														<strong>{file.name}</strong>
														<span>{file.type.startsWith('video/') ? 'Video selected' : 'Photo selected'}</span>
													</div>
													<Button className="report-media-preview-remove" onClick={() => removeSelectedFile(file)} size="sm" type="button" variant="ghost">
														Remove
													</Button>
												</div>
											))}
										</div>
									) : (
										<div className="report-media-empty-state">
											<span className="report-media-picker-icon">
												<ImageIcon size={18} />
											</span>
											<strong>Report media</strong>
											<span>Choose one or more photos or a short video that show the issue clearly.</span>
										</div>
									)}
									<Input
										id="reporter-photo"
										accept="image/*,video/*"
										className="sr-only"
										multiple
										onChange={(event) => {
											appendSelectedFiles(event.target.files);
											event.currentTarget.value = '';
										}}
										type="file"
									/>
									<div className="grid gap-3">
										<Button asChild className="report-action-button" size="lg" variant="outline">
											<label htmlFor="reporter-photo">
												<span className="report-action-row-icon">
													<FileVideo size={18} />
												</span>
												<span className="report-action-row-copy">
													<strong>Record a video</strong>
													<span>Start recording what you can see.</span>
												</span>
												<ChevronRight className="report-action-row-chevron" size={18} />
											</label>
										</Button>
										<Button asChild className="report-action-button" size="lg" variant="outline">
											<label htmlFor="reporter-photo">
												<span className="report-action-row-icon">
													<Camera size={18} />
												</span>
												<span className="report-action-row-copy">
													<strong>Take some photos</strong>
													<span>Show clearly in photos what you can see.</span>
												</span>
												<ChevronRight className="report-action-row-chevron" size={18} />
											</label>
										</Button>
										<Button asChild className="report-action-button" size="lg" variant="outline">
											<label htmlFor="reporter-photo">
												<span className="report-action-row-icon">
													<Library size={18} />
												</span>
												<span className="report-action-row-copy">
													<strong>Upload from library</strong>
													<span>Open your library to upload media files.</span>
												</span>
												<ChevronRight className="report-action-row-chevron" size={18} />
											</label>
										</Button>
									</div>
								</CardContent>
							</Card>
						</>
					) : (
						<>
							<Card size="sm">
								<CardHeader>
									<CardTitle>Create an account before you report</CardTitle>
									<CardDescription>
										Reports are tied to an account so updates, timelines, and notifications stay connected to the right person.
									</CardDescription>
								</CardHeader>
								<CardContent className="grid gap-3">
									<div className="report-review-hero">
										<strong>Why this comes first</strong>
										<span>Sign in once, finish onboarding, then return here with your draft still intact.</span>
									</div>
								</CardContent>
							</Card>
						</>
					)}
				</>
			);
		}

		if (step === 1) {
			return (
				<>
					{renderStepHeader(
						2,
						'Place the report on the map',
						'Move the map until the pin sits on the exact place that needs attention.',
					)}
					<Card size="sm">
						<CardContent className="report-map-card">
							<div className="report-map-box">
								<div className="report-map-surface" ref={mapContainerRef}></div>
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
							<div className="report-step-two-controls">
								<Input
									id="report-location-label"
									onChange={(event) => setLocationQuery(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === 'Enter') {
											event.preventDefault();
											void searchLocation();
										}
									}}
									placeholder="Search for a place"
									type="search"
									value={locationQuery}
								/>
								<div className="report-inline-actions">
									<Button onClick={searchLocation} type="button" variant="secondary">
										Search
									</Button>
									<Button onClick={detectLocation} type="button" variant="secondary">
										Use current location
									</Button>
								</div>
								<div className="report-spatial-section report-spatial-section-subtle">
									<div className="report-selected-context-copy">
										<strong>Chosen place</strong>
										<span>
											{draft.locationLabel || (hasMapInteraction
												? 'Updating the address for this pin.'
												: 'Move the map or search for a place first.')}
										</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</>
			);
		}

		if (step === 2) {
			return (
				<>
					{renderStepHeader(
						3,
						'What kind of issue is it?',
						'Choose the issue group first, then pick the most accurate issue type.',
					)}
					<QuestionFlow
						className="report-question-flow"
						key={`report-issue-flow-${draft.groupId || 'group'}-${draft.categoryId || 'none'}`}
						defaultValue={selectedGroup ? (draft.categoryId ? [draft.categoryId] : []) : draft.groupId ? [draft.groupId] : []}
						id={`report-issue-flow-full-${draft.groupId || 'group'}-${draft.categoryId || 'none'}`}
						onBack={goToPreviousStep}
						onSelect={(optionIds) => {
							const selectedId = optionIds[0];
							if (!selectedId) return;
							if (!selectedGroup) {
								selectGroup(selectedId);
								return;
							}
							selectCategory(selectedId);
							window.setTimeout(() => goToNextStep(), 0);
						}}
						options={selectedGroup ? reportCategoryOptions : reportGroupOptions}
						step={selectedGroup ? 2 : 1}
						title={selectedGroup ? `Choose the ${selectedGroup.shortTitle.toLowerCase()} issue` : 'Choose the issue group'}
						description={
							selectedGroup
								? 'Pick the most accurate issue type for this location.'
								: 'Start broad, then narrow down to the exact issue.'
						}
					/>
					{selectedGroup ? (
						<div className="report-inline-actions">
							<Button onClick={() => setDraft((current) => ({ ...current, groupId: '', categoryId: '' }))} type="button" variant="secondary">
								Change group
							</Button>
						</div>
					) : null}
				</>
			);
		}

		if (step === 3) {
			return (
				<>
					{renderStepHeader(4, 'Add detail and severity', 'Keep it short, specific, and useful to the council team.')}
					{renderEmergencyNotice(
						'This warning is now visible because the category or severity indicates a public safety risk.',
					)}
					<Card size="sm">
						<CardHeader>
							<CardTitle>Describe the issue</CardTitle>
							<CardDescription>Focus on what happened and why it matters.</CardDescription>
						</CardHeader>
						<CardContent>
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="report-description">Short description</FieldLabel>
									<FieldDescription>Keep this to one or two sentences the receiving team can act on quickly.</FieldDescription>
									<Textarea
										id="report-description"
										onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
										placeholder="Describe what happened and why it matters."
										rows={4}
										value={draft.description}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="report-notes">Notes (optional)</FieldLabel>
									<FieldDescription>Add any extra context that helps with access, timing, or safety.</FieldDescription>
									<Textarea
										id="report-notes"
										onChange={(event) => setDraft((current) => ({ ...current, notesMarkdown: event.target.value }))}
										placeholder="- blocked pavement&#10;- dangerous at school pick-up"
										rows={5}
										value={draft.notesMarkdown}
									/>
								</Field>
							</FieldGroup>
						</CardContent>
					</Card>
					<Card size="sm">
						<CardHeader>
							<CardTitle>Severity</CardTitle>
							<CardDescription>Use a higher severity only when the issue is urgent or unsafe.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-3">
							<div className="report-severity-row">
								<div className="report-severity-copy">
									<strong>Level {draft.severity}</strong>
									<span>{getSeverityLabel(draft.severity)}</span>
								</div>
								<Badge variant={draft.severity >= 5 ? 'destructive' : draft.severity >= 4 ? 'default' : 'secondary'}>
									{getSeverityLabel(draft.severity)}
								</Badge>
							</div>
							<Progress value={(draft.severity / 5) * 100} />
							<Slider
								id="report-severity"
								className="report-range"
								max={5}
								min={1}
								onValueChange={(value) =>
									setDraft((current) => ({
										...current,
										severity: value[0] ?? current.severity,
									}))
								}
								step={1}
								value={[draft.severity]}
							/>
							<div className="report-slider-labels">
								<span>Low</span>
								<span>Medium</span>
								<span>High</span>
							</div>
						</CardContent>
					</Card>
				</>
			);
		}

		return (
			<>
					{renderStepHeader(5, 'Review and submit', 'Check the essentials, then send the report into the live pipeline.')}
				<div className="report-review-summary">
					<div className="report-review-hero">
						<strong>Ready to submit</strong>
						<span>The issue, location, and routing are lined up. Review the essentials, then submit.</span>
					</div>
					<Separator />
				<div className="report-summary-grid">
					<Card className="report-summary-card" size="sm">
						<CardHeader>
							<CardTitle><FileText data-icon="inline-start" /> Reporter</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="report-summary-value">{draft.name || 'Your account'}</p>
							<p>{draft.email || 'Signed-in account'}</p>
						</CardContent>
					</Card>
					<Card className="report-summary-card" size="sm">
						<CardHeader>
							<CardTitle><Sparkles data-icon="inline-start" /> Issue type</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="report-summary-value">{selectedCategory?.title ?? 'Not selected yet'}</p>
							<p>{selectedGroup?.title ?? 'Choose a group first'}</p>
						</CardContent>
					</Card>
					<Card className="report-summary-card" size="sm">
						<CardHeader>
							<CardTitle><MapPin data-icon="inline-start" /> Location</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="report-summary-value">{draft.locationLabel || 'Pinned location'}</p>
							<p>{draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)}</p>
						</CardContent>
					</Card>
					<Card className="report-summary-card" size="sm">
						<CardHeader>
							<CardTitle><ChevronRight data-icon="inline-start" /> Routing</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="report-summary-value">{routingState.authorityName ?? routingCopy.label}</p>
							<p>{routingState.departmentName ? `${routingState.departmentName}${routingState.destinationType === 'webform' ? ' • form available' : ''}` : routingCopy.copy}</p>
						</CardContent>
					</Card>
					<Card className="report-summary-card" size="sm">
						<CardHeader>
							<CardTitle><AlertTriangle data-icon="inline-start" /> Severity</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="report-summary-value">Level {draft.severity}</p>
							<div className="report-review-severity">
								<Progress value={(draft.severity / 5) * 100} />
								<Badge variant={draft.severity >= 5 ? 'destructive' : draft.severity >= 4 ? 'default' : 'secondary'}>
									{getSeverityLabel(draft.severity)}
								</Badge>
							</div>
						</CardContent>
					</Card>
					<Card className="report-summary-card" size="sm">
						<CardHeader>
							<CardTitle><Camera data-icon="inline-start" /> Media</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="report-summary-value">
								{selectedFiles.length > 0
									? `${selectedFiles.length} media item${selectedFiles.length === 1 ? '' : 's'} attached`
									: 'No media attached'}
							</p>
							<p>{selectedFiles.length > 0 ? 'Included in the submitted report.' : 'You can still go back and add photos or a short video.'}</p>
						</CardContent>
					</Card>
					<Card className="report-summary-card report-summary-card-wide" size="sm">
						<CardHeader>
							<CardTitle><FileText data-icon="inline-start" /> Description</CardTitle>
						</CardHeader>
						<CardContent className="report-review-stack">
							<p className="report-summary-value">{draft.description || 'No description yet'}</p>
							{draft.notesMarkdown ? <p>{draft.notesMarkdown}</p> : <p>No extra notes added.</p>}
						</CardContent>
					</Card>
				</div>
				</div>
			</>
		);
	}

	return (
		<div className={`report-experience ${showMap ? 'has-map' : ''} is-fullscreen`}>
			<div className="report-fullscreen-shell">
				<div className="report-fullscreen-close">
					<ExitReportButton />
				</div>
				<div className="report-fullscreen-card" ref={fullscreenShellRef}>
					{renderStepContent()}
					{renderStatusNotice()}
				</div>
				{renderStepActions()}
			</div>
		</div>
	);
}
