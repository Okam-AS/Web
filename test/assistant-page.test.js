import { shallowMount } from '@vue/test-utils'

// eslint-disable-next-line import/first -- the mock must be registered before the page is imported.
import AssistantPage from '~/pages/admin/assistant.vue'
import { AssistantApiError, CONFLICT_KIND_DISABLED } from '~/utils/assistant/api-client'

const calls = []
const script = {}

// The pure helpers (`pick`, `needsStoreChoice`, `describeConflict`) are the REAL ones — they are the
// thing the page's rendering decisions are made of, and stubbing them would leave these tests
// asserting against a second, friendlier implementation of the wire.
//
// ⚠️ `script.ask` STILL RETURNS A BARE `ChatAskResponseModel`, and the mock WRAPS it. That is not a
// convenience: it is the wire. `AssistantConversationTurnModel` carries the identical response under
// `answer`, beside `notRemembered`, so every fixture written against the one-shot route describes a
// conversation turn without a word changed. Tests that care about the envelope set `script.turn`.
jest.mock('~/utils/assistant/api-client', () => {
  const actual = jest.requireActual('~/utils/assistant/api-client')
  // The names the SERVER returns for the scope it verified. A create answers with real store names
  // (`StoreNames`), and the venue picker is built from them, so a mock inventing "Store 1" would
  // leave those buttons asserting against a label no deployment produces.
  const NAMES = { 1: 'Bryggen Bistro', 2: 'Torget' }
  return Object.assign({}, actual, {
    AssistantService: class {
      StartConversation (storeIds) {
        calls.push(['Start', storeIds])
        if (script.start) { return script.start() }
        const ids = Array.isArray(storeIds) && storeIds.length ? storeIds : [1]
        return Promise.resolve({
          id: 'conv-' + calls.filter(call => call[0] === 'Start').length,
          status: 'Active',
          storeIds: ids,
          storeNames: ids.map(id => NAMES[id] || String(id)),
          messageCount: 0
        })
      }

      AskInConversation (conversationId, question, targetStoreId, languageCode) {
        calls.push(['Ask', question, targetStoreId, languageCode, conversationId])
        return Promise.resolve(script.ask ? script.ask() : { Answer: 'et svar', Status: 'answered' })
          .then(answer => (script.turn ? script.turn(answer) : { conversationId, sequence: 2, answer, notRemembered: false }))
      }

      CloseConversation (conversationId) {
        calls.push(['Close', conversationId])
        return script.close ? script.close() : Promise.resolve({ id: conversationId, status: 'Closed' })
      }

      Approve (id) {
        calls.push(['Approve', id])
        return script.approve ? script.approve() : Promise.resolve({ proposalId: id, status: 'executed' })
      }

      Reject (id) {
        calls.push(['Reject', id])
        return script.reject ? script.reject() : Promise.resolve({ proposalId: id, status: 'rejected' })
      }

      ListStagedActions () { return Promise.resolve([]) }
    }
  })
})

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

const TWO_STORES = [{ id: 1, name: 'Bryggen Bistro' }, { id: 2, name: 'Torget' }]

function mountPage (options) {
  const opts = options || {}
  const replaced = []
  return shallowMount(AssistantPage, {
    mocks: {
      $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
      priceLabel: minor => 'kr ' + minor,
      $route: { path: '/admin/assistant', query: opts.query || {} },
      $router: { replace: (to) => { replaced.push(to); return Promise.resolve() }, push: () => Promise.resolve() },
      _coreInitializer: { bearerToken: 'tok' },
      $store: {
        getters: { userIsLoggedIn: true },
        state: {
          adminLocale: opts.locale || 'no',
          currentUser: { id: 1, adminIn: opts.stores || TWO_STORES }
        }
      },
      _replaced: replaced
    },
    stubs: {
      AdminPage: { template: '<div><slot /></div>' },
      MultiSelectDropdown: true,
      PendingActions: true
    }
  })
}

beforeEach(() => {
  calls.length = 0
  Object.keys(script).forEach(key => delete script[key])
})

describe('the store scope', () => {
  test('defaults to every store the admin administers', async () => {
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.selectedStoreIds).toEqual([1, 2])
  })

  test('the explicit selection is what gets asked, never the question text', async () => {
    const wrapper = mountPage()
    await settled()

    wrapper.setData({ selectedStoreIds: [2], draft: 'hvor mye solgte Bryggen Bistro?' })
    wrapper.vm.submit()
    await settled()

    // The question names store 1 by name; the scope sent is the one the PICKER holds — and it is
    // sent when the THREAD is opened, because a conversation is frozen to the stores it started
    // with. The turn itself names no scope at all.
    expect(calls[0]).toEqual(['Start', [2]])
    expect(calls[1].slice(0, 4)).toEqual(['Ask', 'hvor mye solgte Bryggen Bistro?', null, 'no'])
  })

  // `AIQueryBox` hard-coded `'no'`, so a German operator was answered in Norwegian.
  test('the language is the operator’s own admin locale', async () => {
    const wrapper = mountPage({ locale: 'de' })
    await settled()

    wrapper.setData({ draft: 'frage' })
    wrapper.vm.submit()
    await settled()

    expect(calls[1][3]).toBe('de')
  })
})

// ── OFFERED, NEVER APPLIED ───────────────────────────────────────────────────────────────────────
// The backend reports stores the QUESTION TEXT named separately from the scope it answered over,
// precisely so a sentence cannot choose which store a change lands on.
describe('the store suggestion', () => {
  test('a suggestion never moves the scope on its own', async () => {
    script.ask = () => Promise.resolve({
      Answer: 'svar',
      Status: 'answered',
      StoreIds: [1, 2],
      StoreSuggestion: { StoreIds: [2], StoreNames: ['Torget'] }
    })
    const wrapper = mountPage()
    await settled()

    wrapper.setData({ draft: 'hvordan går det på Torget?' })
    wrapper.vm.submit()
    await settled()

    expect(wrapper.find('[data-test="suggestion"]').exists()).toBe(true)
    // The scope is untouched until a human presses the chip.
    expect(wrapper.vm.selectedStoreIds).toEqual([1, 2])
  })

  test('pressing the chip is what applies it', async () => {
    script.ask = () => Promise.resolve({
      Answer: 'svar',
      Status: 'answered',
      StoreIds: [1, 2],
      StoreSuggestion: { StoreIds: [2], StoreNames: ['Torget'] }
    })
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    wrapper.find('[data-test="suggestion-apply"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.selectedStoreIds).toEqual([2])
    expect(wrapper.find('[data-test="suggestion"]').exists()).toBe(false)
  })

  test('dismissing it leaves the scope alone', async () => {
    script.ask = () => Promise.resolve({
      Answer: 'svar',
      Status: 'answered',
      StoreIds: [1, 2],
      StoreSuggestion: { StoreIds: [2], StoreNames: ['Torget'] }
    })
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    wrapper.find('[data-test="suggestion-dismiss"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.selectedStoreIds).toEqual([1, 2])
  })
})

// ── THE VENUE PICKER ─────────────────────────────────────────────────────────────────────────────
describe('when the turn needs one venue', () => {
  // ⚠️ THE BUTTONS COME FROM THE THREAD'S FROZEN SCOPE, NOT FROM THE RESPONSE. A conversation turn
  // answers `storeIds: null` — the controller that fills that field is not on this path — so a
  // picker built from the response would have rendered zero buttons on the one turn where the
  // backend refuses to choose a venue itself, without erroring anywhere.
  test('venue buttons are built from the thread’s own scope, and re-ask narrowed to one store', async () => {
    script.ask = () => Promise.resolve({
      Status: 'answered',
      Answer: 'Hvilken butikk gjelder det? Velg én av Bryggen Bistro, Torget, så forbereder jeg forslaget.',
      StoreIds: [1, 2],
      StoreNames: ['Bryggen Bistro', 'Torget']
    })
    const wrapper = mountPage()
    await settled()

    wrapper.setData({ draft: 'øk prisen på alle pizzaer med 25 %' })
    wrapper.vm.submit()
    await settled()

    const picker = wrapper.find('[data-test="venue-picker"]')
    expect(picker.exists()).toBe(true)
    const buttons = picker.findAll('button')
    expect(buttons.length).toBe(2)
    expect(buttons.at(1).text()).toBe('Torget')

    script.ask = () => Promise.resolve({ Answer: 'ok', Status: 'proposal_staged', StoreIds: [2] })
    buttons.at(1).trigger('click')
    await settled()

    // The SAME question, re-asked NARROWED to one store of the frozen scope — and on the SAME
    // thread. Re-opening one would throw away the turn the merchant is answering.
    expect(calls[2].slice(0, 4)).toEqual(['Ask', 'øk prisen på alle pizzaer med 25 %', 2, 'no'])
    expect(calls[2][4]).toBe(calls[1][4])
    expect(calls.filter(call => call[0] === 'Start').length).toBe(1)
  })

  test('an ordinary answer grows no buttons', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'hvor mye solgte vi?' })
    wrapper.vm.submit()
    await settled()

    expect(wrapper.find('[data-test="venue-picker"]').exists()).toBe(false)
  })
})

// ── THE ANSWER IS TEXT, NOT MARKUP ───────────────────────────────────────────────────────────────
// `$md()` is not used and must not be: this project's markdownit is configured `html: true`
// (nuxt.config.js:321-324), so HTML inside a model answer would be RENDERED. On a surface whose
// entire content is model output that is an XSS hole opened by configuration.
describe('how the model’s answer is rendered', () => {
  test('markup in an answer is shown as characters, not parsed', async () => {
    script.ask = () => Promise.resolve({
      Answer: '<img src=x onerror=alert(1)> og <b>fet</b>', Status: 'answered', StoreIds: [1]
    })
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    const answer = wrapper.find('[data-test="answer"]')
    expect(answer.text()).toContain('<img src=x onerror=alert(1)>')
    expect(answer.element.querySelector('img')).toBeNull()
    expect(answer.element.querySelector('b')).toBeNull()
  })

  // The note used to say the assistant remembers nothing, and it was true of the stateless endpoint
  // the page posted to. It holds a thread now, and the line says what that memory covers.
  test('the composer states what the assistant remembers', async () => {
    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('[data-test="memory-note"]').text()).toBe('assistant_memoryNote')
  })
})

// ── THE BASIS DRAWER ─────────────────────────────────────────────────────────────────────────────
describe('the basis drawer', () => {
  test('renders the fields the response carries, and omits the ones it does not', async () => {
    script.ask = () => Promise.resolve({
      Answer: 'svar',
      Status: 'answered',
      StoreIds: [1],
      StoreNames: ['Bryggen Bistro'],
      Assumptions: ['Uke 31 er lagt til grunn'],
      Warnings: ['To dager mangler data'],
      // `Sql` is ALWAYS null (the orchestrator nulls it unconditionally) and there is no Period on
      // the trace at all — it lives inside ToolArguments and is frequently absent.
      Trace: { Tool: 'sales_summary, menu_price_change', ToolRounds: 2, StopReason: 'model_finished', Model: 'gemini-3-flash-preview', Sql: null }
    })
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    wrapper.find('[data-test="basis-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()

    const basis = wrapper.find('[data-test="basis"]')
    expect(basis.text()).toContain('Uke 31 er lagt til grunn')
    expect(basis.text()).toContain('To dager mangler data')
    expect(basis.text()).toContain('sales_summary, menu_price_change')
    expect(basis.text()).toContain('Bryggen Bistro')
    // No period row: the trace carried none, and a blank row would claim one was measured.
    expect(basis.text()).not.toContain('assistant_basis_period')
  })

  test('a period is shown when the trace actually carries one', async () => {
    script.ask = () => Promise.resolve({
      Answer: 'svar',
      Status: 'answered',
      StoreIds: [1],
      Trace: { Tool: 'sales_summary', ToolRounds: 1, ToolArguments: [{ Name: 'sales_summary', Arguments: { Period: 'last_week' } }] }
    })
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()
    wrapper.find('[data-test="basis-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="basis"]').text()).toContain('last_week')
  })
})

// ── DECIDING ON A CARD ───────────────────────────────────────────────────────────────────────────
//
// ⚠️ THESE ASSERT THE DOM, NOT THE VIEW MODEL, AND THAT DISTINCTION IS THE WHOLE LESSON HERE.
// An earlier version of this file checked `thread[0].decided` and `thread[0].cards` and was green
// while the screen said NOTHING: the cards container was gated on `v-if="turn.cards.length"` and
// deciding clears `cards`, so the container — and the confirmation line inside it — unrendered at the
// exact moment there was something to confirm. A merchant approved two hundred price changes and
// watched the card vanish in silence. The state was right; the screen was empty. Only a query
// against rendered output can see that, so every assertion below goes through `find`.
describe('approving and rejecting from the thread', () => {
  const staged = {
    Answer: 'Jeg har forberedt en prisendring.',
    Status: 'proposal_staged',
    StoreIds: [1],
    Cards: [{ ProposalId: 'p-1', Title: 'Prisøkning', AffectedCount: 3, ChangeSet: [] }]
  }

  test('an approved card is replaced by what happened', async () => {
    script.ask = () => Promise.resolve(staged)
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'øk prisene' })
    wrapper.vm.submit()
    await settled()

    await wrapper.vm.onApprove(wrapper.vm.thread[0], 'p-1')
    await settled()

    expect(calls).toContainEqual(['Approve', 'p-1'])
    expect(wrapper.vm.thread[0].cards).toEqual([])
    expect(wrapper.vm.thread[0].decided).toEqual({ tone: 'ok', text: 'assistant_card_approved' })
  })

  // Approving an already-executed row REPLAYS the recorded outcome rather than creating a second
  // one, and the merchant is told that is what happened.
  test('a replay says so instead of claiming a second change', async () => {
    script.ask = () => Promise.resolve(staged)
    script.approve = () => Promise.resolve({ proposalId: 'p-1', status: 'executed', wasReplay: true })
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    await wrapper.vm.onApprove(wrapper.vm.thread[0], 'p-1')

    expect(wrapper.vm.thread[0].decided).toEqual({ tone: 'ok', text: 'assistant_card_approvedReplay' })
  })

  // The kill switch is the ONE refusal where retrying later can succeed with the merchant doing
  // nothing, so removing the card would remove the thing they will approve in ten minutes.
  test('a kill-switch refusal KEEPS the card', async () => {
    script.ask = () => Promise.resolve(staged)
    script.approve = () => Promise.reject(new AssistantApiError(409, {
      message: 'This kind of change is switched off for this store…', code: CONFLICT_KIND_DISABLED
    }))
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    await wrapper.vm.onApprove(wrapper.vm.thread[0], 'p-1')

    expect(wrapper.vm.thread[0].cards.length).toBe(1)
    expect(wrapper.vm.thread[0].conflict.key).toBe('assistant_conflict_kindDisabled')
  })

  test('every other 409 removes it, because the row has already moved', async () => {
    script.ask = () => Promise.resolve(staged)
    script.approve = () => Promise.reject(new AssistantApiError(409, {
      message: 'This proposal has expired — nothing was created.'
    }))
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    await wrapper.vm.onApprove(wrapper.vm.thread[0], 'p-1')

    expect(wrapper.vm.thread[0].cards).toEqual([])
    expect(wrapper.vm.thread[0].conflict.key).toBe('assistant_conflict_unresolvable')
  })

  // ── WHAT THE MERCHANT ACTUALLY SEES ────────────────────────────────────────────────────────────
  // Each of the three below fails against a container gated on `cards.length` alone.
  async function decide (wrapper, method) {
    await wrapper.vm[method](wrapper.vm.thread[0], 'p-1')
    await settled()
    await wrapper.vm.$nextTick()
  }

  test('an approved card leaves a confirmation ON SCREEN, not just in the view model', async () => {
    script.ask = () => Promise.resolve(staged)
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'øk prisene' })
    wrapper.vm.submit()
    await settled()

    await decide(wrapper, 'onApprove')

    const decided = wrapper.find('[data-test="decided"]')
    expect(decided.exists()).toBe(true)
    expect(decided.text()).toBe('assistant_card_approved')
    // And it is rendered as a SUCCESS. The tone is asserted, not just the sentence, because the
    // failure path renders into this same element and the two must never look alike.
    expect(decided.classes()).toContain('is-ok')
    // The card is gone and the confirmation is not: the container outlives its cards.
    expect(wrapper.find('proposalcardview-stub').exists()).toBe(false)
  })

  test('a rejected card says so on screen too', async () => {
    script.ask = () => Promise.resolve(staged)
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    await decide(wrapper, 'onReject')

    expect(wrapper.find('[data-test="decided"]').text()).toBe('assistant_card_rejected')
    expect(wrapper.find('[data-test="decided"]').classes()).toContain('is-ok')
  })

  // ── A FAILURE MUST NOT WEAR THE CONFIRMATION'S CHROME ───────────────────────────────────────────
  // The decided line carries both outcomes. A 500 on approve is the one case where NOBODY knows
  // whether the prices moved, and it used to render in the same green box that otherwise means "the
  // change has been made". The words were honest; the colour was not, and colour is read first.
  // These fail against a decided line with no tone on it.
  test('a 500 on approve is rendered as a REFUSAL, not as a confirmation', async () => {
    script.ask = () => Promise.resolve(staged)
    script.approve = () => Promise.reject(new AssistantApiError(500, { message: 'Noe gikk galt.' }))
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    await decide(wrapper, 'onApprove')

    const decided = wrapper.find('[data-test="decided"]')
    expect(decided.text()).toBe('Noe gikk galt.')
    expect(decided.classes()).toContain('is-refused')
    expect(decided.classes()).not.toContain('is-ok')
    // The card stays: a 500 is not an answer about what the proposal now is, and withdrawing the
    // offer would tell the merchant a decision was reached.
    expect(wrapper.find('proposalcardview-stub').exists()).toBe(true)
  })

  test('a non-typed failure falls back to the house sentence, still refused', async () => {
    script.ask = () => Promise.resolve(staged)
    script.approve = () => Promise.reject(new Error('socket hang up'))
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    await decide(wrapper, 'onApprove')

    const decided = wrapper.find('[data-test="decided"]')
    expect(decided.text()).toBe('assistant_card_decisionFailed')
    expect(decided.classes()).toContain('is-refused')
  })

  // The worst of the three: `applyDecisionFailure` sets the conflict and clears the cards, and the
  // conflict used to render only INSIDE a card that no longer existed. Approving an expired proposal
  // said nothing at all.
  test('an unresolvable 409 renders the refusal and the server’s own words', async () => {
    script.ask = () => Promise.resolve(staged)
    script.approve = () => Promise.reject(new AssistantApiError(409, {
      message: 'This proposal is already live and cannot be turned down.'
    }))
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    await decide(wrapper, 'onApprove')

    const conflict = wrapper.find('[data-test="conflict"]')
    expect(conflict.exists()).toBe(true)
    expect(conflict.text()).toContain('assistant_conflict_unresolvable')
    // The server's sentence is the ONLY account of what really happened to the proposal, and the
    // translated line above it now promises the reader it is here. It has to be.
    expect(conflict.text()).toContain('This proposal is already live and cannot be turned down.')
  })

  // The kill switch keeps its card AND explains itself — the two are not alternatives.
  test('a kill-switch refusal renders beside the card it kept', async () => {
    script.ask = () => Promise.resolve(staged)
    script.approve = () => Promise.reject(new AssistantApiError(409, {
      message: 'This kind of change is switched off for this store…', code: CONFLICT_KIND_DISABLED
    }))
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    await decide(wrapper, 'onApprove')

    expect(wrapper.find('proposalcardview-stub').exists()).toBe(true)
    expect(wrapper.find('[data-test="conflict"]').text()).toContain('assistant_conflict_kindDisabled')
  })

  // ── DECIDING ONE CARD IS NOT DECIDING THE OTHERS ───────────────────────────────────────────────
  // Two staged proposals on one turn is a shape the wire really produces: `ChatOrchestrator` ships an
  // ACCUMULATED `Cards` list across a turn's tool rounds. Clearing the whole list made approving one
  // of them silently retract the other, under a singular "Approved" line speaking for a decision the
  // merchant never made. The survivor stayed reachable in the inbox, so nothing was lost — but the
  // thread described a turn that did not happen. These three fail against `turn.cards = []`.
  const twoStaged = {
    Answer: 'Jeg har forberedt to endringer.',
    Status: 'proposal_staged',
    StoreIds: [1],
    Cards: [
      { ProposalId: 'p-1', Title: 'Prisøkning', AffectedCount: 3, ChangeSet: [] },
      { ProposalId: 'p-2', Title: 'Prisnedgang', AffectedCount: 5, ChangeSet: [] }
    ]
  }

  async function mountTwoCardTurn () {
    script.ask = () => Promise.resolve(twoStaged)
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'juster prisene' })
    wrapper.vm.submit()
    await settled()
    // The premise of all three: BOTH are on screen before anything is decided.
    expect(wrapper.findAll('proposalcardview-stub').length).toBe(2)
    return wrapper
  }

  test('approving one of two proposals leaves the other standing', async () => {
    const wrapper = await mountTwoCardTurn()

    await decide(wrapper, 'onApprove') // p-1

    expect(calls).toContainEqual(['Approve', 'p-1'])
    expect(calls).not.toContainEqual(['Approve', 'p-2'])
    // ON SCREEN: one card, and it is the one nobody ruled on.
    const surviving = wrapper.findAll('proposalcardview-stub')
    expect(surviving.length).toBe(1)
    expect(surviving.at(0).props('card').ProposalId).toBe('p-2')
    // …next to a confirmation that speaks only for the one that was decided.
    expect(wrapper.find('[data-test="decided"]').text()).toBe('assistant_card_approved')
  })

  test('rejecting one of two proposals leaves the other standing', async () => {
    const wrapper = await mountTwoCardTurn()

    await decide(wrapper, 'onReject') // p-1

    const surviving = wrapper.findAll('proposalcardview-stub')
    expect(surviving.length).toBe(1)
    expect(surviving.at(0).props('card').ProposalId).toBe('p-2')
    expect(wrapper.find('[data-test="decided"]').text()).toBe('assistant_card_rejected')
  })

  test('an unresolvable 409 removes only the proposal it was about', async () => {
    script.approve = () => Promise.reject(new AssistantApiError(409, {
      message: 'This proposal has expired — nothing was created.'
    }))
    const wrapper = await mountTwoCardTurn()

    await decide(wrapper, 'onApprove') // p-1

    const surviving = wrapper.findAll('proposalcardview-stub')
    expect(surviving.length).toBe(1)
    expect(surviving.at(0).props('card').ProposalId).toBe('p-2')
    expect(wrapper.find('[data-test="conflict"]').text()).toContain('assistant_conflict_unresolvable')
  })

  // ⚠️ AND THE KILL SWITCH STILL CLEARS NOTHING. It is a refusal of the KIND, not of a proposal, so
  // both cards stay — including the one that was never decided. This is the case a naive "filter out
  // the decided id" would quietly break, and it is why the filter sits behind `!conflict.keepCard`.
  test('a kill-switch refusal on a two-card turn keeps BOTH cards', async () => {
    script.approve = () => Promise.reject(new AssistantApiError(409, {
      message: 'This kind of change is switched off for this store…', code: CONFLICT_KIND_DISABLED
    }))
    const wrapper = await mountTwoCardTurn()

    await decide(wrapper, 'onApprove') // p-1

    const stubs = wrapper.findAll('proposalcardview-stub')
    expect(stubs.length).toBe(2)
    expect(stubs.at(0).props('card').ProposalId).toBe('p-1')
    expect(stubs.at(1).props('card').ProposalId).toBe('p-2')
    expect(wrapper.find('[data-test="conflict"]').text()).toContain('assistant_conflict_kindDisabled')
  })

  // The live wire is camelCase (see `utils/assistant/api-client.js`). The fixtures above are
  // PascalCase because they were written against a false reading of the wire; they still pass
  // because `pick` is case-tolerant, which is exactly why the mistake survived. This one uses the
  // casing the server actually sends, so the whole path is proven against the real shape at least
  // once.
  test('the same journey works on the casing the server actually sends', async () => {
    script.ask = () => Promise.resolve({
      answer: 'Jeg har forberedt en prisendring.',
      status: 'proposal_staged',
      storeIds: [1],
      cards: [{ proposalId: 'p-1', title: 'Prisøkning', affectedCount: 3, changeSet: null }]
    })
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ draft: 'q' })
    wrapper.vm.submit()
    await settled()

    expect(wrapper.find('[data-test="answer"]').text()).toBe('Jeg har forberedt en prisendring.')
    expect(wrapper.find('proposalcardview-stub').exists()).toBe(true)

    await decide(wrapper, 'onApprove')

    expect(wrapper.find('[data-test="decided"]').text()).toBe('assistant_card_approved')
  })
})

// ── THE HANDOFF FROM THE STATISTICS BOX ──────────────────────────────────────────────────────────
describe('the ?q= handoff', () => {
  test('a question in the URL is asked once and then cleared from the URL', async () => {
    const wrapper = mountPage({ query: { q: 'hvor mye solgte vi?' } })
    await settled()

    expect(calls[0][0]).toBe('Start')
    expect(calls[1][0]).toBe('Ask')
    expect(calls[1][1]).toBe('hvor mye solgte vi?')
    // Cleared, so a reload does not silently re-ask a question already answered.
    expect(wrapper.vm._replaced).toContainEqual({ path: '/admin/assistant', query: {} })
  })

  test('the scope travels with it, so the answer is about the same stores the board was', async () => {
    mountPage({ query: { q: 'q', stores: '2' } })
    await settled()

    expect(calls[0]).toEqual(['Start', [2]])
  })

  // A store id in a URL is not a grant. The server re-checks it too, but a scope this admin does
  // not hold must not silently become the page's state either.
  test('a store the admin does not administer is dropped from the handoff', async () => {
    mountPage({ query: { q: 'q', stores: '99' } })
    await settled()

    expect(calls[0]).toEqual(['Start', [1, 2]])
  })

  test('no question in the URL asks nothing', async () => {
    mountPage()
    await settled()

    expect(calls).toEqual([])
  })
})
