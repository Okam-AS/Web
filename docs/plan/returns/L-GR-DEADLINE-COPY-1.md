```
RETURN: L-GR-DEADLINE-COPY
brief: 82c11e98
verdict: built
evidence: lanes/L-GR-DEADLINE-COPY/DETAIL.md · frontend 7a2c789 · backend 3b42da1d (lane/gr-deadline-onwire)
log:
All four findings verified before anything was touched; all four real, #3 worse than stated.
gp_due_unknown rewritten by hand in en/no/de: names the response as the cause, not the receipt time.
Three MORE instances of the same stale claim, not in the brief — the header comment above the gp_*
block in each translation file ("a deadline we DERIVED from the receipt time"). Fixed, plus the
template comment (30-33) and clockLabel's doc: five comments now agree with the wire.
#3: computed both rules over all six clamp rows. 31 Mar and 31 May agree (30 Apr, 30 Jun); the summary
also had the second column backwards — it is the calendar-month answer, not the thirty-day one.
Backend fix committed in the worktree, comment-only, dotnet build 0 errors. C# suite NOT run: no slot.
#4: the old guard returns false for "The address was deleted." — proved. Now all three locales, each
pattern with a control it must catch and one it must not (gp_notice_notattempted's legitimate line).
New rendering test binds copy to condition: same row with dueAt dropped and nothing else — the filed
stamp still prints, no Due fact is drawn, the clock reads gp_due_unknown.
9 mutations, each killed one test, each file restored byte-exact from outside the tree; M4 (restore a
local fallback) and M9 (drop the v-if) are the product ones, M6-M8 prove the guard reads something.
Jest 100/2323, eslint 0 errors. Untouched: the three refusals, both clock fixes, gp_deadline_note.
END RETURN
```
