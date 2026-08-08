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
// THE LIVE DEFECT THIS FILE ROUTES AROUND. `components/admin/statistics/AIQueryBox.vue` reads
// `result.answer` — lower case. The API serialises with Newtonsoft and registers NO contract
// resolver (`Helpers/ServiceCollectionExtensions.cs:167-171` adds only `StringEnumConverter` and
// `ReferenceLoopHandling`), and ASP.NET Core's Newtonsoft default is `DefaultContractResolver`,
// which preserves PascalCase. `ChatAskResponseModel.Answer` therefore arrives as `Answer`, and
// `RequestService.TryParseResponse` hands the body through untouched (`response.data`, no key
// rewriting). So `result.answer` is `undefined` on every successful turn and that box has been
// showing "Kunne ikke få svar fra AI" for answers it actually received.
//
// ── THE CASING SEAM, which is the reason `pick` exists ─────────────────────────────────────────
//
// `ProposalCardModel` and `StagedActionModel` are serialised by TWO different pipelines:
//
//   • over MCP, by the MCP SDK's System.Text.Json Web defaults      → camelCase, nulls OMITTED
//   • over `/chat/ask` and `/staged-actions`, by MVC's Newtonsoft   → PascalCase, nulls WRITTEN
//
// The `[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]` attributes on those models
// are `System.Text.Json.Serialization` attributes (see the `using` at the top of
// `Mcp/Models/McpStagingModels.cs`). Newtonsoft does not honour them — it has its own `JsonIgnore`
// with no `Condition` — so over the two routes this client calls, the optional members arrive
// PRESENT AND NULL rather than absent.
//
// Both facts are load-bearing and neither is visible in the DTO. Reading a field case-insensitively
// and treating `null` as "absent" is therefore not defensive clutter; it is the actual contract of
// these two routes, and `test/assistant-client.test.js` pins both directions.

import getEnv from '~/env';

/**
 * A typed Ask Okam failure.
 *
 * NOTE THAT THIS SURFACE IS **NOT** RFC 9457 problem+json, unlike `~/utils/margin/api-client`.
 * `StagedActionController` answers `{ message }` on every refusal and `{ message, code }` on
 * exactly one (see `CONFLICT_KIND_DISABLED`). There is no `type`, no `title`, no `status` member in
 * the body. Rendering that keys on a problem+json shape here would key on fields that never arrive.
 */
export class AssistantApiError extends Error {
  constructor (status, body) {
    const payload = body || {};
    super(payload.message || payload.detail || payload.title || ('HTTP ' + status));
    this.name = 'AssistantApiError';
    // `instanceof` against a subclassed Error does not survive this repo's ES5 transpile, so callers
    // discriminate on this flag. The margin and workforce clients both carry the same note; getting
    // it wrong fails SILENTLY, by the typed error simply ceasing to be recognised.
    this.isAssistantApiError = true;
    this.status = status;
    this.code = payload.code || null;
    this.body = payload;
  }
}

/** True for a typed Ask Okam failure, transpile-proof (see the flag's comment). */
export function isAssistantApiError (error) {
  return !!(error && error.isAssistantApiError);
}

/**
 * THE ONLY conflict code this API puts on the wire.
 *
 * `StagedActionController.ConflictBody` emits `code` for this one refusal and for no other:
 *
 *     return string.Equals(ex.ConflictKind, StagedActionConflictKinds.KindDisabled, …)
 *         ? new { message = ex.Message, code = StagedActionConflictKinds.KindDisabled }
 *         : (object)new { message = ex.Message };
 *
 * The server distinguishes eight conflict kinds internally (`StagedActionConflictKinds`:
 * already-resolved, expired, lost-the-claim, missing-approver, contract-moved, stale,
 * terminal-write-refused, and this one) and `StagedActionConflictException` even carries the row's
 * actual `CurrentStatus` — but seven of the eight, and the status, are DROPPED before the response
 * is written. A client cannot tell them apart today. `describeConflict` below says exactly that
 * rather than guessing, and `docs`-worthy detail is in the lane report.
 */
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
 * Read one logical field off a body that may be PascalCase or camelCase (see the casing seam at the
 * top). `null` and `undefined` are the SAME answer — absent — because Newtonsoft writes the nulls
 * that System.Text.Json omits, and a caller that distinguished them would render "empty" for one
 * pipeline and "absent" for the other from identical server state.
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
 * Ask Okam's routes, route-for-route with `ChatController` and `StagedActionController`.
 *
 * THE THREAD IS SESSION-LOCAL AND THE TRANSPORT IS STATELESS. `POST /chat/ask` takes a question and
 * nothing else — no conversation id, no history, no turn list (`ChatRequestModel` has exactly three
 * members). Every turn is independent. The page renders a thread because that is the shape this will
 * keep when a conversation transport arrives; it says so on screen rather than implying a memory it
 * does not have.
 */
export class AssistantService extends AssistantClientBase {
  /**
   * One turn. `selectedStoreIds` is the EXPLICIT scope and always wins: `ChatController` uses the
   * caller's selection when one is supplied and the caller's full admin set otherwise, and the only
   * thing that may narrow either is the StoreAdmins intersection the server already applied.
   * Nothing read out of the question text takes part in that decision — which is why a
   * `StoreSuggestion` is offered to the user and never applied for them.
   */
  Ask (question, selectedStoreIds, languageCode) {
    const scope = Array.isArray(selectedStoreIds) && selectedStoreIds.length > 0
      ? selectedStoreIds
      : null;
    return this._request('POST', '/chat/ask', {
      Question: question,
      SelectedStoreIds: scope,
      LanguageCode: languageCode || null
    });
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
 * What a 409 from the approve/reject routes actually permits us to say.
 *
 * Returns a translation KEY, never prose. Only two outcomes are distinguishable on the wire:
 *
 *   • `assistant.kind_disabled` — carries `code`. The row is still valid and still staged; an
 *     operator switched the kind off. Retrying later can succeed with the merchant doing nothing,
 *     which is why the card must stay on screen.
 *   • everything else — carries `{ message }` only. Seven server-side conflict kinds and the row's
 *     real `CurrentStatus` collapse into one indistinguishable case here.
 *
 * The server's `message` is ENGLISH prose ("This proposal was already turned down.", "already
 * live", …) built by `StagedActionService.Describe`. It is surfaced verbatim beside the translated
 * line rather than parsed: matching on server prose is how a client silently stops recognising a
 * case the day somebody rewords it.
 */
export function describeConflict (error) {
  if (!isAssistantApiError(error)) { return null; }
  if (error.status !== 409) { return null; }
  return error.code === CONFLICT_KIND_DISABLED
    ? { key: 'assistant_conflict_kindDisabled', keepCard: true, serverMessage: error.message }
    : { key: 'assistant_conflict_unresolvable', keepCard: false, serverMessage: error.message };
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
 */
export function needsStoreChoice (response) {
  if (!response) { return false; }
  const status = pick(response, 'status');
  if (status === STATUS_STORE_CHOICE_NEEDED) { return true; }
  const answer = pick(response, 'answer');
  if (typeof answer !== 'string') { return false; }
  return answer.trim().indexOf(STORE_CHOICE_PROMPT) === 0 &&
    pickList(response, 'storeIds').length > 1;
}
