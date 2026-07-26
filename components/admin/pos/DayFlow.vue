<template>
  <div class="day-flow">
    <div class="day-flow__inner">
      <h2 class="day-flow__title">
        {{ $i('pos_mode_day') }}
      </h2>

      <!-- Open day -->
      <template v-if="dayOpen">
        <div class="day-flow__cards">
          <div class="day-flow__card">
            <span class="day-flow__card-label">{{ $i('pos_day_opened_at') }}</span>
            <span class="day-flow__card-value">{{ formatDate(session.openedAt) }}</span>
          </div>
          <div class="day-flow__card">
            <span class="day-flow__card-label">{{ $i('pos_day_start_float') }}</span>
            <span class="day-flow__card-value">{{ priceLabel(session.startFloat) }}</span>
          </div>
          <div class="day-flow__card day-flow__card--accent">
            <span class="day-flow__card-label">{{ $i('pos_report_cash_expected') }}</span>
            <span class="day-flow__card-value">{{ eod ? priceLabel(eod.expectedCashAmount) : '—' }}</span>
          </div>
        </div>

        <!-- The day cannot close while checks are open — warn up front with the count and a
             shortcut, instead of letting the operator run into the backend error. -->
        <div v-if="openChecksCount > 0" class="day-flow__warn">
          <p class="day-flow__warn-text">
            {{ $i('pos_eod_open_checks', { count: openChecksCount }) }}
          </p>
          <button type="button" class="day-flow__warn-btn" @click="pos.setMode('board')">
            {{ $i('pos_eod_show_open') }}
          </button>
        </div>

        <div class="day-flow__actions">
          <button type="button" class="day-flow__action" @click="openTxn('PayIn')">
            {{ $i('pos_pay_in') }}
          </button>
          <button type="button" class="day-flow__action" @click="openTxn('PayOut')">
            {{ $i('pos_pay_out') }}
          </button>
          <button type="button" class="day-flow__action" @click="openX">
            {{ $i('pos_xreport') }}
          </button>
          <button type="button" class="day-flow__action" @click="pos.setMode('receipts')">
            {{ $i('pos_mode_receipts') }}
          </button>
          <button type="button" class="day-flow__action" @click="showReturnBuilder = true">
            {{ $i('pos_return_new') }}
          </button>
          <button
            type="button"
            class="day-flow__action day-flow__action--danger"
            :disabled="openChecksCount > 0"
            @click="onCloseDayTap"
          >
            {{ $i('pos_eod_close_day') }}
          </button>
        </div>
      </template>

      <!-- Closed day -->
      <template v-else>
        <div class="day-flow__closed">
          <p>{{ $i('pos_day_closed_msg') }}</p>
          <button type="button" class="day-flow__begin" @click="pos.setMode('sell')">
            {{ $i('pos_begin_new_day') }}
          </button>
        </div>
      </template>

    </div>

    <DrawerTransactionModal
      v-if="showTxn"
      :type="txnType"
      :busy="txnBusy"
      :error="txnError"
      @confirm="onTxnConfirm"
      @close="showTxn = false"
    />

    <div v-if="showX" class="day-flow__overlay" @click.self="showX = false">
      <div class="day-flow__xwrap">
        <XReportView :report="xReport" />
        <div class="day-flow__xactions">
          <button type="button" class="day-flow__xclose" @click="showX = false">
            {{ $i('common_close') }}
          </button>
          <button
            type="button"
            class="day-flow__xprint"
            :disabled="xPrinting || !canPrintReport"
            :title="canPrintReport ? '' : $i('pos_report_print_needs_terminal')"
            @click="printX"
          >
            {{ $i('pos_receipt_print') }}
          </button>
        </div>
      </div>
    </div>

    <EodWizard
      v-if="showEod"
      :session-id="session.cashDrawerSessionId"
      :expected-cash="eod ? eod.expectedCashAmount : 0"
      :max-difference="cashPoint.maxCashDifference"
      :default-email="eod ? (eod.eodReceiptEmail || '') : ''"
      @done="onEodDone"
      @close="showEod = false"
    />

    <ReturnBuilder v-if="showReturnBuilder" @done="onReturnDone" @close="showReturnBuilder = false" />
  </div>
</template>

<script>
import DrawerTransactionModal from '~/components/admin/pos/DrawerTransactionModal.vue';
import XReportView from '~/components/admin/pos/XReportView.vue';
import EodWizard from '~/components/admin/pos/EodWizard.vue';
import ReturnBuilder from '~/components/admin/pos/ReturnBuilder.vue';
import { newGuid } from '~/utils/guid';

// Day mode: opening summary + running expected cash, manual pay-in/out, the X report (no side
// effect) and the end-of-day wizard. Begin-day itself is the blocking BeginDayModal in the shell.
export default {
  name: 'DayFlow',
  components: { DrawerTransactionModal, XReportView, EodWizard, ReturnBuilder },
  inject: ['pos'],
  data () {
    return {
      eod: null,
      showTxn: false,
      txnType: 'PayIn',
      txnBusy: false,
      txnError: '',
      // Idempotency key for the drawer movement being entered, and the amount it was minted for.
      txnIdempotencyKey: '',
      txnKeyedAmount: null,
      showX: false,
      xReport: null,
      xPrinting: false,
      showEod: false,
      showReturnBuilder: false
    };
  },
  computed: {
    session () { return this.pos.daySession; },
    dayOpen () { return this.pos.dayOpen; },
    cashPoint () { return this.pos.cashPoint; },
    // Open (seated) checks + parked checks from the live board poll: the backend refuses to
    // close the day while any exist, so the UI blocks the flow with the same rule.
    openChecksCount () {
      const b = this.pos.boardStatus;
      if (!b) { return 0; }
      const seated = (b.tables || []).filter(t => t.openCheck).length;
      return seated + ((b.parkedChecks || []).length);
    },
    // An X prints as ESC/POS on this cash point's Surfboard terminal. Unlike a receipt there is no
    // browser fallback for a report, so without a bound terminal the button could only ever return
    // a backend error — it says why instead.
    canPrintReport () { return !!(this.cashPoint && this.cashPoint.surfboardTerminalId); }
  },
  watch: {
    dayOpen: {
      immediate: true,
      handler (open) {
        if (open) { this.loadEod(); }
      }
    }
  },
  methods: {
    // Thin delegate: every toast in the register is owned and rendered by the shell.
    notify (message, type = 'info', opts) {
      this.pos.notify(message, type, opts);
    },
    async loadEod () {
      if (!this.session) { return; }
      try {
        this.eod = await this.pos.drawerSvc().EodSummary(this.session.cashDrawerSessionId);
      } catch (e) {
        this.eod = null;
      }
    },
    onCloseDayTap () {
      if (this.openChecksCount > 0) {
        this.notify(this.$i('pos_eod_open_checks', { count: this.openChecksCount }), 'error');
        return;
      }
      this.showEod = true;
    },
    openTxn (type) {
      this.txnType = type;
      this.txnError = '';
      this.txnIdempotencyKey = newGuid();
      this.txnKeyedAmount = null;
      this.showTxn = true;
    },
    // The key identifies ONE logical movement, and the amount is part of that identity: the pad
    // stays editable after a failure, so an operator who spots a typo and corrects 500 to 5000
    // would otherwise retry under the old key — the server would dedupe, return the original
    // 500 posting, and the UI would report success while the drawer is short by 4500. A changed
    // amount is a different movement and gets its own key; an unchanged one keeps the key, which
    // is the whole point of the retry guard.
    async onTxnConfirm ({ amount }) {
      if (this.txnKeyedAmount !== amount) {
        this.txnIdempotencyKey = newGuid();
        this.txnKeyedAmount = amount;
      }
      this.txnBusy = true;
      this.txnError = '';
      try {
        await this.pos.drawerSvc().RecordTransaction(this.session.cashDrawerSessionId, {
          type: this.txnType,
          amount,
          idempotencyKey: this.txnIdempotencyKey
        });
        this.showTxn = false;
        await this.loadEod();
        this.notify(this.$i('pos_drawer_recorded'), 'success');
      } catch (e) {
        this.txnError = this.pos.errMsg(e);
      } finally {
        this.txnBusy = false;
      }
    },
    async openX () {
      try {
        this.xReport = await this.pos.reportSvc().XReport(this.cashPoint.cashPointId);
        this.showX = true;
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      }
    },
    // The X is reprojected server-side and printed as ESC/POS on the cash point's Surfboard
    // terminal — the same roll the receipts come off. Reprinting is free: an X has no side effects.
    async printX () {
      if (this.xPrinting) { return; }
      this.xPrinting = true;
      try {
        await this.pos.reportSvc().PrintXReport(this.cashPoint.cashPointId);
        this.notify(this.$i('pos_report_printed'), 'success');
      } catch (e) {
        this.notify(this.pos.errMsg(e), 'error');
      } finally {
        this.xPrinting = false;
      }
    },
    async onEodDone () {
      this.showEod = false;
      await this.pos.loadDay();
    },
    async onReturnDone () {
      this.showReturnBuilder = false;
      // A cash return leaves the drawer, so refresh the running expected cash.
      await this.loadEod();
    }
  }
};
</script>

<style scoped>
.day-flow { height: 100%; overflow-y: auto; padding: 28px 24px; background: #f8f9fa; }
.day-flow__inner { max-width: 640px; margin: 0 auto; }
.day-flow__title { font-size: 1.6rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0 0 20px; }

.day-flow__cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 22px; }
.day-flow__card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
.day-flow__card--accent { border-color: var(--pos-primary, #1bb776); background: rgba(27, 183, 118, 0.06); }
.day-flow__card-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.03em; }
.day-flow__card-value { font-size: 1.4rem; font-weight: 700; color: var(--pos-ink, #292c34); }

.day-flow__warn { border: 1px solid #fcd34d; background: #fffbeb; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; }
.day-flow__warn-text { margin: 0 0 10px; color: #b45309; font-weight: 600; }
.day-flow__warn-btn { height: 42px; border: 1px solid #f59e0b; border-radius: 10px; background: #ffffff; color: #b45309; font-weight: 700; cursor: pointer; padding: 0 16px; }
.day-flow__action:disabled { opacity: 0.45; cursor: not-allowed; }

.day-flow__actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.day-flow__action {
  height: 64px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 14px;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--pos-ink, #292c34);
  cursor: pointer;
}
.day-flow__action:hover { border-color: var(--pos-primary, #1bb776); }
.day-flow__action--danger { color: #ef4444; }
.day-flow__action--danger:hover { border-color: #ef4444; background: #fef2f2; }

.day-flow__closed { text-align: center; padding: 40px 0; }
.day-flow__closed p { color: #64748b; font-size: 1.1rem; margin: 0 0 20px; }
.day-flow__begin { border: none; background: var(--pos-primary, #1bb776); color: #fff; font-weight: 700; padding: 14px 28px; border-radius: 12px; font-size: 1.05rem; cursor: pointer; }

.day-flow__overlay { position: fixed; inset: 0; background: rgba(18, 20, 26, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1100; padding: 16px; overflow-y: auto; }
.day-flow__xwrap { width: 100%; max-width: 440px; }
.day-flow__xactions { display: flex; gap: 10px; margin-top: 14px; }
.day-flow__xclose { flex: 1; height: 50px; border: none; border-radius: 12px; background: #ffffff; color: var(--pos-ink, #292c34); font-weight: 700; cursor: pointer; }
.day-flow__xprint { flex: 1; height: 50px; border: none; border-radius: 12px; background: var(--pos-primary, #1bb776); color: #ffffff; font-weight: 700; cursor: pointer; }
.day-flow__xprint:disabled { opacity: 0.6; cursor: not-allowed; }

</style>
