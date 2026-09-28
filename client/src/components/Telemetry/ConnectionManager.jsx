import React, { useState } from 'react';
import './ConnectionManager.css';

const ConnectionManager = () => {
    const [connectionType, setConnectionType] = useState('UDP'); // UDP or SERIAL
    const [udpPort, setUdpPort] = useState(14550);
    const [serialPort, setSerialPort] = useState('/dev/ttyUSB0');
    const [baudRate, setBaudRate] = useState(57600);
    const [isConnected, setIsConnected] = useState(false);

    const handleConnect = async () => {
        if (!window.electronAPI) return;

        if (isConnected) {
            await window.electronAPI.disconnectMavlink();
            setIsConnected(false);
        } else {
            const config = { type: connectionType };
            if (connectionType === 'UDP') {
                config.port = udpPort;
            } else {
                config.path = serialPort;
                config.baudRate = baudRate;
            }
            const success = await window.electronAPI.connectMavlink(config);
            if (success) {
                setIsConnected(true);
            }
        }
    };

    return (
        <div className="connection-manager">
            <h3>Hardware Connection</h3>
            
            <div className="connection-type-selector">
                <label>
                    <input 
                        type="radio" 
                        name="connType" 
                        value="UDP" 
                        checked={connectionType === 'UDP'} 
                        onChange={() => setConnectionType('UDP')}
                        disabled={isConnected}
                    /> 
                    UDP (Wi-Fi)
                </label>
                <label>
                    <input 
                        type="radio" 
                        name="connType" 
                        value="SERIAL" 
                        checked={connectionType === 'SERIAL'} 
                        onChange={() => setConnectionType('SERIAL')}
                        disabled={isConnected}
                    /> 
                    Serial (USB)
                </label>
            </div>

            {connectionType === 'UDP' && (
                <div className="connection-settings">
                    <label>Port: 
                        <input 
                            type="number" 
                            value={udpPort} 
                            onChange={e => setUdpPort(parseInt(e.target.value))} 
                            disabled={isConnected} 
                            className="input-field"
                        />
                    </label>
                </div>
            )}

            {connectionType === 'SERIAL' && (
                <div className="connection-settings">
                    <label>Path: 
                        <input 
                            type="text" 
                            value={serialPort} 
                            onChange={e => setSerialPort(e.target.value)} 
                            disabled={isConnected} 
                            className="input-field"
                        />
                    </label>
                    <label>Baud: 
                        <select 
                            value={baudRate} 
                            onChange={e => setBaudRate(parseInt(e.target.value))} 
                            disabled={isConnected}
                            className="input-field"
                        >
                            <option value={9600}>9600</option>
                            <option value={57600}>57600</option>
                            <option value={115200}>115200</option>
                        </select>
                    </label>
                </div>
            )}

            <button 
                className={`connect-btn ${isConnected ? 'disconnect' : ''}`}
                onClick={handleConnect}
            >
                {isConnected ? 'Disconnect MAVLink' : 'Connect to Drone'}
            </button>
        </div>
    );
};

export default ConnectionManager;
