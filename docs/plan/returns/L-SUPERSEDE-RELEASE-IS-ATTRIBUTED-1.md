```
RETURN: L-SUPERSEDE-RELEASE-IS-ATTRIBUTED
brief: 916092ee
verdict: built
evidence: /Users/svendaneel/okam/wt-supattr/lanes/L-SUPERSEDE-RELEASE-IS-ATTRIBUTED/evidence.md
log: Fourth site = MealsQuoteService.ReleaseSupersededReservationAsync (lane/meals-requote-release): mutates the tracked reservation, issues its own guard decrement, never calls the authority.
ROUTE B: own attribution, named in the census. Route A refused - ReleaseSupersededAsync opens its own strategy+transaction (this runs inside both), skips no expiry, answers Denied* not a no-op.
Stamps a MealsAuditEntry in the release transaction, seam event vocabulary; refused ahead by IsNullOrWhiteSpace (the surface admits blanks). Census: file declared, KnownSiteFloor 14->15.
Mutants, each built fresh and mtime-checked: M1 drop stamp = 2 red (pin + census scope); M2 hard-coded actor = 2 red; M3 drop refusal = 1 red; M5 actor read off the row = 1 red.
M5 is VALUE-EQUIVALENT at runtime (the guard asserts both ids equal) and reds statically only: it proves the census rule covers what the pin cannot, not that the value was wrong.
Named non-red: deleting the KnownFiles line alone (that assertion runs declared->found). First M2 run was INVALID - backups inside the compile glob, CS0101 hidden by -v q - and was redone.
MERGED WORLD MEASURED on a throwaway branch (deleted, unpushed): this site needs exactly one more line, ActorKind = MealsActorKind.User, once the sibling lands. Floor resolves to 17.
That merge leaves one offender not mine: the tip's POS-tender stamp names no ActorKind and {User,System} has no correct till-operator value - confirms F-MEALS-FUNDING-AUTHORITY-COLLISION.
Suite 515/0/3 skips, filter (Meals|Modules)&Database!=SqlServer; zero *SqlServer* tests in any trx. A mssql container that appeared traced to wt-evstalerev and was left alone.
Branch lane/supersede-release-attributed @ 42d170c4 in /Users/svendaneel/okam/wt-supattr, off tip 8e2b57de + lane/meals-requote-release (clean merge). Local only, never pushed.
END RETURN
```
