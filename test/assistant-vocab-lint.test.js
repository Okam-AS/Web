const { execFileSync } = require('child_process')
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = require('fs')
const { tmpdir } = require('os')
const { join } = require('path')

// The standing compliance ruling, enforced rather than remembered.
//
// The assistant answers questions about a venue's own numbers and proposes changes a human approves.
// It runs no statutory regime, produces no statutory document and certifies nothing — so a sentence
// in its UI claiming otherwise is the product making a promise it cannot keep, on a surface a
// merchant may reasonably rely on. Review has been the only thing standing behind that, and review
// does not run on every commit.
//
// ⚠️ CI DOES NOT RUN JEST ON THIS REPOSITORY. This test is a local gate, not a merge gate. It is
// still worth having — it fires the moment anyone runs the suite — but it must not be described as
// preventing the copy from landing.
const SCRIPT = join(__dirname, '..', 'scripts', 'assistant-vocab-lint.mjs')
const REPO = join(__dirname, '..')

function runLint (root) {
  try {
    const stdout = execFileSync('node', [SCRIPT], {
      encoding: 'utf8',
      env: Object.assign({}, process.env, root ? { ASSISTANT_VOCAB_ROOT: root } : {})
    })
    return { code: 0, output: stdout }
  } catch (error) {
    return { code: error.status, output: String(error.stdout) + String(error.stderr) }
  }
}

/** A throwaway tree holding the three real dictionaries, with one line optionally rewritten. */
function bench (mutate) {
  const root = mkdtempSync(join(tmpdir(), 'assistant-vocab-'))
  mkdirSync(join(root, 'translations'))
  for (const language of ['no', 'en', 'de']) {
    let text = readFileSync(join(REPO, 'translations', `${language}.ts`), 'utf8')
    if (mutate) { text = mutate(text, language) }
    writeFileSync(join(root, 'translations', `${language}.ts`), text)
  }
  return root
}

describe('assistant-vocab-lint', () => {
  test('the copy that is actually in this repository is clean', () => {
    const result = runLint()

    expect(result.code).toBe(0)
    expect(result.output).toContain('clean')
  })

  // Each of the four is proved to be caught. A forbidden-word list nobody has watched reject a word
  // is a list, not a guard.
  //
  // `compliance` is on this list as its own row and not as a remark in a comment: the list holds the
  // STEM `complian` precisely because `'compliance'.includes('compliant')` is FALSE, so an entry
  // spelling out the adjective would have passed the noun through while a comment claimed otherwise.
  // The only way that claim stays true is if the noun is watched failing.
  describe.each([
    ['internkontroll', 'Dette er internkontroll for kjøkkenet.'],
    ['IK-mat', 'Fungerer som IK-mat for virksomheten.'],
    ['compliant', 'Your menu is compliant.'],
    ['compliance', 'Your menu meets every compliance rule.'],
    ['lovlig', 'Denne prisendringen er lovlig.']
  ])('rejects %s', (word, sentence) => {
    test('anywhere in an assistant_* string', () => {
      const root = bench((text, language) => (
        language === 'no'
          ? text.replace(/^(\s*assistant_title:).*$/m, `$1 '${sentence}',`)
          : text
      ))

      const result = runLint(root)

      expect(result.code).toBe(1)
      expect(result.output).toContain(word.toLowerCase())
      expect(result.output).toContain('assistant_title')
      rmSync(root, { recursive: true, force: true })
    })
  })

  // Matched as a substring ON PURPOSE. A claim in the other direction is the same class of claim,
  // and "this is not unlawful" is if anything the more dangerous of the two.
  test('"ulovlig" is caught by the same rule as "lovlig"', () => {
    const root = bench((text, language) => (
      language === 'no'
        ? text.replace(/^(\s*assistant_title:).*$/m, '$1 \'Ingenting her er ulovlig.\',')
        : text
    ))

    expect(runLint(root).code).toBe(1)
    rmSync(root, { recursive: true, force: true })
  })

  // A key present in `no` and missing in `de` does not fail loudly at runtime: `$i` falls back
  // no → en → de and finally to the key itself, so the symptom is a German operator reading a
  // Norwegian sentence with nothing red anywhere.
  test('catches a key that is missing from one language', () => {
    const root = bench((text, language) => (
      language === 'de' ? text.replace(/^\s*assistant_send:.*$\n/m, '') : text
    ))

    const result = runLint(root)

    expect(result.code).toBe(1)
    expect(result.output).toContain('assistant_send')
    expect(result.output).toContain('de')
    rmSync(root, { recursive: true, force: true })
  })

  // The failure this exists for is silent: an extraction that suddenly matches nothing would pass
  // every check above without a word, which is the same shape of lie the guard is for.
  test('refuses rather than passing when it can see no keys at all', () => {
    const root = mkdtempSync(join(tmpdir(), 'assistant-vocab-empty-'))
    mkdirSync(join(root, 'translations'))
    for (const language of ['no', 'en', 'de']) {
      writeFileSync(join(root, 'translations', `${language}.ts`), 'export default {\n}\n')
    }

    const result = runLint(root)

    expect(result.code).toBe(2)
    expect(result.output).toContain('extraction is broken')
    rmSync(root, { recursive: true, force: true })
  })

  test('refuses when a dictionary is absent, rather than checking two of three', () => {
    const root = mkdtempSync(join(tmpdir(), 'assistant-vocab-missing-'))
    mkdirSync(join(root, 'translations'))
    writeFileSync(join(root, 'translations', 'no.ts'), 'export default {\n}\n')

    expect(runLint(root).code).toBe(2)
    rmSync(root, { recursive: true, force: true })
  })

  // The guard must not fire on the DOCUMENT EXPLAINING IT. Every forbidden word necessarily appears
  // in this repository's comments — in the lint's own header, in the translation blocks, and in this
  // file — and a guard that reds on its own explanation is a guard that gets switched off.
  test('a forbidden word inside a comment is not a violation', () => {
    const root = bench((text, language) => (
      language === 'no'
        ? text.replace(/^(\s*assistant_title:)/m, '  // internkontroll, IK-mat, compliant, lovlig — named here to be explained\n$1')
        : text
    ))

    expect(runLint(root).code).toBe(0)
    rmSync(root, { recursive: true, force: true })
  })
})
