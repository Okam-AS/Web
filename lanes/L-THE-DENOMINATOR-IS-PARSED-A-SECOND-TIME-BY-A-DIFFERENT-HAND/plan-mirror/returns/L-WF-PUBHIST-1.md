```
RETURN: L-WF-PUBHIST
brief: 754acf4a
verdict: built
evidence: lanes/L-WF-PUBHIST/evidence.md
spec_gap: none — the exit criteria's build branch was taken whole; both items now have a caller and nothing is left bound and uncalled.
reason: n/a
log:
Baselines: frontend e34977ac (feature/restaurant-modules); backend checkout was on lane/meals-grace-pins, so I read the contract from 8e2b57de via git show and never checked it out.
Verified, not assumed: GetPublicationHistory is the ONLY one of 11 client methods with zero callers — no with(this)/mixin resolution (global-mixin declares no workforce service), no dynamic dispatch, no Proxy, no .nuxt hit, no fixture, no unit test. Recipients (#22) had no client method AND no backend test.
DECIDED BUILD, both items the same way. Deletion was live and refused on evidence: a journey lane graded the absence severity:gap ("a venue that must show it rostered someone cannot produce that from this UI"), the history endpoint is convergence-tested, and nothing else answers "what came BACK" — delivery answers "what could not get OUT", so there was no first answer for a repair to duplicate.
Whole wire in one change: client GetRecipients + pure reader utils/workforce/publication-receipts.js + 3 components + pages/admin/workforce-publications.vue + nav icon/entry + STORE_ADMIN_PATHS pin + no/en/de keys. The 7 shared files I edited were all already dirty from sibling lanes; edits were surgical.
THE ONE JUDGEMENT: four attestations that never merge — worker confirmed / worker opened / manager recorded by hand / nothing. deliveryState:Delivered lands in NOTHING, because a transport accepting is not a person receiving. No combined figure is returned or rendered anywhere.
Found in the wire: endpoint 21 does not project noticeLeadDays, so it arrives as 0 — a DEFAULT indistinguishable from a same-day publication, which would have printed a compliance-shaped finding against every week. Dropped. cost is null by design and also dropped.
Found in the wire: GetRecipientsAsync INNER JOINs staff member and person, so a recipient whose staff member is gone silently vanishes. The page carries the history's recipientCount beside the listed rows and NAMES the gap instead of letting the short list answer "who was told".
Two grants, not one: history is WorkforceScheduler, recipients is WorkforceManager. A scheduler gets the list plus a stated refusal for the roster, never an empty roster. Superseded is derived by inverting supersedesPublicationId across the list — sound only because #21 is unpaged, written down at both client and reader.
Journey PASSES on E2E_FIXTURE_PORT=4023 E2E_WEB_PORT=3023: sign in, flip workforce.publication via the operator page, draft, staff every row, validate, publish, then CLICK THE SIDEBAR ENTRY (never a URL) and click each publication. The week published seconds ago shows the toast's own number as the count with NO receipt.
Fresh fixture confirmed: "[fixture] listening on http://127.0.0.1:4023" in every run, so nothing stale was adopted. PID 73160 on 4010 was checked with lsof and LEFT RUNNING.
Falsifiable, proven: making a manager's hand-delivery read as a worker confirmation reds 2 unit tests AND the browser walk (by-hand group not found). Reverted and re-verified green; transcript in lanes/L-WF-PUBHIST/mutation-proof.txt.
Own errors found and fixed: the journey first asserted shifts-typed == recipients (3 staff, 4 shifts, publish dedupes) and the "N of M" guard allowed a slash and matched the rendered DATE. Both now assert against the publish toast's own number.
Applied this lane's rule to my own diff: removed an exported option and two row fields (noticeLeadDays, cost) that no caller read; the decorated row's shape is now pinned by a test.
Suites: jest 4 suites / 76 tests green, including the nav converse walk that reds on any module page with no sidebar entry; playwright 1 passed.
NOT PROVEN: no live backend ran (@fixture only, no container granted and none started); the split grant is not journey-proven because the fixture's one 403 cannot tell the two capabilities apart; and C5 — nobody has walked it. Nothing committed, nothing pushed, other lanes' files untouched.
END RETURN
```
