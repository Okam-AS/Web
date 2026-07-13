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
          <button type="button" class="day-flow__action" @click="showReturnLookup = true">
            {{ $i('pos_return_refund_sale') }}
          </button>
          <button type="button" class="day-flow__action" @click="showReturnBuilder = true">
            {{ $i('pos_return_new') }}
          </button>
          <button type="button" class="day-flow__action day-flow__action--danger" @click="showEod = true">
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

      <!-- Notice -->
      <transition name="day-notice">
        <div v-if="notice.show" class="day-flow__notice" :class="'day-flow__notice--' + notice.type">
          {{ notice.message }}
        </div>
      </transition>
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
        <button type="button" class="day-flow__xclose" @click="showX = false">
          {{ $i('common_close') }}
        </button>
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

    <ReturnLookup v-if="showReturnLookup" @close="showReturnLookup = false" />
    <ReturnBuilder v-if="showReturnBuilder" @done="onReturnDone" @close="showReturnBuilder = false" />
  </div>
</template>

<script>
import DrawerTransactionModal from '~/components/admin/pos/DrawerTransactionModal.vue';
import XReportView from '~/components/admin/pos/XReportView.vue';
import EodWizard from '~/components/admin/pos/EodWizard.vue';
import ReturnLookup from '~/components/admin/pos/ReturnLookup.vue';
import ReturnBuilder from '~/components/admin/pos/ReturnBuilder.vue';

// Day mode: opening summary + running expected cash, manual pay-in/out, the X report (no side
// effect) and the end-of-day wizard. Begin-day itself is the blocking BeginDayModal in the shell.
export default {
  name: 'DayFlow',
  components: { DrawerTransactionModal, XReportView, EodWizard, ReturnLookup, ReturnBuilder },
  inject: ['pos'],
  data () {
    return {
      eod: null,
      showTxn: false,
      txnType: 'PayIn',
      txnBusy: false,
      txnError: '',
      showX: false,
      xReport: null,
      showEod: false,
      showReturnLookup: false,
      showReturnBuilder: false,
      notice: { show: false, message: '', type: 'info' },
      noticeTimer: null
    };
  },
  computed: {
    session () { return this.pos.daySession; },
    dayOpen () { return this.pos.dayOpen; },
    cashPoint () { return this.pos.cashPoint; }
  },
  watch: {
    dayOpen: {
      immediate: true,
      handler (open) {
        if (open) { this.loadEod(); }
      }
    }
  },
  beforeDestroy () {
    if (this.noticeTimer) { clearTimeout(this.noticeTimer); }
  },
  methods: {
    notify (message, type = 'info') {
      this.notice = { show: true, message, type };
      if (this.noticeTimer) { clearTimeout(this.noticeTimer); }
      this.noticeTimer = setTimeout(() => { this.notice.show = false; }, 3000);
    },
    async loadEod () {
      if (!this.session) { return; }
      try {
        this.eod = await this.pos.drawerSvc().EodSummary(this.session.cashDrawerSessionId);
      } catch (e) {
        this.eod = null;
      }
    },
    openTxn (type) {
      this.txnType = type;
      this.txnError = '';
      this.showTxn = true;
    },
    async onTxnConfirm ({ amount }) {
      this.txnBusy = true;
      this.txnError = '';
      try {
        await this.pos.drawerSvc().RecordTransaction(this.session.cashDrawerSessionId, { type: this.txnType, amount });
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
.day-flow__xclose { display: block; width: 100%; margin-top: 14px; height: 50px; border: none; border-radius: 12px; background: #ffffff; color: var(--pos-ink, #292c34); font-weight: 700; cursor: pointer; }

.day-flow__notice { position: fixed; top: 80px; left: 50%; transform: translateX(-50%); padding: 12px 22px; border-radius: 12px; font-weight: 600; color: #fff; z-index: 1200; }
.day-flow__notice--info { background: #334155; }
.day-flow__notice--success { background: var(--pos-primary-dark, #159f63); }
.day-flow__notice--error { background: #ef4444; }
.day-notice-enter-active, .day-notice-leave-active { transition: opacity 0.2s ease; }
.day-notice-enter, .day-notice-leave-to { opacity: 0; }
</style>
