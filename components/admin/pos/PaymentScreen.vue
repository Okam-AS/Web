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
        <!-- Unified split entry: with partial-payment support the chooser below offers by-item
             split vs split payment; without it the by-item split modal opens directly. -->
        <button type="button" class="payment__split" @click="openSplitEntry">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" /></svg>
          <span>{{ $i('pos_split_unified_title') }}</span>
        </button>
        <p v-if="error" class="payment__error">
          {{ error }}
        </p>
      </template>

      <!-- Split chooser: by-item split (own receipt per guest) vs split PAYMENT (one receipt,
           several tenders — partial payments on one provider order; Surfboard cash points only,
           the store rollout flag is enforced server-side). -->
      <div v-else-if="step === 'splitchoice'" class="payment__panel">
        <button type="button" class="payment__choice" @click="chooseSplitByItem">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" /></svg>
          <span class="payment__choice-text">
            <span class="payment__choice-title">{{ $i('pos_split_byitem_choice') }}</span>
            <span class="payment__choice-sub">{{ $i('pos_split_byitem_hint') }}</span>
          </span>
        </button>
        <button type="button" class="payment__choice" @click="startSplitPay">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M12 4v16m-7-8h14" /></svg>
          <span class="payment__choice-text">
            <span class="payment__choice-title">{{ $i('pos_splitpay_choice') }}</span>
            <span class="payment__choice-sub">{{ $i('pos_splitpay_hint') }}</span>
          </span>
        </button>
        <p v-if="error" class="payment__error">
          {{ error }}
        </p>
      </div>

      <!-- Split payment: per-person by default (each tap charges an equal share of what remains);
           an optional free-amount pad covers "I'll just pay 200". One receipt either way — the
           VAT lives on the sale, so how the payment is divided has no fiscal effect. -->
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

        <!-- A captured portion whose allocation failed: the money is taken, so the only valid
             actions are adding it to the settlement here or aborting the whole settlement. -->
        <div v-if="splitPendingAllocation" class="payment__sp-pending">
          <p>{{ $i('pos_splitpay_pending_allocation') }}</p>
          <button type="button" class="payment__sp-card" @click="retryPendingAllocation">
            {{ $i('pos_splitpay_pending_add') }} {{ priceLabel(splitChargedPortion) }}
          </button>
        </div>

        <template v-if="!splitCustom">
          <div class="payment__sp-persons">
            <span>{{ $i('pos_splitpay_persons') }}</span>
            <button type="button" class="payment__sp-step" :disabled="splitPersons <= 2 || splitParts.length > 0" @click="splitPersons--">
              −
            </button>
            <span class="payment__sp-persons-val">{{ splitPersons }}</span>
            <button type="button" class="payment__sp-step" :disabled="splitPersons >= 12 || splitParts.length > 0" @click="splitPersons++">
              +
            </button>
          </div>
          <div class="payment__sp-share">
            <span>{{ $i('pos_splitpay_next') }} ({{ Math.min(splitParts.length + 1, splitPersons) }}/{{ splitPersons }})</span>
            <strong>{{ priceLabel(splitSuggestedShare) }}</strong>
          </div>
        </template>
        <AmountPad v-else v-model="splitPortion" :quick-amounts="splitQuickAmounts" />

        <div v-if="!splitCustom" class="payment__sp-actions">
          <button type="button" class="payment__sp-card" :disabled="!splitChargeValid || splitPendingAllocation" @click="splitCard">
            {{ $i('pos_pay_card') }} {{ splitChargeValid ? priceLabel(splitChargeAmount) : '' }}
          </button>
          <button type="button" class="payment__sp-cash" :disabled="splitPendingAllocation" @click="splitChooseCash">
            {{ $i('pos_splitpay_cash_rest') }}
          </button>
        </div>
        <!-- Custom amount: charge it on a card, or take it in cash with the card covering the rest
             ("I want to get rid of this 200 note"). The cash-first path charges the card for
             outstanding − amount first, then records the cash remainder — same net result, and the
             settlement's cash-rounds-the-remainder invariant holds. -->
        <div v-else class="payment__sp-actions">
          <button type="button" class="payment__sp-card" :disabled="!splitChargeValid || splitPendingAllocation" @click="splitCard">
            {{ $i('pos_pay_card') }} {{ splitChargeValid ? priceLabel(splitChargeAmount) : '' }}
          </button>
          <button type="button" class="payment__sp-cash" :disabled="!splitCashFirstValid || splitPendingAllocation" @click="splitCashFirstCard">
            {{ $i('pos_splitpay_cash_first') }} {{ splitCashFirstValid ? priceLabel(splitPortion) : '' }}
          </button>
        </div>
        <button type="button" class="payment__sp-toggle" @click="toggleSplitCustom">
          {{ splitCustom ? $i('pos_splitpay_equal') : $i('pos_splitpay_custom') }}
        </button>
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
          @retry="retrySplitCard"
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
        <p v-if="receiptError" class="payment__error">
          {{ receiptError }}
        </p>
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
      cardPollBusy: false,
      // Wall-clock start of the card flow: browsers throttle background-tab timers, so counting
      // ticks would under-count and stretch the timeout far past its intent.
      cardStartedAt: 0,
      showSms: false,
      smsPhone: '',
      smsResult: '',
      receiptError: '',
      showRefundModal: false,
      // Split payment (partial payments on one provider order). Defaults to per-person equal
      // shares; splitCustom switches to free-amount entry.
      splitSettlementId: '',
      splitParts: [],
      splitOutstanding: 0,
      splitPersons: 2,
      splitCustom: false,
      splitPortion: 0,
      splitCashFirstAmount: 0,
      splitChargedPortion: 0,
      splitCardTxId: '',
      splitPollTimer: null,
      splitPollBusy: false,
      // Wall-clock start of the current card portion; the timeout must not stretch when slow
      // reconciles make the poll skip ticks.
      splitStartedAt: 0,
      // Generation token for the split flow: every await checks it afterwards, so a cancel (or a
      // new initiate) invalidates in-flight continuations instead of letting them resurrect a
      // portion or resume a flow the operator already left.
      splitEpoch: 0,
      // A captured portion whose allocation call failed: the money is taken, so it is kept as a
      // retryable pending allocation instead of being orphaned by the next charge.
      splitPendingAllocation: false
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
    // Split payment requires a provider with partial-payment support (Surfboard cash points) AND
    // the store's rollout flag, projected onto the cash point by the backend. The server enforces
    // the flag at initiate regardless of what is shown here.
    canSplitPay () {
      return !!this.pos.cashPoint.surfboardTerminalId && this.pos.cashPoint.partialPaymentsEnabled === true;
    },
    // Payers not yet charged in the per-person mode.
    splitPersonsLeft () { return Math.max(1, this.splitPersons - this.splitParts.length); },
    // The next payer's equal share of what remains, recomputed each round so rounding drift and
    // custom portions self-correct: whole kroner while several payers remain, the exact remainder
    // (øre included) for the last one.
    splitSuggestedShare () {
      if (this.splitPersonsLeft === 1) { return this.splitOutstanding; }
      return Math.min(this.splitOutstanding, Math.ceil(this.splitOutstanding / this.splitPersonsLeft / 100) * 100);
    },
    splitChargeAmount () { return this.splitCustom ? this.splitPortion : this.splitSuggestedShare; },
    splitChargeValid () { return this.splitChargeAmount > 0 && this.splitChargeAmount <= this.splitOutstanding; },
    // Cash-first: whole kroner (notes and coins) and strictly less than the outstanding amount —
    // covering everything in cash is the plain "Kontant (rest)" action instead.
    splitCashFirstValid () {
      return this.splitPortion > 0 && this.splitPortion % 100 === 0 && this.splitPortion < this.splitOutstanding;
    },
    // Quick presets on the free-amount pad: an equal share for 2/3/4 payers, whole kroner, capped.
    splitQuickAmounts () {
      const shares = [2, 3, 4]
        .map(n => Math.min(this.splitOutstanding, Math.ceil(this.splitOutstanding / n / 100) * 100))
        .filter(a => a > 0);
      return [...new Set(shares)];
    },
    // The cash remainder rounds to the nearest whole krone (the server applies the same rounding).
    splitCashDue () { return Math.round(this.splitOutstanding / 100) * 100; }
  },
  created () {
    // While the payment screen is up, a detected session expiry must not collapse the UI
    // (the customer may be mid-tap on the terminal) — pos defers the teardown.
    this.pos.paymentActive = true;
  },
  mounted () {
    // Browsers throttle timers in background tabs, so a capture completed while the tab was
    // hidden may sit unnoticed until the next (delayed) tick. On becoming visible, poke the
    // in-flight poll once immediately; both polls reconcile before any timeout void can fire.
    this._onVisibility = () => {
      if (document.visibilityState !== 'visible') { return; }
      if (this.step === 'card' && this.cardTransactionId && this.cardState === 'waiting') {
        this.pollCard();
      } else if (this.step === 'splitcard' && this.splitCardTxId) {
        this.pollSplitCard();
      }
    };
    document.addEventListener('visibilitychange', this._onVisibility);
  },
  beforeDestroy () {
    document.removeEventListener('visibilitychange', this._onVisibility);
    this.pos.paymentActive = false;
    this.stopCardPoll();
    this.stopSplitPoll();
    // Invalidate in-flight split continuations; a capture that raced the teardown still books
    // itself through the stale-portion path, but nothing resumes the flow on a dead component.
    this.splitEpoch++;
  },
  methods: {
    // ---- Cash ----
    chooseCash () {
      this.error = '';
      // Nothing left to tender (100% discounted check): finalize directly, mirroring the
      // split flow's zero-due shortcut — the cash pad has nothing meaningful to ask.
      if (this.total === 0) {
        this.onCashConfirm({ tendered: 0 });
        return;
      }
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
        this.autoPrint();
      } catch (e) {
        this.error = this.pos.errMsg(e);
      } finally {
        this.busy = false;
      }
    },

    // ---- Card ----
    async chooseCard () {
      // Nothing left to tender (100% discounted check): sending zero to the terminal only
      // errors — finalize through the cash path's zero shortcut instead.
      if (this.total === 0) {
        this.chooseCash();
        return;
      }
      await this.startCardFlow();
    },
    async startCardFlow () {
      this.step = 'card';
      this.cardState = 'initiating';
      this.cardMessage = '';
      // Arm the timeout before the initiate so a hung initiate is covered by it too.
      this.cardStartedAt = Date.now();
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
      // Reentrancy guard (as in pollSplitCard): a GetCheck slower than the poll interval must
      // not let two overlapping invocations both observe the completed check.
      if (this.cardPollBusy) { return; }
      this.cardPollBusy = true;
      try {
        try {
          const check = await this.pos.checkSvc().GetCheck(this.orderId);
          if (check && check.status === 'Completed' && check.journalEntryId) {
            this.stopCardPoll();
            this.cardState = 'approved';
            this.receipt = await this.pos.posSvc().GetReceipt(check.journalEntryId);
            this.step = 'receipt';
            this.autoPrint();
            return;
          }
        } catch (e) {
          // Transient poll failure — keep trying until the timeout.
        }
        if (Date.now() - this.cardStartedAt >= CARD_TIMEOUT_MS) {
          this.stopCardPoll();
          this.cardState = 'timeout';
          this.voidTerminal('timeout');
        }
      } finally {
        this.cardPollBusy = false;
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

    // ---- Split entry ----
    // Unified "Del regningen": with partial-payment support the operator picks between the two
    // split flows; without it the only available flow (by-item split) opens directly — a chooser
    // with one option is never shown.
    openSplitEntry () {
      this.error = '';
      if (this.canSplitPay) {
        this.step = 'splitchoice';
        return;
      }
      this.showSplit = true;
    },
    chooseSplitByItem () {
      this.showSplit = true;
      this.step = 'method';
    },

    // ---- Split payment (one receipt, several tenders) ----
    async startSplitPay () {
      this.error = '';
      try {
        const settlement = await this.pos.posSvc().OpenSettlement({ cashPointId: this.cashPointId, orderId: this.orderId });
        this.splitEpoch++;
        this.splitSettlementId = settlement.posSettlementId;
        this.applySettlement(settlement);
        this.splitPersons = 2;
        this.splitCustom = false;
        this.splitPortion = 0;
        this.splitCashFirstAmount = 0;
        this.splitCardTxId = '';
        this.splitPendingAllocation = false;
        this.step = 'splitpay';
      } catch (e) {
        this.error = this.pos.errMsg(e);
      }
    },
    applySettlement (settlement) {
      this.splitParts = (settlement.payments || []).filter(p => p.status === 'Confirmed');
      this.splitOutstanding = settlement.outstandingAmount;
    },
    toggleSplitCustom () {
      this.splitCustom = !this.splitCustom;
      this.splitPortion = 0;
      this.error = '';
    },
    splitCard () {
      if (!this.splitChargeValid || this.splitPendingAllocation) { return; }
      return this.initiateSplitPortion(this.splitChargeAmount);
    },
    // "I have a 200 note": take the typed amount in cash and let the card cover the rest. The card
    // is charged first (outstanding − cash) so the cash part stays the settlement's final,
    // remainder-settling allocation; on card approval the cash records automatically.
    splitCashFirstCard () {
      if (!this.splitCashFirstValid || this.splitPendingAllocation) { return; }
      return this.initiateSplitPortion(this.splitOutstanding - this.splitPortion, this.splitPortion);
    },
    retrySplitCard () {
      return this.initiateSplitPortion(this.splitChargedPortion, this.splitCashFirstAmount);
    },
    // Single write-point for the pending cash-first amount: every initiate sets it (0 for a plain
    // card portion), so no exit path can leave a stale value that would auto-record a phantom cash
    // remainder on a later, unrelated portion.
    async initiateSplitPortion (amount, cashFirstAmount = 0) {
      if (this.splitPendingAllocation) { return; }
      const epoch = ++this.splitEpoch;
      this.error = '';
      this.splitCashFirstAmount = cashFirstAmount;
      // Clear the previous portion's id up front: if the initiate below throws before the new id is
      // assigned, a cancel must not void the PREVIOUS, already-allocated portion.
      this.splitCardTxId = '';
      this.splitChargedPortion = amount;
      this.step = 'splitcard';
      this.cardState = 'initiating';
      this.cardMessage = '';
      this.splitStartedAt = Date.now();
      try {
        const result = await this.pos.posSvc().InitiateCard({
          cashPointId: this.cashPointId,
          orderId: this.orderId,
          currency: 'NOK',
          amount,
          posSettlementId: this.splitSettlementId
        });
        if (epoch !== this.splitEpoch) {
          // The operator left this attempt while the initiate was in flight. The portion that was
          // just created must not resurrect (assigning it and starting a poll here would charge a
          // "cancelled" payment) — kill it on the terminal instead.
          this.voidPortionById(result.paymentTransactionId, 'operator_cancel');
          return;
        }
        this.splitCardTxId = result.paymentTransactionId;
        this.cardState = 'waiting';
        this.startSplitPoll();
      } catch (e) {
        if (epoch !== this.splitEpoch) { return; }
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
      // Reentrancy guard: a reconcile slower than the poll interval must not let two overlapping
      // invocations both observe 'Captured' and allocate the same portion twice (the server also
      // dedupes, but the race should never leave the client).
      if (this.splitPollBusy) { return; }
      this.splitPollBusy = true;
      const epoch = this.splitEpoch;
      const txId = this.splitCardTxId;
      const amount = this.splitChargedPortion;
      try {
        try {
          const status = await this.pos.posSvc().ReconcileCard(txId, { cashPointId: this.cashPointId });
          if (epoch !== this.splitEpoch) {
            // The operator cancelled while this reconcile was in flight. A capture that raced the
            // cancel is real money and must still be booked — but quietly, without resuming the
            // cancelled flow (no auto-finalize, no pending cash leg).
            if (status.state === 'Captured') {
              await this.allocateStalePortion(txId, amount);
            }
            return;
          }
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
          if (epoch !== this.splitEpoch) { return; }
        }
        // Wall-clock timeout: counting ticks would under-count when slow reconciles make the
        // reentrancy guard skip them, stretching the cutoff far past its intent.
        if (Date.now() - this.splitStartedAt >= CARD_TIMEOUT_MS) {
          this.stopSplitPoll();
          this.voidSplitPortion('timeout');
          this.error = this.$i('pos_splitpay_portion_failed');
          this.step = 'splitpay';
        }
      } finally {
        this.splitPollBusy = false;
      }
    },
    async allocateSplitCard () {
      const txId = this.splitCardTxId;
      try {
        const result = await this.pos.posSvc().AddSettlementAllocation(this.splitSettlementId, {
          cashPointId: this.cashPointId,
          paymentType: 'SurfboardTerminal',
          amount: this.splitChargedPortion,
          tenderedAmount: null,
          paymentTransactionId: txId
        });
        // The portion is settled: forget its id so no later cancel/timeout can void it.
        this.splitCardTxId = '';
        this.splitPendingAllocation = false;
        this.splitParts.push({ paymentType: 'SurfboardTerminal', amount: result.amount });
        this.splitOutstanding = result.outstandingAmount;
        this.splitPortion = 0;
        if (result.fullyCovered) {
          await this.finalizeSplit();
        } else if (this.splitCashFirstAmount > 0) {
          // Cash-first: the card leg is done; record the cash remainder and finalize.
          const cash = this.splitCashFirstAmount;
          this.splitCashFirstAmount = 0;
          await this.onSplitCashConfirm({ tendered: cash });
        } else {
          this.step = 'splitpay';
        }
      } catch (e) {
        await this.recoverAllocationFailure(txId, e);
      }
    },
    // The card is captured but the allocation call failed (lost response, transient server error).
    // The money is taken, so this must never dead-end in "abort everything": refresh the server
    // truth — if the part actually landed, continue as a success; otherwise keep the portion as a
    // pending allocation the operator retries from the split screen (the finalize stray-guard
    // blocks the settlement until it is added or aborted).
    async recoverAllocationFailure (txId, e) {
      try {
        const settlement = await this.pos.posSvc().GetSettlement(this.splitSettlementId);
        this.applySettlement(settlement);
        const landed = (settlement.payments || [])
          .some(p => p.status === 'Confirmed' && p.paymentTransactionId === txId);
        if (landed) {
          // The allocation succeeded server-side and only the response was lost (or the retry was
          // refused as a duplicate) — continue exactly like the success path.
          this.splitCardTxId = '';
          this.splitPendingAllocation = false;
          this.error = '';
          this.splitPortion = 0;
          if (settlement.outstandingAmount === 0) {
            await this.finalizeSplit();
          } else if (this.splitCashFirstAmount > 0) {
            const cash = this.splitCashFirstAmount;
            this.splitCashFirstAmount = 0;
            await this.onSplitCashConfirm({ tendered: cash });
          } else {
            this.step = 'splitpay';
          }
          return;
        }
      } catch (e2) { /* fall through to the pending state */ }
      this.splitPendingAllocation = true;
      this.error = this.pos.errMsg(e);
      this.step = 'splitpay';
    },
    // The "legg den til" action the server's stray-guard message asks for: re-allocate the
    // captured portion kept from the failed attempt.
    retryPendingAllocation () {
      if (!this.splitCardTxId) { this.splitPendingAllocation = false; return; }
      this.error = '';
      return this.allocateSplitCard();
    },
    // Books a captured portion after its flow was cancelled (the void raced the tap and lost).
    // Allocation only: never auto-finalizes and never records a cash leg — the part appears with a
    // notice and the operator stays in control of what happens next.
    async allocateStalePortion (txId, amount) {
      if (!this.splitSettlementId) { return; }
      try {
        const result = await this.pos.posSvc().AddSettlementAllocation(this.splitSettlementId, {
          cashPointId: this.cashPointId,
          paymentType: 'SurfboardTerminal',
          amount,
          tenderedAmount: null,
          paymentTransactionId: txId
        });
        this.splitParts.push({ paymentType: 'SurfboardTerminal', amount: result.amount });
        this.splitOutstanding = result.outstandingAmount;
        this.error = this.$i('pos_splitpay_portion_added_late');
      } catch (e) { /* not captured after all, already allocated, or the settlement is closed */ }
    },
    // A sub-50-øre remainder rounds to a zero cash due, which the CashPad cannot confirm; allocate
    // the zero-cash part directly (the server books the øre difference as the rounding line and
    // requires no open trading day for a part that moves no coins).
    splitChooseCash () {
      if (this.splitPendingAllocation) { return; }
      if (this.splitCashDue === 0 && this.splitOutstanding > 0) {
        return this.onSplitCashConfirm({ tendered: 0 });
      }
      this.step = 'splitcash';
      this.error = '';
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
        this.step = 'splitpay';
      } finally {
        this.busy = false;
      }
    },
    async finalizeSplit () {
      try {
        this.receipt = await this.pos.posSvc().FinalizeSettlement(this.splitSettlementId, { cashPointId: this.cashPointId });
        this.step = 'receipt';
        this.autoPrint();
      } catch (e) {
        this.error = this.pos.errMsg(e);
        this.step = 'splitpay';
      }
    },
    // Cancels a portion the cardholder has not completed (provider cancel, logged as VOIDTRANS).
    async voidPortionById (txId, reason) {
      if (!txId) { return; }
      try {
        await this.pos.posSvc().TerminalTimeout(txId, { cashPointId: this.cashPointId, reason });
      } catch (e) { /* best effort */ }
    },
    voidSplitPortion (reason) {
      return this.voidPortionById(this.splitCardTxId, reason);
    },
    cancelSplitCard () {
      // The portion has been approved and its allocation (and possibly the automatic cash leg) is
      // in flight: cancelling now would void an allocated portion and skip the cash remainder.
      if (this.cardState === 'approved') { return; }
      this.splitEpoch++;
      this.stopSplitPoll();
      this.voidSplitPortion('operator_cancel');
      this.splitCardTxId = '';
      this.step = 'splitpay';
    },
    async abandonSplitCard () {
      if (this.cardState === 'approved') { return; }
      this.splitEpoch++;
      this.stopSplitPoll();
      this.step = 'splitpay';
      // The abandoned portion may still complete on the terminal: refresh the settlement so the
      // parts/outstanding shown reflect the server truth rather than a stale client figure.
      try {
        const settlement = await this.pos.posSvc().GetSettlement(this.splitSettlementId);
        this.applySettlement(settlement);
      } catch (e) { /* best effort */ }
    },
    // Leaving the split flow aborts the settlement: confirmed parts are reversed server-side
    // (captured card portions refunded, cash counter-posted, stray portions swept) so no money is
    // retained or left takeable.
    async abortSplitPay () {
      if ((this.splitParts.length > 0 || this.splitPendingAllocation) &&
        !window.confirm(this.$i('pos_splitpay_abort_confirm'))) {
        return;
      }
      try {
        await this.pos.posSvc().AbortSettlement(this.splitSettlementId, { cashPointId: this.cashPointId });
      } catch (e) {
        // The abort may have succeeded without us seeing it (lost response, a double tap, another
        // device): only a settlement that is genuinely still open keeps us here — retrying against
        // an already-closed one throws forever and would trap the operator on a screen whose only
        // exit is this abort. When it IS still open, stay and say so, so the operator retries
        // instead of walking away believing everything was reversed.
        if (await this.isSettlementStillOpen()) {
          this.error = this.pos.errMsg(e);
          return;
        }
      }
      this.splitEpoch++;
      this.splitSettlementId = '';
      this.splitParts = [];
      this.splitOutstanding = 0;
      this.splitCashFirstAmount = 0;
      this.splitCardTxId = '';
      this.splitPendingAllocation = false;
      this.error = '';
      this.step = 'method';
    },
    async isSettlementStillOpen () {
      try {
        const settlement = await this.pos.posSvc().GetSettlement(this.splitSettlementId);
        return settlement.status === 'Open';
      } catch (e) {
        // Unknown: assume open so the operator keeps the retry path rather than losing it.
        return true;
      }
    },

    // ---- Navigation ----
    onBack () {
      if (this.step === 'receipt') { this.$emit('done'); return; }
      if (this.step === 'splitchoice') { this.step = 'method'; this.error = ''; return; }
      if (this.step === 'cash') { this.step = 'method'; this.error = ''; return; }
      if (this.step === 'card') { this.cancelCard(); return; }
      if (this.step === 'splitpay') { this.abortSplitPay(); return; }
      if (this.step === 'splitcard') { this.cancelSplitCard(); return; }
      if (this.step === 'splitcash') { this.step = 'splitpay'; this.error = ''; return; }
      this.$emit('close');
    },

    // ---- Receipt actions ----
    // Prints the receipt automatically when the cash point is configured for it. Fire-and-forget:
    // a print failure must never block or overlay the payment result.
    autoPrint () {
      if (!this.receipt || !this.pos.cashPoint || !this.pos.cashPoint.surfboardAutoPrintReceipt) { return; }
      this.$nextTick(() => { this.printReceipt().catch(() => { /* best effort */ }); });
    },
    // Prefers the Surfboard terminal's built-in printer (backend ESC/POS print) on a
    // Surfboard-driven cash point; the browser's 80 mm iframe print is the fallback.
    async printReceipt () {
      const cashPoint = this.pos.cashPoint;
      if (cashPoint && cashPoint.surfboardTerminalId && this.receipt && this.receipt.journalEntryId) {
        try {
          await this.pos.posSvc().PrintReceipt(this.receipt.journalEntryId, cashPoint.cashPointId);
          return;
        } catch (e) {
          // Terminal print unavailable — fall back to the browser print below.
        }
      }
      if (this.$refs.receiptView) { this.$refs.receiptView.print(); }
    },
    async copyReceipt () {
      this.receiptError = '';
      try {
        this.receipt = await this.pos.posSvc().CopyReceipt(this.receipt.journalEntryId, { cashPointId: this.cashPointId });
        this.$nextTick(() => this.printReceipt());
      } catch (e) {
        // Surface the copy failure directly, not in the unrelated SMS-status field.
        this.receiptError = this.pos.errMsg(e);
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

.payment__choice {
  display: flex;
  align-items: center;
  gap: 18px;
  width: 100%;
  padding: 20px 22px;
  border: 2px solid #e2e8f0;
  background: #ffffff;
  border-radius: 18px;
  margin-bottom: 14px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.12s ease, transform 0.06s ease;
}
.payment__choice:hover { border-color: var(--pos-primary, #1bb776); }
.payment__choice:active { transform: translateY(1px); }
.payment__choice svg { width: 44px; height: 44px; flex-shrink: 0; color: var(--pos-primary, #1bb776); }
.payment__choice-text { display: flex; flex-direction: column; gap: 4px; }
.payment__choice-title { font-size: 1.25rem; font-weight: 700; color: var(--pos-ink, #292c34); }
.payment__choice-sub { font-size: 0.95rem; color: #64748b; }

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
.payment__sp-pending {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #fbbf24;
  background: #fef3c7;
  margin-bottom: 12px;
}
.payment__sp-pending p {
  margin: 0 0 8px;
  font-weight: 600;
  color: #92400e;
}
.payment__sp-persons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: 10px 0 6px;
  color: #64748b;
  font-weight: 600;
}
.payment__sp-step {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid #cbd5e0;
  background: #ffffff;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--pos-ink, #292c34);
  cursor: pointer;
}
.payment__sp-step:disabled { color: #cbd5e0; cursor: not-allowed; }
.payment__sp-persons-val { font-size: 1.5rem; font-weight: 800; color: var(--pos-ink, #292c34); min-width: 34px; text-align: center; }
.payment__sp-share {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 12px 14px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-weight: 600;
}
.payment__sp-share strong { font-size: 1.4rem; color: var(--pos-ink, #292c34); }
.payment__sp-toggle {
  display: block;
  margin: 12px auto 0;
  background: none;
  border: none;
  color: #64748b;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
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
