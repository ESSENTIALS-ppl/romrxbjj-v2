# Rendered Base text for SEND-SWITCH v4 (local template functions only)

No Resend call, no email_sends write, no handle() invoke. Placeholder recipient `user@example.com`, name Sam Example.
Base brand only: From `ROMRx <hello@romrx.io>`, Reply-To `hello@romrx.io`. Unsubscribe links use the token string PLACEHOLDER_KIND / PLACEHOLDER_ALL (no HMAC secret used).
Source: render-v4/src, byte-matched to live lifecycle-emails v4 ezbr 6714009f and rombot-checkin v1 ezbr fbad0021 (see BYTE-MATCH-DEPLOYED-SOURCE-20261116.md).
Raw JSON sha256: `6247dd1de44749bb7e85a686050bb80b958c9dfb7e50fc968ade12b88e9e544a`.
Vera can match these subjects and bodies to a955ebd0 (vera-email-text-review-lifecycle-v4-rombot-checkin-v1-20261116.md). Filled example values are stated on each block.

## Lifecycle: retest
**Subject:** Time for your ROMRx retest
**Body (text):**
```
Hi Sam,

It has been about six weeks since your last ROMRx assessment. Your retest is ready whenever you are.

Start my retest: https://romrx.io/app/onboarding/assessment

You are getting this because Retest reminders is on in your settings. Turn off retest reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
```

## Lifecycle: protocol
**Subject:** Today is a protocol day
**Body (text):**
```
Hi Sam,

Today is a protocol day on your ROMRx plan.

Open today's session: https://romrx.io/app/dashboard/my-protocol

You are getting this because Email reminders is on in your settings. Turn off protocol reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
```

## Lifecycle: digest (score 72, up 3, streak 2, sessions 3, next check in 5 days)
**Subject:** Your ROMRx week
**Body (text):**
```
Hi Sam,

Here is your ROMRx week.
Body score: 72, up 3 since your previous assessment.
Current streak: 2 days.
Sessions this week: 3.
Your next check is in 5 days.

Open ROMRx: https://romrx.io/app/dashboard

You are getting this because Weekly progress digest is on in your settings. Turn off the weekly digest: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
```

## Lifecycle: lapsed (with upcoming check date)
**Subject:** Your ROMRx plan is still here
**Body (text):**
```
Hi Sam,

We haven't seen you in a couple of weeks. Your plan is saved and ready.
You can start again with today's session.
Your next check: Monday, December 28

Open today's session: https://romrx.io/app/dashboard/my-protocol

Want fewer emails? Change your reminders in Settings: https://romrx.io/app/dashboard/settings

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

## Lifecycle: check7 Version A (with retest date)
**Subject:** Your ROMRx quick check is ready
**Body (text):**
```
Hi Sam,

It has been a week since your ROMRx assessment. Your quick check is ready.
It re-measures 1 or 2 of your focus areas and shows them next to your day 1 results.
Your full retest is still at 6 weeks, on Monday, December 28.

Start my quick check: https://romrx.io/app/dashboard/quick-check

You're getting this because Check reminders is on in your ROMRx settings. Turn off check reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

## Lifecycle: check14 Version A (quick check not done, with retest date)
**Subject:** Your quick check is waiting
**Body (text):**
```
Hi Sam,

It has been two weeks since your ROMRx assessment. Your quick check is ready when you are.
It shows your day 1 results next to today's for 1 or 2 of your focus areas.
Your full retest is on Monday, December 28.

Start my quick check: https://romrx.io/app/dashboard/quick-check

You're getting this because Check reminders is on in your ROMRx settings. Turn off check reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

## Lifecycle: check14 Version B (quick check done, with next check date)
**Subject:** Two weeks of ROMRx
**Body (text):**
```
Hi Sam,

You did your quick check. Nice work.
Your next check: Monday, December 28
Until then, your plan is ready each day in the app.

Open today's session: https://romrx.io/app/dashboard/my-protocol

You're getting this because Check reminders is on in your ROMRx settings. Turn off check reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

## Check-in: A named (0 sessions)
**Subject:** Your plan is ready, Sam
**In-app note button:** Start today's session
**In-app note path:** /dashboard/my-protocol?src=checkin-d3
**In-app note body:**
```
Hey Sam, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your hips. It's short, and you can do it now. Want to start?
If something got in the way, tell me here and I'll help you find an easier way in.
```
**Body (text):**
```
Hey Sam, ROMBot here. Your plan is ready whenever you are. Today's focus is your hips. It's short, and you can do it now. Want to start?

Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

If something got in the way, open ROMBot and tell me. I'll help you find an easier way in.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

## Check-in: A no-name (0 sessions)
**Subject:** Your plan is ready
**In-app note button:** Start today's session
**In-app note path:** /dashboard/my-protocol?src=checkin-d3
**In-app note body:**
```
Hey there, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your hips. It's short, and you can do it now. Want to start?
If something got in the way, tell me here and I'll help you find an easier way in.
```
**Body (text):**
```
Hey there, ROMBot here. Your plan is ready whenever you are. Today's focus is your hips. It's short, and you can do it now. Want to start?

Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

If something got in the way, open ROMBot and tell me. I'll help you find an easier way in.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

## Check-in: B n=1 named
**Subject:** 1 done. Two more for your week 1 goal
**In-app note button:** Start today's session
**In-app note path:** /dashboard/my-protocol?src=checkin-d3
**In-app note body:**
```
Nice work, Sam. You've done 1 session since your assessment. Two more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.
Anything feel too easy or too hard? Tell me and I'll help you adjust how you do it.
```
**Body (text):**
```
ROMBot here.

Nice work, Sam. You've done 1 session since your assessment. Two more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.

Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

Anything feel too easy or too hard? Open ROMBot and tell me, and I'll help you adjust how you do it.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

## Check-in: B n=1 no-name
**Subject:** 1 done. Two more for your week 1 goal
**In-app note button:** Start today's session
**In-app note path:** /dashboard/my-protocol?src=checkin-d3
**In-app note body:**
```
Nice work. You've done 1 session since your assessment. Two more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.
Anything feel too easy or too hard? Tell me and I'll help you adjust how you do it.
```
**Body (text):**
```
ROMBot here.

Nice work. You've done 1 session since your assessment. Two more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.

Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

Anything feel too easy or too hard? Open ROMBot and tell me, and I'll help you adjust how you do it.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

## Check-in: B n=2 named
**Subject:** 2 done. One more for your week 1 goal
**In-app note button:** Start today's session
**In-app note path:** /dashboard/my-protocol?src=checkin-d3
**In-app note body:**
```
Nice work, Sam. You've done 2 sessions since your assessment. One more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.
Anything feel too easy or too hard? Tell me and I'll help you adjust how you do it.
```
**Body (text):**
```
ROMBot here.

Nice work, Sam. You've done 2 sessions since your assessment. One more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.

Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

Anything feel too easy or too hard? Open ROMBot and tell me, and I'll help you adjust how you do it.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

## Check-in: B n=2 no-name
**Subject:** 2 done. One more for your week 1 goal
**In-app note button:** Start today's session
**In-app note path:** /dashboard/my-protocol?src=checkin-d3
**In-app note body:**
```
Nice work. You've done 2 sessions since your assessment. One more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.
Anything feel too easy or too hard? Tell me and I'll help you adjust how you do it.
```
**Body (text):**
```
ROMBot here.

Nice work. You've done 2 sessions since your assessment. One more and you reach your week 1 goal of 3 sessions. Today's focus is your hips.

Start today's session: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

Anything feel too easy or too hard? Open ROMBot and tell me, and I'll help you adjust how you do it.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

## Check-in: C named (n=3)
**Subject:** Strong start, Sam
**In-app note button:** See my plan
**In-app note path:** /dashboard/my-protocol?src=checkin-d3
**In-app note body:**
```
Sam, 3 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Monday, Dec 28. That's when you measure again and see where you are.
If any move doesn't feel right, tell me here.
```
**Body (text):**
```
ROMBot here.

Sam, 3 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Monday, Dec 28. That's when you measure again and see where you are.

See my plan: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

If any move doesn't feel right, open ROMBot and tell me.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

## Check-in: C no-name (n=3)
**Subject:** Strong start
**In-app note button:** See my plan
**In-app note path:** /dashboard/my-protocol?src=checkin-d3
**In-app note body:**
```
3 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Monday, Dec 28. That's when you measure again and see where you are.
If any move doesn't feel right, tell me here.
```
**Body (text):**
```
ROMBot here.

3 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Monday, Dec 28. That's when you measure again and see where you are.

See my plan: https://romrx.io/app/dashboard/my-protocol?src=checkin-d3

If any move doesn't feel right, open ROMBot and tell me.

You're getting this because Plan day reminders is on in your ROMRx settings. Turn off plan day reminders: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_KIND
Turn off all ROMRx emails except account and billing notices: https://romrx.io/app/unsubscribe?t=PLACEHOLDER_ALL

ROMRx LLC, 6605 Longshore Street, Suite 240, Dublin, OH 43017-2774
hello@romrx.io
This message was sent to user@example.com.
```

