import { AccessToken } from 'livekit-server-sdk';
import { config } from './config';

export interface TokenRequest {
  room: string;
  identity: string;
  name?: string;
  ttlSeconds?: number;
  canPublish?: boolean;
}

const NAME_RE = /^[A-Za-z0-9_.:@-]{1,128}$/;

export function validateTokenRequest(b: unknown): TokenRequest {
  if (!b || typeof b !== 'object') throw new Error('JSON body required');
  const o = b as Record<string, unknown>;
  if (typeof o.room !== 'string' || !NAME_RE.test(o.room)) throw new Error('room: 1-128 chars [A-Za-z0-9_.:@-]');
  if (typeof o.identity !== 'string' || !NAME_RE.test(o.identity))
    throw new Error('identity: 1-128 chars [A-Za-z0-9_.:@-]');
  const ttl = o.ttlSeconds === undefined ? 3600 : Number(o.ttlSeconds);
  if (!Number.isFinite(ttl) || ttl < 60 || ttl > 4 * 3600) throw new Error('ttlSeconds: 60-14400');
  return {
    room: o.room,
    identity: o.identity,
    name: typeof o.name === 'string' ? o.name.slice(0, 128) : undefined,
    ttlSeconds: ttl,
    canPublish: o.canPublish === undefined ? true : Boolean(o.canPublish),
  };
}

export async function issueToken(r: TokenRequest) {
  const at = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
    identity: r.identity,
    name: r.name,
    ttl: r.ttlSeconds,
  });
  at.addGrant({
    roomJoin: true,
    room: r.room,
    canPublish: r.canPublish,
    canSubscribe: true,
    canPublishData: true,
  });
  const token = await at.toJwt();
  return {
    token,
    url: config.livekit.clientUrl,
    room: r.room,
    identity: r.identity,
    expiresAt: new Date(Date.now() + (r.ttlSeconds ?? 3600) * 1000).toISOString(),
  };
}
