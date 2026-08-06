// Payload/signature extraction shared by the full-replace pin (test/store-config-full-replace.test.js)
// and by the lane's red receipt (lanes/L-DESTRUCTIVE-SAVES-LOAD-FIRST/red-before-green.probe.js).
//
// It is shared on purpose. The receipt's job is to show that the PIN reds against the pre-fix
// sources; if the receipt used its own copy of the extraction it would be showing that SOME
// extractor reds, which is a different and much weaker claim. One implementation, two subjects.
//
// Not named `*.test.js`, so Jest's testMatch does not collect it as a suite.

const fs = require('fs')
const path = require('path')

// Blank out comments while preserving every offset and every string literal, so prose that names a
// field is not read as code. Handles `//`, `/* */` and HTML `<!-- -->` (the pages are SFCs).
function blankComments (src) {
  const out = src.split('')
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') {
      const quote = c
      i++
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue }
        if (src[i] === quote) { i++; break }
        i++
      }
      continue
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') { out[i] = ' '; i++ }
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] !== '\n') { out[i] = ' ' } i++ }
      out[i] = ' '; out[i + 1] = ' '
      i += 2
      continue
    }
    if (c === '<' && src.slice(i, i + 4) === '<!--') {
      while (i < src.length && src.slice(i, i + 3) !== '-->') { if (src[i] !== '\n') { out[i] = ' ' } i++ }
      out[i] = ' '; out[i + 1] = ' '; out[i + 2] = ' '
      i += 3
      continue
    }
    i++
  }
  return out.join('')
}

// The keys of the object literal whose `{` is at `open`. Returns null when the literal is
// unterminated — a scanner that lost its place must red, not quietly return a shorter list.
function objectLiteralKeys (src, open) {
  const keys = []
  let depth = 0
  let i = open
  while (i < src.length) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') {
      const quote = c
      i++
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue }
        if (src[i] === quote) { i++; break }
        i++
      }
      continue
    }
    if (c === '{' || c === '[' || c === '(') { depth++; i++; continue }
    if (c === '}' || c === ']' || c === ')') {
      depth--
      if (depth === 0) { return keys }
      i++
      continue
    }
    if (depth === 1) {
      const key = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*:/.exec(src.slice(i))
      if (key && (i === open + 1 || /[,{\s]/.test(src[i - 1]))) {
        keys.push(key[1])
        i += key[0].length
        continue
      }
    }
    i++
  }
  return null
}

// The payload object literal handed to `method` — either inline at the call site
// (surfboard.vue), or the `const payload = { … }` the call site passes by name (dintero.vue).
function payloadKeysFrom (source, method) {
  const src = blankComments(source)
  const call = src.indexOf('.' + method + '(')
  if (call < 0) { return { found: false, keys: null } }
  const args = src.slice(call, call + 400)
  const inlineBrace = args.indexOf('{')
  const closeParen = args.indexOf(')')
  if (inlineBrace >= 0 && (closeParen < 0 || inlineBrace < closeParen)) {
    return { found: true, keys: objectLiteralKeys(src, call + inlineBrace) }
  }
  const named = /\(\s*[^,]+,\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)/.exec(args)
  if (!named) { return { found: true, keys: null } }
  const declaration = new RegExp('(?:const|let|var)\\s+' + named[1] + '\\s*=\\s*\\{').exec(src)
  if (!declaration) { return { found: true, keys: null } }
  return { found: true, keys: objectLiteralKeys(src, declaration.index + declaration[0].length - 1) }
}

function payloadKeysForFile (file, method) {
  return payloadKeysFrom(fs.readFileSync(file, 'utf8'), method)
}

// The keys of a TypeScript method's options-object parameter, as written in a store-service source.
function signatureKeysFrom (source, method) {
  const src = blankComments(source)
  const declaration = new RegExp('public\\s+async\\s+' + method + '\\s*\\([^)]*?options:\\s*\\{').exec(src)
  if (!declaration) { return null }
  return objectLiteralKeys(src, declaration.index + declaration[0].length - 1)
}

function signatureKeysForFile (file, method) {
  return signatureKeysFrom(fs.readFileSync(file, 'utf8'), method)
}

module.exports = {
  blankComments,
  objectLiteralKeys,
  payloadKeysFrom,
  payloadKeysForFile,
  signatureKeysFrom,
  signatureKeysForFile,
  repoRoot: path.resolve(__dirname, '..', '..')
}
