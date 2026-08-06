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
// renders.
//
// TWO RULINGS ARE RECORDED IN THIS ORDER, and the second only makes sense against the first:
//
//   1. The module links were moved OUT of Menu / Sales / Administration into one `Moduler` group by
//      the owner's instruction — filed by subject matter they were correct and unfindable, and the
//      six restaurant modules are the surfaces under active acceptance.
//   2. That single group was split into SIX, one per module, once it had grown to 22 links: one list
//      of 22 is the same unscannable wall as five scattered ones. Ruling 1 survives — nothing went
//      back to Menu or Sales — so the only thing that changed is which heading a link sits under and
//      therefore the order below. The module block is now ordered by how finished each module is,
//      best first: Margin, Workforce, Training, Events, Growth, Meals.
//
// Neither ruling moved a link across the `showsStoreAdminNav` boundary, which is why this list has
// exactly the same MEMBERS after the split as before it — only their positions changed. The
// `MODULE GROUPING` block at the bottom of this file asserts that membership property directly, as a
// set comparison, so a future reorder cannot quietly drop or add a path while looking like a reorder.
const STORE_ADMIN_PATHS = [
  '/admin', '/admin/ongoing', '/admin/orders', '/admin/statistics',
  // The switchboard, now last in Operations rather than last in the modules group. It is not a
  // module — it governs all six — so it cannot sit inside any one of them without reading as that
  // module's own setting, and a seventh group whose heading and only row say the same word earns
  // nothing. Here it lands immediately above the six groups it governs. Each module gates its writes
  // on deny-closed per-store flags, and until this page existed the only way to move one was a curl
  // against `PUT /stores/{id}/feature-flags`. Store-admin gated like its siblings.
  '/admin/feature-flags',
  // ── Margin ──
  '/admin/margin-recipes', '/admin/margin-suppliers', '/admin/margin-price-imports',
  '/admin/margin-statements',
  // ── Workforce ──
  '/admin/workforce-schedule', '/admin/workforce-requests', '/admin/workforce-roster',
  // The role catalogue, between the roster and the rates. `PUT /workforce/stores/{id}/roles` (#9)
  // was live on the wire with no caller in any browser, and the roster client recorded the omission
  // as "a screen of its own" that was never built — so a store nobody had seeded by curl had an
  // EMPTY ROLE AXIS in the schedule's shift editor, on the rates page's role scope, and on the
  // engagement panel, which printed "no roles defined" beside no way to define one. Store-admin
  // gated like its siblings; the write itself is WorkforceManager and the page renders its own
  // refusal when that grant is withheld, while still showing the list the read (WorkforceScheduler)
  // does return.
  '/admin/workforce-roles',
  '/admin/workforce-rates', '/admin/workforce-personnel-list',
  // What a publication actually reached. The publish button answers with a recipient COUNT — how
  // many outbox rows were enqueued, not how many arrived — so until this page existed the only
  // account of a schedule that reached nobody was `GET .../schedules/notification-failures` read
  // with a bearer token and curl. Store-admin gated like its siblings; the read itself is
  // `WorkforceManager` and the page renders its own refusal when that grant is withheld.
  '/admin/workforce-delivery',
  // Who a published week actually reached — endpoints #21 and #22. The delivery report above says
  // what the outbox could not get OUT; this says what came BACK from the people it did reach, which
  // is the only thing a venue asked to show that it rostered somebody can actually produce. Both
  // endpoints were bound to nothing before this page: `GetPublicationHistory` sat in the client with
  // zero callers, and the recipients route had no client method at all. Store-admin gated like its
  // siblings; the history read is `WorkforceScheduler` and the recipient roster `WorkforceManager`,
  // and the page renders a separate refusal for each.
  '/admin/workforce-publications',
  // The payroll batch — endpoints #27, #28, #29 plus the two reads beside them. On this list rather
  // than in a role group for the same reason every module page is: the sidebar's audience is
  // store-admin, and the page renders its own refusal when the backend withholds
  // `WorkforcePayrollApprover` — which gates the WHOLE surface here, reads included, because a
  // timesheet line is the wage record and there is nothing left to partially withhold.
  '/admin/workforce-timesheets',
  // ── Training ──
  '/admin/training-courses',
  // Training's second surface: one person's assembled record, endpoint #16. Store-admin gated like
  // the courses page beside it — the evidence read resolves `RequireStoreAdminAsync` — and it is on
  // this list rather than in a role group for the same reason every module page is.
  '/admin/training-evidence',
  // ── Events ──
  '/admin/events-pipeline',
  // ── Growth ──
  '/admin/growth-newsletter',
  // Growth's other half, beside the newsletter link. The guest is told on screen that this venue
  // answers a privacy request within one month (GDPR art. 12); the two routes that let anybody answer
  // had no caller in this app at all, so the promise was printed on one surface and keepable on none.
  '/admin/growth-privacy',
  // ── Meals ──
  '/admin/meals-agreements', '/admin/meals-companies',
  // The third Meals link: the month statement, endpoints #19–#23. It is on this list rather than in
  // a role group because draft and finalize are `RequireStoreAdminAsync` — the venue's own acts — so
  // the audience the sidebar offers it to is the audience the API admits.
  '/admin/meals-statements',
  '/admin/products', '/admin/categories', '/admin/allergens', '/admin/import',
  '/admin/delivery', '/admin/wolt',
  '/admin/kravia-invoice', '/admin/rewards', '/admin/discounts',
  '/admin/payment', '/admin/settlements', '/admin/terminals',
  '/admin/customers', '/admin/employees'
]

// The `nav_group_me` group: the pages about the SIGNED-IN PERSON rather than about a store, and the
// only group not gated on store-admin membership. Both opt out of the store-admin guard, which the
// invariant below checks rather than assumes.
//
// `/admin/account-email` is the account's own address and the confirmation of it. It is here because
// the newsletter test-send now requires the acting administrator's address to be CONFIRMED
// (markedsføringsloven § 15), and until it existed the only UI call site for either confirmation
// route in the whole estate was the consumer app — so an administrator refused by an admin screen had
// nowhere in admin to go about it. It takes no store id and a worker has an account address like
// anybody else, so it is offered to both audiences.
const WORKER_PATHS = ['/admin/workforce-me', '/admin/account-email']

// The links this file's `MANAGER-REACHABLE` tests are about — the ones a manager could not reach by
// navigating — named once so the assertions below cannot drift apart from each other. The decision
// inbox joins them: without a sidebar entry the only surface that can approve anything is
// unreachable, which is the exact failure this list exists to prevent.
const MANAGER_MODULE_PATHS = [
  '/admin/workforce-schedule', '/admin/workforce-requests', '/admin/workforce-roster', '/admin/workforce-rates',
  // The role catalogue is a manager surface like the four beside it: the write is WorkforceManager,
  // and the roster, the rates and the schedule all pivot on the axis it authors.
  '/admin/workforce-roles',
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

  test('a pure worker is offered only the pages that are about them', () => {
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

// MODULE GROUPING. The single `Moduler` group had grown to 22 links and become the same unscannable
// wall it was created to fix, so it was split into six groups, one per module. Everything below is
// about that split, and it is written to fail on the two ways such a split silently goes wrong:
// a link quietly leaving the sidebar while the reorder hides it, and a link quietly changing
// audience while the paths still all look present.
describe('the six module groups', () => {
  // Declared here rather than derived from the component, for the same reason `STORE_ADMIN_PATHS` is:
  // a mapping read back out of the thing it is meant to pin is a mapping equal to itself. The ORDER
  // is part of the assertion — by how finished each module is, best first, which is the order an
  // owner verifying the product should meet them in. Meals is last because it is the one module that
  // cannot yet be walked end to end.
  const MODULE_GROUPS = [
    ['nav_group_module_margin', [
      '/admin/margin-recipes', '/admin/margin-suppliers', '/admin/margin-price-imports',
      '/admin/margin-statements'
    ]],
    ['nav_group_module_workforce', [
      '/admin/workforce-schedule', '/admin/workforce-requests', '/admin/workforce-roster',
      '/admin/workforce-roles', '/admin/workforce-rates', '/admin/workforce-personnel-list',
      '/admin/workforce-delivery', '/admin/workforce-publications', '/admin/workforce-timesheets'
    ]],
    ['nav_group_module_training', ['/admin/training-courses', '/admin/training-evidence']],
    ['nav_group_module_events', ['/admin/events-pipeline']],
    ['nav_group_module_growth', ['/admin/growth-newsletter', '/admin/growth-privacy']],
    ['nav_group_module_meals', [
      '/admin/meals-agreements', '/admin/meals-companies', '/admin/meals-statements'
    ]]
  ]

  // The 21 module links plus the switchboard. Named once so the "same links, different headings"
  // test below cannot drift away from the mapping above it.
  const MODULE_PATHS = MODULE_GROUPS.reduce((acc, [, paths]) => acc.concat(paths), [])
  const SWITCHBOARD = '/admin/feature-flags'

  const groupsFor = user => mountNav(user).vm.navGroups
  const titled = (groups, title) => groups.find(g => g.title === title)

  test('each module has a heading of its own, in finished-first order, holding exactly its own pages', () => {
    const groups = groupsFor(admin)
    const moduleTitles = groups.map(g => g.title).filter(t => t.startsWith('nav_group_module_'))
    expect(moduleTitles).toEqual(MODULE_GROUPS.map(([title]) => title))

    MODULE_GROUPS.forEach(([title, paths]) => {
      expect([title, titled(groups, title).items.map(i => i.path)]).toEqual([title, paths])
    })
  })

  test('the six headings are contiguous and sit immediately after Operations', () => {
    // Not decoration: the modules being adjacent is what survived of the original ruling. Scattering
    // the six back through Menu, Sales and Administration would satisfy every other test in this
    // block while undoing the decision the owner made in the first place.
    const titles = groupsFor(admin).map(g => g.title)
    const first = titles.indexOf('nav_group_module_margin')
    expect(titles[first - 1]).toBe('nav_group_operations')
    expect(titles.slice(first, first + 6)).toEqual(MODULE_GROUPS.map(([title]) => title))
  })

  test('THE SPLIT MOVED NOTHING: the same 22 links are offered, under six headings instead of one', () => {
    // The property the whole change rests on. Compared as SETS, so a reordering cannot mask a link
    // that was dropped on the way — the ordered `toEqual` at the top of this file pins position, and
    // this pins membership, and it takes both to catch both mistakes.
    const offered = pathsOf(mountNav(admin))
    const inModuleBlock = offered.filter(p => MODULE_PATHS.includes(p) || p === SWITCHBOARD)
    expect(inModuleBlock.slice().sort()).toEqual(MODULE_PATHS.concat(SWITCHBOARD).slice().sort())
    expect(inModuleBlock.length).toBe(22)
  })

  test('AND MOVED NOBODY: every one of the 22 is still store-admin only, and still not role-gated', () => {
    // Grouping is presentation. If the split had widened anything, a worker — the audience these
    // pages bounce — would now be offered one of them, and if it had narrowed anything, the
    // unresolved user would see fewer links than the admin and the sidebar would flicker.
    const workerPaths = pathsOf(mountNav(worker))
    MODULE_PATHS.concat(SWITCHBOARD).forEach(p => expect(workerPaths).not.toContain(p))
    expect(pathsOf(mountNav(notYetKnown))).toEqual(pathsOf(mountNav(admin)))

    const powerUser = { id: 9, adminIn: [{ id: 7 }], isPowerUser: true, isKeyAccountManager: true }
    const gated = groupsFor(powerUser).reduce((acc, g) => acc.concat(g.role ? g.items.map(i => i.path) : []), [])
    MODULE_PATHS.concat(SWITCHBOARD).forEach(p => expect(gated).not.toContain(p))
  })

  test('NYHET SURVIVES: the badge stayed on every link and did not move to a heading', () => {
    // The owner asked for the split and asked to KEEP the badge — it is how he knows what is new. A
    // heading-level badge would go stale the moment one link in a group stopped being new, so the
    // group object is checked to carry no badge of its own as well.
    const groups = groupsFor(admin)
    const badged = groups
      .reduce((acc, g) => acc.concat(g.items), [])
      .filter(i => i.isNew)
      .map(i => i.path)
    MODULE_PATHS.concat(SWITCHBOARD).forEach(p => expect(badged).toContain(p))
    MODULE_GROUPS.forEach(([title]) => expect(titled(groups, title).isNew).toBeUndefined())
  })

  test('THE SWITCHBOARD IS NOT A SEVENTH MODULE: it is last in Operations, above all six', () => {
    // `/admin/feature-flags` governs every module rather than belonging to one, so it is filed with
    // the operational screens and placed last there — immediately above the groups it switches.
    const groups = groupsFor(admin)
    const operations = titled(groups, 'nav_group_operations').items.map(i => i.path)
    expect(operations[operations.length - 1]).toBe(SWITCHBOARD)
    MODULE_GROUPS.forEach(([title]) => {
      expect([title, titled(groups, title).items.map(i => i.path)]).not.toContain(SWITCHBOARD)
    })
  })

  test('a worker is offered none of the six headings, not even an empty one', () => {
    expect(groupsFor(worker).map(g => g.title)).toEqual(['nav_group_me'])
  })

  Object.keys(DICTIONARIES).forEach((locale) => {
    test(`HEADINGS (${locale}): translated, and never a repeat of a link inside the same group`, () => {
      // A heading that says exactly what the row beneath it says is a heading that earns nothing —
      // which is a live risk here, because 'Opplæring', 'Selskap', 'Personvern' and 'Bedriftsmat' are
      // all both a module and a page. A key-returning `$i` cannot see this, so it mounts for real.
      const groups = mountNav(admin, DICTIONARIES[locale]).vm.navGroups
      const moduleGroups = groups.filter(g => g.items.some(i => MODULE_PATHS.includes(i.path)))
      expect(moduleGroups.length).toBe(6)

      moduleGroups.forEach((group) => {
        expect([locale, group.title.startsWith('nav_')]).toEqual([locale, false])
        expect([locale, group.title, group.items.map(i => i.label).includes(group.title)])
          .toEqual([locale, group.title, false])
      })
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
