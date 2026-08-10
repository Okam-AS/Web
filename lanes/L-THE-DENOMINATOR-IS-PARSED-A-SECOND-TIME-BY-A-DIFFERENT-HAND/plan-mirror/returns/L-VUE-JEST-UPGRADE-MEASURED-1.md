```
RETURN: L-VUE-JEST-UPGRADE-MEASURED
brief: d555cecb
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-VUE-JEST-UPGRADE-MEASURED/finding.md
log:
No. At 8ac6f63 (core 1bcab0b6) vue-jest 3.0.7 -> 4.0.1 changes nothing: 113 suites / 2589 tests in BOTH arms, key-by-key 0 suites and 0 tests changed side. Do NOT revert the rewrite.
All four templates still fail to transform AND to mount under 4.0.1 - ReceiptModal, admin/products, admin/wolt-menu, OnboardingProductImages - 8/8 red both arms, same "Unexpected token".
Structural, not a version choice: vue-jest 4 and @vue/vue2-jest 27/28/29 all route templates through @vue/component-compiler-utils@3.x, which calls the buble fork unconditionally, no opt-out.
Measured directly: vue-template-es2015-compiler@1.9.1 throws on `a?.b`, accepts `(a||{}).b`. Only @vue/vue3-jest drops it and it peers on vue@^3. On Vue 2 the rewrite IS the fix, not a stopgap.
The 1 red suite is pre-existing: test/journey-artifact-store.test.js asserts the dir name /^Web-modules@/ so it reds in any worktree. Identical in both arms. Not the transpiler and not mine.
3 controls in both arms prove the probe discriminates: old idiom mounts, `?.` in SCRIPT mounts (babel handles it), `?.` in TEMPLATE fails. So only template expressions ever need rewriting.
Caught a false pass: a failed transform leaves an empty module and Vue mounts {} silently, so wrapper.exists() reported 4 green mounts for 4 dead templates. Probe now asserts a render fn + html().
bfa1992 (the repair) is NOT an ancestor of 8ac6f63, so the modal is measured pre-repair as a real 4th case; its 2 lines untouched. Probe is .probe.js so no sibling inherits a red. Commit d1e1c38.
npm install/ci is BROKEN repo-wide (ETARGET @nuxt/cli-edge@*); 4.0.1 staged into a COPIED node_modules. Shared checkout untouched: its 79 dirty tracked files explain a sibling's 129/2998 vs 113/2589.
END RETURN
```
