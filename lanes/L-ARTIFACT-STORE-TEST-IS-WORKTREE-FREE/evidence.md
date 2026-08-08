# L-ARTIFACT-STORE-TEST-IS-WORKTREE-FREE — evidence

Subject: `test/journey-artifact-store.test.js` at trunk `feature/restaurant-modules` = **ff497c0**.
Flag under test: `F-ARTIFACT-STORE-TEST-CHECKOUT-BOUND`.

The fix that is claimed to have landed is line 40 of the test:

```js
const SELF = path.basename(path.resolve(__dirname, '..'));
```

replacing a literal `'Web-modules'`. This lane checked that claim **in both directions** and then
tried to break it.

## Method

Seven detached worktrees at ff497c0, each with `node_modules` symlinked from the canonical checkout
(no `npm ci`, no `npm install`). Every run:

```
node node_modules/.bin/jest test/journey-artifact-store.test.js --coverage=false
```

No container was started, `okam-lwtwo-sql` / `okam-lwtwo-redis` were never touched, :3971 and :5971
were never bound, nothing was killed, and the owner's checkout never changed branch or tracked
content. All worktrees were clean (`git status --porcelain` empty; the symlinked `node_modules` is
ignored), so every build id under test was of the `<name>@<sha>` form rather than `+dirty`.

## Runs — all seven green, 44/44

| # | checkout directory | what it probes | result | log |
|---|---|---|---|---|
| 1 | `…/L-ARTIFACT-STORE-FREE/wt-lane-tree` | **not** named `Web-modules` | 44/44 | `run-1-wt-lane-tree.log` |
| 2 | `…/L-ARTIFACT-STORE-FREE/canonical/Web-modules` | **is** named `Web-modules` | 44/44 | `run-2-canonical-Web-modules.log` |
| 3 | `…/L-ARTIFACT-STORE-FREE/has space/web tree` | spaces in both the parent and the checkout name | 44/44 | `run-3-space-in-path.log` |
| 4 | `…/L-ARTIFACT-STORE-FREE/Web-modules/inner` | nested checkout whose **parent** is `Web-modules` | 44/44 | `run-4-nested-under-Web-modules.log` |
| 5 | `…/L-ARTIFACT-STORE-FREE/link-tree` → `real/target-tree` | run through a symlink, link basename ≠ real basename | 44/44 | `run-5-symlinked-path.log` |
| 6 | `…/L-ARTIFACT-STORE-FREE/alpha` | collides with the name the suite's own helper checkouts use | 44/44 | `run-6-checkout-named-alpha.log` |
| 7 | `…/L-ARTIFACT-STORE-FREE/real/Web-modules` → `real/target-tree` | symlink whose basename **is** the canonical name, real dir is not | 44/44 | `run-7-symlink-named-Web-modules.log` |

Runs 1 and 2 together are the two-directional check the exit criteria asks for: the fix did not swap
which checkout works, it removed the dependency.

Run 5 and run 7 pass for a reason worth writing down rather than luck: Node resolves module paths
through `realpath`, so `__dirname` is the real directory in both, and `buildFromListeningProcess`
learns the checkout from `lsof`'s answer for the process cwd, which macOS also reports as the real
path. Both sides of the assertion resolve the symlink the same way, so the two agree. A symlink
named `Web-modules` over a tree named `target-tree` (run 7) is therefore read as `target-tree` by
the assertion **and** by the code under test.

Run 6 was an attempted break that failed to break it. `checkout('alpha')` at line 529 does
`mkdtempSync(path.join(os.tmpdir(), 'world-' + name + '-'))` and returns `path.basename(repo)`, so
the helper's build ids are `world-alpha-XXXXXX@…`, never a bare `alpha`. The negative at line 602
(`expect(build.id.split('@')[0]).not.toBe(SELF)`) cannot be collided with by naming a checkout
`alpha`.

## Falsification — the green is caused by the fix, and the assertions still bind

Two mutations, both in the non-canonical worktree (run 1's tree), each reverted immediately:

- **M1** — restore the old literal, `const SELF = 'Web-modules';`
  → **2 failed, 42 passed** (`mutation-1-literal-Web-modules.log`). This reproduces the flag exactly:
  the red is two tests, in a tree named anything but `Web-modules`, with nothing about the store
  changed.
- **M2** — keep the derivation but derive the **wrong** directory,
  `path.basename(path.resolve(__dirname, '../..'))`
  → **2 failed, 42 passed** (`mutation-2-wrong-derivation.log`). This answers the "is deriving it
  circular?" objection: if the assertions were self-satisfying, any derived value would pass. They
  bind to the actual checkout the process runs out of.

Both mutations red the same two tests:

```
● backend identity › asks whoever is holding the port what directory they are running from
● backend identity › the world stamp › names the checkout the world script recorded, not the one holding the port
```

Those are the two positives, at lines 434 and 601. The two negatives at 486 and 602 are the ones
that went **vacuous** under the old literal in a lane worktree (`not.toContain('Web-modules@')` is
trivially true in a tree not called that); with `SELF` derived they now assert something in every
tree, which is a second repair the flag did not ask for and got.

## One remaining `Web-modules` literal, characterised — not a defect

`test/e2e/support/core-checkout.js:74-75` still spells `'Web-modules'`:

```js
if (a === 'Web-modules') { return -1; }
if (b === 'Web-modules') { return 1; }
```

It is a **sort tie-break**, not an assertion: it orders sibling directories when searching for a
`core` checkout so the choice is deterministic across machines, and every candidate still has to
pass `looksLikeCore` and the exported-services check before it is taken. It cannot red anything, and
it lives under `test/e2e/`, which `jest.config.js` excludes from this tier. Named here so the next
reader does not mistake it for a second instance of the same defect.

## Cleanup

All seven worktrees and the three symlinks created for this lane were removed with
`git worktree remove --force` and `git worktree prune`; the scratch parent
`…/scratchpad/L-ARTIFACT-STORE-FREE` was deleted. The estate's worktree count returned to what it
was before this lane ran.
