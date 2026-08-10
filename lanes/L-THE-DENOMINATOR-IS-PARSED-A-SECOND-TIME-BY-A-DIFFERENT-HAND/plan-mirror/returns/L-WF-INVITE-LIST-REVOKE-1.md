```
RETURN: L-WF-INVITE-LIST-REVOKE
brief: c6a4fccb
verdict: built
evidence: lanes/L-WF-INVITE-LIST-REVOKE/evidence.md · backend branch lane/wf-invite-list-revoke @ 68f2472c (forked from 8e2b57de, not pushed)
spec_gap: the brief's "the UI is already landed" is stale for list/revoke — the panel binds issue only, and its wfr_access_no_list copy in 3 locales says "the API has no such routes", which this commit makes false
needs: +L-FE-WF-INVITE-LIST-REVOKE
reason: nothing stopped the backend; the frontend half is deliberately deferred because translations/{en,no,de}.ts and test/e2e/fixture/api-server.js are held dirty by another lane in the shared Web-modules checkout (204 uncommitted files) and cannot be edited without corrupting it or guaranteeing a 4-file conflict
log:
All three absence claims TRUE. Controller bound issue only (:156); no list route, no revoke route;
every WorkforceInvitationState reference in the repo (14 sites) named only Pending or Claimed.
FOURTH absence the brief did not name: Expired is written by no code path either — expiry is a
read-time ExpiresAtUtc compare, so a lapsed code still reads Pending in the row. A list filtered on
State==Pending would have told a manager a dead code is live. Handled with a derived isLive.
Anti-oracle KEPT STRUCTURALLY: ClaimAsync was not touched. Its guard is State != Pending, so
revoking falls into the existing opaque 404 with no revoked branch to keep in sync. New pin compares
a revoked token's refusal to a fabricated one on status/title/detail/type AND extension members.
Built GET .../invitations + POST .../invitations/{id}/revoke. The summary DTO has no token member
and no hash member, so C7 holds structurally; committed as a golden wire fixture to keep it that way.
Revoking an already-CLAIMED code is refused 409, not silent success — the manager revokes because it
went to the wrong person, and a 200 would say "safe" at the exact moment they are not.
C1 transition never delete (row and hash survive); C4 actor = resolved engagement; no migration.
Container-free tier 4652/0/12 green. Both load-bearing tests proved non-vacuous by red-then-green
mutation (revoked-says-revoked → 2 red; no-op revoke → 3 red); restored and rebuilt, 38/38.
END RETURN
```
