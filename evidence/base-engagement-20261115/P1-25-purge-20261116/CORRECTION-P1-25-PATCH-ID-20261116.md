# CORRECTION: P1-25 receipt patch-id typo, 2026-11-16 7:12 PM ET (Avery)

Does not overwrite RECEIPT-P1-25-PURGE-20261116.md (sha256 5c8ee9298f6146540aef974da2723668e1a5be940719330ff94f86569b678a7c) or SHA256SUMS (sha256 5d6093bba6c4b2035d4262b8ed968f4f55e920afe41e1b955f6b3a5a1a1d4920).

The receipt line for `git patch-id --stable` wrote **ebeb975554ea960af67c97a0a0d048b442276918**. The correct value, re-read from `git show --format= --patch 1607d0c3d2ec4208d358449ed785b7334bc62f85 | git patch-id --stable`, is:

**ebab975554ea960af67c97a0a0d048b442276918**

The patch sha256 **8f64320f615cae2bd7778b8ba790f535911acebde387f300262ac4eaf932e316** is unchanged and matches `1607d0c3.patch` in the original SHA256SUMS. No other receipt fact changes.
