const https = require('https');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'map.mbtiles');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); // Delete old map

const db = new Database(dbPath);

// Initialize MBTiles schema
db.exec(`
    CREATE TABLE metadata (name text, value text);
    CREATE UNIQUE INDEX name on metadata (name);
    CREATE TABLE tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob);
    CREATE UNIQUE INDEX tile_index on tiles (zoom_level, tile_column, tile_row);
`);

const insertMetadata = db.prepare('INSERT INTO metadata (name, value) VALUES (?, ?)');
insertMetadata.run('name', 'Offline Drone Map');
insertMetadata.run('type', 'baselayer');
insertMetadata.run('version', '1.1');
insertMetadata.run('description', 'Offline map for drone operations');
insertMetadata.run('format', 'png');

const insertTile = db.prepare('INSERT OR IGNORE INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)');

// Function to convert Lat/Lng to tile X/Y
function lng2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
function lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

// Gateway of India Coordinates
const lat = 18.9220;
const lon = 72.8347;

function downloadTile(z, x, y) {
    return new Promise((resolve, reject) => {
        const url = `https://mt1.google.com/vt/lyrs=y&x=${x}&y=${y}&z=${z}`;
        https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
        }, (res) => {
            if (res.statusCode !== 200) {
                console.error(`Failed to fetch tile ${z}/${x}/${y}: HTTP ${res.statusCode}`);
                resolve();
                return;
            }
            const data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(data);
                // MBTiles uses TMS coordinates for Y (inverted)
                const tmsY = Math.pow(2, z) - 1 - y;
                insertTile.run(z, x, tmsY, buffer);
                console.log(`Downloaded tile ${z}/${x}/${y}`);
                resolve();
            });
        }).on('error', reject);
    });
}

async function downloadRegion() {
    console.log('Downloading map tiles...');
    
    // 1. Download World Map (Zoom 1-4)
    console.log('Downloading World Map (Zoom 1-4)...');
    for (let z = 1; z <= 4; z++) {
        const maxTile = Math.pow(2, z) - 1;
        for (let x = 0; x <= maxTile; x++) {
            for (let y = 0; y <= maxTile; y++) {
                await downloadTile(z, x, y);
            }
        }
    }

    // 2. Download India bounds (Zoom 5-7)
    // India rough bounds: minLon 68.0, maxLon 97.0, minLat 8.0, maxLat 37.0
    console.log('Downloading India Map (Zoom 5-7)...');
    for (let z = 5; z <= 7; z++) {
        const minX = lng2tile(68.0, z);
        const maxX = lng2tile(97.0, z);
        const minY = lat2tile(37.0, z); // lat2tile is inverted (higher lat = lower Y)
        const maxY = lat2tile(8.0, z);
        
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                await downloadTile(z, x, y);
            }
        }
    }

    // 3. Download Entire Rajasthan State (Zoom 8-13)
    // Bounding box for Rajasthan: 23.0N to 30.2N, 69.4E to 78.3E
    console.log('Downloading Entire Rajasthan State (Zoom 8-13)...');
    for (let z = 8; z <= 13; z++) {
        const minX = lng2tile(69.4, z);
        const maxX = lng2tile(78.3, z);
        const minY = lat2tile(30.2, z); // inverted
        const maxY = lat2tile(23.0, z);
        
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                await downloadTile(z, x, y);
            }
        }
    }

    // 4. Download Ultra High-Res Cities/Targets (Zoom 14-17)
    const cities = [
        { name: "Jaipur (Rajasthan)", lat: 26.9124, lon: 75.7873 },
        { name: "Jodhpur (Rajasthan)", lat: 26.2389, lon: 73.0243 },
        { name: "Jaisalmer (Rajasthan)", lat: 26.9157, lon: 70.9083 },
        { name: "Udaipur (Rajasthan)", lat: 24.5854, lon: 73.7125 },
        { name: "Bikaner (Rajasthan)", lat: 28.0229, lon: 73.3119 },
        { name: "Pokhran (Rajasthan)", lat: 26.9208, lon: 71.9167 },
        { name: "Mumbai", lat: 18.9220, lon: 72.8347 },
        { name: "Delhi", lat: 28.6139, lon: 77.2090 }
    ];

    for (const city of cities) {
        console.log(`Downloading Ultra High-Res ${city.name} (Zoom 14-17)...`);
        for (let z = 14; z <= 17; z++) {
            const cx = lng2tile(city.lon, z);
            const cy = lat2tile(city.lat, z);
            
            // Download a tactical grid around the target
            for (let dx = -4; dx <= 4; dx++) {
                for (let dy = -4; dy <= 4; dy++) {
                    await downloadTile(z, cx + dx, cy + dy);
                }
            }
        }
    }
    
    console.log('\nSuccessfully generated multi-scale map.mbtiles!');
    db.close();
}

downloadRegion();
