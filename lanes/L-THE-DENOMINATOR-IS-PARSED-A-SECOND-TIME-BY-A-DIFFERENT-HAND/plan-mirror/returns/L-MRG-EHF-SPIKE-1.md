```
RETURN: L-MRG-EHF-SPIKE
brief: 36ca9ce1
verdict: blocked
evidence: lanes/L-MRG-EHF-SPIKE/DETAIL.md ; lanes/L-MRG-EHF-SPIKE/classify-invoices.py ; lanes/L-MRG-EHF-SPIKE/instrument-selftest.txt ; OkamAPI-modules/docs/plans/DECISIONS.md:172
needs: +D-EHF-INVOICE-ACCESS
log:
The invoices are not missing from the world, only from the repo. Sven's own 2026-07-28 prompt says
"Casper also sent me invoices as examples for cost of ingredients", so the blocker is a file
hand-off, not a discovery or a negotiation. Swept ~/okam, Downloads, Desktop, Documents and
.claude by name and by Spotlight full-text: zero real invoices. The only EHF documents are the
four SYNTHETIC fixtures, byte-identical across worktrees, whose header says nobody has yet
classified a real one. The entitlement criterion has NO REFERENT: no real venue is connected to
Tripletex through Okam - every TripletexConnections.Add outside the onboarding service is under
WebApi.Tests, and README:413 says WP2-WP7 are not built. The app's own ConsumerToken is
unconfigured too - Program.cs:64 binds TripletexSettings, which appears zero times in either
appsettings - so the probe is two credentials short. No probe was run: the handshake is a PUT
that mints a session. Pinned live, not from memory: both endpoints 401 unauthenticated; swagger
confirms no changedSince; ediDocument is machine-readable while attachment and document are
"always a PDF"; OrderLine carries count but NO unit code, so only EHF can safely produce a price
comparison. No per-endpoint scopes exist - entitlement is baked into the token, seen as 200 or 403.
END RETURN
```
