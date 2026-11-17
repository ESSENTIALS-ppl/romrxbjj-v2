import { assertEquals, assertFalse, assertStringIncludes } from "jsr:@std/assert@1";
import { dedupeKey, handle, sendEnabled, vapidReady, vapidSubjectOk, type Candidate, type Deps, type PushSub } from "./handler.ts";

const FAKE_SUB: PushSub = { endpoint: "https://example.com/push/device-1", p256dh: "B" + "x".repeat(40), auth: "a".repeat(16) };

function cand(over: Partial<Candidate> = {}): Candidate {
  return { userId: "00000000-0000-4000-8000-000000000001", subscriptionId: "sub-1", kind: "protocol", dedupeKey: "protocol:2026-11-16", localDate: "2026-11-16", sub: FAKE_SUB, timezone: "America/New_York", isTest: false, ...over };
}

function base(over: Partial<Deps> = {}): Deps {
  const sends: unknown[] = [];
  const claims = new Set<string>();
  return {
    cronCallerOk: async () => true,
    webPushSend: undefined,
    vapidPublicKey: "pub-not-a-real-key",
    vapidPrivateKey: "priv-not-a-real-key",
    vapidSubject: "mailto:hello@romrx.io",
    now: () => new Date("2026-11-16T14:45:00-05:00"),
    listDue: async () => [cand()],
    claim: async (userId, key) => {
      const k = `${userId}:${key}`;
      if (claims.has(k)) return false;
      claims.add(k);
      return true;
    },
    send: async (sub, payload) => {
      sends.push({ endpoint: sub.endpoint, payload });
      return { ok: true };
    },
    markSuccess: async () => {},
    markFailure: async () => {},
    clearDead: async () => {},
    releaseClaim: async () => {},
    ...over,
    // expose for assertions
    _sends: sends,
    _claims: claims,
  } as Deps & { _sends: unknown[]; _claims: Set<string> };
}

function req(opts: { secret?: string; body?: unknown; method?: string } = {}): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (opts.secret !== undefined) headers.set("x-cron-secret", opts.secret);
  return new Request("https://example.com/functions/v1/send-push-notification", {
    method: opts.method ?? "POST",
    headers,
    body: opts.method === "GET" ? undefined : JSON.stringify(opts.body ?? {}),
  });
}

async function json(r: Response): Promise<Record<string, unknown>> {
  return await r.json() as Record<string, unknown>;
}

Deno.test("sendEnabled is exact-string on only", () => {
  assertEquals(sendEnabled("on"), true);
  assertEquals(sendEnabled("ON"), false);
  assertEquals(sendEnabled("true"), false);
  assertEquals(sendEnabled(""), false);
  assertEquals(sendEnabled(undefined), false);
});

Deno.test("vapidSubjectOk allows only mailto: or https:", () => {
  assertEquals(vapidSubjectOk("mailto:hello@romrx.io"), true);
  assertEquals(vapidSubjectOk("https://romrx.io"), true);
  assertEquals(vapidSubjectOk("http://romrx.io"), false);
  assertEquals(vapidSubjectOk(""), false);
  assertEquals(vapidSubjectOk(undefined), false);
});

Deno.test("vapidReady requires both keys and a valid subject", () => {
  assertEquals(vapidReady({ vapidPublicKey: "p", vapidPrivateKey: "s", vapidSubject: "mailto:hello@romrx.io" }), true);
  assertEquals(vapidReady({ vapidPublicKey: "p", vapidPrivateKey: "s", vapidSubject: "not-a-uri" }), false);
  assertEquals(vapidReady({ vapidPublicKey: "p", vapidPrivateKey: undefined, vapidSubject: "https://romrx.io" }), false);
});

Deno.test("OPTIONS is 204", async () => {
  const r = await handle(new Request("https://example.com/", { method: "OPTIONS" }), base());
  assertEquals(r.status, 204);
});

Deno.test("GET is 405", async () => {
  const r = await handle(req({ method: "GET" }), base());
  assertEquals(r.status, 405);
});

Deno.test("fail-closed: missing cron secret is 403, no send", async () => {
  let sent = 0;
  const d = base({ cronCallerOk: async () => false, webPushSend: "on", send: async () => { sent += 1; return { ok: true }; } });
  const r = await handle(req({}), d);
  assertEquals(r.status, 403);
  assertEquals(sent, 0);
  const body = await json(r);
  assertEquals(body.error, "forbidden");
  assertEquals("due" in body, false);
});

Deno.test("fail-closed: short or rejected secret is 403", async () => {
  const d = base({ cronCallerOk: async () => false, webPushSend: "on" });
  const r = await handle(req({ secret: "too-short" }), d);
  assertEquals(r.status, 403);
});

Deno.test("dry-run when WEB_PUSH_SEND is unset: 200, counts due, never claims or sends", async () => {
  let claimed = 0;
  let sent = 0;
  const d = base({
    webPushSend: undefined,
    claim: async () => { claimed += 1; return true; },
    send: async () => { sent += 1; return { ok: true }; },
  });
  const r = await handle(req({ secret: "x".repeat(32) }), d);
  assertEquals(r.status, 200);
  const body = await json(r);
  assertEquals(body.ok, true);
  assertEquals(body.dry_run, true);
  assertEquals(body.due, 1);
  assertEquals(body.sent, 0);
  assertEquals(body.claimed, 0);
  assertEquals(body.skipped, 1);
  assertEquals(claimed, 0);
  assertEquals(sent, 0);
  const text = JSON.stringify(body);
  assertEquals(text.includes("example.com"), false);
  assertEquals(text.includes("@"), false);
  assertEquals(text.includes("00000000"), false);
});

Deno.test("dry-run when WEB_PUSH_SEND is 'true' or 'ON', not exact on", async () => {
  for (const v of ["true", "ON", "1", "yes"]) {
    let sent = 0;
    const r = await handle(req(), base({ webPushSend: v, send: async () => { sent += 1; return { ok: true }; } }));
    assertEquals(r.status, 200);
    const body = await json(r);
    assertEquals(body.dry_run, true);
    assertEquals(body.sent, 0);
    assertEquals(sent, 0);
  }
});

Deno.test("WEB_PUSH_SEND=on without VAPID is 503 and does not send", async () => {
  let sent = 0;
  const r = await handle(req(), base({
    webPushSend: "on",
    vapidPrivateKey: undefined,
    send: async () => { sent += 1; return { ok: true }; },
  }));
  assertEquals(r.status, 503);
  const body = await json(r);
  assertEquals(body.error, "vapid_not_configured");
  assertEquals(body.sent, 0);
  assertEquals(sent, 0);
});

Deno.test("WEB_PUSH_SEND=on claims then sends, no secrets or endpoints in body", async () => {
  let sent = 0;
  let success = 0;
  const r = await handle(req(), base({
    webPushSend: "on",
    send: async () => { sent += 1; return { ok: true }; },
    markSuccess: async () => { success += 1; },
  }));
  assertEquals(r.status, 200);
  const body = await json(r);
  assertEquals(body.dry_run, false);
  assertEquals(body.due, 1);
  assertEquals(body.claimed, 1);
  assertEquals(body.sent, 1);
  assertEquals(body.failed, 0);
  assertEquals(sent, 1);
  assertEquals(success, 1);
  const text = JSON.stringify(body);
  assertFalse(text.includes("pub-not-a-real-key"));
  assertFalse(text.includes("priv-not-a-real-key"));
  assertFalse(text.includes("example.com"));
  assertFalse(text.includes("hello@"));
});

Deno.test("duplicate claim is skipped, second call does not send", async () => {
  const claims = new Set<string>();
  let sent = 0;
  const d = base({
    webPushSend: "on",
    claim: async (userId, key) => {
      const k = `${userId}:${key}`;
      if (claims.has(k)) return false;
      claims.add(k);
      return true;
    },
    send: async () => { sent += 1; return { ok: true }; },
  });
  const a = await json(await handle(req(), d));
  const b = await json(await handle(req(), d));
  assertEquals(a.sent, 1);
  assertEquals(b.sent, 0);
  assertEquals(b.skipped, 1);
  assertEquals(sent, 1);
});

Deno.test("non-gone send failure marks failure and increments failed, claim stands", async () => {
  let marked = 0;
  let cleared = 0;
  let released = 0;
  const r = await handle(req(), base({
    webPushSend: "on",
    send: async () => ({ ok: false }),
    markFailure: async () => { marked += 1; },
    clearDead: async () => { cleared += 1; },
    releaseClaim: async () => { released += 1; },
  }));
  const body = await json(r);
  assertEquals(body.sent, 0);
  assertEquals(body.failed, 1);
  assertEquals(body.cleared, 0);
  assertEquals(body.claimed, 1);
  assertEquals([marked, cleared, released], [1, 0, 0]);
});

Deno.test("410/404 clears the dead subscription, is not the day's send, and does not increment failed", async () => {
  let cleared = 0;
  let released = 0;
  let marked = 0;
  let clearArgs: unknown[] = [];
  const r = await handle(req(), base({
    webPushSend: "on",
    send: async () => ({ ok: false, gone: true }),
    markFailure: async () => { marked += 1; },
    clearDead: async (userId, subscriptionId, endpoint) => { cleared += 1; clearArgs = [userId, subscriptionId, endpoint]; },
    releaseClaim: async () => { released += 1; },
  }));
  const body = await json(r);
  assertEquals(body.sent, 0);
  assertEquals(body.failed, 0);
  assertEquals(body.cleared, 1);
  assertEquals(body.claimed, 0);
  assertEquals(body.would_clear, 0);
  assertEquals([cleared, released, marked], [1, 1, 0]);
  assertEquals(clearArgs, ["00000000-0000-4000-8000-000000000001", "sub-1", FAKE_SUB.endpoint]);
});

Deno.test("dedupeKey is kind:localDate, no mailbox form", () => {
  assertEquals(dedupeKey("retest", "2026-11-16"), "retest:2026-11-16");
  assertFalse(dedupeKey("protocol", "2026-11-16").includes("@"));
});

Deno.test("response never echoes candidate payloads", async () => {
  const r = await handle(req(), base({ webPushSend: undefined, listDue: async () => [cand({ userId: "user@example.com" as unknown as string })] }));
  const text = await r.text();
  assertEquals(text.includes("user@example.com"), false);
  assertEquals(text.includes("https://"), false);
  assertStringIncludes(text, '"dry_run":true');
});
