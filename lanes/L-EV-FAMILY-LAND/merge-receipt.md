# L-EV-FAMILY-LAND - merge receipt

brief 9b7dbf2b - 2026-08-04 - repo OkamAPI (backend), branch feature/restaurant-modules

## WORKTREE

/Users/svendaneel/okam/OkamAPI-evfamily, created by me with
`git worktree add --detach ... a273e013`. Every build, every test run and both merge
commits happened there and nowhere else.

/Users/svendaneel/okam/OkamAPI-modules was NEVER touched, read or entered - it is on
lane/meals-grace-pins and hosts a live WebApi process.

`git status --porcelain` was EMPTY before each of the three builds. The wire tier dirtied
the two known tracked files, both times, and both times they were restored with
`git checkout --` and NOT committed:
  M artifacts/journeys/ev-dietary/run-sheet.json
  M artifacts/journeys/ev-dietary/run-sheet.md
The worktree is clean now (0 entries).

## TOPOLOGY, MEASURED - NOT INHERITED

  git merge-base 8eee00f7 b0b501a5              = 3579bbbc
  git merge-base --is-ancestor 8eee00f7 b0b501a5 -> NO
  git merge-base --is-ancestor b0b501a5 8eee00f7 -> NO
  git merge-base --is-ancestor 3579bbbc a273e013 -> YES

So the two lanes are true SIBLINGS off 3579bbbc, which is itself an ancestor of the
integration tip. Neither contains the other, so both were merged - the "merge the tip
only" branch of the brief did not apply.

The brief's claim was verified at a273e013 and is TRUE: `git ls-tree -r a273e013` finds
NEITHER EventsPublicProposalWriteGateTests.cs NOR EventsGuestOriginConfigurationWireTests.cs
(nor EventsProposalGateWiringTests.cs). Both rulings were unexecuted on the integration
branch.

## WHAT MERGED

  a273e013  integration tip (Merge the utlkvit family)
  5c3a9be1  Merge lane/ev-accept-gate      (8eee00f7, ruling gate-the-writes)
  9888178f  Merge lane/ev-guest-origin     (b0b501a5, ruling decide-the-host-now)

feature/restaurant-modules now = 9888178f. The move was a strict fast-forward
(`git merge-base --is-ancestor a273e013 9888178f` -> YES). NOTHING WAS PUSHED:
`git ls-remote --refs origin refs/heads/feature/restaurant-modules` returns no ref at all,
and no origin tracking ref for the branch exists locally. No migration was authored.
No container was started, inspected or killed.

BRANCH HANDOFF, and one thing happened here that was not mine - stated exactly.
feature/restaurant-modules was checked out at /Users/svendaneel/okam/wt-land-utlkvit, the
PREVIOUS land lane's worktree (its HEAD reflog is `a273e013: merge fb522bdd`), clean and
idle. Its own reflog shows it was created with the branch already free, so the predecessor
had released it; I did the same rather than leave a stale-HEAD worktree whose `git status`
would have reported my five files as phantom deletions. My action, 01:07:29:

  a273e013 HEAD@{2026-08-04 01:07:29 +0200}: checkout: moving from feature/restaurant-modules to HEAD

Zero working-tree bytes changed, tree still clean, still at a273e013. That is the whole of
what I did to that worktree - one `git checkout --detach`, no file write, no commit, no
branch, no reset.

TEN SECONDS LATER, AND NOT BY ME:

  9888178f HEAD@{2026-08-04 01:07:39 +0200}: reset: moving to feature/restaurant-modules

Something else in this estate hard-reset that worktree onto the branch, which by then was
my merge. I ran no reset in any worktree but my own; my command at that moment was
`git branch -f feature/restaurant-modules 9888178f`, executed from OkamAPI-evfamily, which
cannot move another worktree's HEAD. The reflog identity ("Claude (margin-landing)") is
the committer configured in that worktree by whoever created it, not evidence of who ran
the command. Most likely a concurrent lane or orchestrator syncing it forward.

The outcome is benign and I am recording it rather than smoothing it: wt-land-utlkvit is
now DETACHED at 9888178f with a clean tree that matches it, nothing was lost (it was clean
and exactly at the branch tip both before and after), and no worktree holds
feature/restaurant-modules, so the next land lane can `git worktree add` it directly.
The merge itself is unaffected and was re-verified after the fact.

## CONFLICT COUNT

Trial-merged first in the fresh detached worktree, three times, `--no-commit`, each
aborted and hard-reset before the next:

  a273e013 + 8eee00f7                        0 conflicts
  a273e013 + b0b501a5                        0 conflicts
  a273e013 + 8eee00f7 then + b0b501a5        0 conflicts

TOTAL CONFLICTS ACROSS THE FAMILY MERGE: 0. Nothing was resolved by hand, by side, or by
whole-file. The real merges reproduced that: both `--no-ff`, both automatic.

The merged delta vs a273e013 is EXACTLY the union of the two lane diffs - 7 files, no
extra file, no file dropped:
  M Models/AppSettings/EventsSettings.cs                        (guest-origin)
  M Services/Events/EventsProposalService.cs                    (accept-gate)
  A WebApi.Tests/Events/EventsPublicProposalWriteGateTests.cs   (accept-gate)
  A WebApi.Tests/Wire/EventsProposalGateWiringTests.cs          (accept-gate)
  A WebApi.Tests/Wire/EventsGuestOriginConfigurationWireTests.cs(guest-origin)
  M appsettings.Development.json                                (guest-origin)
  M appsettings.json                                            (guest-origin)
  436 insertions, 8 deletions. Exactly ONE production-source deletion line, and it is the
  ctor signature line that gained a parameter. The merge is otherwise purely additive.

MONEY PATH: no conflict landed anywhere, and no money-path file is even in the delta -
`git diff --name-only a273e013 HEAD` matches nothing on deposit|capture|refund|settlement|
payout|payment. No `blocked` condition arose.

## TIER NUMBERS - BOTH MEASURED BY ME, IN THIS WORKTREE

Container-free tier only, exactly as briefed. Command, both runs, verbatim:

  dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"

`FullyQualifiedName!~SqlServer` was NEVER used. `--no-build` was never used; both runs
built first, so neither measured a stale binary.

  BASELINE  at clean a273e013   Failed 0, Passed 4387, Skipped 12, Total 4399, 5m45s, exit 0
                                lanes/L-EV-FAMILY-LAND/baseline-a273e013.log
  MERGED    at 9888178f         Failed 0, Passed 4394, Skipped 12, Total 4406, 6m26s, exit 0
                                lanes/L-EV-FAMILY-LAND/merged-9888178f.log

  DELTA  +7 passed, +7 total, 0 new failures, 0 new skips.

The merged run is my own; NEITHER lane's green was inherited. Both lanes were green alone
(accept-gate reported 4374/0/12, guest-origin 4371/0/12, each against a 4369 baseline at
3579bbbc) and both of those numbers are now superseded by the two runs above, which are
the only ones taken at the integration tip.

UNION ARITHMETIC (my own [Fact]/[Theory] count under WebApi.Tests, independent of the
runner):
  3579bbbc  4206   common lane base
  8eee00f7  4211   +5  accept-gate
  b0b501a5  4208   +2  guest-origin
  a273e013  4227   integration tip
  9888178f  4234   +7  == 4227 + 5 + 2 EXACTLY -> no pin lost, none duplicated.

The +7 is named, not inferred. Focused run at the merge commit
(lanes/L-EV-FAMILY-LAND/newtests-9888178f.log), 7 passed / 0 failed:
  EventsPublicProposalWriteGateTests.Accept_refuses_for_a_store_without_events_core_then_succeeds_for_the_same_token_with_it_on
  EventsPublicProposalWriteGateTests.Decline_refuses_for_a_store_without_events_core_then_succeeds_for_the_same_token_with_it_on
  EventsPublicProposalWriteGateTests.The_idempotent_replay_of_an_accepted_token_is_gated_too
  EventsProposalGateWiringTests.The_composition_root_injects_the_module_gate_into_the_proposal_service
  EventsProposalGateWiringTests.The_proposal_service_exposes_exactly_one_constructor_and_it_takes_the_gate
  EventsGuestOriginConfigurationWireTests.The_committed_configuration_names_a_guest_origin_under_the_ruled_domain
  EventsGuestOriginConfigurationWireTests.The_running_host_binds_that_key_onto_the_property_the_module_reads
The baseline log contains zero occurrences of either class name, which is the same fact
from the other side.

NOT COVERED: the SQL tier never ran - no slot, container-free only. This family is
certified on SQLite plus the wire host alone. Both changes are provider-neutral (one flag
read and one configuration key; no schema, no migration, no OnModelCreating change), but
that is an argument, not a measurement.

## THE SIX MERGE HAZARDS - ALL SIX CHECKED BY NAME

### 1. CORS POLICY LANDED TWICE - CHECKED, DID NOT FIRE
The hazard this family was expected to trip. Measured on the MERGED tree:
  AddCors            Program.cs:96          exactly one
  AddDefaultPolicy   Program.cs:98          exactly one (AllowAnyOrigin, no credentials)
  named CORS policy  Program.cs:105         exactly one - ClaimConstants.McpCorsPolicy
  its constant       Helpers/PolicyNames.cs:8  "McpBrowserClient", declared once
  RequireCors        Mcp/OkamMcpEndpoints.cs:22,35 - the only two consumers
The merge added ZERO CORS code. `git diff a273e013 HEAD | grep -i cors` returns exactly
two lines, and both are PROSE: the EventsSettings doc comment and a test comment, each
saying the same thing - same site is NOT same origin, a guest fetch to the API is still
cross-origin and still governed by CORS. So the correction is carried as text in the tree,
in two places that agree, and the policy surface itself was not extended, forked or
duplicated. Consistent with the guest-origin lane's own claim ("I did not extend 2a052800,
and I did not fork it").

  FINDING, and it is the other side of this hazard. 2a052800 ("The preference centre is
  allowed to carry the credential it was built around") is NOT an ancestor of the merged
  tip - `git merge-base --is-ancestor 2a052800 HEAD` -> NO. So the named CORS policy that
  commit builds is not landed ONCE either. That is out of my scope (2a052800 is neither of
  my two lanes) and it does NOT block Events: the branch's default policy is AllowAnyOrigin,
  which serves a guest client that sends no credentials, which is what the Events guest
  client is. It DOES block the Growth preference centre, whose client is credentialed and
  which AllowAnyOrigin cannot legally serve. Recorded for whoever lands 2a052800.

### 2. THE GUEST LINK FORKED - CHECKED, DID NOT FIRE
  git grep -E "EventsGuestLinks?" -- '*.cs'   ->  no hit anywhere on the merged branch.
There is exactly ONE guest-link composition site in the tree,
Services/Events/EventsEmailNotificationDelivery.cs:142, composing from
_settings.PublicBaseUrl. The two rival definitions the guest-origin lane described -
EventsGuestLink (singular, prefix-returning, the one it kept) and its own
EventsGuestLinks (plural, whole-URL, the one it dropped) - are both absent, because
lane/ev-uri-relative 6a7bf75b and lane/ev-vipps-fallback-2 fc09be1d are NOT on this branch
(`--is-ancestor` -> NO for both). Nothing forked because there is still only one.

  CONSEQUENCE, and it is why the guest-origin return's merge order did not bind me. That
  return asks for 6a7bf75b then fc09be1d then itself. Those two are content prerequisites
  for the Vipps FALLBACK ADAPTER, not for the configuration half, and b0b501a5 touches
  none of the files they touch - which is why it merged at 0 conflicts out of order. What
  landed here is the configuration only; the adapter fallback and its refusal are still
  unlanded, so the guest's return leg from Vipps remains unproven end to end.

### 3. A PREDICATE COLLISION - CHECKED, DID NOT FIRE
The shape that bit the utlkvit family (two rival definitions of one predicate). Measured:
  interface IEventsModuleGate      Services/Events/EventsModuleGate.cs:28   exactly one
  class EventsModuleGate           Services/Events/EventsModuleGate.cs:54   exactly one
  IsStoreFlagEnabledAsync decl     EventsModuleGate.cs:50 / :82             one + one impl
  new private guard                EventsProposalService.cs:62              exactly one
The accept-gate did not define a rival predicate; it CALLS the existing one, in the
identical shape EventsDepositService.cs:367 already used for the same Core flag on the
same kind of storeless public token route. Two non-test call sites of that shape, one
definition. The only near-twin is EventsModuleGate.IsStoreEnabledAsync (line 80), which
is itself a one-line delegation to IsStoreFlagEnabledAsync(..., Core, ...) - a convenience
over the same predicate, not a second answer to the same question.

### 4. THE RECEIPT TRAP - CHECKED, COULD NOT ARISE
  git diff --name-only a273e013 HEAD  | grep -E "^(artifacts|receipts|lanes)/"  -> none
  git diff --name-only 3579bbbc 8eee00f7 | same grep                            -> none
  git diff --name-only 3579bbbc b0b501a5 | same grep                            -> none
Neither lane committed a run at a receipt or artifact path, so there was no receipt-side
conflict to resolve, nothing was resolved by side, and no measurement was deleted. (My own
run logs live untracked under lanes/L-EV-FAMILY-LAND/ - the same F-EVIDENCE-GITIGNORED
shape already open in this estate, not something this merge introduced.)

### 5. CENSUS FLOORS GONE STALE - CHECKED, DID NOT FIRE
The estate's censuses are `>=` floors guarding against the extraction going blind:
  ModuleAuditActorCallSiteTests:353   sites >= module.KnownSiteFloor (per module, Events
                                      declared in ModuleActorStampPin.cs:173)
  ModuleAuditActorCallSiteTests:358   resolvers >= KnownResolverFloor
  ModuleAuditActorCallSiteTests:364   guards    >= KnownGuardFloor
  StoreAdminResourceLoadingTests:157  sites >= 30 ("33 at the time of writing")
  StoreAdminCrossMethodLoadingTests:204  the four-site floor
  EventsReachabilitySweepTests:63     missing.Count == 0
A floor goes stale only when the count DROPS. This merge removes nothing: one production
deletion line total, and it is a ctor signature that gained a parameter. Net production
change is +1 private method and +2 call sites of an existing predicate; zero audit sites,
resolvers, guards or policy call sites were removed, and no interface method was added
that the Events reachability sweep would then demand a production caller for (the new
GuardStoreEnabledAsync is private). All of those suites ran inside the 4394 at the merge
commit and all passed - not vacuously, since every floor is a lower bound the merge only
pushed further from.

### 6. A REGISTRABLE-DOMAIN HELPER LANDING TWICE - CHECKED, DID NOT FIRE
  git grep -iE "registrabledomain|RegistrableDomainOf|PublicSuffix" -- '*.cs'
  ->  EventsGuestOriginConfigurationWireTests.cs:53  (the call)
      EventsGuestOriginConfigurationWireTests.cs:103 (the only declaration)
Exactly one, private static, scoped to the one test file that needs it, deliberately
narrow (last two labels; correct for .no, refuses a host it cannot reason about). No
second copy landed from any other lane on this branch.

## CONSTRAINTS

C1  no UPDATE/DELETE against any append-only table; the merge adds no SQL at all.
C2  no migration authored; `git diff --name-only` matches no Migrations/ path and no
    DbContext; nothing added to OnModelCreating.
C3  the gate is reachable and the merge carries the proof: EventsProposalGateWiringTests
    resolves IEventsProposalService from the REAL composition root and pins that the gate
    arrived, is the registered singleton, and that only one ctor exists so MEDI cannot
    bind a shorter one later. Both wiring tests ran green at the merge commit.
C4  no money-path file is in the delta, so no actor was made ambiguous on any deposit or
    settlement path. The accept still stamps EventsActorKind.Guest with actorUserId: null
    (EventsProposalService.cs:450) and the decline the same at :514; the seven actor
    stampings in that file are unchanged in kind and in count.
C6  no statutory naming added, widened or narrowed.
C7  `git diff a273e013 HEAD | grep '^+'` matches no _logger, no Log*, no TelemetryClient -
    the merge adds no log or telemetry call at any level, so no sink can carry a secret.

## EXIT CRITERION

  git ls-tree -r --name-only feature/restaurant-modules  ->
    WebApi.Tests/Events/EventsPublicProposalWriteGateTests.cs      PRESENT
    WebApi.Tests/Wire/EventsGuestOriginConfigurationWireTests.cs   PRESENT
    WebApi.Tests/Wire/EventsProposalGateWiringTests.cs             PRESENT (third file,
      the accept-gate lane's reachability pin, rides along)

Both events gate lanes are merged into feature/restaurant-modules at 9888178f, local only.

## WHAT A PERSON STILL HAS TO WALK (C5)

A green tier is evidence the code behaves, never that a capability exists. Two things this
merge does not settle and that only Sven walking them can:
 1. A store with Events.Core OFF must find the guest proposal link dead in a browser -
    EVENTS_PROPOSAL_NOT_FOUND rendered by the guest page, not a 500.
 2. https://okam.no is now the committed guest origin, and pages/events/deposit/_token.vue
    and the proposal page are still not deployed there. The configuration is right and the
    page it names is not shipped - the same unshipped-guest-surface gap L-GROWTH-PREFCENTRE
    hit at /preferences/communications.
