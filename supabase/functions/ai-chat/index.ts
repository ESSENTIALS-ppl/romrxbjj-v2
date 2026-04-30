// ============================================================
// ROMRx AI Chat — Supabase Edge Function v3
// Supports two auth modes:
//   1. Supabase JWT (future authenticated users)
//   2. Guest mode (anon key + user_email + guest_context)
//      — used by existing GAS-auth dashboard users
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ROMRX_OPENAI_KEY = Deno.env.get("romrx_openai_key") ?? "";
const ROMRX_ANTHROPIC_KEY = Deno.env.get("romrx_anthropic_key") ?? "";

// ---- Helpers ----
function jwtRole(jwt: string): string {
  try {
    return JSON.parse(atob(jwt.split(".")[1]))?.role ?? "anon";
  } catch { return "anon"; }
}

// ---- System prompt builder ----
function buildSystemPrompt(ctx: Record<string, unknown>, sport: string): string {
  const name = ctx.full_name ?? "Athlete";
  const belt = ctx.belt ?? "white";
  const romTotal = ctx.rom_total ?? "N/A";
  const romPct = ctx.rom_percentile ?? "N/A";
  const techSummary = ctx.technique_summary as Record<string, number> | null;
  const protocol = ctx.protocol as unknown[] | null;
  const redTechs = ctx.red_techniques as unknown[] | null;
  const worstJoints = ctx.worst_joints as string[] | null;

  return `You are ROMBot, the AI mobility intelligence assistant for ROMRx — the world's only ROM-to-technique mapping system for athletes.

## Who you're talking to
Name: ${name}
Sport: ${sport.toUpperCase()}
Belt: ${belt} belt
ROM Total Score: ${romTotal}${romPct !== "N/A" ? ` (${romPct}th percentile)` : ""}

## Their current ROM assessment
Worst joints: ${worstJoints?.join(", ") ?? "No assessment yet"}

## Technique readiness (${sport.toUpperCase()})
${techSummary ? `GREEN (ready): ${techSummary.green ?? 0} | YELLOW (build toward): ${techSummary.yellow ?? 0} | RED (avoid now): ${techSummary.red ?? 0}` : "No assessment computed yet"}

## Top RED techniques to work toward
${redTechs?.slice(0, 5).map((t: unknown) => {
  const tech = t as Record<string, unknown>;
  const joints = Array.isArray(tech.limiting_joints) ? tech.limiting_joints.join(", ") :
    (tech.limitingJoints ? (tech.limitingJoints as string[]).join(", ") : "unknown");
  return `- ${tech.name ?? tech.technique} (${tech.belt} belt) — limiting: ${joints}`;
}).join("\n") ?? "None yet"}

## Priority mobility protocol
${protocol?.slice(0, 3).map((p: unknown) => {
  const ex = p as Record<string, unknown>;
  return `- ${ex.joint ?? ex.jointKey}: ${ex.exercise} — ${ex.sets}×${ex.reps} (${ex.cue ?? ex.coaching_cue})`;
}).join("\n") ?? "No protocol generated yet"}

## Your role
- Answer questions about their ROM scores, technique readiness, and mobility protocol
- Explain WHY a technique is RED, YELLOW, or GREEN using their actual joint data
- Suggest specific exercises when asked how to improve
- Research ROM science when asked (you have deep knowledge of JSCR, BJSM, IJSPT research)
- Help them understand their assessment results in plain language
- Be direct, evidence-based, and sport-specific. Never give generic fitness advice.
- If they ask about a sport you don't have data for yet, tell them that vertical is coming soon.

Keep responses concise. Use bullet points when listing exercises or techniques. Always tie advice back to their specific ROM numbers.`;
}

// ---- Provider routing ----
async function callProvider(
  provider: string,
  model: string | undefined,
  apiKey: string,
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string
): Promise<{ text: string; tokens: number; latency: number }> {
  const t0 = Date.now();
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  if (provider === "rombot" || provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey || ROMRX_OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model ?? "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 800,
        temperature: 0.4,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "OpenAI error");
    return { text: data.choices[0].message.content, tokens: data.usage?.total_tokens ?? 0, latency: Date.now() - t0 };
  }

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey || ROMRX_ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: model ?? "claude-opus-4-5", system: systemPrompt, messages, max_tokens: 800 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Anthropic error");
    return { text: data.content[0].text, tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0), latency: Date.now() - t0 };
  }

  if (provider === "google") {
    const gModel = model ?? "gemini-1.5-pro";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + userMessage }] }] }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Google error");
    return { text: data.candidates[0].content.parts[0].text, tokens: 0, latency: Date.now() - t0 };
  }

  if (provider === "perplexity") {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: model ?? "sonar-pro", messages: [{ role: "system", content: systemPrompt }, ...messages], max_tokens: 800 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Perplexity error");
    return { text: data.choices[0].message.content, tokens: data.usage?.total_tokens ?? 0, latency: Date.now() - t0 };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

// ---- Main handler ----
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    const role = jwtRole(token);

    const body = await req.json();
    const sport = body.sport ?? "bjj";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let ctx: Record<string, unknown> = {};
    let provider = "rombot";
    let providerModel: string | undefined;
    let providerKey = "";
    let conversationId: string | undefined = body.conversation_id;
    let saveHistory = false;
    let userId: string | undefined;

    // ---- Mode A: Authenticated Supabase user (JWT role = authenticated) ----
    if (role === "authenticated") {
      const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authErr } = await userClient.auth.getUser();
      if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

      userId = user.id;
      saveHistory = true;

      const { data: prefs } = await supabase.from("user_ai_preferences").select("provider, model, api_key_enc").eq("user_id", userId).maybeSingle();
      if (prefs) { provider = prefs.provider; providerModel = prefs.model ?? undefined; providerKey = prefs.api_key_enc ?? ""; }

      const { data: dbCtx } = await supabase.from("rombot_context").select("*").eq("user_id", userId).maybeSingle();
      ctx = dbCtx ?? {};

    // ---- Mode B: Guest mode (anon key + user_email + guest_context) ----
    } else {
      if (!body.user_email) {
        return new Response(JSON.stringify({ error: "user_email required for guest mode" }), { status: 400 });
      }
      ctx = body.guest_context ?? {};
      provider = body.provider ?? "rombot";
      providerKey = body.provider_key ?? "";
      // Guest history passed in request body (localStorage managed by client)
    }

    const systemPrompt = buildSystemPrompt(ctx, sport);

    // ---- Build history ----
    let history: Array<{ role: string; content: string }> = [];

    if (saveHistory && conversationId) {
      const { data: dbHistory } = await supabase
        .from("ai_messages").select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }).limit(20);
      history = (dbHistory ?? []) as typeof history;
    } else if (body.history) {
      // Guest mode: client passes last N messages
      history = (body.history as typeof history).slice(-10);
    }

    // ---- Create conversation (authenticated only) ----
    if (saveHistory && !conversationId && userId) {
      const { data: convo, error: convoErr } = await supabase
        .from("ai_conversations")
        .insert({ user_id: userId, sport, provider, model: providerModel ?? null, context_snapshot: ctx })
        .select("id").single();
      if (convoErr) throw convoErr;
      conversationId = convo.id;
    }

    // ---- Call AI ----
    const { text, tokens, latency } = await callProvider(provider, providerModel, providerKey, systemPrompt, history, body.message);

    // ---- Save to DB (authenticated only) ----
    if (saveHistory && conversationId && userId) {
      await supabase.from("ai_messages").insert([
        { conversation_id: conversationId, user_id: userId, role: "user", content: body.message },
        { conversation_id: conversationId, user_id: userId, role: "assistant", content: text, tokens_used: tokens, latency_ms: latency },
      ]);
      if (!body.conversation_id) {
        const title = body.message.slice(0, 60) + (body.message.length > 60 ? "..." : "");
        await supabase.from("ai_conversations").update({ title }).eq("id", conversationId);
      }
    }

    return new Response(
      JSON.stringify({ reply: text, conversation_id: conversationId ?? null, provider }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
