// One rule for turning a failed read into a sentence the operator can act on.
//
// `RequestService.BuildError` hands callers three things: the message (the backend's own reason
// when the body carried one, else the caller's fallback), `statusCode` (the HTTP status, or
// `undefined` when the request never reached the server), and `hasBackendMessage` saying which of
// the two the message is. This function is the single place that decides what to do with them.
//
// It lives here rather than on a page because the second page to need it would otherwise copy it,
// and two copies of a rule are two rules the moment either is edited. The sentences are about the
// TRANSPORT — a session, a permission, a server, a network — so they are the same wherever a read
// fails, and the page's own heading already says which read it was.
//
// THE ORDER MATTERS AND EACH STEP IS A DECISION:
//
//   1. The server's own reason wins. The backend localises its AppException messages from the
//      Language header and knows what actually went wrong; nothing written here can beat it.
//
//   2. An error that did not come from the request layer is UNKNOWN, never "offline". `BuildError`
//      always sets `hasBackendMessage`, to `true` or to `false`, so its ABSENCE means a bug on the
//      page or a parse failure rather than a transport one. Telling an operator to check their
//      connection when the network is fine is the same lie as showing them a status code — it just
//      points the other way — so an unrecognised throw is reported as unknown and its own message
//      is offered rather than replaced.
//
//   3. Only then the status: an expired session and a refusal are the two an operator can act on
//      themselves, and no status at all means the request never left the building.
//
// `translate` is a `(key, params) => string`; pass a component's `$i` straight in.
export function describeRequestFailure (error, translate) {
  if (error && error.hasBackendMessage && error.message) { return error.message }

  if (!error || !('hasBackendMessage' in error)) {
    return (error && error.message) || translate('requestFailure_unknown')
  }

  const status = error.statusCode
  if (status === 401) { return translate('requestFailure_sessionExpired') }
  if (status === 403) { return translate('requestFailure_notAllowed') }
  if (status === undefined || status === null) { return translate('requestFailure_offline') }
  return translate('requestFailure_serverError', { status })
}

export default describeRequestFailure
