```
RETURN: L-FOCUSTRAP-TEARDOWN
brief: da2c3b09
verdict: built
evidence: lanes/L-FOCUSTRAP-TEARDOWN/01-red-before-fix.txt
log:
FocusTrap.vue:147 `unmounted ()` -> `destroyed ()`; Vue 2.7.14 never called it, so the body ran 0 times ever. Test written FIRST: 5 red, 6 green. Suite 129/2992, lint clean.
Red proven by renaming the hook back on the FINAL file, not a draft. Commit 8ac6f63 on lane/focustrap-teardown; nothing pushed, no shared branch touched, no container started.
Leak named: document focusin/focusout + window blur attached by the session's first modal and released by nothing; every trap ever mounted retained in `instances` with its dead component.
CORRECTION to the steer I was sent: "close a modal, open a second, assert focus lands in the second" PASSES against the defect - `instances.push` appends and `reducePropsToState` takes .slice(-1)[0].
Only the STACKED case discriminates (destroy the last-pushed trap while an earlier is on screen): broken=outside, fixed=behind-inside. Measured in 02-sequential-vs-stacked.txt.
Second correction, mine: `originalFocusedElement` latches at MOUNT, so asserting it unset reds before AND after - a false red I nearly shipped. The test clears it, making a post-destroy write visible.
LATENT, not a live regression: returnFocus. Modal.vue passes no props so it is false at every call site - a contract for the first consumer to pass it. The other three are live.
Regression guard = estate sweep of 317 SFCs for `unmounted`/`beforeUnmount` ONLY (renderTracked/renderTriggered are Vue 3 names 2.7 does call). Hand-rolled: eslint-plugin-vue 6.2.2 knows neither.
NOT DONE, left as briefed: Modal.vue:97 inert `emits: ['close']` and the vue/no-unsupported-features version-source defect, both L-DECLARATIONS-THE-FRAMEWORK-IGNORES, whose proof this agrees with.
END RETURN
```
