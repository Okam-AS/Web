#!/usr/bin/env python3
"""Parse a coverlet cobertura report into per-file and per-module line/branch figures.

Two rules, both stated in the output so nobody has to guess:
  * only the CLASS-level <lines> block is counted (coverlet emits every <line>
    twice, once under <method> and once at class level); the sum is asserted
    against the report header.
  * Migrations/ is reported as its own row and excluded from every total that
    the summary calls "excl. migrations".
"""
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict

MODULE_TOKENS = ("Workforce", "Meals", "Events", "Margin", "Growth", "Training")


def module_of(path: str) -> str:
    p = path.replace("\\", "/")
    if "/Migrations/" in "/" + p:
        return "Migrations"
    for tok in MODULE_TOKENS:
        # a module owns a directory segment or a file whose basename starts with it
        if f"/{tok}/" in "/" + p or p.rsplit("/", 1)[-1].startswith(tok):
            return tok
    return "Core/POS + shared"


def main(xml_path: str) -> None:
    header = {}
    # filename -> {"lines": {lineno: hits}, "br_cov": int, "br_tot": int}
    files = defaultdict(lambda: {"lines": {}, "br_cov": 0, "br_tot": 0})
    flat_cov = flat_tot = 0  # class-block sums WITHOUT dedupe, to reproduce the header

    depth_lines_parent = []  # stack telling us whether a <lines> is class-level
    cur_file = None
    in_class_lines = False

    for event, elem in ET.iterparse(xml_path, events=("start", "end")):
        tag = elem.tag
        if event == "start":
            if tag == "coverage" and not header:
                header = dict(elem.attrib)
            elif tag == "class":
                cur_file = elem.get("filename")
                depth_lines_parent.append("class")
            elif tag == "method":
                depth_lines_parent.append("method")
            elif tag == "lines":
                in_class_lines = bool(depth_lines_parent) and depth_lines_parent[-1] == "class"
            elif tag == "line" and in_class_lines and cur_file is not None:
                num = int(elem.get("number"))
                hits = int(elem.get("hits", "0"))
                rec = files[cur_file]
                rec["lines"][num] = max(rec["lines"].get(num, 0), hits)
                flat_tot += 1
                if hits > 0:
                    flat_cov += 1
                cc = elem.get("condition-coverage")
                if cc and "(" in cc:
                    frac = cc[cc.index("(") + 1: cc.index(")")]
                    a, b = frac.split("/")
                    rec["br_cov"] += int(a)
                    rec["br_tot"] += int(b)
        else:  # end
            if tag in ("class", "method"):
                if depth_lines_parent:
                    depth_lines_parent.pop()
                if tag == "class":
                    cur_file = None
                elem.clear()
            elif tag == "lines":
                in_class_lines = False
            elif tag == "package":
                elem.clear()

    print(f"header: lines-covered={header.get('lines-covered')} lines-valid={header.get('lines-valid')} "
          f"branches-covered={header.get('branches-covered')} branches-valid={header.get('branches-valid')}")
    print(f"class-block sum (no dedupe): covered={flat_cov} valid={flat_tot}  "
          f"MATCHES-HEADER={str(flat_cov) == header.get('lines-covered') and str(flat_tot) == header.get('lines-valid')}")

    # per module (deduped by file+line)
    mod = defaultdict(lambda: {"files": 0, "cov": 0, "tot": 0, "bc": 0, "bt": 0})
    rows = []
    for fn, rec in files.items():
        cov = sum(1 for h in rec["lines"].values() if h > 0)
        tot = len(rec["lines"])
        m = mod[module_of(fn)]
        m["files"] += 1
        m["cov"] += cov
        m["tot"] += tot
        m["bc"] += rec["br_cov"]
        m["bt"] += rec["br_tot"]
        rows.append((fn, module_of(fn), tot - cov, cov, tot, rec["br_tot"] - rec["br_cov"], rec["br_tot"]))

    print("\n== per module (deduped by file+line) ==")
    print(f"{'module':22} {'files':>6} {'cov':>8} {'tot':>8} {'line%':>7} {'uncov':>8} {'br uncov':>9}")
    tot_excl = cov_excl = 0
    for name, m in sorted(mod.items(), key=lambda kv: -kv[1]["tot"]):
        pct = 100.0 * m["cov"] / m["tot"] if m["tot"] else 0.0
        print(f"{name:22} {m['files']:6d} {m['cov']:8d} {m['tot']:8d} {pct:7.1f} {m['tot']-m['cov']:8d} {m['bt']-m['bc']:9d}")
        if name != "Migrations":
            tot_excl += m["tot"]
            cov_excl += m["cov"]
    print(f"{'TOTAL excl Migrations':22} {'':6} {cov_excl:8d} {tot_excl:8d} "
          f"{100.0*cov_excl/tot_excl if tot_excl else 0:7.1f} {tot_excl-cov_excl:8d}")

    n = int(sys.argv[2]) if len(sys.argv) > 2 else 20
    print(f"\n== Core/POS + shared: {n} largest by UNCOVERED lines ==")
    print(f"{'#':>3}  {'uncov':>6} {'total':>6} {'line%':>6} {'brUncov':>8} {'brTot':>6}  file")
    core = [r for r in rows if r[1] == "Core/POS + shared"]
    core.sort(key=lambda r: (-r[2], r[0]))
    for i, (fn, _m, unc, cov, tot, bu, bt) in enumerate(core[:n], 1):
        pct = 100.0 * cov / tot if tot else 0.0
        print(f"{i:3d}  {unc:6d} {tot:6d} {pct:6.1f} {bu:8d} {bt:6d}  {fn}")


if __name__ == "__main__":
    main(sys.argv[1])
