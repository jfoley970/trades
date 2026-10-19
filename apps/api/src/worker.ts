// Phase 0 placeholder worker: proves the shared image runs a second entrypoint and can reach Redis/Postgres.
// Later: BullMQ queues (offer timeouts, reminders, push, webhooks).
import { pg, redis } from './deps';

const INTERVAL_MS = 30_000;

async function beat() {
  try {
    await pg.query('select 1');
    await redis.set('worker:heartbeat', new Date().toISOString(), 'EX', 120);
  } catch (e) {
    console.error('[worker] heartbeat failed:', (e as Error).message);
  }
}

console.log('[worker] started (placeholder)');
void beat();
const t = setInterval(() => void beat(), INTERVAL_MS);

function stop() {
  clearInterval(t);
  redis.disconnect();
  void pg.end().finally(() => process.exit(0));
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
