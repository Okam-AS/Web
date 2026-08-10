RETURN: L-A-ROLE-UPSERT-STOPS-MINTING-DUPLICATES
brief: 58824cb9
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-roleupsert/lanes/L-A-ROLE-UPSERT-STOPS-MINTING-DUPLICATES/evidence.md
log:
Branched lane/role-upsert-idempotent from feature/restaurant-modules @ a1c1a6dff (read fresh; the landing lane had not moved it). Lane tip 1f0bc9cc0, not pushed.
UpsertRolesAsync matched on ONE condition -- an item carrying a RoleId already in the store. Every other item fell into an unconditional insert.
Both callers that reach that branch lack an id to repeat: workforce-roles.vue's create path omits roleId deliberately, seed-workforce-demo.sh never sends one. Hence two Kokk, two Servitor.
Idempotency-Key does not cover it: CommitAsync replays only on the SAME key, and a second seed run is a new key.
Key chosen from the callers, not taste: the name within the store. It is the only identity both create-path callers repeat, and the only one the schedule select and the seed's own lookup key on.
A caller-minted id was rejected as the key: a form has nowhere to keep one between page loads, so a double submit would still mint a second row.
Retired roles excluded (EffectiveToUtc == null, not "not retired yet"), so reusing a retired name is a new role -- EffectiveToUtc is assigned unconditionally and a match would clear it.
Second hole closed: an id naming no role of the route store silently created a row under a DIFFERENT server-generated id, so the caller's replay missed again and minted another. Now the opaque 404.
Proof calls TWICE with distinct Idempotency-Keys and a CHANGED station; asserts the row count did not move and the survivor is the first call's row BY ID carrying the second call's value.
Three mutants, each caught by its own test: key removed -> 2 red (expected 3 rows, actual 4); unknown-id guard disarmed -> 1 red; retired roles indexed -> 1 red. Rebuilt each time, no mv-restore.
Fast tier Database!=SqlServer: 4836 passed / 0 failed / 10 skipped vs baseline 4832/0/10. Delta +4, the four added facts, nothing else moved. No SQL tier, no container, no migration.
CLEANUP HALF BLOCKED AND RECORDED. WorkforceRoles is NOT append-only (no GuardAppendOnly entry, no deny trigger) -- the upsert already updates it in place, so retiring a twin is an ordinary write.
What refuses a DELETE is what names a role by id: three Restrict FKs on (StoreId, RoleId) -- WorkforceStaffRole, WorkforceRoleRateVersion (appended, never edited), WorkforceShiftAssignment.
An assignment inside a PUBLISHED revision cannot be repointed: WorkforceSchedulePublication is append-only in two layers (GuardAppendOnly + TR_..._Immutable, THROW 50012). Retire, never delete.
Sequence in evidence.md sec.4: list dupes off GET /roles, pick the older survivor, move staff links via endpoint 11, leave rates and published weeks alone, then PUT the twin with effectiveToUtc.
END RETURN
