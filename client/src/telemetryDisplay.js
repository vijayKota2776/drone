export function formatNumber(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : '--';
}

export function hasPosition(position) {
    return position?.valid !== false && Number.isFinite(position?.latitude) && Number.isFinite(position?.longitude);
}

export function altitudeLabel(position) {
    if (position?.altitudeReference === 'takeoff') return `${formatNumber(position.relativeAltitude)} m above takeoff`;
    const reference = position?.altitudeReference === 'legacy-unspecified' ? 'reference unknown' : 'MSL';
    return `${formatNumber(position?.altitudeMSL)} m (${reference})`;
}

// Pure WGS84 -> MGRS converter (zero external dependency)
const GA = 6378137.0, GF = 1 / 298.257223563, E2 = GF * (2 - GF), EP2 = E2 / (1 - E2), K0 = 0.9996;
const D2R = Math.PI / 180;
const BANDS = "CDEFGHJKLMNPQRSTUVWX";
const E100K = ["ABCDEFGH", "JKLMNPQR", "STUVWXYZ"];
const N100K = "ABCDEFGHJKLMNPQRSTUV";

function utmZone(lat, lon) {
    let z = Math.floor((lon + 180) / 6) + 1;
    if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) z = 32;
    if (lat >= 72 && lat < 84) {
        if (lon >= 0 && lon < 9) z = 31;
        else if (lon >= 9 && lon < 21) z = 33;
        else if (lon >= 21 && lon < 33) z = 35;
        else if (lon >= 33 && lon < 42) z = 37;
    }
    return z;
}

function bandLetter(lat) {
    return lat >= 84 ? "X" : lat < -80 ? "C" : BANDS[Math.floor((lat + 80) / 8)];
}

function meridArc(phi) {
    return GA * ((1 - E2 / 4 - 3 * E2 * E2 / 64 - 5 * E2 * E2 * E2 / 256) * phi
        - (3 * E2 / 8 + 3 * E2 * E2 / 32 + 45 * E2 * E2 * E2 / 1024) * Math.sin(2 * phi)
        + (15 * E2 * E2 / 256 + 45 * E2 * E2 * E2 / 1024) * Math.sin(4 * phi)
        - (35 * E2 * E2 * E2 / 3072) * Math.sin(6 * phi));
}

function latLonToUTM(lat, lon) {
    const zone = utmZone(lat, lon), lon0 = ((zone - 1) * 6 - 180 + 3) * D2R;
    const p = lat * D2R, l = lon * D2R, sp = Math.sin(p), cp = Math.cos(p), tp = Math.tan(p);
    const N = GA / Math.sqrt(1 - E2 * sp * sp), T = tp * tp, C = EP2 * cp * cp, Aa = cp * (l - lon0), M = meridArc(p);
    const A2 = Aa * Aa, A3 = A2 * Aa, A4 = A3 * Aa, A5 = A4 * Aa;
    let e = K0 * N * (Aa + (1 - T + C) * A3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * EP2) * A5 / 120) + 500000;
    let n = K0 * (M + N * tp * (A2 / 2 + (5 - T + 9 * C + 4 * C * C) * A4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * EP2) * A5 * Aa / 720));
    if (lat < 0) n += 10000000;
    return { zone, band: bandLetter(lat), e, n };
}

export function toMGRS(lat, lon, digits = 5) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -80 || lat > 84) return null;
    const u = latLonToUTM(lat, lon);
    const colIdx = Math.floor(u.e / 100000) - 1;
    if (colIdx < 0 || colIdx > 7) return null;
    const colL = E100K[(u.zone - 1) % 3][colIdx];
    let row = Math.floor(u.n / 100000) % 20;
    if (u.zone % 2 === 0) row = (row + 5) % 20;
    const div = Math.pow(10, 5 - digits);
    const e = Math.floor((u.e % 100000) / div);
    const n = Math.floor((u.n % 100000) / div);
    return u.zone + u.band + colL + N100K[row] + String(e).padStart(digits, "0") + String(n).padStart(digits, "0");
}

export function formatMGRS(mgrsStr) {
    if (!mgrsStr || typeof mgrsStr !== 'string') return '--';
    const clean = mgrsStr.replace(/\s+/g, '').toUpperCase();
    const match = clean.match(/^(\d{1,2}[A-Z])([A-Z]{2})(\d+)$/);
    if (!match) return clean;
    const gzd = match[1];
    const sq = match[2];
    const digits = match[3];
    const half = Math.floor(digits.length / 2);
    const easting = digits.slice(0, half);
    const northing = digits.slice(half);
    return `${gzd} ${sq} ${easting} ${northing}`;
}

export function latLonToGR(lat, lon, precision = 5) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -80 || lat > 84) return '--';
    try {
        const raw = toMGRS(lat, lon, precision);
        return raw ? formatMGRS(raw) : '--';
    } catch {
        return '--';
    }
}
