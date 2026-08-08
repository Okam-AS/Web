import { shallowMount } from '@vue/test-utils'

// eslint-disable-next-line import/first -- the mock must be registered before the component is imported.
import PendingActions from '~/components/admin/assistant/PendingActions.vue'
import { AssistantApiError } from '~/utils/assistant/api-client'

const calls = []
const script = {}

jest.mock('~/utils/assistant/api-client', () => {
  const actual = jest.requireActual('~/utils/assistant/api-client')
  return Object.assign({}, actual, {
    AssistantService: class {
      ListStagedActions (storeId, status) {
        calls.push(['List', storeId, status])
        return script.list ? script.list(storeId) : Promise.resolve([])
      }

      Approve (id) {
        calls.push(['Approve', id])
        return script.approve ? script.approve() : Promise.resolve({ proposalId: id, status: 'executed' })
      }

      Reject (id) {
        calls.push(['Reject', id])
        return script.reject ? script.reject() : Promise.resolve({ proposalId: id, status: 'rejected' })
      }

      GetStagedAction (id) {
        calls.push(['Detail', id])
        return script.detail ? script.detail(id) : Promise.reject(new Error('no detail scripted'))
      }
    }
  })
})

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function mountInbox (storeIds) {
  return shallowMount(PendingActions, {
    propsData: { storeIds: storeIds === undefined ? [1] : storeIds },
    mocks: {
      $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
      priceLabel: minor => 'kr ' + minor,
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { ProposalCardView: true }
  })
}

const row = over => Object.assign({
  Id: 'a-1',
  StoreId: 1,
  Kind: 'menu_price_change',
  Status: 'Staged',
  DryRunDiff: 'Tre retter opp 25 %',
  CreatedAt: '2026-08-08T10:00:00',
  ExpiresAt: '2026-08-10T10:00:00',
  Origin: 'chat'
}, over || {})

beforeEach(() => {
  calls.length = 0
  Object.keys(script).forEach(key => delete script[key])
})

describe('reading the inbox', () => {
  test('reads each selected store, filtered to Staged by default', async () => {
    const wrapper = mountInbox([1, 2])
    await settled()

    expect(calls).toEqual([['List', 1, 'Staged'], ['List', 2, 'Staged']])
    wrapper.destroy()
  })

  test('rows from several stores are merged newest first', async () => {
    script.list = storeId => Promise.resolve([
      row({ Id: 's' + storeId, StoreId: storeId, CreatedAt: storeId === 1 ? '2026-08-08T09:00:00' : '2026-08-08T11:00:00' })
    ])
    const wrapper = mountInbox([1, 2])
    await settled()

    expect(wrapper.vm.rows.map(r => r.Id)).toEqual(['s2', 's1'])
    wrapper.destroy()
  })

  // ── UNKNOWN IS NOT EMPTY ──────────────────────────────────────────────────────────────────────
  // The two look identical on screen and only one of them means the merchant can stop checking.
  test('a failed read renders a refusal, never "nothing is waiting"', async () => {
    script.list = () => Promise.reject(new AssistantApiError(503, { message: 'down' }))
    const wrapper = mountInbox([1])
    await settled()

    expect(wrapper.vm.rows).toBeNull()
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="failure"]').text()).toBe('down')
    wrapper.destroy()
  })

  test('an empty inbox says so, and that is a different screen', async () => {
    const wrapper = mountInbox([1])
    await settled()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="failure"]').exists()).toBe(false)
    wrapper.destroy()
  })

  test('no store selected asks nothing and says why', async () => {
    const wrapper = mountInbox([])
    await settled()

    expect(calls).toEqual([])
    expect(wrapper.find('[data-test="no-scope"]').exists()).toBe(true)
    wrapper.destroy()
  })
})

// ── POLLING ──────────────────────────────────────────────────────────────────────────────────────
// There is no WebSocket, EventSource, socket.io or SignalR anywhere in this application's code, and
// this inbox did not introduce the first one.
describe('the poll', () => {
  test('starts on mount and is CLEARED on destroy', async () => {
    const clear = jest.spyOn(global, 'clearInterval')
    const wrapper = mountInbox([1])
    await settled()
    const timer = wrapper.vm.timer
    expect(timer).not.toBeNull()

    wrapper.destroy()

    expect(clear).toHaveBeenCalledWith(timer)
    expect(wrapper.vm.timer).toBeNull()
    clear.mockRestore()
  })

  // `beforeDestroy` holds ONE handle, so a second interval started over the top of the first is one
  // this component can never stop — it would keep polling after the tab is gone.
  test('restarting clears the previous handle first, so only one can ever be live', async () => {
    const wrapper = mountInbox([1])
    await settled()
    const first = wrapper.vm.timer

    wrapper.vm.startPolling()
    const second = wrapper.vm.timer

    expect(second).not.toBe(first)
    // The old one is gone rather than orphaned.
    const clear = jest.spyOn(global, 'clearInterval')
    wrapper.vm.startPolling()
    expect(clear).toHaveBeenCalledWith(second)
    clear.mockRestore()
    wrapper.destroy()
  })

  // A spinner every six seconds is a board that looks broken, and a poll that blanks the list on a
  // transient failure replaces a real answer with an unknown one.
  test('a quiet poll neither shows a spinner nor discards the last known list', async () => {
    script.list = () => Promise.resolve([row()])
    const wrapper = mountInbox([1])
    await settled()
    expect(wrapper.vm.rows.length).toBe(1)

    script.list = () => Promise.reject(new AssistantApiError(503, { message: 'blip' }))
    await wrapper.vm.load(true)
    await settled()

    expect(wrapper.vm.rows.length).toBe(1)
    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.vm.failure).toBe('')
    wrapper.destroy()
  })
})

// ── THE DETAIL READ: FROZEN CARD, LIVE STATUS ────────────────────────────────────────────────────
// `GET /staged-actions/{id}` answers `{ action, card }`, and the card is rebuilt verbatim from the
// bytes frozen at stage time — so it says `NeedsApproval: true` with live approve/reject refs even
// for rows that already executed. The list row is the only fresh account of the status.
describe('the single GET per row', () => {
  const detailFor = id => Promise.resolve({
    action: { Id: id, Status: 'Staged' },
    card: { ProposalId: id, Title: 'Prisøkning på tre retter', PlainWords: 'Tre retter opp 25 %.', NeedsApproval: true }
  })

  test('enriches each row once and hands the card down for DISPLAY', async () => {
    script.list = () => Promise.resolve([row()])
    script.detail = detailFor
    const wrapper = mountInbox([1])
    await settled()
    await settled()

    expect(calls).toContainEqual(['Detail', 'a-1'])
    expect(wrapper.vm.cardFor(wrapper.vm.rows[0]).Title).toBe('Prisøkning på tre retter')
    wrapper.destroy()
  })

  // ⚠️ THE TRAP. The card claims NeedsApproval forever. If the status came from the card, an
  // executed row would show a live Approve button.
  test('the status handed down is the LIST row’s, never the frozen card’s', async () => {
    script.list = () => Promise.resolve([row({ Status: 'Executed' })])
    script.detail = detailFor
    const wrapper = mountInbox([1])
    await settled()
    await settled()

    expect(wrapper.vm.statusOf(wrapper.vm.rows[0])).toBe('Executed')
    // And the object handed down as the card carries no status of its own to be mistaken for one.
    expect(wrapper.vm.cardFor(wrapper.vm.rows[0]).Status).toBeUndefined()
    wrapper.destroy()
  })

  // The card is frozen, so re-reading it every six seconds is N requests per tick for identical
  // bytes.
  test('the detail is fetched once per id, never on a poll', async () => {
    script.list = () => Promise.resolve([row()])
    script.detail = detailFor
    const wrapper = mountInbox([1])
    await settled()
    await settled()
    const before = calls.filter(c => c[0] === 'Detail').length

    await wrapper.vm.load(true)
    await settled()
    await settled()

    expect(calls.filter(c => c[0] === 'Detail').length).toBe(before)
    expect(before).toBe(1)
    wrapper.destroy()
  })

  // A degraded card is not a broken inbox: the list row already renders something the merchant can
  // act on, so a detail read that does not answer must cost prose and nothing else.
  test('a failed detail read leaves the list row rendering, and reports no error', async () => {
    script.list = () => Promise.resolve([row()])
    script.detail = () => Promise.reject(new AssistantApiError(404, { message: 'nope' }))
    const wrapper = mountInbox([1])
    await settled()
    await settled()

    expect(wrapper.vm.rows.length).toBe(1)
    expect(wrapper.vm.failure).toBe('')
    expect(wrapper.vm.cardFor(wrapper.vm.rows[0])).toBe(wrapper.vm.rows[0])
    expect(wrapper.find('[data-test="failure"]').exists()).toBe(false)
    wrapper.destroy()
  })
})

// ── ONE SPINE, ONE INBOX ─────────────────────────────────────────────────────────────────────────
describe('what an origin does and does not change', () => {
  test('a SocialChef-origin row gets the same card and the same markup as a chat row', async () => {
    script.list = () => Promise.resolve([row({ Id: 'a-1', Origin: 'mcp' }), row({ Id: 'a-2', Origin: 'chat' })])
    const wrapper = mountInbox([1])
    await settled()

    const cards = wrapper.findAll('proposalcardview-stub')
    expect(cards.length).toBe(2)
    // No kind-specific or origin-specific chrome: the two rows differ only in the data handed down.
    expect(wrapper.findAll('.pending-actions__row').at(0).classes())
      .toEqual(wrapper.findAll('.pending-actions__row').at(1).classes())
    wrapper.destroy()
  })
})

// ── A FAILED ROW IS REPAIRED FORWARD, NEVER RESET ────────────────────────────────────────────────
describe('a Failed row', () => {
  test('offers a NEW proposal and no reset', async () => {
    script.list = () => Promise.resolve([row({ Status: 'Failed' })])
    const wrapper = mountInbox([1])
    await settled()

    const repair = wrapper.find('[data-test="failed-repair"]')
    expect(repair.exists()).toBe(true)
    expect(repair.text()).toContain('assistant_inbox_failedCompose')
    // There is no edge out of Failed in the spine, so there is no control that claims one.
    expect(repair.text()).not.toContain('retry')
    wrapper.destroy()
  })

  // `FailureReason` is written to the row and is NOT a member of any response model, so it reaches
  // no wire. Saying "we don't know" is the truth; a blank would read as "no reason".
  test('says the reason is unavailable rather than leaving a blank', async () => {
    script.list = () => Promise.resolve([row({ Status: 'Failed' })])
    const wrapper = mountInbox([1])
    await settled()

    expect(wrapper.find('[data-test="failed-repair"]').text())
      .toContain('assistant_inbox_failedReasonUnavailable')
    wrapper.destroy()
  })

  test('composing again is handed up to the page, not done here', async () => {
    script.list = () => Promise.resolve([row({ Status: 'Failed' })])
    const wrapper = mountInbox([1])
    await settled()

    wrapper.find('[data-test="failed-compose"]').trigger('click')

    expect(wrapper.emitted('compose-again')[0][0].Id).toBe('a-1')
    wrapper.destroy()
  })

  test('a Staged row shows no repair block', async () => {
    script.list = () => Promise.resolve([row()])
    const wrapper = mountInbox([1])
    await settled()

    expect(wrapper.find('[data-test="failed-repair"]').exists()).toBe(false)
    wrapper.destroy()
  })
})

// ── DECIDING ─────────────────────────────────────────────────────────────────────────────────────
describe('approve and reject', () => {
  // A 409 body carries no status member, so the only way to learn what the row is now is to ask.
  test('the list is re-read after a decision, whatever the outcome', async () => {
    script.list = () => Promise.resolve([row()])
    const wrapper = mountInbox([1])
    await settled()
    calls.length = 0

    await wrapper.vm.onApprove('a-1')
    await settled()

    expect(calls[0]).toEqual(['Approve', 'a-1'])
    expect(calls[1]).toEqual(['List', 1, 'Staged'])
    wrapper.destroy()
  })

  test('a conflict is re-read too, and attaches to the row it came from', async () => {
    script.list = () => Promise.resolve([row()])
    script.approve = () => Promise.reject(new AssistantApiError(409, { message: 'This proposal has expired — nothing was created.' }))
    const wrapper = mountInbox([1])
    await settled()

    await wrapper.vm.onApprove('a-1')
    await settled()

    expect(wrapper.vm.conflictId).toBe('a-1')
    expect(wrapper.vm.conflict.key).toBe('assistant_conflict_unresolvable')
    expect(calls.filter(c => c[0] === 'List').length).toBe(2)
    wrapper.destroy()
  })

  // A disabled attribute is a rendering; this call writes prices.
  test('a second decision while one is in flight is refused', async () => {
    script.list = () => Promise.resolve([row()])
    const wrapper = mountInbox([1])
    await settled()
    wrapper.setData({ busyId: 'a-1' })
    calls.length = 0

    await wrapper.vm.onApprove('a-1')

    expect(calls).toEqual([])
    wrapper.destroy()
  })
})
