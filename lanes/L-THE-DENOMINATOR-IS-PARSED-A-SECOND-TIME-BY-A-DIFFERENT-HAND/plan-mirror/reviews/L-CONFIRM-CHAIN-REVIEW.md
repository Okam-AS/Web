# Fable review — the confirm chain read as one composed thing (2026-08-02)

Verdict: SOUND-WITH-CONDITIONS. Eleven commits, five true heads, trial-merged in the object
database only (no checkout touched, trial objects released, temporary tag deleted).

Topology verified from parents, not from the brief. Base `de1e5c5e`. Five true heads:
`75e5168c`, `d9189fbd`, `6771ba9a`, `f7abfd8e`, `5b895dc4`. The other six tips are ancestors.

## The merge trap — the finding that matters most
`6771ba9a` and `bfe57c3c` each measured base `8704ff63` independently and each committed ITS OWN
run at the identical path `artifacts/tests/base-8704ff63-fast-tier.trx` (blobs `10a733ea` vs
`51e97fa2`; counters agree at 4410/4398/0/12, run-ids differ). Git conflicts loudly, which is
correct. The trap is the resolution: each lane's `evidence.md` names that exact path as ITS
recorded base run, so keeping either blob makes the other lane's evidence point at a trx it did
not produce. Resolve by RENAMING BOTH and updating the one path reference in each evidence file.
Never `-X ours` / `-X theirs`.

Second conflict, benign: `artifacts/tests/README.md`, both forks appended receipt rows. Pure
union; rewrite the right fork's "this commit" cell to `d9189fbd`, which is meaningless in a merge.

## Recommended order
1. `de1e5c5e -> 75e5168c` fast-forward   2. `+ d9189fbd` (README conflict)
3. `+ 6771ba9a` (trx add/add)            4. `+ f7abfd8e` clean   5. `+ 5b895dc4` clean

No pair is code-incompatible. All ten head-pairs plus the full five-way composition were trial
merged; every source file merges clean, and each seam a textual merge could silently break was
audited: the deleted seed parameter (zero callers at both right-fork heads, all 16 call sites
checked), the widened newsletter constructor, the four-argument `TryConsumeConfirm`.

## Corrections to my brief
- The cache is not "moved out of a try-catch". `c96cd21e` ADDED a second unconditional idempotent
  `AddMemoryCache()`; the conditional call inside `AddMcpAuthentication` still exists. The move
  describes the RESERVATION limiter (`d9189fbd`), not the cache.
- "The two omitted counting rules" understates `f7abfd8e`: it names two omitted rules of
  Reg. 1182/71 art. 3, records a third (the which-calendar clamp) as open law with the only
  dangerous-direction break, and the art. 12(3) two-month extension gap.

## Assertion that can no longer fail
`CompositionRootLimiterWireTests.cs:256` — the `IReservationRateLimiter` absence assertion is now
true because `AddMcpAuthentication` never registers that type at all, not because the throw
precedes registration. Declared by the lane, left unedited because editing the pin's own file in
the closing commit was forbidden. The doc block at `:130-136` is now false in the composed tree.
Both need one small post-merge commit.

## Two bounds nothing in the family states in one place
1. All of link 3 is IN-MEMORY, PER-PROCESS. On the ratified ACA infra every budget multiplies by
   replica count and the retirement claim fires once per replica. The "even odds beyond a year"
   arithmetic assumes one process. Not a new defect (mirrors `OAuthSmsRateLimiter`), but the
   section 15 proof now RESTS on it.
2. The suppression ledger link `771c0fc0` reads is production-dark on its main feed: Postmark
   signs nothing, so a real account cannot authenticate a webhook until D-GROWTH-EVENTS is ruled.

## Process assertions with no artifact
`5719fc96` three mutations; `c96cd21e` six mutations; `86c0f9ae` 435/0/1 and `f7abfd8e` 436/0/1
(numbers with no trx, both say no tier was run); `5b895dc4` no tier numbers and no receipt at all
— the only code lane in the family with neither.

## Not determined
No suite run, no build. Compile-coherence rests on seam-by-seam arity audit, not a compiler.
The SQL tier has never run against any commit in this family. Multi-replica limiter behaviour is
inferred from code, tested nowhere in the estate.
