-- Rollback for the ebfe4f3d Base test setup (4:12 PM ET Nov 24 2026). Deletes ONLY the two new assessments (joint_scores, protocols, technique_eligibility, assessment_feedback cascade) and restores base_status inactive.
with d as (delete from public.assessments where user_id = 'ebfe4f3d-0619-4460-a5f7-08217ea31909' and id in ('b0d68db1-5ef2-46fa-973b-6a10e12ce727','a9b06108-c130-4ede-8c95-567546d6408d') returning id),
u as (update public.users set base_status = 'inactive' where id = 'ebfe4f3d-0619-4460-a5f7-08217ea31909' and base_status = 'active' and stripe_customer_id is null and base_stripe_subscription_id is null returning id)
select (select count(*) from d) deleted, (select count(*) from u) users_restored;
