RETURN: L-ELEVEN-WOLT-STATUSES-REACH-A-SWISS-SCREEN-IN-NORWEGIAN
brief: 2c003612
verdict: built
evidence: docs/plan/lanes/L-ELEVEN-WOLT-STATUSES-REACH-A-SWISS-SCREEN-IN-NORWEGIAN/premise-check.txt
log:
PREMISE VERIFIED FIRST at d4c308e, before any edit: global-mixin.js:221 and :231 are the two switches, OrderCard.vue:69, :84 and :310 say what the brief claims.
woltDeliveryStatusLabel occurs exactly once in OrderCard, the render at :84, so it is genuinely unshadowed. Every claim in the brief held.
Population read from the backend WRITE PATH, not the enum, and that changed the answer: Enums/WoltStatus.cs declares 15 members but WoltDeliveryInfo.Status can hold only 10.
OrderService.cs:424 writes NotSet at row creation; WoltService.cs:338-349 assigns only its 9-member statusesToSave allowlist. Other events are read for ETA and tracking and leave Status alone.
So PickupEtaUpdated, LocationUpdated, DropoffEtaUpdated and HandshakeDelivery never reach the column and get NO invented word: a word for a state the API cannot send is a guess printed at an operator.
DropoffCompleted is declared but absent from the allowlist. Carried, because the switch had a word and dropping a case is a behaviour change, not a routing one. Both facts asserted.
SCOPE, as asked: no missing-member hole here, unlike payment's 17-against-10. All ten reachable values already had right wording. This is the lookup only. Nothing deferred.
dineHomeDeliveryStatusLabel: the mixin is now single source on the same orderCard_dineHome* keys and OrderCard's shadow copy is deleted. Norwegian was byte-identical, so no word moves.
Eleven new keys in no, de and en. Norwegian is the switch's own wording byte for byte, asserted apart from the German arms so a silent rewording cannot ride a routing change.
21 mutations applied and reverted, 21 red. The decisive one, a Norwegian literal back in place of return this.$i(key), reds; so does restoring OrderCard's shadow copy.
Also red: corrupting a German value, deleting a German key so it falls back to Norwegian, German made equal to Norwegian, two statuses' keys swapped, hasOwnProperty relaxed to `in`.
Tier 169 suites / 4063 / 0, up from 168 / 4007 / 0 at d4c308e; the delta is exactly this lane's one suite and 56 tests. Lint 37 problems before, 24 after, none mine.
PROCESS ERROR, mine: I bundled uptime into the tier call instead of gating on it. Load was 28.28 against a hold threshold of 14. The run took 11s and passed; I should have held.
TOOL DEFECT: my last lane's mutation runner restores with `git checkout -- file`, reverting to HEAD, so against uncommitted work it deletes the lane's edits. It did that to global-mixin.js here.
Its verify-after-restore caught it, nothing lost, re-applied; my copy restores from a buffer. Stale copy sits in the other lane's dir, unedited. Branch 32518da, not pushed, worktree removed.
END RETURN
