```
RETURN: L-JOURNEY-GROWTH
brief: 48b6e440
verdict: built
evidence: artifacts/journeys/growth-guest-lifecycle.playwright.json, artifacts/journeys/growth-testsend-refusal.playwright.json
log:
Both walks green at tip 5ad0ca0 (brief said 3cd2570: true at my 14:45 baseline, a sibling
landed 5ad0ca0 mid-run, so I re-ran the lifecycle to put both artifacts on one tree).
lifecycle 17/17 served 32 subject 23; refusal 11/11 served 97 subject 75; foreign 0 both, so
neither is the proxy blind spot's silent zero. No minted token or code in either file (C7).
MUTATION PROVEN, both arms on disk (lanes/L-JOURNEY-GROWTH/mutation-proof.txt): dropping
`ctx.caller.emailConfirmed === true` reds the walk at the refusal step and ONLY there - the
raw log reads "waiting for .growth-page__toast--error": the refusal stopped happening.
Restoring greens. The script checksums the fixture and restores in a finally.
It refuses where account-email-confirm cannot: the account HOLDS the typed address. That one
refuses at email:null, which 4 causes collapse into, so the clause could be deleted and it
stays green; mine reds. Same address then ALLOWED once confirmed - the opposite, in-world.
PRE-EXISTING RED, untouched: growth-newsletter-send-gate served 0, commit 31fc45d, 11 behind
HEAD, mtime 08-03T16:14Z. Ran only my 2 specs on my own ports 3915/4915.
2 findings: no mail leaves the process; NOTHING links a guest to /preferences/unsubscribe.
lane/L-JOURNEY-GROWTH 40012fc by pathspec, shared ref UNMOVED; artifacts/ gitignored = outside.
END RETURN
```
