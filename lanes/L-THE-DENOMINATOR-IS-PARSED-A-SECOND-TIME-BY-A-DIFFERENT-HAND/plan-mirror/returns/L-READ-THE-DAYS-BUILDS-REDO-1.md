```
RETURN: L-READ-THE-DAYS-BUILDS-REDO
brief: 45388709
verdict: built
evidence: docs/plan/reviews/L-READ-THE-DAYS-BUILDS-REDO.md
log: Read pinned: backend 81d06c10a (holds cf78471b3+44e6dd923, zero drift to tip), FE 8db65dd for the lever, 48c0462 for the receipt. FE trunk moved to 6b98839 after my pin; nothing depends on it.
Baseline fast tier from WebApi.Tests --filter Database!=SqlServer: Passed 4937 / 0 / 10, Total 4947; no abort line above the summary.
Events lever: one gate method holds; drain, health (x2) and resolver all call IEventsModuleGate.IsStoreFlagEnabledAsync; no production reader of the config key outside the gate fallback.
Starvation mutant (filter-after-batch): exactly A_dark_stores_backlog_does_not_starve reds (Delivered 1 expected, 0 actual), 8/9 green; the two-query shape is the difference. Restored.
Newsletter: reader claim holds at tip; only ContentHash and AppendHtml (GrowthDispatchService.cs:509, GrowthNewsletterService.cs:300) read ContentJson; nothing parses it as JSON, backend or FE.
Refuse-every-body mutant: 30 red / 9 green of 39, ALL 22 accept arms red; lane's M4 said 32/7, a different mutant flavour, same load-bearing property. Restored.
If-Match: impostor arm reproduced 7/7 green; dropping GuardIfMatch's compare alone reds NOTHING there; ApplyConcurrencyToken's compare-and-swap still answers the 409.
Both layers disarmed: exactly the impostor arm reds (impostor PUT lands 200). Margin fast tier under pre-check-only mutant: 1/496 red, MarginRevisionGuardConvergenceTests; both layers observed.
Receipt: the fix closes the missing receipt and the replay only; the two-unread different-week press survives; publicationsForNotice reorders unread-first (own pin ['b','a']), rows keep their buttons.
F-THE-ACKNOWLEDGE-BUTTON-CAN-CONFIRM-THE-NEXT-WEEK stands as blocker; no walk with two unread publications has run with the fix — the after-arm and the journey world each hold one publication.
FE runs: feature-flags-page 56/56 at 8db65dd; ack units 42/42 at 48c0462 with core pinned 9626a561.
Pristine re-run of every touched class after restores: 76/76. No source residue; only a suite-written run-sheet artifact inside the disposable worktree.
Non-blocking finding: EventsDrainOutcome.DispatchDisabled changed meaning (true only when rows were due and every due store is withheld); documented in the XML doc, no consumer breaks.
Worktrees removed: scratchpad/redo-be, redo-fe, redo-ack (rm -rf + worktree prune, both repos). web-livewalk, web-ackseen and other lanes' wt-*-redo trees untouched. No push, no container, no pkill.
END RETURN
```
