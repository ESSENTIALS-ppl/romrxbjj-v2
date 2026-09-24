import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient as N } from "jsr:@supabase/supabase-js@2";

const q = Deno.env.get("SUPABASE_URL");
const x = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const P = Deno.env.get("romrx_openai_key") ?? "";
const Y = Deno.env.get("romrx_anthropic_key") ?? "";

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

function formatProtocol(protocol) {
  if (protocol && protocol.length > 0) {
    return protocol
      .map((e) => {
        const t = e;
        return `  ${t.joint ?? t.jointKey ?? t.joint_key}: ${t.exercise} - ${t.sets}x${t.reps} (${t.cue ?? t.coaching_cue})`;
      })
      .join("\n");
  }
  return "  Daily plan pending generation for this assessment (or no assessment yet).";
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

/** Coach roster prompt — unchanged behavior. */
function D(n, l) {
  const g = l.map((c) => {
    const o = c.full_name ?? "Unknown Athlete";
    const m = c.belt ?? "white";
    const s = c.technique_summary;
    const h = c.worst_joints;
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
    return `### ${o} (${m} belt)
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

## Your Role as Coach ROMBot
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
- Not medical advice. Never give medical advice, treatment, icing/self-care instructions, diagnosis, or emergency triage beyond directing to emergency services. If asked about injury treatment, icing, or meds, refuse and steer to a clinician or ER.
- Be direct and coaching-focused. You are talking to a professional.

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

/** Base / general athlete prompt: mobility bands, no technique GREEN/YELLOW/RED. */
function CBase(n) {
  const g = n.full_name ?? "Athlete";
  const m = n.protocol;
  const h = n.worst_joints;
  const p = n.saved_game_plans;
  const jointScores = n.joint_scores;
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

  return `You are ROMBot, the AI mobility intelligence assistant for ROMRx.

## Profile
Name: ${g} | Sport: BASE (general mobility)
${overallLine}
Mobility bands from joint scores (1 Needs focus / 2 Building / 3 Steady):
${bandsBlock}
Top three problem areas: ${priorityLine}

## Priority mobility protocol
${formatProtocol(m)}

## Saved Game Plans
${i}

## How to answer
Always name Overall mobility band first when asked about bands or readiness (Needs focus / Building / Steady).
Then name the top three problem areas with their band.
When listing mobility, always include all three category names (Needs focus, Building, Steady) even if a list is empty ("None listed" is OK).
Pattern after Overall: band name → joint → ease benefit → small plan → leave the choice with them ("your call").
Use only these band names: Needs focus, Building, Steady. Always say "Needs focus" in full. Never use any other tier, risk, or readiness label.

## Critical Rules
- NEVER invent techniques or sport technique tiers. Base has no GREEN/YELLOW/RED technique readiness.
- NEVER reveal specific degree values or ROM thresholds
- If joint scores, top three problem areas, or protocol are present, NEVER say the assessment was not completed or is missing
- When protocol/daily plan rows are present, answer daily-plan questions from them; do not say there is no plan
- Not medical advice. Never give medical advice, treatment, icing/self-care instructions, diagnosis, or emergency triage beyond directing to emergency services. If asked about injury treatment, icing, or meds, refuse and steer to a clinician or ER.

Keep responses focused. Use bullet points. Tie advice to this person's mobility bands and daily plan.

Answer in short plain sentences. Prefer simple correct answers over fancy prose. No filler.`;
}

/** Sport athlete prompt (bjj / bodybuilding): technique tiers unchanged. */
function CSport(n, l) {
  const g = n.full_name ?? "Athlete";
  const c = n.belt ?? "white";
  const o = n.technique_summary;
  const m = n.protocol;
  const s = n.red_techniques;
  const h = n.worst_joints;
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
      : "  Technique readiness pending — sport pack techniques not loaded for this account yet. Assessment is on file.";
  const d =
    r && r.length > 0
      ? r
          .map((e) => {
            const t = (e.limiting_joints ?? []).map((b) => R(b)).join(", ");
            return `  ${e.name} (${e.category})${t ? ` - ${t} limiting` : ""}`;
          })
          .join("\n")
      : "  Technique readiness pending — sport pack techniques not loaded for this account yet. Assessment is on file.";
  const w =
    s && s.length > 0
      ? s
          .slice(0, 8)
          .map((e) => {
            const t = e;
            const b = (t.limiting_joints ?? []).map((E) => R(E)).join(", ");
            return `  ${t.name} (${t.belt} belt) - ${b} limiting`;
          })
          .join("\n")
      : "  None yet";
  const i = formatSavedPlans(p);

  return `You are ROMBot, the AI mobility intelligence assistant for ROMRx.

## Athlete Profile
Name: ${g} | Belt: ${c} belt | Sport: ${l.toUpperCase()}
Technique readiness: ${o ? `${o.green ?? 0} GREEN, ${o.yellow ?? 0} YELLOW, ${o.red ?? 0} RED` : "No assessment yet"}
Priority joints to improve: ${h?.map((e) => R(e)).join(", ") ?? "No assessment yet"}

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

## Critical Rules
- NEVER reveal specific degree values or ROM thresholds
- NEVER use technique codes - use technique names only
- Reference restrictions with soft language: "hip IR is restricted"
- If asked for numbers say: "I can't share exact measurements, but I can tell you how your mobility compares to what each technique needs"
- If assessment data is present (priority joints / latest_assessment_id / protocol), NEVER say the assessment was not completed. If GREEN/YELLOW/RED lists are empty, say technique readiness is pending / sport-pack only — not that assessment is missing.
- When protocol/daily plan rows are present, answer daily-plan questions from them; do not say there is no plan
- Not medical advice. Never give medical advice, treatment, icing/self-care instructions, diagnosis, or emergency triage beyond directing to emergency services. If asked about injury treatment, icing, or meds, refuse and steer to a clinician or ER.

Keep responses focused. Use bullet points. Tie advice to this athlete's GREEN/YELLOW/RED profile.

Answer in short plain sentences. Prefer simple correct answers over fancy prose. No filler.`;
}

function C(n, l) {
  if (isBaseSport(l)) return CBase(n);
  return CSport(n, l);
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
        model: l ?? "gpt-4o",
        messages: [{ role: "system", content: c }, ...h],
        max_tokens: 800,
        temperature: 0.2,
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

async function V(n) {
  if (n.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
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
      const { data: $ } = await s
        .from("user_ai_preferences")
        .select("provider, model, api_key_enc")
        .eq("user_id", d)
        .maybeSingle();
      if ($) {
        a = $.provider;
        r = $.model ?? void 0;
        p = $.api_key_enc ?? "";
      }
      const { data: v } = await s
        .from("users")
        .select("portal_role, full_name, active_sport")
        .eq("id", d)
        .maybeSingle();
      const T = v?.portal_role;
      m = v?.active_sport ?? m;
      if (T === "coach") {
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
            .select("user_id")
            .eq("coach_id", A.id)
            .eq("is_active", true);
          if (S && S.length > 0) {
            const B = S.map((k) => k.user_id)
              .filter(Boolean)
              .map((k) =>
                s
                  .from("rombot_context")
                  .select("*")
                  .eq("user_id", k)
                  .maybeSingle()
                  .then(({ data: I }) => I)
              );
            O = (await Promise.all(B)).filter(Boolean);
          }
        }
        h = D(j, O);
      } else {
        const { data: j } = await s
          .from("rombot_context")
          .select("*")
          .eq("user_id", d)
          .maybeSingle();
        h = C(j ?? {}, m);
      }
    } else {
      if (!o.user_email) {
        return new Response(
          JSON.stringify({ error: "user_email required for guest mode" }),
          { status: 400 }
        );
      }
      const y = o.guest_context ?? {};
      a = o.provider ?? "rombot";
      p = o.provider_key ?? "";
      h = C(y, m);
    }
    let w = [];
    if (f && u) {
      const { data: y } = await s
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", u)
        .order("created_at", { ascending: true })
        .limit(20);
      w = y ?? [];
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
    const i = await M(o.message, P);
    let e = "";
    if (i) {
      const { data: y } = await s.rpc("search_rombot_knowledge", {
        query_embedding: i,
        p_sport: m,
        match_threshold: 0.7,
        match_count: 4,
      });
      if (y && y.length > 0) {
        e =
          "\n\n## Relevant Research\n" +
          y
            .map((_) => `${_.topic}: ${_.chunk} (${_.source_citation})`)
            .join("\n");
      }
    }
    const { text: t, tokens: b, latency: E } = await G(a, r, p, h + e, w, o.message);
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
          .eq("id", u);
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
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (l) {
    const g = l instanceof Error ? l.message : "Unknown error";
    return new Response(JSON.stringify({ error: g }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

export { V as handleRequest };
