import { mount } from '@vue/test-utils'
import translations from '~/translations'
import {
  SESSION_OPEN,
  SESSION_CLOSED,
  SESSION_EXCEPTION,
  SESSION_UNKNOWN,
  stateFromClockEvent,
  canClockIn,
  canClockOut,
  stateFromRefusal,
  nextState
} from '~/utils/workforce/pos-clock-state'
import { WorkforcePosClockService, toLocalEventTime } from '~/utils/workforce/pos-clock-client'
import { WorkforceClientBase } from '~/utils/workforce/api-client'
import ClockScreen from '~/components/admin/pos/ClockScreen.vue'

jest.mock('~/utils/guid', () => ({ newGuid: () => 'test-guid' }))

// `$i` runs against the REAL dictionaries and throws on a key nobody translated, so a missing string
// fails here rather than shipping as a raw `posclk_…` on the till. All three locales are exercised.
function translator (locale) {
  return function $i (key, params) {
    const text = translations[locale][key]
    if (!text) { throw new Error('missing ' + locale + ' translation key: ' + key) }
    return params ? text.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : text
  }
}

// ---------------------------------------------------------------------------------------------
// The rule the whole lane turns on.
// ---------------------------------------------------------------------------------------------

describe('what the register may believe after a punch', () => {
  const openResponse = {
    clockSessionId: 'a1000000-0000-0000-0000-000000000045',
    sessionState: 'Open',
    openedUtc: '2026-07-01T09:00:05Z',
    closedUtc: null,
    accepted: true
  }

  const closedResponse = {
    clockSessionId: 'a1000000-0000-0000-0000-000000000045',
    sessionState: 'Closed',
    openedUtc: '2026-07-01T09:00:05Z',
    closedUtc: '2026-07-01T17:00:00Z',
    accepted: true
  }

  // A clock-OUT with nothing open, as a server from BEFORE 2026-08-05 answers it: SessionStateOf was
  // `ClosedUtc.HasValue ? Closed : Open`, so the field literally named for the session state read
  // "Open" on a punch that closed nothing. This client and the API deploy independently, so this body
  // is still reachable from a till and the no-id guard is what keeps it honest.
  const staleNothingOpenResponse = {
    clockSessionId: null,
    sessionState: 'Open',
    openedUtc: null,
    closedUtc: null,
    serverReceivedUtc: '2026-07-01T17:00:00Z',
    accepted: true
  }

  // The same punch against the CURRENT backend (`4d103ca8a`): the fold's own outcome, MissingPunchException,
  // reaches the wire as the third state.
  const nothingOpenResponse = {
    clockSessionId: null,
    sessionState: 'AttendanceException',
    openedUtc: null,
    closedUtc: null,
    serverReceivedUtc: '2026-07-01T17:00:00Z',
    accepted: true
  }

  // THE BODY THIS LANE EXISTS FOR. A worker with two legal employers clocks in on engagement B while
  // engagement A is open (§3.7). The backend answers AttendanceException — nothing folded for THIS
  // engagement — while carrying the OTHER employer's OPEN session id, because the adjustment
  // references it. Pinned server-side by
  // PosClockOutStateWireTests.A_cross_engagement_clock_in_carries_a_session_id_and_still_does_not_report_this_engagement_open,
  // which asserts clockSessionId is a String and sessionState is "AttendanceException".
  const crossEngagementResponse = {
    clockSessionId: 'b2000000-0000-0000-0000-000000000099',
    sessionState: 'AttendanceException',
    openedUtc: '2026-07-01T09:00:05Z',
    closedUtc: null,
    serverReceivedUtc: '2026-07-01T17:00:00Z',
    accepted: true
  }

  test('a cross-engagement clock-in carries a session id and is still NOT read as clocked in', () => {
    // Every id-shaped test passes on this body: there IS an id and there is no closedUtc. It is the
    // other employer's session, and reading it as "this engagement is open" tells a worker she is on
    // the clock somewhere she has nothing open.
    expect(crossEngagementResponse.clockSessionId).toBeTruthy()
    expect(crossEngagementResponse.closedUtc).toBeNull()

    expect(stateFromClockEvent(crossEngagementResponse)).toBe(SESSION_EXCEPTION)
    expect(stateFromClockEvent(crossEngagementResponse)).not.toBe(SESSION_OPEN)
  })

  test('a clock-out that closed nothing is NOT read as clocked in, on either side of the backend fix', () => {
    expect(nothingOpenResponse.sessionState).toBe('AttendanceException')
    expect(stateFromClockEvent(nothingOpenResponse)).toBe(SESSION_EXCEPTION)

    // And against a server that still answers the old body, which the no-id guard is kept for.
    expect(staleNothingOpenResponse.sessionState).toBe('Open')
    expect(stateFromClockEvent(staleNothingOpenResponse)).toBe(SESSION_EXCEPTION)
    expect(stateFromClockEvent(staleNothingOpenResponse)).not.toBe(SESSION_OPEN)
  })

  test('a definite state needs a folded session AND the outcome that says which way', () => {
    expect(stateFromClockEvent(openResponse)).toBe(SESSION_OPEN)
    expect(stateFromClockEvent(closedResponse)).toBe(SESSION_CLOSED)
    expect(stateFromClockEvent(null)).toBe(SESSION_UNKNOWN)
  })

  test('a state this client does not know is not guessed into a clocked one', () => {
    // A fourth state added server-side must land as unknown — both buttons live, the server deciding
    // on the next press — rather than inheriting whichever branch it happens to fall through to. That
    // fallthrough is precisely how the original defect was written.
    const future = { ...openResponse, sessionState: 'SomethingNobodyHasWrittenYet' }
    expect(stateFromClockEvent(future)).toBe(SESSION_UNKNOWN)
    expect(canClockIn(stateFromClockEvent(future))).toBe(true)
    expect(canClockOut(stateFromClockEvent(future))).toBe(true)

    // An absent field is the same question with no answer at all.
    expect(stateFromClockEvent({ clockSessionId: openResponse.clockSessionId })).toBe(SESSION_UNKNOWN)
  })

  test('an exception does not overwrite a state the register already knew', () => {
    // Someone else's stray clock-out folding nothing must not clock this person out on screen.
    expect(nextState(SESSION_OPEN, nothingOpenResponse)).toBe(SESSION_OPEN)
    expect(nextState(SESSION_UNKNOWN, nothingOpenResponse)).toBe(SESSION_EXCEPTION)
    expect(nextState(SESSION_UNKNOWN, crossEngagementResponse)).toBe(SESSION_EXCEPTION)
    expect(nextState(SESSION_UNKNOWN, openResponse)).toBe(SESSION_OPEN)
    expect(nextState(SESSION_OPEN, closedResponse)).toBe(SESSION_CLOSED)
  })

  test('an unreadable answer is not evidence of a fold either', () => {
    // It says nothing about whether a session moved, so it may not overwrite what was established.
    const future = { ...openResponse, sessionState: 'SomethingNobodyHasWrittenYet' }
    expect(nextState(SESSION_CLOSED, future)).toBe(SESSION_CLOSED)
    expect(nextState(SESSION_OPEN, null)).toBe(SESSION_OPEN)
    expect(nextState(SESSION_UNKNOWN, future)).toBe(SESSION_UNKNOWN)
  })

  test('both halves of the pair stay reachable while the state is unknown', () => {
    // A fresh till cannot know; the server is the authority and both presses must be possible.
    expect(canClockIn(SESSION_UNKNOWN)).toBe(true)
    expect(canClockOut(SESSION_UNKNOWN)).toBe(true)
  })

  test('a known state narrows the pair to the one honest action', () => {
    expect(canClockIn(SESSION_OPEN)).toBe(false)
    expect(canClockOut(SESSION_OPEN)).toBe(true)
    expect(canClockIn(SESSION_CLOSED)).toBe(true)
    expect(canClockOut(SESSION_CLOSED)).toBe(false)
  })

  test('the already-clocked-in refusal teaches the register the state it was missing', () => {
    expect(stateFromRefusal('workforce.open-session-exists')).toBe(SESSION_OPEN)
    expect(stateFromRefusal('workforce.flag-disabled-read-only')).toBeNull()
    expect(stateFromRefusal('workforce.pos-operator-not-linked')).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------
// The wire.
// ---------------------------------------------------------------------------------------------

describe('the register clock client', () => {
  const originalFetch = global.fetch
  afterEach(() => { global.fetch = originalFetch })

  function capture (status, body) {
    const calls = []
    global.fetch = jest.fn((url, init) => {
      calls.push({ url, init })
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(JSON.stringify(body === undefined ? {} : body))
      })
    })
    return calls
  }

  test('it is the one shared HTTP layer, not a second client that looks alike', () => {
    expect(new WorkforcePosClockService({})).toBeInstanceOf(WorkforceClientBase)
  })

  test('the punch goes to the route the controller declares, with the session and idempotency headers', async () => {
    const calls = capture(200, { clockSessionId: 'x', closedUtc: null })
    const svc = new WorkforcePosClockService({ bearerToken: 'device-jwt' })
    svc.operatorSessionId = 'session-guid'
    await svc.ClockEvent('ClockIn', 'punch-1', { at: new Date(2026, 6, 1, 9, 0, 0) })

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toContain('/workforce/pos/clock-events')
    expect(calls[0].init.method).toBe('POST')
    expect(calls[0].init.headers['X-Operator-Session']).toBe('session-guid')
    expect(calls[0].init.headers.Authorization).toBe('Bearer device-jwt')
    // Required by the surface; a missing one is a 400 (HARD LAW 2).
    expect(calls[0].init.headers['Idempotency-Key']).toBeTruthy()
  })

  test('the body carries only the punch facts — never a store, an operator or a staff identity', async () => {
    const calls = capture(200, { clockSessionId: 'x', closedUtc: null })
    const svc = new WorkforcePosClockService({})
    svc.operatorSessionId = 's'
    await svc.ClockEvent('ClockIn', 'punch-1', { at: new Date(2026, 6, 1, 9, 0, 0) })

    const body = JSON.parse(calls[0].init.body)
    expect(Object.keys(body).sort()).toEqual(
      ['clientEventId', 'eventOffsetMinutes', 'eventType', 'isPaidBreak', 'localEventTime', 'verification'].sort()
    )
    // A client cannot claim who is clocking: the backend resolves it from the operator session.
    expect(body.storeId).toBeUndefined()
    expect(body.staffMemberId).toBeUndefined()
    expect(body.operatorId).toBeUndefined()
  })

  test('eventType is always sent explicitly — omitting it is a 500 on this surface', async () => {
    const calls = capture(200, { clockSessionId: 'x', closedUtc: null })
    const svc = new WorkforcePosClockService({})
    await svc.ClockEvent('ClockOut', 'punch-2', { at: new Date(2026, 6, 1, 17, 0, 0) })
    expect(JSON.parse(calls[0].init.body).eventType).toBe('ClockOut')
  })

  test('the punch time is the register LOCAL wall clock, with no Z and no offset', () => {
    // toISOString() would convert to UTC and hand the server a wall time nobody saw, which the
    // store zone would then shift a second time.
    expect(toLocalEventTime(new Date(2026, 6, 1, 9, 5, 3))).toBe('2026-07-01T09:05:03')
    expect(toLocalEventTime(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31T23:59:59')
    expect(toLocalEventTime(new Date(2026, 6, 1, 9, 5, 3))).not.toMatch(/Z$/)
  })

  test('the on-venue register takes no storeId and no businessDate — both are the device its own', async () => {
    const calls = capture(200, { entries: [] })
    const svc = new WorkforcePosClockService({})
    svc.operatorSessionId = 'session-guid'
    await svc.GetPersonnelList()

    expect(calls[0].url).toContain('/workforce/pos/personnel-list')
    expect(calls[0].url).not.toContain('?')
    expect(calls[0].init.method).toBe('GET')
    expect(calls[0].init.headers['X-Operator-Session']).toBe('session-guid')
  })
})

// ---------------------------------------------------------------------------------------------
// The screen.
// ---------------------------------------------------------------------------------------------

describe('the clock screen', () => {
  const originalFetch = global.fetch
  afterEach(() => { global.fetch = originalFetch })

  function posStub () {
    return {
      session: { operatorName: 'Kari Nordmann', operatorSessionId: 'session-guid' },
      sessionId: 'session-guid',
      storeName: 'Okam Pilot',
      endSessionLocally: jest.fn()
    }
  }

  // Routes the two endpoints this screen uses off one mocked fetch, so a test says what the SERVER
  // answered rather than stubbing the component's own methods.
  function server (routes) {
    global.fetch = jest.fn((url) => {
      const key = String(url).indexOf('clock-events') >= 0 ? 'punch' : 'list'
      const answer = routes[key] || { status: 200, body: {} }
      return Promise.resolve({
        ok: answer.status >= 200 && answer.status < 300,
        status: answer.status,
        text: () => Promise.resolve(JSON.stringify(answer.body))
      })
    })
  }

  const emptyList = { status: 200, body: { presentCount: 0, entries: [], timeZoneId: 'Europe/Oslo' } }

  function build (locale) {
    const pos = posStub()
    const wrapper = mount(ClockScreen, {
      provide: { pos },
      mocks: { $i: translator(locale || 'no'), _coreInitializer: {} }
    })
    return { wrapper, pos }
  }

  function flush () {
    return new Promise(resolve => setTimeout(resolve, 0))
  }

  test('it renders in every shipped language — no untranslated key on the till', async () => {
    server({ list: emptyList })
    for (const locale of ['no', 'en', 'de']) {
      const { wrapper } = build(locale)
      await flush()
      expect(wrapper.findAll('.posclk__btn')).toHaveLength(2)
      wrapper.destroy()
    }
  })

  test('both halves are offered before anything is known', async () => {
    server({ list: emptyList })
    const { wrapper } = build()
    await flush()
    expect(wrapper.find('.posclk__btn--in').attributes('disabled')).toBeFalsy()
    expect(wrapper.find('.posclk__btn--out').attributes('disabled')).toBeFalsy()
    wrapper.destroy()
  })

  test('a clock-in shows the person as clocked in and re-reads the register', async () => {
    server({
      punch: { status: 200, body: { clockSessionId: 'sess-1', sessionState: 'Open', openedUtc: '2026-07-01T07:00:00Z', closedUtc: null, accepted: true } },
      list: { status: 200, body: { presentCount: 1, timeZoneId: 'Europe/Oslo', entries: [{ participantName: 'Kari Nordmann', category: 'Ansatt', onSiteStartUtc: '2026-07-01T07:00:00Z', onSiteEndUtc: null, isPresent: true }] } }
    })
    const { wrapper } = build()
    await flush()
    wrapper.find('.posclk__btn--in').trigger('click')
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.posclk__state').text()).toBe('Stemplet inn')
    expect(wrapper.find('.posclk__notice').text()).toContain('Stemplet inn')
    // The punch is on the register everyone reads, with an open window.
    expect(wrapper.find('.posclk__table').text()).toContain('Kari Nordmann')
    expect(wrapper.find('.posclk__still-in').exists()).toBe(true)
    // Having clocked in, the only honest next action is out.
    expect(wrapper.find('.posclk__btn--in').attributes('disabled')).toBeTruthy()
    wrapper.destroy()
  })

  // The defect, at the screen.
  test('clocking out with nothing open never reads as clocked in', async () => {
    server({
      punch: { status: 200, body: { clockSessionId: null, sessionState: 'Open', openedUtc: null, closedUtc: null, accepted: true } },
      list: emptyList
    })
    const { wrapper } = build()
    await flush()
    wrapper.find('.posclk__btn--out').trigger('click')
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.posclk__state').text()).not.toBe('Stemplet inn')
    expect(wrapper.find('.posclk__notice').text()).toContain('ingen åpen økt')
    // Recorded, so not an error — the punch is on the append-only record either way.
    expect(wrapper.find('.posclk__error').exists()).toBe(false)
    wrapper.destroy()
  })

  // The defect this lane exists for, at the screen a worker with two employers is standing in front of.
  test('a cross-engagement clock-in does not tell her she is on the clock here', async () => {
    server({
      // AttendanceException carrying the OTHER employer's OPEN session id — an id, and no closedUtc.
      punch: { status: 200, body: { clockSessionId: 'other-employer-session', sessionState: 'AttendanceException', openedUtc: '2026-07-01T07:00:00Z', closedUtc: null, accepted: true } },
      list: emptyList
    })
    const { wrapper } = build()
    await flush()
    wrapper.find('.posclk__btn--in').trigger('click')
    await flush()
    await wrapper.vm.$nextTick()

    // The badge. Not "Stemplet inn", and not left to whichever branch an id-shaped test falls into.
    expect(wrapper.find('.posclk__state').text()).not.toBe('Stemplet inn')
    expect(wrapper.find('.posclk__state').text()).toBe('Til gjennomgang')

    // The sentence. It must not print a start time she never started — the id carries an openedUtc.
    expect(wrapper.find('.posclk__notice').text()).toContain('åpnet ingen økt')
    expect(wrapper.find('.posclk__notice').text()).not.toContain('Stemplet inn')

    // And the consequence she can actually act on: *Stemple inn* stays pressable, because nothing of
    // hers is open here. Reading the id as OPEN greys it out and strands her.
    expect(wrapper.find('.posclk__btn--in').attributes('disabled')).toBeFalsy()

    // Recorded, so not an error — the punch is on the append-only record either way.
    expect(wrapper.find('.posclk__error').exists()).toBe(false)
    wrapper.destroy()
  })

  test('clocking in twice is refused, and the refusal teaches the screen the truth', async () => {
    server({
      punch: { status: 409, body: { code: 'workforce.open-session-exists', conflictKind: 'open-session-exists', retryable: false, detail: 'An open clock session already exists.' } },
      list: emptyList
    })
    const { wrapper } = build()
    await flush()
    wrapper.find('.posclk__btn--in').trigger('click')
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.posclk__error').text()).toContain('allerede stemplet inn')
    expect(wrapper.find('.posclk__state').text()).toBe('Stemplet inn')
    // Not retryable: pressing again would only earn the same 409.
    expect(wrapper.find('.posclk__retry').exists()).toBe(false)
    wrapper.destroy()
  })

  test('an operator with no engagement is told a manager must link them', async () => {
    server({
      punch: { status: 403, body: { code: 'workforce.pos-operator-not-linked', conflictKind: 'pos-operator-not-linked', retryable: false } },
      list: emptyList
    })
    const { wrapper } = build()
    await flush()
    wrapper.find('.posclk__btn--in').trigger('click')
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.posclk__error').text()).toContain('ikke koblet til en ansatt')
    wrapper.destroy()
  })

  test('the clock kill-switch names the manual fallback rather than looking broken', async () => {
    server({
      punch: { status: 409, body: { code: 'workforce.flag-disabled-read-only', conflictKind: 'flag-disabled-read-only', flag: 'workforce.clock', manualContinuation: true, retryable: false } },
      list: emptyList
    })
    const { wrapper } = build()
    await flush()
    wrapper.find('.posclk__btn--in').trigger('click')
    await flush()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.posclk__error').text()).toContain('slått av')
    wrapper.destroy()
  })

  test('a dead operator session drops to the PIN screen instead of an error nobody can act on', async () => {
    // This refusal answers a plain {"message"} with no problem code, so it is matched on status.
    server({
      punch: { status: 401, body: { message: 'Operator session is invalid or has ended' } },
      list: emptyList
    })
    const { wrapper, pos } = build()
    await flush()
    wrapper.find('.posclk__btn--in').trigger('click')
    await flush()

    expect(pos.endSessionLocally).toHaveBeenCalled()
    wrapper.destroy()
  })

  test('a completed window keeps its end time on the register', async () => {
    server({
      list: {
        status: 200,
        body: {
          presentCount: 0,
          timeZoneId: 'Europe/Oslo',
          entries: [{ participantName: 'Ola Hansen', category: 'Ansatt', onSiteStartUtc: '2026-07-01T05:00:00Z', onSiteEndUtc: '2026-07-01T13:00:00Z', isPresent: false }]
        }
      }
    })
    const { wrapper } = build()
    await flush()
    await wrapper.vm.$nextTick()

    const text = wrapper.find('.posclk__table').text()
    expect(text).toContain('Ola Hansen')
    // Rendered through the venue zone the response names, not the browser's: 13:00Z is 15:00 in Oslo.
    expect(text).toContain('15:00')
    expect(wrapper.find('.posclk__still-in').exists()).toBe(false)
    wrapper.destroy()
  })
})
