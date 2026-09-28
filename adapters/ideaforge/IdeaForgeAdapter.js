const TelemetrySource = require('../../core/telemetry/TelemetrySource');
const dgram = require('dgram');

class IdeaForgeAdapter extends TelemetrySource {
    constructor(platformId = 'IDEAFORGE-UAV-01') {
        super(platformId);
        this.udpSocket = null;
    }

    connect(config = { port: 6000, host: '0.0.0.0' }) {
        if (this.isConnected) this.disconnect();
        
        this.udpSocket = dgram.createSocket('udp4');
        
        this.udpSocket.on('message', (msg, rinfo) => {
            // TODO: Parse IdeaForge proprietary packet structure here
        });

        this.udpSocket.on('listening', () => {
            console.log(`IdeaForge Adapter listening on UDP ${config.port}`);
            this.isConnected = true;
            this.emitStatus('IDEAFORGE_CONNECTED');
        });

        this.udpSocket.bind(config.port, config.host);
    }

    disconnect() {
        if (!this.isConnected) return;
        if (this.udpSocket) {
            this.udpSocket.close();
            this.udpSocket = null;
        }
        this.isConnected = false;
        this.emitStatus('IDEAFORGE_DISCONNECTED');
        console.log('IdeaForge Adapter Disconnected');
    }
}

module.exports = new IdeaForgeAdapter();
