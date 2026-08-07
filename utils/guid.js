// RFC 4122 v4 GUID for client-generated idempotency keys (e.g. the POS cash-return returnId).
//
// EVERY caller is an idempotency or replay key on a money or payroll path: `ReturnBuilder.returnId`
// and `RefundModal.returnId` (cash out of the drawer), `DayFlow.txnIdempotencyKey` (a drawer
// movement), `ClockScreen.clientEventId` (a payroll-bearing punch), the two `join.vue` claim keys,
// and the `Idempotency-Key` header that `utils/workforce/api-client.js:_mutate` puts on every
// Workforce mutation. A repeated key is not a cosmetic collision: the server dedupes against the
// earlier key and returns the earlier posting, so — in DayFlow's own words — "the UI would report
// success while the drawer is short by 4500". So every rung below is a CSPRNG, and the last rung is
// an explicit failure rather than a weaker source.
//
// The rungs, in order:
//   1. a platform `crypto` with `randomUUID`  — every secure-context browser, Node >= 19
//   2. a platform `crypto` with `getRandomValues` — plain-http dev hosts and older WebViews, where
//      `randomUUID` is secure-context-only but `crypto` itself is not
//   3. Node's own `crypto` module — jest/jsdom, which defines no `crypto` global at all, and
//      `nuxt generate` on Node < 19 (`.github/workflows/nuxtjs.yml` pins node-version 16)
//   4. throw, naming what is missing
//
// Rung 3 previously did not exist, and its absence was a defect rather than a decision: the old
// guard read `typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'` and then
// dereferenced that same `crypto` unguarded two lines later, so the one case the guard's first half
// tested for was the one case the fallback could not survive.

// Resolve the platform crypto object without a bare `crypto` identifier reference, which throws a
// ReferenceError rather than yielding undefined when there is no such global.
function platformCrypto () {
  // `global` is deliberately NOT probed: anywhere it carries `crypto` (Node >= 19) `globalThis`
  // carries the same object, and naming it makes webpack inject its `buildin/global.js` shim for
  // nothing.
  if (typeof globalThis !== 'undefined' && globalThis.crypto) { return globalThis.crypto }
  if (typeof self !== 'undefined' && self.crypto) { return self.crypto }
  if (typeof window !== 'undefined' && window.crypto) { return window.crypto }
  return null
}

// Node's `crypto`, reached WITHOUT a bundler-visible `require('crypto')`.
//
// This indirection is load-bearing and was measured, not assumed. A literal `require('crypto')` in
// this file makes webpack 4 (Nuxt 2.14) resolve it against node-libs-browser and pull
// `crypto-browserify` + `randombytes` + `buffer` into the CLIENT bundle: a probe build of a
// one-function module went from 1 module / 3.9 KB to 208 modules / 1.36 MB. Both forms below are
// invisible to webpack's parser. Measured on THIS file, `mode: production`, `target: web`:
// before 1,386 bytes / 1 module, after 2,651 bytes / 2 modules — the second being webpack's own
// `buildin/harmony-module.js` shim. Zero crypto-polyfill modules, zero warnings.
//   - `__non_webpack_require__` is webpack's own escape hatch; it compiles to the runtime `require`
//     and records no dependency. It exists in the Nuxt server/generate bundle.
//   - `module.require` is the same escape hatch under babel-jest and plain CommonJS. Webpack's
//     injected `module` shim does not define it, so in a browser bundle this yields null and we
//     fall through to the throw — which a browser never reaches, because browsers define `crypto`.
/* global __non_webpack_require__ */
function nodeCrypto () {
  const req =
    (typeof __non_webpack_require__ === 'function' && __non_webpack_require__) ||
    (typeof module !== 'undefined' && module && typeof module.require === 'function' && module.require) ||
    null
  if (!req) { return null }
  try {
    return req('crypto')
  } catch (e) {
    return null
  }
}

function formatV4 (bytes) {
  bytes[6] = (bytes[6] & 0x0F) | 0x40
  bytes[8] = (bytes[8] & 0x3F) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0'))
  return hex.slice(0, 4).join('') + '-' + hex.slice(4, 6).join('') + '-' + hex.slice(6, 8).join('') + '-' + hex.slice(8, 10).join('') + '-' + hex.slice(10).join('')
}

export function newGuid () {
  const platform = platformCrypto()
  if (platform && typeof platform.randomUUID === 'function') {
    return platform.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (platform && typeof platform.getRandomValues === 'function') {
    platform.getRandomValues(bytes)
    return formatV4(bytes)
  }

  const node = nodeCrypto()
  if (node) {
    if (typeof node.randomUUID === 'function') { return node.randomUUID() }
    if (node.webcrypto && typeof node.webcrypto.getRandomValues === 'function') {
      node.webcrypto.getRandomValues(bytes)
      return formatV4(bytes)
    }
    if (typeof node.randomFillSync === 'function') {
      node.randomFillSync(bytes)
      return formatV4(bytes)
    }
  }

  // Deliberately not a Math.random fallback. These GUIDs are idempotency keys for cash returns,
  // refunds, drawer movements and clock punches; a repeated key lets one of those be replayed or
  // silently swallowed, so failing here — loudly, and naming the missing capability — is the safe
  // outcome and a weaker key is not.
  throw new Error(
    'newGuid: no cryptographic random source available. Needed a global crypto with randomUUID ' +
    'or getRandomValues, or Node\'s crypto module; found neither. These GUIDs are money-path ' +
    'idempotency keys, so no non-cryptographic fallback is used.'
  )
}

export default newGuid
