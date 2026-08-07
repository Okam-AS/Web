/**
 * Does the coverage instrument actually measure a `.vue` file?
 *
 * For roughly a year it did not. `vue-jest@3.0.7` handed istanbul a source map built one line at a
 * time from a single **column-0** probe (`vue-jest/lib/generate-source-map.js:14`), so every
 * indented statement — which is every `data()`, `computed` and `methods` body in the repository —
 * resolved to no original position and was **dropped from the report**, not counted as uncovered.
 * On trunk `a63c30f` all 304 `.vue` files in the report had zero instrumented statements after
 * `export default`, and 47,081 physical `<script>` lines produced 1,169 statements, every one of
 * them starting in column 0. The published 65.4% was a count of import lists.
 * Full measurement: `docs/plan/reviews/L-COVERAGE-MEASURED-PER-MODULE.md` §2.
 *
 * That is invisible from the outside — a suite is just as green either way, and the coverage
 * number goes UP when the instrument goes blind. So this file exists to make it visible. It runs
 * the file through the same three stages jest does, and asserts on the result:
 *
 *   1. the `.vue` transform `jest.config.js` is configured with          → code + inline map
 *   2. `babel-plugin-istanbul`, exactly as `@jest/transform`'s
 *      `ScriptTransformer._instrumentFile` invokes it                    → coverageData
 *   3. `istanbul-lib-source-maps#transformCoverage`, exactly as
 *      `@jest/reporters`' `CoverageReporter` invokes it                  → the reported figures
 *
 * Stage 3 is where the drop happened, which is why asserting on stage 2 would prove nothing.
 *
 * This test reds against `vue-jest` unpatched. Keep it: it is the only thing standing between this
 * repository and a silent return to measuring nothing.
 */
const fs = require('fs')
const path = require('path')

const babel = require('@babel/core')
const istanbulPlugin = require('babel-plugin-istanbul')
const convertSourceMap = require('convert-source-map')
const { readInitialCoverage } = require('istanbul-lib-instrument')
const libCoverage = require('istanbul-lib-coverage')
const libSourceMaps = require('istanbul-lib-source-maps')

const ROOT = path.resolve(__dirname, '..')
const FIXTURE = path.join(ROOT, 'test', 'fixtures', 'coverage-probe.vue')

/**
 * The transform under test is whatever `jest.config.js` says it is — never a hard-coded module.
 * Reverting the config must red this test, or the guard is decorative.
 */
function resolveConfiguredVueTransform () {
  // eslint-disable-next-line import/no-dynamic-require
  const jestConfig = require(path.join(ROOT, 'jest.config.js'))
  const entry = Object.entries(jestConfig.transform || {}).find(([pattern]) =>
    new RegExp(pattern).test('anything.vue')
  )
  if (!entry) {
    throw new Error('jest.config.js declares no transform for .vue files')
  }
  const spec = entry[1]
  const modulePath = spec.startsWith('<rootDir>')
    ? path.join(ROOT, spec.slice('<rootDir>'.length))
    : spec
  // eslint-disable-next-line import/no-dynamic-require
  return { spec, transform: require(modulePath) }
}

/** Stages 1-3 above, for one `.vue` file, returning the coverage data as a report would show it. */
async function reportedCoverageFor (filePath) {
  const { transform } = resolveConfiguredVueTransform()
  const src = fs.readFileSync(filePath, 'utf8')

  const out = transform.process(src, filePath, {
    rootDir: ROOT,
    cwd: ROOT,
    moduleFileExtensions: ['ts', 'js', 'vue', 'json'],
    globals: {}
  })
  const code = typeof out === 'string' ? out : out.code
  let map = (typeof out === 'object' && out.map) || null
  if (!map) {
    // What `ScriptTransformer.transformSource` does when a transform returns no `.map`.
    const inline = convertSourceMap.fromSource(code)
    if (inline) {
      map = inline.toObject()
    }
  }

  const instrumented = babel.transformSync(code, {
    auxiliaryCommentBefore: ' istanbul ignore next ',
    babelrc: false,
    configFile: false,
    filename: filePath,
    plugins: [
      [
        istanbulPlugin.default || istanbulPlugin,
        {
          compact: false,
          cwd: ROOT,
          exclude: [],
          extension: false,
          inputSourceMap: map,
          useInlineSourceMaps: false
        }
      ]
    ],
    sourceMaps: 'both'
  })

  const initial = readInitialCoverage(instrumented.code)
  expect(initial).not.toBeNull()

  const coverageMap = libCoverage.createCoverageMap({})
  coverageMap.addFileCoverage(initial.coverageData)
  const remapped = await libSourceMaps.createSourceMapStore().transformCoverage(coverageMap)

  const files = remapped.files()
  expect(files).toHaveLength(1)
  return remapped.fileCoverageFor(files[0]).data
}

/** 1-based source lines carrying a `// <tag>(<name>)` marker, keyed by name. */
function markerLines (filePath, tag) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  const found = {}
  const re = new RegExp('//\\s*' + tag + '\\(([^)]+)\\)')
  lines.forEach((line, index) => {
    const m = line.match(re)
    if (m) {
      found[m[1]] = index + 1
    }
  })
  return found
}

describe('the coverage instrument measures what it claims for .vue files', () => {
  let data
  let statementLines
  let fnDeclLines
  let branchLines

  beforeAll(async () => {
    data = await reportedCoverageFor(FIXTURE)
    statementLines = Object.values(data.statementMap).map(s => s.start.line)
    fnDeclLines = Object.values(data.fnMap).map(f => f.decl.start.line)
    branchLines = Object.values(data.branchMap).map(b => b.loc.start.line)
  })

  it('counts every indented statement in the script block', () => {
    const markers = markerLines(FIXTURE, 'PROBE')
    // The fixture is the specification; if a marker is deleted this assertion notices.
    expect(Object.keys(markers).sort()).toEqual([
      'branch-consequent',
      'computed-body',
      'data-body',
      'method-body',
      'module-scope-indented'
    ])

    const missing = Object.entries(markers)
      .filter(([, line]) => !statementLines.includes(line))
      .map(([name, line]) => `${name} (line ${line})`)

    expect({
      missing,
      instrumentedStatementLines: statementLines
    }).toEqual({
      missing: [],
      instrumentedStatementLines: statementLines
    })
  })

  it('counts statements that are indented, not only statements in column 0', () => {
    const source = fs.readFileSync(FIXTURE, 'utf8').split(/\r?\n/)
    const indented = statementLines.filter(line => /^\s+\S/.test(source[line - 1] || ''))
    // The single sentence of the defect: before the fix this number was 0, here and in all 304
    // `.vue` files in the coverage report.
    expect(indented.length).toBeGreaterThan(0)
  })

  it('records a function entry for data(), a computed and a method', () => {
    const fns = markerLines(FIXTURE, 'PROBE-FN')
    expect(Object.keys(fns).sort()).toEqual(['data', 'doubled', 'shouted'])

    const missing = Object.entries(fns)
      .filter(([, line]) => !fnDeclLines.includes(line))
      .map(([name, line]) => `${name} (line ${line})`)

    expect({ missing, fnDeclLines }).toEqual({ missing: [], fnDeclLines })
  })

  it('records a branch inside a method body', () => {
    const branches = markerLines(FIXTURE, 'PROBE-BRANCH')
    expect(Object.keys(branches)).toEqual(['negative-guard'])
    expect(branchLines).toContain(branches['negative-guard'])
  })

  it('measures a real component past its export default, not just its import list', async () => {
    // Estate-level, and deliberately not pinned to one filename: whichever `components/` SFC sorts
    // first and declares a `methods:` block. Before the fix, EVERY one of the 304 `.vue` files in
    // the coverage report had zero instrumented statements after `export default`.
    const candidates = []
    const walk = (dir) => {
      for (const name of fs.readdirSync(dir).sort()) {
        const full = path.join(dir, name)
        if (fs.statSync(full).isDirectory()) {
          walk(full)
        } else if (name.endsWith('.vue')) {
          candidates.push(full)
        }
      }
    }
    walk(path.join(ROOT, 'components'))

    const subject = candidates.find((f) => {
      const text = fs.readFileSync(f, 'utf8')
      return /\n\s*methods:\s*\{/.test(text) && /\nexport default/.test(text)
    })
    expect(typeof subject).toBe('string')

    const componentData = await reportedCoverageFor(subject)
    const exportLine =
      fs.readFileSync(subject, 'utf8').split(/\r?\n/)
        .findIndex(l => l.startsWith('export default')) + 1
    expect(exportLine).toBeGreaterThan(0)

    const past = Object.values(componentData.statementMap)
      .map(s => s.start.line)
      .filter(line => line > exportLine)

    expect({
      subject: path.relative(ROOT, subject),
      statementsAfterExportDefault: past.length > 0
    }).toEqual({
      subject: path.relative(ROOT, subject),
      statementsAfterExportDefault: true
    })
  })
})
