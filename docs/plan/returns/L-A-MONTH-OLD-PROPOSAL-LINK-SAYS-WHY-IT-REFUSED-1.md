```
RETURN: L-A-MONTH-OLD-PROPOSAL-LINK-SAYS-WHY-IT-REFUSED
brief: cc8039ba
verdict: built
evidence: docs/plan/artifacts/superseded-link-refusal.md, force-added past .gitignore:111 and confirmed tracked
log:
THE REASON IS ALREADY NAMED AND ALREADY PINNED, so I added nothing. No expiry, no cleanup job, no ceiling, no new arm.
FIRST, A CORRECTION TO MY OWN EARLIER FINDING. I reported that a month-old link lands on a refusal. It does not, and the truth is better.
GetPublicAsync at EventsProposalService.cs:367-386 does NOT throw for a superseded version. It returns 200 and the page, with isActionable false, the figures as sent, and no accept control.
ProposalSuperseded is thrown at :415 and :503 - the accept and decline paths, which a guest opening a link never reaches. The read explains itself; the write refuses.
THE SENTENCE, VERBATIM, Norwegian: "Det finnes et nyere tilbud" / "Stedet har sendt et nytt tilbud etter dette, så dette kan ikke godtas lenger."
It continues: the figures below are as they stood when you got them, use the newest link, or contact the venue. Present in no, en and de. All three are in the artifact.
So it is not an untranslated 500, not a raw enum name, not a bare error. An unknown status falls back to "Status hos stedet: {status}" beside a neutral sentence rather than being swallowed.
The server carries the reason on the wire too: EventsPublicProposalView.Status is the version status as a string, so the page selects on a fact rather than inferring one from a clock.
PINNED BY TWO ARMS, and only one matters. The page arm holds that the heading and body appear and no accept control does. The other holds the four closed-offer bodies distinct in all three locales.
MUTATION: the Norwegian superseded body replaced by the expired body. The refusal survives - the page still closes, shows no control, displays a sentence. Only the reason is lost.
Executed count from the run, as the rule requires: clean 70 executed, 70 passed, 0 failed; mutated 70 executed, 69 passed, 1 failed. The count is unchanged, so it is a real kill and not a void run.
The arm that red, by name: the closed-offer sentences are all distinct in all three languages.
THE PAGE ARM STAYED GREEN, the lane's whole point: it asserts the body APPEARS, and after the mutation a body still appears - the wrong one. An arm on the refusal cannot see a reason degrade.
Did not widen into the drain or adapter. Mutation applied and restored from a file copy; translations 0 dirty. No trunk moved, nothing pushed, no tier run - the 409 backstop was read, not executed.
END RETURN
```
