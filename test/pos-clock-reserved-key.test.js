/**
 * `components/admin/pos/ClockScreen.vue` declared `_tick` in `data()`.
 *
 * Vue 2 refuses to proxy a data key beginning with `_` or `$` onto the instance (`isReserved`, in
 * initData), so the declaration was dead: `this._tick` resolved to a plain undeclared instance
 * property that `mounted` happened to create, while `this.$data._tick` stayed `null` forever. Two
 * different things under one name.
 *
 * Measured, not assumed — Vue emits NO warning for this, at any log level. It is silent, which is
 * why nothing had noticed on a screen that ships to the shared checkout's till.
 *
 * The timer itself was never broken (`mounted` and `beforeDestroy` both used the instance property),
 * so removing the declaration is behaviour-preserving. The last test holds that: the ticker must
 * still start on mount and still be cleared on destroy, with no shadow copy in `$data`.
 */
import path from 'path'
import { ESLint } from 'eslint'
import { mount } from '@vue/test-utils'
import ClockScreen from '~/components/admin/pos/ClockScreen.vue'

jest.mock('~/utils/guid', () => ({ newGuid: () => 'test-guid' }))

const ROOT = path.resolve(__dirname, '..')
const RESERVED = 'vue/no-reserved-keys'

const DEFECT_RESTORED = `<template><div /></template>
<script>
export default {
  name: 'FixtureScreen',
  data () {
    return {
      now: new Date(),
      _tick: null
    }
  },
  mounted () { this._tick = setInterval(() => {}, 1000) },
  beforeDestroy () { if (this._tick) { clearInterval(this._tick) } }
}
</script>
`

function reservedKeysIn (result) {
  return result.messages.filter(m => m.ruleId === RESERVED).map(m => `${m.line}:${m.column} ${m.message}`)
}

jest.setTimeout(60000)

describe('the unproxyable data key in components/admin/pos/ClockScreen.vue', () => {
  test('the rule that found it still reports it when the defect is restored', async () => {
    const results = await new ESLint({ cwd: ROOT })
      .lintText(DEFECT_RESTORED, { filePath: path.join(ROOT, 'components/admin/pos/__reserved-fixture__.vue') })

    expect(results).toHaveLength(1)
    const found = reservedKeysIn(results[0])
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('_tick')
  })

  test('the real component declares no data key Vue refuses to proxy', async () => {
    const target = 'components/admin/pos/ClockScreen.vue'
    const results = await new ESLint({ cwd: ROOT }).lintFiles([path.join(ROOT, target)])

    // An ignored or unmatched path yields zero results, which would read exactly like a clean file.
    expect(results).toHaveLength(1)
    expect(results[0].filePath.endsWith(target)).toBe(true)
    expect(reservedKeysIn(results[0])).toEqual([])
  })

  // The same fact without the linter, so this reds even if the ESLint config is what breaks.
  test('every key data() returns is one Vue will expose on the instance', () => {
    const declared = Object.keys(ClockScreen.data())

    expect(declared.length).toBeGreaterThan(0)
    expect(declared.filter(k => k.startsWith('_') || k.startsWith('$'))).toEqual([])
  })

  test('the ticker is still started on mount and cleared on destroy', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ presentCount: 0, entries: [], timeZoneId: 'Europe/Oslo' }))
    }))
    const cleared = jest.spyOn(global, 'clearInterval')

    const wrapper = mount(ClockScreen, {
      provide: {
        pos: {
          sessionId: 'session-1',
          session: { operatorName: 'Ada Lovelace' },
          storeName: 'Okam Pilot',
          logout: jest.fn()
        }
      },
      mocks: { $i: key => key, _coreInitializer: {} }
    })
    await new Promise(resolve => setTimeout(resolve, 0))

    const handle = wrapper.vm._tick
    expect(handle).toBeTruthy()
    // No shadow copy in $data claiming to be this value.
    expect(wrapper.vm.$data._tick).toBeUndefined()

    wrapper.destroy()
    expect(cleared).toHaveBeenCalledWith(handle)
    cleared.mockRestore()
  })
})
