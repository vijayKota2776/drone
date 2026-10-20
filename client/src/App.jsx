import React, { useState, useEffect } from 'react';
import './styles/layout.css';
import OfflineMap from './components/Map/OfflineMap';
import SimulatorControls from './components/Telemetry/SimulatorControls';
import SensorFeed from './components/Video/SensorFeed';
import ReplayControls from './components/Replay/ReplayControls';
import MissionPanel from './components/Mission/MissionPanel';
import ConnectionManager from './components/Telemetry/ConnectionManager';
import MultiDroneTelemetryTables from './components/Telemetry/MultiDroneTelemetryTables';
import { formatNumber, altitudeLabel, formatMGRS } from './telemetryDisplay';

function App() {
  const [appMode, setAppMode] = useState('LIVE'); // LIVE, REPLAY, PLANNING, OBSERVE
  const [telemetryState, setTelemetryState] = useState(null);
  const [platforms, setPlatforms] = useState({});
  const [selectedPlatformId, setSelectedPlatformId] = useState(null);
  const [simStatus, setSimStatus] = useState('STOPPED');
  const [replayStatus, setReplayStatus] = useState('REPLAY_STOPPED');
  const [isRecording, setIsRecording] = useState(false);
  const [waypoints, setWaypoints] = useState([]);
  const [observations, setObservations] = useState([]);
  const [showLayersMenu, setShowLayersMenu] = useState(false);
  const [layers, setLayers] = useState({
    flightPath: true,
    observations: true,
    waypoints: true
  });
  const [showGrid, setShowGrid] = useState(false);

  const loadObservations = async () => {
    if (window.electronAPI) {
      const obs = await window.electronAPI.getObservations();
      setObservations(obs);
    }
  };

  useEffect(() => {
    loadObservations();
    if (window.electronAPI) {
      const stopTelemetry = window.electronAPI.onTelemetry((data) => {
        const id = data.platformId || 'Rdr 1';
        setPlatforms((prev) => ({
          ...prev,
          [id]: {
            ...data,
            lastSeen: Date.now()
          }
        }));
        setTelemetryState((prev) => {
          if (!selectedPlatformId || selectedPlatformId === id || !prev) {
            return data;
          }
          return prev;
        });
      });
      const stopStatus = window.electronAPI.onSimulatorStatus(setSimStatus);
      return () => { stopTelemetry(); stopStatus(); };
    }
  }, [selectedPlatformId]);

  const toggleRecording = async () => {
    if (!window.electronAPI) return;
    if (isRecording) {
      await window.electronAPI.stopRecording();
      setIsRecording(false);
    } else {
      await window.electronAPI.startRecording();
      setIsRecording(true);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <button 
          onClick={() => setAppMode('PLANNING')}
          style={appMode === 'PLANNING' ? { backgroundColor: 'rgba(237, 137, 54, 0.2)', color: '#ed8936', borderColor: '#ed8936' } : {}}
        >
          Mission
        </button>
        <button 
          onClick={() => setAppMode('OBSERVE')}
          style={appMode === 'OBSERVE' ? { backgroundColor: 'rgba(72, 187, 120, 0.2)', color: '#48bb78', borderColor: '#48bb78' } : {}}
        >
          Observe
        </button>
        <div style={{position: 'relative'}}>
          <button 
            onClick={() => setShowLayersMenu(!showLayersMenu)}
            style={showLayersMenu ? { backgroundColor: 'rgba(255, 255, 255, 0.1)' } : {}}
          >
            Layers
          </button>
          {showLayersMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, backgroundColor: '#1a202c', 
              border: '1px solid #2d3748', padding: '10px', borderRadius: '4px', 
              zIndex: 1000, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.flightPath} onChange={e => setLayers({...layers, flightPath: e.target.checked})} />
                Flight Path
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.observations} onChange={e => setLayers({...layers, observations: e.target.checked})} />
                Observations
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={layers.waypoints} onChange={e => setLayers({...layers, waypoints: e.target.checked})} />
                Waypoints
              </label>
            </div>
          )}
        </div>
        <button 
          onClick={() => setShowGrid(!showGrid)}
          style={showGrid ? { backgroundColor: 'rgba(99, 179, 237, 0.2)', color: '#63b3ed', borderColor: '#63b3ed' } : {}}
        >
          Grid
        </button>
        <button 
          onClick={toggleRecording}
          disabled={appMode !== 'LIVE'}
          style={isRecording ? { backgroundColor: 'rgba(245, 101, 101, 0.2)', color: '#fc8181', borderColor: '#fc8181' } : {}}
        >
          {isRecording ? 'Recording (REC)' : 'Record'}
        </button>
        <button 
          onClick={() => setAppMode('REPLAY')}
          style={appMode === 'REPLAY' ? { backgroundColor: 'rgba(99, 179, 237, 0.2)', color: '#63b3ed', borderColor: '#63b3ed' } : {}}
        >
          Replay
        </button>
        <button onClick={async () => {
          const id = prompt('Enter Mission ID to export (e.g. m-123):');
          if(id && window.electronAPI) {
              const res = await window.electronAPI.exportMission(id, 'JSON');
              if(res && res.success) alert(`Exported to ${res.filePath}`);
              else if(res && res.error) alert(`Error: ${res.error}`);
          }
        }}>Export JSON</button>
        <button onClick={async () => {
          const id = prompt('Enter Mission ID to export (e.g. m-123):');
          if(id && window.electronAPI) {
              const res = await window.electronAPI.exportMission(id, 'CSV');
              if(res && res.success) alert(`Exported CSVs to ${res.filePath}`);
              else if(res && res.error) alert(`Error: ${res.error}`);
          }
        }}>Export CSV</button>
      </header>

      <main className="app-main">
        <aside className="panel platform-panel">
          <h2>Platform Panel</h2>
          <div className="panel-content">
            <ConnectionManager clearTelemetry={() => {
              setTelemetryState(null);
              setPlatforms({});
              setSelectedPlatformId(null);
            }} status={simStatus} />

            {/* Multi-Drone Active Fleet List */}
            {Object.keys(platforms).length > 0 && (
              <div style={{ margin: '14px 0 10px 0', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#63b3ed', fontWeight: 600, letterSpacing: '0.8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>ACTIVE FLEET ({Object.keys(platforms).length})</span>
                  <span style={{ color: '#48bb78' }}>ONLINE</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(platforms).map(([id, plat]) => {
                    const isSelected = (selectedPlatformId === id) || (!selectedPlatformId && id === (telemetryState?.platformId || 'Rdr 1'));
                    const isFeed3 = id.includes('3') || id.toLowerCase().includes('army');
                    const isFeed2 = id.includes('2');
                    const themeColor = isFeed3 ? '#10b981' : (isFeed2 ? '#ed8936' : '#00f0ff');
                    const droneModel = plat.model || plat.status?.model || (isFeed3 ? 'Army Indigenous Tactical UAV' : (isFeed2 ? 'DJI Air 2S' : 'DJI Matrice 300 RTK'));
                    return (
                      <div 
                        key={id}
                        onClick={() => {
                          setSelectedPlatformId(id);
                          setTelemetryState(plat);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${isSelected ? themeColor : 'rgba(255, 255, 255, 0.08)'}`,
                          boxShadow: isSelected ? `0 0 8px ${themeColor}40` : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: themeColor, boxShadow: `0 0 6px ${themeColor}` }}></span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '12px', color: '#ffffff' }}>{id}</div>
                            <div style={{ fontSize: '10px', color: '#a0aec0' }}>{droneModel}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: themeColor }}>
                            {plat.status?.battery != null ? `${plat.status.battery}%` : '100%'}
                          </div>
                          <div style={{ fontSize: '9px', color: plat.position?.valid ? '#48bb78' : '#e53e3e' }}>
                            {plat.position?.valid ? 'GPS FIX' : 'NO FIX'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="platform-stats">
              <p>Platform: <strong style={{ color: (telemetryState?.platformId || selectedPlatformId || '').includes('3') || (telemetryState?.platformId || selectedPlatformId || '').toLowerCase().includes('army') ? '#10b981' : (telemetryState?.platformId || selectedPlatformId || '').includes('2') ? '#ed8936' : '#00f0ff' }}>{telemetryState?.platformId || selectedPlatformId || 'Rdr 1'}</strong> [{telemetryState?.model || telemetryState?.status?.model || ((telemetryState?.platformId || selectedPlatformId || '').includes('3') || (telemetryState?.platformId || selectedPlatformId || '').toLowerCase().includes('army') ? 'Army Indigenous Tactical UAV' : (telemetryState?.platformId || selectedPlatformId || '').includes('2') ? 'DJI Air 2S' : 'DJI Matrice 300 RTK')}]</p>
              <p>Listener: {
                ['UDP_LISTENER_ACTIVE', 'TELEMETRY_RECEIVED', 'TEST_TELEMETRY_RECEIVED', 'WAITING_FOR_GPS', 'TELEMETRY_LOST'].includes(simStatus) ? 'ACTIVE' :
                simStatus === 'DISCONNECTED' || simStatus === 'STOPPED' ? 'INACTIVE' : 
                simStatus === 'ERROR' ? 'ERROR' : 'UNKNOWN'
              }</p>
              <p>Telemetry: {
                simStatus === 'UDP_LISTENER_ACTIVE' ? 'WAITING FOR TELEMETRY' :
                simStatus === 'TELEMETRY_RECEIVED' ? 'RECEIVED' :
                simStatus === 'TEST_TELEMETRY_RECEIVED' ? 'SYNTHETIC NETWORK TEST (not aircraft data)' :
                simStatus === 'WAITING_FOR_GPS' ? 'RECEIVING, WAITING FOR GPS FIX' :
                simStatus === 'TELEMETRY_LOST' ? 'LOST' :
                simStatus === 'RUNNING' ? 'SIMULATOR ACTIVE' :
                (simStatus === 'MAVLINK_ACTIVE' || simStatus === 'MAVLINK_CONNECTED') ? 'WAITING FOR MAVLINK' : 
                simStatus === 'ERROR' ? 'ERROR' : 'OFFLINE'
              }</p>
              <p>Lat: {formatNumber(telemetryState?.position?.latitude, 6)}</p>
              <p>Lon: {formatNumber(telemetryState?.position?.longitude, 6)}</p>
              <p>Altitude: {altitudeLabel(telemetryState?.position)}</p>
              {simStatus === 'TELEMETRY_LOST' && <p role="alert">STALE DATA — last received position shown.</p>}
              {telemetryState?.status?.synthetic && <p role="alert">SYNTHETIC TEST DATA</p>}
              <p>Grid (ESM / GR): <span style={{ fontWeight: 600, color: '#63b3ed' }}>
                {telemetryState?.position?.gridReference
                  ? formatMGRS(telemetryState.position.gridReference)
                  : simStatus === 'WAITING_FOR_GPS'
                    ? '-- (Awaiting outdoor GPS fix)'
                    : '--'}
              </span></p>
            </div>
          </div>
        </aside>

        <section className="panel map-area">
          <OfflineMap 
            telemetry={telemetryState} 
            platforms={platforms}
            selectedPlatformId={selectedPlatformId}
            onSelectPlatform={(id) => {
              setSelectedPlatformId(id);
              if (platforms[id]) setTelemetryState(platforms[id]);
            }}
            appMode={appMode}
            waypoints={waypoints}
            setWaypoints={setWaypoints}
            observations={observations}
            loadObservations={loadObservations}
            layers={layers}
            showGrid={showGrid}
          />
        </section>

        <aside className="panel video-area">
          <h2>Sensor Video</h2>
          <SensorFeed 
            telemetry={telemetryState} 
            platforms={platforms}
            selectedPlatformId={selectedPlatformId}
          />
        </aside>

        <section className="panel telemetry-area">
          <h2>
            {appMode === 'LIVE' ? 'Telemetry Data' : 
             appMode === 'REPLAY' ? 'Replay Controls' : 'Mission Planning'}
          </h2>
          <div className="panel-content">
            {appMode === 'LIVE' && (
                <>
                  <SimulatorControls 
                    onTelemetryUpdate={setTelemetryState} 
                    onStatusUpdate={setSimStatus}
                    setWaypoints={setWaypoints} 
                  />
                  {/* Tactical 3-Table Display for LAT, LONG, ALTI, and ESM for all 3 drones */}
                  <MultiDroneTelemetryTables 
                    platforms={platforms}
                    telemetry={telemetryState}
                    selectedPlatformId={selectedPlatformId}
                    onSelectPlatform={(id) => {
                      setSelectedPlatformId(id);
                      if (platforms[id]) setTelemetryState(platforms[id]);
                    }}
                  />
                </>
            )}
            {appMode === 'REPLAY' && (
                <ReplayControls 
                  onReplayStatusUpdate={setReplayStatus}
                  onModeChange={setAppMode}
                />
            )}
            {appMode === 'PLANNING' && (
                <MissionPanel 
                  waypoints={waypoints}
                  setWaypoints={setWaypoints}
                  onModeChange={setAppMode}
                />
            )}
          </div>
        </section>

        <section className="panel observation-area">
          <h2>Observations & Events</h2>
          <ul>
            {observations.map(obs => (
                <li key={obs.id}>[{new Date(obs.timestamp).toLocaleTimeString()}] Obs: {obs.latitude.toFixed(4)}, {obs.longitude.toFixed(4)} ({obs.status})</li>
            ))}
            <li>Application Started</li>
            <li>Database Initialized</li>
            {simStatus === 'RUNNING' && <li>Multi-UAV Simulator Started (Rdr 1, Rdr 2, Rdr 3)</li>}
          </ul>
        </section>
      </main>

      <footer className="app-footer">
        <div className="status-indicator">
          <div className="status-dot"></div>
          <span>System: OK</span>
        </div>
        <div className="status-indicator">
          <div className={`status-dot ${isRecording ? '' : 'warning'}`}></div>
          <span>Database: {isRecording ? 'Recording...' : 'Connected (Idle)'}</span>
        </div>
        <div className="status-indicator">
          <div className="status-dot"></div>
          <span>Video: 3 Feeds (Rdr 1 :14555 | Rdr 2 :14556 | Rdr 3 :14557)</span>
        </div>
        <div className="status-indicator">
          <div className={`status-dot ${simStatus === 'TELEMETRY_LOST' ? 'error' : (simStatus === 'RUNNING' || telemetryState || (simStatus && (simStatus.startsWith('MAVLINK') || simStatus.startsWith('DJI') || simStatus === 'TELEMETRY_RESTORED'))) ? '' : 'error'}`}></div>
          <span>Telemetry: {
            simStatus === 'RUNNING' ? 'Connected (SIM: Rdr 1, Rdr 2, Rdr 3)' : 
            simStatus === 'TELEMETRY_LOST' ? 'Lost (Timeout)' :
            simStatus === 'WAITING_FOR_GPS' ? 'Receiving (Awaiting GPS)' :
            simStatus === 'TEST_TELEMETRY_RECEIVED' ? 'Synthetic network test' :
            (telemetryState ? 'Connected (Hardware)' : 
            (simStatus && (simStatus.startsWith('MAVLINK') || simStatus.startsWith('DJI') || simStatus === 'TELEMETRY_RESTORED') ? 'Connected (Awaiting GPS)' : 'Disconnected'))
          }</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
