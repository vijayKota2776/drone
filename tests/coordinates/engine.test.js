const assert = require('assert');
const engine = require('../../core/coordinates/engine');

console.log('Testing Coordinate Engine...');

try {
    // 1. Test WGS84 to MGRS
    // Example: Gateway of India, Mumbai (approx 18.9220° N, 72.8347° E)
    const lat = 18.9220;
    const lon = 72.8347;

    const mgrsStr = engine.toMGRS(lat, lon);
    console.log(`Gateway of India WGS84: ${lat}, ${lon} -> MGRS: ${mgrsStr}`);
    
    assert.strictEqual(typeof mgrsStr, 'string', 'MGRS output should be a string');
    assert.ok(mgrsStr.startsWith('43Q'), 'MGRS should start with expected grid zone 43Q');

    // 2. Test MGRS to WGS84
    const wgs84 = engine.fromMGRS(mgrsStr);
    console.log(`MGRS: ${mgrsStr} -> WGS84: ${wgs84.latitude.toFixed(4)}, ${wgs84.longitude.toFixed(4)}`);

    // We allow a small epsilon difference due to float math and precision
    assert.ok(Math.abs(wgs84.latitude - lat) < 0.0001, 'Latitude conversion failed');
    assert.ok(Math.abs(wgs84.longitude - lon) < 0.0001, 'Longitude conversion failed');

    // 3. Validation bounds
    assert.throws(() => {
        engine.toMGRS(95, 0);
    }, /Invalid coordinates/, 'Should throw on invalid latitude');

    assert.throws(() => {
        engine.fromMGRS('INVALID_MGRS');
    }, /Failed to parse/, 'Should throw on invalid MGRS string');

    console.log('✅ Coordinate Engine tests passed!');
} catch (err) {
    console.error('❌ Coordinate Engine tests failed:');
    console.error(err);
    process.exit(1);
}
