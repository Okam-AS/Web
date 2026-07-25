<template>
  <AdminPage>
    <div class="terminals">
      <header class="terminals__head">
        <div>
          <h1 class="terminals__title">
            {{ $i('nav_terminals') }}
          </h1>
          <p class="terminals__intro">
            Kortterminalene i butikken din.
          </p>
        </div>
        <button v-if="selectedStore" class="tbtn tbtn--primary" @click="openWizard">
          + Legg til terminal
        </button>
      </header>

      <transition name="terminals-toast">
        <div
          v-if="toast.show"
          class="terminals__toast"
          :class="'terminals__toast--' + toast.type"
        >
          {{ toast.message }}
        </div>
      </transition>

      <div v-if="!selectedStore" class="terminals__empty">
        Velg en butikk øverst for å administrere terminaler.
      </div>

      <template v-else>
        <div v-if="!terminals.length && !loading" class="terminals__empty">
          <p class="terminals__empty-title">
            Ingen terminaler ennå
          </p>
          <p>Legg til den første terminalen din &mdash; det tar under ett minutt.</p>
          <button class="tbtn tbtn--primary" @click="openWizard">
            + Legg til terminal
          </button>
        </div>

        <div v-else class="tcard">
          <div class="tcard__head">
            <div>
              <h2 class="tcard__title">
                Dine terminaler
              </h2>
              <p class="tcard__sub">
                En terminal kan ikke ta betalt før den er koblet til en kasse.
              </p>
            </div>
            <button class="tbtn tbtn--ghost" :disabled="loading" @click="loadTerminals()">
              {{ loading ? 'Oppdaterer…' : 'Oppdater' }}
            </button>
          </div>

          <div class="table-wrap">
            <table class="ttable">
              <thead>
                <tr>
                  <th>Navn</th>
                  <th>Status</th>
                  <th>Serienr</th>
                  <th>Kasse</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in terminals" :key="t.terminalId">
                  <td>
                    <span class="ttable__strong">{{ terminalLabel(t) }}</span>
                    <span v-if="t.terminalType" class="ttable__type">{{ t.terminalType }}</span>
                  </td>
                  <td><span :class="statusClass(t.terminalStatus)">{{ statusText(t.terminalStatus) }}</span></td>
                  <td>{{ t.serialNo || '—' }}</td>
                  <td>
                    <select
                      v-if="isPaymentTerminal(t)"
                      class="tselect tselect--row"
                      :value="boundCashPointId(t)"
                      :disabled="binding"
                      @change="bindToCashPoint(t, $event)"
                    >
                      <option :value="0">
                        Ikke koblet
                      </option>
                      <option v-for="cp in cashPoints" :key="cp.cashPointId" :value="cp.cashPointId">
                        {{ cp.name || cp.registerId }}
                      </option>
                    </select>
                    <span v-else class="ttable__muted">&mdash;</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- Add-terminal wizard: one linear path. The operator never picks a registration method — the
           serial attempt handles the terminals that accept it and hands the rest to the code step. -->
      <div v-if="wizardOpen" class="twiz-backdrop" @click.self="closeWizard">
        <div class="twiz">
          <button class="twiz__close" title="Lukk" @click="closeWizard">
            &times;
          </button>

          <!-- Step 1: serial -->
          <template v-if="step === 'serial'">
            <p class="twiz__step">
              Steg 1 av 2
            </p>
            <h2 class="twiz__title">
              Skriv inn serienummeret
            </h2>
            <p class="twiz__lead">
              Serienummeret står på et klistremerke på <strong>baksiden av terminalen</strong>, og på esken
              den kom i.
            </p>

            <div class="tfield">
              <label>Serienummer</label>
              <input
                ref="serialInput"
                v-model="form.serialNo"
                class="tinput"
                type="text"
                placeholder="f.eks. NDD500101170"
                @keyup.enter="submitSerial"
              >
            </div>
            <div class="tfield">
              <label>Gi terminalen et navn (valgfritt)</label>
              <input v-model="form.terminalName" class="tinput" type="text" placeholder="f.eks. Kasse 1">
            </div>

            <p class="twiz__hint">
              Husk å koble terminalen til Wi-Fi &mdash; den må være på nett for å ta betalt. Det kan du gjøre
              før eller etter dette.
            </p>

            <div class="twiz__foot">
              <button class="tbtn tbtn--primary tbtn--wide" :disabled="saving || !form.serialNo" @click="submitSerial">
                {{ saving ? 'Kobler til…' : 'Koble til butikken' }}
              </button>
            </div>
          </template>

          <!-- Step 2 (only for terminals that require it): pairing code + QR -->
          <template v-else-if="step === 'code'">
            <p class="twiz__step">
              Steg 2 av 2
            </p>
            <h2 class="twiz__title">
              Tast denne koden på terminalen
            </h2>
            <p class="twiz__lead">
              Terminalen må stå på skjermen <strong>&laquo;Register terminal&raquo;</strong>. Skriv koden i de
              tomme feltene øverst.
            </p>

            <div v-if="!regCode" class="tcode-card tcode-card--pending">
              <p v-if="regCodeLoading">
                Henter kode&hellip;
              </p>
              <template v-else>
                <p>Fant ingen kode.</p>
                <button class="tbtn tbtn--primary" @click="generateRegCode()">
                  Prøv igjen
                </button>
              </template>
            </div>

            <div v-else class="tcode-card">
              <button
                class="tcode-refresh"
                :disabled="regCodeLoading"
                title="Hent ny kode"
                @click="generateRegCode()"
              >
                <span :class="{ 'tcode-refresh--spin': regCodeLoading }">↻</span>
              </button>
              <p class="tcode">
                {{ regCode.registrationCode }}
              </p>
              <div v-if="regCode.registrationLink" class="tcode-qr">
                <vue-qrcode
                  :value="regCode.registrationLink"
                  :options="{ width: 150, margin: 1 }"
                />
                <p class="tcode-label">
                  …eller skann denne med terminalens kamera
                </p>
              </div>
              <p class="tcode-watch">
                <span class="tcode-watch__dot" />
                Venter på terminalen&hellip;
              </p>
            </div>
          </template>

          <!-- Step 3: done -->
          <template v-else>
            <div class="twiz__done-mark">
              ✓
            </div>
            <h2 class="twiz__title twiz__title--center">
              Terminalen er klar
            </h2>

            <p v-if="doneBound" class="twiz__lead twiz__lead--center">
              Den er koblet til kassen <strong>{{ doneCashPointName }}</strong> og kan ta betalt med én gang.
            </p>
            <template v-else>
              <p class="twiz__lead twiz__lead--center">
                Velg hvilken kasse den skal brukes på.
              </p>
              <div class="tfield">
                <label>Kasse</label>
                <div class="tselect-wrap">
                  <select v-model.number="doneCashPointId" class="tselect">
                    <option :value="0">
                      Velg kasse&hellip;
                    </option>
                    <option v-for="cp in cashPoints" :key="cp.cashPointId" :value="cp.cashPointId">
                      {{ cp.name || cp.registerId }}{{ cp.surfboardTerminalId ? ' (har alt en terminal)' : '' }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="twiz__foot">
                <button
                  class="tbtn tbtn--primary tbtn--wide"
                  :disabled="binding || !doneCashPointId"
                  @click="bindFromWizard"
                >
                  {{ binding ? 'Kobler til…' : 'Koble til kassen' }}
                </button>
              </div>
            </template>

            <div class="twiz__foot">
              <button class="tbtn tbtn--ghost tbtn--wide" @click="closeWizard">
                Ferdig
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import VueQrcode from '@chenfengyuan/vue-qrcode';
import AdminPage from '~/components/organisms/AdminPage.vue';

// Store-admin self-serve terminal management. Unlike /admin/surfboard (PowerUser partner
// provisioning), this page is reachable by any store admin and operates on the store selected in the
// nav. It calls the StoreAdmin-scoped endpoints (stores/{id}/surfboard/terminals[/onboard|
// /registration-code]) that resolve the Surfboard merchant/store ids server-side, so staff never
// handle raw provider ids.
//
// The page is a list plus one linear wizard on purpose: the operator is never asked to choose a
// registration method. Serial onboarding covers terminals that accept it (and, as a side effect,
// assigns the hardware to the store's merchant — without that, pairing fails with "Terminal Hardware
// not shipped yet"); the terminals that reject it answer TM_0011 and are handed to the code step
// automatically.
export default {
  name: 'AdminTerminals',
  components: { AdminPage, VueQrcode },
  data () {
    return {
      terminals: [],
      cashPoints: [],
      wizardOpen: false,
      step: 'serial',
      form: { serialNo: '', terminalName: '' },
      regCode: null,
      regCodeLoading: false,
      regCodeTimer: null,
      regCodeAutoRenews: 0,
      pairingPollTimer: null,
      doneTerminalId: '',
      doneBound: false,
      doneCashPointName: '',
      doneCashPointId: 0,
      loading: false,
      saving: false,
      binding: false,
      toast: { show: false, message: '', type: 'success' },
      toastTimer: null
    };
  },
  computed: {
    selectedStore () {
      return this.$store.state.selectedAdminStore;
    },
    userIsLoggedIn () {
      return this.$store.getters.userIsLoggedIn;
    }
  },
  watch: {
    selectedStore: {
      immediate: true,
      handler (storeId) {
        if (this.userIsLoggedIn && storeId) { this.loadStore(storeId); }
      }
    },
    userIsLoggedIn: {
      immediate: true,
      handler (isLoggedIn) {
        if (isLoggedIn && this.selectedStore) { this.loadStore(this.selectedStore); }
      }
    }
  },
  beforeDestroy () {
    if (this.toastTimer) { clearTimeout(this.toastTimer); }
    this.stopWizardTimers();
  },
  methods: {
    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 4500);
    },
    apiError (error, fallback) {
      // A 404 means the API being served does not have the endpoint yet (an older deploy), which
      // otherwise surfaces as the caller's generic fallback and looks like a terminal problem.
      if (error && error.statusCode === 404) {
        this.notify('API-et du er koblet mot støtter ikke dette ennå — det må oppdateres først.', 'error');
        return;
      }
      this.notify((error && error.message) || fallback, 'error');
    },
    statusClass (status) {
      const s = (status || '').toUpperCase();
      if (s === 'ACTIVE' || s === 'REGISTERED') { return 'tbadge tbadge--ok'; }
      if (s === 'DE_REGISTERED' || s === 'IN_ACTIVE') { return 'tbadge tbadge--bad'; }
      return 'tbadge';
    },
    // Provider status codes mean nothing to a store; say what they mean for using the terminal.
    statusText (status) {
      const s = (status || '').toUpperCase();
      if (s === 'ACTIVE' || s === 'REGISTERED') { return 'Klar'; }
      if (s === 'DE_REGISTERED' || s === 'IN_ACTIVE') { return 'Deaktivert'; }
      return status || 'Ukjent';
    },
    // Surfboard's store terminal list leaves terminalName (and sometimes serialNo) empty for most
    // units — only devices that carry their own name, like a soft-POS phone, come back named. A blank
    // first column makes the rows indistinguishable, so fall back through what the list does carry.
    terminalLabel (t) {
      if (t.terminalName) { return t.terminalName; }
      if (t.serialNo) { return 'Terminal ' + t.serialNo; }
      if (t.terminalId) { return 'Terminal ' + String(t.terminalId).slice(-6); }
      return 'Terminal';
    },
    isPaymentTerminal (t) {
      return !['PaymentPage', 'SelfHostedPage', 'MerchantInitiated', 'printer', 'surfprint'].includes(t.terminalType);
    },
    boundCashPointId (t) {
      const cp = this.cashPoints.find(c => c.surfboardTerminalId === t.terminalId);
      return cp ? cp.cashPointId : 0;
    },
    cashPointName (cashPointId) {
      const cp = this.cashPoints.find(c => c.cashPointId === cashPointId);
      return cp ? (cp.name || cp.registerId) : '';
    },
    // A store with a single unused cash point has no decision to make, so the binding is done for it.
    soleFreeCashPoint () {
      if (this.cashPoints.length !== 1) { return null; }
      const cp = this.cashPoints[0];
      return cp && !cp.surfboardTerminalId ? cp : null;
    },

    // --- Wizard ---

    openWizard () {
      this.form = { serialNo: '', terminalName: '' };
      this.regCode = null;
      this.regCodeAutoRenews = 0;
      this.doneTerminalId = '';
      this.doneBound = false;
      this.doneCashPointName = '';
      this.doneCashPointId = 0;
      this.step = 'serial';
      this.wizardOpen = true;
      this.$nextTick(() => { if (this.$refs.serialInput) { this.$refs.serialInput.focus(); } });
    },
    closeWizard () {
      this.wizardOpen = false;
      this.stopWizardTimers();
      this.regCode = null;
      this.loadStore(this.selectedStore);
    },
    stopWizardTimers () {
      if (this.regCodeTimer) { clearInterval(this.regCodeTimer); this.regCodeTimer = null; }
      if (this.pairingPollTimer) { clearInterval(this.pairingPollTimer); this.pairingPollTimer = null; }
    },
    submitSerial () {
      const serialNo = (this.form.serialNo || '').trim();
      if (!serialNo) {
        this.notify('Skriv inn serienummeret.', 'error');
        return;
      }
      const sole = this.soleFreeCashPoint();
      this.saving = true;
      this._surfboardService
        .onboardTerminalBySerial(this.selectedStore, {
          serialNo,
          terminalName: this.form.terminalName || '',
          cashPointId: sole ? sole.cashPointId : undefined
        })
        .then((res) => {
          this.goDone(res && res.terminalId, !!(res && res.cashPointBound), sole ? sole.cashPointId : 0);
        })
        .catch((e) => {
          // TM_0011: this terminal only accepts the pairing-code direction. The attempt already
          // assigned the hardware to the store's merchant, so the code step will work.
          const message = (e && e.message) || '';
          if (message.includes('TM_0011') || message.toLowerCase().includes('not allowed')) {
            this.goCode();
            return;
          }
          this.apiError(e, 'Kunne ikke koble til terminalen.');
        })
        .finally(() => { this.saving = false; });
    },
    goCode () {
      this.step = 'code';
      this.regCodeAutoRenews = 0;
      this.generateRegCode(true);
      this.startPairingPoll();
    },
    goDone (terminalId, bound, cashPointId) {
      this.stopWizardTimers();
      this.regCode = null;
      this.doneTerminalId = terminalId || '';
      this.doneBound = bound;
      this.doneCashPointName = bound ? this.cashPointName(cashPointId) : '';
      this.doneCashPointId = 0;
      this.step = 'done';
      this.loadStore(this.selectedStore);
    },
    bindFromWizard () {
      if (!this.doneCashPointId || !this.doneTerminalId) { return; }
      const cashPointId = this.doneCashPointId;
      this.binding = true;
      this._surfboardService
        .bindTerminal(this.selectedStore, { terminalId: this.doneTerminalId, cashPointId })
        .then(() => {
          this.doneBound = true;
          this.doneCashPointName = this.cashPointName(cashPointId);
          this.loadStore(this.selectedStore);
        })
        .catch(e => this.apiError(e, 'Kunne ikke koble terminalen til kassen.'))
        .finally(() => { this.binding = false; });
    },

    // --- Pairing code ---

    // Surfboard's pairing code is short-lived; it renews itself as the window runs out so the operator
    // never faces an expired code. `auto` marks renewals, which must not toast.
    generateRegCode (auto = false) {
      if (!this.selectedStore || this.regCodeLoading) { return; }
      this.regCodeLoading = true;
      this._surfboardService
        .getStoreRegistrationCode(this.selectedStore)
        .then((code) => {
          this.regCode = code;
          this.startRegCodeRenewal();
        })
        .catch((e) => {
          if (!auto) { this.apiError(e, 'Kunne ikke hente kode.'); }
        })
        .finally(() => { this.regCodeLoading = false; });
    },
    startRegCodeRenewal () {
      if (this.regCodeTimer) { clearInterval(this.regCodeTimer); }
      // Matches the terminal's own 90-second window. Capped so a wizard left open stops asking for
      // codes nobody is using; the ↻ button takes over from there.
      this.regCodeTimer = setInterval(() => {
        if (!this.wizardOpen || this.step !== 'code' || this.regCodeAutoRenews >= 20) { return; }
        if (typeof document !== 'undefined' && document.hidden) { return; }
        this.regCodeAutoRenews += 1;
        this.generateRegCode(true);
      }, 85000);
    },
    // While a code is on screen, watch for the terminal turning up in the store's list so the wizard
    // advances by itself instead of asking the operator to check.
    startPairingPoll () {
      if (this.pairingPollTimer) { return; }
      this.pairingPollTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) { return; }
        this.loadTerminals(true);
      }, 8000);
    },
    onTerminalPaired () {
      const paired = this.terminals.find(t => this.isPaymentTerminal(t) && !this.boundCashPointId(t));
      const sole = this.soleFreeCashPoint();
      if (paired && sole) {
        this.stopWizardTimers();
        this._surfboardService
          .bindTerminal(this.selectedStore, { terminalId: paired.terminalId, cashPointId: sole.cashPointId })
          .then(() => this.goDone(paired.terminalId, true, sole.cashPointId))
          // The terminal is registered either way; let the operator pick the cash point on the last step.
          .catch(() => this.goDone(paired.terminalId, false, 0));
        return;
      }
      this.goDone(paired ? paired.terminalId : '', false, 0);
    },

    // --- Data ---

    bindToCashPoint (t, event) {
      const cashPointId = Number(event.target.value);
      if (!cashPointId) {
        // There is no unbind endpoint (remove the id on the cash point instead); snap the select back.
        this.loadStore(this.selectedStore);
        return;
      }
      if (cashPointId === this.boundCashPointId(t)) { return; }
      this.binding = true;
      this._surfboardService
        .bindTerminal(this.selectedStore, { terminalId: t.terminalId, cashPointId })
        .then(() => {
          this.notify('Terminalen er koblet til kassen.');
          this.loadStore(this.selectedStore);
        })
        .catch((e) => {
          this.apiError(e, 'Kunne ikke koble terminalen til kassen.');
          this.loadStore(this.selectedStore);
        })
        .finally(() => { this.binding = false; });
    },
    loadStore (storeId) {
      if (!storeId) { return; }
      this.loadTerminals();
      this._cashPointService.GetForStore(storeId)
        .then((list) => { this.cashPoints = list || []; })
        .catch(() => { this.cashPoints = []; });
    },
    // `silent` is the background pairing poll: it must not flip the loading state (which would blink
    // the refresh button every 8 seconds) nor toast a transient failure.
    loadTerminals (silent = false) {
      if (!this.selectedStore) { return; }
      if (!silent) { this.loading = true; }
      const before = this.terminals.length;
      this._surfboardService
        .getStoreTerminalsForStore(this.selectedStore)
        .then((list) => {
          this.terminals = list || [];
          if (silent && this.step === 'code' && this.terminals.length > before) { this.onTerminalPaired(); }
        })
        .catch((e) => {
          if (!silent) { this.apiError(e, 'Kunne ikke hente terminaler.'); }
        })
        .finally(() => { if (!silent) { this.loading = false; } });
    }
  }
};
</script>

<style scoped>
.terminals { max-width: 900px; margin: 0 auto; padding: 24px; }
.terminals__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}
.terminals__title { font-size: 1.9rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.terminals__intro { color: #64748b; margin: 0; }

.terminals__toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  z-index: 1200;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.terminals__toast--success { background: #159f63; }
.terminals__toast--error { background: #ef4444; }
.terminals-toast-enter-active, .terminals-toast-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.terminals-toast-enter, .terminals-toast-leave-to { opacity: 0; transform: translateY(-8px); }

.terminals__empty {
  background: #fff;
  border: 1px dashed #d7dce3;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  color: #64748b;
}
.terminals__empty-title { font-size: 1.15rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.terminals__empty .tbtn { margin-top: 18px; }

.tcard {
  background: #fff;
  border: 1px solid #eef0f2;
  border-radius: 12px;
  padding: 20px 22px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06);
}
.tcard__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.tcard__title { font-size: 1.1rem; font-weight: 600; color: #292c34; margin: 0; }
.tcard__sub { margin: 3px 0 0; color: #64748b; font-size: 0.88rem; line-height: 1.45; }

.tfield { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
.tfield label { font-weight: 600; font-size: 0.85rem; color: #475569; }
.tinput, .tselect {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #fff;
}
.tinput:focus, .tselect:focus {
  outline: none;
  border-color: #1bb776;
  box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.12);
}

.tbtn {
  padding: 0.6rem 1.15rem;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
}
.tbtn--primary { background: #1bb776; color: #fff; }
.tbtn--primary:hover:not(:disabled) { background: #159f63; }
.tbtn--ghost { background: #fff; color: #475569; border-color: #d1d5db; }
.tbtn--ghost:hover:not(:disabled) { background: #f8fafc; }
.tbtn--wide { width: 100%; padding: 0.75rem 1.15rem; }
.tbtn:disabled { opacity: 0.55; cursor: default; }

.table-wrap { overflow-x: auto; margin-top: 16px; }
.ttable { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.ttable th, .ttable td { text-align: left; padding: 0.65rem 0.7rem; border-bottom: 1px solid #f1f3f5; }
.ttable th {
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.ttable tbody tr:hover { background: #fafbfc; }
.ttable__strong { font-weight: 600; color: #292c34; display: block; }
.ttable__type { display: block; margin-top: 2px; color: #94a3b8; font-size: 0.78rem; }
.ttable__muted { color: #cbd5e0; }
.tselect--row { width: auto; min-width: 150px; padding: 0.35rem 0.5rem; font-size: 0.85rem; }

.tbadge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.76rem;
  font-weight: 600;
}
.tbadge--ok { background: #dcfce7; color: #166534; }
.tbadge--bad { background: #fee2e2; color: #991b1b; }

/* ---------- Wizard ---------- */
.twiz-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1100;
}
.twiz {
  position: relative;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
}
.twiz__close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 8px;
}
.twiz__close:hover { background: #f1f5f9; color: #475569; }
.twiz__step {
  margin: 0 0 6px;
  color: #1bb776;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.twiz__title { font-size: 1.3rem; font-weight: 600; color: #292c34; margin: 0 0 8px; }
.twiz__title--center { text-align: center; }
.twiz__lead { margin: 0; color: #64748b; font-size: 0.92rem; line-height: 1.55; }
.twiz__lead--center { text-align: center; }
.twiz__hint {
  margin: 16px 0 0;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 8px;
  color: #64748b;
  font-size: 0.83rem;
  line-height: 1.5;
}
.twiz__foot { margin-top: 18px; }
.twiz__done-mark {
  width: 52px;
  height: 52px;
  margin: 4px auto 14px;
  border-radius: 50%;
  background: #dcfce7;
  color: #159f63;
  font-size: 1.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tcode-card {
  position: relative;
  margin-top: 18px;
  text-align: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  color: #64748b;
  font-size: 0.88rem;
}
.tcode-card--pending .tbtn { margin-top: 10px; }
.tcode {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: #292c34;
}
.tcode-label { margin: 6px 0 0; font-size: 0.82rem; color: #94a3b8; }
.tcode-qr { margin: 14px 0 4px; }
.tcode-refresh {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}
.tcode-refresh:hover:not(:disabled) { border-color: #1bb776; color: #1bb776; }
.tcode-refresh:disabled { opacity: 0.5; cursor: default; }
.tcode-refresh--spin { display: inline-block; animation: tcode-spin 0.9s linear infinite; }
@keyframes tcode-spin { to { transform: rotate(360deg); } }

.tcode-watch {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 14px 0 0;
  font-size: 0.83rem;
}
.tcode-watch__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1bb776;
  animation: tcode-pulse 1.4s ease-in-out infinite;
}
@keyframes tcode-pulse {
  0%, 100% { opacity: 0.25; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1); }
}

@media (max-width: 640px) {
  .terminals__head { flex-direction: column; }
  .twiz { padding: 22px 18px; }
  .tcode { font-size: 1.8rem; }
}
</style>
