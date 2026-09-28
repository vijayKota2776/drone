# Tactical COP (Common Operating Picture) - Setup & Operations Guide

This document outlines how to build, run, and connect your drone fleet to the universal ground station.

## 1. System Requirements & Setup
This software is built using Node.js and Electron to ensure cross-platform compatibility (Windows, Mac, Linux) while running entirely offline.

### Prerequisites:
1. Install **Node.js** (v18 or higher recommended).
2. Install **Git** (optional, for cloning).

### Installation & Build:
1. Extract the provided source code zip file into a folder.
2. Open your terminal/command prompt and navigate into that folder.
3. Install the core dependencies:
   ```bash
   npm install
   ```
4. Install the client interface dependencies:
   ```bash
   cd client
   npm install
   cd ..
   ```
5. **Download Offline Maps:** To populate the local SQLite offline map database with high-resolution imagery, run the map downloader script:
   ```bash
   node scripts/download_map.js
   ```

### Running the Application:
To launch the application in development/operational mode, run:
```bash
npm run dev
```

*Note: If you wish to compile the application into a standalone executable (`.exe` or `.app`), run `npm run build`.*

---

## 2. Connecting a Drone (Hardware Integration)

The software includes a universal **MAVLink Adapter** capable of interfacing with any standard ArduPilot, PX4, or MAVLink-compatible drone.

### Step 1: Establish the Physical Link
You must provide a data bridge between the drone and the computer running this software. The two supported methods are:

* **USB / Serial Telemetry Radio:** Plug a telemetry radio (e.g., SiK Radio) directly into your laptop's USB port.
* **Network / Wi-Fi UDP Bridge:** Connect your laptop to a Wi-Fi network hosted by the drone (or ground router) that broadcasts telemetry over UDP.

### Step 2: Configure the Software
1. Launch the COP application.
2. Locate the **HARDWARE CONNECTION** panel in the top-left corner.
3. Select your connection type:
   * **If using UDP (Wi-Fi):** Select "UDP" and enter the specific port the drone is broadcasting on (Default is `14550`).
   * **If using Serial (USB):** Select "Serial", specify the exact COM port path (e.g., `COM3` on Windows, or `/dev/ttyUSB0` on Linux/Mac), and select the correct Baud Rate (e.g., `57600`).
4. Click **"Connect to Drone"**.

### Step 3: Operation
Once connected, the system will begin parsing the incoming MAVLink byte stream.
* The map will automatically snap to the drone's live GPS coordinates.
* The telemetry panel will display real-time altitude, ground speed, and MGRS tactical grid references.
* You can drop Tactical Observation markers on the map to log points of interest securely into the offline SQLite database.

---
*For support with proprietary drone models that do not use standard MAVLink, please contact our engineering team to request a custom software adapter. You will need to provide the manufacturer's SDK or API documentation.*
