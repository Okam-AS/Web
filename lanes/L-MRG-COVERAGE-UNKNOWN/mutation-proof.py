#!/usr/bin/env python3
"""Prove the absent-vs-zero distinction is load-bearing, not decorative.

Four arms, run in order, each restoring the tree before the next:

  BASELINE   the tree as built                      -> expect GREEN
  MUTANT-A   the READ MODEL collapses the two:      -> expect RED
             an absent waste block becomes an empty summary of zeros again
             (this is the exact code that shipped before this lane)
  RESTORE-A  the tree as built                      -> expect GREEN
  MUTANT-B   the PANEL collapses the two:           -> expect RED
             an absent block falls into the "nothing recorded" branch
  RESTORE-B  the tree as built                      -> expect GREEN

MUTANT-B exists because MUTANT-A alone would not tell us whether the RENDERED
distinction is pinned or only the read model's return value.

Nothing here writes outside this lane directory except the two edits it makes
and reverts in the same breath; the originals are held in memory and rewritten
in a finally block.
"""

import subprocess
import sys
import pathlib

REPO = pathlib.Path(__file__).resolve().parents[2]
VIEW = REPO / 'utils' / 'margin' / 'statement-view.js'
PANEL = REPO / 'components' / 'admin' / 'margin' / 'MarginCoveragePanel.vue'
SUITES = ['test/margin-waste.test.js', 'test/margin-statements-page.test.js']

# --- MUTANT A: the read model stops distinguishing absent from zero -----------
VIEW_BUILT = """export function readWasteSummary (waste) {
  if (!waste || typeof waste !== 'object') { return null; }
  return {
    valuedMinor: longOrNull(waste.valuedMinor),
    entryCount: longOrNull(waste.entryCount),
    unvaluedEntryCount: longOrNull(waste.unvaluedEntryCount),"""

VIEW_MUTANT = """export function readWasteSummary (waste) {
  const block = waste && typeof waste === 'object' ? waste : {};
  return {
    valuedMinor: longOrNull(block.valuedMinor) || 0,
    entryCount: longOrNull(block.entryCount) || 0,
    unvaluedEntryCount: longOrNull(block.unvaluedEntryCount) || 0,"""

VIEW_BUILT_TAIL = """    byReason: (Array.isArray(waste.byReason) ? waste.byReason : []).map(line => ({"""
VIEW_MUTANT_TAIL = """    byReason: (Array.isArray(block.byReason) ? block.byReason : []).map(line => ({"""

# --- MUTANT B: the panel routes an absent block into the zero branch ----------
PANEL_BUILT = """      <p v-if="wasteUnknown" class="mcv__note" data-test="coverage-waste-unknown">
        {{ $i('mrgs_waste_coverage_unknown') }}
      </p>
      <p v-else-if="coverage.waste.entryCount === 0" class="mcv__note" data-test="waste-none">"""

PANEL_MUTANT = """      <p v-if="false" class="mcv__note" data-test="coverage-waste-unknown">
        {{ $i('mrgs_waste_coverage_unknown') }}
      </p>
      <p v-else-if="!coverage.waste || !coverage.waste.entryCount" class="mcv__note" data-test="waste-none">"""


def run_suites():
    proc = subprocess.run(
        ['npx', 'jest', *SUITES, '--coverage=false', '--runInBand'],
        cwd=REPO, capture_output=True, text=True)
    return proc.returncode, proc.stdout + proc.stderr


def failing_lines(output):
    return [ln.strip() for ln in output.splitlines()
            if ln.strip().startswith(('✕', '●')) and 'Console' not in ln]


def arm(label, expect_green, log):
    code, out = run_suites()
    green = code == 0
    verdict = 'GREEN' if green else 'RED'
    log.append('=' * 78)
    log.append('%s -> %s (expected %s)' % (label, verdict, 'GREEN' if expect_green else 'RED'))
    log.append('=' * 78)
    for ln in out.splitlines():
        if ('Tests:' in ln or 'Test Suites:' in ln):
            log.append('  ' + ln.strip())
    if not green:
        seen = []
        for ln in failing_lines(out):
            if ln not in seen:
                seen.append(ln)
        log.append('  failing:')
        for ln in seen[:40]:
            log.append('    ' + ln)
    log.append('')
    return green == expect_green


def main():
    view_original = VIEW.read_text()
    panel_original = PANEL.read_text()
    log = []
    ok = True
    try:
        ok &= arm('BASELINE   (tree as built)', True, log)

        assert VIEW_BUILT in view_original and VIEW_BUILT_TAIL in view_original, 'view anchor drift'
        VIEW.write_text(view_original
                        .replace(VIEW_BUILT, VIEW_MUTANT)
                        .replace(VIEW_BUILT_TAIL, VIEW_MUTANT_TAIL))
        ok &= arm('MUTANT-A   (read model: absent block becomes zeros)', False, log)

        VIEW.write_text(view_original)
        ok &= arm('RESTORE-A  (tree as built)', True, log)

        assert PANEL_BUILT in panel_original, 'panel anchor drift'
        PANEL.write_text(panel_original.replace(PANEL_BUILT, PANEL_MUTANT))
        ok &= arm('MUTANT-B   (panel: absent block falls into the zero branch)', False, log)

        PANEL.write_text(panel_original)
        ok &= arm('RESTORE-B  (tree as built)', True, log)
    finally:
        VIEW.write_text(view_original)
        PANEL.write_text(panel_original)

    log.append('MUTATION PROOF: ' + ('PASS' if ok else 'FAIL'))
    text = '\n'.join(log)
    (pathlib.Path(__file__).parent / 'mutation-proof.txt').write_text(text + '\n')
    print(text)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
