import translations from '~/translations'
import { fakeBackend, mountDelivery, settle } from '~/test/support/delivery-page-harness'

// ---- WHY THIS FILE EXISTS ---------------------------------------------------------------------
//
// `Stores.MinimumOrderPriceForHomeDelivery` is an `int` of ØRE. `pages/admin/delivery.vue` read it
// through a single whole-kroner field:
//
//     this.localMinimumAmountForDelivery = Math.floor(store.minimumOrderPriceForHomeDelivery / 100)
//
// so a store on 15050 øre showed `150` and the 50 øre WERE NOT ON THE SCREEN AT ALL. Not merely
// uneditable — invisible. The operator reads a minimum the venue is not charging, and cannot see,
// explain or correct the difference.
//
// The lane before this one closed the half where that also made the page permanently dirty and
// wrote the rounded 15000 back (`test/delivery-save-failure.test.js`). That fix put BOTH sides of
// the dirty check through the field's own representation, so the rounded write is gone — but it
// left the field's representation itself lossy, and it left a second consequence behind: with the
// two sides now agreeing on `150`, an operator who wants the minimum to actually BE 150 kr can
// type `150`, see no change detected, and get no Save. The øre could not be removed either.
//
// ---- IS IT REACHABLE? MEASURED, NOT ASSUMED ----------------------------------------------------
//
// No automated writer in the estate produces such a value. All three admin clients floor on read
// and multiply by 100 on write — this page, `Web/pages/admin/delivery.vue`, and the native
// `AdminApp/app/views/pages/DeliveryMethods.vue:318` (`parseInt(...) * 100`). The backend has
// exactly one writer, `StoresController.SetMinimumAmountForDelivery(int storeId, int amount)`, and
// it assigns `amount` straight to the column: no rounding, no multiple-of-100 constraint, no
// validation of any kind. No migration seeds it, no importer sets it, no partner integration
// touches it.
//
// So the value arrives by hand — a support engineer calling the route (the repo ships a request
// template for it at `Bruno/Okam API/stores/-stores-{storeId}-minimumamountfordelivery-{amount}.bru`)
// or an edited row. That is why one reader could not reproduce it, and it is why the shape of the
// fix is a field that can SHOW what the column can HOLD rather than a constraint pretending the
// column cannot hold it.
//
// ---- WHY BOTH DIRECTIONS ARE PINNED ------------------------------------------------------------
//
// A field that displays øre and posts kroner is worse than one that rounds honestly, because it
// looks correct. Every arm below that reads the screen has a partner arm that reads what the fake
// server was left holding, and the fake stores whatever integer it is given because the route does.

const shownMinimum = (wrapper) => {
  // Deliberately shape-agnostic: it reads whatever inputs the minimum-order group contains and
  // joins them on the Norwegian decimal comma. Against the single whole-kroner field it answers
  // `150` for a store on 150,50 — the defect stated in the operator's own terms rather than in
  // terms of a DOM this lane introduced. That is what makes these arms red on the shipped page
  // instead of merely erroring on a selector that does not exist yet.
  const groups = wrapper.findAll('.address-panel .form-group').wrappers
  const minimumGroup = groups[groups.length - 1]
  return minimumGroup.findAll('input').wrappers.map(input => input.element.value).join(',')
}

const kronerBox = wrapper => wrapper.findAll('.address-panel .amount-inputs input').at(0)
const oreBox = wrapper => wrapper.findAll('.address-panel .amount-inputs input').at(1)
const saveButton = wrapper => wrapper.find('.address-panel .btn-primary')

const withStoredMinimum = ore => fakeBackend({ homeDeliveryEnabled: true, minimumOrderPriceForHomeDelivery: ore })

// The definition of kroner-and-øre, restated here rather than borrowed from the page, so the
// expectation is not the implementation checking itself.
const asKronerAndOre = (ore) => {
  const sign = ore < 0 ? '-' : ''
  const absolute = Math.abs(ore)
  return sign + Math.floor(absolute / 100) + ',' + String(absolute % 100).padStart(2, '0')
}

describe('a stored minimum-order amount is shown to the last øre', () => {
  test('150,50 kr is shown as 150,50 and not as 150', async () => {
    const wrapper = await mountDelivery(withStoredMinimum(15050))
    expect(shownMinimum(wrapper)).toBe('150,50')
  })

  test('a whole-kroner minimum still reads as whole kroner', async () => {
    const wrapper = await mountDelivery(withStoredMinimum(15000))
    expect(shownMinimum(wrapper)).toBe('150,00')
  })

  test('a minimum below one krone is shown as the amount it is, not as nothing', async () => {
    // 5 øre. Under the floor this read `0`, which is the one value that means "no minimum at all"
    // — the display did not merely lose precision, it changed what the setting SAYS.
    const wrapper = await mountDelivery(withStoredMinimum(5))
    expect(shownMinimum(wrapper)).toBe('0,05')
  })

  test('a genuinely absent minimum still reads as zero', async () => {
    const wrapper = await mountDelivery(withStoredMinimum(0))
    expect(shownMinimum(wrapper)).toBe('0,00')
  })

  test('the two boxes say which unit each one takes', async () => {
    // Two unlabelled boxes are not a money control. These are the same two placeholder keys the
    // delivery-method editor in this file already uses for its kroner/øre pair.
    const wrapper = await mountDelivery(withStoredMinimum(15050))
    expect(kronerBox(wrapper).attributes('placeholder')).toBe(translations.no.delivery_kroner)
    expect(oreBox(wrapper).attributes('placeholder')).toBe(translations.no.delivery_ore)
  })

  test('EVERY amount the column can hold survives the round trip to the screen and back', async () => {
    // The objective, as one invariant: no stored amount is rounded away on screen. If the pair
    // could not represent a value, the page would read back a different number than it was given,
    // and the dirty check — which compares the field's representation on both sides — would offer
    // a Save nobody asked for that writes the number the field could represent. So "displays it"
    // and "does not silently rewrite it" are the same assertion, made here over the range.
    // The negatives are in the range for the reason the comment on `minimumAmountFields` gives: the
    // column is a signed int and its route validates nothing, and the decomposition the
    // delivery-method editor uses — slice the decimal string — is exact for a shipping price and is
    // not exact here. -50 slices to a whole part of "-", which reads back as +50.
    for (const stored of [0, 1, 5, 50, 99, 100, 999, 15000, 15050, 999999, 2147483647, -1, -50, -15050]) {
      const backend = withStoredMinimum(stored)
      const wrapper = await mountDelivery(backend)
      expect(shownMinimum(wrapper)).toBe(asKronerAndOre(stored))
      expect(saveButton(wrapper).exists()).toBe(false)
      wrapper.destroy()
    }
  })

  test('a negative stored minimum is shown as it is, and is not quietly rewritten', async () => {
    // Not a state the product can want, but the column is a signed int and the route validates
    // nothing, so it is a state the column can hold. Under the floor, -150,50 displayed as -151:
    // rounding AWAY from zero, a second lie in the opposite direction from the first.
    const backend = withStoredMinimum(-15050)
    const wrapper = await mountDelivery(backend)
    expect(shownMinimum(wrapper)).toBe('-150,50')
    expect(saveButton(wrapper).exists()).toBe(false)
    expect(backend.store.minimumOrderPriceForHomeDelivery).toBe(-15050)
  })
})

describe('what the field shows is what the field writes', () => {
  test('øre typed into the øre box reach the server as øre', async () => {
    // The failure this arm exists to prevent: a field that displays øre and posts kroner. It would
    // look right on screen and set a minimum a hundred times too small.
    const backend = withStoredMinimum(15000)
    const wrapper = await mountDelivery(backend)

    await oreBox(wrapper).setValue('50')
    await wrapper.vm.$nextTick()
    expect(saveButton(wrapper).exists()).toBe(true)

    await saveButton(wrapper).trigger('click')
    await settle(wrapper)

    expect(backend.calls.writes).toEqual([{ name: 'SetMinimumAmountForDelivery', newValue: 15050 }])
    expect(backend.store.minimumOrderPriceForHomeDelivery).toBe(15050)
  })

  test('editing the kroner does not throw away the øre that were already stored', async () => {
    const backend = withStoredMinimum(15050)
    const wrapper = await mountDelivery(backend)

    await kronerBox(wrapper).setValue('200')
    await wrapper.vm.$nextTick()
    await saveButton(wrapper).trigger('click')
    await settle(wrapper)

    expect(backend.store.minimumOrderPriceForHomeDelivery).toBe(20050)
  })

  test('the øre can be cleared, which is the correction the floored field made impossible', async () => {
    // Under the floor both sides of the dirty check read 150, so typing 150 produced no change and
    // no Save: an øre component could not be removed from this page at all.
    const backend = withStoredMinimum(15050)
    const wrapper = await mountDelivery(backend)

    await oreBox(wrapper).setValue('00')
    await wrapper.vm.$nextTick()
    expect(saveButton(wrapper).exists()).toBe(true)

    await saveButton(wrapper).trigger('click')
    await settle(wrapper)

    expect(backend.store.minimumOrderPriceForHomeDelivery).toBe(15000)
  })

  test('a saved amount comes back onto the screen as the amount that was saved', async () => {
    const backend = withStoredMinimum(15000)
    const wrapper = await mountDelivery(backend)

    await kronerBox(wrapper).setValue('249')
    await oreBox(wrapper).setValue('90')
    await wrapper.vm.$nextTick()
    await saveButton(wrapper).trigger('click')
    await settle(wrapper)

    expect(backend.store.minimumOrderPriceForHomeDelivery).toBe(24990)
    expect(shownMinimum(wrapper)).toBe('249,90')
    expect(saveButton(wrapper).exists()).toBe(false)
  })

  test('a whole-kroner edit still writes whole kroner', async () => {
    const backend = withStoredMinimum(15000)
    const wrapper = await mountDelivery(backend)

    await kronerBox(wrapper).setValue('200')
    await wrapper.vm.$nextTick()
    await saveButton(wrapper).trigger('click')
    await settle(wrapper)

    expect(backend.store.minimumOrderPriceForHomeDelivery).toBe(20000)
  })

  test('nothing is written when nothing was edited, however many øre are stored', async () => {
    const backend = withStoredMinimum(15050)
    const wrapper = await mountDelivery(backend)

    await wrapper.vm.saveChanges()
    await settle(wrapper)

    expect(backend.calls.writes).toEqual([])
    expect(backend.store.minimumOrderPriceForHomeDelivery).toBe(15050)
  })

  test('saving the address alone does not touch the minimum', async () => {
    // The reported consequence: an operator who edits some OTHER setting on this page writes the
    // rounded value back. The address is the other write on the panel, so this is that path.
    const backend = withStoredMinimum(15050)
    const wrapper = await mountDelivery(backend)

    await wrapper.findAll('.address-panel .form-group input').at(2).setValue('Trondheim')
    await wrapper.vm.$nextTick()
    await saveButton(wrapper).trigger('click')
    await settle(wrapper)

    expect(backend.calls.writes.map(write => write.name)).toEqual(['CreateOrUpdateHomeDeliveryFromAddress'])
    expect(backend.store.minimumOrderPriceForHomeDelivery).toBe(15050)
  })
})

describe('the boxes normalise on blur, so what is on screen is what would be written', () => {
  test('one digit in the øre box is øre, not tenths of a krone', async () => {
    // `5` in a box labelled "Ører" is five øre. It is padded on the LEFT to `05`, which is both
    // what `fractionAmount` does when it decomposes a stored amount and the only reading that
    // round-trips: were it read as 50, the box would show a number it had not been given.
    const backend = withStoredMinimum(15000)
    const wrapper = await mountDelivery(backend)

    await oreBox(wrapper).setValue('5')
    await oreBox(wrapper).trigger('blur')
    await wrapper.vm.$nextTick()
    expect(oreBox(wrapper).element.value).toBe('05')

    await saveButton(wrapper).trigger('click')
    await settle(wrapper)
    expect(backend.store.minimumOrderPriceForHomeDelivery).toBe(15005)
  })

  test('an unreadable øre entry shows the zero it would write', async () => {
    const wrapper = await mountDelivery(withStoredMinimum(15000))

    await oreBox(wrapper).setValue('abc')
    await oreBox(wrapper).trigger('blur')
    await wrapper.vm.$nextTick()

    expect(oreBox(wrapper).element.value).toBe('00')
    expect(saveButton(wrapper).exists()).toBe(false)
  })

  test('an øre entry past 99 is shown clamped rather than silently folded into the kroner', async () => {
    // `maxlength="2"` keeps a person from typing this, so the arm is defensive. It is here because
    // the alternative conversion — modulo 100 — would turn `150` into `50` and look like a digit
    // had been eaten, which is the class of quiet arithmetic this whole file is about.
    const backend = withStoredMinimum(15000)
    const wrapper = await mountDelivery(backend)

    await oreBox(wrapper).setValue('150')
    await oreBox(wrapper).trigger('blur')
    await wrapper.vm.$nextTick()

    expect(oreBox(wrapper).element.value).toBe('99')
    await saveButton(wrapper).trigger('click')
    await settle(wrapper)
    expect(backend.store.minimumOrderPriceForHomeDelivery).toBe(15099)
  })

  test('a decimal typed into the kroner box still shows the whole kroner it would write', async () => {
    // The rule the previous lane pinned, restated against the pair: the kroner box takes kroner,
    // and `150,5` is not a way to reach the øre box. The øre box is.
    const wrapper = await mountDelivery(withStoredMinimum(15000))

    await kronerBox(wrapper).setValue('150.5')
    await kronerBox(wrapper).trigger('blur')
    await wrapper.vm.$nextTick()

    expect(kronerBox(wrapper).element.value).toBe('150')
    expect(oreBox(wrapper).element.value).toBe('00')
  })
})
