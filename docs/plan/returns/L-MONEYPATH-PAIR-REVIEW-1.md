```
RETURN: L-MONEYPATH-PAIR-REVIEW
verdict: built
evidence: docs/plan/reviews/L-MONEYPATH-PAIR-REVIEW.md
log:
Lane one wf-export-duplicate SOUND. Lane two pdf-nullderef SOUND-WITH-CONDITIONS.
MIG-25 parentage measured, not asserted: the Designer delta against MIG-24 is exactly five index
lines; the chain is five migrations past the feature tip; merge-base 968fd273; THROW ceiling 50073
so no collision; Down() proven by a round-trip test inside the committed SQL trx.
D1 CONFIRMED and UNDERSTATED: four anonymous money routes, not one. Three of them are GET routes
that CREATE invoices. No authorize attribute, no fallback policy, no global filter anywhere.
The lane changed consequence, not reachability: crash-inert under outage became state-changing.
D2 NEW, introduced by lane two: the outage path stamps the send-address before the render and
saves anyway, so an unmailed invoice leaves the retry filter forever.
The lane's own commit message states the principle it violated, about a different route.
The existing test passes while D2 happens because it never re-queries the row.
Unbacked claim: the eight NRE frames have no red record in either commit. The eight-route
arithmetic itself I verified independently at twelve call sites; the frame evidence does not exist.
Landing conditions: three-link stack in order, MIG-24/25 share a deploy epoch, SQL tier re-runs at
any squash point, and the adjustment-ordinal lane claims MIG-26 before authoring.
END RETURN
```
