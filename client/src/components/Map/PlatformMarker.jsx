import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { hasPosition, formatNumber, altitudeLabel, formatMGRS } from '../../telemetryDisplay';

// Helper to create custom colored SVG drone icon with callsign label
const createDroneIcon = (color = '#00f0ff', label = '', isSelected = false) => new L.DivIcon({
    html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 ${isSelected ? '10px' : '6px'} ${color});">
                <path d="M12 2L2 22L12 18L22 22L12 2Z" fill="${color}" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
            </svg>
            ${label ? `<span style="background: rgba(10,15,24,0.9); color: ${color}; border: 1px solid ${isSelected ? '#ffffff' : color}; font-size: 10px; font-weight: 700; padding: 1px 4px; border-radius: 3px; margin-top: 2px; white-space: nowrap; font-family: monospace; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">${label}</span>` : ''}
        </div>
    `,
    className: 'drone-marker',
    iconSize: [26, 36],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14]
});

const PlatformMarker = ({ position, platformId = 'Platform', model, color, isSelected = false, onSelect }) => {
    if (!hasPosition(position)) {
        return null; // Don't render if no position
    }

    const isFeed3 = platformId && (platformId.includes('3') || platformId.toLowerCase().includes('army'));
    const isFeed2 = platformId && platformId.includes('2');
    const markerColor = color || (isFeed3 ? '#10b981' : (isFeed2 ? '#ed8936' : '#00f0ff'));
    const droneModel = model || (isFeed3 ? 'Army Indigenous Tactical UAV' : (isFeed2 ? 'DJI Air 2S' : 'DJI Matrice 300 RTK'));
    const icon = createDroneIcon(markerColor, platformId, isSelected);

    return (
        <Marker 
            position={[position.latitude, position.longitude]} 
            icon={icon}
            eventHandlers={{
                click: () => {
                    if (onSelect) onSelect(platformId);
                }
            }}
        >
            <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', color: '#1a202c', minWidth: '150px' }}>
                    <strong style={{ color: markerColor === '#00f0ff' ? '#007799' : '#c05621', fontSize: '13px' }}>
                        {platformId} [{droneModel}]
                    </strong>
                    <div style={{ marginTop: '4px', fontSize: '12px', lineHeight: '1.4' }}>
                        <div><strong>Lat:</strong> {formatNumber(position.latitude, 6)}</div>
                        <div><strong>Lon:</strong> {formatNumber(position.longitude, 6)}</div>
                        <div><strong>Alt:</strong> {altitudeLabel(position)}</div>
                        {position.gridReference && (
                            <div><strong>GR:</strong> {formatMGRS(position.gridReference)}</div>
                        )}
                    </div>
                </div>
            </Popup>
        </Marker>
    );
};

export default PlatformMarker;
