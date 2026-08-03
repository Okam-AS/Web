// ---- WHAT THIS FILE COVERS, AND WHAT IT DELIBERATELY DOES NOT ---------------------------------
//
// The divergence check itself needs an OkamAPI checkout (`npm run test:e2e:fixture-divergence`), and
// there is no committed snapshot of the API's refusals on purpose — a snapshot goes green the moment
// the backend moves and nobody regenerates it, which is the exact failure the check exists to end.
//
// So what runs HERE, in a suite that needs no checkout, is everything about the check that can rot
// silently:
//
//   • the seven-armed proof, against stand-in trees in a temp directory. It reds if the comparator
//     stops detecting a removed refusal, a re-statused one or an invented one — and equally if it
//     starts reding on benign change, which is the failure mode that gets a guard ignored.
//   • the fixture side of the real corpus: the anchors parse, the refusal primitives are found, and
//     every anchored route yields refusal shapes. A static walk that quietly stops matching examines
//     nothing and reports success; these are the counted identities that make that loud.
//
// The one thing not asserted here is the verdict against a real API, because that verdict depends on
// WHICH checkout you point at — the estate has no single backend, and the module work sits across
// worktrees at different commits. Naming one here would pin this suite to a lane branch.

const path = require('path')
const { prove } = require('../test/e2e/scripts/fixture-divergence')
const { deriveFixture, readFixtureFile } = require('../test/e2e/scripts/refusal-shapes')

const FIXTURE_DIR = path.join(__dirname, 'e2e', 'fixture')
const fixture = deriveFixture(FIXTURE_DIR)

describe('the divergence check reds on divergence and only on divergence', () => {
  // Seven arms, one assertion: every arm's observed verdict equals the one it declares. Spelled as an
  // equality over the whole table rather than a count, so a proof that silently stopped running an
  // arm fails on that arm by name.
  test('all seven arms behave as declared', () => {
    const { failures, lines } = prove()
    expect({ failures, lines }).toEqual({ failures: [], lines: expect.any(Array) })
    expect(lines).toHaveLength(7)
    expect(lines.filter(line => line.includes('FAIL'))).toEqual([])
  }, 30000)
})

describe('the fixture side of the walk examined what it claims to have examined', () => {
  // (1) The annotations parse. A malformed one is an unchecked claim wearing the clothes of a checked
  // one, which is worse than no annotation at all.
  test('1: every annotation parses', () => {
    expect(fixture.malformed).toEqual([])
    expect(fixture.anchorCount).toBeGreaterThan(0)
  })

  // (2) A token that does not OPEN a comment line is ignored by the parser. Anything in that state is
  // a route somebody meant to anchor and did not; the list is asserted empty rather than merely
  // printed, because an ignored anchor is exactly the silence this check exists to break.
  test('2: no annotation token sits somewhere the parser will not read it', () => {
    expect(fixture.loose).toEqual([])
  })

  // (3) The refusal primitives are DERIVED from signatures — a function whose parameters name both
  // `status` and `code`. If that derivation stopped working, every fixture would appear to answer no
  // refusals at all and every anchored route would look level with everything. Asserted per file, so
  // one file going quiet is visible rather than absorbed into a total.
  test('3: every fixture file that answers refusals has its primitives found', () => {
    const answering = fixture.files.filter(file => file.hasRefusalSites).map(file => file.file)
    expect(answering).toEqual(expect.arrayContaining([
      'api-server.js', 'growth-newsletter.js', 'growth.js', 'meals.js', 'training.js'
    ]))
    for (const file of fixture.files) {
      if (!file.hasRefusalSites) { continue }
      expect(file.primitives.length).toBeGreaterThan(0)
    }
  })

  // (4) Every anchored route resolved to at least one refusal shape. An anchor over a handler from
  // which nothing is read compares an empty set against the backend and reports "behind" for
  // everything or, worse, nothing at all.
  test('4: every anchored route yields at least one refusal shape', () => {
    const silent = Object.keys(fixture.routes)
      .filter(route => fixture.routes[route].refusals.length === 0)
      .map(route => route + '  ' + fixture.routes[route].file + ':' + fixture.routes[route].line)
    expect(silent).toEqual([])
  })

  // (5) A non-2xx answered without going through a refusal helper carries no code, so it cannot be
  // compared. Empty today; the assertion is what stops a handler quietly leaving the checked set.
  test('5: no anchored handler answers a refusal outside a refusal helper', () => {
    expect(fixture.bypasses).toEqual([])
  })

  // REACHABILITY PIN. The refusal this whole lane exists for must still be among the shapes read out
  // of the fixture. Without it the walk could go on passing about a corpus that no longer contains
  // the thing it was built to protect — and this is the exact pair that was a release old.
  test('the test-send refusal that raised the flag is one of the shapes this walk reads', () => {
    const testSend = fixture.routes['POST /v1/growth/stores/{storeId}/newsletters/{newsletterId}/test-sends']
    expect(testSend).toBeDefined()
    expect(testSend.refusals).toContain('403 growth.test_address_not_own')
    expect(testSend.refusals).toContain('404 growth.not_found')
  })

  // The preamble mechanism is load-bearing: the store-admin concealment is written once at the top of
  // the file and belongs to every route under it. If preamble inheritance broke, every anchored route
  // would silently lose its 404 and read as behind.
  test('a preamble refusal reaches the routes below it', () => {
    const read = readFixtureFile(path.join(FIXTURE_DIR, 'growth-newsletter.js'))
    expect(read.preambles.length).toBeGreaterThan(0)
    const routes = Object.keys(fixture.routes).filter(route => fixture.routes[route].file === 'growth-newsletter.js')
    expect(routes.length).toBeGreaterThan(0)
    for (const route of routes) {
      expect(fixture.routes[route].refusals).toContain('404 growth.not_found')
    }
  })
})
