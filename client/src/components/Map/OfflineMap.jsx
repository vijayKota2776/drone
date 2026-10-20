import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './OfflineMap.css';
import PlatformMarker from './PlatformMarker';
import FlightTrack from './FlightTrack';
import { hasPosition, latLonToGR } from '../../telemetryDisplay';

import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetina,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
});

// A simple base64 encoded SVG to create an infinite tactical grid
const TACTICAL_GRID_TILE = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iIzBkMGYxNCIgc3Ryb2tlPSIjMmQzNzQ4IiBzdHJva2Utd2lkdGg9IjEiLz48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjIiIGZpbGw9IiM0YTU1NjgiLz48L3N2Zz4=";

const MapInteraction = ({ appMode, waypoints, setWaypoints, loadObservations, onCursorMove }) => {
    useMapEvents({
        mousemove(e) {
            if (onCursorMove) {
                onCursorMove({ lat: e.latlng.lat, lng: e.latlng.lng });
            }
        },
        async click(e) {
            if (appMode === 'PLANNING' && setWaypoints) {
                const newWp = {
                    lat: e.latlng.lat,
                    lng: e.latlng.lng,
                    gridReference: latLonToGR(e.latlng.lat, e.latlng.lng)
                };
                setWaypoints([...(waypoints || []), newWp]);
            } else if (appMode === 'OBSERVE' && window.electronAPI) {
                await window.electronAPI.saveObservation({
                    latitude: e.latlng.lat,
                    longitude: e.latlng.lng,
                    gridReference: latLonToGR(e.latlng.lat, e.latlng.lng)
                });
                if (loadObservations) loadObservations();
            }
        }
    });
    return null;
};

const OfflineMap = ({ 
    telemetry, 
    platforms = {}, 
    selectedPlatformId, 
    onSelectPlatform, 
    appMode, 
    waypoints = [], 
    setWaypoints, 
    observations = [], 
    loadObservations, 
    layers = {flightPath: true, observations: true, waypoints: true}, 
    showGrid = false 
}) => {
    const mapRef = useRef();
    const [cursorCoords, setCursorCoords] = useState(null);

    // Pan map to follow selected drone if telemetry updates, but only if not planning
    useEffect(() => {
        if (mapRef.current && hasPosition(telemetry?.position) && appMode !== 'PLANNING') {
            const map = mapRef.current;
            map.panTo([telemetry.position.latitude, telemetry.position.longitude], { animate: true });
        }
    }, [telemetry, appMode]);

    // Active platform list (if multiple drones tracked, render all)
    const activePlatforms = Object.keys(platforms).length > 0 
        ? Object.values(platforms) 
        : (telemetry && hasPosition(telemetry.position) ? [telemetry] : []);

    return (
        <div className={`offline-map-container ${showGrid ? 'show-tactical-grid' : ''}`}>
            <div className="tactical-mode-badge" style={appMode === 'PLANNING' ? {backgroundColor: 'rgba(237, 137, 54, 0.8)', borderColor: '#ed8936', color: '#fff'} : {}}>
                {appMode === 'PLANNING' ? 'MISSION PLANNING MODE' : 'TACTICAL GRID MODE (OFFLINE)'}
            </div>
            
            <MapContainer 
                center={[28.6000, 73.5000]} // Bikaner & Sri Ganganagar Tactical Region
                zoom={10} 
                minZoom={2}
                maxZoom={18}
                style={{ height: "100%", width: "100%", backgroundColor: "#0d0f14", cursor: appMode === 'PLANNING' ? 'crosshair' : 'grab' }}
                zoomControl={true}
                ref={mapRef}
            >
                {/* 100% Offline Tactical Grid Fallback */}
                <TileLayer
                    url={TACTICAL_GRID_TILE}
                    attribution="&copy; Offline ESM Grid"
                />

                {/* Local MBTiles Map Server (will load real offline maps if available) */}
                <TileLayer
                    url="maptile://map/{z}/{x}/{y}.png"
                />

                <MapInteraction 
                    appMode={appMode} 
                    waypoints={waypoints} 
                    setWaypoints={setWaypoints} 
                    loadObservations={loadObservations} 
                    onCursorMove={setCursorCoords}
                />

                {/* Render Mission Waypoints */}
                {layers.waypoints && waypoints.map((wp, i) => (
                    <Marker key={`wp-${i}`} position={[wp.lat, wp.lng]} />
                ))}
                
                {layers.waypoints && waypoints.length > 1 && (
                    <Polyline positions={waypoints.map(w => [w.lat, w.lng])} color="#ed8936" weight={3} />
                )}

                {/* Render Observations */}
                {layers.observations && observations && observations.map((obs) => (
                    <Marker key={`obs-${obs.id}`} position={[obs.latitude, obs.longitude]} />
                ))}

                {/* Multi-Drone Flight Paths */}
                {layers.flightPath && appMode !== 'PLANNING' && appMode !== 'OBSERVE' && (
                    activePlatforms.length > 0 ? (
                        activePlatforms.map(p => {
                            const isFeed3 = p.platformId && (p.platformId.includes('3') || p.platformId.toLowerCase().includes('army'));
                            const isFeed2 = p.platformId && p.platformId.includes('2');
                            const trackColor = isFeed3 ? '#10b981' : (isFeed2 ? '#ed8936' : '#00f0ff');
                            return (
                                <FlightTrack 
                                    key={`track-${p.platformId}`} 
                                    currentPosition={p.position} 
                                    color={trackColor}
                                />
                            );
                        })
                    ) : (
                        <FlightTrack currentPosition={telemetry?.position} />
                    )
                )}
                
                {/* Multi-Drone Platform Markers */}
                {activePlatforms.length > 0 ? (
                    activePlatforms.map(p => {
                        const isFeed3 = p.platformId && (p.platformId.includes('3') || p.platformId.toLowerCase().includes('army'));
                        const isFeed2 = p.platformId && p.platformId.includes('2');
                        const markerColor = isFeed3 ? '#10b981' : (isFeed2 ? '#ed8936' : '#00f0ff');
                        const isSelected = selectedPlatformId === p.platformId;
                        return (
                            <PlatformMarker 
                                key={`marker-${p.platformId}`}
                                position={p.position} 
                                platformId={p.platformId}
                                model={p.model || p.status?.model}
                                color={markerColor}
                                isSelected={isSelected}
                                onSelect={onSelectPlatform}
                            />
                        );
                    })
                ) : (
                    <PlatformMarker 
                        position={telemetry?.position} 
                        platformId={telemetry?.platformId} 
                        isSelected={true}
                        onSelect={onSelectPlatform}
                    />
                )}
            </MapContainer>

            {/* Tactical MGRS / ESM Cursor Readout */}
            <div className="tactical-cursor-readout">
                <span className="cursor-label">CURSOR GR:</span>
                <span className="cursor-value">{cursorCoords ? latLonToGR(cursorCoords.lat, cursorCoords.lng) : '--'}</span>
                <span className="cursor-latlon">
                    {cursorCoords ? `(${cursorCoords.lat.toFixed(5)}°, ${cursorCoords.lng.toFixed(5)}°)` : '(MOVE MOUSE OVER MAP)'}
                </span>
            </div>
        </div>
    );
};

export default OfflineMap;
