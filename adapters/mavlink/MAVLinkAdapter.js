const TelemetrySource = require('../../core/telemetry/TelemetrySource');
const dgram = require('dgram');
const { SerialPort } = require('serialport');
const { MavLinkPacketSplitter, MavLinkPacketParser } = require('node-mavlink');
const coordinateEngine = require('../../core/coordinates/engine');

class MAVLinkAdapter extends TelemetrySource {
    constructor(platformId = 'MAVLINK-UAV-01') {
        super(platformId);
        this.connectionType = null;
        this.udpSocket = null;
        this.serialPort = null;
        
        this.parser = new MavLinkPacketParser();
        this.splitter = new MavLinkPacketSplitter();
        this.splitter.pipe(this.parser);
        
        this.parser.on('data', (packet) => {
            // Very simplified GLOBAL_POSITION_INT (msgid 33) extraction
            // Real MAVLink apps map full schemas, but for production payload relay
            // we extract position to feed the COP map.
            if (packet.header.msgid === 33) {
                // Parse payload bytes: lat, lon, alt (int32)
                try {
                    const lat = packet.protocol.payload.readInt32LE(4) / 1E7;
                    const lon = packet.protocol.payload.readInt32LE(8) / 1E7;
                    const alt = packet.protocol.payload.readInt32LE(12) / 1000;
                    const yaw = packet.protocol.payload.readUInt16LE(26) / 100;
                    
                    this.emitTelemetry({
                        timestamp: Date.now(),
                        position: { latitude: lat, longitude: lon, altitudeMSL: alt },
                        attitude: { yaw: yaw, pitch: 0, roll: 0 },
                        velocity: { groundSpeed: 0 },
                        status: { armed: true, flightMode: 'UNKNOWN' },
                        platformId: this.platformId
                    });
                } catch (err) {
                    // Ignore parse errors on partial bytes
                }
            }
        });
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
    }

    _connectUDP(port, host) {
        this.udpSocket = dgram.createSocket('udp4');
        
        this.udpSocket.on('message', (msg, rinfo) => {
            this.splitter.write(msg);
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
            this.splitter.write(data);
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


}

module.exports = new MAVLinkAdapter();
