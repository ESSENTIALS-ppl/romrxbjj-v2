import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handle, flagOn } from "./handler.ts";

Deno.serve((req: Request) =>
  handle(req, {
    exportOn: flagOn(Deno.env.get("EXPORT_MY_DATA")),
    // The caller's own JWT: RLS applies. No service-role key is read by this function.
    userClient: (authHeader: string) =>
      createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } }),
  })
);
