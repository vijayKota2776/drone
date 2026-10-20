const https = require('https');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'map.mbtiles');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); // Clean start for fresh in-depth tiles

const db = new Database(dbPath);

// Initialize MBTiles schema
db.exec(`
    PRAGMA synchronous = NORMAL;
    PRAGMA journal_mode = WAL;
    CREATE TABLE metadata (name text, value text);
    CREATE UNIQUE INDEX name on metadata (name);
    CREATE TABLE tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob);
    CREATE UNIQUE INDEX tile_index on tiles (zoom_level, tile_column, tile_row);
`);

const insertMetadata = db.prepare('INSERT INTO metadata (name, value) VALUES (?, ?)');
insertMetadata.run('name', 'Bikaner & Sri Ganganagar In-Depth Offline Drone Map');
insertMetadata.run('type', 'baselayer');
insertMetadata.run('version', '2.0');
insertMetadata.run('description', 'High-resolution offline satellite map covering Bikaner and Sri Ganganagar districts with global/India overview');
insertMetadata.run('format', 'jpg');

const insertTile = db.prepare('INSERT OR REPLACE INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)');

// Slippy map coordinate math
function lng2tile(lon, zoom) { 
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom)); 
}

function lat2tile(lat, zoom) { 
    const rad = lat * Math.PI / 180;
    return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, zoom)); 
}

const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 16 });

function fetchTileWithRetry(z, x, y, retries = 3) {
    return new Promise((resolve) => {
        const url = `https://mt1.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`;
        
        const attempt = (n) => {
            https.get(url, {
                agent: httpsAgent,
                headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
            }, (res) => {
                if (res.statusCode !== 200) {
                    if (n > 0) {
                        setTimeout(() => attempt(n - 1), 300);
                    } else {
                        resolve(null);
                    }
                    return;
                }
                const data = [];
                res.on('data', chunk => data.push(chunk));
                res.on('end', () => {
                    resolve(Buffer.concat(data));
                });
            }).on('error', () => {
                if (n > 0) {
                    setTimeout(() => attempt(n - 1), 300);
                } else {
                    resolve(null);
                }
            });
        };

        attempt(retries);
    });
}

async function generateMap() {
    console.log('===========================================================');
    console.log('BUILDING IN-DEPTH OFFLINE MAP TILES');
    console.log('Targets: Bikaner District & Sri Ganganagar District (In-Depth)');
    console.log('Overview: Global World & India ("Baki Normal")');
    console.log('===========================================================');

    const tileKeys = new Set();
    function queueTile(z, x, y) {
        if (x < 0 || y < 0 || x >= Math.pow(2, z) || y >= Math.pow(2, z)) return;
        tileKeys.add(`${z}/${x}/${y}`);
    }

    // 1. World Map Base (Zoom 1-4) - "Baki Normal"
    console.log('[1/5] Queueing World base tiles (Zoom 1-4)...');
    for (let z = 1; z <= 4; z++) {
        const max = Math.pow(2, z) - 1;
        for (let x = 0; x <= max; x++) {
            for (let y = 0; y <= max; y++) {
                queueTile(z, x, y);
            }
        }
    }

    // 2. India Overview (Zoom 5-7) - "Baki Normal"
    console.log('[2/5] Queueing India overview tiles (Zoom 5-7)...');
    for (let z = 5; z <= 7; z++) {
        const minX = lng2tile(68.0, z), maxX = lng2tile(97.0, z);
        const minY = lat2tile(37.0, z), maxY = lat2tile(8.0, z);
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                queueTile(z, x, y);
            }
        }
    }

    // 3. Regional North-West / Rajasthan Overview (Zoom 8-9)
    console.log('[3/5] Queueing Regional Rajasthan / NW border tiles (Zoom 8-9)...');
    for (let z = 8; z <= 9; z++) {
        const minX = lng2tile(71.0, z), maxX = lng2tile(75.5, z);
        const minY = lat2tile(31.0, z), maxY = lat2tile(26.5, z);
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                queueTile(z, x, y);
            }
        }
    }

    // 4. Entire Bikaner District & Sri Ganganagar District Contiguous Coverage (Zoom 10-12)
    console.log('[4/5] Queueing full district coverage for Bikaner & Sri Ganganagar (Zoom 10-12)...');
    for (let z = 10; z <= 12; z++) {
        const minX = lng2tile(71.9, z), maxX = lng2tile(74.3, z);
        const minY = lat2tile(30.2, z), maxY = lat2tile(27.2, z);
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                queueTile(z, x, y);
            }
        }
    }

    // 5. In-Depth Tactical Sectors for Bikaner & Sri Ganganagar (Zoom 13, 14, 15, 16, 17)
    console.log('[5/5] Queueing in-depth tactical sectors for Bikaner & Sri Ganganagar (Zoom 13-17)...');
    const tacticalSectors = [
        // BIKANER DISTRICT
        { name: 'Bikaner City & Junagarh', lat: 28.0229, lon: 73.3119 },
        { name: 'Nal Air Force Station (Bikaner)', lat: 28.0708, lon: 73.2056 },
        { name: 'Mahajan Field Firing Range', lat: 28.6012, lon: 73.7485 },
        { name: 'Khajuwala Border Sector (Pak Border)', lat: 28.3200, lon: 72.5800 },
        { name: 'Kolayat Tactical Hub', lat: 27.8383, lon: 72.9550 },
        { name: 'Lunkaransar Corridor', lat: 28.5333, lon: 73.7500 },
        { name: 'Bajju Border Outpost', lat: 28.0200, lon: 72.5000 },
        { name: 'Chhattargarh Sector', lat: 28.5800, lon: 73.1800 },
        { name: 'Nokha Sector', lat: 27.5950, lon: 73.4250 },
        { name: 'Deshnoke Corridor', lat: 27.7944, lon: 73.3444 },

        // SRI GANGANAGAR DISTRICT
        { name: 'Sri Ganganagar City & Military Cantt', lat: 29.9038, lon: 73.8772 },
        { name: 'Suratgarh Air Force Station & Army Base', lat: 29.3236, lon: 73.9039 },
        { name: 'Anupgarh Border Tactical Sector', lat: 29.1911, lon: 73.2106 },
        { name: 'Raisinghnagar Border Sector', lat: 29.5372, lon: 73.4478 },
        { name: 'Sri Karanpur Border Sector', lat: 29.8550, lon: 73.4550 },
        { name: 'Gharsana Border Tactical Sector', lat: 28.9800, lon: 73.1200 },
        { name: 'Rawla Mandi Border Sector', lat: 28.8400, lon: 72.9700 },
        { name: 'Hindumalkot Border Outpost (Radcliffe Line)', lat: 30.1300, lon: 73.8800 },
        { name: 'Sadulshahar Corridor', lat: 30.0450, lon: 74.0200 },
        { name: 'Padampur Corridor', lat: 29.6800, lon: 73.6150 },
        { name: 'Vijaynagar Corridor', lat: 29.2300, lon: 73.4900 }
    ];

    // Zoom 13: Tactical area around each sector (radius 3 = 7x7 grid)
    for (const s of tacticalSectors) {
        const cx = lng2tile(s.lon, 13), cy = lat2tile(s.lat, 13);
        for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
                queueTile(13, cx + dx, cy + dy);
            }
        }
    }

    // Zoom 14 & 15: Operational tactical grid (radius 2 = 5x5 grid)
    for (let z = 14; z <= 15; z++) {
        for (const s of tacticalSectors) {
            const cx = lng2tile(s.lon, z), cy = lat2tile(s.lat, z);
            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                    queueTile(z, cx + dx, cy + dy);
                }
            }
        }
    }

    // Zoom 16 & 17: Ultra High-Res military airbases and forward border hubs
    const highPriorityMilitaryHubs = [
        { name: 'Bikaner City & Nal AFS', lat: 28.0500, lon: 73.2500 },
        { name: 'Mahajan Field Firing Range', lat: 28.6012, lon: 73.7485 },
        { name: 'Suratgarh Air Force Station', lat: 29.3236, lon: 73.9039 },
        { name: 'Sri Ganganagar Military Base', lat: 29.9038, lon: 73.8772 },
        { name: 'Anupgarh Tactical Sector', lat: 29.1911, lon: 73.2106 },
        { name: 'Khajuwala Border Outpost', lat: 28.3200, lon: 72.5800 }
    ];

    for (let z = 16; z <= 17; z++) {
        for (const h of highPriorityMilitaryHubs) {
            const cx = lng2tile(h.lon, z), cy = lat2tile(h.lat, z);
            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                    queueTile(z, cx + dx, cy + dy);
                }
            }
        }
    }

    const allTiles = Array.from(tileKeys).map(k => {
        const [z, x, y] = k.split('/').map(Number);
        return { z, x, y };
    });

    console.log(`\nTotal Unique Tiles to Download: ${allTiles.length}`);
    console.log('Starting parallel downloads (Concurrency: 16)...');

    const total = allTiles.length;
    let completed = 0;
    let successCount = 0;
    const startTime = Date.now();

    // Transaction batch buffer
    let pendingTiles = [];

    const commitBatch = db.transaction((tiles) => {
        for (const t of tiles) {
            const tmsY = Math.pow(2, t.z) - 1 - t.y;
            insertTile.run(t.z, t.x, tmsY, t.data);
        }
    });

    const CONCURRENCY = 16;
    let currentIndex = 0;

    async function worker() {
        while (currentIndex < allTiles.length) {
            const index = currentIndex++;
            const t = allTiles[index];
            const buffer = await fetchTileWithRetry(t.z, t.x, t.y);
            completed++;

            if (buffer && buffer.length > 0) {
                successCount++;
                pendingTiles.push({ z: t.z, x: t.x, y: t.y, data: buffer });
            }

            if (pendingTiles.length >= 100) {
                commitBatch(pendingTiles);
                pendingTiles = [];
            }

            if (completed % 250 === 0 || completed === total) {
                const elapsedSec = (Date.now() - startTime) / 1000;
                const speed = (completed / elapsedSec).toFixed(1);
                const percent = ((completed / total) * 100).toFixed(1);
                console.log(`[Progress ${percent}%] ${completed}/${total} tiles processed (${successCount} saved, ${speed} tiles/s)`);
            }
        }
    }

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(worker());
    }
    await Promise.all(workers);

    if (pendingTiles.length > 0) {
        commitBatch(pendingTiles);
        pendingTiles = [];
    }

    db.exec('PRAGMA wal_checkpoint(FULL);');
    db.close();

    const stats = fs.statSync(dbPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n===========================================================');
    console.log(`MAP GENERATION COMPLETE!`);
    console.log(`Tiles Saved: ${successCount} / ${total}`);
    console.log(`File: ${dbPath}`);
    console.log(`Database Size: ${sizeMb} MB`);
    console.log(`Total Time: ${totalTimeSec} seconds`);
    console.log('===========================================================');

    // Sync to user app data if present on local machine
    const userAppData = process.env.HOME 
        ? path.join(process.env.HOME, 'Library/Application Support/drone/data/map.mbtiles')
        : null;
    if (userAppData && fs.existsSync(path.dirname(userAppData))) {
        fs.copyFileSync(dbPath, userAppData);
        console.log(`Synchronized directly to local Electron app: ${userAppData}`);
    }
}

generateMap().catch(err => {
    console.error('Fatal error generating map:', err);
    process.exit(1);
});
