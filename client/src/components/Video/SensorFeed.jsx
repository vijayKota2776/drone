import React, { useEffect, useRef, useState } from 'react';
import JMuxer from 'jmuxer';
import './SensorFeed.css';
import { formatNumber, altitudeLabel, formatMGRS } from '../../telemetryDisplay';

/**
 * Single feed component with independent JMuxer decoder, canvas HUD, and fallback surveillance loop.
 */
const SingleSensorFeed = ({ 
    feedId, 
    callsign, 
    model, 
    telemetry, 
    port, 
    isActive, 
    onSelect,
    isPipThumbnail = false 
}) => {
    const canvasRef = useRef(null);
    const demoVideoRef = useRef(null);
    const liveVideoRef = useRef(null);
    const jmuxerRef = useRef(null);
    const [isLiveStream, setIsLiveStream] = useState(false);
    const lastLiveTimeRef = useRef(0);

    // Initialize JMuxer for this specific feed (feedId 1, 2, or 3)
    useEffect(() => {
        if (!liveVideoRef.current) return;

        let jmuxer = null;
        try {
            jmuxer = new JMuxer({
                node: liveVideoRef.current,
                mode: 'video',
                flushingTime: 0,
                fps: 30,
                clearBuffer: true,
                debug: false
            });
            jmuxerRef.current = jmuxer;
        } catch (e) {
            console.warn(`JMuxer init warning for Feed ${feedId}:`, e);
        }

        let unsubscribe = null;
        if (window.electronAPI && window.electronAPI.onDroneVideoChunk) {
            unsubscribe = window.electronAPI.onDroneVideoChunk((chunk) => {
                lastLiveTimeRef.current = Date.now();
                setIsLiveStream(true);
                if (jmuxerRef.current) {
                    try {
                        jmuxerRef.current.feed({
                            video: new Uint8Array(chunk)
                        });
                    } catch {
                        // ignore dropped frame during teardown
                    }
                }
            }, feedId);
        }

        // Watchdog: If no live chunks for 3.5s, return to demo video loop
        const watchdog = setInterval(() => {
            if (Date.now() - lastLiveTimeRef.current > 3500 && lastLiveTimeRef.current > 0) {
                setIsLiveStream(false);
            }
        }, 1500);

        return () => {
            if (unsubscribe) unsubscribe();
            clearInterval(watchdog);
            if (jmuxerRef.current) {
                try { jmuxerRef.current.destroy(); } catch {
                    // ignore teardown exception
                }
            }
        };
    }, [feedId]);

    // Ensure fallback video plays
    useEffect(() => {
        if (demoVideoRef.current) {
            demoVideoRef.current.play().catch(() => {});
        }
    }, [isLiveStream]);

    // Render Canvas HUD (Tactical Crosshairs, Military Grid Reference, OSD)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let time = 0;

        const isFeed2 = feedId === 2;
        const isFeed3 = feedId === 3;
        const themeColor = isLiveStream 
            ? '#00f0ff' 
            : (isFeed3 ? '#10b981' : (isFeed2 ? '#ed8936' : '#38bdf8'));
        const themeColorAlpha = isLiveStream 
            ? 'rgba(0, 240, 255, 0.9)' 
            : (isFeed3 ? 'rgba(16, 185, 129, 0.85)' : (isFeed2 ? 'rgba(237, 137, 54, 0.85)' : 'rgba(56, 189, 248, 0.85)'));

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            // Radar scanning sweep line
            const scanLineY = (time % 120) / 120 * height;
            ctx.fillStyle = isFeed3 ? 'rgba(16, 185, 129, 0.08)' : (isFeed2 ? 'rgba(237, 137, 54, 0.08)' : 'rgba(0, 240, 255, 0.08)');
            ctx.fillRect(0, scanLineY, width, 3);

            // Central crosshairs
            ctx.strokeStyle = themeColorAlpha;
            ctx.lineWidth = 1.5;
            const cx = width / 2;
            const cy = height / 2;

            ctx.beginPath();
            ctx.moveTo(cx - 28, cy);
            ctx.lineTo(cx + 28, cy);
            ctx.moveTo(cx, cy - 28);
            ctx.lineTo(cx, cy + 28);
            ctx.arc(cx, cy, 20, 0, Math.PI * 2);
            ctx.stroke();

            // Tactical OSD Text
            ctx.fillStyle = themeColor;
            ctx.font = '10px monospace';

            // Top Left: Feed ID & Aircraft Model
            ctx.fillText(`FEED ${feedId}: ${callsign}`, 8, 16);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(`TYPE: ${model.toUpperCase()}`, 8, 28);

            // Telemetry coordinates & MGRS
            ctx.fillStyle = themeColor;
            if (telemetry && telemetry.position) {
                ctx.fillText(`LAT: ${formatNumber(telemetry.position.latitude, 5)}`, 8, 42);
                ctx.fillText(`LON: ${formatNumber(telemetry.position.longitude, 5)}`, 8, 54);
                ctx.fillText(`ALT: ${altitudeLabel(telemetry.position)}`, 8, 66);
                const grVal = telemetry.position.gridReference ? formatMGRS(telemetry.position.gridReference) : '--';
                ctx.fillText(`GR : ${grVal}`, 8, 78);

                // Top Right: Attitude, Speed, Battery
                ctx.textAlign = 'right';
                ctx.fillText(`YAW: ${formatNumber(telemetry.attitude?.yaw)}°`, width - 8, 16);
                ctx.fillText(`SPD: ${formatNumber(telemetry.velocity?.groundSpeed)} m/s`, width - 8, 28);
                if (telemetry.status?.battery != null) {
                    ctx.fillText(`BAT: ${telemetry.status.battery}%`, width - 8, 40);
                }
                ctx.textAlign = 'left';
            } else {
                ctx.fillText("WAITING FOR TELEMETRY", 8, 42);
            }

            // Bottom bar: Source & UTC Clock
            ctx.fillStyle = '#a0aec0';
            ctx.fillText(isLiveStream ? `CAM: LIVE TCP :${port}` : `CAM: RECON (PORT :${port})`, 8, height - 8);
            ctx.textAlign = 'right';
            ctx.fillText(new Date().toISOString().substring(11, 19) + 'Z', width - 8, height - 8);
            ctx.textAlign = 'left';

            time++;
            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [telemetry, isLiveStream, feedId, callsign, model, port]);

    const isFeed2 = feedId === 2;
    const isFeed3 = feedId === 3;
    const isTelemetryActive = Boolean(telemetry && telemetry.position);

    let badgeText = `FEED ${feedId}: ${callsign} • STANDBY`;
    let badgeClass = 'standby';
    if (isLiveStream) {
        badgeText = `FEED ${feedId}: ${callsign} • LIVE STREAM`;
        badgeClass = 'live-stream';
    } else if (isTelemetryActive) {
        badgeText = `FEED ${feedId}: ${callsign} • ACTIVE HUD`;
        badgeClass = isFeed3 ? 'active-green' : (isFeed2 ? 'active-amber' : 'active-cyan');
    }

    return (
        <div 
            className={`single-feed-card ${isPipThumbnail ? 'pip-thumbnail' : ''} ${isActive ? 'feed-active' : ''}`}
            onClick={onSelect}
        >
            {/* Header info badge */}
            <div className="feed-header-bar">
                <span className="feed-label-pill">
                    <span className={`feed-indicator-dot ${isLiveStream ? 'dot-live' : isTelemetryActive ? 'dot-active' : 'dot-idle'}`}></span>
                    <strong>FEED {feedId}: {callsign}</strong> [{model}]
                </span>
                <span className={`live-badge ${badgeClass}`}>
                    {badgeText}
                </span>
            </div>

            {/* Video layers */}
            <div className="feed-media-wrapper">
                <video 
                    ref={liveVideoRef}
                    autoPlay 
                    muted 
                    playsInline
                    className="sensor-video"
                    style={{ display: isLiveStream ? 'block' : 'none' }}
                />
                <video 
                    ref={demoVideoRef}
                    src="./test-video.mp4"
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="sensor-video"
                    style={{ display: isLiveStream ? 'none' : 'block' }}
                />
                <canvas 
                    ref={canvasRef} 
                    width={360} 
                    height={190} 
                    className="sensor-canvas"
                />
            </div>
        </div>
    );
};

/**
 * Main SensorFeed component providing minimum 3 feed sections (Tri-Feed Grid, Rdr 1, Rdr 2, Rdr 3, PIP).
 */
const SensorFeed = ({ telemetry, platforms = {}, selectedPlatformId }) => {
    const [viewMode, setViewMode] = useState('TRI_GRID'); // 'TRI_GRID', 'FEED_1', 'FEED_2', 'FEED_3', 'PIP'
    const [pipPrimary, setPipPrimary] = useState(1);

    // Extract Drone 1 (Rdr 1 - DJI Matrice 300 RTK)
    const drone1Data = platforms['Rdr 1'] 
        || (telemetry?.platformId === 'Rdr 1' || (!telemetry?.platformId?.includes('2') && !telemetry?.platformId?.includes('3') && telemetry) ? telemetry : null);
    const drone1Model = drone1Data?.model || drone1Data?.status?.model || 'DJI Matrice 300 RTK';

    // Extract Drone 2 (Rdr 2 - DJI Air 2S)
    const drone2Data = platforms['Rdr 2'] 
        || (telemetry?.platformId === 'Rdr 2' || (telemetry?.platformId?.includes('2') && telemetry) ? telemetry : null);
    const drone2Model = drone2Data?.model || drone2Data?.status?.model || 'DJI Air 2S';

    // Extract Drone 3 (Rdr 3 - Army Made Drone)
    const drone3Data = platforms['Rdr 3'] 
        || (telemetry?.platformId === 'Rdr 3' || (telemetry?.platformId?.includes('3') && telemetry) ? telemetry : null);
    const drone3Model = drone3Data?.model || drone3Data?.status?.model || 'Army Indigenous Tactical UAV';

    return (
        <div className="multi-sensor-feed-root">
            {/* Tactical Feed Selector Toolbar */}
            <div className="sensor-toolbar">
                <div className="sensor-mode-buttons">
                    <button 
                        className={`mode-btn ${viewMode === 'TRI_GRID' ? 'btn-active' : ''}`}
                        onClick={() => setViewMode('TRI_GRID')}
                        title="Display all 3 feeds simultaneously (Rdr 1, Rdr 2, Rdr 3)"
                    >
                        3 FEEDS (ALL)
                    </button>
                    <button 
                        className={`mode-btn ${viewMode === 'FEED_1' ? 'btn-active' : ''}`}
                        onClick={() => setViewMode('FEED_1')}
                        title="Fullscreen Feed 1: Rdr 1 (DJI Matrice 300 RTK)"
                    >
                        Rdr 1 (Matrice)
                    </button>
                    <button 
                        className={`mode-btn ${viewMode === 'FEED_2' ? 'btn-active' : ''}`}
                        onClick={() => setViewMode('FEED_2')}
                        title="Fullscreen Feed 2: Rdr 2 (DJI Air 2S)"
                    >
                        Rdr 2 (Air 2S)
                    </button>
                    <button 
                        className={`mode-btn ${viewMode === 'FEED_3' ? 'btn-active' : ''}`}
                        onClick={() => setViewMode('FEED_3')}
                        title="Fullscreen Feed 3: Rdr 3 (Army Made Drone)"
                    >
                        Rdr 3 (Army Drone)
                    </button>
                    <button 
                        className={`mode-btn ${viewMode === 'PIP' ? 'btn-active' : ''}`}
                        onClick={() => setViewMode('PIP')}
                        title="Picture-in-picture view"
                    >
                        PIP
                    </button>
                </div>
            </div>

            {/* Video Display Layouts */}
            <div className={`sensor-feed-layout layout-${viewMode.toLowerCase()}`}>
                {viewMode === 'TRI_GRID' && (
                    <div className="tri-feed-container">
                        {/* Feed 1: Rdr 1 (DJI Matrice 300 RTK) */}
                        <SingleSensorFeed 
                            feedId={1}
                            callsign="Rdr 1"
                            model={drone1Model}
                            telemetry={drone1Data}
                            port={14555}
                            isActive={selectedPlatformId === 'Rdr 1' || !selectedPlatformId}
                        />
                        {/* Feed 2: Rdr 2 (DJI Air 2S) */}
                        <SingleSensorFeed 
                            feedId={2}
                            callsign="Rdr 2"
                            model={drone2Model}
                            telemetry={drone2Data}
                            port={14556}
                            isActive={selectedPlatformId === 'Rdr 2'}
                        />
                        {/* Feed 3: Rdr 3 (Army Made Drone) */}
                        <SingleSensorFeed 
                            feedId={3}
                            callsign="Rdr 3"
                            model={drone3Model}
                            telemetry={drone3Data}
                            port={14557}
                            isActive={selectedPlatformId === 'Rdr 3'}
                        />
                    </div>
                )}

                {viewMode === 'FEED_1' && (
                    <SingleSensorFeed 
                        feedId={1}
                        callsign="Rdr 1"
                        model={drone1Model}
                        telemetry={drone1Data}
                        port={14555}
                        isActive={true}
                    />
                )}

                {viewMode === 'FEED_2' && (
                    <SingleSensorFeed 
                        feedId={2}
                        callsign="Rdr 2"
                        model={drone2Model}
                        telemetry={drone2Data}
                        port={14556}
                        isActive={true}
                    />
                )}

                {viewMode === 'FEED_3' && (
                    <SingleSensorFeed 
                        feedId={3}
                        callsign="Rdr 3"
                        model={drone3Model}
                        telemetry={drone3Data}
                        port={14557}
                        isActive={true}
                    />
                )}

                {viewMode === 'PIP' && (
                    <div className="pip-container">
                        {/* Main background feed */}
                        <SingleSensorFeed 
                            feedId={pipPrimary}
                            callsign={pipPrimary === 1 ? 'Rdr 1' : pipPrimary === 2 ? 'Rdr 2' : 'Rdr 3'}
                            model={pipPrimary === 1 ? drone1Model : pipPrimary === 2 ? drone2Model : drone3Model}
                            telemetry={pipPrimary === 1 ? drone1Data : pipPrimary === 2 ? drone2Data : drone3Data}
                            port={pipPrimary === 1 ? 14555 : pipPrimary === 2 ? 14556 : 14557}
                            isActive={true}
                        />

                        {/* Floating thumbnail feeds */}
                        <div className="pip-thumbnails-stack">
                            {[1, 2, 3].filter(id => id !== pipPrimary).map(thumbId => (
                                <div 
                                    key={`thumb-${thumbId}`} 
                                    className="pip-floating-box" 
                                    onClick={() => setPipPrimary(thumbId)} 
                                    title={`Click to focus on Feed ${thumbId}`}
                                >
                                    <SingleSensorFeed 
                                        feedId={thumbId}
                                        callsign={thumbId === 1 ? 'Rdr 1' : thumbId === 2 ? 'Rdr 2' : 'Rdr 3'}
                                        model={thumbId === 1 ? drone1Model : thumbId === 2 ? drone2Model : drone3Model}
                                        telemetry={thumbId === 1 ? drone1Data : thumbId === 2 ? drone2Data : drone3Data}
                                        port={thumbId === 1 ? 14555 : thumbId === 2 ? 14556 : 14557}
                                        isPipThumbnail={true}
                                    />
                                    <div className="pip-swap-hint">SELECT FEED {thumbId}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SensorFeed;
