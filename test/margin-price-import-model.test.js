import { readImportBatch, readImportSummary } from '~/utils/margin/price-import'

function batch (overrides) {
  return Object.assign({
    batchId: 'b-1',
    storeId: 42,
    supplierId: null,
    fileName: 'priser-mars.csv',
    fileSha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    state: 'Mapping',
    rowCount: 3,
    mappedCount: 2,
    skippedCount: 0,
    pendingCount: 1,
    errorCount: 1,
    uploadedAtUtc: '2026-03-01T09:00:00',
    appliedAtUtc: null,
    isDuplicateOfExistingBatch: false,
    revision: 'cmV2',
    rows: []
  }, overrides)
}

function row (overrides) {
  return Object.assign({
    id: 'r-1',
    rowNumber: 1,
    rawLine: '12345;Tomat;49,90;NOK;kg',
    articleNumber: '12345',
    name: 'Tomat',
    priceMinor: 4990,
    currency: 'NOK',
    unitCode: 'kg',
    proposedSupplierItemId: null,
    resolvedSupplierItemId: null,
    resolution: 'Pending',
    rowError: null
  }, overrides)
}

describe('readImportBatch', () => {
  test('nothing to show is null, so an unknown batch never renders as an empty one', () => {
    expect(readImportBatch(null)).toBeNull()
    expect(readImportBatch({})).toBeNull()
    expect(readImportBatch({ rows: [] })).toBeNull()
  })

  test('THE DUPLICATE IS NOT A FAILURE: it is its own state on the model', () => {
    // Journey L04: identical bytes re-uploaded. The server answers 200 with the ORIGINAL batch and
    // this flag; no second batch exists and no second price effect occurred.
    const model = readImportBatch(batch({ isDuplicateOfExistingBatch: true, state: 'Applied', appliedAtUtc: '2026-03-01T10:00:00' }))
    expect(model.isDuplicate).toBe(true)
    expect(model.batchId).toBe('b-1')
    expect(model.isApplied).toBe(true)
  })

  test('a re-read of the same batch is not a duplicate — only an upload can be', () => {
    expect(readImportBatch(batch({})).isDuplicate).toBe(false)
    expect(readImportBatch(batch({ isDuplicateOfExistingBatch: undefined })).isDuplicate).toBe(false)
  })

  test('APPROVE is blocked while any row is unresolved, and says which condition failed', () => {
    const model = readImportBatch(batch({ pendingCount: 1 }))
    expect(model.canApprove).toBe(false)
    expect(model.approveBlocker).toBe('pending')
  })

  test('APPROVE is on offer once nothing is pending', () => {
    const model = readImportBatch(batch({ pendingCount: 0 }))
    expect(model.canApprove).toBe(true)
    expect(model.approveBlocker).toBeNull()
  })

  test('an applied batch can never be approved again, and the reason is its own', () => {
    const model = readImportBatch(batch({ state: 'Applied', pendingCount: 0 }))
    expect(model.canApprove).toBe(false)
    expect(model.approveBlocker).toBe('applied')
  })

  test('any other state blocks approval with its own reason', () => {
    const model = readImportBatch(batch({ state: 'Rejected', pendingCount: 0 }))
    expect(model.approveBlocker).toBe('state')
  })

  test('a row the parser could not price is null, NEVER zero', () => {
    // `kr 0,00` here would read as "this supplier now charges nothing" on exactly the rows most
    // likely to be wrong.
    const model = readImportBatch(batch({ rows: [row({ priceMinor: null, rowError: 'The price \'\' could not be parsed as a number.' })] }))
    expect(model.rows[0].priceMinor).toBeNull()
    expect(model.rows[0].hasError).toBe(true)
  })

  test('an ERROR row can only be skipped — the server refuses to map it', () => {
    const model = readImportBatch(batch({
      rows: [
        row({ id: 'r-1', rowError: 'The currency \'KRONER\' is not a 3-letter ISO 4217 code.' }),
        row({ id: 'r-2', rowError: null })
      ]
    }))
    expect(model.rows[0].canMap).toBe(false)
    expect(model.rows[1].canMap).toBe(true)
  })

  test('the row error is carried verbatim: it names the cell, which no generic sentence could', () => {
    const detail = 'The currency \'KRONER\' is not a 3-letter ISO 4217 code.'
    const model = readImportBatch(batch({ rows: [row({ rowError: detail })] }))
    expect(model.rows[0].rowError).toBe(detail)
  })

  test('an auto-mapped row is flagged, and an ambiguous proposal is not', () => {
    const model = readImportBatch(batch({
      rows: [
        row({ id: 'r-1', proposedSupplierItemId: 'si-1', resolvedSupplierItemId: 'si-1', resolution: 'Mapped' }),
        row({ id: 'r-2', proposedSupplierItemId: null, resolvedSupplierItemId: null })
      ]
    }))
    expect(model.rows[0].wasAutoMapped).toBe(true)
    expect(model.rows[1].wasAutoMapped).toBe(false)
  })

  test('a count the wire did not send stays null rather than becoming 0', () => {
    const model = readImportBatch(batch({ rowCount: undefined, errorCount: null }))
    expect(model.rowCount).toBeNull()
    expect(model.errorCount).toBeNull()
  })

  test('the bare uploaded/applied stamps are read as UTC', () => {
    const model = readImportBatch(batch({ appliedAtUtc: '2026-03-01T10:30:00' }))
    expect(model.uploadedAt.toISOString()).toBe('2026-03-01T09:00:00.000Z')
    expect(model.appliedAt.toISOString()).toBe('2026-03-01T10:30:00.000Z')
  })
})

describe('readImportSummary', () => {
  test('a list row carries the state and counts without any rows of its own', () => {
    const summary = readImportSummary(batch({ state: 'Applied', appliedAtUtc: '2026-03-02T08:00:00' }))
    expect(summary.batchId).toBe('b-1')
    expect(summary.isApplied).toBe(true)
    expect(summary.rowCount).toBe(3)
    expect(summary.appliedAt.toISOString()).toBe('2026-03-02T08:00:00.000Z')
  })
})
