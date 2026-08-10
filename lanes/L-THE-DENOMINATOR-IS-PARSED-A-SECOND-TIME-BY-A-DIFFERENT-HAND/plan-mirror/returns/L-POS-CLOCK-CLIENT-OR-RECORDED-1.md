```
RETURN: L-POS-CLOCK-CLIENT-OR-RECORDED
brief: 460ab709
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-POS-CLOCK-CLIENT-OR-RECORDED/finding.md
log:
SURFACE = 2 endpoints at 8e2b57de: 45 POST /workforce/pos/clock-events, 46 GET /workforce/pos/personnel-list. Both need device JWT + X-Operator-Session. No third route.
The clock-state read is NOT an endpoint - it is sessionState on 45's response. A census hunting a third route finds nothing and concludes wrongly.
Lanes named, not re-derived: 4d103ca8+a74a6fd2 add AttendanceException=3 and read state off the fold Outcome; 0c6bca5 is the client that now reads it. Neither is on 8e2b57de.
TIP e34977a: ZERO callers of 45 or 46. The only workforce/pos line in the tree is personnel-list-client.js:9, the comment refusing to bind 46. Candidate f40fdf3 identical. Premise confirmed.
BUT 6 of 163 refs carry the FULL C3 chain: client binds both endpoints, ClockScreen calls both, PosShell:29 mounts mode==='clock', PosTopBar:93 is the lever.
Those refs: fe-pos-clock 7c3a1e1, fe-wf-oplink 3e811b2, fe-wf-blind-bind-name c67df92, fe-wf-link-deadend bed932e, clock-client-reads-the-wire 0c6bca5, preservation 054e140.
Only 0c6bca5 reads sessionState/AttendanceException. The preservation pair = the shared checkout's untracked copy, still infers from the id, so it is stale against 4d103ca8.
CONSUMERWEB, frontend repo 2 per F-PROBE-ROOT-WRONG-WORLD: zero. workforce|clock-events matches 0 of 8 refs. Neither endpoint consumed, no candidate consumer there.
FLAG PREMISE PARTLY FALSE: ../modul feature/restaurant-control-stage0 2758faa has PosClock.tsx, route /pos/clock registered router.tsx:719 + gate routes.mjs:56, live adapter on both endpoints.
That repo is outside the declared world, 2026-07-22, dev-port by default - named because it refutes "no till screen in any repo", not counted as this edition's caller.
EXIT = THE FIRST. The second is not honest: L-WF-PUNCH-UI already built what clears_when asks (13-step journey) and 0c6bca5 repaired it. 45 needs X-Operator-Session so the shell was the only home.
MISSING IS A LANDING, not a build and not a decision. Restate F-POS-CLOCK-NO-CLIENT as a landing item naming 0c6bca5. Order trap plan.md:7070: blind-bind-name lands the older id-inferring till.
SECOND FINDING: F-CLOCKSCREEN-FOUR-BRANCHES-NO-KEYS is FALSE - 0 missing keys on 6 of 6 refs (47 wfclock_, 25-26 posclk_ all defined in no.ts on the same ref). It measured the tip and working tree.
MY TRAP, CAUGHT: first census said NO ref carries the files. zsh does not word-split $PATHS, so one 100-char path was tested - a plausible empty answer. Re-run explicitly, cross-checked ls-tree.
Backend read only via braced git show; the lane/meals-grace-pins checkout never read. Nothing built/committed/pushed, no container, no write outside my lane dir and this return.
END RETURN
```
