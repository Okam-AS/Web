# Moved, not deleted — and in fact neither

Read-only. No build, no tier, no jest, no ref touched. Trunk `6d5328004`, unmoved.

## The headline: there are no moved files, and there are no deleted ones either

Every one of the 40 unresolved imports across the four branches was resolved **by content**, not by name.
Not one target moved. Not one was deleted. They divide into two mechanisms, and **neither is evidence of a
stale branch**:

| mechanism | count | what it actually is |
|---|---:|---|
| the import names a module **the branch itself adds** | **37** | unresolved on the trunk *by construction* — a branch that adds files necessarily imports files the trunk lacks |
| the import points into **`core/`** | **3** | `core` is a git submodule (mode `160000`), so `git ls-tree -r` lists **0** files beneath it and every `~/core/...` import reads unresolved |

## So the instrument I recommended does not work, and I am retracting it

Last lane I reported that import resolution *decided 4 of 14*. **It decided 0.** The signal it produces is
not staleness — it is *this branch adds modules*, which every feature branch does.

And the "3 imports whose basename still exists elsewhere on the trunk" that this lane was raised on was a
bug of the same family as the others tonight: I counted a basename with `.count()` **against the whole tree
listing joined into one string**, so any path containing those characters anywhere scored a hit. A substring
count is not a basename match, and a basename match would not have been a move either.

## `price-crosscurrency`, settled completely

All three of its unresolved imports are `~/core/services` and `~/core/helpers/tools` — the submodule case.
**It has zero real unresolved imports.** Nothing about it fits or fails to fit the trunk on this evidence,
and it returns to `undecidable`.

## What it changes for the number the owner is deciding on

**It lowers nothing and raises nothing — it removes evidence.** The standing finding is 47 local-only
branches carrying work no trunk holds, with no merged pointers among them. I had offered four branches as
*probably stale and probably still wanted*; that reading is withdrawn. All 14 frontend branches are
`undecidable` again, and the 47 stands untouched.

The honest movement is in the opposite direction from progress: the pool of *decided* branches went from
1 superseded + 13 wanted + 4 stale to **1 superseded + 13 wanted**, with 33 undecidable as before.

## One thing I could not establish, left undecided

`~/utils/workforce/pos-clock` matches **2 paths on the trunk** by substring, while the content test found
no file with its content and no exact basename. Those two facts disagree and I did not resolve which is
right — resolving it needs a read of both files, and a lane that has just retracted an instrument for
guessing should not guess here. **Marked undecided rather than assigned.**

## Method

For each unresolved import: locate the target on the branch, take its blob sha, and look that sha up in a
full `ls-tree -r` index of the trunk — an identical blob anywhere on the trunk is a move, and its path is
the new location. Only if no content matched did I fall back to basenames, and then as a **question**, not
an answer. Content first is the whole correction; a basename match was never going to establish a move.
