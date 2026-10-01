const assert = require('assert');
const djiAdapter = require('../adapters/dji/DJIAdapter');
const dgram = require('dgram');

async function runTests() {
    console.log("Running DJI Adapter Tests...");
    let testsPassed = 0;
    let testsFailed = 0;

    const testPacket = {
        schema_version: 1,
        drone_id: "TEST_01",
        timestamp: 1234567890,
        latitude: 10.0,
        longitude: 20.0,
        altitude_m: 100.0,
        relative_altitude_m: 20.0,
        heading_deg: 90,
        pitch_deg: 5,
        roll_deg: -5,
        speed_mps: 10,
        velocity_x_mps: 5,
        velocity_y_mps: 5,
        velocity_z_mps: 0,
        gps_satellites: 12,
        flying: true,
        flight_state: "NORMAL",
        battery_percent: 85
    };

    try {
        await djiAdapter.connect({ port: 14555, host: '127.0.0.1', timeout: 500 });
        assert.strictEqual(djiAdapter.status, 'UDP_LISTENER_ACTIVE', 'Status should be UDP_LISTENER_ACTIVE after connect');
        
        let telemetryReceived = false;
        let testCount = 0;
        djiAdapter.on('telemetry', (data) => {
            telemetryReceived = true;
            testCount++;
            if (testCount === 1) {
                assert.strictEqual(data.platformId, "TEST_01");
                assert.strictEqual(data.position.latitude, 10.0);
                assert.strictEqual(data.position.longitude, 20.0);
                assert.strictEqual(data.position.altitudeMSL, 100.0);
                assert.strictEqual(data.position.relativeAltitude, 20.0);
                assert.strictEqual(data.attitude.yaw, 90);
                assert.strictEqual(data.attitude.pitch, 5);
                assert.strictEqual(data.attitude.roll, -5);
                assert.strictEqual(data.velocity.velocityX, 5);
                assert.strictEqual(data.velocity.velocityY, 5);
                assert.strictEqual(data.velocity.velocityZ, 0);
                assert.strictEqual(data.status.battery, 85);
                assert.strictEqual(data.status.satellites, 12);
                assert.strictEqual(data.status.flightMode, "NORMAL");
                assert.strictEqual(data.status.flying, true);
                assert.strictEqual(data.status.armed, null);
            } else if (testCount === 2) {
                assert.strictEqual(data.attitude.yaw, 0);
                assert.strictEqual(data.attitude.pitch, 0);
                assert.strictEqual(data.attitude.roll, 0);
                assert.strictEqual(data.velocity.groundSpeed, 0);
            }
        });

        // Send a test packet via UDP
        const client = dgram.createSocket('udp4');
        const message = Buffer.from(JSON.stringify(testPacket));
        client.send(message, 14555, '127.0.0.1');

        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for processing
        assert.ok(telemetryReceived, "Telemetry was not received");
        assert.strictEqual(djiAdapter.status, 'TELEMETRY_RECEIVED', "Status should be TELEMETRY_RECEIVED");

        // Wait for timeout
        await new Promise(resolve => setTimeout(resolve, 600));
        assert.strictEqual(djiAdapter.status, 'TELEMETRY_LOST', "Status should be TELEMETRY_LOST after timeout");

        // Test malformed JSON
        telemetryReceived = false;
        client.send(Buffer.from("{bad_json:"), 14555, '127.0.0.1');
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.ok(!telemetryReceived, "Should not receive telemetry for malformed packet");
        
        // Test zero values
        const zeroPacket = { ...testPacket, pitch_deg: 0, roll_deg: 0, heading_deg: 0, speed_mps: 0 };
        client.send(Buffer.from(JSON.stringify(zeroPacket)), 14555, '127.0.0.1');
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.strictEqual(djiAdapter.status, 'TELEMETRY_RECEIVED', "Status should recover to TELEMETRY_RECEIVED");

        client.close();
        djiAdapter.disconnect();
        assert.strictEqual(djiAdapter.status, 'DISCONNECTED', "Status should be DISCONNECTED after disconnect");
        
        // Database tests
        const telemetryLogger = require('../adapters/storage/TelemetryLogger');
        const telemetryRepo = require('../database/repositories/telemetryRepository');
        const replayEngine = require('../core/replay/ReplayEngine');
        const replayRepo = require('../core/replay/ReplayRepository');
        
        telemetryLogger.startRecording();
        const flightId = telemetryLogger.currentFlightId;
        assert.ok(flightId, "Flight ID should be generated");
        
        // Use normalized telemetry format for the logger
        const normalizedTelemetry = {
            timestamp: 1234567890,
            platformId: "TEST_01",
            position: {
                latitude: 10.0,
                longitude: 20.0,
                altitudeMSL: 100.0,
                relativeAltitude: 20.0,
                gridReference: null
            },
            attitude: {
                yaw: 90,
                pitch: 5,
                roll: -5
            },
            velocity: {
                groundSpeed: 10,
                velocityX: 5,
                velocityY: 5,
                velocityZ: 0
            },
            status: {
                satellites: 12,
                battery: 85,
                flightMode: "NORMAL",
                flying: true
            }
        };

        telemetryLogger.logTelemetry(normalizedTelemetry);
        telemetryLogger.stopRecording();
        
        const dbRecords = telemetryRepo.getTelemetryForFlight(flightId);
        assert.strictEqual(dbRecords.length, 1, "Should have 1 record in DB");
        const record = dbRecords[0];
        
        assert.strictEqual(record.flight_id, flightId);
        assert.strictEqual(record.platform_id, "TEST_01");
        assert.strictEqual(record.latitude, 10.0);
        assert.strictEqual(record.longitude, 20.0);
        assert.strictEqual(record.altitude_m, 100.0);
        assert.strictEqual(record.relative_altitude_m, 20.0);
        assert.strictEqual(record.yaw_deg, 90);
        assert.strictEqual(record.pitch_deg, 5);
        assert.strictEqual(record.roll_deg, -5);
        assert.strictEqual(record.speed_mps, 10);
        assert.strictEqual(record.velocity_x_mps, 5);
        assert.strictEqual(record.velocity_y_mps, 5);
        assert.strictEqual(record.velocity_z_mps, 0);
        assert.strictEqual(record.gps_satellites, 12);
        assert.strictEqual(record.battery_percent, 85);
        assert.strictEqual(record.flight_state, "NORMAL");
        assert.strictEqual(record.flying, 1);

        // Replay Engine Test
        let replayTelemetryReceived = false;
        replayEngine.on('telemetry', (data) => {
            replayTelemetryReceived = true;
            assert.strictEqual(data.platformId, "TEST_01");
            assert.strictEqual(data.position.latitude, 10.0);
            assert.strictEqual(data.position.longitude, 20.0);
            assert.strictEqual(data.position.altitudeMSL, 100.0);
            assert.strictEqual(data.position.relativeAltitude, 20.0);
            assert.strictEqual(data.attitude.yaw, 90);
            assert.strictEqual(data.attitude.pitch, 5);
            assert.strictEqual(data.attitude.roll, -5);
            assert.strictEqual(data.velocity.groundSpeed, 10);
            assert.strictEqual(data.velocity.velocityX, 5);
            assert.strictEqual(data.velocity.velocityY, 5);
            assert.strictEqual(data.velocity.velocityZ, 0);
            assert.strictEqual(data.status.satellites, 12);
            assert.strictEqual(data.status.battery, 85);
            assert.strictEqual(data.status.flightMode, "NORMAL");
            assert.strictEqual(data.status.flying, true);
        });
        
        replayEngine.loadFlight(flightId);
        assert.ok(replayTelemetryReceived, "Replay Engine should emit normalized telemetry immediately on load");

        testsPassed++;
        console.log("All DJI Adapter tests passed successfully.");
    } catch (err) {
        testsFailed++;
        console.error("Test failed:", err);
    }
    
    if (testsFailed > 0) process.exit(1);
    process.exit(0);
}

runTests();
