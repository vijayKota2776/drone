const db = require('../index');
const fs = require('fs');
const path = require('path');

function runMigrations() {
    console.log('Running database migrations...');
    const schemaPath = path.join(__dirname, '001_initial_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    try {
        db.exec(schemaSql);
        console.log('Migrations applied successfully.');
    } catch (err) {
        console.error('Error applying migrations:', err);
    }
}

module.exports = runMigrations;

// Run directly if called from command line
if (require.main === module) {
    runMigrations();
}
