const mgrs = require('mgrs');

class CoordinateEngine {
    /**
     * Converts WGS84 Latitude and Longitude to MGRS string.
     * @param {number} latitude 
     * @param {number} longitude 
     * @param {number} accuracy - Default is 5 (1 meter precision)
     * @returns {string} MGRS coordinate string
     */
    toMGRS(latitude, longitude, accuracy = 5) {
        if (!this.isValidCoordinate(latitude, longitude)) {
            throw new Error('Invalid coordinates provided.');
        }
        return mgrs.forward([longitude, latitude], accuracy);
    }

    /**
     * Converts MGRS string to WGS84 Latitude and Longitude.
     * @param {string} mgrsString 
     * @returns {object} { latitude, longitude }
     */
    fromMGRS(mgrsString) {
        if (!mgrsString || typeof mgrsString !== 'string') {
            throw new Error('Invalid MGRS string provided.');
        }
        
        try {
            const [longitude, latitude] = mgrs.inverse(mgrsString);
            return { latitude, longitude };
        } catch (err) {
            throw new Error(`Failed to parse MGRS string: ${err.message}`);
        }
    }

    /**
     * Converts WGS84 Latitude and Longitude to a general UTM string.
     * Currently utilizes MGRS conversion internally as they share the grid base.
     * @param {number} latitude 
     * @param {number} longitude 
     * @returns {string} UTM coordinate representation
     */
    toUTM(latitude, longitude) {
        if (!this.isValidCoordinate(latitude, longitude)) {
            throw new Error('Invalid coordinates provided.');
        }
        // mgrs library doesn't expose a direct `toUTM` that returns standard UTM string format.
        // We will calculate UTM zone manually or utilize a dedicated library later if needed.
        // For V1, returning the base MGRS (which contains UTM zone) is acceptable as a proxy, 
        // or we could calculate the Zone.
        
        // Simple zone calculation
        const zoneNumber = Math.floor((longitude + 180) / 6) + 1;
        const latBand = this._getLatBand(latitude);
        
        // This is a naive UTM representation. 
        // For true UTM Easting/Northing, we'd need a more specific UTM projection library like 'utm'.
        // To keep dependencies low for V1, we'll use MGRS as our primary grid and proxy UTM zone.
        return `${zoneNumber}${latBand} (Easting/Northing requires UTM specific library)`;
    }

    /**
     * Converts UTM string back to WGS84.
     */
    fromUTM(utmString) {
        throw new Error('fromUTM requires specific UTM format handling (Easting/Northing). Deferred for V2 unless UTM library is added.');
    }

    /**
     * Placeholder for the Indian Grid Reference System.
     */
    toIndianGrid(latitude, longitude) {
        throw new Error('Not Implemented: Awaiting exact datum and projection specification for Indian Grid.');
    }

    /**
     * Placeholder for the Indian Grid Reference System.
     */
    fromIndianGrid(gridString) {
        throw new Error('Not Implemented: Awaiting exact datum and projection specification for Indian Grid.');
    }

    isValidCoordinate(latitude, longitude) {
        return (
            typeof latitude === 'number' &&
            typeof longitude === 'number' &&
            latitude >= -90 && latitude <= 90 &&
            longitude >= -180 && longitude <= 180
        );
    }

    _getLatBand(latitude) {
        const bands = 'CDEFGHJKLMNPQRSTUVWX';
        const index = Math.floor((latitude + 80) / 8);
        if (index < 0 || index >= bands.length) return 'Z';
        return bands.charAt(index);
    }
}

module.exports = new CoordinateEngine();
