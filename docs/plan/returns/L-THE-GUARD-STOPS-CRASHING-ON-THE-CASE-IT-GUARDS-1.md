RETURN: L-THE-GUARD-STOPS-CRASHING-ON-THE-CASE-IT-GUARDS
brief: 5d5f2a39
verdict: built
evidence: /private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/guard/Web-modules/test/guid-fallback-without-crypto.test.js
log:
Guard closed in utils/guid.js. Commit 1e48b95 on lane/the-guard-stops-crashing-on-the-case-it-guards, cut off trunk 780d405, two files, not pushed.
Confirmed: line 5 tested `typeof crypto !== undefined`, line 9 dereferenced that same global. The guard's only false case was the one its fallback could not survive.
RED first: the new 14-test suite run against the unmodified source failed 8, every failure at utils/guid.js:9, including both money-out mount tests.
CORRECTION to the brief: only ReturnBuilder and RefundModal were ever unmountable (newGuid in data()), measured by mounting all six against the unfixed source.
DayFlow, ClockScreen and both join.vue pages always mounted; newGuid sits in a method there, so what was blocked was calling it (DayFlow.openTxn threw). All six mount now.
Ladder, cryptographic on every rung: platform randomUUID, then platform getRandomValues, then Node crypto, then an explicit named throw. No rung mints a weak key.
Math.random rejected: all 8 call sites are idempotency/replay keys. DayFlow names the cost of repetition - server dedupes, UI reports success while the drawer is short by 4500.
The throw is the LAST rung and is tested: with no CSPRNG reachable it raises a named Error rather than the bare ReferenceError that named nothing actionable.
Node crypto reached via __non_webpack_require__ then module.require. Measured, webpack 4 production/web: a literal require('crypto') costs 208 modules and 1.36 MB.
This file goes 1,386 to 2,651 minified bytes and 1 to 2 modules (webpack's own harmony-module shim), with zero crypto-polyfill modules and zero warnings.
No jest setupFiles entry was added: guarding the source alone made all six mountable, so the config shared by 159 suites stays untouched.
Tier 154 suites / 3608 / 0, against trunk 780d405 at 153 / 3594 / 0. eslint clean on both touched files.
Merge simulation in a throwaway worktree at sibling tip 7aaee5b: baseline 159/3743/0, with my two files 160/3757/0. That branch was read, never modified.
Node-16 CI pin recorded as a RISK, not a proven build failure: generate runs on node 16 which has no crypto global, but no prerendered route was shown to reach newGuid.
Removed the compose worktree; kept the lane worktree holding the evidence. The sibling's per-file crypto polyfills are now redundant and were left for their owner.
END RETURN
