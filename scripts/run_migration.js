/*
Run this script to apply SQL migrations from the `migrations/` folder.
Usage:
  1. Install dependencies: `npm install pg dotenv`
  2. Create a `.env` with DATABASE_URL (your Postgres connection string), or set env var.
  3. Run: `node scripts/run_migration.js migrations/001_add_movements_columns.sql`

This script uses the `pg` package and executes the SQL file contents.
*/

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runMigration(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    console.error('Migration file not found:', abs);
    process.exit(1);
  }

  const sql = fs.readFileSync(abs, 'utf8');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Set DATABASE_URL in environment or .env file');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to database. Running migration:', abs);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

const arg = process.argv[2] || 'migrations/001_add_movements_columns.sql';
runMigration(arg).catch(err => { console.error(err); process.exit(1); });
