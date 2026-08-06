// Plant / restore one duplicate translation key, LOUDLY.
// Asserts the plant landed (2 occurrences, file still parses, TS1117 present at
// the semantic tier) and refuses to continue if any assertion fails.
const fs = require('fs')
const ts = require('typescript')

const [, , mode, file, key, marker] = process.argv
const backup = file + '.PRISTINE'

function sha (p) { return require('crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex') }
function die (m) { console.error('PLANT-ABORT: ' + m); process.exit(2) }

if (mode === 'plant') {
  if (fs.existsSync(backup)) die('a backup already exists — a previous plant was not restored')
  fs.copyFileSync(file, backup)
  const src = fs.readFileSync(file, 'utf8')
  const re = new RegExp('^  ' + key + ':', 'm')
  if (!re.test(src)) die('key ' + key + ' not found in ' + file)
  // Insert a second occurrence as the LAST property of the top-level literal.
  const idx = src.lastIndexOf('\n}')
  if (idx < 0) die('could not find the closing brace of ' + file)
  const out = src.slice(0, idx) + ',\n  ' + key + ": '" + marker + "'" + src.slice(idx)
  fs.writeFileSync(file, out)
} else if (mode === 'restore') {
  if (!fs.existsSync(backup)) die('no backup to restore from')
  fs.copyFileSync(backup, file)
  fs.unlinkSync(backup)
  console.log('restored ' + file + ' sha256=' + sha(file))
  process.exit(0)
} else { die('mode must be plant|restore') }

// --- assert the plant landed, loudly -------------------------------------
const src = fs.readFileSync(file, 'utf8')
const occ = (src.match(new RegExp('^  ' + key + ':', 'gm')) || []).length
if (occ !== 2) die('expected 2 occurrences of ' + key + ', found ' + occ)

const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true)
if (sf.parseDiagnostics && sf.parseDiagnostics.length) die('planted file no longer PARSES: ' + sf.parseDiagnostics.length + ' syntax diagnostics — the plant must be valid syntax')

// Which diagnostic tier reports it? syntactic (transpile) vs semantic (checker)
const transpiled = ts.transpileModule(src, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2018, module: ts.ModuleKind.ESNext } })
const syntacticCodes = (transpiled.diagnostics || []).map(d => d.code)

const prog = ts.createProgram([file], { noEmit: true, target: ts.ScriptTarget.ES2018, module: ts.ModuleKind.ESNext, allowJs: true })
const semanticCodes = prog.getSemanticDiagnostics(prog.getSourceFile(file)).map(d => d.code)

console.log('PLANTED ' + file)
console.log('  key=' + key + ' occurrences=' + occ + ' marker=' + marker)
console.log('  ts.transpileModule (what a transpile-only loader sees) diagnostics: [' + syntacticCodes.join(',') + ']')
console.log('  program.getSemanticDiagnostics (what a type-check sees):          [' + semanticCodes.join(',') + ']')
console.log('  TS1117 present at semantic tier: ' + semanticCodes.includes(1117))
console.log('  sha256 planted=' + sha(file))
console.log('  sha256 pristine=' + sha(backup))
if (!semanticCodes.includes(1117)) die('the plant did not even raise TS1117 at the semantic tier — the instrument is wrong, not the build')
