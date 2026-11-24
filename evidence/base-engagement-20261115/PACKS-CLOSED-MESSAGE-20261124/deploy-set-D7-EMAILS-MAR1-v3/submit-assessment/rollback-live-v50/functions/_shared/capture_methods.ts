// Capture-method marker per assessment field (Oct 22 2026). NOT DEPLOYED. LOCAL DRAFT ONLY.
// The io app sends an OPTIONAL `capture_methods` object: { <assessment column>: 'lock' | 'fallback' | 'typed' }.
// Older clients send nothing: the result is null and the insert row does not get the key at all.
// Never rejects a request: unknown keys, bad values and keys whose value was not saved are dropped.
// Stored in public.assessments.capture_methods (migration 20261022090000_capture_methods.sql).
export const CAPTURE_METHODS = ["lock", "fallback", "typed"] as const;
export type CaptureMethod = typeof CAPTURE_METHODS[number];

export function sanitizeCaptureMethods(
  input: unknown,
  allowedKeys: Iterable<string>,
  savedRow: Record<string, unknown>,
): Record<string, CaptureMethod> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const allowed = new Set(allowedKeys);
  const out: Record<string, CaptureMethod> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!allowed.has(k)) continue;
    if (typeof v !== "string" || !(CAPTURE_METHODS as readonly string[]).includes(v)) continue;
    if (savedRow[k] === null || savedRow[k] === undefined) continue;
    out[k] = v as CaptureMethod;
  }
  return Object.keys(out).length ? out : null;
}
