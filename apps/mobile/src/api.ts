import { LOGIN_MISSING_NOTE, type HouseCall, type Trade } from './types';

const DEFAULT_API = 'http://10.225.30.31/api';

export interface HouseCallList {
  houseCalls: HouseCall[];
  authNote: string;
}

export function apiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API;
  return configured.replace(/\/$/, '');
}

function authNoteFrom(body: unknown): string {
  if (!body || typeof body !== 'object') return LOGIN_MISSING_NOTE;
  const note = (body as { auth?: { note?: unknown } }).auth?.note;
  return typeof note === 'string' && note.trim() ? note : LOGIN_MISSING_NOTE;
}

function isTrade(value: unknown): value is Trade {
  return value === 'plumbing' || value === 'electrical' || value === 'hvac';
}

function isHouseCall(value: unknown): value is HouseCall {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    isTrade(row.trade) &&
    typeof row.description === 'string' &&
    typeof row.address === 'string' &&
    typeof row.contactName === 'string' &&
    typeof row.phone === 'string' &&
    typeof row.state === 'string' &&
    typeof row.createdAt === 'string'
  );
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The dispatch API took too long to respond. Check the LAN connection.');
    }
    throw new Error('Could not reach the dispatch API. Stay on the LAN and check that the API is running.');
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error('The dispatch API returned something that was not JSON.');
    }
  }
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `The dispatch API returned ${response.status}.`;
    throw new Error(message);
  }
  return body;
}

export async function listHouseCalls(): Promise<HouseCallList> {
  const body = await request('/house-calls');
  const rows = body && typeof body === 'object' ? (body as { houseCalls?: unknown }).houseCalls : undefined;
  if (!Array.isArray(rows) || rows.some((row) => !isHouseCall(row))) {
    throw new Error('The dispatch API returned an unexpected house-call list.');
  }
  return { houseCalls: rows, authNote: authNoteFrom(body) };
}

export async function createHouseCall(input: {
  trade: Trade;
  description: string;
  address: string;
  contactName: string;
  phone: string;
}): Promise<HouseCall> {
  const body = await request('/house-calls', {
    method: 'POST',
    body: JSON.stringify({
      trade: input.trade,
      description: input.description.trim(),
      address: input.address.trim(),
      contactName: input.contactName.trim(),
      phone: input.phone.trim(),
    }),
  });
  const houseCall = body && typeof body === 'object' ? (body as { houseCall?: unknown }).houseCall : undefined;
  if (!isHouseCall(houseCall)) throw new Error('The dispatch API returned an unexpected house call.');
  return houseCall;
}
