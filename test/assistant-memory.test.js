import { shallowMount } from '@vue/test-utils'

// eslint-disable-next-line import/first -- the mock must be registered before the page is imported.
import AssistantPage from '~/pages/admin/assistant.vue'
import { AssistantApiError } from '~/utils/assistant/api-client'

// ── WHAT THIS FILE IS FOR ────────────────────────────────────────────────────────────────────────
//
// A complete multi-turn conversation subsystem shipped on the backend — controller, service, two
// tables, a migration, a nightly retention worker — DI-registered and reachable over HTTP, and
// nothing in this repository called it. `rg -c "assistant/conversations"` over the whole Web tree
// returned 0, tests included. The page posted every question to the stateless one-shot route and
// rendered an honest note telling the merchant it could not remember anything.
//
// `assistant-page.test.js` covers what a turn RENDERS. This file covers what a THREAD does: that a
// follow-up lands on the same conversation, and that every way one can end is said out loud rather
// than discovered by being misunderstood.
//
// ⚠️ AND IT CANNOT PROVE THE FEATURE. Every response here is a fixture, so the model is a constant
// and "the pronoun resolved" is not a thing this suite can observe. What it proves is that the
// second question is posted to the first question's conversation id — which is the whole of what the
// client controls. The pronoun itself was proved against a live model and a seeded world; the
// transcript is in the lane report.

const calls = []
const script = {}

jest.mock('~/utils/assistant/api-client', () => {
  const actual = jest.requireActual('~/utils/assistant/api-client')
  const NAMES = { 1: 'Bryggen Bistro', 2: 'Torget' }
  return Object.assign({}, actual, {
    AssistantService: class {
      StartConversation (storeIds) {
        calls.push(['Start', storeIds])
        if (script.start) { return script.start(storeIds) }
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
        return Promise.resolve({ proposalId: id, status: 'rejected' })
      }

      ListStagedActions () { return Promise.resolve([]) }
    }
  })
})

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

const TWO_STORES = [{ id: 1, name: 'Bryggen Bistro' }, { id: 2, name: 'Torget' }]

function mountPage (options) {
  const opts = options || {}
  return shallowMount(AssistantPage, {
    mocks: {
      $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
      priceLabel: minor => 'kr ' + minor,
      $route: { path: '/admin/assistant', query: {} },
      $router: { replace: () => Promise.resolve(), push: () => Promise.resolve() },
      _coreInitializer: { bearerToken: 'tok' },
      $store: {
        getters: { userIsLoggedIn: true },
        state: {
          adminLocale: 'no',
          currentUser: { id: 1, adminIn: opts.stores || TWO_STORES }
        }
      }
    },
    stubs: {
      AdminPage: { template: '<div><slot /></div>' },
      MultiSelectDropdown: true,
      PendingActions: true
    }
  })
}

/** Ask one question through the composer, exactly as a merchant does. */
async function ask (wrapper, question) {
  wrapper.setData({ draft: question })
  await wrapper.vm.$nextTick()
  wrapper.find('[data-test="send"]').trigger('click')
  await settled()
  await wrapper.vm.$nextTick()
}

const starts = () => calls.filter(call => call[0] === 'Start')
const asks = () => calls.filter(call => call[0] === 'Ask')

beforeEach(() => {
  calls.length = 0
  Object.keys(script).forEach(key => delete script[key])
})

// ── THE FEATURE ──────────────────────────────────────────────────────────────────────────────────
describe('a follow-up question lands on the same conversation', () => {
  // THE ONE ASSERTION THIS WHOLE LANE EXISTS FOR. Two questions, ONE thread — which is what puts the
  // first question in the model's context when it answers the second. Against the old wire there was
  // no id to be the same, because there was no thread.
  test('the second question is posted to the first question’s thread', async () => {
    const wrapper = mountPage()
    await settled()

    await ask(wrapper, 'Hva er råvarekostnaden på Fiskesuppe?')
    await ask(wrapper, 'Og hva med dekningsbidraget på den?')

    expect(starts().length).toBe(1)
    expect(asks().length).toBe(2)
    expect(asks()[1][4]).toBe(asks()[0][4])
    expect(asks()[1][4]).toBe('conv-1')
    // Both turns are on screen, in order, under one thread.
    expect(wrapper.vm.thread.length).toBe(2)
    expect(wrapper.find('[data-test="conversation-break"]').exists()).toBe(false)
  })

  // The thread is opened lazily. A merchant who opens the page and reads it has not started a
  // conversation, and creating one on mount would leave an empty Active thread behind for the
  // retention sweep every time anybody so much as looked at the screen.
  test('opening the page starts no thread at all', async () => {
    mountPage()
    await settled()

    expect(calls).toEqual([])
  })

  // The narrowing a venue button applies is per-TURN. Re-opening a thread to answer "which venue?"
  // would throw away the very turn the merchant is answering.
  test('answering the venue picker stays on the same thread', async () => {
    script.ask = () => Promise.resolve({
      Status: 'answered',
      Answer: 'Hvilken butikk gjelder det? Velg én av Bryggen Bistro, Torget, så forbereder jeg forslaget.'
    })
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'øk prisen på alle pizzaer med 25 %')

    script.ask = () => Promise.resolve({ Answer: 'ok', Status: 'proposal_staged' })
    wrapper.find('[data-test="venue-picker"]').findAll('button').at(1).trigger('click')
    await settled()

    expect(starts().length).toBe(1)
    expect(asks()[1][2]).toBe(2)
    expect(asks()[1][4]).toBe(asks()[0][4])
  })
})

// ── THE FROZEN SCOPE ─────────────────────────────────────────────────────────────────────────────
// The store scope is chosen once, at create, and never again. There is deliberately no rescope
// route: every later turn replays history gathered under the frozen scope, so widening it would
// answer a later question with earlier data the new scope was never verified for.
describe('when the merchant changes the stores', () => {
  test('they are told BEFORE they ask, not after they are answered about the wrong venue', async () => {
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'hvor mye solgte vi?')

    wrapper.setData({ selectedStoreIds: [2] })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="thread-notice"]').text()).toBe('assistant_scopeChanged')
    // And nothing has been spent on it: a create per dropdown click would open a thread for every
    // intermediate selection, and the merchant may still change their mind back.
    expect(starts().length).toBe(1)
  })

  test('changing the picker back withdraws the warning', async () => {
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'q')

    wrapper.setData({ selectedStoreIds: [2] })
    await wrapper.vm.$nextTick()
    wrapper.setData({ selectedStoreIds: [2, 1] })
    await wrapper.vm.$nextTick()

    // Set equality, not order: the order is the picker's business and means nothing to the server.
    expect(wrapper.find('[data-test="thread-notice"]').exists()).toBe(false)
  })

  test('the next question opens a NEW thread, and the transcript says where the memory restarts', async () => {
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'hvor mye solgte vi?')

    wrapper.setData({ selectedStoreIds: [2] })
    await ask(wrapper, 'og i forrige uke?')

    expect(starts()).toEqual([['Start', [1, 2]], ['Start', [2]]])
    expect(asks()[1][4]).toBe('conv-2')
    // The old thread is closed rather than abandoned — an Active thread nobody closes sits until the
    // retention sweep expires it.
    expect(calls).toContainEqual(['Close', 'conv-1'])

    // ⚠️ ON SCREEN, not just in the view model. The transcript outlives the thread behind it: the
    // first turn is still readable while no longer being in the assistant's context, and without
    // this line a merchant whose follow-up is suddenly misunderstood has no way to know why.
    const breaks = wrapper.findAll('[data-test="conversation-break"]')
    expect(breaks.length).toBe(1)
    expect(breaks.at(0).text()).toBe('assistant_newConversationStarted')
    expect(wrapper.vm.thread[0].startsNewConversation).toBe(false)
    expect(wrapper.vm.thread[1].startsNewConversation).toBe(true)
  })

  // The very first turn has nothing above it to be cut off from.
  test('the first turn of all draws no break', async () => {
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'q')

    expect(wrapper.find('[data-test="conversation-break"]').exists()).toBe(false)
  })

  // ⚠️ THE FEATURE FLAG ARRIVING AS A *PARTIAL* REFUSAL, which is the silent one. `CreateAsync` drops
  // a store whose `Assistant.Module` override is off BEFORE freezing the scope, so the thread simply
  // covers less than was asked for — no error, no refusal, nothing on screen. A total refusal is a
  // 403 with the server's own sentence; this one the merchant can only be told about by the client
  // comparing what it asked for against what came back.
  test('a scope the server verified NARROWER than it was asked for is stated', async () => {
    script.start = () => Promise.resolve({
      id: 'conv-1', status: 'Active', storeIds: [1], storeNames: ['Bryggen Bistro'], messageCount: 0
    })
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'hvor mye solgte vi?')

    expect(wrapper.find('[data-test="thread-notice"]').text())
      .toBe('assistant_scopeNarrowed:{"stores":"Bryggen Bistro"}')
  })

  // …and it must NOT fire when nothing was dropped, or the notice becomes wallpaper.
  test('a scope that came back whole says nothing', async () => {
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'q')

    expect(wrapper.find('[data-test="thread-notice"]').exists()).toBe(false)
  })

  // ⚠️ AND A NARROWED THREAD MUST NOT READ AS A SCOPE CHANGE. The picker still holds both stores and
  // the thread holds one, so comparing the picker against the VERIFIED scope would warn on every
  // question and open a new thread that narrows to exactly the same place, forever. The comparison
  // is against what was REQUESTED, which is why the two are kept apart on the conversation.
  test('a narrowed thread is still reused for the next question', async () => {
    script.start = () => Promise.resolve({
      id: 'conv-1', status: 'Active', storeIds: [1], storeNames: ['Bryggen Bistro'], messageCount: 0
    })
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'q1')
    await ask(wrapper, 'q2')

    expect(starts().length).toBe(1)
    expect(asks()[1][4]).toBe('conv-1')
  })
})

// ── A THREAD THAT ENDED ──────────────────────────────────────────────────────────────────────────
describe('a refusal that ends the thread ends it here too', () => {
  // The server's sentence for all three finishes with "start a new conversation". A client that kept
  // posting to a dead id would make that a lie: every later question fails identically, and the
  // merchant has been told to do something the page will not let them do.
  describe.each([
    [403, 'the assistant was switched off for one of the thread’s stores'],
    [404, 'the retention sweep took the thread'],
    [409, 'the thread is closed, expired or full']
  ])('a %s', (status, why) => {
    test(why + ', so the next question opens a new one', async () => {
      const wrapper = mountPage()
      await settled()
      await ask(wrapper, 'q1')

      script.ask = () => Promise.reject(new AssistantApiError(status, {
        message: 'Denne samtalen er avsluttet. Start en ny for å spørre videre.'
      }))
      await ask(wrapper, 'q2')

      // The server's own sentence, in the failure slot.
      expect(wrapper.findAll('[data-test="turn-failure"]').at(0).text())
        .toBe('Denne samtalen er avsluttet. Start en ny for å spørre videre.')
      // …and the forward-looking half, where the merchant is about to type again.
      expect(wrapper.find('[data-test="thread-notice"]').text()).toBe('assistant_threadEnded')
      expect(calls).toContainEqual(['Close', 'conv-1'])

      delete script.ask
      await ask(wrapper, 'q3')

      expect(starts().length).toBe(2)
      expect(asks()[2][4]).toBe('conv-2')
      expect(wrapper.findAll('[data-test="conversation-break"]').length).toBe(1)
    })
  })

  // ⚠️ THE EXPENSIVE DIRECTION. A model outage says nothing about the thread, and nothing restores a
  // discarded one — so a 500 keeps the conversation and the next question still has its context.
  test('a 500 keeps the thread, because a blip is not a verdict on it', async () => {
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'q1')

    script.ask = () => Promise.reject(new AssistantApiError(500, {
      message: 'Beklager, det oppstod en teknisk feil. Prøv igjen senere.'
    }))
    await ask(wrapper, 'q2')

    expect(wrapper.find('[data-test="thread-notice"]').exists()).toBe(false)
    expect(calls).not.toContainEqual(['Close', 'conv-1'])

    delete script.ask
    await ask(wrapper, 'q3')

    expect(starts().length).toBe(1)
    expect(asks()[2][4]).toBe('conv-1')
    expect(wrapper.find('[data-test="conversation-break"]').exists()).toBe(false)
  })

  // `conversation_full` is a 200 carrying a merchant-facing sentence: the turn had already run when
  // the replay proved too large even halved, so refusing it would have thrown away an answer that was
  // paid for. The thread is finished all the same.
  test('an in-band "this conversation is full" retires the thread without discarding the answer', async () => {
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'q1')

    script.turn = () => ({
      conversationId: 'conv-1',
      sequence: 40,
      notRemembered: true,
      answer: {
        Status: 'conversation_full',
        Success: false,
        Answer: 'Denne samtalen har blitt for lang til å huskes videre. Start en ny samtale, så tar jeg spørsmålet der.'
      }
    })
    await ask(wrapper, 'q2')

    expect(wrapper.findAll('[data-test="answer"]').at(1).text())
      .toContain('Denne samtalen har blitt for lang')
    expect(wrapper.find('[data-test="thread-notice"]').text()).toBe('assistant_threadEnded')
    // `notRemembered` is true on that same response and is deliberately NOT printed: it is one fact
    // said twice, and the sentence the merchant already has is the useful wording of it.
    expect(wrapper.find('[data-test="not-remembered"]').exists()).toBe(false)
  })
})

// ── THE TURN THE THREAD DID NOT KEEP ─────────────────────────────────────────────────────────────
// The server writes the two rows AFTER the turn, never before, so a failed turn cannot leave a
// question with no answer in the thread. The cost is that a turn which fails to persist is one the
// merchant saw and the thread did not keep — reported on `NotRemembered` rather than hidden.
describe('an answer the thread could not remember', () => {
  test('says so, on the turn it happened to', async () => {
    script.turn = answer => ({ conversationId: 'conv-1', sequence: 2, answer, notRemembered: true })
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'q')

    expect(wrapper.find('[data-test="not-remembered"]').text()).toBe('assistant_notRemembered')
  })

  test('and an ordinary turn says nothing', async () => {
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'q')

    expect(wrapper.find('[data-test="not-remembered"]').exists()).toBe(false)
  })
})

// ── STARTING OVER ON PURPOSE ─────────────────────────────────────────────────────────────────────
// The escape hatch the frozen scope makes necessary: a thread cannot be rescoped and cannot be
// steered away from a context that has gone somewhere unhelpful, so the only honest answer to both
// is a new one — without reloading the page.
describe('the new-conversation control', () => {
  test('is offered only once there is a thread to leave', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="new-conversation"]').exists()).toBe(false)

    await ask(wrapper, 'q')

    expect(wrapper.find('[data-test="new-conversation"]').exists()).toBe(true)
  })

  test('closes the old thread and marks where the next one begins', async () => {
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'q1')

    wrapper.find('[data-test="new-conversation"]').trigger('click')
    await settled()
    expect(calls).toContainEqual(['Close', 'conv-1'])

    await ask(wrapper, 'q2')

    expect(asks()[1][4]).toBe('conv-2')
    expect(wrapper.findAll('[data-test="conversation-break"]').length).toBe(1)
    // The transcript is kept. Deleting what the merchant already read would be a second, unrelated
    // loss on a button whose whole promise is about what happens NEXT.
    expect(wrapper.vm.thread.length).toBe(2)
  })
})

// ── THE STAGED-ACTION SPINE IS UNTOUCHED ─────────────────────────────────────────────────────────
// Approval is deliberately NOT on any conversation route, and there will not be one: putting it there
// would let the surface that composed a proposal also confirm it. It goes through `/staged-actions`
// under the merchant's own authority, exactly as before — and deciding a card must not disturb the
// thread it was proposed in.
describe('approving from inside a thread', () => {
  const staged = {
    Answer: 'Jeg har forberedt en prisendring.',
    Status: 'proposal_staged',
    Cards: [{ proposalId: 'p-1', title: 'Prisøkning', affectedCount: 3, changeSet: null }]
  }

  test('the approval goes to the staged-action route, and the conversation survives it', async () => {
    script.ask = () => Promise.resolve(staged)
    const wrapper = mountPage()
    await settled()
    await ask(wrapper, 'øk prisene med 10 %')

    await wrapper.vm.onApprove(wrapper.vm.thread[0], 'p-1')
    await settled()
    await wrapper.vm.$nextTick()

    expect(calls).toContainEqual(['Approve', 'p-1'])
    expect(wrapper.find('[data-test="decided"]').text()).toBe('assistant_card_approved')

    // No thread was closed, none was opened, and the next question is still on the same one.
    expect(calls).not.toContainEqual(['Close', 'conv-1'])
    delete script.ask
    await ask(wrapper, 'og hva ble resultatet?')

    expect(starts().length).toBe(1)
    expect(asks()[1][4]).toBe('conv-1')
  })
})
