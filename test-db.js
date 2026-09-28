const runMigrations = require('./database/migrations/runner');
const missionRepo = require('./database/repositories/missionRepository');

console.log('Testing Database Setup...');

// 1. Run migrations
runMigrations();

// 2. Insert test mission
try {
    const testMission = {
        id: 'MISSION-TEST-001',
        name: 'Automated DB Test Mission',
        description: 'Testing the SQLite setup.',
        created_at: Date.now(),
        started_at: null,
        ended_at: null,
        status: 'CREATED'
    };

    missionRepo.createMission(testMission);
    console.log('Successfully inserted test mission.');

    const retrieved = missionRepo.getMission('MISSION-TEST-001');
    if (retrieved && retrieved.name === testMission.name) {
        console.log('Successfully retrieved test mission:', retrieved.name);
    } else {
        console.error('Failed to retrieve test mission.');
    }
} catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
        console.log('Test mission already exists, skipping insertion.');
    } else {
        console.error('Error during DB test:', err);
    }
}
