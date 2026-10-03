// test stub for deno.land std http/server: records each module's handler instead of listening on a port.
// deno-lint-ignore-file no-explicit-any
export function serve(handler: (req: Request) => Promise<Response> | Response): void {
  const g = globalThis as any;
  (g.__serveHandlers ??= []).push(handler);
}
