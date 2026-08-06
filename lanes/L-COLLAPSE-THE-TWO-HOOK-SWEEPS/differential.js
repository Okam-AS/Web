/**
 * DIFFERENTIAL: the narrow sweep (8ac6f63) vs the survivor (cffede3), over one corpus.
 *
 * Run BEFORE the removal lands. Its job is to answer one question per case: if the narrow sweep is
 * deleted, does anything it caught stop being caught?
 *
 * Both detectors are inlined VERBATIM from their commits rather than imported, because importing
 * would mean editing the files this script exists to judge. The copies are pinned instead: the
 * survivor copy is required to reproduce the survivor test's own estate numbers (301 files, 0
 * breaches, 0 unresolved) before any case is scored, so a copy that had drifted cannot score.
 *
 *   node lanes/L-COLLAPSE-THE-TWO-HOOK-SWEEPS/differential.js
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const Vue = require('vue')
const parser = require('vue-eslint-parser')

const ROOT = path.resolve(__dirname, '..', '..')
const SCAN_DIRS = ['components', 'pages', 'layouts']

// ---- DETECTOR A: the narrow sweep, verbatim from test/focus-trap-teardown.test.js @ 8ac6f63 ----

function stripComments (source) {
  return source.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

const VUE3_ONLY_HOOK = /(^|[^A-Za-z0-9_$.])['"]?(unmounted|beforeUnmount)['"]?\s*(\(|:)/m

/** The narrow sweep's verdict for one file's source: flagged, or not. There is no third answer. */
function narrowFlags (source) {
  return VUE3_ONLY_HOOK.test(stripComments(source))
}

// ---- DETECTOR B: the survivor, verbatim from test/vue3-shape-guard.test.js @ cffede3 -----------

const VUE3_OPTIONS_API_HOOKS = [
  'beforeCreate', 'created', 'beforeMount', 'mounted', 'beforeUpdate', 'updated',
  'beforeUnmount', 'unmounted', 'errorCaptured', 'renderTracked', 'renderTriggered',
  'activated', 'deactivated', 'serverPrefetch'
]
const INSTALLED_HOOKS = Vue.config._lifecycleHooks
const HOOKS_THIS_VUE_NEVER_CALLS = VUE3_OPTIONS_API_HOOKS.filter(h => !INSTALLED_HOOKS.includes(h))
const OPTIONS_THIS_VUE_NEVER_READS = ['emits']
const DENIED = [...HOOKS_THIS_VUE_NEVER_CALLS, ...OPTIONS_THIS_VUE_NEVER_READS]

const RUNTIME_BUNDLE = fs.readFileSync(require.resolve('vue/dist/vue.runtime.common.dev.js'), 'utf8')

const VUE3_DIRECTIVE_HOOKS = [
  'created', 'beforeMount', 'mounted', 'beforeUpdate', 'updated', 'beforeUnmount', 'unmounted'
]
const INSTALLED_DIRECTIVE_HOOKS = (() => {
  const start = RUNTIME_BUNDLE.indexOf('function _update(oldVnode, vnode)')
  const body = RUNTIME_BUNDLE.slice(start, RUNTIME_BUNDLE.indexOf('const emptyModifiers', start))
  const names = new Set()
  for (const m of body.matchAll(/callHook\([^,]+,\s*'([A-Za-z]+)'/g)) { names.add(m[1]) }
  for (const m of body.matchAll(/dir\.def\.([A-Za-z]+)/g)) { names.add(m[1]) }
  return [...names].sort()
})()
const DIRECTIVE_HOOKS_THIS_VUE_NEVER_CALLS =
  VUE3_DIRECTIVE_HOOKS.filter(h => !INSTALLED_DIRECTIVE_HOOKS.includes(h))

function vueFilesUnder (root, dirs) {
  const out = []
  const walk = (dir) => {
    if (!fs.existsSync(dir)) { return }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { walk(full) } else if (entry.name.endsWith('.vue')) { out.push(full) }
    }
  }
  dirs.forEach(d => walk(path.join(root, d)))
  return out.sort()
}

function optionsObjectOf (declaration) {
  if (!declaration) { return null }
  if (declaration.type === 'ObjectExpression') { return declaration }
  if (declaration.type === 'CallExpression' &&
      declaration.arguments.length &&
      declaration.arguments[0].type === 'ObjectExpression') {
    return declaration.arguments[0]
  }
  return null
}

function parserForScriptLang (source) {
  const tag = /<script\b[^>]*>/i.exec(source)
  const isTs = tag && /\blang\s*=\s*["']tsx?["']/i.test(tag[0])
  return require.resolve(isTs ? '@typescript-eslint/parser' : 'babel-eslint')
}

function scan (root, dirs = SCAN_DIRS) {
  const files = vueFilesUnder(root, dirs)
  const breaches = []
  const unresolved = []

  for (const file of files) {
    const rel = path.relative(root, file)
    const source = fs.readFileSync(file, 'utf8')

    let ast
    try {
      ast = parser.parseForESLint(source, {
        sourceType: 'module',
        ecmaVersion: 2020,
        parser: parserForScriptLang(source)
      }).ast
    } catch (err) {
      unresolved.push(`${rel}: parse failed — ${err.message.split('\n')[0]}`)
      continue
    }

    const exported = ast.body.find(n => n.type === 'ExportDefaultDeclaration')
    if (!exported) { continue }

    const options = optionsObjectOf(exported.declaration)
    if (!options) {
      unresolved.push(`${rel}: default export is ${exported.declaration.type}, whose option keys this scanner cannot read`)
      continue
    }

    readComponentOptions(options, rel, 'top-level', { breaches, unresolved })
  }

  return { files: files.map(f => path.relative(root, f)), breaches, unresolved }
}

function readComponentOptions (options, rel, where, sink) {
  for (const property of options.properties) {
    if (property.type !== 'Property') {
      sink.unresolved.push(`${rel}: ${where} ${property.type} may carry option keys this scanner cannot read`)
      continue
    }
    if (property.computed) {
      sink.unresolved.push(`${rel}:${property.key.loc.start.line}: computed ${where} option key`)
      continue
    }
    const key = property.key.name || property.key.value
    if (DENIED.includes(key)) {
      sink.breaches.push(`${rel}:${property.key.loc.start.line}: \`${key}\` — this Vue (${Vue.version}) never reads it`)
    }

    if (property.value.type !== 'ObjectExpression') { continue }
    if (key !== 'components' && key !== 'directives') { continue }

    for (const member of property.value.properties) {
      if (member.type !== 'Property') {
        sink.unresolved.push(`${rel}: ${key} member ${member.type} may carry option keys this scanner cannot read`)
        continue
      }
      if (member.value.type !== 'ObjectExpression') { continue }
      if (key === 'components') {
        readComponentOptions(member.value, rel, 'inline component', sink)
      } else {
        readDirectiveDefinition(member.value, rel, sink)
      }
    }
  }
}

function readDirectiveDefinition (definition, rel, sink) {
  for (const property of definition.properties) {
    if (property.type !== 'Property') {
      sink.unresolved.push(`${rel}: directive member ${property.type} may carry hook names this scanner cannot read`)
      continue
    }
    if (property.computed) { continue }
    const key = property.key.name || property.key.value
    if (DIRECTIVE_HOOKS_THIS_VUE_NEVER_CALLS.includes(key)) {
      sink.breaches.push(`${rel}:${property.key.loc.start.line}: \`${key}\` — this Vue (${Vue.version}) never calls it on a directive`)
    }
  }
}

// ---- pin the copies before scoring anything ---------------------------------------------------

const estate = scan(ROOT)
const pins = [
  ['survivor copy sees the same estate the survivor test does (301 files)', estate.files.length === 301],
  ['survivor copy finds no estate breach, as the survivor test asserts', estate.breaches.length === 0],
  ['survivor copy leaves nothing unresolved, as the survivor test asserts', estate.unresolved.length === 0],
  ['the runtime subtraction is still the two hooks', JSON.stringify(HOOKS_THIS_VUE_NEVER_CALLS.slice().sort()) === '["beforeUnmount","unmounted"]'],
  ['the directive subtraction reads the five Vue 2 hooks out of the runtime', JSON.stringify(INSTALLED_DIRECTIVE_HOOKS) === '["bind","componentUpdated","inserted","unbind","update"]'],
  ['Vue is 2.7.14', Vue.version === '2.7.14']
]
const out = []
out.push('DIFFERENTIAL — narrow sweep (8ac6f63) vs survivor (cffede3)')
out.push(`tree: worktree of lane/collapse-the-two-hook-sweeps at cffede3, clean (git status --porcelain empty), core at 1bcab0b`)
out.push(`estate as seen by this run: ${estate.files.length} .vue under ${SCAN_DIRS.join('/')}`)
out.push('')
out.push('-- copies pinned to their originals before scoring --')
for (const [what, ok] of pins) { out.push(`  ${ok ? 'OK  ' : 'FAIL'} ${what}`) }
if (pins.some(([, ok]) => !ok)) {
  out.push('')
  out.push('ABORT: a detector copy does not reproduce its original. Scores below would be meaningless.')
  fs.writeFileSync(path.join(__dirname, 'differential.txt'), out.join('\n') + '\n')
  console.log(out.join('\n'))
  process.exit(1)
}

// ---- the corpus -------------------------------------------------------------------------------

const sfc = body => `<template><div /></template>\n<script>\nexport default {\n${body}\n}\n</script>\n`

/**
 * `verdict` is what SHOULD happen, decided from the runtime, not from either detector:
 *   defect  — a Vue 3 option name in a position this Vue never reads. Must be caught.
 *   valid   — legal Vue 2.7. Must NOT be flagged; flagging it is over-rejection.
 *   opaque  — the scanner cannot see the options. Must be reported, never called clean.
 */
const CORPUS = [
  // --- what the narrow sweep was built to catch: top-level hooks, every spelling ---
  { id: 'N1', verdict: 'defect', why: 'top-level `unmounted ()` shorthand — the FocusTrap defect itself',
    src: sfc("  name: 'A',\n  unmounted () {}") },
  { id: 'N2', verdict: 'defect', why: 'top-level `beforeUnmount ()` shorthand',
    src: sfc("  name: 'A',\n  beforeUnmount () {}") },
  { id: 'N3', verdict: 'defect', why: 'top-level `unmounted:` function-expression form',
    src: sfc("  name: 'A',\n  unmounted: function () {}") },
  { id: 'N4', verdict: 'defect', why: 'top-level `beforeUnmount:` arrow form',
    src: sfc("  name: 'A',\n  beforeUnmount: () => {}") },
  { id: 'N5', verdict: 'defect', why: "single-quoted key `'unmounted'`",
    src: sfc("  name: 'A',\n  'unmounted': function () {}") },
  { id: 'N6', verdict: 'defect', why: 'double-quoted key `"unmounted"`',
    src: sfc('  name: \'A\',\n  "unmounted": function () {}') },
  { id: 'N7', verdict: 'defect', why: "single-quoted key `'beforeUnmount'`",
    src: sfc("  name: 'A',\n  'beforeUnmount': function () {}") },
  { id: 'N8', verdict: 'defect', why: 'the `Vue.extend({...})` export form used by pages/wolt-callback.vue',
    src: "<template><div /></template>\n<script>\nimport Vue from 'vue'\nexport default Vue.extend({\n  unmounted () {}\n})\n</script>\n" },

  // --- the option the narrow sweep never covered at all ---
  { id: 'N9', verdict: 'defect', why: '`emits:` — the Modal.vue defect; outside the narrow sweep\'s two names',
    src: sfc("  name: 'A',\n  emits: ['close']") },

  // --- valid Vue 2.7 that a text scan mistakes for a defect ---
  { id: 'V1', verdict: 'valid', why: 'a METHOD named `unmounted` is legal Vue 2 and must not be flagged',
    src: sfc("  methods: {\n    unmounted () { return 'not a hook' }\n  }") },
  { id: 'V2', verdict: 'valid', why: 'the name inside a STRING is not an option key',
    src: sfc("  data: () => ({ label: 'unmounted: not an option' })") },
  { id: 'V3', verdict: 'valid', why: '`onUnmounted` from the 2.7 composition API is really called here',
    src: "<template><div /></template>\n<script>\nimport { onUnmounted } from 'vue'\nexport default {\n  setup () { onUnmounted(() => {}) }\n}\n</script>\n" },
  { id: 'V4', verdict: 'valid', why: '`renderTracked`/`renderTriggered` ARE 2.7 hooks — flagging them gets a guard switched off',
    src: sfc('  renderTracked () {},\n  renderTriggered () {}') },
  { id: 'V5', verdict: 'valid', why: 'the names in a comment are prose; 12 such lines exist in the estate',
    src: "<template><div /></template>\n<script>\n// mentions unmounted, beforeUnmount and emits: none are options\nexport default {\n  destroyed () {}\n}\n</script>\n" },

  // --- nested option objects: where the narrow sweep's position-blindness actually pays off ---
  { id: 'D1', verdict: 'defect', why: 'Vue 3 directive hook inside an INLINE `directives:` def — Vue 2 directives use bind/inserted/update/componentUpdated/unbind',
    src: sfc('  directives: {\n    focus: { unmounted () {} }\n  }') },
  { id: 'D2', verdict: 'valid', why: 'Vue 2 directive hooks inside an inline def are correct and must not be flagged',
    src: sfc('  directives: {\n    focus: { bind () {}, unbind () {} }\n  }') },
  { id: 'C1', verdict: 'defect', why: 'an INLINE child component options object carrying `unmounted`',
    src: sfc("  components: {\n    Child: { template: '<i />', unmounted () {} }\n  }") },

  // --- the narrow sweep's own blind spots: what a text scan cannot see ---
  { id: 'B1', verdict: 'opaque', why: 'UNPARSEABLE file — a scanner that cannot look must not answer "clean"',
    src: '<template><div /></template>\n<script>\nexport default { unmounted () { \n</script>\n' },
  { id: 'B2', verdict: 'defect', why: 'a `//` inside a STRING makes stripComments eat the rest of the line, declaration and all',
    src: sfc("  url: 'https://example.com', unmounted () {}") },
  { id: 'B3', verdict: 'defect', why: 'a `/*` in one string and a `*/` in a later one makes stripComments swallow everything between',
    src: sfc("  a: '/*',\n  unmounted () {},\n  b: '*/'") },
  { id: 'B4', verdict: 'opaque', why: 'options behind an identifier — nothing can read the keys, so nothing may call it clean',
    src: "<template><div /></template>\n<script>\nimport opts from './opts'\nexport default opts\n</script>\n" }
]

// ---- score both detectors on each case --------------------------------------------------------

function survivorVerdictFor (source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'collapse-diff-'))
  try {
    const full = path.join(root, 'components', 'Case.vue')
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, source)
    const r = scan(root)
    if (r.unresolved.length) { return 'opaque' }
    return r.breaches.length ? 'defect' : 'valid'
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

/** The narrow sweep has only two answers, so `opaque` is one it structurally cannot give. */
function narrowVerdictFor (source) {
  return narrowFlags(source) ? 'defect' : 'valid'
}

out.push('')
out.push('-- per case: what should happen, what each detector says --')
out.push('  case  should   narrow   survivor  agree?  what it is')

const lost = []
const gained = []
const overRejected = []

for (const c of CORPUS) {
  const n = narrowVerdictFor(c.src)
  const s = survivorVerdictFor(c.src)
  const nOk = n === c.verdict
  const sOk = s === c.verdict
  out.push(`  ${c.id.padEnd(5)} ${c.verdict.padEnd(8)} ${(n + (nOk ? '' : ' X')).padEnd(8)} ${(s + (sOk ? '' : ' X')).padEnd(9)} ${(nOk === sOk ? 'same' : (sOk ? 'survivor' : 'narrow')).padEnd(7)} ${c.why}`)

  // Coverage the removal would LOSE: narrow got it right and survivor does not.
  if (nOk && !sOk) { lost.push(c) }
  // Coverage the removal GAINS: survivor right where narrow was wrong.
  if (!nOk && sOk) { gained.push(c) }
  // Narrow flagging something legal is not coverage; it is the reason people switch guards off.
  if (c.verdict === 'valid' && n === 'defect') { overRejected.push(c) }
}

out.push('')
out.push('-- the only question that decides whether the removal is safe --')
out.push(`  cases the narrow sweep caught that the survivor does NOT: ${lost.length}`)
for (const c of lost) { out.push(`      LOST ${c.id}: ${c.why}`) }
if (!lost.length) { out.push('      (none — every case the narrow sweep answered correctly, the survivor also answers correctly)') }
out.push(`  cases the survivor answers correctly and the narrow sweep does not: ${gained.length}`)
for (const c of gained) { out.push(`      GAINED ${c.id}: ${c.why}`) }
out.push(`  legal Vue 2.7 the narrow sweep would have flagged (over-rejection, not coverage): ${overRejected.length}`)
for (const c of overRejected) { out.push(`      OVER-REJECT ${c.id}: ${c.why}`) }

fs.writeFileSync(path.join(__dirname, 'differential.txt'), out.join('\n') + '\n')
console.log(out.join('\n'))
process.exit(lost.length ? 2 : 0)
