<template>
  <AdminPage @login-success="handleLoginSuccess">
    <div class="tripletex">
      <div class="tripletex__header">
        <h1 class="tripletex__title">
          Tripletex-regnskap
        </h1>
        <Loading v-if="isLoading" :loading="true" />
      </div>

      <p class="tripletex__intro">
        Koble en butikks Tripletex-konto ved å lime inn butikkens API-token, se tilkoblingsstatus og
        kontooppsett, og kjør bilag manuelt på nytt. Erstatter eMonkey &mdash; kan kjøres i parallell.
      </p>

      <div
        v-if="notification.show"
        :class="['notification', `notification--${notification.type}`]"
      >
        {{ notification.message }}
      </div>

      <div class="tripletex__store-picker">
        <label>Butikk</label>
        <select v-model.number="selectedStoreId" @change="onStoreChange">
          <option :value="0">
            — velg butikk —
          </option>
          <option v-for="s in allStores" :key="s.id" :value="s.id">
            {{ s.name }} (#{{ s.id }})
          </option>
        </select>
      </div>

      <template v-if="selectedStoreId > 0">
        <!-- Status -->
        <section class="tripletex__card">
          <h2>Tilkobling</h2>
          <div v-if="status && status.exists" class="tripletex__status">
            <span :class="['badge', status.verified ? 'badge--ok' : 'badge--err']">
              {{ status.verified ? 'Verifisert' : 'Ikke verifisert' }}
            </span>
            <span :class="['badge', status.isActive ? 'badge--ok' : 'badge--muted']">
              {{ status.isActive ? 'Aktiv' : 'Inaktiv' }}
            </span>
            <span class="badge badge--muted">{{ tokenTypeLabel(status.tokenType) }}</span>
            <span v-if="status.tripletexCompanyId">Tripletex selskap: {{ status.tripletexCompanyId }}</span>
            <span v-if="status.lastVerifiedUtc">Sist verifisert: {{ formatDate(status.lastVerifiedUtc) }}</span>
          </div>
          <p v-else class="tripletex__muted">
            Ingen tilkobling lagret for denne butikken ennå.
          </p>

          <p v-if="status && status.lastError" class="tripletex__error">
            Feil: {{ status.lastError }}
          </p>
          <p v-if="status && status.missingAccounts && status.missingAccounts.length" class="tripletex__error">
            Mangler i kontoplanen: {{ status.missingAccounts.join(', ') }}
          </p>

          <div class="tripletex__actions">
            <button :disabled="busy.validate" @click="validate">
              Valider på nytt
            </button>
            <button :disabled="busy.recon" @click="loadReconciliation">
              Avstemming
            </button>
          </div>

          <div v-if="reconciliation" class="tripletex__recon">
            <span>Online: {{ oreToKr(reconciliation.onlineGrossOre) }}</span>
            <span>POS: {{ oreToKr(reconciliation.posGrossOre) }}</span>
            <span>Utbetalt: {{ oreToKr(reconciliation.paidOutGrossOre) }}</span>
            <span>Restfordring online: {{ oreToKr(reconciliation.onlineResidualOre) }}</span>
            <span :class="{ 'tripletex__error': reconciliation.failedVouchers > 0 }">
              Feilede bilag: {{ reconciliation.failedVouchers }}
            </span>
          </div>
        </section>

        <!-- Connection form -->
        <section class="tripletex__card">
          <h2>Koble til / oppdater token</h2>
          <label>Token-type (kan ikke utledes fra tokenet &mdash; velg riktig spor)</label>
          <select v-model="form.tokenType">
            <option value="CompanyJwt">
              BYOK / API-nøkkel (Selskap → API-nøkler)
            </option>
            <option value="EmployeeToken">
              Employee token (vår integrasjon)
            </option>
          </select>

          <label>API-token</label>
          <textarea v-model="form.apiToken" rows="3" placeholder="Lim inn kundens Tripletex-token" />

          <div class="tripletex__grid">
            <label>Company id<input v-model="form.companyId" placeholder="0"></label>
            <label>Bankkonto (payout)<input v-model="form.bankAccountNumber"></label>
            <label>Gebyrkonto<input v-model="form.feeAccountNumber"></label>
            <label>Kontantkasse (POS)<input v-model="form.cashboxAccountNumber"></label>
            <label>Kassedifferanse<input v-model="form.cashDifferenceAccountNumber"></label>
            <label>Bankinnskudd<input v-model="form.bankDepositAccountNumber"></label>
            <label>Øreavrunding<input v-model="form.roundingAccountNumber"></label>
            <label>Mellomkonto Dintero<input v-model="form.dinteroIntermediaryAccountNumber"></label>
            <label>Mellomkonto Surfboard<input v-model="form.surfboardIntermediaryAccountNumber"></label>
          </div>
          <label class="tripletex__checkbox"><input v-model="form.isActive" type="checkbox"> Aktiv</label>

          <div class="tripletex__actions">
            <button :disabled="busy.save || !form.apiToken" @click="saveConnection">
              Lagre og valider
            </button>
          </div>
        </section>

        <!-- Manual re-run -->
        <section class="tripletex__card">
          <h2>Kjør bilag manuelt (idempotent)</h2>
          <div class="tripletex__rerun">
            <div>
              <label>Online-dagsbilag — dato<input v-model="rerun.onlineDate" type="date"></label>
              <button :disabled="busy.online" @click="runOnline">
                Kjør online
              </button>
            </div>
            <div>
              <label>POS-bilag — dato<input v-model="rerun.posDate" type="date"></label>
              <button :disabled="busy.pos" @click="runPos">
                Kjør POS
              </button>
            </div>
            <div>
              <label>Dintero payout — fra<input v-model="rerun.dinteroFrom" type="date"></label>
              <label>til<input v-model="rerun.dinteroTo" type="date"></label>
              <button :disabled="busy.dintero" @click="runDintero">
                Kjør Dintero-payout
              </button>
            </div>
            <div>
              <button :disabled="busy.surfboard" @click="runSurfboard">
                Kjør Surfboard-payout
              </button>
            </div>
          </div>

          <table v-if="results.length" class="tripletex__results">
            <thead><tr><th>Mål</th><th>Status</th><th>Bilag</th><th>Melding</th></tr></thead>
            <tbody>
              <tr v-for="(r, i) in results" :key="i">
                <td>{{ r.target }}</td>
                <td>{{ r.success ? (r.skipped ? 'Hoppet over' : 'OK') : 'Feil' }}</td>
                <td>{{ r.voucherId || '' }}</td>
                <td>{{ r.message }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Recent vouchers -->
        <section v-if="status && status.recentVouchers && status.recentVouchers.length" class="tripletex__card">
          <h2>Siste bilag</h2>
          <table class="tripletex__results">
            <thead><tr><th>Type</th><th>Dato</th><th>Status</th><th>Bilag</th><th>Nøkkel</th></tr></thead>
            <tbody>
              <tr v-for="(v, i) in status.recentVouchers" :key="i">
                <td>{{ v.kind }}</td>
                <td>{{ formatDate(v.businessDate) }}</td>
                <td>{{ v.status }}</td>
                <td>{{ v.tripletexVoucherId || '' }}</td>
                <td>{{ v.externalKey }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import Loading from '~/components/atoms/Loading.vue';

export default {
  components: {
    AdminPage,
    Loading
  },
  data () {
    return {
      isLoading: false,
      notification: { show: false, message: '', type: 'success' },
      allStores: [],
      selectedStoreId: 0,
      status: null,
      reconciliation: null,
      results: [],
      form: this.emptyForm(),
      rerun: { onlineDate: '', posDate: '', dinteroFrom: '', dinteroTo: '' },
      busy: { save: false, validate: false, recon: false, online: false, pos: false, dintero: false, surfboard: false }
    };
  },
  mounted () {
    if (!this.$store.getters.userIsLoggedIn) {
      return;
    }
    if (!this.$store.state.currentUser?.isPowerUser) {
      this.$router.push('/admin');
      return;
    }
    this.init();
  },
  methods: {
    emptyForm () {
      return {
        apiToken: '',
        tokenType: 'CompanyJwt',
        companyId: '0',
        isActive: true,
        bankAccountNumber: '',
        feeAccountNumber: '',
        cashboxAccountNumber: '',
        cashDifferenceAccountNumber: '',
        bankDepositAccountNumber: '',
        roundingAccountNumber: '',
        dinteroIntermediaryAccountNumber: '',
        surfboardIntermediaryAccountNumber: ''
      };
    },
    handleLoginSuccess () {
      this.init();
    },
    init () {
      this.isLoading = true;
      this._storeService.GetAll()
        .then((stores) => { this.allStores = stores || []; })
        .catch(e => this.apiError(e, 'Kunne ikke hente butikker'))
        .finally(() => { this.isLoading = false; });
    },
    onStoreChange () {
      this.status = null;
      this.reconciliation = null;
      this.results = [];
      if (this.selectedStoreId > 0) {
        this.loadStatus();
      }
    },
    loadStatus () {
      this._tripletexService.getStatus(this.selectedStoreId)
        .then((status) => { this.status = status; })
        .catch(e => this.apiError(e, 'Kunne ikke hente status'));
    },
    saveConnection () {
      this.busy.save = true;
      this._tripletexService.upsertConnection(this.selectedStoreId, this.form)
        .then((status) => {
          this.status = status;
          this.showNotification(status.verified ? 'Tilkobling lagret og verifisert.' : 'Lagret, men tokenet validerte ikke.', status.verified ? 'success' : 'error');
        })
        .catch(e => this.apiError(e, 'Kunne ikke lagre tilkobling'))
        .finally(() => { this.busy.save = false; });
    },
    validate () {
      this.busy.validate = true;
      this._tripletexService.validate(this.selectedStoreId)
        .then((status) => {
          this.status = status;
          this.showNotification(status.verified ? 'Tilkobling verifisert.' : 'Validering feilet.', status.verified ? 'success' : 'error');
        })
        .catch(e => this.apiError(e, 'Validering feilet'))
        .finally(() => { this.busy.validate = false; });
    },
    loadReconciliation () {
      this.busy.recon = true;
      this._tripletexService.getReconciliation(this.selectedStoreId)
        .then((recon) => { this.reconciliation = recon; })
        .catch(e => this.apiError(e, 'Kunne ikke hente avstemming'))
        .finally(() => { this.busy.recon = false; });
    },
    runOnline () {
      this.busy.online = true;
      this._tripletexService.exportOnline(this.selectedStoreId, this.rerun.onlineDate || undefined)
        .then((r) => { this.results = [r]; this.afterRun(); })
        .catch(e => this.apiError(e, 'Online-eksport feilet'))
        .finally(() => { this.busy.online = false; });
    },
    runPos () {
      this.busy.pos = true;
      this._tripletexService.exportPos(this.selectedStoreId, this.rerun.posDate || undefined)
        .then((r) => { this.results = r || []; this.afterRun(); })
        .catch(e => this.apiError(e, 'POS-eksport feilet'))
        .finally(() => { this.busy.pos = false; });
    },
    runDintero () {
      if (!this.rerun.dinteroFrom || !this.rerun.dinteroTo) {
        this.showNotification('Velg fra- og til-dato for Dintero-payout.', 'error');
        return;
      }
      this.busy.dintero = true;
      this._tripletexService.exportDintero(this.selectedStoreId, this.rerun.dinteroFrom, this.rerun.dinteroTo)
        .then((r) => { this.results = r || []; this.afterRun(); })
        .catch(e => this.apiError(e, 'Dintero-payout feilet'))
        .finally(() => { this.busy.dintero = false; });
    },
    runSurfboard () {
      this.busy.surfboard = true;
      this._tripletexService.exportSurfboard(this.selectedStoreId)
        .then((r) => { this.results = r || []; this.afterRun(); })
        .catch(e => this.apiError(e, 'Surfboard-payout feilet'))
        .finally(() => { this.busy.surfboard = false; });
    },
    afterRun () {
      this.showNotification('Ferdig — se resultater under.');
      this.loadStatus();
    },
    showNotification (message, type = 'success') {
      this.notification = { show: true, message, type };
      setTimeout(() => { this.notification.show = false; }, 5000);
    },
    apiError (error, fallback) {
      const message = error?.response?.data?.message || error?.message || fallback;
      this.showNotification(message, 'error');
    },
    tokenTypeLabel (type) {
      return type === 'CompanyJwt' ? 'BYOK / JWT' : 'Employee token';
    },
    oreToKr (ore) {
      return ((ore || 0) / 100).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr';
    },
    formatDate (value) {
      if (!value) { return ''; }
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : d.toLocaleString('nb-NO');
    }
  }
};
</script>

<style scoped>
.tripletex { max-width: 960px; margin: 0 auto; padding: 16px; }
.tripletex__header { display: flex; align-items: center; gap: 12px; }
.tripletex__intro { color: #555; margin: 8px 0 16px; }
.tripletex__store-picker { margin-bottom: 16px; display: flex; gap: 8px; align-items: center; }
.tripletex__store-picker select { padding: 6px; min-width: 320px; }
.tripletex__card { border: 1px solid #e2e2e2; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #fff; }
.tripletex__card h2 { margin: 0 0 12px; font-size: 16px; }
.tripletex__status { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.tripletex__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0; }
.tripletex__grid label, .tripletex__rerun label { display: flex; flex-direction: column; font-size: 12px; color: #555; gap: 4px; }
.tripletex textarea, .tripletex input[type="text"], .tripletex input, .tripletex select { width: 100%; padding: 6px; box-sizing: border-box; }
.tripletex__checkbox { display: inline-flex; flex-direction: row !important; align-items: center; gap: 6px; }
.tripletex__actions { display: flex; gap: 8px; margin-top: 12px; }
.tripletex__actions button, .tripletex__rerun button { padding: 8px 14px; cursor: pointer; }
.tripletex__rerun { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.tripletex__rerun > div { display: flex; gap: 8px; align-items: flex-end; flex-wrap: wrap; }
.tripletex__recon { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; font-size: 14px; }
.tripletex__results { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
.tripletex__results th, .tripletex__results td { border: 1px solid #eee; padding: 6px 8px; text-align: left; }
.tripletex__muted { color: #888; }
.tripletex__error { color: #c0392b; }
.badge { padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.badge--ok { background: #e6f4ea; color: #1e7e34; }
.badge--err { background: #fdecea; color: #c0392b; }
.badge--muted { background: #eee; color: #555; }
.notification { padding: 10px 14px; border-radius: 6px; margin-bottom: 12px; }
.notification--success { background: #e6f4ea; color: #1e7e34; }
.notification--error { background: #fdecea; color: #c0392b; }
</style>
