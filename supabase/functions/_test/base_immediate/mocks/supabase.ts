import { S, Rec } from "./state.ts";
const clone = (v: unknown) => JSON.parse(JSON.stringify(v ?? null));
class Q {
  table: string; ops: Rec[] = []; mode = "select";
  constructor(table: string) { this.table = table; }
  private rec(op: string, args: unknown[]) { this.ops.push({ op, args: clone(args) }); return this; }
  select(...a: unknown[]) { return this.rec("select", a); }
  eq(...a: unknown[]) { return this.rec("eq", a); }
  neq(...a: unknown[]) { return this.rec("neq", a); }
  in(...a: unknown[]) { return this.rec("in", a); }
  order(...a: unknown[]) { return this.rec("order", a); }
  limit(...a: unknown[]) { return this.rec("limit", a); }
  update(...a: unknown[]) { this.mode = "update"; return this.rec("update", a); }
  insert(...a: unknown[]) { this.mode = "insert"; return this.rec("insert", a); }
  upsert(...a: unknown[]) { this.mode = "upsert"; return this.rec("upsert", a); }
  delete(...a: unknown[]) { this.mode = "delete"; return this.rec("delete", a); }
  private done(single: boolean) {
    S().calls.push({ kind: "db", table: this.table, ops: this.ops, single });
    if (single) return { data: clone(S().tables[this.table] ?? null), error: null };
    if (this.mode === "upsert" && this.ops.some((o) => o.op === "select")) {
      const row = (this.ops.find((o) => o.op === "upsert")!.args as Rec[])[0];
      return { data: S().upsertSelectRows ?? [{ stripe_checkout_session_id: row.stripe_checkout_session_id }], error: null };
    }
    return { data: this.mode === "select" ? [] : null, error: null };
  }
  maybeSingle() { return Promise.resolve(this.done(true)); }
  single() { return Promise.resolve(this.done(true)); }
  // deno-lint-ignore no-explicit-any
  then(res: any, rej: any) { return Promise.resolve(this.done(false)).then(res, rej); }
}
// deno-lint-ignore no-explicit-any
export function createClient(_url: string, _key: string, _opts?: any) {
  return {
    auth: {
      getUser: async (jwt: string) => {
        S().calls.push({ kind: "auth.getUser" });
        const u = S().users[jwt];
        return { data: { user: u ? { id: u.id, email: u.email } : null }, error: null };
      },
    },
    rpc: async (name: string, args?: unknown) => {
      S().calls.push({ kind: "rpc", name, args: clone(args) });
      if (name === "is_test_account") return { data: false, error: null };
      if (name === "rate_limit_hit") return { data: { allowed: true }, error: null };
      if (name === "get_my_profile") return { data: { profile: { base_status: "active" } }, error: null };
      return { data: null, error: null };
    },
    from: (table: string) => new Q(table),
  };
}
