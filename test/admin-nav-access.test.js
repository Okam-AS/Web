import fs from 'fs'
import path from 'path'
import { shallowMount } from '@vue/test-utils'
import AdminPageHeader from '~/components/organisms/AdminPageHeader.vue'
import no from '~/translations/no'
import en from '~/translations/en'
import de from '~/translations/de'
import {
  storeAdminAccess,
  showsStoreAdminNav,
  ACCESS_UNKNOWN,
  ACCESS_STORE_ADMIN,
  ACCESS_WORKER
} from '~/utils/admin/nav-access'

// The sidebar half of the worker-access gap. `AdminPage` learned to let a pure worker through to
// `/admin/workforce-me`; the sidebar kept offering them every store-admin link, all of which the
// same shell bounces straight back to `/registrer`.
//
// The whole risk of fixing that lives in the 46 pages NOT being fixed, so these tests are written as
// a proof obligation in two halves:
//
//   1. BEHAVIOURAL — the group list a store admin sees, and the group list an UNKNOWN user sees, are
//      the same list, and it is the full one. That is what makes the async `Reload()` unable to
//      produce a flicker: there is no frame in which an admin's sidebar is smaller.
//   2. STATIC — walk `pages/admin/` and check that every link the sidebar offers a worker lands on a
//      page that actually lets a worker in. The same walk-every-page discipline the membership guard
//      shipped with, pointed at the menu instead of at the shell.
//
// The `MANAGER-REACHABLE` tests are the mirror image of that gap, and the same question asked in the
// other direction: not "is this link a dead end for the person offered it" but "is this page a page
// nobody is offered". A page whose only link hangs off a role flag its own guard never checks is
// reachable only by typing its URL, and a suite can be entirely green while that is true — the page
// renders, its client works, and no test ever asks whether a menu leads to it.

describe('storeAdminAccess — unknown is a state, not a refusal', () => {
  test('no user at all is unknown', () => {
    expect(storeAdminAccess(null)).toBe(ACCESS_UNKNOWN)
    expect(storeAdminAccess({})).toBe(ACCESS_UNKNOWN)
  })

  test('a signed-in user whose adminIn has not loaded is unknown, NOT a worker', () => {
    expect(storeAdminAccess({ id: 9 })).toBe(ACCESS_UNKNOWN)
    expect(storeAdminAccess({ id: 9, adminIn: null })).toBe(ACCESS_UNKNOWN)
  })

  test('a non-empty adminIn is a store admin', () => {
    expect(storeAdminAccess({ id: 9, adminIn: [{ id: 7 }] })).toBe(ACCESS_STORE_ADMIN)
  })

  test('an EMPTY adminIn is a positive answer: this person administers no store', () => {
    expect(storeAdminAccess({ id: 9, adminIn: [] })).toBe(ACCESS_WORKER)
  })

  test('the nav is withheld only on the positive worker answer', () => {
    expect(showsStoreAdminNav(ACCESS_STORE_ADMIN)).toBe(true)
    expect(showsStoreAdminNav(ACCESS_UNKNOWN)).toBe(true)
    expect(showsStoreAdminNav(ACCESS_WORKER)).toBe(false)
  })
})

// Every store-admin link the sidebar has ever offered. Hard-coded rather than derived from the
// component, so a link silently dropped from `navGroups` fails here instead of being "still equal to
// itself".
//
// Order matters: this is compared with `toEqual` against the flattened `navGroups`, so a link added
// to a group must be added at the same position here. All NINE store-admin module surfaces are on
// this list now, and every one of them being here is the point:
//
//   `/admin/margin-recipes` and `/admin/margin-statements` (Menu); `/admin/growth-newsletter` and
//   `/admin/events-pipeline` (Sales & marketing); `/admin/workforce-schedule`,
//   `/admin/workforce-roster`, `/admin/workforce-rates`, `/admin/training-courses` and
//   `/admin/meals-agreements` (Administration). No module surface is role-gated any more, and none is
//   unlinked.
//
// WHAT THE LAST FIVE ENTRIES RECORD, because it is one defect wearing two masks. Every one of these
// pages mounts `AdminPage` with no `allow-non-admin` and reads no role flag, so what admits a caller
// has always been store-admin membership at the selected store. The sidebar disagreed in two ways:
//
//   the wrong gate  — schedule, roster and events shipped inside the PowerUser group. The manager was
//                     authorised and unlinked. Signing in as the PowerUser was no escape either: that
//                     account administers no store, so the same shell bounces it to /registrer, which
//                     made the only visible link a dead end for the only user who could see it.
//   no gate at all  — `/admin/workforce-rates` and `/admin/training-courses` had no link in ANY group.
//                     A page nobody is offered is a page reachable only by typing its URL.
//
// Moving and adding links widens nothing; it points them at the role that already passed the guard.
// The second mask is why `THE CONVERSE WALK` at the bottom of this file exists: the original static
// walk checked links → pages and could not see a page → no link.
// Ordered, and the order is the assertion: `toEqual` below pins the sidebar a store admin actually
// renders. The eight module links were moved OUT of Menu / Sales / Administration into one `Moduler`
// group by the owner's instruction — filed by subject matter they were correct and unfindable, and the
// six restaurant modules are the surfaces under active acceptance. Same store-admin gate as the groups
// they came from, so this reorder moves no link between audiences; only its position changed.
const STORE_ADMIN_PATHS = [
  '/admin', '/admin/ongoing', '/admin/orders', '/admin/statistics',
  '/admin/workforce-schedule', '/admin/workforce-requests', '/admin/workforce-roster',
  '/admin/workforce-rates', '/admin/workforce-personnel-list', '/admin/training-courses',
  '/admin/margin-recipes', '/admin/margin-suppliers', '/admin/margin-price-imports',
  '/admin/margin-statements',
  '/admin/meals-agreements', '/admin/meals-companies', '/admin/events-pipeline', '/admin/growth-newsletter',
  // Growth's other half, beside the newsletter link. The guest is told on screen that this venue
  // answers a privacy request within one month (GDPR art. 12); the two routes that let anybody answer
  // had no caller in this app at all, so the promise was printed on one surface and keepable on none.
  '/admin/growth-privacy',
  // Last in the modules group, and the switchboard for every link above it: each of those modules
  // gates its writes on deny-closed per-store flags, and until this page existed the only way to move
  // one was a curl against `PUT /stores/{id}/feature-flags`. Store-admin gated like its siblings.
  '/admin/feature-flags',
  '/admin/products', '/admin/categories', '/admin/allergens', '/admin/import',
  '/admin/delivery', '/admin/wolt',
  '/admin/kravia-invoice', '/admin/rewards', '/admin/discounts',
  '/admin/payment', '/admin/settlements', '/admin/terminals',
  '/admin/customers', '/admin/employees'
]

const WORKER_PATHS = ['/admin/workforce-me']

// The links this file's `MANAGER-REACHABLE` tests are about — the ones a manager could not reach by
// navigating — named once so the assertions below cannot drift apart from each other. The decision
// inbox joins them: without a sidebar entry the only surface that can approve anything is
// unreachable, which is the exact failure this list exists to prevent.
const MANAGER_MODULE_PATHS = [
  '/admin/workforce-schedule', '/admin/workforce-requests', '/admin/workforce-roster', '/admin/workforce-rates',
  '/admin/training-courses', '/admin/events-pipeline'
]

// The three languages `LanguageSwitcher` offers, so the three sidebars that actually get rendered.
const DICTIONARIES = { no, en, de }

// Mounting the real sidebar is shared by both halves of this file: the behavioural tests read the
// links it offers each kind of user, and the static walk at the bottom compares the pages on disk
// against that same render rather than against a list, so a link deleted from the component cannot be
// covered for by a list that still mentions it.
//
// `dictionary` is normally omitted, and then `$i` returns the key — every path assertion here reads
// keys, not prose. The locale tests pass a real translation dictionary instead, because a duplicate
// LABEL is invisible to a test that only ever sees key names.
function mountNav (currentUser, dictionary) {
  const wrapper = shallowMount(AdminPageHeader, {
    mocks: {
      $i: key => (dictionary ? (dictionary[key] || key) : key),
      $store: {
        // The whole sidebar hangs off this getter, so it is mocked truthfully rather than to a
        // constant: an anonymous visitor renders no nav at all.
        getters: { userIsLoggedIn: !!(currentUser && currentUser.id) },
        state: { currentUser, selectedAdminStore: 7, adminLocale: 'no' },
        dispatch: jest.fn(),
        commit: jest.fn()
      },
      $route: { path: '/admin/workforce-me', query: {} },
      $router: { replace: jest.fn() },
      _userService: { Logout: jest.fn() }
    },
    stubs: { LanguageSwitcher: true }
  })
  return wrapper
}

const pathsOf = wrapper => wrapper.vm.navGroups
  .reduce((acc, group) => acc.concat(group.items.map(item => item.path)), [])

const admin = { id: 9, adminIn: [{ id: 7, name: 'Kafé Nord' }] }
const worker = { id: 4, adminIn: [] }
const notYetKnown = { id: 4 }

describe('AdminPageHeader — which links each kind of user is offered', () => {
  test('a store admin is offered every store-admin link, exactly as before', () => {
    expect(pathsOf(mountNav(admin))).toEqual(STORE_ADMIN_PATHS.concat(WORKER_PATHS))
  })

  test('NO FLICKER: an unresolved user is offered the identical list to a store admin', () => {
    // This is the property that keeps the async `Reload()` invisible on all 46 admin pages. If it
    // ever fails, an admin's sidebar has a frame in which links are missing.
    expect(pathsOf(mountNav(notYetKnown))).toEqual(pathsOf(mountNav(admin)))
  })

  test('a pure worker is offered only their own page', () => {
    expect(pathsOf(mountNav(worker))).toEqual(WORKER_PATHS)
  })

  test('the worker keeps the group that a store admin also has — it is added, never swapped', () => {
    const adminGroups = mountNav(admin).navGroups || mountNav(admin).vm.navGroups
    expect(adminGroups.map(g => g.title)).toContain('nav_group_me')
    expect(mountNav(worker).vm.navGroups.map(g => g.title)).toEqual(['nav_group_me'])
  })

  test('the store switcher is hidden from a worker and shown while unknown', () => {
    // It picks which store you administer. For someone who administers none it renders an empty
    // name over an empty dropdown; while unknown it must stay exactly as it was.
    expect(mountNav(admin).find('.store-selector-container').exists()).toBe(true)
    expect(mountNav(notYetKnown).find('.store-selector-container').exists()).toBe(true)
    expect(mountNav(worker).find('.store-selector-container').exists()).toBe(false)
  })

  test('role-gated groups are untouched by this change', () => {
    // KAM and PowerUser groups hang off explicit role flags, not off membership. A store admin
    // without those flags sees neither, before and after.
    const paths = pathsOf(mountNav(admin))
    expect(paths).not.toContain('/admin/offers')
    expect(paths).not.toContain('/admin/pos')

    const powerUser = { id: 9, adminIn: [{ id: 7 }], isPowerUser: true }
    // `/admin/pos` rather than one of the module surfaces: a PowerUser is also a store admin here, so
    // asserting a moved link "is present for a PowerUser" would now pass through the store-admin
    // groups and prove nothing about the role gate. The POS register is PowerUser-only either way.
    expect(pathsOf(mountNav(powerUser))).toContain('/admin/pos')
  })

  // MANAGER-REACHABLE. The defect these tests exist for: all five pages authorise a store admin and
  // none of them was linked for one — three behind a role flag their own guard never checks, two
  // behind no link at all. Stated four ways because each way alone has a cheap wrong fix that
  // satisfies it: present at all, present outside the role gate, present exactly once, and still
  // withheld from the worker the pages would bounce.
  test('MANAGER-REACHABLE: a plain store admin — no role flags — is offered all five module surfaces', () => {
    const adminPaths = pathsOf(mountNav(admin))
    MANAGER_MODULE_PATHS.forEach(p => expect(adminPaths).toContain(p))
  })

  test('MANAGER-REACHABLE: no link sits in a role-gated group, so no role flag can be what reveals it', () => {
    // Guards the fix against being re-satisfied by duplicating the links into the PowerUser group:
    // that would put them back on `isPowerUser` for the accounts that have it while leaving the
    // manager's copy dependent on nothing but this file noticing.
    const roleGatedPaths = group => (group.role ? group.items.map(i => i.path) : [])
    const powerUser = { id: 9, adminIn: [{ id: 7 }], isPowerUser: true, isKeyAccountManager: true }
    const gated = mountNav(powerUser).vm.navGroups.reduce((acc, g) => acc.concat(roleGatedPaths(g)), [])

    MANAGER_MODULE_PATHS.forEach(p => expect(gated).not.toContain(p))
    // The same walk still sees the role groups it is meant to see, so an empty `gated` cannot be what
    // makes this pass.
    expect(gated).toContain('/admin/pos')
    expect(gated).toContain('/admin/offers')
  })

  test('MANAGER-REACHABLE: a PowerUser who is also a store admin is offered each link exactly once', () => {
    // The move was a move, not a copy. A duplicate renders the same label twice in one sidebar.
    const powerUser = { id: 9, adminIn: [{ id: 7 }], isPowerUser: true, isKeyAccountManager: true }
    const powerPaths = pathsOf(mountNav(powerUser))
    MANAGER_MODULE_PATHS.forEach((p) => {
      expect(powerPaths.filter(candidate => candidate === p)).toEqual([p])
    })
  })

  test('MANAGER-REACHABLE: a pure worker is still offered none of them — they are store-admin pages', () => {
    // The links landed in groups withheld from a worker, so the guard that bounces a worker off these
    // pages is still matched by the menu. This is the invariant the whole file was written for,
    // restated for the five paths that changed group or gained one.
    const workerPaths = pathsOf(mountNav(worker))
    MANAGER_MODULE_PATHS.forEach(p => expect(workerPaths).not.toContain(p))
  })

  // THE LABELS, in the three languages the sidebar actually renders. Every other test in this file
  // asserts on paths, and a path collision is impossible — but two links can carry the SAME WORDS
  // while their paths differ, and then the manager is choosing between two identical rows. That was
  // live: `nav_employees` and `nav_workforce_roster` were both 'Ansatte', harmless only while the
  // roster was PowerUser-only, and put side by side in one group the moment it stopped being.
  //
  // A key-returning `$i` cannot see this, which is why these mount against the real dictionaries.
  Object.keys(DICTIONARIES).forEach((locale) => {
    test(`LABELS (${locale}): no two links in one store admin's sidebar read the same`, () => {
      const dictionary = DICTIONARIES[locale]
      const labels = mountNav(admin, dictionary).vm.navGroups
        .reduce((acc, group) => acc.concat(group.items.map(item => item.label)), [])

      // Untranslated keys would defeat the check by being unique strings, so they fail here too: a
      // label that still looks like `nav_…` never made it into this locale's dictionary.
      expect(labels.filter(label => label.startsWith('nav_'))).toEqual([])
      expect(labels.filter((label, i) => labels.indexOf(label) !== i)).toEqual([])
    })

    test(`LABELS (${locale}): and a PowerUser store admin, who sees the most links of anyone`, () => {
      // The account that had the 'Ansatte'/'Ansatte' pair on screen before this lane, and the widest
      // sidebar there is: both role groups plus all six store-admin ones.
      const powerUser = { id: 9, adminIn: [{ id: 7 }], isPowerUser: true, isKeyAccountManager: true }
      const labels = mountNav(powerUser, DICTIONARIES[locale]).vm.navGroups
        .reduce((acc, group) => acc.concat(group.items.map(item => item.label)), [])

      expect(labels.filter(label => label.startsWith('nav_'))).toEqual([])
      expect(labels.filter((label, i) => labels.indexOf(label) !== i)).toEqual([])
    })
  })
})

// The static half. `pages/admin/` is walked rather than trusted, so a page added, renamed or
// re-gated later is caught by the same test that caught the original bug.
describe('no link the sidebar offers is a link the shell will bounce', () => {
  const pagesDir = path.resolve(__dirname, '..', 'pages', 'admin')

  function adminPages (dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).reduce((acc, entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { return acc.concat(adminPages(full)) }
      return entry.name.endsWith('.vue') ? acc.concat(full) : acc
    }, [])
  }

  // Nuxt maps `/admin` to `pages/admin/index.vue` and `/admin/x` to `pages/admin/x.vue`.
  function pageFor (navPath) {
    const rest = navPath.replace(/^\/admin\/?/, '')
    return path.join(pagesDir, (rest || 'index') + '.vue')
  }

  test('every store-admin link in the sidebar resolves to a page that exists', () => {
    const missing = STORE_ADMIN_PATHS.filter(p => !fs.existsSync(pageFor(p)))
    expect(missing).toEqual([])
  })

  test('THE INVARIANT: every link offered to a worker opts out of the store-admin guard', () => {
    // A worker reaching a page that does not set `allow-non-admin` is thrown to /registrer. The
    // sidebar must therefore never offer them one — this is the bug, stated as a check.
    const bounced = WORKER_PATHS.filter((navPath) => {
      const file = pageFor(navPath)
      return !fs.existsSync(file) || !/allow-non-admin|allowNonAdmin/.test(fs.readFileSync(file, 'utf8'))
    })
    expect(bounced).toEqual([])
  })

  test('and the converse: the store-admin links are all still guarded', () => {
    // If one of these ever started opting out, it would belong in the worker list instead — and the
    // list above would be wrong without anything failing.
    const optedOut = STORE_ADMIN_PATHS.filter((navPath) => {
      const file = pageFor(navPath)
      return fs.existsSync(file) && /allow-non-admin|allowNonAdmin/.test(fs.readFileSync(file, 'utf8'))
    })
    expect(optedOut).toEqual([])
  })

  // THE CONVERSE WALK — the direction the original static half could not see.
  //
  // Every test above walks LINKS → PAGES: take what the sidebar offers and check the page honours it.
  // None of them can notice a page that no link points at, and that is how `/admin/workforce-rates`
  // and `/admin/training-courses` shipped: built, tested, wired, and reachable only by typing a URL.
  // A suite stays entirely green while that is true, because nothing ever asks the question.
  //
  // So this walks PAGES → LINKS. It is scoped by PREFIX rather than by a list of pages, which is what
  // makes it a rule instead of a snapshot: a sixth module page dropped into `pages/admin/` tomorrow is
  // covered the moment it is named, without anybody remembering to add it here. The prefixes are the
  // five restaurant modules — the legacy unlinked pages (`payouts`, `brev`, `dinehome`, `wolt-menu`,
  // `lang`, `wolt-calc`) are outside it and stay outside it; they are a separate, older question.
  // `feature-` is not a sixth module: it is the PLATFORM switchboard the six share
  // (`/admin/feature-flags`, the only caller of `PUT /stores/{id}/feature-flags`). It is inside the
  // rule because it is the page whose unlinking would be worst — every module surface above it
  // renders a module-off blocker until somebody flips a switch, and a switchboard reachable only by
  // typing a URL is the same defect this walk exists to catch, one level up.
  const MODULE_PAGE_PREFIXES = ['events-', 'feature-', 'growth-', 'margin-', 'meals-', 'training-', 'workforce-']

  const modulePages = () => adminPages(pagesDir)
    .map(file => path.basename(file, '.vue'))
    .filter(name => MODULE_PAGE_PREFIXES.some(prefix => name.startsWith(prefix)))

  test('THE CONVERSE WALK: every module page under pages/admin/ is offered by the sidebar', () => {
    // Compared against what the component RENDERS, not against `STORE_ADMIN_PATHS`. Using the pinned
    // list would make this test pass on a sidebar that had dropped the link, as long as the list still
    // named it — and the pinned list is maintained by hand, so that is not a hypothetical.
    //
    // A plain store admin and a pure worker between them see every non-role group there is, so a page
    // linked ONLY from the KAM or PowerUser group is unlinked as far as this test is concerned. That is
    // deliberate: a role group cannot be the answer for a page whose own guard is membership.
    const adminPaths = pathsOf(mountNav(admin))
    const workerPaths = pathsOf(mountNav(worker))

    const unlinked = modulePages().filter((name) => {
      const navPath = '/admin/' + name
      const optsOut = /allow-non-admin|allowNonAdmin/.test(fs.readFileSync(path.join(pagesDir, name + '.vue'), 'utf8'))
      // Offered to the right person, not merely offered: a page that opts out of the membership guard
      // belongs in the worker's group, and one that does not must be in a store-admin group — which is
      // exactly "the admin is offered it and the worker is not", since the worker's whole sidebar is
      // the one group they share.
      return optsOut
        ? !workerPaths.includes(navPath)
        : !(adminPaths.includes(navPath) && !workerPaths.includes(navPath))
    })
    expect(unlinked).toEqual([])
  })

  test('and the walk is not vacuous: the prefixes still match the module pages that exist', () => {
    // If a rename or a typo'd prefix ever empties `modulePages()`, the test above would pass by
    // checking nothing at all. Nine is what the five modules ship today; the assertion is a floor, so
    // adding a tenth does not need a number changed here.
    expect(modulePages().length).toBeGreaterThanOrEqual(9)
    expect(modulePages()).toContain('workforce-rates')
    expect(modulePages()).toContain('training-courses')
  })

  test('THE CONVERSE OF THE MOVE: no moved page asks for a role flag the sidebar no longer supplies', () => {
    // The move is only correct if the pages' own authorisation is membership and nothing else. If
    // either page ever starts reading `isPowerUser` — a role check the store-admin groups do not
    // satisfy — its link would be offered to managers it then refuses, and this fails instead.
    const roleChecking = MANAGER_MODULE_PATHS.filter(p => /isPowerUser|isKeyAccountManager/.test(fs.readFileSync(pageFor(p), 'utf8')))
    expect(roleChecking).toEqual([])
  })

  test('the admin surface is still the size the membership guard assumes', () => {
    expect(adminPages(pagesDir).length).toBeGreaterThan(40)
  })
})
