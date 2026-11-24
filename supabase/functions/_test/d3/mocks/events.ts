import { S } from "./state.ts";
// deno-lint-ignore no-explicit-any
export async function logEvent(name: string, opts: any = {}): Promise<void> {
  S().calls.push({ kind: "event", name, opts: JSON.parse(JSON.stringify(opts ?? {})) });
}
