// FG-21 wiring: has this user asked for account deletion? Two independent records are checked, either one is enough:
//  1) account_deletion_requests (status requested or in_progress), the new log (migration fg21, service-role write only);
//  2) client_feedback rows with metadata.kind = "account_deletion_request" (what the live request-account-deletion function already writes).
// FAILS CLOSED: any unexpected error answers true (do not email). The one exception is "table does not exist" (42P01) for source 1,
// which is the state before the FG-21 migration is applied; source 2 still protects those users.
// deno-lint-ignore no-explicit-any
type Sb = any;
export async function deletionRequested(sb: Sb, userId: string): Promise<boolean> {
  try {
    const log = await sb.from("account_deletion_requests").select("id").eq("user_id", userId).in("status", ["requested", "in_progress"]).limit(1);
    if (log.error) { if (log.error.code !== "42P01") return true; }
    else if ((log.data ?? []).length > 0) return true;
    const fb = await sb.from("client_feedback").select("id").eq("user_id", userId).eq("metadata->>kind", "account_deletion_request").limit(1);
    if (fb.error) return true;
    return (fb.data ?? []).length > 0;
  } catch { return true; }
}
