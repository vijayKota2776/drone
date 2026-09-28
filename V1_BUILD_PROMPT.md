````markdown
# VERSION 1 — CODING AGENT BUILD PROMPT

You are the primary software engineering agent for this project.

Your job is to build Version 1 of the Offline ISR Drone Feed & Geospatial COP application.

---

# 1. SOURCE DOCUMENTS

Before implementing anything, read:

```text
README.md
docs/SYSTEM_ARCHITECTURE.tex
prototype/sentinel-prototype.html
````

These are the project references.

Use:

```text
README.md
```

for the overall project direction.

Use:

```text
docs/SYSTEM_ARCHITECTURE.tex
```

for the technical architecture.

Use:

```text
prototype/sentinel-prototype.html
```

as the UI/UX and workflow reference.

---

# 2. IMPORTANT PROTOTYPE INSTRUCTION

The existing HTML prototype is NOT the final architecture.

Study it first.

Identify:

* Layout
* Navigation
* Map area
* Video area
* Telemetry area
* Platform information
* Grid/reference controls
* Observation workflow
* Mission/event concepts
* Existing visual language

Then rebuild the functionality using the new modular architecture.

Do NOT simply convert the HTML into one React component.

Do NOT keep the entire application in one file.

Do NOT assume simulated prototype values represent real hardware data.

---

# 3. VERSION 1 OBJECTIVE

Build a working offline desktop application that demonstrates:

```text
Create Mission
     ↓
Start Simulator
     ↓
Platform Appears on Offline Map
     ↓
Platform Moves
     ↓
Track Is Drawn
     ↓
Recorded Video Plays
     ↓
Video + Telemetry Are Synchronized
     ↓
Create Geospatial Observation
     ↓
Coordinate/Grid Reference
     ↓
Save Observation
     ↓
Record Mission Event
     ↓
Replay Mission
     ↓
Export Mission
```

Everything above must work without Internet connectivity.

---

# 4. TECHNOLOGY

Use:

```text
Electron
React
JavaScript
Node.js
SQLite
```

Do not use TypeScript.

Do not introduce unnecessary frameworks.

---

# 5. ARCHITECTURE

Use:

```text
UI
 ↓
Application Core
 ↓
Geospatial/Data Services
 ↓
Adapters
 ↓
Simulator / Future Hardware
```

The UI must not directly contain:

* Telemetry parsing
* Coordinate algorithms
* Database queries
* Hardware protocols

---

# 6. PROJECT STRUCTURE

Create:

```text
project-root/
│
├── README.md
├── V1_BUILD_PROMPT.md
│
├── docs/
│   ├── SYSTEM_ARCHITECTURE.tex
│   ├── DATABASE.md
│   ├── TELEMETRY.md
│   ├── COORDINATES.md
│   └── TESTING.md
│
├── prototype/
│   └── sentinel-prototype.html
│
├── electron/
│   ├── main.js
│   └── preload.js
│
├── client/
│   └── src/
│       ├── components/
│       │   ├── Map/
│       │   ├── Video/
│       │   ├── Telemetry/
│       │   ├── Platforms/
│       │   ├── Observations/
│       │   └── Mission/
│       ├── pages/
│       ├── services/
│       ├── state/
│       └── styles/
│
├── core/
│   ├── coordinates/
│   ├── georeferencing/
│   ├── telemetry/
│   ├── synchronization/
│   ├── observations/
│   └── mission/
│
├── adapters/
│   └── simulator/
│
├── database/
│   ├── migrations/
│   └── repositories/
│
├── maps/
│   └── tiles/
│
├── media/
│   └── test-video/
│
├── simulator/
│   ├── telemetry/
│   └── missions/
│
└── tests/
    ├── coordinates/
    ├── telemetry/
    ├── video/
    ├── synchronization/
    ├── database/
    ├── replay/
    └── offline/
```

---

# 7. BUILD ORDER

Do not attempt everything simultaneously.

Implement in this order:

```text
1. Electron + React
2. Application shell
3. UI layout
4. SQLite
5. Coordinate engine
6. Offline map
7. Telemetry simulator
8. Platform marker
9. Platform track
10. Recorded video
11. Synchronization
12. Observation system
13. Mission events
14. Mission replay
15. Export
16. Automated tests
17. Offline validation
18. Documentation
```

After each stage:

```text
Implement
 ↓
Run tests
 ↓
Fix errors
 ↓
Verify
 ↓
Document
 ↓
Continue
```

---

# 8. UI

Recreate the important visual concepts from:

```text
prototype/sentinel-prototype.html
```

The main layout should contain:

```text
┌──────────────────────────────────────────────────────────┐
│ Mission | Platform | Layers | Grid | Record | Replay    │
├───────────────────┬────────────────────┬─────────────────┤
│                   │                    │                 │
│ PLATFORM PANEL    │       MAP          │ SENSOR VIDEO   │
│                   │                    │                 │
├───────────────────┴────────────────────┴─────────────────┤
│ TELEMETRY             │ OBSERVATION / EVENT LOG          │
├──────────────────────────────────────────────────────────┤
│ System Status / Offline / Database / Video / Telemetry  │
└──────────────────────────────────────────────────────────┘
```

The UI should be clean and professional.

Do not overcomplicate the UI.

---

# 9. OFFLINE MAP

Implement an offline map architecture.

Do not use online map services.

The application must be able to load local map resources.

If map data is not currently available:

* Build the map abstraction.
* Create the expected local directory.
* Add a clear empty state.
* Document how map data is added.

Do not silently call remote map servers.

---

# 10. TELEMETRY SIMULATOR

Implement:

```text
adapters/simulator/
```

The simulator should output normalized telemetry.

Use:

```javascript
{
    timestamp,
    platformId,

    position: {
        latitude,
        longitude,
        altitudeMSL
    },

    attitude: {
        roll,
        pitch,
        yaw
    },

    velocity: {
        groundSpeed
    },

    sensor: {
        azimuth,
        elevation,
        hfov,
        vfov
    }
}
```

Use deterministic data.

Create a repeatable path:

```text
A → B → C → D
```

Controls:

```text
Start
Pause
Reset
Speed
```

---

# 11. PLATFORM DISPLAY

Display:

```text
Platform ID
Status
Latitude
Longitude
Altitude
Heading
Speed
Timestamp
```

The map should update as telemetry changes.

---

# 12. TRACK

Store valid platform positions.

Display the historical path on the map.

The track must:

* Update during simulation.
* Reset when a new mission starts.
* Persist during mission recording.
* Be reproducible during replay.

---

# 13. VIDEO

Use a local recorded video.

Expected directory:

```text
media/test-video/
```

If there is no video yet, implement the player and empty state.

Do not fabricate a real sensor feed.

Provide:

```text
Play
Pause
Stop
Seek
Timestamp
Duration
```

---

# 14. SYNCHRONIZATION

Implement:

```text
core/synchronization/
```

Provide:

```javascript
getTelemetryAtTime(timestamp)
```

The method should return the closest valid telemetry state.

Handle:

* Exact match
* Nearest match
* No telemetry
* Telemetry gaps
* Video before telemetry
* Video after telemetry

Add automated tests.

---

# 15. COORDINATES

Implement a dedicated coordinate service.

At minimum provide:

```javascript
toMGRS(latitude, longitude)
fromMGRS(mgrs)
toUTM(latitude, longitude)
fromUTM(utm)
```

Use a reliable coordinate/geospatial library where appropriate rather than implementing complex projection mathematics unnecessarily.

For the Indian grid/reference system:

DO NOT GUESS.

Create the architecture for it, but only implement the exact system once the required datum/projection/zone specification is available.

---

# 16. OBSERVATIONS

Create an observation module.

Observation:

```javascript
{
    id,
    missionId,
    platformId,
    timestamp,
    source,
    latitude,
    longitude,
    gridReference,
    status,
    notes
}
```

Support:

```text
OBSERVED
CALCULATED
CONFIRMED
```

The application must preserve these states.

---

# 17. OBSERVATION WORKFLOW

Version 1 observation workflow:

```text
Operator chooses observation location
        ↓
Read geographic coordinate
        ↓
Coordinate conversion
        ↓
Grid reference
        ↓
Display marker
        ↓
Save observation
        ↓
Record mission event
```

This is a geospatial observation/visualization feature.

Do not implement weapon guidance, engagement logic, attack optimization, or automated targeting functionality.

---

# 18. SQLITE

Implement SQLite.

Tables:

```text
missions
platforms
telemetry
observations
mission_events
```

Use migrations.

Create repository/service functions instead of putting SQL directly in React components.

---

# 19. MISSION

Support:

```text
Create Mission
Start Mission
End Mission
Load Mission
Replay Mission
```

Persist mission information.

---

# 20. EVENTS

Record:

```text
MISSION_STARTED
MISSION_ENDED
PLATFORM_CONNECTED
PLATFORM_DISCONNECTED
VIDEO_STARTED
VIDEO_STOPPED
TELEMETRY_STARTED
TELEMETRY_STOPPED
OBSERVATION_CREATED
OBSERVATION_UPDATED
```

Every event must have a timestamp.

---

# 21. REPLAY

Replay must reconstruct:

```text
Platform Position
Platform Track
Telemetry
Video Time
Observations
Mission Events
```

Controls:

```text
Play
Pause
Stop
Timeline
Playback Speed
```

Replay must use deterministic test data.

---

# 22. EXPORT

Implement:

```text
JSON
CSV
```

Export:

```text
Mission
Telemetry
Observations
Events
```

---

# 23. TESTING

Create automated tests for:

## Coordinates

* Valid coordinate
* Invalid coordinate
* MGRS
* Reverse MGRS
* UTM
* Boundary cases

## Telemetry

* Simulator output
* Validation
* Timestamp
* Missing data
* Invalid data

## Synchronization

* Exact match
* Nearest match
* Missing telemetry
* Time gaps

## Database

* Mission creation
* Telemetry insertion
* Observation insertion
* Event insertion
* Data retrieval
* Persistence

## Replay

* Mission loading
* Telemetry replay
* Observation replay
* Event replay

---

# 24. OFFLINE TEST

Perform an explicit offline test.

Disable:

```text
Wi-Fi
Ethernet
Internet
```

Then test:

```text
Application launch
Map
Simulator
Telemetry
Video
Coordinates
Observation
Database
Replay
Export
```

The application must continue functioning.

---

# 25. FAILURE TESTING

Test:

```text
Missing map
Missing video
Telemetry interruption
Invalid coordinate
Invalid grid
Database failure
Corrupt video
Failed mission load
Failed export
Application restart
```

The UI should show clear errors.

---

# 26. HARDWARE ADAPTERS

Create the architecture for:

```text
AsteriaAdapter
IdeaForgeAdapter
RapheAdapter
FPVAdapter
```

But do not implement undocumented hardware protocols.

Version 1 should use:

```text
SimulatorAdapter
```

Real adapters will be implemented later using official platform documentation.

---

# 27. ELECTRON SECURITY

Use:

* Secure preload
* Restricted IPC
* No unrestricted Node access in renderer
* Validated IPC arguments
* Privileged operations in main process

Do not expose arbitrary filesystem or system APIs to React.

---

# 28. CODE QUALITY

Follow:

```text
Small components
Clear modules
No duplicated logic
No magic values
No direct database access from UI
No hardware logic in UI
No coordinate logic in UI
```

Keep code readable.

---

# 29. DOCUMENTATION

Update:

```text
README.md
docs/DATABASE.md
docs/TELEMETRY.md
docs/COORDINATES.md
docs/TESTING.md
```

Document important implementation decisions.

---

# 30. DEFINITION OF DONE

Do not report Version 1 complete until all of these work:

* [ ] Application launches.
* [ ] UI loads.
* [ ] Offline map architecture works.
* [ ] Simulator starts.
* [ ] Platform appears.
* [ ] Platform moves.
* [ ] Track is displayed.
* [ ] Video plays.
* [ ] Video timestamp works.
* [ ] Telemetry/video synchronization works.
* [ ] Coordinate conversion works.
* [ ] Grid reference works where specification is available.
* [ ] Observation can be created.
* [ ] Observation appears on map.
* [ ] Observation persists.
* [ ] Mission events persist.
* [ ] Mission replay works.
* [ ] JSON export works.
* [ ] CSV export works.
* [ ] Automated tests pass.
* [ ] Offline test passes.
* [ ] Failure handling works.
* [ ] Documentation is updated.

---

# 31. FINAL RULE

Build Version 1 as a complete software pipeline using simulation and recorded data.

Do not wait for physical hardware.

Do not invent hardware protocols.

Do not introduce online dependencies.

Do not turn the prototype into the production architecture.

Use the prototype for visual and workflow guidance.

The final architecture must allow:

```text
Simulator
    ↓
Common Interface
    ↓
Core Application
```

to later become:

```text
Real Platform
    ↓
Platform Adapter
    ↓
Common Interface
    ↓
Core Application
```

without rewriting the application.

Build incrementally.

Test every module.

Keep the system offline-first.

END OF V1 BUILD PROMPT

```
```
