```
RETURN: L-LIVE-WALK-MEALS
brief: 70ffe2aa
verdict: blocked
evidence: lanes/L-LIVE-WALK-MEALS/evidence.md
needs: +F-MEALS-MONEY-FLAGS-HAVE-NO-LEVER
log:
NO RUN CLAIMED. No container, no process, NO PORT BOUND — 4010/4971/4973 untouched, all foreign. Read-only at web 8ac6f63 / api 8e2b57de (clean, 0 paths). Nothing written outside my lane dir.
THE RESOLVER, CHECKED FIRST: Meals has NONE. Swept the whole tree, not just Program.cs — 2 impls exist (Workforce, Margin), 2 registrations, both theirs. There is no Meals resolver to register.
AND IT NEEDS ONE: StoreBackedMealsFeatureFlags.cs:35-44 falls back to CONFIG, not to the advertised false — verbatim the reason IStoreFeatureFlagEffectiveResolver.cs:9-21 gives for Margin's.
SO THE BOARD LIES, BACKWARDS FROM GROWTH'S: with Features__Meals__Module=true and no row, GET /stores/{id}/feature-flags reports meals.module effective:FALSE over a module that is serving.
UNAVOIDABLE HERE — that env var is the only way to reach act one, so the FIRST live Meals world is the first where the divergence is real. It hides today only because shipped config is false too.
MASTER IS DECLARED, unlike Events: appsettings.json:162-168, all four false; .Development.json has no Features section. The lever COALESCES like Margin, not ANDs like Growth — so it does work.
THE WIRE THAT STOPS THE WALK: 3 of the 4 flags are WITHHELD FROM THE CATALOG BY DESIGN (MealsFeatureFlags.cs:56-72) — no screen, no API, no per-store row; PUT /feature-flags answers 400 for each.
Acts: claim→IsModuleEnabled (Membership:545), order→IsOrderingEnabled (Quote:69), month→IsProjectionEnabled (Worker:67), statement→IsStatementsEnabled (:642) — all Module&&X, host config.
meals.module's lever reaches only venue-scoped surfaces (Agreement:241, Company:382, Reconciliation:76). NOT ONE ACT of my walk sits behind it; live-world.sh:336 sets no masters, so act one 404s.
FIXTURE SAYS IT IN PROSE AND MODELS IT NOWHERE — meals.js:240-244 "no lever a journey could flip. These routes therefore always answer." d1c4b26's repair is NOT an ancestor of 8ac6f63.
NOT GROWTH'S BLOCKER, CHECKED: the code is READABLE live — DeriveToken is HMAC(id), re-derived and returned at create (Membership:288). No mail sink needed; both invitee routes real (:140,:162).
THE WALK CANNOT SURVIVE UNCHANGED: it signs in as TWO people (spec:106,:219) but the app has exactly TWO no-SMS sign-ins, both single config values (UserService:631,634). +4790000001 is fixture-only.
A live claim needs a PHONE (RequireIntendedContact:600-620; no live email flow); the only claimable one is 99999999 — itself in WITHHELD (spec:44) and on screen, so that assertion reds for no leak.
STALE, NOT RED: spec:246-250 still says MealsMembership.EmployeeReference "does not exist". Migration 20260731215452 created it, copied at claim, read into MemberDisplayRef (Statement:394-396).
SIX OF NINE CAPTURES DRIVE ANOTHER APP (../ConsumerWeb, its own playwright config), so the funded order is a 4th process. SLOT ALSO BLOCKS: sql cap 2 full, class node; the one mssql up is ryuk-owned.
END RETURN
```
