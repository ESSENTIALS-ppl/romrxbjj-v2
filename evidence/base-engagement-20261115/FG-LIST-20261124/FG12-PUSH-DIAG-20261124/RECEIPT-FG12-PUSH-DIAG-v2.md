# Receipt v2: push delivery proof without the box browser (Nov 24, 2026, about 7:15 PM ET)
Adds to v1 (RECEIPT-FG12-PUSH-DIAG-v1.md, unchanged). Grant asked for a proof that does not depend on the box browser.
Result: PASS (all 8 checks, MOCK-PROOF-OUTPUT-v1.txt).
Setup: web-push-testing 1.2.2 (web-push-libs' mock push service) run on the box at https://localhost:8090 with a throwaway self-signed certificate (web-push only sends over https). Local only: no FCM, no real user, no database read or write, no deploy, no flag change. Nothing printed from the key file.
What ran:
- Key: /home/box/.romrx-secrets/vapid-20261117.env; public/private/subject hashes 8dcb59b6 / 7ebfe089 / 5a8b650b = live secret digests.
- Subscribe on the mock with applicationServerKey = our live VAPID public key.
- Sender: the live send-push-notification liveSend() function, cut from the CLI download of the deployed code (index.ts e7666666, handler.ts 9d0a6f71, ezbr 96dfc872) and run unchanged under Node, with web-push 3.6.7 (same as live) and live defaults (no TTL option, as live). Payload JSON.stringify(PUSH_COPY.protocol) from the live handler.
- Mock checks: Crypto key in the Authorization header equals the subscription's applicationServerKey, ES256 VAPID JWT verifies against it, aes128gcm decrypts.
Checks:
1. Key file = live digests: PASS
2. web-push 3.6.7: PASS
3. Endpoint local only: PASS
4. liveSend -> {"ok":true}: PASS (VAPID signature verified by the mock)
5. Decrypted exactly 1 message, byte-equal to {"title":"ROMRx Base","body":"Time for today's session. Open ROMRx Base to see your plan."}: PASS
6. Negative control, a freshly generated different VAPID key: rejected (ok false), still 1 message: PASS
7. Live romrx.io/app/sw.js (sha256 bff352dd) registers a push listener: PASS
8. Running that handler in Node on the decrypted message with a mocked self.registration: event.waitUntil(showNotification("ROMRx Base", {body: "Time for today's session. Open ROMRx Base to see your plan."})): PASS
Meaning: key, encryption, payload and worker are right end to end. What is left unproven is only the last hop (Google's push service to a real Chrome and the device showing it), which needs a normal Chrome or Android device.
State unchanged: WEB_PUSH_SEND on; staged save-push-subscription fix 9d35b136 not deployed (needs Sable's spot-check); push_subscriptions not touched.
