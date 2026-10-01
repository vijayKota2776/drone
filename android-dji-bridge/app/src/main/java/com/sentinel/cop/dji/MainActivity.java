package com.sentinel.cop.dji;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

import com.sentinel.cop.dji.telemetry.TelemetryData;
import com.sentinel.cop.dji.telemetry.TelemetryManager;
import com.sentinel.cop.dji.telemetry.TelemetryUdpExporter;

import dji.common.error.DJIError;
import dji.common.error.DJISDKError;
import dji.sdk.base.BaseComponent;
import dji.sdk.base.BaseProduct;
import dji.sdk.flightcontroller.FlightController;
import dji.sdk.products.Aircraft;
import dji.sdk.sdkmanager.DJISDKInitEvent;
import dji.sdk.sdkmanager.DJISDKManager;

public class MainActivity extends Activity {
    private static final String TAG = "DJI_MAIN";
    
    private TextView djiStatusText, aircraftStatusText, udpStatusText;
    private TextView telemetryText;
    private EditText ipInput, portInput;
    private Button startButton, testButton;
    
    private TelemetryUdpExporter exporter;
    private TelemetryManager telemetryManager;
    private boolean isTransmitting = false;

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
        testButton = findViewById(R.id.test_button);
        
        exporter = new TelemetryUdpExporter();
        telemetryManager = new TelemetryManager(exporter);
        
        startButton.setOnClickListener(v -> toggleTransmission());
        testButton.setOnClickListener(v -> sendStaticTestPacket());

        registerDJISDK();
    }

    private void registerDJISDK() {
        Log.i(TAG, "[DJI] SDK registration started");
        djiStatusText.setText("DJI SDK: REGISTERING...");
        
        DJISDKManager.getInstance().registerApp(this, new DJISDKManager.SDKManagerCallback() {
            @Override
            public void onRegister(DJIError djiError) {
                if (djiError == DJISDKError.REGISTRATION_SUCCESS) {
                    Log.i(TAG, "[DJI] SDK registration successful");
                    DJISDKManager.getInstance().startConnectionToProduct();
                    runOnUiThread(() -> djiStatusText.setText("DJI SDK: CONNECTED"));
                } else {
                    Log.e(TAG, "[DJI] SDK registration failed: " + djiError.getDescription());
                    runOnUiThread(() -> djiStatusText.setText("DJI SDK: ERROR - " + djiError.getDescription()));
                }
            }

            @Override
            public void onProductDisconnect() {
                Log.i(TAG, "[DJI] Product disconnected");
                runOnUiThread(() -> {
                    aircraftStatusText.setText("Aircraft: DISCONNECTED");
                    telemetryText.setText("No Telemetry");
                });
            }

            @Override
            public void onProductConnect(BaseProduct baseProduct) {
                Log.i(TAG, "[DJI] Product connected");
                if (baseProduct instanceof Aircraft) {
                    Log.i(TAG, "[DJI] Aircraft connected");
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
                telemetryManager.updateBattery(batteryState);
            });
        }

        FlightController flightController = aircraft.getFlightController();
        if (flightController != null) {
            flightController.setStateCallback(state -> {
                if (isTransmitting) {
                    TelemetryData data = telemetryManager.updateFlightState(state);
                    if (data != null && exporter.packetsSent % 10 == 0) {
                        updateUIDebug(data);
                    }
                }
            });
        }
    }
    
    private void updateUIDebug(TelemetryData data) {
        runOnUiThread(() -> {
            telemetryText.setText(
                String.format("Destination: %s:%s\nPackets Sent: %d\nLast Packet: %d\n\nLAT: %.6f\nLON: %.6f\nALT: %.1f\nHEADING: %.1f\nYAW: %.1f\nPITCH: %.1f\nROLL: %.1f\nSPEED: %.1f\nGPS: %d\nBATTERY: %d",
                    ipInput.getText().toString(), portInput.getText().toString(),
                    exporter.packetsSent, data.timestamp,
                    data.lat, data.lon, data.altitude_m,
                    data.heading_deg, data.yaw_deg, data.pitch_deg, data.roll_deg,
                    data.speed_mps, data.gps_satellites, data.battery)
            );
        });
    }

    private void toggleTransmission() {
        if (isTransmitting) {
            isTransmitting = false;
            startButton.setText("START UDP");
            udpStatusText.setText("UDP: NOT CONFIGURED");
        } else {
            exporter.setDestination(ipInput.getText().toString(), Integer.parseInt(portInput.getText().toString()));
            isTransmitting = true;
            startButton.setText("STOP UDP");
            udpStatusText.setText("UDP: CONNECTED");
            Log.i(TAG, "[UDP] destination=" + ipInput.getText().toString() + ":" + portInput.getText().toString());
        }
    }
    
    private void sendStaticTestPacket() {
        exporter.setDestination(ipInput.getText().toString(), Integer.parseInt(portInput.getText().toString()));
        exporter.sendTestPacket();
        udpStatusText.setText("UDP: TEST PACKET SENT");
        Log.i(TAG, "[UDP] Test packet sent");
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (exporter != null) {
            exporter.close();
        }
    }
}
