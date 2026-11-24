// D7-v2: mood block consent_version accepts v2-email-20261026 or v3-rombot-20261028.
// BUILD ONLY. No network, no secrets, no deploy.
import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  buildMoodBlockForUser,
  moodEmailAllowed,
  ROMOOD_CONSENT_VERSION,
} from "../submit-assessment/functions/submit-assessment/mood_block.ts";

const V2 = "v2-email-20261026";
const V3 = "v3-rombot-20261028";
const base = { saving_on: true, opted_in_at: "2026-10-26T12:00:00Z", consent_version: V2 as string | null };

// deno-lint-ignore no-explicit-any
function fakeAdmin(data: Record<string, unknown>): any {
  // deno-lint-ignore no-explicit-any
  const q = (table: string): any => {
    const self = {
      select: () => self,
      eq: () => self,
      lt: () => self,
      lte: () => self,
      gte: () => self,
      order: () => self,
      limit: () => self,
      maybeSingle: () => Promise.resolve({ data: data[table] ?? null, error: null }),
      then: (r: (x: unknown) => unknown) => r({ data: data[table] ?? [], error: null }),
    };
    return self;
  };
  return { from: q };
}

const entries = [{ energy: 40, pleasantness: 60 }, { energy: 60, pleasantness: 80 }];

Deno.test("v2 value comes from current ROMOOD_CONSENT_VERSION", () => {
  assertEquals(ROMOOD_CONSENT_VERSION, V2);
});

Deno.test("consent v2 includes the block", async () => {
  assert(moodEmailAllowed("on", { ...base, consent_version: V2 }));
  const h = await buildMoodBlockForUser(
    fakeAdmin({ mood_settings: { ...base, consent_version: V2 }, assessments: null, mood_entries: entries }),
    "u1",
    "2026-10-26T20:00:00Z",
    "on",
  );
  assert(h.includes("Your mood check-ins"));
  assert(h.includes("You checked in 2 times"));
});

Deno.test("consent v3 (v3-rombot-20261028) includes the block", async () => {
  assert(moodEmailAllowed("on", { ...base, consent_version: V3 }));
  const h = await buildMoodBlockForUser(
    fakeAdmin({ mood_settings: { ...base, consent_version: V3 }, assessments: null, mood_entries: entries }),
    "u1",
    "2026-10-26T20:00:00Z",
    "on",
  );
  assert(h.includes("Your mood check-ins"));
  assert(h.includes("You checked in 2 times"));
});

Deno.test("any other consent_version or a missing value excludes the block", async () => {
  const excluded: Array<string | null | undefined> = [null, undefined, "", "v1", "v3", "v3-rombot-20261027", "v2"];
  for (const v of excluded) {
    const row = { ...base, consent_version: (v ?? null) as string | null };
    // undefined is a missing value; pass a row with consent_version explicitly missing too
    if (v === undefined) {
      const { consent_version: _omit, ...missing } = base;
      assertEquals(moodEmailAllowed("on", missing as typeof base), false, "missing consent_version");
      const hMissing = await buildMoodBlockForUser(
        fakeAdmin({ mood_settings: missing, assessments: null, mood_entries: entries }),
        "u1",
        "2026-10-26T20:00:00Z",
        "on",
      );
      assertEquals(hMissing, "", "missing consent_version excludes the block");
      continue;
    }
    assertEquals(moodEmailAllowed("on", row), false, String(v));
    const h = await buildMoodBlockForUser(
      fakeAdmin({ mood_settings: row, assessments: null, mood_entries: entries }),
      "u1",
      "2026-10-26T20:00:00Z",
      "on",
    );
    assertEquals(h, "", `excludes for consent_version=${String(v)}`);
  }
});
