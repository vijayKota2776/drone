import React, { useState } from 'react';
import './MissionPanel.css';

const MissionPanel = ({ waypoints, setWaypoints, onModeChange }) => {
    
    const handleDelete = (index) => {
        const newWps = [...waypoints];
        newWps.splice(index, 1);
        setWaypoints(newWps);
    };

    const handleClear = () => {
        setWaypoints([]);
    };

    const handleSave = async () => {
        if (!window.electronAPI) return;
        try {
            // Electron does not support prompt() natively, so we auto-generate the name
            const name = `Mission-${new Date().toLocaleTimeString()}`;
            await window.electronAPI.saveMission(name, waypoints);
            alert('Mission saved successfully!');
            setWaypoints([]); // Clear after save
        } catch (error) {
            alert('Failed to save mission: ' + error.message);
        }
    };

    return (
        <div className="mission-panel">
            <div className="mission-header">
                <h3>MISSION PLANNING</h3>
                <button className="exit-btn" onClick={() => onModeChange('LIVE')}>Exit to Live</button>
            </div>
            
            <div className="mission-instruction">
                <p>Click on the map to add waypoints.</p>
            </div>

            <div className="waypoints-list">
                {waypoints.length === 0 ? (
                    <div className="empty-state">No waypoints added yet.</div>
                ) : (
                    waypoints.map((wp, i) => (
                        <div key={i} className="waypoint-item">
                            <div className="wp-info">
                                <strong>WP-{i + 1}</strong>
                                <span>{wp.gridReference || `${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}`}</span>
                            </div>
                            <button className="delete-btn" onClick={() => handleDelete(i)}>X</button>
                        </div>
                    ))
                )}
            </div>

            <div className="mission-actions">
                <button onClick={handleClear} disabled={waypoints.length === 0} className="clear-btn">Clear All</button>
                <button onClick={handleSave} disabled={waypoints.length === 0} className="save-btn">Save Mission</button>
            </div>
        </div>
    );
};

export default MissionPanel;
