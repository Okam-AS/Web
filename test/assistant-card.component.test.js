import { shallowMount } from '@vue/test-utils'
import ProposalCardView from '~/components/admin/assistant/ProposalCardView.vue'

// The card is the only thing standing between a merchant and a price write they did not read.
// These are about that, not about layout.
describe('ProposalCardView', () => {
  function mountCard (card, props) {
    return shallowMount(ProposalCardView, {
      propsData: Object.assign({ card }, props || {}),
      mocks: {
        $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
        priceLabel: minor => 'kr ' + minor
      }
    })
  }

  const entry = (id, before, after) => ({
    TargetKind: 'product',
    TargetId: id,
    Field: 'amount',
    Before: { Amount: before, Currency: 'NOK' },
    After: { Amount: after, Currency: 'NOK' }
  })

  // ── THE ONE THAT MATTERS ───────────────────────────────────────────────────────────────────────
  // `StagedActionService` truncates the change set to a 50-row SAMPLE and reports the full blast
  // radius separately:
  //     ChangeSet     = changeSet.Take(CardChangeSetSample).ToList()   // CardChangeSetSample = 50
  //     AffectedCount = changeSet.Count
  // No endpoint returns the untruncated set. Without a notice, a merchant reads the rows on screen
  // and approves a number they were never shown.
  describe('the truncated sample vs. the real blast radius', () => {
    test('says how many of how many when the set is truncated', () => {
      const sample = []
      for (let i = 0; i < 50; i += 1) { sample.push(entry('p' + i, 10000, 12500)) }

      const wrapper = mountCard({
        Title: 'Prisøkning', ChangeSet: sample, AffectedCount: 214, ProposalId: 'x'
      })

      expect(wrapper.find('[data-test="truncation"]').text())
        .toBe('assistant_card_showingOf:{"shown":50,"total":214}')
    })

    test('says nothing when the sample IS the whole set', () => {
      const wrapper = mountCard({
        Title: 'Prisøkning', ChangeSet: [entry('p1', 10000, 12500)], AffectedCount: 1, ProposalId: 'x'
      })

      expect(wrapper.find('[data-test="truncation"]').exists()).toBe(false)
    })

    // The confirm is the last thing read before the write, so it names the FULL count and not the
    // length of the table above it. Getting this backwards is the whole defect in one line.
    test('the confirm names AffectedCount, not the number of rows shown', async () => {
      const sample = []
      for (let i = 0; i < 50; i += 1) { sample.push(entry('p' + i, 10000, 12500)) }

      const wrapper = mountCard({
        Title: 'Prisøkning', ChangeSet: sample, AffectedCount: 214, ProposalId: 'x'
      })

      wrapper.find('[data-test="approve-open"]').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-test="approve-confirm"]').text())
        .toBe('assistant_card_confirmApproveCounted:{"count":214}')
      expect(wrapper.find('[data-test="approve-confirm"]').text()).not.toContain('50')
    })
  })

  // ── TWO STEPS, AND THE FIRST ONE WRITES NOTHING ────────────────────────────────────────────────
  describe('the two-step approve', () => {
    test('the first click arms; it does not approve', async () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'p-1', ChangeSet: [entry('a', 1, 2)], AffectedCount: 1 })

      wrapper.find('[data-test="approve-open"]').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('approve')).toBeFalsy()
      expect(wrapper.find('[data-test="confirm-question"]').exists()).toBe(true)
    })

    test('the second click emits the proposal id', async () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'p-1', ChangeSet: [entry('a', 1, 2)], AffectedCount: 1 })

      wrapper.find('[data-test="approve-open"]').trigger('click')
      await wrapper.vm.$nextTick()
      wrapper.find('[data-test="approve-confirm"]').trigger('click')

      expect(wrapper.emitted('approve')[0]).toEqual(['p-1'])
    })

    test('cancelling disarms and leaves nothing emitted', async () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'p-1' })

      wrapper.find('[data-test="approve-open"]').trigger('click')
      await wrapper.vm.$nextTick()
      wrapper.find('[data-test="approve-cancel"]').trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('approve')).toBeFalsy()
      expect(wrapper.find('[data-test="approve-open"]').exists()).toBe(true)
    })

    // Reject is one step on purpose: it destroys nothing and the proposal was inert.
    test('reject is one step', () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'p-1' })

      wrapper.find('[data-test="reject"]').trigger('click')

      expect(wrapper.emitted('reject')[0]).toEqual(['p-1'])
    })

    // An Executed or Rejected row has nothing left to decide, and offering the buttons would be
    // offering an action that can only 409.
    test('a resolved row offers no decision at all', () => {
      const wrapper = mountCard({ Title: 't', Id: 'p-1', Status: 'Executed' })

      expect(wrapper.find('[data-test="approve-open"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="reject"]').exists()).toBe(false)
    })
  })

  // ── THE CARD IS A FROZEN PHOTOGRAPH AND CANNOT BE ASKED WHAT MAY HAPPEN NEXT ───────────────────
  // `GET /staged-actions/{id}` rebuilds the card verbatim from the bytes stored at stage time, so
  // it carries `NeedsApproval: true` and live approve/reject refs FOREVER — including for rows that
  // already executed. Keying the approve button off the card puts a live Approve on every executed
  // row in the inbox. The live `action.status` arrives as its own prop and outranks it.
  describe('live status vs. the frozen card', () => {
    test('NeedsApproval on the card does NOT make a resolved row decidable', () => {
      const wrapper = mountCard(
        { Title: 't', ProposalId: 'p-1', NeedsApproval: true, ApproveRef: '/staged-actions/p-1/approve' },
        { status: 'Executed' }
      )

      expect(wrapper.find('[data-test="approve-open"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="reject"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('assistant_status_executed')
    })

    test('the live status wins over a status the card happens to carry', () => {
      const wrapper = mountCard({ Title: 't', Id: 'p-1', Status: 'Staged' }, { status: 'Rejected' })

      expect(wrapper.find('[data-test="approve-open"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('assistant_status_rejected')
    })

    test('a Staged row is decidable, which is the whole point of the distinction', () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'p-1' }, { status: 'Staged' })

      expect(wrapper.find('[data-test="approve-open"]').exists()).toBe(true)
    })

    // A chat turn's card has no status at all and has just been staged, so it must be decidable.
    test('a card with no status anywhere is treated as freshly staged', () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'p-1' })

      expect(wrapper.find('[data-test="approve-open"]').exists()).toBe(true)
    })

    // Stated as "not Staged" rather than as a list of finals, so a status added to the enum later
    // is refused by default instead of silently growing an approve button.
    test('a status this client has never heard of is NOT decidable', () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'p-1' }, { status: 'Quarantined' })

      expect(wrapper.find('[data-test="approve-open"]').exists()).toBe(false)
    })

    test('Executing is not decidable either — the row is already claimed', () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'p-1' }, { status: 'Executing' })

      expect(wrapper.find('[data-test="approve-open"]').exists()).toBe(false)
    })
  })

  // ── ABSENT IS NOT EMPTY ────────────────────────────────────────────────────────────────────────
  describe('what the card refuses to invent', () => {
    // `discount_create` cards genuinely carry no change set: their `ChangeSetJson` is a JSON object
    // rather than an array, so `ReadChangeSet` returns null and BOTH members arrive null.
    test('a card with no change set renders no table and no count', () => {
      const wrapper = mountCard({ Title: 'Rabattkode', ChangeSet: null, AffectedCount: null, ProposalId: 'x' })

      expect(wrapper.find('[data-test="truncation"]').exists()).toBe(false)
      expect(wrapper.find('table').exists()).toBe(false)
    })

    // Newtonsoft writes the nulls System.Text.Json omits, so `null` and absent are the same state.
    test('an explicit null optional is treated exactly like an absent one', () => {
      const withNulls = mountCard({
        Title: 't', ProposalId: 'x', StoreScope: null, EffectiveWindow: null, SourceReceipt: null, ExpiresAt: null
      })
      const withAbsent = mountCard({ Title: 't', ProposalId: 'x' })

      expect(withNulls.find('dl').text()).toBe(withAbsent.find('dl').text())
    })

    // A change entry with no `before` is a value nobody recorded; `kr 0` is a price somebody set.
    test('a missing money value is a dash, never a zero', () => {
      const wrapper = mountCard({
        Title: 't',
        ProposalId: 'x',
        AffectedCount: 1,
        ChangeSet: [{ TargetKind: 'product', TargetId: 'a', Field: 'amount', Before: null, After: { Amount: 0 } }]
      })

      const cells = wrapper.findAll('tbody td')
      expect(cells.at(2).text()).toBe('—')
      expect(cells.at(3).text()).toBe('kr 0')
    })
  })

  // ── THE ONE REFUSAL A CLIENT CAN ACT ON ────────────────────────────────────────────────────────
  test('a kill-switch conflict shows the server’s own sentence beside the translated one', () => {
    const wrapper = mountCard({ Title: 't', ProposalId: 'x' }, {
      conflict: {
        key: 'assistant_conflict_kindDisabled',
        keepCard: true,
        serverMessage: 'This kind of change is switched off for this store…'
      }
    })

    const conflict = wrapper.find('.proposal-card__conflict')
    expect(conflict.exists()).toBe(true)
    expect(conflict.text()).toContain('assistant_conflict_kindDisabled')
    // Shown, never parsed: it is the ONLY place the row's real state is named, and it is server
    // prose that may be reworded.
    expect(conflict.text()).toContain('This kind of change is switched off for this store…')
  })

  // The inbox row has `DryRunDiff` where the chat card has `DiffLines`. Both must read the same.
  test('an inbox row falls back to DryRunDiff for its diff lines', () => {
    const wrapper = mountCard({ Id: 'p-1', Kind: 'menu_price_change', DryRunDiff: 'Tre retter opp 25 %' })

    expect(wrapper.find('.proposal-card__diff').text()).toContain('Tre retter opp 25 %')
  })

  // The origin is a source label and nothing else — one spine, one inbox. A SocialChef-staged row
  // gets no chrome a chat-staged one does not, because the approval it asks for is the same.
  describe('the origin stamp', () => {
    test('both staging surfaces translate, through the same markup', () => {
      const chat = mountCard({ Title: 't', Origin: 'chat' })
      const mcp = mountCard({ Title: 't', Origin: 'mcp' })

      expect(chat.text()).toContain('assistant_origin_chat')
      expect(mcp.text()).toContain('assistant_origin_mcp')
      expect(chat.find('.proposal-card__stamp--origin').classes())
        .toEqual(mcp.find('.proposal-card__stamp--origin').classes())
    })

    test('the card’s own vocabulary translates too', () => {
      expect(mountCard({ Title: 't', Origin: 'okam' }).text()).toContain('assistant_origin_okam')
      expect(mountCard({ Title: 't', Origin: 'socialchef' }).text()).toContain('assistant_origin_socialchef')
    })

    // A word newer than this screen is shown RAW rather than as a key name, so it reads as
    // untranslated rather than as a rendering bug.
    test('an origin this client has no word for is shown raw', () => {
      expect(mountCard({ Title: 't', Origin: 'zapier' }).text()).toContain('zapier')
      expect(mountCard({ Title: 't', Origin: 'zapier' }).text()).not.toContain('assistant_origin_zapier')
    })

    test('an unknown status is shown raw for the same reason', () => {
      expect(mountCard({ Title: 't', Status: 'Quarantined' }).text()).toContain('Quarantined')
      expect(mountCard({ Title: 't', Status: 'Staged' }).text()).toContain('assistant_status_staged')
    })
  })

  // ── THE STATUS STAMP WAS GREEN FOR EVERY STATUS ────────────────────────────────────────────────
  // One `.proposal-card__stamp--status` style, `#ecfdf5`/`#159f63`, on all six. Under the inbox's
  // "All" filter a Failed row's "Stoppet" and a Rejected row's "Avvist" therefore wore the same
  // success green as "Gjennomført" — the failure-in-success-green class already fixed one selector
  // away, on the decided line. A merchant reads colour before words.
  describe('the status stamp is toned by status', () => {
    const stampOf = status => mountCard({ Title: 't', ProposalId: 'x' }, { status })
      .find('[data-test="status-stamp"]')

    // ⚠️ THE ONE THIS EXISTS FOR.
    test('a Failed stamp does NOT wear the success tone', () => {
      const stamp = stampOf('Failed')

      expect(stamp.exists()).toBe(true)
      expect(stamp.classes()).not.toContain('is-ok')
      expect(stamp.classes()).toContain('is-refused')
    })

    test('executed is the only status that earns the success tone', () => {
      expect(stampOf('Executed').classes()).toContain('is-ok');
      ['Failed', 'Rejected', 'Expired', 'Staged', 'Executing'].forEach((status) => {
        expect(stampOf(status).classes()).not.toContain('is-ok')
      })
    })

    // Rejected and Expired are NOT failures — nothing went wrong and nothing was written — so they
    // are neither green nor red. Painting them red would invent an alarm.
    test('a turned-down or lapsed proposal is neutral, not an alarm', () => {
      expect(stampOf('Rejected').classes()).toContain('is-neutral')
      expect(stampOf('Expired').classes()).toContain('is-neutral')
      expect(stampOf('Rejected').classes()).not.toContain('is-refused')
    })

    test('still-in-motion statuses wear the waiting amber', () => {
      expect(stampOf('Staged').classes()).toContain('is-waiting')
      expect(stampOf('Executing').classes()).toContain('is-waiting')
    })

    // Refusing by default, in the same spirit as `isTerminal`: a status word newer than this screen
    // must never be able to arrive wearing the colour that means "it worked".
    test('an unknown status tones neutral rather than green', () => {
      const stamp = stampOf('Quarantined')
      expect(stamp.classes()).toContain('is-neutral')
      expect(stamp.classes()).not.toContain('is-ok')
    })
  })

  // ── AN ELAPSED COUNTDOWN IS A REFUSAL THE CLIENT CAN SEE COMING ────────────────────────────────
  // `ApproveAsync` refuses a proposal whose `ExpiresAt` has passed whether or not the sweeper has
  // moved the row's status yet (`StagedActionService.cs:170-174`), so a row can READ `Staged` while
  // every approve of it is already a 409. The chat thread is where this bit: a card there has no
  // live status at all — `ProposalCardModel` carries no `Status` member — so it stayed decidable
  // for as long as the tab was open, and the merchant's click bounced off a generic conflict.
  describe('an expired card stops offering a decision', () => {
    const ago = ms => new Date(Date.now() - ms).toISOString()
    const ahead = ms => new Date(Date.now() + ms).toISOString()

    test('a lapsed card withholds both buttons even with no live status', () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'x', ExpiresAt: ago(60000) })

      expect(wrapper.find('[data-test="approve-open"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="reject"]').exists()).toBe(false)
    })

    test('and says so where the countdown was', () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'x', ExpiresAt: ago(60000) })
      expect(wrapper.text()).toContain('assistant_card_expiredAlready')
    })

    // The guard is the CLOCK, not the status: a row still reading `Staged` past its expiry is
    // exactly the case the sweeper has not caught up with yet.
    test('a Staged row past its expiry is still refused', () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'x', ExpiresAt: ago(1) }, { status: 'Staged' })
      expect(wrapper.find('[data-test="approve-open"]').exists()).toBe(false)
    })

    test('a card still within its TTL is untouched', () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'x', ExpiresAt: ahead(3600000) })
      expect(wrapper.find('[data-test="approve-open"]').exists()).toBe(true)
    })

    // A card with no expiry at all must not be treated as expired — absent is not zero.
    test('a card carrying no expiry is decidable', () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'x' })
      expect(wrapper.find('[data-test="approve-open"]').exists()).toBe(true)
    })
  })

  // ── THE KIND STAMP RENDERED THE WIRE IDENTIFIER ────────────────────────────────────────────────
  describe('the kind stamp', () => {
    test('the three kinds okam executes are translated', () => {
      expect(mountCard({ Title: 't', Kind: 'menu_price_change' }).text())
        .toContain('assistant_kind_menu_price_change')
      expect(mountCard({ Title: 't', Kind: 'discount_create' }).text())
        .toContain('assistant_kind_discount_create')
      expect(mountCard({ Title: 't', Kind: 'store_hours_change' }).text())
        .toContain('assistant_kind_store_hours_change')
    })

    // ⚠️ A MISSING LABEL MUST DEGRADE TO UGLY, NEVER TO EMPTY. Two Margin kinds are being built in a
    // parallel lane and the card schema already admits four SocialChef-side ones this spine does not
    // execute. Every one of them must still name itself on the card.
    test('a kind this screen has no word for is shown raw, never blank', () => {
      const wrapper = mountCard({ Title: 't', Kind: 'margin_add_supplier_price' })
      const stamp = wrapper.find('.proposal-card__stamp')

      expect(stamp.text()).toBe('margin_add_supplier_price')
      expect(wrapper.text()).not.toContain('assistant_kind_margin_add_supplier_price')
    })

    test('a card with no kind grows no stamp at all', () => {
      expect(mountCard({ Title: 't' }).find('.proposal-card__stamp').exists()).toBe(false)
    })
  })

  // ── A REASSURANCE IS ONLY PRINTED WHERE IT IS TRUE ─────────────────────────────────────────────
  // "The list has been read again, so the status you see now is the current one" is a claim about
  // the CALLER's behaviour. `PendingActions` awaits `load()` before rendering any refusal, so it is
  // true there. The chat thread has no list, so it is not — and this sentence used to be printed
  // unconditionally by the component, which is a false reassurance beside a money decision.
  describe('the re-read reassurance', () => {
    const conflict = { key: 'assistant_conflict_stale', keepCard: false, serverMessage: 'the basis moved' }

    test('is withheld from a caller that did not re-read', () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'x' }, { conflict })

      expect(wrapper.text()).toContain('assistant_conflict_stale')
      expect(wrapper.text()).toContain('the basis moved')
      expect(wrapper.text()).not.toContain('assistant_conflict_relist')
    })

    test('is printed for a caller that promises it', () => {
      const wrapper = mountCard({ Title: 't', ProposalId: 'x' }, { conflict, relisted: true })
      expect(wrapper.text()).toContain('assistant_conflict_relist')
    })
  })

  test('the expiry countdown is cleared when the card goes away', () => {
    const clear = jest.spyOn(global, 'clearInterval')
    const wrapper = mountCard({ Title: 't', ProposalId: 'x', ExpiresAt: new Date(Date.now() + 3600000).toISOString() })
    const timer = wrapper.vm.timer

    wrapper.destroy()

    expect(clear).toHaveBeenCalledWith(timer)
    clear.mockRestore()
  })
})
