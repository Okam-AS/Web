/**
 * The jest transform for `.vue` files.
 *
 * This is `vue-jest@3.0.7` with ONE function replaced: the source map it hands to istanbul.
 *
 * ---------------------------------------------------------------------------------------------
 * THE DEFECT THIS EXISTS TO FIX
 * ---------------------------------------------------------------------------------------------
 * `vue-jest` compiles a `.vue` file's `<script>` with babel and then throws babel's source map
 * away, replacing it with a hand-rolled one built a line at a time in
 * `node_modules/vue-jest/lib/generate-source-map.js:12-30`:
 *
 *     script.split(splitRE).forEach(function (line, index) {
 *       var ln = index + 1
 *       var originalLine = inputMapConsumer
 *         ? inputMapConsumer.originalPositionFor({ line: ln, column: 0 }).line   // <-- column 0
 *         : ln
 *       if (originalLine) { map.addMapping({ ...column: 0... }) }                // <-- or nothing
 *     })
 *
 * It asks babel's map for a mapping at **column 0** of each generated line, and when there is
 * none it emits **no mapping for that line at all**. Babel emits mappings at the column where a
 * token actually starts, so only lines whose first token begins in column 0 survive.
 * `source-map`'s `originalPositionFor` refuses a hit from a different generated line, so an
 * indented line resolves to `{ source: null }` and is skipped.
 *
 * The consequence is not a cosmetic map defect, it is the coverage number. Jest instruments the
 * transform output with `babel-plugin-istanbul` (`@jest/transform/build/ScriptTransformer.js:378-402`,
 * `inputSourceMap: <this map>`), and the report step remaps every statement, branch and function
 * back through it (`@jest/reporters/build/CoverageReporter.js:646`, istanbul-lib-source-maps
 * `getMapping`). Anything the map cannot place is **dropped from the report entirely** — not
 * counted as uncovered, simply absent from the denominator.
 *
 * Measured on trunk `a63c30f` before this file existed: of 304 `.vue` files in the coverage
 * report, 304 had zero instrumented statements after `export default`, all 1,169 surviving
 * statements began at column 0, and 47,081 physical `<script>` lines produced those 1,169
 * statements. Every `data()`, `computed` and `methods` body in the repository was outside the
 * denominator, so the published 65.4% was a count of import lists.
 * See `docs/plan/reviews/L-COVERAGE-MEASURED-PER-MODULE.md` §2.
 *
 * ---------------------------------------------------------------------------------------------
 * THE FIX
 * ---------------------------------------------------------------------------------------------
 * Carry babel's mappings through instead of re-deriving them: every mapping babel produced, at
 * its real column, shifted by the one line `vue-jest` prepends (`;(function(){`). Nothing else
 * about the transform changes — `vue-jest`'s own `process.js` still runs, so template compilation,
 * CSS modules, `src=` blocks, functional components and the `addTemplateMapping` pass over the
 * render function are byte-for-byte what they were.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY IT IS INSTALLED THIS WAY
 * ---------------------------------------------------------------------------------------------
 * `npm ci` / `npm install` are banned in this repository (one `node_modules` is shared by ~160
 * worktrees), so upgrading or adding a transform package is not available; and editing
 * `node_modules/vue-jest` would change every one of those worktrees and would not survive an
 * install. Seeding `require.cache` is the one route that is local to this repository, versioned,
 * and reviewable. It is deliberately loud: if a future `vue-jest` moves or reshapes that module,
 * the assertions below throw at transform time rather than silently restoring the old map — and
 * `test/vue-coverage-instrumentation.test.js` reds as well.
 */
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const sourceMap = require('source-map')

const splitRE = /\r?\n/g

/**
 * Drop-in replacement for `vue-jest/lib/generate-source-map`.
 *
 * Same signature, same return shape (a `SourceMapGenerator` carrying `_hashedFilename`, which
 * `vue-jest/lib/add-template-mapping.js` reads), same generated-line offset arithmetic. The only
 * difference is that every babel mapping is carried through at its own column instead of one
 * column-0 probe per line.
 */
function generateSourceMap (script, output, filePath, content, inputMap) {
  const hashedFilename = path.basename(filePath)
  const map = new sourceMap.SourceMapGenerator()
  map.setSourceContent(hashedFilename, content)

  // Identical to the original: `output` is always '' at the call site, so this is 1 — the single
  // `;(function(){` line that `process.js` prepends to the compiled script.
  const generatedOffset = (output ? output.split(splitRE).length : 0) + 1

  if (inputMap) {
    // `vue-template-compiler` is called with `pad: true`, which pads the extracted `<script>`
    // with `//\n` lines so babel's original line numbers are already the `.vue` file's line
    // numbers. Nothing needs adjusting on the original side.
    const consumer = new sourceMap.SourceMapConsumer(inputMap)
    consumer.eachMapping(function (m) {
      if (m.originalLine == null || m.originalColumn == null) {
        // A generated-only mapping (babel-inserted helper). It has no original position, so
        // istanbul must not be told one.
        return
      }
      map.addMapping({
        source: hashedFilename,
        name: m.name || undefined,
        generated: {
          line: m.generatedLine + generatedOffset,
          column: m.generatedColumn
        },
        original: {
          line: m.originalLine,
          column: m.originalColumn
        }
      })
    })
  } else {
    // No babel step (`.babelrc` absent, or a `<script lang>` whose compiler returned no map).
    // The script is emitted verbatim, so line N out is line N in.
    script.split(splitRE).forEach(function (_line, index) {
      const ln = index + 1
      map.addMapping({
        source: hashedFilename,
        generated: { line: ln + generatedOffset, column: 0 },
        original: { line: ln, column: 0 }
      })
    })
  }

  map._hashedFilename = hashedFilename
  return map
}

const generateSourceMapPath = require.resolve('vue-jest/lib/generate-source-map')

// Load the module we are replacing before anything else can, so that `vue-jest/lib/process.js`
// captures ours when it is required below.
const original = require(generateSourceMapPath)
if (typeof original !== 'function' || original.length !== 5) {
  throw new Error(
    'vue-sfc-transform: vue-jest/lib/generate-source-map is no longer a 5-argument function ' +
    '(got ' + typeof original + '/' + (original && original.length) + '). The .vue coverage fix ' +
    'this file installs no longer applies — re-read it before deleting it.'
  )
}
require.cache[generateSourceMapPath].exports = generateSourceMap

// `vue-jest/vue-jest.js` and `lib/process.js` must not already be resident with the old function
// bound, whoever required them.
const processPath = require.resolve('vue-jest/lib/process')
const entryPath = require.resolve('vue-jest')
delete require.cache[processPath]
delete require.cache[entryPath]

const vueJest = require(entryPath)
if (typeof vueJest.process !== 'function') {
  throw new TypeError('vue-sfc-transform: vue-jest no longer exports process()')
}

// Jest's default cache key hashes the file, the filename and the stringified config — never the
// transform module itself. Without this, editing the fix above would leave every `.vue` file
// served from a cache built by the previous version of it.
const selfHash = crypto
  .createHash('md5')
  .update(fs.readFileSync(__filename, 'utf8'))
  .digest('hex')

module.exports = {
  process (src, filePath, jestConfig, transformOptions) {
    return vueJest.process(src, filePath, jestConfig, transformOptions)
  },
  getCacheKey (fileData, filename, configString, options) {
    return crypto
      .createHash('md5')
      .update(fileData)
      .update('\0')
      .update(filename)
      .update('\0')
      .update(String(configString))
      .update('\0')
      .update(options && options.instrument ? 'instrument' : '')
      .update('\0')
      .update(selfHash)
      .digest('hex')
  }
}
