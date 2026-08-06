```
RETURN: L-MIXIN-LABELS-TRANSLATE
brief: 13e53cee
verdict: built
evidence: lanes/L-MIXIN-LABELS-TRANSLATE/mutation-log.md
spec_gap: the brief has all three switches hardcoded; paymentTypeLabel was already routed by L-PAYMENT-LABEL-UKJENT at 4465d02, so this lane is BASED on that commit and did the other two
log:
BUILT at 627e34a on lane/mixin-labels-translate (worktree /Users/svendaneel/okam/web-mixinlabels), off 4465d02 so all three functions are true of one tree and the merge is a descendant.
deliveryTypeLabel + orderStatusLabel now resolve DELIVERY_TYPE_LABEL_KEYS / ORDER_STATUS_LABEL_KEYS through $i. Nothing pushed, no shared branch, no container, no SQL, no migration.
ROUTING BEFORE COVERAGE as ordered, and it cost nothing: 7/7 DeliveryType and 8/8 OrderStatus members mapped, and 12 of the 16 keys already existed — orders.vue:550-567 builds its filters from them.
D1 FALSIFICATION (the exit criterion): de.ts orders_deliverySelfPickup 'Selbstabholung'->'Selbstabholunk' turns the ch walk RED, DOM quoted. A rendered-string green could never have shown this.
D2 the same key corrupted in no.ts is GREEN at ch, D3 the same bytes RED at no: identical trees differing only in OKAM_EDITION, so the German receipt reads de.ts and not no-via-fallback.
E NEGATIVE CONTROL: pre-lane switch restored -> ch RED on exactly the two rows this lane routed, payment row still German. 9 arms, each sha-pinned in its own run header.
ZERO NORWEGIAN DRIFT, measured: measure.py reads the old switches out of git object e34977a and compares each literal to the word now rendered. drift=0 over 15 cases and both defaults.
No duplicate key in any dictionary at any point; +5 from the parent lane, +4 from this one. My counter reads 4816/4781/4781 at base vs the brief's 4817/4782/4782 — uniform off-by-one, no key lost.
Fixture gained paymentType for the reason it gained storeVAT: without one the receipt's payment row can only exercise the unknown fallback and the walk would measure nothing.
test/order-label-dictionaries.test.js: 120 assertions green at 627e34a, 73 RED against the prior switch — the same mutated mixin a33d815fb arm E ran. ReceiptModal unmountable (buble vs ?.).
PORTS 3853/4853, this lane's own, precheck + CI=1. NOT 3847/4847 (that lane's runner is still on disk). 4010 never bound, pid 73160 never signalled. 9 distinct pids, all my worktree.
Suite at 627e34a with 0 modified paths: 2833/2835, 113/114 suites; the 2 reds are the basename tax (wants ^Web-modules@, got web-mixinlabels@, no +dirty). eslint 0 errors on all 7 files.
THE 08:20 FAULT CAUGHT 4 CLAIMS THAT OUTRAN THEIR EVIDENCE: 2 real eslint errors (I had claimed 0 before that file existed), 2 shas typed from memory, "eight" arms for nine, and a run I never made.
RECORDED NOT FIXED: GroupedHomeDelivery is a member of no enum anywhere; core declares OrderStatus.OpenCheck and the backend does not; molecules/OrderModal.vue's row LABELS stay hardcoded Norwegian.
C5 OWED: every line above is a suite result. The capability is a Swiss operator opening /admin/ongoing, expanding an order and pressing the receipt button on the ch build. That walk is Sven's gate.
END RETURN
```
