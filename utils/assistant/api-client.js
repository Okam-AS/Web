// The one HTTP layer the Ask Okam admin surface sits on.
//
// WHY NOT `core/services/ai-service.ts`, which already posts to `/chat/ask`.
//
// Three reasons, and the third is the one that decided it:
//
//  1. It returns `Promise<any>` and collapses EVERY failure into a bare `new Error()` with no
//     message, no status and no body. This surface has to tell a merchant apart four ways — the
//     proposal already resolved, its basis moved, it expired, an operator switched the kind off —
//     and an anonymous Error can express none of them.
//  2. It reads only `Question`/`SelectedStoreIds`/`LanguageCode` and hands back the raw body, so
//     every consumer re-derives the response shape. `AIQueryBox` derived it WRONG (see below).
//  3. Core is a git submodule. Editing it means a commit in the Core repo plus a submodule pin
//     bump here — on an object store that is already inconsistent between the sibling worktrees of
//     this repo (this checkout did not carry the pinned `a6ae241` at all). That is a cross-repo
//     landing for a file this lane could simply not touch.
//
// ── THE WIRE IS camelCase. THERE IS NO CASING SEAM; THERE IS A NULL SEAM. ──────────────────────
//
// ⚠️ THIS BLOCK ONCE SAID THE OPPOSITE, CONFIDENTLY AND WRONGLY, so the measurement is recorded
// here rather than the conclusion alone. `Helpers/ServiceCollectionExtensions.cs:154-173` calls
// `AddNewtonsoftJson` and adds only `StringEnumConverter` and `ReferenceLoopHandling` — it registers
// NO contract resolver, which is true and is where the wrong inference started. Reading that as
// PascalCase is the trap: ASP.NET Core does not leave the settings bare. `JsonSerializerSettingsProvider
// .CreateSerializerSettings()` builds a `DefaultContractResolver` AND HANDS IT A
// `CamelCaseNamingStrategy`. Resolving `IOptions<MvcNewtonsoftJsonOptions>` out of that exact
// pipeline (Microsoft.AspNetCore.Mvc.NewtonsoftJson 8.0.11) measures:
//
//     ContractResolver   Newtonsoft.Json.Serialization.DefaultContractResolver
//     NamingStrategy     Newtonsoft.Json.Serialization.CamelCaseNamingStrategy   ← renders the name
//     NullValueHandling  Include
//
// The resolver TYPE is the PascalCase one; the naming strategy ON it is camelCase, and the naming
// strategy is what writes the property name. So `ChatAskResponseModel.Answer` goes out as `answer`.
//
// Three independent witnesses, none of them an inference:
//
//   • `WebApi.Tests/Wire/GrowthConsentAdminWireTests.cs:228-232` reads a LIVE host response with
//     case-sensitive `GetProperty("dueAt")` and asserts `TryProperty("DueAt")` is FALSE. It passes.
//   • `docs/api/README.md:43-46` states it as law: "The wire is camelCase."
//   • `WebApi.Tests/Meals/MealsContractFixtureTests.cs` rebuilds this pipeline verbatim and its
//     committed goldens under `docs/api/fixtures/` are camelCase.
//
// `ChatAskResponseModel` carries ZERO serialization attributes and both controllers return
// `Ok(model)` through the ordinary MVC formatter — no `JsonConvert.SerializeObject`, no `Content(…)`,
// no custom output formatter — so nothing bypasses the above.
//
// WHAT IS ACTUALLY TWO-VALUED IS NULLS, and that half matters. `ProposalCardModel` carries eight
// `[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]` attributes, and the `using` at the
// top of `Mcp/Models/McpStagingModels.cs` is `System.Text.Json.Serialization`. Newtonsoft honours
// only its OWN `JsonIgnore`, which has no `Condition`, so:
//
//   • over MCP, by System.Text.Json's `JsonSerializerDefaults.Web`   → camelCase, nulls OMITTED
//   • over `/assistant/*` and `/staged-actions`, by MVC's Newtonsoft → camelCase, nulls WRITTEN
//
// The conversation routes are the same MVC pipeline and behave the same way, which is not a guess: a
// live turn against `http://127.0.0.1:5080/assistant/conversations/{id}/messages` answers
// `"storeIds": null, "storeNames": null, "storeSuggestion": null` — written, not omitted.
//
// Same casing, opposite null handling. `pick` treating `null` and absent as ONE answer is therefore
// load-bearing: without it the same server state renders as "empty" from one pipeline and "absent"
// from the other.
//
// WHY `pick` STILL READS BOTH CASINGS, stated honestly as insurance rather than as a live contract:
// nothing this client calls sends PascalCase today. It is one line, and the failure it covers is
// silent and total — `GrowthConsentAdminWireTests`' own comment names it: "a contract resolver
// reverted to Newtonsoft's default would serve `DueAt` and leave the page reading nothing." A
// resolver swap is a one-line change in a file this lane does not own.
//
// KNOWN GAP: no test anywhere pins the casing of `/chat/ask` ITSELF. The mechanism above is shared
// and proven, but the route has no wire test of its own — the exact gap `GrowthConsentAdminWireTests`
// was written to close for Growth. Worth closing on the backend side.

import getEnv from '~/env';

/**
 * A typed Ask Okam failure.
 *
 * NOTE THAT THIS SURFACE IS **NOT** RFC 9457 problem+json, unlike `~/utils/margin/api-client`.
 * There is no `type` and no `title` anywhere on it. Rendering that keys on a problem+json shape
 * would key on fields that never arrive.
 *
 * ── TWO CONTROLLERS, TWO REFUSAL SHAPES, AND ONE OF THEM NAMES THE REASON SOMEWHERE ELSE ────────
 *
 * `StagedActionController` answers `{ message }`, and a 409 additionally carries `{ code, status }`
 * (see `describeConflict`). `message` is the reason.
 *
 * `ChatController` DOES NOT. Its 400/401/403/500 all return a whole `ChatAskResponseModel` and put
 * the merchant-facing sentence in **`Answer`** — `Controllers/ChatController.cs:40-57`, built by
 * `Refusal` at `:124-131`, which sets `Question`, `Success = false` and `Answer` and NOTHING else.
 * There is no `message`, no `detail` and no `title` on that body at all.
 *
 * ⚠️ SO THIS CHAIN USED TO END AT `'HTTP ' + status` FOR EVERY CHAT REFUSAL. A merchant who asked
 * about a store they do not administer was shown the literal string **"HTTP 403"** in place of the
 * sentence the server had written for exactly that moment ("You don't have access to the requested
 * stores."). The fallback did not fail — it succeeded, at rendering a status line as prose.
 *
 * `answer` is therefore in the chain, LAST: `message` still wins wherever a `message` exists, so
 * nothing about the staged-action refusals changes, and the chat body's own field is read only when
 * the shapes that carry a reason are absent. `errorMessage` is deliberately NOT read — on the 500
 * path it is the developer-facing `"Internal server error"` sitting beside a Norwegian sentence in
 * `Answer`, and preferring it would swap a sentence written for the merchant for one written for us.
 *
 * Read through `pick`, so the null-vs-absent rule at the top of this file applies here too: a
 * Newtonsoft-written `"answer": null` is absent, not an empty message that would swallow the chain.
 */
export class AssistantApiError extends Error {
  constructor (status, body) {
    const payload = body || {};
    super(pick(payload, 'message') || pick(payload, 'detail') || pick(payload, 'title') ||
      pick(payload, 'answer') || ('HTTP ' + status));
    this.name = 'AssistantApiError';
    // `instanceof` against a subclassed Error does not survive this repo's ES5 transpile, so callers
    // discriminate on this flag. The margin and workforce clients both carry the same note; getting
    // it wrong fails SILENTLY, by the typed error simply ceasing to be recognised.
    this.isAssistantApiError = true;
    // ⚠️ `status` HERE IS THE HTTP STATUS. The ROW's status — what the proposal actually became —
    // arrives on the SAME body under the SAME word, and the two are different facts: `409` versus
    // `"executed"`. It is deliberately not lifted onto this object, because one of the two would
    // have to be renamed and a reader of `error.status` would then have to know which. It is read
    // off `body` where the server put it; `describeConflict` is the only thing that does so.
    this.status = status;
    this.code = pick(payload, 'code') || null;
    this.body = payload;
  }
}

/** True for a typed Ask Okam failure, transpile-proof (see the flag's comment). */
export function isAssistantApiError (error) {
  return !!(error && error.isAssistantApiError);
}

/**
 * THE EIGHT CONFLICT CODES, ALL OF WHICH ARE NOW ON THE WIRE.
 *
 * ⚠️ THIS BLOCK PREVIOUSLY SAID THE OPPOSITE — "the only conflict code this API puts on the wire",
 * "seven of the eight, and the status, are DROPPED", "the 409 body carries no status member". That
 * was true of the backend this surface was written against (`b4f8fa817`) and is FALSE at
 * `880c24e46`, which is what deploys. The measurement is recorded here rather than the conclusion
 * alone, because a comment that describes a wire the server no longer speaks is the reason a client
 * keeps handling a case that cannot happen and keeps missing seven that can.
 *
 * `StagedActionController.ConflictBody` (`Controllers/StagedActionController.cs:99-107`) now emits,
 * for EVERY conflict kind:
 *
 *     new { message = ex.Message, code = ex.ConflictKind, status = ex.CurrentStatus?.ToString().ToLowerInvariant() }
 *
 *   • `code`   — always present, always one of the eight below (`StagedActionConflictKinds`,
 *                `Services/SocialChef/StagedActionConflictException.cs:30-44`). The exception has a
 *                single constructor and it cannot be built without a kind, so a `code: null` cannot
 *                be reached from a throw site.
 *   • `status` — WHAT THE ROW ACTUALLY IS NOW, lower-cased, which the compare-and-set knew and used
 *                to throw away. The key is always present so a client reads one shape; the VALUE is
 *                null for `terminal-write-refused` alone, whose write was rolled back and which
 *                therefore names no row state.
 *
 * ⚠️ THE CASING IS NOT THE LIST ROUTE'S. `status` here is `"executed"`; `GET /staged-actions`
 * spells the same status `"Executed"`, because that is the shape SocialChef already reads. Compare
 * them only after normalising — every comparison in this file lower-cases first.
 */
export const CONFLICT_ALREADY_RESOLVED = 'already-resolved';
export const CONFLICT_EXPIRED = 'expired';
export const CONFLICT_LOST_THE_CLAIM = 'lost-the-claim';
export const CONFLICT_MISSING_APPROVER = 'missing-approver';
export const CONFLICT_CONTRACT_MOVED = 'contract-moved';
export const CONFLICT_STALE = 'stale';
export const CONFLICT_TERMINAL_WRITE_REFUSED = 'terminal-write-refused';
export const CONFLICT_KIND_DISABLED = 'assistant.kind_disabled';

/**
 * Chat statuses, as `ChatOrchestrator` writes them.
 *
 * `STORE_CHOICE_NEEDED` is the one value that is not yet produced as a TOP-LEVEL status on
 * `feature/ask-okam` @ b4f8fa817: today it exists only as `ChatToolOutcomeStatus.StoreChoiceNeeded`,
 * a per-tool outcome. The `lane/ask-wire` lane promotes it. This surface renders the venue picker
 * for it AND for `CLARIFICATION_NEEDED`, which is live now and carries the same "ask the human"
 * meaning, so the page is useful before that lane lands and correct after it.
 */
export const STATUS_ANSWERED = 'answered';
export const STATUS_PROPOSAL_STAGED = 'proposal_staged';
export const STATUS_CLARIFICATION_NEEDED = 'clarification_needed';
export const STATUS_STORE_CHOICE_NEEDED = 'store_choice_needed';
export const STATUS_CANCELLED = 'cancelled';
export const STATUS_ERROR = 'error';

/** `StagedActionStatus`, serialised by `StringEnumConverter` and compared case-insensitively. */
export const STAGED = 'Staged';
export const EXECUTED = 'Executed';
export const REJECTED = 'Rejected';
export const EXPIRED = 'Expired';
export const EXECUTING = 'Executing';
export const FAILED = 'Failed';

/**
 * Read one logical field off a response body.
 *
 * THE NULL RULE IS THE LOAD-BEARING HALF. `null` and `undefined` are the SAME answer — absent —
 * because Newtonsoft WRITES the nulls that System.Text.Json omits (see the null seam at the top), so
 * a caller that distinguished them would render "empty" for one pipeline and "absent" for the other
 * from identical server state.
 *
 * The case tolerance is INSURANCE, not a live contract: every route this client calls answers
 * camelCase today. It costs one line and covers a failure that is silent and total if the API's
 * naming strategy is ever changed out from under this page.
 */
export function pick (source, name) {
  if (!source || !name) { return undefined; }
  const pascal = name.charAt(0).toUpperCase() + name.slice(1);
  const camel = name.charAt(0).toLowerCase() + name.slice(1);
  const value = source[pascal] !== undefined ? source[pascal] : source[camel];
  return value === null ? undefined : value;
}

/** `pick`, defaulted to an array. Absent and empty are the same thing to every caller here. */
export function pickList (source, name) {
  const value = pick(source, name);
  return Array.isArray(value) ? value : [];
}

/**
 * The ØRE INTEGER out of an `McpMoney`, or null when there is none.
 *
 * Deliberately NOT a formatter. This repository already has exactly one money formatter — the
 * global mixin's `priceLabel`, which takes minor units, carries the admin edition's "kr " prefix,
 * routes the Swiss market through `formatChf`, and is the thing every component test already
 * mocks. A second one here would be a second answer to "what does 24900 look like", and the two
 * would disagree the day a market is added. So this extracts the number and the caller labels it.
 *
 * The server also sends `Formatted`, built as `$"{currency} {(decimal)amount / 100:0.00}"` under
 * the SERVER's culture — "NOK 249.00", with a period. It is not used: it is neither this
 * application's format nor this operator's locale.
 */
export function oreOf (money) {
  if (money === undefined || money === null) { return null; }
  const amount = pick(money, 'amount');
  return typeof amount === 'number' ? amount : null;
}

/**
 * ── AN OFFSET-LESS TIMESTAMP MEANS OSLO, AND `new Date()` READS IT AS THE BROWSER ────────────────
 *
 * THE MEASUREMENT. `ExpiresAt` reaches this client two ways and they do not agree:
 *
 *   • from `POST /chat/ask` — the card is built in-process from a `DateTime` with `Kind = Local`,
 *     which Newtonsoft serialises WITH an offset: `"2026-08-09T16:12:00+02:00"`. Unambiguous, and
 *     `new Date(raw)` gets it right in every timezone on earth.
 *   • from `GET /staged-actions` — the row was read back out of SQL, where `datetime2` carries no
 *     zone, so the materialised `DateTime` has `Kind = Unspecified` and serialises with NO offset:
 *     `"2026-08-09T16:12:00"`.
 *
 * ⚠️ AND ES2015 SAYS THAT SECOND FORM IS **BROWSER-LOCAL**. A date-time form with no offset is
 * parsed as local time (a date-ONLY form is parsed as UTC — the two halves of the same grammar
 * disagree, which is why nobody remembers this rule). So the same proposal's expiry is read as
 * 16:12 Oslo by a merchant in Oslo and as 16:12 New York — four hours late — by the same merchant
 * on a trip, off ONE serialised string that meant Oslo both times.
 *
 * WHY IT IS FIXED HERE AND NOT LEFT COSMETIC. It stopped being a cosmetic skew the moment the card
 * withheld the approve button on an elapsed countdown (see `isExpired` in `ProposalCardView`): west
 * of Oslo the clock runs late and the button stays live past the server's own deadline, so the
 * merchant's click lands on a 409; east of Oslo it runs early and the button is withheld from a
 * proposal that is still perfectly approvable. The second is the worse one — it removes a real
 * affordance and there is no error to explain it.
 *
 * ⚠️ THE REAL FIX IS THE BACKEND'S, AND THIS DOES NOT REPLACE IT. Every client of
 * `/staged-actions` inherits this ambiguity — SocialChef reads that route in production — and one
 * Vue component parsing around it fixes one of N readers while the wire stays unreadable. The
 * backend fix is to give the materialised value `DateTimeKind.Utc` (or project it through a
 * converter) so the route serialises `Z`, at which point this helper's regex simply stops matching
 * and the code below becomes inert without being touched. Filed as backend work in the lane report;
 * this is the client refusing to be wrong in the meantime, not the repair.
 *
 * Applied to `ExpiresAt` ONLY — the one field differenced against `Date.now()`. Deliberately NOT to
 * the effective window or the receipt date: those are RENDERED as wall-clock digits, and a venue's
 * "gjelder fra 14:00" means 14:00 at the venue to a merchant reading it from anywhere.
 */
const OSLO_TIME_ZONE = 'Europe/Oslo';

// ISO-8601 date-time with NO trailing `Z` and no `±hh:mm`. Anything carrying a zone is already
// unambiguous and must be left to `new Date`, which is why this is anchored at both ends.
const OFFSETLESS_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,7}))?$/;

let osloFormatter;

/**
 * The wall clock Europe/Oslo shows at `instantMs`, expressed as a UTC-based millisecond count so it
 * can be subtracted. Null when this runtime has no Europe/Oslo — an ICU-less build throws
 * `RangeError` from the constructor, and the caller then leaves the value to `new Date` rather than
 * guessing an offset.
 */
function osloWallClockAt (instantMs) {
  if (osloFormatter === undefined) {
    try {
      osloFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: OSLO_TIME_ZONE,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      osloFormatter = null;
    }
  }
  if (!osloFormatter) { return null; }

  const fields = {};
  osloFormatter.formatToParts(new Date(instantMs)).forEach((part) => {
    fields[part.type] = part.value;
  });
  // Some ICU versions render midnight as hour "24" under `hour12: false`.
  const hour = fields.hour === '24' ? 0 : Number(fields.hour);
  return Date.UTC(
    Number(fields.year), Number(fields.month) - 1, Number(fields.day),
    hour, Number(fields.minute), Number(fields.second)
  );
}

/**
 * The instant at which Oslo's wall clock reads `wallMs`.
 *
 * Two passes, and the second is not belt-and-braces. The first correction is computed at the WRONG
 * instant (the wall-clock reading treated as UTC), which lands on the other side of a DST boundary
 * for readings within an hour of one; re-measuring at the corrected instant converges. A reading
 * inside the spring-forward gap names an hour Oslo never showed, and resolves to the instant
 * immediately after the jump, which is the only real time it can mean.
 *
 * ⚠️ `wallMs` MUST BE WHOLE SECONDS. `osloWallClockAt` reads back a formatter whose finest field is
 * the second, so any sub-second part of the input is absent from the reading and is therefore
 * counted as part of the OFFSET — once per pass, which the two passes then compound. A test with
 * `.1234567` on it came back `.369`: the 123 ms had been added three times. The caller splits the
 * fraction off and adds it to the result, which is sound because no timezone offset has ever had a
 * sub-second component.
 */
function osloWallClockToInstant (wallMs) {
  const firstReading = osloWallClockAt(wallMs);
  if (firstReading === null) { return null; }
  const firstGuess = wallMs - (firstReading - wallMs);
  const secondReading = osloWallClockAt(firstGuess);
  if (secondReading === null) { return null; }
  return wallMs - (secondReading - firstGuess);
}

/**
 * A server timestamp as an instant. Offset-less values are read as Oslo; everything else is left
 * exactly as `new Date` reads it. Returns null for absent and for unparseable, so a caller never
 * has to hold an Invalid Date.
 */
export function parseServerDate (raw) {
  if (raw === undefined || raw === null || raw === '') { return null; }

  if (typeof raw === 'string') {
    const match = OFFSETLESS_TIMESTAMP.exec(raw.trim());
    if (match) {
      // WHOLE SECONDS through the offset maths, fraction added back afterwards — see the warning on
      // `osloWallClockToInstant`. .NET writes up to seven fractional digits and `Date` takes three.
      const milliseconds = match[7] ? Number(match[7].slice(0, 3).padEnd(3, '0')) : 0;
      const wallSeconds = Date.UTC(
        Number(match[1]), Number(match[2]) - 1, Number(match[3]),
        Number(match[4]), Number(match[5]), Number(match[6] || 0)
      );
      const instant = isNaN(wallSeconds) ? null : osloWallClockToInstant(wallSeconds);
      if (instant !== null && !isNaN(instant)) { return new Date(instant + milliseconds); }
    }
  }

  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * The shared request base. Routes live on `AssistantService` below and nowhere else.
 *
 * `initializer` is the Core initializer the admin pages already hold as `this._coreInitializer`;
 * only its `bearerToken` is read, exactly as the Margin and Workforce clients do.
 */
export class AssistantClientBase {
  constructor (initializer) {
    this._initializer = initializer || {};
  }

  get _baseUrl () {
    return String(getEnv('API_BASE_URL') || '').replace(/\/+$/, '');
  }

  _headers (extra) {
    const headers = Object.assign({ Accept: 'application/json' }, extra || {});
    const token = this._initializer.bearerToken;
    if (token) { headers.Authorization = 'Bearer ' + token; }
    return headers;
  }

  async _request (method, path, body) {
    const headers = this._headers();
    let payload;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    const response = await fetch(this._baseUrl + path, { method, headers, body: payload });

    const text = await response.text();
    let parsed = null;
    if (text) {
      try { parsed = JSON.parse(text); } catch (e) { parsed = { message: text }; }
    }

    if (!response.ok) { throw new AssistantApiError(response.status, parsed); }
    return parsed;
  }
}

/**
 * Ask Okam's routes, route-for-route with `AssistantConversationsController` and
 * `StagedActionController`.
 *
 * ── THE TRANSPORT IS A THREAD, AND `POST /chat/ask` IS NOT IT ────────────────────────────────────
 *
 * This client used to post every question to `/chat/ask`, whose `ChatRequestModel` has exactly three
 * members and carries no conversation id, no history and no turn list. Every turn really was
 * independent, and the page said so on screen. The multi-turn transport was BUILT and nothing called
 * it: `rg -c "assistant/conversations"` over this repository returned 0, tests included.
 *
 * It is called now, and the stateless route is deliberately NOT kept as a fallback. A fallback would
 * turn "the thread could not be opened" into "the thread was silently forgotten", which is the exact
 * failure the on-screen note used to be honest about — and the merchant would have no way to tell
 * the two apart. A refusal here is reported; it is never routed around.
 *
 * ── TWO THINGS THIS ROUTE DOES THAT `/chat/ask` DOES NOT ─────────────────────────────────────────
 *
 *  1. **The store scope is FROZEN at create** (`StoreScopeJson`) and re-verified every turn. There is
 *     no rescope route and there will not be one: every later turn replays history gathered under the
 *     frozen scope, so widening it would answer a later question with earlier data the new scope was
 *     never verified for. A different selection is a different conversation — which is why
 *     `StartConversation` takes the scope and `AskInConversation` cannot.
 *  2. **The `Assistant.Module` feature flag is checked**, at create AND on every turn.
 *     `ChatController` checks no flag at all, so a store with the module switched off could ask a
 *     one-shot question and cannot hold a conversation. That is a real behavioural difference and it
 *     is the server's ruling, not this client's to paper over.
 *
 * ⚠️ AND ONE THING IT DOES NOT DO THAT `/chat/ask` DOES. `ChatController` fills `StoreIds`,
 * `StoreNames` and `StoreSuggestion` onto the response AFTER the orchestrator returns
 * (`ChatController.cs:76-81`); `AssistantConversationService` returns the orchestrator's response
 * untouched, so all three arrive NULL on a conversation turn. Measured against the live host, not
 * inferred. The caller therefore labels a turn's scope from the thread's own frozen scope — which is
 * the server-verified list `StartConversation` handed back, so nothing is invented — and the
 * question-text store suggestion is simply absent, because it is computed by `ChatStoreNameResolver`
 * server-side and cannot be reproduced here. Filed as backend work; the client refuses to fake it.
 */
export class AssistantService extends AssistantClientBase {
  /**
   * Open a thread and FREEZE its scope.
   *
   * `storeIds` empty is sent as null, exactly as the one-shot route's `SelectedStoreIds` was: the
   * server reads absent as "every store I administer that has the assistant switched on", and an
   * empty LIST is a supplied-but-empty selection, which it refuses with a 403.
   *
   * Answers an `AssistantConversationModel` — `{ id, status, storeIds, storeNames, … }`. The scope it
   * reports is the VERIFIED one (requested ∩ administered ∩ assistant-enabled) and may legitimately
   * be narrower than what was asked for.
   */
  StartConversation (storeIds) {
    const scope = Array.isArray(storeIds) && storeIds.length > 0 ? storeIds : null;
    return this._request('POST', '/assistant/conversations', { StoreIds: scope });
  }

  /**
   * One turn on an open thread.
   *
   * `targetStoreId` NARROWS this turn to one store of the frozen scope and can never widen it — a
   * store outside the scope is refused with a 403 rather than added. It is what the venue picker
   * answers with, and it is the whole of the per-turn scope vocabulary: a list would be a rescope.
   *
   * Answers an `AssistantConversationTurnModel` — `{ conversationId, sequence, answer, notRemembered }`
   * — whose `answer` is the SAME `ChatAskResponseModel` the one-shot route returns, so a renderer
   * that already reads that shape reads this one unchanged.
   */
  AskInConversation (conversationId, question, targetStoreId, languageCode) {
    return this._request('POST', '/assistant/conversations/' + conversationId + '/messages', {
      Question: question,
      TargetStoreId: typeof targetStoreId === 'number' ? targetStoreId : null,
      LanguageCode: languageCode || null
    });
  }

  /**
   * End a thread the merchant is finished with.
   *
   * Worth calling rather than abandoning: an untouched Active thread sits until the retention sweep
   * expires it (`IdleExpiryHours`, 24h by default), and only a terminal thread has its turns deleted
   * by the sweep when `ChatPrivacy:PersistHistory` is off. Closing is therefore the merchant's own
   * "I am done with this" and the thing that lets retention collect it early.
   *
   * Closing an already-terminal thread is not an error, and an EXPIRED thread stays Expired — the
   * server refuses to relabel the clock's act as the merchant's.
   */
  CloseConversation (conversationId) {
    return this._request('DELETE', '/assistant/conversations/' + conversationId);
  }

  /**
   * The inbox. `status` is optional and is parsed server-side against `StagedActionStatus`
   * case-insensitively (`GetForStoreAsync`), so the exported PascalCase constants are sent as-is.
   */
  ListStagedActions (storeId, status) {
    const query = status
      ? '?storeId=' + storeId + '&status=' + encodeURIComponent(status)
      : '?storeId=' + storeId;
    return this._request('GET', '/staged-actions' + query);
  }

  /**
   * One staged action as `{ action, card }` — the LIVE row beside the FROZEN card.
   *
   * ⚠️ THE TWO HALVES DISAGREE ON PURPOSE, AND ONLY ONE OF THEM MAY BE BELIEVED ABOUT WHAT MAY
   * HAPPEN NEXT. The card is rebuilt verbatim from the bytes stored at stage time, so it always
   * carries `NeedsApproval: true` and live `ApproveRef` / `RejectRef` — including for rows that have
   * already Executed, been Rejected or Expired. It cannot know what happened after it was frozen;
   * `StagedActionDetailModel` exists precisely so the live `action` travels beside it.
   *
   *   `action.status` → what the merchant may DO.
   *   `card`          → what the merchant should SEE.
   *
   * The same law explains something that reads as a bug and is not: a card keeps the DISH NAME it
   * was staged with, even after the dish has been renamed. Fetching live names to "fix" it would
   * produce a card mixing a current name with frozen prices — describing a change nobody staged.
   *
   * `changeSet` and `affectedCount` arrive as explicit `null` rather than absent, because the
   * `[JsonIgnore(WhenWritingNull)]` attributes on these models are System.Text.Json's and this route
   * is served by Newtonsoft. `pick` already treats the two as one answer.
   */
  GetStagedAction (id) {
    return this._request('GET', '/staged-actions/' + id);
  }

  /**
   * Approve. Executes the proposal exactly once; a second approve of an already-executed row
   * REPLAYS the recorded outcome (`wasReplay: true`) rather than creating a second effect.
   *
   * The response body's keys are written by hand in `ApproveBody` as a `Dictionary<string, object>`
   * — `proposalId`, `kind`, `status`, `resultReference`, `wasReplay` — so they are camelCase
   * regardless of the serialiser. `pick` reads them anyway; nothing here depends on knowing which.
   */
  Approve (id) {
    return this._request('POST', '/staged-actions/' + id + '/approve');
  }

  /** Reject. Terminal — `RejectAsync` has no inverse and no row is ever reset. */
  Reject (id) {
    return this._request('POST', '/staged-actions/' + id + '/reject');
  }
}

/**
 * ONE LINE PER CONFLICT CODE. Keys, never prose.
 *
 * `keepCard` is the ONLY behavioural bit here and it is unchanged from when this recognised a
 * single code, because it was already right: `assistant.kind_disabled` is the one refusal that
 * leaves the row **Staged** and approvable later — it refuses the KIND, not this proposal, and the
 * merchant does nothing to make the next attempt succeed. Every other code has already settled the
 * row inside the claimed transaction (`stale`, `contract-moved` and `missing-approver` settle it to
 * Failed; the rest find it already settled), so its card is an offer that can only 409 again.
 *
 * `canRepropose` is the affordance bit, and it is narrower than "this failed". It is true only
 * where a NEW proposal over the SAME question would plausibly succeed:
 *
 *   • `stale`   — the basis moved under the proposal. The numbers on the card were computed against
 *                 a menu that has since changed, so re-asking is not a retry, it is the only way to
 *                 get a proposal whose arithmetic is about the current prices.
 *   • `expired` — the TTL ran out. Nothing is wrong with the ask, only with this instance of it.
 *
 * It is NOT set for `lost-the-claim` (someone is mid-execution; the right move is to wait and look),
 * nor for `already-resolved/executed` (the change is live — re-proposing it would apply it twice),
 * nor for `terminal-write-refused`, `contract-moved` or `missing-approver`, which are operator- or
 * integration-side and do not improve by being asked again.
 */
const CONFLICT_LINES = {
  [CONFLICT_KIND_DISABLED]: { key: 'assistant_conflict_kindDisabled', keepCard: true },
  [CONFLICT_ALREADY_RESOLVED]: { key: 'assistant_conflict_alreadyResolved' },
  [CONFLICT_EXPIRED]: { key: 'assistant_conflict_expired', canRepropose: true },
  [CONFLICT_LOST_THE_CLAIM]: { key: 'assistant_conflict_lostTheClaim' },
  [CONFLICT_MISSING_APPROVER]: { key: 'assistant_conflict_missingApprover' },
  [CONFLICT_CONTRACT_MOVED]: { key: 'assistant_conflict_contractMoved' },
  [CONFLICT_STALE]: { key: 'assistant_conflict_stale', canRepropose: true },
  [CONFLICT_TERMINAL_WRITE_REFUSED]: { key: 'assistant_conflict_terminalWriteRefused' }
};

/**
 * `already-resolved` NAMED BY WHAT THE ROW ACTUALLY BECAME.
 *
 * The generic line has to hedge — "this may already have been carried out" — because without the
 * status it genuinely does not know. `status` removes the hedge, and the difference between "your
 * price change is live" and "someone turned this down" is the whole of what the merchant came to
 * find out. An unlisted or absent status falls back to the hedged line rather than inventing one.
 *
 * THREE ENTRIES BECAUSE THE SERVER CAN ONLY SEND THREE. `StagedActionService` throws this code from
 * exactly three places — approve on a Rejected row, approve on a Failed row, reject on an Executed
 * row (`:160-164`, `:218-219`) — so Executed, Rejected and Failed are the whole reachable set.
 *
 * There is deliberately NO `expired` entry, even though Expired is a status a row can hold: expiry
 * is refused under its own code (`StagedActionConflictKinds.Expired`, thrown at `:173-174` with a
 * literal `StagedActionStatus.Expired`) and never reaches this table. Writing a line for it would
 * be translating a case the server cannot produce, and would quietly rank as the more specific
 * answer if it ever did.
 */
const ALREADY_RESOLVED_LINES = {
  executed: { key: 'assistant_conflict_alreadyExecuted' },
  rejected: { key: 'assistant_conflict_alreadyRejected' },
  failed: { key: 'assistant_conflict_alreadyFailed' }
};

/**
 * What a 409 from the approve/reject routes says.
 *
 * Returns `{ key, keepCard, canRepropose, code, status, serverMessage }` — a translation KEY and
 * the two machine facts the body carries, never prose of its own.
 *
 * The server's `message` travels alongside as `serverMessage` and is ENGLISH prose built by
 * `StagedActionService`. It is surfaced verbatim beside the translated line and never parsed:
 * matching on server prose is how a client silently stops recognising a case the day somebody
 * rewords it — which is precisely the fragility `code` was added to remove.
 *
 * An UNRECOGNISED code falls through to the generic line rather than to nothing. The eight are the
 * eight at `880c24e46`, and a ninth shipping to a browser holding this bundle must read as "this is
 * no longer waiting for you, here is what the server said", not as an empty box.
 */
export function describeConflict (error) {
  if (!isAssistantApiError(error)) { return null; }
  if (error.status !== 409) { return null; }

  const code = error.code || null;
  // Lower-cased on the way in. The 409 already writes it lower-case, but the list route spells the
  // same statuses Pascal-case and both reach this file, so normalising here means neither caller
  // has to remember which one it is holding.
  const status = String(pick(error.body, 'status') || '').toLowerCase() || null;

  const line = (code === CONFLICT_ALREADY_RESOLVED && ALREADY_RESOLVED_LINES[status]) ||
    CONFLICT_LINES[code] ||
    { key: 'assistant_conflict_unresolvable' };

  return {
    key: line.key,
    keepCard: !!line.keepCard,
    canRepropose: !!line.canRepropose,
    code,
    status,
    serverMessage: error.message
  };
}

/**
 * The in-band status a turn carries when the THREAD is too long to continue rather than the question
 * being wrong. It arrives as a 200 with `notRemembered: true` and a merchant-facing sentence in
 * `Answer` — deliberately not a status code, because "this thread is full and a new one will work" is
 * information a 409 cannot carry once the turn has already run.
 */
export const STATUS_CONVERSATION_FULL = 'conversation_full';

/**
 * Is this refusal the END of the thread, or just a bad moment?
 *
 * The distinction decides whether the client throws away a working conversation's memory, so it is
 * made from the STATUS the controller maps faults to (`AssistantConversationsController.Answer`) and
 * never from prose:
 *
 *   403  Forbidden / ScopeLapsed — the caller lost admin on one of the thread's stores, or the
 *        assistant was switched off for one of them, or a named target is outside the frozen scope.
 *        The first two are recomputed identically on every later turn, so the thread is finished.
 *   404  NotFound — the retention sweep took the header, or it was never this caller's. Existence and
 *        ownership answer the same way on purpose, and neither is recoverable by asking again.
 *   409  Terminal / Full — closed, expired, or at `MaxTurns`. The server's own sentence for all three
 *        ends with "start a new conversation".
 *
 * A 400 and a 500 are deliberately NOT here. A malformed question or a model outage says nothing
 * about the thread, and retiring one over a blip would discard the merchant's context to no purpose —
 * the expensive direction of this decision, since nothing restores it.
 *
 * ⚠️ 403 IS COARSER THAN IT LOOKS, and it is worth naming rather than discovering. A turn narrowed to
 * a store outside the frozen scope is also a 403, and that one is the CLIENT's mistake, not a dead
 * thread — the venue picker only ever offers stores from the thread's own scope, so it cannot be
 * reached from this surface. If a future caller can name an arbitrary store, this needs the fault
 * name on the wire to tell the two apart; today the body carries only a message.
 */
export function threadIsOver (error) {
  if (!isAssistantApiError(error)) { return false; }
  return error.status === 403 || error.status === 404 || error.status === 409;
}

/**
 * The sentence the backend composes when a write needs ONE venue and the turn covers several.
 *
 * ⚠️ A STRING MATCH, WHICH IS NORMALLY A BUG, KEPT ONLY AS A FALLBACK. `store_choice_needed` is now
 * a real top-level `Status`, and `needsStoreChoice` reads that FIRST and never consults the prose
 * when it is present. This constant survives for the backend as it was at `b4f8fa817`, where the
 * runner's refusal to pick a store reached the client as an ORDINARY answered turn — `Status =
 * "answered"`, `Cards = null` — with the question in `Answer`, composed in C# rather than by the
 * model. The backend's own test pinned that and named the gap:
 *
 *     // "answered" rather than a picker-specific word: the turn carries no structured picker, so
 *     // what a client renders venue buttons from is the response's own StoreIds/StoreNames […]
 *     // A status word for this would be a new wire value and is the integrator's to add.
 *     Assert.Equal("answered", response.Status);
 *
 * Keeping it means this page works against either backend and gets no worse against the new one.
 * It is confined to this one constant, matched only at the START of the answer, and is deletable in
 * one place once no deployed backend can answer the old way.
 */
export const STORE_CHOICE_PROMPT = 'Hvilken butikk gjelder det?';

/**
 * Should this turn render venue buttons?
 *
 * Ordered so the STRUCTURED signal wins the moment it exists: if a future `Status` says
 * `store_choice_needed`, the prose is never consulted. The prose branch additionally requires more
 * than one store in scope, because a single-store answer that happens to open with those words has
 * nothing to choose between and must not grow buttons.
 *
 * ⚠️ `scopeStoreIds` IS WHY THIS PICKER STILL EXISTS ON THE CONVERSATION ROUTE. A conversation turn's
 * response carries `storeIds: null` — the controller that filled that field is not in this path (see
 * the note on `AssistantService`) — so the "more than one store" test read an empty list and answered
 * false for every question, on every thread. The picker would not have failed loudly; it would simply
 * never have appeared again, on the one turn where the backend refuses to choose a venue itself.
 * The caller passes the THREAD'S OWN FROZEN SCOPE, which is the server-verified list the create
 * response handed back, and it is consulted only when the response supplies none of its own.
 */
export function needsStoreChoice (response, scopeStoreIds) {
  if (!response) { return false; }
  const status = pick(response, 'status');
  if (status === STATUS_STORE_CHOICE_NEEDED) { return true; }
  const answer = pick(response, 'answer');
  if (typeof answer !== 'string') { return false; }
  const own = pickList(response, 'storeIds');
  const scope = own.length ? own : (Array.isArray(scopeStoreIds) ? scopeStoreIds : []);
  return answer.trim().indexOf(STORE_CHOICE_PROMPT) === 0 && scope.length > 1;
}
