import React from 'react';
import './MultiDroneTelemetryTables.css';
import { formatNumber, altitudeLabel, formatMGRS } from '../../telemetryDisplay';

/**
 * Tactical 3-Table Component displaying LAT, LONG, ALTI, and ESM / GR for:
 * 1. Feed 1: Rdr 1 (DJI Matrice 300 RTK)
 * 2. Feed 2: Rdr 2 (DJI Air 2S)
 * 3. Feed 3: Rdr 3 (Army Made Drone)
 */
const DroneTelemetryTableCard = ({
    feedId,
    callsign,
    model,
    telemetry,
    color,
    isSelected,
    onSelect
}) => {
    const hasFix = Boolean(telemetry?.position?.valid);
    const pos = telemetry?.position;

    return (
        <div 
            className={`drone-table-card ${isSelected ? 'selected-drone-card' : ''}`}
            style={{ borderColor: isSelected ? color : 'rgba(255, 255, 255, 0.1)' }}
            onClick={() => onSelect && onSelect(callsign)}
        >
            {/* Card Header */}
            <div className="card-header" style={{ borderBottomColor: `rgba(${feedId === 1 ? '0, 240, 255' : feedId === 2 ? '237, 137, 54' : '16, 185, 129'}, 0.25)` }}>
                <div className="card-title">
                    <span className="drone-dot" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}></span>
                    <strong style={{ color }}>{callsign}</strong>
                    <span className="drone-model-pill">[{model}]</span>
                </div>
                <div className="card-badge">
                    <span className={`status-pill ${hasFix ? 'pill-fix' : 'pill-nofix'}`}>
                        {hasFix ? 'GPS FIX' : 'NO FIX'}
                    </span>
                    {telemetry?.status?.battery != null && (
                        <span className="battery-pill" style={{ color }}>
                            ⚡ {telemetry.status.battery}%
                        </span>
                    )}
                </div>
            </div>

            {/* Tactical 4-Row Telemetry Table: LAT, LONG, ALTI, ESM (GR) */}
            <table className="telemetry-grid-table">
                <tbody>
                    <tr>
                        <td className="table-key">LAT</td>
                        <td className="table-val lat-val">
                            {formatNumber(pos?.latitude, 6)}
                        </td>
                    </tr>
                    <tr>
                        <td className="table-key">LONG</td>
                        <td className="table-val lon-val">
                            {formatNumber(pos?.longitude, 6)}
                        </td>
                    </tr>
                    <tr>
                        <td className="table-key">ALTI</td>
                        <td className="table-val alt-val">
                            {altitudeLabel(pos)}
                        </td>
                    </tr>
                    <tr className="esm-row">
                        <td className="table-key esm-key">ESM / GR</td>
                        <td className="table-val esm-val" style={{ color }}>
                            {pos?.gridReference ? formatMGRS(pos.gridReference) : '--'}
                        </td>
                    </tr>
                    <tr className="meta-row">
                        <td className="table-key">SPD / YAW</td>
                        <td className="table-val meta-val">
                            {formatNumber(telemetry?.velocity?.groundSpeed, 1)} m/s &bull; {formatNumber(telemetry?.attitude?.yaw, 0)}°
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

const MultiDroneTelemetryTables = ({
    platforms = {},
    telemetry,
    selectedPlatformId,
    onSelectPlatform
}) => {
    // 1. Drone 1: Rdr 1 (DJI Matrice)
    const drone1Data = platforms['Rdr 1'] 
        || (telemetry?.platformId === 'Rdr 1' || (!telemetry?.platformId?.includes('2') && !telemetry?.platformId?.includes('3') && telemetry) ? telemetry : null);
    const drone1Model = drone1Data?.model || drone1Data?.status?.model || 'DJI Matrice 300 RTK';

    // 2. Drone 2: Rdr 2 (DJI Air 2S)
    const drone2Data = platforms['Rdr 2'] 
        || (telemetry?.platformId === 'Rdr 2' || (telemetry?.platformId?.includes('2') && telemetry) ? telemetry : null);
    const drone2Model = drone2Data?.model || drone2Data?.status?.model || 'DJI Air 2S';

    // 3. Drone 3: Rdr 3 (Army Made Drone)
    const drone3Data = platforms['Rdr 3'] 
        || (telemetry?.platformId === 'Rdr 3' || (telemetry?.platformId?.includes('3') && telemetry) ? telemetry : null);
    const drone3Model = drone3Data?.model || drone3Data?.status?.model || 'Army Indigenous Tactical UAV';

    return (
        <div className="multi-drone-tables-wrapper">
            <div className="tables-header-bar">
                <span className="tables-header-title">
                    TACTICAL UAV TELEMETRY DASHBOARD (LAT &bull; LONG &bull; ALTI &bull; ESM)
                </span>
                <span className="tables-header-count">
                    3 FLEET UNITS TRACKED
                </span>
            </div>

            <div className="three-tables-grid">
                {/* Table 1: Rdr 1 - DJI Matrice */}
                <DroneTelemetryTableCard 
                    feedId={1}
                    callsign="Rdr 1"
                    model={drone1Model}
                    telemetry={drone1Data}
                    color="#00f0ff"
                    isSelected={selectedPlatformId === 'Rdr 1' || !selectedPlatformId}
                    onSelect={onSelectPlatform}
                />

                {/* Table 2: Rdr 2 - DJI Air 2S */}
                <DroneTelemetryTableCard 
                    feedId={2}
                    callsign="Rdr 2"
                    model={drone2Model}
                    telemetry={drone2Data}
                    color="#ed8936"
                    isSelected={selectedPlatformId === 'Rdr 2'}
                    onSelect={onSelectPlatform}
                />

                {/* Table 3: Rdr 3 - Army Made Drone */}
                <DroneTelemetryTableCard 
                    feedId={3}
                    callsign="Rdr 3"
                    model={drone3Model}
                    telemetry={drone3Data}
                    color="#10b981"
                    isSelected={selectedPlatformId === 'Rdr 3'}
                    onSelect={onSelectPlatform}
                />
            </div>
        </div>
    );
};

export default MultiDroneTelemetryTables;
