import React, { useEffect, useRef, useState } from 'react';
import JMuxer from 'jmuxer';
import './SensorFeed.css';
import { formatNumber, altitudeLabel, formatMGRS } from '../../telemetryDisplay';

const SensorFeed = ({ telemetry }) => {
    const canvasRef = useRef(null);
    const demoVideoRef = useRef(null);
    const liveVideoRef = useRef(null);
    const jmuxerRef = useRef(null);
    const [isLiveStream, setIsLiveStream] = useState(false);
    const lastLiveTimeRef = useRef(0);

    // 1. Initialize JMuxer and listen for live H.264 chunks from drone
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
            console.warn('JMuxer init warning:', e);
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
                    } catch (_) {}
                }
            });
        }

        // Watchdog: If no live chunks for 3s, return to demo video loop
        const watchdog = setInterval(() => {
            if (Date.now() - lastLiveTimeRef.current > 3000 && lastLiveTimeRef.current > 0) {
                setIsLiveStream(false);
            }
        }, 1500);

        return () => {
            if (unsubscribe) unsubscribe();
            clearInterval(watchdog);
            if (jmuxerRef.current) {
                try { jmuxerRef.current.destroy(); } catch (_) {}
            }
        };
    }, []);

    // 2. Ensure fallback video plays
    useEffect(() => {
        if (demoVideoRef.current) {
            demoVideoRef.current.play().catch(() => {});
        }
    }, [isLiveStream]);

    // 3. Render Canvas HUD (Crosshairs, OSD telemetry data)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        let animationFrameId;
        let time = 0;

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;

            // Clear background so video shows through
            ctx.clearRect(0, 0, width, height);

            // Draw scanning line (radar effect)
            const scanLineY = (time % 100) / 100 * height;
            ctx.fillStyle = 'rgba(99, 179, 237, 0.1)';
            ctx.fillRect(0, scanLineY, width, 4);

            // Draw central crosshairs
            ctx.strokeStyle = isLiveStream ? 'rgba(0, 240, 255, 0.9)' : 'rgba(72, 187, 120, 0.8)';
            ctx.lineWidth = 1.5;
            
            const cx = width / 2;
            const cy = height / 2;

            ctx.beginPath();
            ctx.moveTo(cx - 40, cy);
            ctx.lineTo(cx + 40, cy);
            ctx.moveTo(cx, cy - 40);
            ctx.lineTo(cx, cy + 40);
            ctx.arc(cx, cy, 30, 0, Math.PI * 2);
            ctx.stroke();

            // Overlay Data (Simulating OSD - On Screen Display)
            ctx.fillStyle = isLiveStream ? '#00f0ff' : '#48bb78';
            ctx.font = '12px monospace';
            
            if (telemetry && telemetry.position) {
                ctx.fillText(`LAT: ${formatNumber(telemetry.position.latitude, 6)}`, 10, 20);
                ctx.fillText(`LON: ${formatNumber(telemetry.position.longitude, 6)}`, 10, 40);
                ctx.fillText(`ALT: ${altitudeLabel(telemetry.position)}`, 10, 60);
                const grVal = telemetry.position.gridReference ? formatMGRS(telemetry.position.gridReference) : '--';
                ctx.fillText(`GR : ${grVal}`, 10, 80);
                
                ctx.fillText(`YAW: ${formatNumber(telemetry.attitude?.yaw)}°`, width - 90, 20);
                ctx.fillText(`SPD: ${formatNumber(telemetry.velocity?.groundSpeed)}`, width - 90, 40);
            } else {
                ctx.fillText("NO TELEMETRY", 10, 20);
            }

            // Timecode & Sensor Source
            ctx.fillStyle = '#a0aec0';
            ctx.fillText(new Date().toISOString().substring(11, 19) + 'Z', width - 80, height - 15);
            ctx.fillText(isLiveStream ? 'CAM: LIVE DJI FEED' : 'CAM: SENSOR RECON', 10, height - 15);

            time++;
            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [telemetry, isLiveStream]);

    const isTelemetryActive = Boolean(telemetry && telemetry.position);

    let badgeText = 'SENSOR STANDBY';
    let badgeClass = 'standby';
    if (isLiveStream) {
        badgeText = 'LIVE DRONE CAMERA';
        badgeClass = 'live-stream';
    } else if (isTelemetryActive) {
        badgeText = 'LIVE SENSOR HUD';
        badgeClass = 'active';
    }

    return (
        <div className="sensor-feed-container" style={{position: 'relative'}}>
            {/* Live drone camera video element (managed by JMuxer MSE) */}
            <video 
                ref={liveVideoRef}
                autoPlay 
                muted 
                playsInline
                className="sensor-video"
                style={{ display: isLiveStream ? 'block' : 'none' }}
            />

            {/* Fallback pre-recorded surveillance loop */}
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
                width={330} 
                height={260} 
                className="sensor-canvas"
            />
            <div className="sensor-overlay-text">
                <span className={`live-badge ${badgeClass}`}>
                    {badgeText}
                </span>
            </div>
        </div>
    );
};

export default SensorFeed;
