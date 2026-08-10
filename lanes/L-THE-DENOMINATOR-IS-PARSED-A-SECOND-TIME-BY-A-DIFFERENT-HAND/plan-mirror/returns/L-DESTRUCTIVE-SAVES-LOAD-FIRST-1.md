```
RETURN: L-DESTRUCTIVE-SAVES-LOAD-FIRST
brief: 0c786093
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-DESTRUCTIVE-SAVES-LOAD-FIRST/receipts/live-record-before-after.md
log:
Shape fixed at the seam: core/services/full-replace-guard.ts, enforced inside StoreService, the one door both pages must pass through. Load-before-edit chosen; reasons on line 9.
Measured against Web-modules 8ac6f636 on lane/focustrap-teardown and core submodule 1bcab0b6 on lane/core-ore-label. core/ IS A SUBMODULE (Okam-AS/Core) — the guard lands in that repo.
Live receipt, loopback record: pre-fix dintero.vue open-then-Save destroyed 14 of 17 stored fields — account id, client id, client secret, split seller, commission, all three Wolt fees.
Same record through the fixed code: refused not-loaded, zero fields changed; after a read, still refused incomplete naming kraviaMessage, zero fields changed.
surfboard.vue: a save that changed nothing flipped stored tipsEnabled true to false. Fixed code refuses incomplete and tipping survives; the toggle it never had is added.
THIRD instance found by writing the write model down: dintero.vue never sent kraviaMessage either, so every save has been nulling it. Now loaded and posted back, but it still has no operator lever.
Backend read (OkamAPI 8e2b57de StoreService.cs:1266 and :1390) confirms both endpoints assign every write-model field unconditionally, so an absent key becomes the C# default rather than unchanged.
Rules: contract must be registered; record must have been read for THIS id; payload must carry every writable field DEFINED (undefined counts as missing, JSON.stringify drops it); no extra keys.
Rejected PATCH and server-side partial-update: both need OkamAPI changes this lane cannot land or verify, and "absent means keep" silently redefines every existing caller's omission.
Also closed: GetSurfboardConfig's .catch(() => ({})) turned a failed read into blank defaults that were then saved over the record. Both pages now gate Save on a real read and say so on screen.
C7: removed a console.log(config) in dintero.vue that printed the client secret; the guard reports field NAMES only; receipts redact credential values behind a sha256 prefix.
Pins: test/store-config-full-replace.test.js, 26 of 26. Repo suite 3082 passed; the one red suite (kitchen-and-board-resume-after-login) is untracked, foreign, fails standalone, touches nothing here.
Red receipt: every pin assertion re-run against prefix/ baseline sources fails there, using the same extractor module the pin imports, so it shows THIS pin redding rather than another one.
Port 4893 loopback, opened and closed by the probe. No container started, no push, no commit, no edit to docs/plan outside this return.
NOT accepted (C5): Sven still has to walk both pages, and nuxt.config.js:45 still defaults API_BASE_URL to production, so that walk needs a local backend pinned first.
END RETURN
```
