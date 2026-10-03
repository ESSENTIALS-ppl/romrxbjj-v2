// test stub for jsr:@supabase/supabase-js@2: no network, every query succeeds, webhook secret check passes.
// deno-lint-ignore-file no-explicit-any
const q: any = new Proxy(function () {}, {
  get: (_t, prop) => (prop === "then" ? (r: (v: unknown) => void) => r({ data: null, error: null }) : q),
  apply: () => q,
});
export function createClient(_url: string, _key: string, _opts?: unknown): any {
  return { from: () => q, rpc: async () => ({ data: true, error: null }), auth: { getUser: async () => ({ data: { user: null }, error: null }) } };
}
export type SupabaseClient = any;
