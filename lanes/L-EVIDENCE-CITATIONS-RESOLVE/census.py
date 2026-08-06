#!/usr/bin/env python3
"""Census of every evidence pointer and commit id cited by a lane in docs/plan/plan.md.

Read-only. Classifies each citation; repairs nothing.
"""
import json, os, re, subprocess, sys
from collections import OrderedDict, defaultdict

OKAM = "/Users/svendaneel/okam"
WEB = os.path.join(OKAM, "Web-modules")
BE = os.path.join(OKAM, "OkamAPI-modules")
LANE = os.path.join(WEB, "lanes/L-EVIDENCE-CITATIONS-RESOLVE")
PLAN = os.path.join(WEB, "docs/plan/plan.md")
BE_INTEGRATION = "refs/heads/feature/restaurant-modules"

SIBLINGS = set(d for d in os.listdir(OKAM) if os.path.isdir(os.path.join(OKAM, d)))


def sh(args, cwd=None):
    p = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr


# ---------------------------------------------------------------- parse plan
def parse_plan():
    lanes = []
    cur = None
    for i, raw in enumerate(open(PLAN, encoding="utf-8").read().split("\n"), 1):
        m = re.match(r"^### Lane (\S+)", raw)
        if m:
            cur = {"lane": m.group(1), "line": i, "state": None, "class": None,
                   "evidence": [], "title": raw}
            lanes.append(cur)
            continue
        if raw.startswith("### ") or raw.startswith("## "):
            cur = None
            continue
        if cur is None:
            continue
        m = re.match(r"^(state|class|owner|pts|agent): (.*)$", raw)
        if m and m.group(1) in ("state", "class"):
            if cur[m.group(1)] is None:
                cur[m.group(1)] = m.group(2).strip()
        if raw.startswith("evidence:"):
            cur["evidence"].append((i, raw[len("evidence:"):].strip()))
    return lanes


def parse_returns():
    """Lane RETURN blocks under docs/plan/returns/ also cite evidence."""
    d = os.path.join(WEB, "docs/plan/returns")
    out = []
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".md"):
            continue
        txt = open(os.path.join(d, fn), encoding="utf-8", errors="replace").read()
        m = re.search(r"^RETURN:\s*(\S+)", txt, re.M)
        lane = m.group(1) if m else fn[:-3]
        v = re.search(r"^verdict:\s*(\S+)", txt, re.M)
        ev = []
        for i, line in enumerate(txt.split("\n"), 1):
            if line.startswith("evidence:"):
                ev.append((i, line[len("evidence:"):].strip()))
        if ev:
            out.append({"lane": lane, "line": 0, "state": "return:" + (v.group(1) if v else "?"),
                        "class": None, "evidence": ev, "src": fn})
    return out


# ------------------------------------------------------------- tokenisation
# A suffix may follow the closing brace: lanes/X/{a,b,c}.txt expands to
# lanes/X/a.txt lanes/X/b.txt lanes/X/c.txt -- dropping the suffix made six
# existing files read as absent, which hand-checking caught.
BRACE = re.compile(r"([~\w./@+-]+)\{([^}{]*)\}([\w./@+-]*)")


def expand_braces(s):
    def rep(m):
        pre, inner, suf = m.group(1), m.group(2), m.group(3)
        return " ".join(pre + p.strip() + suf
                        for p in inner.split(",") if p.strip())
    prev = None
    while prev != s:
        prev = s
        s = BRACE.sub(rep, s)
    return s


SHA = re.compile(r"(?<![0-9a-zA-Z])([0-9a-f]{7,40})(?![0-9a-zA-Z])")
FACT = re.compile(r"fact:([A-Za-z0-9._-]+)")
PATHISH = re.compile(r"(?:~/|\.\./|\./|/)?(?:[\w.@+-]+/)+[\w.@+-]+")
BAREFILE = re.compile(
    r"(?<![\w./-])[\w.@+-]+\.(?:md|txt|json|cs|js|jsx|vue|ts|tsx|trx|pdf|png|jpg|html|"
    r"mjs|cjs|sh|yml|yaml|xml|sql|csv|config|snap|log)(?![\w/])")

REF_PREFIX = ("lane/", "feature/", "prep/", "candidate/", "fix/", "refs/",
              "origin/", "salvage/", "stage0/", "chore/", "integration/",
              "rebrand/", "hotfix/")

# tokens that look path-ish but are prose / ratios / flags
NOISE = re.compile(r"^[\d./]+$")
NOISE_WORDS = {"and/or", "n/a", "N/A", "w/", "either/or", "pass/fail", "red/green",
               "yes/no", "on/off", "he/she", "km/h", "I/O"}


HAS_EXT = re.compile(r"\.[A-Za-z][A-Za-z0-9]{1,6}$")


def classify_token(tok):
    if tok in NOISE_WORDS or NOISE.match(tok):
        return None
    # ratios like 4903/4917, 11/11, skipped/0, suites/2296 are counts, not paths
    parts = tok.split("/")
    if len(parts) == 2 and (parts[0].isdigit() or parts[1].isdigit()) \
            and not HAS_EXT.search(tok):
        return None
    if tok.startswith(REF_PREFIX) and "." not in tok.split("/")[-1]:
        return "ref"
    return "path"


def strip_at(tok):
    """`lane/foo@02f27b95` cites a branch AND a sha; keep only the branch here."""
    return tok.split("@", 1)[0] if "@" in tok else tok


def tokenize(text):
    text = expand_braces(text)
    # strip markdown/backticks/parens around tokens by replacing with spaces
    clean = re.sub(r"[`()\[\]<>\"'*]", " ", text)
    facts = FACT.findall(clean)
    # remove fact: prefixes so 'fact:be.tests' does not become a bare-file match
    clean_nofact = FACT.sub(" ", clean)
    paths, refs = [], []
    for m in PATHISH.finditer(clean_nofact):
        tok = m.group(0).rstrip(".,;:·")
        k = classify_token(tok)
        if k == "path":
            paths.append(tok)
        elif k == "ref":
            refs.append(strip_at(tok))
    covered = set()
    for m in PATHISH.finditer(clean_nofact):
        covered.add((m.start(), m.end()))
    for m in BAREFILE.finditer(clean_nofact):
        if any(s <= m.start() and m.end() <= e for s, e in covered):
            continue
        paths.append(m.group(0).rstrip(".,;:·"))
    # --- commit ids -------------------------------------------------------
    # A hex run is only a commit citation if it stands alone or is a WHOLE path
    # segment. Two false-positive classes were found by hand-checking and are
    # excluded here: scratchpad session UUIDs (766072d3-8965-...-76b407d86aaf)
    # and brief hashes embedded in filenames (RETURN-attempt1-brief-2697e094.md).
    shas = []
    for p in paths:
        for seg in p.split("/"):
            if re.fullmatch(r"[0-9a-f]{7,40}", seg) and not seg.isdigit():
                shas.append(seg)
    rest = clean_nofact
    rest = re.sub(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
                  " ", rest)                       # UUIDs
    # `lane/foo@02f27b95` and `core@cd1cc86` cite a commit after the @
    for m in re.finditer(r"@([0-9a-f]{7,40})(?![0-9a-zA-Z])", rest):
        shas.append(m.group(1))
    for p in sorted(set(paths), key=len, reverse=True):
        rest = rest.replace(p, " ")                # path tokens already handled
    rest = re.sub(r"[\w.@+-]*[A-Za-z][\w.@+-]*", lambda m: (
        m.group(0) if re.fullmatch(r"[0-9a-f]{7,40}", m.group(0)) else " "), rest)
    for m in SHA.finditer(rest):
        s = m.group(1)
        if s.isdigit():          # pure decimal numbers are counts, not shas
            continue
        shas.append(s)
    return facts, paths, refs, shas


# ----------------------------------------------------------- git resolution
class Repo:
    def __init__(self, root):
        self.root = root
        self.name = os.path.basename(root)
        self._tracked = None
        self._ignored = {}
        self._dirty = None

    def tracked(self):
        if self._tracked is None:
            _, out, _ = sh(["git", "ls-files", "-z"], cwd=self.root)
            self._tracked = set(out.split("\0"))
        return self._tracked

    def dirty(self):
        if self._dirty is None:
            _, out, _ = sh(["git", "status", "--porcelain", "-z"], cwd=self.root)
            d = set()
            for rec in out.split("\0"):
                if len(rec) > 3:
                    d.add(rec[3:])
            self._dirty = d
        return self._dirty

    def ignored(self, rel):
        if rel not in self._ignored:
            rc, _, _ = sh(["git", "check-ignore", "-q", "--no-index", rel], cwd=self.root)
            self._ignored[rel] = (rc == 0)
        return self._ignored[rel]


REPOS = {}


def worktree_root(path):
    d = path if os.path.isdir(path) else os.path.dirname(path)
    while d and d != "/":
        if os.path.exists(os.path.join(d, ".git")):
            return d
        d = os.path.dirname(d)
    return None


def repo_for(root):
    if root not in REPOS:
        REPOS[root] = Repo(root)
    return REPOS[root]


def candidates(tok, extra_roots=()):
    """Absolute filesystem candidates for a cited path, in resolution order.

    extra_roots are worktree directories named elsewhere on the SAME evidence
    line, plus the citing lane's own directory. A lane that says
    "worktree ~/okam/wt-wfw5 ... lanes/L-X/evidence.md" means that file inside
    that worktree; scoring it absent because it is not under Web-modules is the
    cross-repo mistake F-CROSS-REPO-EVIDENCE-UNVERIFIABLE already records.
    """
    out = []
    if tok.startswith("/"):
        out.append(tok)
    elif tok.startswith("~/"):
        out.append(os.path.join(os.path.expanduser("~"), tok[2:]))
    elif tok.startswith("../"):
        out.append(os.path.normpath(os.path.join(WEB, tok)))
    elif tok.startswith("./"):
        out.append(os.path.normpath(os.path.join(WEB, tok[2:])))
    else:
        first = tok.split("/")[0]
        if first in SIBLINGS:
            out.append(os.path.join(OKAM, tok))
        out.append(os.path.join(WEB, tok))
        out.append(os.path.join(BE, tok))
        for r in extra_roots:
            out.append(os.path.join(r, tok))
    return out


ELIDED = re.compile(r"\.\.\.|\.\.[A-Z]")


def line_roots(ev, lane):
    """Worktree / repo directories this evidence line itself names."""
    roots = []
    for m in re.finditer(r"(?:/Users/svendaneel/okam|~/okam|\.\.)/([\w.@+-]+)", ev):
        p = os.path.join(OKAM, m.group(1))
        if os.path.isdir(p) and p not in roots:
            roots.append(p)
    for m in re.finditer(r"(?<![\w/-])(OkamAPI[\w-]*|Web-modules|web-[\w-]+|wt-[\w-]+)",
                         ev):
        p = os.path.join(OKAM, m.group(1))
        if os.path.isdir(p) and p not in roots:
            roots.append(p)
    # the citing lane's own directory, in both repos and in any named worktree
    out = []
    for r in roots + [WEB, BE]:
        for sub in ("lanes/" + lane, "artifacts/lanes/" + lane, ".lane"):
            d = os.path.join(r, sub)
            if os.path.isdir(d):
                out.append(d)
    return roots + out


TREE_CACHE = {}


def in_tree(repo_root, rev, rel):
    key = (repo_root, rev)
    if key not in TREE_CACHE:
        _, out, _ = sh(["git", "ls-tree", "-r", "--name-only", "-z", rev], cwd=repo_root)
        TREE_CACHE[key] = set(out.split("\0"))
    return rel in TREE_CACHE[key]


def resolve_path(tok, extra_roots=(), line_shas=()):
    """-> (klass, detail)"""
    if ELIDED.search(tok):
        return "elided-as-written", tok + " (author shorthand, not dereferenceable)"
    for cand in candidates(tok, extra_roots):
        if os.path.exists(cand):
            root = worktree_root(cand)
            if root is None:
                return "resolvable-untracked-dir", cand + " (not in any git worktree)"
            rel = os.path.relpath(cand, root)
            r = repo_for(root)
            if rel in r.tracked():
                dirt = " DIRTY(working-tree edit not in HEAD)" if rel in r.dirty() else ""
                return ("tracked-dirty" if dirt else "tracked"), cand + dirt
            if r.ignored(rel):
                return "ignored-by-git", cand
            return "untracked-not-ignored", cand
    # not on disk anywhere -- is it in a tree we can name?
    rel_web = tok[3:] if tok.startswith("../") else tok
    for root, rev, label in ((WEB, "HEAD", "web HEAD"),
                             (BE, BE_INTEGRATION, "backend feature/restaurant-modules")):
        probe = tok
        if probe.startswith("../"):
            probe = "/".join(probe.split("/")[2:])
        if probe.startswith("/"):
            probe = probe.lstrip("/")
            for sib in SIBLINGS:
                p = "Users/svendaneel/okam/" + sib + "/"
                if probe.startswith(p):
                    probe = probe[len(p):]
                    break
        first = probe.split("/")[0]
        if first in SIBLINGS:
            probe = "/".join(probe.split("/")[1:])
        if probe and in_tree(root, rev, probe):
            return "in-tree-not-on-disk", "%s: %s" % (label, probe)
    # last chance: the same evidence line may cite the commit that carries it.
    for sha in line_shas:
        k, d = resolve_sha(sha)
        if k in ("on-ref", "worktree-head-only", "dangling"):
            repo_name, full = d.split(" ")
            root = REACH[repo_name]["root"]
            probe = tok.split("/", 1)[1] if tok.split("/")[0] in SIBLINGS else tok
            if in_tree(root, full, probe):
                return "in-cited-commit", "%s %s: %s" % (repo_name, full[:8], probe)
    # The plan hub keeps some lane dirs at docs/plan/lanes/<LANE>/ while the
    # citation says lanes/<LANE>/. The file exists; the pointer is wrong. That
    # is a different finding from absence and a different repair.
    if not tok.startswith(("/", "~", "..")):
        p = os.path.join(WEB, "docs/plan", tok)
        if os.path.exists(p):
            return "wrong-path-same-repo", "actually at docs/plan/" + tok
    # Last: does it survive anywhere in the estate, at the same relative path,
    # in a sibling checkout the citation does not name?
    if not tok.startswith(("/", "~", "..")):
        for sib in sorted(SIBLINGS):
            p = os.path.join(OKAM, sib, tok)
            if os.path.exists(p):
                return "elsewhere-in-estate", p
    if "/" not in tok:
        return "bare-filename", tok + " (no directory given)"
    return "absent", "no candidate exists: " + " | ".join(
        candidates(tok, extra_roots)[:3])


# ---------------------------------------------------------------- commit ids
def load(p):
    return set(open(p).read().split())


REACH = {}
for r, root in (("Web-modules", WEB), ("OkamAPI-modules", BE)):
    REACH[r] = {
        "root": root,
        "refs": load(os.path.join(LANE, "reach-refs-%s.txt" % r)),
        "wt": load(os.path.join(LANE, "reach-wt-%s.txt" % r)),
    }

SHA_CACHE = {}


def resolve_sha(s):
    if s in SHA_CACHE:
        return SHA_CACHE[s]
    hits = []
    for name, info in REACH.items():
        rc, out, err = sh(["git", "rev-parse", "--verify", "--quiet", s + "^{commit}"],
                          cwd=info["root"])
        if rc == 0 and out.strip():
            full = out.strip()
            if full in info["refs"]:
                hits.append((name, full, "on-ref"))
            elif full in info["wt"]:
                hits.append((name, full, "worktree-head-only"))
            else:
                hits.append((name, full, "dangling"))
        elif "ambiguous" in err.lower():
            hits.append((name, "?", "ambiguous"))
    if not hits:
        # a third repository? `core@<sha>` submodule pointers are cited by some
        # lanes and are neither absent nor in scope for a two-repo checker.
        for other in ("Core", "ConsumerWeb", "ConsumerApp", "modul"):
            root = os.path.join(OKAM, other)
            if not os.path.exists(os.path.join(root, ".git")):
                continue
            rc, out, _ = sh(["git", "rev-parse", "--verify", "--quiet",
                             s + "^{commit}"], cwd=root)
            if rc == 0 and out.strip():
                SHA_CACHE[s] = ("third-repo", "%s %s" % (other, out.strip()[:12]))
                return SHA_CACHE[s]
        res = ("not-a-commit", "")
    else:
        order = {"on-ref": 0, "worktree-head-only": 1, "dangling": 2, "ambiguous": 3}
        hits.sort(key=lambda h: order[h[2]])
        best = hits[0]
        res = (best[2], "%s %s" % (best[0], best[1][:12]))
    SHA_CACHE[s] = res
    return res


# ---------------------------------------------------------------- facts
def fact_defined(key):
    rc, out, _ = sh(["grep", "-c", "-F", "fact:" + key, PLAN])
    return int(out.strip() or 0)


# ---------------------------------------------------------------- main
def main():
    plan_lanes = parse_plan()
    ret_lanes = parse_returns()
    for L in plan_lanes:
        L["src"] = "plan.md"
    lanes = plan_lanes + ret_lanes
    rows = []
    for L in lanes:
        for lineno, ev in L["evidence"]:
            facts, paths, refs, shas = tokenize(ev)
            roots = line_roots(ev, L["lane"])
            for t in OrderedDict.fromkeys(paths):
                k, d = resolve_path(t, roots, shas)
                rows.append(dict(lane=L["lane"], src=L["src"], state=L["state"], line=lineno,
                                 kind="path", token=t, klass=k, detail=d, raw=ev))
            for t in OrderedDict.fromkeys(shas):
                k, d = resolve_sha(t)
                rows.append(dict(lane=L["lane"], src=L["src"], state=L["state"], line=lineno,
                                 kind="commit", token=t, klass=k, detail=d, raw=ev))
            for t in OrderedDict.fromkeys(refs):
                found = []
                for name, info in REACH.items():
                    for spec in ([t] if t.startswith("refs/")
                                 else ["refs/heads/" + t, t]):
                        rc, out, _ = sh(["git", "rev-parse", "--verify", "--quiet",
                                         spec], cwd=info["root"])
                        if rc == 0:
                            found.append(name)
                            break
                rows.append(dict(lane=L["lane"], src=L["src"], state=L["state"], line=lineno,
                                 kind="ref", token=t,
                                 klass="ref-exists" if found else "ref-absent",
                                 detail=",".join(found), raw=ev))
            for t in OrderedDict.fromkeys(facts):
                n = fact_defined(t)
                rows.append(dict(lane=L["lane"], src=L["src"], state=L["state"], line=lineno,
                                 kind="fact", token="fact:" + t,
                                 klass="fact-cited" if n else "fact-undefined",
                                 detail="%d mentions in plan.md" % n, raw=ev))
    json.dump(rows, open(os.path.join(LANE, "rows.json"), "w"), indent=1)
    for src in ("plan.md", "returns"):
        counts = defaultdict(int)
        for r in rows:
            s = "plan.md" if r["src"] == "plan.md" else "returns"
            if s == src:
                counts[(r["kind"], r["klass"])] += 1
        print("=== %s ===" % src)
        for k in sorted(counts):
            print("  %-8s %-26s %4d" % (k[0], k[1], counts[k]))
    print("lanes=%d lanes_with_evidence=%d evidence_lines=%d citations=%d" % (
        len(lanes), sum(1 for L in lanes if L["evidence"]),
        sum(len(L["evidence"]) for L in lanes), len(rows)))


if __name__ == "__main__":
    main()
