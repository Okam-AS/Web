# Red receipt — the pin, applied to the pre-fix sources

Baseline: Web-modules HEAD: 8ac6f63648015d8c7a230181a7f07bf303d43268  branch: lane/focustrap-teardown | core submodule HEAD: 1bcab0b6b3882bc232795437d7ad48455a5af0a6  branch: lane/core-ore-label

Each row is an assertion from `test/store-config-full-replace.test.js` run against the
pre-fix source in `prefix/`. Every one FAILED there and passes on the fixed tree.

| pin | subject | failure against the baseline |
|---|---|---|
| C payload | prefix/surfboard.prefix.vue | expect(received).toEqual(expected) // deep equality / - Expected  - 1 / + Received  + 0 / @@ -8,11 +8,10 @@ |
| C payload | prefix/dintero.prefix.vue | expect(received).toEqual(expected) // deep equality / - Expected  - 1 / + Received  + 0 / @@ -8,11 +8,10 @@ |
| C signature | prefix/store-service.prefix.ts | expect(received).toEqual(expected) // deep equality / - Expected  - 5 / + Received  + 0 / @@ -7,13 +7,8 @@ |
| D1 read-on-arrival | prefix/dintero.prefix.vue | expect(received).toEqual(expected) // deep equality / - Expected  - 5 / + Received  + 1 / - Array [ |
| D2 no-post-without-read | prefix/dintero.prefix.vue | expect(received).toEqual(expected) // deep equality / - Expected  -  1 / + Received  + 26 / - Array [] |
| D4 tipsEnabled travels | prefix/surfboard.prefix.vue | expect(received).toBe(expected) // Object.is equality / Expected: true / Received: undefined |
| A/B guard rules | prefix/store-service.prefix.ts | the guard is not referenced anywhere in the baseline service |

Live before/after of the stored record: `receipts/live-record-before-after.md`.
