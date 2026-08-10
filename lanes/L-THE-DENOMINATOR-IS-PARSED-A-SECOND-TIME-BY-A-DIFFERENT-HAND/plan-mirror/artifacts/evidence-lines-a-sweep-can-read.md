# Evidence lines a sweep can read

Read-only census of all **547** `evidence:` lines in `plan.md`. **No evidence line was changed.** They are
RETURN records and part of the audit chain; rewriting one to suit a parser is editing the record to fit the
instrument.

## The ranking, by lanes actually mis-sorted

Prevalence is not cost. A form only costs something when a sweep that handles the ordinary case still gets
the wrong answer. Measured by running a naive extractor — the one both censuses tonight used — against a
careful one and counting the lanes where they **disagree**:

| form | lanes mis-sorted |
|---|---:|
| **absolute path, leading `/` eaten by an unanchored regex** | **104** |
| brace expansion — `lanes/X/{a.trx,b.trx,c.txt}` | 11 |
| path glued to trailing punctuation — `…/RUN.md,` | 1 |
| | **116 of 547** |

**One form costs 104 lanes and the other two cost twelve between them.** The seven-versus-one destroyed
count that opened this lane was not an unlucky edge case; it was a sample of a defect touching a fifth of
every evidence line in the plan.

The mechanism is one character. `[\w.\-]+(?:/[\w.\-]+)+\.\w+` cannot match a leading `/`, so
`/Users/svendaneel/okam/…` is captured as `Users/svendaneel/okam/…`, tested as a relative path, missed, and
filed as absent. It fails **silently and in the safe-looking direction**: the sweep reports *less* evidence
than exists, so nothing looks broken.

## Forms that are not parse failures, and should not be counted as if they were

| form | lines | why it is different |
|---|---:|---|
| repo-relative path needing `../OkamAPI-modules/` | 246 | parses perfectly; it resolves from the wrong root. A **resolution** fault, and the one a sibling lane amended exits for. |
| several artifacts in one line, joined by `·` or `+` | 40 | every path parses; a sweep taking only the first sees one of four. |
| prose with no path at all | 39 | nothing to parse. An absence, not a failure. |
| `fact:` key only | 9 | same; the tool resolves these by another route entirely. |
| cross-repo without `../` — `OkamAPI-modules/x` | 1 | parses; resolves from `~/okam` and nowhere else. |

Keeping these separate matters: a fix aimed at parsing would not touch the 246, and a fix aimed at
resolution would not touch the 104.

## The rule, in one sentence a brief can carry

> **An evidence line names exactly one artifact, as a path relative to the plan repo, with no braces, no
> punctuation touching it, and no worktree in it.**

It is a rule for lines *written from now on*. It is not a licence to rewrite the 547 that exist.

## What my own classifier cannot read

Every sweep tonight was wrong in a way its author caught by eye, so this section is the point of the
artifact rather than a disclaimer.

**1. It cannot tell a durable path from one that resolves only today.** 53 evidence lines point inside an
ephemeral `wt-*` worktree. 48 of those directories exist right now and 5 have already gone. My sweep asks
*does this path exist* and therefore calls 48 of them healthy — they will read as destroyed the moment
somebody runs `git worktree prune`. **That is the next seven-versus-one, already loaded.**

**2. It resolves against three roots, so it cannot report ambiguity.** `lanes/X/y.md` is tried under the
plan repo and both code repos; if two of them hold a file of that name the sweep reports *found* and cannot
say which. No lane is known to be affected, and I did not measure it — I cannot, with this instrument.

**3. Its own form list is hand-written.** The three costed forms are the ones I thought to test for. A form
nobody has hit yet is invisible to a classifier built from the forms that have already bitten.

**4. It reads the current `plan.md` only.** Lines rewritten earlier tonight — two `evidence:` lines were
replaced with bare `fact:` keys by a verify sweep — are counted in their new form, not the one they had
when a census read them.

## Method

Naive extractor: `[\w.\-]+(?:/[\w.\-]+)+\.\w+`, the pattern used by both censuses. Careful extractor: the
same anchored with an optional leading `/` and `../`, plus brace expansion and trailing-punctuation
stripping. Disagreement counted per lane, attributed to the first form present. Nothing was executed and no
trunk moved.
