```
RETURN: L-SETTINGS-SAVES-REPORT-FAILURE
brief: d9bab689
verdict: built
evidence: lanes/L-SETTINGS-SAVES-REPORT-FAILURE/measurements.txt
log:
Measured on lane/focustrap-teardown @ 8ac6f63, working tree (~394 foreign uncommitted paths). Touched 2 files: pages/admin/delivery.vue, test/delivery-save-failure.test.js (new).
RED FIRST, shipped page: 12 of 21 arms failed. Switch checked=false while the server held selfPickUp=true, .notification absent, Get count 1 not 2. Capture: red-01-before-fix.txt.
The `false` is not assumed: one describe drives the REAL StoreService through a faked http module, showing a 204 and an unparseable 200 body both resolving false without throwing.
Fix is both halves. requireSaved() turns a falsy write into a throw; recoverFromFailedSave() shows the error AND re-reads the store, falling back to the last server store if that read fails.
All FOUR call sites: updateToggle, deliveryEnabledChange, changeDeliveryType, saveChanges. The last three fired 2-3 writes under Promise.all, dropped every boolean, announced SUCCESS over a refusal.
New arm worth reading: a refused Wolt switch lands own-driving-OFF and Wolt-ON-refused, leaving NO home delivery. The page now shows that third state; it used to announce "changed to Wolt".
Switch vs form is deliberate. A switch snaps back to the server. A form keeps the operator draft but keeps Save on screen, so it never reads as saved.
DEFECT 2 REPRODUCES exactly as reported: a store on 15050 ore offered Save with nothing edited, and pressing it posted 15000.
But nothing in this repo creates such a store: delivery.vue is the only writer and always sends kroner*100, so the trigger needs an outside writer. Likely why reader two could not verify.
The asymmetry IS keyboard-reachable, measured: the field is free text, 150.5 parses to 15000, equals stored, Save never appears, and the operator leaves a field reading 150.5 over a stored 150.
Both closed by one change: the dirty check puts BOTH sides through the field representation, and the field normalises on blur to the number that would be written.
THIRD instance, no outside writer needed: hasDeliveryAddressChanges compared raw store fields against locals normalised with || "", so a null city stayed dirty and Save posted the address.
beforeDestroy added; the showNotification 3.5s timer no longer outlives the page.
Two mutations prove the arms: reverting the compare reds the rounding arm, a no-op requireSaved reds 5 more. Green: this file 22/22, suite 133/3069, eslint 0 errors.
NO BROWSER ARM: the e2e fixture has no /stores routes, so one meant building that backend plus auth. No dev server ran; nothing addressed the production API_BASE_URL default.
END RETURN
```
