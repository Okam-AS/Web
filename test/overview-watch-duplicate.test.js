/**
 * `pages/admin/overview.vue` declared `storeOverview` TWICE in one `watch` object literal.
 *
 * JavaScript keeps the LAST of two identical keys, so the earlier handler was discarded before Vue
 * ever saw the options object — it had never run. The two bodies were not copies of each other:
 *
 *   dropped   recomputed `totalOrderCount` / `totalAmountSum` from `sortedStores`
 *   surviving normalises a store with no KAM id to "" so the "Ingen" option is selected
 *
 * So "just de-duplicate it" had a right answer and a wrong one, and the wrong one is invisible to
 * the linter: deleting the SURVIVING body leaves a file with no duplicate key that quietly stops
 * normalising KAM ids. The rule guard below cannot see that, so the two behavioural tests do.
 *
 * The deletion was safe because the `sortedStores` watcher performs the same two reductions over the
 * same array — and also fires when a filter changes, which the dropped body would not have. That is
 * a fact about today's siblings rather than a law, so it is asserted here rather than remembered.
 *
 * A duplicate key is INVISIBLE at runtime: `Object.keys` on such a literal reports one key. Only a
 * parser can see it, so the guard runs the ESLint rule that found it — and proves that rule still
 * reports the defect against a fixture that still contains it before trusting it to report zero.
 */
import path from 'path'
import { ESLint } from 'eslint'
import Overview from '~/pages/admin/overview.vue'

const ROOT = path.resolve(__dirname, '..')
const DUPE = 'no-dupe-keys'

const DEFECT_RESTORED = `
export default {
  watch: {
    storeOverview: {
      handler () { this.totalOrderCount = 1 },
      immediate: true
    },
    storeOverview: {
      handler (stores) { stores.forEach(s => { s.kamUserId = '' }) },
      immediate: true
    }
  }
}
`

function dupeKeysIn (result) {
  return result.messages.filter(m => m.ruleId === DUPE).map(m => `${m.line}:${m.column} ${m.message}`)
}

jest.setTimeout(60000)

describe('the duplicate watcher key in pages/admin/overview.vue', () => {
  test('the rule that found it still reports it when the defect is restored', async () => {
    const results = await new ESLint({ cwd: ROOT })
      .lintText(DEFECT_RESTORED, { filePath: path.join(ROOT, 'pages/admin/__dupe-fixture__.js') })

    expect(results).toHaveLength(1)
    const found = dupeKeysIn(results[0])
    expect(found).toHaveLength(1)
    expect(found[0]).toContain("Duplicate key 'storeOverview'")
  })

  test('the real page declares each watched key exactly once', async () => {
    const target = 'pages/admin/overview.vue'
    const results = await new ESLint({ cwd: ROOT }).lintFiles([path.join(ROOT, target)])

    // An ignored or unmatched path yields zero results, which would read exactly like a clean file.
    expect(results).toHaveLength(1)
    expect(results[0].filePath.endsWith(target)).toBe(true)
    expect(dupeKeysIn(results[0])).toEqual([])
  })

  // Guards the de-duplication that the linter cannot judge: keeping the wrong body.
  test('the watcher that survives is the one that normalises missing KAM ids', () => {
    const watcher = Overview.watch.storeOverview
    const stores = [{ kamUserId: null }, { kamUserId: undefined }, { kamUserId: '' }, { kamUserId: 'kam-7' }]

    watcher.handler(stores)

    expect(stores.map(s => s.kamUserId)).toEqual(['', '', '', 'kam-7'])
    expect(watcher.immediate).toBe(true)
  })

  // The two figures the overview header prints are still produced, by the sibling watcher — the
  // fact that made deleting the dropped body a deletion rather than a silent loss.
  test('the totals the dropped body recomputed are still recomputed by the sortedStores watcher', () => {
    const watcher = Overview.watch.sortedStores
    const ctx = { totalOrderCount: -1, totalAmountSum: -1 }

    watcher.handler.call(ctx, [
      { orderCount: 2, totalAmount: 100.5 },
      { orderCount: 3, totalAmount: 50.25 },
      { /* a store with neither figure yet */ }
    ])

    expect(ctx.totalOrderCount).toBe(5)
    expect(ctx.totalAmountSum).toBe(150.75)
    expect(watcher.immediate).toBe(true)
    expect(watcher.deep).toBe(true)
  })
})
