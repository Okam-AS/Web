```
RETURN: L-MEALS-MEMBERS-READ-LAND-CHECK
brief: 9e542dcd
verdict: built
evidence: lanes/L-MEALS-MEMBERS-READ-LAND-CHECK/combinations.md
spec_gap: The brief says frontend-alone leaves "nothing on screen saying why" — the note was replaced, not deleted, and the replacement misdirects worse than silence would.
reason: —
log:
A real pair, unlike tonight's two false ones: backend 086ac34f is 1 ahead / 0 behind FRM (clean FF), frontend 9fbed80 is 4 ahead / 2 behind, neither an ancestor; 12R lives on exactly one api ref.
FOUR COMBINATIONS COLLAPSE TO THREE — but not on the expected axis. "Neither" == "backend alone", because 802041a adds the whole enrolment control: FRM has 0 enrolment hooks, both frontend refs have 8.
So "neither" is not a panel with a protective note, it is no enrolment section at all, and the deleted note never existed on the merge candidate either.
Backend alone = a dead route plus a MEALS_NOT_ENROLLED code no web ref renders. Invisible and harmless; the manager's screen and the employee's till refusal are unchanged.
FRONTEND ALONE is the finding, and 12 of 13 routes exist on FRM, so nothing looks broken: the page fills with Company Meals data, then the enrolment section says three things.
"Tick everybody who should be enrolled" (unconditional, no v-if) above boxes that are not there; "Reload and try again" for a route that will never exist; and "This server did not answer as
Company Meals" — meals_refusal_absent, which fires because an unrouted path 404s with an EMPTY body while a dark route sends problem+json. The screen contradicts itself: the module may not be
installed, printed under that module's own data. Wrong cause, wrong remedy. Not a data-loss risk — the control is genuinely withheld and submitEnrol returns early.
CORRECTION TO THE BRIEF: the note was REPLACED, not deleted (meals_enrol_no_read_note -> meals_enrol_unread_note). Not silence — worse: a permanent absence wearing a transient face.
ALREADY STAGED, so this is not hypothetical: 2e3f39d is in candidate/fe-compose-2026-08-05 and the api half is merged nowhere. Not deciding decides for frontend-alone.
NO GUARD CATCHES IT: 12R is deliberately unanchored in fixture-divergence (the fixture says why in prose), and the journey's fixture defaults to answering a route the merge candidate lacks.
Green in CI, self-contradicting on screen — C5 literally, and the C3 failure arriving through a merge rather than a diff.
SYMMETRY: no — INVERTED. The invite pair's quiet half is frontend-alone (silent catch, no toast, honest by construction); meals' quiet half is backend-alone. Each pair's dangerous direction is
the other's safe one, and meals' dangerous direction is the one already composed. Sequencing is Sven's; this lane names costs and recommends nothing.
Read-only throughout: nothing landed, nothing restored, no branch edited, no container, no push. derive.sh re-derives every figure (F1-F11) after a mid-task session kill.
END RETURN
```
