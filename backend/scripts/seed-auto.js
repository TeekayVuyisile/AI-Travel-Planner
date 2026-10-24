// Runs on server start in production: seeds the demo when it is missing, and re-seeds it once it is a
// week old so the sample trip's dates stay in the future and visitors' changes are cleared.
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';

const MAX_AGE_DAYS = 7;

const { rows: [demo] } = await pool.query(
  'SELECT COUNT(*)::int AS users, MIN(created_at) AS seeded_at FROM users WHERE is_demo = TRUE'
);
await pool.end();

const ageDays = demo.users ? (Date.now() - new Date(demo.seeded_at).getTime()) / 86400000 : Infinity;

if (ageDays < MAX_AGE_DAYS) {
  console.log(`Demo data is ${ageDays.toFixed(1)} days old; keeping it`);
} else {
  console.log(demo.users ? 'Demo data is over a week old; re-seeding' : 'No demo data yet; seeding');
  const seedScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seed.js');
  const result = spawnSync(process.execPath, [seedScript], { stdio: 'inherit' });
  // A failed seed should not keep the API from starting
  if (result.status !== 0) console.error('Demo seed failed; starting without fresh demo data');
}
