import Fastify from 'fastify';
import { config } from './config';
import { pg, redis } from './deps';
import { healthReport } from './health';
import { issueToken, validateTokenRequest } from './livekit';

// Phase 0 skeleton. NOTE: /livekit/token is UNAUTHENTICATED for LAN testing only.
// Before going public it must require an authenticated user and derive room/identity from a job record.
const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' }, trustProxy: true });

app.get('/', async () => ({ service: 'trades-dispatch-api', endpoints: ['GET /health', 'POST /livekit/token'] }));

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
