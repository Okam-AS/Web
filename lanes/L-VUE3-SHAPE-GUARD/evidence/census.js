// Census of every SFC's TOP-LEVEL default-export option keys, using the same parser
// eslint-plugin-vue runs (`vue-eslint-parser`). The point is to find out which files the guard
// cannot resolve BEFORE the guard is written, because a file that silently resolves to "no options"
// is indistinguishable from a clean one.
const fs = require('fs')
const path = require('path')
const parser = require('vue-eslint-parser')

const ROOT = path.resolve(__dirname, '../../..')
const DIRS = ['components', 'pages', 'layouts']

function vueFiles () {
  const out = []
  const walk = (dir) => {
    if (!fs.existsSync(dir)) { return }
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) { walk(full) } else if (e.name.endsWith('.vue')) { out.push(full) }
    }
  }
  DIRS.forEach(d => walk(path.join(ROOT, d)))
  return out.sort()
}

function unwrap (node) {
  if (!node) { return null }
  if (node.type === 'ObjectExpression') { return node }
  // `export default Vue.extend({…})` / `defineComponent({…})`
  if (node.type === 'CallExpression' && node.arguments.length && node.arguments[0].type === 'ObjectExpression') {
    return node.arguments[0]
  }
  return null
}

const files = vueFiles()
const population = new Map()
const unresolved = []
const noScript = []
const spreads = []

for (const file of files) {
  const rel = path.relative(ROOT, file)
  const source = fs.readFileSync(file, 'utf8')
  let ast
  try {
    ast = parser.parseForESLint(source, {
      sourceType: 'module',
      ecmaVersion: 2020,
      parser: require.resolve('babel-eslint')
    }).ast
  } catch (err) {
    unresolved.push(`${rel}  PARSE ERROR: ${err.message}`)
    continue
  }
  const exp = ast.body.find(n => n.type === 'ExportDefaultDeclaration')
  if (!exp) { noScript.push(rel); continue }
  const obj = unwrap(exp.declaration)
  if (!obj) { unresolved.push(`${rel}  default export is ${exp.declaration.type}`); continue }
  for (const p of obj.properties) {
    if (p.type !== 'Property') { spreads.push(`${rel}  ${p.type}`); continue }
    const key = p.computed ? null : (p.key.name || p.key.value)
    if (key === null) { spreads.push(`${rel}  computed key`); continue }
    if (!population.has(key)) { population.set(key, []) }
    population.get(key).push(rel)
  }
}

const lines = []
lines.push(`files scanned: ${files.length}`)
lines.push(`no default export (or no <script>): ${noScript.length}`)
noScript.forEach(f => lines.push(`  ${f}`))
lines.push(`UNRESOLVED (guard must fail on these, never clear them): ${unresolved.length}`)
unresolved.forEach(f => lines.push(`  ${f}`))
lines.push(`spread / computed top-level keys: ${spreads.length}`)
spreads.forEach(f => lines.push(`  ${f}`))
lines.push('')
lines.push(`distinct top-level option keys: ${population.size}`)
for (const key of [...population.keys()].sort()) {
  const where = population.get(key)
  lines.push(`  ${key.padEnd(22)} ${String(where.length).padStart(4)}${where.length <= 3 ? '   ' + where.join(', ') : ''}`)
}
console.log(lines.join('\n'))
