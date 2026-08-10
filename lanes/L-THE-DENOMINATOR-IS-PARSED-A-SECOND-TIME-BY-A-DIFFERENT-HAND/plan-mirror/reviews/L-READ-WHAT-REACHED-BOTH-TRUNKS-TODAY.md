# Review — what reached both trunks today

Under review (real ranges, per the coordinator's stale-SHA correction): frontend
`3807e90` → `de5e68c`, backend `057c390ad` → `d30c1c4d4`. Reviewer:
agent:L-READ-WHAT-REACHED-BOTH-TRUNKS-TODAY · 2026-08-08 · read-only; two throwaway worktrees
(`Web-modules-wt/L-BOTH-TRUNKS` at the frontend tip, core pinned `a6ae241` matching the gitlink;
`OkamAPI-bothtrunks` stepped through the backend arc), both removed after.

## Verdict

**APPROVE both ranges.** The backend money arc reproduces at its first and last steps with skips
pinned at 11; tranche five's nine rewrites are genuine conversions that assert strictly more than
the pins they replace; the widened guard's 53-script sweep count reproduces exactly and its
prose-immunity arms are green; both held items are still absent from their trunks; and the declared
`TransferGiftcard` window is repository-state only — no deployment carried it, and the guard that
closes it is already on the backend trunk inside this range, shaped exactly as the money review
named it.

## 1. The backend money arc — reproduced at both ends

Claim: `4967 / 2 FAILED` → `4971 / 1` → `4974 / 0`, skips **11 throughout** — the constancy of the
skip count being what proves nothing was skipped into green.

| arc step | claimed | measured |
|---|---|---|
| `8f817cbd9` (pins landed, defects live) | 4967 / 2 FAILED / 11 skipped | **Failed: 2, Passed: 4967, Skipped: 11** (Total 4980, 6 m 7 s) |
| `7d0450a4b` (both fixes landed) | 4974 / 0 / 11 | **Passed: 4974, Failed: 0, Skipped: 11** (Total 4985, 6 m 27 s) |

**Skips held at 11 at both ends — and at the tip (§7) — so nothing was skipped into green.** The
two reds at the first step are the pins my money-fixes review handled directly pre-landing: the
gift-card balance pin (`GiftcardBalanceTests.Passing_a_gift_card_on…`, red by design until
`71ac73af1`) and the year-spanning invoice pin (red until `a9d408bfb`); their identities are
corroborated by that review's own runs rather than re-extracted from this tier's log.

The two reds at the arc's first step are the named pins (the gift-card copy defect and the
year-spanning invoice), landed red by `8f817cbd9` (pos-coverage-opened) and turned green by the two
fixes — the sequence my money-fixes review measured pre-landing (4962/0/10 composed on the
pre-tranche base) now reproduced on the trunk itself.

## 2. Tranche five's nine rewrites — conversions, not deletions

- **Count**: `test/offer-code-guest-page.test.js` holds **37 tests before (`3807e90`) and 37 after
  (`31e6c60`)** — reproduced by counting `test(` declarations at both blobs.
- **Naming**: `THE DEFECT` appears 6 times before, **3 after — all three in comments** (`:411-412`
  the ruling note on a converted outside-asserting arm, `:429` the historical header). **No test
  name carries it.**
- **Strength**: read arm by arm. Each conversion asserts **more** than its pin did, not less: the
  load-failure arm asserts the corrected heading, the absence of the old lie
  (`not.toContain('Tilbudet er utløpt')`), the diagnosis reaching a pixel AND the retry offer; the
  empty-body arm asserts the confirmation renders and every failure/blank state is absent; the
  failed-send arm asserts the exact localised sentence. The five keep their WAS/NOW prose, so the
  reader still learns why each assertion exists. The header honestly accounts for the other four
  redding arms (two outside-asserting the same defect, two pinning replaced wording) — matching my
  seam-3 measurement of exactly nine, arm for arm. **No deletion wears a rewrite's clothes here.**

## 3. The widened guard — count and arms both reproduce

- The sweep at the tip walks **`test/support`, `docs/plan/lanes`, `lanes`** and takes **every**
  `.js/.sh/.py/.zsh/.bash` (the `/mutat/i` name filter is gone — which is what catches "a broken
  driver whose filename says nothing about mutation"). My independent count of scripts under those
  roots at `de5e68c`: **53 exactly.**
- The suite (`test/mutation-runner-restore.test.js`) runs **27/27 green** at the tip, including the
  prose-immunity arms (docstring, `/* */` block, `//` and `#` line comments) and the accusation
  arms (broken copy under `lanes/`, innocently-named driver). The stripper is pinned in both
  directions as claimed.
- Note for the record: the guard now also carries `run-browser-arm.sh` fixes and the
  root-without-package.json hardening (`10ace1a`), which is what lets it judge a .NET suite from
  the backend repo.

## 4. The declared hole — no window beyond the recorded one

The money tranche landed (`97d2bd99b`, `7d0450a4b`) while `TransferGiftcard` had no resolved
caller; the guard landed a few commits later in the same range (`8637cdd51`, merged `1c71ae951`,
proven over HTTP by `5c46187f3`). Two facts bound the window:

1. **No deployment carried any of these states** — both trunks are local and unpushed (their core
   pins are on no remote). The "window" is an interval in repository history, not in production.
2. Within that interval the exposure **decreased**: before the balance fix a transfer *minted*
   money (both wallets funded); after it, a transfer *moves* money. Theft-shaped is strictly
   narrower than inflation-shaped.

The guard itself is the exact change the money review named — caller resolved, holder =
`ReceiverUserId` "because GetBalance sums by that user, so it is the id the money actually
follows" — hardened beyond the naming with a uniform `GiftcardNotFound` refusal ordered before the
status guard so the route cannot be used as a card-id oracle. **Nothing beyond the recorded window
exists.**

## 5. The held items — both still absent, verified with existence proof

- `8357c8a33` (module-off backend half, gated by the unruled decision): **exists** in
  `OkamAPI-modules` and is **not** an ancestor of `d30c1c4d4`.
- `392a2fd` (`lane/backend-landing-order`, held by
  `D-IS-A-SCRIPT-IN-AN-EVIDENCE-DIRECTORY-A-RECORD-OR-A-DRIVER`): lives in the **frontend** repo
  (where landing artifacts live) and is **not** an ancestor of `de5e68c`. A naive check in the
  wrong repo returns "not found", which reads as absent for the wrong reason — checked with
  `cat-file -e` first in both repos.

## 6. The three findings other lanes reported — second-read verdicts

- **GrowthAudit clean-merge-broke-build (census-floors landing): handled correctly, coverage
  kept.** The landing lane removed the four hardcoded counts the fork's derivation replaces, and
  GrowthAudit is present in the derived census at the tip (`ModuleActorStampPin.GrowthAudit`,
  `WebApi.Tests/Modules/ModuleActorStampPin.cs:259`); the derived mechanism's own mutation reds on
  losing a site (1/44 per the landing record). The module was not silently dropped. This is also
  the fourth live instance of the clean-merge≠composing class this program has now measured.
- **`wf-withheld-bound`'s unfalsified expiry-sweep arm: confirmed at the tip.** The site exists —
  `WorkforceNotificationDispatcher.cs:236-255`, the `result.Withheld` branch writing
  `WithheldWeekEnded:` into `LastError` — and the two backlog tests reference the reason string but
  do not red under the site's mutation (the landing lane measured it; the tests touch the constant,
  not the transition). **Exact change: a third arm in
  `WorkforceNotificationBacklogBoundTests` that drives the sweep over a withheld row whose week has
  ended and asserts the terminal transition and reason, mutation-backed on the
  `Status == Withheld && NextAttemptUtc <= now` condition.** Until then the suite's name promises a
  bound its arms only half-pin.
- **Verified-on-an-unopenable-pointer: the successor evidence is sound; the exact change is a
  re-point.** `L-WF-WITHHELD-BOUND` and the credit-sale item both carry worktree-path evidence
  (`/Users/svendaneel/okam/wt-wfwithheld @ 74405b34`) that no longer opens.
  `L-THE-CREDIT-SALE-SUITE-REACHES-THE-TRUNK` has already replaced the capability's proof:
  `lanes/L-THE-CREDIT-SALE-SUITE-REACHES-THE-TRUNK/asserting-tests.txt` — **36 lines, 34 named
  trunk tests, opens today, not gitignored** (checked with `check-ignore`). The exact change is
  clerical: the original item's evidence field should cite the asserting-tests file and the trx
  beside it, not the dead worktree.

## 7. Tiers, measured

| tip | measured |
|---|---|
| frontend `de5e68c` | **184 suites / 4484 / 0**, `npx jest --ci`, core `a6ae241` = gitlink |
| backend `d30c1c4d4` | **Passed: 5037, Failed: 0, Skipped: 11** (Total 5048, 6 m 39 s), from `WebApi.Tests/` with the SQL filter |

Every run was preceded by its own load gate (the host oscillated to 80 twice during this lane; the
measured phase carried per-run gates, recorded in its log: 10.21 / 10.77 / 11.43 / 10.03). The
brief's frontend figure (183/4445 at `9d88101`) is consistent as an intermediate state; the tip has
moved past it, and 184/4484/0 is the number a next landing should expect.

## Constraints

C1/C2: no migration in either range violates the chain rule (the backend range is services, tests
and controllers; verified by the arc landing structure). C4: the range *closes* a C4 breach (the
transfer guard records the actor). C3/C5/C6/C7: nothing new unreachable, nothing accepted on suite
evidence, no statutory claim without its artifact (the personalliste landing is exactly the
claim-narrowing direction), no secrets in added logging.

## Hygiene

Worktrees `Web-modules-wt/L-BOTH-TRUNKS` and `OkamAPI-bothtrunks` removed with `rm -rf` +
`git worktree prune`; backend run-sheet artifacts restored between checkouts, never `git add`-ed.
No commit, merge, rebase, push or branch move; every run load-gated (the measured phase carried its
own per-run gates after the host oscillated to 80 twice). `web-livewalk`, containers, ports
untouched.
