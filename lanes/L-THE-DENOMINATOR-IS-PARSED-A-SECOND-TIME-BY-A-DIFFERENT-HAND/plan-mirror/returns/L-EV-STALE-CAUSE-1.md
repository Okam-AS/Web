```
RETURN: L-EV-STALE-CAUSE
brief: 26ad663a
verdict: built
evidence: ../web-evstale/artifacts/journeys/events-stale-cause.playwright.json (6/6 steps, 3 PNGs, commit 2bc18da) + ../OkamAPI-modules worktree ../wt-evstale artifacts/lanes/L-EV-STALE-CAUSE/EVIDENCE.md
log:
- BRIEF VERIFIED IN CODE FIRST, and it held exactly. Four conditions OR'd in Map, the wire carried
  only IsStale. The sibling line is on lane/statute-honesty, UNMERGED, so the frontend branch is cut
  from it (as L-EV-EXTDEP-GUARDS did off lane/ev-extdep), not from feature/restaurant-modules.
- ONE DELIBERATE DEVIATION: the field is a nullable LIST, not one value. The causes co-occur — an
  accepted amendment supersedes the sheet AND moves the operative version — so ranking them would
  discard a true cause, which is this defect one layer down. Pinned both tiers.
- NOT-STALE vs STALE-FOR-A-REASON-WE-CANNOT-NAME: null means current and is the only thing that does;
  a named cause always beats the predicate; nothing-to-name is `Unnamed`, never an empty list. The
  client resolves an unrecognised cause, the server's Unnamed, an empty list AND a backend publishing
  only the boolean all to one honest warning — never silence, never the version sentence.
- COORDINATED, NOT DUPLICATED: the dietary line stays the sibling's (it says WHEN, and tells a
  statement from a note; the server's name says neither). My field only gates the VERSION sentence off
  and backstops the case where the screen holds no detail to compare. Their finding is now a note.
- COMPOSITION, NOT ISSUE: the server already compared against CreatedAtUtc; the parameter was named
  ...AfterIssue and is renamed. Pinned by opening a created<issued gap deliberately. Corrected the
  sibling's comment, which justified the right stamp with the wrong sentence.
- RED FIRST, EVERY TIER. Backend 12 failed/2 passed against a resolver stub (Expected ["Dietary...
  "] Actual (null)); MUT-A rank-instead-of-list → 3 fail; MUT-B blame-the-version-always → 7 fail;
  client reverted to the old shape → 15 fail; browser journey on the pre-lane wire → fails at the
  version step. All restored and re-run green.
- GREEN: backend fast tier 4365/0/12 skipped; jest 2206 in 92 suites (core-price-label fails only on
  this worktree's empty `core/` mount — proven environmental, 14/14 with core borrowed); eslint clean
  on every file I touched; playwright 6/6 including both sibling journeys.
- SQL SLIP, RECORDED: one run filtered `~EventsRunSheet` and matched the two [Trait Database=
  SqlServer] run-sheet classes, starting a Testcontainers MsSql for ~50s against a brief granting no
  slot. 38/0, container and ryuk gone, `docker ps` empty. Those two suites assert IsStale on both
  providers and now exercise the derived boolean — whoever holds the slot should re-run them.
- Commits, local, NOT pushed: OkamAPI-modules e5de872d (lane/ev-stale-cause off feature/restaurant-
  modules 24dec838); Web-modules 2bc18da + 818c48a (lane/ev-stale-cause off lane/statute-honesty
  f01886a). The frontend lane must merge AFTER lane/statute-honesty, or it carries it.
END RETURN
```
