// P1-17 test fixture: one Base user, assessed Fri Nov 13, 2026 9:00 AM ET (day 3 local = Mon Nov 16), reminder 07:00 ET, P1-01 opt-in.
import type { Candidate } from "../source/logic.ts";

export const U = "11111111-1111-4111-8111-111111111111";
export const ALL = { all: true, canary: new Set<string>() };
// Assessment Fri Nov 13, 2026, 9:00 AM ET. Day 3 local = Mon Nov 16.
export const ASSESSED = "2026-11-13T14:00:00Z";
export const at = (iso: string) => new Date(iso);
export function cand(over: Partial<Candidate> = {}): Candidate {
  return {
    user_id: U, email: "user@example.com", full_name: "Sam Lee", active_sport: "base", base_status: "active", marketing_opt_out: false,
    is_test: false, deletion_requested: false,
    pref: { reminder_time: "07:00", timezone: "America/New_York", email_reminders: true, protocol_opt_in_at: "2026-11-13T15:00:00Z" },
    full_assessments: [{ id: "aaaaaaaa-0000-4000-8000-000000000001", assessed_at: ASSESSED, red_flag_triggered: false }],
    ranked_joint_keys: ["hip_ir", "shoulder_flex", "cervical_rot"], sessions_since: [], last_user_message_at: null, next_check_at: "2026-11-20T14:00:00Z",
    ...over,
  };
}
