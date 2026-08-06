# L-WORKTREE-BASENAME-PIN — evidence

Baseline taken by this lane: `e34977acebd59b223584158c33451b6f1ffd82c1`
(shared checkout on `feature/restaurant-modules`, 245 dirty files from concurrent lanes at the moment
of measurement — 247 by the time the change was copied in; none of the churn is this lane's).

Lane worktree: `/Users/svendaneel/okam/web-wtbasename` — basename **`web-wtbasename`**, branch
`lane/worktree-basename-pin`, created at the baseline commit. This is the directory every run below
marked "lane worktree" was executed from.

---

## 1. The two facts the brief asked to be checked rather than inherited — BOTH CONFIRMED

Ran unmodified `e34977ac` from the lane worktree:

```
Tests:       2 failed, 36 passed, 38 total
```

- `:295` — `expect(build.id).toMatch(/^Web-modules@[0-9a-f]{40}(\+dirty)?$/)`
  received `"web-wtbasename@e34977acebd59b223584158c33451b6f1ffd82c1"`
- `:457` — `expect(store.buildFromListeningProcess(origin).id).toMatch(/^Web-modules@/)`
  received `"web-wtbasename@e34977acebd59b223584158c33451b6f1ffd82c1"`

So the sibling's report of **two** failures, one at `:295`, was accurate, and `:457` is still where
the brief says it is. No drift. Count and lines both stand.

## 2. What the build id is for, and why it was not simply deleted

`buildFromCheckout` (`test/e2e/support/artifact-store.js:183-200`) composes
`id = path.basename(path.resolve(repo)) + '@' + head + (dirty ? '+dirty' : '')`.

The id answers **which tree produced this artifact**, and answers it by NAME rather than absolute
path on purpose — the artifact is pasted into reviews and must not carry the laptop's directory
layout (the file says so at `:195-197`, and `:298` asserts the absolute path never appears).

That is a real property and the defect is not that it is recorded. The defect is that the TEST pinned
the answer to one literal directory name. The fix keeps the provenance and drops the pin.

## 3. The change

`test/journey-artifact-store.test.js` only. No production file changed.

A single derived constant near the top:

```js
const SELF = path.basename(path.resolve(__dirname, '..'));
```

…used in place of the literal in four assertions:

| line (pre-change) | was | now |
|---|---|---|
| `:295` | `toMatch(/^Web-modules@[0-9a-f]{40}(\+dirty)?$/)` | `toMatch(/^[^@]+@[0-9a-f]{40}(\+dirty)?$/)` **plus** `expect(build.id.split('@')[0]).toBe(SELF)` |
| `:347` | `not.toContain('Web-modules@')` | `not.toContain(SELF + '@')` |
| `:457` | `toMatch(/^Web-modules@/)` | `expect(...id.split('@')[0]).toBe(SELF)` |
| `:458` | `not.toMatch(/^Web-modules@/)` | `expect(build.id.split('@')[0]).not.toBe(SELF)` |

Splitting on `@` rather than building a `RegExp` from `SELF` avoids having to escape a directory name
that contains regex metacharacters — a worktree named `web.fix+2` would otherwise match by accident.

Two stale comments (`:386`, `:419`) that named `Web-modules` as a fact about the reader's machine were
reworded. Three comments elsewhere in the file are prose about the estate and were left alone.

**This is not circular.** The code under test learns the checkout from a completely different source —
`lsof`'s answer for the cwd of whoever holds the port — while `SELF` comes from `__dirname`. The
assertions still prove the right process was found and its tree correctly identified.

### A third instance, silent rather than red

`:347` was **not** failing. `not.toContain('Web-modules@')` is trivially true in a tree not named
`Web-modules`, so in every lane worktree it asserted nothing at all. It went vacuous in exactly the
trees where the lanes run. It is now `not.toContain(SELF + '@')` and asserts the real property
everywhere. Worth recording: the literal cost two standing reds *and* one silently disarmed check.

## 4. Exit criterion — the honest run, from a worktree not named `Web-modules`

```
$ cd /Users/svendaneel/okam/web-wtbasename && basename "$PWD"
web-wtbasename
$ npx jest test/journey-artifact-store.test.js --coverage=false
Test Suites: 1 passed, 1 total
Tests:       38 passed, 38 total
```

The tree was dirty at the time of this run (this lane's own edit), so the id was
`web-wtbasename@<sha>+dirty` and the `(\+dirty)?` branch was exercised, not skipped.

### 4b. The same run against the LANDED commit, not the working copy

Section 4 ran the working copy. This one ran the tree as committed, so what was proven is the artifact
that will be merged rather than an edit sitting in a directory:

```
WORKTREE: web-wtbasename  HEAD: 3dd8fa3  tree: clean
Test Suites: 1 passed, 1 total
Tests:       38 passed, 38 total
```

The tree is clean here and was dirty in §4, so the id was `web-wtbasename@<sha>` with no suffix in
this run and `…+dirty` in that one — both arms of `(\+dirty)?` are covered by a real run.

## 5. The converse — still passes where CI and the shared tree live

Same file, run from the shared checkout whose basename **is** `Web-modules`:

```
$ basename "$PWD"
Web-modules
$ npx jest test/journey-artifact-store.test.js --coverage=false
Test Suites: 1 passed, 1 total
Tests:       38 passed, 38 total
```

The fix did not swap which directory fails. Both directions pass.

## 6. Mutation check — the assertions still bite

The risk in a fix like this is trading a nuisance red for a blind spot. Both mutations were applied to
the production source in the lane worktree and reverted (`git status` clean afterwards):

| mutation to `buildFromCheckout` | result |
|---|---|
| drop the checkout NAME, keep the sha (`id: head + …`) | **3 failed**, 35 passed |
| leak the ABSOLUTE PATH instead of the name (`id: path.resolve(repo) + '@' + …`) | **2 failed**, 36 passed |

Provenance is still enforced, including the privacy half of it. Suite re-run green after revert.

---

## Adjacent finding — NOT fixed, out of scope, reported for a ruling

`test/e2e/support/core-checkout.js:74-75` carries the same literal in a different shape:

```js
if (a === 'Web-modules') { return -1; }
if (b === 'Web-modules') { return 1; }
```

This is a sibling-directory search for the `core` submodule, and it ranks a directory named
`Web-modules` ahead of every other candidate — **including the lane's own worktree**. So a lane that
modifies `core` in its worktree can silently be served the shared checkout's `core` instead of its
own. It fails nothing, which is why nobody has reported it; it is the same class of hazard as the
port-4010 adoption. Changing a discovery preference affects every lane at once, so this lane did not
touch it.

## Ports

None bound. This is a jest unit suite. The three `4010` references in the file
(`:50`, `:335`, `:363`) are inert string literals fed to key computation — no socket is opened to
that port, so the foreign process holding 4010 was neither contacted nor disturbed.
