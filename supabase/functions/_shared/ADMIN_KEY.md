# Edge admin key (H5)

Use `serviceRoleKey()` from `./admin_key.ts` for every admin `createClient` and service-role REST call:

```ts
import { serviceRoleKey } from "../_shared/admin_key.ts";
const key = serviceRoleKey(); // SUPABASE_SECRET_KEYS.default || SUPABASE_SERVICE_ROLE_KEY
```

- Safe with legacy fallback until H8 (disable legacy JWT keys) — **not before Oct 12**.
- After H2 confirms `SUPABASE_SECRET_KEYS` is injected, redeploy edge functions that still read `SUPABASE_SERVICE_ROLE_KEY` directly.
- Never click "Generate new JWT secret".
