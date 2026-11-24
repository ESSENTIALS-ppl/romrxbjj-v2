-- ebfe4f3d Base test setup for Reid (FG-06, 07, 08, 17, 19, 37, 38). No Stripe, no checkout, no sends. Test account only.
-- 1) Base unlock like the existing no-Stripe test accounts (af305114, 9d64f196): base_status active, base_expiry null.
-- 2) Two more full Base assessments dated Nov 10 and Nov 17 2026 12:00 PM ET; compute-tiers fills rom_total and joint_scores.
begin;
update public.users set base_status = 'active' where id = 'ebfe4f3d-0619-4460-a5f7-08217ea31909' and base_status = 'inactive' and stripe_customer_id is null and base_stripe_subscription_id is null;
insert into public.assessments (user_id, athlete_id, sport, check_kind, assessed_at, hip_er_l, hip_er_r, hip_ir_l, hip_ir_r, hip_abd_l, hip_abd_r, hip_flex_l, hip_flex_r, shoulder_er_l, shoulder_er_r, shoulder_flex_l, shoulder_flex_r, ankle_df_l, ankle_df_r, cervical_lat_l, cervical_lat_r, cervical_flex, cervical_ext) values
('ebfe4f3d-0619-4460-a5f7-08217ea31909','2b0a6b69-5f63-494c-bba5-09f13b90434c','general','full','2026-11-10 17:00:00+00',52,50,46,49,50,48,60,58,62,58,120,116,44,42,40,38,46,52),
('ebfe4f3d-0619-4460-a5f7-08217ea31909','2b0a6b69-5f63-494c-bba5-09f13b90434c','general','full','2026-11-17 17:00:00+00',56,55,50,52,54,52,72,70,74,70,140,136,48,47,44,42,50,58)
returning id, assessed_at;
commit;
