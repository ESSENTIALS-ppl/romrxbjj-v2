#!/usr/bin/env python3
"""+Yoga pose loader (DRAFT, UNAPPLIED). Turns Quinn's pose CSV into an idempotent SQL file.

  python3 scripts/yoga/load_yoga_poses.py            # writes supabase/yoga-load/*.sql and prints the data-quality report
  python3 scripts/yoga/load_yoga_poses.py --check    # parse and validate only, writes nothing

Safety rules baked in (tests: scripts/yoga/test_load_yoga_poses.py):
  * This script never connects to a database and never runs SQL. It only writes files.
  * The generated SQL lives in supabase/yoga-load/, NOT in supabase/migrations/, so `supabase db push` never picks it up.
  * NO range number is ever written to yoga_pose_joints.required_value. There is no signed (COACH-SET) range yet, so every
    requirement column is left NULL and every pose renders GREY "Not rated". Quinn's EVIDENCE degrees go to
    yoga_pose_evidence (service role only) as descriptive averages, never as gates (Stacy section 10).
  * Re-running is safe: ON CONFLICT updates only descriptive columns, never required_value / required_unit / range_source /
    signed_by / signed_at, so a teacher-signed range survives a reload.
"""
import argparse, collections, csv, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DEFAULT_CSV = os.path.join(HERE, "data", "quinn-poses-20261003.csv")
DEFAULT_LEVELS = os.path.join(HERE, "data", "levels-20261003.json")
DEFAULT_OUT = os.path.join(ROOT, "supabase", "yoga-load")
SOURCE_TAG = "quinn-poses-20261003"
LEVEL_NAMES = ("Settle", "Steady", "Flow", "Open")
HEADER = ["pose_code", "family", "sanskrit", "english", "joint", "direction", "degrees", "label", "source", "confidence",
          "test_method", "base_captures_joint"]
KNOWN_JOINTS = {"Hip", "Spine", "Knee", "Shoulder", "Ankle", "Wrist", "Elbow", "Cervical", "(none listed)"}
NONE_LISTED = "(none listed)"
# Base measures these 12 keys (romrx-io-web mobilityBands.ts). Two-sided joints need both sides.
BASE_KEYS = ("hip_er", "hip_ir", "hip_abd", "hip_flex", "shoulder_er", "shoulder_flex", "ankle_df", "cervical_lat",
             "lumbar_flex", "lumbar_ext", "cervical_flex", "cervical_ext")
BILATERAL = {"hip_er", "hip_ir", "hip_abd", "hip_flex", "shoulder_er", "shoulder_flex", "ankle_df", "cervical_lat"}
KEY_LABEL = {
    "hip_er": "Hip external rotation", "hip_ir": "Hip internal rotation", "hip_abd": "Hip abduction",
    "hip_flex": "Hip flexion, knee straight", "shoulder_er": "Shoulder external rotation", "shoulder_flex": "Shoulder flexion",
    "ankle_df": "Ankle dorsiflexion, knee bent", "cervical_flex": "Neck flexion", "cervical_ext": "Neck extension",
    "lumbar_flex": "Spine flexion (lumbar test stands in)", "lumbar_ext": "Spine extension (lumbar test stands in)",
}


def base_key(joint, direction, captures):
    """(base_key, status). status: base | proxy | not_measured. Same mapping as the front end (romrx-yoga-web build_poses.py)."""
    d = direction.lower()
    if captures == "yes":
        if joint == "Hip":
            if "abduction" in d or "frontal" in d: return "hip_abd", "base"
            if "external" in d: return "hip_er", "base"
            if "internal" in d: return "hip_ir", "base"
            if "flexion" in d: return "hip_flex", "base"
        if joint == "Shoulder":
            if "flexion" in d: return "shoulder_flex", "base"
            if "external" in d: return "shoulder_er", "base"
        if joint == "Ankle": return "ankle_df", "base"
        if joint == "Cervical":
            if "flexion" in d: return "cervical_flex", "base"
            if "extension" in d: return "cervical_ext", "base"
    if captures == "unknown":
        if joint == "Spine" and "flexion" in d: return "lumbar_flex", "proxy"
        if joint == "Spine" and "extension" in d: return "lumbar_ext", "proxy"
        if joint == "Shoulder" and "external" in d: return "shoulder_er", "proxy"
    return None, "not_measured"


def canon_dir(d):
    d = d.split(" - ")[0].lower()
    d = re.sub(r"\(.*?(\)|$)", "", d)
    d = re.sub(r"\b(peak|measured|sagittal|plug-in-gait pelvis-thigh angle|dominant leg)\b", "", d)
    d = re.sub(r"^((hip|knee|ankle|shoulder|wrist|elbow|cervical|spine) )+", "", d)
    d = re.sub(r",\s*$", "", d.strip())
    d = re.sub(r",? ?(front|back|lifted|extended|bent|standing|kneeling|dominant) (leg|foot)", "", d)
    return re.sub(r"\s+", " ", d).strip().rstrip(",").lower()


def parse_degrees(raw):
    """Return (mean, sd) from text like '44.1 +/- 8.8', '-13.8 (SD 3.3)', '-1.5 (1.3)'. Blank -> (None, None).
    The sign is the paper's own sign convention and is NOT normalized; the raw text is stored beside it."""
    raw = (raw or "").strip()
    if not raw: return None, None
    m = re.match(r"^\s*([+-]?\d+(?:\.\d+)?)", raw)
    if not m: return None, None
    mean = float(m.group(1))
    s = re.search(r"\+/-\s*(\d+(?:\.\d+)?)", raw) or re.search(r"\((?:SD\s*)?(\d+(?:\.\d+)?)\)", raw)
    return mean, (float(s.group(1)) if s else None)


def read_rows(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        rd = csv.DictReader(f)
        if rd.fieldnames != HEADER:
            raise ValueError("unexpected CSV header: %r" % (rd.fieldnames,))
        rows = []
        for i, r in enumerate(rd, start=2):
            if None in r or any(v is None for v in r.values()):
                raise ValueError("line %d: wrong number of columns" % i)
            r = {k: v.strip() for k, v in r.items()}
            if not r["pose_code"]: raise ValueError("line %d: blank pose_code" % i)
            if r["joint"] not in KNOWN_JOINTS: raise ValueError("line %d: unknown joint %r" % (i, r["joint"]))
            if r["label"] not in ("EVIDENCE", "UNVERIFIED"): raise ValueError("line %d: unknown label %r" % (i, r["label"]))
            if r["base_captures_joint"] not in ("yes", "no", "unknown"):
                raise ValueError("line %d: unknown base_captures_joint %r" % (i, r["base_captures_joint"]))
            rows.append(r)
    return rows


def build(rows, levels_doc):
    levels, vparent = levels_doc["levels"], levels_doc["variant_parent"]
    for code, lv in levels.items():
        if lv not in LEVEL_NAMES: raise ValueError("bad level %r for %s" % (lv, code))
    poses = collections.OrderedDict()
    evidence = []
    row_no = collections.Counter()
    order = {"base": 0, "proxy": 1, "not_measured": 2}
    for r in rows:
        code = r["pose_code"]
        p = poses.get(code)
        if p is None:
            parent = vparent.get(code)
            fam = re.sub(r" \(prop variant.*\)", "", r["family"])
            p = poses[code] = {
                "code": code, "family_code": code[:3], "family": fam, "sanskrit": r["sanskrit"], "english": r["english"],
                "variant_of": parent, "level": levels.get(code) or (levels.get(parent) if parent else None),
                "sort_order": len(poses) + 1, "joints": collections.OrderedDict()}
        row_no[code] += 1
        key, status = (None, "not_measured") if r["joint"] == NONE_LISTED else base_key(r["joint"], r["direction"], r["base_captures_joint"])
        jid = None
        if r["joint"] != NONE_LISTED:
            jid = key if key else "x:%s:%s" % (r["joint"].lower(), canon_dir(r["direction"]))
            j = p["joints"].get(jid)
            if j is None:
                j = p["joints"][jid] = {
                    "joint_key": jid, "label": KEY_LABEL.get(key) or ("%s %s" % (r["joint"], canon_dir(r["direction"]) or "motion")).strip().capitalize(),
                    "base_key": key, "measure_status": status, "bilateral": bool(key and key in BILATERAL), "has_evidence": False}
            elif order[status] > order[j["measure_status"]]:
                j["measure_status"] = status       # the weaker status wins when rows for one joint disagree
                if status == "not_measured": j["base_key"], j["bilateral"] = None, False
            if r["label"] == "EVIDENCE": j["has_evidence"] = True
        mean, sd = parse_degrees(r["degrees"])
        evidence.append({
            "pose_code": code, "row_no": row_no[code], "joint_key": jid, "csv_joint": r["joint"], "direction": r["direction"],
            "label": r["label"], "degrees_raw": r["degrees"] or None, "mean_value": mean, "sd_value": sd,
            "source": r["source"] or None, "confidence": r["confidence"] or None, "test_method": r["test_method"] or None,
            "base_captures_joint": r["base_captures_joint"],
            "ankle_unit_mismatch": r["joint"] == "Ankle" and r["base_captures_joint"] == "yes"})
    for p in poses.values(): p["joints"] = list(p["joints"].values())
    return list(poses.values()), evidence


def quality(rows, poses, evidence):
    main = [p for p in poses if not p["variant_of"]]
    def cov(p):
        if not p["joints"]: return "no_joint"
        s = {j["measure_status"] for j in p["joints"]}
        return "full" if s == {"base"} else ("proxy" if s <= {"base", "proxy"} else "partial")
    C = collections.Counter
    return {
        "csv_rows": len(rows), "pose_codes": len(poses), "main_poses": len(main), "prop_variants": len(poses) - len(main),
        "rows_blank_degrees": sum(1 for r in rows if not r["degrees"]),
        "rows_with_degrees": sum(1 for r in rows if r["degrees"]),
        "rows_by_label": dict(C(r["label"] for r in rows)),
        "unverified_blank_degrees": sum(1 for r in rows if r["label"] == "UNVERIFIED" and not r["degrees"]),
        "evidence_blank_degrees": sum(1 for r in rows if r["label"] == "EVIDENCE" and not r["degrees"]),
        "ankle_rows_base_cm_vs_degrees": sum(1 for e in evidence if e["ankle_unit_mismatch"]),
        "poses_no_joint": sorted(p["code"] for p in poses if not p["joints"]),
        "coverage_main": dict(C(cov(p) for p in main)),
        "coverage_all": dict(C(cov(p) for p in poses)),
        "poses_missing_level": sorted(p["code"] for p in poses if not p["level"]),
        "joints_total": sum(len(p["joints"]) for p in poses),
        "joints_by_status": dict(C(j["measure_status"] for p in poses for j in p["joints"])),
        "signed_requirements": 0,
        "not_measured_joint_poses_main": sorted(
            ((k, v) for k, v in C(j["label"] for p in main for j in p["joints"] if j["measure_status"] == "not_measured").items()),
            key=lambda kv: (-kv[1], kv[0])),
    }


def q(v):
    """SQL literal. Single quotes doubled; no backslash escapes needed (standard_conforming_strings)."""
    if v is None: return "NULL"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return repr(v)
    s = str(v)
    if "\x00" in s: raise ValueError("NUL byte in text")
    return "'" + s.replace("'", "''") + "'"


def vals(rows, cols):
    return ",\n  ".join("(" + ", ".join(q(r[c]) for c in cols) + ")" for r in rows)


def gen_sql(poses, evidence):
    joints = [dict(j, pose_code=p["code"]) for p in poses for j in p["joints"]]
    pc = ["code", "family_code", "family", "sanskrit", "english", "variant_of", "level", "sort_order"]
    jc = ["pose_code", "joint_key", "label", "base_key", "measure_status", "bilateral", "has_evidence"]
    ec = ["pose_code", "row_no", "joint_key", "csv_joint", "direction", "label", "degrees_raw", "mean_value", "sd_value", "source",
          "confidence", "test_method", "base_captures_joint", "ankle_unit_mismatch"]
    # parents before variants (self FK)
    ordered = sorted(poses, key=lambda p: (p["variant_of"] is not None, p["sort_order"]))
    nposes, njoints, nev = len(poses), len(joints), len(evidence)
    sql = f"""-- DRAFT, NOT APPLIED. +Yoga pose load generated from {SOURCE_TAG} by scripts/yoga/load_yoga_poses.py. Do not hand-edit; re-generate.
-- Apply ONLY after migration 20261003040000_yoga_poses.sql, and only with Jim's go. Idempotent: safe to run twice.
-- Rules: no range number is loaded as a requirement. required_value / required_unit / range_source / signed_by / signed_at are NOT in any
-- column list below, so they stay NULL and every pose is GREY "Not rated" until a named teacher signs a range. A reload NEVER touches them.
-- Counts: {nposes} poses (incl. prop variants), {njoints} joint rows, {nev} evidence rows (one per CSV row).
BEGIN;

DO $$ BEGIN
  IF to_regclass('public.yoga_poses') IS NULL OR to_regclass('public.yoga_pose_joints') IS NULL OR to_regclass('public.yoga_pose_evidence') IS NULL THEN
    RAISE EXCEPTION 'yoga tables missing: apply migration 20261003040000_yoga_poses.sql first';
  END IF;
END $$;

INSERT INTO public.yoga_poses ({", ".join(pc)}) VALUES
  {vals(ordered, pc)}
ON CONFLICT (code) DO UPDATE SET
  family_code = EXCLUDED.family_code, family = EXCLUDED.family, sanskrit = EXCLUDED.sanskrit, english = EXCLUDED.english,
  variant_of = EXCLUDED.variant_of, level = EXCLUDED.level, sort_order = EXCLUDED.sort_order;

INSERT INTO public.yoga_pose_joints ({", ".join(jc)}) VALUES
  {vals(joints, jc)}
ON CONFLICT (pose_code, joint_key) DO UPDATE SET
  label = EXCLUDED.label, base_key = EXCLUDED.base_key, measure_status = EXCLUDED.measure_status,
  bilateral = EXCLUDED.bilateral, has_evidence = EXCLUDED.has_evidence;

INSERT INTO public.yoga_pose_evidence ({", ".join(ec)}) VALUES
  {vals(evidence, ec)}
ON CONFLICT (pose_code, row_no) DO UPDATE SET
  joint_key = EXCLUDED.joint_key, csv_joint = EXCLUDED.csv_joint, direction = EXCLUDED.direction, label = EXCLUDED.label,
  degrees_raw = EXCLUDED.degrees_raw, mean_value = EXCLUDED.mean_value, sd_value = EXCLUDED.sd_value, source = EXCLUDED.source,
  confidence = EXCLUDED.confidence, test_method = EXCLUDED.test_method, base_captures_joint = EXCLUDED.base_captures_joint,
  ankle_unit_mismatch = EXCLUDED.ankle_unit_mismatch;

DO $$ DECLARE n_p int; n_j int; n_e int; BEGIN
  SELECT count(*) INTO n_p FROM public.yoga_poses;
  SELECT count(*) INTO n_j FROM public.yoga_pose_joints;
  SELECT count(*) INTO n_e FROM public.yoga_pose_evidence;
  IF n_p < {nposes} OR n_j < {njoints} OR n_e < {nev} THEN
    RAISE EXCEPTION 'yoga load count check failed: poses %, joints %, evidence % (expected at least {nposes}, {njoints}, {nev})', n_p, n_j, n_e;
  END IF;
END $$;

COMMIT;
"""
    codes = ", ".join(q(p["code"]) for p in poses)
    rb = f"""-- DRAFT, NOT APPLIED. Rollback for yoga_poses_load.sql. Refuses to run if any pose has a teacher-signed range (it would erase it).
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.yoga_pose_joints WHERE required_value IS NOT NULL) THEN
    RAISE EXCEPTION 'a signed yoga range exists; do not roll back the load, export the signed ranges first';
  END IF;
END $$;
DELETE FROM public.yoga_pose_evidence WHERE pose_code IN ({codes});
DELETE FROM public.yoga_pose_joints WHERE pose_code IN ({codes});
DELETE FROM public.yoga_poses WHERE variant_of IS NOT NULL AND code IN ({codes});
DELETE FROM public.yoga_poses WHERE code IN ({codes});
COMMIT;
"""
    return sql, rb


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--csv", default=DEFAULT_CSV)
    ap.add_argument("--levels", default=DEFAULT_LEVELS)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--check", action="store_true", help="validate only, write nothing")
    ap.add_argument("--quiet", action="store_true", help="do not print the data-quality report")
    a = ap.parse_args(argv)
    rows = read_rows(a.csv)
    poses, evidence = build(rows, json.load(open(a.levels)))
    rep = quality(rows, poses, evidence)
    if not a.check:
        sql, rb = gen_sql(poses, evidence)
        os.makedirs(a.out, exist_ok=True)
        open(os.path.join(a.out, "yoga_poses_load.sql"), "w").write(sql)
        open(os.path.join(a.out, "yoga_poses_load.rollback.sql"), "w").write(rb)
        open(os.path.join(a.out, "yoga_load_report.json"), "w").write(json.dumps(rep, indent=1) + "\n")
        # number-free map used by the engine test (every pose, every joint, no requirement)
        pj = {p["code"]: [{k: j[k] for k in ("joint_key", "base_key", "measure_status", "bilateral")} for j in p["joints"]] for p in poses}
        open(os.path.join(a.out, "yoga_pose_joints.json"), "w").write(json.dumps(pj, indent=1) + "\n")
    if not a.quiet: print(json.dumps(rep, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
