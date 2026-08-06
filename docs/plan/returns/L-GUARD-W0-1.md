```
RETURN: L-GUARD-W0
verdict: built
evidence: lanes/L-GUARD-DEMO/demo-run.txt
log:
Built: scripts/worldstamp in all three probe roots, world.config per repo, .claude/hooks/
plan-wake.sh (SessionStart) and plan-pulse.sh (UserPromptSubmit), .claude/settings.json.
No tool amendment. The wake script compares WORLD.json to world.config itself.
Roots are DERIVED from the probes table, not listed, so a fourth repo is covered next wake.
Measured, not budgeted: pulse 0.47s per prompt (design said 71ms for the tool call alone);
wake 5.7s at session start (design budgeted 1s). Both over. Wake is once a session; pulse
is noticeable but under half a second.
Caught on first run, drift nobody had described: ../OkamAPI-modules is on lane/meals-grace-pins,
NOT a descendant of the declared world, missing 4 landed commits and carrying 1 unlanded.
NINETEEN probes read that checkout, plus one on ../ConsumerWeb. The design said fourteen.
Two defects in my own work, found by checking rather than by reading: the collector emitted
unquoted `unknown` and produced invalid JSON; and I first wrote ConsumerWeb's expected branch
as whatever the checkout happened to be on, which makes the guard pass by definition. It now
reads unknown and D-CONSUMERWEB-WORLD is owed.
Every hook traps its own failure and exits 0. A guard that can brick a session gets uninstalled.
END RETURN
```
