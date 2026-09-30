package com.sentinel.cop.dji;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

import org.json.JSONObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;

import dji.common.battery.BatteryState;
import dji.common.error.DJIError;
import dji.common.error.DJISDKError;
import dji.common.flightcontroller.FlightControllerState;
import dji.sdk.base.BaseComponent;
import dji.sdk.base.BaseProduct;
import dji.sdk.flightcontroller.FlightController;
import dji.sdk.products.Aircraft;
import dji.sdk.sdkmanager.DJISDKInitEvent;
import dji.sdk.sdkmanager.DJISDKManager;

public class MainActivity extends Activity {
    private static final String TAG = "DJI_TELEMETRY";
    
    private TextView djiStatusText, aircraftStatusText, udpStatusText;
    private TextView telemetryText;
    private EditText ipInput, portInput;
    private Button startButton;
    
    private DatagramSocket udpSocket;
    private boolean isTransmitting = false;
    
    private int currentBattery = -1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        djiStatusText = findViewById(R.id.dji_status);
        aircraftStatusText = findViewById(R.id.aircraft_status);
        udpStatusText = findViewById(R.id.udp_status);
        telemetryText = findViewById(R.id.telemetry_text);
        ipInput = findViewById(R.id.ip_input);
        portInput = findViewById(R.id.port_input);
        startButton = findViewById(R.id.start_button);
        
        startButton.setOnClickListener(v -> toggleTransmission());

        registerDJISDK();
    }

    private void registerDJISDK() {
        djiStatusText.setText("DJI SDK: REGISTERING...");
        DJISDKManager.getInstance().registerApp(this, new DJISDKManager.SDKManagerCallback() {
            @Override
            public void onRegister(DJIError djiError) {
                if (djiError == DJISDKError.REGISTRATION_SUCCESS) {
                    DJISDKManager.getInstance().startConnectionToProduct();
                    runOnUiThread(() -> djiStatusText.setText("DJI SDK: CONNECTED"));
                } else {
                    runOnUiThread(() -> djiStatusText.setText("DJI SDK: ERROR - " + djiError.getDescription()));
                }
            }

            @Override
            public void onProductDisconnect() {
                runOnUiThread(() -> {
                    aircraftStatusText.setText("Aircraft: DISCONNECTED");
                    telemetryText.setText("No Telemetry");
                });
            }

            @Override
            public void onProductConnect(BaseProduct baseProduct) {
                if (baseProduct instanceof Aircraft) {
                    runOnUiThread(() -> aircraftStatusText.setText("Aircraft: CONNECTED"));
                    setupTelemetryListeners((Aircraft) baseProduct);
                }
            }

            @Override
            public void onProductChanged(BaseProduct baseProduct) {}
            @Override
            public void onComponentChange(BaseProduct.ComponentKey componentKey, BaseComponent oldComponent, BaseComponent newComponent) {}
            @Override
            public void onInitProcess(DJISDKInitEvent djisdkInitEvent, int i) {}
            @Override
            public void onDatabaseDownloadProgress(long l, long l1) {}
        });
    }

    private void setupTelemetryListeners(Aircraft aircraft) {
        if (aircraft.getBattery() != null) {
            aircraft.getBattery().setStateCallback(batteryState -> {
                currentBattery = batteryState.getChargeRemainingInPercent();
            });
        }

        FlightController flightController = aircraft.getFlightController();
        if (flightController != null) {
            flightController.setStateCallback(state -> {
                sendTelemetry(state);
            });
        }
    }

    private void toggleTransmission() {
        if (isTransmitting) {
            isTransmitting = false;
            startButton.setText("START UDP");
            udpStatusText.setText("UDP: NOT CONFIGURED");
        } else {
            isTransmitting = true;
            startButton.setText("STOP UDP");
            udpStatusText.setText("UDP: CONNECTED");
        }
    }

    private void sendTelemetry(FlightControllerState state) {
        if (!isTransmitting) return;

        try {
            double lat = state.getAircraftLocation().getLatitude();
            double lon = state.getAircraftLocation().getLongitude();
            
            if (Double.isNaN(lat) || Double.isNaN(lon) || lat == 0 || lon == 0) return;

            JSONObject packet = new JSONObject();
            packet.put("timestamp", System.currentTimeMillis());
            packet.put("latitude", lat);
            packet.put("longitude", lon);
            packet.put("altitude", state.getAircraftLocation().getAltitude());
            packet.put("relativeAltitude", state.getAircraftLocation().getAltitude());
            packet.put("heading", state.getAttitude().yaw);
            packet.put("velocityX", state.getVelocityX());
            packet.put("velocityY", state.getVelocityY());
            packet.put("velocityZ", state.getVelocityZ());
            packet.put("gpsSatellites", state.getSatelliteCount());
            packet.put("flightState", state.getFlightMode().name());
            packet.put("battery", currentBattery);

            String jsonString = packet.toString();
            
            runOnUiThread(() -> {
                telemetryText.setText(
                    "Lat: " + lat + "\n" +
                    "Lon: " + lon + "\n" +
                    "Alt: " + state.getAircraftLocation().getAltitude() + "\n" +
                    "Heading: " + state.getAttitude().yaw + "\n" +
                    "Battery: " + currentBattery + "%\n" +
                    "Sats: " + state.getSatelliteCount()
                );
            });

            String ip = ipInput.getText().toString();
            int port = Integer.parseInt(portInput.getText().toString());

            new Thread(() -> {
                try {
                    if (udpSocket == null || udpSocket.isClosed()) {
                        udpSocket = new DatagramSocket();
                    }
                    InetAddress address = InetAddress.getByName(ip);
                    byte[] buf = jsonString.getBytes();
                    DatagramPacket datagram = new DatagramPacket(buf, buf.length, address, port);
                    udpSocket.send(datagram);
                } catch (Exception e) {
                    Log.e(TAG, "UDP Send Error", e);
                }
            }).start();

        } catch (Exception e) {
            Log.e(TAG, "JSON Error", e);
        }
    }
}
