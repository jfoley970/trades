import type { FastifyInstance } from 'fastify';

/**
 * Local-beta house calls. Login is not implemented, so this resource is
 * unauthenticated and must stay on the LAN (same gap as POST /livekit/token).
 * There is no customer account yet: contactName and phone stand in for one.
 * Video triage and dispatch are later. This only records state REQUESTED.
 */

export const HOUSE_CALL_TRADES = ['plumbing', 'electrical', 'hvac'] as const;
export type Trade = (typeof HOUSE_CALL_TRADES)[number];

export const LOCAL_BETA_AUTH = {
  login: 'missing' as const,
  note: 'Login is not implemented. This house-call endpoint is an unauthenticated local beta and must stay on the LAN.',
};

const LIST_LIMIT = 50;

export interface NewHouseCall {
  trade: Trade;
  description: string;
  address: string;
  contactName: string;
  phone: string;
}

export interface HouseCall extends NewHouseCall {
  id: string;
  state: 'REQUESTED';
  createdAt: string;
}

export interface HouseCallStore {
  list(): Promise<HouseCall[]>;
  create(input: NewHouseCall): Promise<HouseCall>;
}

export interface Sql {
  query(text: string, values?: unknown[]): Promise<{ rows: HouseCallRow[] }>;
}

interface HouseCallRow {
  id: string;
  trade: Trade;
  description: string;
  address: string;
  contact_name: string;
  phone: string;
  state: string;
  created_at: Date | string;
}

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS house_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade text NOT NULL CHECK (trade IN ('plumbing', 'electrical', 'hvac')),
  description text NOT NULL,
  address text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  state text NOT NULL DEFAULT 'REQUESTED',
  created_at timestamptz NOT NULL DEFAULT now()
)`;

const CREATE_INDEX = `
CREATE INDEX IF NOT EXISTS house_calls_created_at_idx ON house_calls (created_at DESC)`;

const LIST_SQL = `
SELECT id, trade, description, address, contact_name, phone, state, created_at
FROM house_calls
ORDER BY created_at DESC
LIMIT ${LIST_LIMIT}`;

const INSERT_SQL = `
INSERT INTO house_calls (trade, description, address, contact_name, phone)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, trade, description, address, contact_name, phone, state, created_at`;

function asRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('JSON body required');
  return body as Record<string, unknown>;
}

function requiredText(value: unknown, message: string): string {
  if (typeof value !== 'string') throw new Error(message);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(message);
  return trimmed;
}

export function validateHouseCall(body: unknown): NewHouseCall {
  const record = asRecord(body);
  const trade = record.trade;
  if (typeof trade !== 'string' || !(HOUSE_CALL_TRADES as readonly string[]).includes(trade)) {
    throw new Error('Choose plumber, electrician, or HVAC.');
  }
  const description = requiredText(record.description, 'Describe the problem in at least 10 characters.');
  if (description.length < 10) throw new Error('Describe the problem in at least 10 characters.');
  if (description.length > 2000) throw new Error('Keep the description under 2000 characters.');
  const address = requiredText(record.address, 'Enter the street address.');
  if (address.length < 5) throw new Error('Enter the street address.');
  if (address.length > 200) throw new Error('Keep the address under 200 characters.');
  const contactName = requiredText(record.contactName, 'Enter a name.');
  if (contactName.length > 80) throw new Error('Keep the name under 80 characters.');
  const phone = requiredText(record.phone, 'Enter a phone number with at least 10 digits.');
  if (phone.length > 40) throw new Error('Enter a phone number with at least 10 digits.');
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Enter a phone number with at least 10 digits.');
  }
  return { trade: trade as Trade, description, address, contactName, phone };
}

function mapRow(row: HouseCallRow): HouseCall {
  const created = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
  return {
    id: row.id,
    trade: row.trade,
    description: row.description,
    address: row.address,
    contactName: row.contact_name,
    phone: row.phone,
    state: 'REQUESTED',
    createdAt: created.toISOString(),
  };
}

export function createMemoryHouseCallStore(): HouseCallStore {
  const houseCalls: HouseCall[] = [];
  return {
    async list() {
      return houseCalls
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, LIST_LIMIT);
    },
    async create(input) {
      const houseCall: HouseCall = {
        id: crypto.randomUUID(),
        ...input,
        state: 'REQUESTED',
        createdAt: new Date().toISOString(),
      };
      houseCalls.push(houseCall);
      return houseCall;
    },
  };
}

export function createPgHouseCallStore(db: Sql): HouseCallStore {
  let schema: Promise<void> | null = null;
  const ready = (): Promise<void> => {
    schema ??= (async () => {
      try {
        await db.query(CREATE_TABLE);
        await db.query(CREATE_INDEX);
      } catch (err) {
        schema = null;
        throw err;
      }
    })();
    return schema;
  };

  return {
    async list() {
      await ready();
      const result = await db.query(LIST_SQL);
      return result.rows.map(mapRow);
    },
    async create(input) {
      await ready();
      const result = await db.query(INSERT_SQL, [
        input.trade,
        input.description,
        input.address,
        input.contactName,
        input.phone,
      ]);
      const row = result.rows[0];
      if (!row) throw new Error('insert returned no row');
      return mapRow(row);
    },
  };
}

export function registerHouseCallRoutes(app: FastifyInstance, store: HouseCallStore): void {
  app.get('/house-calls', async (req, reply) => {
    try {
      const houseCalls = await store.list();
      return { houseCalls, auth: LOCAL_BETA_AUTH };
    } catch (err) {
      req.log.error({ err }, 'house call list failed');
      reply.code(503);
      return { error: 'Could not load house calls.' };
    }
  });

  app.post('/house-calls', async (req, reply) => {
    let input: NewHouseCall;
    try {
      input = validateHouseCall(req.body);
    } catch (err) {
      reply.code(400);
      return { error: (err as Error).message };
    }
    try {
      const houseCall = await store.create(input);
      reply.code(201);
      return { houseCall, auth: LOCAL_BETA_AUTH };
    } catch (err) {
      req.log.error({ err }, 'house call create failed');
      reply.code(503);
      return { error: 'Could not save the house call.' };
    }
  });
}
