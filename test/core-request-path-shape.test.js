import fs from 'fs'
import path from 'path'

// ---- WHY THIS FILE EXISTS ---------------------------------------------------------------------
//
// `core/services/user-service.ts` posted the email-confirm route WITH a trailing slash:
//
//     PostRequest("/user/confirm-email/", { code })
//
// while `UserController` declares it bare — `[HttpPost("confirm-email")]`. ASP.NET's attribute
// routing matches either spelling, so the real API cannot tell the two apart and PRODUCTION NEVER
// NOTICED. The e2e fixture could tell them apart: it answered 404 to the shipped client, and the
// account page then reported «we could not order a code» against a backend that was fine.
//
// That is a divergence INVISIBLE TO THE PRODUCT AND FATAL TO THE DOUBLE THAT STANDS IN FOR IT, and
// no mocked-service unit test can see it — every such test stubs `UserService.ConfirmEmail` and
// never looks at the string it would have posted. Only a browser against a fixture found it, and
// only because the fixture happened to be strict.
//
// Fixing the one string is the small half. The string was not alone: THIRTEEN request paths across
// seven services carried a trailing slash, so "unlike every other route in that file" was not true
// even of the file it was found in. A guard is the only thing that makes the next one visible.
//
// ---- THE CONVENTION IS DERIVED, NOT REMEMBERED ------------------------------------------------
//
// There is no allowlist of routes here and no list of exceptions. The rule is a NORMALISATION
// IDENTITY: a URL path has exactly one canonical spelling — no trailing slash, no doubled slash,
// one leading slash — and the identity asserted is that every path this app writes is ALREADY in
// that form. Nothing has to be remembered for a new route to be covered; a new route is covered
// because the walk finds it.
//
// The set of methods that take a path is derived too, from `RequestService`'s own signatures: a
// public `*Request` method whose first parameter is literally named `path` takes one, and
// `GetHeadRequest(fullPath)` does not. Adding a wrapper to `RequestService` therefore extends this
// guard automatically, and renaming a parameter is caught by the partition assertion rather than
// silently shrinking what is checked.
//
// ---- WHY IT CANNOT PASS VACUOUSLY -------------------------------------------------------------
//
// Eighteen assertions that could not fail have been shipped in this estate in three days, and a
// static walk is the exact shape that goes quiet: a regex that stops matching examines nothing and
// reports success. Four counted identities are asserted instead of a magic floor:
//
//   1. every `public *Request(` in `RequestService` lands in EXACTLY ONE of the two derived sets;
//   2. every call site found is a call site whose first argument was PARSED (found === parsed);
//   3. every parsed path lands in EXACTLY ONE class (statically-tailed or dynamically-tailed);
//   4. every source file that names a path-taking method contributes at least one parsed call site.
//
// (4) is the one that makes a broken file walk visible: a walk that reaches nothing also names no
// files, and a walk that reaches a file but fails to read its calls reds on that file by name.
//
// Proved by mutation rather than by passing — see the lane's mutation receipt. Introducing
// `PostRequest("/user/diverging-route/")` reds test (A) by name; deleting the `ConfirmEmail` call
// reds the reachability pin; breaking the call-site regex reds (2); breaking the file walk reds (4).
//
// ---- WHAT THIS GUARD DELIBERATELY DOES NOT DO -------------------------------------------------
//
// It does not check that the fixture implements the routes the client posts. That is the wider
// problem — a fixture is a claim about a backend and nothing checks the claim — and it is a lane of
// its own. It is FEASIBLE from here: the route literals collected below are one half of the pair,
// and `test/e2e/fixture/*.js` holds the other half as its own literals and regexes, so a cross-check
// would be a set difference over the same corpus this file already extracts. It is not built here
// because deciding what a MISSING fixture route means — unimplemented, deliberately absent, or a
// route no journey exercises — is that lane's judgement, not this one's.

const ROOT = path.resolve(__dirname, '..')
const REQUEST_SERVICE = path.join(ROOT, 'core', 'services', 'request-service.ts')

// Directories that hold no shipped client call: dependencies, build output, other lanes' scratch,
// plan documents, and the test tree itself — a mocked `PostRequest` in a test makes no request, and
// including it would let a deliberately-malformed fixture path fail a guard about shipped traffic.
const SKIP_DIRS = new Set([
  'node_modules', '.nuxt', '.git', 'coverage', 'artifacts', 'lanes', 'docs', 'test', 'static'
])

// ---- source scanning -------------------------------------------------------------------------

// Blank out comments, preserving every offset and every string literal. Done as one string-aware
// pass so that `'https://x'` is not mistaken for a line comment and a `//` inside a template is not
// mistaken for one either. Without this, the prose in `request-service.ts` (which names
// `PostRequest` in a sentence) would be scanned as if it were code.
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
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] !== '\n') { out[i] = ' ' }
        i++
      }
      out[i] = ' '; out[i + 1] = ' '
      i += 2
      continue
    }
    i++
  }
  return out.join('')
}

// The first argument of the call whose `(` is at `open`, as written. Returns null when the call is
// unterminated — which is what turns a scanner that lost its place into a red test rather than a
// silently smaller corpus.
function firstArgument (src, open) {
  let depth = 0
  let start = -1
  let i = open
  while (i < src.length) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') {
      const quote = c
      i++
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue }
        if (quote === '`' && src[i] === '$' && src[i + 1] === '{') {
          let braces = 1
          i += 2
          while (i < src.length && braces > 0) {
            if (src[i] === '{') { braces++ } else if (src[i] === '}') { braces-- }
            i++
          }
          continue
        }
        if (src[i] === quote) { i++; break }
        i++
      }
      continue
    }
    if (c === '(' || c === '[' || c === '{') {
      if (depth === 0 && c === '(') { start = i + 1 }
      depth++
      i++
      continue
    }
    if (c === ')' || c === ']' || c === '}') {
      depth--
      if (depth === 0) { return src.slice(start, i) }
      i++
      continue
    }
    if (c === ',' && depth === 1) { return src.slice(start, i) }
    i++
  }
  return null
}

function sourceFiles (dir, found) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) { continue }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) { sourceFiles(full, found) } else if (/\.(ts|js|vue)$/.test(entry.name)) { found.push(full) }
  }
  return found
}

// ---- what RequestService says takes a path ----------------------------------------------------

const requestServiceSource = blankComments(fs.readFileSync(REQUEST_SERVICE, 'utf8'))
const declarations = []
const declarationRe = /\bpublic\s+([A-Za-z0-9_]*Request)\s*\(\s*([A-Za-z0-9_]+)\s*:/g
let declaration
while ((declaration = declarationRe.exec(requestServiceSource)) !== null) {
  declarations.push({ method: declaration[1], firstParam: declaration[2] })
}
const pathTaking = declarations.filter(d => d.firstParam === 'path').map(d => d.method)
const notPathTaking = declarations.filter(d => d.firstParam !== 'path').map(d => d.method)

// ---- the corpus --------------------------------------------------------------------------------

const callSiteRe = new RegExp('\\.(' + pathTaking.join('|') + ')\\s*\\(', 'g')

const files = sourceFiles(ROOT, [])
const sites = []
const unparsed = []
const filesNamingAMethod = []

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  const src = blankComments(raw)
  let namesOne = false
  callSiteRe.lastIndex = 0
  let hit
  while ((hit = callSiteRe.exec(src)) !== null) {
    namesOne = true
    const open = src.indexOf('(', hit.index + hit[1].length)
    const argument = firstArgument(src, open)
    const where = path.relative(ROOT, file) + ':' + (src.slice(0, hit.index).split('\n').length)
    if (argument === null) { unparsed.push(where); continue }
    sites.push({ where, method: hit[1], expression: argument.trim().replace(/\s+/g, ' ') })
  }
  if (namesOne) { filesNamingAMethod.push(path.relative(ROOT, file)) }
}

// A string literal ending the expression, when it is not a template carrying an interpolation —
// that literal is the END of the request path, so its last character is the path's last character.
function staticTail (expression) {
  const match = /(["'`])((?:\\.|(?!\1)[^\\])*)\1\s*$/.exec(expression)
  if (!match) { return null }
  if (match[1] === '`' && /\$\{/.test(match[2])) { return null }
  return match[2]
}

function staticHead (expression) {
  const match = /^(["'`])((?:\\.|(?!\1)[^\\])*)\1/.exec(expression)
  if (!match) { return null }
  if (match[1] === '`' && /\$\{/.test(match[2])) { return null }
  return match[2]
}

const tailed = sites.filter(s => staticTail(s.expression) !== null)
const untailed = sites.filter(s => staticTail(s.expression) === null)

// ---- the assertions ----------------------------------------------------------------------------

describe('request paths are written in one shape', () => {
  // (A) THE FINDING. A path that ends in `/` is not the path the controller declares; it only looks
  // like it to a framework generous enough to forgive it.
  test('A: no request path ends in a trailing slash', () => {
    const diverging = tailed
      .filter(s => staticTail(s.expression).endsWith('/'))
      .map(s => s.where + '  ' + s.expression)
    expect(diverging).toEqual([])
  })

  test('A2: no request path contains a doubled slash', () => {
    const diverging = sites
      .filter((s) => {
        const head = staticHead(s.expression)
        const tail = staticTail(s.expression)
        return (head !== null && head.includes('//')) || (tail !== null && tail.includes('//'))
      })
      .map(s => s.where + '  ' + s.expression)
    expect(diverging).toEqual([])
  })

  test('A3: every statically-written request path starts with exactly one leading slash', () => {
    const diverging = sites
      .filter((s) => {
        const head = staticHead(s.expression)
        return head !== null && !/^\/[^/]/.test(head)
      })
      .map(s => s.where + '  ' + s.expression)
    expect(diverging).toEqual([])
  })
})

describe('the guard examined what it claims to have examined', () => {
  // (1) Every public `*Request` declaration is classified. A parameter renamed from `path` moves a
  // method out of the checked set; this is what makes that move loud instead of silent.
  test('1: RequestService partitions into path-taking and not, with both sides populated', () => {
    expect(declarations.length).toBeGreaterThan(0)
    expect(pathTaking.length).toBeGreaterThan(0)
    expect(notPathTaking.length).toBeGreaterThan(0)
    expect(pathTaking.length + notPathTaking.length).toBe(declarations.length)
    // EXACTLY one method takes something other than a path: `GetHeadRequest(fullPath)`, whose
    // argument is an absolute URL and has no convention to keep. Spelled as an equality rather than
    // a membership on purpose — renaming any other method's `path` parameter would otherwise move
    // that method quietly out of the checked set, and this guard would go on passing over a corpus
    // it had stopped reading. The equality is the only remembered fact in this file, and it is a
    // claim about `RequestService` that `RequestService` itself falsifies when it changes.
    expect(notPathTaking).toEqual(['GetHeadRequest'])
  })

  // (2) A call site whose argument could not be read is a hole in the corpus, not an absence of
  // findings. This is the assertion that reds if the paren scanner loses its place.
  test('2: every call site found had its path argument parsed', () => {
    expect(unparsed).toEqual([])
    expect(sites.length).toBeGreaterThan(0)
  })

  // (3) Nothing is silently dropped between "found" and "checked": each path is either statically
  // terminated (and therefore judgeable) or it is not, and the two classes account for all of them.
  test('3: every parsed path is classified exactly once, and static paths are the majority', () => {
    expect(tailed.length + untailed.length).toBe(sites.length)
    expect(tailed.length).toBeGreaterThan(0)
    // A corpus that suddenly went mostly dynamic would mean this guard judges almost nothing while
    // still passing. The majority is the corpus's own shape, not a target.
    expect(tailed.length).toBeGreaterThan(sites.length / 3)
  })

  // (4) The walk reached files. Named individually so a walk that reaches a file but reads no calls
  // from it reds on that file rather than shrinking the corpus by one.
  test('4: every file naming a path-taking method contributed a parsed call site', () => {
    const contributing = new Set(sites.map(s => s.where.replace(/:\d+$/, '')))
    const silent = filesNamingAMethod.filter(f => !contributing.has(f))
    expect(silent).toEqual([])
    expect(filesNamingAMethod.length).toBeGreaterThan(0)
  })

  // REACHABILITY PIN. The route this guard was written for must still be among the paths it reads.
  // If `ConfirmEmail` is deleted, renamed or moved out of the walked tree, the guard would go on
  // passing about a corpus that no longer contains the thing it exists to protect.
  test('the email-confirm route is one of the paths this guard reads', () => {
    const paths = tailed.map(s => staticTail(s.expression))
    expect(paths).toContain('/user/confirm-email')
    expect(paths).toContain('/user/send-email-confirmation-code')
  })
})
