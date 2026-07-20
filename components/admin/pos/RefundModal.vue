<template>
  <div class="refund" @click.self="onBackdrop">
    <div class="refund__panel">
      <header class="refund__head">
        <h2 class="refund__title">
          {{ $i('pos_refund_sale') }}
        </h2>
        <button type="button" class="refund__close" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <!-- Form: amount + § 5-3-7 documentation -->
      <div v-if="step === 'form'" class="refund__body">
        <div class="refund__summary">
          <span>{{ $i('pos_refund_original') }} #{{ receipt.receiptNumber }}</span>
          <strong>{{ priceLabel(receipt.grossAmount) }}</strong>
        </div>
        <p class="refund__tender">
          {{ isCard ? $i('pos_refund_to_card') : $i('pos_refund_to_cash') }}
        </p>

        <label class="refund__label">{{ $i('pos_refund_amount') }}</label>
        <div class="refund__amount-modes">
          <button type="button" class="refund__mode" :class="{ 'is-active': amountMode === 'full' }" @click="amountMode = 'full'">
            {{ $i('pos_refund_full') }} · {{ priceLabel(maxAmount) }}
          </button>
          <button type="button" class="refund__mode" :class="{ 'is-active': amountMode === 'partial' }" @click="amountMode = 'partial'">
            {{ $i('pos_refund_partial') }}
          </button>
        </div>
        <AmountPad v-if="amountMode === 'partial'" v-model="partialAmount" />

        <ReasonPicker context="return" :label="$i('pos_refund_reason')" v-model="reasonSel" />

        <label class="refund__label">{{ $i('pos_return_customer_phone') }}</label>
        <PhonePad v-model="customerPhone" :placeholder="$i('pos_return_customer_phone_ph')" />

        <template v-if="requiresSignature">
          <label class="refund__label">{{ $i('pos_return_signature') }}</label>
          <p class="sign-handover">{{ $i('pos_sign_hand_over') }}</p>
          <SignaturePad v-model="signature" />
        </template>
        <p v-else class="refund__terminal-note">
          {{ $i('pos_return_card_signature_note') }}
        </p>

        <p v-if="error" class="refund__error">
          {{ error }}
        </p>

        <button type="button" class="refund__confirm" :disabled="!canContinue" @click="onContinue">
          {{ $i('pos_refund_sale') }}
        </button>
      </div>

      <!-- Card refund awaiting cardholder approval -->
      <div v-else-if="step === 'card-wait'" class="refund__body refund__body--center">
        <div class="refund__spinner" />
        <p class="refund__wait">
          {{ $i('pos_refund_present_card') }}
        </p>
        <p class="refund__wait-amount">
          {{ priceLabel(effectiveAmount) }}
        </p>
        <button type="button" class="refund__link" @click="$emit('close')">
          {{ $i('common_close') }}
        </button>
      </div>

      <!-- Done: the return receipt -->
      <div v-else-if="step === 'done'" class="refund__body">
        <PosReceiptView ref="receiptView" :receipt="resultReceipt" />
        <div class="refund__done-actions">
          <button type="button" class="refund__ract" @click="printReceipt">
            {{ $i('pos_receipt_print') }}
          </button>
          <button type="button" class="refund__confirm" @click="$emit('done', resultReceipt)">
            {{ $i('common_done') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AmountPad from '~/components/admin/pos/AmountPad.vue';
import SignaturePad from '~/components/admin/pos/SignaturePad.vue';
import PosReceiptView from '~/components/admin/pos/PosReceiptView.vue';
import ReasonPicker from '~/components/admin/pos/ReasonPicker.vue';
import PhonePad from '~/components/admin/pos/PhonePad.vue';
import { newGuid } from '~/utils/guid';

const CARD_POLL_MS = 2500;
const CARD_TIMEOUT_MS = 130000;

// Refund of a finalized sale, driven off its receipt. Cash produces the RETREC + drawer pay-out
// synchronously; card pushes a return order to the terminal (the cardholder approves), so the RETREC
// arrives asynchronously and is polled via RefundStatusCard. § 5-3-7 documentation (a one-tap reason
// + phone, plus an on-screen signature for cash) is captured before the acting operator authorises
// the refund.
export default {
  name: 'RefundModal',
  components: { AmountPad, SignaturePad, PosReceiptView, ReasonPicker, PhonePad },
  inject: ['pos'],
  props: {
    receipt: { type: Object, required: true }
  },
  data () {
    return {
      step: 'form',
      amountMode: 'full',
      partialAmount: 0,
      // Idempotency key for the cash refund: one GUID per modal instance (one logical refund),
      // so a retry after a lost response returns the already-journalled RETREC instead of
      // paying out twice.
      returnId: newGuid(),
      reasonSel: { reasonType: 'None', reasonText: '' },
      customerPhone: '',
      signature: '',
      error: '',
      busy: false,
      resultReceipt: null,
      cardTxId: '',
      pollTimer: null,
      pollElapsed: 0
    };
  },
  computed: {
    cashPointId () { return this.pos.cashPoint.cashPointId; },
    // A card sale carries the terminal transaction on its payment line; refund it to that card.
    cardLine () { return (this.receipt.payments || []).find(p => p.paymentTransactionId); },
    isCard () { return !!this.cardLine; },
    requiresSignature () { return !this.isCard; },
    // Cap at the sale gross (the RETREC reverses the sale; a tip is not refunded here) and, for a
    // split sale, at the amount that went to this tender.
    maxAmount () {
      const tender = this.cardLine || (this.receipt.payments || [])[0];
      const tenderAmount = tender ? tender.amount : this.receipt.grossAmount;
      return Math.min(tenderAmount, this.receipt.grossAmount);
    },
    effectiveAmount () { return this.amountMode === 'full' ? this.maxAmount : this.partialAmount; },
    reasonChosen () {
      if (this.reasonSel.reasonType === 'None') { return false; }
      if (this.reasonSel.reasonType === 'Annet') { return !!(this.reasonSel.reasonText || '').trim(); }
      return true;
    },
    canContinue () {
      // Refunds are money-moving and the card path has no idempotency key — a second tap
      // while the first request is in flight must never fire another refund.
      if (this.busy) { return false; }
      if (!this.reasonChosen || !this.customerPhone.trim()) { return false; }
      if (this.requiresSignature && !this.signature) { return false; }
      if (this.amountMode === 'partial' && (this.partialAmount <= 0 || this.partialAmount > this.maxAmount)) { return false; }
      return true;
    }
  },
  beforeDestroy () {
    this.stopPoll();
  },
  methods: {
    onBackdrop () {
      if (this.step === 'form') { this.$emit('close'); }
    },
    async onContinue () {
      if (!this.canContinue) { return; }
      this.busy = true;
      this.error = '';
      const amount = this.amountMode === 'full' ? this.maxAmount : this.partialAmount;
      const reasonType = this.reasonSel.reasonType;
      const reasonText = (this.reasonSel.reasonText || '').trim();
      try {
        if (this.isCard) {
          const result = await this.pos.posSvc().RefundCard(this.cardLine.paymentTransactionId, {
            cashPointId: this.cashPointId,
            amount,
            reasonType,
            reasonText,
            customerPhone: this.customerPhone.trim()
          });
          this.handleCardResult(result, this.cardLine.paymentTransactionId);
        } else {
          const rc = await this.pos.posSvc().RefundCash(this.receipt.journalEntryId, {
            cashPointId: this.cashPointId,
            returnId: this.returnId,
            amount,
            reasonType,
            reasonText,
            customerPhone: this.customerPhone.trim(),
            customerSignature: this.signature
          });
          this.resultReceipt = rc;
          this.step = 'done';
        }
      } catch (e) {
        this.error = this.pos.errMsg(e);
      } finally {
        this.busy = false;
      }
    },
    handleCardResult (result, txId) {
      if (result && result.confirmed && result.returnReceipt) {
        this.resultReceipt = result.returnReceipt;
        this.step = 'done';
        return;
      }
      // Pending: the cardholder approves on the terminal; poll until the RETREC is written.
      this.cardTxId = txId;
      this.step = 'card-wait';
      this.pollElapsed = 0;
      this.startPoll();
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
        // Transient poll failure — keep trying until the timeout.
      }
      if (this.pollElapsed >= CARD_TIMEOUT_MS) {
        this.stopPoll();
        // The refund may still confirm via the terminal callback; the RETREC then shows in the
        // journal. Let the operator close without blocking the register.
        this.step = 'form';
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
.sign-handover { margin: 0 0 8px; color: #b45309; font-size: 0.85rem; font-weight: 600; }
.refund__terminal-note { margin: 14px 0 0; font-size: 0.85rem; color: #64748b; background: #f8f9fa; border-radius: 8px; padding: 10px 12px; }

.refund { position: fixed; inset: 0; background: rgba(18, 20, 26, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1100; padding: 16px; }
.refund__panel { background: #fff; border-radius: 18px; width: 100%; max-width: 460px; max-height: 94vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); }
.refund__head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; border-bottom: 1px solid #eef1f5; }
.refund__title { font-size: 1.25rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.refund__close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.refund__close svg { width: 24px; height: 24px; }

.refund__body { flex: 1; overflow-y: auto; padding: 16px 20px 20px; }
.refund__body--center { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 12px; padding: 40px 20px; }

.refund__summary { display: flex; align-items: center; justify-content: space-between; background: #f8f9fa; border-radius: 10px; padding: 12px 14px; font-size: 1rem; color: var(--pos-ink, #292c34); }
.refund__summary strong { font-size: 1.15rem; }
.refund__tender { margin: 8px 0 0; color: #64748b; font-weight: 600; font-size: 0.9rem; }

.refund__label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 0.03em; }
.refund__input { width: 100%; height: 46px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 12px; font-size: 1rem; color: var(--pos-ink, #292c34); }
.refund__input:focus { outline: none; border-color: var(--pos-primary, #1bb776); }

.refund__amount-modes { display: flex; gap: 8px; }
.refund__mode { flex: 1; height: 44px; border: 1px solid #cbd5e0; background: #fff; border-radius: 10px; font-weight: 600; color: var(--pos-ink, #292c34); cursor: pointer; }
.refund__mode.is-active { border-color: var(--pos-primary, #1bb776); background: rgba(27, 183, 118, 0.08); color: var(--pos-primary-dark, #159f63); }

.refund__error { color: #ef4444; font-weight: 600; font-size: 0.85rem; margin: 12px 0 0; }

.refund__confirm { width: 100%; height: 54px; margin-top: 18px; border: none; border-radius: 12px; background: var(--pos-primary, #1bb776); color: #fff; font-size: 1.05rem; font-weight: 700; cursor: pointer; }
.refund__confirm:disabled { background: #cbd5e0; cursor: not-allowed; }

.refund__spinner { width: 46px; height: 46px; border-radius: 50%; border: 4px solid #e2e8f0; border-top-color: var(--pos-primary, #1bb776); animation: refund-spin 0.8s linear infinite; }
@keyframes refund-spin { to { transform: rotate(360deg); } }
.refund__wait { font-weight: 700; color: var(--pos-ink, #292c34); font-size: 1.1rem; margin: 0; }
.refund__wait-amount { font-size: 1.5rem; font-weight: 800; color: var(--pos-primary-dark, #159f63); margin: 0; }
.refund__link { border: none; background: none; color: #64748b; cursor: pointer; text-decoration: underline; }

.refund__done-actions { display: flex; gap: 10px; margin-top: 16px; }
.refund__ract { flex: 1; height: 48px; border: 1px solid #cbd5e0; background: #fff; border-radius: 10px; font-weight: 600; color: var(--pos-ink, #292c34); cursor: pointer; }
.refund__done-actions .refund__confirm { margin-top: 0; flex: 1; }
</style>
