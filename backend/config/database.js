import 'dotenv/config';
import pkg from 'pg';
const { Pool, types } = pkg;

// Return DATE columns as 'YYYY-MM-DD' strings. By default pg builds a local-midnight Date, which
// serialises to the previous day in UTC for servers east of Greenwich (e.g. 18 Oct -> "...17T22:00Z").
const DATE_OID = 1082;
types.setTypeParser(DATE_OID, (value) => value);

// Hosted databases (Neon, Render, Supabase) provide one connection string, usually with
// ?sslmode=require, which pg applies itself. Locally the separate DB_* variables are used.
const connection = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ai_travel_planner',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    };

const pool = new Pool({
  ...connection,
  // Let short-lived scripts and tests exit once queries finish; a listening server stays alive anyway
  allowExitOnIdle: true
});

// Test database connection
pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

export const query = (text, params) => pool.query(text, params);
export { pool };
export default pool;