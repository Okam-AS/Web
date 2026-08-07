#!/usr/bin/env python3
"""Mutation receipt for test/growth-poweruser-page.test.js.

Applies one mutation at a time to pages/admin/poweruser-growth.vue, runs the test file,
records which arms went red, and RESTORES the page. Nothing here is hypothetical: a mutation
whose search string is not found aborts the run, because a no-op mutation looks exactly like
a test that cannot fail and would be read as the opposite of what it is.

Usage:  python3 lanes/L-THE-GROWTH-POWERUSER-PAGE-IS-TESTED/mutate.py
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PAGE = ROOT / "pages/admin/poweruser-growth.vue"
TESTFILE = "test/growth-poweruser-page.test.js"

# The three arms that are red on the UNMUTATED page: the recorded defect. They are excluded from
# the "which arms did this mutation break" bookkeeping so they cannot flatter any mutation.
KNOWN_RED = "reaches the operator as the reason the backend gave"

MUTATIONS = [
    # ---- access -------------------------------------------------------------------------------
    ("gate: an ordinary admin is no longer redirected",
     '      if (!this.isPowerUser) {\n        this.$router.push("/admin");\n        return;\n      }\n',
     ''),
    ("gate: the signed-out check is dropped",
     '      if (!this.userIsLoggedIn) return;\n',
     ''),
    ("load: the in-flight guard is dropped",
     'if (!this.growthData && !this.isLoading) {',
     'if (!this.growthData) {'),
    ("load: the already-loaded guard is dropped",
     'if (!this.growthData && !this.isLoading) {',
     'if (true) {'),

    # ---- failure reporting --------------------------------------------------------------------
    ("error: the cause is replaced by a generic line",
     'this.errorMessage = error?.message || this.$i(\'poweruserGrowth_unknownError\');',
     'this.errorMessage = this.$i(\'poweruserGrowth_unknownError\');'),
    ("error: a message-less failure falls through to nothing",
     'this.errorMessage = error?.message || this.$i(\'poweruserGrowth_unknownError\');',
     'this.errorMessage = error?.message;'),
    ("load: the spinner is never taken down",
     '      } finally {\n        this.isLoading = false;\n      }\n',
     '      }\n'),

    # ---- money ---------------------------------------------------------------------------------
    ("money: kroner formatting stops dividing by a hundred",
     'return (Number(valueInOre || 0) / 100).toLocaleString("nb-NO", {',
     'return (Number(valueInOre || 0)).toLocaleString("nb-NO", {'),
    ("money: the kroner curve is plotted in ore",
     'return this.getPointValue(point, "cumulativeRevenueAmount") / 100;',
     'return this.getPointValue(point, "cumulativeRevenueAmount");'),

    # ---- the wire ------------------------------------------------------------------------------
    ("wire: the PascalCase value fallback is dropped",
     'return point[key] ?? point[pascalKey] ?? 0;',
     'return point[key] ?? 0;'),
    # `?? -> ||` is deliberately NOT in this list. It is an EQUIVALENT MUTANT here: the fallback
    # chain terminates in `0`, so for every payload a backend actually sends (one casing, not both)
    # `a ?? b ?? 0` and `a || b || 0` return the same value, and a zero survives either way. It was
    # run, it killed nothing, and it is recorded as equivalent rather than as a hole in the tests.
    ("wire: the PascalCase date fallback is dropped",
     'return point.date || point.Date;',
     'return point.date;'),
    ("wire: the PascalCase points fallback is dropped",
     'return this.growthData?.points || this.growthData?.Points || [];',
     'return this.growthData?.points || [];'),
    ("wire: the reported period stops being read",
     '        from: this.growthData?.from || this.growthData?.From,\n        to: this.growthData?.to || this.growthData?.To,\n',
     '        from: null,\n        to: null,\n'),
    ("summary: the headline reads the first month instead of the last",
     'return this.fullPoints[this.fullPoints.length - 1] || {',
     'return this.fullPoints[0] || {'),

    # ---- the metric toggle ---------------------------------------------------------------------
    ("metric: choosing a metric does nothing",
     '    setMetric(metric) {\n      this.selectedMetric = metric;\n    },',
     '    setMetric(metric) {\n    },'),
    ("metric: the chart is not redrawn when the metric changes",
     '      this.pinnedAnnotationKey = null;\n      this.updateChart();\n    },',
     '      this.pinnedAnnotationKey = null;\n    },'),
    ("metric: the curve keeps the orders label under kroner",
     'this.chart.data.datasets[0].label = this.selectedMetric === "revenue" ? this.$i(\'poweruserGrowth_kroner\') : this.$i(\'poweruserGrowth_orders\');',
     'this.chart.data.datasets[0].label = this.$i(\'poweruserGrowth_orders\');'),
    ("metric: the orders curve plots turnover",
     '        return this.getPointValue(point, "cumulativeOrderCount");\n      });',
     '        return this.getPointValue(point, "cumulativeRevenueAmount");\n      });'),
    ("metric: a pinned popover survives the metric change",
     '    selectedMetric() {\n      this.activeAnnotationKey = null;\n      this.activeAnnotationPosition = null;\n      this.pinnedAnnotationKey = null;\n      this.updateChart();',
     '    selectedMetric() {\n      this.updateChart();'),

    # ---- zoom ------------------------------------------------------------------------------------
    ("zoom: a bare click now zooms",
     'if (!draft || Math.abs(draft.currentX - draft.startX) < 24) {',
     'if (!draft || Math.abs(draft.currentX - draft.startX) < 0) {'),
    ("zoom: the drag threshold swallows deliberate drags too",
     'if (!draft || Math.abs(draft.currentX - draft.startX) < 24) {',
     'if (!draft || Math.abs(draft.currentX - draft.startX) < 100) {'),
    ("zoom: a second zoom is measured from the start of history",
     '        start: visibleStart + startIndex,\n        end: visibleStart + endIndex,',
     '        start: startIndex,\n        end: endIndex,'),
    ("zoom: show-all no longer clears the range",
     '    resetZoom() {\n      this.zoomRange = null;',
     '    resetZoom() {'),
    ("zoom: the selected span loses its last month",
     'return this.fullPoints.slice(this.zoomRange.start, this.zoomRange.end + 1);',
     'return this.fullPoints.slice(this.zoomRange.start, this.zoomRange.end);'),
    ("zoom: the span is no longer named",
     'return `${this.formatMonth(this.getPointDate(startPoint))} - ${this.formatMonth(this.getPointDate(endPoint))}`;',
     'return "";'),

    # ---- axes and tooltip ------------------------------------------------------------------------
    ("axis: the orders axis stops being compact",
     '                return component.formatCompactNumber(value);\n              },',
     '                return component.formatNumber(value);\n              },'),
    ("axis: the kroner axis stops saying kroner",
     "return component.$i('poweruserGrowth_axisKr', { value: component.formatCompactNumber(value) });",
     'return component.formatCompactNumber(value);'),
    ("axis: the quarter marks are dropped",
     '                if (month === 3) return "Q2";\n',
     ''),
    ("tooltip: the month row repeats the running total",
     '                const monthValue = component.selectedMetric === "revenue"\n                  ? component.getPointValue(point, "revenueAmount")\n                  : component.getPointValue(point, "orderCount");',
     '                const monthValue = component.selectedMetric === "revenue"\n                  ? component.getPointValue(point, "cumulativeRevenueAmount")\n                  : component.getPointValue(point, "cumulativeOrderCount");'),
    ("tooltip: the kroner total is read as ore",
     "component.$i('poweruserGrowth_tooltipTotal', { value: component.formatCurrency(value * 100) }),",
     "component.$i('poweruserGrowth_tooltipTotal', { value: component.formatCurrency(value) }),"),
    ("tooltip: the title is the raw timestamp",
     '                return component.formatMonth(items[0].label);',
     '                return items[0].label;'),
    ("tooltip: the curve tooltip no longer stands down for a popover",
     '              return !component.activeAnnotationKey && !component.pinnedAnnotationKey;',
     '              return true;'),

    # ---- milestones ------------------------------------------------------------------------------
    ("legend: toggling a kind changes nothing",
     '      this.visibleAnnotationTypes = {\n        ...this.visibleAnnotationTypes,\n        [type]: !this.visibleAnnotationTypes[type],\n      };',
     ''),
    ("legend: hidden kinds are still drawn",
     'return items.filter((item) => this.visibleAnnotationTypes[item.type]);',
     'return items;'),
    ("legend: turning a kind off leaves its popover open",
     '      if (activeType === type) {\n        this.activeAnnotationKey = null;\n        this.activeAnnotationPosition = null;\n        this.pinnedAnnotationKey = null;\n        this.setChartTooltipEnabled(true);\n      }\n',
     ''),
    ("legend: turning any kind off closes whatever popover is open",
     '      if (activeType === type) {',
     '      if (true) {'),
    ("markers: openings in one month stop being grouped",
     'const key = `${type}-${date.getFullYear()}-${date.getMonth() + 1}`;',
     'const key = `${type}-${event.name}`;'),
    ("markers: only the first opening of a month is named",
     'acc[key].lines.push(event.name);',
     'if (!acc[key].lines.length) acc[key].lines.push(event.name);'),
    ("markers: the overflow count is dropped",
     'const visibleLines = this.activeAnnotationItem.lines.slice(0, 7);',
     'const visibleLines = this.activeAnnotationItem.lines;'),
    ("markers: hovering no longer places the popover",
     'this.activeAnnotationPosition = hitArea ? this.getAnnotationPopoverPosition(hitArea) : null;\n      this.setChartTooltipEnabled(!nextKey);',
     'this.activeAnnotationPosition = null;\n      this.setChartTooltipEnabled(!nextKey);'),
    ("markers: clicking no longer pins",
     'this.pinnedAnnotationKey = nextPinnedKey;',
     'this.pinnedAnnotationKey = null;'),
    ("markers: the month figures beside the marker are dropped",
     '    activeAnnotationMonthStats() {\n      if (!this.activeAnnotationItem) return null;',
     '    activeAnnotationMonthStats() {\n      if (this.activeAnnotationItem) return null;'),
    ("markers: the month figures report the running total twice",
     '      const monthValue = isRevenue\n        ? this.getPointValue(point, "revenueAmount")\n        : this.getPointValue(point, "orderCount");',
     '      const monthValue = isRevenue\n        ? this.getPointValue(point, "cumulativeRevenueAmount")\n        : this.getPointValue(point, "cumulativeOrderCount");'),
    ("markers: nothing is ever hoverable",
     'this.annotationHitAreas = markers.map((marker) => ({',
     'this.annotationHitAreas = [].map((marker) => ({'),
]


def run_tests():
    proc = subprocess.run(
        ["npx", "jest", TESTFILE, "--coverage=false", "--verbose"],
        cwd=ROOT, capture_output=True, text=True,
    )
    out = proc.stdout + proc.stderr
    passed, failed = set(), set()
    for line in out.splitlines():
        s = line.strip()
        m = re.match(r"^[✓√]\s+(.*?)(?:\s+\(\d+\s*ms\))?$", s)
        if m:
            passed.add(m.group(1).strip())
            continue
        m = re.match(r"^[✕×]\s+(.*?)(?:\s+\(\d+\s*ms\))?$", s)
        if m:
            failed.add(m.group(1).strip())
    return passed, failed


def main():
    original = PAGE.read_text()

    print("=== baseline (unmutated page) ===")
    base_pass, base_fail = run_tests()
    print(f"  green {len(base_pass)}  red {len(base_fail)}")
    for name in sorted(base_fail):
        print(f"    RED (recorded defect): {name}")
    if any(KNOWN_RED not in n for n in base_fail):
        print("!! a baseline failure that is NOT the recorded defect — aborting", file=sys.stderr)
        return 1

    # Only arms that are green on the untouched page can be "killed" by a mutation.
    killable = set(base_pass)
    killed_by = {name: [] for name in killable}

    for label, find, replace in MUTATIONS:
        if find not in original:
            print(f"!! mutation search string not found: {label}", file=sys.stderr)
            PAGE.write_text(original)
            return 1
        mutated = original.replace(find, replace, 1)
        if mutated == original:
            print(f"!! mutation was a no-op: {label}", file=sys.stderr)
            PAGE.write_text(original)
            return 1
        PAGE.write_text(mutated)
        try:
            _, failed = run_tests()
        finally:
            PAGE.write_text(original)          # ALWAYS restored
        newly = sorted((failed & killable))
        print(f"\n-- {label}\n   reds {len(newly)}: " + ("; ".join(newly) if newly else "NONE"))
        for name in newly:
            killed_by[name].append(label)

    assert PAGE.read_text() == original, "page was not restored"

    survivors = [n for n, m in killed_by.items() if not m]
    print("\n=== receipt ===")
    print(f"arms green on the untouched page : {len(killable)}")
    print(f"arms red under >=1 mutation      : {len(killable) - len(survivors)}")
    print(f"arms no mutation could break     : {len(survivors)}")
    for n in survivors:
        print(f"   SURVIVOR: {n}")

    (Path(__file__).parent / "mutation-receipt.json").write_text(
        json.dumps({"killed_by": killed_by, "survivors": survivors,
                    "baseline_red": sorted(base_fail)}, indent=1, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
