RETURN: L-A-WORKER-SEES-WHAT-SHE-CONFIRMED
brief: 29d08ee0
verdict: built
evidence: docs/plan/lanes/L-A-WORKER-SEES-WHAT-SHE-CONFIRMED/evidence.md
log:
branched frontend trunk 00d84d7 read fresh; the owner checkout at 0c1e4f9 is NOT a descendant of it and was untouched. backend 9fb057d00 read, no backend change made, so no backend tier was run.
lane commit 48c0462 on lane/a-worker-sees-what-she-confirmed, worktree ~/okam/web-ackseen, core submodule at 9626a561 matching the trunk gitlink. not pushed.
MECHANISM: acknowledging implies seen, so the row left the unread list one tick after the receipt arrived and the notice v-if took the receipt with it. no template change could have fixed that.
FIX: publicationsForNotice() keeps a row this session acknowledged, server copy preferred and the pressed row as fallback; the notice stops calling that row new (heading, lede, dot, mark-read).
PIN IS THE JOURNEY: workforce-week-run-two-humans.spec.js — the Bekreft step inverted rather than deleted, two pre-press assertions added, plus a NEW step walking the replay off the #44 response.
LIVE ARM before, unmodified trunk code, manager 6ba6dd27: press 200 alreadyAcknowledged=false, then after.receiptCount=0 and anyToastCount=0. she pressed twice and was shown nothing either time.
LIVE ARM after, fix applied by HMR, worker b719056b, SAME publication 0d8ef70d: receiptCount=1 "Bekreftet mottatt 7. aug., 13:58.", title "Vaktplanen er bekreftet", ledeCount=0, dotCount=0.
replay reachable for the first time: buttonCount=1, 200, alreadyAcknowledged=true, "Allerede bekreftet 7. aug., 13:58.". raw results in before-walk.json / after-walk.json plus six screenshots.
TIER 164 suites / 3889 / 0 against trunk 164 / 3874 / 0 = +15 tests and no new suite: 9 in test/workforce-me-inbox-filter.test.js, 6 in test/workforce-me-components.test.js, each named in evidence.md.
MUTATION: ten mutations written into the source, run and reverted (four in inbox-filter.js, six in the notice). 15 of 15 new tests red. tree restored from byte copies, tier re-run green, no residue.
the journey step's own mutation is ARM before: the identical selectors driven against the identical code path with the fix absent give receiptCount 0.
LEFT APPLIED in web-livewalk by HMR so Sven can walk it: 3 source files and one line inserted in each of translations no/en/de. the training lane's diff there was preserved; undo in evidence.md.
C1 both acknowledgements went through the documented append path by the recipients themselves and the replay wrote no second row. no migration, no money write, no statute string, no secret anywhere.
:3971 and :5971 never bound, nothing restarted or killed, no container started or touched, no npm install — the lane worktree symlinks the owner's node_modules.
STILL OPEN, a sibling lane's exit: the receipt is page state, the inbox carries no acknowledgement field and #44 has no GET sibling, so a reload loses it. recorded as a gap finding inside the journey.
END RETURN
