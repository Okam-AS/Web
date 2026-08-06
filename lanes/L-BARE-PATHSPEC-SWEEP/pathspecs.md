# L-BARE-PATHSPEC-SWEEP — every git pathspec cited as evidence, classified

Read-only sweep. Nothing repaired; corrections are named at the end for a later lane to apply.

Scope swept: `docs/plan/**` and `lanes/**` in `/Users/svendaneel/okam/Web-modules` (plan root), plus
`lanes/**` in `/Users/svendaneel/okam/OkamAPI-modules` (5 files, **no git citations at all**).
Backend object resolution is by sha, not by checkout: the backend working tree has
`lane/meals-grace-pins` out, so every backend re-run below names an explicit ref
(`8e2b57de` = `refs/heads/feature/restaurant-modules`, or `3579bbbc` where the citing document declared it).

---

## 1. The instrument, validated before any count was reported

Three controls, run against `/Users/svendaneel/okam/OkamAPI-modules`. They separate the classes without
knowing any subject.

| control | command | result | what it settles |
|---|---|---|---|
| A — bare, real root file | `git log --all --oneline -- Program.cs` | **266 commits** | a bare pathspec naming a genuine root-level file works |
| B — bare, nested file | `git log --all --oneline -- MealsQuoteService.cs` | **0 commits** | a bare pathspec naming a nested file returns zero **by construction** |
| B′ — same file, root-relative | `git ls-files --with-tree=8e2b57de -- 'MealsQuoteService.cs'` → 0 files; `-- '*MealsQuoteService.cs'` → `Services/Meals/Interfaces/IMealsQuoteService.cs`, `Services/Meals/MealsQuoteService.cs` | 0 vs **2** | the file exists; only the pathspec form was wrong |
| C — glob class | `git ls-files --with-tree=8e2b57de -- '*.cs'` | **2724 files, 2723 of them nested** | `-- '*.cs'` is **not** a bare-filename trap; git pathspec wildcards cross `/`. Only `Program.cs` is root-level. |

Control C matters because 5 of the 34 pathspec-bearing citations use `-- '*.cs'`. Without C they would
have been miscounted as bare. **They are sound.**

A fourth separator fell out of the wrong-repository check in §5: a bare pathspec is the *only* class that
resolves to zero files in **both** repositories. Every root-relative pathspec in the corpus resolves in
exactly one.

---

## 2. Denominator

| population | count |
|---|---|
| git commands cited in `docs/plan/**` + `lanes/**` (render/ excluded as generated) | **222** |
| …of which carry a `--` pathspec | **34** |
| `-S` / `-G` occurrences | **21** |
| …that are bare prose mentions of the *method* (`` `git log -S` ``, no pattern, no pathspec) | **12** |
| **distinct executable `-S`/`-G` searches cited as evidence** | **8** |
| …root-wide (no pathspec — sound by construction) | **5** |
| …with a root-relative pathspec — **SOUND** | **2** |
| …with a **bare-filename** pathspec — **DEFECT** | **1** |

`docs/plan/render/plan.html` was excluded: it is a generated rendering of `plan.md` and contains only the
same restated exemplar (verified, one occurrence).

**One bare `-S`/`-G` search in the whole corpus. Seven of eight are sound.** The three further appearances
of the same string in `plan.md:10697`, `plan.md:16442` and `briefs/L-BARE-PATHSPEC-SWEEP.md:10` are this
sweep's own exit line, flag text and brief quoting the exemplar with the pattern elided (`-G"..."`) — they
are restatements, not independent evidence, and are not counted.

---

## 3. Every `-S`/`-G` search, classified

### 3a. Root-wide — no pathspec. Sound by construction (5)

| # | citation | search | reported | re-run today |
|---|---|---|---|---|
| S1 | `docs/plan/log.md:282`, `lanes/L-GR-TESTSEND-RECORD/DETAIL.md:16` | `git log --all -S "GrowthAuditEvent"` | "returns nothing" | **3 commits** — all *later* than the claim: `bd3a840f` 08-03 created `Entities/Growth/GrowthAuditEvent.cs`, `a1e2655f` 08-03, `4685fb01` 08-04 |
| S2 | `docs/plan/log.md:887`, `returns/L-WOLT-SYNC-1.md:8` | `git log --all -G "AddHostedService.*Wolt"` | "hits one commit, the one that ADDED" | **3** — `a2cdb423` 07-30 (the original), plus `3c7b28ee` and `6289de2f`, both 08-04 |
| S3 | `returns/L-WOLT-SYNC-1.md:9` | `-G "HostedService.*WoltMenuSync"` | "nothing" | **2** — `3c7b28ee`, `6289de2f`, both 08-04 |
| S6 | `lanes/L-BLOCKER-RESTATE/verdicts.md:385` | `git log --all -S'DispatchAsync(storeId, newsletterId, RequireUserId'` | "zero commits" | **1** — `a1e2655f` 08-03 *"A mass send names the person who caused it"*, i.e. the remedy landed after |
| S8 | `lanes/L-BLOCKER-RESTATE/verdicts.md:444` | `git log --all -G"ff_effective_note"` | "only the commit that introduced it" | **0 in the backend, 5 in the frontend** — the string is a frontend one (`translations/{en,no,de}.ts`, `pages/admin/feature-flags.vue`) |

**None of these five is a pathspec defect.** Each was true when written. The instrument is sound; the
*world* moved. Two hazards are worth naming, because both will recur:

- **Time drift.** `-S`/`-G` zeros are claims about a moment. S1, S2, S3 and S6 were all overtaken by
  remedies that landed 1–3 days later. A cited zero needs the ref *and* the date, or it silently becomes a
  false statement about the present.
- **Self-pollution.** `lanes/**` is a **tracked directory in both repos**. Every commit of a lane's own
  evidence file that quotes the search string becomes a hit for that string. `3c7b28ee` matched S2/S3 partly
  through `lanes/L-WOLT-SYNC/evidence.md`; `5197056` matched S8 through
  `lanes/L-BLOCKER-RESTATE/verdicts.md` itself — **the document matched its own search.** A root-wide
  `-S`/`-G` proving absence of *code* should exclude the evidence tree: `-- '*.cs'` (see control C), or
  `-- . ':(exclude)lanes/' ':(exclude)docs/'`.

### 3b. Root-relative pathspec — SOUND (2)

| # | citation | search | reported | re-run today |
|---|---|---|---|---|
| S4 | `lanes/L-MODAL-BROKEN-TWO/detail.md:18` | `git log -S "deliveryTypeLabel (deliveryTypeEnum)" -- plugins/global-mixin.js` (frontend) | `ee54c2b`, one commit | **1 commit. Reproduces.** |
| S5 | `lanes/L-BLOCKER-RESTATE/verdicts.md:241` | `git log --all -S 'CreatedByUserId' -- Entities/Margin/` (backend) | "no commits on any branch" | **0. Reproduces**, and the pathspec is real: `Entities/Margin/` holds 15 tracked files at `8e2b57de`. The same search with no pathspec returns 140, so the restriction is what carries the claim — and it is correctly written. |

S5 is the direct counterpart of the defect: same document, same author, same `-S` idiom, pathspec written
from the root. **The method is not uniformly broken; one line is.**

### 3c. Bare-filename pathspec — DEFECT (1)

**`lanes/L-BLOCKER-RESTATE/verdicts.md:423-424`**, under `### F-MEALS-LEVER-INERT`:

> No consumer reach on any branch
> (`git log --all -G"IMealsStoreFeatureFlags" -- MealsQuoteService.cs CartService.cs` = zero commits).

`MealsQuoteService.cs` and `CartService.cs` are both nested — `Services/Meals/MealsQuoteService.cs` and
`Services/CartService.cs`. As pathspecs from the root they match nothing, so the search returns zero
whatever the repository contains. Re-runs, all against `/Users/svendaneel/okam/OkamAPI-modules`:

| run | command | result |
|---|---|---|
| as cited (bare) | `git log --all -G"IMealsStoreFeatureFlags" -- MealsQuoteService.cs CartService.cs` | **0** — by construction |
| **corrected (root-relative)** | `git log --all -G"IMealsStoreFeatureFlags" -- Services/Meals/MealsQuoteService.cs Services/CartService.cs` | **0** |
| unrestricted | `git log --all -G"IMealsStoreFeatureFlags"` | **11 commits, 8 production files** |

Confirmation the corrected pathspec is not itself empty: `git log --all --oneline -- Services/Meals/MealsQuoteService.cs`
returns **16 commits**; `-- Services/CartService.cs` returns **302**. Both files have history; the flag
interface simply never appears in either.

**The narrow conclusion holds. The sentence it was written to support does not.** At `3579bbbc` — the ref
that same paragraph declares — `IMealsStoreFeatureFlags` has three production consumers by constructor
injection and a live DI registration:

```
3579bbbc:Program.cs:788                              services.AddScoped<...IMealsStoreFeatureFlags, ...StoreBackedMealsFeatureFlags>();
3579bbbc:Services/Meals/MealsAgreementService.cs:52  private readonly IMealsStoreFeatureFlags _storeFlags;
3579bbbc:Services/Meals/MealsCompanyService.cs:47    private readonly IMealsStoreFeatureFlags _storeFlags;
3579bbbc:Services/Meals/MealsReconciliationService.cs:45  private readonly IMealsStoreFeatureFlags _storeFlags;
```

Identical at `8e2b57de`. So "**No consumer reach on any branch**" is false as written; what is true is
"no reach into the quote or cart path". The bare pathspec did not just return a free zero — it let a
two-file check be written up as a whole-repository claim, and nothing in the sentence records that
narrowing. That is the part a reader inherits.

---

## 4. Bare pathspec in git commands that are not `-S`/`-G` (the widening)

All 34 pathspec-bearing commands were classified. Beyond §3c there is exactly one further slash-free
pathspec, and it is the brief's own control:

**`lanes/L-BLOCKER-RESTATE/verdicts.md:442`** — `git grep FlagEffectiveResolver -- Program.cs`, reported as
"one line, Workforce only".

Re-run at the declared ref: **reproduces exactly, one line** —
`3579bbbc:Program.cs:779 services.AddScoped<...IStoreFeatureFlagEffectiveResolver, ...WorkforceModuleFlagEffectiveResolver>();`

Bare, and **right**: `Program.cs` is a genuine root-level file (control A). Classified bare-but-sound.
One observation for whoever reads that verdict, not a pathspec fault: repo-wide at `3579bbbc` there is also
a `Services/Margin/MarginModuleFlagEffectiveResolver.cs` registered from
`Helpers/Margin/MarginModuleServiceCollectionExtensions.cs`. "Workforce only" is true **of `Program.cs`**,
which is what the sentence scopes to — but a reader taking it as "only Workforce has one" would be wrong.

The remaining slash-free tokens my extractor flagged are **not pathspecs** and were dismissed by hand:

| citation | token | why not a defect |
|---|---|---|
| `L-TRAIN-EVIDENCE-PACK-UI/NOTES.md:69`, `L-UTLKVIT-FAMILY-LAND/verification.txt:21`, `L-JOURNEY-TRAINING/verification.md:90`, `L-EV-FAMILY-LAND/merge-receipt.md:180`, `L-WF-PUSH-LAND/merge-receipt.md:217,221` | `'*.cs'` | glob, matches 2724 files across 2723 nested dirs (control C) |
| `L-MEALS-POSREL-LAND/merge-receipt.md:40` | `<parent>`, `<file>` | a template describing a method, not a run |
| `L-LIVE-WORLD-BANNER/evidence.md:19`, `L-COMPROOT-FAMILY-LAND/merge-receipt.md:243`, `L-EV-FAMILY-LAND/merge-receipt.md:180` | `(empty: unchanged)`, `-> empty. No migration authored.`, `-> no hit anywhere…` | prose printed on the same line as the command; the pathspec ends before it |

The other 28 pathspecs are written from the repository root and are sound: `Services/Meals/…`,
`Services/Events/…`, `Services/Growth/…`, `Services/Training/`, `Entities/Margin/`, `Controllers/…`,
`WebApi.Tests/…`, `Migrations/`, `ModelBuilders/`, `Helpers/ApplicationDbContext.cs`, `'Helpers/Events/*'`,
`artifacts/`, `pages/…`, `components/`, `utils/`, `plugins/global-mixin.js`, `test/e2e/scripts/…`.

---

## 5. Wrong-repository check — 0 defects

Every root-relative pathspec was resolved against **both** repos
(`git ls-files --with-tree=HEAD` in the frontend, `--with-tree=8e2b57de` in the backend). Separation is
total — each resolves in exactly one, and always the one its citing lane worked in:

- frontend-only: `pages/admin/margin-statements.vue` 1, `components/` 190, `pages/` 112, `utils/` 74,
  `plugins/global-mixin.js` 1, `pages/admin/growth-privacy.vue` 1, `test/e2e/scripts/live-world-reset.sh` 1,
  `pages/admin` 64
- backend-only: `Services/Events/EventsEmailNotificationDelivery.cs` 1,
  `Services/Growth/GrowthPrivacyRequestService.cs` 1, `Services/Meals/MealsCommandReceiptService.cs` 1,
  `WebApi.Tests/Meals/MealsAgreementWriterTests.cs` 1, `Controllers/InvoicesController.cs` 1,
  `WebApi.Tests/Wire/PdfDownloadWireTests.cs` 1, `'Helpers/Events/*'` 4, `Entities/Margin/` 15,
  `Services/Events/EventsProposalService.cs` 1, `Program.cs` 1, `Services/Training/` 36, `Migrations/` 255,
  `ModelBuilders/` 10, `Helpers/ApplicationDbContext.cs` 1, `'*.cs'` 2724
- both (`artifacts/`, FE 16 / BE 43) — the citing document, `lanes/L-WF-PUSH-LAND/merge-receipt.md`, is a
  backend merge receipt naming backend shas `26599c6e`/`569887a5`, so the backend reading is the right one
- **neither**: `MealsQuoteService.cs`, `CartService.cs` — the §3c defect, and the only pair that fails both

## 6. Brace-expansion check — 0 defects, 1 near-miss in my own method

Four citations carry braces (route templates like `/staff/{id}` excluded). Expanded by hand: **11 of 11
present.**

`components/admin/workforce/WorkforcePublication{List,Recipients,ReceiptGroup}.vue` (3/3),
`translations/{en,no,de}.ts` (3/3), `lanes/L-ROW-FIT-GOODS-GROUPS/{m1,m2,m3}.trx` (3/3),
`artifacts/journeys/ev-dietary/run-sheet.{json,md}` (2/2).

The last pair scored **absent** on my first pass and is worth recording, because it is the §5 failure mode
biting the checker rather than the citation: the files do not exist in the frontend and never have
(`git log --all` on that path returns nothing there), but the citing lane
`lanes/L-ROW-FIT-GOODS-GROUPS/mutation-log.md:29` is a **backend** lane — its named file is
`WebApi.Tests/Kassa/XZPrintedRowFitSweepTests.cs`. Both files are tracked in the backend at `8e2b57de`.
Resolving a cited path against the repo the citation belongs to, rather than against a default root, is
what turns 2 phantom absences into 0.

---

## 7. Corrections owed — for a later lane to apply. Nothing was edited here.

**C-1 — `lanes/L-BLOCKER-RESTATE/verdicts.md:423-424`** *(substantive: the evidence is void as written and
the claim it supports is wider than any correct form of it)*

Replace the parenthesis and the claim. Correct command:

```
git log --all -G"IMealsStoreFeatureFlags" -- Services/Meals/MealsQuoteService.cs Services/CartService.cs
```

which returns **zero commits** — so the *narrow* statement survives and should be written as what it is:
"never referenced in the quote or cart path". The words "No consumer reach on any branch" must go: at the
paragraph's own ref `3579bbbc` the interface is DI-registered at `Program.cs:788` and constructor-injected
by `MealsAgreementService.cs:52`, `MealsCompanyService.cs:47` and `MealsReconciliationService.cs:45`.

**C-2 — `docs/plan/plan.md:10697`, `docs/plan/plan.md:16442`, `docs/plan/briefs/L-BARE-PATHSPEC-SWEEP.md:10`**
*(cosmetic)*: these quote the broken command as the specimen. Correct — that is their purpose. They need no
change beyond whatever follows from C-1. Recorded so a later reader does not re-file them as four defects.

**C-3 — no file, method-level, applies to future work**: a root-wide `-S`/`-G` used to prove absence of
*code* now matches the evidence tree, because `lanes/` is tracked in both repos and lane documents quote
their own search strings. Constrain such searches with `-- '*.cs'` or
`-- . ':(exclude)lanes/' ':(exclude)docs/'`, and cite the ref and date alongside the zero. See §3a.
