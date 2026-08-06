import translations from '~/translations'
import { setPlatform } from '~/core/platform'
import { StoreService } from '~/core/services/store-service'
// The fake backend, the mount and the microtask `settle` used to be written out below. They moved
// to a shared module — unchanged, comments and all — when `test/delivery-minimum-ore.test.js`
// needed the same fake server. Two copies of a fake backend is two different servers, and the
// second file's arms would then be pinning this page against a world this file never agreed to.
import { fakeBackend, mountDelivery, settle } from '~/test/support/delivery-page-harness'

// ---- WHY THIS FILE EXISTS ---------------------------------------------------------------------
//
// `pages/admin/delivery.vue` asked its store service to flip a switch and then did this:
//
//     const success = await action()
//     if (success) { showNotification(...); await refreshStore() }
//     // and on `false`: nothing. No message, no error, no re-read.
//
// The store service does not throw when a write does not land. `RequestService.TryParseResponse`
// returns `undefined` for a 204, for any non-200, and for a body it cannot parse, and every toggle
// in `core/services/store-service.ts` turns that into a plain `false` (`UpdateSelfPickUp` :133-137,
// `UpdateHomeDelivery` :139-143, `UpdateDineHomeDelivery` :151-155, `UpdateWoltDelivery` :157-161,
// `UpdateTableDelivery` :169-173). So the page's `false` is the ordinary shape of a write that did
// not happen, not a theoretical one.
//
// The consequence is not a missing toast. The switch STAYS WHERE THE OPERATOR PUT IT while the
// server still holds the old value, so a failed "turn off self-pickup" is pixel-identical to a
// successful one. The venue believes it stopped taking pickup orders and keeps taking them.
//
// That is why both halves are pinned here and why a message alone would not close it: telling the
// operator it failed while leaving the switch flipped still leaves the screen reporting a state
// the system is not in. The invariant asserted is
//
//     after any toggle attempt, the switch shows what the SERVER holds
//
// and it is asserted by holding a fake backend that refuses the write and keeps its old value, then
// reading the checkbox's own `checked` property — the same thing the operator's eye reads.
//
// ---- WHY THESE ASSERTIONS CANNOT PASS VACUOUSLY -----------------------------------------------
//
// Nineteen non-failing assertion shapes have shipped in this estate, so each arm below was run
// against the unfixed page first and each one reds there:
//
//   * "the switch stays flipped"      -> `checked` is false against the fix, true without it
//   * "nothing is said"               -> `.notification` does not exist without the fix
//   * "the store is never re-read"    -> the fake counts its own `Get` calls; 1 without, 2 with
//   * the same three for the home-delivery switch, whose call site ignored the booleans entirely
//   * the minimum-order field arms, measured before they were fixed (see the block above them)
//
// The `false` itself is not assumed either: the first describe drives the REAL `StoreService`
// through a fake http module and shows a 204 and an unparseable body both producing `false`
// without throwing. Delete the page fix and this file reds; delete the service fact and the page
// arms would be pinning a value the product never produces.

const switches = wrapper => wrapper.findAll('.settings-row input[type="checkbox"]')
const selfPickUpSwitch = wrapper => switches(wrapper).at(0)
const homeDeliverySwitch = wrapper => switches(wrapper).at(2)
const notification = wrapper => wrapper.find('.notification')
const saveButton = wrapper => wrapper.find('.address-panel .btn-primary')
// The KRONER box. It was the only minimum-order input when these arms were written; a later lane
// put an øre box beside it (`test/delivery-minimum-ore.test.js`) because the stored amount is øre
// and a whole-kroner field could not show one. Every assertion below is about kroner and is
// unchanged by that — but the selector is named rather than positional now, so it cannot come to
// mean the øre box the next time this panel is rearranged.
const minimumField = wrapper => wrapper.findAll('.address-panel .amount-inputs input').at(0)

describe('a store-service toggle reports a write that did not land as `false`, not as a throw', () => {
  // Drives the real StoreService, so the page arms below are pinning a value the product actually
  // produces rather than one this file invented.
  let respondWith
  let seen

  class FakeHttpModule {
    httpClient (request) {
      seen.push(request)
      return Promise.resolve(respondWith)
    }
  }
  class FakePersistenceModule {}

  beforeEach(() => {
    seen = []
    setPlatform(FakeHttpModule, FakePersistenceModule)
  })

  const service = () => new StoreService({ bearerToken: '', clientPlatformName: 'Web', cultureCode: 'no' })

  test('a 204 resolves false — the toggle the operator moved was not written', async () => {
    respondWith = { status: 204, data: '' }
    await expect(service().UpdateSelfPickUp(7, false)).resolves.toBe(false)
    // and it really did address the self-pickup route, so the 204 modelled is this route's 204
    expect(seen[0].url).toContain('/stores/7/selfpickup/false')
  })

  test('a 200 whose body cannot be read resolves false', async () => {
    respondWith = { status: 200, get data () { throw new Error('unparseable body') } }
    await expect(service().UpdateSelfPickUp(7, false)).resolves.toBe(false)
  })

  test('a 200 with a body resolves true, so `false` is not what every response produces', async () => {
    respondWith = { status: 200, data: true }
    await expect(service().UpdateSelfPickUp(7, false)).resolves.toBe(true)
  })
})

describe('a self-pickup switch that did not save says so, and goes back', () => {
  test('the successful arm: the switch moves, it is confirmed, and the store is re-read', async () => {
    const backend = fakeBackend()
    const wrapper = await mountDelivery(backend)
    expect(selfPickUpSwitch(wrapper).element.checked).toBe(true)

    await selfPickUpSwitch(wrapper).setChecked(false)
    await settle(wrapper)

    expect(backend.store.selfPickUp).toBe(false)
    expect(selfPickUpSwitch(wrapper).element.checked).toBe(false)
    expect(notification(wrapper).exists()).toBe(true)
    expect(notification(wrapper).classes()).toContain('notification--success')
    expect(backend.calls.get).toBe(2)
  })

  test('the refused arm: the switch does not stay flipped over a value the server never took', async () => {
    const backend = fakeBackend({}, ['UpdateSelfPickUp'])
    const wrapper = await mountDelivery(backend)
    expect(selfPickUpSwitch(wrapper).element.checked).toBe(true)

    await selfPickUpSwitch(wrapper).setChecked(false)
    await settle(wrapper)

    // the write was attempted and the server kept self-pickup ON
    expect(backend.calls.writes).toEqual([{ name: 'UpdateSelfPickUp', newValue: false }])
    expect(backend.store.selfPickUp).toBe(true)

    // ...so the venue must not be looking at an OFF switch
    expect(selfPickUpSwitch(wrapper).element.checked).toBe(true)
  })

  test('the refused arm: the operator is told the change was not saved', async () => {
    const backend = fakeBackend({}, ['UpdateSelfPickUp'])
    const wrapper = await mountDelivery(backend)

    await selfPickUpSwitch(wrapper).setChecked(false)
    await settle(wrapper)

    expect(notification(wrapper).exists()).toBe(true)
    expect(notification(wrapper).classes()).toContain('notification--error')
    expect(notification(wrapper).text()).toBe(translations.no.delivery_saveChangeError)
  })

  test('the refused arm: the store is re-read, so the screen shows the server and not the click', async () => {
    const backend = fakeBackend({}, ['UpdateSelfPickUp'])
    const wrapper = await mountDelivery(backend)
    expect(backend.calls.get).toBe(1)

    await selfPickUpSwitch(wrapper).setChecked(false)
    await settle(wrapper)

    expect(backend.calls.get).toBe(2)
  })

  test('a refused re-read still leaves the switch on the last value the server gave', async () => {
    // The re-read is how the screen is corrected; if the re-read ALSO fails the screen must still
    // not show the un-saved position, and the failure message must not be replaced by a message
    // about reading.
    const backend = fakeBackend({}, ['UpdateSelfPickUp'])
    const wrapper = await mountDelivery(backend)
    backend.service.Get = () => Promise.reject(new Error('read failed'))

    await selfPickUpSwitch(wrapper).setChecked(false)
    await settle(wrapper)

    expect(selfPickUpSwitch(wrapper).element.checked).toBe(true)
    expect(notification(wrapper).classes()).toContain('notification--error')
    expect(notification(wrapper).text()).toBe(translations.no.delivery_saveChangeError)
  })
})

describe('the home-delivery switch, whose call site never looked at the booleans at all', () => {
  // `deliveryEnabledChange` and `changeDeliveryType` fire three writes with `Promise.all` and
  // discard every result, so a refused write there was reported as SUCCESS — a louder version of
  // the same lie than the silent one on self-pickup.
  test('a refused home-delivery write is not announced as an activation', async () => {
    const backend = fakeBackend({}, ['UpdateHomeDelivery'])
    const wrapper = await mountDelivery(backend)
    expect(homeDeliverySwitch(wrapper).element.checked).toBe(false)

    await homeDeliverySwitch(wrapper).setChecked(true)
    await settle(wrapper)

    expect(backend.store.homeDeliveryEnabled).toBe(false)
    expect(homeDeliverySwitch(wrapper).element.checked).toBe(false)
    expect(notification(wrapper).classes()).toContain('notification--error')
    expect(notification(wrapper).text()).toBe(translations.no.delivery_updateHomeDeliveryError)
  })

  test('the successful arm still confirms and re-reads', async () => {
    const backend = fakeBackend()
    const wrapper = await mountDelivery(backend)

    await homeDeliverySwitch(wrapper).setChecked(true)
    await settle(wrapper)

    expect(backend.store.homeDeliveryEnabled).toBe(true)
    expect(homeDeliverySwitch(wrapper).element.checked).toBe(true)
    expect(notification(wrapper).classes()).toContain('notification--success')
  })

  test('a PARTLY applied carrier switch is shown as the third state it left behind', async () => {
    // The fourth call site: `changeDeliveryType` fires three writes and used to discard all three.
    // This is where discarding them costs most, because the three are not atomic: turning own
    // driving OFF lands, turning Wolt ON does not, and the venue is left with NO home delivery at
    // all — a state neither the operator nor the old code ever named. The page used to announce
    // "delivery type changed to Wolt" over it.
    const backend = fakeBackend({ homeDeliveryEnabled: true }, ['UpdateWoltDelivery'])
    const wrapper = await mountDelivery(backend)
    expect(wrapper.findAll('.delivery-type-option').at(0).classes()).toContain('active')

    await wrapper.findAll('.delivery-type-option').at(1).trigger('click')
    await settle(wrapper)

    // what the server was actually left holding
    expect(backend.store.homeDeliveryEnabled).toBe(false)
    expect(backend.store.woltDriveEnabled).toBe(false)

    // ...and that is what the page shows: home delivery off, no carrier claimed
    expect(homeDeliverySwitch(wrapper).element.checked).toBe(false)
    expect(wrapper.findAll('.delivery-type-option').length).toBe(0)
    expect(notification(wrapper).classes()).toContain('notification--error')
    expect(notification(wrapper).text()).toBe(translations.no.delivery_changeHomeDeliveryTypeError)
  })
})

// ---- THE SECOND DEFECT IN THE SAME FILE, MEASURED BEFORE IT WAS FIXED --------------------------
//
// Reported as: `:404-408` floors the stored minimum to whole kroner while `:504-506` compares the
// un-floored øre value, so a store whose minimum has an øre component is permanently dirty — Save
// never goes away and pressing it silently writes the rounded-down value.
//
// MEASURED, and it reproduces exactly as described: mounting against a store holding 15050 øre
// showed the Save button with nothing edited, and pressing it posted 15000.
//
// One qualification the report did not carry, found while measuring: NOTHING IN THIS REPO CAN
// CREATE such a store. `delivery.vue` is the only writer of the field here (the single
// `SetMinimumAmountForDelivery` call site) and it always sends `kroner * 100`. Reaching the
// reported trigger needs a writer outside this repo — the raw `/stores/{id}/minimumamountfordelivery/{amount}`
// route takes any integer. That is very likely why a second reader could not verify it.
//
// The same asymmetry IS reachable from this repo from the other side, and was measured too: the
// field is a free-text input, so typing `150.5` gives `parseInt` -> 150 -> 15000 øre, which equals
// what is stored, so Save never appears and the operator walks away from a field reading `150.5`
// against a stored 150. Same lie, same computed, reachable with a keyboard.
//
// Both are closed by one change: the dirty check now compares the FIELD's value against the
// FIELD's value for what is stored (one conversion, applied to both sides), and the field is
// normalised on blur to the number that would actually be written.

describe('the minimum-order field shows what is stored and what would be written', () => {
  const withHomeDelivery = extra => fakeBackend({ homeDeliveryEnabled: true, ...extra })

  test('nothing edited, whole-kroner minimum: no Save is offered', async () => {
    const wrapper = await mountDelivery(withHomeDelivery({ minimumOrderPriceForHomeDelivery: 15000 }))
    expect(minimumField(wrapper).element.value).toBe('150')
    expect(saveButton(wrapper).exists()).toBe(false)
  })

  test('nothing edited, a minimum carrying øre: still no Save is offered', async () => {
    const wrapper = await mountDelivery(withHomeDelivery({ minimumOrderPriceForHomeDelivery: 15050 }))
    expect(saveButton(wrapper).exists()).toBe(false)
  })

  test('a minimum carrying øre is never silently rounded down by a Save the operator did not ask for', async () => {
    // Driven through the method rather than the button ON PURPOSE: against the defect the button
    // WAS on screen (the arm above), so this is what a venue owner pressing it got — 150,50 kr
    // quietly became 150 kr. Against the fix the button is gone and the save path writes nothing,
    // which is the property being pinned: the page never posts a money value nobody typed.
    const backend = withHomeDelivery({ minimumOrderPriceForHomeDelivery: 15050 })
    const wrapper = await mountDelivery(backend)

    await wrapper.vm.saveChanges()
    await settle(wrapper)

    expect(backend.calls.writes).toEqual([])
    expect(backend.store.minimumOrderPriceForHomeDelivery).toBe(15050)
  })

  test('a real edit is still offered and still saves', async () => {
    const backend = withHomeDelivery({ minimumOrderPriceForHomeDelivery: 15000 })
    const wrapper = await mountDelivery(backend)

    await minimumField(wrapper).setValue('200')
    await wrapper.vm.$nextTick()
    expect(saveButton(wrapper).exists()).toBe(true)

    await saveButton(wrapper).trigger('click')
    await settle(wrapper)

    expect(backend.store.minimumOrderPriceForHomeDelivery).toBe(20000)
    expect(saveButton(wrapper).exists()).toBe(false)
  })

  test('typed øre are not accepted-looking and then dropped: the field shows what would be written', async () => {
    const wrapper = await mountDelivery(withHomeDelivery({ minimumOrderPriceForHomeDelivery: 15000 }))

    await minimumField(wrapper).setValue('150.5')
    await minimumField(wrapper).trigger('blur')
    await wrapper.vm.$nextTick()

    expect(minimumField(wrapper).element.value).toBe('150')
  })

  test('an unreadable entry shows the zero it would write rather than hiding it', async () => {
    const wrapper = await mountDelivery(withHomeDelivery({ minimumOrderPriceForHomeDelivery: 15000 }))

    await minimumField(wrapper).setValue('to hundre')
    await minimumField(wrapper).trigger('blur')
    await wrapper.vm.$nextTick()

    expect(minimumField(wrapper).element.value).toBe('0')
    expect(saveButton(wrapper).exists()).toBe(true)
  })

  test('a refused minimum-order save is reported, and the form still reads as unsaved', async () => {
    // A FORM behaves differently from a SWITCH here, on purpose. A switch must snap back, because
    // its position is the only thing claiming a state. A form must KEEP the operator's draft — but
    // it must not look saved, so Save stays on screen and the error says the write did not land.
    const backend = withHomeDelivery({ minimumOrderPriceForHomeDelivery: 15000 })
    const wrapper = await mountDelivery(backend)
    backend.service.SetMinimumAmountForDelivery = () => Promise.resolve(false)

    await minimumField(wrapper).setValue('200')
    await wrapper.vm.$nextTick()
    await saveButton(wrapper).trigger('click')
    await settle(wrapper)

    expect(backend.store.minimumOrderPriceForHomeDelivery).toBe(15000)
    expect(notification(wrapper).classes()).toContain('notification--error')
    expect(notification(wrapper).text()).toBe(translations.no.delivery_saveSettingsError)
    expect(minimumField(wrapper).element.value).toBe('200')
    expect(saveButton(wrapper).exists()).toBe(true)
  })
})

// ---- A THIRD INSTANCE OF THE SAME ASYMMETRY, FOUND WHILE MEASURING THE SECOND ------------------
//
// `hasDeliveryAddressChanges` compares the store's address fields RAW against locals that were
// initialised with `|| ""`. An address whose city (or zip, or street) comes back null therefore
// compares `null !== ""` forever: Save is offered on a page nobody edited, and pressing it posts
// the address anyway. Unlike the øre case this needs no writer outside the repo — a store with a
// partly-empty address is ordinary.

describe('an address with an empty field does not offer a Save nobody asked for', () => {
  test('a null city does not leave the page permanently dirty', async () => {
    const wrapper = await mountDelivery(fakeBackend({
      homeDeliveryEnabled: true,
      address: { fullAddress: 'Kong Oscars gate 1', zipCode: '5017', city: null }
    }))
    expect(saveButton(wrapper).exists()).toBe(false)
  })

  test('a store with no address at all does not leave the page permanently dirty', async () => {
    const wrapper = await mountDelivery(fakeBackend({
      homeDeliveryEnabled: true,
      address: null,
      homeDeliveryFromAddress: null
    }))
    expect(saveButton(wrapper).exists()).toBe(false)
  })

  test('editing the city still offers Save', async () => {
    const wrapper = await mountDelivery(fakeBackend({
      homeDeliveryEnabled: true,
      address: { fullAddress: 'Kong Oscars gate 1', zipCode: '5017', city: null }
    }))
    await wrapper.findAll('.address-panel .form-group input').at(2).setValue('Bergen')
    await wrapper.vm.$nextTick()
    expect(saveButton(wrapper).exists()).toBe(true)
  })
})

// ---- THE LEAKING TIMER ------------------------------------------------------------------------
//
// `showNotification` arms a 3.5s `setTimeout` that writes `this.notification.show` and the page had
// no `beforeDestroy`, so navigating away inside the window left a timer holding the destroyed
// component. Small, but it is armed by the very method this lane added two new callers to.

describe('the notification timer does not outlive the page', () => {
  test('leaving the page clears an armed notification timeout', async () => {
    jest.useFakeTimers()
    try {
      const wrapper = await mountDelivery(fakeBackend())
      await selfPickUpSwitch(wrapper).setChecked(false)
      await settle(wrapper)
      expect(wrapper.vm.notification.timeout).not.toBeNull()

      const armed = wrapper.vm.notification.timeout
      wrapper.destroy()
      expect(clearTimeout).toHaveBeenCalledWith(armed)
    } finally {
      jest.useRealTimers()
    }
  })
})
