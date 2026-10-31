import type { FastifyInstance } from 'fastify';

/**
 * Expo web runs in a browser, so it needs CORS. The native app does not.
 * `*` is only acceptable while this API stays on the LAN and login is missing.
 * Do not publish the API to the internet with this hook in place.
 */
export function addLanCors(app: FastifyInstance): void {
  app.addHook('onRequest', (req, reply, done) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      reply.code(204).send();
      return;
    }
    done();
  });
}
