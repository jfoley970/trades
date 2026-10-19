import { pg, redis } from './deps';
import { config } from './config';

type Check = { ok: boolean; ms: number; [k: string]: unknown };

async function timed(fn: () => Promise<Record<string, unknown>>): Promise<Check> {
  const t = Date.now();
  try {
    const out = await fn();
    return { ok: true, ms: Date.now() - t, ...out };
  } catch (e) {
    return { ok: false, ms: Date.now() - t, error: (e as Error).message };
  }
}

export async function healthReport() {
  const [postgres, redisCheck, livekit] = await Promise.all([
    timed(async () => {
      const v = await pg.query<{ v: string }>("select current_setting('server_version') as v");
      const ext = await pg.query<{ v: string }>(
        "select extversion as v from pg_extension where extname = 'postgis'",
      );
      if (!ext.rowCount) throw new Error('postgis extension not installed in this database');
      const lib = await pg.query<{ v: string }>('select postgis_lib_version() as v');
      return { version: v.rows[0].v, postgis: ext.rows[0].v, postgisLib: lib.rows[0].v };
    }),
    timed(async () => {
      const pong = await redis.ping();
      const info = await redis.info('server');
      const m = /redis_version:(\S+)/.exec(info);
      return { ping: pong, version: m ? m[1] : 'unknown' };
    }),
    timed(async () => {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 2000);
      try {
        const r = await fetch(config.livekit.apiUrl, { signal: ctl.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return { status: r.status, body: (await r.text()).trim().slice(0, 32) };
      } finally {
        clearTimeout(to);
      }
    }),
  ]);
  // LiveKit is reported but not required for API liveness (calls degrade, dispatch still works)
  const ok = postgres.ok && redisCheck.ok;
  return {
    status: ok ? 'ok' : 'degraded',
    service: 'trades-dispatch-api',
    version: process.env.npm_package_version ?? '0.1.0',
    node: process.version,
    uptimeSec: Math.round(process.uptime()),
    time: new Date().toISOString(),
    checks: { postgres, redis: redisCheck, livekit },
  };
}
