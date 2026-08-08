RETURN: L-THE-RECEIPT-LABELS-CAN-BE-TRANSLATED
brief: 45e22894
verdict: fail-spec
spec_gap: The brief says the three functions have no lookup at all; at the named tip all three resolve a dictionary key and call $i, and the fix is an ancestor of that tip.
evidence: docs/plan/lanes/L-THE-RECEIPT-LABELS-CAN-BE-TRANSLATED/observations.txt
log:
The brief describes 811818c^. Its line numbers paymentTypeLabel:82, deliveryTypeLabel:97, orderStatusLabel:134 land exactly on those three signatures there, and on comment lines at the tip.
811818c, lane/mixin-labels-translate, is an ancestor of trunk 78ed84f. At the tip all three functions read a KEYS map and return this.$i(key). No switch, no literal.
The coverage defect is closed too: PAYMENT_TYPE_LABEL_KEYS carries 17 members, landed as 4465d02 "A cash sale stops reading Ukjent in the admin order list". Delivery 8, status 8.
The German-falsifiable test the exit criterion asks for already exists: test/payment-type-label.test.js and test/order-label-dictionaries.test.js, 252 tests, green at the tip.
I proved those tests falsifiable rather than trusting them. Three mutations applied and reverted, all red: de orders_deliverySelfPickup to Norwegian, 3 failed; de orders_paymentCash, 1 failed.
Third mutation, the decisive one: deliveryTypeLabel `return this.$i(key)` replaced by a Norwegian literal reds 63 of 120. A lookup demonstrably happens.
ReceiptModal.vue carries no hardcoded label at all. Every label goes through $i, and a scan for Ukjent, Hent selv, Forespurt, Ikke satt, Levert, Fullfort and Betalt over the template returns nothing.
So every clause of the exit criteria already holds at 78ed84f, by work already merged. Improvising a second fix over a fixed surface is what the boundary forbids, so I stopped.
STILL UNFIXED, same defect shape, same file, NOT on the receipt surface so outside this exit criterion: woltDeliveryStatusLabel at global-mixin.js:231, eleven Norwegian literals, no $i, no key.
It is rendered at OrderCard.vue:84 and is not shadowed there, so those eleven words reach a screen on the CH build. That is a real lane if you want one; I did not take it unasked.
dineHomeDeliveryStatusLabel at global-mixin.js:221 is six more literals, but its only render site OrderCard.vue:69 is served by a local copy at OrderCard.vue:310 that does use $i.
So the mixin copy is shadowed dead code: two copies of one vocabulary, the reachable one translated and the dead one not. Worth deleting deliberately rather than leaving as a trap.
Checked the coordinator's data-test warning: the receipt surface has none either, so any future test there rides on styling classes.
No file was modified. Branch lane/receipt-labels-translate was identical to 78ed84f, so it is deleted rather than left as an empty branch. Nothing merged, nothing pushed.
No full tier was run: nothing changed, so the tip tier is the trunk's own 166 / 3950 / 0, and load was 14.44 against a hold threshold of 14.
END RETURN
