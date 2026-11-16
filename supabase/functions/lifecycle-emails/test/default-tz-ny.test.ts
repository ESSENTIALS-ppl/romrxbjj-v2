import { assertEquals } from "jsr:@std/assert@1";
import { type Candidate, DEFAULT_TZ, localParts, planKind, validTz } from "../source/logic.ts";

const U1 = "11111111-1111-4111-8111-111111111111";
const created = "2026-10-01T00:00:00Z";
const saved = "2026-10-02T00:00:00Z";

function cand(over: Partial<Omit<Candidate, "pref">> & { pref?: Partial<NonNullable<Candidate["pref"]>> | null } = {}): Candidate {
  const { pref, ...rest } = over;
  return {
    user_id: U1, email: "alex@example.com", full_name: "Alex Rider", active_sport: "bjj", marketing_opt_out: false, deletion_requested: false,
    pref: pref === null ? null : {
      user_id: U1, reminder_time: "09:00", timezone: "America/Chicago", retest_reminders: true, email_reminders: true, weekly_digest: true,
      created_at: created, updated_at: saved,
      retest_opt_in_at: saved, protocol_opt_in_at: saved, digest_opt_in_at: saved, ...pref,
    },
    latest_assessment: { id: "a1", assessed_at: "2026-10-01T12:00:00Z" }, latest_score: 70, previous_score: 66,
    session_dates: [], has_protocol: true, ...rest,
  };
}
const canaryAll = { all: true, canary: new Set<string>() };

// Sunday 2026-11-08 14:00Z = 09:00 America/New_York = 08:00 America/Chicago (both standard time).
const SUN_14Z = new Date("2026-11-08T14:00:00Z");

Deno.test("P1-08 v4 tz: invalid or missing timezone falls back to America/New_York; a stored timezone stays first", () => {
  assertEquals(DEFAULT_TZ, "America/New_York");
  assertEquals(validTz("America/New_York"), true);
  assertEquals(validTz("America/Chicago"), true);
  assertEquals(validTz("Not/AZone"), false);
  assertEquals(validTz(null), false);
  assertEquals(validTz(undefined), false);
  assertEquals(validTz(""), false);

  assertEquals(localParts(SUN_14Z, "Not/AZone").tz, "America/New_York");
  assertEquals(localParts(SUN_14Z, "Not/AZone").hour, 9);
  assertEquals(localParts(SUN_14Z, null).tz, "America/New_York");
  assertEquals(localParts(SUN_14Z, undefined).tz, "America/New_York");
  assertEquals(localParts(SUN_14Z, "").tz, "America/New_York");
  assertEquals(localParts(SUN_14Z, "   ").tz, "America/New_York");

  // Stored tz still wins.
  assertEquals(localParts(SUN_14Z, "America/Chicago").tz, "America/Chicago");
  assertEquals(localParts(SUN_14Z, "America/Chicago").hour, 8);
  assertEquals(localParts(SUN_14Z, "America/New_York").tz, "America/New_York");
  assertEquals(localParts(SUN_14Z, "America/New_York").hour, 9);
  assertEquals(localParts(SUN_14Z, "Asia/Tokyo").tz, "Asia/Tokyo");

  // Digest: 14:00Z Sunday is 09:00 NY (in the default 09:00 window) and 08:00 Chicago (outside it).
  const missing = cand({ pref: { timezone: null } });
  const invalid = cand({ pref: { timezone: "Not/AZone" } });
  const chicago = cand({ pref: { timezone: "America/Chicago" } });
  const ny = cand({ pref: { timezone: "America/New_York" } });
  assertEquals(planKind("digest", SUN_14Z, [missing], canaryAll).due.length, 1, "missing tz uses NY, digest due at 09:00 ET");
  assertEquals(planKind("digest", SUN_14Z, [invalid], canaryAll).due.length, 1, "invalid tz uses NY, digest due at 09:00 ET");
  assertEquals(planKind("digest", SUN_14Z, [missing], canaryAll).due[0].local_date, "2026-11-08");
  assertEquals(planKind("digest", SUN_14Z, [chicago], canaryAll).due.length, 0, "stored Chicago stays first: 08:00, outside the 09:00 window");
  assertEquals(planKind("digest", SUN_14Z, [ny], canaryAll).due.length, 1, "stored NY is also due at 09:00");
});
