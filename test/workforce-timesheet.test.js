import {
  approveAvailability, exportAvailability, canDownload, formatMinutes, incompleteCount,
  periodFor, periodsOf, refusalKeyFor, isRetryable,
  STATUS_OPEN, STATUS_APPROVED, STATUS_EXPORTED
} from '~/utils/workforce/timesheet'

// The judgement the timesheet screen is allowed to make, tested against the contract it claims to
// implement rather than against the template that renders it. Two properties dominate:
//
//   • UNKNOWN IS NOT EMPTINESS. A period whose read has not answered must never render as "nothing
//     to approve" — a manager acting on that reads it as "nobody worked", and freezing it is not
//     reversible.
//   • A CONTROL IS WITHHELD WITH A REASON. Every gate answers `{ enabled, reasonKey }`, because a
//     button that is simply missing teaches nobody anything, and this surface has four distinct
//     reasons it can be withheld.

describe('timesheet view logic', () => {
  const openPeriod = {
    status: STATUS_OPEN, lineCount: 8, incompleteRowCount: 0, paidMinutes: 2445
  }
  const gates = { exportEnabled: true, hasPayrollCapability: true }

  // ---- formatMinutes ---------------------------------------------------------------------------

  describe('formatMinutes', () => {
    it('renders a minute count as venue hours', () => {
      expect(formatMinutes(450)).toBe('7 t 30 min')
      expect(formatMinutes(480)).toBe('8 t 00 min')
      expect(formatMinutes(0)).toBe('0 t 00 min')
    })

    // The single most important assertion in this file. `minutes` is nullable BECAUSE the hours can
    // be genuinely unknown — an open session, a missing punch — and it is never 0 for those. A page
    // that printed "0 t" would state that somebody worked no time, on a payroll surface.
    it('renders UNKNOWN hours as the unknown marker, never as zero', () => {
      expect(formatMinutes(null)).toBe('—')
      expect(formatMinutes(undefined)).toBe('—')
      expect(formatMinutes(null)).not.toContain('0')
    })

    it('refuses to round a non-integer into a payroll number', () => {
      expect(formatMinutes(90.5)).toBe('—')
      expect(formatMinutes(NaN)).toBe('—')
      expect(formatMinutes('450')).toBe('—')
    })
  })

  // ---- incompleteCount -------------------------------------------------------------------------

  describe('incompleteCount', () => {
    it('distinguishes "no unknown rows" from "we do not know"', () => {
      expect(incompleteCount({ incompleteRowCount: 0 })).toBe(0)
      expect(incompleteCount(null)).toBeNull()
      expect(incompleteCount({})).toBeNull()
    })
  })

  // ---- the approve gate ------------------------------------------------------------------------

  describe('approveAvailability', () => {
    it('offers the control on an open period with rows, given the grant and the flag', () => {
      expect(approveAvailability(Object.assign({ period: openPeriod }, gates)))
        .toEqual({ enabled: true, reasonKey: null })
    })

    it('withholds it without the payroll grant, and says which grant', () => {
      const gate = approveAvailability({
        period: openPeriod, exportEnabled: true, hasPayrollCapability: false
      })
      expect(gate.enabled).toBe(false)
      expect(gate.reasonKey).toBe('wft_gate_no_payroll_capability')
    })

    it('withholds it when the export stage flag is off', () => {
      const gate = approveAvailability({
        period: openPeriod, exportEnabled: false, hasPayrollCapability: true
      })
      expect(gate.enabled).toBe(false)
      expect(gate.reasonKey).toBe('wft_gate_flag_off')
    })

    // THE STAGE FLAG IS THREE-STATE. "Switched off for this store" is a statement about the store's
    // configuration, and a surface that says it because a read never answered has invented it. The
    // control is withheld either way; only the sentence differs, and the sentence is the point.
    it.each([[null], [undefined]])('withholds it while the stage flag is UNREAD (%p), and says so', (unread) => {
      const gate = approveAvailability({
        period: openPeriod, exportEnabled: unread, hasPayrollCapability: true
      })
      expect(gate.enabled).toBe(false)
      expect(gate.reasonKey).toBe('wft_gate_flag_unread')
    })

    it.each([[null], [undefined]])('withholds EXPORT on an unread flag (%p) too, with the same sentence', (unread) => {
      const gate = exportAvailability({
        period: Object.assign({}, openPeriod, { status: STATUS_APPROVED }),
        exportEnabled: unread,
        hasPayrollCapability: true
      })
      expect(gate.enabled).toBe(false)
      expect(gate.reasonKey).toBe('wft_gate_flag_unread')
    })

    // The missing grant is the stronger fact and stays first: a caller without payroll access is
    // told which grant they lack, not that a flag nobody asked them about is unread.
    it('names the missing grant ahead of the unread flag', () => {
      expect(approveAvailability({
        period: openPeriod, exportEnabled: null, hasPayrollCapability: false
      }).reasonKey).toBe('wft_gate_no_payroll_capability')
    })

    // UNKNOWN must not present as an offerable act.
    it('withholds it while the period is unknown', () => {
      expect(approveAvailability(Object.assign({ period: null }, gates)).reasonKey)
        .toBe('wft_gate_no_period')
    })

    it('withholds it once the period is frozen, in both frozen states', () => {
      for (const status of [STATUS_APPROVED, STATUS_EXPORTED]) {
        const gate = approveAvailability(Object.assign(
          { period: Object.assign({}, openPeriod, { status }) }, gates))
        expect(gate.enabled).toBe(false)
        expect(gate.reasonKey).toBe('wft_gate_already_approved')
      }
    })

    // The server refuses an empty freeze because it would put a payroll artifact on the record
    // asserting that nobody worked. Saying so before the click beats firing a request that can only
    // fail and then reporting the failure as a fault.
    it('withholds it on an empty period rather than firing a request that can only be refused', () => {
      const gate = approveAvailability(Object.assign(
        { period: Object.assign({}, openPeriod, { lineCount: 0 }) }, gates))
      expect(gate.enabled).toBe(false)
      expect(gate.reasonKey).toBe('wft_gate_empty')
    })
  })

  // ---- the export gate -------------------------------------------------------------------------

  describe('exportAvailability', () => {
    it('withholds it until the period is approved', () => {
      const gate = exportAvailability(Object.assign({ period: openPeriod }, gates))
      expect(gate.enabled).toBe(false)
      expect(gate.reasonKey).toBe('wft_gate_not_approved')
    })

    it('offers it on an approved period', () => {
      expect(exportAvailability(Object.assign(
        { period: Object.assign({}, openPeriod, { status: STATUS_APPROVED }) }, gates)).enabled)
        .toBe(true)
    })

    // KEEPING the control after a send is deliberate: a second export is how an ADJUSTMENT batch is
    // raised when something has changed. Hiding it would make the only correction route an immutable
    // period has unreachable, and the server — not this page — is what decides there is no delta.
    it('KEEPS the control on an already-exported period, because that is the adjustment path', () => {
      expect(exportAvailability(Object.assign(
        { period: Object.assign({}, openPeriod, { status: STATUS_EXPORTED }) }, gates)).enabled)
        .toBe(true)
    })

    it('withholds it when the stage flag is off', () => {
      expect(exportAvailability({
        period: Object.assign({}, openPeriod, { status: STATUS_APPROVED }),
        exportEnabled: false,
        hasPayrollCapability: true
      }).reasonKey).toBe('wft_gate_flag_off')
    })
  })

  // ---- the download ----------------------------------------------------------------------------

  describe('canDownload', () => {
    it('offers the bytes of a succeeded batch', () => {
      expect(canDownload({ batchId: 'b1', outcome: 'Succeeded' })).toBe(true)
    })

    // A failed batch spent its key and recorded the attempt, but the provider never rendered
    // anything. Offering a download would be offering a button that can only refuse.
    it('withholds them from a failed batch, which has no file', () => {
      expect(canDownload({ batchId: 'b1', outcome: 'Failed' })).toBe(false)
      expect(canDownload(null)).toBe(false)
    })
  })

  // ---- refusals --------------------------------------------------------------------------------

  describe('refusalKeyFor', () => {
    it('maps every refusal this surface can receive onto its own sentence', () => {
      const codes = [
        'workforce.timesheet-period-already-approved',
        'workforce.timesheet-period-incomplete',
        'workforce.timesheet-period-empty',
        'workforce.timesheet-period-not-approved',
        'workforce.timesheet-period-id-mismatch',
        'workforce.timesheet-nothing-to-reconcile',
        'workforce.timesheet-export-provider-unknown',
        'workforce.timesheet-export-failed',
        'workforce.flag-disabled-read-only',
        'workforce.idempotency-in-progress'
      ]
      for (const code of codes) {
        expect(refusalKeyFor(code)).toBeTruthy()
      }
      // No two refusals share a sentence: a manager who cannot tell "already approved" from
      // "nothing to reconcile" cannot tell which of the two acts already happened.
      expect(new Set(codes.map(refusalKeyFor)).size).toBe(codes.length)
    })

    // A code with no sentence must NOT be swallowed into "something went wrong": the caller prints
    // the generic line WITH the code, so a refusal a future backend adds arrives readable.
    it('answers null for an unknown code rather than guessing at a cause', () => {
      expect(refusalKeyFor('workforce.some-future-refusal')).toBeNull()
      expect(refusalKeyFor(null)).toBeNull()
    })
  })

  describe('isRetryable', () => {
    it('is true only for the one refusal the server marks retryable', () => {
      expect(isRetryable({ retryable: true })).toBe(true)
      expect(isRetryable({ retryable: false })).toBe(false)
      expect(isRetryable(null)).toBe(false)
    })
  })

  // ---- the list ---------------------------------------------------------------------------------

  describe('periodsOf / periodFor', () => {
    const list = {
      periods: [
        { timesheetPeriodId: 'p1', fromBusinessDate: '2026-07-21', toBusinessDate: '2026-08-03' },
        { timesheetPeriodId: 'p2', fromBusinessDate: '2026-07-01', toBusinessDate: '2026-07-14' }
      ]
    }

    it('preserves the server order, which puts the asked-for period first', () => {
      expect(periodsOf(list).map(p => p.timesheetPeriodId)).toEqual(['p1', 'p2'])
    })

    it('keeps UNKNOWN as null rather than collapsing it to an empty list', () => {
      expect(periodsOf(null)).toBeNull()
      expect(periodsOf({})).toBeNull()
    })

    it('finds the period matching the range the manager asked about', () => {
      expect(periodFor(list, '2026-07-21', '2026-08-03').timesheetPeriodId).toBe('p1')
      expect(periodFor(list, '2026-07-01', '2026-07-14').timesheetPeriodId).toBe('p2')
      expect(periodFor(list, '2026-06-01', '2026-06-14')).toBeNull()
      expect(periodFor(null, '2026-07-21', '2026-08-03')).toBeNull()
    })
  })
})
