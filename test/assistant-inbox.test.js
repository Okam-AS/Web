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

  // `FailureReason` is written to the row on the way to `Failed`. It is not yet a member of any
  // response model, so today it reaches no wire — and saying "we don't know" is the truth, where a
  // blank would read as "no reason".
  test('says the reason is unavailable rather than leaving a blank', async () => {
    script.list = () => Promise.resolve([row({ Status: 'Failed' })])
    const wrapper = mountInbox([1])
    await settled()

    expect(wrapper.find('[data-test="failed-repair"]').text())
      .toContain('assistant_inbox_failedReasonUnavailable')
    wrapper.destroy()
  })

  // ── READY FOR THE BACKEND LANE IN FLIGHT ───────────────────────────────────────────────────────
  // The day `FailureReason` lands on `StagedActionModel` this screen must stop claiming ignorance
  // without anybody remembering to come back for it.
  test('a reason on the wire is shown, and the "unavailable" line stands down', async () => {
    script.list = () => Promise.resolve([row({
      Status: 'Failed', FailureReason: 'Menu item 4471 was deleted before the change was applied.'
    })])
    const wrapper = mountInbox([1])
    await settled()

    expect(wrapper.find('[data-test="failed-repair"]').text())
      .not.toContain('assistant_inbox_failedReasonUnavailable')
    // It reaches the CARD, which is where a reason belongs — beside the change it describes.
    expect(wrapper.vm.cardFor(wrapper.vm.rows[0]).FailureReason)
      .toBe('Menu item 4471 was deleted before the change was applied.')
    wrapper.destroy()
  })

  // The frozen detail card cannot carry it — a card stamped at stage time has by definition not
  // failed yet — so the overlay is the only way the reason survives the merge.
  test('the reason survives the detail-card merge', async () => {
    script.list = () => Promise.resolve([row({ Status: 'Failed', FailureReason: 'Price floor refused the write.' })])
    script.detail = id => Promise.resolve({
      action: { Id: id, Status: 'Failed' },
      card: { ProposalId: id, Title: 'Prisøkning', NeedsApproval: true }
    })
    const wrapper = mountInbox([1])
    await settled()
    await settled()

    const card = wrapper.vm.cardFor(wrapper.vm.rows[0])
    expect(card.Title).toBe('Prisøkning')
    expect(card.FailureReason).toBe('Price floor refused the write.')
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

// ── THE OUTCOME OUTLIVES THE RE-READ ─────────────────────────────────────────────────────────────
//
// ⚠️ THE ORDER OF TWO STATEMENTS WAS THE WHOLE BUG. `handleDecisionFailure` set the message and THEN
// called `load()`, which opens by clearing `failure` and blanking `rows` — so the sentence lived for
// one microtask and was erased by the read it had just triggered. Compounding it, a successful
// approve said nothing at all, and a non-kill-switch 409 moves the row out of the default `Staged`
// filter, so the per-row conflict binding matched nothing either. Three ways to be silent on the one
// screen where silence is least affordable. These assert the DOM, because that is where the
// silence was.
describe('what the inbox says about a decision', () => {
  /** A list that answers `first` once and `then` on every later read. */
  function listThen (first, then) {
    let served = false
    return () => {
      const answer = served ? then : first
      served = true
      return Promise.resolve(answer)
    }
  }

  test('a successful approve is confirmed above the list, after the reload that follows it', async () => {
    script.list = listThen([row()], [])
    const wrapper = mountInbox([1])
    await settled()

    await wrapper.vm.onApprove('a-1')
    await settled()
    await wrapper.vm.$nextTick()

    const decision = wrapper.find('[data-test="decision"]')
    expect(decision.exists()).toBe(true)
    expect(decision.text()).toContain('assistant_card_approved')
    // The row is gone from the re-read and the confirmation is not.
    expect(wrapper.vm.rows).toEqual([])
    wrapper.destroy()
  })

  test('a replay says so rather than claiming a second change', async () => {
    script.list = listThen([row()], [])
    script.approve = () => Promise.resolve({ proposalId: 'a-1', status: 'executed', wasReplay: true })
    const wrapper = mountInbox([1])
    await settled()

    await wrapper.vm.onApprove('a-1')
    await settled()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="decision"]').text()).toContain('assistant_card_approvedReplay')
    wrapper.destroy()
  })

  test('a successful reject is confirmed too', async () => {
    script.list = listThen([row()], [])
    const wrapper = mountInbox([1])
    await settled()

    await wrapper.vm.onReject('a-1')
    await settled()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="decision"]').text()).toContain('assistant_card_rejected')
    wrapper.destroy()
  })

  // The row leaves the board on this path, so the banner is the ONLY place the refusal can be said.
  test('a 409 whose row the re-read drops still reports the refusal, with the server’s words', async () => {
    script.list = listThen([row()], [])
    script.approve = () => Promise.reject(new AssistantApiError(409, {
      message: 'This proposal is already live and cannot be turned down.'
    }))
    const wrapper = mountInbox([1])
    await settled()

    await wrapper.vm.onApprove('a-1')
    await settled()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.rows).toEqual([])
    const decision = wrapper.find('[data-test="decision"]')
    expect(decision.text()).toContain('assistant_conflict_unresolvable')
    expect(decision.text()).toContain('This proposal is already live and cannot be turned down.')
    wrapper.destroy()
  })

  // `failure` is the READ-failure slot and the template renders it INSTEAD of the list. A failed
  // decision routed through it would blank an inbox that is perfectly readable.
  test('a non-409 refusal is reported without blanking the list', async () => {
    script.list = () => Promise.resolve([row()])
    script.approve = () => Promise.reject(new AssistantApiError(500, { message: 'boom' }))
    const wrapper = mountInbox([1])
    await settled()

    await wrapper.vm.onApprove('a-1')
    await settled()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="decision"]').text()).toContain('boom')
    expect(wrapper.vm.failure).toBe('')
    expect(wrapper.find('[data-test="failure"]').exists()).toBe(false)
    expect(wrapper.findAll('proposalcardview-stub').length).toBe(1)
    wrapper.destroy()
  })

  test('the outcome of a decision made under a different filter is not kept', async () => {
    script.list = listThen([row()], [])
    const wrapper = mountInbox([1])
    await settled()
    await wrapper.vm.onApprove('a-1')
    await settled()
    expect(wrapper.vm.decision).not.toBeNull()

    wrapper.vm.setStatus(null)
    await settled()

    expect(wrapper.vm.decision).toBeNull()
    wrapper.destroy()
  })

  // A bare method reference in `@click` receives the EVENT as its first argument, which `load` reads
  // as `quiet` — so this button used to run the silent poll path and could never show its own label.
  test('the refresh button runs a LOUD read, not the poll path', async () => {
    script.list = () => new Promise(() => {})
    const wrapper = mountInbox([1])
    await settled()

    wrapper.find('[data-test="refresh"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.loading).toBe(true)
    wrapper.destroy()
  })
})
