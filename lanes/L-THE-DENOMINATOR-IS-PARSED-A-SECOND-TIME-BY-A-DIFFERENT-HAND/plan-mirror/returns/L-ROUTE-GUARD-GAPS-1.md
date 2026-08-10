```
RETURN: L-ROUTE-GUARD-GAPS
brief: 307beae0
verdict: built
evidence: lanes/L-ROUTE-GUARD-GAPS/mutation-log.md
log:
Commit a5b9e28b on NEW branch lane/route-guard-gaps, a DESCENDANT of a60da359. lane/phone-in-path NOT advanced, no shared ref moved, feature/restaurant-modules untouched; a merge taking only the parent silently drops this. Worktree /Users/svendaneel/okam/wt-routeguard. No container started or touched. Every brief line number checked at the tip; none had drifted.
VOCAB: +kontonummer +mottaker +receiver (stems), +navn (word); orgnr left pinned false.
Proved AS ROUTE PARAMETERS, not only against the matcher: 8 route mutations, 4 red / 4 near-miss green (mottaker|mottakId, kontonummer|kontoId, navn|varenavn, receiver|receiptId).
receiver RULED IN with its cost pinned as a true row: {receiverUserId} fires, accepted (the estate spells an entity ref {userId}; recipient has carried the identical cost since this file was written). navn is whole-word - its hole, {kundenavn} staying quiet, is written into the file rather than left to be found.
WIRE: new Wire/PhoneBodyBindingWireTests, 6 facts, stubbing 2 MEMBERS not 2 interfaces (UserService depends on IGiftcardService and the bearer handler resolves it per request, so a whole-interface fake takes authentication down).
Ignore-shape mutant run once per action: the guard class is 69/69 GREEN both times - the finding reproduced - while the wire suite reds 3 cases. Constant-shape and wrong-member-harness mutants also red.
Each kill is carried by 2 independent assertions in 2 methods: a per-request equality plus a cross-request distinctness fact, added precisely because one assertion was one refactor from none.
CLAIM CORRECTED: trigger 2 needs anonymous AND guid-shaped, and trigger 1 is itself a name rule, so a non-guid personal value under an opaque name is defended at NO layer. The file now says that, and rule 2's summary now says it proves bound, not used.
RULE 3 BUILT, not half: a template-keyed classified census of credential-shaped path NAMES (DeliberateCapability / NotACredential / OpenGap, each with a reason) plus a stale check, a floor and a pattern theory. 4 mutations, all red. It fired on its author first - 4 Growth templates were wrong and it named them.
FINDING: {handle} on both notification controllers is the APNS/FCM device push token (handed straight to GetRegistrationsByChannelAsync) in a GET path, and both routes are [Authorize]d so it misses BOTH telemetry triggers - published in the clear AND unredacted to App Insights. Recorded as OpenGap with reasons, never allowlisted as deliberate.
Not closed here: the fix is a verb-and-body change to a route four client apps call through Core's notification service. WANTS ITS OWN LANE.
Tier Database!=SqlServer: 4541/0/12, total 4553 vs base a60da359 4517 = +36, exactly the new facts. Observability 178/0. Wire 281/0/2.
No production file changed - both controllers byte-identical to a60da359 after every mutation. No migration authored. Nothing pushed. No failure failed to reproduce.
END RETURN
```
