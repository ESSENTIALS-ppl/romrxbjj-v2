import { S } from "./state.ts";
const clone = (v: unknown) => JSON.parse(JSON.stringify(v ?? null));
// deno-lint-ignore no-explicit-any
export default class Stripe {
  key: string;
  // deno-lint-ignore no-explicit-any
  constructor(key: string, _opts?: any) { this.key = key; }
  prices = {
    retrieve: async (id: string) => {
      S().calls.push({ kind: "stripe.prices.retrieve", id });
      const p = S().prices[id];
      if (!p) throw new Error(`No such price: ${id}`);
      return clone(p);
    },
    // deno-lint-ignore no-explicit-any
    list: async (q: any) => { S().calls.push({ kind: "stripe.prices.list", q: clone(q) }); return { data: [] }; },
  };
  checkout = {
    sessions: {
      // deno-lint-ignore no-explicit-any
      create: async (params: any) => {
        S().calls.push({ kind: "stripe.checkout.sessions.create", key: this.key, params: clone(params) });
        const err = S().sessionCreateErrors.shift();
        if (err) throw err;
        return { id: "cs_test_mock_1", url: "https://checkout.stripe.test/cs_test_mock_1" };
      },
    },
  };
  subscriptions = {
    retrieve: async (id: string) => {
      S().calls.push({ kind: "stripe.subscriptions.retrieve", id });
      if (!S().subscription) throw new Error("no subscription mock");
      return clone(S().subscription);
    },
  };
  webhooks = {
    constructEventAsync: async (body: string, _sig: string, _secret: string) => JSON.parse(body),
  };
}
