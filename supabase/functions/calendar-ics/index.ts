// calendar-ics (P1-12). Rebuilt on 47aad435. BRANCH ONLY, not deployed. JWT required. No secrets beyond the caller's token.
// user_mobility_schedule is live as 20261116143732 (repo file on this parent is still named 030000). Handler fail-softs if the table is missing.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, handle } from "./handler.ts";

function userClient(authHeader: string) {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

Deno.serve((req) => {
  const auth = req.headers.get("Authorization") ?? "";
  const sb = auth.startsWith("Bearer ") ? userClient(auth) : null;
  return handle(req, {
    origins: corsHeaders,
    now: () => new Date(),
    userId: async () => {
      if (!sb) return null;
      const { data: { user } } = await sb.auth.getUser();
      return user?.id ?? null;
    },
    pref: async (uid) => {
      if (!sb) return null;
      const { data } = await sb.from("notification_preferences").select("reminder_time, timezone").eq("user_id", uid).maybeSingle();
      return data as { reminder_time: string | null; timezone: string | null } | null;
    },
    schedule: async (uid) => {
      if (!sb) return null;
      const { data, error } = await sb.from("user_mobility_schedule").select("next_check_at, next_retest_at").eq("user_id", uid).maybeSingle();
      if (error) return null; // fail-soft: weekly events only if the schedule row or table cannot be read
      return data as { next_check_at: string | null; next_retest_at: string | null } | null;
    },
  });
});
