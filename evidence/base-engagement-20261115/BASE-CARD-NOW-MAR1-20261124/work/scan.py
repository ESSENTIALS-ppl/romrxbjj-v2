#!/usr/bin/env python3
"""Read-only copy scan for the March 1 plan. git grep on fixed refs + live function copies on disk. Prints TSV."""
import subprocess, re, os, sys, glob
PAT = r"January 1,? 2027|Jan\.? 1,? 2027|January 1st|December 31,? 2026|Dec\.? 31,? 2026|Dec 31\b|Dec\. 31|[Ff]ree through|[Ff]ree until|[Ff]ree period|free-period|not charged before|charged on January|[Nn]o card|[Nn]o credit card|[Cc]ard (is )?(not )?required|card is needed|card needed|1798822800|BETA_TRIAL_END|trial_end|Dec(ember)? 1[2-6]\b|December notice|beta launch|free during the beta|free in beta|free beta|[Ff]ree for (the )?beta"
EXCL = re.compile(r"(^|/)(node_modules|dist|_test|test|tests|__tests__|scripts)/|\.test\.|\.spec\.|\.md$|\.lock$|package(-lock)?\.json$|/reverts/|^docs/|\.sql$")
SRCS = [
 # owner, repo, refname, git dir, ref, path filter
 ("Avery", "romrxbjj-v2", "main 4ea5edd7", "/tmp/wt-base-immediate-20261124", "origin/main", ["supabase/functions"]),
 ("Jules", "romrx-io-web", "live r9 76894711", "/workspace/p1-wt", "768947113ae39d1031bdd59ceb845657a39e1867", ["."]),
 ("Jules", "romrx-io-web", "main 872c0ad", "/workspace/p1-wt", "origin/main", ["."]),
 ("Jules", "romrx-bjj-web", "live 4d7b3885", "/workspace/bjj-web-audit", "4d7b3885192e471575fb733f600020cb8436a3de", ["."]),
 ("Jules", "romrx-bjj-web", "P1-33 branch 6d1fba95", "/workspace/bjj-web-audit", "6d1fba950a66f4f46d3decd37caa14d83b89b2e5", ["."]),
 ("Jules", "romrx-bodybuilding-web", "live a4b005c1", "/workspace/bb-main", "a4b005c109e5cfe408600e7f70de30b0fd50bc77", ["."]),
 ("Jules", "romrx-bodybuilding-web", "P1-33 branch 23c169ce", "/workspace/bb-main", "23c169ce7c6bbae51b081b0b6b29ed815c787c3b", ["."]),
]
LIVE_DIRS = [  # live edge copies (read-only, MCP get_edge_function or Vera's capture)
 ("Avery", "edge live", "create-checkout-session v50/v52(=643e27f0)", "/workspace/process/batches/base-engagement-20261115/BASE-IMMEDIATE-CHARGE-20261124/bundles-v2/2-create-checkout-session-643e27f0"),
 ("Avery", "edge live", "stripe-webhook v59", "/workspace/process/batches/base-engagement-20261115/BASE-IMMEDIATE-CHARGE-20261124/live-webhook-v59/files"),
 ("Avery", "edge live", "activate-beta-base v18", "/workspace/process/batches/base-engagement-20261115/BASE-IMMEDIATE-CHARGE-20261124/live-activate-beta-base-v18/files"),
 ("Avery", "edge live", "lifecycle-emails v11 (Vera capture Nov 17)", "/workspace/vera-scratch/p1-33/live/lifecycle-emails"),
] + [("Avery", "edge live", f"{s} (MCP 2026-11-24)", f"/tmp/live/{s}") for s in sorted(os.listdir("/tmp/live"))]
rx = re.compile(PAT)
rows = []
for owner, repo, label, gd, ref, paths in SRCS:
    r = subprocess.run(["git", "-C", gd, "grep", "-n", "-I", "-E", PAT, ref, "--", *paths], capture_output=True, text=True)
    for l in r.stdout.splitlines():
        _, f, n, txt = l.split(":", 3)
        if EXCL.search(f): continue
        rows.append((owner, repo, label, f, n, txt.strip()))
for owner, repo, label, d in LIVE_DIRS:
    for p in sorted(glob.glob(d + "/**/*.ts", recursive=True)):
        rel = os.path.relpath(p, d)
        for i, txt in enumerate(open(p, errors="replace"), 1):
            if rx.search(txt): rows.append((owner, repo, label, rel, str(i), txt.strip()))
for r in rows:
    print("\t".join(r[:5]) + "\t" + re.sub(r"[A-Za-z0-9._%+-]+@(?!romrx\.io)[A-Za-z0-9.-]+\.[a-z]{2,}", "<email>", r[5])[:400])
