export const TRADES = [
  { id: 'plumbing', label: 'Plumber', detail: 'Leaks, drains, fixtures' },
  { id: 'electrical', label: 'Electrician', detail: 'Outlets, panels, lighting' },
  { id: 'hvac', label: 'HVAC', detail: 'Heat, cooling, airflow' },
] as const;

export type Trade = (typeof TRADES)[number]['id'];

export interface HouseCall {
  id: string;
  trade: Trade;
  description: string;
  address: string;
  contactName: string;
  phone: string;
  state: string;
  createdAt: string;
}

export const LOGIN_MISSING_NOTE =
  'Login is not implemented. This house-call endpoint is an unauthenticated local beta and must stay on the LAN.';

export function tradeLabel(trade: string): string {
  return TRADES.find((item) => item.id === trade)?.label ?? trade;
}

export function stateLabel(state: string): string {
  if (state === 'REQUESTED') return 'Requested';
  return state;
}
