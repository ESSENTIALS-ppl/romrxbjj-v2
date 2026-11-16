import { assertEquals } from "jsr:@std/assert@1";
import { latestTwoFull } from "../source/score.ts";

type Row = { id: string; assessed_at: string; check_kind?: string | null };
// Minimal PostgREST-like fake: supports the calls latestTwoFull makes. hasColumn=false makes the check_kind filter error.
function fakeSb(rows: Row[], hasColumn = true) {
  return {
    from: () => {
      let r = [...rows]; let err: unknown = null;
      const b = {
        select: () => b,
        eq: () => b,
        or: (expr: string) => {
          if (!hasColumn) err = { message: "column assessments.check_kind does not exist" };
          else if (expr === "check_kind.is.null,check_kind.neq.quick") r = r.filter((x) => x.check_kind == null || x.check_kind !== "quick");
          return b;
        },
        order: () => (r.sort((a, c) => c.assessed_at.localeCompare(a.assessed_at)), b),
        limit: (n: number) => Promise.resolve(err ? { data: null, error: err } : { data: r.slice(0, n), error: null }),
      };
      return b;
    },
  };
}
const rows: Row[] = [
  { id: "f1", assessed_at: "2026-10-01T12:00:00Z", check_kind: null },
  { id: "f2", assessed_at: "2026-11-01T12:00:00Z", check_kind: "full" },
  { id: "q1", assessed_at: "2026-11-08T12:00:00Z", check_kind: "quick" },
];
Deno.test("must-fix b: latest/previous skip quick rows (NULL counts as full)", async () => {
  assertEquals((await latestTwoFull(fakeSb(rows), "u")).map((r) => r.id), ["f2", "f1"]);
});
Deno.test("must-fix b: before check_kind exists, falls back to the old unfiltered read", async () => {
  assertEquals((await latestTwoFull(fakeSb(rows.slice(0, 2), false), "u")).map((r) => r.id), ["f2", "f1"]);
});
