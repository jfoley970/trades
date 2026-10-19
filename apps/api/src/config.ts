function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: req('DATABASE_URL'),
  redisUrl: req('REDIS_URL'),
  livekit: {
    apiKey: req('LIVEKIT_API_KEY'),
    apiSecret: req('LIVEKIT_API_SECRET'),
    // URL handed to mobile/web clients (ws:// on LAN, wss://rtc.<domain> in prod)
    clientUrl: process.env.LIVEKIT_URL ?? '',
    // URL the API uses server-side to reach LiveKit (health check / room service)
    apiUrl: process.env.LIVEKIT_API_URL ?? 'http://livekit:7880',
  },
};
