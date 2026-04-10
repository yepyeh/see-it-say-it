import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import './report-detail-map.css';

type ReportDetailMapProps = {
	latitude: number;
	longitude: number;
	locationLabel?: string | null;
};

export default function ReportDetailMap({
	latitude,
	longitude,
	locationLabel,
}: ReportDetailMapProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);

	useEffect(() => {
		if (!containerRef.current || mapRef.current) return;

		const map = new maplibregl.Map({
			container: containerRef.current,
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
			center: [longitude, latitude],
			zoom: 15,
			attributionControl: true,
		});

		map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');

		const marker = new maplibregl.Marker({ color: '#14b8a6' })
			.setLngLat([longitude, latitude])
			.setPopup(locationLabel ? new maplibregl.Popup({ offset: 16 }).setText(locationLabel) : undefined)
			.addTo(map);

		if (locationLabel) {
			marker.togglePopup();
		}

		mapRef.current = map;

		return () => {
			marker.remove();
			map.remove();
			mapRef.current = null;
		};
	}, [latitude, longitude, locationLabel]);

	return <div className="report-detail-map-frame" ref={containerRef} />;
}
