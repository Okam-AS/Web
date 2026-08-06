# L-COMPOSE-AND-RUN-THE-STACK — the composition, measured

Repository: **OkamAPI** (`/Users/svendaneel/okam/OkamAPI`), not Web-modules. Web-modules holds the plan hub;
the branches this lane composes are backend branches. Worktrees created by this lane:
`/Users/svendaneel/okam/wt-composestack` (branch `lane/compose-and-run-the-stack`) and
`/Users/svendaneel/okam/wt-composebase` (detached at `24cd4ead`, baseline only).

Nothing was pushed. `feature/restaurant-modules` is unmoved. Neither
`integration/mig-stack-merge` nor `integration/confirm-family` was touched; both are read-only inputs here.

---

## 1. The two tips, named by measurement

| | ref | SHA | subject |
| --- | --- | --- | --- |
| migration stack | `integration/mig-stack-merge` | `24cd4ead5e73dac127fca8de0ab2b56f26c85887` | Stop the guest-data pin failing on a token that happens to contain an amount |
| confirm family | `integration/confirm-family` | `eeb1b8c47d3726f228edbb388030f6901d66bcfc` | Record the fast tier at 0884c92e, the composed family plus the pin repair |

```
git rev-list --left-right --count 24cd4ead...eeb1b8c4   ->   86      10
git merge-base --is-ancestor eeb1b8c4 24cd4ead           ->   NO
git merge-base --is-ancestor 24cd4ead eeb1b8c4           ->   NO
```

**A real merge, not a fast-forward, in either direction.** 86 commits on the stack side, 10 on the family
side.

`integration/mig-stack-merge` **is** the current migration-stack tip and was verified as such rather than
assumed: `git merge-base --is-ancestor integration/mig-stack-land integration/mig-stack-merge` = YES, so the
earlier landing arm (`4b37f81b`, L-MIG-STACK-LAND) is contained in it, and a sweep of all 250-odd local heads
found **no branch other than itself descended from `24cd4ead`**. The confirm family's own tip is
`eeb1b8c4`, three commits above the `0884c92e` that L-CONFIRM-FAMILY-MERGE reported (`0884c92e` is an
ancestor of `eeb1b8c4`; the extra commit is that family's own fast-tier receipt).

### It is a criss-cross: FOUR merge bases, not one

```
git merge-base --all 24cd4ead eeb1b8c4
02c077cba65d6dd678e2de746fd55bf805e833f4
6771ba9ad9c9db0914e10c61e9d21740af7f5cb6
75e5168c7b174bf7e126e6db671089d450884547
86c0f9ae1a919fb9b5b3dfc7717296cdb02fdeea
```

This matters twice below: it is why git had to build a *virtual* merge base, and it is why one of the two
conflicts arrived with a stage-1 blob that is not in any commit.

### The statutory surface really is split across the two sides

Commits on the stack side that the family lacks, on the art. 12 / kassasystemforskrifta surface:

```
1416e810  Merge lane/gr-deadline-onwire: the art. 12 deadline is on the wire before the page that renders it ships
bb82b3a0  The deadline the page reads is pinned at the wire, not at the DTO
1a03bc6c  A credit sale now hands over the utleveringskvittering kassasystemforskrifta § 2-8-7 requires
1854f594  The sale row of a credit sale hands over § 2-8-7, not a proof of purchase
```

Commits on the family side that the stack lacks include `f7abfd8e` / `3b42da1d`
(`lane/gr-deadline-statute`, the Reg. 1182/71 counting rules behind the same deadline). Before this
commit, no tree carried both.

---

## 2. The composition

```
commit 7ac6f2b2e8f275cd837f5b79dd60a4d92b7a7c1b
parents 24cd4ead (integration/mig-stack-merge)  eeb1b8c4 (integration/confirm-family)
branch  lane/compose-and-run-the-stack   (local only, never pushed)
```

First parent is the migration-stack tip, as required.

---

## 3. The receipts conflict, resolved by content

Two paths conflicted. Both are receipts. Neither was resolved by side.

### 3a. `artifacts/tests/README.md` — the receipts index

The trap: each side had appended rows for SHAs the other side has never seen, so `-X ours` or `-X theirs`
silently deletes true measurements of real commits.

Measured before resolving, rather than eyeballed:

| | rows |
| --- | --- |
| stack side (`24cd4ead`) | 29 |
| family side (`eeb1b8c4`) | 13 |
| shared | 11 |
| **union written** | **31** |

```
lost from the stack side : []
lost from the family side: []
invented                 : []
```

- The two rows unique to the family (`merge-72cf3e0a`, `merge-0884c92e`) were **inserted at the wall-clock
  position of the SHA each measures** — `72cf3e0a` is 2026-08-03 15:09 and `0884c92e` 15:20, which puts them
  after `1de06906` (13:10) and before `base-569887a5` (2026-08-04 03:01) — not appended. The file's own rule
  is that rows are ordered by the time of the commit they measure, and several paragraphs below the table say
  "the row above"; appending would have made those paragraphs false.
- The nine rows unique to the stack keep their existing order, untouched.
- One shared row differed in wording: the stack side annotates
  `lane-reservation-limiter-move-fast-tier.trx` with `` `d9189fbd` (`lane/reservation-limiter-move`) `` where
  the family writes `` `d9189fbd` `` alone. The stack's is strictly more informative and its own paragraph
  explains why the annotation exists, so the stack's wording was kept — one row, not two.
- **No count was recomputed and no `.trx` was re-read to "check" a number.** A receipt is evidence about its
  own SHA.

Prose was unioned the same way, with two corrections that the merge itself forces:

1. The stack's L-RESERVATION-LIMITER-MOVE paragraph names
   `artifacts/tests/base-8704ff63-fast-tier.trx`. That path **does not exist after this merge** — the family
   renamed it. Rewritten to name `base-8704ff63-fast-tier-composition-root.trx`.
2. The stack's closing paragraph says of the two `8704ff63` runs that "this merge keeps the first (blob
   `51e97fa2`) and does not keep the second (blob `10a733ea`)". That is **false of this tree**, which carries
   both. Replaced by the family's paragraph, plus a sentence recording what the stack side had done and that
   the composition undoes it.

A new closing paragraph records this third union and its consequence: `merge-0884c92e`'s 4476 and
`merge-ef2bd5c8`'s 4638 were each measured at a commit containing neither the other's branch, so neither is a
delta against the other.

### 3b. `base-8704ff63-fast-tier-conat-retire.trx` — the same trap, in miniature

This one arrived with a **merge base full of literal conflict markers**. Stage 1 is blob `c5f67dcb`,
12,364,668 bytes — larger than either side — and it contains:

```
<<<<<<<<< Temporary merge branch 1
...
=========
<TestRun id="ee81d409-...">
```

That blob is **in no commit** (`git log --all --find-object=c5f67dcb` is empty). It is the criss-cross above
showing through: with four merge bases git merged the bases into a virtual one, *that* merge conflicted on
this path, and the marker-bearing result became stage 1. Worth writing down, because a resolver who took
"the base" as truth here would commit an XML file with two `<TestRun>` roots and a conflict marker in it.

Underneath it are two genuinely different runs of the same base commit:

| blob | TestRun id | wall clock | lane | counters |
| --- | --- | --- | --- | --- |
| `51e97fa2` | `ee81d409-3b5b-4ab1-9c7d-da651935c96b` | 2026-08-02 13:55:35 | L-COMPOSITION-ROOT-CHECK | 4410 / 4398 / 0 / 12 |
| `10a733ea` | `a1eae22b-1de3-4969-b45c-122cadce0592` | 2026-08-02 13:57:46 | L-CONFIRM-CONAT-RETIRE | 4410 / 4398 / 0 / 12 |

The counters agree exactly; the runs are two minutes apart and are not the same run.

**Git's rename detection paired the wrong blob into the wrong name.** Stage 2 (ours) at the
`-conat-retire` path is `51e97fa2`, which is L-COMPOSITION-ROOT-CHECK's run — because the stack side's
single `base-8704ff63-fast-tier.trx` holds that run and git matched it to the family's rename target.
Accepting `--ours` would have put `ee81d409` under **both** names and deleted `a1eae22b` from the tree
entirely.

Resolved by content: **the file named for a lane holds that lane's run.**

```
base-8704ff63-fast-tier-composition-root.trx  ->  TestRun id="ee81d409-..."   (1 <TestRun> root)
base-8704ff63-fast-tier-conat-retire.trx      ->  TestRun id="a1eae22b-..."   (1 <TestRun> root)
```

Both lanes' `evidence.md` auto-merged to point at the file they produced, which is the independent check
that the naming is right. The run the migration-stack side had dropped is in a tree again.

---

## 4. The composition root — checked, not trusted

The estate's rule is that an auto-merged composition root must be re-checked for a double land. What was
found is stronger than a clean auto-merge:

**`Program.cs` did not move.** `git hash-object Program.cs` = `b7860d63…` = `git rev-parse
24cd4ead:Program.cs`, byte for byte. The family's registration move (`d9189fbd`) sits **below** the merge
base, so the stack already carried it. There was nothing to merge.

Checked for the double-land shape anyway:

- `IReservationRateLimiter` appears at exactly one line (1060).
- The only duplicate service-type registrations in the file are `IAccountingExportProvider`,
  `ITerminalPaymentProvider` and `IUncapturedOrderSweeper` — the deliberate `IEnumerable` fan-in
  L-MIG-STACK-LAND already accounted for, unchanged by this merge.

### The one file that was a true three-way merge

Of the ten source files the merge changed, nine resolved one-sided (all took the family's version). Exactly
one was a true merge and it was checked by hand:

`WebApi.Tests/Wire/GrowthWireSeed.cs` — the stack added `DeliveryAsync`, the family split
`VerifiedConsentedContactAsync` into a two-argument overload delegating to a
`(IServiceProvider, Func<ApplicationDbContext>, int)` one. Both landed. The two same-named members are an
**overload pair with different signatures, one forwarding to the other**, not a duplicated body.

### Reachability (C3)

The family adds `Services/Growth/GrowthProviderEventReader.cs` and `GrowthPostmarkEventReader.cs` with no DI
registration — checked, and correctly so: `GrowthProviderEventReader.Read` is a **static** call made from
`GrowthWebhookIngestionService.cs:117`, which is on the `GrowthWebhooksController` path. Reachable.

### Migrations (C2)

`git diff --name-only 24cd4ead HEAD -- Migrations` is **empty** and no `ModelSnapshot` moved. The chain is
exactly the stack's 136 files; no two migrations share a parent because this merge authors none. This lane
composed, it did not author.

---

## 5. Build

```
dotnet build WebApi.Tests/WebApi.Tests.csproj -v minimal
    737 Warning(s)
    0 Error(s)
Time Elapsed 00:00:33.30
```

SDK 8.0.110, pinned by `global.json`.
