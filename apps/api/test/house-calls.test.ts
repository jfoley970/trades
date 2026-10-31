import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { addLanCors } from '../src/cors';
import {
  createMemoryHouseCallStore,
  createPgHouseCallStore,
  LOCAL_BETA_AUTH,
  registerHouseCallRoutes,
  validateHouseCall,
  type Sql,
} from '../src/house-calls';

const validBody = {
  trade: 'plumbing',
  description: 'The kitchen sink is leaking under the cabinet.',
  address: '10 River Rd, Edwards, CO',
  contactName: 'Ada Lovelace',
  phone: '(970) 555-0100',
};

async function appWith(store = createMemoryHouseCallStore()) {
  const app = Fastify({ logger: false });
  addLanCors(app);
  registerHouseCallRoutes(app, store);
  await app.ready();
  return app;
}

test('validateHouseCall accepts a plumber, electrician, or HVAC request', () => {
  const plumbing = validateHouseCall(validBody);
  assert.equal(plumbing.trade, 'plumbing');
  assert.equal(plumbing.phone, '(970) 555-0100');
  assert.equal(validateHouseCall({ ...validBody, trade: 'electrical' }).trade, 'electrical');
  assert.equal(validateHouseCall({ ...validBody, trade: 'hvac' }).trade, 'hvac');
});

test('validateHouseCall rejects a trade outside the three licensed trades', () => {
  assert.throws(() => validateHouseCall({ ...validBody, trade: 'handyman' }), /plumber, electrician, or HVAC/);
});

test('validateHouseCall rejects a short description, a short address, and a short phone', () => {
  assert.throws(() => validateHouseCall({ ...validBody, description: 'leak' }), /10 characters/);
  assert.throws(() => validateHouseCall({ ...validBody, address: 'x' }), /street address/);
  assert.throws(() => validateHouseCall({ ...validBody, phone: '555' }), /10 digits/);
  assert.throws(() => validateHouseCall(null), /JSON body required/);
});

test('GET /house-calls is an empty list and says login is missing', async () => {
  const app = await appWith();
  const res = await app.inject({ method: 'GET', url: '/house-calls' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['access-control-allow-origin'], '*');
  assert.deepEqual(res.json(), { houseCalls: [], auth: LOCAL_BETA_AUTH });
  assert.equal(res.json().auth.login, 'missing');
  await app.close();
});

test('POST /house-calls stores a request and lists the newest first', async () => {
  const app = await appWith();
  const created = await app.inject({ method: 'POST', url: '/house-calls', payload: validBody });
  assert.equal(created.statusCode, 201);
  const body = created.json();
  assert.equal(body.auth.login, 'missing');
  assert.equal(body.houseCall.trade, 'plumbing');
  assert.equal(body.houseCall.state, 'REQUESTED');
  assert.equal(body.houseCall.contactName, 'Ada Lovelace');
  assert.match(body.houseCall.id, /^[0-9a-f-]{36}$/);

  const second = await app.inject({
    method: 'POST',
    url: '/house-calls',
    payload: { ...validBody, trade: 'hvac', description: 'No heat in the hallway overnight.' },
  });
  assert.equal(second.statusCode, 201);

  const list = await app.inject({ method: 'GET', url: '/house-calls' });
  const houseCalls = list.json().houseCalls;
  assert.equal(houseCalls.length, 2);
  assert.equal(houseCalls[0].trade, 'hvac');
  assert.equal(houseCalls[1].id, body.houseCall.id);
  await app.close();
});

test('POST /house-calls returns 400 for an invalid body', async () => {
  const app = await appWith();
  const res = await app.inject({
    method: 'POST',
    url: '/house-calls',
    payload: { ...validBody, trade: 'handyman' },
  });
  assert.equal(res.statusCode, 400);
  assert.match(res.json().error, /plumber, electrician, or HVAC/);
  const list = await app.inject({ method: 'GET', url: '/house-calls' });
  assert.equal(list.json().houseCalls.length, 0);
  await app.close();
});

test('OPTIONS /house-calls answers the browser preflight', async () => {
  const app = await appWith();
  const res = await app.inject({ method: 'OPTIONS', url: '/house-calls' });
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['access-control-allow-origin'], '*');
  assert.match(String(res.headers['access-control-allow-methods']), /POST/);
  await app.close();
});

test('postgres store parameterizes the insert and maps the row', async () => {
  const calls: { text: string; values?: unknown[] }[] = [];
  const db: Sql = {
    async query(text, values) {
      calls.push({ text, values });
      if (text.includes('INSERT INTO')) {
        return {
          rows: [
            {
              id: '00000000-0000-4000-8000-000000000001',
              trade: 'hvac',
              description: 'No heat in the hallway overnight.',
              address: '10 River Rd, Edwards, CO',
              contact_name: 'Ada Lovelace',
              phone: '970-555-0100',
              state: 'REQUESTED',
              created_at: new Date('2026-10-31T12:00:00.000Z'),
            },
          ],
        };
      }
      return { rows: [] };
    },
  };
  const store = createPgHouseCallStore(db);
  const created = await store.create({
    trade: 'hvac',
    description: 'No heat in the hallway overnight.',
    address: '10 River Rd, Edwards, CO',
    contactName: 'Ada Lovelace',
    phone: '970-555-0100',
  });
  assert.equal(created.contactName, 'Ada Lovelace');
  assert.equal(created.state, 'REQUESTED');
  assert.equal(created.createdAt, '2026-10-31T12:00:00.000Z');
  const insert = calls.find((call) => call.text.includes('INSERT INTO'));
  assert.ok(insert);
  assert.deepEqual(insert?.values, [
    'hvac',
    'No heat in the hallway overnight.',
    '10 River Rd, Edwards, CO',
    'Ada Lovelace',
    '970-555-0100',
  ]);
  assert.doesNotMatch(insert?.text ?? '', /Ada Lovelace/);
  assert.ok(calls.some((call) => call.text.includes('CREATE TABLE')));
});
