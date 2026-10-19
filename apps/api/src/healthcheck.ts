// Container HEALTHCHECK.
//  - api (default): HTTP server liveness only (dependency status is in the /health body).
//  - worker (ROLE=worker): heartbeat key in Redis written within the last 120s.
import Redis from 'ioredis';

const fail = () => process.exit(1);
setTimeout(fail, 2500).unref();

if (process.env.ROLE === 'worker') {
  const r = new Redis(process.env.REDIS_URL ?? 'redis://redis:6379', { maxRetriesPerRequest: 1, lazyConnect: true });
  r.connect()
    .then(() => r.exists('worker:heartbeat'))
    .then((n) => process.exit(n === 1 ? 0 : 1))
    .catch(fail);
} else {
  const port = process.env.PORT ?? '3000';
  fetch(`http://127.0.0.1:${port}/`)
    .then((res) => process.exit(res.ok ? 0 : 1))
    .catch(fail);
}
