import {
  AssistantService,
  AssistantApiError,
  isAssistantApiError,
  describeConflict,
  needsStoreChoice,
  pick,
  pickList,
  oreOf,
  CONFLICT_KIND_DISABLED
} from '~/utils/assistant/api-client'

// Route-for-route with `ChatController` and `StagedActionController` on `feature/ask-okam`
// @ b4f8fa817. These assert the wire contract: the exact paths, the request body's PascalCase
// members, and the two DIFFERENT casings the two routes answer in.
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
    test('the body is PascalCase, because the API preserves C# property names', async () => {
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

// ── THE CASING SEAM ──────────────────────────────────────────────────────────────────────────────
// `ProposalCardModel` is serialised camelCase + omit-nulls over MCP (System.Text.Json) and
// PascalCase + write-nulls over these two routes (Newtonsoft, which ignores the STJ `[JsonIgnore]`
// attributes on the model entirely). Both shapes therefore reach a client, and neither is wrong.
describe('pick — the two casings and the two spellings of absent', () => {
  test('reads PascalCase, which is what /chat/ask and /staged-actions actually send', () => {
    expect(pick({ AffectedCount: 120 }, 'affectedCount')).toBe(120)
  })

  test('reads camelCase, which is what the approve/reject bodies and MCP send', () => {
    expect(pick({ proposalId: 'p1' }, 'proposalId')).toBe('p1')
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

describe('describeConflict', () => {
  // `StagedActionController.ConflictBody` emits `code` for this refusal and for no other.
  test('the kill switch is the one refusal that keeps the card on screen', () => {
    const error = new AssistantApiError(409, {
      message: 'This kind of change is switched off for this store…',
      code: CONFLICT_KIND_DISABLED
    })

    expect(describeConflict(error)).toEqual({
      key: 'assistant_conflict_kindDisabled',
      keepCard: true,
      serverMessage: 'This kind of change is switched off for this store…'
    })
  })

  // Seven server-side conflict kinds and the row's real CurrentStatus are dropped before the
  // response is written, so a client genuinely cannot tell them apart. The renderer says only what
  // is certainly true and shows the server's own sentence beside it.
  test('every other 409 is indistinguishable, and the card goes', () => {
    const error = new AssistantApiError(409, { message: 'This proposal has expired — nothing was created.' })

    expect(describeConflict(error)).toEqual({
      key: 'assistant_conflict_unresolvable',
      keepCard: false,
      serverMessage: 'This proposal has expired — nothing was created.'
    })
  })

  test('a non-409 is not a conflict', () => {
    expect(describeConflict(new AssistantApiError(400, { message: 'x' }))).toBeNull()
    expect(describeConflict(new Error('x'))).toBeNull()
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
