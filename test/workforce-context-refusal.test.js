import fs from 'fs'
import path from 'path'
import { contextRefusalKey, CODE_MODULE_DISABLED, KEY_MODULE_OFF } from '~/utils/workforce/context-refusal'
import no from '~/translations/no'
import en from '~/translations/en'
import de from '~/translations/de'

// `GET /workforce/stores/{id}/context` answers 403 for TWO unrelated reasons, and until this file
// existed every Workforce admin page collapsed them into "you have no workforce access".
//
// Both arms below are the shapes the LIVE API actually emitted, not invented ones. With
// `workforce.module` switched off from /admin/feature-flags for store 1 the body was
// `{"type":"…/workforce/module-disabled","title":"Forbidden","status":403,
//   "detail":"The Workforce module is not enabled for this store.","code":"workforce.module-disabled"}`
// — recorded in `lanes/L-A-MODULE-OFF-NAMES-THE-MODULE/walk-before.json`.

const KEYS = { noCapability: 'page_no_capability', failed: 'page_context_failed' }

// A typed workforce failure as `api-client` constructs it, without importing the class into a file
// whose whole subject is how a caller reacts to one.
const problem = (status, code) => ({ isWorkforceApiError: true, status, code })

describe('contextRefusalKey', () => {
  test('the module-off 403 names the module', () => {
    expect(contextRefusalKey(problem(403, CODE_MODULE_DISABLED), KEYS)).toBe(KEY_MODULE_OFF)
  })

  test('the capability 403 still names the caller', () => {
    expect(contextRefusalKey(problem(403, 'workforce.forbidden'), KEYS)).toBe('page_no_capability')
  })

  // The two arms above are the whole point: same status, different answer. Asserted together so a
  // future edit cannot satisfy one by making the other agree with it.
  test('the two 403s do not collapse into one answer', () => {
    const off = contextRefusalKey(problem(403, CODE_MODULE_DISABLED), KEYS)
    const forbidden = contextRefusalKey(problem(403, 'workforce.forbidden'), KEYS)
    expect(off).not.toBe(forbidden)
  })

  test('a 403 whose problem body was stripped is still read as the caller\'s, as before', () => {
    expect(contextRefusalKey(problem(403, null), KEYS)).toBe('page_no_capability')
  })

  test('a non-403 typed failure is the generic one', () => {
    expect(contextRefusalKey(problem(500, 'boom'), KEYS)).toBe('page_context_failed')
    expect(contextRefusalKey(problem(404, 'workforce.not-found'), KEYS)).toBe('page_context_failed')
  })

  // A network rejection is not a refusal. It must never be reported as one, in either direction.
  test('an untyped rejection is the generic one', () => {
    expect(contextRefusalKey(new Error('Failed to fetch'), KEYS)).toBe('page_context_failed')
    expect(contextRefusalKey(null, KEYS)).toBe('page_context_failed')
    // …including one that merely LOOKS like a 403 without being a typed workforce failure.
    expect(contextRefusalKey({ status: 403, code: CODE_MODULE_DISABLED }, KEYS)).toBe('page_context_failed')
  })
})

describe('the sentence it returns', () => {
  test('exists in all three locales, so the key never renders as itself', () => {
    [no, en, de].forEach((dict) => {
      expect(typeof dict[KEY_MODULE_OFF]).toBe('string')
      expect(dict[KEY_MODULE_OFF].length).toBeGreaterThan(20)
    })
  })

  test('names the module and the switch, and never the reader', () => {
    // The defect was a sentence about the PERSON. Norwegian is asserted literally because it is the
    // one the operator on this world reads.
    expect(no[KEY_MODULE_OFF]).toContain('Bemanningsmodulen')
    expect(no[KEY_MODULE_OFF]).toContain('workforce.module')
    expect(no[KEY_MODULE_OFF]).not.toContain('Du har ikke')
    expect(en[KEY_MODULE_OFF]).toContain('Workforce module')
    expect(en[KEY_MODULE_OFF]).toContain('workforce.module')
    expect(de[KEY_MODULE_OFF]).toContain('workforce.module')
  })
})

// THE CENSUS. The defect was nine copies of one branch, so the guard is over all nine files rather
// than over the one page a brief happened to name. A page that goes back to reading the bare status
// reds here even if its own suite is still green.
describe('every workforce admin page that opens on GET /context', () => {
  const pagesDir = path.join(__dirname, '..', 'pages', 'admin')
  const pages = fs.readdirSync(pagesDir)
    .filter(f => /^workforce-.*\.vue$/.test(f))
    .map(f => ({ name: f, src: fs.readFileSync(path.join(pagesDir, f), 'utf8') }))
    .filter(p => /this\.contextError\s*=/.test(p.src))

  test('there are nine of them, so this census cannot silently stop covering one', () => {
    expect(pages.map(p => p.name).sort()).toEqual([
      'workforce-delivery.vue', 'workforce-personnel-list.vue', 'workforce-publications.vue',
      'workforce-rates.vue', 'workforce-requests.vue', 'workforce-roles.vue',
      'workforce-roster.vue', 'workforce-schedule.vue', 'workforce-timesheets.vue'
    ])
  })

  test('resolves its refusal through the shared discriminator', () => {
    const missing = pages.filter(p => !/contextRefusalKey\(/.test(p.src)).map(p => p.name)
    expect(missing).toEqual([])
  })

  test('no longer decides the sentence from the bare status', () => {
    const bare = pages
      .filter(p => /contextError\s*=\s*isWorkforceApiError\(\w+\)\s*&&\s*\w+\.status === 403/.test(p.src))
      .map(p => p.name)
    expect(bare).toEqual([])
  })
})
