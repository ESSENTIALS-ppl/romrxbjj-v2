// Shared mock state. Every mock records what the code under test asked for, in order.
// deno-lint-ignore no-explicit-any
export type Rec = Record<string, any>;
export interface MockState {
  calls: Rec[];             // ordered log of every external call (Stripe, Supabase, Resend, events)
  prices: Record<string, Rec>;
  users: Record<string, { id: string; email: string }>; // jwt -> user
  sessionCreateErrors: Error[]; // thrown (in order) by checkout.sessions.create
  subscription: Rec | null;
  tables: Record<string, Rec | null>; // maybeSingle() result per table
  upsertSelectRows: Rec[] | null;
  resendOk: boolean;
}
export function freshState(): MockState {
  return {
    calls: [],
    prices: {
      price_1TpvnqDou9Iktbw0GMayhIQ7: { id: "price_1TpvnqDou9Iktbw0GMayhIQ7", active: true, currency: "usd", unit_amount: 6000, recurring: { interval: "year", interval_count: 1 } },
      price_1TpvpxDou9Iktbw0hDQOEDwy: { id: "price_1TpvpxDou9Iktbw0hDQOEDwy", active: true, currency: "usd", unit_amount: 14900, recurring: { interval: "year", interval_count: 1 } },
      price_1TpvriDou9Iktbw0oiHxtLfB: { id: "price_1TpvriDou9Iktbw0oiHxtLfB", active: true, currency: "usd", unit_amount: 14900, recurring: { interval: "year", interval_count: 1 } },
    },
    users: { "jwt-u1": { id: "00000000-0000-4000-8000-000000000001", email: "user@example.com" } },
    sessionCreateErrors: [],
    subscription: null,
    tables: {},
    upsertSelectRows: null,
    resendOk: true,
  };
}
// deno-lint-ignore no-explicit-any
const g = globalThis as any;
export function S(): MockState {
  if (!g.__BIC_MOCK) g.__BIC_MOCK = freshState();
  return g.__BIC_MOCK as MockState;
}
export function reset(): MockState { g.__BIC_MOCK = freshState(); return g.__BIC_MOCK; }
