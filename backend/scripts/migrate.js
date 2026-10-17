import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const migrate = async () => {
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
        console.log(`Applied ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`${file}: ${error.message}`);
      }
    }
    console.log('Migrations up to date');
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch(error => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
