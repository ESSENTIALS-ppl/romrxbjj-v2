#!/usr/bin/env python3
# P1-14 r2: extract cleared push copy from Stacy 219378b5 section A (+ Kai 481a2e9d for CLEAR lines).
# Verbatim string extraction only. Exits non-zero (STOP) on any sha mismatch or unclean mapping.
import hashlib, json, re, sys
STACY = "/workspace/process/evidence/STACY-P1-14-PUSH-AND-P1-31-TITLES-20261116-2029.md"
KAI = "/workspace/research/p1-14/kai-p1-14-push-copy.md"
H = lambda b: hashlib.sha256(b).hexdigest()
def stop(msg): print("STOP: " + msg, file=sys.stderr); sys.exit(2)
sb = open(STACY, "rb").read(); kb = open(KAI, "rb").read()
if not H(sb).startswith("219378b5"): stop("Stacy file sha256 is not 219378b5...")
if not H(kb).startswith("481a2e9d"): stop("Kai file sha256 is not 481a2e9d...")
S = sb.decode("utf-8").split("\n"); K = kb.decode("utf-8").split("\n")
# Section A bounds
a0 = next(i for i, l in enumerate(S) if l.startswith("## A. P1-14 push copy"))
a1 = next(i for i, l in enumerate(S) if i > a0 and l.startswith("## "))
A = range(a0, a1)
def find(pat):
    hits = [i for i in A if re.search(pat, S[i])]
    if len(hits) != 1: stop(f"pattern {pat!r} matched {len(hits)} lines in section A")
    return hits[0]
out = {"source": {"stacy": STACY, "stacy_sha256": H(sb), "kai": KAI, "kai_sha256": H(kb), "section_A_lines": f"{a0+1}-{a1}"}, "kinds": {}}
# Title
ti = find(r"^Title for all kinds: ")
m = re.fullmatch(r"Title for all kinds: (.+)\. CLEAR\.", S[ti])
if not m: stop("title line does not parse")
title = m.group(1)
if title != "ROMRx Base": stop(f"section A title is {title!r}, not 'ROMRx Base'")
out["title"] = {"text": title, "stacy_line": ti + 1, "sha256": H(title.encode())}
# Kai drop-in originals (L26-31 block)
kai = {}
for i, l in enumerate(K):
    mm = re.fullmatch(r'  (protocol|retest|digest|test): \{ title: "([^"]+)", body: "([^"]+)" \},', l)
    if mm: kai[mm.group(1)] = {"title": mm.group(2), "body": mm.group(3), "kai_line": i + 1}
if set(kai) != {"protocol", "retest", "digest", "test"}: stop(f"Kai drop-in kinds {sorted(kai)}")
for k, v in kai.items():
    if v["title"] != title: stop(f"Kai title for {k} is not the cleared title")
def edited(kind, num, quoted_from_kai):
    hi = find(rf"^{num}\. {kind}: EDIT\. ")
    if not S[hi].rstrip().endswith("Use:"): stop(f"{kind}: EDIT header does not end with 'Use:'")
    if quoted_from_kai not in S[hi]: stop(f"{kind}: Stacy header does not quote Kai's text")
    if quoted_from_kai not in kai[kind]["body"]: stop(f"{kind}: quoted text not in Kai body")
    bl = hi + 1
    if bl not in A or not S[bl].startswith("   ") or not S[bl].strip(): stop(f"{kind}: no replacement line after header")
    body = S[bl].strip()
    return {"status": "EDIT", "body": body, "stacy_line": bl + 1, "stacy_header_line": hi + 1, "kai_original": kai[kind]["body"], "kai_line": kai[kind]["kai_line"]}
out["kinds"]["protocol"] = edited("protocol", 1, "Today's plan is ready. It's built from your own assessment.")
out["kinds"]["retest"] = edited("retest", 2, "It's been 6 weeks")
out["kinds"]["test"] = edited("test", 4, "We'll remind you when your plan is ready")
# digest: CLEAR, body quoted in Stacy line and must equal Kai's body
di = find(r"^3\. digest: CLEAR\. ")
mq = re.fullmatch(r'3\. digest: CLEAR\. "([^"]+)" Condition: (.+)', S[di])
if not mq: stop("digest CLEAR line does not parse")
if mq.group(1) != kai["digest"]["body"]: stop("digest quoted text != Kai digest body")
out["kinds"]["digest"] = {"status": "CLEAR", "body": mq.group(1), "stacy_line": di + 1, "kai_original": kai["digest"]["body"], "kai_line": kai["digest"]["kai_line"], "condition": mq.group(2)}
for k, v in out["kinds"].items():
    v["title"] = title
    v["body_sha256"] = H(v["body"].encode())
    if any(ch in v["body"] for ch in "\u2014\u2013"): stop(f"{k}: dash in body")
ordered = {k: out["kinds"][k] for k in ("protocol", "retest", "digest", "test")}
out["kinds"] = ordered
ts = "export const PUSH_COPY = {\n" + "".join(f'  {k}: {{ title: {json.dumps(title)}, body: {json.dumps(v["body"])} }},\n' for k, v in ordered.items()) + "} as const;\n"
out["push_copy_ts"] = ts
out["push_copy_ts_sha256"] = H(ts.encode())
print(json.dumps(out, indent=1, ensure_ascii=False))
