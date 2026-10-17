import { pool } from '../config/database.js';
import { runMigrations } from '../config/migrations.js';

runMigrations(pool)
  .then(() => console.log('Migrations up to date'))
  .catch(error => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
