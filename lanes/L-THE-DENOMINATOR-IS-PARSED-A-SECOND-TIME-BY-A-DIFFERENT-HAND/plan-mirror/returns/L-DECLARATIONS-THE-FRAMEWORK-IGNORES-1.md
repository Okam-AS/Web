RETURN: L-DECLARATIONS-THE-FRAMEWORK-IGNORES
brief: 6120c52c
verdict: built
evidence: lanes/L-DECLARATIONS-THE-FRAMEWORK-IGNORES/ignored.md
spec_gap: none
log:
Denominator 317 .vue (components/pages/layouts, excl node_modules/.nuxt/coverage/artifacts), working tree of feature/restaurant-modules @ e34977a, 2026-08-05, 1450 dirty -uall. 317/317 covered.
Installed vue 2.7.14 vs package.json ^2.6.14. LIFECYCLE_HOOKS is exactly 14 names; unmounted/beforeUnmount appear only inside formatName(), a warning cosmetic. emits: 0 occurrences in the whole runtime. renderTracked/renderTriggered ARE valid in 2.7.
F1 FocusTrap.vue:147 unmounted() - identical at e34977a and working tree. Proved on jsdom + real vue 2.7.14 + vue-template-compiler 2.7.14 (vue-loader's transform, NOT vue-jest): 5 mount/destroy cycles, body ran 0 times.
F1 consequences: document focusin/focusout + window blur never detached; attachHandler ran ONCE for 5 traps so module `instances` never empties - each destroyed modal leaves a stale entry whose `observed` is a detached node, and reducePropsToState takes .slice(-1)[0]; returnFocus prop dead (only reader is the dead hook, and nothing passes it). Sole consumer Modal.vue, used in 11 files.
F1 control: same body renamed to `destroyed`, fresh module - 5 calls, listeners net zero. The leak is the hook name alone. Fix not applied (read-only lane).
F2 Modal.vue:97 emits:['close'] - inert. Emitting an undeclared event produces no warning. Nothing depends on it; safe deletion.
NOT LIVE: ClockScreen.vue _tick is already fixed and exists in no readable tree - untracked file, data() has no _/$ key, and all four branches carrying ClockScreen have zero _tick. grep returns 5 hits of which 3 are the remediation comment: the warned-of trap.
Method: enumerated the POPULATION of top-level option keys (313 parsed default exports, 22 distinct keys) and diffed against what the installed runtime consumes - exactly 3 unrecognised, the third being beforeRouteLeave which IS called (vue-router 3.6.5 extractGuards + .nuxt/router.js).
19 shapes searched, each with its result, in ignored.md section 5: data/watch _ and $ keys (0), script setup + all 7 macros (0), composition-API imports and on* hooks (0), setup() option (0; SignaturePad:40 is a method named setup), Vue3 directive hooks (0), Teleport/Suspense/v-model:arg/@vnode-*/modelValue (0), Nuxt page-only options under components/ (0), mixins (clean).
Scanners calibrated against a planted positive control: found all 4 declaration forms, rejected comment/string/nested/local-const decoys, and over-reports rather than under-reports - so the 0 on data keys is a strong negative.
Why neither was caught, measured: vue/no-reserved-keys IS enabled and errors on a planted _tick, but the same config reports 0 errors on FocusTrap. eslint-plugin-vue is 6.2.2, which predates Vue 3 - no rule knows unmounted or emits. The data-key class is guardable; the Vue-3-shape class has no guard installed.
Version discrepancy is load-bearing: vue/no-unsupported-features reads the version from package.json (^2.6.14), not node_modules (2.7.14), so enabling it without fixing the declaration would gate against a Vue this app does not run.
Corrected my own harness: the first control passed for the wrong reason (run A's leak had poisoned the shared module scope). Each run now gets a fresh module and census; the flawed first harness is kept in evidence.
Could not check: SSR paths, `instances` growth by direct inspection (module-private, proven by proxy), the 4 lane branches beyond ClockScreen, .nuxt/ generated components. No suite run; per C5 nothing here is "verified". Read only - no file edited, nothing committed, no container, no push.
END RETURN
