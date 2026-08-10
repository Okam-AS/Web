```
RETURN: L-GUARD-DEMO
verdict: built
evidence: lanes/L-GUARD-DEMO/demo-run.txt
log:
scripts/drift-demo/demo.sh. Five acts, run on a bench under the scratchpad; the real estate
is never the bench. 8 catches each falsified, 2 misses shown. 0 failures.
ACT 1 wrong-world: a scratch checkout moved to a lane branch. Guard named the branch AND the
two landed commits it was missing. Falsified by removing world.config and re-running the
identical injection: it degrades to "unknown", NOT to "true" -- an absent guard never reads
as conformance.
ACT 2 retain-and-mark: MEASURED, not argued. An earlier draft asserted this, which is the
process-assertion-with-no-artifact shape the reviews keep catching, so it was replaced. On a
bench copy of the real plan running the real tool: ok/present -> unconf/present. The value is
RETAINED, which is what distinguishes "we lost sight of this" from "this was never true".
ACT 3 the channel: `plan check | grep -v warn` shows the clerk nothing; the harness-injected
pulse still carries "flags 38! 32~". Falsified: with no hook, filtered == gone. That is July.
ACT 4 THE MISS: a false sentence with no fact span. Every guard green. Law 2 forbids a machine
editing human prose, so the class is out of reach BY CONSTRUCTION, not by omission.
ACT 5 THE SECOND MISS: the served projection renders entity headers and fields and drops every
prose body. The wrong-world finding is detected, recorded, and unreadable at the owner's URL.
END RETURN
```
