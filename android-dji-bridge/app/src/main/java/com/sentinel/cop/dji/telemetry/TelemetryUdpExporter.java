package com.sentinel.cop.dji.telemetry;

import android.util.Log;
import org.json.JSONObject;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class TelemetryUdpExporter {
    private static final String TAG = "UDP_EXPORTER";
    private DatagramSocket udpSocket;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    
    private String host = "10.56.164.60";
    private int port = 14550;
    
    private long lastSendTime = 0;
    private static final long THROTTLE_MS = 100; // 10 Hz
    
    public int packetsSent = 0;

    public void setDestination(String ip, int port) {
        this.host = ip;
        this.port = port;
    }

    public void sendTelemetry(TelemetryData data) {
        long now = System.currentTimeMillis();
        if (now - lastSendTime < THROTTLE_MS) {
            return; // Throttle to 10Hz
        }
        lastSendTime = now;

        executor.submit(() -> {
            try {
                if (udpSocket == null || udpSocket.isClosed()) {
                    udpSocket = new DatagramSocket();
                }
                
                JSONObject json = new JSONObject();
                json.put("schema_version", 1);
                json.put("drone_id", data.drone_id);
                json.put("timestamp", data.timestamp);
                json.put("latitude", data.lat);
                json.put("longitude", data.lon);
                json.put("altitude_m", data.altitude_m);
                json.put("relative_altitude_m", data.relative_altitude_m);
                json.put("heading_deg", data.heading_deg);
                json.put("yaw_deg", data.yaw_deg);
                json.put("pitch_deg", data.pitch_deg);
                json.put("roll_deg", data.roll_deg);
                json.put("speed_mps", data.speed_mps);
                json.put("velocity_x_mps", data.velocity_x_mps);
                json.put("velocity_y_mps", data.velocity_y_mps);
                json.put("velocity_z_mps", data.velocity_z_mps);
                json.put("gps_satellites", data.gps_satellites);
                json.put("flying", data.flying);
                json.put("flight_state", data.flight_state);
                json.put("battery_percent", data.battery);

                byte[] buf = json.toString().getBytes();
                InetAddress address = InetAddress.getByName(host);
                DatagramPacket packet = new DatagramPacket(buf, buf.length, address, port);
                
                udpSocket.send(packet);
                packetsSent++;
                
                if (packetsSent % 10 == 0) { // Log once a second (10Hz)
                    Log.i(TAG, "[UDP] packet_sent " + packetsSent);
                }
            } catch (Exception e) {
                Log.e(TAG, "[UDP] send_error=" + e.getMessage());
            }
        });
    }

    public void sendTestPacket() {
        TelemetryData test = new TelemetryData();
        test.drone_id = "TEST_DRONE";
        test.timestamp = System.currentTimeMillis();
        test.lat = 28.6139;
        test.lon = 77.2090;
        test.altitude_m = 10.0;
        test.heading_deg = 90.0;
        test.speed_mps = 0.0;
        test.flying = false;
        test.battery = 100;
        sendTelemetry(test);
    }

    public void close() {
        if (udpSocket != null && !udpSocket.isClosed()) {
            udpSocket.close();
            udpSocket = null;
        }
    }
}
