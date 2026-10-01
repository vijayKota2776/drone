package com.sentinel.cop.dji.telemetry;

import android.util.Log;
import org.json.JSONObject;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

public class TelemetryUdpExporter {
    private static final String TAG = "UDP_EXPORTER";
    private DatagramSocket udpSocket;
    private ExecutorService executor;
    
    private String host = "10.56.164.60";
    private int port = 14550;
    
    private long lastSendTime = 0;
    private static final long THROTTLE_MS = 100; // 10 Hz
    
    public final AtomicLong packetsSent = new AtomicLong(0);
    private volatile boolean isRunning = false;

    public void setDestination(String ip, int port) {
        this.host = ip;
        this.port = port;
    }

    public synchronized void start() {
        if (isRunning) return;
        isRunning = true;
        packetsSent.set(0);
        if (executor == null || executor.isShutdown()) {
            executor = Executors.newSingleThreadExecutor();
        }
        try {
            if (udpSocket == null || udpSocket.isClosed()) {
                udpSocket = new DatagramSocket();
            }
            Log.i(TAG, "[UDP] transmission_started to " + host + ":" + port);
        } catch (Exception e) {
            Log.e(TAG, "[UDP] start error: " + e.getMessage());
            isRunning = false;
        }
    }

    public synchronized void stop() {
        if (!isRunning) return;
        isRunning = false;
        Log.i(TAG, "[UDP] transmission_stopped");
    }

    public boolean isRunning() {
        return isRunning;
    }

    public void sendTelemetry(TelemetryData data) {
        if (!isRunning) return;
        
        long now = System.currentTimeMillis();
        if (now - lastSendTime < THROTTLE_MS) {
            return; // Throttle to 10Hz
        }
        lastSendTime = now;

        if (executor != null && !executor.isShutdown()) {
            executor.submit(() -> {
                if (!isRunning) return; // Prevent queued packets from sending
                try {
                    if (udpSocket == null || udpSocket.isClosed()) return;
                    
                    JSONObject json = new JSONObject();
                    json.put("schema_version", 1);
                    json.put("drone_id", data.drone_id != null ? data.drone_id : "UNKNOWN");
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
                    json.put("flight_state", data.flight_state != null ? data.flight_state : JSONObject.NULL);
                    json.put("battery_percent", data.battery != -1 ? data.battery : JSONObject.NULL);

                    byte[] buf = json.toString().getBytes();
                    InetAddress address = InetAddress.getByName(host);
                    DatagramPacket packet = new DatagramPacket(buf, buf.length, address, port);
                    
                    udpSocket.send(packet);
                    long currentCount = packetsSent.incrementAndGet();
                    
                    if (currentCount % 10 == 0) { // Log once a second (10Hz)
                        Log.i(TAG, "[UDP] packet_sent " + currentCount);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "[UDP] send_error=" + e.getMessage());
                }
            });
        }
    }

    public void sendTestPacket() {
        TelemetryData test = new TelemetryData();
        test.drone_id = "TEST_DRONE";
        test.timestamp = System.currentTimeMillis();
        test.lat = 28.6139;
        test.lon = 77.2090;
        test.altitude_m = 100.0;
        test.relative_altitude_m = 20.0;
        test.heading_deg = 90.0;
        test.yaw_deg = 90.0;
        test.pitch_deg = 2.0;
        test.roll_deg = -1.0;
        test.speed_mps = 5.0;
        test.velocity_x_mps = 1.0;
        test.velocity_y_mps = 4.9;
        test.velocity_z_mps = 0.0;
        test.gps_satellites = 15;
        test.flying = true;
        test.flight_state = "NORMAL";
        test.battery = 80;
        sendTelemetry(test);
    }

    public synchronized void close() {
        stop();
        if (udpSocket != null && !udpSocket.isClosed()) {
            udpSocket.close();
            udpSocket = null;
        }
        if (executor != null && !executor.isShutdown()) {
            executor.shutdownNow();
            executor = null;
        }
    }
}
