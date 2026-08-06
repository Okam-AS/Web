```
RETURN: L-FLAG-CONDITIONS-TESTABLE
brief: ec64c7b0
verdict: built
evidence: lanes/L-FLAG-CONDITIONS-TESTABLE/conditions.md
log:
60 open blocker flags (61 an hour earlier; one downgraded mid-measure). Snapshotted plan.md at sha256
7aa1ba846f3f9b24 - concurrent lanes moved my line numbers 134 lines between two parses. T1=0, T2=44,
T3=16 (act 7, rule 2, inexpressible 7); 61 probe lines written. I read the TOOL, not the spec prose, and
three properties decide the classification. (a) A probe reads ONE file (glob, newest mtime; `**` does not
recurse), so "one definition in the tree and six call sites" is outside the vocabulary. (b) Probes only
assert PRESENCE - no match is unconf - so every negative condition must be inverted into an artifact a fix
leaves behind. (c) flag_condition_met NEVER COMPARES THE VALUE, only status==ok and non-empty: therefore
`exists`, `sha256`, `trx`, `junit` and `json:` on any count or bool are UNSOUND in a clears_when. That
indicts existing work - acct.uidx, the ONLY fact-referenced blocker, is `exists` on a filename glob, and
be.world reads `False` at status ok. Three instrument shapes verified with negative controls: named-test
outcome in a trx (testName and outcome share a line, 4351/4363); its mutant twin, which makes "reds if
removed" expressible without weakening (12 flags need it); and `regex:^  "status": "passed",`, where both
failed journeys match zero, one despite 8 nested passes. Root is the repo working dir, on-disk-now, no git
- 1 of 61 probes reads a file a fresh clone would have. RANK: exactly one blocker gates a dispatchable
lane (F-MIG-CHAIN-STACKED, 2 lanes); 37 sit on Feature needs, 20 on FT-GROWTH's single 24-id line.
END RETURN
```
