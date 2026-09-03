const fs = require('fs');
const path = require('path');
const db = require('./index');

async function runMigrations() {
  console.log('Running PostgreSQL database migrations...');
  try {
    const migration1 = fs.readFileSync(
      path.join(__dirname, '../../../database/migrations/001_initial_schema.sql'),
      'utf8'
    );
    await db.query(migration1);
    console.log('✓ Applied 001_initial_schema.sql');

    const migration2 = fs.readFileSync(
      path.join(__dirname, '../../../database/migrations/002_auth_schema.sql'),
      'utf8'
    );
    await db.query(migration2);
    console.log('✓ Applied 002_auth_schema.sql');

    const migration3 = fs.readFileSync(
      path.join(__dirname, '../../../database/migrations/003_org_member_id.sql'),
      'utf8'
    );
    await db.query(migration3);
    console.log('✓ Applied 003_org_member_id.sql');

    console.log('\nMigrations completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();
