// build stub: the browser Supabase client is never used by the bundled pure functions.
export const supabase = /* @__PURE__ */ new Proxy({}, { get() { throw new Error('stub supabase'); } });
