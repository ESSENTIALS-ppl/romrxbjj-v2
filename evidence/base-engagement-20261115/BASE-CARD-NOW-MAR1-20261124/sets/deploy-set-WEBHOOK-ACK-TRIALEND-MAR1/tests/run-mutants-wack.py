#!/usr/bin/env python3
"""WEBHOOK-ACK-TRIALEND-MAR1 mutant runner: copies supabase/functions to a temp dir, applies one mutation, runs the D3 tests there. Read-only on the branch."""
import subprocess, shutil, tempfile, sys, os
SRC = sys.argv[1]  # path to supabase/functions on the branch
M = [
 ("CONTROL (no change; must SURVIVE)", "stripe-webhook/index.ts", "    trial_end: trialEndIso,", "    trial_end: trialEndIso,"),
 ("wh: literal back", "stripe-webhook/index.ts", "    trial_end: trialEndIso,", "    trial_end: new Date(1798822800 * 1000).toISOString(),"),
 ("wh: helper ignores trial_end", "stripe-webhook/index.ts", "const t = ((sub ?? {}) as Record<string, unknown>).trial_end;", "const t = ((sub ?? {}) as Record<string, unknown>).current_period_end;"),
 ("wh: failure writes Jan 1", "stripe-webhook/index.ts", "    console.error(\"subTrialEndIso: subscriptions.retrieve failed\", String(e));\n    return null;", "    console.error(\"subTrialEndIso: subscriptions.retrieve failed\", String(e));\n    return new Date(1798822800 * 1000).toISOString();"),
 ("wh: sport site literal", "stripe-webhook/index.ts", "await arlAmounts(stripe, meta, subId), await subTrialEndIso(stripe, subId));", "await arlAmounts(stripe, meta, subId), new Date(1798822800 * 1000).toISOString());"),
 ("arl: ack version v3", "_shared/arl_copy.ts", 'export const ARL_ACK_VERSION = "ca-arl-3c-2027-03-01-v5";', 'export const ARL_ACK_VERSION = "ca-arl-3c-2026-09-29-v3";'),
 ("arl: S8 first-charge line", "_shared/arl_copy.ts", "No charge before then.", "No charge before January 1, 2027."),
 ("arl: S8 reminders line old", "_shared/arl_copy.ts", "Reminders: we will email you before your first charge and before each yearly renewal.", "Reminders: we will email you before your free period ends and before each yearly renewal."),
]
killed = 0
real = 0
for name, f, a, b in M:
    d = tempfile.mkdtemp(prefix="d3mut-"); dst = os.path.join(d, "functions"); shutil.copytree(SRC, dst)
    p = os.path.join(dst, f); s = open(p).read()
    assert s.count(a) == 1, f"pattern not unique: {name}"
    open(p, "w").write(s.replace(a, b))
    r = subprocess.run(["deno", "test", "--no-check", "--allow-read", "--allow-write=/tmp", "--allow-env", "--allow-run=git", "--import-map=_test/d3/import_map.json", "_test/d3/"], cwd=dst, capture_output=True, text=True, env={**os.environ, "NO_COLOR": "1", "GIT_DIR": os.environ["D3_GIT_DIR"], "DENO_DIR": os.environ.get("DENO_DIR", os.path.expanduser("~/.cache/deno"))})
    k = r.returncode != 0
    if not name.startswith("CONTROL"): killed += k; real += 1
    print(f"{'KILLED' if k else 'SURVIVED'}\t{name}")
    shutil.rmtree(d)
print(f"{killed}/{real} killed (control must SURVIVE)")
