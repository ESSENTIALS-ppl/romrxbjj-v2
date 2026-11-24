-- Read-only. Run before and after apply (and after any rollback). Counts only, no personal data.
select p.proname, md5(pg_get_functiondef(p.oid)) as def_md5
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('current_terms_version', 'accepted_terms_version', 'record_signup_terms_consent', 'record_terms_reaccept')
 order by 1;
select public.current_terms_version() as current_terms_version;
select terms_version, count(*) from public.consents group by 1 order by 1;
