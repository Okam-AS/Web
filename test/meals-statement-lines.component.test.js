import { mount } from '@vue/test-utils'
import MealsStatementLines from '~/components/admin/meals/MealsStatementLines.vue'
import { readStatement } from '~/utils/meals/statement-view'

// A MONTH STATEMENT IS A DOCUMENT SOMEBODY IS ASKED TO AGREE WITH, so these tests assert what the
// figures SAY, not that a table appeared. Every fixture goes through the real `readStatement`, so an
// assertion here is an assertion about the whole read-and-render path rather than about a hand-built
// view model that could drift from the one the page actually builds.
//
// The money mock stands in for the global mixin's core formatter and is deliberately trivial and
// SIGN-BLIND: a component that scaled, re-summed or absolute-valued a minor amount on its way to the
// formatter shows it here instead of being hidden behind a smarter fake.
const mocks = {
  $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
  priceLabel: minor => 'kr ' + minor
}

const DASH = '—'

function line (overrides) {
  return Object.assign({
    statementLineId: 'sl-1',
    allocationId: 'alloc-1',
    kind: 'Capture',
    orderId: 'ord-1',
    sourceReceiptNumber: '2026-000841',
    memberDisplayRef: 'ANS-4417',
    currency: 'NOK',
    grossMinor: 24900,
    netMinor: 19920,
    vatMinor: 4980,
    orderOccurredAtUtc: '2026-07-14T11:02:00'
  }, overrides || {})
}

function payload (overrides, lines) {
  return {
    summary: Object.assign({
      statementRunId: 'run-9',
      companyId: 'co-1',
      storeId: 42,
      currency: 'NOK',
      periodYear: 2026,
      periodMonth: 7,
      status: 'Finalized',
      lineCount: lines === undefined ? 1 : lines.length,
      totalGrossMinor: 24900,
      totalNetMinor: 19920,
      totalVatMinor: 4980,
      contentHash: 'sha256:8f21ac',
      revision: 'AAAAAAAAB9k=',
      finalizedAtUtc: '2026-08-01T06:00:00',
      createdAtUtc: '2026-07-31T22:00:00'
    }, overrides || {}),
    lines: lines === undefined ? [line()] : lines
  }
}

function render (overrides, lines, currency) {
  return mount(MealsStatementLines, {
    mocks,
    propsData: {
      statement: readStatement(payload(overrides, lines)),
      currency: currency === undefined ? 'NOK' : currency
    }
  })
}

const textOf = (w, test) => w.find('[data-test="' + test + '"]').text()

describe('the month statement a venue hands to a buyer', () => {
  test('the three totals on screen are the ones the server stated, to the øre', () => {
    const w = render()
    expect(textOf(w, 'meals-statement-total-gross')).toBe('kr 24900')
    expect(textOf(w, 'meals-statement-total-net')).toBe('kr 19920')
    expect(textOf(w, 'meals-statement-total-vat')).toBe('kr 4980')
  })

  // The totals are the SERVER's and are never re-derived from the lines. A statement whose lines do
  // not add up to its totals still shows the server's totals, because those are the figures the
  // `contentHash` covers and the ones the buyer's copy of the document carries.
  test('a total is never recomputed from the lines it is shown above', () => {
    const w = render({ totalGrossMinor: 1000000 }, [line(), line({ statementLineId: 'sl-2' })])
    expect(textOf(w, 'meals-statement-total-gross')).toBe('kr 1000000')
  })

  test('the operator can read the period, the run and the line count off the document', () => {
    const w = render()
    expect(textOf(w, 'meals-statement-period')).toBe('2026-07')
    expect(textOf(w, 'meals-statement-run-id')).toBe('run-9')
    expect(textOf(w, 'meals-statement-line-count')).toBe('1')
  })

  // The two preconditions a finalize sends. They are on screen so an operator refused for a stale
  // hash can see that the one they were shown changed.
  test('the signature and the row version the venue signed at are both printed', () => {
    const w = render()
    expect(textOf(w, 'meals-statement-content-hash')).toBe('sha256:8f21ac')
    expect(textOf(w, 'meals-statement-revision')).toBe('AAAAAAAAB9k=')
    expect(textOf(w, 'meals-statement-finalized-at')).toBe('2026-08-01T06:00:00')
  })

  test('a run that has never been finalized shows no finalization date at all', () => {
    const w = render({ status: 'Draft', finalizedAtUtc: null })
    expect(w.find('[data-test="meals-statement-finalized-at"]').exists()).toBe(false)
  })
})

describe('the member reference on a line, which is read and never derived', () => {
  test('the reference the company supplied is what an accountant reads on the bill', () => {
    const w = render(null, [line({ memberDisplayRef: 'ANS-4417' })])
    expect(textOf(w, 'meals-statement-member-ref')).toBe('ANS-4417')
  })

  // THE ASSERTION THIS SURFACE EXISTS FOR. A line carries no other member identifier, so a page that
  // filled the gap with the nearest available id would be printing an attribution the server never
  // made — and it would look identical on screen to one it did.
  test('a line the server sent no reference for shows the unknown mark, never the allocation id', () => {
    const w = render(null, [line({ memberDisplayRef: null, allocationId: 'alloc-77', orderId: 'ord-88' })])
    const shown = textOf(w, 'meals-statement-member-ref')
    expect(shown).toBe(DASH)
    expect(shown).not.toContain('alloc-77')
    expect(shown).not.toContain('ord-88')
  })

  // The no-reference case over the wire IS the bare membership id as the value. It is printed as
  // given: it is what the buyer's accountant will have to reconcile against.
  test('a bare membership id supplied as the reference is printed as supplied', () => {
    const w = render(null, [line({ memberDisplayRef: '7c1f9a20-0000-4000-8000-000000000001' })])
    expect(textOf(w, 'meals-statement-member-ref')).toBe('7c1f9a20-0000-4000-8000-000000000001')
  })

  test('a reference that arrived as blank space is unknown, not an empty column', () => {
    const w = render(null, [line({ memberDisplayRef: '   ' })])
    expect(textOf(w, 'meals-statement-member-ref')).toBe(DASH)
  })
})

describe('a line as a bookkeeping row', () => {
  test('a capture line shows its receipt, its date and its three figures', () => {
    const w = render()
    const cells = w.findAll('[data-test="meals-statement-line"] td')
    expect(textOf(w, 'meals-statement-kind')).toBe('mlst_kind_capture')
    expect(cells.at(2).text()).toBe('2026-000841')
    expect(cells.at(3).text()).toBe('2026-07-14T11:02:00')
    expect(cells.at(4).text()).toBe('kr 24900')
    expect(cells.at(5).text()).toBe('kr 19920')
    expect(cells.at(6).text()).toBe('kr 4980')
  })

  // A reversal is a real, negative row. It is not an error and it is not filtered out — a buyer
  // disputing a bill needs to see the credit that was already applied.
  test('a reversal is named as one and keeps the minus in front of its figures', () => {
    const w = render(null, [line({
      statementLineId: 'sl-r', kind: 'Reversal', grossMinor: -24900, netMinor: -19920, vatMinor: -4980
    })])
    expect(textOf(w, 'meals-statement-kind')).toBe('mlst_kind_reversal')
    const cells = w.findAll('[data-test="meals-statement-line"] td')
    expect(cells.at(4).text()).toBe('kr -24900')
    expect(cells.at(5).text()).toBe('kr -19920')
  })

  test('a kind the client has no word for is shown as the server sent it', () => {
    const w = render(null, [line({ kind: 'Adjustment' })])
    expect(textOf(w, 'meals-statement-kind')).toBe('Adjustment')
  })

  test('a figure the server did not state is a dash and can never be misread as zero', () => {
    const w = render(null, [line({ grossMinor: null, vatMinor: undefined })])
    const cells = w.findAll('[data-test="meals-statement-line"] td')
    expect(cells.at(4).text()).toBe(DASH)
    expect(cells.at(6).text()).toBe(DASH)
  })

  test('an amount of exactly zero is shown as zero, because zero is an answer', () => {
    const w = render(null, [line({ vatMinor: 0 })])
    expect(w.findAll('[data-test="meals-statement-line"] td').at(6).text()).toBe('kr 0')
  })

  test('a receipt number the statement never carried leaves a dash, not a blank cell', () => {
    const w = render(null, [line({ sourceReceiptNumber: null, orderOccurredAtUtc: null })])
    const cells = w.findAll('[data-test="meals-statement-line"] td')
    expect(cells.at(2).text()).toBe(DASH)
    expect(cells.at(3).text()).toBe(DASH)
  })

  test('a statement with no lines says so instead of showing an empty table', () => {
    const w = render({ lineCount: 0 }, [])
    expect(w.find('[data-test="meals-statement-empty"]').exists()).toBe(true)
    expect(w.find('[data-test="meals-statement-lines"]').exists()).toBe(false)
  })

  test('every line the server sent gets a row', () => {
    const w = render(null, [line(), line({ statementLineId: 'sl-2' }), line({ statementLineId: 'sl-3' })])
    expect(w.findAll('[data-test="meals-statement-line"]').length).toBe(3)
  })
})

// A WRONG SYMBOL IS A WRONG AMOUNT. Money the API priced in a currency other than the one this
// admin's formatter prints is rendered with its ISO code beside it.
describe('money the venue did not price in its own currency', () => {
  test('a line in another currency carries that currency code beside the figure', () => {
    const w = render(null, [line({ currency: 'CHF', grossMinor: 2490 })])
    expect(w.findAll('[data-test="meals-statement-line"] td').at(4).text()).toBe('kr 2490 CHF')
  })

  test('a line in the venue\'s own currency carries no code', () => {
    const w = render(null, [line({ currency: 'NOK' })])
    expect(w.findAll('[data-test="meals-statement-line"] td').at(4).text()).toBe('kr 24900')
  })

  // With no market currency to compare against, the component cannot claim a mismatch, so it does
  // not append a code it has not established is different.
  test('an admin whose own currency is unknown is not told the figure is foreign', () => {
    const w = render(null, [line({ currency: 'CHF' })], null)
    expect(w.findAll('[data-test="meals-statement-line"] td').at(4).text()).toBe('kr 24900')
  })
})

describe('the status the operator is looking at', () => {
  test('a finalized run is badged as frozen', () => {
    const w = render({ status: 'Finalized' })
    expect(textOf(w, 'meals-statement-status')).toBe('mlst_status_finalized')
    expect(w.find('[data-test="meals-statement-status"]').classes()).toContain('mls-badge--on')
  })

  test('a draft is badged as still open, so nobody reads it as the closed month', () => {
    const w = render({ status: 'Draft', finalizedAtUtc: null })
    expect(textOf(w, 'meals-statement-status')).toBe('mlst_status_draft')
    expect(w.find('[data-test="meals-statement-status"]').classes()).toContain('mls-badge--warn')
  })

  test('a status the client has no word for is shown verbatim rather than guessed at', () => {
    const w = render({ status: 'Superseded', finalizedAtUtc: null })
    expect(textOf(w, 'meals-statement-status')).toBe('Superseded')
  })

  test('a run that arrived with no status at all reads as unknown, not as a blank badge', () => {
    const w = render({ status: null, finalizedAtUtc: null })
    expect(textOf(w, 'meals-statement-status')).toBe(DASH)
  })

  test('a line that arrived with no kind reads as unknown, not as a blank cell', () => {
    const w = render(null, [line({ kind: null })])
    expect(textOf(w, 'meals-statement-kind')).toBe(DASH)
  })
})

// A DISAGREEMENT BETWEEN THE STATED AND THE DELIVERED LINE COUNT MEANS THE PAYLOAD WAS TRUNCATED,
// and the totals on screen then belong to rows nobody can see. It is surfaced, not smoothed.
describe('a payload that does not carry all the lines it claims', () => {
  test('the operator is told both numbers when the server sent fewer lines than it stated', () => {
    const w = render({ lineCount: 9 }, [line(), line({ statementLineId: 'sl-2' })])
    expect(textOf(w, 'meals-statement-count-mismatch'))
      .toBe('mlst_count_mismatch:{"stated":9,"rendered":2}')
  })

  test('a statement whose counts agree raises no alarm', () => {
    const w = render({ lineCount: 2 }, [line(), line({ statementLineId: 'sl-2' })])
    expect(w.find('[data-test="meals-statement-count-mismatch"]').exists()).toBe(false)
  })

  // An unstated count is UNKNOWN. The component cannot compare against a number it was never given,
  // so it says nothing rather than accusing the payload of being short.
  test('a statement that stated no count at all is not accused of being truncated', () => {
    const w = render({ lineCount: null }, [line()])
    expect(w.find('[data-test="meals-statement-count-mismatch"]').exists()).toBe(false)
    expect(textOf(w, 'meals-statement-line-count')).toBe(DASH)
  })

  test('a statement that stated lines and delivered none is called out, not shown as empty only', () => {
    const w = render({ lineCount: 4 }, [])
    expect(textOf(w, 'meals-statement-count-mismatch'))
      .toBe('mlst_count_mismatch:{"stated":4,"rendered":0}')
    expect(w.find('[data-test="meals-statement-empty"]').exists()).toBe(true)
  })
})
