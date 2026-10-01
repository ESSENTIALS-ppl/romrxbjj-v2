import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decide, inQuietHours, isAuditFixtureEmail, isEuUkOrUnclearTz, type NudgeConfig, type NudgeUser } from "./nudge_rules.ts";

const NOW = new Date("2026-10-06T17:00:00Z"); // 1pm ET
const SINCE = new Date("2026-10-01T00:00:00Z");
const cfg = (o: Partial<NudgeConfig> = {}): NudgeConfig => ({ now: NOW, abSince: SINCE, catchupEnabled: false, testOnly: false, testAllowlist: [], ...o });
const hrs = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const user = (o: Partial<NudgeUser> = {}): NudgeUser => ({
  id: "u1", email: "a@example.com", createdAt: hrs(3), activeSport: "general", marketingOptOut: false, emailReminders: true,
  timezone: "America/New_York", isTestAccount: false, hasAssessment: false, nudgeSends: [], ...o,
});

Deno.test("A is due at 2h+, not before", () => {
  assertEquals(decide(user({ createdAt: hrs(3) }), cfg()), { send: true, stage: "incomplete_a" });
  assertEquals(decide(user({ createdAt: hrs(1) }), cfg()), { send: false, reason: "a_not_due" });
});
Deno.test("completion stops the sequence", () => {
  assertEquals(decide(user({ hasAssessment: true }), cfg()), { send: false, reason: "assessment_complete" });
});
Deno.test("marketing_opt_out and email_reminders off send nothing", () => {
  assertEquals(decide(user({ marketingOptOut: true }), cfg()), { send: false, reason: "marketing_opt_out" });
  assertEquals(decide(user({ emailReminders: false }), cfg()), { send: false, reason: "email_reminders_off" });
});
Deno.test("B is due 24h after A, not before, and never a third email", () => {
  const a = (h: number) => [{ emailId: "incomplete_a", sentAt: hrs(h) }];
  assertEquals(decide(user({ createdAt: hrs(30), nudgeSends: a(10) }), cfg()), { send: false, reason: "b_not_due" });
  assertEquals(decide(user({ createdAt: hrs(30), nudgeSends: a(25) }), cfg()), { send: true, stage: "incomplete_b" });
  assertEquals(decide(user({ createdAt: hrs(60), nudgeSends: [...a(50), { emailId: "incomplete_b", sentAt: hrs(26) }] }), cfg()), { send: false, reason: "email_cap_reached" });
  assertEquals(decide(user({ createdAt: hrs(120), nudgeSends: a(100) }), cfg()), { send: false, reason: "b_window_missed" });
});
Deno.test("quiet hours 9pm to 8am local", () => {
  assertEquals(inQuietHours(new Date("2026-10-06T01:00:00Z"), "America/New_York"), true); // 9pm ET
  assertEquals(inQuietHours(new Date("2026-10-06T00:59:00Z"), "America/New_York"), false); // 8:59pm ET
});
Deno.test("quiet hours boundary at 8am is open", () => {
  assertEquals(inQuietHours(new Date("2026-10-06T12:00:00Z"), "America/New_York"), false);
  assertEquals(inQuietHours(new Date("2026-10-06T11:59:00Z"), "America/New_York"), true);
  const quiet = new Date("2026-10-06T03:00:00Z");
  assertEquals(decide(user({ createdAt: new Date(quiet.getTime() - 3 * 3600000).toISOString() }), cfg({ now: quiet })), { send: false, reason: "quiet_hours" });
});
Deno.test("EU/UK and unclear region are skipped", () => {
  assertEquals(isEuUkOrUnclearTz("Europe/Istanbul"), true);
  assertEquals(isEuUkOrUnclearTz(null), true);
  assertEquals(isEuUkOrUnclearTz("America/Chicago"), false);
  assertEquals(decide(user({ timezone: "Europe/London" }), cfg()), { send: false, reason: "eu_uk_or_unclear_region" });
});
Deno.test("test accounts and audit fixtures never get live sends; test mode only allowlisted", () => {
  assertEquals(decide(user({ isTestAccount: true }), cfg()), { send: false, reason: "test_account" });
  assertEquals(decide(user({ email: "jim+romrx-audit-20261001-01@romrx.io" }), cfg()), { send: false, reason: "audit_fixture" });
  assertEquals(isAuditFixtureEmail("jim+romrx-goa-1@romrx.io"), true);
  assertEquals(decide(user({ email: "jim+romrx-nudge-1@romrx.io", isTestAccount: true }), cfg({ testOnly: true, testAllowlist: ["jim+romrx-nudge-1@romrx.io"] })), { send: true, stage: "incomplete_a" });
  assertEquals(decide(user({ email: "other@example.com" }), cfg({ testOnly: true, testAllowlist: ["jim+romrx-nudge-1@romrx.io"] })), { send: false, reason: "test_mode_not_allowlisted" });
});
Deno.test("backlog gets ONE catch-up, only when enabled, never A/B", () => {
  const old = { createdAt: "2026-09-25T12:00:00Z" };
  assertEquals(decide(user(old), cfg()), { send: false, reason: "catchup_disabled" });
  assertEquals(decide(user(old), cfg({ catchupEnabled: true })), { send: true, stage: "incomplete_catchup" });
  assertEquals(decide(user({ ...old, nudgeSends: [{ emailId: "incomplete_catchup", sentAt: hrs(5) }] }), cfg({ catchupEnabled: true })), { send: false, reason: "already_nudged" });
});
Deno.test("A/B off when abSince unset (default OFF)", () => {
  assertEquals(decide(user(), cfg({ abSince: null })), { send: false, reason: "catchup_disabled" });
  assertEquals(decide(user(), cfg({ abSince: null, catchupEnabled: true })).send, false);
});
Deno.test("non-Base users are skipped", () => {
  assertEquals(decide(user({ activeSport: "bjj" }), cfg()), { send: false, reason: "not_base_user" });
});
