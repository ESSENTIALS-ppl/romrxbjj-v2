# FG-05 ROMBOT_HISTORY line check (Avery executor, Tue Nov 24 2026 ~4:00 PM ET). Read-only.
Flag: ai-chat handler.js:835-837 (v102 set deploy-set-ROMOOD-20261124/source/source; live v101 ROMOOD-NOTES-20261124/live-ai-chat-v101/source__handler.js:833-835). Global env, exactly "on" = ON; no per-user setting.
Flag ON reads (handler.js:1044-1053): public.assessments id, assessed_at, rom_total + joint_scores(joint_key, score, left_value, right_value); this user only; up to 3 earlier than latest; Base sport, signed in, not coach roster.
Earlier chats: NOT flag-gated. loadRecentHistory (handler.js:775, used :1080-1081) = newest 20 messages of the CURRENT conversation only, same with flag off or on. No cross-conversation chat read.
Clear: ROMBot.tsx "Clear chat" button (fg-22-23 tag aab501ec :142; r10b 32734361 :142) only sets a localStorage timestamp; no server delete. No Settings control. RLS "Users see own conversations/messages" cmd ALL exists but no UI or function calls delete. 90-day retention cron job 10 deletes.
Final line: "ROMBot history. ROMBot can use your earlier saved assessment results to make its answers more relevant to you." (clear sentence NOT appended)
