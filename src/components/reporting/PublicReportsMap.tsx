import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
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

export default function PublicReportsMap({ reports }: PublicReportsMapProps) {
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);
	const markersRef = useRef<maplibregl.Marker[]>([]);
	const [activeReportId, setActiveReportId] = useState<string>(reports[0]?.reportId ?? '');

	const activeReport = useMemo(
		() => reports.find((report) => report.reportId === activeReportId) ?? reports[0] ?? null,
		[activeReportId, reports],
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
			center: activeReport ? [activeReport.longitude, activeReport.latitude] : [-2.58791, 51.454514],
			zoom: activeReport ? 12.5 : 5.5,
			attributionControl: true,
		});

		map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
		mapRef.current = map;

		map.on('load', () => {
			const bounds = getBounds(reports);
			if (bounds) {
				map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
			}
		});

		return () => {
			markersRef.current.forEach((marker) => marker.remove());
			markersRef.current = [];
			map.remove();
			mapRef.current = null;
		};
	}, [reports, activeReport]);

	useEffect(() => {
		if (!mapRef.current) return;
		markersRef.current.forEach((marker) => marker.remove());
		markersRef.current = [];

		for (const report of reports) {
			const node = document.createElement('button');
			node.type = 'button';
			node.className = `public-reports-marker ${report.reportId === activeReportId ? 'is-active' : ''}`;
			node.setAttribute('aria-label', `${report.category} near ${report.locationLabel ?? 'reported location'}`);
			node.addEventListener('click', () => {
				setActiveReportId(report.reportId);
			});

			const marker = new maplibregl.Marker({ element: node, anchor: 'center' })
				.setLngLat([report.longitude, report.latitude])
				.addTo(mapRef.current);

			markersRef.current.push(marker);
		}
	}, [reports, activeReportId]);

	useEffect(() => {
		if (!mapRef.current || !activeReport) return;
		mapRef.current.flyTo({
			center: [activeReport.longitude, activeReport.latitude],
			zoom: Math.max(mapRef.current.getZoom(), 13),
			speed: 0.9,
		});
	}, [activeReport]);

	return (
		<div className="public-reports-map-layout">
			<div className="public-reports-map-frame">
				<div className="public-reports-map-surface" ref={mapContainerRef}></div>
				{activeReport ? (
					<article className="public-reports-map-overlay-card">
						<div className="public-reports-map-card-head">
							<div>
								<div className="status-pill">{activeReport.status.replaceAll('_', ' ')}</div>
								<h3>{activeReport.category}</h3>
							</div>
							<div className="severity-badge">Severity {activeReport.severity}</div>
						</div>
						<p>{activeReport.description}</p>
						<dl className="report-meta">
							<div>
								<dt>Location</dt>
								<dd>
									{activeReport.locationLabel ??
										`${activeReport.latitude.toFixed(4)}, ${activeReport.longitude.toFixed(4)}`}
								</dd>
							</div>
								<div>
									<dt>Authority</dt>
									<dd>
										{activeReport.authorityCode ? (
											<a href={`/authorities/${activeReport.authorityCode}`}>
												{activeReport.authorityName ?? 'Routing pending'}
											</a>
										) : (
											activeReport.authorityName ?? 'Routing pending'
										)}
									</dd>
								</div>
						</dl>
						<div className="card-actions">
							<a className="button-secondary" href={`/reports/${activeReport.reportId}`}>
								Open report
							</a>
						</div>
					</article>
				) : null}
			</div>
			<div className="public-reports-map-list">
				{reports.map((report) => (
					<article
						className={`public-reports-map-card ${report.reportId === activeReportId ? 'is-active' : ''}`}
						key={report.reportId}
					>
						<button
							className="public-reports-map-card-button"
							type="button"
							onClick={() => setActiveReportId(report.reportId)}
						>
							<div className="public-reports-map-card-head">
								<div>
									<div className="status-pill">{report.status.replaceAll('_', ' ')}</div>
									<h3>{report.category}</h3>
								</div>
								<div className="severity-badge">Severity {report.severity}</div>
							</div>
							<p>{report.description}</p>
							<dl className="report-meta">
								<div>
									<dt>Location</dt>
									<dd>{report.locationLabel ?? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}</dd>
								</div>
								<div>
									<dt>Authority</dt>
									<dd>
										{report.authorityCode ? (
											<a href={`/authorities/${report.authorityCode}`}>
												{report.authorityName ?? 'Routing pending'}
											</a>
										) : (
											report.authorityName ?? 'Routing pending'
										)}
									</dd>
								</div>
								<div>
									<dt>Confirmations</dt>
									<dd>{report.confirmationCount}</dd>
								</div>
								<div>
									<dt>Duplicates</dt>
									<dd>{report.duplicateCount}</dd>
								</div>
							</dl>
						</button>
						<div className="card-actions">
							<a className="button-secondary" href={`/reports/${report.reportId}`}>
								Open report
							</a>
						</div>
					</article>
				))}
			</div>
		</div>
	);
}
