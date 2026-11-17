-- DRAFT. Do not run until the gate above is complete.
begin;
insert into ops.internal_accounts (user_id, note) values
  ('3a024218-66a3-48a3-838c-e722b9e77515', 'P1-22 staff list: Jim own Gmail'),
  ('7c71e421-929b-4691-a6bc-cc614ed2a08d', 'P1-22 staff list: Jim Base test address (reference row only)'),
  ('c414e503-5092-4040-b286-4ff2a299ba01', 'P1-22 staff list: generic test address'),
  ('9b89b8c3-eedd-4858-a537-828437675e67', 'P1-22 staff list: deleted reg402 placeholder'),
  ('2ecf5946-1d48-4e80-b199-2062ab302987', 'P1-22 staff list: deleted reg402 placeholder')
on conflict (user_id) do nothing;
-- Expect: INSERT 0 5. Then: select count(*) from ops.internal_accounts;  -- expect 5
commit;
