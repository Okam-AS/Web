#!/usr/bin/env python3
"""Turn rows.json into citations.md. Read-only."""
import json, os, collections

LANE = os.path.dirname(os.path.abspath(__file__))
rows = json.load(open(os.path.join(LANE, "rows.json")))

HIST = {}
for n in ("Web-modules", "OkamAPI-modules"):
    HIST[n] = set(open(os.path.join(LANE, "histpaths-%s.txt" % n)).read().split("\n"))


def in_history(detail):
    p = detail.split(" ")[0].replace("/Users/svendaneel/okam/", "")
    parts = p.split("/")
    if len(parts) < 2:
        return None
    repo, rel = parts[0], "/".join(parts[1:])
    if repo in HIST:
        return rel in HIST[repo]
    # a worktree of one of the two repos: try both indexes
    return rel in HIST["Web-modules"] or rel in HIST["OkamAPI-modules"]


for r in rows:
    r["src2"] = "plan.md" if r["src"] == "plan.md" else "returns"
    if r["kind"] == "path" and r["klass"] in ("untracked-not-ignored", "ignored-by-git"):
        r["hist"] = in_history(r["detail"])

RESOLVABLE = {"tracked", "in-tree-not-on-disk", "resolvable-untracked-dir",
              "in-cited-commit"}
UNRESOLVABLE = {"absent", "bare-filename", "elided-as-written",
                "dangling", "not-a-commit", "ref-absent"}

out = []
w = out.append

w("# L-EVIDENCE-CITATIONS-RESOLVE — can the evidence this plan cites still be found?")
w("")
NRET = len([f for f in os.listdir(os.path.join(
    os.path.dirname(os.path.dirname(LANE)), "docs/plan/returns")) if f.endswith(".md")])
NBRIEF = len(os.listdir(os.path.join(
    os.path.dirname(os.path.dirname(LANE)), "docs/plan/briefs")))

w("Read-only census. Nothing repaired, nothing committed, no containers, no pushes.")
w("Every count below is reproducible with `python3 census.py` then `python3 report.py`")
w("from `/Users/svendaneel/okam/Web-modules`.")
w("")
w("**Snapshot.** Other lanes were writing returns while this ran, so the totals are as of this")
w("pass; `census.py` is re-runnable to refresh them.")
w("")
w("## 0. The instrument, validated before its zeros were believed")
w("")
w("`F-EMPTY-GREP-READS-AS-ABSENCE` is the defect this lane could most easily have committed")
w("inside the lane measuring citations, so the detector was shown to fire on known cases in")
w("both directions before any total was reported.")
w("")
w("| control | expected | detector said |")
w("|---|---|---|")
w("| `e34977a` (web HEAD) | on a ref | `on-ref` |")
w("| `82127eb` (`lane/jest-collects-lanes`) | on a ref | `on-ref` |")
w("| `8e2b57de` (backend integration) | on a ref | `on-ref` |")
w("| `cbb5a98` (orchestrator's dangling case) | on **no** ref | `worktree-head-only` |")
w("| `deadbee`, `abcdef1234` | no such object | `not-a-commit` |")
w("| `artifacts/journeys/modal-scroll-lock.playwright.json` | present, force-added past ignore | `tracked` |")
w("| `artifacts/journeys/NOPE-does-not-exist.json` | absent | `absent` |")
w("| `jest.config.js` | present, tracked, edit not in HEAD | `tracked-dirty` |")
w("| `docs/plan/plan.md` in history index | (unknown) | **not in any commit** |")
w("| `jest.config.js` in history index | present | present — index fires |")
w("")
w("The `cbb5a98` row is the one that matters most: the orchestrator reported it as *dangling*,")
w("and it is more precisely **reachable from a detached worktree HEAD** (`web-jestlanes`) while")
w("on no ref. `git for-each-ref --contains` returns nothing for it, which is true but incomplete —")
w("the commit is pinned by a worktree and would survive until that worktree is removed. Scoring")
w("it as plain `dangling` would have understated its survivability; scoring it `on-ref` would have")
w("overstated it. It needs its own class, and it has one.")
w("")
w("Refs were enumerated across **both** namespaces the orchestrator named: `refs/heads` (98 web /")
w("315 backend), `refs/lanes` (4), `refs/salvage` (8), plus remotes and tags — 119 web and 339")
w("backend refs, closing over 496 and 3012 commits. Worktree HEADs were enumerated separately")
w("(82 web, 315 backend) so that worktree-pinned commits are not scored as dangling.")
w("")
w("## 1. Scope — what counts as a citation")
w("")
w("Two sources, because lanes cite evidence in two places and the orchestrator's own calibration")
w("case lives in the second:")
w("")
w("- `docs/plan/plan.md` — 323 `### Lane` blocks, 257 carrying an `evidence:` field, 276 lines.")
w("- `docs/plan/returns/*.md` — %d RETURN files, covering %d distinct lanes that carry an"
  % (NRET, len(set(r["lane"] for r in rows if r["src2"] == "returns"))))
w("  `evidence:` field.")
w("")
w("%d evidence lines, tokenised into **%d citations**: filesystem paths, commit ids, branch"
  % (len(set((r["src"], r["line"], r["raw"][:40]) for r in rows)), len(rows)))
w("refs and `fact:` keys. `cbb5a98` is cited in *return prose* (`L-COLLECTED-PATHS-1.md`,")
w("`L-JEST-COLLECTS-LANES-1.md`) and **not** in any `evidence:` field — worth stating, because a")
w("census scoped to `plan.md` alone would have missed the very case used to calibrate it.")
w("")

# ---- counts
w("## 2. Counts")
w("")
w("| kind | class | plan.md | returns | verdict |")
w("|---|---|---:|---:|---|")
VERDICT = {
    "tracked": "resolvable",
    "in-tree-not-on-disk": "resolvable",
    "in-cited-commit": "resolvable via the commit the same line cites",
    "third-repo": "resolves in a third repository (Core)",
    "wrong-path-same-repo": "**file exists, pointer wrong**",
    "elsewhere-in-estate": "**exists only in an unmerged worktree**",
    "resolvable-untracked-dir": "resolvable",
    "tracked-dirty": "resolvable, content at risk",
    "ignored-by-git": "**ignored-by-git**",
    "untracked-not-ignored": "**would not survive a clone**",
    "absent": "**absent**",
    "bare-filename": "unresolvable as written",
    "elided-as-written": "unresolvable as written",
    "on-ref": "resolvable",
    "worktree-head-only": "worktree-pinned, on no ref",
    "dangling": "**dangling**",
    "not-a-commit": "**absent**",
    "ref-exists": "resolvable",
    "ref-absent": "**absent**",
    "fact-cited": "resolvable",
    "fact-undefined": "**absent**",
}
order = ["tracked", "in-tree-not-on-disk", "in-cited-commit",
         "resolvable-untracked-dir", "tracked-dirty",
         "ignored-by-git", "untracked-not-ignored", "absent", "bare-filename",
         "elided-as-written", "wrong-path-same-repo", "elsewhere-in-estate",
         "on-ref", "worktree-head-only", "dangling",
         "not-a-commit", "third-repo", "ref-exists", "ref-absent", "fact-cited",
         "fact-undefined"]
cnt = collections.Counter((r["kind"], r["klass"], r["src2"]) for r in rows)
kinds = {}
for (k, c, s), n in cnt.items():
    kinds.setdefault((k, c), {})[s] = n
for k in ("path", "commit", "ref", "fact"):
    for c in order:
        if (k, c) in kinds:
            d = kinds[(k, c)]
            w("| %s | `%s` | %d | %d | %s |" % (k, c, d.get("plan.md", 0),
                                                d.get("returns", 0), VERDICT.get(c, "")))
w("")

tot = collections.Counter()
for r in rows:
    if r["klass"] in RESOLVABLE or r["klass"] in ("on-ref", "ref-exists", "fact-cited"):
        tot["resolvable"] += 1
    elif r["klass"] == "tracked-dirty":
        tot["resolvable-content-at-risk"] += 1
    elif r["klass"] == "ignored-by-git":
        tot["ignored-by-git"] += 1
    elif r["klass"] == "untracked-not-ignored":
        tot["untracked-never-committed"] += 1
    elif r["klass"] == "worktree-head-only":
        tot["worktree-pinned"] += 1
    elif r["klass"] == "third-repo":
        tot["third-repo"] += 1
    elif r["klass"] in ("wrong-path-same-repo", "elsewhere-in-estate"):
        tot["resolvable-but-not-where-cited"] += 1
    else:
        tot["unresolvable"] += 1
n = len(rows)
w("**Headline.** Of %d citations:" % n)
w("")
for k in ("resolvable", "resolvable-but-not-where-cited",
          "resolvable-content-at-risk", "worktree-pinned",
          "third-repo", "ignored-by-git", "untracked-never-committed",
          "unresolvable"):
    if tot[k]:
        w("- **%d (%.0f%%) %s**" % (tot[k], 100.0 * tot[k] / n, k.replace("-", " ")))
w("")

# ---- the three flags
w("## 3. The two flags, answered")
w("")
w("### F-EVIDENCE-GITIGNORED — yes, and it is concentrated in the most load-bearing class")
w("")
ign = [r for r in rows if r["klass"] == "ignored-by-git"]
w("**%d citations (%d distinct paths) name a path git ignores.** The cause is one line —" %
  (len(ign), len(set(r["token"] for r in ign))))
w("the `artifacts/` rule in the `Web-modules` working-tree `.gitignore` is unanchored, so it")
w("matches at **any** depth:")
w("`artifacts/journeys/…` at the repo root and `lanes/<LANE>/artifacts/…` inside a lane directory")
w("alike. The backend repo does **not** ignore `artifacts/`, which is why backend receipts")
w("(`artifacts/tests/<sha>/RUN.md`) resolve and frontend captures do not.")
w("")
w("What lands in that bucket is the browser-journey capture — `artifacts/journeys/*.playwright.json`")
w("and its screenshots. That is the evidence class C5 acceptance rests on, and the artifact")
w("`L-JOURNEY-HARNESS` exists to produce.")
w("")
w("**This is policy, not an accident, and the census should not pretend otherwise.** The rule is")
w("deliberate — journey files are the output of a run, and tracking every run would put merge")
w("conflicts on test output. A concurrent lane is, while this ran, editing `.gitignore` to write")
w("that reasoning down and to name the exception: **16 files under `artifacts/` are force-added**")
w("(`modal-scroll-lock`, `modal-estate-scroll-lock`, `workforce-invitation-onboarding`,")
w("`growth-guest-lifecycle`, `growth-testsend-refusal`) precisely because those lanes' exits name")
w("the capture file itself.")
w("")
w("So the finding is not \"the ignore is wrong\". It is: **%d citations name captures on the wrong"
  % len(ign))
w("side of that exception** — an exit that depends on a specific capture, whose capture is")
w("regenerate-or-absent. A checker that read `.gitignore` without checking tracked-ness first")
w("would also have misscored all 16 deliberate exceptions as lost, which is why tracked-ness is")
w("tested before ignore status throughout this census.")
w("")
w("### F-COMMIT-TREE-LEAVES-NO-REF — one lane, and the work behind it is not lost")
w("")
com = [r for r in rows if r["kind"] == "commit"]
cc = collections.Counter(r["klass"] for r in com)
w("Of **%d commit ids** cited across both sources, **%d resolve and sit on a ref**. The"
  % (len(com), cc["on-ref"]))
w("remainder is three citations, and each is a different thing:")
w("")
w("- **`f176db85` — the one genuinely dangling commit.** Cited by `L-EV-SEED-DEPOSITS`")
w("  as `lane/ev-seed-deposits f176db85`. The object exists, `git")
w("  for-each-ref --contains` returns nothing, and `git log --all` does not reach it. The branch")
w("  has since moved to `caee6ae3`. **The work is not lost**: the commit message *\"The demo seed")
w("  provisions the flag the deposit route now gates on\"* is present on the branch as")
w("  `7a6d9798`, so the lane was amended or rebased and the citation was never updated. Dead")
w("  citation, live work — and, per the orchestrator's `cbb5a98` lesson, those are two findings,")
w("  not one. Repair is one id. **Consequence is low**: that lane returned `verdict: fail-spec`")
w("  and stands at `state: open`, so no finished-work claim rests on the dead id. Had it been a")
w("  `built` lane this would be the most serious finding in the census; it is not, and saying so")
w("  is the difference between a census and an alarm.")
w("- **`8931bc39` — a third repository.** Cited by `L-MEALS-FUNDED` as `core@8931bc39`,")
w("  a `Core` submodule pointer. It resolves in `/Users/svendaneel/okam/Core`. Not absent, just")
w("  outside the two repositories this plan spans.")
w("- **`cd1cc86` — the only id that resolves nowhere**, cited on the same line as its sibling")
w("  above (`L-MEALS-FUNDED`, `verdict: fail-spec` yet `state: verified` in `plan.md` — a")
w("  mismatch this lane records but does not rule on). Also a `Core` submodule pointer, and")
w("  the local `Core` checkout does not have it;")
w("  it may exist only on the remote. It is the single citation in %d that could not be" % len(rows))
w("  dereferenced anywhere at all.")
w("")
w("No cited commit was worktree-pinned-only, though the detector demonstrably finds that state")
w("(`cbb5a98`). **The commit-citation discipline in this plan is sound** — this is the doubt")
w("that closes cheaply, and it closes clean. `F-COMMIT-TREE-LEAVES-NO-REF` describes exactly")
w("one lane.")
w("")

# ---- fourth column ruling
w("## 4. The fourth and fifth columns — the brief asked, and both earn a place")
w("")
dirty = [r for r in rows if r["klass"] == "tracked-dirty"]
w("The brief proposed three classes and asked whether the working-tree-only case deserves a fourth.")
w("It does, and measuring forced a fifth that is larger than either.")
w("")
w("**Fourth — `tracked-dirty` (%d citations).** Cited, present on disk, tracked, and the cited" % len(dirty))
w("content is a working-tree edit `HEAD` does not carry. `jest.config.js` is the named case and the")
w("detector reproduces it. One `git checkout --` erases the evidence while every reachability check")
w("still reads green. It is not ignored, not absent, and not safe.")
w("")
unt = [r for r in rows if r["klass"] == "untracked-not-ignored"]
unt_hist = sum(1 for r in unt if r.get("hist"))
w("**Fifth — `untracked-not-ignored` (%d citations, %d distinct paths).** On disk, *not* ignored," %
  (len(unt), len(set(r["token"] for r in unt))))
w("simply never committed. Consequence identical to the gitignored case — a fresh clone has nothing —")
w("but cause and repair differ entirely, so reporting them as one number would be wrong. Only **%d**"
  % unt_hist)
w("of these paths appear anywhere in either repository's reachable history.")
w("")
w("**This is the largest finding in the census, and it includes the plan itself.**")
w("`git status` reports `?? docs/plan/` — the whole hub is untracked, and `docs/plan/plan.md`")
w("appears in **no reachable commit** in the web repo (the history index was proved to fire on")
w("`jest.config.js` first). So `plan.md`, all %d returns, %d briefs and 22 reviews are"
  % (NRET, NBRIEF))
w("working-tree-only. **%d citations point into `docs/plan/` itself**, including the six module"
  % sum(1 for r in rows if r["kind"] == "path" and "/docs/plan/" in r["detail"]))
w("review documents that six lanes name as their sole evidence.")
w("")
w("A pull request opened from `feature/restaurant-modules` today would carry neither the plan that")
w("describes the work nor the reviews that signed it off. That is worth knowing before the PR, which")
w("is the reason the brief gave for running this lane at all.")
w("")

# ---- cross-repo
w("## 5. Cross-repo — the crisis that would have been manufactured")
w("")
w("`F-CROSS-REPO-EVIDENCE-UNVERIFIABLE` is real, and it is the single largest source of error in")
w("this measurement. A checker resolving only against the two repository roots scores **238 paths")
w("absent**. Every refinement below is a *correction to the instrument*, not a repair to the plan,")
w("and each was forced by hand-checking a result that looked wrong:")
w("")
w("| refinement | absent after |")
w("|---|---:|")
w("| naive: two repo roots only | 238 |")
w("| resolve against worktrees named on the same evidence line, and the lane's own dir | 79 |")
w("| expand `lanes/X/{a,b,c}.txt` keeping the suffix after `}` | 47 |")
w("| dereference the tree of a commit the same line cites | 34 |")
w("| check `docs/plan/lanes/` where the citation says `lanes/` | 16 |")
w("| check sibling checkouts at the same relative path | **3** |")
w("")
w("**238 → 3.** A census that stopped at the first row would have reported that roughly a quarter")
w("of this plan's evidence points at nothing. That claim would have been false, and it is the")
w("specific failure the brief warned against: manufacturing a crisis out of a path convention.")
w("")
w("The brace bug is worth naming because it was invisible to inspection and only hand-checking the")
w("top-ranked result exposed it: `lanes/L-FE-WF-ONBOARD-WALK/{mutation-proof,run-1,...}.txt` puts")
w("the extension **after** the closing brace, so an expander that drops the suffix turns six")
w("existing, tracked files into six absent citations — and they ranked first by consequence.")
w("")
w("The worked example: `L-WF-W5-TIMESHEET` cites `lanes/L-WF-W5-TIMESHEET/evidence.md` and, in the")
w("same line, `worktree ~/okam/wt-wfw5`. Against the plan root that path is absent; inside the")
w("worktree it is **tracked**. Same string, opposite verdicts.")
w("")
w("The backend checkout was treated as the orchestrator warned: `OkamAPI-modules` has")
w("`lane/meals-grace-pins` (`34c6c103`) checked out, not the integration branch, so backend paths")
w("missing from disk were additionally resolved **by object** against")
w("`refs/heads/feature/restaurant-modules` (`8e2b57de`) rather than by reading the working tree.")
w("That is what the `in-tree-not-on-disk` class records (11 citations): present in git, absent from")
w("this checkout, and wrongly scorable as lost.")
w("")

# ---- unresolvable list
w("## 5b. Two findings that are not absence, and are still worth repairing")
w("")
wp = sorted(set(r["token"] for r in rows if r["klass"] == "wrong-path-same-repo"))
el = sorted(set(r["token"] for r in rows if r["klass"] == "elsewhere-in-estate"))
w("**`wrong-path-same-repo` (%d citations, %d distinct).** The plan hub keeps these lane"
  % (sum(1 for r in rows if r["klass"] == "wrong-path-same-repo"), len(wp)))
w("directories at `docs/plan/lanes/<LANE>/` while the citation says `lanes/<LANE>/`. The evidence")
w("exists and is one path segment from where the reader is sent:")
w("")
for t in wp:
    w("- `%s` → actually at `docs/plan/%s`" % (t, t))
w("")
w("**`elsewhere-in-estate` (%d citations, %d distinct).** These resolve at the same relative path"
  % (sum(1 for r in rows if r["klass"] == "elsewhere-in-estate"), len(el)))
w("in a sibling checkout the citation never names — almost always the lane's own unmerged")
w("worktree. `Web-modules/lanes/L-COERCION-WRITE-PATHS/` is the sharp case: the directory exists")
w("on the integration branch and is **empty**, while `web-coercwrite` holds `mutation-log.md`,")
w("`mutation-proof.py` and `mutation-proof.txt`. A reader who checks the cited path finds a")
w("directory and concludes the evidence is there. It is not — it is on a branch that has not")
w("landed. This is the quietest failure in the census: not a broken link, a hollow one.")
w("")
for t in el:
    w("- `%s`" % t)
w("")
w("## 6. The unresolvable list, ranked by consequence")
w("")
w("Load-bearing = a citation a reader would rely on to believe something was built. Ranked by the")
w("state of the citing lane: `verified` (asserts a person completed the journey) outranks")
w("`built-unverified`, which outranks `open`/`running` (where a missing scratch file costs nothing).")
w("")
unres = [r for r in rows if r["klass"] in UNRESOLVABLE]
rank = {"verified": 0, "return:built": 1, "built-unverified": 2,
        "return:fail-spec": 3, "return:blocked": 3, "running": 4, "open": 5}
unres.sort(key=lambda r: (rank.get(r["state"], 9), r["lane"], r["token"]))
w("**%d unresolvable citations across %d lanes.** Full list:" %
  (len(unres), len(set(r["lane"] for r in unres))))
w("")
w("| lane | state | src | kind | citation | why |")
w("|---|---|---|---|---|---|")
for r in unres:
    w("| `%s` | %s | %s | %s | `%s` | %s |" % (
        r["lane"], r["state"], r["src2"], r["kind"],
        r["token"][:70], r["klass"]))
w("")

# ---- load bearing summary
w("## 7. Which unresolvable citations are load-bearing")
w("")
lb = [r for r in unres if r["state"] in ("verified", "return:built", "built-unverified")]
w("**%d of %d** unresolvable citations sit behind a lane that asserts finished work" %
  (len(lb), len(unres)))
w("(`verified`, `built-unverified`, or a return with `verdict: built`).")
w("")
kc = collections.Counter(r["klass"] for r in unres)
w("**But read the composition before reading that as alarm.** Of the %d unresolvable: %d are"
  % (len(unres), kc["bare-filename"] + kc["elided-as-written"]))
w("**under-specified rather than missing** — a bare filename with no directory (`base.trx`,")
w("`api.log`, `print-preview.pdf`) or author shorthand that was never a literal path")
w("(`.../3cf288fb.../RUN.md`, `state-A..E.txt`). %d name a file that exists nowhere, and %d are"
  % (kc["absent"], kc["dangling"] + kc["not-a-commit"]))
w("commit ids. So the honest reading is: **almost nothing in this plan points at lost evidence;")
w("a modest number of citations are written too loosely to dereference without knowing which")
w("worktree the author was standing in.** That is a writing-convention defect, not a data-loss")
w("one, and it is cheap to fix — but it is not nothing, because a reviewer cannot check them.")
w("")
byl = collections.Counter(r["lane"] for r in lb)
for lane, k in byl.most_common(15):
    st = next(r["state"] for r in lb if r["lane"] == lane)
    toks = sorted(set(r["token"] for r in lb if r["lane"] == lane))
    w("- **`%s`** (%s) — %d: %s" % (lane, st, k, ", ".join("`%s`" % t[:46] for t in toks[:4])))
w("")
w("## 8. What this lane did not do")
w("")
w("Not one citation was repaired. Several repairs are not a clerk's to make: whether `docs/plan/`")
w("and `artifacts/journeys/` *should* be committed is a decision about what this repository is for,")
w("and the `artifacts/` ignore rule is load-bearing for build output even though it swallows")
w("evidence. Both belong to a later lane with an owner.")

open(os.path.join(LANE, "citations.md"), "w").write("\n".join(out) + "\n")
print("wrote citations.md  (%d lines)" % len(out))
print("unresolvable=%d load-bearing=%d" % (len(unres), len(lb)))
for k in ("resolvable", "resolvable-but-not-where-cited",
          "resolvable-content-at-risk", "worktree-pinned",
          "third-repo", "ignored-by-git", "untracked-never-committed",
          "unresolvable"):
    print("  %-28s %4d" % (k, tot[k]))
