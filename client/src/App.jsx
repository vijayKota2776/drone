import React, { useState, useEffect } from 'react';
import './styles/layout.css';
import OfflineMap from './components/Map/OfflineMap';
import SimulatorControls from './components/Telemetry/SimulatorControls';
import SensorFeed from './components/Video/SensorFeed';
import ReplayControls from './components/Replay/ReplayControls';
import MissionPanel from './components/Mission/MissionPanel';
import ConnectionManager from './components/Telemetry/ConnectionManager';

function App() {
  const [appMode, setAppMode] = useState('LIVE'); // LIVE, REPLAY, PLANNING, OBSERVE
  const [telemetryState, setTelemetryState] = useState(null);
  const [simStatus, setSimStatus] = useState('STOPPED');
  const [replayStatus, setReplayStatus] = useState('REPLAY_STOPPED');
  const [isRecording, setIsRecording] = useState(false);
  const [waypoints, setWaypoints] = useState([]);
  const [observations, setObservations] = useState([]);

  const loadObservations = async () => {
    if (window.electronAPI) {
      const obs = await window.electronAPI.getObservations();
      setObservations(obs);
    }
  };

  useEffect(() => {
    loadObservations();
    if (window.electronAPI) {
      window.electronAPI.onTelemetry((data) => {
        setTelemetryState(data);
      });
    }
  }, []);

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
        <button>Layers</button>
        <button>Grid</button>
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
            <ConnectionManager />
            
            <div className="platform-stats">
              <p>Status: {simStatus === 'RUNNING' ? 'Airborne' : 'Offline'}</p>
              <p>Lat: {telemetryState ? telemetryState.position.latitude.toFixed(6) : '--'}</p>
              <p>Lon: {telemetryState ? telemetryState.position.longitude.toFixed(6) : '--'}</p>
              <p>Alt: {telemetryState ? telemetryState.position.altitudeMSL.toFixed(1) : '--'}</p>
              <p>Grid (ESM): {telemetryState?.position?.gridReference || '--'}</p>
            </div>
          </div>
        </aside>

        <section className="panel map-area">
          <OfflineMap 
            telemetry={telemetryState} 
            appMode={appMode}
            waypoints={waypoints}
            setWaypoints={setWaypoints}
            observations={observations}
            loadObservations={loadObservations}
          />
        </section>

        <aside className="panel video-area">
          <h2>Sensor Video</h2>
          <SensorFeed telemetry={telemetryState} />
        </aside>

        <section className="panel telemetry-area">
          <h2>
            {appMode === 'LIVE' ? 'Telemetry Data' : 
             appMode === 'REPLAY' ? 'Replay Controls' : 'Mission Planning'}
          </h2>
          <div className="panel-content">
            {appMode === 'LIVE' && (
                <SimulatorControls 
                  onTelemetryUpdate={setTelemetryState} 
                  onStatusUpdate={setSimStatus}
                  setWaypoints={setWaypoints} 
                />
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
            {simStatus === 'RUNNING' && <li>Simulator Started</li>}
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
          <div className="status-dot error"></div>
          <span>Video: None</span>
        </div>
        <div className="status-indicator">
          <div className={`status-dot ${simStatus === 'RUNNING' ? '' : 'error'}`}></div>
          <span>Telemetry: {simStatus === 'RUNNING' ? 'Connected (SIM)' : 'Disconnected'}</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
