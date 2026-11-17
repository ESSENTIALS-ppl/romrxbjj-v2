// P1-14 send-push-notification. BUILD ONLY, not deployed.
// Replaces the 2026-10-01 410 stub. Fail-closed x-cron-secret gate (same pattern as
// send-conversion-drip / cron_call_edge). Sends only when WEB_PUSH_SEND is exactly "on".
// No mailbox addresses, no VAPID values, and no subscription endpoints are logged or returned.
// Lock-screen strings are placeholders and need Jim / Stacy wording before WEB_PUSH_SEND is flipped.

export const PUSH_COPY = {
  protocol: { title: "ROMRx", body: "Your protocol session is due." },
  retest: { title: "ROMRx", body: "Your 6-week retest is due." },
  digest: { title: "ROMRx", body: "Your weekly progress is ready." },
  test: { title: "ROMRx", body: "This is a test notification." },
} as const;

export type Kind = keyof typeof PUSH_COPY;

export interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface Candidate {
  userId: string;
  subscriptionId: string | null;
  kind: Kind;
  dedupeKey: string;
  localDate: string; // YYYY-MM-DD
  sub: PushSub;
}

export interface Deps {
  cronCallerOk: (req: Request) => Promise<boolean>;
  webPushSend: string | undefined;
  vapidPublicKey: string | undefined;
  vapidPrivateKey: string | undefined;
  vapidSubject: string | undefined;
  now: () => Date;
  listDue: (kinds: Kind[], now: Date) => Promise<Candidate[]>;
  claim: (userId: string, dedupeKey: string) => Promise<boolean>;
  send: (sub: PushSub, payload: string) => Promise<{ ok: boolean; gone?: boolean }>;
  markSuccess: (subscriptionId: string | null) => Promise<void>;
  markFailure: (subscriptionId: string | null, gone: boolean) => Promise<void>;
}

export function sendEnabled(value: string | undefined): boolean {
  return value === "on";
}

export function vapidSubjectOk(subject: string | undefined): boolean {
  if (!subject) return false;
  return subject.startsWith("mailto:") || subject.startsWith("https:");
}

export function vapidReady(d: Pick<Deps, "vapidPublicKey" | "vapidPrivateKey" | "vapidSubject">): boolean {
  return !!(d.vapidPublicKey && d.vapidPrivateKey && vapidSubjectOk(d.vapidSubject));
}

export function dedupeKey(kind: Kind, localDate: string): string {
  return `${kind}:${localDate}`;
}

export async function handle(req: Request, d: Deps): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  if (!(await d.cronCallerOk(req))) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });

  let kinds: Kind[] = ["protocol", "retest"];
  try {
    const body = await req.json().catch(() => ({})) as { kinds?: unknown };
    if (Array.isArray(body.kinds) && body.kinds.length) {
      const allowed = body.kinds.filter((k): k is Kind => k === "protocol" || k === "retest" || k === "digest" || k === "test");
      if (allowed.length) kinds = allowed;
    }
  } catch {
    // default kinds
  }

  const live = sendEnabled(d.webPushSend);
  if (live && !vapidReady(d)) {
    return new Response(JSON.stringify({ error: "vapid_not_configured", dry_run: false, sent: 0 }), { status: 503, headers: { "Content-Type": "application/json" } });
  }

  const due = await d.listDue(kinds, d.now());
  let claimed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const c of due) {
    const key = c.dedupeKey || dedupeKey(c.kind, c.localDate);
    if (live) {
      const okClaim = await d.claim(c.userId, key);
      if (!okClaim) { skipped += 1; continue; }
      claimed += 1;
      const payload = JSON.stringify(PUSH_COPY[c.kind]);
      const result = await d.send(c.sub, payload);
      if (result.ok) {
        sent += 1;
        await d.markSuccess(c.subscriptionId);
      } else {
        failed += 1;
        await d.markFailure(c.subscriptionId, !!result.gone);
      }
    } else {
      skipped += 1; // counted as dry-run candidates, not claimed
    }
  }

  // Response counts only. No user ids, emails, endpoints, or keys.
  return new Response(JSON.stringify({
    ok: true,
    dry_run: !live,
    due: due.length,
    claimed: live ? claimed : 0,
    sent: live ? sent : 0,
    failed: live ? failed : 0,
    skipped,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}
