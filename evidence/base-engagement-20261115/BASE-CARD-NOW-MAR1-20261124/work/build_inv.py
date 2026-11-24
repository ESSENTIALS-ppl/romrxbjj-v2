import pickle,subprocess,re
out,_=pickle.load(open("/tmp/inv.pkl","rb"))
M="/tmp/wt-base-immediate-20261124"
def mainline(path,n):
    t=subprocess.run(["git","-C",M,"show",f"origin/main:{path}"],capture_output=True,text=True).stdout.splitlines()
    return t[n-1].strip()
S8={"fp":"S8: \"Beta launch trial period: free until March 1, 2027.\"",
 "fc":"S8: \"First charge: ${basePrice} on March 1, 2027, for one year of ROMRx Base. No charge before then.\"",
 "cb":"S8: \"Cancel before March 1, 2027 and you will not be charged anything.\"",
 "wc":"S8 (stands, same text): \"When you cancel: ...\"",
 }
A="supabase/functions/_shared/arl_copy.ts"; R="supabase/functions/send-renewal-reminders/email.ts"
rows=[ # (n, path, main line, live where, mapping)
 (1,A,41,"checkout v52 :39 / webhook v59 :41","S1 (Base checkout disclosure), version ca-arl-3b-2027-03-01-v5"),
 (2,A,46,"checkout v52 :44 / webhook v59 :46","PACK (combo). Packs closed; Base-only path uses S1. <STACY RE-RULE> for combo text"),
 (3,A,51,"checkout v52 :49 / webhook v59 :51","PACK (sport-only, trial). <STACY RE-RULE>"),
 (4,A,56,"checkout v52 :54 / webhook v59 :56","PACK (sport-only paid). Not a Base line; unchanged unless Stacy re-rules"),
 (5,A,68,"checkout v52 :66 / webhook v59 :68",S8["fp"]),
 (6,A,69,"checkout v52 :67 / webhook v59 :69",S8["fc"]+" (combo variant: <STACY RE-RULE>)"),
 (7,A,72,"checkout v52 :70 / webhook v59 :72",S8["cb"]),
 (8,A,73,"checkout v52 :71 / webhook v59 :73",S8["wc"]),
 (9,A,90,"checkout v52 :88 / webhook v59 :90","PACK ack (sport). <STACY RE-RULE>"),
 (10,A,92,"checkout v52 :90 / webhook v59 :92","PACK ack (sport). <STACY RE-RULE>"),
 (11,A,93,"checkout v52 :91 / webhook v59 :93","PACK ack (sport paid). Unchanged unless Stacy re-rules"),
 (12,A,96,"checkout v52 :94 / webhook v59 :96","PACK ack (sport). <STACY RE-RULE>"),
 (13,A,97,"checkout v52 :95 / webhook v59 :97",S8["wc"]),
 (14,R,59,"v32 :59 (= main)","Renewal reminder (2-day). For the Mar 1, 2027 first charge it says 'renews': <STACY RE-RULE> (trial-to-paid variant, or Notice B covers). Stands for the Mar 1, 2028 renewal (P6)"),
 (15,R,61,"v32 :61 (= main)","Renewal reminder (30-day, 'As required by law'). Same as row 14"),
 (16,R,62,"v32 :62 (= main)","Renewal reminder (45-day). Same as row 14"),
 (17,R,102,"v32 :102 (= main)","Text part of row 14. Same"),
 (18,R,104,"v32 :104 (= main)","Text part of row 15. Same"),
 (19,R,105,"v32 :105 (= main)","Text part of row 16. Same"),
 (20,R,111,"v32 :111 (= main)","Cancel line. Stands (no date)"),
 (21,"supabase/functions/send-s1-welcome-email/index.ts",131,"v40 :167 (live differs from main by line offset)","S9 lifecycle line: \"ROMRx Base is free until March 1, 2027, our beta launch trial period. Then $60 a year, charged to your card on March 1, 2027 and every year until you cancel.\" + how to cancel in the same email (never-alone rule)"),
 (22,"supabase/functions/submit-assessment/index.ts",99,"v50 (live bytes not captured in full: MCP output truncated; re-capture before build)","S9 lifecycle line, as row 21"),
 (23,"supabase/functions/submit-lead-assessment/email.ts",175,"v36 :175 (= main)","S9 lifecycle line, as row 21"),
]
L=[]
L.append("# INVENTORY: Base 'free until March 1, 2027' copy, file:line (READ-ONLY), v1")
L.append("Built 2026-11-24 ~3:10 PM ET (EST) by Avery for Stacy, Jules, Grant. PLAN ONLY: nothing edited, deployed or sent.")
L.append("Rule (Sable L1487/L1489, Grant 3:07 PM): no charge before 1803920400 (Mar 1, 2027 12:00 PM EST); sign-ups before then get trial_end 1803920400; from that instant checkout charges $60 at sign-up, no trial.")
L.append("Strings: STACY-BASE-MARCH1-TRIAL-STRINGSET-20261124-1459.md (sha256 55c49a8c..., SUMS -c OK). S1-S10 as there. <STACY RE-RULE> = no cleared string yet; Stacy writes it.")
L.append("Same-screen / same-email rule (1459 line 5): 'free until March 1, 2027' never stands alone; the $60 Mar 1 charge, yearly renewal and how to cancel must be on the same screen or email.")
L.append("NOT CLEARED YET (all rows): the post-Mar-1 paid-at-sign-up variants of S1/S3/S8 (1459 flag 8). Needed before 1803920400. <STACY RE-RULE: post-trial>.")
L.append("")
L.append("## 1. Avery (romrxbjj-v2): the 23 user-facing strings Jules listed (JULES-MARCH1-FREE-PERIOD-INVENTORY-20261124.md sha256 78c4d0d6..., read first-hand)")
L.append("Main ref: origin/main 4ea5edd7 (Jules cited a34aa57, an ancestor of main; same lines). Live: checkout v52 _shared/arl_copy.ts = c06bd315 (live v50 copy, 2 lines shorter: no POSTAL_LINE import); webhook v59 _shared/arl_copy.ts = 6b550c27 (= main).")
L.append("")
L.append("| # | file:line (main) | live line | current text | proposed (Stacy 1459) |")
L.append("|---|---|---|---|---|")
for n,p,ln,lv,mp in rows:
    t=mainline(p,ln).replace("|","\\|")
    L.append(f"| {n} | {p}:{ln} | {lv} | `{t}` | {mp} |")
L.append("")
L.append("Also in arl_copy (not in Jules's 23, Avery adds): :12 ARL_DISCLOSURE_VERSION ca-arl-3b-2026-09-29-v3 -> ca-arl-3b-2027-03-01-v5; :13 ARL_ACK_VERSION -> ca-arl-3c-2027-03-01-v5; :31 ARL_CONSENT_TEXT -> S3; :75 'Reminders: ... before your free period ends ...' -> S8 'Reminders: we will email you before your first charge and before each yearly renewal.'; :74 'Canceling Base also cancels any sport packs.' stays (1459 S8 note). Live checkout lines are main minus 2.")
L.append("Mine count: 23 Jules-listed + 5 added = 28 Avery user-facing items (of which 9 are pack copy, listed again in section 4).")
L.append("")
L.append("## 2. Avery: server code and constants keyed to Jan 1 / Dec 30 (not copy; change with the fast-track constant job)")
code=[r for r in out if r[0]=="Avery" and r[5]=="CODE" and r[1]=="edge live"]
L.append("| function/live ref | file:line | current text | action |")
L.append("|---|---|---|---|")
def act(r):
    f,n,t=r[3],r[4],r[6]
    if "1798822800" in t and "index.ts" in f and "stripe-webhook" in r[2]: return "REPLACE literal: write the checkout session's subscription trial_end (null when paid at sign-up)"
    if "1798822800" in t: return "CONSTANT -> 1803920400 (fast-track constant job owns it; reference, do not duplicate). packs_gate:22 must equal arl_copy BETA_TRIAL_END_UNIX (test packs_gate_jan1)"
    if n=="213": return "REMOVE the Dec 30 noon 503 (lines 211-215); replace with paid-at-sign-up branch when now >= 1803920400"
    if "packs_gate" in f and n=="40": return "CHANGE: return trialEndUnix null when now >= 1803920400 (paid at sign-up); else 1803920400"
    if "packs_gate" in f: return "follows constant; re-check packs-open semantics vs Mar 1 (packs earliest-open date was tied to Jan 1): open decision"
    if n in ("255","309"): return "no code change; value from planBaseCheckout (1803920400 before, omitted after)"
    if n in ("392","440"): return "no change (sport unlock never sets trial_end)"
    if "renewal" in r[2] and n in ("78","79","81"): return "LOGIC FIX: consent trial_end goes stale after the L1487 move; prefer users.base_expiry (webhook-synced from Stripe) when present"
    if n=="40": return "import only"
    if "nowMs <" in t: return "follows constant (inFreePeriod keys on 1803920400 per S10)"
    if "renewal" in r[2]: return "no change (reads billing_consents; see logic fix rows)"
    return "no change (reads Stripe's own fields)"
for r in code: L.append(f"| {r[2]} | {r[3]}:{r[4]} | `{r[6]}` | {act(r)} |")
#L.append("| create-checkout-session v52 | source/index.ts:213-214 | Dec 30 noon 503 (`Date.now() > (BETA_TRIAL_END_UNIX - 48*3600)*1000` -> 503 base_checkout_unavailable) | REMOVE; replace with the now >= 1803920400 paid switch |")
#L.append("| stripe-webhook v59 | source/index.ts:226 | `trial_end: new Date(1798822800 * 1000).toISOString(),` (billing_consents) | write the session's real trial_end (or null when paid at sign-up), not a literal |")
L.append("")
L.append("## 3. Jules (front ends): every hit, live and main")
L.append("Primary source is Jules's own inventory (78c4d0d6): romrx.io live 104 rows (39 YES, 9 CHECK), romrxbjj.com 14 (2 YES, 5 CHECK), romrxbodybuilding.com 19 (3 YES, 4 CHECK). Note: BJJ 6d1fba95 and BB 23c169ce are LIVE since 2:55/2:56 PM ET today (Jules), so the 4d7b3885 / a4b005c1 rows below are the previous deploy.")
L.append("Avery cross-check scan (git grep, comments kept but labeled):")
L.append("| repo | ref | file:line | category | current text | proposed |")
L.append("|---|---|---|---|---|---|")
for r in out:
    if r[0]=="Jules" and r[5] not in("PACK","NOT-BILLING"):
        L.append(f"| {r[1]} | {r[2]} | {r[3]}:{r[4]} | {r[5]} | `{r[6]}` | {r[7]} |")
L.append("")
L.append("## 4. Pack copy (separate list; packs closed, not part of the Base rule)")
L.append("| owner | repo/ref | file:line | current text |")
L.append("|---|---|---|---|")
for r in out:
    if r[5]=="PACK" and not (r[0]=="Avery" and r[1]=="romrxbjj-v2"):
        L.append(f"| {r[0]} | {r[1]} {r[2]} | {r[3]}:{r[4]} | `{r[6]}` |")
L.append("Plus Avery rows 2, 3, 4, 6 (combo part), 9, 10, 11, 12 in section 1.")
L.append("")
L.append("## 5. 'No card' lines (all VOID for Base per 1459 S10; replacement Stacy 1457 5a)")
nc=[r for r in out if r[5]=="NO-CARD"]
L.append(f"{len(nc)} scan rows (romrx.io live+main, BB athletes.html). Replacement: 'Your first assessment and its results are free. To unlock Base, you add a payment card. No charge until March 1, 2027.' Keep 'Your first assessment and its results are free, no card needed.' only where it is about the assessment: code confirms the first assessment needs no card (card is taken only at Stripe Checkout on unlock, see plan section 0). Listed in section 3 with category NO-CARD.")
L.append("Server side: no 'no card' string in any live Base edge function (scan: 0 hits).")
L.append("")
L.append("## 6. Dec 12-16 notice (17602(b)) tie-ins")
L.append("- No edge function, template, cron job or scheduled job sends it. cron.job read-only: no job references it (job 1 caab15b0 is send-renewal-reminders daily 12:00 UTC = 7:00 AM ET). It exists only as drafts: GRANT-JAN1-LAUNCH-INVENTORY-20261124.md 9.2, JIM-TAPS.md:1173, Stacy 1414 / 1457. Action: DROP (void per 1457); replaced by Notice A and Notice B drafts (Stacy 1501, sha 384ceafc, SUMS -c OK). No send path built.")
L.append("")
L.append("## Counts")
L.append("- Avery: 28 user-facing items (23 Jules-listed + 5) + 9 code/constant sites (section 2), + comments.")
L.append("- Jules: per Jules's inventory, 44 live YES + 18 CHECK across 3 sites (romrx.io 39+9, BJJ 2+5, BB 3+4), + 17 only-in-main YES.")
open("../INVENTORY-BASE-MAR1-COPY-v1.md","w").write("\n".join(L)+"\n")
