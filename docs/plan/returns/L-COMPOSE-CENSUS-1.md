```
RETURN: L-COMPOSE-CENSUS
brief: 2feb399b
verdict: built
evidence: lanes/L-COMPOSE-CENSUS/compose.md
spec_gap: two of the three pairs the brief named as "must land together" are not pairs — wf-w5-timesheet is a strict ancestor of wf-digest-tautology, and pdf-creditnote-name/credit-note-number are production-identical and test-divergent, neither superseding the other.
reason: complete — merged nothing, pushed nothing, checked out nothing; both tips verified unchanged.
log:
139 mergeable heads, not 260: FE 95 refs -> 22 contained, 73 live, 12 superseded -> 61 heads; BE 315 -> 128 contained, 111 live, 76 stale-epoch, 30 superseded, 2 excluded -> 78 heads.
Brief corrections: FE ahead is 73 not 74; lanes at built-unverified|verified are 250 not 249; the a1-b3 set is EIGHT refs (no a4) all pointing at ONE commit e88af796, not nine lanes.
"~117 branch strings" runs the opposite way: naive extraction gives 189 slash-tokens / 108 extension-less, but only 39 are branch-shaped. Plan prose under-names the population 6x (39 vs 260) and cannot be used as the source.
feature/POS containment holds (0 ahead both repos, strict ancestor) but the brief's proof "0 files differing" is false: 1636 differ BE, 516 FE. Evidence is ahead=0, never a file count.
C2: 15 branches add migrations; FOURTEEN carry strict prefixes of ONE 10-deep stack — a chain at twelve depths, not a fork. No snapshot fork among them.
C2 fork is lane/margin-finalize-lag alone: 20260731203011_Margin_PeriodStatementFinalizedImmutable duplicates the stack's 20260801084923 AND sorts BEFORE tip chain tip 20260731220005 — mid-chain insert plus a double table change. Rebuild, not merge.
Consequence: landing the deepest head (wf-bootstrap-one-engagement, 10) first makes the other six contribute zero migration files. The serialised set is one step, not seven.
Matrix keyed on (path, blob) not path: Helpers/Events/EventsGuestLink.cs is byte-identical blob 087f675d on ev-uri-relative, ev-vipps-fallback and -2, absent from tip — any two merge add/add clean. Name-keying would score 3 phantom collisions and miss the real one.
Confirmed the coordinator's ruling: -2 is ev-vipps-fallback minus EventsEmailNotificationDelivery.cs, and it rewrote the CredentialCompositionSweepTests allowlist justification so the two-composer drift stays green. Land 9e3a607b; ev-uri-relative holds the only tests.
Collision surface is hub-dominated: FE translations/{de,en,no}.ts touched by 37 heads each (666 of 768 colliding pairs); BE Program.cs by 17. Append-shaped, so they resolve mechanically — which is what makes them the decoy.
Cannot compose: F-CORE-PIN-ON-NO-REMOTE verified independently (core pinned 1bcab0b6, branch -r --contains empty, only local unpushed lane/core-ore-label) — noted, not fixed, needs Sven's push.
Also excluded: 76 BE stale-epoch branches (behind 300-521; histogram cleanly empty between 150 and 300, so the cut is measured not judged), margin-finalize-lag, ev-vipps-fallback-2.
Order is B0 rebuild / B1 deepest migration / B2 six code-only / B3 Events pair / B4-B6 hub, rest, parallel; FE F1 hub / F2 rest / F3 parallel / F4 cross-repo contract pair after its backend half.
Re-run points, because a branch's green does not transfer: after B1 the chain replay from empty (no adder's green covers the composed depth); after B3 a human counts composers since the sweep test is green either way; after F4 the live backend, not the Node fixture.
Every receipt must state whether the core submodule was populated — 36 tests hide behind an unpopulated one, so cross-boundary receipt comparison is otherwise meaningless.
END RETURN
```
