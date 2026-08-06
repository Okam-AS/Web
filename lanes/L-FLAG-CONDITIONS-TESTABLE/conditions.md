# Every open blocker flag, classified by who can answer it

Lane `L-FLAG-CONDITIONS-TESTABLE` · brief `ec64c7b0` · measured 2026-08-05.

**Measurement point.** `docs/plan/plan.md` at sha256 `7aa1ba846f3f9b24`, 16433 lines, snapshotted before
parsing because three other lanes are mutating it — my first parse and my second disagreed by 134 lines and
one flag changed severity between them. Every line number below is against that snapshot. Repo
`/Users/svendaneel/okam/Web-modules` on `feature/restaurant-modules`; siblings `../OkamAPI-modules`
(on `lane/meals-grace-pins`) and `../ConsumerWeb` (on `feature/swiss`).

**Population.** 183 Flags · 175 open · 60 open **blocker** (was 61 an hour earlier;
`F-EXISTENCE-CHECKS-REPORT-PRESENT-FILES-ABSENT` was downgraded to `warn` mid-measurement).
Of the 60, **57 are named in a `needs:`** and 3 are named nowhere.

**Nothing here was cleared, edited or rewritten in `plan.md`.** Clearing is the clerk's act on a met
condition and ruling is Sven's. This file proposes; it does not act.

---

## 1. What a probe can actually do

Read from `~/.claude/skills/plan-hub/bin/plan` (`probe_sources`, `run_probe`, `flag_condition_met`,
`clears_when_residue`), not from the SPEC prose. Four properties decide most of the classification, and
three of them are not stated in §2.6.

**(a) A probe reads exactly one file.** `probe_sources` globs, keeps files, sorts by mtime and takes
`hits[0]`. There is no aggregation, no cross-file comparison, no second file. Any condition of the form
*"exactly one X exists in the tree and all six callers read it"* is outside the vocabulary by construction.
The glob is `glob.glob` without `recursive=True`, so **`**` does not recurse** — it behaves as `*`.

**(b) A probe can only ever assert presence.** `contains:` and `regex:` scan **line by line** and return
`("present" | capture)` on a hit; on no hit they return `(False, "")`, which `refresh` turns into
retain-and-mark `unconf`. There is no "absent" value. Every condition phrased as a negative — *no branch
carries*, *no guard throws*, *the middleware is deleted*, *no exit is satisfied by* — must be inverted into
something a fix positively leaves behind, or it is not expressible.

**(c) A flag's `clears_when` never compares the value.** `flag_condition_met` does
`re.findall(r"fact:([A-Za-z0-9_.-]+)", cw)` and then checks only `status == "ok"` and
`content.strip() != ""`. The `=<literal>` form that `plan verify` honours is **stripped by the residue
regex but never checked here** — so `clears_when: fact:x=none is present` reads as machine-complete and
clears on any non-empty value. *The only thing a flag can test is that the probe matched at all.*

> **The soundness rule this forces, and it is the whole engineering content of this lane:**
> a flag-clearing probe must be built so that **matching ⇔ the condition holds**. Extractors that always
> succeed are therefore inadmissible in a `clears_when` even though the tool accepts them:
> `exists` (always "present"), `sha256` (always a hash), `trx` / `junit` (return `"N passed / M failed"`
> as `ok` **including when M > 0**), and `json:` on any count or boolean (`0` and `False` are both `ok`).
> Only `contains:` and `regex:` fail closed. Use them, and pick a literal that cannot appear in the bad state.

**(d) The glob root is the plan repo's working directory, and "exists" means on disk, now.**
`os.path.join(p.repo_root, pat)`; `repo_root` walks up from `docs/plan/` to the first `.git`, i.e.
`/Users/svendaneel/okam/Web-modules`. There is **no git in the probe path at all** — no ref, no index, no
branch. So a path probe answers *"is this file in this working tree at refresh time"* and answers neither
*"is it tracked on this branch"* nor *"is it tracked on any ref"*.

Worked example, measured today, because this is the exact shape three census lanes got wrong:

| path | on disk | in index | on `feature/restaurant-modules` | committed on some ref |
|---|---|---|---|---|
| `components/admin/pos/ClockScreen.vue` | yes | **no** | **no** | yes (`7c3a1e1`) |
| `components/admin/margin/MarginWastePanel.vue` | yes | yes | yes | yes (`4351f8f`) |
| `utils/workforce/pos-clock-state.js` | yes | **no** | **no** | **no** |

A `contains:` probe over `ClockScreen.vue` reads **present** on this machine and **absent** in a fresh
clone of the declared world. `F-POS-CLOCK-NO-CLIENT` would clear here while its own body correctly says
the work is unmerged. Every probe below states which of the three questions it answers.
The sibling lane `L-EVIDENCE-CITATIONS-RESOLVE` is measuring the citation half of this; where a flag's
condition turns on *where a cited file lives* rather than on *what it contains*, I point at that lane
rather than duplicating it.

---

## 2. Four probes already in the plan are unsound by rule (c), and one of them is load-bearing

| probe | line | why it cannot be trusted in a `clears_when` |
|---|---|---|
| `acct.uidx … exists` | fence | **This is the only fact-referenced blocker in the plan.** `F-ACCT-DUP` says *"AccountingSummaries has no unique index in the migration chain"* and clears on `fact:acct.uidx is present` — which the `exists` extractor satisfies the moment **any** file matching `Migrations/*AccountingSummar*.cs` appears, whatever it contains. The one condition the tool can test is testing something weaker than the flag means. |
| `be.world`, `fe.world`, `cw.world` … `json:$.on_expected` | fence | Returns `"True"` / `"False"` / `"unknown"` — **all three are `status: ok`**. The live span reads `be.world … ok-->False`. Any `clears_when` naming it clears while the world is wrong. |
| `journeys.browser … exists` | fence | Matches any `artifacts/journeys/*.json`, newest mtime. Cannot fail; also guard-1-inadmissible for `verify`. |
| `ev.journeys`, `wf.journeys` | fence | `journey`-kind probes pointed at `*-MANIFEST.md` — a hand-written assertion about a suite wearing the one evidence kind `verify` admits. This is `W-PROBE-PROSE`, and `F-BACKEND-FACTS-OFF-BRANCH` already says so. Do not copy this shape. |

A probe with no fact span cannot clear anything either — `flag_condition_met` looks the key up in
`p.facts`, not in the probes table. The plan has already paid this (`W-PROBE-UNUSED` on three probes).
**Every probe below needs a span added in the same edit.**

---

## 3. Verified instrument shapes

Three shapes were checked against real files, with a negative control, before being used below.

**S1 — a literal in one committed source file.** `contains:` / `regex:`. Strongest available: `refresh`
re-reads the source every time, so it cannot go stale the way a generated artifact does.

**S2 — a named test's outcome in a committed `.trx`.** Verified against
`../OkamAPI-modules/artifacts/tests/99855b1d-fast-tier.trx`: one `<UnitTestResult>` per line, with
`testName="…"` and `outcome="…"` on the **same line** (4363 result lines, 4351 matching
`testName=.*outcome="Passed"`). So
`regex:testName="[^"]*<Name>[^"]*"[^>]*outcome="Passed"` works and fails closed.
Its mutant twin — the same regex with `outcome="Failed"` against a mutation run's trx — is what makes
*"pinned by a test that reds if X is removed"* expressible **without weakening it**. 12 of the 60
`clears_when` sentences carry that clause; a probe asserting only the green half is exactly the
non-failing-assertion shape this plan has catalogued twenty-two times, so the pair is mandatory, never
the baseline alone.

**S3 — a journey artifact's top-level status.** `json:$.status` is unsound by rule (c) (`"failed"` is
`ok`), and a bare `regex:"status": "passed"` is unsound because per-step statuses are nested in the same
file. **`regex:^  "status": "passed",`** — anchored to the two-space top-level indent — discriminates.
Negative control run: `margin-recipe-to-margin.playwright.json` (passed) matches once;
`growth-newsletter-send-gate.playwright.json` matches **zero**; `training-course-to-evidence.playwright.json`
matches **zero despite carrying 8 nested `passed` steps**. It is brittle against a change of pretty-printer
and that is stated where it is used.

**S4 — a discrete literal in a script-generated artifact.** For conditions that are universals a
deterministic script can compute (git ancestry across refs, an endpoint inventory from the composition
root, a census derivation). Legitimate — `scripts/worldstamp` already does this for `WORLD.json` — but it
carries two residues that must travel with every use: the artifact is only as fresh as the last run of its
generator (`WORLD.json` is stamped `2026-08-03`, the facts were refreshed `2026-08-04T21:52Z`, so it was a
day stale at read time), and the probe tests **what the generator wrote**, not the world. An artifact whose
generator is an agent writing prose is laundering, not measurement; `W-PROBE-PROSE` only catches the
markdown case, so a `.txt` of the same content escapes the warning and is no better.

---

## 4. Classification

`gates` — what the flag is named in. **`FT-GROWTH` is a parking lot**: its `needs:` line
(plan.md:574) carries 24 ids, 20 of them flags, and 13 of those are not Growth work at all
(Training, Journal, Events, Margin, Meals, POS, plan-infrastructure). One line holds a third of
the blocker set.

Classes: **T1** fact-testable now · **T2** fact-testable with a named probe · **T3** a person, with
sub-reason `act` (only the owner can perform it), `rule` (a product or design judgement), `inexpr`
(a question of fact the vocabulary cannot express without weakening it).

| # | Flag | class | gates | why |
|---|---|---|---|---|
| 1 | F-MIG-CHAIN-STACKED | T2 (S4) | **2 lanes** + S-PILOT-SAFE | negative universal over local refs; needs git, so it needs a generated artifact |
| 2 | F-WF-TWO-ADMINS-TWO-ENGAGEMENTS | T2 (S1+S2) | FT-GROWTH | constraint half is a migration literal; race half is a named SQL-tier test |
| 3 | F-WF-NOCORRECTION | **T3-inexpr** | FT-WORKFORCE | *"a production code path records"* — schema fields are probe-able, a reachable caller is not, and asserting the fields is the 2026-07-29 reachability failure verbatim |
| 4 | F-AZURE-FUNCKEY | **T3-act** | S-PILOT-SAFE | rotation. Also: Sven's note (2026-08-04) says *"this is fine disregard"* and *"not blocking any lane"* — but it is `severity: blocker` in `S-PILOT-SAFE`'s `needs:`, and §3.2 gates on that. **The note and the wiring disagree; only Sven can resolve which is true.** |
| 5 | F-FIXTURE-NO-GATES | **T3-inexpr** | S-EVIDENCE | *"for every gated surface a journey walks"* — a universal over journeys × surfaces; needs a derivation nobody has built |
| 6 | F-MEALS-LEVER-INERT | T2 (S1) | FT-MEALS | arm 2 is a withheld catalog entry carrying a written reason — a literal |
| 7 | F-EV-ACCEPT-UNGATED | T2 (S2 pair) | FT-EVENTS | *"pinned by a test that reds if the gate is removed"* |
| 8 | F-EV-INQUIRY-UNGATED | **T3-rule** | FT-EVENTS | the flag says in its own body it was *"deliberately left for a ruling"*: refuse the write, or hide the form. Product call. |
| 9 | F-FLAGS-FALSE-GUARANTEE | T2 (S1) | S-PILOT-SAFE | arm 1 is a DI registration line for the Meals effective-flag resolver |
| 10 | F-UTLKVIT-SALE-ROW | T2 (S2) | FT-MEALS | three paths + a copy-guard refusal, each a named test in the merge-commit trx |
| 11 | F-XZ-CREDIT-UNSPEC | T2 (S1×3) | FT-MEALS | two report fields and a systembeskrivelse sentence — all three are literals |
| 12 | F-EV-NO-GUEST-ORIGIN | T2 (S1) | FT-EVENTS | *"a committed configuration sets the guest origin"* — exactly a literal in `appsettings.json` |
| 13 | F-GR-UNCONFIRMED-EMAIL | T2 (S1+S2) | FT-GROWTH | *"and a pin proves an unconfirmed one is refused"* names its own instrument |
| 14 | F-GR-DISPATCH-UNATTRIBUTED | T2 (S2) | FT-GROWTH | actor recorded — a named test over the run row |
| 15 | F-MEALS-EIGHTH-READ | T2 (S2 pair) | FT-MEALS | *"so a clamp and a correct decrement are distinguishable"* **is** the mutation clause |
| 16 | F-MEALS-NO-SQL-ON-REQUOTE | T2 (S4) | FT-MEALS | *"a SQL Server tier run exists … with its trx committed"* — the condition is the artifact |
| 17 | F-CONFIRM-BRUTEFORCE | T2 (S1×3) | FT-GROWTH | limiter, attempt counter, cryptographic source — three literals in three files |
| 18 | F-JOURNEY-GUARD-DECORATIVE | T2 (S2 pair) | S-EVIDENCE | *"proven by a mutation"*; the flag records that no re-runnable proof exists |
| 19 | F-MEMCACHE-IN-TRYCATCH | T2 (S1+S2 pair) | S-PILOT-SAFE | *"and a test reds if it moves back inside a conditional path"* |
| 20 | F-FIXTURE-BEHIND-BACKEND | T2 (S4) | S-EVIDENCE | the divergence check exists and prints the sha/branch it read; probe its report |
| 21 | F-ACCEPTANCE-IS-THE-CHOKE | **T3-act** | S-EVIDENCE | acceptance is guard 2, owner-locked. Definitionally unprobeable — a probe that cleared it would be a probe that faked acceptance. |
| 22 | F-MRG-STATEMENT-UNATTRIBUTED | T2 (S2) | FT-MARGIN | same shape as #14, on a money surface (C4) |
| 23 | F-ARTIFACT-STORE-OVERWRITES | T2 (S4) | S-EVIDENCE | *"every artifact records which backend build answered it"* — a universal over 22 artifacts; derivable |
| 24 | F-INVOICE-RETRY-ANONYMOUS | T2 (S4) | S-PILOT-SAFE | declared subsumed by #39; shares its artifact |
| 25 | F-ACCT-DUP | **T2 (replace)** | S-PILOT-SAFE | already fact-referenced, but by an `exists` probe that clears on a filename. §2 above. |
| 26 | F-EV-CALLBACK | T2 (S2) | FT-EVENTS | *"a test proves that …"* names its instrument |
| 27 | F-GR-FALSE-EVIDENCE | T2 (S2) | FT-GROWTH | *"proven by a contract case in which the sender throws"* |
| 28 | F-WF-NO-INVITE | T2 (S3) | FT-WORKFORCE | *"a browser journey captures …"* |
| 29 | F-AI-REQUEST-BODY | T2 (S2 pair) | S-PILOT-SAFE | *"proven by a test that fails if it is wired back"*; the lane already ran red/green across four builds |
| 30 | F-WF-CLOCK-UNLINKED | T2 (S3) | FT-WORKFORCE | *"a journey capture shows …"* |
| 31 | F-GR-HEALTH-DEAF | T2 (S2) | FT-GROWTH | a behaviour with no mutation clause; a named test is the §6.1 instrument |
| 32 | F-VIPPS-REDACT-OPEN | T2 (S2 pair ×2) | S-PILOT-SAFE | *"pinned by tests that fail when either path is reopened"* — two paths, two pairs |
| 33 | F-WF-PUSH-SILENT | T2 (S2 pair) | FT-WORKFORCE | *"pinned by a test that fails if the outcome is discarded again"* |
| 34 | F-PERSONALLISTE-PRINT | **T3-inexpr** | FT-WORKFORCE | *"a rendered PDF … **showing the sheet laid out for paper**"*. `exists` on a PDF clears on a blank one. The second half is an eye, and this is the § 8-5-6 document. |
| 35 | F-DETACHED-MIGRATIONS | T2 (S4) | S-PILOT-SAFE | pure git ancestry; `scripts/worldstamp` already computes `ancestor_of_integration` |
| 36 | F-WF-BLIND-BIND | T2 (S3+S2) | FT-WORKFORCE | *"the review names the person"* is a screen property (journey); *"corrected through an audited path"* is a test |
| 37 | F-GR-NEWSLETTER-CROSS | T2 (S2) | FT-GROWTH | four wire refusals, proven at a tip — a trx committed at that tip |
| 38 | F-PROBE-ROOT-WRONG-WORLD | T2 (S1) **+ open decision** | S-EVIDENCE | the mechanism exists; the probes are unsound (§2) and `cw.world` has no expected value until `D-CONSUMERWEB-WORLD` is ruled |
| 39 | F-INVOICE-ROUTES-ANONYMOUS | T2 (S4) | S-PILOT-SAFE | *"every route on the controller"* — a universal; the 734-endpoint routing derivation already exists as a one-off |
| 40 | F-CONFIRM-MERGE-RECEIPT-TRAP | T2 (S1, weak) | S-PILOT-SAFE | two distinct trx names + two evidence files pointing at them; both evidence files are untracked markdown under `lanes/` |
| 41 | F-UTLKVIT-PREDICATE-COLLISION | **T3-inexpr** | S-PILOT-SAFE | *"one predicate exists in the tree and all six call sites read it"* — a count over files. Rule (a) forbids it; only a derivation could carry it, and none is committed. |
| 42 | F-PROD-CORS-WILDCARD | **T3-act** | S-PILOT-SAFE | *"checked against the live host"*, and the fix reaches production only through `D-PREFCENTRE-DEPLOY`. No file answers it. |
| 43 | F-POS-CLOCK-NO-CLIENT | T2 (S1) | S-PILOT-SAFE | arm 1 is a route literal in the till screen — **and it is the worked example of §1(d)**: present on disk, on no ref this branch has |
| 44 | F-EV-GUESTLINK-FORK | **T3-inexpr** | FT-EVENTS | *"exactly one composer exists in the tree and every caller reads it"*, where *the tree* meant 315 refs. Rule (a) + git. |
| 45 | F-GR-PROVIDER-ACCOUNT-UNGATED | T2 (S2 pair) | FT-GROWTH | *"pinned by a test that reds if the gate is removed"* |
| 46 | F-ROLLBACK-LEAVES-TRACKED-STATE | T2 (S2) | FT-GROWTH | arm 1 is a negative universal; **arm 2** — *"a pin proves the next operation sees the pre-mutation state"* — is a named test |
| 47 | F-POS-TENDER-WIRE-REINTRODUCES-TWO | **T3-inexpr** | FT-GROWTH | the calibration case — §6 below |
| 48 | F-EXIT-PREFIX-IS-A-STAMP | **T3-act** | FT-GROWTH | the defect is in the `plan` tool's own matcher, outside this repo, and the remedy includes un-verifying six lanes, which is guard 1's owner path |
| 49 | F-BACKEND-FACTS-OFF-BRANCH | **T3-inexpr** | FT-GROWTH | clause 1 is probe-able (and its probe is unsound today); **clause 2** — *"the two journey facts measure what their exits claim"* — is a judgement about whether an instrument matches a sentence. Probing clause 1 alone clears on half. |
| 50 | F-INTEGRATION-BRANCHES-UNCOMPOSED | T2 (S4) | FT-GROWTH | *"its receipt records a tier run at the composed commit"* — the artifact is the condition |
| 51 | F-MEALS-FUNDING-AUTHORITY-COLLISION | **T3-rule** | FT-GROWTH | *"one **agreed** shape"* is an agreement between two lanes, and the actor-kind enum has no correct value for a till operator — a design call |
| 52 | F-PLAN-NOT-IN-GIT | **T3-act** | FT-GROWTH | tracking `docs/plan/` is a commit to a shared branch |
| 53 | F-MEALS-SUPERSEDE-BYPASSES-AUTHORITY | T2 (S4) | FT-GROWTH | *"named in the census"* — the census derivation is the named instrument |
| 54 | F-MRG-WASTE-PANEL-CALLS-NOTHING | T2 (S1) | FT-GROWTH | arm 2 is UI copy, **in this repo, in the declared world** |
| 55 | F-EV-CONCURRENCY-GUARD-UNTESTED | T2 (S2) | FT-GROWTH | *"proven to refuse a stale revision **on SQL Server**"* — a named test in a SQL-tier trx |
| 56 | F-JOURNAL-FINALIZE-INDEX-DROPPED | T2 (S4) | FT-GROWTH | *"exists on a chain-built database"* — a `sys.indexes` dump; **same artifact as #25** |
| 57 | F-TRAIN-EVIDENCE-SERVICE-UNCENSUSED | T2 (S4 pair) | FT-GROWTH | *"shown by a derivation that reds when one is missing"* — condition names derivation **and** its mutation |
| 58 | F-GR-NO-EXIT-FROM-A-LIST | **T3-act** | *nothing* | *"against the deployed origins"* — `okam.no/preferences/communications` answers 404; needs a deploy |
| 59 | F-CORE-PIN-ON-NO-REMOTE | **T3-act** | *nothing* | the remedy is a push, and the condition names `git branch -r --contains` as its own instrument |
| 60 | F-CLOCKOUT-ANSWERS-OPEN | T2 (S2) **after a small ruling** | *nothing* | *"shown by a wire assertion over the response"* names its instrument; but *refuse* vs *answer truthfully* is unmade — the flag says so |

**Totals: T1 = 0 · T2 = 44 · T3 = 16** — T3 splitting **act 7** (#4, 21, 42, 48, 52, 58, 59),
**rule 2** (#8, 51), **inexpr 7** (#3, 5, 34, 41, 44, 47, 49). The one flag that already carries a
`fact:` key is not T1 — its probe is unsound.

**So the honest headline is not "most of it needs a person".** Only 16 of 60 do, and 9 of those 16 are
questions of fact that could be answered by a machine if somebody built the derivation — they are class
three today because of what a probe *is*, not because of what the question *is*. What genuinely and
permanently belongs to Sven is the seven `act` rows and the two `rule` rows: a rotation, an acceptance
batch, a deploy, a push, a commit of `docs/plan/` to a shared branch, a tool fix that un-verifies six
lanes, and two product calls.

---

## 5. The probes

61 probe lines covering the 44 class-two flags. Paste into the `## Probes` fence in `plan.md`.
**Every line needs a matching fact span in `## Facts` in the same edit**, or the key exists for `check`
and not for `flag_condition_met`.

Root for every relative glob: `/Users/svendaneel/okam/Web-modules`. Meaning of a match: **the file is on
disk in that working tree when `plan refresh` runs** — not tracked, not on a ref. Where the source is under
`../OkamAPI-modules`, that checkout is on `lane/meals-grace-pins` today and `be.world` reads `False`, so
**every backend probe below reads a foreign world until `F-PROBE-ROOT-WRONG-WORLD` closes.** That is a
precondition on 43 of the 61, not a footnote.

```probes
mig.stacked        meta     artifacts/world/MIGRATIONS.json                                       contains:"unmerged_tails_on_other_lanes": "none"
mig.tip.reachable  meta     artifacts/world/MIGRATIONS.json                                       contains:"chain_tip_reachable_from_expected": "yes"
be.world.ok        meta     ../OkamAPI-modules/artifacts/world/WORLD.json                         regex:"on_expected":\s*true
fe.world.ok        meta     artifacts/world/WORLD.json                                            regex:"on_expected":\s*true
cw.world.ok        meta     ../ConsumerWeb/artifacts/world/WORLD.json                             regex:"on_expected":\s*true
acct.uidx.chain    schema   artifacts/schema/chain-built-indexes.txt                              contains:AccountingSummaries UNIQUE
jrnl.finalize.idx  schema   artifacts/schema/chain-built-indexes.txt                              contains:IX_JournalEntries_Finalize
routes.anon.inv    wire     artifacts/routes/endpoint-authorization.txt                           contains:InvoicesController anonymous-by-omission: 0
census.audit.der   wire     artifacts/census/audit-writers.txt                                    contains:uncensused-audit-writers: 0
census.audit.red   wire     artifacts/census/audit-writers-mutant.txt                             contains:uncensused-audit-writers: 1
census.release.der wire     artifacts/census/allowance-release-sites.txt                          contains:sites-bypassing-funding-authority: 0
artifact.identity  meta     artifacts/journeys/INDEX.json                                         contains:"artifacts_without_build_identity": 0
fixture.divergence wire     artifacts/fixture/divergence-report.txt                               contains:divergent-refusal-shapes: 0
sql.tier.requote   suite    ../OkamAPI-modules/artifacts/tests/*-sql-tier.trx                     regex:testName="[^"]*Meals[^"]*ReQuote[^"]*"[^>]*outcome="Passed"
sql.tier.composed  suite    ../OkamAPI-modules/artifacts/tests/composed-*-sql-tier.trx            regex:<Counters[^>]*failed="0"
ev.settle.concur   suite    ../OkamAPI-modules/artifacts/tests/*-sql-tier.trx                     regex:testName="[^"]*SettlementRevision[^"]*Stale[^"]*"[^>]*outcome="Passed"
wf.engage.uidx     schema   ../OkamAPI-modules/Migrations/*FirstEngagement*.cs                    contains:unique: true
wf.engage.race     suite    ../OkamAPI-modules/artifacts/tests/*-sql-tier.trx                     regex:testName="[^"]*TwoAdministrators[^"]*"[^>]*outcome="Passed"
meals.lever.withheld wire   ../OkamAPI-modules/Services/Platform/ModuleFlagCatalog.cs             contains:meals.module withheld:
meals.utlkvit.paths suite   ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*Utlevering[^"]*Print[^"]*"[^>]*outcome="Passed"
meals.utlkvit.copy suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*CreditSale[^"]*Copy[^"]*Refused[^"]*"[^>]*outcome="Passed"
meals.xz.utlkvit   wire     ../OkamAPI-modules/Services/Kassa/XZReportService.cs                  contains:DeliveryReceiptCount
meals.xz.spec      wire     ../OkamAPI-modules/Docs/systembeskrivelse.md                          contains:kredittsal
meals.eighth.pin   suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*Supersede[^"]*Uninvolved[^"]*"[^>]*outcome="Passed"
meals.eighth.reds  suite    ../OkamAPI-modules/artifacts/mutations/meals-clamp/mutant.trx         regex:testName="[^"]*Supersede[^"]*Uninvolved[^"]*"[^>]*outcome="Failed"
meals.flag.resolver wire    ../OkamAPI-modules/Program.cs                                         contains:IEffectiveFlagResolver, MealsEffectiveFlagResolver
ev.origin.set      wire     ../OkamAPI-modules/appsettings.json                                   regex:"PublicOrigin"\s*:\s*"https://
ev.accept.gate.pin suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*Proposal[^"]*Gate[^"]*"[^>]*outcome="Passed"
ev.accept.gate.reds suite   ../OkamAPI-modules/artifacts/mutations/ev-accept-gate/mutant.trx      regex:testName="[^"]*Proposal[^"]*Gate[^"]*"[^>]*outcome="Failed"
ev.sweep.captures  suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*Sweep[^"]*Authorized[^"]*Captured[^"]*"[^>]*outcome="Passed"
gr.confirm.required wire    ../OkamAPI-modules/Services/Growth/GrowthTestSendService.cs           contains:EmailConfirmed
gr.confirm.pin     suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*Unconfirmed[^"]*Refused[^"]*"[^>]*outcome="Passed"
gr.confirm.limiter wire     ../OkamAPI-modules/Program.cs                                         contains:EnableRateLimiting("email-confirm")
gr.confirm.attempts schema  ../OkamAPI-modules/Entities/Growth/*EmailConfirmation*.cs             contains:AttemptCount
gr.confirm.crypto  wire     ../OkamAPI-modules/Services/Growth/GrowthEmailConfirmationService.cs  contains:RandomNumberGenerator
gr.dispatch.actor  suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*Dispatch[^"]*Actor[^"]*"[^>]*outcome="Passed"
gr.privacy.throws  suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*Article1[57][^"]*SenderThrows[^"]*"[^>]*outcome="Passed"
gr.health.withheld suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*Health[^"]*Withheld[^"]*"[^>]*outcome="Passed"
gr.newsletter.cross suite   ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*Newsletter[^"]*CrossStore[^"]*"[^>]*outcome="Passed"
gr.provider.gate.pin suite  ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*ProviderAccount[^"]*Ungated[^"]*"[^>]*outcome="Passed"
gr.provider.gate.reds suite ../OkamAPI-modules/artifacts/mutations/gr-provider-gate/mutant.trx    regex:testName="[^"]*ProviderAccount[^"]*Ungated[^"]*"[^>]*outcome="Failed"
mrg.statement.actor suite   ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*Statement[^"]*Actor[^"]*"[^>]*outcome="Passed"
mrg.waste.absent   wire     components/admin/margin/MarginWastePanel.vue                          contains:waste.feature-absent
ai.middleware.pin  suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*RequestBodyCapture[^"]*"[^>]*outcome="Passed"
ai.middleware.reds suite    ../OkamAPI-modules/artifacts/mutations/ai-middleware/mutant.trx       regex:testName="[^"]*RequestBodyCapture[^"]*"[^>]*outcome="Failed"
memcache.pin       suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*MemoryCache[^"]*Unconditional[^"]*"[^>]*outcome="Passed"
memcache.reds      suite    ../OkamAPI-modules/artifacts/mutations/memcache/mutant.trx            regex:testName="[^"]*MemoryCache[^"]*Unconditional[^"]*"[^>]*outcome="Failed"
vipps.redact.pin   suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*Redact[^"]*(Unmatched|Encoded)[^"]*"[^>]*outcome="Passed"
vipps.redact.reds  suite    ../OkamAPI-modules/artifacts/mutations/vipps-redact/mutant.trx        regex:testName="[^"]*Redact[^"]*(Unmatched|Encoded)[^"]*"[^>]*outcome="Failed"
wf.push.pin        suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*Push[^"]*NoRegistration[^"]*Failed[^"]*"[^>]*outcome="Passed"
wf.push.reds       suite    ../OkamAPI-modules/artifacts/mutations/wf-push/mutant.trx             regex:testName="[^"]*Push[^"]*NoRegistration[^"]*Failed[^"]*"[^>]*outcome="Failed"
wf.blindbind.fix   suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*OperatorLink[^"]*Correct[^"]*"[^>]*outcome="Passed"
rollback.tracked   suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*Rollback[^"]*PreMutation[^"]*"[^>]*outcome="Passed"
clockout.wire      suite    ../OkamAPI-modules/artifacts/tests/*-fast-tier.trx                    regex:testName="[^"]*ClockOut[^"]*NoOpenSession[^"]*"[^>]*outcome="Passed"
pos.clock.client   wire     components/admin/pos/ClockScreen.vue                                  contains:/workforce/pos/clock-events
journey.wf.invite  journey  artifacts/journeys/workforce-invite-claim.playwright.json             regex:^  "status": "passed",
journey.wf.oplink  journey  artifacts/journeys/workforce-operator-clock.playwright.json           regex:^  "status": "passed",
journey.wf.blind   journey  artifacts/journeys/workforce-operator-link-review.playwright.json     regex:^  "status": "passed",
journey.guard.reds journey  artifacts/journeys/mutations/live-label-wrong-backend.json            regex:^  "status": "failed",
confirm.receipt.a  artifact ../OkamAPI-modules/artifacts/tests/base-8704ff63-limiter.trx          regex:<Counters[^>]*failed="0"
confirm.receipt.b  artifact ../OkamAPI-modules/artifacts/tests/base-8704ff63-confirm.trx          regex:<Counters[^>]*failed="0"
```

### Which flag each probe answers, and what it does not test

| Flag | proposed `clears_when` | residue the probe does **not** carry |
|---|---|---|
| F-MIG-CHAIN-STACKED | `fact:mig.stacked is present` | arm 2 (*"the dependency is recorded where an author will see it"*) is prose and drops out; the artifact is only as fresh as `scripts/worldstamp` |
| F-DETACHED-MIGRATIONS | `fact:mig.tip.reachable is present` | none material — this is pure ancestry and the generator already computes the neighbouring field |
| F-PROBE-ROOT-WRONG-WORLD | `fact:be.world.ok is present and fact:fe.world.ok is present and fact:cw.world.ok is present` | `cw.world.ok` cannot be authored until `D-CONSUMERWEB-WORLD` rules an expected branch — filling it in from whatever the checkout is on is how a guard is made to pass by definition |
| F-ACCT-DUP | `fact:acct.uidx.chain is present` | requires a SQL-tier run to produce the index dump (`F-SQL-HEADROOM`); replaces a probe that clears on a filename |
| F-JOURNAL-FINALIZE-INDEX-DROPPED | `fact:jrnl.finalize.idx is present` | same artifact, same precondition |
| F-INVOICE-ROUTES-ANONYMOUS / F-INVOICE-RETRY-ANONYMOUS | `fact:routes.anon.inv is present` | the inventory must be derived by routing the real composition root (the 734-endpoint method already used once), not by grepping attributes |
| F-TRAIN-EVIDENCE-SERVICE-UNCENSUSED | `fact:census.audit.der is present and fact:census.audit.red is present` | nothing binds the mutant artifact to the described mutation |
| F-MEALS-SUPERSEDE-BYPASSES-AUTHORITY | `fact:census.release.der is present` | *"or … is named in the census"* — both arms collapse into the same derivation, which is why this one is clean |
| F-ARTIFACT-STORE-OVERWRITES | `fact:artifact.identity is present` | clause 1 (*"cannot be displaced by a weaker later run"*) is the mechanism, already landed and mutation-proven; the probe only carries clause 2 |
| F-FIXTURE-BEHIND-BACKEND | `fact:fixture.divergence is present` | the check's answer is only as good as the checkout it was pointed at — it prints that, the probe does not read it |
| F-MEALS-NO-SQL-ON-REQUOTE | `fact:sql.tier.requote is present` | **nothing verifies the trx came from a re-quote-bearing tree**; the sha lives in the filename by convention only |
| F-INTEGRATION-BRANCHES-UNCOMPOSED | `fact:sql.tier.composed is present` | same — *"at the composed commit"* is carried by a filename |
| F-EV-CONCURRENCY-GUARD-UNTESTED | `fact:ev.settle.concur is present` | must be a **SQL-tier** trx; the guard is inert under SQLite, so a fast-tier match would be the exact vacuity the flag names |
| F-WF-TWO-ADMINS-TWO-ENGAGEMENTS | `fact:wf.engage.uidx is present and fact:wf.engage.race is present` | `contains:unique: true` matches the line, not the table — the migration must contain no other unique index, or the probe must name the index literal |
| F-MEALS-LEVER-INERT | `fact:meals.lever.withheld is present` | the literal must be the withheld-reason key, not a comment |
| F-UTLKVIT-SALE-ROW | `fact:meals.utlkvit.paths is present and fact:meals.utlkvit.copy is present` | test names are guessed from the flag's prose; **verify against a real trx before adopting** |
| F-XZ-CREDIT-UNSPEC | `fact:meals.xz.credit is present and fact:meals.xz.utlkvit is present and fact:meals.xz.spec is present` | `meals.xz.spec` points at markdown → `W-PROBE-PROSE`, and a sentence in a document is what the flag asks for, so the warning is correct and accepted |
| F-MEALS-EIGHTH-READ | `fact:meals.eighth.pin is present and fact:meals.eighth.reds is present` | mutant-binding residue |
| F-FLAGS-FALSE-GUARANTEE | `fact:meals.flag.resolver is present` | a registration line is not a working resolver; arm 2 (scoping the sentence) drops out |
| F-EV-NO-GUEST-ORIGIN | `fact:ev.origin.set is present` | *"a file cannot prove a key binds"* — the lane that closed this said so itself and added a composition-root test; that test should be a second probe |
| F-EV-ACCEPT-UNGATED | `fact:ev.accept.gate.pin is present and fact:ev.accept.gate.reds is present` | mutant-binding residue |
| F-EV-CALLBACK | `fact:ev.sweep.captures is present` | the flag's own note says the sweep's guard is pinned only through the sink's — the probe inherits that |
| F-GR-UNCONFIRMED-EMAIL | `fact:gr.confirm.required is present and fact:gr.confirm.pin is present` | — |
| F-CONFIRM-BRUTEFORCE | `fact:gr.confirm.limiter is present and fact:gr.confirm.attempts is present and fact:gr.confirm.crypto is present` | three presences ≠ the § 15 claim; a limiter registered is not a limiter that survives a second replica (`F-LIMITERS-PER-PROCESS`) |
| F-GR-DISPATCH-UNATTRIBUTED | `fact:gr.dispatch.actor is present` | — |
| F-GR-FALSE-EVIDENCE | `fact:gr.privacy.throws is present` | — |
| F-GR-HEALTH-DEAF | `fact:gr.health.withheld is present` | no mutation clause in the condition, so none in the probe — and this plan's own catalogue argues one should be added |
| F-GR-NEWSLETTER-CROSS | `fact:gr.newsletter.cross is present` | *"at a tip that carries the proof"* is carried by which trx got committed, not by the probe |
| F-GR-PROVIDER-ACCOUNT-UNGATED | `fact:gr.provider.gate.pin is present and fact:gr.provider.gate.reds is present` | mutant-binding residue |
| F-MRG-STATEMENT-UNATTRIBUTED | `fact:mrg.statement.actor is present` | — |
| F-MRG-WASTE-PANEL-CALLS-NOTHING | `fact:mrg.waste.absent is present` | arm 1 (calling published routes) drops out; **this is the only probe whose source is tracked on the declared branch** |
| F-AI-REQUEST-BODY | `fact:ai.middleware.pin is present and fact:ai.middleware.reds is present` | mutant-binding residue |
| F-MEMCACHE-IN-TRYCATCH | `fact:memcache.pin is present and fact:memcache.reds is present` | mutant-binding residue |
| F-VIPPS-REDACT-OPEN | `fact:vipps.redact.pin is present and fact:vipps.redact.reds is present` | one regex covers two paths by alternation, so **one path passing satisfies both** — split into four probes if that matters, and it probably does |
| F-WF-PUSH-SILENT | `fact:wf.push.pin is present and fact:wf.push.reds is present` | mutant-binding residue |
| F-WF-BLIND-BIND | `fact:journey.wf.blind is present and fact:wf.blindbind.fix is present` | — |
| F-WF-NO-INVITE | `fact:journey.wf.invite is present` | the journey file does not exist yet; `artifacts/` is gitignored, so this is a local-machine fact by design |
| F-WF-CLOCK-UNLINKED | `fact:journey.wf.oplink is present` | *"shows import, then clock-in, then the minutes"* — a top-level pass does not prove the steps; the journey's **name** carries that and nothing enforces it |
| F-JOURNEY-GUARD-DECORATIVE | `fact:journey.guard.reds is present` | the artifact says `failed`; *"fails the process"* is an exit code the json does not carry |
| F-ROLLBACK-LEAVES-TRACKED-STATE | `fact:rollback.tracked is present` | arm 1 is a negative universal and drops out entirely |
| F-CLOCKOUT-ANSWERS-OPEN | `fact:clockout.wire is present` | **the product call comes first** — refuse, or answer truthfully; the test name presumes the answer |
| F-POS-CLOCK-NO-CLIENT | `fact:pos.clock.client is present` | §1(d): the file is on disk and on **no ref this branch has**. The probe would clear here and fail in a clone. Do not adopt until the lane lands. |
| F-CONFIRM-MERGE-RECEIPT-TRAP | `fact:confirm.receipt.a is present and fact:confirm.receipt.b is present` | the *"each lane's evidence file points at the run it produced"* half lives in untracked markdown under `lanes/` and is left out deliberately |

**Sources verified to exist today:** `components/admin/margin/MarginWastePanel.vue` (tracked on branch),
`components/admin/pos/ClockScreen.vue` (disk only), `../OkamAPI-modules/Program.cs`,
`../OkamAPI-modules/Controllers/InvoicesController.cs`,
`../OkamAPI-modules/Helpers/ApplicationInsightsLoggingMiddleware.cs` (**still present** — `F-AI-REQUEST-BODY`
says the lane deleted it; that deletion is on a branch this checkout is not on),
`../OkamAPI-modules/appsettings.json` (has an `Events` section),
`../OkamAPI-modules/artifacts/tests/*.trx`, `artifacts/journeys/*.json`.
**Sources verified absent today:** `../OkamAPI-modules/Migrations/*AccountingSummar*.cs` (only
`Vat12PercentAccounting`), `KassaCreditSale.cs` anywhere under `../OkamAPI-modules`, and every
`artifacts/mutations/**`, `artifacts/schema/**`, `artifacts/routes/**`, `artifacts/census/**` path above.
Those are the artifacts a fix must leave behind — which is the plan's own stated pattern for a probe
expected to fail today.

---

## 6. The calibration case: `F-POS-TENDER-WIRE-REINTRODUCES-TWO`

**Class three — inexpressible without weakening.** The condition is
*"the POS tender-wire lane classifies a credit sale off the appended journal entry **and reads the one
shared predicate**, or it is rebased onto the lanes that closed those defects"*.

The clerk verified it met: branch 0 ahead of `8e2b57de`, one definition
`KassaCreditSale.cs:25 IsCreditSale(JournalEntry entry)`, six call sites, and a simulation of all
outstanding merges yielding one definition in 111 of 111 result trees.

**No probe in this vocabulary would have settled it, and the near-miss is instructive.** The tempting
probe is `contains:IsCreditSale(JournalEntry entry)` over `KassaCreditSale.cs`. It fails on all three
counts that matter:

1. **It tests presence, not uniqueness.** Rule (a): one file, no aggregation. A second definition
   elsewhere is invisible, and the second definition *is the defect*.
2. **The subject is a branch relationship.** *"the lane classifies"* and *"or it is rebased onto"* are
   statements about `lane/meals-pos-tender-wire` versus a tip. Probes have no git.
3. **The file is not in the checkout the probes read.** `KassaCreditSale.cs` does not exist under
   `../OkamAPI-modules` today. The probe would sit `unconf` forever while the condition is met — the
   inverse of the failure, and just as useless.

What *would* have settled it is the artifact the closing lane already produced and did not commit: the
merge-simulation output, as `contains:definitions-in-merge-result: 1 of 111`. That is class two the moment
someone commits the derivation. Until then it is class three, and the honest record is that
**`plan flag clear` refusing prose was right** — it refused because it could not read English, and the
right answer was not to teach it English but to leave a machine artifact behind.

---

## 7. Ranking: what is holding work, and what is holding the count

| what it gates | flags | consequence |
|---|---|---|
| **a dispatchable Lane's `needs:`** | **1** — `F-MIG-CHAIN-STACKED` (`L-MRG-PRICE-CORRECTION`, `L-MEALS-RELEASE-ACTOR`; it also sits in `S-PILOT-SAFE`) | the only open **blocker** stopping a lane from being dispatched today |
| a Stage's `needs:` only | 19 — `S-PILOT-SAFE` 13, `S-EVIDENCE` 6 | holds the stage, and everything needing the stage |
| a Feature's `needs:` | 37 — FT-GROWTH **20**, FT-WORKFORCE 6, FT-MEALS 5, FT-EVENTS 5, FT-MARGIN 1 | holds acceptance, not dispatch |
| nothing | 3 — `F-GR-NO-EXIT-FROM-A-LIST`, `F-CORE-PIN-ON-NO-REMOTE`, `F-CLOCKOUT-ANSWERS-OPEN` | `W-FLAG-INERT`: a control that gates nothing. **All three are real, and two are go-live blockers** (art. 7(3); a fresh clone cannot build) — so the fix is wiring, not downgrading. |

**Four non-blocker flags gate seven live lanes and outrank most of this set**, because §2.2's
resolution gates on *any* uncleared flag in a `needs:` whatever its severity: `F-SQL-HEADROOM` (6 lanes),
`F-CAP-COUNTS-LANES` (2), `F-MRG-INGREDIENT-FACTOR-ZERO` (1), `F-TRAIN-DISCLOSURE-UNREADABLE` (1).
`F-SQL-HEADROOM` is also the precondition on five of the probes above.

**Order I would work the probes in**, by what each unblocks per unit of work:

1. `mig.tip.reachable` + `mig.stacked` — one generator extension to `scripts/worldstamp`, clears the only
   lane-gating blocker and its sibling.
2. `be.world.ok` / `fe.world.ok` — a one-line probe correction that **makes 43 of the other 61 probes
   mean anything**, and closes a live unsoundness where `False` reads `ok`.
3. `acct.uidx.chain` + `jrnl.finalize.idx` + `sql.tier.requote` + `sql.tier.composed` + `ev.settle.concur`
   — **one SQL-tier run at the merged stack produces the artifacts for five flags.** The plan already says
   that run outranks the lanes waiting behind it; this is the fifth independent argument for it.
4. `routes.anon.inv` — one derivation, two flags, and it is the security set.
5. The S2 mutation pairs — twelve flags, but each needs its own mutation run, so they are the long tail.

---

## 8. What I refused to write, and why

Seven flags are class-three-**inexpressible**, and each of them had a probe available that I declined:

- **F-WF-NOCORRECTION** — `contains:CorrectedByPersonId` in the personalliste entity would clear it. The
  condition says *"a production **code path** records"*, and this estate's standing lesson (2026-07-29,
  C3) is that a schema field with no reachable caller is exactly the thing that looks done and is not.
- **F-PERSONALLISTE-PRINT** — `exists` on the PDF clears on a blank page. The condition's operative
  words are *"showing the sheet laid out for paper"*, and that is an eye, on the § 8-5-6 document.
- **F-UTLKVIT-PREDICATE-COLLISION**, **F-EV-GUESTLINK-FORK** — *"exactly one … and every caller"*. Rule
  (a) forbids counting across files; a `contains:` on the surviving definition clears while its twin
  stands, which is the defect.
- **F-BACKEND-FACTS-OFF-BRANCH** — clause 1 is probe-able, clause 2 (*"the two journey facts measure what
  their exits claim"*) is a judgement. A probe on a conjunction's easy half clears on half the sentence.
- **F-FIXTURE-NO-GATES** — *"for every gated surface a journey walks"*: a universal over journeys ×
  surfaces with no derivation committed. (`F-ARTIFACT-STORE-OVERWRITES` is the same shape but its second
  clause **is** derivable, which is why it lands in T2 and this one does not.)
- **F-POS-TENDER-WIRE-REINTRODUCES-TWO** — §6.

`F-EXIT-PREFIX-IS-A-STAMP` is filed `act` rather than `inexpr` for a related reason worth stating: its
subject is the prefix matcher inside `plan` itself, so **a probe cannot test the thing that runs probes**,
and the remedy also un-verifies six lanes, which is guard 1's owner path.

And one thing worth saying plainly about the whole T2 column. Of the 61 probe lines: **43 read
`../OkamAPI-modules`** (a checkout on `lane/meals-grace-pins`, `on_expected: false`), **1 reads
`../ConsumerWeb`** (on `feature/swiss`, with no ruled expectation), **15 read `artifacts/`** — which
`F-PLAN-NOT-IN-GIT` records as *gitignored by design* — and **2 read tracked-looking source in this repo,
of which one (`ClockScreen.vue`) is on no ref this branch has.** So exactly **one** probe of sixty-one
reads a file that a fresh clone of the declared world would have.

Making these conditions machine-testable does not, by itself, make them machine-*true* anywhere but this
machine. `F-PROBE-ROOT-WRONG-WORLD` and `F-PLAN-NOT-IN-GIT` are not two more items in the list — they are
the precondition on nearly all of it.
