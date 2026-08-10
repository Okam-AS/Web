RETURN: L-READ-THE-PRINT-PATH
brief: c44ad34f
verdict: built
evidence: docs/plan/reviews/L-READ-THE-PRINT-PATH.md
log: read the PDF first: 2pp A4, sheet 1 opens with the document heading; course, score 85 beside frozen Grense 80, full 64-hex sha256, both certificates, all 18 ledger rows, headers repeat on p2
log: cell-for-cell vs record-on-screen.png at the same Hentet 12:57 state: nothing the screen's document shows is off the sheet; only difference is the closed details opening on paper, by design
log: pdftotext both halves: record present; controls absent (Hent/Skriv ut, disclosure notice, intro, summary label, Person, nav); the one utlevering hit is the document's own journal footnote
log: BEFORE proves the defect: 3 pages, p1 = 0 non-whitespace chars, right edge cut (I journa, Ført av 6b, deltas mid-JSON) — from a stylesheet that passed every getComputedStyle assertion
log: no print rule escapes scope: one scoped style block per file, every print selector carries data-v-, no body class/head()/bodyAttrs in the diff — the vue-meta guard-wipe has no mechanism here
log: shell rules the page leans on ARE on branch, parent 780d405 and trunk 00d84d7 (admin-nav + onboarding banner, scoped self-hides); my earlier contrary read was a zsh $ref:c artifact, re-measured
log: details forced open by two mechanisms and proven by the file: Innholdssider/Quiz/Beståttgrense on paper while the screen shows the widget closed; the summary control stays off the paper
log: lane suite re-run at ab6e7e1 in a detached scratch worktree: 1 suite / 11 / 0; mutating canPrint to !this.busy reds exactly 5 arms as claimed; worktree removed after
log: C6 ruling: building the document was right — the sentence names no statute, so nothing needed withdrawing; OD-6 internkontroll ban respected in all three new translation keys
log: residue ruling: print path defensible on the day — sha256 beside material, actor per row, Hentet stamp, fetch journaled server-side, so the paper is corroborable; signed export = backend work
log: finding 1 (non-blocking): gated state + browser-menu print = blank sheet; exact change if wanted: .trn-ev-page__gate { display: block !important } in the page print block
log: finding 2 (non-blocking): evidence.md wording slip — the onboarding banner does NOT print at ab6e7e1; the inherited scoped rule hides it, the in-code comment is the accurate one
log: finding 3 (non-blocking): certificate.update deltas lack the trailing Z register deltas carry — on screen and paper alike; server serialization, named so it is not mistaken for clipping
log: owner's world untouched: nothing restarted, :3971/:5971 never bound, no containers, no live fetch (it would write a disclosure row); livewalk tree byte-identical to ab6e7e1 for both .vue files
END RETURN
