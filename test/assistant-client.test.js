import {
  AssistantService,
  AssistantApiError,
  isAssistantApiError,
  describeConflict,
  needsStoreChoice,
  pick,
  pickList,
  oreOf,
  parseServerDate,
  CONFLICT_KIND_DISABLED
} from '~/utils/assistant/api-client'

// Route-for-route with `ChatController` and `StagedActionController` on `feature/ask-okam`
// @ b4f8fa817. These assert the wire contract: the exact paths, the request body's members, and the
// way `pick` reads a response.
describe('AssistantService', () => {
  const originalFetch = global.fetch
  const ID = '11111111-1111-1111-1111-111111111111'

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
  }

  const service = () => new AssistantService({ bearerToken: 'tok-123' })

  afterEach(() => { global.fetch = originalFetch })

  describe('POST /chat/ask', () => {
    // The REQUEST body is PascalCase and that is a free choice, not a consequence of the wire's
    // casing: Newtonsoft matches an incoming member to a C# property by exact name FIRST and
    // case-insensitively after, so `Question` and `question` both bind `ChatRequestModel.Question`.
    // Sent as the C# spelling because that is what the model declares.
    test('the request body names the model’s own members', async () => {
      respondWith(200, { Answer: 'x' })
      await service().Ask('hvor mye solgte vi?', [7], 'no')

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/chat/ask')
      expect(init.method).toBe('POST')
      expect(init.headers.Authorization).toBe('Bearer tok-123')
      expect(JSON.parse(init.body)).toEqual({
        Question: 'hvor mye solgte vi?',
        SelectedStoreIds: [7],
        LanguageCode: 'no'
      })
    })

    // The controller branches on `resolution.RequestSupplied`. An EMPTY list is still "supplied",
    // and the intersection of an empty selection with the admin's stores is empty — which the
    // controller answers 403 to. Sending null is what asks for "all my stores".
    test('an empty scope is sent as null, not as []', async () => {
      respondWith(200, { Answer: 'x' })
      await service().Ask('spørsmål', [], 'no')

      expect(JSON.parse(global.fetch.mock.calls[0][1].body).SelectedStoreIds).toBeNull()
    })

    test('the language is whatever the caller passed — never a hard-coded "no"', async () => {
      respondWith(200, { Answer: 'x' })
      await service().Ask('question', [1], 'de')

      expect(JSON.parse(global.fetch.mock.calls[0][1].body).LanguageCode).toBe('de')
    })
  })

  describe('/staged-actions', () => {
    test('the list is store-scoped, and the status filter is optional', async () => {
      respondWith(200, [])
      await service().ListStagedActions(42)
      expect(global.fetch.mock.calls[0][0]).toBe('/staged-actions?storeId=42')

      respondWith(200, [])
      await service().ListStagedActions(42, 'Staged')
      expect(global.fetch.mock.calls[0][0]).toBe('/staged-actions?storeId=42&status=Staged')
    })

    test('approve and reject are POSTs to their own sub-routes and carry NO body', async () => {
      respondWith(200, { proposalId: ID, status: 'executed' })
      await service().Approve(ID)
      expect(global.fetch.mock.calls[0][0]).toBe('/staged-actions/' + ID + '/approve')
      expect(global.fetch.mock.calls[0][1].method).toBe('POST')
      expect(global.fetch.mock.calls[0][1].body).toBeUndefined()

      respondWith(200, { proposalId: ID, status: 'rejected' })
      await service().Reject(ID)
      expect(global.fetch.mock.calls[0][0]).toBe('/staged-actions/' + ID + '/reject')
    })
  })

  describe('the error family', () => {
    test('a refusal becomes a typed error carrying the server’s own message', async () => {
      respondWith(409, { message: 'This proposal was already turned down.' })

      await expect(service().Approve(ID)).rejects.toMatchObject({
        isAssistantApiError: true,
        status: 409,
        code: null,
        message: 'This proposal was already turned down.'
      })
    })

    // Not `instanceof`: a subclassed Error does not survive this repo's ES5 transpile, and getting
    // it wrong fails SILENTLY by the typed error simply ceasing to be recognised.
    test('recognition is by flag, not by instanceof', () => {
      expect(isAssistantApiError(new AssistantApiError(409, { message: 'x' }))).toBe(true)
      expect(isAssistantApiError(new Error('x'))).toBe(false)
      expect(isAssistantApiError(null)).toBe(false)
    })

    test('a non-JSON body still produces the same typed error rather than a parse crash', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false, status: 502, text: () => Promise.resolve('<html>bad gateway</html>')
      })

      await expect(service().Approve(ID)).rejects.toMatchObject({
        isAssistantApiError: true, status: 502, message: '<html>bad gateway</html>'
      })
    })
  })
})

// ── THE NULL SEAM (there is no casing seam) ──────────────────────────────────────────────────────
// `ProposalCardModel` is serialised camelCase + omit-nulls over MCP (System.Text.Json's Web
// defaults) and camelCase + WRITE-nulls over these two routes (Newtonsoft, which ignores the STJ
// `[JsonIgnore(WhenWritingNull)]` attributes on the model entirely). Same names, opposite treatment
// of absent — which is the half that actually reaches a renderer.
describe('pick — the null rule, and the casing insurance', () => {
  // camelCase is what every route this client calls actually sends. See the measurement in
  // `utils/assistant/api-client.js`: `AddNewtonsoftJson` with no explicit resolver still receives a
  // `CamelCaseNamingStrategy` from ASP.NET Core, and the naming strategy renders the name.
  test('reads camelCase, which is what the wire sends', () => {
    expect(pick({ proposalId: 'p1' }, 'proposalId')).toBe('p1')
    expect(pick({ affectedCount: 120 }, 'affectedCount')).toBe(120)
  })

  // INSURANCE, not a live contract. Nothing sends this today. It is one line against a failure that
  // is silent and total — swapping the API's naming strategy would serve `AffectedCount` and leave
  // every card on this surface reading nothing.
  test('reads PascalCase too, so a resolver change cannot silently blank the page', () => {
    expect(pick({ AffectedCount: 120 }, 'affectedCount')).toBe(120)
  })

  // Newtonsoft WRITES the nulls that System.Text.Json omits, so the same server state arrives as
  // `null` on one route and absent on the other. A caller that told them apart would render
  // "empty" for one pipeline and "absent" for the other from identical facts.
  test('an explicit null is the same answer as an absent key', () => {
    expect(pick({ ChangeSet: null }, 'changeSet')).toBeUndefined()
    expect(pick({}, 'changeSet')).toBeUndefined()
    expect(pickList({ ChangeSet: null }, 'changeSet')).toEqual([])
  })

  test('a falsy-but-real value survives', () => {
    expect(pick({ AffectedCount: 0 }, 'affectedCount')).toBe(0)
    expect(pick({ NeedsApproval: false }, 'needsApproval')).toBe(false)
  })
})

describe('oreOf', () => {
  // Money on the wire is an INTEGER of øre (`McpMoney.Amount`). This extracts it and stops; the
  // LABEL is the global mixin's `priceLabel`, so the card cannot hold a second opinion about what
  // 24900 looks like.
  test('reads the øre integer through either casing', () => {
    expect(oreOf({ Amount: 24900, Currency: 'NOK' })).toBe(24900)
    expect(oreOf({ amount: 24900, currency: 'NOK' })).toBe(24900)
  })

  // A change entry with no `before` is a value nobody recorded. Zero is a price somebody set, and
  // conflating them is how an unpriced row renders as free.
  test('absent money is null, and zero is NOT absent', () => {
    expect(oreOf(undefined)).toBeNull()
    expect(oreOf(null)).toBeNull()
    expect(oreOf({})).toBeNull()
    expect(oreOf({ Amount: 0 })).toBe(0)
  })

  // The server's `Formatted` is "NOK 249.00" under the server's culture. Reading it would put a
  // foreign format on the card, so it is deliberately not a fallback.
  test('the server’s own formatted string is not used', () => {
    expect(oreOf({ Formatted: 'NOK 12.00' })).toBeNull()
  })
})

// ── ALL EIGHT CONFLICT CODES ─────────────────────────────────────────────────────────────────────
// `ConflictBody` (`StagedActionController.cs:99-107`) emits `code` on EVERY conflict and the row's
// real `status` beside it. These tests replace a pair that asserted the opposite — that only the
// kill switch carried a code and "every other 409 is indistinguishable" — which was true of
// `b4f8fa817` and false of `880c24e46`.
describe('describeConflict', () => {
  const conflict = (code, status, message) =>
    new AssistantApiError(409, { message: message || 'server prose', code, status })

  test('the kill switch is the one refusal that keeps the card on screen', () => {
    expect(describeConflict(conflict(CONFLICT_KIND_DISABLED, 'staged',
      'This kind of change is switched off for this store…'))).toEqual({
      key: 'assistant_conflict_kindDisabled',
      keepCard: true,
      canRepropose: false,
      code: 'assistant.kind_disabled',
      status: 'staged',
      serverMessage: 'This kind of change is switched off for this store…'
    })
  })

  // The eight, each with its own line. A table rather than eight tests because the assertion IS
  // that they are all different: a mapping that collapsed two of them would still pass eight
  // individually-written tests that each only checked their own key.
  test('every code gets its own line, and only the kill switch keeps the card', () => {
    const cases = [
      ['already-resolved', null, 'assistant_conflict_alreadyResolved'],
      ['expired', 'expired', 'assistant_conflict_expired'],
      ['lost-the-claim', 'executing', 'assistant_conflict_lostTheClaim'],
      ['missing-approver', 'executing', 'assistant_conflict_missingApprover'],
      ['contract-moved', 'executing', 'assistant_conflict_contractMoved'],
      ['stale', 'executing', 'assistant_conflict_stale'],
      ['terminal-write-refused', null, 'assistant_conflict_terminalWriteRefused'],
      ['assistant.kind_disabled', 'staged', 'assistant_conflict_kindDisabled']
    ]

    const keys = cases.map(([code, status, key]) => {
      const described = describeConflict(conflict(code, status))
      expect(described.key).toBe(key)
      expect(described.code).toBe(code)
      expect(described.keepCard).toBe(code === 'assistant.kind_disabled')
      return described.key
    })

    expect(new Set(keys).size).toBe(8)
  })

  // ⚠️ THE BEHAVIOURAL BIT, AND THE ONE THAT MUST NOT DRIFT. Only the kill switch leaves the row
  // Staged; stale / contract-moved / missing-approver settle it to Failed inside the claimed
  // transaction, so their cards are offers that can only 409 again.
  test('keepCard is true for the kill switch and for nothing else', () => {
    const codes = ['already-resolved', 'expired', 'lost-the-claim', 'missing-approver',
      'contract-moved', 'stale', 'terminal-write-refused']
    codes.forEach((code) => {
      expect(describeConflict(conflict(code, 'failed')).keepCard).toBe(false)
    })
    expect(describeConflict(conflict('assistant.kind_disabled', 'staged')).keepCard).toBe(true)
  })

  // `already-resolved` is the one code that says nothing on its own — the row is settled, but as
  // what? `status` is the answer, and the difference between "your price change is live" and
  // "someone turned this down" is the whole of what the merchant came to find out.
  test('already-resolved names what the row actually became', () => {
    expect(describeConflict(conflict('already-resolved', 'executed')).key)
      .toBe('assistant_conflict_alreadyExecuted')
    expect(describeConflict(conflict('already-resolved', 'rejected')).key)
      .toBe('assistant_conflict_alreadyRejected')
    expect(describeConflict(conflict('already-resolved', 'failed')).key)
      .toBe('assistant_conflict_alreadyFailed')
  })

  test('already-resolved without a status falls back to the hedged line', () => {
    expect(describeConflict(conflict('already-resolved', null)).key)
      .toBe('assistant_conflict_alreadyResolved')
    expect(describeConflict(new AssistantApiError(409, { message: 'x', code: 'already-resolved' })).key)
      .toBe('assistant_conflict_alreadyResolved')
  })

  // Re-asking helps only where the ask itself is still good. It is NOT offered for an executed row
  // (re-proposing a live change would apply it twice) nor for a claim someone else is holding.
  test('only stale and expired offer a re-propose', () => {
    expect(describeConflict(conflict('stale', 'executing')).canRepropose).toBe(true)
    expect(describeConflict(conflict('expired', 'expired')).canRepropose).toBe(true)

    const noRepropose = ['already-resolved', 'lost-the-claim', 'missing-approver',
      'contract-moved', 'terminal-write-refused', 'assistant.kind_disabled']
    noRepropose.forEach((code) => {
      expect(describeConflict(conflict(code, 'executed')).canRepropose).toBe(false)
    })
  })

  // `terminal-write-refused` is the one refusal whose `status` is null BY CONTRACT — the write was
  // rolled back, so the row is whatever it was before and the server refuses to name it.
  test('a null status survives as null rather than as a string', () => {
    expect(describeConflict(conflict('terminal-write-refused', null)).status).toBeNull()
  })

  // The list route spells the same statuses Pascal-case. Normalising on the way in means no caller
  // has to remember which of the two shapes it is holding.
  test('the status is lower-cased on the way in', () => {
    expect(describeConflict(conflict('already-resolved', 'Executed')).key)
      .toBe('assistant_conflict_alreadyExecuted')
  })

  // A ninth kind shipping to a browser holding this bundle must read as a sentence, not as nothing.
  test('an unrecognised code falls through to the generic line', () => {
    expect(describeConflict(conflict('assistant.something_new', 'staged'))).toMatchObject({
      key: 'assistant_conflict_unresolvable',
      keepCard: false,
      code: 'assistant.something_new'
    })
  })

  test('a non-409 is not a conflict', () => {
    expect(describeConflict(new AssistantApiError(400, { message: 'x' }))).toBeNull()
    expect(describeConflict(new Error('x'))).toBeNull()
  })
})

// ── THE CHAT REFUSAL THAT RENDERED AS "HTTP 403" ─────────────────────────────────────────────────
// `ChatController` returns 400/401/403/500 as a whole `ChatAskResponseModel` and puts the reason in
// `Answer` (`:40-57`, `Refusal` at `:124-131`). The error's message chain read `message`/`detail`/
// `title` — none of which are on that body — and fell back to `'HTTP ' + status`, so a merchant
// asking about a store they do not administer was shown a status line instead of the sentence the
// server had written for exactly that moment.
describe('a chat refusal carries its reason in `answer`', () => {
  test('the 403 the merchant actually sees is the server’s sentence', () => {
    const error = new AssistantApiError(403, {
      question: 'hva solgte Torget?',
      answer: 'You don\'t have access to the requested stores.',
      success: false
    })

    expect(error.message).toBe('You don\'t have access to the requested stores.')
    expect(error.message).not.toContain('HTTP')
  })

  test('every refusal status on that route, not just the 403', () => {
    const of = status => new AssistantApiError(status, { answer: 'the reason', success: false }).message
    expect(of(400)).toBe('the reason')
    expect(of(401)).toBe('the reason')
    expect(of(500)).toBe('the reason')
  })

  // `errorMessage` is deliberately NOT read: on the 500 path it is the developer-facing "Internal
  // server error" sitting beside a Norwegian sentence written for the merchant.
  test('the merchant’s sentence wins over the developer’s', () => {
    const error = new AssistantApiError(500, {
      answer: 'Beklager, det oppstod en teknisk feil. Prøv igjen senere.',
      errorMessage: 'Internal server error',
      success: false
    })

    expect(error.message).toBe('Beklager, det oppstod en teknisk feil. Prøv igjen senere.')
  })

  // The staged-action routes are unaffected: `message` still wins wherever a `message` exists.
  test('a staged-action refusal still reads its own `message`', () => {
    const error = new AssistantApiError(409, {
      message: 'This proposal was already turned down.',
      answer: 'should never be read'
    })

    expect(error.message).toBe('This proposal was already turned down.')
  })

  // The null seam: Newtonsoft WRITES the nulls System.Text.Json omits, so a null `answer` must read
  // as absent rather than swallowing the chain and producing an empty message.
  test('a written null does not swallow the fallback', () => {
    expect(new AssistantApiError(503, { message: null, answer: null }).message).toBe('HTTP 503')
    expect(new AssistantApiError(503, null).message).toBe('HTTP 503')
  })
})

// ── THE STORE-CHOICE BRIDGE ──────────────────────────────────────────────────────────────────────
// `store_choice_needed` is NOT a top-level status on this backend branch: when a write needs one
// venue and the turn covers several, the response is an ORDINARY answered turn with the question in
// `Answer`. The backend's own test pins that and calls the status word "the integrator's to add".
describe('needsStoreChoice', () => {
  test('the structured status wins whenever it exists', () => {
    expect(needsStoreChoice({ Status: 'store_choice_needed', StoreIds: [1, 2] })).toBe(true)
    // …and it is trusted even without the prose, which is the whole point of preferring it.
    expect(needsStoreChoice({ Status: 'store_choice_needed', Answer: 'noe helt annet', StoreIds: [1, 2] })).toBe(true)
  })

  test('until it exists, the backend’s own sentence is the only signal there is', () => {
    expect(needsStoreChoice({
      Status: 'answered',
      Answer: 'Hvilken butikk gjelder det? Velg én av Bryggen Bistro, Torget, så forbereder jeg forslaget.',
      StoreIds: [1, 2]
    })).toBe(true)
  })

  // A single-store answer has nothing to choose between and must not grow buttons.
  test('one store in scope is never a choice', () => {
    expect(needsStoreChoice({
      Status: 'answered',
      Answer: 'Hvilken butikk gjelder det? Velg én butikk, så forbereder jeg forslaget.',
      StoreIds: [1]
    })).toBe(false)
  })

  test('an ordinary answer is not a picker', () => {
    expect(needsStoreChoice({ Status: 'answered', Answer: 'Dere solgte for kr 42 000.', StoreIds: [1, 2] })).toBe(false)
    expect(needsStoreChoice(null)).toBe(false)
  })
})

// ── AN OFFSET-LESS TIMESTAMP MEANS OSLO ──────────────────────────────────────────
// The same `ExpiresAt` reaches this client two ways: `/chat/ask` builds its card in-process from a
// `DateTime` with `Kind = Local` and serialises `…+02:00`, while a row read back out of `datetime2`
// is `Kind = Unspecified` and serialises with no offset at all. ES2015 parses that second form as
// BROWSER-local, so one stored value meant two different instants depending on where the merchant
// was standing — and since the card now withholds the approve button on an elapsed countdown, that
// skew decides whether an affordance exists.
//
// ⚠️ WHAT THESE TESTS CAN AND CANNOT PROVE, STATED HONESTLY RATHER THAN IMPLIED.
//
// The obvious test is "run it from New York and check it still says Oslo". It cannot be written
// here: `process.env.TZ` mutated inside a jest test file does NOT reach the Date implementation
// (plain node honours a late TZ change; the jest sandbox does not), so the timezone never moves and
// such a test asserts nothing while LOOKING like a world tour. A first draft of this block did
// exactly that and passed — not because the helper works, but because this machine sits in
// Europe/Zurich, which shares Oslo’s offsets to the minute.
//
// So these assert ABSOLUTE INSTANTS instead. Those are true statements about the contract from any
// timezone, and they are what fails on a naive `new Date` — on CI, or on any host that is not
// already at Oslo’s offset. On a CET/CEST developer machine they are correct but not
// discriminating, and that is a property of the machine, not of the assertion.
describe('parseServerDate', () => {
  // Summer: Oslo is CEST, +02:00. 16:12 in Oslo is 14:12 UTC.
  test('an offset-less summer timestamp is read as CEST (+02:00)', () => {
    expect(parseServerDate('2026-08-09T16:12:00').toISOString()).toBe('2026-08-09T14:12:00.000Z')
  })

  // Winter: Oslo is CET, +01:00. The offset is COMPUTED per instant, not hard-coded — which is the
  // whole reason this goes through `Intl` with an explicit `timeZone` rather than adding two hours.
  test('an offset-less winter timestamp is read as CET (+01:00)', () => {
    expect(parseServerDate('2026-01-09T16:12:00').toISOString()).toBe('2026-01-09T15:12:00.000Z')
  })

  // The contract in one line: an offset-less value means exactly what the same value with Oslo’s
  // offset spelled on it would mean. This holds in every timezone, which is what makes it the real
  // assertion rather than the two above.
  test('offset-less is equivalent to the same value carrying Oslo’s own offset', () => {
    expect(parseServerDate('2026-08-09T16:12:00').getTime())
      .toBe(new Date('2026-08-09T16:12:00+02:00').getTime())
    expect(parseServerDate('2026-01-09T16:12:00').getTime())
      .toBe(new Date('2026-01-09T16:12:00+01:00').getTime())
  })

  // Anything carrying a zone is already unambiguous and must be left alone — the `/chat/ask` card’s
  // own form, which was never broken.
  test('a timestamp that states its own offset is untouched', () => {
    expect(parseServerDate('2026-08-09T16:12:00+02:00').toISOString()).toBe('2026-08-09T14:12:00.000Z')
    expect(parseServerDate('2026-08-09T14:12:00Z').toISOString()).toBe('2026-08-09T14:12:00.000Z')
    expect(parseServerDate('2026-08-09T09:12:00-05:00').toISOString()).toBe('2026-08-09T14:12:00.000Z')
  })

  test('a Date instance passes through unharmed', () => {
    const when = new Date('2026-08-09T14:12:00Z')
    expect(parseServerDate(when).getTime()).toBe(when.getTime())
  })

  // ⚠️ THE FRACTION IS NOT PART OF THE OFFSET. The Oslo reading is only accurate to the second, so
  // sub-second digits left on the value being corrected are counted as offset — once per pass, and
  // there are two passes. This exact input came back `.369`: 123 ms applied three times.
  test('sub-second precision survives the offset correction instead of tripling', () => {
    expect(parseServerDate('2026-08-09T16:12:00.1234567').toISOString())
      .toBe('2026-08-09T14:12:00.123Z')
    expect(parseServerDate('2026-08-09T16:12:00.5').toISOString())
      .toBe('2026-08-09T14:12:00.500Z')
  })

  test('a space-separated timestamp is read the same way', () => {
    expect(parseServerDate('2026-08-09 16:12:00').toISOString()).toBe('2026-08-09T14:12:00.000Z')
  })

  test('seconds are optional', () => {
    expect(parseServerDate('2026-08-09T16:12').toISOString()).toBe('2026-08-09T14:12:00.000Z')
  })

  // Absent and unparseable both answer null, so no caller ever has to hold an Invalid Date.
  test('absent and unparseable are both null', () => {
    expect(parseServerDate(null)).toBeNull()
    expect(parseServerDate(undefined)).toBeNull()
    expect(parseServerDate('')).toBeNull()
    expect(parseServerDate('not a date')).toBeNull()
  })
})
