```
RETURN: L-GUESTLINK-ONE-COMPOSER
brief: 0eb28023
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-GUESTLINK-ONE-COMPOSER/RUN.md
log:
Premise verified in OkamAPI, not Web-modules: fc09be1d resolves there, 8e2b57de is feature/restaurant-modules tip. Plural EventsGuestLinks.cs absent everywhere; one confirming pass, no re-litigation.
Fork is helper-vs-inline as flagged. Inline new Uri(origin+path, UriKind.Absolute) does NOT reject a relative origin on Unix: it yields file:///, so the malformed branch was dead for the usual typo.
One correction: PublicBaseUrlMalformed is a string label persisted to EventsNotificationOutbox.LastError, not a C# enum. The behaviour the flag describes holds; the type does not.
Searched before writing a composer. It already existed on 3 branches and 3 worktrees, all byte-identical sha 97110b7c. Wrote no new one; a seventh copy IS the failure this lane closes.
Carried helper, mail path, origin tests and the sweep re-key byte-identical from lane/ev-uri-relative@6a7bf75b, verified file by file. That lane's 28k-line trx receipts were dropped, not duplicated.
Decision: the composer throws, the fault label stays at the mail path boundary. A composer asked for an address that cannot exist has no value to return that a caller cannot proceed on unchecked.
Both callers still served: the outbox drain catches UriFormatException and returns the same retryable label, so one row fails not the drain; the Vipps adapter refuses before the provider call.
Authored EventsGuestLinkSoleComposerTests: three source rules, 11 synthetic can-fail cases (three guarding the comment stripper), and a floor that reaches 1525 production files.
Red proven before green. M1, mail path inlined as it shipped: 6 failed / 74 passed. M2, mail path inlined but CORRECT: 3 failed / 77 passed, all three mine, zero behavioural.
M2 is the whole point. The carried behavioural test cannot see a correct re-inline, so the exit's pin had to be a claim about the source. Both mutants restored, verified by an empty git diff.
Baseline measured by this lane on a clean checkout of 8e2b57de: 4638 / 0 / 12. After: 4675 / 0 / 12. Delta +37 = 22 carried cases + 15 authored; nothing renamed, skipped or deleted.
Tree-wide search in CALLERS.md. One production caller today, the outbox mail path. The second, EventsDepositPaymentPortAdapter, sits on unmerged lane/ev-vipps-fallback-2: declared, not carried.
Merge hazard: this branch x lane/ev-vipps-fallback-2 conflicts in CredentialCompositionSweepTests. The union is right, either side wholesale reds, and that union exists on lane/ev-vipps-fallback.
Frontend composes nothing. The Nuxt guest pages consume the address as a path parameter; only Playwright journeys spell it, one of them asserting the run sheet does not print it.
Branch lane/guestlink-one-composer at f1900cff in ~/okam/wt-guestlink. No push, no shared branch, no migration, no container touched. C5: no acceptance claimed; Events:PublicBaseUrl is unset.
END RETURN
```
