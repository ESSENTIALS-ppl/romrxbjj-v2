# CORRECTION: P1-28/INVENTORY.md CSV sha for fg36_rescore_backup (do not overwrite INVENTORY.md)

P1-28/INVENTORY.md line for public.fg36_rescore_backup still lists CSV sha 59590f0d22498d7ddac1f13c25df9d39db7b2bf2399340ed6e3f9b1c2feafd1d. That is the v1 lossy-numeric-scale export (see stale-v1/ and BUILD-NOTES.md restore v2).

L1112 pins P1-28/SHA256SUMS 4183afb9fdf98441ac413d9a09928a79bbbbeffe09aaa5d68b7caa3e59981cc2, which names fg36_rescore_backup.csv sha256 523763913d58385a54dcb3843993467b666070a2bb9b2b1c17686b6bb1c46379. The DROP file drop_fg36_rescore_backup.sql uses the L1112 pin, not the inventory line.

INVENTORY.md itself is not an entry in the 4183afb9 SUMS and was not modified.
