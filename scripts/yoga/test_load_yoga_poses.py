#!/usr/bin/env python3
"""Tests for the +Yoga loader. Run from the repo root:  python3 -m unittest scripts/yoga/test_load_yoga_poses.py -v
No database, no network. (Optional extra: PGLITE_BASE=... node scripts/yoga/sql_smoke.mjs runs the SQL in an in-memory Postgres.)"""
import csv, io, json, os, re, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import load_yoga_poses as L  # noqa: E402

ROWS = L.read_rows(L.DEFAULT_CSV)
with open(L.DEFAULT_LEVELS) as _f: LEVELS = json.load(_f)
POSES, EVID = L.build(ROWS, LEVELS)
SQL, RB = L.gen_sql(POSES, EVID)


class Counts(unittest.TestCase):
    def test_csv_shape(self):
        self.assertEqual(len(ROWS), 515)
        self.assertEqual(len({r["pose_code"] for r in ROWS}), 169)
        self.assertEqual(sum(1 for r in ROWS if not r["degrees"]), 475)
        self.assertEqual(len(POSES), 169)
        self.assertEqual(len([p for p in POSES if not p["variant_of"]]), 159)
        self.assertEqual(len(EVID), 515)

    def test_levels(self):
        main = [p for p in POSES if not p["variant_of"]]
        got = {lv: sum(1 for p in main if p["level"] == lv) for lv in L.LEVEL_NAMES}
        self.assertEqual(got, {"Settle": 23, "Steady": 37, "Flow": 44, "Open": 55})
        self.assertTrue(all(p["level"] for p in POSES))

    def test_no_joint_poses(self):
        self.assertEqual(sorted(p["code"] for p in POSES if not p["joints"]), ["PRN03", "RST01", "RST02", "RST11", "SUN01"])

    def test_coverage(self):
        q = L.quality(ROWS, POSES, EVID)
        self.assertEqual(q["coverage_main"], {"partial": 145, "proxy": 5, "full": 5, "no_joint": 4})
        self.assertEqual(q["ankle_rows_base_cm_vs_degrees"], 16)
        self.assertEqual(q["signed_requirements"], 0)
        full = sorted(p["code"] for p in POSES if not p["variant_of"] and p["joints"] and all(j["measure_status"] == "base" for j in p["joints"]))
        self.assertEqual(full, ["COR03", "INV03", "INV10", "STD10", "SUP08"])


class NullRequirements(unittest.TestCase):
    """Blank / unsigned requirements are stored as NULL, so they render GREY."""

    def test_generated_sql_never_writes_a_requirement(self):
        body = "\n".join(l for l in SQL.splitlines() if not l.lstrip().startswith("--"))   # comments may explain the rule
        for col in ("required_value", "required_unit", "range_source", "signed_by", "signed_at"):
            self.assertNotIn(col, body, col)   # not in any column list, SET list or value list
        # the rollback is the only file that mentions required_value (it refuses to run if one exists)
        self.assertIn("required_value IS NOT NULL", RB)

    def test_evidence_numbers_are_not_requirements(self):
        parsed = [e for e in EVID if e["mean_value"] is not None]
        self.assertEqual(len(parsed), 40)                    # the 40 non-blank degree cells
        self.assertTrue(all(e["label"] == "EVIDENCE" for e in parsed))
        self.assertEqual(sum(1 for e in EVID if e["degrees_raw"] is None), 475)

    def test_no_script_path_connects_to_a_database(self):
        with open(os.path.join(HERE, "load_yoga_poses.py")) as f: src = f.read()
        code = re.sub(r'""".*?"""', "", src, flags=re.S)
        for word in ("psycopg", "psql", "import supabase", "requests", "urllib", "socket", "subprocess", "os.system"):
            self.assertNotIn(word, code, word)


class Idempotent(unittest.TestCase):
    def test_deterministic(self):
        sql2, rb2 = L.gen_sql(*L.build(L.read_rows(L.DEFAULT_CSV), LEVELS))
        self.assertEqual((SQL, RB), (sql2, rb2))

    def test_upserts_only_touch_descriptive_columns(self):
        self.assertEqual(SQL.count("ON CONFLICT (code) DO UPDATE"), 1)
        self.assertEqual(SQL.count("ON CONFLICT (pose_code, joint_key) DO UPDATE"), 1)
        self.assertEqual(SQL.count("ON CONFLICT (pose_code, row_no) DO UPDATE"), 1)
        self.assertNotIn("DELETE", SQL)
        self.assertNotIn("TRUNCATE", SQL)
        self.assertNotIn("DROP ", SQL)
        self.assertTrue(SQL.startswith("-- DRAFT, NOT APPLIED"))
        self.assertTrue(RB.startswith("-- DRAFT, NOT APPLIED"))

    def test_variants_after_parents(self):
        first = re.search(r"INSERT INTO public\.yoga_poses \([^)]*\) VALUES\n(.*?)\nON CONFLICT", SQL, re.S).group(1)
        order = re.findall(r"^\s*\('([A-Z0-9-]+)'", first, re.M)
        seen = set()
        variant_of = {p["code"]: p["variant_of"] for p in POSES}
        for c in order:
            if variant_of[c]: self.assertIn(variant_of[c], seen, c)
            seen.add(c)
        self.assertEqual(len(order), 169)

    def test_output_files_are_written_and_stable(self):
        with tempfile.TemporaryDirectory() as d:
            self.assertEqual(L.main(["--out", d, "--quiet"]), 0)
            with open(os.path.join(d, "yoga_poses_load.sql")) as f: a = f.read()
            L.main(["--out", d, "--quiet"])
            with open(os.path.join(d, "yoga_poses_load.sql")) as f: self.assertEqual(a, f.read())
            self.assertEqual(sorted(os.listdir(d)), ["yoga_load_report.json", "yoga_pose_joints.json", "yoga_poses_load.rollback.sql", "yoga_poses_load.sql"])
        # the committed copy matches a fresh run
        with open(os.path.join(L.DEFAULT_OUT, "yoga_poses_load.sql")) as f: committed = f.read()
        self.assertEqual(committed, SQL)

    def test_check_mode_writes_nothing(self):
        with tempfile.TemporaryDirectory() as d:
            L.main(["--check", "--quiet", "--out", os.path.join(d, "x")])
            self.assertFalse(os.path.exists(os.path.join(d, "x")))


class Parsing(unittest.TestCase):
    def test_degree_text(self):
        self.assertEqual(L.parse_degrees("44.1 +/- 8.8"), (44.1, 8.8))
        self.assertEqual(L.parse_degrees("-13.8 (SD 3.3)"), (-13.8, 3.3))     # paper sign kept
        self.assertEqual(L.parse_degrees("-1.5 (1.3)"), (-1.5, 1.3))
        self.assertEqual(L.parse_degrees("+16.4 (SD 2.7)"), (16.4, 2.7))
        self.assertEqual(L.parse_degrees("-9.5 +/- 6.1 (paper sign: negative = extension past 0)"), (-9.5, 6.1))
        self.assertEqual(L.parse_degrees(""), (None, None))
        self.assertEqual(L.parse_degrees("  "), (None, None))
        self.assertEqual(L.parse_degrees("n/a"), (None, None))

    def test_sql_quoting(self):
        self.assertEqual(L.q("Child's Pose"), "'Child''s Pose'")
        self.assertEqual(L.q(None), "NULL")
        self.assertEqual(L.q(True), "true")
        self.assertEqual(L.q(3), "3")
        with self.assertRaises(ValueError): L.q("a\x00b")
        self.assertIn("''", SQL)                                 # apostrophes in names / sources were escaped

    def test_base_key_mapping(self):
        self.assertEqual(L.base_key("Hip", "Flexion, knee straight", "yes"), ("hip_flex", "base"))
        self.assertEqual(L.base_key("Hip", "Flexion, knee bent", "no"), (None, "not_measured"))   # never scored with the SLR number
        self.assertEqual(L.base_key("Ankle", "Dorsiflexion, knee bent", "yes"), ("ankle_df", "base"))
        self.assertEqual(L.base_key("Spine", "Extension (lumbar and thoracic not separable)", "unknown"), ("lumbar_ext", "proxy"))
        self.assertEqual(L.base_key("Knee", "Flexion", "no"), (None, "not_measured"))
        self.assertEqual(L.base_key("Hip", "Extension", "no"), (None, "not_measured"))

    def test_bad_input_is_rejected(self):
        def write(rows, header=None):
            f = tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, newline="", encoding="utf-8")
            w = csv.writer(f); w.writerow(header or L.HEADER)
            for r in rows: w.writerow(r)
            f.close(); self.addCleanup(os.unlink, f.name); return f.name
        ok = ["X1", "Fam", "s", "e", "Hip", "Flexion", "", "UNVERIFIED", "src", "n/a", "tm", "no"]
        self.assertEqual(len(L.read_rows(write([ok]))), 1)
        with self.assertRaises(ValueError): L.read_rows(write([ok], header=L.HEADER[:-1]))
        with self.assertRaises(ValueError): L.read_rows(write([ok[:5] + ["Flexion"]]))                  # short row
        with self.assertRaises(ValueError): L.read_rows(write([ok[:4] + ["Toe"] + ok[5:]]))              # unknown joint
        with self.assertRaises(ValueError): L.read_rows(write([ok[:7] + ["GUESS"] + ok[8:]]))            # unknown label
        with self.assertRaises(ValueError): L.read_rows(write([[""] + ok[1:]]))                          # blank code
        bad = [ok[:11] + ["maybe"]]
        with self.assertRaises(ValueError): L.read_rows(write(bad))


if __name__ == "__main__":
    unittest.main()
