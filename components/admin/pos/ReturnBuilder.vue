<template>
  <div class="rbuild" @click.self="$emit('close')">
    <div class="rbuild__panel">
      <header class="rbuild__head">
        <h2 class="rbuild__title">
          {{ $i(titleKey) }}
        </h2>
        <button type="button" class="rbuild__close" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <!-- Build the return lines -->
      <div v-if="step === 'build'" class="rbuild__body">
        <!-- One eat-in/take-away context for the whole return (default take-away): a line whose goods
             group has a VAT profile takes its rate from group x this context. -->
        <div class="rbuild__context">
          <span class="rbuild__context-label">{{ $i('pos_return_context') }}</span>
          <div class="rbuild__context-toggle">
            <button type="button" :class="{ 'is-active': vatContext === 'SelfPickup' }" @click="setContext('SelfPickup')">{{ $i('pos_takeaway') }}</button>
            <button type="button" :class="{ 'is-active': vatContext === 'TableDelivery' }" @click="setContext('TableDelivery')">{{ $i('pos_eat_in') }}</button>
          </div>
        </div>

        <div v-if="lines.length" class="rbuild__lines">
          <div v-for="(l, i) in lines" :key="i" class="rbuild__line">
            <div class="rbuild__line-main">
              <span class="rbuild__line-name">{{ l.name }}</span>
              <span class="rbuild__line-meta">{{ l.quantity }} × {{ priceLabel(l.unitAmount) }} · {{ l.vatPercent }}%</span>
            </div>
            <span class="rbuild__line-amount">{{ priceLabel(l.unitAmount * l.quantity) }}</span>
            <button type="button" class="rbuild__line-remove" @click="lines.splice(i, 1)">
              ×
            </button>
          </div>
        </div>

        <div class="rbuild__entry-modes">
          <button type="button" class="rbuild__entry-mode" :class="{ 'is-active': entryMode === 'menu' }" @click="entryMode = 'menu'">
            {{ $i('pos_return_from_menu') }}
          </button>
          <button type="button" class="rbuild__entry-mode" :class="{ 'is-active': entryMode === 'manual' }" @click="entryMode = 'manual'">
            {{ $i('pos_return_manual') }}
          </button>
        </div>

        <!-- Pick a menu item: tap it and it becomes a return line (price + VAT + goods group from the
             product). Tapping the same item again bumps its quantity. -->
        <div v-if="entryMode === 'menu'" class="rbuild__menu">
          <input v-model="menuQuery" type="text" class="rbuild__input" :placeholder="$i('pos_return_menu_search_ph')">
          <div class="rbuild__menu-list">
            <button
              v-for="p in filteredProducts"
              :key="p.productId || p.name"
              type="button"
              class="rbuild__menu-item"
              @click="pickProduct(p)"
            >
              <span class="rbuild__menu-name">{{ p.name }}</span>
              <span class="rbuild__menu-price">{{ priceLabel(p.amount) }}</span>
            </button>
            <p v-if="!filteredProducts.length" class="rbuild__menu-empty">
              {{ $i('pos_return_lookup_empty') }}
            </p>
          </div>
        </div>

        <div v-else class="rbuild__add">
          <label class="rbuild__label">{{ $i('pos_return_line_name') }}</label>
          <input v-model="draft.name" type="text" class="rbuild__input" :placeholder="$i('pos_return_line_name_ph')">

          <label class="rbuild__label">{{ $i('pos_return_line_qty') }}</label>
          <input v-model.number="draft.quantity" type="number" min="1" class="rbuild__input">

          <label class="rbuild__label">{{ $i('pos_open_price_goods_group') }}</label>
          <!-- The group is the rate selector: each button shows the rate that group gives for the
               return's context, so picking a group is the only VAT input needed. -->
          <p v-if="!goodsGroups.length" class="rbuild__no-groups">
            {{ $i('pos_no_goods_groups') }}
          </p>
          <div class="rbuild__groups">
            <button
              v-for="g in goodsGroups"
              :key="g.goodsGroupId"
              type="button"
              class="rbuild__group"
              :class="{ 'is-active': draft.goodsGroupId === g.goodsGroupId }"
              @click="draft.goodsGroupId = g.goodsGroupId"
            >
              <span class="rbuild__group-name">{{ g.name }}</span>
              <span class="rbuild__group-rate">
                <template v-if="groupVat(g) != null">{{ groupVat(g) }} % · {{ contextLabel }}</template>
                <template v-else>{{ $i('pos_goods_group_no_profile') }}</template>
              </span>
            </button>
          </div>

          <!-- Legacy group without a VAT profile: the operator still picks the rate manually. -->
          <template v-if="draft.goodsGroupId != null && !draftGroupHasProfile">
            <label class="rbuild__label">{{ $i('pos_open_price_vat') }}</label>
            <div class="rbuild__vat">
              <button
                v-for="rate in vatRates"
                :key="rate"
                type="button"
                class="rbuild__vat-btn"
                :class="{ 'is-active': draft.vatPercent === rate }"
                @click="draft.vatPercent = rate"
              >
                {{ rate }}%
              </button>
            </div>
          </template>

          <label class="rbuild__label">{{ $i('pos_return_line_amount') }}</label>
          <AmountPad v-model="draft.unitAmount" />

          <button type="button" class="rbuild__add-btn" :disabled="!canAddLine" @click="addLine">
            {{ $i('pos_return_add_line') }}
          </button>
        </div>
      </div>

      <!-- Payment mean + § 5-3-7 documentation -->
      <div v-else-if="step === 'settle'" class="rbuild__body">
        <!-- What is being returned. Read-only when the lines came off the bill (the bill already
             decided them); a line missing its goods group gets an inline picker and nothing more. -->
        <div v-if="prefilled" class="rbuild__lines">
          <div v-for="(l, i) in lines" :key="i" class="rbuild__line">
            <div class="rbuild__line-main">
              <span class="rbuild__line-name">{{ l.name }}</span>
              <span class="rbuild__line-meta">{{ l.quantity }} × {{ priceLabel(l.unitAmount) }} · {{ l.vatPercent }}%</span>
              <select v-if="l.goodsGroupId == null" v-model.number="l.goodsGroupId" class="rbuild__input rbuild__line-group">
                <option :value="null">
                  {{ $i('pos_open_price_pick_group') }}
                </option>
                <option v-for="g in goodsGroups" :key="g.goodsGroupId" :value="g.goodsGroupId">
                  {{ g.name }}<template v-if="g.code">
                    ({{ g.code }})
                  </template>
                </option>
              </select>
            </div>
            <span class="rbuild__line-amount">{{ priceLabel(l.unitAmount * l.quantity) }}</span>
          </div>
        </div>

        <div class="rbuild__summary">
          <span>{{ $i('pos_return_total') }}</span>
          <strong>{{ priceLabel(total) }}</strong>
        </div>

        <label class="rbuild__label">{{ $i('pos_return_method') }}</label>
        <!-- The card option only shows when the terminal provider supports unreferenced card
             returns and the acquirer has enabled them (cashPoint.unreferencedCardReturnEnabled);
             the backend refuses the initiate regardless. -->
        <div class="rbuild__methods">
          <button type="button" class="rbuild__method" :class="{ 'is-active': method === 'cash' }" @click="method = 'cash'">
            {{ $i('pos_pay_cash') }}
          </button>
          <button v-if="cardReturnEnabled" type="button" class="rbuild__method" :class="{ 'is-active': method === 'card' }" @click="method = 'card'">
            {{ $i('pos_pay_card') }}
          </button>
        </div>

        <ReasonPicker context="return" :label="$i('pos_refund_reason')" v-model="reasonSel" />

        <label class="rbuild__label">{{ $i('pos_return_customer_phone') }}</label>
        <PhonePad v-model="customerPhone" :placeholder="$i('pos_return_customer_phone_ph')" />

        <template v-if="method === 'cash'">
          <label class="rbuild__label">{{ $i('pos_return_signature') }}</label>
          <p class="sign-handover">{{ $i('pos_sign_hand_over') }}</p>
          <SignaturePad v-model="signature" />
        </template>
        <p v-else class="rbuild__terminal-note">
          {{ $i('pos_return_card_signature_note') }}
        </p>

        <p v-if="error" class="rbuild__error">
          {{ error }}
        </p>
      </div>

      <!-- Card return awaiting cardholder approval -->
      <div v-else-if="step === 'card-wait'" class="rbuild__body rbuild__body--center">
        <div class="rbuild__spinner" />
        <p class="rbuild__wait">
          {{ $i('pos_refund_present_card') }}
        </p>
        <p class="rbuild__wait-amount">
          {{ priceLabel(total) }}
        </p>
        <button type="button" class="rbuild__link" @click="$emit('close')">
          {{ $i('common_close') }}
        </button>
      </div>

      <!-- Done -->
      <div v-else-if="step === 'done'" class="rbuild__body">
        <PosReceiptView ref="receiptView" :receipt="resultReceipt" />
        <div class="rbuild__done-actions">
          <button type="button" class="rbuild__ract" @click="printReceipt">
            {{ $i('pos_receipt_print') }}
          </button>
          <button type="button" class="rbuild__primary" @click="$emit('done', resultReceipt, lines)">
            {{ $i('common_done') }}
          </button>
        </div>
        <p v-if="error" class="rbuild__error">
          {{ error }}
        </p>
      </div>

      <footer v-if="step === 'build' || step === 'settle'" class="rbuild__foot">
        <button v-if="step === 'settle' && !prefilled" type="button" class="rbuild__back" @click="step = 'build'; error = ''">
          {{ $i('pos_back') }}
        </button>
        <button type="button" class="rbuild__primary" :disabled="!canAdvance" @click="advance">
          {{ step === 'build' ? ($i('pos_refund_continue') + ' · ' + priceLabel(total)) : $i('pos_refund_sale') }}
        </button>
      </footer>
    </div>

    <!-- Raised only after a card attempt whose outcome we could not observe. -->
    <PosConfirm
      v-if="showRetryConfirm"
      :title="$i('pos_return_retry_title')"
      :text="$i('pos_return_retry_warn')"
      :confirm-label="$i('pos_return_retry_ok')"
      danger
      @confirm="onRetryConfirmed"
      @cancel="showRetryConfirm = false"
    />
  </div>
</template>

<script>
import AmountPad from '~/components/admin/pos/AmountPad.vue';
import SignaturePad from '~/components/admin/pos/SignaturePad.vue';
import PosReceiptView from '~/components/admin/pos/PosReceiptView.vue';
import ReasonPicker from '~/components/admin/pos/ReasonPicker.vue';
import PhonePad from '~/components/admin/pos/PhonePad.vue';
import PosConfirm from '~/components/admin/pos/PosConfirm.vue';
import { newGuid } from '~/utils/guid';

const CARD_POLL_MS = 2500;
const CARD_TIMEOUT_MS = 130000;

// Unreferenced (open) return: rings in a refund without an original sale. The operator picks return
// lines from the menu (or builds them manually), each with a goods group + VAT so the RETREC is
// fiscally classified, then refunds to cash (out of the drawer) or to a card on the terminal. § 5-3-7
// documentation (a one-tap reason + phone, plus a signature for cash) is captured before the acting
// operator authorises the return. The card path is asynchronous (cardholder taps) and only works when
// the acquirer has enabled unreferenced credits — otherwise the backend returns a clear "not enabled"
// error.
export default {
  name: 'ReturnBuilder',
  components: { AmountPad, SignaturePad, PosReceiptView, ReasonPicker, PhonePad, PosConfirm },
  inject: ['pos'],
  props: {
    // Same fiscal object (an unreferenced RETREC), shown as "Ny retur" from Day flow or as
    // "Negativ salg" from the Sell screen.
    titleKey: { type: String, default: 'pos_return_new_title' },
    // Return lines mapped from the bill (Sell screen): the bill already decided what is returned
    // and for how much, so the builder skips straight to the settle step. Each line carries its
    // sourceLineIds so the caller can take the returned goods off the bill afterwards.
    initialLines: { type: Array, default: null }
  },
  data () {
    return {
      step: this.initialLines && this.initialLines.length ? 'settle' : 'build',
      entryMode: 'menu',
      menuQuery: '',
      goodsGroups: [],
      lines: (this.initialLines || []).map(l => ({ ...l })),
      draft: { name: '', quantity: 1, unitAmount: 0, vatPercent: 25, goodsGroupId: null },
      // Per-document eat-in/take-away context (default take-away). Sent with the return so the
      // backend derives each profiled line's rate from group x this context.
      vatContext: 'SelfPickup',
      vatRates: [25, 15, 12, 0],
      method: 'cash',
      // Idempotency key for the cash return (required by the backend): one GUID per builder
      // instance (one logical return), so a retry after a lost response returns the
      // already-journalled RETREC instead of signing and paying out a second one.
      returnId: newGuid(),
      reasonSel: { reasonType: 'None', reasonText: '' },
      customerPhone: '',
      signature: '',
      error: '',
      busy: false,
      resultReceipt: null,
      cardTxId: '',
      // A card return that failed WITHOUT giving us a transaction id may still have reached the
      // terminal — the initiate endpoint carries no idempotency key (unlike the cash path's
      // returnId), so a blind second attempt refunds the customer twice.
      cardMayHaveStarted: false,
      showRetryConfirm: false,
      pollTimer: null,
      pollElapsed: 0
    };
  },
  computed: {
    prefilled () { return !!(this.initialLines && this.initialLines.length); },
    cashPointId () { return this.pos.cashPoint.cashPointId; },
    cardReturnEnabled () { return !!this.pos.cashPoint.unreferencedCardReturnEnabled; },
    total () { return this.lines.reduce((sum, l) => sum + l.unitAmount * l.quantity, 0); },
    reasonChosen () {
      if (this.reasonSel.reasonType === 'None') { return false; }
      if (this.reasonSel.reasonType === 'Annet') { return !!(this.reasonSel.reasonText || '').trim(); }
      return true;
    },
    canAddLine () {
      return this.draft.name.trim().length > 0 && this.draft.unitAmount > 0 && this.draft.quantity >= 1 && this.draft.goodsGroupId != null;
    },
    contextLabel () { return this.vatContext === 'TableDelivery' ? this.$i('pos_eat_in') : this.$i('pos_takeaway'); },
    draftGroupHasProfile () { return this.effectiveVat(this.draft.goodsGroupId) != null; },
    draftDerivedVat () { return this.effectiveVat(this.draft.goodsGroupId); },
    // Every sellable product across the catalog, so a return line can be picked from the menu.
    allProducts () {
      const out = [];
      (this.pos.catalog || []).forEach((cat) => {
        (cat.categoryProductListItems || [])
          .filter(i => !i.isHeading && i.product && !i.product.hide)
          .forEach(i => out.push(i.product));
      });
      return out;
    },
    filteredProducts () {
      const q = this.menuQuery.trim().toLowerCase();
      if (!q) { return this.allProducts; }
      return this.allProducts.filter(p => (p.name || '').toLowerCase().includes(q));
    },
    canAdvance () {
      // Returns are money-moving and the card path has no idempotency key — block a second
      // tap while the first request is in flight.
      if (this.busy) { return false; }
      if (this.step === 'build') { return this.lines.length > 0; }
      if (this.step === 'settle') {
        // Every line must be classified with a goods group before the RETREC can be journalled; a
        // bill row may lack one (product without a goods group) until the inline picker fills it.
        if (!this.lines.length || this.lines.some(l => l.goodsGroupId == null)) { return false; }
        if (!this.reasonChosen || !this.customerPhone.trim()) { return false; }
        if (this.method === 'cash' && !this.signature) { return false; }
        return true;
      }
      return false;
    }
  },
  mounted () {
    this.loadGoodsGroups();
  },
  beforeDestroy () {
    this.stopPoll();
  },
  methods: {
    async loadGoodsGroups () {
      try {
        this.goodsGroups = (await this.pos.goodsGroupSvc().GetForStore(this.pos.storeId) || []).filter(g => g.isActive);
      } catch (e) {
        this.goodsGroups = [];
      }
    },
    // The VAT rate for a goods group in the current context: group profile x context when the group
    // is profiled, otherwise null (the operator-picked rate applies).
    effectiveVat (goodsGroupId) {
      return this.groupVat(this.goodsGroups.find(x => x.goodsGroupId === goodsGroupId));
    },
    groupVat (g) {
      if (g && g.takeAwayVatPercent != null && g.eatInVatPercent != null && g.deliveryVatPercent != null) {
        return this.vatContext === 'TableDelivery' ? g.eatInVatPercent : g.takeAwayVatPercent;
      }
      return null;
    },
    // Switching the document context re-prices every already-added line whose group is profiled.
    setContext (ctx) {
      this.vatContext = ctx;
      this.lines.forEach((l) => {
        const v = this.effectiveVat(l.goodsGroupId);
        if (v != null) { l.vatPercent = v; }
      });
    },
    addLine () {
      if (!this.canAddLine) { return; }
      const derived = this.effectiveVat(this.draft.goodsGroupId);
      this.lines.push({
        name: this.draft.name.trim(),
        quantity: this.draft.quantity,
        unitAmount: this.draft.unitAmount,
        vatPercent: derived != null ? derived : this.draft.vatPercent,
        goodsGroupId: this.draft.goodsGroupId
      });
      this.draft = { name: '', quantity: 1, unitAmount: 0, vatPercent: this.draft.vatPercent, goodsGroupId: this.draft.goodsGroupId };
    },
    // Add a menu item as a return line. The price, VAT and goods group come from the product. A
    // product missing a goods group (or on an unsupported VAT rate) drops into the manual form so the
    // operator completes it, rather than being added as an invalid line the backend would reject.
    pickProduct (p) {
      // Menu pick sets the goods group from the product; the rate follows from group x context for a
      // profiled group, else the product's own rate.
      const derived = this.effectiveVat(p.goodsGroupId);
      // Trust the product's own rate for any legal Norwegian VAT rate (incl. 12%) — silently
      // rewriting it would journal the wrong rate on the RETREC.
      const vatPercent = derived != null ? derived : (this.vatRates.includes(p.tax) ? p.tax : 25);
      if (p.goodsGroupId == null) {
        this.draft = { name: p.name, quantity: 1, unitAmount: p.amount, vatPercent, goodsGroupId: null };
        this.entryMode = 'manual';
        return;
      }
      // Stack onto an identical existing line (same product/price/VAT) instead of duplicating it.
      const existing = this.lines.find(l => l.name === p.name && l.unitAmount === p.amount && l.vatPercent === vatPercent && l.goodsGroupId === p.goodsGroupId);
      if (existing) {
        existing.quantity += 1;
      } else {
        this.lines.push({ name: p.name, quantity: 1, unitAmount: p.amount, vatPercent, goodsGroupId: p.goodsGroupId });
      }
    },
    advance () {
      if (this.step === 'build' && this.lines.length) { this.step = 'settle'; this.error = ''; return; }
      if (this.step === 'settle' && this.canAdvance) {
        this.error = '';
        this.doReturn();
      }
    },
    async doReturn () {
      if (this.busy) { return; }
      // Only ever asked after a card attempt whose outcome we could not observe. Refusing to
      // re-arm silently is the point: the operator has to look at the terminal first, because the
      // server cannot tell the retry apart from a fresh return.
      if (this.method === 'card' && this.cardMayHaveStarted) {
        this.showRetryConfirm = true;
        return;
      }
      this.busy = true;
      const base = {
        cashPointId: this.cashPointId,
        reasonType: this.reasonSel.reasonType,
        reasonText: (this.reasonSel.reasonText || '').trim(),
        customerPhone: this.customerPhone.trim(),
        // Manual builder sends the eat-in/take-away context so profiled lines resolve their rate
        // server-side. The negative-sale-from-bill flow (prefilled) leaves it null and keeps the
        // rates the bill already carried.
        vatContext: this.prefilled ? null : this.vatContext,
        lines: this.lines
      };
      try {
        if (this.method === 'cash') {
          const receipt = await this.pos.posSvc().ReturnCash({ ...base, returnId: this.returnId, customerSignature: this.signature });
          this.resultReceipt = receipt;
          this.step = 'done';
        } else {
          const result = await this.pos.posSvc().InitiateReturnCard(base);
          if (result && result.confirmed && result.returnReceipt) {
            this.resultReceipt = result.returnReceipt;
            this.step = 'done';
          } else if (result && result.paymentTransactionId) {
            this.cardTxId = result.paymentTransactionId;
            this.step = 'card-wait';
            this.pollElapsed = 0;
            this.startPoll();
          } else {
            this.error = this.$i('pos_generic_error');
          }
        }
      } catch (e) {
        // A cash return is safe to retry (returnId dedupes it server-side). A card return is only
        // unsafe when the outcome is genuinely unknown: no response at all, or a 5xx that may have
        // been thrown after the terminal was already told to refund. A 4xx is the server's own
        // validator rejecting the payload before anything reached the terminal — warning about a
        // possible double refund there is false, and a warning that cries wolf gets clicked
        // through on the one occasion it is real.
        if (this.method === 'card' && this.outcomeUnknown(e)) { this.cardMayHaveStarted = true; }
        this.error = this.pos.errMsg(e);
        this.step = 'settle';
      } finally {
        this.busy = false;
      }
    },
    // No status = the request never completed (transport/timeout); 5xx = the server failed with
    // the terminal call possibly already made. Both leave the outcome unknown.
    outcomeUnknown (e) {
      const status = e && e.statusCode;
      return !status || status >= 500;
    },
    // The operator confirmed they checked the terminal: clear the flag and run the return for real.
    onRetryConfirmed () {
      this.showRetryConfirm = false;
      this.cardMayHaveStarted = false;
      this.doReturn();
    },
    startPoll () {
      this.stopPoll();
      this.pollTimer = setInterval(this.pollCard, CARD_POLL_MS);
    },
    stopPoll () {
      if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    },
    async pollCard () {
      this.pollElapsed += CARD_POLL_MS;
      try {
        const status = await this.pos.posSvc().RefundStatusCard(this.cardTxId, this.cashPointId);
        if (status && status.confirmed && status.returnReceipt) {
          this.stopPoll();
          this.resultReceipt = status.returnReceipt;
          this.step = 'done';
          return;
        }
      } catch (e) {
        // Transient — keep polling.
      }
      if (this.pollElapsed >= CARD_TIMEOUT_MS) {
        this.stopPoll();
        this.step = 'settle';
        this.error = this.$i('pos_refund_card_timeout');
      }
    },
    // Prints on the Surfboard terminal (backend ESC/POS); browser print only when the cash point
    // has no terminal. A failing terminal is reported rather than papered over.
    async printReceipt () {
      this.error = '';
      try {
        if (await this.pos.printReceiptDoc(this.resultReceipt)) { return; }
      } catch (e) {
        this.error = this.pos.errMsg(e);
        return;
      }
      if (this.$refs.receiptView) { this.$refs.receiptView.print(); }
    }
  }
};
</script>

<style scoped>
.sign-handover { margin: 0 0 8px; color: #b45309; font-size: 0.85rem; font-weight: 600; }
.rbuild__terminal-note { margin: 14px 0 0; font-size: 0.85rem; color: #64748b; background: #f8f9fa; border-radius: 8px; padding: 10px 12px; }

.rbuild { position: fixed; inset: 0; background: rgba(18, 20, 26, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1050; padding: 16px; }
.rbuild__panel { background: #fff; border-radius: 18px; width: 100%; max-width: 460px; max-height: 94vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); }
.rbuild__head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; border-bottom: 1px solid #eef1f5; }
.rbuild__title { font-size: 1.25rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.rbuild__close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.rbuild__close svg { width: 24px; height: 24px; }

.rbuild__body { flex: 1; overflow-y: auto; padding: 16px 20px; }
.rbuild__body--center { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 12px; padding: 40px 20px; }

.rbuild__lines { margin-bottom: 12px; }
.rbuild__line { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
.rbuild__line-main { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.rbuild__line-group { height: 38px; margin-top: 4px; }
.rbuild__line-name { font-weight: 600; color: var(--pos-ink, #292c34); }
.rbuild__line-meta { font-size: 0.78rem; color: #94a3b8; }
.rbuild__line-amount { font-weight: 700; color: var(--pos-ink, #292c34); }
.rbuild__line-remove { border: none; background: none; color: #ef4444; font-size: 1.3rem; cursor: pointer; line-height: 1; padding: 0 4px; }

.rbuild__add { border-top: 1px dashed #e2e8f0; padding-top: 8px; }
.rbuild__label { display: block; font-size: 0.78rem; font-weight: 700; color: #64748b; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 0.03em; }
.rbuild__input { width: 100%; height: 44px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 12px; font-size: 1rem; color: var(--pos-ink, #292c34); background: #fff; }
.rbuild__input:focus { outline: none; border-color: var(--pos-primary, #1bb776); }
.rbuild__no-groups { color: #b45309; font-size: 0.82rem; font-weight: 600; margin: 0 0 8px; }
.rbuild__groups { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rbuild__group { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 10px 12px; min-height: 54px; border: 2px solid #e2e8f0; border-radius: 12px; background: #fff; cursor: pointer; text-align: left; }
.rbuild__group.is-active { border-color: var(--pos-primary, #1bb776); background: rgba(27, 183, 118, 0.08); }
.rbuild__group-name { font-weight: 600; color: var(--pos-ink, #292c34); font-size: 0.92rem; }
.rbuild__group-rate { font-size: 0.76rem; font-weight: 600; color: #64748b; }
.rbuild__group.is-active .rbuild__group-rate { color: var(--pos-primary-dark, #159f63); }

.rbuild__vat { display: flex; gap: 8px; }
.rbuild__vat-btn { flex: 1; height: 42px; border: 1px solid #cbd5e0; background: #fff; border-radius: 10px; font-weight: 600; color: var(--pos-ink, #292c34); cursor: pointer; }
.rbuild__vat-btn.is-active { border-color: var(--pos-primary, #1bb776); background: rgba(27, 183, 118, 0.08); color: var(--pos-primary-dark, #159f63); }
.rbuild__context { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.rbuild__context-label { font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
.rbuild__context-toggle { display: flex; gap: 6px; }
.rbuild__context-toggle button { height: 38px; padding: 0 16px; border: 1px solid #cbd5e0; background: #fff; border-radius: 9px; font-weight: 600; color: var(--pos-ink, #292c34); cursor: pointer; }
.rbuild__context-toggle button.is-active { border-color: var(--pos-primary, #1bb776); background: rgba(27, 183, 118, 0.08); color: var(--pos-primary-dark, #159f63); }

.rbuild__add-btn { width: 100%; height: 46px; margin-top: 14px; border: 1px dashed var(--pos-primary, #1bb776); background: rgba(27, 183, 118, 0.06); border-radius: 10px; color: var(--pos-primary-dark, #159f63); font-weight: 700; cursor: pointer; }
.rbuild__add-btn:disabled { border-color: #cbd5e0; background: #f8f9fa; color: #cbd5e0; cursor: not-allowed; }

.rbuild__entry-modes { display: flex; gap: 8px; margin: 4px 0 12px; }
.rbuild__entry-mode { flex: 1; height: 40px; border: 1px solid #cbd5e0; background: #fff; border-radius: 10px; font-weight: 600; color: var(--pos-ink, #292c34); cursor: pointer; }
.rbuild__entry-mode.is-active { border-color: var(--pos-primary, #1bb776); background: rgba(27, 183, 118, 0.08); color: var(--pos-primary-dark, #159f63); }
.rbuild__menu-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; max-height: 46vh; overflow-y: auto; }
.rbuild__menu-item { display: flex; align-items: center; justify-content: space-between; width: 100%; text-align: left; border: 1px solid #eef1f5; background: #fff; border-radius: 10px; padding: 12px 14px; cursor: pointer; }
.rbuild__menu-item:hover { border-color: var(--pos-primary, #1bb776); }
.rbuild__menu-name { font-weight: 600; color: var(--pos-ink, #292c34); }
.rbuild__menu-price { font-weight: 700; color: #64748b; }
.rbuild__menu-empty { text-align: center; color: #94a3b8; padding: 20px 0; }

.rbuild__summary { display: flex; align-items: center; justify-content: space-between; background: #f8f9fa; border-radius: 10px; padding: 12px 14px; }
.rbuild__summary strong { font-size: 1.2rem; color: var(--pos-ink, #292c34); }
.rbuild__methods { display: flex; gap: 8px; }
.rbuild__method { flex: 1; height: 46px; border: 1px solid #cbd5e0; background: #fff; border-radius: 10px; font-weight: 600; color: var(--pos-ink, #292c34); cursor: pointer; }
.rbuild__method.is-active { border-color: var(--pos-primary, #1bb776); background: rgba(27, 183, 118, 0.08); color: var(--pos-primary-dark, #159f63); }
.rbuild__error { color: #ef4444; font-weight: 600; font-size: 0.85rem; margin: 12px 0 0; }

.rbuild__spinner { width: 46px; height: 46px; border-radius: 50%; border: 4px solid #e2e8f0; border-top-color: var(--pos-primary, #1bb776); animation: rbuild-spin 0.8s linear infinite; }
@keyframes rbuild-spin { to { transform: rotate(360deg); } }
.rbuild__wait { font-weight: 700; color: var(--pos-ink, #292c34); font-size: 1.1rem; margin: 0; }
.rbuild__wait-amount { font-size: 1.5rem; font-weight: 800; color: var(--pos-primary-dark, #159f63); margin: 0; }
.rbuild__link { border: none; background: none; color: #64748b; cursor: pointer; text-decoration: underline; }

.rbuild__foot { display: flex; gap: 10px; padding: 14px 20px 18px; border-top: 1px solid #eef1f5; }
.rbuild__back { height: 52px; padding: 0 20px; border: 1px solid #cbd5e0; background: #fff; border-radius: 12px; font-weight: 700; color: var(--pos-ink, #292c34); cursor: pointer; }
.rbuild__primary { flex: 1; height: 52px; border: none; border-radius: 12px; background: var(--pos-primary, #1bb776); color: #fff; font-size: 1.02rem; font-weight: 700; cursor: pointer; }
.rbuild__primary:disabled { background: #cbd5e0; cursor: not-allowed; }
.rbuild__done-actions { display: flex; gap: 10px; margin-top: 16px; }
.rbuild__ract { flex: 1; height: 48px; border: 1px solid #cbd5e0; background: #fff; border-radius: 10px; font-weight: 600; color: var(--pos-ink, #292c34); cursor: pointer; }
</style>
