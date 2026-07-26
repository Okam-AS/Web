<template>
  <AdminPage @login-success="init">
    <div class="pos-reports">
      <div class="pos-reports__header">
        <h1 class="pos-reports__title">
          {{ $i('nav_pos_reports') }}
        </h1>
        <p class="pos-reports__intro">
          {{ $i('posrep_intro') }}
        </p>
      </div>

      <transition name="pos-reports-toast">
        <div v-if="toast.show" class="pos-reports__toast" :class="'pos-reports__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <!-- Cash point selector -->
      <div class="pos-reports__cp">
        <label>{{ $i('posrep_cashpoint') }}</label>
        <select v-model.number="cashPointId">
          <option :value="0">
            {{ $i('posrep_pick_cashpoint') }}
          </option>
          <option v-for="cp in cashPoints" :key="cp.cashPointId" :value="cp.cashPointId">
            {{ cp.name }} ({{ cp.registerId }})
          </option>
        </select>
      </div>

      <div class="pos-reports__tabs">
        <button v-for="t in tabs" :key="t.key" class="pos-reports__tab" :class="{ 'is-active': activeTab === t.key }" @click="activeTab = t.key">
          {{ t.label }}
        </button>
      </div>

      <!-- ===== X / Z ===== -->
      <section v-if="activeTab === 'xz'">
        <div class="pos-reports__actions">
          <button class="pos-reports__btn" :disabled="!cashPointId || xLoading" @click="runX">
            {{ $i('posrep_run_x') }}
          </button>
          <!-- Prints on the cash point's own Surfboard terminal, not on this browser's printer. -->
          <button class="pos-reports__btn pos-reports__btn--ghost" :disabled="!cashPointId || printing || !canPrintReport" :title="printHint" @click="printX">
            {{ $i('pos_report_print_x') }}
          </button>
        </div>
        <div v-if="xReport" class="pos-reports__report">
          <XReportView :report="xReport" />
        </div>

        <h3 class="pos-reports__subhead">
          {{ $i('posrep_z_history') }}
        </h3>
        <div v-if="!cashPointId" class="pos-reports__muted">
          {{ $i('posrep_pick_first') }}
        </div>
        <table v-else class="pos-reports__table">
          <thead><tr><th>Z#</th><th>{{ $i('posrep_col_date') }}</th><th>{{ $i('posrep_col_sales') }}</th><th>{{ $i('posrep_col_diff') }}</th><th /></tr></thead>
          <tbody>
            <tr v-if="!zHistory.length">
              <td colspan="5" class="pos-reports__empty">
                {{ $i('posrep_no_z') }}
              </td>
            </tr>
            <tr v-for="z in zHistory" :key="z.zReportId">
              <td>{{ z.zNumber }}</td>
              <td>{{ z.localDate }} {{ z.localTime }}</td>
              <td>{{ priceLabel(z.salesAmount) }}</td>
              <td :class="{ 'is-off': z.cashDifference }">
                {{ z.cashDifference != null ? priceLabel(z.cashDifference) : '—' }}
              </td>
              <td class="pos-reports__row-actions">
                <button class="pos-reports__link" @click="viewZ(z)">
                  {{ $i('common_view') }}
                </button>
                <button class="pos-reports__link" :disabled="printing || !canPrintReport" :title="printHint" @click="printZ(z)">
                  {{ $i('pos_receipt_print') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="zModal" class="pos-reports__modal" @click.self="zModal = null">
          <div class="pos-reports__modal-inner">
            <XReportView :report="zModal" />
            <div class="pos-reports__modal-actions">
              <button class="pos-reports__close" @click="zModal = null">
                {{ $i('common_close') }}
              </button>
              <button class="pos-reports__btn" :disabled="printing || !canPrintReport" :title="printHint" @click="printZ(zModal)">
                {{ $i('pos_report_print_z') }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== Journal ===== -->
      <section v-else-if="activeTab === 'journal'">
        <div class="pos-reports__filters">
          <label>{{ $i('posrep_from') }}<input v-model="jFrom" type="date"></label>
          <label>{{ $i('posrep_to') }}<input v-model="jTo" type="date"></label>
          <button class="pos-reports__btn" :disabled="!cashPointId || jLoading" @click="loadJournal(1)">
            {{ $i('posrep_search') }}
          </button>
          <button class="pos-reports__btn pos-reports__btn--ghost" :disabled="!cashPointId || jLoading" @click="verifyJournal">
            {{ $i('posrep_verify') }}
          </button>
        </div>
        <div v-if="verifyResult" class="pos-reports__verify" :class="verifyResult.verified ? 'is-ok' : 'is-bad'">
          {{ verifyResult.verified ? $i('posrep_verify_ok') : $i('posrep_verify_bad') }} — {{ verifyResult.message }} ({{ verifyResult.entryCount }} {{ $i('posrep_entries') }})
        </div>
        <table v-if="cashPointId" class="pos-reports__table">
          <thead><tr><th>#</th><th>{{ $i('posrep_col_event') }}</th><th>{{ $i('posrep_col_receipt') }}</th><th>{{ $i('posrep_col_date') }}</th><th>{{ $i('posrep_col_gross') }}</th><th /></tr></thead>
          <tbody>
            <tr v-if="!journal.length">
              <td colspan="6" class="pos-reports__empty">
                {{ $i('posrep_no_entries') }}
              </td>
            </tr>
            <tr v-for="e in journal" :key="e.journalEntryId">
              <td>{{ e.sequenceNumber }}</td>
              <td>{{ e.eventType }}</td>
              <td>{{ e.receiptNumber || '—' }}</td>
              <td>{{ formatDate(e.timestamp) }}</td>
              <td>{{ priceLabel(e.grossAmount) }}</td>
              <td class="pos-reports__row-actions">
                <button class="pos-reports__link" @click="viewEntry(e)">
                  {{ $i('common_view') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="journalTotal > journalPageSize" class="pos-reports__pager">
          <button :disabled="journalPage <= 1" @click="loadJournal(journalPage - 1)">
            ‹
          </button>
          <span>{{ journalPage }} / {{ Math.ceil(journalTotal / journalPageSize) }}</span>
          <button :disabled="journalPage >= Math.ceil(journalTotal / journalPageSize)" @click="loadJournal(journalPage + 1)">
            ›
          </button>
        </div>
        <div v-if="entryModal" class="pos-reports__modal" @click.self="entryModal = null">
          <div class="pos-reports__modal-inner pos-reports__entry">
            <h3>{{ $i('posrep_entry') }} #{{ entryModal.sequenceNumber }} · {{ entryModal.eventType }}</h3>
            <div class="pos-reports__kv">
              <span>{{ $i('posrep_col_receipt') }}</span><span>{{ entryModal.receiptNumber || '—' }}</span>
            </div>
            <div class="pos-reports__kv">
              <span>{{ $i('posrep_col_date') }}</span><span>{{ formatDate(entryModal.timestamp) }}</span>
            </div>
            <div class="pos-reports__kv">
              <span>{{ $i('posrep_col_gross') }}</span><span>{{ priceLabel(entryModal.grossAmount) }}</span>
            </div>
            <div class="pos-reports__kv">
              <span>MVA</span><span>{{ priceLabel(entryModal.vatAmount) }}</span>
            </div>
            <div class="pos-reports__kv">
              <span>{{ $i('posrep_operator') }}</span><span>{{ entryModal.operatorName }}</span>
            </div>
            <div class="pos-reports__kv pos-reports__sig">
              <span>{{ $i('pos_receipt_signature') }}</span><span>{{ (entryModal.signature || '').slice(0, 32) }}…</span>
            </div>
            <button class="pos-reports__close" @click="entryModal = null">
              {{ $i('common_close') }}
            </button>
          </div>
        </div>
      </section>

      <!-- ===== SAF-T ===== -->
      <section v-else-if="activeTab === 'saft'">
        <p class="pos-reports__muted">
          {{ $i('posrep_saft_hint') }}
        </p>
        <div class="pos-reports__filters">
          <label>{{ $i('posrep_from') }}<input v-model="sFrom" type="date"></label>
          <label>{{ $i('posrep_to') }}<input v-model="sTo" type="date"></label>
        </div>
        <div class="pos-reports__actions">
          <button class="pos-reports__btn" :disabled="!canSaft || sLoading" @click="downloadSaft">
            {{ $i('posrep_saft_download') }}
          </button>
        </div>
        <div class="pos-reports__filters">
          <label>{{ $i('posrep_saft_email') }}<input v-model="sEmail" type="email" :placeholder="$i('posrep_saft_email_ph')"></label>
          <button class="pos-reports__btn pos-reports__btn--ghost" :disabled="!canSaft || !sEmail || sLoading" @click="emailSaft">
            {{ $i('posrep_saft_send') }}
          </button>
        </div>
      </section>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import XReportView from '~/components/admin/pos/XReportView.vue';

// Power-user POS reports: X on demand + Z history, the append-only journal (with signature-chain
// verification), and SAF-T Cash Register export. Reads use store read-access (PowerUser allowed),
// so no operator session is required here.
export default {
  name: 'AdminPosReports',
  components: { AdminPage, XReportView },
  data () {
    return {
      activeTab: 'xz',
      toast: { show: false, message: '', type: 'success' },
      toastTimer: null,
      cashPoints: [],
      cashPointId: 0,
      xReport: null,
      xLoading: false,
      printing: false,
      zHistory: [],
      zModal: null,
      jFrom: '',
      jTo: '',
      journal: [],
      journalPage: 1,
      journalPageSize: 50,
      journalTotal: 0,
      jLoading: false,
      verifyResult: null,
      entryModal: null,
      sFrom: '',
      sTo: '',
      sEmail: '',
      sLoading: false
    };
  },
  computed: {
    tabs () {
      return [
        { key: 'xz', label: this.$i('posrep_tab_xz') },
        { key: 'journal', label: this.$i('posrep_tab_journal') },
        { key: 'saft', label: this.$i('posrep_tab_saft') }
      ];
    },
    storeId () {
      const selected = this.$store.state.selectedAdminStore;
      if (selected) { return selected; }
      const stores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      return stores.length ? stores[0].id : '';
    },
    canSaft () { return !!this.storeId && !!this.sFrom && !!this.sTo; },
    // X and Z print as ESC/POS on the cash point's own Surfboard terminal — there is no browser
    // fallback for a report the way there is for a receipt. Without a bound terminal the button
    // can only produce a backend error, so it is disabled and says why instead.
    selectedCashPoint () {
      return this.cashPoints.find(cp => cp.cashPointId === this.cashPointId) || null;
    },
    canPrintReport () {
      return !!(this.selectedCashPoint && this.selectedCashPoint.surfboardTerminalId);
    },
    printHint () {
      return this.canPrintReport ? '' : this.$i('pos_report_print_needs_terminal');
    }
  },
  watch: {
    cashPointId () {
      this.xReport = null;
      this.zHistory = [];
      this.journal = [];
      this.verifyResult = null;
      if (this.cashPointId) {
        this.loadZHistory();
      }
    }
  },
  mounted () {
    this.init();
  },
  beforeDestroy () {
    if (this.toastTimer) { clearTimeout(this.toastTimer); }
  },
  methods: {
    init () {
      if (!this.$store.getters.userIsLoggedIn) { return; }
      if (!(this.$store.state.currentUser && this.$store.state.currentUser.isPowerUser)) {
        this.$router.push('/admin');
        return;
      }
      this.loadCashPoints();
    },
    errMsg (e) { return (e && e.response && e.response.data && e.response.data.message) || (e && e.message) || 'Feil'; },
    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 4000);
    },
    async loadCashPoints () {
      try {
        this.cashPoints = await this._cashPointService.GetForStore(this.storeId) || [];
        if (this.cashPoints.length === 1) { this.cashPointId = this.cashPoints[0].cashPointId; }
      } catch (e) {
        this.notify(this.errMsg(e), 'error');
      }
    },
    async runX () {
      this.xLoading = true;
      try {
        this.xReport = await this._reportService.XReport(this.cashPointId);
      } catch (e) {
        this.notify(this.errMsg(e), 'error');
      } finally {
        this.xLoading = false;
      }
    },
    // X and Z print on the cash point's Surfboard terminal (backend ESC/POS), so the paper matches
    // the register's own receipts. Printing an X does not cut the period; a Z is already settled,
    // so reprinting it is safe.
    async printX () {
      if (this.printing) { return; }
      this.printing = true;
      try {
        await this._reportService.PrintXReport(this.cashPointId);
        this.notify(this.$i('pos_report_printed'), 'success');
      } catch (e) {
        this.notify(this.errMsg(e), 'error');
      } finally {
        this.printing = false;
      }
    },
    async printZ (report) {
      if (this.printing || !report) { return; }
      this.printing = true;
      try {
        await this._reportService.PrintZReport(report.zReportId);
        this.notify(this.$i('pos_report_printed'), 'success');
      } catch (e) {
        this.notify(this.errMsg(e), 'error');
      } finally {
        this.printing = false;
      }
    },
    async loadZHistory () {
      try {
        const res = await this._reportService.GetZHistory(this.cashPointId, 1, 50);
        this.zHistory = (res && res.reports) || [];
      } catch (e) {
        this.zHistory = [];
      }
    },
    async viewZ (z) {
      try {
        this.zModal = await this._reportService.GetZReport(z.zReportId);
      } catch (e) {
        this.notify(this.errMsg(e), 'error');
      }
    },
    async loadJournal (page) {
      if (!this.cashPointId) { return; }
      this.jLoading = true;
      try {
        const res = await this._journalService.GetForCashPoint(this.cashPointId, this.jFrom || undefined, this.jTo || undefined, page, this.journalPageSize);
        this.journal = (res && res.entries) || [];
        this.journalPage = (res && res.page) || page;
        this.journalTotal = (res && res.totalCount) || 0;
      } catch (e) {
        this.notify(this.errMsg(e), 'error');
      } finally {
        this.jLoading = false;
      }
    },
    async verifyJournal () {
      try {
        this.verifyResult = await this._journalService.Verify(this.cashPointId);
      } catch (e) {
        this.notify(this.errMsg(e), 'error');
      }
    },
    viewEntry (e) { this.entryModal = e; },
    async downloadSaft () {
      this.sLoading = true;
      try {
        const xml = await this._saftService.Export(this.storeId, this.sFrom, this.sTo);
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'saft-' + this.storeId + '-' + this.sFrom + '_' + this.sTo + '.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        this.notify(this.errMsg(e), 'error');
      } finally {
        this.sLoading = false;
      }
    },
    async emailSaft () {
      this.sLoading = true;
      try {
        const res = await this._saftService.ExportEmail({ storeId: Number(this.storeId), from: this.sFrom, to: this.sTo, email: this.sEmail });
        this.notify(res && res.sent ? this.$i('posrep_saft_sent') : this.$i('posrep_saft_fail'), res && res.sent ? 'success' : 'error');
      } catch (e) {
        this.notify(this.errMsg(e), 'error');
      } finally {
        this.sLoading = false;
      }
    }
  }
};
</script>

<style scoped>
.pos-reports { max-width: 1000px; margin: 0 auto; padding: 24px; }
.pos-reports__header { margin-bottom: 16px; }
.pos-reports__title { font-size: 1.9rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.pos-reports__intro { color: #64748b; margin: 0; }
.pos-reports__toast { position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 10px; color: #fff; font-weight: 600; z-index: 1000; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
.pos-reports__toast--success { background: #159f63; }
.pos-reports__toast--error { background: #ef4444; }
.pos-reports-toast-enter-active, .pos-reports-toast-leave-active { transition: opacity 0.25s ease; }
.pos-reports-toast-enter, .pos-reports-toast-leave-to { opacity: 0; }

.pos-reports__cp { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.pos-reports__cp label { font-weight: 600; color: #64748b; }
.pos-reports__cp select, .pos-reports__filters input, .pos-reports__filters label { font-size: 0.95rem; }
.pos-reports__cp select { height: 40px; border: 1px solid #cbd5e0; border-radius: 8px; padding: 0 10px; }

.pos-reports__tabs { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px; }
.pos-reports__tab { border: none; background: none; padding: 10px 16px; font-weight: 600; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.pos-reports__tab.is-active { color: #159f63; border-bottom-color: #1bb776; }

.pos-reports__actions { margin-bottom: 16px; }
.pos-reports__btn { border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 9px 18px; border-radius: 8px; cursor: pointer; }
.pos-reports__btn--ghost { background: #fff; color: #292c34; border: 1px solid #cbd5e0; }
.pos-reports__btn:disabled { background: #cbd5e0; color: #fff; cursor: not-allowed; }
.pos-reports__report { margin-bottom: 24px; }
.pos-reports__subhead { font-size: 1.05rem; color: #292c34; margin: 20px 0 12px; }
.pos-reports__muted { color: #94a3b8; }

.pos-reports__table { width: 100%; border-collapse: collapse; }
.pos-reports__table th { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
.pos-reports__table td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #292c34; }
.pos-reports__table td.is-off { color: #ef4444; font-weight: 700; }
.pos-reports__empty { color: #94a3b8; text-align: center; padding: 20px 0; }
.pos-reports__row-actions { text-align: right; }
.pos-reports__link { border: none; background: none; color: #159f63; font-weight: 600; cursor: pointer; }

.pos-reports__filters { display: flex; align-items: flex-end; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
.pos-reports__filters label { display: flex; flex-direction: column; gap: 5px; font-weight: 600; color: #64748b; font-size: 0.8rem; }
.pos-reports__filters input { height: 40px; border: 1px solid #cbd5e0; border-radius: 8px; padding: 0 10px; }
.pos-reports__verify { padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; font-weight: 600; }
.pos-reports__verify.is-ok { background: rgba(27, 183, 118, 0.1); color: #159f63; }
.pos-reports__verify.is-bad { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.pos-reports__pager { display: flex; align-items: center; gap: 12px; justify-content: center; margin-top: 14px; }
.pos-reports__pager button { border: 1px solid #cbd5e0; background: #fff; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; }
.pos-reports__pager button:disabled { opacity: 0.4; cursor: not-allowed; }

.pos-reports__modal { position: fixed; inset: 0; background: rgba(18, 20, 26, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1100; padding: 16px; overflow-y: auto; }
.pos-reports__modal-inner { width: 100%; max-width: 440px; }
.pos-reports__entry { background: #fff; border-radius: 14px; padding: 22px; }
.pos-reports__entry h3 { margin: 0 0 14px; color: #292c34; }
.pos-reports__kv { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
.pos-reports__kv span:first-child { color: #64748b; }
.pos-reports__sig { word-break: break-all; }
.pos-reports__modal-actions { display: flex; gap: 10px; margin-top: 14px; align-items: stretch; }
.pos-reports__modal-actions .pos-reports__close { flex: 1; margin-top: 0; }
.pos-reports__modal-actions .pos-reports__btn { flex: 1; }
.pos-reports__close { display: block; width: 100%; margin-top: 14px; height: 46px; border: none; border-radius: 10px; background: #fff; color: #292c34; font-weight: 700; cursor: pointer; border: 1px solid #cbd5e0; }
</style>
