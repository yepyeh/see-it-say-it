import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
import { ArrowRight, CheckCheck, Copy, MapPin, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import './public-reports-map.css';

type ReportSummary = {
	reportId: string;
	category: string;
	description: string;
	severity: number;
	status: string;
	latitude: number;
	longitude: number;
	locationLabel: string | null;
	authorityCode: string | null;
	authorityName: string | null;
	confirmationCount: number;
	duplicateCount: number;
};

type PublicReportsMapProps = {
	reports: ReportSummary[];
};

type ReportFeatureProperties = {
	reportId: string;
	category: string;
	description: string;
	severity: number;
	status: string;
	locationLabel: string | null;
	authorityCode: string | null;
	authorityName: string | null;
	confirmationCount: number;
	duplicateCount: number;
};

function getBounds(reports: ReportSummary[]) {
	if (!reports.length) return null;
	const bounds = new maplibregl.LngLatBounds(
		[reports[0].longitude, reports[0].latitude],
		[reports[0].longitude, reports[0].latitude],
	);
	for (const report of reports.slice(1)) {
		bounds.extend([report.longitude, report.latitude]);
	}
	return bounds;
}

function getStatusLabel(status: string) {
	return status.replaceAll('_', ' ');
}

function getSeverityMeta(severity: number) {
	if (severity >= 4) {
		return { label: severity >= 5 ? 'High priority' : 'High', progress: 100, tone: 'is-high' };
	}
	if (severity === 3) {
		return { label: 'Medium', progress: 50, tone: 'is-medium' };
	}
	return { label: 'Low', progress: 25, tone: 'is-low' };
}

function getShortAddress(locationLabel: string | null, latitude: number, longitude: number) {
	if (!locationLabel) return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
	return locationLabel
		.split(',')
		.map((part) => part.trim())
		.find(Boolean) ?? locationLabel;
}

export default function PublicReportsMap({ reports }: PublicReportsMapProps) {
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapFrameRef = useRef<HTMLDivElement | null>(null);
	const overlayCardRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);
	const [activeReportId, setActiveReportId] = useState<string | null>(null);
	const [hoveredReportId, setHoveredReportId] = useState<string | null>(null);
	const [overlayStyle, setOverlayStyle] = useState<{ left: number; top: number } | null>(null);

	const activeReport = useMemo(
		() => reports.find((report) => report.reportId === activeReportId) ?? null,
		[activeReportId, reports],
	);
	const hoveredReport = useMemo(
		() => reports.find((report) => report.reportId === hoveredReportId) ?? null,
		[hoveredReportId, reports],
	);

	const updateOverlayPosition = useCallback(() => {
		if (!activeReport || !mapRef.current || !mapFrameRef.current || !overlayCardRef.current) {
			setOverlayStyle(null);
			return;
		}

		const point = mapRef.current.project([activeReport.longitude, activeReport.latitude]);
		const frameRect = mapFrameRef.current.getBoundingClientRect();
		const cardRect = overlayCardRef.current.getBoundingClientRect();
		const gap = 16;
		const left = Math.min(
			Math.max(point.x - cardRect.width / 2, gap),
			Math.max(gap, frameRect.width - cardRect.width - gap),
		);
		const top = Math.max(gap, point.y - cardRect.height - gap);

		setOverlayStyle({ left, top });
	}, [activeReport]);

	const featureCollection = useMemo(
		() => ({
			type: 'FeatureCollection' as const,
			features: reports.map((report) => ({
				type: 'Feature' as const,
				geometry: {
					type: 'Point' as const,
					coordinates: [report.longitude, report.latitude] as [number, number],
				},
				properties: {
					reportId: report.reportId,
					category: report.category,
					description: report.description,
					severity: report.severity,
					status: report.status,
					locationLabel: report.locationLabel,
					authorityCode: report.authorityCode,
					authorityName: report.authorityName,
					confirmationCount: report.confirmationCount,
					duplicateCount: report.duplicateCount,
				} satisfies ReportFeatureProperties,
			})),
		}),
		[reports],
	);

	useEffect(() => {
		if (!mapContainerRef.current || mapRef.current) return;

		const map = new maplibregl.Map({
			container: mapContainerRef.current,
			style: {
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
			},
			center: reports[0] ? [reports[0].longitude, reports[0].latitude] : [-2.58791, 51.454514],
			zoom: reports[0] ? 11 : 5.5,
			attributionControl: true,
		});

		map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');

		map.on('load', () => {
			map.addSource('reports', {
				type: 'geojson',
				data: featureCollection,
				cluster: true,
				clusterRadius: 42,
				clusterMaxZoom: 14,
			});

			map.addLayer({
				id: 'report-clusters',
				type: 'circle',
				source: 'reports',
				filter: ['has', 'point_count'],
				paint: {
					'circle-color': [
						'step',
						['get', 'point_count'],
						'#111827',
						8,
						'#1d4ed8',
						20,
						'#dc2626',
					],
					'circle-radius': [
						'step',
						['get', 'point_count'],
						18,
						8,
						22,
						20,
						26,
					],
					'circle-stroke-color': '#ffffff',
					'circle-stroke-width': 3,
				},
			});

			map.addLayer({
				id: 'report-cluster-count',
				type: 'symbol',
				source: 'reports',
				filter: ['has', 'point_count'],
				layout: {
					'text-field': ['get', 'point_count_abbreviated'],
					'text-size': 12,
					'text-font': ['Arial Unicode MS Bold'],
				},
				paint: {
					'text-color': '#ffffff',
				},
			});

			map.addLayer({
				id: 'report-points',
				type: 'circle',
				source: 'reports',
				filter: ['!', ['has', 'point_count']],
				paint: {
					'circle-color': [
						'case',
						['==', ['get', 'severity'], 5],
						'#dc2626',
						['>=', ['get', 'severity'], 4],
						'#ea580c',
						'#0f172a',
					],
					'circle-radius': [
						'interpolate',
						['linear'],
						['zoom'],
						7,
						7,
						12,
						9,
						16,
						11,
					],
					'circle-stroke-color': '#ffffff',
					'circle-stroke-width': 2,
				},
			});

			map.addSource('report-selection', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: [],
				},
			});

			map.addLayer({
				id: 'report-selection-ring',
				type: 'circle',
				source: 'report-selection',
				paint: {
					'circle-radius': [
						'interpolate',
						['linear'],
						['zoom'],
						7,
						11,
						12,
						14,
						16,
						18,
					],
					'circle-color': 'rgba(20, 184, 166, 0.12)',
					'circle-stroke-color': '#14b8a6',
					'circle-stroke-width': 3,
				},
			});

			map.on('click', 'report-clusters', async (event) => {
				const feature = event.features?.[0];
				const clusterId = feature?.properties?.cluster_id;
				if (clusterId === undefined) return;
				const source = map.getSource('reports') as GeoJSONSource | undefined;
				if (!source) return;
				const zoom = await source.getClusterExpansionZoom(clusterId);
				const coordinates = (feature?.geometry as GeoJSON.Point | undefined)?.coordinates;
				if (!coordinates) return;
				map.easeTo({
					center: coordinates as [number, number],
					zoom,
					duration: 350,
				});
			});

			map.on('click', 'report-points', (event) => {
				const feature = event.features?.[0];
				const reportId = feature?.properties?.reportId;
				if (!reportId) return;
				setActiveReportId(String(reportId));
			});

			map.on('click', (event) => {
				const features = map.queryRenderedFeatures(event.point, { layers: ['report-points', 'report-clusters'] });
				if (!features.length) {
					setActiveReportId(null);
				}
			});

			map.on('mouseenter', 'report-clusters', () => {
				map.getCanvas().style.cursor = 'pointer';
			});
			map.on('mouseleave', 'report-clusters', () => {
				map.getCanvas().style.cursor = '';
			});
			map.on('mouseenter', 'report-points', () => {
				map.getCanvas().style.cursor = 'pointer';
			});
			map.on('mouseleave', 'report-points', () => {
				map.getCanvas().style.cursor = '';
			});

			const bounds = getBounds(reports);
			if (bounds) {
				map.fitBounds(bounds, { padding: 72, maxZoom: 13, duration: 0 });
			}
		});

		mapRef.current = map;

		return () => {
			map.remove();
			mapRef.current = null;
		};
	}, [featureCollection, reports]);

	useEffect(() => {
		const source = mapRef.current?.getSource('reports') as GeoJSONSource | undefined;
		if (!source) return;
		source.setData(featureCollection);
		const bounds = getBounds(reports);
		if (bounds && reports.length > 1) {
			mapRef.current?.fitBounds(bounds, { padding: 72, maxZoom: 13, duration: 0 });
		}
	}, [featureCollection, reports]);

	useEffect(() => {
		if (!mapRef.current || !activeReport) return;
		const isDesktop = typeof window !== 'undefined' ? window.matchMedia('(min-width: 960px)').matches : true;
		mapRef.current.easeTo({
			center: [activeReport.longitude, activeReport.latitude],
			zoom: Math.max(mapRef.current.getZoom(), 14),
			offset: [0, isDesktop ? 160 : 120],
			duration: 350,
		});
	}, [activeReport]);

	useEffect(() => {
		const source = mapRef.current?.getSource('report-selection') as GeoJSONSource | undefined;
		if (!source) return;
		const selected = activeReport ?? hoveredReport;
		source.setData({
			type: 'FeatureCollection',
			features: selected
				? [
						{
							type: 'Feature',
							geometry: {
								type: 'Point',
								coordinates: [selected.longitude, selected.latitude],
							},
							properties: { reportId: selected.reportId },
						},
					]
				: [],
		});
	}, [activeReport, hoveredReport]);

	useEffect(() => {
		if (!mapRef.current) return;
		const map = mapRef.current;
		const sync = () => {
			window.requestAnimationFrame(updateOverlayPosition);
		};

		map.on('move', sync);
		map.on('resize', sync);
		sync();

		return () => {
			map.off('move', sync);
			map.off('resize', sync);
		};
	}, [updateOverlayPosition]);

	return (
		<div className="public-reports-map-layout">
			<div className="public-reports-map-frame" ref={mapFrameRef}>
				<div className="public-reports-map-surface" ref={mapContainerRef}></div>
				<div className="public-reports-map-toolbar">
					<Badge variant="secondary">{reports.length} live reports</Badge>
					{activeReport ? (
						<Button onClick={() => setActiveReportId(null)} size="sm" type="button" variant="outline">
							Clear selection
						</Button>
					) : null}
				</div>
				{activeReport ? (
					<Card
						className={`public-reports-map-overlay-card${overlayStyle ? '' : ' is-positioning'}`}
						ref={overlayCardRef}
						style={{ left: `${overlayStyle?.left ?? 16}px`, top: `${overlayStyle?.top ?? 16}px` }}
					>
						<CardHeader>
							<div className="public-reports-map-card-head">
								<div className="space-y-2">
									<Badge variant="secondary">{getStatusLabel(activeReport.status)}</Badge>
									<CardTitle>{activeReport.category}</CardTitle>
									<CardDescription>{activeReport.description}</CardDescription>
								</div>
								<div className={`public-reports-severity public-reports-severity-${getSeverityMeta(activeReport.severity).tone}`}>
									<div className="public-reports-severity-head">
										<TriangleAlert className="public-reports-inline-icon" />
										<span>Severity {activeReport.severity}</span>
									</div>
									<Progress className="public-reports-severity-progress" value={getSeverityMeta(activeReport.severity).progress} />
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<div className="public-reports-meta-line public-reports-meta-line--primary">
									<MapPin className="public-reports-inline-icon" />
									<span>{getShortAddress(activeReport.locationLabel, activeReport.latitude, activeReport.longitude)}</span>
								</div>
								<div className="public-reports-meta-line">
									<ShieldCheck className="public-reports-inline-icon" />
									{activeReport.authorityCode ? (
										<a href={`/authorities/${activeReport.authorityCode}`}>
											{activeReport.authorityName ?? 'Routing pending'}
										</a>
									) : (
										activeReport.authorityName ?? 'Routing pending'
									)}
								</div>
								<div className="public-reports-stat-badges">
									<Badge className="public-reports-count-badge" variant="secondary">
										<CheckCheck className="public-reports-inline-icon" />
										<span>{activeReport.confirmationCount}</span>
									</Badge>
									<Badge className="public-reports-count-badge" variant="secondary">
										<Copy className="public-reports-inline-icon" />
										<span>{activeReport.duplicateCount}</span>
									</Badge>
								</div>
							</div>
							<div className="card-actions">
								<Button asChild type="button" variant="secondary">
									<a href={`/reports/${activeReport.reportId}`}>
										Open report
										<ArrowRight className="public-reports-button-icon" />
									</a>
								</Button>
							</div>
						</CardContent>
					</Card>
				) : null}
			</div>

			<div className="public-reports-map-list">
				{reports.map((report) => (
					<Card
						className={
							report.reportId === activeReportId
								? 'public-reports-map-card is-active'
								: report.reportId === hoveredReportId
									? 'public-reports-map-card is-hovered'
									: 'public-reports-map-card'
						}
						key={report.reportId}
					>
						<CardContent className="public-reports-map-card-body">
							<button
								className="public-reports-map-card-button"
								onClick={() => setActiveReportId(report.reportId)}
								onMouseEnter={() => setHoveredReportId(report.reportId)}
								onMouseLeave={() => setHoveredReportId((current) => (current === report.reportId ? null : current))}
								onFocus={() => setHoveredReportId(report.reportId)}
								onBlur={() => setHoveredReportId((current) => (current === report.reportId ? null : current))}
								type="button"
							>
								<div className="public-reports-map-card-head">
									<div className="space-y-2">
										<Badge variant="secondary">{getStatusLabel(report.status)}</Badge>
										<h3>{report.category}</h3>
									</div>
									<div className={`public-reports-severity public-reports-severity-${getSeverityMeta(report.severity).tone}`}>
										<div className="public-reports-severity-head">
											<TriangleAlert className="public-reports-inline-icon" />
											<span>Severity {report.severity}</span>
										</div>
										<Progress className="public-reports-severity-progress" value={getSeverityMeta(report.severity).progress} />
									</div>
								</div>
								<p>{report.description}</p>
								<div className="space-y-3">
									<div className="public-reports-meta-line public-reports-meta-line--primary">
										<MapPin className="public-reports-inline-icon" />
										<span>{getShortAddress(report.locationLabel, report.latitude, report.longitude)}</span>
									</div>
									<div className="public-reports-meta-line">
										<ShieldCheck className="public-reports-inline-icon" />
										{report.authorityCode ? (
											<a href={`/authorities/${report.authorityCode}`} onClick={(event) => event.stopPropagation()}>
												{report.authorityName ?? 'Routing pending'}
											</a>
										) : (
											report.authorityName ?? 'Routing pending'
										)}
									</div>
									<div className="public-reports-stat-badges">
										<Badge className="public-reports-count-badge" variant="secondary">
											<CheckCheck className="public-reports-inline-icon" />
											<span>{report.confirmationCount}</span>
										</Badge>
										<Badge className="public-reports-count-badge" variant="secondary">
											<Copy className="public-reports-inline-icon" />
											<span>{report.duplicateCount}</span>
										</Badge>
									</div>
								</div>
							</button>
							<div className="card-actions">
								<Button asChild type="button" variant="secondary">
									<a href={`/reports/${report.reportId}`}>
										Open report
										<ArrowRight className="public-reports-button-icon" />
									</a>
								</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
