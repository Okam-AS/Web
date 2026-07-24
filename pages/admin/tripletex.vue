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
        kontooppsett, verifiser bilag mot Tripletex og kjør dem manuelt på nytt.
      </p>

      <div
        v-if="notification.show"
        :class="['notification', `notification--${notification.type}`]"
      >
        {{ notification.message }}
      </div>

      <!-- Tabs -->
      <div class="tripletex__tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tripletex__tab', { 'tripletex__tab--active': activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Store selector (all tabs operate on one Okam store) -->
      <div class="tripletex__store-picker">
        <label>Butikk</label>
        <select v-model.number="selectedStoreId" class="form-select" @change="onStoreChange">
          <option :value="0">
            Velg butikk&hellip;
          </option>
          <option v-for="s in allStores" :key="s.id" :value="s.id">
            {{ s.name }} (#{{ s.id }})
          </option>
        </select>
      </div>

      <p v-if="selectedStoreId <= 0" class="sb-hint">
        Velg en butikk for å komme i gang.
      </p>

      <template v-if="selectedStoreId > 0">
        <!-- ============================ TILKOBLING ============================ -->
        <template v-if="activeTab === 'tokens'">
          <section class="tripletex__section">
            <div class="tripletex__section-head">
              <h3>Tilkobling</h3>
              <div class="sb-inline">
                <button class="btn btn-secondary" :disabled="busy.validate" @click="validate">
                  {{ busy.validate ? 'Validerer…' : 'Valider på nytt' }}
                </button>
                <button class="btn btn-secondary" :disabled="busy.recon" @click="loadReconciliation">
                  {{ busy.recon ? 'Henter…' : 'Avstemming' }}
                </button>
              </div>
            </div>

            <div v-if="status && status.exists" class="tripletex__status">
              <span :class="['sb-badge', status.verified ? 'sb-badge--ok' : 'sb-badge--bad']">
                {{ status.verified ? 'Verifisert' : 'Ikke verifisert' }}
              </span>
              <span :class="['sb-badge', status.isActive ? 'sb-badge--ok' : '']">
                {{ status.isActive ? 'Aktiv' : 'Inaktiv' }}
              </span>
              <span class="sb-badge">{{ tokenTypeLabel(status.tokenType) }}</span>
              <span v-if="status.tripletexCompanyId" class="tripletex__meta">Tripletex selskap: {{ status.tripletexCompanyId }}</span>
              <span v-if="status.lastVerifiedUtc" class="tripletex__meta">Sist verifisert: {{ formatDate(status.lastVerifiedUtc) }}</span>
            </div>
            <p v-else class="sb-empty" style="text-align: left; padding: 0.25rem 0">
              Ingen tilkobling lagret for denne butikken ennå.
            </p>

            <p v-if="status && status.lastError" class="tripletex__error">
              Feil: {{ status.lastError }}
            </p>
            <p v-if="status && status.missingAccounts && status.missingAccounts.length" class="tripletex__error">
              Mangler i kontoplanen: {{ status.missingAccounts.join(', ') }}
            </p>

            <div v-if="reconciliation" class="sb-result tripletex__recon">
              <span>Online: <strong>{{ oreToKr(reconciliation.onlineGrossOre) }}</strong></span>
              <span>POS: <strong>{{ oreToKr(reconciliation.posGrossOre) }}</strong></span>
              <span>Utbetalt: <strong>{{ oreToKr(reconciliation.paidOutGrossOre) }}</strong></span>
              <span>Restfordring online: <strong>{{ oreToKr(reconciliation.onlineResidualOre) }}</strong></span>
              <span :class="{ 'tripletex__error': reconciliation.failedVouchers > 0 }">
                Feilede bilag: <strong>{{ reconciliation.failedVouchers }}</strong>
              </span>
            </div>
          </section>

          <!-- Connection form -->
          <section class="tripletex__section" style="margin-top: 1.25rem">
            <div class="tripletex__section-head">
              <h3>{{ status && status.exists ? 'Rediger tilkobling' : 'Koble til Tripletex' }}</h3>
            </div>
            <p v-if="status && status.exists" class="tripletex__meta" style="margin-top:-0.4rem">
              Endre kontoene under og lagre. Tokenet trenger du bare å lime inn hvis du skal bytte det.
            </p>

            <div class="form-group">
              <label>Token-type <span class="tripletex__meta">(kan ikke utledes fra tokenet — velg riktig spor)</span></label>
              <select v-model="form.tokenType" class="form-select">
                <option value="CompanyJwt">BYOK / API-nøkkel (Selskap → API-nøkler)</option>
                <option value="EmployeeToken">Employee token (vår integrasjon)</option>
              </select>
            </div>

            <div class="form-group">
              <label>API-token <span v-if="status && status.hasToken" class="tripletex__meta">(valgfritt — token er lagret)</span></label>
              <textarea v-model="form.apiToken" class="form-control" rows="3" :placeholder="status && status.hasToken ? 'Token er lagret — la stå tomt for å beholde det, eller lim inn et nytt' : 'Lim inn kundens Tripletex-token'" />
              <p v-if="status && status.hasToken" class="tripletex__meta">Et token er allerede lagret. Du kan endre kontoene og lagre uten å lime inn tokenet på nytt.</p>
            </div>

            <h4 class="tripletex__group-title">Driftskonti (bank, kasse, gebyr)</h4>
            <div class="tripletex__accounts">
              <div class="form-group"><label>Company id</label><input v-model="form.companyId" class="form-control" placeholder="0"></div>
              <div class="form-group"><label>Bankkonto (payout)</label><input v-model="form.bankAccountNumber" class="form-control"></div>
              <div class="form-group"><label>Gebyrkonto</label><input v-model="form.feeAccountNumber" class="form-control"></div>
              <div class="form-group"><label>Kontantkasse (POS)</label><input v-model="form.cashboxAccountNumber" class="form-control"></div>
              <div class="form-group"><label>Kassedifferanse</label><input v-model="form.cashDifferenceAccountNumber" class="form-control"></div>
              <div class="form-group"><label>Bankinnskudd</label><input v-model="form.bankDepositAccountNumber" class="form-control"></div>
              <div class="form-group"><label>Øreavrunding</label><input v-model="form.roundingAccountNumber" class="form-control"></div>
              <div class="form-group"><label>Mellomkonto Dintero</label><input v-model="form.dinteroIntermediaryAccountNumber" class="form-control" placeholder="Opprett egen konto, f.eks. 1581"></div>
              <div class="form-group"><label>Mellomkonto Surfboard</label><input v-model="form.surfboardIntermediaryAccountNumber" class="form-control" placeholder="Opprett egen konto, f.eks. 1582"></div>
            </div>
            <p class="tripletex__hint">
              Balansekonti (bank/kasse/gebyr/mellomkonto) auto-opprettes hvis de mangler. Mellomkontoene bør
              være egne, dedikerte konti per leverandør (f.eks. 1581/1582).
            </p>

            <h4 class="tripletex__group-title">Salgs- og MVA-konti</h4>
            <div class="tripletex__accounts">
              <div class="form-group"><label>Salg 25% (servering)</label><input v-model="form.salesAccount25Percent" class="form-control" placeholder="3000"></div>
              <div class="form-group"><label>Salg 15% (mat/takeaway)</label><input v-model="form.salesAccount15Percent" class="form-control" placeholder="3001"></div>
              <div class="form-group"><label>Salg 12% (lav sats)</label><input v-model="form.salesAccount12Percent" class="form-control" placeholder="3002"></div>
              <div class="form-group"><label>Salg 0% (avgiftsfri)</label><input v-model="form.salesAccount0Percent" class="form-control" placeholder="3100"></div>
              <div class="form-group"><label>Tips (utenfor mva)</label><input v-model="form.tipsAccount" class="form-control" placeholder="egen konto — valgfri"></div>
              <div class="form-group"><label>Kundefordringer</label><input v-model="form.receivablesAccount" class="form-control" placeholder="1500"></div>
            </div>
            <p class="tripletex__hint">
              Standard kontoplan (NS 4102) er forhåndsutfylt. Salgs-/MVA-konti auto-opprettes <strong>ikke</strong>
              (feil mva-type = fiskal feil) — mangler vises under «Mangler i kontoplanen», og opprettes da manuelt
              i Tripletex med riktig mva-sats. Tips ligger utenfor mva; sett en egen konto ved behov.
            </p>
            <div class="sb-checks">
              <label><input v-model="form.accountingEnabled" type="checkbox"> Regnskapseksport aktiv</label>
              <span class="tripletex__meta">Styrer den delte regnskapseksporten (både Tripletex og en ev. eMonkey-webhook). Skru av for å sette alt på pause uten å miste kontooppsettet.</span>
            </div>

            <div class="sb-checks">
              <label><input v-model="form.isActive" type="checkbox"> Aktiv</label>
            </div>

            <div class="tripletex__actions">
              <button class="btn btn-primary" :disabled="busy.save || (!form.apiToken && !(status && status.hasToken))" @click="saveConnection">
                {{ busy.save ? 'Lagrer…' : 'Lagre og valider' }}
              </button>
            </div>
          </section>
        </template>

        <!-- ============================ KJØR BILAG ============================ -->
        <template v-if="activeTab === 'vouchers'">
          <section class="tripletex__section">
            <div class="tripletex__section-head">
              <h3>Kjør bilag manuelt <span class="tripletex__meta">(idempotent)</span></h3>
            </div>

            <div class="tripletex__rerun">
              <div class="tripletex__rerun-item">
                <div class="form-group"><label>Online-dagsbilag — dato</label><input v-model="rerun.onlineDate" type="date" class="form-control"></div>
                <button class="btn btn-secondary" :disabled="busy.online" @click="runOnline">Kjør online</button>
              </div>
              <div class="tripletex__rerun-item">
                <div class="form-group"><label>POS-bilag — dato</label><input v-model="rerun.posDate" type="date" class="form-control"></div>
                <button class="btn btn-secondary" :disabled="busy.pos" @click="runPos">Kjør POS</button>
              </div>
              <div class="tripletex__rerun-item">
                <div class="form-group"><label>Dintero payout — fra</label><input v-model="rerun.dinteroFrom" type="date" class="form-control"></div>
                <div class="form-group"><label>til</label><input v-model="rerun.dinteroTo" type="date" class="form-control"></div>
                <button class="btn btn-secondary" :disabled="busy.dintero" @click="runDintero">Kjør Dintero-payout</button>
              </div>
              <div class="tripletex__rerun-item tripletex__rerun-item--end">
                <button class="btn btn-secondary" :disabled="busy.surfboard" @click="runSurfboard">Kjør Surfboard-payout</button>
              </div>
            </div>

            <div v-if="results.length" class="table-wrap">
              <table class="sb-table">
                <thead><tr><th>Mål</th><th>Status</th><th>Bilag</th><th>Melding</th></tr></thead>
                <tbody>
                  <tr v-for="(r, i) in results" :key="i">
                    <td>{{ r.target }}</td>
                    <td>
                      <span :class="['sb-badge', r.success ? (r.skipped ? '' : 'sb-badge--ok') : 'sb-badge--bad']">
                        {{ r.success ? (r.skipped ? 'Hoppet over' : 'OK') : 'Feil' }}
                      </span>
                    </td>
                    <td class="sb-mono">{{ r.voucherId || '' }}</td>
                    <td>{{ r.message }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- Recent vouchers -->
          <section class="tripletex__section" style="margin-top: 1.25rem">
            <div class="tripletex__section-head">
              <h3>Siste bilag</h3>
            </div>
            <div class="table-wrap">
              <table class="sb-table">
                <thead><tr><th>Type</th><th>Dato</th><th>Status</th><th>Bilag</th><th>Nøkkel</th></tr></thead>
                <tbody>
                  <tr v-if="!status || !status.recentVouchers || !status.recentVouchers.length">
                    <td colspan="5" class="sb-empty">Ingen bilag ennå.</td>
                  </tr>
                  <tr
                    v-for="(v, i) in (status && status.recentVouchers ? status.recentVouchers : [])"
                    :key="i"
                    :class="{ 'tripletex__clickable': v.tripletexVoucherId }"
                    :title="v.tripletexVoucherId ? 'Klikk for å verifisere' : ''"
                    @click="v.tripletexVoucherId && openVerify(v.tripletexVoucherId)"
                  >
                    <td>{{ v.kind }}</td>
                    <td>{{ formatDate(v.businessDate) }}</td>
                    <td>
                      <span :class="['sb-badge', v.status === 'Posted' ? 'sb-badge--ok' : (v.status === 'Failed' ? 'sb-badge--bad' : '')]">{{ v.status }}</span>
                    </td>
                    <td class="sb-mono">{{ v.tripletexVoucherId || '' }}</td>
                    <td>{{ v.externalKey }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>

        <!-- ============================ VERIFISER & FEIL ============================ -->
        <template v-if="activeTab === 'verify'">
          <section class="tripletex__section">
            <div class="tripletex__section-head">
              <h3>Verifiser bilag</h3>
            </div>
            <p class="sb-hint">
              Hent et bokført bilag direkte fra Tripletex og se posteringslinjene, for å kontrollere at
              det Okam postet stemmer linje for linje. Tips: klikk et bilag under «Kjør bilag → Siste bilag».
            </p>
            <div class="sb-inline tripletex__verify-row">
              <div class="form-group sb-grow">
                <label>Bilagsnummer (Tripletex-id)</label>
                <input v-model.number="verify.voucherId" type="number" min="1" class="form-control">
              </div>
              <button class="btn btn-primary" :disabled="busy.verify || !verify.voucherId" @click="verifyVoucher">
                {{ busy.verify ? 'Henter…' : 'Hent fra Tripletex' }}
              </button>
            </div>

            <div v-if="verify.result">
              <div class="sb-result tripletex__voucher-head">
                <strong>Bilag {{ verify.result.number || verify.result.id }}</strong>
                <span>{{ formatDate(verify.result.date) }}</span>
                <span v-if="verify.result.description">{{ verify.result.description }}</span>
                <span v-if="verify.result.externalVoucherNumber">Ekstern ref: {{ verify.result.externalVoucherNumber }}</span>
                <span :class="['sb-badge', voucherIsBalanced ? 'sb-badge--ok' : 'sb-badge--bad']">
                  {{ voucherIsBalanced ? 'Balansert' : 'IKKE balansert' }} ({{ kr(voucherBalance) }})
                </span>
              </div>
              <div class="table-wrap">
                <table class="sb-table">
                  <thead><tr><th>#</th><th>Konto</th><th>Beskrivelse</th><th class="tripletex__num">Beløp</th><th class="tripletex__num">Brutto</th><th>MVA</th><th></th></tr></thead>
                  <tbody>
                    <tr v-for="p in verify.result.postings" :key="p.id">
                      <td>{{ p.row }}</td>
                      <td>{{ p.account ? (p.account.number + ' ' + p.account.name) : '' }}</td>
                      <td>{{ p.description }}</td>
                      <td class="tripletex__num">{{ kr(p.amount) }}</td>
                      <td class="tripletex__num">{{ kr(p.amountGross) }}</td>
                      <td>{{ p.vatType ? p.vatType.name : '' }}</td>
                      <td><span v-if="p.systemGenerated" class="sb-badge">auto</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="tripletex__actions">
                <button class="btn btn-danger" :disabled="busy.reverse" @click="reverseVoucher">
                  {{ busy.reverse ? 'Reverserer…' : 'Reverser / krediter dette bilaget' }}
                </button>
              </div>
              <p v-if="verify.reversal" class="tripletex__meta">
                Reversert med nytt bilag {{ verify.reversal.number || verify.reversal.id }} ({{ formatDate(verify.reversal.date) }}).
              </p>
            </div>
          </section>

          <!-- Failed vouchers monitor -->
          <section class="tripletex__section" style="margin-top: 1.25rem">
            <div class="tripletex__section-head">
              <h3>Feilede bilag <span v-if="failedVouchers.length" class="tripletex__meta">({{ failedVouchers.length }})</span></h3>
              <button class="btn btn-secondary" :disabled="busy.failed" @click="loadFailedVouchers">
                {{ busy.failed ? 'Laster…' : 'Oppdater' }}
              </button>
            </div>
            <div class="table-wrap">
              <table class="sb-table">
                <thead><tr><th>Type</th><th>Dato</th><th>Nøkkel</th><th>Feil</th><th></th></tr></thead>
                <tbody>
                  <tr v-if="!failedVouchers.length">
                    <td colspan="5" class="sb-empty">Ingen feilede bilag ✓</td>
                  </tr>
                  <tr v-for="(v, i) in failedVouchers" :key="i">
                    <td>{{ v.kind }}</td>
                    <td>{{ formatDate(v.businessDate) }}</td>
                    <td>{{ v.externalKey }}</td>
                    <td class="tripletex__error">{{ v.error }}</td>
                    <td><button class="btn btn-secondary" :disabled="busy.rerun" @click="rerunFailed(v)">Kjør på nytt</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </template>
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
      activeTab: 'tokens',
      tabs: [
        { key: 'tokens', label: 'Tilkobling' },
        { key: 'vouchers', label: 'Kjør bilag' },
        { key: 'verify', label: 'Verifiser & feil' }
      ],
      notification: { show: false, message: '', type: 'success' },
      allStores: [],
      selectedStoreId: 0,
      status: null,
      reconciliation: null,
      results: [],
      form: this.emptyForm(),
      rerun: { onlineDate: '', posDate: '', dinteroFrom: '', dinteroTo: '' },
      verify: { voucherId: null, result: null, reversal: null },
      failedVouchers: [],
      busy: { save: false, validate: false, recon: false, online: false, pos: false, dintero: false, surfboard: false, verify: false, reverse: false, failed: false, rerun: false }
    };
  },
  computed: {
    // A balanced voucher's postings sum to zero (debit = credit). Tolerate ore-level float noise.
    voucherBalance () {
      if (!this.verify.result || !this.verify.result.postings) { return 0; }
      return this.verify.result.postings.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    },
    voucherIsBalanced () {
      return Math.abs(this.voucherBalance) < 0.005;
    }
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
        // Norwegian standard chart of accounts (NS 4102) defaults, verified against the
        // Tripletex account plan. Admin can override per store before saving. The two
        // provider intermediary ("mellomkonto") accounts have no safe default — each store
        // must create a dedicated clearing account per provider — so they stay blank.
        bankAccountNumber: '1920',
        feeAccountNumber: '7770',
        cashboxAccountNumber: '1900',
        cashDifferenceAccountNumber: '1909',
        bankDepositAccountNumber: '1920',
        roundingAccountNumber: '7740',
        dinteroIntermediaryAccountNumber: '',
        surfboardIntermediaryAccountNumber: '',
        // Sales/VAT/tips/receivables accounts — verified NS 4102 standard accounts. These are never
        // auto-created (a wrong VAT type on a revenue account is a fiscal error); a missing one is
        // surfaced under "Mangler i kontoplanen". Tips has no standard account, so it stays blank.
        salesAccount25Percent: '3000', // Salgsinntekt, avgiftspliktig (mva 25%)
        salesAccount15Percent: '3001', // Salgsinntekt, middels sats (mva 15% — mat/takeaway)
        salesAccount12Percent: '3002', // Salgsinntekt, lav sats (mva 12%)
        salesAccount0Percent: '3100', // Salgsinntekt, avgiftsfri (mva 0%)
        tipsAccount: '', // utenfor mva — sett egen konto
        receivablesAccount: '1500', // Kundefordringer
        accountingEnabled: true // a fresh setup enables the accounting export
      };
    },
    // Load the saved connection's settings into the form so an existing connection is editable
    // (refresh no longer resets to defaults). A store that has never been connected keeps the
    // NS 4102 defaults from emptyForm(). The token is never returned, so its field stays blank —
    // the API keeps the stored token when none is sent.
    hydrateFormFromStatus (status) {
      if (!status || !status.exists) {
        this.form = this.emptyForm();
        return;
      }
      const base = this.emptyForm();
      const pick = (value, fallback) => (value === null || value === undefined || value === '' ? fallback : value);
      this.form = {
        apiToken: '',
        tokenType: pick(status.tokenType, base.tokenType),
        companyId: pick(status.companyId, base.companyId),
        isActive: status.isActive,
        bankAccountNumber: pick(status.bankAccountNumber, base.bankAccountNumber),
        feeAccountNumber: pick(status.feeAccountNumber, base.feeAccountNumber),
        cashboxAccountNumber: pick(status.cashboxAccountNumber, base.cashboxAccountNumber),
        cashDifferenceAccountNumber: pick(status.cashDifferenceAccountNumber, base.cashDifferenceAccountNumber),
        bankDepositAccountNumber: pick(status.bankDepositAccountNumber, base.bankDepositAccountNumber),
        roundingAccountNumber: pick(status.roundingAccountNumber, base.roundingAccountNumber),
        dinteroIntermediaryAccountNumber: pick(status.dinteroIntermediaryAccountNumber, ''),
        surfboardIntermediaryAccountNumber: pick(status.surfboardIntermediaryAccountNumber, ''),
        salesAccount25Percent: pick(status.salesAccount25Percent, base.salesAccount25Percent),
        salesAccount15Percent: pick(status.salesAccount15Percent, base.salesAccount15Percent),
        salesAccount12Percent: pick(status.salesAccount12Percent, base.salesAccount12Percent),
        salesAccount0Percent: pick(status.salesAccount0Percent, base.salesAccount0Percent),
        tipsAccount: pick(status.tipsAccount, ''),
        receivablesAccount: pick(status.receivablesAccount, base.receivablesAccount),
        // Hydrate the toggle from the stored value so re-saving never silently re-enables a paused export.
        accountingEnabled: status.accountingConfigEnabled === true
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
      this.form = this.emptyForm();
      this.reconciliation = null;
      this.results = [];
      this.verify = { voucherId: null, result: null, reversal: null };
      this.failedVouchers = [];
      if (this.selectedStoreId > 0) {
        this.loadStatus();
        this.loadFailedVouchers();
      }
    },
    // Jump to the verify tab and fetch the given voucher (from a "Siste bilag" row click).
    openVerify (voucherId) {
      this.activeTab = 'verify';
      this.verify.voucherId = voucherId;
      this.verifyVoucher();
    },
    verifyVoucher () {
      if (!this.selectedStoreId || !this.verify.voucherId) { return; }
      this.busy.verify = true;
      this.verify.reversal = null;
      this._tripletexService.getVoucher(this.selectedStoreId, this.verify.voucherId)
        .then((voucher) => { this.verify.result = voucher; })
        .catch((e) => { this.verify.result = null; this.apiError(e, 'Kunne ikke hente bilag'); })
        .finally(() => { this.busy.verify = false; });
    },
    reverseVoucher () {
      if (!this.verify.result) { return; }
      const id = this.verify.result.id;
      if (!window.confirm('Reversere/kreditere bilag ' + (this.verify.result.number || id) + ' i Tripletex? Dette bokfører et motbilag.')) { return; }
      this.busy.reverse = true;
      this._tripletexService.reverseVoucher(this.selectedStoreId, id)
        .then((reversal) => {
          this.verify.reversal = reversal;
          this.showNotification('Bilaget er reversert (motbilag ' + (reversal.number || reversal.id) + ').');
          this.loadStatus();
          this.loadFailedVouchers();
        })
        .catch(e => this.apiError(e, 'Kunne ikke reversere bilaget'))
        .finally(() => { this.busy.reverse = false; });
    },
    loadFailedVouchers () {
      if (!this.selectedStoreId) { return; }
      this.busy.failed = true;
      this._tripletexService.getFailedVouchers(this.selectedStoreId)
        .then((list) => { this.failedVouchers = list || []; })
        .catch(e => this.apiError(e, 'Kunne ikke hente feilede bilag'))
        .finally(() => { this.busy.failed = false; });
    },
    // Re-run a failed voucher via the existing idempotent export endpoints, chosen by its kind.
    rerunFailed (entry) {
      const date = (entry.businessDate || '').slice(0, 10) || undefined;
      let call;
      if (entry.kind === 'OnlineDaily') {
        call = this._tripletexService.exportOnline(this.selectedStoreId, date).then(r => [r]);
      } else if (entry.kind === 'Pos') {
        call = this._tripletexService.exportPos(this.selectedStoreId, date);
      } else if (entry.kind === 'Payout' && date) {
        // Payout re-run defaults to a same-day Dintero settlement export; a Surfboard payout can be
        // re-run from the "Kjør bilag" tab.
        call = this._tripletexService.exportDintero(this.selectedStoreId, date, date);
      } else {
        this.showNotification('Denne bilagstypen re-kjøres fra «Kjør bilag»-fanen.', 'error');
        return;
      }
      this.busy.rerun = true;
      call
        .then((r) => { this.results = r || []; this.showNotification('Re-kjørt — se resultater under «Kjør bilag».'); this.loadStatus(); this.loadFailedVouchers(); })
        .catch(e => this.apiError(e, 'Re-kjøring feilet'))
        .finally(() => { this.busy.rerun = false; });
    },
    loadStatus () {
      this._tripletexService.getStatus(this.selectedStoreId)
        .then((status) => { this.status = status; this.hydrateFormFromStatus(status); })
        .catch(e => this.apiError(e, 'Kunne ikke hente status'));
    },
    saveConnection () {
      this.busy.save = true;
      this._tripletexService.upsertConnection(this.selectedStoreId, this.form)
        .then((status) => {
          this.status = status;
          this.hydrateFormFromStatus(status);
          this.showNotification(status.verified ? 'Tilkobling lagret og verifisert.' : 'Lagret, men tokenet validerte ikke.', status.verified ? 'success' : 'error');
          const created = (status && status.createdAccounts) || [];
          if (created.length) {
            const list = created.map(a => `${a.number} ${a.name}`).join('\n');
            window.alert(`Nye kontoer opprettet i Tripletex:\n\n${list}`);
          }
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
    // Tripletex voucher amounts come in kroner (decimal), not ore.
    kr (value) {
      return (Number(value) || 0).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr';
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
.tripletex {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}
.tripletex__header {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.tripletex__title {
  font-size: 1.6rem;
  font-weight: 700;
}
.tripletex__intro {
  color: #6b7280;
  margin: 0.25rem 0 1.25rem;
}
.tripletex__tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.25rem;
}
.tripletex__tab {
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 2px solid transparent;
}
.tripletex__tab--active {
  color: #1bb776;
  border-bottom-color: #1bb776;
}
.tripletex__store-picker {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  max-width: 560px;
}
.tripletex__store-picker label {
  font-weight: 600;
}
.tripletex__section {
  background: #fff;
  border: 1px solid #eef0f2;
  border-radius: 12px;
  padding: 1.25rem;
}
.tripletex__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}
.tripletex__section-head h3 {
  margin: 0;
}
.tripletex__status {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  align-items: center;
}
.tripletex__meta {
  color: #6b7280;
  font-size: 0.88rem;
}
.tripletex__accounts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem 1rem;
}
.tripletex__hint {
  color: #6b7280;
  font-size: 0.85rem;
  margin: 0.6rem 0 0;
}
.tripletex__group-title {
  margin: 1.1rem 0 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
}
.tripletex__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
.tripletex__rerun {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem 1.5rem;
}
.tripletex__rerun-item {
  display: flex;
  gap: 0.6rem;
  align-items: flex-end;
  flex-wrap: wrap;
}
.tripletex__rerun-item--end {
  align-items: center;
}
.tripletex__rerun-item .form-group {
  margin-bottom: 0;
  flex: 1;
  min-width: 140px;
}
.tripletex__recon {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  align-items: center;
}
.tripletex__voucher-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: center;
}
.tripletex__verify-row {
  align-items: flex-end;
}
.tripletex__verify-row .form-group {
  margin-bottom: 0;
}
.tripletex__num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.tripletex__clickable {
  cursor: pointer;
}
.tripletex__clickable:hover {
  background: #f6fbf9;
}
.tripletex__error {
  color: #991b1b;
  margin: 0.5rem 0 0;
}

/* Shared admin form / button / table system (mirrors /admin/surfboard) */
.form-group {
  margin-bottom: 0.9rem;
}
.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.3rem;
}
.form-control,
.form-select {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
  font-family: inherit;
}
textarea.form-control {
  resize: vertical;
}
.sb-inline {
  display: flex;
  gap: 0.5rem;
}
.sb-grow {
  flex: 1;
}
.sb-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  margin-top: 0.25rem;
}
.sb-checks label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 500;
}
.btn {
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
}
.btn-primary {
  background: #1bb776;
  color: #fff;
}
.btn-secondary {
  background: #eef2f1;
  color: #1f2937;
}
.btn-danger {
  background: #fee2e2;
  color: #991b1b;
}
.btn-danger:hover:not(:disabled) {
  background: #fecaca;
}
.btn:disabled {
  opacity: 0.6;
  cursor: default;
}
.table-wrap {
  overflow-x: auto;
}
.sb-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.sb-table th,
.sb-table td {
  text-align: left;
  padding: 0.55rem 0.6rem;
  border-bottom: 1px solid #f1f3f5;
}
.sb-table th {
  color: #6b7280;
  font-weight: 600;
}
.sb-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
}
.sb-empty {
  color: #9ca3af;
  text-align: center;
  padding: 1rem;
}
.sb-hint {
  color: #6b7280;
  margin-bottom: 1rem;
}
.sb-result {
  background: #f6fbf9;
  border: 1px solid #d5efe4;
  border-radius: 10px;
  padding: 0.9rem 1rem;
  margin: 1rem 0;
}
.sb-badge {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: #eef2f1;
  color: #374151;
  font-size: 0.78rem;
  font-weight: 600;
}
.sb-badge--ok {
  background: #dcfce7;
  color: #166534;
}
.sb-badge--bad {
  background: #fee2e2;
  color: #991b1b;
}
.notification {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-weight: 600;
}
.notification--success {
  background: #dcfce7;
  color: #166534;
}
.notification--error {
  background: #fee2e2;
  color: #991b1b;
}
</style>
