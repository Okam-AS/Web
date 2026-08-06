```
RETURN: L-GR-DEADLINE-STATUTE
brief: 84bd24be
verdict: built
evidence: lane/gr-deadline-statute f7abfd8e (wt /Users/svendaneel/okam/wt-gr-statute, off 3b42da1d) · lanes/L-GR-DEADLINE-STATUTE/growth-scoped.trx
log:
Brief verified in full; every part held. Named all three in GrowthPrivacyObligation's own doc.
(1) art 3(4) NOT implementable honestly: art 2(1) makes public holidays per-Member-State data
    the product holds for no market. Named with direction + worst case + what it would need.
(2) art 3(2)(c) end-of-day judged NOT cleanly implementable alone: end-of-UTC-day renders as
    01:59 next morning in Oslo, moving the PRINTED date later for every row east of UTC.
(3) timezone RECORDED, not ruled. Worked example exact (31 Mar 01:30 Oslo -> screen 1 May,
    venue-local 30 Apr). Venue-local date-only given as recommendation only.
3 pins added, each naming the rule it rules out; no can't-fail assertions.
Mutation A (weekend extension): reds Saturday pin + EXACTLY the 3 clamp rows the doc names;
Friday-holiday pin stays green, proving the holiday half is a separate gap. Mutation B
(+02:00 clamp): reds the calendar pin and nothing else in the file. Both restored.
FOUND: clamp table called 2 Mar "headroom that does not exist" — 28 Feb 2026 is a Saturday,
so art 3(4) gives that same date. Also "the answer was given late" over a fixture resolved
26 days early. Both corrected. Also named: art 12(3)'s 2-month extension is unrecordable.
No migration. Scoped Growth suite on trait Database!=SqlServer: 436/0/1 skip. No tier claimed,
no container started. HAZARD: wt-gr-deadline is LIVE — a sibling committed 3b42da1d under me
mid-edit; I moved out to my own worktree and restored their tree. lane/gr-deadline-statute
is unmerged and needs landing.
END RETURN
```
