import csv,re,sys,collections
rows=[l.rstrip("\n").split("\t") for l in open("raw2.tsv")]
def cat(f,t):
    s=t.lstrip()
    if s.startswith(("//","/*","*","{/*","#","<!--")) or re.match(r"^\s*\*",t): return "COMMENT"
    if re.search(r"1798822800|BETA_TRIAL_END|PACKS_EARLIEST_OPEN_UNIX|1798650000|trial_end",t) and not re.search(r"Free through|free until|charged",t): return "CODE"
    if re.search(r"[Pp]ack|[Ss]port[A-Z ]|sportPrice|\$149|\$209",t): return "PACK"
    if re.search(r"[Nn]o card|[Nn]o credit card|card (is )?(not )?required|card is needed|card needed",t):
        if re.search(r"no dot, no card|no card \(no empty|no button, no dot",t): return "NOT-BILLING"
        return "NO-CARD"
    if re.search(r"Dec(ember)? 1[2-6]\b|December notice",t): return "DEC-NOTICE"
    return "COPY"
def prop(f,t,c):
    if c in("COMMENT",): return "update comment with code (no Stacy text)"
    if c=="CODE": return "constant -> 1803920400 via fast-track constant job (reference, do not duplicate)"
    if c=="NOT-BILLING": return "no change (not billing)"
    if c=="PACK": return "<STACY RE-RULE: pack copy, separate list>"
    if c=="NO-CARD": return "Stacy 5a: 'Your first assessment and its results are free. To unlock Base, you add a payment card. No charge until March 1, 2027.' + same-screen S2 terms"
    if "arl_copy" in f:
        if "disclosureBase" in t or re.search(r"Then \$\{basePrice\} per year, charged",t): return "S1 (v ca-arl-3b-2027-03-01-v5)"
        if "Free period:" in t: return "S8 'Beta launch trial period: free until March 1, 2027.'"
        if "After the free period" in t: return "S8 'First charge: ${basePrice} on March 1, 2027, for one year of ROMRx Base. No charge before then.'"
        if "Cancel before" in t: return "S8 'Cancel before March 1, 2027 and you will not be charged anything.'"
    if "signupDisclosure" in f: return "S2 (S1 word for word with $${base})"
    if re.search(r"legal\.html",f): return "S6 (Terms s6 first span) / <STACY RE-RULE> for other sections"
    if re.search(r"faq\.html",f): return "S7"
    if "ResultsPreview" in f and re.search(r"\(free through",t,re.I): return "S4 (button unchanged; drop the paren or use S4 tag only with S2 on screen)"
    if "ResultsPreview" in f and "Base is required" in t: return "S5"
    if re.search(r"betaLine|email\.ts|welcome|lead-assessment|submit-assessment",f+t): return "S9 lifecycle line"
    if "Settings" in f: return "<STACY RE-RULE> (Settings status line; S4 tag + S2 rule)"
    return "<STACY RE-RULE> (use S4 tag or S9 line; never alone per same-screen rule)"
out=[];cnt=collections.Counter()
for r in rows:
    owner,repo,ref,f,n,t=r
    c=cat(f,t); p=prop(f,t,c)
    out.append((owner,repo,ref,f,n,c,t.replace("|","\\|")[:300],p))
    cnt[(owner,"live" if ("live" in ref or "P1-33" in ref) else "main",c)]+=1
import pickle;pickle.dump((out,cnt),open("/tmp/inv.pkl","wb"))
for k,v in sorted(cnt.items()): print(k,v)
