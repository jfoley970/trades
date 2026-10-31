import Fastify from 'fastify';
import { config } from './config';
import { addLanCors } from './cors';
import { pg, redis } from './deps';
import { healthReport } from './health';
import {
  createMemoryHouseCallStore,
  createPgHouseCallStore,
  registerHouseCallRoutes,
} from './house-calls';
import { issueToken, validateTokenRequest } from './livekit';

// Phase 0 skeleton.
// /livekit/token and /house-calls are UNAUTHENTICATED. Login is not implemented.
// Keep this API on the LAN. Do not expose it to the public internet.
// Before going public, /livekit/token must require an authenticated user and derive room/identity from a job record.
const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' }, trustProxy: true });

addLanCors(app);

const memoryStore = process.env.HOUSE_CALLS_STORE === 'memory';
if (memoryStore) {
  app.log.warn('HOUSE_CALLS_STORE=memory: house calls are not saved in Postgres. Local UI testing only.');
}
registerHouseCallRoutes(
  app,
  memoryStore
    ? createMemoryHouseCallStore()
    : createPgHouseCallStore({
        query: (text, values) => pg.query(text, values),
      }),
);

app.get('/', async () => ({
  service: 'trades-dispatch-api',
  login: 'missing',
  endpoints: ['GET /health', 'GET /house-calls', 'POST /house-calls', 'POST /livekit/token'],
}));

app.get('/health', async (_req, reply) => {
  const report = await healthReport();
  reply.code(report.status === 'ok' ? 200 : 503);
  return report;
});

app.post('/livekit/token', async (req, reply) => {
  let body;
  try {
    body = validateTokenRequest(req.body);
  } catch (e) {
    reply.code(400);
    return { error: (e as Error).message };
  }
  return issueToken(body);
});

async function shutdown(sig: string) {
  app.log.info({ sig }, 'shutting down');
  await app.close();
  await pg.end().catch(() => undefined);
  redis.disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

app.listen({ port: config.port, host: config.host }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
