package com.sentinel.cop.dji;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Local Wi-Fi H.264 video streamer from Android phone to Desktop Electron COP.
 * Runs completely offline over local TCP without requiring Internet or external media servers.
 */
public final class VideoStreamer {
    private static final VideoStreamer INSTANCE = new VideoStreamer();
    public static VideoStreamer getInstance() { return INSTANCE; }

    private final BlockingQueue<byte[]> queue = new LinkedBlockingQueue<>(60);
    private final AtomicBoolean running = new AtomicBoolean(false);
    private volatile String targetHost = null;
    private volatile int targetPort = 14555;
    private Thread worker = null;

    private VideoStreamer() {}

    public synchronized void start(String host, int port) {
        if (running.get()) {
            if (host != null && host.equals(targetHost) && port == targetPort) {
                return;
            }
            stop();
        }
        this.targetHost = host;
        this.targetPort = port;
        running.set(true);
        queue.clear();
        worker = new Thread(this::runLoop, "DJI-VideoStreamer");
        worker.setDaemon(true);
        worker.start();
    }

    public synchronized void stop() {
        running.set(false);
        queue.clear();
        if (worker != null) {
            worker.interrupt();
            worker = null;
        }
    }

    public void sendFrame(byte[] data, int size) {
        if (!running.get() || data == null || size <= 0) return;
        byte[] copy = new byte[size];
        System.arraycopy(data, 0, copy, 0, size);
        // Discard backlog if Wi-Fi latency spikes so stream stays real-time
        while (queue.size() > 15) {
            queue.poll();
        }
        queue.offer(copy);
    }

    private void runLoop() {
        while (running.get()) {
            if (targetHost == null) {
                try { Thread.sleep(1000); } catch (InterruptedException e) { break; }
                continue;
            }
            try (Socket socket = new Socket()) {
                socket.setTcpNoDelay(true);
                socket.connect(new InetSocketAddress(targetHost, targetPort), 3000);
                OutputStream out = socket.getOutputStream();
                Diagnostics.record("Video streaming connected to " + targetHost + ":" + targetPort);

                while (running.get() && !socket.isClosed()) {
                    byte[] frame = queue.take();
                    out.write(frame);
                    out.flush();
                }
            } catch (InterruptedException e) {
                break;
            } catch (Exception e) {
                // Connection retry delay
                try { Thread.sleep(2000); } catch (InterruptedException ie) { break; }
            }
        }
        Diagnostics.record("Video streaming stopped");
    }
}
