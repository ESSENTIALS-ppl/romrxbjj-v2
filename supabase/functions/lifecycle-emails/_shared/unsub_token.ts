// unsub_token.ts (FG-09/10/11, staged 2026-11-02). Scoped, signed opt-out token for lifecycle emails.
// A token names ONE user and ONE scope, signed with HMAC-SHA256. It cannot be used to read anything and cannot
// switch off any other setting. Fail closed: with no secret, nothing is signed and nothing verifies.
// Secret name (NOT set by this batch): UNSUBSCRIBE_HMAC_SECRET (at least 32 characters).
export type UnsubScope = "retest" | "protocol" | "digest" | "all" | "check7" | "check14" | "lapsed";
export const SCOPES: readonly UnsubScope[] = ["retest", "protocol", "digest", "all", "check7", "check14", "lapsed"];
/** The three settings toggles a scoped link can switch off (unsubscribe SCOPE_COLUMN maps each to its column). */
export type SettingScope = "retest" | "protocol" | "digest";
/** Which settings toggle each scope switches off. P1 scopes (L1031) follow the toggle their email already names, with no new words:
 *  check7 and check14 say "Turn off check reminders" (Settings "Check reminders" = retest_reminders, which also gates the retest email);
 *  lapsed says "Turn off plan day reminders" (Settings "Plan day reminders" = email_reminders, which also gates the protocol email). */
export const SCOPE_SETTING: Readonly<Record<Exclude<UnsubScope, "all">, SettingScope>> = {
  retest: "retest", protocol: "protocol", digest: "digest", check7: "retest", check14: "retest", lapsed: "protocol",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const enc = new TextEncoder();
function b64u(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64uDecode(s: string): Uint8Array | null {
  try {
    const p = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
    const bin = atob(p);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch { return null; }
}
async function key(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey("raw", enc.encode(secret) as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export function secretOk(secret: string | null | undefined): secret is string {
  return typeof secret === "string" && secret.length >= 32;
}
export async function signUnsubToken(secret: string | null | undefined, userId: string, scope: UnsubScope): Promise<string | null> {
  if (!secretOk(secret) || !UUID_RE.test(userId) || !SCOPES.includes(scope)) return null;
  const payload = b64u(enc.encode(JSON.stringify({ u: userId.toLowerCase(), s: scope })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret), enc.encode(payload) as BufferSource));
  return `${payload}.${b64u(sig)}`;
}
export async function verifyUnsubToken(secret: string | null | undefined, token: string | null | undefined): Promise<{ userId: string; scope: UnsubScope } | null> {
  if (!secretOk(secret) || typeof token !== "string" || token.length > 512) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const sig = b64uDecode(parts[1]);
  if (!sig) return null;
  // crypto.subtle.verify compares in constant time.
  const ok = await crypto.subtle.verify("HMAC", await key(secret), sig as BufferSource, enc.encode(parts[0]) as BufferSource);
  if (!ok) return null;
  const raw = b64uDecode(parts[0]);
  if (!raw) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(raw));
    if (typeof p?.u !== "string" || !UUID_RE.test(p.u) || !SCOPES.includes(p?.s)) return null;
    return { userId: p.u.toLowerCase(), scope: p.s as UnsubScope };
  } catch { return null; }
}
