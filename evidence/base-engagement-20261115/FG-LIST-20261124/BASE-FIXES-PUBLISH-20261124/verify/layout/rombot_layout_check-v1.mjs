// ROMBot layout on the LIVE romrx.io bundle, headless Chromium, iPhone sizes. Fake signed-in session for a fake user
// (user@example.com); EVERY Supabase request is answered locally by this script and never reaches the server (no reads, no writes,
// no ROMBot messages). Non-romrx.io third-party requests are aborted.
import { chromium } from '/workspace/tools-pw/node_modules/playwright-core/index.mjs'
import fs from 'fs'
const exe = fs.readdirSync(process.env.HOME + '/.cache/ms-playwright').filter(d => d.startsWith('chromium-'))[0]
const browser = await chromium.launch({ executablePath: `${process.env.HOME}/.cache/ms-playwright/${exe}/chrome-linux64/chrome`, args: ['--no-sandbox'] })
const UID = '00000000-0000-4000-8000-0000000000aa'
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url')
const exp = Math.floor(Date.now() / 1000) + 3600
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, exp, role: 'authenticated', aud: 'authenticated', email: 'user@example.com' })}.fakesig`
const user = { id: UID, aud: 'authenticated', role: 'authenticated', email: 'user@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-10-01T00:00:00Z' }
const session = { access_token: jwt, refresh_token: 'fake', expires_at: exp, expires_in: 3600, token_type: 'bearer', user }
const profile = { id: UID, user_id: UID, first_name: 'Test', sport: 'general', subscription_tier: 'base', subscription_status: 'active', terms_version: 'v3', terms_accepted_at: '2026-11-01T00:00:00Z', onboarding_complete: true, profile_complete: true, birth_year: 1985, sex: 'male' }
const log = []
const results = []
for (const [w, h, kb] of [[390, 844, 336], [375, 667, 260]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' })
  await ctx.addInitScript(([s]) => { try { localStorage.setItem('romrx.hq.auth', s); localStorage.setItem('romrx.consent.v1', JSON.stringify({ state: 'denied', policy_version: '2026-09-21-privacy-b', updated_at: new Date().toISOString(), declined_at: new Date().toISOString(), region: 'us' })) } catch {} }, [JSON.stringify(session)])
  await ctx.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url())
    if (u.hostname.endsWith('supabase.co')) {
      log.push(`${req.method()} ${u.pathname}`)
      let body = '[]'
      if (u.pathname.startsWith('/auth/v1/user')) body = JSON.stringify(user)
      else if (u.pathname.startsWith('/auth/v1/token')) body = JSON.stringify(session)
      else if (u.pathname.includes('/rpc/get_my_profile')) body = JSON.stringify(profile)
      else if (u.pathname.includes('/rest/v1/profiles')) body = JSON.stringify(req.headers()['accept']?.includes('vnd.pgrst.object') ? profile : [profile])
      else if (u.pathname.includes('/rest/v1/consents')) body = JSON.stringify([{ id: '00000000-0000-4000-8000-0000000000c1' }])
      else if (u.pathname.startsWith('/functions/')) body = '{}'
      else if (req.headers()['accept']?.includes('vnd.pgrst.object')) body = 'null'
      return route.fulfill({ status: 200, contentType: 'application/json', body })
    }
    if (u.hostname === 'romrx.io' || u.hostname === 'www.romrx.io') return route.continue()
    return route.abort()
  })
  const page = await ctx.newPage()
  await page.goto('https://romrx.io/app/dashboard/rombot', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const measure = async label => {
    const r = await page.evaluate(() => {
      const box = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) } }
      const ta = document.querySelector('[data-testid="rombot-input"] textarea')
      const btn = document.querySelector('[data-testid="rombot-input"] button') 
      const vv = window.visualViewport
      const hit = el => { if (!el) return false; const b = el.getBoundingClientRect(); const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!t && (t === el || el.contains(t)) }
      return { url: location.pathname, inputOnTop: hit(ta), sendOnTop: hit(btn), scrollY: Math.round(scrollY), vvH: Math.round(vv?.height ?? innerHeight), innerH: innerHeight, input: box(ta), send: box(btn), sendLabel: btn?.getAttribute('aria-label') || btn?.textContent?.trim() || null,
        overlay: document.querySelector('.rombot-chat')?.dataset.overlay ?? null, docScroll: document.scrollingElement.scrollHeight - innerHeight }
    })
    const vis = b => !!b && b.top >= 0 && b.bottom <= r.vvH && b.left >= 0 && b.right <= w
    const ok = vis(r.input) && vis(r.send) && r.inputOnTop && r.sendOnTop
    results.push({ size: `${w}x${h}`, state: label, ok, ...r })
    await page.screenshot({ path: `rombot-${w}x${h}-${label}.png` })
    return ok
  }
  await measure('closed')
  // Simulated keyboard: focus the input and shrink the viewport by a typical iOS keyboard height (no real iPhone keyboard in headless).
  await page.locator('[data-testid="rombot-input"] textarea').focus().catch(() => {})
  await page.setViewportSize({ width: w, height: h - kb })
  await page.waitForTimeout(600)
  await measure(`keyboard-${kb}px`)
  await ctx.close()
}
await browser.close()
const writes = log.filter(l => !l.startsWith('GET') && !l.includes('/rpc/') && !l.startsWith('HEAD'))
fs.writeFileSync('16-layout-results.json', JSON.stringify({ results, supabase_requests_answered_locally: log, non_get_non_rpc: writes }, null, 1))
for (const r of results) console.log(`${r.size} ${r.state}: ${r.ok ? 'PASS' : 'FAIL'} url ${r.url} visible-h ${r.vvH} input ${JSON.stringify(r.input)} send ${JSON.stringify(r.send)} (${r.sendLabel}) on-top input ${r.inputOnTop} send ${r.sendOnTop} scrollY ${r.scrollY} overlay ${r.overlay}`)
console.log(`Supabase requests answered locally: ${log.length} (none reached the server); non-GET non-RPC: ${writes.length ? writes.join(', ') : 0}`)
console.log('RESULT', results.every(r => r.ok) ? 'PASS' : 'FAIL')
