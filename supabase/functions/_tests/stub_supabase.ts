// test stub for jsr:@supabase/supabase-js@2: no network, every query succeeds, webhook secret check passes.
// Tests can set globalThis.__stub = { user, row } to control auth.getUser() and what .single()/.maybeSingle() return.
// deno-lint-ignore-file no-explicit-any
const g = globalThis as any;
const q: any = new Proxy(function () {}, {
  get: (_t, prop) => {
    if (prop === "then") return (r: (v: unknown) => void) => r({ data: g.__stub?.row ?? null, error: null });
    if (prop === "single" || prop === "maybeSingle") return () => Promise.resolve({ data: g.__stub?.row ?? null, error: null });
    return q;
  },
  apply: () => q,
});
export function createClient(_url: string, _key: string, _opts?: unknown): any {
  return {
    from: () => q,
    rpc: async () => ({ data: true, error: null }),
    auth: { getUser: async () => ({ data: { user: g.__stub?.user ?? null }, error: null }) },
  };
}
export type SupabaseClient = any;
