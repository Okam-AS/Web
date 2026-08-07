import { mount } from '@vue/test-utils'
// Both plugins are imported for their SIDE EFFECT (`Vue.mixin`), so what these mounts render is the
// shipped `priceLabel` and the shipped `$i` — not a stand-in written here. `payment-type-label.test.js`
// makes the same argument for the consumer order card and states why: a unit test over a label
// function passes on a component that never calls it, and the six-blank-payer-lines defect was
// invisible for exactly that reason.
import '~/plugins/global-mixin'
import '~/plugins/i18n'
import PosReceiptView from '~/components/admin/pos/PosReceiptView.vue'

// PosReceiptView is what `print()` puts on the bong roll: a kassasystemforskrifta artifact an
// inspector can be handed. `xz-residual-sites.test.js` mounts it, but only ever with a single
// `Cash` payment line and never with a signature — so before this file `paymentLabel`'s card and
// gift-card arms and the whole of `shortSig` had zero hits, and the file read 20.0% (28 uncovered
// statements, 11 uncovered branches).
//
// The two things pinned here are the two fields of this document that have already gone wrong once
// in this estate: WHO PAID, and the signature that makes the receipt checkable.

const storeFor = locale => ({ state: { adminLocale: locale }, dispatch () {}, subscribe () {} })

const receiptWith = over => ({
  registerId: 'K-1',
  operatorName: 'Ada',
  localDate: '05.08.2026',
  localTime: '18:04',
  receiptNumber: 1042,
  sellerLegalName: 'Kafé AS',
  title: 'SALGSKVITTERING',
  grossAmount: 12000,
  payments: [{ paymentType: 'Cash', amount: 12000 }],
  taxLines: [],
  lines: [{ lineNumber: 1, quantity: 1, productName: 'Kaffe', lineAmount: 12000, unitAmount: 12000, depositAmount: 0, discountAmount: 0 }],
  ...over
})

const mountReceipt = (over, locale = 'no') => mount(PosReceiptView, {
  propsData: { receipt: receiptWith(over) },
  mocks: { $store: storeFor(locale) }
})

const payerRows = w => w.findAll('.receipt__payments .receipt__total-row').wrappers
  .map(r => ({ label: r.findAll('span').at(0).text(), amount: r.findAll('span').at(1).text() }))

// ------------------------------------------------------------------------------------------------
// THE PAYER LINE
//
// The population is not this component's own ladder. It is the kassa's SAF-T payment-code mapper —
// the only place in either repository that enumerates what payment media the journal is expected to
// carry — read from the backend, so this list cannot be satisfied by construction:
//
//   git -C ~/okam/OkamAPI-modules show 5243c06a7:Services/Kassa/SaftCashRegisterExportService.MasterData.cs
//   (lines 230-250: Cash | DinteroTerminal, SurfboardTerminal | Giftcard | Vipps, DinteroVipps | CompanyAccount)
//
// Seven members, six of them distinct media. `PosReceiptView.paymentLabel` maps four and falls
// through on three. See the closing describe for what that does and why it is recorded rather than
// asserted away.
// ------------------------------------------------------------------------------------------------

const LABELLED_MEDIA = [
  ['cash', 'Cash', 'Kontant'],
  ['a Surfboard terminal', 'SurfboardTerminal', 'Kort'],
  ['a Dintero terminal', 'DinteroTerminal', 'Kort'],
  ['a gift card', 'Giftcard', 'Gavekort']
]

describe('PosReceiptView — the payer line names the medium in the reader\'s language', () => {
  LABELLED_MEDIA.forEach(([what, wireValue, norwegian]) => {
    test(`${what} prints "${norwegian}", not the wire identifier`, () => {
      const w = mountReceipt({ payments: [{ paymentType: wireValue, amount: 12000 }] })
      const rows = payerRows(w)
      expect(rows[0].label).toBe(norwegian)
      expect(rows[0].label).not.toBe(wireValue)
    })
  })

  // The two terminal makes are one medium to the person holding the receipt. They are separate
  // arms of the ladder, so a change that touches one and not the other shows up here.
  test('both terminal makes print the same word', () => {
    const surfboard = payerRows(mountReceipt({ payments: [{ paymentType: 'SurfboardTerminal', amount: 12000 }] }))
    const dintero = payerRows(mountReceipt({ payments: [{ paymentType: 'DinteroTerminal', amount: 12000 }] }))
    expect(surfboard[0].label).toBe(dintero[0].label)
    expect(surfboard[0].label).toBe('Kort')
  })

  test('the label follows the reader\'s locale, not the wire', () => {
    const en = payerRows(mountReceipt({ payments: [{ paymentType: 'Giftcard', amount: 12000 }] }, 'en'))
    const de = payerRows(mountReceipt({ payments: [{ paymentType: 'Giftcard', amount: 12000 }] }, 'de'))
    expect(en[0].label).toBe('Gift card')
    expect(de[0].label).toBe('Gutschein')
  })

  // A split settlement writes one payment line per part. Each line must name its own medium and
  // carry its own amount; collapsing them, or labelling the second from the first, is what makes a
  // receipt stop adding up.
  test('a split settlement prints one row per tender, each with its own medium and amount', () => {
    const w = mountReceipt({
      grossAmount: 30000,
      payments: [
        { paymentType: 'DinteroTerminal', amount: 20000 },
        { paymentType: 'Cash', amount: 10000 }
      ]
    })
    expect(payerRows(w)).toEqual([
      { label: 'Kort', amount: 'kr 200,00' },
      { label: 'Kontant', amount: 'kr 100,00' }
    ])
  })

  // The blank-payer-line invariant, stated as the property rather than as a list of members: whatever
  // arrives on the wire, the row an inspector reads is never empty. This is the assertion that has to
  // survive the ladder being extended, so it names no member of it.
  test('no payment line ever renders a blank payer line', () => {
    const unmapped = ['Vipps', 'DinteroVipps', 'CompanyAccount', 'WoltMarketplace', 'NotSet']
    unmapped.forEach((wireValue) => {
      const rows = payerRows(mountReceipt({ payments: [{ paymentType: wireValue, amount: 12000 }] }))
      expect(rows).toHaveLength(1)
      expect(rows[0].label.trim()).not.toBe('')
      expect(rows[0].amount).toBe('kr 120,00')
    })
  })

  // The tendered/change pair only prints for cash, and only when there is something to print.
  test('tendered and change print beneath the tenders when cash was handed over', () => {
    const w = mountReceipt({ tenderedAmount: 20000, changeAmount: 8000 })
    const text = w.find('.receipt__payments').text()
    expect(text).toContain('kr 200,00')
    expect(text).toContain('kr 80,00')
    expect(w.find('.receipt__change').exists()).toBe(true)
  })

  test('a card sale prints no change row', () => {
    const w = mountReceipt({ payments: [{ paymentType: 'DinteroTerminal', amount: 12000 }], tenderedAmount: 0, changeAmount: 0 })
    expect(w.find('.receipt__change').exists()).toBe(false)
  })
})

// ------------------------------------------------------------------------------------------------
// THE SIGNATURE
//
// The kassa signature is what makes a receipt checkable against the journal chain. It is a long
// base64 string and the receipt is 72 mm wide, so it is truncated for display — but a truncation
// that silently ate a short signature, or that dropped the ellipsis, would leave a reader unable to
// tell an abbreviated signature from a whole one.
// ------------------------------------------------------------------------------------------------

const SIG = 'MEUCIQDf3nP7q0K2mZ0aQxLb5R9wYtV1cJhN8sGkA2rTuXe4dwIgB1kFvC'

describe('PosReceiptView — the signature that makes the receipt checkable', () => {
  test('a long signature is cut to 24 characters and marked as cut', () => {
    const w = mountReceipt({ signature: SIG })
    expect(w.vm.shortSig).toBe(SIG.slice(0, 24) + '…')
    expect(w.vm.shortSig).toHaveLength(25)
    expect(w.find('.receipt__sig').text()).toContain(SIG.slice(0, 24))
    expect(w.find('.receipt__sig').text()).toContain('…')
  })

  test('the truncation shows the FRONT of the signature, which is what a reader matches on', () => {
    const w = mountReceipt({ signature: SIG })
    expect(w.find('.receipt__sig').text()).toContain('MEUCIQDf3nP7q0K2mZ0aQxLb')
    expect(w.find('.receipt__sig').text()).not.toContain('B1kFvC')
  })

  // Exactly 24 is not long enough to abbreviate. An off-by-one here marks a whole signature as cut.
  test('a signature exactly 24 long is printed whole, with no ellipsis', () => {
    const exact = SIG.slice(0, 24)
    const w = mountReceipt({ signature: exact })
    expect(w.vm.shortSig).toBe(exact)
    expect(w.find('.receipt__sig').text()).not.toContain('…')
  })

  test('a 25-character signature is the first one that gets cut', () => {
    const w = mountReceipt({ signature: SIG.slice(0, 25) })
    expect(w.vm.shortSig).toBe(SIG.slice(0, 24) + '…')
  })

  // An unsigned receipt (a proforma, or a signature the wire did not carry) prints no signature row
  // at all, rather than an empty "Signatur:" label that reads as a signature nobody can check.
  test('an absent signature prints no signature row', () => {
    expect(mountReceipt({}).find('.receipt__sig').exists()).toBe(false)
    expect(mountReceipt({ signature: null }).find('.receipt__sig').exists()).toBe(false)
    expect(mountReceipt({ signature: '' }).find('.receipt__sig').exists()).toBe(false)
  })

  test('the key version prints beside the signature when the wire carries one', () => {
    const w = mountReceipt({ signature: SIG, keyVersion: 3 })
    expect(w.find('.receipt__foot').text()).toContain('3')
    expect(mountReceipt({ signature: SIG }).find('.receipt__foot').text()).not.toContain('undefined')
  })
})

// ------------------------------------------------------------------------------------------------
// THE VAT SPECIFICATION
//
// `taxLines` guards against an absent list. The rows themselves are the mva-spesifikasjon a
// bokføring inspector reads off the receipt.
// ------------------------------------------------------------------------------------------------

describe('PosReceiptView — the VAT specification', () => {
  test('an absent taxLines list prints no specification block rather than throwing', () => {
    const w = mountReceipt({ taxLines: undefined })
    expect(w.vm.taxLines).toEqual([])
    expect(w.find('.receipt__tax').exists()).toBe(false)
  })

  test('each rate prints its own basis and VAT amount', () => {
    const w = mountReceipt({
      taxLines: [
        { vatPercent: 15, basis: 8696, amount: 1304 },
        { vatPercent: 25, basis: 1600, amount: 400 }
      ]
    })
    const rows = w.findAll('.receipt__tax-row').wrappers.map(r => r.text())
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('15%')
    expect(rows[0]).toContain('kr 86,96')
    expect(rows[0]).toContain('kr 13,04')
    expect(rows[1]).toContain('25%')
    expect(rows[1]).toContain('kr 16,00')
    expect(rows[1]).toContain('kr 4,00')
  })
})
