// Resolve the Supabase server/admin key for edge functions.
// Prefer the new secret-key map (auto-injected SUPABASE_SECRET_KEYS JSON),
// fall back to the legacy SUPABASE_SERVICE_ROLE_KEY JWT.
// Do NOT disable legacy keys (H8) until after Oct 12 and every caller migrates.
export function serviceRoleKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const def = parsed?.["default"];
      if (typeof def === "string" && def.length > 0) return def;
    } catch (_e) {
      // fall through to legacy
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}
