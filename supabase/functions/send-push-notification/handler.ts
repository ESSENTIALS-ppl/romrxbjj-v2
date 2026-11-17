// P1-14 send-push-notification. BUILD ONLY, not deployed.
// Replaces the 2026-10-01 410 stub. Fail-closed x-cron-secret gate (same pattern as
// send-conversion-drip / cron_call_edge). Sends only when WEB_PUSH_SEND is exactly "on".
// No mailbox addresses, no VAPID values, and no subscription endpoints are logged or returned.
// r2: lock-screen copy is Stacy 219378b5 section A (with Kai 481a2e9d for the CLEAR digest line), extracted by
// script; see push_copy.cleared.json. Jim's wording yes is still needed before WEB_PUSH_SEND is flipped.
// r3: quiet hours apply to system nudges only (retest, digest, test). A user's own chosen protocol
// reminder time is exempt and sends even inside 21:00-08:00 local. On 404/410, clear that user's
// dead subscription (table row and/or matching legacy jsonb) and release the day's claim so it is
// not counted as the day's send. Dry-run reports would_clear and writes nothing.
// W2 (fix/p1-14-w2-device-move-backup-20261116): the legacy notification_preferences fallback is used
// only when no push_subscriptions row for that endpoint belongs to a different user. Otherwise the
// fallback is skipped with a reason code. If the owner lookup fails, every fallback is skipped.

export const PUSH_COPY = {
  protocol: { title: "ROMRx Base", body: "Time for today's session. Open ROMRx Base to see your plan." },
  retest: { title: "ROMRx Base", body: "Your retest is due today. Time to check your 10 joints again." },
  digest: { title: "ROMRx Base", body: "Your weekly summary is ready. See this week's sessions." },
  test: { title: "ROMRx Base", body: "Notifications are on. We'll send your daily reminder at your reminder time." },
} as const;

export type Kind = keyof typeof PUSH_COPY;

// ---------- W2: legacy fallback ownership guard ----------
export const FALLBACK_OWNED_BY_OTHER_USER = "fallback_endpoint_owned_by_other_user";
export const FALLBACK_OWNER_LOOKUP_FAILED = "fallback_owner_lookup_failed";
export type FallbackSkipReason = typeof FALLBACK_OWNED_BY_OTHER_USER | typeof FALLBACK_OWNER_LOOKUP_FAILED;
export interface OwnerRow { user_id: string; endpoint: string }

/** owners = every push_subscriptions row (any disabled_at) whose endpoint is a fallback endpoint, or null if the lookup failed. */
export function fallbackAllowed(userId: string, endpoint: string, owners: OwnerRow[] | null): { ok: true } | { ok: false; reason: FallbackSkipReason } {
  if (!owners) return { ok: false, reason: FALLBACK_OWNER_LOOKUP_FAILED };
  for (const o of owners) {
    if (o.endpoint === endpoint && o.user_id !== userId) return { ok: false, reason: FALLBACK_OWNED_BY_OTHER_USER };
  }
  return { ok: true };
}

/** Splits fallback candidates into allowed ones and per-reason skip counts (counts only, no ids or endpoints). */
export function filterFallbacks<T extends { userId: string; sub: PushSub }>(fallbacks: T[], owners: OwnerRow[] | null): { allowed: T[]; skipped: Record<FallbackSkipReason, number> } {
  const allowed: T[] = [];
  const skipped: Record<FallbackSkipReason, number> = { [FALLBACK_OWNED_BY_OTHER_USER]: 0, [FALLBACK_OWNER_LOOKUP_FAILED]: 0 } as Record<FallbackSkipReason, number>;
  for (const f of fallbacks) {
    const v = fallbackAllowed(f.userId, f.sub.endpoint, owners);
    if (v.ok) allowed.push(f);
    else skipped[v.reason] += 1;
  }
  return { allowed, skipped };
}

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
  // r2: from notification_preferences.timezone (null or invalid -> America/New_York).
  timezone: string | null;
  // r2: public.is_test_account(email) as used live by rombot-checkin v1. Unknown is true (fail closed).
  isTest: boolean;
}

// r2 quiet hours (Vera 7420bcd9 WARN: "no separate quiet-hours window"). Her note gives no hours, so the
// window is a constant here: local 21:00 up to 08:00 the next morning, in the user's timezone.
// r3: the window applies only to system nudges (retest due, test notice, digest). A protocol reminder
// the user chose themselves is exempt, so a 21:30 pick still sends. Skipped system nudges are not
// claimed; a retest due that day goes out on the first run at or after 08:00.
export const QUIET_START_HOUR = 21;
export const QUIET_END_HOUR = 8;
export const DEFAULT_TZ = "America/New_York";

export function zoneOrDefault(tz: string | null | undefined): string {
  if (!tz || tz.length > 64) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

export function localHourMinute(now: Date, tz: string | null | undefined): { zone: string; hour: number; minute: number } {
  const zone = zoneOrDefault(tz);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const g = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  return { zone, hour: g("hour"), minute: g("minute") };
}

export function inQuietHours(now: Date, tz: string | null | undefined): boolean {
  const { hour } = localHourMinute(now, tz);
  // Window wraps midnight: [21:00, 24:00) and [00:00, 08:00).
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

// r3: protocol is the user's own chosen reminder time and is exempt from quiet hours.
export function isUserChosenProtocol(kind: Kind): boolean {
  return kind === "protocol";
}

export function skippedByQuietHours(kind: Kind, now: Date, tz: string | null | undefined): boolean {
  if (kind === "protocol") return false;
  return inQuietHours(now, tz);
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
  // r3: delete that user's dead table row and/or matching legacy jsonb. No-op in dry-run (not called).
  clearDead: (userId: string, subscriptionId: string | null, endpoint: string) => Promise<void>;
  // r3: drop the day's claim so a 404/410 is not counted as the day's send.
  releaseClaim: (userId: string, dedupeKey: string) => Promise<void>;
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
  let skippedTest = 0;
  let skippedQuiet = 0;
  let cleared = 0;
  const now = d.now();
  for (const c of due) {
    // r2 filters run before claim and before any send, in dry-run and live alike.
    if (c.isTest !== false) { skippedTest += 1; continue; }
    if (c.kind !== "protocol" && inQuietHours(now, c.timezone)) { skippedQuiet += 1; continue; }
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
      } else if (result.gone) {
        // 404/410: clear this user's dead subscription only; release the claim so it is not the day's send.
        try {
          await d.clearDead(c.userId, c.subscriptionId, c.sub.endpoint);
        } finally {
          await d.releaseClaim(c.userId, key);
          claimed -= 1;
          cleared += 1;
        }
      } else {
        failed += 1;
        await d.markFailure(c.subscriptionId, false);
      }
    } else {
      skipped += 1; // counted as dry-run candidates, not claimed
    }
  }

  // Response counts only. No user ids, emails, endpoints, or keys.
  // would_clear is 0 in dry-run because dry-run does not call send and cannot see a 404/410.
  return new Response(JSON.stringify({
    ok: true,
    dry_run: !live,
    due: due.length,
    claimed: live ? claimed : 0,
    sent: live ? sent : 0,
    failed: live ? failed : 0,
    skipped,
    would_send: live ? 0 : skipped,
    skipped_test: skippedTest,
    skipped_quiet: skippedQuiet,
    cleared: live ? cleared : 0,
    would_clear: live ? 0 : 0,
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}
