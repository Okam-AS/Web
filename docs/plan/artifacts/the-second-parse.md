# The second parse

Read-only. Second, independent census of the `evidence:` lines in `plan.md`, written without reading the
first parser, then compared. No artifact was corrected, no line of `plan.md` changed, no trunk moved, no
build, no tier, no jest. Working files and both instruments:
`lanes/L-THE-DENOMINATOR-IS-PARSED-A-SECOND-TIME-BY-A-DIFFERENT-HAND/`.

## The number

**`plan.md` holds 574 lines that syntactically declare an evidence field. The tool that owns the
namespace attributes 553 of them — one per entity, 553 entities — and ignores 21 as stray-paste
residue. The corrected denominator for every per-form numerator is 553, not 547.**

Two parses that share no method agree exactly once the tool has ruled:

- **Mine**: a state machine walking every one of plan.md's 38,658 lines exactly once — fences tracked,
  section and block carried as state, every line given one verdict, `sum(classes) == 38658` asserted.
  Candidates = every line containing `evidence:`: **N = 595. Accepted 574 + rejected 21 == 595** (printed,
  asserted). The 21 rejections are prose mentions, one blockquote, one numbered-list item — each named
  individually in `second-parse-census.json`.
- **The tool's** (`plan render --view lanes` on a byte-identical mirror of `docs/plan/`, so the live
  directory was never touched): 673 entities, 664 lanes, **553 evidence values**. Round-trip of all 595
  candidates through that projection: **matched 553 + rejected 42 == 595** (printed, asserted). The 42:
  21 prose/quote mentions confirmed non-evidence, and 21 field-shaped lines the tool attributes to no
  entity.
- **The first parse**, reconstructed from its stated shape and never read before my number existed:
  lines matching `^evidence:` in the contiguous stanza after a `### Lane` header inside `## Lanes — open`
  = **exactly 547**. The reconstruction hits its number to the digit, so what it omitted is measured, not
  guessed: **547 + 21 residue + 5 Flags-section stanzas + 1 inline bullet = 574**.

## Every lane block the 547 cannot see

### Six real entities, omitted (547 → 553)

| lane | where | state | evidence | tool grade | class it lands in |
|---|---|---|---|---|---|
| `L-ADMIN-NAV` | bullet form, `## Lanes — landed`, plan.md:701, evidence inline on the bullet | **accepted** | `fact:nav.modules` | **proven** (probed 12h ago) | fact-key class; the only accepted+proven line of the six |
| `L-LIVE-WORLD-SECOND-HUMAN` | `### Lane` block inside `## Flags`, plan.md:35510/35516 | built-unverified | decorated commit-ref string, no single path | claimed (path does not exist) | the pathless/decorated class |
| `L-CORS-NARROW-THE-DEFAULT` | inside `## Flags`, plan.md:35623/35629 | verified | absolute path, **on disk** | seen | **the 104 form** — leading `/` eaten by the naive extractor |
| `L-PROBE-DIR-IS-PINNED` | inside `## Flags`, plan.md:35671/35677 | verified | absolute path, **on disk** | seen | **the 104 form** |
| `L-PLAN-ARTIFACTS-ARE-SCRUBBED` | inside `## Flags`, plan.md:36035/36041 | verified | relative path, on disk | seen | healthy |
| `L-ADMIN-LOGOUT-RETURNS-TO-SIGN-IN` | inside `## Flags`, plan.md:36590/36596 | verified | relative path, on disk | seen | healthy |

The loss that matters: a census titled *all* evidence lines misses one **proven** line and two
**verified-with-artifact-on-disk** lines whose form is precisely the top mis-sort form it was ranking.
Five of the six are invisible because they are lane blocks living inside `## Flags` — the tool sees them
(it is not section-scoped); the shape-parser cannot.

### Twenty-one residue lines at nine corruption sites (counted by neither, and rightly — but only the tool can say so)

Nine host-lane bodies in `## Lanes — open` were damaged by stray pastes: the host's prose is truncated
mid-sentence and a headerless field stanza of one or more **review lanes defined properly elsewhere**
is glued on (splices like `so both sides agree. state: built-unverified`, plan.md:4093). The residue
carries real-looking `evidence:` lines that belong to nobody:

| host (header) | residue evidence lines | duplicates of |
|---|---|---|
| `L-MRG-REVIEW` (1967) | 1993, 2014, 2034, 2055 | L-EV-REVIEW, L-MEALS-REVIEW, L-TRAIN-REVIEW, L-GR-REVIEW |
| `L-MEALS-DOCSYNC` (2923) | 2940, 2957 | L-MRG-WASTE-REVIEW, L-PRICE-REVIEW |
| `L-JOURNEY-COVERAGE-THREE` (3300) | 3346, 3364 | L-UTLKVIT-REVIEW, L-FLAGS-UI-REVIEW |
| `L-FLAGS-NOTE-OVERCAUTIOUS` (3816) | 3835, 3855 | L-GR-PRIVACY-REVIEW, L-GR-TESTSEND-REVIEW |
| `L-GR-ISOPEN-DOC` (4081) | 4098, 4119 | L-WF-W5-REVIEW, L-MEALS-RELEASE-CLUSTER-REVIEW |
| `L-LIVE-WORLD-SEED` (4388) | 4427, 4445, 4457 | L-GR-CONFIRMED-REVIEW, L-MEALS-SWEEP-REVIEW (4457 = second fragment of the same lane) |
| `L-CONFIRM-ADMIN-SURFACE` (4561) | 4597, 4624 | L-FLAGS-RESOLVERS-REVIEW, L-EV-INQUIRY-REVIEW |
| `L-WF-PIVOT-DEFECTS` (5024) | 5076, 5092 | L-GR-RATELIMIT-REVIEW (5092 = second fragment of the same lane) |
| `L-MEALS-PROJECTION-LAG-VISIBLE` (5458) | 5476, 5508 | L-CONFIRM-CHAIN-REVIEW, L-MONEYPATH-PAIR-REVIEW |

All 19 duplicated lanes are **also defined once, properly, with their own header and stanza** (e.g.
L-EV-REVIEW at plan.md:6463) — inside the 547. So these 21 lines are not omitted lanes; they are noise.
**But that verdict is only checkable through the tool**: the round-trip showed the tool anchors every one
of those ids at its proper header and attributes each host its own stanza evidence. A second parse
without the negatives half would have reported 19 invisible lanes here — the seventh sweep error,
loaded and not fired. The audit's rule is what caught it.

Two things in this table are actionable and were **not** corrected, per the brief:

- **Host prose is destroyed at all nine sites** — e.g. L-MEALS-DOCSYNC (a *verified* lane) loses its
  fourth falsified-fact item mid-word (`claims an invi`, plan.md:2936); L-JOURNEY-COVERAGE-THREE loses
  its third finding-for-the-plan (`routed around rather than fa`, plan.md:3345). Only L-WF-PIVOT-DEFECTS
  quarantined its paste (blockquote + note, plan.md:5039-5047, and its claim that L-LIVE-HARNESS-REVIEW
  is defined elsewhere checks out at plan.md:6655). The other eight sites are raw.
- The residue sits inside blocks the tool re-projects; any future re-flow or field-rewrite pass
  (`plan verify` rewrites `evidence:` lines in place) is operating around unquarantined debris.

## Do 116 and 104 survive?

**Not as stated; the ranking they argue does.** Restated over the corrected denominator:

- The corrected population (553) adds **exactly two** naive-vs-careful disagreements, and both land in
  the top form — `L-CORS-NARROW-THE-DEFAULT` (plan.md:35629) and `L-PROBE-DIR-IS-PINNED` (plan.md:35677),
  both bare absolute paths. This delta is instrument-independent: any careful extractor keeps the
  leading `/`; the naive one eats it by construction. The other four added lines add no disagreement
  (one `fact:` key, one decorated pathless value, two clean relative paths). So the honest figures are
  **at least 118 of 553** and **at least 106**, and the claim "one form costs ~104 lanes" survives —
  strengthened, since both new cases are that form.
- What does **not** survive is the numbers' self-description: the census calls itself "all 547
  `evidence:` lines" and its population came from the same header-then-evidence family under audit, so
  its numerators inherited the denominator's blind spot — and two of the six invisible lines were
  sitting in its own top form.
- Honesty about the instrument: I re-implemented both extractors from the census's Method prose and
  could not reproduce 116/104 over its own 547-line population (my reconstruction disagrees on 180
  lines, 138 absolute-path). The published method under-specifies the careful extractor, so the exact
  figures are not re-derivable from the artifact alone; the +2/top-form delta above is the part that is.

## The 47, checked

**Reproduced exactly, and strengthened.** Re-run of the authority lookup over all 47 named branches
across both repos: every one exists locally, `git branch -r --contains` finds no remote ref containing
any tip — **47 local-only + 0 rejected == 47** (printed). Then one step past the census: `git ls-remote
--heads origin` against both live remotes (read-only, nothing fetched, no ref written) enumerates 12 + 25
remote heads and **none of the 47 names is among them**. Residual caveat, named rather than waved:
containment against an unfetched remote-tracking mirror could in principle miss content pushed under
another name since the last fetch; closing that fully requires a fetch, which the census refused and so
did I. The claim that this is the night's most trustworthy number **holds**.

## Method, so a stranger can re-run it

1. `second_parse.py` — the state machine; prints class counts, `574 + 21 == 595`, and writes
   `second-parse-census.json` (every accepted and rejected line, individually).
2. `cp -R docs/plan <lane>/plan-mirror && plan render --view lanes --dir <lane>/plan-mirror` — the
   namespace owner's projection, produced without touching the live plan directory.
3. `roundtrip.py` — reconciles all 595 candidates against the projection; prints `553 + 42 == 595` and
   names each rejection.
4. `misort_retest.py` — both extractors rebuilt from the first census's Method section, run over the 547
   and 553 populations; prints the two added disagreements.
5. The 47: the loop over `the47.txt` with `git -C <repo> branch -r --contains`, then `git ls-remote
   --heads origin` in both repos; prints `47 + 0 == 47` and the live-remote hit count (0).

The first parser's artifacts (`evidence-lines-a-sweep-can-read.md`, `how-a-sweep-lies.md`,
`branches-only-on-this-machine.md`) were opened only after step 3 had produced 574/553 — checking its
assumptions required deriving mine first, which is what this lane was for.
