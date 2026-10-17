import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

// Applies backend/migrations/*.sql in name order, each in its own transaction, skipping files already
// recorded in schema_migrations. Used by `npm run migrate` and by the test setup.
export const runMigrations = async (pool, { log = console.log } = {}) => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const applied = new Set(
      (await client.query('SELECT name FROM schema_migrations')).rows.map(r => r.name)
    );
    const files = (await fs.readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log(`Applied ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`${file}: ${error.message}`);
      }
    }
  } finally {
    client.release();
  }
};
