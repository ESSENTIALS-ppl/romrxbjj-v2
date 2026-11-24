// _shared/events.ts - server-side product event logging (ROMRx Base audit 2026-09-15)
// Writes to public.product_events with the service role. Never throws.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

let _admin: SupabaseClient | null = null;
function admin(): SupabaseClient | null {
  if (_admin) return _admin;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  _admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _admin;
}

export async function logEvent(
  event: string,
  opts: { userId?: string | null; props?: Record<string, unknown>; sport?: string | null; source?: string; path?: string | null } = {},
): Promise<void> {
  try {
    const a = admin();
    if (!a) return;
    const { error } = await a.from("product_events").insert({
      user_id: opts.userId ?? null,
      event: event.slice(0, 64),
      props: opts.props ?? {},
      sport: opts.sport ?? null,
      source: opts.source ?? "edge",
      path: opts.path ?? null,
    });
    if (error) console.error(`[events] ${event} failed:`, error.message);
  } catch (e) {
    console.error(`[events] ${event} threw:`, String(e));
  }
}
