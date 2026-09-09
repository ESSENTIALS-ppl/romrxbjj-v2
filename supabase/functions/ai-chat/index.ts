// ROMRx AI Chat v31 -- sport-aware (PR #5)
// - Resolves user's active_sport server-side (was trusted from client)
// - RAG filters rombot_knowledge by (sport='general' OR sport=active_sport)
// - Coach mode: roster-level system prompt
// - Athlete mode: individual context
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  DEFAULT_LIMITS,
  enforceRateLimit,
  checkRateLimit,
  rateLimitKey,
  clientIp,
  tooManyRequests,
} from "../_shared/rate_limit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ROMRX_OPENAI_KEY = Deno.env.get("romrx_openai_key") ?? "";
const ROMRX_ANTHROPIC_KEY = Deno.env.get("romrx_anthropic_key") ?? "";

function jwtRole(jwt: string): string {
  try { return JSON.parse(atob(jwt.split(".")[1]))?.role ?? "anon"; }
  catch { return "anon"; }
}

const JOINT_LABELS: Record<string, string> = {
  hip_er: "hip external rotation", hip_ir: "hip internal rotation",
  hip_abd: "hip abduction", hip_flex: "hip flexion",
  shoulder_er: "shoulder external rotation", shoulder_flex: "shoulder flexion",
  ankle_df: "ankle mobility", lumbar_flex: "lumbar flexion",
  lumbar_ext: "lumbar extension", thoracic_rot: "thoracic rotation",
  cervical_rot: "neck rotation",
};
function labelJoint(key: string): string {
  return JOINT_LABELS[key] ?? key.replace(/_/g, " ");
}

// -- Coach roster system prompt ----------------------------------------------
function buildCoachSystemPrompt(coachName: string, rosterContexts: Array<Record<string, unknown>>): string {
  const athleteSections = rosterContexts.map((ctx) => {
    const name       = (ctx.full_name as string | null) ?? "Unknown Athlete";
    const belt       = (ctx.belt as string | null) ?? "white";
    const summary    = ctx.technique_summary as Record<string, number> | null;
    const worst      = ctx.worst_joints as string[] | null;
    const greenTechs = ctx.green_techniques as Array<{name: string; category: string}> | null;
    const yellowTechs = ctx.yellow_techniques as Array<{name: string; category: string; limiting_joints: string[] | null}> | null;
    const savedPlans = ctx.saved_game_plans as Array<{name: string; path_mode: string}> | null;

    const greenByCategory = (greenTechs ?? []).reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t.name);
      return acc;
    }, {} as Record<string, string[]>);
    const greenSection = Object.entries(greenByCategory).length > 0
      ? Object.entries(greenByCategory).map(([cat, names]) => `    ${cat}: ${names.join(", ")}`).join("\n")
      : "    No assessment yet";

    const yellowSection = yellowTechs && yellowTechs.length > 0
      ? yellowTechs.map(t => {
          const joints = (t.limiting_joints ?? []).map(j => labelJoint(j)).join(", ");
          return `    ${t.name} (${t.category})${joints ? ` - ${joints} limiting` : ""}`;
        }).join("\n")
      : "    No assessment yet";

    const plansSection = savedPlans && savedPlans.length > 0
      ? savedPlans.map(p => `    "${p.name}" (${p.path_mode})`).join("\n")
      : "    None saved yet";

    return `### ${name} (${belt} belt)\n  Readiness: ${summary ? `${summary.green ?? 0} GREEN / ${summary.yellow ?? 0} YELLOW / ${summary.red ?? 0} RED` : "No assessment"}\n  Priority joints: ${worst?.map(j => labelJoint(j)).join(", ") ?? "No data"}\n  GREEN techniques (ready to train):\n${greenSection}\n  YELLOW techniques (train with awareness):\n${yellowSection}\n  Saved game plans:\n${plansSection}`;
  });

  return `You are ROMBot, the team intelligence assistant for ROMRxBJJ coach ${coachName}.\n\nYou have full access to ALL of your athletes' ROM profiles, technique readiness, and saved game plans. Use this data to answer coaching questions with specificity.\n\n## Your Roster (${rosterContexts.length} athlete${rosterContexts.length !== 1 ? "s" : ""})\n\n${athleteSections.join("\n\n")}\n\n## Your Role as Coach ROMBot\n- Answer questions about individual athletes or the whole team by name\n- Identify who is most at risk, who is ready to train hard, who needs modified work\n- Suggest technique readiness comparisons across the roster\n- Help build game plans for specific athletes based on their GREEN/YELLOW profile\n- Suggest drill assignments and mobility priorities per athlete\n- Reference saved game plans by name\n\n## Critical Rules\n- NEVER reveal specific degree values or ROM thresholds - these are proprietary\n- NEVER use technique codes (e.g. WT-1) - use technique names only\n- Reference joint restrictions with soft language: "hip IR is restricted", "shoulder flexion is limited"\n- Use technique names from each athlete's GREEN/YELLOW lists when making recommendations\n- Be direct and coaching-focused. You are talking to a professional.\n\nKeep responses concise and actionable. Use bullet points. Always tie advice to actual athlete data.`;
}
