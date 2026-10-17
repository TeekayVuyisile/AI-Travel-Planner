// Loaded with `node --test --import ./tests/setup.js`, so it runs before each test file's own imports.
// Points the app at a separate test database, migrates it and empties it, and blanks the external
// API keys so the services use their offline fallbacks (fast, and no network needed).
import dotenv from 'dotenv';
import pg from 'pg';

process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'ai_travel_planner_test';
process.env.JWT_SECRET ||= 'test-secret';
process.env.JWT_EXPIRES_IN ||= '1h';
// DATABASE_URL is blanked too, so tests can never reach a hosted database
for (const key of ['GROQ_API_KEY', 'OPENWEATHER_API_KEY', 'OPENTRIPMAP_API_KEY', 'DATABASE_URL']) {
  process.env[key] = '';
}
// Fills in DB_HOST, DB_USER and DB_PASSWORD from .env when present. dotenv never overrides
// variables that are already set, so the values above win.
dotenv.config({ quiet: true });

const connection = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
};

// Create the test database on first run
const admin = new pg.Client({ ...connection, database: 'postgres' });
await admin.connect();
const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [process.env.DB_NAME]);
if (rowCount === 0) {
  await admin.query(`CREATE DATABASE "${process.env.DB_NAME.replace(/"/g, '')}"`);
}
await admin.end();

const { pool } = await import('../config/database.js');
const { runMigrations } = await import('../config/migrations.js');
await runMigrations(pool, { log: () => {} });

// Every test file starts from empty tables (files run one at a time, see package.json)
const { rows } = await pool.query(
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations'"
);
await pool.query(`TRUNCATE ${rows.map(r => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
