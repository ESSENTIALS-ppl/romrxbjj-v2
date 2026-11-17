-- P1-22 staff list rollback (L1170). Removes exactly the 5 rows inserted by b152a965. Nothing else.
DELETE FROM ops.internal_accounts
WHERE user_id IN (
  '3a024218-66a3-48a3-838c-e722b9e77515',
  '7c71e421-929b-4691-a6bc-cc614ed2a08d',
  'c414e503-5092-4040-b286-4ff2a299ba01',
  '9b89b8c3-eedd-4858-a537-828437675e67',
  '2ecf5946-1d48-4e80-b199-2062ab302987'
);
-- Expect: DELETE 5. Then: select count(*) from ops.internal_accounts;  -- expect 0
