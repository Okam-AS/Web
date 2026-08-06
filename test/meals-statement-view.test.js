import {
  readLine,
  readSummary,
  readStatement,
  statementRefusal,
  UNKNOWN_MARK
} from '~/utils/meals/statement-view'

// The member reference is the only thing on a statement line that a page could plausibly INVENT, and
// inventing it would be invisible: a bill naming the wrong person still looks like a bill. So these
// tests are written to fail on a plausible wrong answer rather than on an absent one.
//
// Every payload below is built so the correct value is UNREACHABLE by any other route through it —
// the reference shares no prefix, no length and no alphabet with the line's own ids. An assertion
// that only checked "not blank" would pass over `stl-…`, `alc-…` and `ord-…` alike, which is exactly
// the class of assertion this file refuses to contain.
//
// `ANS-2287` and the membership GUID are the strings L-MEALS-EMPREF's SQL tier put on a FINALIZED
// line, so this suite and the proven backend behaviour name the same values.
const MEMBERSHIP_B = '4b050000-0000-0000-0000-000000000002'
const REFERENCE_A = 'ANS-2287'

const lineWithReference = () => ({
  statementLineId: 'stl-2026-06-0001',
  allocationId: 'alc-2026-06-0001',
  kind: 'Capture',
  orderId: 'ord-2026-06-0117',
  sourceReceiptNumber: 'K-2026-000117',
  memberDisplayRef: REFERENCE_A,
  grossMinor: 18900,
  netMinor: 17182,
  vatMinor: 1718,
  currency: 'NOK',
  orderOccurredAtUtc: '2026-06-04T11:12:04Z',
  linkedFinalizedStatementRunId: null
})

// The other half of the rule: a membership whose invitation carried no employee reference bills as
// its bare id, permanently. That is not a missing value and must never render as one.
const lineWithoutReference = () => Object.assign(lineWithReference(), {
  statementLineId: 'stl-2026-06-0002',
  allocationId: 'alc-2026-06-0002',
  orderId: 'ord-2026-06-0140',
  sourceReceiptNumber: 'K-2026-000140',
  memberDisplayRef: MEMBERSHIP_B
})

describe('readLine — the member reference is read, never derived', () => {
  test('the company-supplied reference is printed exactly, and equals nothing else on the line', () => {
    const line = readLine(lineWithReference())
    expect(line.memberDisplayRef).toBe(REFERENCE_A)
    // The discrimination, spelled out: every other identifier the same payload carries is a
    // DIFFERENT string, so rendering the right one cannot be an accident of picking any field.
    expect(line.memberDisplayRef).not.toBe(line.statementLineId)
    expect(line.memberDisplayRef).not.toBe(line.allocationId)
    expect(line.memberDisplayRef).not.toBe(line.orderId)
    expect(line.memberDisplayRef).not.toBe(line.sourceReceiptNumber)
    expect(line.hasMemberRef).toBe(true)
  })

  test('a membership with no employee reference bills as its bare id, and that IS the value', () => {
    const line = readLine(lineWithoutReference())
    expect(line.memberDisplayRef).toBe(MEMBERSHIP_B)
    // `hasMemberRef` is true: the server answered, and its answer was the id. Reading this as
    // "missing" is what would tempt a screen into substituting something friendlier.
    expect(line.hasMemberRef).toBe(true)
  })

  test('an ABSENT reference is unknown — no other id is substituted for it', () => {
    // The dangerous case. A line whose `memberDisplayRef` did not arrive must not be attributed to
    // whoever the allocation happens to name: that would print an attribution the server never made,
    // and on screen it would be indistinguishable from one it did.
    const stripped = lineWithReference()
    delete stripped.memberDisplayRef
    const line = readLine(stripped)
    expect(line.memberDisplayRef).toBeNull()
    expect(line.hasMemberRef).toBe(false)
    // Named explicitly, because this is the mutation that would otherwise pass unnoticed.
    expect(line.memberDisplayRef).not.toBe('alc-2026-06-0001')
    expect(line.memberDisplayRef).not.toBe('stl-2026-06-0001')
    expect(UNKNOWN_MARK).toBe('—')
  })

  test('a blank reference is unknown too, not an empty label', () => {
    const line = readLine(Object.assign(lineWithReference(), { memberDisplayRef: '   ' }))
    expect(line.memberDisplayRef).toBeNull()
    expect(line.hasMemberRef).toBe(false)
  })

  test('a reversal is a real bookkeeping row and keeps its own reference', () => {
    const line = readLine(Object.assign(lineWithReference(), {
      kind: 'Reversal', grossMinor: -4500, netMinor: -4091, vatMinor: -409
    }))
    expect(line.kind).toBe('Reversal')
    expect(line.gross).toEqual({ minor: -4500, currency: 'NOK' })
    expect(line.memberDisplayRef).toBe(REFERENCE_A)
  })
})

describe('readSummary / readStatement — figures are the server\'s, and nothing is re-summed', () => {
  const summary = () => ({
    statementRunId: 'stmt-2026-06-comp-1',
    companyId: 'comp-1',
    storeId: '42',
    currency: 'NOK',
    periodYear: 2026,
    periodMonth: 6,
    status: 'Finalized',
    lineCount: 2,
    totalGrossMinor: 33400,
    totalNetMinor: 30364,
    totalVatMinor: 3036,
    contentHash: '20e4b12ba051775dbb70f3273d618e8d',
    revision: 'AAAAAAAAAAI=',
    finalizedAtUtc: '2026-08-04T11:51:58Z',
    createdAtUtc: '2026-08-04T11:51:55Z'
  })

  test('the period tag is YYYY-MM, zero padded, and matches what the CSV preamble prints', () => {
    expect(readSummary(summary()).period).toBe('2026-06')
    expect(readSummary(Object.assign(summary(), { periodMonth: 11 })).period).toBe('2026-11')
  })

  test('a period the server did not state is null, not a guess from today', () => {
    expect(readSummary(Object.assign(summary(), { periodMonth: null })).period).toBeNull()
  })

  test('status drives the two facts a screen may state about it, and nothing else does', () => {
    const finalized = readSummary(summary())
    expect(finalized.isFinalized).toBe(true)
    expect(finalized.isDraft).toBe(false)
    const draft = readSummary(Object.assign(summary(), { status: 'Draft', finalizedAtUtc: null }))
    expect(draft.isDraft).toBe(true)
    expect(draft.isFinalized).toBe(false)
  })

  test('the totals are the ones that arrived — the lines are NOT re-summed to produce them', () => {
    // Deliberately inconsistent input: the totals say 33400 and the two lines add to 33400 only if
    // somebody adds them. If this module ever started deriving, the assertion below would move.
    const statement = readStatement({
      summary: Object.assign(summary(), { totalGrossMinor: 999 }),
      lines: [lineWithReference(), lineWithoutReference()]
    })
    expect(statement.totalGross).toEqual({ minor: 999, currency: 'NOK' })
  })

  test('a line count that disagrees with the lines sent is preserved on both sides', () => {
    const statement = readStatement({
      summary: Object.assign(summary(), { lineCount: 5 }),
      lines: [lineWithReference()]
    })
    expect(statement.lineCount).toBe(5)
    expect(statement.renderedLineCount).toBe(1)
  })

  test('both references survive the round trip through readStatement', () => {
    const statement = readStatement({
      summary: summary(),
      lines: [lineWithReference(), lineWithoutReference()]
    })
    expect(statement.lines.map(l => l.memberDisplayRef)).toEqual([REFERENCE_A, MEMBERSHIP_B])
    // Neither equals the run they belong to, nor each other.
    expect(new Set(statement.lines.map(l => l.memberDisplayRef)).size).toBe(2)
    expect(statement.lines.map(l => l.memberDisplayRef)).not.toContain(statement.statementRunId)
  })

  test('nothing read is null-safe by accident: no payload at all is null, not an empty statement', () => {
    expect(readStatement(null)).toBeNull()
    expect(readStatement(undefined)).toBeNull()
  })

  test('a flat payload is read as its own summary', () => {
    expect(readStatement(summary()).statementRunId).toBe('stmt-2026-06-comp-1')
    expect(readStatement(summary()).lines).toEqual([])
  })

  test('the content hash and the revision are held as read — the two the freeze is signed with', () => {
    const read = readSummary(summary())
    expect(read.contentHash).toBe('20e4b12ba051775dbb70f3273d618e8d')
    expect(read.revision).toBe('AAAAAAAAAAI=')
  })
})

describe('statementRefusal — the read family, keyed on code and never on prose', () => {
  const problem = (code, status) => ({ code, status: status || 409, problem: { code } })

  test('the buyer-only list refusal is its own sentence, not a generic failure', () => {
    expect(statementRefusal(problem('meals.forbidden', 403)).key).toBe('mlst_refusal_forbidden')
  })

  test('a dark module and an absent statement are ONE sentence, because they are one answer', () => {
    // `RequireVisible()` and a genuinely missing run both emit `meals.not-found`. A screen that
    // claimed "the module is switched off" would be inventing a distinction the wire refuses to make.
    expect(statementRefusal(problem('meals.not-found', 404)).key).toBe('mlst_refusal_not_found')
  })

  test('an unsupported export format has its own sentence', () => {
    expect(statementRefusal(problem('meals.export-format-unsupported', 400)).key)
      .toBe('mlst_refusal_export_format')
  })

  test('401 is a sentence even though it carries no meals code', () => {
    expect(statementRefusal({ status: 401, problem: {} }).key).toBe('mlst_refusal_unauthenticated')
  })

  test('a 400 with NO code extension lands on the honest unknown, not on an invented code', () => {
    // `MealsControllerBase` refuses a missing Idempotency-Key with a problem document whose type is
    // `https://httpstatuses.io/400` and which carries no `code` at all.
    expect(statementRefusal({ status: 400, code: null, problem: { title: 'Bad Request' } }).key)
      .toBe('mlst_refusal_unknown')
  })

  test('the WRITE family is deliberately absent: this module binds no write', () => {
    // A stale content hash and a stale expected version belong to the month-close surface. If a
    // sentence for them ever appeared here it would be a second copy of copy that lives elsewhere,
    // for an act this page cannot perform — and copies drift.
    expect(statementRefusal(problem('meals.statement-content-changed')).key).toBe('mlst_refusal_unknown')
    expect(statementRefusal(problem('meals.stale-revision')).key).toBe('mlst_refusal_unknown')
  })

  test('no refusal from a read claims anything about what was saved', () => {
    // A refused read changed nothing by construction, so there is no `saved` field to get wrong.
    expect(statementRefusal(problem('meals.forbidden', 403)).saved).toBeUndefined()
  })

  test('no error is no refusal', () => {
    expect(statementRefusal(null)).toBeNull()
  })
})
