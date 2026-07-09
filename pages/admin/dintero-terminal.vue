<template>
  <AdminPage @login-success="handleLoginSuccess">
    <div class="terminal-page">
      <div class="page-header">
        <h1>Dintero Terminal (test)</h1>
        <p class="page-description">
          Sandbox for in-person betaling på fysisk terminal. Kun for testing — ikke koblet til
          ordreflyten ennå. Bruker Dintero testmiljø.
        </p>
      </div>

      <!-- Diagnostics -->
      <div class="card">
        <div class="card-head">
          <h2>Diagnostikk</h2>
          <button class="btn btn-secondary" :disabled="diagnosticsLoading" @click="runDiagnostics">
            {{ diagnosticsLoading ? "Kjører…" : "Kjør diagnostikk" }}
          </button>
        </div>
        <p class="hint">Sjekker at testnøklene virker og lister terminaler / profiler / utbetalingsdestinasjoner.</p>
        <div v-if="diagnostics" class="diag">
          <ul class="kv">
            <li><span>Token OK</span><b :class="diagnostics.tokenOk ? 'ok' : 'err'">{{ diagnostics.tokenOk }}</b></li>
            <li v-if="diagnostics.tokenError"><span>Token-feil</span><b class="err">{{ diagnostics.tokenError }}</b></li>
            <li><span>AccountId</span><b>{{ diagnostics.accountId || "—" }}</b></li>
            <li><span>ClientId satt</span><b>{{ diagnostics.hasClientId }}</b></li>
            <li><span>ClientSecret satt</span><b>{{ diagnostics.hasClientSecret }}</b></li>
            <li><span>ProfileId satt</span><b>{{ diagnostics.hasProfileId }}</b></li>
            <li><span>Default store</span><b>{{ diagnostics.defaultStoreId || "—" }}</b></li>
            <li><span>Default terminal</span><b>{{ diagnostics.defaultTerminalId || "—" }}</b></li>
            <li><span>Default payout</span><b>{{ diagnostics.defaultPayoutDestinationId || "—" }}</b></li>
          </ul>
          <details open><summary>Terminaler {{ diagnostics.terminalsError ? "(feil)" : "" }}</summary>
            <pre>{{ diagnostics.terminalsError || pretty(diagnostics.terminalsRaw) }}</pre>
          </details>
          <details><summary>Profiler {{ diagnostics.profilesError ? "(feil)" : "" }}</summary>
            <pre>{{ diagnostics.profilesError || pretty(diagnostics.profilesRaw) }}</pre>
          </details>
          <details><summary>Utbetalingsdestinasjoner {{ diagnostics.payoutDestinationsError ? "(feil)" : "" }}</summary>
            <pre>{{ diagnostics.payoutDestinationsError || pretty(diagnostics.payoutDestinationsRaw) }}</pre>
          </details>
        </div>
      </div>

      <!-- Terminal operations -->
      <div class="card">
        <h2>Terminal-operasjoner</h2>
        <p class="hint">
          Dintero har ikke et «skriv ut tekst»-API. Terminalen skriver ut kortslip ved betaling, eller
          en dagsoppgjør-rapport ved <b>Dagsoppgjør</b> — den enkleste måten å teste at printeren virker.
          Operasjonene sendes til standardterminalen (eller ID-en du overstyrer under «Ny betaling»).
        </p>
        <div class="actions wrap">
          <button class="btn btn-primary" :disabled="operationRunning" @click="sendOperation('end_of_day')">
            🖨️ Dagsoppgjør (skriver ut rapport)
          </button>
          <button class="btn btn-secondary" :disabled="operationRunning" @click="sendOperation('check_update')">
            Sjekk oppdatering
          </button>
          <button class="btn btn-secondary" :disabled="operationRunning" @click="sendOperation('open_menu')">
            Åpne meny
          </button>
          <button class="btn btn-secondary" :disabled="operationRunning" @click="sendOperation('send_logs')">
            Send logger
          </button>
        </div>
        <p v-if="operationRunning" class="hint">Sender operasjon til terminalen…</p>
        <details v-if="operationResult">
          <summary>Svar (HTTP {{ operationResult.statusCode }})</summary>
          <pre>{{ pretty(operationResult.raw) }}</pre>
        </details>
      </div>

      <!-- Charge -->
      <div class="card">
        <h2>Ny betaling</h2>
        <div class="grid">
          <label>Beløp (kr)
            <input v-model="amountKr" type="number" min="0" step="0.01" />
          </label>
          <label>Valuta
            <input v-model="currency" type="text" />
          </label>
          <label>MVA %
            <input v-model.number="vatPercent" type="number" min="0" max="100" />
          </label>
          <label>Referanse (valgfri)
            <input v-model="merchantReference" type="text" placeholder="auto" />
          </label>
          <label class="span2">Beskrivelse
            <input v-model="description" type="text" />
          </label>
        </div>
        <details class="overrides"><summary>Overstyr IDer (valgfritt — bruker testdefaults ellers)</summary>
          <div class="grid">
            <label>Store ID<input v-model="storeId" type="text" placeholder="default" /></label>
            <label>Terminal ID<input v-model="terminalId" type="text" placeholder="default" /></label>
            <label>Payout destination ID<input v-model="payoutDestinationId" type="text" placeholder="default" /></label>
            <label>Profile ID<input v-model="profileId" type="text" placeholder="default" /></label>
          </div>
        </details>
        <div class="actions">
          <button class="btn btn-primary" :disabled="initiating || polling" @click="initiate">
            {{ initiating ? "Sender…" : "Send til terminal" }}
          </button>
          <button v-if="session" class="btn btn-danger" :disabled="cancelling" @click="cancel">
            {{ cancelling ? "Avbryter…" : "Avbryt" }}
          </button>
        </div>
      </div>

      <!-- Status -->
      <div v-if="session || status" class="card">
        <h2>Status</h2>
        <ul class="kv">
          <li><span>Session ID</span><b>{{ session && session.sessionId || "—" }}</b></li>
          <li><span>Transaction ID</span><b>{{ status && status.transactionId || "—" }}</b></li>
          <li>
            <span>Status</span>
            <b :class="statusClass">{{ status ? status.status : "Waiting" }} {{ polling ? "⏳" : "" }}</b>
          </li>
          <li v-if="status && status.transactionStatus"><span>Dintero-status</span><b>{{ status.transactionStatus }}</b></li>
        </ul>
        <details><summary>Rå session JSON</summary><pre>{{ pretty(status && status.rawSession || session && session.raw) }}</pre></details>
        <details v-if="status && status.rawTransaction"><summary>Rå transaction JSON</summary><pre>{{ pretty(status.rawTransaction) }}</pre></details>
      </div>

      <!-- Refund -->
      <div class="card">
        <h2>Refusjon</h2>
        <div class="grid">
          <label class="span2">Transaction ID
            <input v-model="refundTransactionId" type="text" placeholder="fra betaling over" />
          </label>
          <label>Beløp (kr)<input v-model="refundAmountKr" type="number" min="0" step="0.01" /></label>
          <label>Årsak<input v-model="refundReason" type="text" /></label>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" :disabled="refunding || !refundTransactionId" @click="refund">
            {{ refunding ? "Refunderer…" : "Refunder (krever kort på terminal)" }}
          </button>
        </div>
        <details v-if="refundResult"><summary>Refusjon-svar (HTTP {{ refundResult.statusCode }})</summary><pre>{{ pretty(refundResult.raw) }}</pre></details>
      </div>

      <transition name="toast">
        <div v-if="toast.show" class="toast" :class="`toast--${toast.type}`">{{ toast.message }}</div>
      </transition>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";

export default {
  name: "DinteroTerminalSandbox",
  components: { AdminPage },
  data() {
    return {
      amountKr: "399",
      currency: "NOK",
      vatPercent: 0,
      merchantReference: "",
      description: "POS test",
      storeId: "",
      terminalId: "",
      payoutDestinationId: "",
      profileId: "",

      initiating: false,
      session: null,
      status: null,
      polling: false,
      pollIntervalId: null,

      cancelling: false,

      refundTransactionId: "",
      refundAmountKr: "",
      refundReason: "Sandbox refund",
      refunding: false,
      refundResult: null,

      diagnosticsLoading: false,
      diagnostics: null,

      operationRunning: false,
      operationResult: null,

      toast: { show: false, message: "", type: "success" },
    };
  },
  computed: {
    statusClass() {
      const s = this.status ? this.status.status : "Waiting";
      if (s === "Success") return "ok";
      if (s === "Fail") return "err";
      return "pending";
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) return;
    if (!this.$store.state.currentUser?.isPowerUser) {
      this.$router.push("/admin");
    }
  },
  beforeDestroy() {
    this.stopPolling();
  },
  methods: {
    handleLoginSuccess() {
      if (!this.$store.state.currentUser?.isPowerUser) {
        this.$router.push("/admin");
      }
    },
    toMinor(kr) {
      const n = parseFloat(kr);
      return isNaN(n) ? 0 : Math.round(n * 100);
    },
    pretty(raw) {
      if (!raw) return "—";
      try {
        return JSON.stringify(typeof raw === "string" ? JSON.parse(raw) : raw, null, 2);
      } catch (e) {
        return raw;
      }
    },
    async sendOperation(op) {
      this.operationRunning = true;
      this.operationResult = null;
      try {
        this.operationResult = await this._dinteroTerminalService.SendOperation({
          operation: op,
          terminalId: this.terminalId,
        });
        const ok = this.operationResult.success;
        this.showToast(
          ok
            ? `Operasjon «${op}» sendt (HTTP ${this.operationResult.statusCode}) — sjekk terminalen`
            : `Operasjon feilet (HTTP ${this.operationResult.statusCode})`,
          ok ? "success" : "error"
        );
      } catch (e) {
        this.showToast(e.message || "Operasjon feilet", "error");
      } finally {
        this.operationRunning = false;
      }
    },
    async runDiagnostics() {
      this.diagnosticsLoading = true;
      try {
        this.diagnostics = await this._dinteroTerminalService.Diagnostics();
      } catch (e) {
        this.showToast(e.message || "Diagnostikk feilet", "error");
      } finally {
        this.diagnosticsLoading = false;
      }
    },
    async initiate() {
      const amount = this.toMinor(this.amountKr);
      if (amount <= 0) {
        this.showToast("Beløp må være større enn 0", "error");
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
          profileId: this.profileId,
        });
        this.showToast("Sendt til terminal — fullfør på enheten", "success");
        if (this.session && this.session.sessionId) {
          this.startPolling(this.session.sessionId);
        }
      } catch (e) {
        this.showToast(e.message || "Kunne ikke starte betaling", "error");
      } finally {
        this.initiating = false;
      }
    },
    startPolling(sessionId) {
      this.polling = true;
      const tick = async () => {
        try {
          const result = await this._dinteroTerminalService.GetStatus(sessionId);
          this.status = result;
          if (result.transactionId && !this.refundTransactionId) {
            this.refundTransactionId = result.transactionId;
          }
          if (result.status === "Success" || result.status === "Fail") {
            this.stopPolling();
            this.showToast(
              result.status === "Success" ? "Betaling fullført" : "Betaling feilet/avbrutt",
              result.status === "Success" ? "success" : "error"
            );
          }
        } catch (e) {
          // transient errors are expected while the terminal is prompting; keep polling
        }
      };
      tick();
      this.pollIntervalId = setInterval(tick, 2000);
    },
    stopPolling() {
      this.polling = false;
      if (this.pollIntervalId) {
        clearInterval(this.pollIntervalId);
        this.pollIntervalId = null;
      }
    },
    async cancel() {
      if (!this.session || !this.session.sessionId) return;
      this.cancelling = true;
      try {
        const result = await this._dinteroTerminalService.Cancel(this.session.sessionId);
        this.showToast(`Avbrutt (HTTP ${result.statusCode})`, result.success ? "success" : "error");
      } catch (e) {
        this.showToast(e.message || "Avbryt feilet", "error");
      } finally {
        this.cancelling = false;
      }
    },
    async refund() {
      const amount = this.toMinor(this.refundAmountKr);
      if (!this.refundTransactionId || amount <= 0) {
        this.showToast("Trenger transaction ID og beløp > 0", "error");
        return;
      }
      this.refunding = true;
      this.refundResult = null;
      try {
        this.refundResult = await this._dinteroTerminalService.Refund(this.refundTransactionId, {
          amount,
          reason: this.refundReason,
          terminalId: this.terminalId,
        });
        this.showToast(`Refusjon sendt (HTTP ${this.refundResult.statusCode}) — godkjenn på terminal`, "success");
      } catch (e) {
        this.showToast(e.message || "Refusjon feilet", "error");
      } finally {
        this.refunding = false;
      }
    },
    showToast(message, type = "success") {
      this.toast = { show: true, message, type };
      setTimeout(() => {
        this.toast.show = false;
      }, 4000);
    },
  },
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
