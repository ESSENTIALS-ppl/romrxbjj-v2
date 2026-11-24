#!/usr/bin/env python3
"""D3 mutant runner: copies supabase/functions to a temp dir, applies one mutation, runs the D3 tests there. Read-only on the branch."""
import subprocess, shutil, tempfile, sys, os
SRC = sys.argv[1]  # path to supabase/functions on the branch
M = [
 ("CONTROL (no change; must SURVIVE)", "stripe-webhook/index.ts", "    trial_end: trialEndIso,", "    trial_end: trialEndIso,"),
 ("rr: consent first again", "send-renewal-reminders/logic.ts", "  if (row.base_expiry) return Date.parse(row.base_expiry) > now.getTime() ? { at: new Date(row.base_expiry).toISOString(), amount } : null;\n  if (trial) return { at: new Date(trial.trial_end!).toISOString(), amount };", "  if (trial) return { at: new Date(trial.trial_end!).toISOString(), amount };\n  if (row.base_expiry) return Date.parse(row.base_expiry) > now.getTime() ? { at: new Date(row.base_expiry).toISOString(), amount } : null;"),
 ("rr: past base_expiry falls back", "send-renewal-reminders/logic.ts", "? { at: new Date(row.base_expiry).toISOString(), amount } : null;", "? { at: new Date(row.base_expiry).toISOString(), amount } : (trial ? { at: new Date(trial.trial_end!).toISOString(), amount } : null);"),
 ("rr: > to >= on base_expiry", "send-renewal-reminders/logic.ts", "Date.parse(row.base_expiry) > now.getTime() ?", "Date.parse(row.base_expiry) >= now.getTime() - 86400000 * 400 ?"),
 ("rr: first_charge always false", "send-renewal-reminders/logic.ts", "first_charge: isFirstCharge(r, c.at) });", "first_charge: false });"),
 ("rr: first-charge window 400 days", "send-renewal-reminders/logic.ts", "FIRST_CHARGE_MAX_DAYS_AFTER_CONSENT_TRIAL_END = 180;", "FIRST_CHARGE_MAX_DAYS_AFTER_CONSENT_TRIAL_END = 500;"),
 ("rr: wording renews", "send-renewal-reminders/email.ts", "beta launch trial period ends on ${date}, and your plan starts automatically.", "membership renews on ${date}."),
 ("rr: cancel how-to dropped", "send-renewal-reminders/email.ts", "    `Want to stop it? Cancel online anytime before ${date}: ${BASE_MANAGE_URL}. You can also email ${BASE_SUPPORT_EMAIL} with the subject \"Cancel.\"`,\n", ""),
 ("rr: 45-day window 46", "send-renewal-reminders/logic.ts", '{ type: "45_day", days: 45,', '{ type: "45_day", days: 46,'),
 ("wh: literal back", "stripe-webhook/index.ts", "    trial_end: trialEndIso,", "    trial_end: new Date(1798822800 * 1000).toISOString(),"),
 ("wh: helper ignores trial_end", "stripe-webhook/index.ts", "const t = ((sub ?? {}) as Record<string, unknown>).trial_end;", "const t = ((sub ?? {}) as Record<string, unknown>).current_period_end;"),
 ("wh: failure writes Jan 1", "stripe-webhook/index.ts", "    console.error(\"subTrialEndIso: subscriptions.retrieve failed\", String(e));\n    return null;", "    console.error(\"subTrialEndIso: subscriptions.retrieve failed\", String(e));\n    return new Date(1798822800 * 1000).toISOString();"),
 ("wh: sport site drops trial arg", "stripe-webhook/index.ts", "await arlAmounts(stripe, meta, subId), await subTrialEndIso(stripe, subId));", "await arlAmounts(stripe, meta, subId), new Date(1798822800 * 1000).toISOString());"),
]
killed = 0
real = 0
for name, f, a, b in M:
    d = tempfile.mkdtemp(prefix="d3mut-"); dst = os.path.join(d, "functions"); shutil.copytree(SRC, dst)
    p = os.path.join(dst, f); s = open(p).read()
    assert s.count(a) == 1, f"pattern not unique: {name}"
    open(p, "w").write(s.replace(a, b))
    r = subprocess.run(["deno", "test", "--no-check", "--allow-read", "--allow-write=/tmp", "--allow-env", "--allow-run=git", "--import-map=_test/d3/import_map.json", "_test/d3/", "send-renewal-reminders/test/d3_charge_dates.test.ts"], cwd=dst, capture_output=True, text=True, env={**os.environ, "NO_COLOR": "1", "GIT_DIR": os.environ["D3_GIT_DIR"], "DENO_DIR": os.environ.get("DENO_DIR", os.path.expanduser("~/.cache/deno"))})
    k = r.returncode != 0
    if not name.startswith("CONTROL"): killed += k; real += 1
    print(f"{'KILLED' if k else 'SURVIVED'}\t{name}")
    shutil.rmtree(d)
print(f"{killed}/{real} killed (control must SURVIVE)")
