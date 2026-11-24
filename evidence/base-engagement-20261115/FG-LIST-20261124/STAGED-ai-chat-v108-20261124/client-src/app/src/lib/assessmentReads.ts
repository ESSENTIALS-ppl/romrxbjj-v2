// P1-06b: assessment reads skip quick-check rows (P1-06 writes check_kind = 'quick').
// Null-safe, the same as SQL `check_kind IS DISTINCT FROM 'quick'`: older rows with no check_kind still count.
// SHIP DEPENDENCY: the check_kind column arrives in Avery's migration 20261116031000. Before that migration is live,
// PostgREST rejects the filter (unknown column) and every read below gets an error, so this must ship with or after
// that migration and with P1-06 (5ab7443).
export const SKIP_QUICK_OR = 'check_kind.is.null,check_kind.neq.quick'

/** Adds the null-safe "not a quick check" filter to a supabase-js query on public.assessments. */
export function skipQuick<Q extends { or: (filters: string) => Q }>(query: Q): Q {
  return query.or(SKIP_QUICK_OR)
}

/** Same rule in code, for rows that come back from an RPC (get_my_profile). */
export function isFullAssessment(row: unknown): boolean {
  if (!row || typeof row !== 'object') return false
  const kind = (row as { check_kind?: unknown }).check_kind
  return kind == null || kind !== 'quick'
}

/** FG-08: assessed_at as epoch ms, or null when missing or unparseable. created_at is never used for order. */
export function assessedAtMs(row: unknown): number | null {
  const v = row && typeof row === 'object' ? (row as { assessed_at?: unknown }).assessed_at : null
  if (typeof v !== 'string' || !v) return null
  const t = Date.parse(v)
  return Number.isFinite(t) ? t : null
}

/**
 * FG-08: newest first by assessed_at (never created_at). Stable: rows with equal or missing assessed_at keep their input
 * order, and rows with no assessed_at go last.
 */
export function sortByAssessedAtNewestFirst<T>(rows: readonly T[]): T[] {
  return rows
    .map((r, i) => ({ r, i, t: assessedAtMs(r) }))
    .sort((a, b) => {
      if (a.t != null && b.t != null && a.t !== b.t) return b.t - a.t
      if (a.t == null && b.t != null) return 1
      if (b.t == null && a.t != null) return -1
      return a.i - b.i
    })
    .map(x => x.r)
}

/**
 * get_my_profile is server-side, so its rows are filtered here: history drops quick rows, and the latest is the newest
 * full row. If the RPC returned no full row at all, the original latest is kept rather than showing no assessment.
 * FG-08: history is re-sorted newest first by assessed_at on the client, and the latest is the newest full row by
 * assessed_at, so the server's own order (or a created_at tie) can never pick an older row as the latest.
 * AVERY: get_my_profile should apply the same filter server-side (and my_joint_history, my_joint_start_vs_now).
 */
export function pickFullAssessments<T>(latest: T | null, history: readonly T[]): { latest: T | null; history: T[] } {
  const full = sortByAssessedAtNewestFirst(history.filter(isFullAssessment))
  if (!latest || isFullAssessment(latest)) {
    const newest = full[0]
    const lt = assessedAtMs(latest), nt = assessedAtMs(newest)
    if (latest && newest && nt != null && (lt == null || nt > lt)) return { latest: newest, history: full }
    return { latest, history: full }
  }
  return { latest: full[0] ?? latest, history: full }
}
