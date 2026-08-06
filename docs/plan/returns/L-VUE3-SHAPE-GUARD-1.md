```
RETURN: L-VUE3-SHAPE-GUARD
brief: 55afaf68
verdict: built
evidence: lanes/L-VUE3-SHAPE-GUARD/vue3-shape-guard.md
log:
lane/vue3-shape-guard @ cffede3, worktree web-vue3shape, base 8ac6f63 (carries the sibling FocusTrap repair). FocusTrap.vue untouched. Not pushed. Guard = test/vue3-shape-guard.test.js, 12 tests.
NOT a lint rule: eslint-module absent from nuxt buildModules, no lint script, CI runs only `npm run generate` - npm test is the sole runner. Its collection was verified in the full-suite output.
Deny list SUBTRACTED from the runtime: Vue3 hooks minus Vue.config._lifecycleHooks asserted == [beforeUnmount,unmounted]; emits denied on 0 runtime hits; renderTracked/Triggered asserted CALLED.
Planted BOTH ways, fresh dir per arm: reds on planted unmounted() and emits: at file:line; silent on a same-named method, comment, string, bind/unbind, onUnmounted; unreadable -> unresolved not clean.
Parses 301 SFCs, never greps. Mutation on the REAL tree then restore: emits back -> RED Modal.vue:97; ^2.6.14 back -> RED; FocusTrap destroyed->unmounted -> RED at :160, NOT :142, a comment saying it.
Repairs: Modal.vue:97 emits deleted (unreferenced); vue ^2.6.14 -> ^2.7.14 in package.json AND the lock root record, else npm ci refuses. npm ci NOT run: it deletes a shared node_modules link.
Suite 2599/2601; the sole red, journey-artifact-store, is the worktree-basename pin, proven pre-existing by rerunning at base 8ac6f63 here. FLAG: focus-trap-teardown.test.js duplicates part of this.
END RETURN
```
