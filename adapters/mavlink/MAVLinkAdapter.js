const TelemetrySource = require('../../core/telemetry/TelemetrySource');
const dgram = require('dgram');
const { SerialPort } = require('serialport');

class MAVLinkAdapter extends TelemetrySource {
    constructor(platformId = 'MAVLINK-UAV-01') {
        super(platformId);
        this.mockInterval = null;
        this.connectionType = null;
        this.udpSocket = null;
        this.serialPort = null;
    }

    connect(config = {}) {
        if (this.isConnected) this.disconnect();
        
        this.connectionType = config.type || 'UDP'; // 'UDP' or 'SERIAL'

        if (this.connectionType === 'UDP') {
            this._connectUDP(config.port || 14550, config.host || '0.0.0.0');
        } else if (this.connectionType === 'SERIAL') {
            this._connectSerial(config.path || '/dev/ttyUSB0', config.baudRate || 57600);
        }

        this.isConnected = true;
        this.emitStatus('MAVLINK_CONNECTED');
        
        console.log(`MAVLink Adapter: Connecting via ${this.connectionType}...`);

        // Start emitting mock telemetry for the UI while waiting for real parsing
        this._startMockTelemetry();
    }

    _connectUDP(port, host) {
        this.udpSocket = dgram.createSocket('udp4');
        
        this.udpSocket.on('message', (msg, rinfo) => {
            // Here is where we would pass 'msg' into a MAVLink parser (node-mavlink)
            // console.log(`MAVLink UDP Data from ${rinfo.address}:${rinfo.port} - ${msg.length} bytes`);
        });

        this.udpSocket.on('listening', () => {
            const address = this.udpSocket.address();
            console.log(`MAVLink UDP listening on ${address.address}:${address.port}`);
        });

        this.udpSocket.bind(port, host);
    }

    _connectSerial(path, baudRate) {
        this.serialPort = new SerialPort({ path, baudRate }, (err) => {
            if (err) {
                console.error('Error opening serial port: ', err.message);
                return;
            }
            console.log(`MAVLink Serial listening on ${path} at ${baudRate} baud`);
        });

        this.serialPort.on('data', (data) => {
            // Here is where we would pass 'data' into a MAVLink parser
            // console.log(`MAVLink Serial Data - ${data.length} bytes`);
        });
    }

    disconnect() {
        if (!this.isConnected) return;
        
        clearInterval(this.mockInterval);
        
        if (this.udpSocket) {
            this.udpSocket.close();
            this.udpSocket = null;
        }
        
        if (this.serialPort) {
            this.serialPort.close();
            this.serialPort = null;
        }

        this.isConnected = false;
        this.emitStatus('MAVLINK_DISCONNECTED');
        console.log('MAVLink Adapter: Disconnected.');
    }

    _startMockTelemetry() {
        let lat = 18.9220;
        let lon = 72.8347;

        this.mockInterval = setInterval(() => {
            if (!this.isConnected) return;
            lat += 0.00001;
            lon += 0.00001;

            this.emitTelemetry({
                timestamp: Date.now(),
                position: { latitude: lat, longitude: lon, altitudeMSL: 120.0 },
                attitude: { roll: 0, pitch: 5, yaw: 90 },
                velocity: { groundSpeed: 10 },
                status: { armed: true, flightMode: 'GUIDED' }
            });
        }, 200);
    }
}

module.exports = new MAVLinkAdapter();
