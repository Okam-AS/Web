<template>
  <AdminPage @login-success="handleLoginSuccess">
    <div class="terminal-page">
      <div class="page-header">
        <h1>{{ $i('dt_title') }}</h1>
        <p class="page-description">
          {{ $i('dt_description') }}
        </p>
      </div>

      <!-- Diagnostics -->
      <div class="card">
        <div class="card-head">
          <h2>{{ $i('dt_diag_title') }}</h2>
          <button class="btn btn-secondary" :disabled="diagnosticsLoading" @click="runDiagnostics">
            {{ diagnosticsLoading ? $i('dt_running') : $i('dt_run_diag') }}
          </button>
        </div>
        <p class="hint">
          {{ $i('dt_diag_hint') }}
        </p>
        <div v-if="diagnostics" class="diag">
          <ul class="kv">
            <li><span>Token OK</span><b :class="diagnostics.tokenOk ? 'ok' : 'err'">{{ diagnostics.tokenOk }}</b></li>
            <li v-if="diagnostics.tokenError">
              <span>{{ $i('dt_token_error') }}</span><b class="err">{{ diagnostics.tokenError }}</b>
            </li>
            <li><span>AccountId</span><b>{{ diagnostics.accountId || "—" }}</b></li>
            <li><span>ClientId {{ $i('dt_set') }}</span><b>{{ diagnostics.hasClientId }}</b></li>
            <li><span>ClientSecret {{ $i('dt_set') }}</span><b>{{ diagnostics.hasClientSecret }}</b></li>
            <li><span>ProfileId {{ $i('dt_set') }}</span><b>{{ diagnostics.hasProfileId }}</b></li>
            <li><span>Default store</span><b>{{ diagnostics.defaultStoreId || "—" }}</b></li>
            <li><span>Default terminal</span><b>{{ diagnostics.defaultTerminalId || "—" }}</b></li>
            <li><span>Default payout</span><b>{{ diagnostics.defaultPayoutDestinationId || "—" }}</b></li>
          </ul>
          <details open>
            <summary>{{ $i('dt_terminals') }} {{ diagnostics.terminalsError ? $i('dt_error_paren') : "" }}</summary>
            <pre>{{ diagnostics.terminalsError || pretty(diagnostics.terminalsRaw) }}</pre>
          </details>
          <details>
            <summary>{{ $i('dt_profiles') }} {{ diagnostics.profilesError ? $i('dt_error_paren') : "" }}</summary>
            <pre>{{ diagnostics.profilesError || pretty(diagnostics.profilesRaw) }}</pre>
          </details>
          <details>
            <summary>{{ $i('dt_payout_destinations') }} {{ diagnostics.payoutDestinationsError ? $i('dt_error_paren') : "" }}</summary>
            <pre>{{ diagnostics.payoutDestinationsError || pretty(diagnostics.payoutDestinationsRaw) }}</pre>
          </details>
        </div>
      </div>

      <!-- Terminal operations -->
      <div class="card">
        <h2>{{ $i('dt_ops_title') }}</h2>
        <p class="hint">
          {{ $i('dt_ops_hint_1') }} <b>{{ $i('dt_end_of_day') }}</b> {{ $i('dt_ops_hint_2') }}
        </p>
        <div class="actions wrap">
          <button class="btn btn-primary" :disabled="operationRunning" @click="sendOperation('end_of_day')">
            🖨️ {{ $i('dt_end_of_day_btn') }}
          </button>
          <button class="btn btn-secondary" :disabled="operationRunning" @click="sendOperation('check_update')">
            {{ $i('dt_check_update') }}
          </button>
          <button class="btn btn-secondary" :disabled="operationRunning" @click="sendOperation('open_menu')">
            {{ $i('dt_open_menu') }}
          </button>
          <button class="btn btn-secondary" :disabled="operationRunning" @click="sendOperation('send_logs')">
            {{ $i('dt_send_logs') }}
          </button>
        </div>
        <p v-if="operationRunning" class="hint">
          {{ $i('dt_sending_op') }}
        </p>
        <details v-if="operationResult">
          <summary>{{ $i('dt_response_http', { code: operationResult.statusCode }) }}</summary>
          <pre>{{ pretty(operationResult.raw) }}</pre>
        </details>
      </div>

      <!-- Charge -->
      <div class="card">
        <h2>{{ $i('dt_charge_title') }}</h2>
        <div class="grid">
          <label>{{ $i('dt_amount') }}
            <input v-model="amountKr" type="number" min="0" step="0.01">
          </label>
          <label>{{ $i('dt_currency') }}
            <input v-model="currency" type="text">
          </label>
          <label>{{ $i('dt_vat') }}
            <input v-model.number="vatPercent" type="number" min="0" max="100">
          </label>
          <label>{{ $i('dt_reference') }}
            <input v-model="merchantReference" type="text" placeholder="auto">
          </label>
          <label class="span2">{{ $i('common_description') }}
            <input v-model="description" type="text">
          </label>
        </div>
        <details class="overrides">
          <summary>{{ $i('dt_overrides') }}</summary>
          <div class="grid">
            <label>Store ID<input v-model="storeId" type="text" placeholder="default"></label>
            <label>Terminal ID<input v-model="terminalId" type="text" placeholder="default"></label>
            <label>Payout destination ID<input v-model="payoutDestinationId" type="text" placeholder="default"></label>
            <label>Profile ID<input v-model="profileId" type="text" placeholder="default"></label>
          </div>
        </details>
        <div class="actions">
          <button class="btn btn-primary" :disabled="initiating || polling" @click="initiate">
            {{ initiating ? $i('dt_sending') : $i('dt_send_to_terminal') }}
          </button>
          <button v-if="session" class="btn btn-danger" :disabled="cancelling" @click="cancel">
            {{ cancelling ? $i('dt_cancelling') : $i('common_cancel') }}
          </button>
        </div>
      </div>

      <!-- Status -->
      <div v-if="session || status" class="card">
        <h2>{{ $i('common_status') }}</h2>
        <ul class="kv">
          <li><span>Session ID</span><b>{{ session && session.sessionId || "—" }}</b></li>
          <li><span>Transaction ID</span><b>{{ status && status.transactionId || "—" }}</b></li>
          <li>
            <span>{{ $i('common_status') }}</span>
            <b :class="statusClass">{{ status ? status.status : "Waiting" }} {{ polling ? "⏳" : "" }}</b>
          </li>
          <li v-if="status && status.transactionStatus">
            <span>{{ $i('dt_dintero_status') }}</span><b>{{ status.transactionStatus }}</b>
          </li>
        </ul>
        <details><summary>{{ $i('dt_raw_session') }}</summary><pre>{{ pretty(status && status.rawSession || session && session.raw) }}</pre></details>
        <details v-if="status && status.rawTransaction">
          <summary>{{ $i('dt_raw_transaction') }}</summary><pre>{{ pretty(status.rawTransaction) }}</pre>
        </details>
      </div>

      <!-- Refund -->
      <div class="card">
        <h2>{{ $i('dt_refund_title') }}</h2>
        <div class="grid">
          <label class="span2">Transaction ID
            <input v-model="refundTransactionId" type="text" :placeholder="$i('dt_refund_tx_ph')">
          </label>
          <label>{{ $i('dt_amount') }}<input v-model="refundAmountKr" type="number" min="0" step="0.01"></label>
          <label>{{ $i('dt_reason') }}<input v-model="refundReason" type="text"></label>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" :disabled="refunding || !refundTransactionId" @click="refund">
            {{ refunding ? $i('dt_refunding') : $i('dt_refund_btn') }}
          </button>
        </div>
        <details v-if="refundResult">
          <summary>{{ $i('dt_refund_response', { code: refundResult.statusCode }) }}</summary><pre>{{ pretty(refundResult.raw) }}</pre>
        </details>
      </div>

      <transition name="toast">
        <div v-if="toast.show" class="toast" :class="`toast--${toast.type}`">
          {{ toast.message }}
        </div>
      </transition>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';

export default {
  name: 'DinteroTerminalSandbox',
  components: { AdminPage },
  data () {
    return {
      amountKr: '399',
      currency: 'NOK',
      vatPercent: 0,
      merchantReference: '',
      description: 'POS test',
      storeId: '',
      terminalId: '',
      payoutDestinationId: '',
      profileId: '',

      initiating: false,
      session: null,
      status: null,
      polling: false,
      pollIntervalId: null,

      cancelling: false,

      refundTransactionId: '',
      refundAmountKr: '',
      refundReason: 'Sandbox refund',
      refunding: false,
      refundResult: null,

      diagnosticsLoading: false,
      diagnostics: null,

      operationRunning: false,
      operationResult: null,

      toast: { show: false, message: '', type: 'success' }
    };
  },
  computed: {
    statusClass () {
      const s = this.status ? this.status.status : 'Waiting';
      if (s === 'Success') { return 'ok'; }
      if (s === 'Fail') { return 'err'; }
      return 'pending';
    }
  },
  mounted () {
    if (!this.$store.getters.userIsLoggedIn) { return; }
    if (!this.$store.state.currentUser?.isPowerUser) {
      this.$router.push('/admin');
    }
  },
  beforeDestroy () {
    this.stopPolling();
  },
  methods: {
    handleLoginSuccess () {
      if (!this.$store.state.currentUser?.isPowerUser) {
        this.$router.push('/admin');
      }
    },
    toMinor (kr) {
      const n = parseFloat(kr);
      return isNaN(n) ? 0 : Math.round(n * 100);
    },
    pretty (raw) {
      if (!raw) { return '—'; }
      try {
        return JSON.stringify(typeof raw === 'string' ? JSON.parse(raw) : raw, null, 2);
      } catch (e) {
        return raw;
      }
    },
    async sendOperation (op) {
      this.operationRunning = true;
      this.operationResult = null;
      try {
        this.operationResult = await this._dinteroTerminalService.Operation({
          operation: op,
          terminalId: this.terminalId
        });
        const ok = this.operationResult.success;
        this.showToast(
          ok
            ? this.$i('dt_toast_op_sent', { op, code: this.operationResult.statusCode })
            : this.$i('dt_toast_op_failed_http', { code: this.operationResult.statusCode }),
          ok ? 'success' : 'error'
        );
      } catch (e) {
        this.showToast(e.message || this.$i('dt_toast_op_failed'), 'error');
      } finally {
        this.operationRunning = false;
      }
    },
    async runDiagnostics () {
      this.diagnosticsLoading = true;
      try {
        this.diagnostics = await this._dinteroTerminalService.Diagnostics();
      } catch (e) {
        this.showToast(e.message || this.$i('dt_toast_diag_failed'), 'error');
      } finally {
        this.diagnosticsLoading = false;
      }
    },
    async initiate () {
      const amount = this.toMinor(this.amountKr);
      if (amount <= 0) {
        this.showToast(this.$i('dt_toast_amount_positive'), 'error');
        return;
      }
      this.initiating = true;
      this.status = null;
      this.session = null;
      this.stopPolling();
      try {
        this.session = await this._dinteroTerminalService.Initiate({
          amount,
          currency: this.currency,
          vatPercent: this.vatPercent,
          merchantReference: this.merchantReference,
          description: this.description,
          storeId: this.storeId,
          terminalId: this.terminalId,
          payoutDestinationId: this.payoutDestinationId,
          profileId: this.profileId
        });
        this.showToast(this.$i('dt_toast_sent_to_terminal'), 'success');
        if (this.session && this.session.sessionId) {
          this.startPolling(this.session.sessionId);
        }
      } catch (e) {
        this.showToast(e.message || this.$i('dt_toast_start_failed'), 'error');
      } finally {
        this.initiating = false;
      }
    },
    startPolling (sessionId) {
      this.polling = true;
      const tick = async () => {
        try {
          const result = await this._dinteroTerminalService.Status(sessionId);
          this.status = result;
          if (result.transactionId && !this.refundTransactionId) {
            this.refundTransactionId = result.transactionId;
          }
          if (result.status === 'Success' || result.status === 'Fail') {
            this.stopPolling();
            this.showToast(
              result.status === 'Success' ? this.$i('dt_toast_pay_success') : this.$i('dt_toast_pay_failed'),
              result.status === 'Success' ? 'success' : 'error'
            );
          }
        } catch (e) {
          // transient errors are expected while the terminal is prompting; keep polling
        }
      };
      tick();
      this.pollIntervalId = setInterval(tick, 2000);
    },
    stopPolling () {
      this.polling = false;
      if (this.pollIntervalId) {
        clearInterval(this.pollIntervalId);
        this.pollIntervalId = null;
      }
    },
    async cancel () {
      if (!this.session || !this.session.sessionId) { return; }
      this.cancelling = true;
      try {
        const result = await this._dinteroTerminalService.Cancel(this.session.sessionId);
        this.showToast(this.$i('dt_toast_cancelled', { code: result.statusCode }), result.success ? 'success' : 'error');
      } catch (e) {
        this.showToast(e.message || this.$i('dt_toast_cancel_failed'), 'error');
      } finally {
        this.cancelling = false;
      }
    },
    async refund () {
      const amount = this.toMinor(this.refundAmountKr);
      if (!this.refundTransactionId || amount <= 0) {
        this.showToast(this.$i('dt_toast_need_tx'), 'error');
        return;
      }
      this.refunding = true;
      this.refundResult = null;
      try {
        this.refundResult = await this._dinteroTerminalService.Refund(this.refundTransactionId, {
          amount,
          reason: this.refundReason,
          terminalId: this.terminalId
        });
        this.showToast(this.$i('dt_toast_refund_sent', { code: this.refundResult.statusCode }), 'success');
      } catch (e) {
        this.showToast(e.message || this.$i('dt_toast_refund_failed'), 'error');
      } finally {
        this.refunding = false;
      }
    },
    showToast (message, type = 'success') {
      this.toast = { show: true, message, type };
      setTimeout(() => {
        this.toast.show = false;
      }, 4000);
    }
  }
};
</script>

<style scoped>
.terminal-page {
  max-width: 820px;
  margin: 0 auto;
  padding: 24px;
}
.page-header {
  margin-bottom: 24px;
}
.page-header h1 {
  font-size: 26px;
  font-weight: 700;
  color: #292c34;
  margin: 0 0 4px;
}
.page-description {
  color: #6b7280;
  margin: 0;
  font-size: 14px;
}
.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 20px 24px;
  margin-bottom: 20px;
}
.card h2 {
  font-size: 16px;
  font-weight: 700;
  color: #292c34;
  margin: 0 0 12px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-head h2 {
  margin: 0;
}
.hint {
  font-size: 13px;
  color: #9ca3af;
  margin: 8px 0 0;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 8px;
}
.grid label,
.overrides label {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  color: #4b5563;
  gap: 4px;
}
.grid .span2 {
  grid-column: 1 / -1;
}
input {
  padding: 9px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}
.overrides {
  margin-top: 14px;
}
.overrides summary {
  cursor: pointer;
  font-size: 13px;
  color: #6b7280;
}
.actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}
.actions.wrap {
  flex-wrap: wrap;
}
.btn {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-primary {
  background: #1bb776;
  color: #fff;
}
.btn-secondary {
  background: #eef2f7;
  color: #292c34;
}
.btn-danger {
  background: #ef4444;
  color: #fff;
}
.kv {
  list-style: none;
  padding: 0;
  margin: 0;
}
.kv li {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #f1f3f5;
  font-size: 14px;
}
.kv span {
  color: #6b7280;
}
.kv b {
  color: #292c34;
  font-weight: 600;
  word-break: break-all;
  text-align: right;
  margin-left: 16px;
}
.ok {
  color: #10b981;
}
.err {
  color: #ef4444;
}
.pending {
  color: #d97706;
}
details {
  margin-top: 12px;
}
details summary {
  cursor: pointer;
  font-size: 13px;
  color: #4b5563;
}
pre {
  background: #0f172a;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  overflow: auto;
  max-height: 320px;
  margin-top: 8px;
}
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  z-index: 1000;
}
.toast--success {
  background: #10b981;
}
.toast--error {
  background: #ef4444;
}
</style>
