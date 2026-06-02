// ROMRx AI Chat v31 — sport-aware (PR #5)
// - Resolves user's active_sport server-side (was trusted from client)
// - RAG filters rombot_knowledge by (sport='general' OR sport=active_sport)
// - Coach mode: roster-level system prompt
// - Athlete mode: individual context
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

// ── Coach roster system prompt ──────────────────────────────────────────────
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

    return `### ${name} (${belt} belt)
  Readiness: ${summary ? `${summary.green ?? 0} GREEN / ${summary.yellow ?? 0} YELLOW / ${summary.red ?? 0} RED` : "No assessment"}
  Priority joints: ${worst?.map(j => labelJoint(j)).join(", ") ?? "No data"}
  GREEN techniques (ready to train):
${greenSection}
  YELLOW techniques (train with awareness):
${yellowSection}
  Saved game plans:
${plansSection}`;
  });

  return `You are ROMBot, the team intelligence assistant for ROMRxBJJ coach ${coachName}.

You have full access to ALL of your athletes' ROM profiles, technique readiness, and saved game plans. Use this data to answer coaching questions with specificity.

## Your Roster (${rosterContexts.length} athlete${rosterContexts.length !== 1 ? "s" : ""})

${athleteSections.join("\n\n")}

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
- Be direct and coaching-focused. You are talking to a professional.

Keep responses concise and actionable. Use bullet points. Always tie advice to actual athlete data.`;
}

// ── Athlete system prompt ────────────────────────────────────────────────────
function buildAthleteSystemPrompt(ctx: Record<string, unknown>, sport: string): string {
  const name        = ctx.full_name ?? "Athlete";
  const belt        = ctx.belt ?? "white";
  const techSummary = ctx.technique_summary as Record<string, number> | null;
  const protocol    = ctx.protocol as unknown[] | null;
  const redTechs    = ctx.red_techniques as unknown[] | null;
  const worstJoints = ctx.worst_joints as string[] | null;
  const greenTechs  = ctx.green_techniques as Array<{name: string; category: string; belt: string}> | null;
  const yellowTechs = ctx.yellow_techniques as Array<{name: string; category: string; belt: string; limiting_joints: string[] | null}> | null;
  const savedPlans  = ctx.saved_game_plans as Array<{name: string; path_mode: string; techniques: Array<{name: string; category: string}>; created_at: string}> | null;

  const greenByCategory = (greenTechs ?? []).reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t.name);
    return acc;
  }, {} as Record<string, string[]>);
  const greenSection = Object.entries(greenByCategory).length > 0
    ? Object.entries(greenByCategory).map(([cat, names]) => `  ${cat}: ${names.join(", ")}`).join("\n")
    : "  No assessment completed yet";

  const yellowSection = yellowTechs && yellowTechs.length > 0
    ? yellowTechs.map(t => {
        const joints = (t.limiting_joints ?? []).map(j => labelJoint(j)).join(", ");
        return `  ${t.name} (${t.category})${joints ? ` - ${joints} limiting` : ""}`;
      }).join("\n")
    : "  No assessment completed yet";

  const redSection = redTechs && redTechs.length > 0
    ? redTechs.slice(0, 8).map((t: unknown) => {
        const tech = t as Record<string, unknown>;
        const joints = ((tech.limiting_joints ?? []) as string[]).map(j => labelJoint(j)).join(", ");
        return `  ${tech.name} (${tech.belt} belt) - ${joints} limiting`;
      }).join("\n")
    : "  None yet";

  const plansSection = savedPlans && savedPlans.length > 0
    ? savedPlans.map(p => {
        const chain = (p.techniques ?? []).map((t: {name: string}) => t.name).join(" > ");
        return `  "${p.name}" (${p.path_mode}): ${chain}`;
      }).join("\n")
    : "  No saved game plans yet";

  return `You are ROMBot, the AI mobility intelligence assistant for ROMRx.

## Athlete Profile
Name: ${name} | Belt: ${belt} belt | Sport: ${sport.toUpperCase()}
Technique readiness: ${techSummary ? `${techSummary.green ?? 0} GREEN, ${techSummary.yellow ?? 0} YELLOW, ${techSummary.red ?? 0} RED` : "No assessment yet"}
Priority joints to improve: ${worstJoints?.map(j => labelJoint(j)).join(", ") ?? "No assessment yet"}

## GREEN techniques - ready to train now
${greenSection}

## YELLOW techniques - train with awareness
${yellowSection}

## RED techniques - build mobility before attempting
${redSection}

## Priority mobility protocol
${protocol?.slice(0, 3).map((p: unknown) => {
  const ex = p as Record<string, unknown>;
  return `  ${ex.joint ?? ex.jointKey}: ${ex.exercise} - ${ex.sets}x${ex.reps} (${ex.cue ?? ex.coaching_cue})`;
}).join("\n") ?? "  No protocol generated yet"}

## Saved Game Plans
${plansSection}

## Critical Rules
- NEVER reveal specific degree values or ROM thresholds
- NEVER use technique codes - use technique names only
- Reference restrictions with soft language: "hip IR is restricted"
- If asked for numbers say: "I can't share exact measurements, but I can tell you how your mobility compares to what each technique needs"

Keep responses focused. Use bullet points. Tie advice to this athlete's GREEN/YELLOW/RED profile.`;
}

async function getEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-ada-002", input: text.slice(0, 1000) }),
    });
    const data = await res.json();
    return data.data?.[0]?.embedding ?? null;
  } catch { return null; }
}

async function callProvider(provider: string, model: string | undefined, apiKey: string, systemPrompt: string, history: Array<{role: string; content: string}>, userMessage: string): Promise<{text: string; tokens: number; latency: number}> {
  const t0 = Date.now();
  const messages = [...history.map(m => ({role: m.role, content: m.content})), {role: "user", content: userMessage}];
  if (provider === "rombot" || provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {Authorization: `Bearer ${apiKey || ROMRX_OPENAI_KEY}`, "Content-Type": "application/json"},
      body: JSON.stringify({model: model ?? "gpt-4o", messages: [{role: "system", content: systemPrompt}, ...messages], max_tokens: 1200, temperature: 0.5}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "OpenAI error");
    return {text: data.choices[0].message.content, tokens: data.usage?.total_tokens ?? 0, latency: Date.now() - t0};
  }
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {"x-api-key": apiKey || ROMRX_ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
      body: JSON.stringify({model: model ?? "claude-opus-4-5", system: systemPrompt, messages, max_tokens: 1200}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Anthropic error");
    return {text: data.content[0].text, tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0), latency: Date.now() - t0};
  }
  throw new Error(`Unknown provider: ${provider}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {headers: {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"}});
  }
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    const role = jwtRole(token);
    const body = await req.json();
    // Sport: server-resolved from users.active_sport for auth'd users so
    // the client cannot escalate access. Guests fall back to body.sport.
    let sport: string = body.sport ?? "bjj";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let systemPrompt = "";
    let provider = "rombot", providerModel: string | undefined, providerKey = "";
    let conversationId: string | undefined = body.conversation_id;
    let saveHistory = false, userId: string | undefined;

    if (role === "authenticated") {
      const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {global: {headers: {Authorization: authHeader}}});
      const {data: {user}, error: authErr} = await userClient.auth.getUser();
      if (authErr || !user) return new Response(JSON.stringify({error: "Unauthorized"}), {status: 401});
      userId = user.id; saveHistory = true;

      const {data: prefs} = await supabase.from("user_ai_preferences").select("provider, model, api_key_enc").eq("user_id", userId).maybeSingle();
      if (prefs) { provider = prefs.provider; providerModel = prefs.model ?? undefined; providerKey = prefs.api_key_enc ?? ""; }

      // Resolve portal role + active sport server-side
      const {data: userRow} = await supabase.from("users").select("portal_role, full_name, active_sport").eq("id", userId).maybeSingle();
      const portalRole = userRow?.portal_role as string | undefined;
      sport = (userRow?.active_sport as string | undefined) ?? sport;

      if (portalRole === "coach") {
        // ── COACH MODE ─────────────────────────────────────────────────────
        const coachName = (userRow?.full_name as string | null) ?? "Coach";
        const { data: coachRow } = await supabase.from("coaches").select("id").eq("user_id", userId).maybeSingle();

        let rosterContexts: Array<Record<string, unknown>> = [];
        if (coachRow) {
          const { data: athletes } = await supabase.from("athletes").select("user_id").eq("coach_id", coachRow.id).eq("is_active", true);
          if (athletes && athletes.length > 0) {
            const userIds = athletes.map(a => a.user_id).filter(Boolean);
            const ctxPromises = userIds.map(uid =>
              supabase.from("rombot_context").select("*").eq("user_id", uid).maybeSingle().then(({data}) => data)
            );
            const results = await Promise.all(ctxPromises);
            rosterContexts = results.filter(Boolean) as Array<Record<string, unknown>>;
          }
        }
        systemPrompt = buildCoachSystemPrompt(coachName, rosterContexts);
      } else {
        // ── ATHLETE MODE ───────────────────────────────────────────────────
        const {data: dbCtx} = await supabase.from("rombot_context").select("*").eq("user_id", userId).maybeSingle();
        const ctx = dbCtx ?? {};
        systemPrompt = buildAthleteSystemPrompt(ctx, sport);
      }
    } else {
      if (!body.user_email) return new Response(JSON.stringify({error: "user_email required for guest mode"}), {status: 400});
      const ctx = body.guest_context ?? {};
      provider = body.provider ?? "rombot";
      providerKey = body.provider_key ?? "";
      systemPrompt = buildAthleteSystemPrompt(ctx, sport);
    }

    let history: Array<{role: string; content: string}> = [];
    if (saveHistory && conversationId) {
      const {data: dbHistory} = await supabase.from("ai_messages").select("role, content").eq("conversation_id", conversationId).order("created_at", {ascending: true}).limit(20);
      history = (dbHistory ?? []) as typeof history;
    } else if (body.history) { history = (body.history as typeof history).slice(-10); }

    if (saveHistory && !conversationId && userId) {
      const {data: convo, error: convoErr} = await supabase.from("ai_conversations").insert({user_id: userId, sport, provider, model: providerModel ?? null, context_snapshot: {}}).select("id").single();
      if (convoErr) throw convoErr;
      conversationId = convo.id;
    }

    // RAG: sport-aware semantic search.
    // One-way model: sport users see general + their sport. Pass p_sport so
    // the RPC filters rombot_knowledge by (sport='general' OR sport=p_sport).
    const embedding = await getEmbedding(body.message, ROMRX_OPENAI_KEY);
    let ragSection = "";
    if (embedding) {
      const { data: chunks } = await supabase.rpc("search_rombot_knowledge", {
        query_embedding: embedding,
        p_sport: sport,
        match_threshold: 0.7,
        match_count: 4,
      });
      if (chunks && chunks.length > 0) {
        ragSection = "\n\n## Relevant Research\n" + chunks.map((c: {topic: string; chunk: string; source_citation: string}) =>
          `${c.topic}: ${c.chunk} (${c.source_citation})`
        ).join("\n");
      }
    }

    const {text, tokens, latency} = await callProvider(provider, providerModel, providerKey, systemPrompt + ragSection, history, body.message);

    if (saveHistory && conversationId && userId) {
      await supabase.from("ai_messages").insert([
        {conversation_id: conversationId, user_id: userId, role: "user", content: body.message},
        {conversation_id: conversationId, user_id: userId, role: "assistant", content: text, tokens_used: tokens, latency_ms: latency},
      ]);
      if (!body.conversation_id) await supabase.from("ai_conversations").update({title: body.message.slice(0, 60)}).eq("id", conversationId);
    }

    return new Response(JSON.stringify({reply: text, conversation_id: conversationId ?? null, provider, sport}), {headers: {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}});
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({error: msg}), {status: 500, headers: {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}});
  }
});
