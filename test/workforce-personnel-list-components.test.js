import { mount } from '@vue/test-utils'
import translations from '~/translations'
import WorkforcePersonnelListSheet from '~/components/admin/workforce/WorkforcePersonnelListSheet.vue'
import { buildPersonnelSheet } from '~/utils/workforce/personnel-list'

// The sheet an inspector is handed, asserted as WORDS rather than as classes — because what is at
// stake on this surface is what it says, not how it looks.
//
// `$i` runs against the REAL dictionaries rather than an identity stub, so a key the component names
// but nobody translated fails here instead of shipping as a raw `wfpl_…` on a printed register.
function translator (locale) {
  return function $i (key, params) {
    const text = translations[locale][key]
    if (!text) { throw new Error('missing ' + locale + ' translation key: ' + key) }
    return params ? text.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : text
  }
}

const row = over => Object.assign({
  personnelListEntryId: 'entry-1',
  participantId: 'p-1',
  category: 'Employee',
  participantName: 'Kari Claimed',
  protectedIdentityCodeRef: 'wf-person:20000000-0000-0000-0000-000000000002',
  staffMemberId: 'sm-1',
  hiredInOrganizationNumber: null,
  businessName: 'Okam Pilot Servering AS',
  organizationNumber: '923456789',
  onSiteStartUtc: '2026-07-13T07:00:00',
  onSiteEndUtc: '2026-07-13T13:00:00',
  isPresent: false,
  supersedesEntryId: null,
  correctionActorReference: null,
  correctedAtUtc: null,
  retainUntilUtc: '2030-06-30T00:00:00'
}, over)

const response = over => Object.assign({
  storeId: 90001,
  businessDate: '2026-07-13T00:00:00',
  timeZoneId: 'Europe/Oslo',
  timeZoneIsFallback: false,
  asOfUtc: '2026-07-13T12:00:00Z',
  presentCount: 0,
  rows: [row()]
}, over)

function mountSheet (over, locale) {
  return mount(WorkforcePersonnelListSheet, {
    mocks: { $i: translator(locale || 'no') },
    propsData: { sheet: buildPersonnelSheet(response(over), { contextTimeZoneId: 'Europe/Oslo' }) }
  })
}

describe('the sheet states the § 8-5-6 header facts', () => {
  test('the workplace, the organisation number, the day and the zone are all on it', () => {
    const text = mountSheet().text()

    expect(text).toContain('Personalliste')
    expect(text).toContain('bokføringsforskriften § 8-5-6')
    expect(text).toContain('Arbeidssted')
    expect(text).toContain('Okam Pilot Servering AS')
    // Grouped the way a Norwegian organisation number is written, and only because it IS nine digits.
    expect(text).toContain('923 456 789')
    expect(text).toContain('2026-07-13')
    expect(text).toContain('Europe/Oslo')
  })

  test('a day whose entries name two businesses shows neither in the header, and says why', () => {
    const wrapper = mountSheet({
      rows: [row(), row({ personnelListEntryId: 'entry-2', businessName: 'Annen Drift AS', organizationNumber: '912345678' })]
    })

    expect(wrapper.find('.wfpl-sheet__identity').text()).not.toContain('Okam Pilot Servering AS')
    expect(wrapper.text()).toContain('2 ulike bokføringspliktige')
    // Both are still named, so the sheet is not merely silent about who the day belongs to.
    expect(wrapper.text()).toContain('Annen Drift AS')
  })

  test('a fallback zone is disclosed as a platform default, not presented as the venue\'s choice', () => {
    expect(mountSheet({ timeZoneIsFallback: true }).text()).toContain('plattformens standard')
    expect(mountSheet().text()).not.toContain('plattformens standard')
  })
})

// THE HONEST HALF. These are the assertions the whole surface exists for.
describe('the sheet never claims an identification it does not have', () => {
  test('the identity-code gap is printed on every sheet — with rows, without rows, and unread', () => {
    const gap = translations.no.wfpl_identity_gap

    expect(mountSheet().text()).toContain(gap)
    expect(mountSheet({ rows: [] }).text()).toContain(gap)
    // Including the state where the read failed: the reason the list cannot identify anybody does
    // not depend on whether today's read succeeded.
    expect(mount(WorkforcePersonnelListSheet, {
      mocks: { $i: translator('no') },
      propsData: { sheet: buildPersonnelSheet(null, {}) }
    }).text()).toContain(gap)
  })

  test('the notice names the condition the substitution depends on, and who has to meet it', () => {
    const gap = translations.no.wfpl_identity_gap

    // The paragraph permits codes INSTEAD of fødselsnummer only together with an overview mapping
    // them back. Since D-IDCODE (venue-procedure-template) that overview is PRODUCIBLE — Okam
    // downloads it pre-filled with the codes — but Okam still collects no fødselsnummer, so the
    // overview is only a template until the venue completes it. The sheet has to say all three
    // things, because the one that goes missing is always the venue's own obligation.
    expect(gap).toContain('fødselsnummer')
    expect(gap).toContain('oversikt')
    // 1. the system cannot resolve a code by itself
    expect(gap).toContain('kodene under kan ikke slås opp i et fødselsnummer i systemet')
    // 2. where the overview comes from
    expect(gap).toContain('Kodeoversikten for denne dagen lastes ned')
    // 3. whose duty it is to complete and keep it, and for how long
    expect(gap).toContain('Virksomheten fyller det inn og oppbevarer oversikten')
    expect(gap).toContain('tre år og seks måneder etter regnskapsårets slutt')
  })

  test('the sheet still refuses to call itself full identification on its own', () => {
    // The overview being producible must never read as the identification requirement being met on
    // this sheet: the completed overview is what meets it, and it lives with the venue.
    expect(translations.no.wfpl_identity_gap).toContain('ikke fullstendig identifikasjon')
  })

  test('nowhere does the sheet call itself compliant, complete or approved', () => {
    const text = mountSheet().text().toLowerCase()

    for (const claim of ['oppfyller kravene', 'i samsvar med', 'godkjent', 'fullstendig personalliste']) {
      expect(text).not.toContain(claim)
    }
  })

  test('the code is shown verbatim, so what is printed and what is stored are the same string', () => {
    expect(mountSheet().find('.wfpl-sheet__code').text()).toBe('wf-person:20000000-0000-0000-0000-000000000002')
  })

  test('a row with no code says so rather than leaving the cell blank', () => {
    expect(mountSheet({ rows: [row({ protectedIdentityCodeRef: null })] }).text()).toContain('Ingen kode ført')
  })
})

describe('arrival and departure, and the two readings of a missing departure', () => {
  test('both times are printed in the venue\'s clock', () => {
    const cells = mountSheet().findAll('.wfpl-sheet__time')
    expect(cells.at(0).text()).toBe('09:00')
    expect(cells.at(1).text()).toBe('15:00')
  })

  test('an open window on the venue\'s current day reads as a person on site', () => {
    const wrapper = mountSheet({ rows: [row({ onSiteEndUtc: null, isPresent: true })], presentCount: 1 })

    expect(wrapper.text()).toContain('Til stede nå')
    expect(wrapper.text()).toContain('1 er på arbeidsstedet nå')
  })

  test('the same window on a past day reads as a missing end time — never as a person standing there', () => {
    const wrapper = mountSheet({
      rows: [row({ onSiteEndUtc: null, isPresent: true })],
      presentCount: 1,
      asOfUtc: '2026-08-01T09:00:00Z'
    })

    expect(wrapper.text()).toContain('Ingen sluttid ført')
    expect(wrapper.text()).not.toContain('Til stede nå')
    expect(wrapper.text()).toContain('1 av dem har ingen sluttid ført')
  })

  test('a departure on the following calendar day names that day beside the time', () => {
    const wrapper = mountSheet({
      rows: [row({ onSiteStartUtc: '2026-07-13T20:30:00', onSiteEndUtc: '2026-07-14T00:10:00' })]
    })

    expect(wrapper.findAll('.wfpl-sheet__time').at(1).text()).toContain('neste dag, 2026-07-14')
  })
})

describe('the rest of the register', () => {
  test('a hired-in row shows the employer it is hired in from', () => {
    const wrapper = mountSheet({ rows: [row({ category: 'HiredIn', staffMemberId: null, hiredInOrganizationNumber: '912345678' })] })

    expect(wrapper.text()).toContain('Innleid')
    expect(wrapper.text()).toContain('Innleid fra org.nr. 912 345 678')
  })

  test('a correction shows who made it and when, as the paragraph requires', () => {
    const wrapper = mountSheet({
      rows: [row({ correctionActorReference: 'user:42', correctedAtUtc: '2026-07-13T15:20:00' })]
    })

    expect(wrapper.text()).toContain('Rettet av user:42 2026-07-13 17:20')
    expect(wrapper.text()).toContain('1 av oppføringene er rettet')
  })

  test('an unrecognised category is printed as the server spelled it', () => {
    expect(mountSheet({ rows: [row({ category: 'SomethingNew' })] }).text()).toContain('SomethingNew')
  })

  test('the retention horizon is stated', () => {
    expect(mountSheet().text()).toContain('oppbevares i Norge til 2030-06-30')
  })

  test('an empty day says nobody was registered; a failed read says we do not know', () => {
    expect(mountSheet({ rows: [] }).text()).toContain('Ingen er registrert på personallisten denne dagen.')

    const unread = mount(WorkforcePersonnelListSheet, {
      mocks: { $i: translator('no') },
      propsData: { sheet: buildPersonnelSheet(null, {}) }
    })
    expect(unread.text()).toContain('Vi fikk ikke lest personallisten')
    expect(unread.text()).not.toContain('Ingen er registrert')
  })

  test('a zone the browser cannot load withholds the times instead of showing the wrong clock', () => {
    const wrapper = mount(WorkforcePersonnelListSheet, {
      mocks: { $i: translator('no') },
      propsData: { sheet: buildPersonnelSheet(response({ timeZoneId: 'Mars/Olympus_Mons' }), {}) }
    })

    expect(wrapper.text()).toContain('Mars/Olympus_Mons')
    expect(wrapper.find('.wfpl-sheet__table').exists()).toBe(false)
  })

  test('the repeated print header carries the venue and the day, for page two of a long list', () => {
    // `thead` is the only block a browser repeats across printed pages. Without this row, sheet two
    // of a busy Saturday is a list of anonymous times.
    expect(mountSheet().find('.wfpl-sheet__repeat').text()).toBe('Okam Pilot Servering AS · 923 456 789 · 2026-07-13')
  })
})

describe('the three languages the sidebar actually offers', () => {
  ['no', 'en', 'de'].forEach((locale) => {
    test(`${locale}: every key the sheet names is translated, and the gap notice is on it`, () => {
      // The translator throws on a missing key, so mounting IS the assertion for coverage.
      const wrapper = mountSheet({
        rows: [
          row({ correctionActorReference: 'user:42', correctedAtUtc: '2026-07-13T15:20:00' }),
          row({ personnelListEntryId: 'e2', category: 'HiredIn', hiredInOrganizationNumber: '912345678', onSiteEndUtc: null, isPresent: true }),
          row({ personnelListEntryId: 'e3', participantName: null, protectedIdentityCodeRef: null, category: 'Unpaid', onSiteStartUtc: '2026-07-12T22:30:00' })
        ],
        presentCount: 1
      }, locale)

      expect(wrapper.text()).toContain(translations[locale].wfpl_identity_gap)
      expect(wrapper.text()).not.toMatch(/wfpl_[a-z_]+/)
    })
  })
})
