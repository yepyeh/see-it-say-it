import { useEffect, useMemo, useRef, useState } from 'react';
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

export default function PublicReportsMap({ reports }: PublicReportsMapProps) {
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);
	const [activeReportId, setActiveReportId] = useState<string | null>(null);
	const [hoveredReportId, setHoveredReportId] = useState<string | null>(null);

	const activeReport = useMemo(
		() => reports.find((report) => report.reportId === activeReportId) ?? null,
		[activeReportId, reports],
	);
	const hoveredReport = useMemo(
		() => reports.find((report) => report.reportId === hoveredReportId) ?? null,
		[hoveredReportId, reports],
	);

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
		mapRef.current.easeTo({
			center: [activeReport.longitude, activeReport.latitude],
			zoom: Math.max(mapRef.current.getZoom(), 14),
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

	return (
		<div className="public-reports-map-layout">
			<div className="public-reports-map-frame">
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
					<Card className="public-reports-map-overlay-card">
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
							<dl className="report-meta">
								<div>
									<dt>Location</dt>
									<dd className="public-reports-meta-line">
										<MapPin className="public-reports-inline-icon" />
										{activeReport.locationLabel ??
											`${activeReport.latitude.toFixed(4)}, ${activeReport.longitude.toFixed(4)}`}
									</dd>
								</div>
								<div>
									<dt>Authority</dt>
									<dd className="public-reports-meta-line">
										<ShieldCheck className="public-reports-inline-icon" />
										{activeReport.authorityCode ? (
											<a href={`/authorities/${activeReport.authorityCode}`}>
												{activeReport.authorityName ?? 'Routing pending'}
											</a>
										) : (
											activeReport.authorityName ?? 'Routing pending'
										)}
									</dd>
								</div>
								<div>
									<dt>Confirmations</dt>
									<dd className="public-reports-meta-line">
										<CheckCheck className="public-reports-inline-icon" />
										{activeReport.confirmationCount}
									</dd>
								</div>
								<div>
									<dt>Duplicates</dt>
									<dd className="public-reports-meta-line">
										<Copy className="public-reports-inline-icon" />
										{activeReport.duplicateCount}
									</dd>
								</div>
							</dl>
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
								<dl className="report-meta">
									<div>
										<dt>Location</dt>
										<dd className="public-reports-meta-line">
											<MapPin className="public-reports-inline-icon" />
											{report.locationLabel ?? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
										</dd>
									</div>
									<div>
										<dt>Authority</dt>
										<dd className="public-reports-meta-line">
											<ShieldCheck className="public-reports-inline-icon" />
											{report.authorityCode ? (
												<a href={`/authorities/${report.authorityCode}`} onClick={(event) => event.stopPropagation()}>
													{report.authorityName ?? 'Routing pending'}
												</a>
											) : (
												report.authorityName ?? 'Routing pending'
											)}
										</dd>
									</div>
									<div>
										<dt>Confirmations</dt>
										<dd className="public-reports-meta-line">
											<CheckCheck className="public-reports-inline-icon" />
											{report.confirmationCount}
										</dd>
									</div>
									<div>
										<dt>Duplicates</dt>
										<dd className="public-reports-meta-line">
											<Copy className="public-reports-inline-icon" />
											{report.duplicateCount}
										</dd>
									</div>
								</dl>
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
