import { mount } from '@vue/test-utils'
import translations from '~/translations'
import WorkforcePersonnelListSheet from '~/components/admin/workforce/WorkforcePersonnelListSheet.vue'
import { CATEGORY_LABEL_KEYS, buildPersonnelSheet } from '~/utils/workforce/personnel-list'

const world = require('./e2e/fixture/world')

// THE PRINTED PERSONALLISTE MUST NOT ARGUE WITH THE CAVEAT PRINTED ON IT.
//
// The sheet carries a paragraph — `wfpl_category_gap` — that tells an inspector, in plain Norwegian,
// that this register can only ever record employees, and that a working owner, an unpaid helper or a
// hired-in worker who was on site "står vedkommende ikke her". The committed inspector-facing PDF
// nevertheless printed «Arbeidende eier eller leder» and «Innleid» two rows below that sentence,
// because the browser journey renders from `test/e2e/fixture/world.js` and a fixture is free to
// write what no service can. Nothing red: the caveat and the rows were checked by different tests,
// and neither knew about the other.
//
// WHAT THE PRODUCT CAN ACTUALLY WRITE, read out of the backend rather than taken on report:
//
//   • CATEGORY — one production site creates a participant at all,
//     `WorkforcePersonnelListProjection.ResolveOrCreateEmployeeParticipantAsync` (:203–:215), off an
//     employee's clock punch, and it assigns `WorkforcePersonnelParticipantCategory.Employee`
//     literally. `WorkingOwnerManager`, `Unpaid` and `HiredIn` are reachable from `WebApi.Tests`
//     only.
//   • HIRED-IN ORGANISATION NUMBER — never assigned outside `WebApi.Tests`; that one production site
//     leaves it null.
//   • CORRECTION — both entry writes (`WorkforcePersonnelListProjection` :117 open, :133 close) pass
//     `correctionActor: null, correctedAtUtc: null`, and `WorkforcePersonnelListController` exposes
//     a single read action. Nothing in the product can correct an entry, so nothing can name who
//     corrected one.
//
// This file is the frontend half of a pin the backend already had: its kodeoversikt test asserts
// every rendered row's category cell, so it cannot pass on a day whose rows say otherwise. The sheet
// had no equivalent.
//
// THE TRAP THIS FILE IS WRITTEN AGAINST. "Assert the excluded categories are absent" proves nothing
// on its own — a column that stopped rendering, a label lookup that returned an em dash, or a world
// with no rows at all would all satisfy it. So every absence assertion below is paired: the row
// count is checked before the rows are read, the cell count is checked against the row count, and
// `the sheet can still print all four` mounts each excluded category and proves the sheet renders it
// when handed one. The absences mean something only because the presences are demonstrable.

/** The single category any production caller writes. See the citation above. */
const RECORDABLE_CATEGORY = 'Employee'

const UNRECORDABLE_CATEGORIES = Object.keys(CATEGORY_LABEL_KEYS)
  .filter(category => category !== RECORDABLE_CATEGORY)

function translator (locale) {
  return function $i (key, params) {
    const text = translations[locale][key]
    if (!text) { throw new Error('missing ' + locale + ' translation key: ' + key) }
    return params ? text.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : text
  }
}

/**
 * Every personnel-list body the fixture API can answer with, named by the day it answers for.
 *
 * BOTH days, because the world builds the sheet relative to now: `null` is the venue's today (an
 * open window reads "til stede nå") and a past date is the other reading ("ingen avgang
 * registrert"). A guard that only looked at today would leave the other half of the world unpinned.
 */
function servedDays () {
  // Tuples rather than objects: on Jest 26 `%s` is the only interpolation `test.each` honours, and a
  // guard whose failure does not name the day it failed on is a guard somebody has to re-derive.
  // The label is consumed by the test NAME, which is why each case takes it as `_label`.
  return [
    ['the venue\'s today', world.personnelList(world.STORE_ID, null)],
    ['a past business day', world.personnelList(world.STORE_ID, '2026-07-13')]
  ]
}

function mountFromWorld (response, locale) {
  return mount(WorkforcePersonnelListSheet, {
    mocks: { $i: translator(locale || 'no') },
    propsData: { sheet: buildPersonnelSheet(response, { contextTimeZoneId: world.TIME_ZONE }) }
  })
}

describe('the world the inspector PDF is printed from holds only rows the product can write', () => {
  test.each(servedDays())('%s serves rows, and every one of them is an Employee row', (_label, response) => {
    // Checked BEFORE the categories are: an empty day would pass every assertion below it while
    // proving nothing at all about what this world prints.
    expect(response.rows.length).toBeGreaterThan(0)

    expect(response.rows.map(row => row.category)).toEqual(
      response.rows.map(() => RECORDABLE_CATEGORY)
    )
  })

  test.each(servedDays())('%s claims no hired-in organisation number, which the product never assigns', (_label, response) => {
    expect(response.rows.length).toBeGreaterThan(0)
    expect(response.rows.filter(row => row.hiredInOrganizationNumber)).toEqual([])
  })

  test.each(servedDays())('%s claims no correction, which no write path in the product can name', (_label, response) => {
    expect(response.rows.length).toBeGreaterThan(0)
    // EITHER field makes the sheet render a correction note, so both are pinned.
    expect(response.rows.filter(row => row.correctionActorReference || row.correctedAtUtc)).toEqual([])
  })
})

describe('the printed register agrees with the caveat printed above it', () => {
  test.each(servedDays())('%s renders «Ansatt» in every relationship cell, under the caveat that says it must', (_label, response) => {
    const wrapper = mountFromWorld(response)

    // The caveat is the claim being checked. Without it on the page there is nothing to agree with,
    // and this test would be pinning the world for no stated reason.
    expect(wrapper.find('.wfpl-sheet__coverage').text()).toContain('bare føre ansatte')

    const rows = wrapper.findAll('.wfpl-sheet__table tbody tr')
    // The cell count is asserted against the ROW count, not against a literal: a relationship column
    // that stopped rendering would otherwise satisfy "no excluded category appears" perfectly.
    expect(rows.length).toBe(response.rows.length)

    const cells = rows.wrappers.map(rowWrapper => rowWrapper.findAll('td').at(2).text().trim())
    expect(cells).toEqual(response.rows.map(() => translations.no.wfpl_cat_employee))
  })

  test.each(servedDays())('%s prints no hired-in line and no correction line in the note column', (_label, response) => {
    const wrapper = mountFromWorld(response)

    expect(wrapper.findAll('.wfpl-sheet__note-line').length).toBe(0)
    // The footer's correction tally is the other place a correction surfaces. `wfpl_corrections`
    // carries a `{count}` placeholder, so the literal prefix is what a rendered line would contain.
    expect(wrapper.find('.wfpl-sheet__foot').text()).not.toContain('av oppføringene er rettet')
  })

  // THE POSITIVE CONTROL for all of the above. If the sheet simply could not print these words, the
  // absence assertions would be measuring the component's incapacity rather than the world's
  // honesty — and would keep passing on the day the fixture regains an impossible row.
  test.each(UNRECORDABLE_CATEGORIES)('the sheet can still print %s when it is handed one', (category) => {
    const day = servedDays()[0][1]
    const impossible = Object.assign({}, day, {
      rows: [Object.assign({}, day.rows[0], { category })]
    })

    const wrapper = mountFromWorld(impossible)
    const label = translations.no[CATEGORY_LABEL_KEYS[category]]

    expect(wrapper.findAll('.wfpl-sheet__table tbody tr').at(0).findAll('td').at(2).text().trim()).toBe(label)
    // And that is precisely what the caveat on the same page denies — which is the disagreement this
    // file exists to catch.
    expect(wrapper.find('.wfpl-sheet__coverage').text().toLowerCase()).toContain(label.toLowerCase())
  })
})

describe('the caveat names every relationship the column is able to print', () => {
  // A fifth value added to `CATEGORY_LABEL_KEYS` is a fifth value on a statutory register. The
  // caveat enumerates the column in prose — "fire verdier — ansatt, arbeidende eier eller leder,
  // ulønnet og innleid" — and a value the prose does not name is a value the inspector is not told
  // about. All three shipped languages, because the sheet prints in whichever one the venue reads.
  test.each(['no', 'en', 'de'])('%s: the caveat enumerates all of them', (locale) => {
    const caveat = translations[locale].wfpl_category_gap.toLowerCase()

    for (const key of Object.values(CATEGORY_LABEL_KEYS)) {
      expect(caveat).toContain(translations[locale][key].toLowerCase())
    }
  })
})
