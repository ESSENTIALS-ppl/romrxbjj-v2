// Counts only. Uses the DEPLOYED v27 logic.ts (read back) planReminders + brandFor. Input: anonymized rows (no emails, no ids).
import { planReminders } from "./post-deploy/readback-files/source/logic.ts";
import { brandFor } from "./post-deploy/readback-files/source/email.ts";
const raw = Deno.readTextFileSync(Deno.args[0]);
const rows = JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1).replace(/\\"/g, '"')).flatMap((x: { rows: unknown[] }) => x.rows ?? []);
const out: string[] = [`active Base rows with a Stripe subscription: ${rows.length}`];
for (const iso of ["2026-11-17T12:00:00.300Z", "2026-11-16T12:00:00.300Z"]) {
  const { due, skipped } = planReminders(rows.map((r: Record<string, unknown>) => ({ ...r, full_name: r.has_name ? "Name" : null })), new Date(iso));
  const by = (t: string) => due.filter((d) => d.type === t);
  const brand = (t: string) => { const c: Record<string, number> = {}; for (const d of by(t)) { const k = brandFor(d.active_sport).key; c[k] = (c[k] ?? 0) + 1; } return JSON.stringify(c); };
  out.push(`run ${iso}: 45_day=${by("45_day").length} ${brand("45_day")} 30_day=${by("30_day").length} ${brand("30_day")} 2_day=${by("2_day").length} ${brand("2_day")} due_total=${due.length} skipped=${JSON.stringify(skipped)} days_until=${JSON.stringify([...new Set(due.map((d) => d.days_until))])}`);
}
console.log(out.join("\n"));
