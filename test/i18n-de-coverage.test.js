import no from '~/translations/no'
import de from '~/translations/de'

// ---------------------------------------------------------------------------
// German (de.ts) coverage guard.
//
// Norwegian (no.ts) is the source-of-truth dictionary for this app. Every key
// that exists in no.ts must also exist in de.ts as a NON-EMPTY German string,
// otherwise the German UI silently falls back / shows a blank. This test makes
// a missing German translation a hard test failure the moment a new key ships,
// so German can never quietly drift behind Norwegian again.
//
// ALLOW_LIST is the escape hatch / translation backlog: keys that are KNOWN to
// be missing German today are listed here so the guard passes, while still
// flagging any NEW untranslated key. The list must only ever SHRINK: draft the
// German in de.ts, then delete the key from ALLOW_LIST.
//
// Convention for adding backlog entries (grouped under the TODO banner below):
//     someKey_foo, // TODO: draft de
//
// Snapshot 2026-07-05: de.ts is fully in sync with no.ts (1558/1558 keys, 0
// missing German), so the backlog is currently EMPTY. Do not add keys here to
// dodge a failure — translate them in de.ts instead.
// ---------------------------------------------------------------------------
const ALLOW_LIST = [
  // ----------------------- TODO: draft de -----------------------
  // (none — every no.ts key currently has a German translation)
]

// A key is "covered" when de.ts holds a non-empty (non-whitespace) string.
const hasGerman = (key) =>
  typeof de[key] === 'string' && de[key].trim().length > 0

describe('de.ts German coverage', () => {
  const allow = new Set(ALLOW_LIST)

  test('every no.ts key has a non-empty German string in de.ts (except ALLOW_LIST)', () => {
    const missing = Object.keys(no)
      .filter((key) => !allow.has(key))
      .filter((key) => !hasGerman(key))
      .sort()

    if (missing.length > 0) {
      throw new Error(
        `de.ts is missing German for ${missing.length} no.ts key(s):\n` +
          missing.map((key) => `  - ${key}`).join('\n') +
          '\n\nFix by adding the German to translations/de.ts. Only as a last ' +
          'resort, add the key to ALLOW_LIST in this test (with a ' +
          '"// TODO: draft de" note) to defer it.'
      )
    }

    expect(missing).toEqual([])
  })

  // Keep the backlog honest: an ALLOW_LIST entry is only valid while the key
  // both exists in no.ts AND still lacks German. Once translated (or removed),
  // it must be deleted from ALLOW_LIST so the list can never rot open.
  test('ALLOW_LIST contains no stale entries', () => {
    const stale = ALLOW_LIST.filter((key) => !(key in no) || hasGerman(key)).sort()

    if (stale.length > 0) {
      throw new Error(
        `ALLOW_LIST has ${stale.length} stale entr(y/ies) that must be removed ` +
          '(key no longer exists in no.ts, or now has German in de.ts):\n' +
          stale.map((key) => `  - ${key}`).join('\n')
      )
    }

    expect(stale).toEqual([])
  })
})
