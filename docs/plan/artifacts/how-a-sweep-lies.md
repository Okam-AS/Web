# How a sweep lies

Six measurements retracted or corrected in one night, each reproduced in miniature before being written
down. Read-only; no build, no tier, no jest, no ref touched.

## The brief's direction count is wrong, and the reason matters

It says five over-matched and one under-matched. Reproduced, it is **three and three**:

| # | mechanism | sweep said | truth | match direction |
|---|---|---|---|---|
| 1 | basename match accepted another lane's `evidence.md` | present | absent | **over** |
| 2 | unanchored regex ate a leading `/` | absent | present | **under** |
| 3 | hex regex read UUID halves as commit ids | present | absent | **over** |
| 4 | brace expansion `{a,b}` parsed as no path | absent | present | **under** |
| 5 | `.count()` of a basename against a joined listing | present | absent | **over** |
| 6 | `ls-tree -r` lists nothing under a submodule | absent | present | **under** |

**The count was wrong because match direction and finding direction are not the same thing, and they
invert whenever a sweep is looking for absence.** #6 *under*-matched files and thereby *invented* findings —
37 imports reported unresolved that resolve perfectly. Counted by findings it is **4 invented, 2 hidden**;
counted by matches it is 3 and 3. Both are true of different questions, which is exactly the confusion that
produced the 5-and-1.

## Does under-reporting really look safer?

The standing claim is that under-reporting fails quietly and gets quoted. **Half supported.** The eaten
slash (under) produced *seven destroyed* and was quoted into two censuses before anyone checked. But the
three over-matches were **more expensive**, because each *spawned a lane*: five dead SHAs, three moved
files, four stale branches — all follow-on work against findings that did not exist. **An under-match wastes
a reader; an over-match wastes a lane.**

## The shape

Every one of the six is **a text operation standing in for a structural lookup**. A basename compared
instead of a path; a regex consulted instead of the filesystem; a substring counted instead of a set tested;
a hex pattern trusted instead of `cat-file -t`; a flat listing walked instead of a submodule-aware one.
Not one was a logic error, and not one would have been caught by more care — **every sweep exited 0 with
plausible numbers**, which is why all six were found by a human re-reading output.

## The check, per mechanism

| # | the check that would have caught it, before reporting |
|---|---|
| 1 | compare the **full path**, never `os.path.basename`; or compare blob shas |
| 2 | `assert re.fullmatch(pattern, candidate)` on a known absolute path fixture — one `/Users/x/y.md` case |
| 3 | `git cat-file -t <token>` before calling anything a commit; a UUID half returns non-zero |
| 4 | expand braces before extracting, or assert the line yields ≥1 path when it contains `/` and `.` |
| 5 | `basename(t) == basename(p) for t in tree` — a set test, never `.count()` on a joined string |
| 6 | detect mode `160000` in `ls-tree` and recurse into the submodule, or exclude its paths from the denominator |

## One rule or six

**One rule, applied in two directions**, catches all six:

> **Round-trip every verdict through the tool that owns the namespace — the positives *and* the negatives.**

Ask git whether a token is an object. Ask the filesystem whether a path exists. Ask a set whether a name is
in it. Then do the same for everything the sweep called **absent**, which is the half nobody does: #2, #4
and #6 are all invisible unless the negatives are resolved too, and those are precisely the three that hid
findings. The positives-only version catches 1, 3 and 5. **Neither half alone catches more than three.**

It is a check that runs, not an attitude: for a sweep over N items, resolve all N through the authority and
assert `matched + rejected == N` with both counts printed. Every one of tonight's six changes a printed
number under that assertion.

## The seventh, marked rather than fixed

Numbers still standing tonight that rest on the same family of extractor, which I have **not** re-derived:

- **547 evidence lines** and **116 mis-sorts / 104 from one form** — produced by the very regex family under
  audit here. The 104 was measured by *comparing* a naive extractor against a careful one, so it is
  self-checking in the way this rule recommends; the **547 denominator is not** — it counts lines matching
  `^evidence:` after a `### Lane ` header, and a lane whose block is shaped differently is silently omitted.

- **47 local-only branches** — rests on `git branch -r --contains`, which is an authority lookup rather than
  a pattern, so it is the most trustworthy number of the night by the rule above.

**The 547 is the seventh candidate.** I am marking it, not fixing it: re-deriving it needs a second
independent parse to compare against, which is a lane, and correcting a denominator inside the lane that
audits denominators is how the audit stops being independent.
