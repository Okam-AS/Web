import {
  MAX_EXPORT_DAYS,
  RANGE_MISSING,
  RANGE_REVERSED,
  RANGE_TOO_LONG,
  businessDateIn,
  inclusiveDayCount,
  metaIsUnderstood,
  parseHoursExportMeta,
  shiftBusinessDate,
  validateExportRange
} from '~/utils/workforce-rates/hours-export'

// These tests are meaningful only under a non-UTC TZ — run the suite with TZ=Europe/Oslo.

describe('the venue\'s calendar, not the viewer\'s', () => {
  // The export's business dates belong to the STORE. A manager reading from another zone must still
  // be offered the venue's today, or the form silently asks for a different day than the one on
  // screen.
  test('businessDateIn resolves the STORE\'s calendar day, provably not UTC\'s', () => {
    // 22:30 UTC on 1 September is already half past midnight on the 2nd in Oslo.
    const instant = new Date('2026-09-01T22:30:00Z')

    expect(businessDateIn('Europe/Oslo', instant)).toBe('2026-09-02')
    // THE CONTROL: the UTC reading gives a different day, so the assertion above is doing work.
    expect(instant.toISOString().slice(0, 10)).toBe('2026-09-01')
    expect(businessDateIn('Europe/Oslo', instant)).not.toBe(instant.toISOString().slice(0, 10))
  })

  test('and it is the named zone that decides, not a fixed offset', () => {
    const instant = new Date('2026-09-01T22:30:00Z')
    expect(businessDateIn('UTC', instant)).toBe('2026-09-01')
    expect(businessDateIn('Pacific/Auckland', instant)).toBe('2026-09-02')
    expect(businessDateIn('America/New_York', instant)).toBe('2026-09-01')
  })

  test('without a zone it answers null rather than guessing one', () => {
    expect(businessDateIn(null, new Date())).toBeNull()
    expect(businessDateIn('Europe/Oslo', null)).toBeNull()
  })
})

describe('civil-date arithmetic — no instant is ever constructed', () => {
  test('shiftBusinessDate steps whole calendar days', () => {
    expect(shiftBusinessDate('2026-09-14', -13)).toBe('2026-09-01')
    expect(shiftBusinessDate('2026-09-01', 13)).toBe('2026-09-14')
    expect(shiftBusinessDate('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftBusinessDate('2028-03-01', -1)).toBe('2028-02-29')
    expect(shiftBusinessDate('2026-01-01', -1)).toBe('2025-12-31')
  })

  // The DST weekends. Oslo springs forward on 29 March 2026 (a 23-hour day) and falls back on 25
  // October (a 25-hour day). Stepping in a real zone would drop or duplicate a day across either.
  test('a DST weekend neither drops nor duplicates a day', () => {
    expect(shiftBusinessDate('2026-03-28', 1)).toBe('2026-03-29')
    expect(shiftBusinessDate('2026-03-29', 1)).toBe('2026-03-30')
    expect(shiftBusinessDate('2026-10-24', 1)).toBe('2026-10-25')
    expect(shiftBusinessDate('2026-10-25', 1)).toBe('2026-10-26')

    expect(inclusiveDayCount('2026-03-28', '2026-03-30')).toBe(3)
    expect(inclusiveDayCount('2026-10-24', '2026-10-26')).toBe(3)
  })

  test('inclusiveDayCount counts both ends, because a payroll period includes both', () => {
    expect(inclusiveDayCount('2026-09-01', '2026-09-01')).toBe(1)
    expect(inclusiveDayCount('2026-09-01', '2026-09-14')).toBe(14)
    expect(inclusiveDayCount('2026-01-01', '2026-12-31')).toBe(365)
    expect(inclusiveDayCount('2028-01-01', '2028-12-31')).toBe(366)
  })

  test('a date that does not exist is refused rather than rolled forward', () => {
    // `Date.UTC(2026, 1, 31)` is silently 3 March. A range built on that would cover days nobody
    // asked for.
    expect(inclusiveDayCount('2026-02-31', '2026-03-05')).toBeNull()
    expect(shiftBusinessDate('2026-02-30', 1)).toBeNull()
    expect(inclusiveDayCount('2026-13-01', '2026-13-05')).toBeNull()
    expect(inclusiveDayCount('not-a-date', '2026-03-05')).toBeNull()
    // POSITIVE CONTROL: the neighbouring dates that DO exist are accepted, so the refusals above
    // are not simply a function that rejects everything.
    expect(inclusiveDayCount('2026-02-28', '2026-03-05')).toBe(6)
    expect(shiftBusinessDate('2026-02-28', 1)).toBe('2026-03-01')
  })
})

describe('validateExportRange — the server\'s own limits, stated first', () => {
  test('a good range passes', () => {
    expect(validateExportRange('2026-09-01', '2026-09-14')).toBeNull()
    expect(validateExportRange('2026-09-01', '2026-09-01')).toBeNull()
  })

  test('the maximum window is the server\'s, exactly', () => {
    // `WorkforceHoursExportService.MaxRangeDays` is 366 and the controller refuses 367.
    expect(MAX_EXPORT_DAYS).toBe(366)
    expect(inclusiveDayCount('2026-01-01', '2027-01-01')).toBe(366)
    expect(validateExportRange('2026-01-01', '2027-01-01')).toBeNull()
    expect(validateExportRange('2026-01-01', '2027-01-02')).toBe(RANGE_TOO_LONG)
  })

  test('a reversed range is named as reversed, not as missing', () => {
    expect(validateExportRange('2026-09-14', '2026-09-01')).toBe(RANGE_REVERSED)
    expect(validateExportRange('2026-09-14', '2026-09-01')).not.toBe(RANGE_MISSING)
  })

  test('an absent or malformed bound is missing', () => {
    expect(validateExportRange('', '2026-09-14')).toBe(RANGE_MISSING)
    expect(validateExportRange('2026-09-01', '')).toBe(RANGE_MISSING)
    expect(validateExportRange(null, null)).toBe(RANGE_MISSING)
    expect(validateExportRange('2026-9-1', '2026-09-14')).toBe(RANGE_MISSING)
  })
})

describe('parseHoursExportMeta — what the file says about itself', () => {
  const preamble = [
    '# okam-workforce-hours',
    '# version=1',
    '# storeId=42',
    '# timeZoneId=Europe/Oslo',
    '# fromBusinessDate=2026-09-01',
    '# toBusinessDate=2026-09-14',
    '# basis=hours-only',
    '# wageMath=none',
    '# rowCount=12',
    '# complete=false',
    '# incompleteRowCount=3',
    'staffMemberId,employmentNumber,displayName,businessDate,payCode,paid,minutes,plannedMinutes,status,approvedAdjustments'
  ].join('\n')

  test('reads the server\'s own figures verbatim', () => {
    const meta = parseHoursExportMeta(preamble + '\nsm-1,,Ida,2026-09-01,ORDINARY,true,,450,OPEN_SESSION,0\n')

    expect(meta.version).toBe('1')
    expect(meta.storeId).toBe('42')
    expect(meta.timeZoneId).toBe('Europe/Oslo')
    expect(meta.fromBusinessDate).toBe('2026-09-01')
    expect(meta.toBusinessDate).toBe('2026-09-14')
    expect(meta.basis).toBe('hours-only')
    expect(meta.wageMath).toBe('none')
    expect(meta.rowCount).toBe(12)
    expect(meta.complete).toBe(false)
    expect(meta.incompleteRowCount).toBe(3)
  })

  // The tri-state that the whole panel hangs on. "The file did not say" is not "the file is
  // incomplete", and it is certainly not "the file is complete".
  test('an unstated completeness is NULL, and a stated false is FALSE', () => {
    expect(parseHoursExportMeta('# version=1\ncol\n').complete).toBeNull()
    expect(parseHoursExportMeta('# version=1\n# complete=\ncol\n').complete).toBeNull()
    expect(parseHoursExportMeta('# version=1\n# complete=maybe\ncol\n').complete).toBeNull()

    // THE CONTROL: the two stated values must be distinguishable from the unstated one and from
    // each other, or a parser that always answered null would satisfy the three lines above.
    expect(parseHoursExportMeta('# version=1\n# complete=false\ncol\n').complete).toBe(false)
    expect(parseHoursExportMeta('# version=1\n# complete=true\ncol\n').complete).toBe(true)
  })

  test('an unstated count is null rather than zero — "no rows" and "did not say" differ', () => {
    const meta = parseHoursExportMeta('# version=1\ncol\n')
    expect(meta.rowCount).toBeNull()
    expect(meta.incompleteRowCount).toBeNull()
    expect(meta.rowCount).not.toBe(0)

    // And a genuine zero is read as zero, which is what makes the null above meaningful.
    expect(parseHoursExportMeta('# version=1\n# rowCount=0\ncol\n').rowCount).toBe(0)
  })

  test('a non-numeric count is not silently coerced', () => {
    expect(parseHoursExportMeta('# version=1\n# rowCount=many\ncol\n').rowCount).toBeNull()
    expect(parseHoursExportMeta('# version=1\n# rowCount=-3\ncol\n').rowCount).toBeNull()
  })

  test('the preamble stops at the column header — a # inside the data is never metadata', () => {
    const csv = preamble +
      '\nsm-1,,"# complete=true, Ida",2026-09-01,ORDINARY,true,450,450,COMPLETE,0\n' +
      '# complete=true\n'

    // The forged lines below the header would flip the verdict if the parser scanned the whole file.
    expect(parseHoursExportMeta(csv).complete).toBe(false)
  })

  test('an empty or absent body yields all-nulls rather than a throw', () => {
    for (const input of ['', null, undefined, 42]) {
      const meta = parseHoursExportMeta(input)
      expect(meta.version).toBeNull()
      expect(meta.complete).toBeNull()
      expect(meta.rowCount).toBeNull()
    }
  })

  test('CRLF line endings are read the same as LF', () => {
    const meta = parseHoursExportMeta('# version=1\r\n# complete=true\r\n# rowCount=7\r\ncol\r\n')
    expect(meta.version).toBe('1')
    expect(meta.complete).toBe(true)
    expect(meta.rowCount).toBe(7)
  })

  test('metaIsUnderstood gates interpretation on the version the parser was written against', () => {
    expect(metaIsUnderstood(parseHoursExportMeta('# version=1\ncol\n'))).toBe(true)
    expect(metaIsUnderstood(parseHoursExportMeta('# version=2\ncol\n'))).toBe(false)
    expect(metaIsUnderstood(parseHoursExportMeta('col\n'))).toBe(false)
    expect(metaIsUnderstood(null)).toBe(false)
  })
})
