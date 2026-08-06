#!/usr/bin/env python3
"""Emit keys.md from verdict.json / keys.json / mergesim.json. Read-only over git."""
import json
import collections

R = "/Users/svendaneel/okam/Web-modules"
LD = f"{R}/lanes/L-TRANSLATIONS-COLLISION"
PATHS = ["translations/no.ts", "translations/en.ts", "translations/de.ts"]
LOC = {"translations/no.ts": "no", "translations/en.ts": "en", "translations/de.ts": "de"}

K = json.load(open(f"{LD}/keys.json"))
V = json.load(open(f"{LD}/verdict.json"))
verdict, removed = V["verdict"], V["removed"]
AB = json.load(open(f"{LD}/aheadbehind.json"))
BK = json.load(open(f"{LD}/basekeys.json"))
SIM = json.load(open(f"{LD}/mergesim.json"))
CLS = json.load(open(f"{LD}/branchclass.json"))

o = []
w = o.append


def esc(s):
    return s.replace("|", "\\|").replace("\n", " ")


w("# L-TRANSLATIONS-COLLISION — key-level collisions in `translations/{no,en,de}.ts`")
w("")
w("**Read only. Nothing was resolved, and no sentence was chosen.** Every command was `git")
w("for-each-ref`, `cat-file`, `merge-base`, `rev-list`, `merge-file -p` (stdout only) or `grep`.")
w("No ref was written, no worktree created, no container started, nothing in the shared checkout")
w("changed. The only files written are in this lane directory.")
w("")
w("## The answer first")
w("")
w("**Almost nothing collides.** The 46-lane / 43-variant figure is a *file*-level count and it does")
w("not survive contact with the keys. Of **1,911 distinct keys added across all refs**, **1,321 are")
w("added by exactly one ref**, and of the 590 added by two or more, **543 are byte-identical** —")
w("the same lane's commits seen from several descendant branches. Genuine **branch-vs-branch**")
w("disagreements number **47 in `no`, 44 in `en`, 48 in `de`**; a further **24 / 25 / 50** disagree")
w("with the baseline rather than with another lane. And even those collapse into **19 / 20 / 21")
w("distinct disagreements**, because the rivals differ in blocks — one lane reworded a whole")
w("surface. `de` carries 25 extra baseline disagreements from `feature/swiss` alone, a long-lived")
w("branch 146 commits behind, not a lane.")
w("")
w("**And the sharp part is not in that list at all.** Nine of 87 simulated file merges produce")
w("**no conflict and a duplicate key** — git auto-merges, the object literal ends up carrying the")
w("key twice, and JavaScript takes the last one. That is the silent last-writer-wins, and §4 below")
w("proves it mechanically rather than asserting it.")
w("")
w("## As-of, denominator, and what was counted")
w("")
w("| | |")
w("|---|---|")
w(f"| repo | `{R}` |")
w("| baseline `HEAD` | `e34977acebd59b223584158c33451b6f1ffd82c1` (`feature/restaurant-modules`) |")
w("| **as-of** | **2026-08-05T03:06Z**, refs enumerated at `lanes/L-TRANSLATIONS-COLLISION/refs.txt` |")
w(f"| refs enumerated | **117** = 108 `refs/heads` + 9 `refs/lanes` |")
w("| claimants analysed | **118** = 117 refs + the **working tree**, counted and labelled `WORKING-TREE` |")
w("| baseline key counts | `no` 4,817 · `en` 4,782 · `de` 4,782 |")
w("| parse failures | **0** across 118 claimants × 3 files |")
w("")
w("Both ref namespaces were enumerated. The count did move: the census that raised this lane saw")
w("107 then 108 heads; at this lane's as-of it is **108 heads + 9 lanes = 117**. `refs/salvage` and")
w("`refs/remotes` were *not* included — they are not lane work and the brief names lanes.")
w("")
w("**The working tree was counted as a 47th claimant, not as the truth.** All three files are")
w("` M` in the shared checkout. It authors 348 keys, 9–11 of them divergent, and it is named in")
w("every table below exactly like a branch. `core/translations/{no,en,de}.ts` exist but are **clean**")
w("and are a different, 406-key dictionary — out of scope, and not the files the census counted.")
w("")
w("### Method, and why a file diff is the wrong instrument")
w("")
w("Each file is a flat `export default { key: 'value', ... }` — one entry per line, no nesting, at")
w("every ref. They were **parsed, not diffed**: `extract.py` tokenises each line into `(key, value")
w("literal)` and normalises quoting and backslash escapes, so `'a'` and `\"a\"` are the same value.")
w("Any line it cannot parse is reported, not dropped — **zero lines were unparsed anywhere**.")
w("")
w("For each claimant the base is `merge-base(ref, e34977ac)`, so *added* means authored by that")
w("branch rather than inherited. Baseline is then added as a claimant for keys it already holds, so")
w("a lane that disagrees with the tip is visible alongside lanes that disagree with each other.")
w("")
w("**Method validated on the known positive before any negative was reported.** `wfr_access_no_list`")
w("resolves to exactly one remover — `lane/fe-wf-invite-list-revoke` — in all three locales, which is")
w("the case the brief supplied. **Removal is carried as a third class throughout.**")
w("")

# ---- headline table ---------------------------------------------------------
w("## 1. Counts per locale")
w("")
w("| | `no.ts` | `en.ts` | `de.ts` |")
w("|---|---|---|---|")
rowdefs = []
for p in PATHS:
    add = K["keys"][p]["added"]
    one = sum(1 for k, bv in add.items() if len(bv) == 1)
    multi = len(add) - one
    vd = verdict[p]
    div = sum(1 for x in vd.values() if x["verdict"] == "DIVERGENT")
    divb = sum(1 for x in vd.values() if x["verdict"] == "DIVERGENT" and x["in_baseline"])
    rowdefs.append((len(add), one, multi, div - divb, divb, len(K["keys"][p]["modified"]),
                    len(K["keys"][p]["removed"])))
labels = ["keys **added** by ≥1 claimant", "…added by exactly one claimant",
          "…added by two or more", "**DIVERGENT — branch vs branch**",
          "**DIVERGENT — claimant vs baseline**", "keys **modified** (value changed in place)",
          "keys **removed**"]
for i, lab in enumerate(labels):
    w(f"| {lab} | {rowdefs[0][i]} | {rowdefs[1][i]} | {rowdefs[2][i]} |")
w("")
w("The added key **sets are identical across all three locales** — verified, not assumed: every")
w("claimant that adds a key adds it to `no`, `en` and `de` in the same commit. **No branch makes a")
w("partial addition.** The locale asymmetry in the divergent counts is entirely translation")
w("wording, not missing keys.")
w("")

# ---- divergences ------------------------------------------------------------
w("## 2. The divergences, grouped by who disagrees")
w("")
w("Rival groups, largest first. A group is one disagreement; the keys in it move together.")
w("`behind` is commits behind the baseline tip.")
w("")
for p in PATHS:
    div = {k: x for k, x in verdict[p].items() if x["verdict"] == "DIVERGENT"}
    groups = collections.defaultdict(list)
    for k, x in div.items():
        sig = tuple(sorted(tuple(sorted(bs)) for bs in x["variants"].values()))
        groups[sig].append(k)
    w(f"### `{p}` — {len(div)} divergent keys in {len(groups)} disagreements")
    w("")
    w("| keys | side A | side B |")
    w("|---:|---|---|")
    for sig, ks in sorted(groups.items(), key=lambda t: (-len(t[1]), t[0])):
        sides = []
        for s in sig:
            parts = []
            for b in s:
                if b in ("BASELINE(e34977ac)", "WORKING-TREE"):
                    parts.append(f"**{b}**")
                else:
                    parts.append(f"`{b}` (behind {AB.get(b, {}).get('behind', '?')})")
            sides.append("<br>".join(parts))
        while len(sides) < 2:
            sides.append("")
        w(f"| {len(ks)} | {sides[0]} | {' ‖ '.join(sides[1:])} |")
    w("")

# ---- full divergent listing -------------------------------------------------
w("## 3. Every divergent key, with both sentences")
w("")
w("**Not resolved.** Which sentence wins is an authoring judgement and several of these are")
w("money-facing or statutory. The list is the deliverable; the choice is not this lane's.")
w("")
for p in PATHS:
    div = {k: x for k, x in verdict[p].items() if x["verdict"] == "DIVERGENT"}
    w(f"### `{p}` ({len(div)})")
    w("")
    for k in sorted(div):
        x = div[k]
        w(f"#### `{k}`")
        w("")
        for val, bs in x["variants"].items():
            holders = ", ".join(f"`{b}`" if b not in ("BASELINE(e34977ac)", "WORKING-TREE")
                                else f"**{b}**" for b in bs)
            w(f"- {holders}")
            w(f"  > {esc(val)}")
        w("")

# ---- silent merges ----------------------------------------------------------
w("## 4. The silent case, proven: merges with no conflict and a duplicate key")
w("")
w("Each unmerged lane holding a divergent key was merged against the composition tip")
w("`candidate/fe-compose-2026-08-05` using `git merge-file -p --diff3` on the three blobs — the")
w("same file-level algorithm git uses, run to stdout, writing nothing. **87 file merges: 33")
w("conflict (loud, and therefore safe), 45 merge clean with no duplicate, and 9 merge clean while")
w("leaving the key in the object literal twice.** In a JS object literal the *later* entry wins at")
w("runtime, and there is no conflict, no error and no signal.")
w("")
w("**Which side wins is decided by line position, not by which side is incoming** — and the two")
w("money-facing cases go opposite ways. For `fe-events-margin-surfaces` the incoming lane's")
w("sentence lands later and wins; for `mrg-waste-frontend` the composition's sentence lands later")
w("and the incoming lane's is the one that dies. Nothing about the merge expresses a preference:")
w("the surviving sentence is whichever the alphabetical slot happened to put second.")
w("")
w("Validated on a positive before reporting: the merged output for")
w("`fe-events-margin-surfaces × no.ts` contains `mrgs_err_projection_behind` at **lines 3680 and")
w("3692**, zero `<<<<<<<` markers, and a control key (`aIQueryBox_title`) exactly once.")
w("")
w("| lane | locale | key | value that LOSES (earlier) | value that WINS (later) |")
w("|---|---|---|---|---|")
for x in SIM:
    if not x["dups"]:
        continue
    for k, (first, later) in x["dups"].items():
        w(f"| `{x['lane']}` | `{LOC[x['path']]}` | `{k}` | {esc(first[:150])} | {esc(later[:150])} |")
w("")
w("Three lanes, four keys, all three locales:")
w("")
w("- **`lane/fe-events-margin-surfaces`** — `mrgs_err_projection_behind` and")
w("  `mrgs_err_projection_behind_unsized`. The two variants are not paraphrases: one says the week")
w("  **was not frozen**, the other says the figures **are a floor, real but short by an unknown")
w("  amount**. Those describe different outcomes of the same money path, and the merge picks one")
w("  without anyone deciding.")
w("- **`lane/mrg-waste-frontend`** — `mrgs_waste_err_quantity`. One variant tells the operator a")
w("  quantity must be **greater than zero, at most six decimals, no unit**; the other tells them")
w("  the field may be **left empty**. A validation contract, stated two ways.")
w("- **`lane/fe-wf-self`** — `nav_growth_privacy`. Duplicate key, **identical value** in all three")
w("  locales. Harmless to the sentence; still a duplicate entry in the literal.")
w("")
w("**No ref currently carries a duplicate key.** All 118 claimants × 3 files were scanned: zero")
w("duplicates anywhere today. The mechanism is latent, not fired.")
w("")

# ---- removals ---------------------------------------------------------------
w("## 5. Removals")
w("")
w("| key | locales | removed by |")
w("|---|---|---|")
allrem = sorted({k for p in PATHS for k in removed[p]})
for k in allrem:
    locs = "".join(LOC[p] + " " for p in PATHS if k in removed[p]).strip()
    brs = ", ".join(f"`{b}`" for b in removed[PATHS[0]].get(k, removed[PATHS[1]].get(k, [])))
    w(f"| `{k}` | {locs} | {brs} |")
w("")
w("Each key is removed from all three locales together, by the claimants named on its row.")
w("")
w("**Three of the four are re-added by a different lane, so removal is a live collision class, not")
w("bookkeeping.** This is the case the brief flagged, and the control key turns out to be in it:")
w("")
w("| key | removed by | re-added by | value vs the removed one |")
w("|---|---|---|---|")
w("| `mrg_margin_label` | `lane/margin-menu-margin-ui` | `lane/margin-recipes` | absent from baseline — a **resurrection** |")
w("| `mrg_margin_unavailable` | `lane/margin-menu-margin-ui` | `lane/margin-recipes` | absent from baseline — a **resurrection** |")
w("| `wfr_access_no_list` | `lane/fe-wf-invite-list-revoke` | `lane/fe-wf-onboard`, `lane/fe-wf-self` | **identical** to the baseline value |")
w("| `wfrt_att_no_correction_ui` | `candidate/fe-compose-2026-08-05`, `lane/collect-review-conditions`, `lane/journey-workforce`, `lane/wf-adjust-address` | — | no re-adder |")
w("")
w("**All four remove/add races conflict rather than resolving silently** — simulated the same way")
w("as §4: `margin-menu-margin-ui × margin-recipes`, `fe-wf-invite-list-revoke × fe-wf-onboard`,")
w("`fe-wf-invite-list-revoke × fe-wf-self` and `fe-compose × margin-recipes` each return a conflict.")
w("Whoever resolves them still has to decide whether the key comes back, but git will stop and ask.")
w("`mrg_margin_label` and `mrg_margin_unavailable` are gone from the baseline (last touched by")
w("`0768750`), so `lane/margin-recipes` merging would reintroduce two keys mainline no longer has.")
w("")

# ---- cross-locale gap -------------------------------------------------------
no, en, de = (set(BK[p]) for p in PATHS)
w("## 6. The partial-addition finding — 35 keys already degrade to Norwegian")
w("")
w("No *branch* makes a partial addition (§1). **The baseline does.** At `e34977ac`, `no.ts` holds")
w(f"**{len(no)}** keys and `en.ts`/`de.ts` hold **{len(en)}** each: **{len(no - en)} keys exist in")
w("Norwegian only**, and the `en` and `de` key sets are identical to each other.")
w("")
w("`utils/i18n.js` resolves `active locale → no → en → de → the key itself`. So a key missing from")
w("`en.ts` does not error and does not show the key — **an English or German operator is served the")
w("Norwegian sentence**, silently. `plugins/i18n.js` states the same order in its header comment.")
w("")
w("Twenty of the 35 are VAT-facing (`posset_goods_*`, `products_vat*`, `products_goodsGroup*`),")
w("including `posset_goods_profile_reprice`, which warns that changing rates **re-prices future")
w("sales**. That warning currently reaches a German operator in Norwegian.")
w("")
w("| key | Norwegian value |")
w("|---|---|")
for k in sorted(no - en):
    w(f"| `{k}` | {esc(BK[PATHS[0]][k][:160])} |")
w("")

# ---- statutory --------------------------------------------------------------
w("## 7. The statutory string, and why it is not a C6 flag")
w("")
w("`wfpl_identity_gap` names **bokføringsforskriften § 8-5-6** on screen and is divergent:")
w("`lane/wf-idreg`, `lane/wf-kodeoversikt-ui` and both composition branches assert the code register")
w("**is downloaded from the personalliste page, pre-filled**, where the baseline asserts Okam")
w("**keeps no such register** and the venue must produce it. Those are opposite claims about the")
w("product, not wording.")
w("")
w("**The claiming side is backed.** On `lane/wf-kodeoversikt-ui` and")
w("`candidate/fe-compose-2026-08-05` the artifact has a producer:")
w("`pages/admin/workforce-personnel-list.vue`, `utils/workforce/personnel-list-client.js` and")
w("`utils/workforce/api-client.js`. C6 is satisfied on that branch. **The hazard is the reverse**:")
w("if the baseline sentence wins the merge, a venue that *can* download the register is told it")
w("cannot. Either way this is an authoring decision with a statutory consequence and is left open.")
w("")

# ---- full index -------------------------------------------------------------
w("## 8. Full index — every key added by any claimant")
w("")
w("All 1,911 added keys. `verdict` is over the three locales jointly: **DIVERGENT** if any locale")
w("diverges, **identical** if two or more claimants agree, **sole** if only one claimant adds it")
w("and the baseline does not hold it. `n` is the number of authoring claimants.")
w("")
w("| key | n | verdict | claimants |")
w("|---|---:|---|---|")
add = K["keys"][PATHS[0]]["added"]
for k in sorted(add):
    vs = [verdict[p].get(k, {}).get("verdict", "-") for p in PATHS]
    vv = "**DIVERGENT**" if "DIVERGENT" in vs else ("identical" if "identical" in vs else "sole")
    bs = sorted(b.replace("refs/heads/", "").replace("refs/lanes/", "lanes/")
                for b in add[k])
    w(f"| `{k}` | {len(bs)} | {vv} | {', '.join('`'+b+'`' for b in bs)} |")
w("")
w("## Reproduce")
w("")
w("```")
w("python3 lanes/L-TRANSLATIONS-COLLISION/extract.py    # parse every ref, emit keys.json")
w("python3 lanes/L-TRANSLATIONS-COLLISION/analyse.py    # classify, emit verdict.json")
w("python3 lanes/L-TRANSLATIONS-COLLISION/mergesim.py   # merge simulation, emit mergesim.json")
w("python3 lanes/L-TRANSLATIONS-COLLISION/emit.py       # this document")
w("```")
w("")
w("`refs.txt` pins the 117 refs and their tips at the as-of moment. A later run at a newer tip that")
w("disagrees with this document is not thereby wrong — re-derive rather than trust it.")

open(f"{LD}/keys.md", "w").write("\n".join(o) + "\n")
print("keys.md lines:", len(o))
