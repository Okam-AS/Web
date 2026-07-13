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

          <div class="rbuild__row">
            <div class="rbuild__col">
              <label class="rbuild__label">{{ $i('pos_return_line_qty') }}</label>
              <input v-model.number="draft.quantity" type="number" min="1" class="rbuild__input">
            </div>
            <div class="rbuild__col rbuild__col--group">
              <label class="rbuild__label">{{ $i('pos_open_price_goods_group') }}</label>
              <select v-model.number="draft.goodsGroupId" class="rbuild__input">
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
          </div>

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
        <div class="rbuild__methods">
          <button type="button" class="rbuild__method" :class="{ 'is-active': method === 'cash' }" @click="method = 'cash'">
            {{ $i('pos_pay_cash') }}
          </button>
          <button type="button" class="rbuild__method" :class="{ 'is-active': method === 'card' }" @click="method = 'card'">
            {{ $i('pos_pay_card') }}
          </button>
        </div>

        <label class="rbuild__label">{{ $i('pos_refund_reason') }}</label>
        <input v-model="reason" type="text" class="rbuild__input" :placeholder="$i('pos_refund_reason_ph')">

        <label class="rbuild__label">{{ $i('pos_return_customer_phone') }}</label>
        <input v-model="customerPhone" type="tel" class="rbuild__input" :placeholder="$i('pos_return_customer_phone_ph')">

        <template v-if="method === 'cash'">
          <label class="rbuild__label">{{ $i('pos_return_signature') }}</label>
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

    <PinPadModal
      v-if="step === 'pin'"
      :title="$i('pos_refund_approve')"
      :subtitle="$i('pos_manager_pin_required')"
      :operators="managerOperators"
      :error="pinError"
      :busy="pinBusy"
      :confirm-label="$i('pos_refund_sale')"
      @submit="onPinSubmit"
      @close="step = 'settle'"
    />
  </div>
</template>

<script>
import AmountPad from '~/components/admin/pos/AmountPad.vue';
import SignaturePad from '~/components/admin/pos/SignaturePad.vue';
import PinPadModal from '~/components/admin/pos/PinPadModal.vue';
import PosReceiptView from '~/components/admin/pos/PosReceiptView.vue';
import { newGuid } from '~/utils/guid';

const CARD_POLL_MS = 2500;
const CARD_TIMEOUT_MS = 130000;

// Unreferenced (open) return: rings in a refund without an original sale. The operator builds return
// lines (each with a goods group + VAT so the RETREC is fiscally classified), then refunds to cash
// (out of the drawer) or to a card on the terminal. § 5-3-7 documentation is captured before the
// Leder PIN. The card path is asynchronous (cardholder taps) and only works when the acquirer has
// enabled unreferenced credits — otherwise the backend returns a clear "not enabled" error.
export default {
  name: 'ReturnBuilder',
  components: { AmountPad, SignaturePad, PinPadModal, PosReceiptView },
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
      vatRates: [25, 15, 12, 0],
      method: 'cash',
      // Idempotency key for the cash return (required by the backend): one GUID per builder
      // instance (one logical return), so a retry after a lost response returns the
      // already-journalled RETREC instead of signing and paying out a second one.
      returnId: newGuid(),
      reason: '',
      customerPhone: '',
      signature: '',
      error: '',
      pinError: '',
      pinBusy: false,
      resultReceipt: null,
      cardTxId: '',
      pollTimer: null,
      pollElapsed: 0
    };
  },
  computed: {
    prefilled () { return !!(this.initialLines && this.initialLines.length); },
    cashPointId () { return this.pos.cashPoint.cashPointId; },
    total () { return this.lines.reduce((sum, l) => sum + l.unitAmount * l.quantity, 0); },
    managerOperators () {
      return (this.pos.operators || []).filter(o => o.roleLevel === 'Leder' || o.roleLevel === 'Eier');
    },
    canAddLine () {
      return this.draft.name.trim().length > 0 && this.draft.unitAmount > 0 && this.draft.quantity >= 1 && this.draft.goodsGroupId != null;
    },
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
      if (this.step === 'build') { return this.lines.length > 0; }
      if (this.step === 'settle') {
        // Every line must be classified with a goods group before the RETREC can be journalled; a
        // bill row may lack one (product without a goods group) until the inline picker fills it.
        if (!this.lines.length || this.lines.some(l => l.goodsGroupId == null)) { return false; }
        if (!this.reason.trim() || !this.customerPhone.trim()) { return false; }
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
    addLine () {
      if (!this.canAddLine) { return; }
      this.lines.push({
        name: this.draft.name.trim(),
        quantity: this.draft.quantity,
        unitAmount: this.draft.unitAmount,
        vatPercent: this.draft.vatPercent,
        goodsGroupId: this.draft.goodsGroupId
      });
      this.draft = { name: '', quantity: 1, unitAmount: 0, vatPercent: this.draft.vatPercent, goodsGroupId: this.draft.goodsGroupId };
    },
    // Add a menu item as a return line. The price, VAT and goods group come from the product. A
    // product missing a goods group (or on an unsupported VAT rate) drops into the manual form so the
    // operator completes it, rather than being added as an invalid line the backend would reject.
    pickProduct (p) {
      const vatPercent = [0, 15, 25].includes(p.tax) ? p.tax : 25;
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
      if (this.step === 'settle' && this.canAdvance) { this.pinError = ''; this.step = 'pin'; }
    },
    async onPinSubmit ({ operatorId, pin }) {
      this.pinBusy = true;
      this.pinError = '';
      const base = {
        cashPointId: this.cashPointId,
        approverOperatorId: operatorId,
        pin,
        reason: this.reason.trim(),
        customerPhone: this.customerPhone.trim(),
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
            this.pinError = this.$i('pos_generic_error');
          }
        }
      } catch (e) {
        this.pinError = this.pos.errMsg(e);
        this.step = 'settle';
      } finally {
        this.pinBusy = false;
      }
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
    printReceipt () {
      if (this.$refs.receiptView) { this.$refs.receiptView.print(); }
    }
  }
};
</script>

<style scoped>
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
.rbuild__row { display: flex; gap: 10px; }
.rbuild__col { flex: 1; }
.rbuild__col--group { flex: 2; }

.rbuild__vat { display: flex; gap: 8px; }
.rbuild__vat-btn { flex: 1; height: 42px; border: 1px solid #cbd5e0; background: #fff; border-radius: 10px; font-weight: 600; color: var(--pos-ink, #292c34); cursor: pointer; }
.rbuild__vat-btn.is-active { border-color: var(--pos-primary, #1bb776); background: rgba(27, 183, 118, 0.08); color: var(--pos-primary-dark, #159f63); }

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
.rbuild__terminal-note { margin: 14px 0 0; font-size: 0.85rem; color: #64748b; background: #f8f9fa; border-radius: 8px; padding: 10px 12px; }
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
