
`reads.test.mjs`: 20261116031200 server-side quick skip. Applies the live definitions (rollback file) first and shows the quick row leaking into get_my_profile, my_joint_history, my_joint_start_vs_now and rombot_context, then applies the migration and checks each read skips it (and get_my_profile returns check_kind). Run `node reads.test.mjs`.
