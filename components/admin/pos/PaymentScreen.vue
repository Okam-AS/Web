<template>
  <div class="payment">
    <header class="payment__head">
      <button type="button" class="payment__back" @click="onBack">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        {{ backLabel }}
      </button>
      <div class="payment__balance">
        <span class="payment__balance-label">{{ step === 'receipt' ? $i('pos_pay_done') : $i('pos_pay') }}</span>
        <span class="payment__balance-amount">{{ priceLabel(total) }}</span>
      </div>
    </header>

    <div class="payment__body">
      <!-- Method selection -->
      <template v-if="step === 'method'">
        <p class="payment__prompt">
          {{ $i('pos_choose_method') }}
        </p>
        <div class="payment__methods">
          <button type="button" class="payment__method" @click="chooseCard">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            <span>{{ $i('pos_pay_card') }}</span>
          </button>
          <button type="button" class="payment__method" @click="chooseCash">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2-4h10a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6a2 2 0 012-2zm7 3a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
            <span>{{ $i('pos_pay_cash') }}</span>
          </button>
        </div>
        <button type="button" class="payment__split" @click="showSplit = true">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" /></svg>
          <span>{{ $i('pos_split_title') }}</span>
        </button>
        <!-- Split PAYMENT (one receipt, several tenders): partial payments on one provider order.
             Surfboard cash points only; the store rollout flag is enforced server-side. -->
        <button v-if="canSplitPay" type="button" class="payment__split" @click="startSplitPay">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M12 4v16m-7-8h14" /></svg>
          <span>{{ $i('pos_splitpay_title') }}</span>
        </button>
        <p v-if="error" class="payment__error">
          {{ error }}
        </p>
      </template>

      <!-- Split payment: portion overview + amount entry -->
      <div v-else-if="step === 'splitpay'" class="payment__panel">
        <div class="payment__sp-status">
          <span>{{ $i('pos_splitpay_outstanding') }}</span>
          <strong>{{ priceLabel(splitOutstanding) }}</strong>
        </div>
        <ul v-if="splitParts.length" class="payment__sp-parts">
          <li v-for="(p, i) in splitParts" :key="i">
            <span>{{ p.paymentType === 'Cash' ? $i('pos_pay_cash') : $i('pos_pay_card') }}</span>
            <span>{{ priceLabel(p.amount) }}</span>
          </li>
        </ul>
        <AmountPad v-model="splitPortion" :quick-amounts="splitQuickAmounts" />
        <div class="payment__sp-actions">
          <button type="button" class="payment__sp-card" :disabled="!splitPortionValid" @click="splitCard">
            {{ $i('pos_pay_card') }} {{ splitPortionValid ? priceLabel(splitPortion) : '' }}
          </button>
          <button type="button" class="payment__sp-cash" @click="step = 'splitcash'">
            {{ $i('pos_splitpay_cash_rest') }}
          </button>
        </div>
        <p v-if="error" class="payment__error">
          {{ error }}
        </p>
      </div>

      <!-- Split payment: card portion in progress -->
      <div v-else-if="step === 'splitcard'" class="payment__panel payment__panel--narrow">
        <CardTerminalStatus
          :state="cardState"
          :amount="splitChargedPortion"
          :message="cardMessage"
          @cancel="cancelSplitCard"
          @retry="splitCard"
          @abandon="abandonSplitCard"
        />
      </div>

      <!-- Split payment: cash remainder -->
      <div v-else-if="step === 'splitcash'" class="payment__panel">
        <CashPad :amount="splitCashDue" @confirm="onSplitCashConfirm" />
        <p v-if="error" class="payment__error">
          {{ error }}
        </p>
        <div v-if="busy" class="payment__busy">
          <div class="payment__spinner" />
        </div>
      </div>

      <!-- Cash -->
      <div v-else-if="step === 'cash'" class="payment__panel">
        <CashPad :amount="total" @confirm="onCashConfirm" />
        <p v-if="error" class="payment__error">
          {{ error }}
        </p>
        <div v-if="busy" class="payment__busy">
          <div class="payment__spinner" />
        </div>
      </div>

      <!-- Card in progress -->
      <div v-else-if="step === 'card'" class="payment__panel payment__panel--narrow">
        <CardTerminalStatus
          :state="cardState"
          :amount="total"
          :message="cardMessage"
          @cancel="cancelCard"
          @retry="startCardFlow"
          @abandon="abandonCard"
        />
      </div>

      <!-- Receipt -->
      <div v-else-if="step === 'receipt'" class="payment__panel">
        <PosReceiptView ref="receiptView" :receipt="receipt" />
        <div class="payment__receipt-actions">
          <button type="button" class="payment__ract" @click="printReceipt">
            {{ $i('pos_receipt_print') }}
          </button>
          <button type="button" class="payment__ract" @click="showSms = !showSms">
            {{ $i('pos_receipt_sms') }}
          </button>
          <button type="button" class="payment__ract" @click="copyReceipt">
            {{ $i('pos_receipt_copy') }}
          </button>
          <button v-if="canRefund" type="button" class="payment__ract payment__ract--danger" @click="showRefundModal = true">
            {{ $i('pos_refund_sale') }}
          </button>
        </div>
        <div v-if="showSms" class="payment__sms">
          <input v-model="smsPhone" type="tel" class="payment__sms-input" :placeholder="$i('pos_receipt_sms_ph')">
          <button type="button" class="payment__sms-send" :disabled="!smsPhone" @click="sendSms">
            {{ $i('pos_receipt_sms_send') }}
          </button>
        </div>
        <p v-if="smsResult" class="payment__sms-result">
          {{ smsResult }}
        </p>
        <button type="button" class="payment__newerorder" @click="$emit('done')">
          {{ $i('pos_new_order') }}
        </button>
      </div>
    </div>

    <RefundModal
      v-if="showRefundModal"
      :receipt="receipt"
      @done="onRefundDone"
      @close="showRefundModal = false"
    />

    <SplitBillModal
      v-if="showSplit"
      :check="check"
      @done="$emit('done')"
      @close="showSplit = false"
    />
  </div>
</template>

<script>
import CashPad from '~/components/admin/pos/CashPad.vue';
import CardTerminalStatus from '~/components/admin/pos/CardTerminalStatus.vue';
import PosReceiptView from '~/components/admin/pos/PosReceiptView.vue';
import RefundModal from '~/components/admin/pos/RefundModal.vue';
import SplitBillModal from '~/components/admin/pos/SplitBillModal.vue';
import AmountPad from '~/components/admin/pos/AmountPad.vue';

// Payment flow for a single check. Cash goes straight through POST /pos/payment/cash (the server
// wraps its own one-part settlement and returns the receipt). Card initiates a terminal payment,
// which the provider webhook auto-captures and finalises; the client polls the check until it is
// Completed, then fetches the receipt by its journal entry id.
//
// Split PAYMENT (one receipt, several tenders) runs on Surfboard partial payments: an open
// settlement owns one bill-level provider order; each card portion is initiated with its amount
// and polled via the reconcile endpoint (a completed portion never completes the check), then
// allocated to the settlement; the cash remainder is allocated last and the settlement finalizes
// into a single journal entry with one payment line per part.
const CARD_POLL_MS = 2000;
const CARD_TIMEOUT_MS = 120000;

export default {
  name: 'PaymentScreen',
  components: { CashPad, CardTerminalStatus, PosReceiptView, RefundModal, SplitBillModal, AmountPad },
  inject: ['pos'],
  props: {
    check: { type: Object, default: null }
  },
  data () {
    return {
      step: 'method',
      error: '',
      busy: false,
      showSplit: false,
      receipt: null,
      cardState: 'initiating',
      cardMessage: '',
      cardTransactionId: '',
      cardPollTimer: null,
      cardElapsed: 0,
      showSms: false,
      smsPhone: '',
      smsResult: '',
      showRefundModal: false,
      // Split payment (partial payments on one provider order).
      splitSettlementId: '',
      splitParts: [],
      splitOutstanding: 0,
      splitPortion: 0,
      splitChargedPortion: 0,
      splitCardTxId: '',
      splitPollTimer: null,
      splitElapsed: 0
    };
  },
  computed: {
    cashPointId () { return this.pos.cashPoint.cashPointId; },
    // A finalized, non-training, non-void sale can be refunded — cash or card, routed by RefundModal
    // from the receipt's payment mean.
    canRefund () {
      const r = this.receipt;
      return !!r && r.receiptType !== 'Return' && !r.isVoid && !r.isTraining && (r.payments || []).length > 0;
    },
    orderId () { return this.check ? this.check.orderId : null; },
    total () { return this.check ? this.check.finalAmount : 0; },
    backLabel () {
      return this.step === 'method' || this.step === 'receipt' ? this.$i('common_close') : this.$i('pos_back');
    },
    // Split payment requires a provider with partial-payment support (Surfboard cash points);
    // the per-store rollout flag is enforced server-side and surfaces as an error on initiate.
    canSplitPay () { return !!this.pos.cashPoint.surfboardTerminalId; },
    splitPortionValid () { return this.splitPortion > 0 && this.splitPortion <= this.splitOutstanding; },
    // Quick presets: an equal share for 2/3/4 payers, rounded up to whole kroner and capped.
    splitQuickAmounts () {
      const shares = [2, 3, 4]
        .map(n => Math.min(this.splitOutstanding, Math.ceil(this.splitOutstanding / n / 100) * 100))
        .filter(a => a > 0);
      return [...new Set(shares)];
    },
    // The cash remainder rounds to the nearest whole krone (the server applies the same rounding).
    splitCashDue () { return Math.round(this.splitOutstanding / 100) * 100; }
  },
  beforeDestroy () {
    this.stopCardPoll();
    this.stopSplitPoll();
  },
  methods: {
    // ---- Cash ----
    chooseCash () {
      this.error = '';
      this.step = 'cash';
    },
    async onCashConfirm ({ tendered }) {
      if (this.busy) { return; }
      this.busy = true;
      this.error = '';
      try {
        this.receipt = await this.pos.posSvc().PayCash({
          cashPointId: this.cashPointId,
          orderId: this.orderId,
          amount: tendered
        });
        this.step = 'receipt';
      } catch (e) {
        this.error = this.pos.errMsg(e);
      } finally {
        this.busy = false;
      }
    },

    // ---- Card ----
    async chooseCard () {
      await this.startCardFlow();
    },
    async startCardFlow () {
      this.step = 'card';
      this.cardState = 'initiating';
      this.cardMessage = '';
      this.cardElapsed = 0;
      try {
        const result = await this.pos.posSvc().InitiateCard({
          cashPointId: this.cashPointId,
          orderId: this.orderId,
          currency: 'NOK'
        });
        this.cardTransactionId = result.paymentTransactionId;
        this.cardState = 'waiting';
        this.startCardPoll();
      } catch (e) {
        this.cardState = 'error';
        this.cardMessage = this.pos.errMsg(e);
      }
    },
    startCardPoll () {
      this.stopCardPoll();
      this.cardPollTimer = setInterval(this.pollCard, CARD_POLL_MS);
    },
    stopCardPoll () {
      if (this.cardPollTimer) { clearInterval(this.cardPollTimer); this.cardPollTimer = null; }
    },
    async pollCard () {
      this.cardElapsed += CARD_POLL_MS;
      try {
        const check = await this.pos.checkSvc().GetCheck(this.orderId);
        if (check && check.status === 'Completed' && check.journalEntryId) {
          this.stopCardPoll();
          this.cardState = 'approved';
          this.receipt = await this.pos.posSvc().GetReceipt(check.journalEntryId);
          this.step = 'receipt';
          return;
        }
      } catch (e) {
        // Transient poll failure — keep trying until the timeout.
      }
      if (this.cardElapsed >= CARD_TIMEOUT_MS) {
        this.stopCardPoll();
        this.cardState = 'timeout';
        this.voidTerminal('timeout');
      }
    },
    // Cancels a hanging/declined terminal transaction (provider void), logged as VOIDTRANS.
    async voidTerminal (reason) {
      if (!this.cardTransactionId) { return; }
      try {
        await this.pos.posSvc().TerminalTimeout(this.cardTransactionId, { cashPointId: this.cashPointId, reason });
      } catch (e) { /* best effort */ }
    },
    cancelCard () {
      this.stopCardPoll();
      this.voidTerminal('operator_cancel');
      this.step = 'method';
    },
    abandonCard () {
      this.stopCardPoll();
      this.step = 'method';
    },

    // ---- Split payment (one receipt, several tenders) ----
    async startSplitPay () {
      this.error = '';
      try {
        const settlement = await this.pos.posSvc().OpenSettlement({ cashPointId: this.cashPointId, orderId: this.orderId });
        this.splitSettlementId = settlement.posSettlementId;
        this.applySettlement(settlement);
        this.splitPortion = 0;
        this.step = 'splitpay';
      } catch (e) {
        this.error = this.pos.errMsg(e);
      }
    },
    applySettlement (settlement) {
      this.splitParts = (settlement.payments || []).filter(p => p.status === 'Confirmed');
      this.splitOutstanding = settlement.outstandingAmount;
    },
    async splitCard () {
      if (!this.splitPortionValid) { return; }
      this.error = '';
      this.splitChargedPortion = this.splitPortion;
      this.step = 'splitcard';
      this.cardState = 'initiating';
      this.cardMessage = '';
      this.splitElapsed = 0;
      try {
        const result = await this.pos.posSvc().InitiateCard({
          cashPointId: this.cashPointId,
          orderId: this.orderId,
          currency: 'NOK',
          amount: this.splitChargedPortion,
          posSettlementId: this.splitSettlementId
        });
        this.splitCardTxId = result.paymentTransactionId;
        this.cardState = 'waiting';
        this.startSplitPoll();
      } catch (e) {
        this.cardState = 'error';
        this.cardMessage = this.pos.errMsg(e);
      }
    },
    startSplitPoll () {
      this.stopSplitPoll();
      this.splitPollTimer = setInterval(this.pollSplitCard, CARD_POLL_MS);
    },
    stopSplitPoll () {
      if (this.splitPollTimer) { clearInterval(this.splitPollTimer); this.splitPollTimer = null; }
    },
    // A portion never completes the check, so poll the reconcile endpoint for ITS state; once
    // captured, allocate the share to the settlement and either continue or finalize.
    async pollSplitCard () {
      this.splitElapsed += CARD_POLL_MS;
      try {
        const status = await this.pos.posSvc().ReconcileCard(this.splitCardTxId, { cashPointId: this.cashPointId });
        if (status.state === 'Captured') {
          this.stopSplitPoll();
          this.cardState = 'approved';
          await this.allocateSplitCard();
          return;
        }
        if (status.state === 'Failed' || status.state === 'Declined' || status.state === 'AuthorizationVoided') {
          this.stopSplitPoll();
          this.error = this.$i('pos_splitpay_portion_failed');
          this.step = 'splitpay';
          return;
        }
      } catch (e) {
        // Transient poll failure — keep trying until the timeout.
      }
      if (this.splitElapsed >= CARD_TIMEOUT_MS) {
        this.stopSplitPoll();
        this.voidSplitPortion('timeout');
        this.error = this.$i('pos_splitpay_portion_failed');
        this.step = 'splitpay';
      }
    },
    async allocateSplitCard () {
      try {
        const result = await this.pos.posSvc().AddSettlementAllocation(this.splitSettlementId, {
          cashPointId: this.cashPointId,
          paymentType: 'SurfboardTerminal',
          amount: this.splitChargedPortion,
          tenderedAmount: null,
          paymentTransactionId: this.splitCardTxId
        });
        this.splitParts.push({ paymentType: 'SurfboardTerminal', amount: result.amount });
        this.splitOutstanding = result.outstandingAmount;
        this.splitPortion = 0;
        if (result.fullyCovered) {
          await this.finalizeSplit();
        } else {
          this.step = 'splitpay';
        }
      } catch (e) {
        this.error = this.pos.errMsg(e);
        this.step = 'splitpay';
      }
    },
    async onSplitCashConfirm ({ tendered }) {
      if (this.busy) { return; }
      this.busy = true;
      this.error = '';
      try {
        await this.pos.posSvc().AddSettlementAllocation(this.splitSettlementId, {
          cashPointId: this.cashPointId,
          paymentType: 'Cash',
          amount: 0,
          tenderedAmount: tendered,
          paymentTransactionId: null
        });
        // Cash always settles the remainder, so the settlement is fully covered.
        await this.finalizeSplit();
      } catch (e) {
        this.error = this.pos.errMsg(e);
      } finally {
        this.busy = false;
      }
    },
    async finalizeSplit () {
      try {
        this.receipt = await this.pos.posSvc().FinalizeSettlement(this.splitSettlementId, { cashPointId: this.cashPointId });
        this.step = 'receipt';
      } catch (e) {
        this.error = this.pos.errMsg(e);
        this.step = 'splitpay';
      }
    },
    // Cancels a portion the cardholder has not completed (provider cancel, logged as VOIDTRANS).
    async voidSplitPortion (reason) {
      if (!this.splitCardTxId) { return; }
      try {
        await this.pos.posSvc().TerminalTimeout(this.splitCardTxId, { cashPointId: this.cashPointId, reason });
      } catch (e) { /* best effort */ }
    },
    cancelSplitCard () {
      this.stopSplitPoll();
      this.voidSplitPortion('operator_cancel');
      this.step = 'splitpay';
    },
    abandonSplitCard () {
      this.stopSplitPoll();
      this.step = 'splitpay';
    },
    // Leaving the split flow aborts the settlement: confirmed parts are reversed server-side
    // (captured card portions refunded, cash counter-posted) so no money is retained.
    async abortSplitPay () {
      if (this.splitParts.length > 0 && !window.confirm(this.$i('pos_splitpay_abort_confirm'))) {
        return;
      }
      try {
        await this.pos.posSvc().AbortSettlement(this.splitSettlementId, { cashPointId: this.cashPointId });
      } catch (e) { /* best effort; the settlement can be aborted again from the board */ }
      this.splitSettlementId = '';
      this.splitParts = [];
      this.splitOutstanding = 0;
      this.error = '';
      this.step = 'method';
    },

    // ---- Navigation ----
    onBack () {
      if (this.step === 'receipt') { this.$emit('done'); return; }
      if (this.step === 'cash') { this.step = 'method'; this.error = ''; return; }
      if (this.step === 'card') { this.cancelCard(); return; }
      if (this.step === 'splitpay') { this.abortSplitPay(); return; }
      if (this.step === 'splitcard') { this.cancelSplitCard(); return; }
      if (this.step === 'splitcash') { this.step = 'splitpay'; this.error = ''; return; }
      this.$emit('close');
    },

    // ---- Receipt actions ----
    printReceipt () {
      if (this.$refs.receiptView) { this.$refs.receiptView.print(); }
    },
    async copyReceipt () {
      try {
        this.receipt = await this.pos.posSvc().CopyReceipt(this.receipt.journalEntryId, { cashPointId: this.cashPointId });
        this.$nextTick(() => this.printReceipt());
      } catch (e) {
        this.smsResult = this.pos.errMsg(e);
      }
    },
    async sendSms () {
      try {
        const res = await this.pos.posSvc().SendReceiptSms(this.receipt.journalEntryId, { phoneNumber: this.smsPhone });
        this.smsResult = res && res.sent ? this.$i('pos_receipt_sms_ok') : this.$i('pos_receipt_sms_fail');
        this.showSms = false;
      } catch (e) {
        this.smsResult = this.pos.errMsg(e);
      }
    },
    // The RefundModal produced the RETREC (cash synchronously, or card once the terminal confirms):
    // show it in place of the sale receipt so the operator can print the return.
    onRefundDone (returnReceipt) {
      if (returnReceipt) { this.receipt = returnReceipt; }
      this.showRefundModal = false;
    }
  }
};
</script>

<style scoped>
.payment {
  position: absolute;
  inset: 0;
  background: #0f1116;
  display: flex;
  flex-direction: column;
  z-index: 800;
}

.payment__head {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  color: #ffffff;
  flex-shrink: 0;
}
.payment__back {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #cbd5e0;
  font-weight: 600;
  cursor: pointer;
  font-size: 1rem;
}
.payment__back svg { width: 22px; height: 22px; }
.payment__balance { text-align: right; }
.payment__balance-label { display: block; font-size: 0.72rem; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.04em; }
.payment__balance-amount { font-size: 1.6rem; font-weight: 800; }

.payment__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 20px 20px 0 0;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
}

.payment__prompt { text-align: center; color: #64748b; margin: 0 0 22px; font-size: 1.1rem; }
.payment__methods { display: flex; gap: 16px; justify-content: center; }
.payment__method {
  width: 210px;
  height: 170px;
  border: 2px solid #e2e8f0;
  background: #ffffff;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--pos-ink, #292c34);
  transition: border-color 0.12s ease, transform 0.06s ease;
}
.payment__method:hover { border-color: var(--pos-primary, #1bb776); }
.payment__method:active { transform: translateY(1px); }
.payment__method svg { width: 52px; height: 52px; color: var(--pos-primary, #1bb776); }

.payment__split {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 22px auto 0;
  padding: 14px 26px;
  border: 1px solid #cbd5e0;
  background: #ffffff;
  border-radius: 14px;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--pos-ink, #292c34);
  cursor: pointer;
}
.payment__split:hover { border-color: var(--pos-primary, #1bb776); }
.payment__split svg { width: 22px; height: 22px; color: #64748b; }

.payment__sp-status {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
  font-size: 1.05rem;
  color: #64748b;
}
.payment__sp-status strong { font-size: 1.5rem; color: var(--pos-ink, #292c34); }
.payment__sp-parts { list-style: none; margin: 0 0 12px; padding: 0; }
.payment__sp-parts li {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 8px;
  background: #eef2f6;
  margin-bottom: 4px;
  font-weight: 600;
  color: var(--pos-ink, #292c34);
}
.payment__sp-actions { display: flex; gap: 10px; margin-top: 14px; }
.payment__sp-card,
.payment__sp-cash {
  flex: 1;
  height: 58px;
  border: none;
  border-radius: 14px;
  font-size: 1.05rem;
  font-weight: 800;
  cursor: pointer;
}
.payment__sp-card { background: var(--pos-primary, #1bb776); color: #ffffff; }
.payment__sp-card:disabled { background: #cbd5e0; cursor: not-allowed; }
.payment__sp-cash { background: #ffffff; border: 1px solid #cbd5e0; color: var(--pos-ink, #292c34); }

.payment__panel { max-width: 460px; margin: 0 auto; width: 100%; }
.payment__panel--narrow { max-width: 380px; }
.payment__error { color: #ef4444; text-align: center; font-weight: 600; margin-top: 14px; }

.payment__busy { display: flex; justify-content: center; margin-top: 16px; }
.payment__spinner { width: 40px; height: 40px; border-radius: 50%; border: 4px solid #e2e8f0; border-top-color: var(--pos-primary, #1bb776); animation: pay-spin 0.8s linear infinite; }
@keyframes pay-spin { to { transform: rotate(360deg); } }

.payment__receipt-actions { display: flex; gap: 10px; justify-content: center; margin: 18px 0 10px; }
.payment__ract {
  border: 1px solid #cbd5e0;
  background: #ffffff;
  color: var(--pos-ink, #292c34);
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}
.payment__newerorder {
  display: block;
  width: 100%;
  max-width: 320px;
  margin: 14px auto 0;
  height: 60px;
  border: none;
  border-radius: 14px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-size: 1.15rem;
  font-weight: 800;
  cursor: pointer;
}

.payment__sms { display: flex; gap: 8px; max-width: 320px; margin: 14px auto 0; }
.payment__sms-input { flex: 1; height: 46px; border: 1px solid #cbd5e0; border-radius: 10px; padding: 0 12px; font-size: 1rem; }
.payment__sms-send { border: none; background: var(--pos-primary, #1bb776); color: #fff; font-weight: 700; padding: 0 18px; border-radius: 10px; cursor: pointer; }
.payment__sms-result { text-align: center; color: #64748b; margin-top: 8px; }
.payment__ract--danger { color: #ef4444; border-color: #fca5a5; }
.payment__refund { display: flex; gap: 8px; max-width: 360px; margin: 12px auto 0; }
.payment__refund-reason { flex: 1; height: 46px; border: 1px solid #cbd5e0; border-radius: 10px; padding: 0 12px; font-size: 1rem; }
.payment__refund-go { border: none; background: #ef4444; color: #fff; font-weight: 700; padding: 0 18px; border-radius: 10px; cursor: pointer; }
.payment__refund-go:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>
