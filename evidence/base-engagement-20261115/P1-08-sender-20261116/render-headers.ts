// Renders the send headers for every lifecycle kind at b19b13dc (git archive in /tmp/arch-b19b13dc) using the real handler
// and a fake recipient. Tokens are redacted. Run: deno run --allow-read render-headers.ts
import { sendOne } from "/tmp/arch-b19b13dc/supabase/functions/lifecycle-emails/test/sender-romrx.test.ts";
import { KINDS } from "/tmp/arch-b19b13dc/supabase/functions/lifecycle-emails/source/logic.ts";
const red = (s: string) => s.replace(/([?&]t=)[^&>"\s]+/g, "$1<REDACTED-TOKEN>");
const out: string[] = ["# P1-08 sender header samples, b19b13dca82a3c2eb34a641aa5ca79e410090c00 (BUILD ONLY, rendered locally, nothing sent)", "", "Recipient is fake (user@example.com). Base user (active_sport general). Signed unsubscribe tokens redacted.", ""];
for (const sport of ["general", "bjj"]) {
  if (sport === "bjj") out.push("## For contrast, not part of P1-08: a BJJ user, protocol kind (sport-pack sender unchanged, address omitted)", "");
  for (const kind of sport === "bjj" ? ["protocol"] as const : KINDS) {
    const [s] = await sendOne(kind, sport);
    const from = sport === "bjj" ? s.from.replace(/<[^>]+>/, "<sport-pack address, unchanged>") : s.from;
    const rt = sport === "bjj" ? "(sport-pack address, unchanged)" : s.replyTo;
    out.push(`### ${kind}`, "```", `To: ${s.to}`, `From: ${from}`, `Reply-To: ${rt}`, `Subject: ${s.subject}`,
      ...Object.entries(s.headers).map(([k, v]) => `${k}: ${red(v)}`), "```", "");
  }
}
await Deno.stdout.write(new TextEncoder().encode(out.join("\n")));
