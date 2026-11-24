import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient as N } from "jsr:@supabase/supabase-js@2";
import { isCrisisMessage, isMoodQuestion, loadMoodForAi, moodPromptBlock, composeMoodReply, stripMoodHistory, isMoodTipRequest, tipRequestReply, MOOD_CONSENT_OFF_REPLY, MOOD_NO_DATA_REPLY, MOOD_ERROR_REPLY, MOOD_PROVIDER_REPLY } from "./romood_chat.js";

const q = Deno.env.get("SUPABASE_URL");
const x = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const P = Deno.env.get("romrx_openai_key") ?? "";
const Y = Deno.env.get("romrx_anthropic_key") ?? "";
// Fail-safe flag reader: ON only for exactly "on".
function flagOn(v) { return v === "on"; }
// ROMBot chat model. Rollback without a redeploy: set secret ROMBOT_OPENAI_MODEL=gpt-4o.
const ROMBOT_OPENAI_MODEL = Deno.env.get("ROMBOT_OPENAI_MODEL") ?? "gpt-6-luna";
function openaiChatParams(model) {
  // Legacy GPT-4 family takes max_tokens + temperature. GPT-6 family is a reasoning model:
  // max_completion_tokens, reasoning_effort "none" for chat-speed answers.
  if (/^gpt-4/.test(model)) return { model, max_tokens: 800, temperature: 0.2 };
  return { model, max_completion_tokens: 800, reasoning_effort: "none" };
}

function U(n) {
  try {
    return JSON.parse(atob(n.split(".")[1]))?.role ?? "anon";
  } catch {
    return "anon";
  }
}

const J = {
  hip_er: "hip external rotation",
  hip_ir: "hip internal rotation",
  hip_abd: "hip abduction",
  hip_flex: "hip flexion",
  shoulder_er: "shoulder external rotation",
  shoulder_flex: "shoulder flexion",
  ankle_df: "ankle mobility",
  lumbar_flex: "lumbar flexion",
  lumbar_ext: "lumbar extension",
  thoracic_rot: "thoracic rotation",
  cervical_rot: "neck rotation",
  cervical_lat: "neck lateral flexion",
  cervical_flex: "neck flexion",
  cervical_ext: "neck extension",
};

function R(n) {
  if (n == null || n === "") return "";
  return J[n] ?? String(n).replace(/_/g, " ");
}

/**
 * FG-36 (Nov 2 2026, Grant final, target 120 Jim override): the HIP_FLEX_UNSCORED switch is gone. Hip flexion is scored (target 120 per Jim, one config in SQL
 * hip_flex_target()), but only for assessments created after the DB cutover. ROMBot reads stored joint_scores / worst_joints,
 * which for a pre-cutover assessment simply have no hip_flex row, so no filter is needed here: the data is the truth and old
 * results read exactly as before. isUnscoredJoint stays as a no-op so callers and tests keep their shape.
 */
function isUnscoredJoint(_k) {
  return false;
}
/** Drop unscored joints from a list of joint keys or joint_scores rows; anything else passes through. */
function scoredOnly(list) {
  return Array.isArray(list) ? list.filter((e) => !isUnscoredJoint(typeof e === "string" ? e : jointKeyOf(e))) : list;
}

/** Map joint_scores score (1|2|3) or internal aliases to Base band labels. */
function bandFromScore(score) {
  if (score === 1 || score === "1" || score === "at_risk" || score === "red" || score === "needs_focus") {
    return "Needs focus";
  }
  if (score === 2 || score === "2" || score === "building" || score === "yellow") {
    return "Building";
  }
  if (score === 3 || score === "3" || score === "steady" || score === "green") {
    return "Steady";
  }
  return null;
}

function jointKeyOf(row) {
  return row?.joint_key ?? row?.joint ?? row?.key ?? "";
}

function scoreNumFromJoint(score) {
  if (score === 1 || score === "1" || score === "at_risk" || score === "red" || score === "needs_focus") {
    return 1;
  }
  if (score === 2 || score === "2" || score === "building" || score === "yellow") {
    return 2;
  }
  if (score === 3 || score === "3" || score === "steady" || score === "green") {
    return 3;
  }
  return null;
}

/** Worst joint_scores band → Needs focus / Building / Steady. Null if none. */
function overallBandFromJointScores(jointScores) {
  let worst = null;
  for (const row of jointScores ?? []) {
    if (/^lumbar_(flex|ext)$/.test(String(jointKeyOf(row)))) continue; // Grant Oct 21 2026 7:20 PM: lumbar out of the overall band (saved rows kept)
    const n = scoreNumFromJoint(row?.score);
    if (n == null) continue;
    if (worst == null || n < worst) worst = n;
  }
  if (worst === 1) return "Needs focus";
  if (worst === 2) return "Building";
  if (worst === 3) return "Steady";
  return null;
}

function formatMobilityBands(jointScores) {
  const needs = [];
  const building = [];
  const steady = [];
  for (const row of jointScores ?? []) {
    const key = jointKeyOf(row);
    if (!key) continue;
    const label = R(key);
    const band = bandFromScore(row?.score);
    if (band === "Needs focus") needs.push(label);
    else if (band === "Building") building.push(label);
    else if (band === "Steady") steady.push(label);
  }
  const line = (arr) => (arr.length > 0 ? arr.join(", ") : "None listed");
  return [
    `  Needs focus: ${line(needs)}`,
    `  Building: ${line(building)}`,
    `  Steady: ${line(steady)}`,
  ].join("\n");
}

/**
 * Oct 12 2026 (Jim, Oct 6 6:36 PM): a person's OWN ROM numbers are not proprietary, so ROMBot may share them.
 * Only the per-technique sport thresholds (techniques.*_min) stay proprietary; they are never put in the prompt.
 * Lists the joints that have a stored score row. Ankle is in cm, everything else in degrees.
 */
function formatMeasurements(jointScores, romTotal) {
  const lines = [];
  for (const row of jointScores ?? []) {
    const key = jointKeyOf(row);
    if (!key) continue;
    const unit = String(key).startsWith("ankle_df") ? " cm" : "°";
    const fmt = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : `${Number(v)}${unit}`);
    const left = fmt(row?.left ?? row?.left_value);
    const right = fmt(row?.right ?? row?.right_value);
    const value = fmt(row?.value);
    const parts = left || right
      ? [left ? `left ${left}` : null, right ? `right ${right}` : null].filter(Boolean).join(", ")
      : value;
    if (!parts) continue;
    const band = bandFromScore(row?.score);
    lines.push(`  ${R(key)}: ${parts}${band ? ` (${band})` : ""}`);
  }
  if (lines.length === 0) return "  No measurements on file yet";
  const total = romTotal == null || romTotal === "" ? null : Number(romTotal);
  if (total != null && !Number.isNaN(total)) lines.push(`  Overall ROM score: ${total}/100`);
  return lines.join("\n");
}

function formatProtocol(protocol) {
  if (protocol && protocol.length > 0) {
    return protocol
      .map((e) => {
        const t = e;
        // v96d (Jim: "ROMBot to say 3 sets of 10 for everyone"; timed holds keep their time):
        // - rep-based line (reps is a rep count/range, null/blank, or mentions "rep", e.g. "up to 5 reps, holds up to 5 sec each"):
        //   always exactly "3 sets of 10", whatever sets/reps are stored.
        // - timed hold/stretch (reps has a duration - sec/min/hold - and no "rep"): "<sets> sets of <stored reps>" (sets as stored;
        //   "1 set of"); sets null/blank => the stored time alone. Never prints "null"/"undefined".
        const repsText = t.reps != null ? String(t.reps).trim() : "";
        const isTimed = repsText !== "" && !/\brep/i.test(repsText) && /(\b(sec|secs|second|seconds|min|mins|minute|minutes|hold|holds|holding)\b|\d\s*s\b)/i.test(repsText);
        const hasSets = t.sets != null && String(t.sets).trim() !== "";
        const setsReps = !isTimed
          ? "3 sets of 10"
          : hasSets
            ? `${t.sets} ${Number(t.sets) === 1 ? "set" : "sets"} of ${repsText}`
            : repsText;
        return `  ${t.joint ?? t.jointKey ?? t.joint_key}: ${t.exercise} - ${setsReps} (${t.cue ?? t.coaching_cue})`;
      })
      .join("\n");
  }
  return "  Daily plan pending generation for this assessment (or no assessment yet).";
}

// ---------------------------------------------------------------------------------------------------------------------------
// PRIVACY ALLOW-LIST (Jim Nov 2 2026 6:09 PM, "the privacy lines must be true in code").
// The ONLY user-derived data that may reach the model: this conversation's chat, name, game plan names, readiness results
// (joint degrees and bands, and what is derived from them: priority joints, technique readiness) and the daily protocol.
// NEVER: age, gender, injury or free-text notes, email, billing / subscription, belt (user-level OR technique-level: dropped from the allow-list and from the prompt line, Vera 6:37 PM), platforms, red-flag reasons, dates of birth.
// Mood: nothing in rombot_context carries mood. ROMood check-ins are read ONLY in romood_chat.js (loadMoodForAi), and only when the
// ROMBOT_MOOD flag is exactly "on" AND the asking user's own mood_settings row is the v3 opt-in (saving_on, tick time, v3-rombot-20261028).
// Rows are rebuilt field by field below, so a new column on the rombot_context view can never reach the prompt by accident.
// ---------------------------------------------------------------------------------------------------------------------------
const CONTEXT_SELECT =
  "user_id, full_name, latest_assessment_id, rom_total, worst_joints, joint_scores, technique_summary, red_techniques, green_techniques, yellow_techniques, protocol, saved_game_plans";
const pickKeys = (o, keys) => {
  const out = {};
  if (o && typeof o === "object") for (const k of keys) if (o[k] !== undefined) out[k] = o[k];
  return out;
};
const mapArr = (a, f) => (Array.isArray(a) ? a.map(f) : a);
function allowListContext(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  return {
    ...pickKeys(r, ["full_name", "latest_assessment_id", "rom_total"]),
    ...(r.worst_joints !== undefined ? { worst_joints: mapArr(r.worst_joints, (k) => String(k)) } : {}),
    ...(r.joint_scores !== undefined
      ? { joint_scores: mapArr(r.joint_scores, (e) => pickKeys(e, ["joint_key", "joint", "key", "score", "left", "right", "left_value", "right_value", "value"])) }
      : {}),
    ...(r.technique_summary !== undefined ? { technique_summary: pickKeys(r.technique_summary, ["green", "yellow", "red"]) } : {}),
    ...Object.fromEntries(
      ["green_techniques", "yellow_techniques", "red_techniques"]
        .filter((k) => r[k] !== undefined)
        .map((k) => [k, mapArr(r[k], (e) => pickKeys(e, ["name", "category", "limiting_joints"]))])
    ),
    ...(r.protocol !== undefined
      ? { protocol: mapArr(r.protocol, (e) => pickKeys(e, ["joint", "jointKey", "joint_key", "exercise", "sets", "reps", "cue", "coaching_cue"])) }
      : {}),
    ...(r.saved_game_plans !== undefined
      ? { saved_game_plans: mapArr(r.saved_game_plans, (e) => ({ ...pickKeys(e, ["name", "path_mode"]), techniques: mapArr(e?.techniques ?? [], (t) => pickKeys(t, ["name"])) })) }
      : {}),
    ...(typeof r.assessment_history === "string" ? { assessment_history: r.assessment_history } : {}),
  };
}

function formatSavedPlans(saved) {
  if (saved && saved.length > 0) {
    return saved
      .map((e) => {
        const t = (e.techniques ?? []).map((b) => b.name).join(" > ");
        return `  "${e.name}" (${e.path_mode}): ${t}`;
      })
      .join("\n");
  }
  return "  No saved game plans yet";
}

function isBaseSport(l) {
  const s = String(l ?? "").toLowerCase();
  return s === "general" || s === "base";
}

/** Grant Nov 2 7:04 PM: the coach roster sends the athlete's DISPLAY NAME only, never an email or other contact detail.
 * A display name is free text, so an athlete who typed an email or phone number as their name must not leak it either: those parts are removed
 * (the rest of the name stays), and a name that is nothing but contact details becomes "Unknown Athlete". */
function rosterName(raw) {
  const t = typeof raw === "string" ? raw : "";
  const cleaned = t
    .replace(/[^\s@<>()]+@[^\s@<>()]+/g, " ")         // email-like
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")           // links
    .replace(/(?:\+?\d[\s().-]{0,2}){7,}/g, " ")            // phone-like (7+ digits in a run)
    .replace(/[<>()]/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, 80);
  return cleaned || "Unknown Athlete";
}

/** Coach roster prompt - unchanged behavior. */
function D(n, l) {
  const g = l.map((c) => {
    const o = rosterName(c.full_name);
    const s = c.technique_summary;
    const h = scoredOnly(c.worst_joints);
    const a = c.green_techniques;
    const r = c.yellow_techniques;
    const p = c.saved_game_plans;
    const u = (a ?? []).reduce((i, e) => {
      (i[e.category] || (i[e.category] = []), i[e.category].push(e.name), i);
      return i;
    }, {});
    const f =
      Object.entries(u).length > 0
        ? Object.entries(u)
            .map(([i, e]) => `    ${i}: ${e.join(", ")}`)
            .join("\n")
        : "    No assessment yet";
    const d =
      r && r.length > 0
        ? r
            .map((i) => {
              const e = (i.limiting_joints ?? []).map((t) => R(t)).join(", ");
              return `    ${i.name} (${i.category})${e ? ` - ${e} limiting` : ""}`;
            })
            .join("\n")
        : "    No assessment yet";
    const w =
      p && p.length > 0
        ? p.map((i) => `    "${i.name}" (${i.path_mode})`).join("\n")
        : "    None saved yet";
    return `### ${o}
  Readiness: ${s ? `${s.green ?? 0} GREEN / ${s.yellow ?? 0} YELLOW / ${s.red ?? 0} RED` : "No assessment"}
  Priority joints: ${h?.map((i) => R(i)).join(", ") ?? "No data"}
  GREEN techniques (ready to train):
${f}
  YELLOW techniques (train with awareness):
${d}
  Saved game plans:
${w}`;
  });
  return `You are ROMBot, the team intelligence assistant for ROMRxBJJ coach ${n}.

You have full access to ALL of your athletes' ROM profiles, technique readiness, and saved game plans. Use this data to answer coaching questions with specificity.

## Your Roster (${l.length} athlete${l.length !== 1 ? "s" : ""})

${g.join("\n\n")}

## Your Role as ROMBot
- Answer questions about individual athletes or the whole team by name
- Identify who is most at risk, who is ready to train hard, who needs modified work
- Suggest technique readiness comparisons across the roster
- Help build game plans for specific athletes based on their GREEN/YELLOW profile
- Suggest drill assignments and mobility priorities per athlete
- Reference saved game plans by name

## Critical Rules
- NEVER reveal specific degree values or ROM thresholds - these are proprietary
- NEVER use technique codes (e.g. WT-1) - use technique names only
- Reference joint restrictions with soft language: "hip IR is restricted", "shoulder flexion is limited"
- Use technique names from each athlete's GREEN/YELLOW lists when making recommendations
- Never say or suggest that a user's mobility protects them from injury, makes a technique or position safe, or helps them defend, escape, or resist a submission or attack. Describe only how their range compares to what the position asks of the body, as a training focus.
- When a user asks whether mobility or anything else is safe, okay, protective, or whether it helps them escape, defend, resist, or stay protected, give exactly this line: "I can't tell you whether this is okay for your body. That's your call to make. If you're unsure or something hurts, stop and check with a medical professional." Then continue the conversation normally: answer the rest of the question and keep helping with their own data and plan. Never give a safety verdict: never say whether something is safe or okay, or that their mobility protects them or helps them escape, defend, or resist.
- If the user asks whether they are cleared, approved, or allowed to train, or uses the word cleared, begin your reply with the exact safety line, unreworded. Then add exactly: "ROMRx does not approve or sign off on training."
- If any part of a question asks about safe, okay, protective, escape, defend, or resist, begin your reply with the exact safety line, unreworded. Never answer the safety part itself.
- A question like "am I ready to train today" is a data question. Answer it from the user's own measurements and plan, with no safety line.
- After the exact line, continue the conversation normally on every question: answer the rest from the user's own data and plan, never with a verdict.
- Not medical advice. Never give medical advice, treatment, icing/self-care instructions, diagnosis, or emergency triage beyond directing to emergency services. If asked about injury treatment, icing, or meds, refuse and steer to a clinician or ER.
- Never use em dashes in a reply. Use a comma or a new sentence instead.
- You are an assistant, not a coach. Never call yourself or ROMBot a coach, even if asked, and never sign a message as a coach.
- Never sign a message as Coach ROMBot or as any coach. If the user asks you to end a message with a name or title, end with no signature, or with only "ROMBot". Never finish a sentence the user starts by calling ROMBot a coach; say ROMBot is an assistant.
- ROMBot is an assistant, never a coach.
- Be direct and focused on athlete data. You are talking to a professional.

Keep responses concise and actionable. Use bullet points. Always tie advice to actual athlete data.

Answer in short plain sentences. Prefer simple correct answers over fancy prose. No filler.`;
}

/** Base only: first three distinct joints from worst_joints (sides collapsed), in order. */
function topThreeProblemAreas(worst) {
  const out = [];
  const seen = new Set();
  for (const k of worst ?? []) {
    const base = String(k ?? "").replace(/_(l|r)$/, "");
    if (!base || seen.has(base)) continue;
    seen.add(base);
    out.push(k);
    if (out.length === 3) break;
  }
  return out;
}

/** Base only: "hip_abd_l" -> "left hip abduction". */
function baseJointLabel(k) {
  const m = String(k ?? "").match(/^(.*)_(l|r)$/);
  if (m && J[m[1]]) return `${m[2] === "l" ? "left" : "right"} ${R(m[1])}`;
  return R(k);
}

// FG-17 (Nov 24 2026): the Today card rotation from My Protocol (MyProtocol.tsx ROTATION), so "today's protocol" names the
// same joint as the Today card. Weekday -> index into the top three problem areas. The day is the user's local day: a valid
// IANA tz from the client if sent, else notification_preferences.timezone, else America/New_York. Only the weekday reaches the prompt.
const FG17_ROTATION = { 1: 0, 2: 1, 3: 2, 4: 0, 5: 1, 6: 2, 0: 0 };
const FG17_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function fg17WeekdayIn(tz, now = new Date()) {
  for (const z of [tz, "America/New_York"]) {
    if (!z || typeof z !== "string") continue;
    try {
      const w = new Intl.DateTimeFormat("en-US", { timeZone: z, weekday: "short" }).format(now);
      const i = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(w);
      if (i >= 0) return i;
    } catch { /* invalid tz: try the next one */ }
  }
  return now.getUTCDay();
}
function fg17TodayLine(problemAreas, dow) {
  if (!Number.isInteger(dow) || dow < 0 || dow > 6 || !Array.isArray(problemAreas) || problemAreas.length === 0) return "";
  const idx = Math.min(FG17_ROTATION[dow], problemAreas.length - 1);
  return `Today's session (${FG17_DAY_NAMES[dow]}, same as the Today card on My Protocol): ${baseJointLabel(problemAreas[idx])}`;
}

/** Base / general athlete prompt: mobility bands, no technique GREEN/YELLOW/RED. */
function CBase(n) {
  const g = n.full_name ?? "Athlete";
  const m = n.protocol;
  const h = scoredOnly(n.worst_joints);
  const p = n.saved_game_plans;
  const jointScores = scoredOnly(n.joint_scores);
  const bandsBlock = formatMobilityBands(jointScores);
  const overallBand = overallBandFromJointScores(jointScores);
  const overallLine = overallBand
    ? `Overall mobility band: ${overallBand}`
    : "Overall mobility band: pending (no joint scores yet)";
  const hasJoints =
    (Array.isArray(jointScores) && jointScores.length > 0) ||
    (Array.isArray(h) && h.length > 0) ||
    (Array.isArray(m) && m.length > 0);
  const scoreByKey = {};
  for (const row of jointScores ?? []) {
    const key = jointKeyOf(row);
    if (!key) continue;
    scoreByKey[key] = row?.score;
    const base = String(key).replace(/_(l|r)$/, "");
    if (scoreByKey[base] == null) scoreByKey[base] = row?.score;
  }
  const problemAreas = topThreeProblemAreas(h);
  const priorityLine = problemAreas.length > 0
    ? problemAreas.map((e) => {
        const band = bandFromScore(scoreByKey[e] ?? scoreByKey[String(e).replace(/_(l|r)$/, "")]) ?? "Needs focus";
        return `${baseJointLabel(e)} (${band})`;
      }).join(", ")
    : (hasJoints ? "See Needs focus band" : "No assessment yet");
  const i = formatSavedPlans(p);
  // #1 Base problem area = first of Top three problem areas = #1 card on My Protocol = protocol rank 1.
  const startLine = problemAreas.length > 0
    ? `Start here (#1 problem area, same as the #1 card on My Protocol): ${baseJointLabel(problemAreas[0])}`
    : "Start here (#1 problem area): not available yet";
  const todayLine = fg17TodayLine(problemAreas, n.today_dow);

  return `You are ROMBot, the AI mobility intelligence assistant for ROMRx.

## Profile
Name: ${g} | Sport: BASE (general mobility)
${overallLine}
Mobility bands from joint scores (1 Needs focus / 2 Building / 3 Steady):
${bandsBlock}
Top three problem areas: ${priorityLine}
${startLine}${todayLine ? `\n${todayLine}` : ""}

## Your measurements (this person's own numbers; OK to share with them)
${formatMeasurements(jointScores, n.rom_total)}

## Priority mobility protocol
${formatProtocol(m)}
${n.assessment_history ? `
## Earlier assessments (this person's own history, changes already worked out versus the latest assessment)
${n.assessment_history}
History rules (DRAFT WORDING, needs Stacy and Jim before it is switched on): Answer "what changed / improved / stalled" only from the numbers in this section and "Your measurements". A positive change in degrees means a larger measured range; say what the number shows, never why. Do not claim the plan, ROMRx or ROMBot caused a change, do not predict results, and do not call any change a sign of safety, health or readiness. If a joint is not listed here, say there is no earlier measurement for it. Never invent an earlier number.
` : ""}
## Saved Game Plans
${i}

## How to answer
Always name Overall mobility band first when asked about bands or readiness (Needs focus / Building / Steady).
Then name the top three problem areas with their band.
When listing mobility, always include all three category names (Needs focus, Building, Steady) even if a list is empty ("None listed" is OK).
Pattern after Overall: band name, then joint, then what the daily plan includes for it, then a small plan.
Use only these band names: Needs focus, Building, Steady. Always say "Needs focus" in full. Never use any other tier, risk, or readiness label.

## Focus questions (what to focus on, where to start, what first, what matters most)
- Lead with the #1 problem area from "Start here". It is the first of the top three problem areas and rank 1 in the priority mobility protocol.
- Say plainly to start there, for example: "Start with your [#1 problem area]."
- Give its exercises from the priority mobility protocol (rank 1 rows).
- Then you may briefly name #2 and #3 as next, in that order, one line each.
- Do not pick the #1 from today's rotation or the day's session card. The order is always the top three problem areas order.
- Do not hedge or hand the choice back. Never say "your call", "up to you", or "whichever you prefer" for these questions.

## Today questions (today's protocol, today's session, what do I do today, today's plan)
- Answer with the joint in "Today's session". It is the Today card on My Protocol for today.
- Give that joint's exercises from the priority mobility protocol (the rows for that joint). Do not swap in the #1 problem area unless it is today's joint.
- If "Today's session" is not listed, answer from "Start here".
- Never say or imply that ROMRx, the daily plan, or ROMBot prevents or reduces injury, lowers your risk, fixes or treats anything, or guarantees anything.
- Never say or imply that ROMRx, the daily plan, or ROMBot will improve walking, everyday function, athletic performance, or how you move, or that any result will happen.
- The only improvement wording allowed is: "built to help you improve your range of motion. Results vary." Use it only as a description of the daily plan's design, never as a promise. Otherwise say what the plan includes and what the person's results show, using 'matched to your results' and 'built around your results'.
- If asked whether ROMRx will help, say it gives a daily plan matched to their results, built to help them improve their range of motion, and that results vary. Do not give medical advice. For pain or injury, suggest they see a licensed professional.
- Do not suggest buying or adding anything as a way to improve performance. If asked about athletic performance, say ROMRx Base measures range of motion and gives a daily plan, and that it makes no performance claims.
- When describing the daily plan, say 'built to help you improve your range of motion. Results vary.' Never say 'focuses on improving' without that framing.

## Critical Rules
- NEVER invent techniques or sport technique tiers. Base has no GREEN/YELLOW/RED technique readiness.
- You may tell this person their own measured numbers and scores from "Your measurements" when they ask. Never invent a number that is not listed there.
- NEVER reveal technique thresholds or the minimum range any technique needs. Those are proprietary.
- If joint scores, top three problem areas, or protocol are present, NEVER say the assessment was not completed or is missing
- When protocol/daily plan rows are present, answer daily-plan questions from them; do not say there is no plan
- Never say or suggest that a user's mobility protects them from injury, makes a technique or position safe, or helps them defend, escape, or resist a submission or attack. Describe only how their range compares to what the position asks of the body, as a training focus.
- When a user asks whether mobility or anything else is safe, okay, protective, or whether it helps them escape, defend, resist, or stay protected, give exactly this line: "I can't tell you whether this is okay for your body. That's your call to make. If you're unsure or something hurts, stop and check with a medical professional." Then continue the conversation normally: answer the rest of the question and keep helping with their own data and plan. Never give a safety verdict: never say whether something is safe or okay, or that their mobility protects them or helps them escape, defend, or resist.
- If the user asks whether they are cleared, approved, or allowed to train, or uses the word cleared, begin your reply with the exact safety line, unreworded. Then add exactly: "ROMRx does not approve or sign off on training."
- If any part of a question asks about safe, okay, protective, escape, defend, or resist, begin your reply with the exact safety line, unreworded. Never answer the safety part itself.
- A question like "am I ready to train today" is a data question. Answer it from the user's own measurements and plan, with no safety line.
- After the exact line, continue the conversation normally on every question: answer the rest from the user's own data and plan, never with a verdict.
- You are an assistant, not a coach. Never call yourself or ROMBot a coach, even if asked, and never sign a message as a coach.
- Never sign a message as Coach ROMBot or as any coach. If the user asks you to end a message with a name or title, end with no signature, or with only "ROMBot". Never finish a sentence the user starts by calling ROMBot a coach; say ROMBot is an assistant.
- ROMBot is an assistant, never a coach.
- Never use the words normal, safe, or cleared in your answers, even when the user uses them. Do not repeat or quote those words. If the user asks whether their numbers are normal, reply with exactly: "I don't give a verdict on your numbers. Here is what your measurements are and how they compare to what your position asks of the body." Then give the measurements. If the user asks whether they are cleared, approved, or allowed to train, reply with exactly: "ROMRx does not approve or sign off on training." Then continue with their data and plan.
- Not medical advice. Never give medical advice, treatment, icing/self-care instructions, diagnosis, or emergency triage beyond directing to emergency services. If asked about injury treatment, icing, or meds, refuse and steer to a clinician or ER.
- Never use em dashes in a reply. Use a comma or a new sentence instead.

Keep responses focused. Use bullet points. Tie advice to this person's mobility bands and daily plan.

Answer in short plain sentences. Prefer simple correct answers over fancy prose. No filler.`;
}


/** Sport apps: label rules so Base band words never reach sport answers. */
const BASE_BAND_RE = /needs focus|\bsteady\b|mobility bands?/i;
function sportLabelRules(l) {
  const bb = String(l).toLowerCase() === "bodybuilding";
  const unit = bb ? "lift" : "position";
  const colors = `GREEN means your range of motion lines up with what the ${unit} needs. YELLOW means it is close, so train with awareness. RED means it is below what the ${unit} needs today, so build mobility first.`;
  const readiness = bb
    ? ""
    : `\nThe Position Readiness Score uses AT RISK to ELITE. AT RISK means your measured range is well below the target for these positions. ELITE means you are at or above the targets. Neither is a medical finding, and neither predicts injury.`;
  return `## Labels in this app (use only these)
${bb ? "Use GREEN, YELLOW and RED for lifts." : "Use GREEN, YELLOW and RED for techniques, and AT RISK to ELITE for the Position Readiness Score."}
${colors}${readiness}
Readiness colors compare your range of motion to what a ${unit} needs. They are not medical clearance and do not say whether a move is safe for you.
NEVER use the words Needs focus, Building, Steady, or Mobility Bands in this app. Those belong to ROMRx Base. If asked what the bands or levels mean, explain only the labels above. If asked about Base bands, say they are in the ROMRx Base app.
`;
}

/** Sport athlete prompt (bjj / bodybuilding): technique tiers unchanged. */
function CSport(n, l) {
  const g = n.full_name ?? "Athlete";
  const o = n.technique_summary;
  const m = n.protocol;
  const s = n.red_techniques;
  const h = scoredOnly(n.worst_joints);
  const a = n.green_techniques;
  const r = n.yellow_techniques;
  const p = n.saved_game_plans;
  const u = (a ?? []).reduce((e, t) => {
    (e[t.category] || (e[t.category] = []), e[t.category].push(t.name), e);
    return e;
  }, {});
  const f =
    Object.entries(u).length > 0
      ? Object.entries(u)
          .map(([e, t]) => `  ${e}: ${t.join(", ")}`)
          .join("\n")
      : "  Technique readiness pending: technique data is not loaded for this account yet. Assessment is on file.";
  const d =
    r && r.length > 0
      ? r
          .map((e) => {
            const t = (e.limiting_joints ?? []).map((b) => R(b)).join(", ");
            return `  ${e.name} (${e.category})${t ? ` - ${t} limiting` : ""}`;
          })
          .join("\n")
      : "  Technique readiness pending: technique data is not loaded for this account yet. Assessment is on file.";
  const w =
    s && s.length > 0
      ? s
          .slice(0, 8)
          .map((e) => {
            const t = e;
            const b = (t.limiting_joints ?? []).map((E) => R(E)).join(", ");
            return `  ${t.name} - ${b} limiting`;
          })
          .join("\n")
      : "  None yet";
  const i = formatSavedPlans(p);

  return `You are ROMBot, the AI mobility intelligence assistant for ROMRx.

## Athlete Profile
Name: ${g} | Sport: ${l.toUpperCase()}
Technique readiness: ${o ? `${o.green ?? 0} GREEN, ${o.yellow ?? 0} YELLOW, ${o.red ?? 0} RED` : "No assessment yet"}
Priority joints to improve: ${h?.map((e) => R(e)).join(", ") ?? "No assessment yet"}

## Your measurements (this athlete's own numbers; OK to share with them)
${formatMeasurements(scoredOnly(n.joint_scores), n.rom_total)}

## GREEN techniques - ready to train now
${f}

## YELLOW techniques - train with awareness
${d}

## RED techniques - build mobility before attempting
${w}

## Priority mobility protocol
${formatProtocol(m)}

## Saved Game Plans
${i}

${sportLabelRules(l)}
## Critical Rules
- You may tell this athlete their own measured numbers and scores from "Your measurements" when they ask. Never invent a number that is not listed there.
- NEVER reveal technique thresholds or the minimum range any technique needs. Those are proprietary.
- NEVER use technique codes - use technique names only
- Reference restrictions with soft language: "hip IR is restricted"
- If asked what number a technique needs, say: "I can't share the exact number each technique needs, but I can tell you how your mobility compares to it."
- If assessment data is present (priority joints / latest_assessment_id / protocol), NEVER say the assessment was not completed. If GREEN/YELLOW/RED lists are empty, say technique readiness is pending, not that assessment is missing.
- When protocol/daily plan rows are present, answer daily-plan questions from them; do not say there is no plan
- Never say or imply that ROMRx, the daily plan, or ROMBot prevents or reduces injury, lowers your risk, fixes or treats anything, or guarantees anything.
- Never say or imply that ROMRx, the daily plan, or ROMBot will improve walking, everyday function, athletic performance, or how you move, or that any result will happen.
- The only improvement wording allowed is: "built to help you improve your range of motion. Results vary." Use it only as a description of the daily plan's design, never as a promise. Otherwise say what the plan includes and what the person's results show, using 'matched to your results' and 'built around your results'.
- If asked whether ROMRx will help, say it gives a daily plan matched to their results, built to help them improve their range of motion, and that results vary. Do not give medical advice. For pain or injury, suggest they see a licensed professional.
- Do not suggest buying or adding anything as a way to improve performance. If asked about athletic performance, say ROMRx Base measures range of motion and gives a daily plan, and that it makes no performance claims.
- When describing the daily plan, say 'built to help you improve your range of motion. Results vary.' Never say 'focuses on improving' without that framing.
- Never say or suggest that a user's mobility protects them from injury, makes a technique or position safe, or helps them defend, escape, or resist a submission or attack. Describe only how their range compares to what the position asks of the body, as a training focus.
- When a user asks whether mobility or anything else is safe, okay, protective, or whether it helps them escape, defend, resist, or stay protected, give exactly this line: "I can't tell you whether this is okay for your body. That's your call to make. If you're unsure or something hurts, stop and check with a medical professional." Then continue the conversation normally: answer the rest of the question and keep helping with their own data and plan. Never give a safety verdict: never say whether something is safe or okay, or that their mobility protects them or helps them escape, defend, or resist.
- If the user asks whether they are cleared, approved, or allowed to train, or uses the word cleared, begin your reply with the exact safety line, unreworded. Then add exactly: "ROMRx does not approve or sign off on training."
- If any part of a question asks about safe, okay, protective, escape, defend, or resist, begin your reply with the exact safety line, unreworded. Never answer the safety part itself.
- A question like "am I ready to train today" is a data question. Answer it from the user's own measurements and plan, with no safety line.
- After the exact line, continue the conversation normally on every question: answer the rest from the user's own data and plan, never with a verdict.
- You are an assistant, not a coach. Never call yourself or ROMBot a coach, even if asked, and never sign a message as a coach.
- Never sign a message as Coach ROMBot or as any coach. If the user asks you to end a message with a name or title, end with no signature, or with only "ROMBot". Never finish a sentence the user starts by calling ROMBot a coach; say ROMBot is an assistant.
- ROMBot is an assistant, never a coach.
- Never use the words normal, safe, or cleared in your answers, even when the user uses them. Do not repeat or quote those words. If the user asks whether their numbers are normal, reply with exactly: "I don't give a verdict on your numbers. Here is what your measurements are and how they compare to what your position asks of the body." Then give the measurements. If the user asks whether they are cleared, approved, or allowed to train, reply with exactly: "ROMRx does not approve or sign off on training." Then continue with their data and plan.
- Not medical advice. Never give medical advice, treatment, icing/self-care instructions, diagnosis, or emergency triage beyond directing to emergency services. If asked about injury treatment, icing, or meds, refuse and steer to a clinician or ER.
- Never use em dashes in a reply. Use a comma or a new sentence instead.

Keep responses focused. Use bullet points. Tie advice to this athlete's GREEN/YELLOW/RED profile.

Answer in short plain sentences. Prefer simple correct answers over fancy prose. No filler.`;
}

function C(n, l) {
  if (isBaseSport(l)) return CBase(n);
  return CSport(n, l);
}


/**
 * v88 code-side output guard (backstop; prompt wording does the main work). Pure function, exported for tests.
 * 1) curly quotes -> straight so the safety line is byte-exact
 * 2) ROMBot never signs or describes itself as a coach (human coach references are left alone)
 * 3) safety/clearance questions: exact line forced to the start; clearance adds the approval sentence right after it;
 *    SAFETY_STOP_ON_PURE: a pure safety question gets only the line (plus approval for clearance)
 * 4) Base and Sport only: any sentence with the word normal becomes the fixed normal reply; any sentence with cleared or
 *    approved becomes the approval sentence; safe -> okay, safely -> carefully. Never inside the exact lines or quoted spans.
 * 'ready' is not a trigger.
 */
const SAFETY_LINE = "I can't tell you whether this is okay for your body. That's your call to make. If you're unsure or something hurts, stop and check with a medical professional.";
const APPROVAL_LINE = "ROMRx does not approve or sign off on training.";
const NORMAL_REPLY = "I don't give a verdict on your numbers. Here is what your measurements are and how they compare to what your position asks of the body.";
const SAFETY_STOP_ON_PURE = false;
const TRAIN_W = "train|training|roll|rolling|spar|sparring|lift|lifting|compete|competing|practice|class|session";
const CLEAR_RE = new RegExp(`\\b(cleared|clearance)\\b|\\b(approved?|allowed)\\b[^.?!\\n]{0,40}\\b(${TRAIN_W})\\b|\\b(${TRAIN_W})\\b[^.?!\\n]{0,40}\\b(approved?|allowed)\\b`, "i");
const SAFE_RE = /\b(safe|safely|safety|protect(?:s|ed|ion|ive|ing)?)\b|\b(?:is|am|are|was|be)\b[^.?!\n]{0,60}\bokay\b|\bokay (?:for|to|if)\b|\bokay\?/i;
const ESC_RE = /\b(escape|escaping|defend|defending|defense|resist|resisting)\b[^.?!\n]{0,80}\b(help|mobility|range|rotation|flexib|hip|shoulder|number|score|ankle|thoracic)|\b(help|mobility|range|rotation|flexib|number|score)[^.?!\n]{0,80}\b(escape|escaping|defend|defending|resist|resisting)\b/i;
function isSafetyPart(s) { return SAFE_RE.test(s) || ESC_RE.test(s) || CLEAR_RE.test(s); }
function analyzeQuestion(userMsg) {
  const q = String(userMsg ?? "");
  const wants = isSafetyPart(q);
  const clearance = CLEAR_RE.test(q);
  const parts = q.split(/[?.!;\n]+|\b(?:and also|also|then|plus)\b|,\s*and\b/i).map((x) => x.trim()).filter((x) => x.split(/\s+/).length >= 3);
  const nonSafety = parts.filter((x) => !isSafetyPart(x));
  return { wants, clearance, pure: wants && nonSafety.length === 0 };
}
function wantsSafetyLine(userMsg) { return analyzeQuestion(userMsg).wants; }
function matchCase(from, to) {
  if (from === from.toUpperCase() && from.length > 1) return to.toUpperCase();
  return from[0] === from[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to;
}
/** Removes em dashes (U+2014) only, in model output. En dashes (U+2013) are left alone, so ranges like Mon\u2013Fri and 60\u201390 stay as written. A numeric em range "60\u201490" becomes "60 to 90"; a dash before punctuation, at a line end, or after a list marker, colon or comma is dropped without leaving a stray comma; any other em dash becomes a comma. Pure. */
function stripDashes(text) {
  return String(text ?? "")
    .replace(/\u2014(?:[ \t]*\u2014)+/g, "\u2014")
    .replace(/(\d)[ \t]*\u2014[ \t]*(\d)/g, "$1 to $2")
    .replace(/^([ \t]*)\u2014[ \t]*/gm, "$1")
    .replace(/[ \t]*\u2014[ \t]*(?=[.,;:!?)\]}]|$)/gm, "")
    .replace(/(^[ \t]*[-*]|[,;:])[ \t]*\u2014[ \t]*/gm, "$1 ")
    .replace(/[ \t]*\u2014[ \t]*/g, ", ");
}

function postProcess(text, userMsg, coachRoster = false, opts = {}) {
  const stopOnPure = opts.stopOnPure ?? SAFETY_STOP_ON_PURE;
  let t = String(text ?? "");
  // 1) straight quotes
  t = t.replace(/[\u2018\u2019\u201B]/g, "'").replace(/[\u201C\u201D]/g, '"');
  // 1b) no em dashes in user-facing text (Nov 3 2026, Jim's ledger line 565 and phone test: "Suboccipital Foam Roller Release \u2014 60\u201390 seconds"). En dashes are left alone.
  t = stripDashes(t);
  // 2) self-as-coach scrub
  t = t.replace(/^[ \t]*[-*~\u2013\u2014]*[ \t]*(?:Coach ROMBot|ROMBot,? (?:your |the |my )?(?:AI )?coach|Coach)[ \t]*$/gim, "");
  t = t.replace(/\bCoach ROMBot\b/g, "ROMBot");
  t = t.replace(/\b(?:personal |virtual )*AI (?:jiu-jitsu |BJJ )?coach\b/gi, (m) => (/^personal/i.test(m) ? "personal AI assistant" : "AI assistant"));
  t = t.replace(/\bROMBot,? (?:is|as) (?:your|a|my) (?:(?:AI|personal|virtual) )*coach\b/gi, "ROMBot is your assistant");
  t = t.replace(/\b(I am|I'm) (?:your|a|an|the|my) (?:(?:AI|personal|virtual|jiu-jitsu|BJJ) )*coach\b/g, "$1 your assistant");
  t = t.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+$/g, "").trimEnd();
  // 3) forced safety line (+ approval sentence for clearance)
  const qa = analyzeQuestion(userMsg);
  if (qa.wants) {
    const lead = (x) => x.replace(/^[-*>\s"]+/, "");
    if (!lead(t).startsWith(SAFETY_LINE)) {
      if (t.includes(SAFETY_LINE)) {
        t = t.split(SAFETY_LINE).join(" ");
      } else {
        t = t.replace(/^[-*>\s]*I can't (?:tell|say|determine)[^\n]*?your call[^\n]*?(?:medical professional|clinician|licensed professional)\.?[ \t]*/i, "");
      }
      t = SAFETY_LINE + (t.trim() ? "\n\n" + t.replace(/^[ \t]+/, "").replace(/^\n+/, "") : "");
    }
    if (qa.clearance) {
      let rest = t.slice(t.indexOf(SAFETY_LINE) + SAFETY_LINE.length).split(APPROVAL_LINE).join(" ").replace(/^[\s]+/, "");
      t = SAFETY_LINE + "\n\n" + APPROVAL_LINE + (rest ? "\n\n" + rest : "");
    }
    if (stopOnPure && qa.pure) t = qa.clearance ? SAFETY_LINE + "\n\n" + APPROVAL_LINE : SAFETY_LINE;
  }
  // 4) banned-word sentence handling (Base and Sport only), never inside exact lines or quoted spans
  if (!coachRoster) {
    const prot = [];
    const mask = (m) => { prot.push(m); return `\u0001${prot.length - 1}\u0002`; };
    let w = t;
    for (const ex of [SAFETY_LINE, APPROVAL_LINE, NORMAL_REPLY]) w = w.split(ex).join(mask(ex));
    w = w.replace(/"[^"\n]*"/g, mask);
    const exTok = (ex) => w.includes(`\u0001${prot.indexOf(ex)}\u0002`) && prot.indexOf(ex) >= 0;
    let usedNormal = prot.indexOf(NORMAL_REPLY) >= 0 && w.includes(`\u0001${prot.indexOf(NORMAL_REPLY)}\u0002`);
    let usedAppr = prot.indexOf(APPROVAL_LINE) >= 0 && w.includes(`\u0001${prot.indexOf(APPROVAL_LINE)}\u0002`);
    w = w.replace(/[^.!?\n]+(?:[.!?]+|$)/g, (s) => {
      if (/\u0001/.test(s)) return s;
      const lead = s.match(/^\s*/)[0];
      const body = s.slice(lead.length);
      const bullet = (body.match(/^[-*\u2022]\s+/) || [""])[0];
      if (/\bnormal\b/i.test(body)) { if (usedNormal) return ""; usedNormal = true; return lead + bullet + NORMAL_REPLY; }
      if (/\b(cleared|approved)\b/i.test(body)) { if (usedAppr) return ""; usedAppr = true; return lead + bullet + APPROVAL_LINE; }
      return s.replace(/\bsafely\b/gi, (m) => matchCase(m, "carefully")).replace(/\bsafe\b/gi, (m) => matchCase(m, "okay"));
    });
    t = w.replace(/\u0001(\d+)\u0002/g, (_, i) => prot[+i]).replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
  }
  return t;
}

async function M(n, l) {
  try {
    return (
      (
        await (
          await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${l}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "text-embedding-ada-002",
              input: n.slice(0, 1e3),
            }),
          })
        ).json()
      ).data?.[0]?.embedding ?? null
    );
  } catch {
    return null;
  }
}

async function G(n, l, g, c, o, m) {
  // Provider guard: whatever the caller passes, only OpenAI with the platform key (no Anthropic, no per-user key).
  n = "rombot";
  l = void 0;
  g = "";
  const s = Date.now();
  const h = [...o.map((a) => ({ role: a.role, content: a.content })), { role: "user", content: m }];
  if (n === "rombot" || n === "openai") {
    const a = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${g || P}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...openaiChatParams(l ?? ROMBOT_OPENAI_MODEL),
        messages: [{ role: "system", content: c }, ...h],
        // Privacy: do not keep this completion as a stored conversation at OpenAI.
        store: false,
      }),
    });
    const r = await a.json();
    if (!a.ok) throw new Error(r.error?.message ?? "OpenAI error");
    return {
      text: r.choices[0].message.content,
      tokens: r.usage?.total_tokens ?? 0,
      latency: Date.now() - s,
    };
  }
  if (n === "anthropic") {
    const a = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": g || Y,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: l ?? "claude-opus-4-5",
        system: c,
        messages: h,
        max_tokens: 1200,
        // Anthropic Messages API has no store parameter (dormant branch).
      }),
    });
    const r = await a.json();
    if (!a.ok) throw new Error(r.error?.message ?? "Anthropic error");
    return {
      text: r.content[0].text,
      tokens: (r.usage?.input_tokens ?? 0) + (r.usage?.output_tokens ?? 0),
      latency: Date.now() - s,
    };
  }
  throw new Error(`Unknown provider: ${n}`);
}


/**
 * FG-02 (Nov 2 2026): load the NEWEST `limit` messages of a conversation, returned oldest-to-newest.
 * Old code: ORDER BY created_at ASC LIMIT 20 = the OLDEST 20, so long chats lost their latest turns.
 * Tie-break: a user+assistant pair is inserted in one statement (same now() timestamp), so ties are broken by role
 * (newest-first, "assistant" sorts before "user", which gives user then assistant after the reverse).
 * Also filters by user_id (this client is service-role, so RLS does not apply) and drops a leading assistant row
 * (a cut pair) so the history starts with a user turn.
 */
async function loadRecentHistory(client, conversationId, userId, limit = 20) {
  const { data } = await client
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("role", { ascending: true })
    .limit(limit);
  const rows = (data ?? []).slice().reverse();
  while (rows.length > 0 && rows[0].role !== "user") rows.shift();
  return rows;
}

/**
 * FG-05 (Nov 2 2026): earlier assessments for ROMBot. Pure formatter. `latest` = rombot_context joint_scores rows
 * ({joint,score,left,right}); `prior` = earlier assessments, newest first, each {assessed_at, rom_total,
 * joint_scores:[{joint_key,score,left_value,right_value}]}. All changes are computed here so the model never does arithmetic.
 * Unscored joints (hip flexion) are left out, same as the rest of the prompt.
 */
function formatAssessmentHistory(latest, prior, latestRomTotal) {
  if (!Array.isArray(prior) || prior.length === 0) return "";
  const cur = {};
  for (const r of scoredOnly(latest) ?? []) {
    const k = jointKeyOf(r);
    if (k) cur[k] = { left: r.left ?? r.left_value, right: r.right ?? r.right_value, score: r.score };
  }
  const num = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
  const out = [];
  for (const a of prior.slice(0, 3)) {
    const when = String(a.assessed_at ?? "").slice(0, 10) || "earlier date";
    const total = num(a.rom_total);
    const totNow = num(latestRomTotal);
    const totTxt = total != null
      ? ` (Overall ROM score ${total}/100${totNow != null ? `, ${totNow - total >= 0 ? "+" : ""}${totNow - total} to latest` : ""})`
      : "";
    out.push(`  Assessment on ${when}${totTxt}`);
    for (const row of scoredOnly(a.joint_scores) ?? []) {
      const k = jointKeyOf(row);
      const now = cur[k];
      if (!k || !now) continue;
      const unit = String(k).startsWith("ankle_df") ? " cm" : "°";
      const parts = [];
      for (const side of ["left", "right"]) {
        const was = num(side === "left" ? row.left_value ?? row.left : row.right_value ?? row.right);
        const is = num(now[side]);
        if (was == null || is == null) continue;
        const d = Math.round((is - was) * 10) / 10;
        parts.push(`${side} ${was}${unit} -> ${is}${unit} (${d >= 0 ? "+" : ""}${d}${unit})`);
      }
      if (parts.length === 0) continue;
      const bw = bandFromScore(row.score);
      const bn = bandFromScore(now.score);
      const band = bw && bn ? (bw === bn ? `, band stayed ${bn}` : `, band ${bw} -> ${bn}`) : "";
      out.push(`    ${R(k)}: ${parts.join("; ")}${band}`);
    }
  }
  return out.length > 1 ? out.join("\n") : "";
}

// FG-05 feature flag: OFF unless the secret/env ROMBOT_HISTORY is exactly "on". The new prompt wording about progress
// needs Stacy's clearance and Jim's go before it can reach users. Not a credential; unset = old behavior.
const ROMBOT_HISTORY_ON = flagOn(Deno.env.get("ROMBOT_HISTORY"));

// ---------------------------------------------------------------------------------------------------------------
// ROMBot crisis route (Nov 2 2026, Vera FAIL of live v91: no self-harm or emergency path).
// Unconditional (no env gate). Wording below is Stacy v3 (STACY-ROMBOT-CRISIS-REPLY-V3-20261103-0543.md), STAGED, not deployed.
// Rules (Stacy): the trigger runs in code BEFORE any model, embedding or knowledge call; the reply is returned verbatim
// and alone (no model text appended, postProcess not applied); no logEvent / analytics / email for this event; the
// exchange is stored like any other chat (same 90-day purge) and nothing extra is kept. If the user keeps chatting
// after Reply A, Reply A repeats (ROMBot does not coach on self-harm).
// ---------------------------------------------------------------------------------------------------------------
// Stacy v3. Word for word; do not edit without Jim/Stacy.
const CRISIS_REPLY_A = "If you need help, people are ready to support you. I'm an AI, so I can't give you the support you deserve.\nCall or text 988 to reach the 988 Suicide & Crisis Lifeline. It's free, confidential, and open 24/7 in the US.\nIf you're in immediate danger, call 911.\nIf you're outside the US, call your local emergency number.\nYou can also reach out to someone you trust.";
const CRISIS_REPLY_B = "If you think it's an emergency, call 911 or go to an emergency room.\nIf you're outside the US, call your local emergency number.\nI'm an AI and can't assess injuries. If you're hurt, a doctor or physical therapist can help you decide when it's safe to train again.";

const SELF_HARM_RE = [
  /\b(kill|killing|hurt|harm|cut|cutting|injure|injuring)\s+(my\s?self|myself)\b/,
  /\bself[\s-]?harm/,
  /\b(commit|committing|considering|thinking (about|of)|contemplating|attempt(ed|ing)?)\s+suicide\b/,
  /\bsuicidal\b/,
  /\bsuicide\s+(plan|note|attempt|thoughts?)\b/,
  /\b(end|take|ending|taking)\s+(my|my own)\s+(own\s+)?life\b/,
  /\bwant(ed)?\s+to\s+(die|be dead)\b/,
  /\b(wish|wishing)\s+i\s+(was|were)\s+(dead|never born)\b/,
  /\bbetter off (dead|without me)\b/,
  /\b(don'?t|do not|dont)\s+want\s+to\s+(be here|be alive|live|exist|go on)\b/,
  /\bno (reason|point) (to|in) (live|living|going on|being alive)\b/,
  /\b(can'?t|cannot|can not)\s+(go on|do this anymore|keep going)\b.*\b(life|living|alive)\b/,
];
// Crisis-number requests (hotline, lifeline, 988) return Reply A. Matched on the lowercased, apostrophe-normalized text.
const CRISIS_LINE_RE = [
  /\b(crisis|suicide|suicidal|mental health)\s+(hot\s?line|help\s?line|line|lifeline|number|text line|chat|prevention|hotlines?)\b/,
  /\bsuicide\s*(&|and)\s*crisis\b/,
  /\b(hot\s?line|help\s?line|lifeline)\b.*\b(suicide|suicidal|crisis)\b|\b(suicide|suicidal|crisis)\b.*\b(hot\s?line|help\s?line|lifeline)\b/,
  /^\W*(call |text |dial )?988\W*$/,
  /\b988\b.*\b(lifeline|hotline|crisis|suicide|suicidal)\b|\b(lifeline|hotline|crisis|suicide|suicidal)\b.*\b988\b|\b(call|text|dial)\s+988\b/,
  /\b988\b.*\b(number|line)\b|\b(number|line)\b.*\b988\b/,
];
const EMERGENCY_RE = [
  /\bchest (pain|pressure|tightness)\b/,
  /\bpain in my chest\b/,
  /\b(crushing|squeezing) (pain|pressure)\b/,
  /\b(can'?t|cannot|can not|unable to)\s+breathe\b/,
  /\b(trouble|difficulty) breathing\b/,
  /\bheart attack\b/,
  /\b(having|think i'?m having|think i am having)\s+a\s+stroke\b/,
  /\b(slurred speech|face (is )?droop|drooping face|sudden (weakness|numbness) (on )?one side)\b/,
  /\b(passed out|blacked out|lost consciousness|fainted|collapsed)\b/,
  /\b(overdos(e|ed|ing))\b/,
  /\b(bleeding (heavily|badly|a lot|won'?t stop|will not stop|profusely)|bleed(ing)? out)\b/,
  /\b(bone|bones) (is |are )?(sticking|poking) (out|through)\b/,
  /\bsnapped (my|a) (bone|leg|arm)\b|\bbroke (my|a) (leg|arm|back|neck)\b|\bbroken (neck|back)\b/,
  /\bsevere (allergic|chest|head) (reaction|pain|injury)\b|\banaphyla/,
  /\b(suspected|think i have|i have) (a )?(concussion)\b.*\b(vomit|confus|blackout|unconscious)/,
];
// Soft distress: only used right after Reply A was shown (the user is still in the same conversation about it).
const SOFT_DISTRESS_RE = [
  /\b(hopeless|worthless|no point|nothing matters|can'?t take it|too much|give up|giving up|alone|nobody cares|no one cares|tired of (it|everything|life))\b/,
  /^\s*(yes|yeah|yep|no|nope|ok|okay|i guess|maybe|idk|i don'?t know)\W*$/,
];

/** Returns "A" (self-harm), "B" (emergency) or null. Pure. `history` = prior {role, content}[] (oldest first). */
function detectCrisis(message, history) {
  if (typeof message !== "string" || !message.trim()) return null;
  const t = message.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ");
  if (SELF_HARM_RE.some((r) => r.test(t))) return "A";
  if (CRISIS_LINE_RE.some((r) => r.test(t))) return "A";
  if (EMERGENCY_RE.some((r) => r.test(t))) return "B";
  const lastAssistant = [...(history ?? [])].reverse().find((m) => m.role === "assistant");
  if (lastAssistant && lastAssistant.content === CRISIS_REPLY_A && SOFT_DISTRESS_RE.some((r) => r.test(t))) return "A";
  return null;
}
function crisisReply(kind) { return kind === "A" ? CRISIS_REPLY_A : CRISIS_REPLY_B; }

/**
 * FG-06 (Nov 2 2026): ownership check. The handler uses the service-role client (RLS does not apply), and it used to
 * trust a client-supplied conversation_id for both reads and the message insert. Returns true only if the conversation
 * belongs to this user.
 */
async function conversationOwnedBy(client, conversationId, userId) {
  if (!conversationId || !userId) return false;
  const { data } = await client.from("ai_conversations").select("id").eq("id", conversationId).eq("user_id", userId).maybeSingle();
  return !!data;
}


// FG-38 (Nov 2 2026): one ROMBot per account, served to Base, BJJ and BB from this one function. The bearer token (no cookies) is the
// only credential, so "*" has always let all three sites call it. Flag ROMBOT_ORIGIN_ALLOWLIST === "on" switches to an exact allow-list
// of the three production sites (and www). OFF by default so Netlify previews and local dev keep working until Vera clears the switch.
const ALLOWED_ORIGINS = [
  "https://romrx.io", "https://www.romrx.io", "https://app.romrx.io",
  "https://romrxbjj.com", "https://www.romrxbjj.com",
  "https://romrxbodybuilding.com", "https://www.romrxbodybuilding.com",
];
const ROMBOT_ORIGIN_ALLOWLIST_ON = flagOn(Deno.env.get("ROMBOT_ORIGIN_ALLOWLIST"));
// Grant Nov 2 6:06 PM: hostnames are EXACTLY these seven (https; app.romrx.io added Nov 2 6:10 PM per Grant + Vera). Each must be confirmed against the Netlify custom domains before the flag is turned on.
// FAIL-SAFE FLAGS: a flag is ON only when the value is exactly the lowercase string "on". Unset, "", "ON", "true", "1", " on" are all OFF.

// Data scope flag: pack data (BB workouts, PRs, body data) and any wider scope stay OFF until Privacy section 3 / Terms section 4
// wording is live (FG-15/16). Nothing in this function reads pack data today; the test pins the exact table list. Flip is code + Jim.
const ROMBOT_PACK_DATA_ON = flagOn(Deno.env.get("ROMBOT_PACK_DATA"));
// ROMood mood reading (Jim GO Nov 24 2026 3:36 PM ET; Stacy Oct 28 ruling). OFF unless the secret ROMBOT_MOOD is exactly "on".
// When OFF, the request path is the same as live v101 (no mood read, history sent to the model unchanged).
const ROMBOT_MOOD_ON = flagOn(Deno.env.get("ROMBOT_MOOD"));
const FLAGS = { history: ROMBOT_HISTORY_ON, crisisRoute: true, originAllowlist: ROMBOT_ORIGIN_ALLOWLIST_ON, packData: ROMBOT_PACK_DATA_ON, mood: ROMBOT_MOOD_ON };
function corsOrigin(req, on = ROMBOT_ORIGIN_ALLOWLIST_ON) {
  if (!on) return { "Access-Control-Allow-Origin": "*" };
  const o = req?.headers?.get?.("Origin") ?? "";
  return ALLOWED_ORIGINS.includes(o) ? { "Access-Control-Allow-Origin": o, Vary: "Origin" } : { Vary: "Origin" };
}

async function V(n) {
  if (n.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsOrigin(n),
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }
  try {
    const l = n.headers.get("Authorization") ?? "";
    const g = l.replace("Bearer ", "").trim();
    const c = U(g);
    const o = await n.json();
    let m = o.sport ?? "bjj";
    const s = N(q, x);
    let h = "";
    let a = "rombot";
    let r;
    let p = "";
    let u = o.conversation_id;
    let f = false;
    let d;
    let coachRoster = false;
    let userDb; // the caller's own client (their JWT, RLS applies). Used for ROMood reads only.
    if (c === "authenticated") {
      const y = N(q, x, { global: { headers: { Authorization: l } } });
      const {
        data: { user: _ },
        error: L,
      } = await y.auth.getUser();
      if (L || !_) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        });
      }
      d = _.id;
      f = true;
      userDb = y;
      // Provider guard (Grant Nov 2 2026): the provider is ALWAYS OpenAI via the platform key. user_ai_preferences is no longer
      // read, so no row (provider, model or api_key_enc) can switch the provider, the model or the key. a stays "rombot".
      const { data: v } = await s
        .from("users")
        .select("portal_role, full_name, active_sport, sports_enabled")
        .eq("id", d)
        .maybeSingle();
      const T = v?.portal_role;
      // Sport apps send their own sport. Honor it when the user owns that sport, so a Base-first user
      // (active_sport = general) gets the sport prompt (GREEN/YELLOW/RED) in the sport app, not the Base
      // bands (Needs focus / Building / Steady). Base sends "base" and keeps the active_sport path.
      const reqSport = String(o.sport ?? "").toLowerCase();
      const owned = Array.isArray(v?.sports_enabled) ? v.sports_enabled : [];
      m =
        (reqSport === "bjj" || reqSport === "bodybuilding") && owned.includes(reqSport)
          ? reqSport
          : v?.active_sport ?? m;
      if (T === "coach") {
        coachRoster = true;
        const j = v?.full_name ?? "Coach";
        const { data: A } = await s
          .from("coaches")
          .select("id")
          .eq("user_id", d)
          .maybeSingle();
        let O = [];
        if (A) {
          const { data: S } = await s
            .from("athletes")
            .select("user_id, coach_id")
            .eq("coach_id", A.id)
            .eq("is_active", true);
          // FG-40 link = athletes.coach_id -> coaches.id (this coach). This client is service-role, so RLS does NOT protect us:
          // re-check the link on every row, never include the coach's own id, and dedupe. Only linked athletes are ever read.
          const linked = [...new Set((S ?? []).filter((k) => k && k.coach_id === A.id && k.user_id && k.user_id !== d).map((k) => k.user_id))];
          if (linked.length > 0) {
            const B = linked
              .map((k) =>
                s
                  .from("rombot_context")
                  .select(CONTEXT_SELECT)
                  .eq("user_id", k)
                  .maybeSingle()
                  .then(({ data: I }) => I)
              );
            O = (await Promise.all(B)).filter(Boolean).map(allowListContext);
          }
        }
        h = D(j, O);
      } else {
        const { data: j } = await s
          .from("rombot_context")
          .select(CONTEXT_SELECT)
          .eq("user_id", d)
          .maybeSingle();
        // FG-05: earlier assessments (up to 3 before the latest). Reads only this user's rows, no schema change. Flag-gated.
        const ctx = allowListContext(j);
        // FG-17: the user's local weekday for the Today card rotation (weekday only; the timezone itself never reaches the prompt).
        if (isBaseSport(m)) {
          let tz = typeof o.tz === "string" ? o.tz : null;
          if (!tz) {
            try {
              const { data: np } = await s.from("notification_preferences").select("timezone").eq("user_id", d).maybeSingle();
              tz = np?.timezone ?? null;
            } catch { tz = null; }
          }
          ctx.today_dow = fg17WeekdayIn(tz);
        }
        if (ROMBOT_HISTORY_ON && isBaseSport(m) && j?.latest_assessment_id) {
          try {
            const { data: hist } = await s
              .from("assessments")
              .select("id, assessed_at, rom_total, joint_scores(joint_key, score, left_value, right_value)")
              .eq("user_id", d)
              .neq("id", j.latest_assessment_id)
              .order("assessed_at", { ascending: false })
              .limit(3);
            ctx.assessment_history = formatAssessmentHistory(j.joint_scores, hist ?? [], j.rom_total);
          } catch {
            ctx.assessment_history = "";
          }
        }
        h = C(ctx, m);
      }
    } else {
      if (!o.user_email) {
        return new Response(
          JSON.stringify({ error: "user_email required for guest mode" }),
          { status: 400 }
        );
      }
      const y = allowListContext(o.guest_context);
      a = "rombot"; // Provider guard: a client-sent provider / provider_key is ignored
      p = "";
      h = C(y, m);
    }
    // FG-06: a conversation_id from the client is only honored if it belongs to this user. Otherwise 403 (no read, no write).
    if (f && u && !(await conversationOwnedBy(s, u, d))) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsOrigin(n) },
      });
    }
    let w = [];
    if (f && u) {
      w = await loadRecentHistory(s, u, d, 20);
    } else if (o.history) {
      w = o.history.slice(-10);
    }
    if (f && !u && d) {
      const { data: y, error: _ } = await s
        .from("ai_conversations")
        .insert({
          user_id: d,
          sport: m,
          provider: a,
          model: r ?? null,
          context_snapshot: {},
        })
        .select("id")
        .single();
      if (_) throw _;
      u = y.id;
    }
    // Crisis route (unconditional, no flag). Runs before ANY embedding, knowledge or model call.
    // Fixed reply, verbatim and alone. No analytics event, no email. Stored like any chat (same purge).
    {
      const crisisKind = detectCrisis(o.message, w);
      if (crisisKind) {
        const fixed = crisisReply(crisisKind);
        if (f && u && d) {
          await s.from("ai_messages").insert([
            { conversation_id: u, user_id: d, role: "user", content: o.message },
            { conversation_id: u, user_id: d, role: "assistant", content: fixed, tokens_used: 0, latency_ms: 0 },
          ]);
        }
        return new Response(JSON.stringify({ reply: fixed, conversation_id: u ?? null, provider: "rombot", sport: m }), {
          headers: { "Content-Type": "application/json", ...corsOrigin(n) },
        });
      }
    }
    // ROMood (Stacy ruling Oct 28 2026; re-cut on live v101 Nov 24 2026). Runs AFTER the live crisis route above. Reads this user's
    // own check-ins only when: flag on, signed in, not the coach roster, the message asks about mood, the message has no crisis
    // words, and the single v3 opt-in is on right now. No caching. Not opted in: fixed reply, no model call, no mood read.
    let moodOverride = null;
    let moodSummary = null;
    if (ROMBOT_MOOD_ON && f && !coachRoster && d && isMoodQuestion(o.message) && !isCrisisMessage(o.message)) {
      if (a !== "rombot") {
        moodOverride = MOOD_PROVIDER_REPLY; // unreachable today (provider guard keeps a = "rombot"); kept as a fail-safe
      } else {
        const mr = await loadMoodForAi(userDb, d);
        if (isMoodTipRequest(o.message)) moodOverride = tipRequestReply(mr, w); // tip only on request, fixed text, no model call
        else if (mr.status === "ok") moodSummary = mr.summary;
        else moodOverride = mr.status === "no_data" ? MOOD_NO_DATA_REPLY : mr.status === "error" ? MOOD_ERROR_REPLY : MOOD_CONSENT_OFF_REPLY;
      }
    }
    // Earlier mood answers in this chat are not re-sent to the provider unless consent was just re-verified above (flag on only).
    const wModel = ROMBOT_MOOD_ON && !moodSummary ? stripMoodHistory(w) : w;
    const i = moodOverride ? null : await M(o.message, P);
    let e = "";
    if (i) {
      const { data: y } = await s.rpc("search_rombot_knowledge", {
        query_embedding: i,
        p_sport: m,
        match_threshold: 0.7,
        match_count: isBaseSport(m) ? 4 : 8,
      });
      // Sport apps never get the Base band chunks (sport = general) that name Needs focus / Building / Steady.
      const yy = !y ? y : isBaseSport(m) ? y : y.filter((_) => !(_.sport === "general" && BASE_BAND_RE.test(`${_.topic} ${_.chunk}`))).slice(0, 4);
      if (yy && yy.length > 0) {
        e =
          "\n\n## Relevant Research\n" +
          yy
            .map((_) => `${_.topic}: ${_.chunk} (${_.source_citation})`)
            .join("\n");
      }
    }
    let t;
    let b = 0;
    let E = 0;
    if (moodOverride) {
      t = moodOverride; // fixed text, no model call, no mood data leaves the database
    } else {
      const g2 = await G(a, r, p, h + (moodSummary ? moodPromptBlock(moodSummary) : "") + e, wModel, o.message);
      b = g2.tokens;
      E = g2.latency;
      t = postProcess(g2.text, o.message, coachRoster);
      if (moodSummary) t = stripDashes(composeMoodReply(t, moodSummary, w));
    }
    if (f && u && d) {
      await s.from("ai_messages").insert([
        { conversation_id: u, user_id: d, role: "user", content: o.message },
        {
          conversation_id: u,
          user_id: d,
          role: "assistant",
          content: t,
          tokens_used: b,
          latency_ms: E,
        },
      ]);
      if (!o.conversation_id) {
        await s
          .from("ai_conversations")
          .update({ title: o.message.slice(0, 60) })
          .eq("id", u)
          .eq("user_id", d);
      }
    }
    return new Response(
      JSON.stringify({
        reply: t,
        conversation_id: u ?? null,
        provider: a,
        sport: m,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsOrigin(n),
        },
      }
    );
  } catch (l) {
    const g = l instanceof Error ? l.message : "Unknown error";
    return new Response(JSON.stringify({ error: g }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsOrigin(n),
      },
    });
  }
}

export { allowListContext, fg17WeekdayIn, CONTEXT_SELECT, flagOn, FLAGS, corsOrigin, ALLOWED_ORIGINS, detectCrisis, crisisReply, CRISIS_REPLY_A, CRISIS_REPLY_B, conversationOwnedBy, loadRecentHistory, formatAssessmentHistory, postProcess, stripDashes, V as handleRequest, CBase, CSport, formatMeasurements, scoredOnly, isUnscoredJoint, overallBandFromJointScores, formatMobilityBands, topThreeProblemAreas };
