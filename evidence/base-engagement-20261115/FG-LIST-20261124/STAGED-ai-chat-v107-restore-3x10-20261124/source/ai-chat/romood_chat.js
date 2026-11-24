// ROMBot reads the SIGNED-IN user's own ROMood check-ins (Stacy ruling Oct 28 2026,
// /workspace/beta-launch/proof-20261020/stacy-rombot-mood-ruling-20261028.md).
//
// Rules this module enforces:
//  * Rows are read with the caller's own client (RLS) AND filtered by the user id taken from the verified JWT
//    (auth.getUser in handler.js). Never an id from the request body, never another user.
//  * Reads happen only when the user's latest ROMood consent is v3 (Stacy, Oct 28 2026: the single ROMood opt-in became
//    v3 and now covers ROMBot): mood_settings.saving_on, a valid tick time, and consent_version v3-rombot-20261028. This is
//    the same test as My Body (hasCurrentConsent in app/src/lib/romood.ts). v2 users have not ticked the v3 text, so
//    nothing is read for them until they tick again. Anything else, including an error, sends no mood data anywhere.
//  * No caching, no module state. Every request re-reads, so turning saving off stops reads on the very next message.
//  * Same average as My Body: all-time (ROMOOD_MYBODY_CONFIG.averageWindow all_time, retention until_delete),
//    Math.round of the mean energy and pleasantness, label = nearest feeling word (nearestWord).
//  * Crisis: the LIVE ai-chat crisis route (detectCrisis, Stacy v3 replies A/B, unconditional) runs before this module is
//    ever called and is unchanged. As an extra guard, a message that this module's own crisis words match is never treated
//    as a mood question (no mood read, no mood answer); it falls through to the normal live path. Never triggered by a score.
//  * Re-cut Nov 24 2026 on live ai-chat v101 (Avery): the Oct 28 CRISIS_REPLY constant was removed (live v3 wording rules).
import { ROMOOD_TIPS, ROMOOD_TIPS_ENABLED, ROMOOD_TIP_FOOTER } from "./romood_tips.js";

export const ROMOOD_V2_CONSENT_VERSION = "v2-email-20261026"; // email only; NOT enough for ROMBot
export const ROMOOD_V3_CONSENT_VERSION = "v3-rombot-20261028"; // same constant as ROMOOD_CONSENT_VERSION in io app/src/lib/romoodCopy.ts

// Stacy, exact strings.
export const MOOD_DISCLAIMER = "This is a summary of your own check-ins, not a mental health assessment. ROMRx is not a crisis service and does not monitor your check-ins.";
export const MOOD_CONSENT_OFF_REPLY = "Turn on ROMBot access in Settings to ask about your ROMood check-ins.";
// Avery wording (needs Stacy's pass): plain, no data, no label.
export const MOOD_NO_DATA_REPLY = "You don't have any ROMood check-ins saved yet. Do a Quick ROMood check in My Body, then ask me again.";
export const MOOD_PROVIDER_REPLY = "ROMBot can only read your ROMood check-ins in standard ROMBot, not with an AI provider you added yourself.";
export const MOOD_ERROR_REPLY = "I couldn't load your ROMood check-ins right now. Please try again in a moment.";
// My Body card lines (ROMOOD_MYBODY_COPY.divider and .reflection), kept on every mood answer.
export const MOOD_SEPARATE_LINE = "Mood is not part of your body score. Not medical or mental health advice.";

const CRISIS_RE = /\b(suicid\w*|kill(?:ing)? (?:myself|me)|end(?:ing)? (?:my|my own) life|end(?:ing)? it all|take (?:my own|my) life|self[- ]?harm\w*|hurt(?:ing)? myself|harm(?:ing)? myself|cut(?:ting)? myself|(?:want(?:ed)?|wanna|going) to die|(?:don'?t|do not|dont) want to (?:live|be alive|be here)|better off dead|better off without me|no reason to live|wish i (?:was|were) dead|(?:i'?m|i am|im) in (?:immediate |real )?danger|someone (?:is )?(?:hurting|going to hurt) me)\b/i;
/** Message-only test. Never looks at a score, an average or any stored data. */
export function isCrisisMessage(msg) {
  return CRISIS_RE.test(String(msg ?? "").replace(/[\u2018\u2019]/g, "'"));
}

// Re-cut Nov 24 2026: "how do i feel" dropped from the trigger ("how do I feel about training" is a training question, and a
// false match would send mood data to the model for nothing). Flagged for Stacy and Vera.
const MOOD_Q_RE = /\b(mood|moods|romood|how (?:am i|have i been) feel(?:ing)?|my feelings?|how i(?:'ve| have) been feeling|check[- ]?ins?)\b/i;
/** True when the message asks about mood or check-ins, so mood data is read only when it is needed. */
export function isMoodQuestion(msg) {
  return MOOD_Q_RE.test(String(msg ?? ""));
}

const TIP_RE = /\b(tips?|suggest\w*|advice|ideas?|recommend\w*|what (?:can|should) i do|how (?:can|do|could) i (?:feel better|lift|improve|boost|raise))\b/i;
/** A tip is given only when the user asks for one, and the ask is about mood. A plain mood question never gets a tip. */
export function isMoodTipRequest(msg) {
  const m = String(msg ?? "");
  return MOOD_Q_RE.test(m) && TIP_RE.test(m);
}

// ---- same math as My Body (app/src/lib/romood.ts, romoodCopy.ts). Parity pinned in test/romood_chat.test.mjs ----
const WORDS = [
  ["Riled", "high_unpleasant"], ["Wired", "high_unpleasant"], ["Angry", "high_unpleasant"], ["Tense", "high_unpleasant"],
  ["Excited", "high_pleasant"], ["Upbeat", "high_pleasant"], ["Happy", "high_pleasant"], ["Lively", "high_pleasant"],
  ["Low", "low_unpleasant"], ["Flat", "low_unpleasant"], ["Drained", "low_unpleasant"], ["Bored", "low_unpleasant"],
  ["Calm", "low_pleasant"], ["Content", "low_pleasant"], ["Relaxed", "low_pleasant"], ["Mellow", "low_pleasant"],
];
function positionFor(word, quadrant) {
  const inQuad = WORDS.filter((w) => w[1] === quadrant);
  const i = inQuad.findIndex((w) => w[0] === word);
  const row = Math.floor(i / 2), col = i % 2;
  const hi = quadrant.startsWith("high"), pl = quadrant.endsWith("_pleasant");
  return { energy: hi ? (row === 0 ? 90 : 70) : (row === 0 ? 30 : 10), pleasantness: pl ? (col === 0 ? 70 : 90) : (col === 0 ? 10 : 30) };
}
export function nearestWord(energy, pleasantness) {
  let best = WORDS[0][0], bd = Infinity;
  for (const [word, quad] of WORDS) {
    const p = positionFor(word, quad);
    const d = (p.energy - energy) ** 2 + (p.pleasantness - pleasantness) ** 2;
    if (d < bd) { bd = d; best = word; }
  }
  return best;
}
/**
 * Notch rule (Jim and Grant, Oct 28 2026): bin of mean(average energy, average pleasantness) on 0 to 100.
 * 0-9 is notch 1, 10-19 is 2, ... 80-89 is 9, 90-100 is 10. Fractions (a mean of x.5) fall in the bin below the next ten.
 */
export function moodNotch(value) {
  const v = Math.max(0, Math.min(100, Number(value)));
  if (!Number.isFinite(v)) return 1;
  return Math.min(10, Math.floor(v / 10) + 1);
}

const NY = "America/New_York";
function nyDate(iso) {
  return new Intl.DateTimeFormat("en-US", { timeZone: NY, month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}
const mean = (a, k) => Math.round(a.reduce((s, x) => s + Number(x[k]), 0) / a.length);

/** Average, latest, count and trend from this user's own rows. Numbers and dates only. Null when there are no rows. */
export function summarizeMoodRows(rows, now = new Date()) {
  const r = (rows ?? []).filter((x) => x && Number.isFinite(Number(x.energy)) && Number.isFinite(Number(x.pleasantness)) && x.created_at);
  if (r.length === 0) return null;
  const energy = mean(r, "energy"), pleasantness = mean(r, "pleasantness");
  const latest = r.reduce((a, b) => (Date.parse(b.created_at) > Date.parse(a.created_at) ? b : a));
  const t = now.getTime(), D7 = 7 * 86400000;
  const last7 = r.filter((x) => Date.parse(x.created_at) >= t - D7);
  const prev7 = r.filter((x) => Date.parse(x.created_at) >= t - 2 * D7 && Date.parse(x.created_at) < t - D7);
  const trend = last7.length && prev7.length
    ? { last7: { n: last7.length, energy: mean(last7, "energy"), pleasantness: mean(last7, "pleasantness") },
        prev7: { n: prev7.length, energy: mean(prev7, "energy"), pleasantness: mean(prev7, "pleasantness") } }
    : null;
  return {
    count: r.length, energy, pleasantness, word: nearestWord(energy, pleasantness), notch: moodNotch((energy + pleasantness) / 2),
    latest: { date: nyDate(latest.created_at), energy: Number(latest.energy), pleasantness: Number(latest.pleasantness), word: latest.word ?? null },
    trend,
  };
}

const times = (n) => `${n} ${n === 1 ? "check-in" : "check-ins"}`;
function trendLine(s) {
  if (!s.trend) return "Trend: not enough check-ins in the last two weeks to compare.";
  const { last7: a, prev7: b } = s.trend;
  const d = (x, y) => { const v = x - y; return v > 0 ? `+${v}` : `${v}`; };
  return `Trend: the last 7 days (${times(a.n)}) averaged energy ${a.energy} and pleasantness ${a.pleasantness}. The 7 days before (${times(b.n)}) averaged energy ${b.energy} and pleasantness ${b.pleasantness}. Change: energy ${d(a.energy, b.energy)}, pleasantness ${d(a.pleasantness, b.pleasantness)}.`;
}

/** The block added to the system prompt. Only this user's own numbers. */
export function moodPromptBlock(s) {
  return `\n\n## Your ROMood check-ins (this person's own, shared with their permission)
Check-ins saved: ${s.count}
Average (all time): energy ${s.energy} of 100, pleasantness ${s.pleasantness} of 100. Nearest feeling word: ${s.word}.
Latest check-in (${s.latest.date}): energy ${s.latest.energy}, pleasantness ${s.latest.pleasantness}${s.latest.word ? `, word ${s.latest.word}` : ""}.
${trendLine(s)}

MOOD RULES (follow every one):
- Answer only from the numbers, counts, dates and words above. If something is not above, say you do not have it.
- Numbers only: average, count, dates, change. No diagnosis, no labels about the person (never use depressed, anxious, or similar), no reading into what the numbers mean.
- Do not give tips, advice, exercises or suggestions. Do not mention therapy, treatment, medication or supplements. Tips are handled separately by the app.
- Never connect mood to the body score or to the person's joints. Mood is separate from the body score.
- Keep it short and plain.`;
}

/** Plain code-written answer. Used when the model's reply breaks a rule, and pinned in tests. */
export function plainMoodAnswer(s) {
  return `You have ${times(s.count)} saved. Your average is ${s.word} (energy ${s.energy}, pleasantness ${s.pleasantness}). Your latest was on ${s.latest.date}: energy ${s.latest.energy}, pleasantness ${s.latest.pleasantness}${s.latest.word ? `, ${s.latest.word}` : ""}. ${trendLine(s)}`;
}

const LABEL_RE = /\b(depress\w*|anxi\w*|bipolar|disorder|diagnos\w*|therap\w*|counsel\w*|medicat\w*|supplement\w*|psychiatr\w*|mental illness|should (?:see|talk to|get help)|seek help)\b/i;
/** True when a model reply carries a banned label or advice. The caller swaps in plainMoodAnswer. */
export function moodReplyBreaksRules(text) {
  return LABEL_RE.test(String(text ?? ""));
}

export function tipForNotch(notch) {
  if (!ROMOOD_TIPS_ENABLED) return null;
  return ROMOOD_TIPS.find((t) => t.notch === notch) ?? null;
}

/** Stacy: the disclaimer goes on the first mood answer in a chat only. History is this chat's own messages. */
export function disclaimerAlreadyShown(history) {
  return (history ?? []).some((m) => m && m.role === "assistant" && String(m.content ?? "").includes(MOOD_DISCLAIMER));
}

/** Final text for a mood answer that came from the model. */
export function composeMoodReply(modelText, summary, history) {
  const body = moodReplyBreaksRules(modelText) ? plainMoodAnswer(summary) : String(modelText ?? "").trim();
  const parts = [];
  if (!disclaimerAlreadyShown(history)) parts.push(MOOD_DISCLAIMER);
  parts.push(body, MOOD_SEPARATE_LINE);
  return parts.join("\n\n");
}

/** Pointer to the check-in button, used on every tip fallback. */
export const MOOD_CHECKIN_POINTER = "To log a check-in, use Quick ROMood check on My Body.";

/**
 * Reply to "give me a tip for my mood". Fixed text, no model call. The tip is the one for the user's notch; the text never
 * mentions the notch, the score or a low mood. With no check-ins, or with consent off, there is no tip and the user is
 * pointed to Quick ROMood check on My Body (and, when consent is the reason, to the opt-in in Settings).
 */
export function tipRequestReply(load, history) {
  if (load.status === "error") return MOOD_ERROR_REPLY;
  if (load.status === "no_data") return `I don't have any ROMood check-ins to go on yet, so I can't pick a tip. ${MOOD_CHECKIN_POINTER}`;
  if (load.status === "consent_off") return `${MOOD_CONSENT_OFF_REPLY} ${MOOD_CHECKIN_POINTER}`;
  const tip = tipForNotch(load.summary.notch);
  if (!tip) return `I don't have a tip to share right now. ${MOOD_CHECKIN_POINTER}`;
  const parts = [];
  if (!disclaimerAlreadyShown(history)) parts.push(MOOD_DISCLAIMER);
  parts.push(`${tip.text}\nSource: ${tip.url}\n${ROMOOD_TIP_FOOTER}`);
  return parts.join("\n\n");
}

/** Drops earlier mood answers (they carry the mood separator line) from the history sent to the provider. */
export function stripMoodHistory(history) {
  return (history ?? []).filter((m) => !(m && m.role === "assistant" && String(m.content ?? "").includes(MOOD_SEPARATE_LINE)));
}

/** True only for the latest consent (v3): saving on, a valid tick time, and the v3 version string. v2 and older are false. */
export function moodConsentCurrent(s) {
  return !!s && s.saving_on === true && typeof s.opted_in_at === "string" && s.opted_in_at.length > 0 && !Number.isNaN(Date.parse(s.opted_in_at)) && s.consent_version === ROMOOD_V3_CONSENT_VERSION;
}

/**
 * db: the CALLER's Supabase client (their JWT, RLS applies). userId: from auth.getUser, never from the request.
 * Returns { status: "consent_off" | "no_data" | "error" } or { status: "ok", summary }.
 */
export async function loadMoodForAi(db, userId, now = new Date()) {
  if (!db || !userId) return { status: "consent_off" };
  try {
    const s = await db.from("mood_settings").select("saving_on, opted_in_at, consent_version").eq("user_id", userId).maybeSingle();
    if (s.error) return { status: "error" };
    if (!moodConsentCurrent(s.data)) return { status: "consent_off" };
    const r = await db.from("mood_entries").select("energy, pleasantness, word, created_at").eq("user_id", userId).order("created_at", { ascending: false });
    if (r.error) return { status: "error" };
    const summary = summarizeMoodRows(r.data, now);
    return summary ? { status: "ok", summary } : { status: "no_data" };
  } catch {
    return { status: "error" };
  }
}
