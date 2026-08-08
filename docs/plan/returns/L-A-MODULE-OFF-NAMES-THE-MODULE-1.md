```
RETURN: L-A-MODULE-OFF-NAMES-THE-MODULE
brief: 88c5876c
verdict: fail-spec
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-A-MODULE-OFF-NAMES-THE-MODULE/detail.md
spec_gap: "workforce.personnel-list is offered by the switchboard" cannot be built: the flag gates nothing, WorkforceFlagConsumptionTests measures that behaviourally and pins Withheld.Keys to exactly it.
log:
Reproduced both on :3971 first. The module-off 403 body ALREADY carries code workforce.module-disabled, so the client could always separate the two 403s and no backend change was needed.
WHICH SIDE IS WRONG, measured live: the board offers 8 workforce.* rows and not this one; PUT workforce.personnel-list answers 400 Unknown feature flag; an advertised key on that route answers 200.
The catalogue is right. Withheld[PersonnelList] rests on bokforingsforskriften 8-5-6, covering the two reads AND the correction write, and the census test measures the flag as gating nothing at all.
FAIL-SPEC on the exit's second half only: offering it means shipping a lever that moves nothing, the exact defect Withheld was written to end, and it reds Withheld.Keys in that census.
Fixed the side that was wrong instead: Scripts/demo/seed-workforce-demo.sh stops INSERTing the withheld key into StoreFeatureFlags past the one guard that refuses it. Backend lands first.
New WorkforceDemoSeedFlagTests parses the script's own loop and pins it to Describe() minus the module master BOTH ways: a withheld key put back reds, a flag leaving Withheld reds too.
Defect one fixed on all NINE workforce admin pages, not just the roster the brief named: shared contextRefusalKey keyed on the stable code, plus a new wf_module_off in no/en/de.
BROWSER PROOF, one dark window and two servers: :3971 (the owner's tree, untouched) prints "Du har ikke bemanningstilgang"; :3979 (this lane's tree, same API) names the module and the switch.
:3979 is a SECOND dev server from my own worktree on a port the brief leaves free. Neither owner server was restarted, rebuilt or written to. Shot: after-roster-dark-3979-fixed.png.
Frontend tier 165 suites / 3886 / 0 against the 164 / 3874 / 0 baseline measured on the same worktree. Plus 12 tests, each named: 11 in workforce-context-refusal.test.js, 1 on the roster page.
Three frontend mutations applied, each red then restored green: one page reverted (3 failed), the code check collapsed (3 failed), the no.ts key renamed (2 failed).
Backend non-SQL 4883 / 0 / 10 against 4880 / 0 / 10, run from WebApi.Tests with a real "Passed: 4883, Total: 4893" line. Two backend mutations red then green, the C# one rebuilt and mtime-checked.
The first backend tier attempt aborted at 277 tests with "Test host process crashed" while three other agents ran the same tier on this host; the rerun above is the clean one.
World left as found: 19 rows, 19 Paa, read-only close-out. Disclosed: a control PUT re-stamped workforce.setup, a row already overridden and on; the board reads identically before and after.
Branches unpushed. OkamAPI lane/a-module-off-names-the-module-be 8357c8a33 off 9fb057d00; Web lane/a-module-off-names-the-module 2ce83f6 off 00d84d7, merges clean onto the newer tip 9d275dd.
END RETURN
```
