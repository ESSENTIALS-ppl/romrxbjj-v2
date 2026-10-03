// +Yoga pose color (pure, no Deno/Supabase imports, DRAFT, not wired into index.ts so compute-tiers v43 is unchanged).
// Reuses the #74 engine rule (rule.ts): flat 10 degrees YELLOW (ankle 2 cm), worst measured joint wins, GREY never GREEN,
// hip external rotation bars of 50+ are GREY (Legal), a two-sided joint needs both sides (ONE_SIDE_MISSING_POLICY = grey).
// Yoga differences:
//   - the requirement is yoga_pose_joints.required_value, which is NULL until a NAMED teacher signs it (range_source COACH-SET).
//     No signed range => GREY. Quinn's paper averages (yoga_pose_evidence) are never read here.
//   - a joint Base does not measure (measure_status not_measured) is GREY; a lumbar-for-spine proxy is GREY unless acceptProxy.
//   - a degree range on the ankle is GREY (unit_mismatch): Base stores the ankle in cm (F-17).
//   - no dominant side in yoga: laterality_rule NULL = the worse side decides (as the front end does).
// Output carries names, colors and reasons only, never a number.
import { athleteValue, classifyJoint, GREY_BEATS_YELLOW, isNoReferenceBar, type Status } from "./rule.ts";

export type YogaMeasureStatus = "base" | "proxy" | "not_measured";
export type YogaGreyReason =
  | "no_joints" | "no_range_signed" | "not_measured_by_base" | "missing_value" | "proxy_not_accepted" | "unit_mismatch" | "no_reference_range";
export interface YogaJointRow {
  joint_key: string;
  base_key: string | null;
  measure_status: YogaMeasureStatus;
  required_value: number | string | null;
  required_unit: "deg" | "cm" | null;
  laterality_rule?: string | null;
}
export interface YogaJointResult { joint: string; status: Status; reason?: YogaGreyReason }
export interface YogaPoseResult { tier: Status; grey_reason: YogaGreyReason | null; joint_status: YogaJointResult[] }

// PENDING JIM (Quinn spec Q: accept the lumbar test as a stand-in for spine flexion/extension?). Default NO: proxy joints are GREY.
export const YOGA_ACCEPT_PROXY = false;

// most specific reason first (same order the front end uses)
const REASON_ORDER: YogaGreyReason[] = ["no_reference_range", "no_range_signed", "missing_value", "proxy_not_accepted", "unit_mismatch", "not_measured_by_base"];

function signedNumber(v: unknown): number | null {
  if (v == null || v === "" || typeof v === "boolean") return null;
  const n = typeof v === "number" ? v : Number(v);
  return isFinite(n) && n > 0 ? n : null;
}

export function classifyYogaJoint(a: Record<string, unknown>, j: YogaJointRow, acceptProxy = YOGA_ACCEPT_PROXY): YogaJointResult {
  const grey = (reason: YogaGreyReason): YogaJointResult => ({ joint: j.joint_key, status: "GREY", reason });
  if (j.measure_status === "not_measured" || !j.base_key) return grey("not_measured_by_base");
  const req = signedNumber(j.required_value);
  if (req == null) return grey("no_range_signed");
  if (j.measure_status === "proxy" && !acceptProxy) return grey("proxy_not_accepted");
  const expect = j.base_key === "ankle_df" ? "cm" : "deg";
  if (j.required_unit !== expect) return grey("unit_mismatch");
  if (isNoReferenceBar(j.base_key, req)) return grey("no_reference_range");
  const v = athleteValue(a, j.base_key, j.laterality_rule ?? null, null);
  if (v == null) return grey("missing_value");
  return { joint: j.joint_key, status: classifyJoint(v, req, j.base_key) };
}

export function classifyYogaPose(a: Record<string, unknown>, joints: YogaJointRow[], acceptProxy = YOGA_ACCEPT_PROXY): YogaPoseResult {
  if (joints.length === 0) return { tier: "GREY", grey_reason: "no_joints", joint_status: [] };
  const js = joints.map((j) => classifyYogaJoint(a, j, acceptProxy));
  const has = (s: Status) => js.some((x) => x.status === s);
  const reason = (): YogaGreyReason => {
    const rs = js.filter((x) => x.status === "GREY").map((x) => x.reason!);
    return REASON_ORDER.find((r) => rs.includes(r)) ?? rs[0];
  };
  if (has("RED")) return { tier: "RED", grey_reason: null, joint_status: js };
  if (GREY_BEATS_YELLOW && has("GREY")) return { tier: "GREY", grey_reason: reason(), joint_status: js };
  if (has("YELLOW")) return { tier: "YELLOW", grey_reason: null, joint_status: js };
  if (has("GREY")) return { tier: "GREY", grey_reason: reason(), joint_status: js };
  return { tier: "GREEN", grey_reason: null, joint_status: js };
}
