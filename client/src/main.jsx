import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { toMGRS } from './telemetryDisplay.js'

// In browser preview mode without Electron, provide mock bridge for demo & recording
if (!window.electronAPI) {
  let simRunning = true;
  let listeners = [];
  let statusListeners = [];
  let tick = 0;

  // Waypoints for 3 tactical drones in Bikaner & Sri Ganganagar
  const d1Waypoints = [
    { lat: 28.0708, lon: 73.2056 },
    { lat: 28.0820, lon: 73.2200 },
    { lat: 28.0650, lon: 73.2350 },
    { lat: 28.0550, lon: 73.2100 }
  ];
  const d2Waypoints = [
    { lat: 29.3236, lon: 73.9039 },
    { lat: 29.3350, lon: 73.9180 },
    { lat: 29.3180, lon: 73.9250 },
    { lat: 29.3100, lon: 73.9000 }
  ];
  const d3Waypoints = [
    { lat: 29.1911, lon: 73.2106 },
    { lat: 29.2050, lon: 73.2300 },
    { lat: 29.1800, lon: 73.2450 },
    { lat: 29.1750, lon: 73.2000 }
  ];

  function interpolate(wps, t) {
    const i = Math.floor(t) % wps.length;
    const next = (i + 1) % wps.length;
    const frac = t - Math.floor(t);
    return {
      lat: wps[i].lat + (wps[next].lat - wps[i].lat) * frac,
      lon: wps[i].lon + (wps[next].lon - wps[i].lon) * frac
    };
  }

  setInterval(() => {
    if (!simRunning) return;
    tick += 0.05;
    const now = Date.now();
    const p1 = interpolate(d1Waypoints, tick);
    const p2 = interpolate(d2Waypoints, tick * 1.1);
    const p3 = interpolate(d3Waypoints, tick * 1.2);

    const emit = (data) => listeners.forEach(fn => fn(data));

    emit({
      timestamp: now,
      platformId: 'Rdr 1',
      model: 'DJI Matrice 300 RTK',
      position: {
        latitude: p1.lat,
        longitude: p1.lon,
        altitudeMSL: 120.0,
        relativeAltitude: 120.0,
        altitudeReference: 'takeoff',
        valid: true,
        gridReference: toMGRS(p1.lat, p1.lon)
      },
      attitude: { yaw: 45, pitch: -2.1, roll: 1.2 },
      velocity: { groundSpeed: 14.2 },
      status: { armed: true, flightMode: 'AUTO_MISSION', battery: 88, satellites: 18, positionValid: true, synthetic: false }
    });

    emit({
      timestamp: now,
      platformId: 'Rdr 2',
      model: 'DJI Air 2S',
      position: {
        latitude: p2.lat,
        longitude: p2.lon,
        altitudeMSL: 85.0,
        relativeAltitude: 85.0,
        altitudeReference: 'takeoff',
        valid: true,
        gridReference: toMGRS(p2.lat, p2.lon)
      },
      attitude: { yaw: 135, pitch: 1.5, roll: -0.6 },
      velocity: { groundSpeed: 17.5 },
      status: { armed: true, flightMode: 'RECON_PATROL', battery: 76, satellites: 16, positionValid: true, synthetic: false }
    });

    emit({
      timestamp: now,
      platformId: 'Rdr 3',
      model: 'Army Indigenous Tactical UAV',
      position: {
        latitude: p3.lat,
        longitude: p3.lon,
        altitudeMSL: 155.0,
        relativeAltitude: 155.0,
        altitudeReference: 'takeoff',
        valid: true,
        gridReference: toMGRS(p3.lat, p3.lon)
      },
      attitude: { yaw: 220, pitch: -1.0, roll: 0.8 },
      velocity: { groundSpeed: 21.0 },
      status: { armed: true, flightMode: 'TACTICAL_SURVEILLANCE', battery: 94, satellites: 22, positionValid: true, synthetic: false }
    });
  }, 1000);

  window.electronAPI = {
    onTelemetry: (cb) => { listeners.push(cb); return () => { listeners = listeners.filter(l => l !== cb); }; },
    onSimulatorStatus: (cb) => { statusListeners.push(cb); cb('RUNNING'); return () => { statusListeners = statusListeners.filter(l => l !== cb); }; },
    getObservations: async () => [],
    getFlights: async () => [],
    getMissions: async () => [],
    getLocalAddresses: async () => [{ name: 'Wi-Fi / Hotspot', address: '192.168.1.105' }],
    startSimulator: () => { simRunning = true; statusListeners.forEach(fn => fn('RUNNING')); },
    pauseSimulator: () => { simRunning = false; statusListeners.forEach(fn => fn('PAUSED')); },
    resetSimulator: () => { tick = 0; statusListeners.forEach(fn => fn('STOPPED')); },
    setSimulatorSpeed: () => {},
    startRecording: async () => {},
    stopRecording: async () => {},
    connectDJI: async () => ({ success: true }),
    disconnectDJI: async () => ({ success: true }),
    connectMavlink: async () => ({ success: true }),
    disconnectMavlink: async () => ({ success: true })
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
