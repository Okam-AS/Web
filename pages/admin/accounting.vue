<template>
  <AdminPage @login-success="init">
    <div class="acct">
      <div class="acct__header">
        <h1 class="acct__title">
          Regnskap
        </h1>
        <Loading v-if="isLoading" :loading="true" />
      </div>

      <p class="acct__intro">
        Én side for alle regnskapssystemer: velg system og fakturakanal, koble til, sett kontoene
        systemet trenger, og se hva som er bokført. Siden er styrt av hva systemet faktisk kan — ikke
        av hvilket system det er.
      </p>

      <div v-if="notification.show" :class="['notification', 'notification--' + notification.type]">
        {{ notification.message }}
      </div>

      <div class="acct__store-picker">
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
        <!-- ============================ SYSTEM ============================ -->
        <section class="acct__section">
          <div class="acct__section-head">
            <h3>System</h3>
          </div>
          <p class="sb-hint">
            Butikken bokfører i ett regnskapssystem, og fakturaer utstedes gjennom én kanal. Kanalen
            avgjør også om privatpersoner kan faktureres og om Okams fakturagebyr belastes.
          </p>
          <div class="acct__grid3">
            <div class="form-group">
              <label>Regnskapssystem</label>
              <select v-model="settings.form.accountingSystem" class="form-select">
                <option v-for="o in accountingSystemOptions" :key="o.value" :value="o.value">
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Fakturakanal</label>
              <select v-model="settings.form.invoiceChannel" class="form-select">
                <option
                  v-for="o in invoiceChannelOptions"
                  :key="o.value"
                  :value="o.value"
                  :disabled="o.disabled"
                >
                  {{ o.label }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Betalingsfrist (dager)</label>
              <input v-model.number="settings.form.invoiceDueDays" type="number" min="0" max="365" class="form-control">
            </div>
          </div>
          <p v-if="channelBlockedReason" class="acct__meta">
            «Via regnskapssystem» er utilgjengelig: {{ channelBlockedReason }}
          </p>
          <div class="acct__actions">
            <button class="btn btn-primary" :disabled="settings.busy" @click="saveSettings">
              {{ settings.busy ? 'Lagrer…' : 'Lagre' }}
            </button>
          </div>
        </section>

        <!-- ============================ TILKOBLING ============================ -->
        <section class="acct__section">
          <div class="acct__section-head">
            <h3>Tilkobling</h3>
            <button class="btn btn-secondary" :disabled="busy.verify || !hasSystem" @click="verify">
              {{ busy.verify ? 'Verifiserer…' : 'Verifiser' }}
            </button>
          </div>

          <p v-if="!hasSystem" class="sb-hint">
            Velg et regnskapssystem over først.
          </p>

          <template v-else>
            <div v-if="status && status.exists" class="acct__status">
              <span :class="['sb-badge', status.verified ? 'sb-badge--ok' : 'sb-badge--bad']">
                {{ status.verified ? 'Verifisert' : 'Ikke verifisert' }}
              </span>
              <span :class="['sb-badge', status.isActive ? 'sb-badge--ok' : '']">
                {{ status.isActive ? 'Aktiv' : 'Inaktiv' }}
              </span>
              <span class="sb-badge">{{ systemLabel(status.system) }}</span>
              <span v-if="status.externalCompanyName || status.externalCompanyRef" class="acct__meta">
                Selskap: {{ status.externalCompanyName || status.externalCompanyRef }}
              </span>
              <span v-if="status.lastVerifiedUtc" class="acct__meta">
                Sist verifisert: {{ formatDate(status.lastVerifiedUtc) }}
              </span>
            </div>
            <p v-else class="sb-empty" style="text-align: left; padding: 0.25rem 0">
              Ingen tilkobling lagret for denne butikken ennå.
            </p>

            <p v-if="status && status.lastError" class="acct__error">
              Siste feil: {{ status.lastError }}
            </p>

            <!-- OAuth-provider (Fiken) -->
            <div v-if="capabilities.requiresOAuthConsent" class="acct__connect">
              <p class="sb-hint">
                {{ systemLabel(settings.form.accountingSystem) }} kobles ved at butikken godkjenner Okam
                i sitt eget regnskapssystem. Du sendes dit og tilbake hit igjen.
              </p>
              <div class="acct__actions">
                <button class="btn btn-primary" :disabled="busy.connect" @click="connectFiken">
                  {{ connectButtonLabel }}
                </button>
                <button
                  v-if="status && status.exists"
                  class="btn btn-secondary"
                  :disabled="fiken.busy"
                  @click="disconnectFiken"
                >
                  Koble fra
                </button>
              </div>

              <p v-if="fiken.loadError" class="acct__meta acct__error">
                {{ fiken.loadError }}
              </p>

              <div v-if="needsCompanySelection" class="acct__company">
                <p class="acct__meta">
                  Kontoen er koblet, men ingen selskap er valgt. Ingenting kan bokføres før et selskap
                  er valgt — selskapets slug er en del av hver skrivevei mot Fiken.
                </p>
                <div class="sb-inline">
                  <div class="form-group sb-grow">
                    <label>Selskap</label>
                    <select v-model="fiken.companySlug" class="form-select">
                      <option value="">
                        Velg selskap&hellip;
                      </option>
                      <option
                        v-for="c in fiken.companies"
                        :key="c.slug"
                        :value="c.slug"
                        :disabled="!c.hasApiAccess"
                      >
                        {{ companyLabel(c) }}
                      </option>
                    </select>
                  </div>
                  <button class="btn btn-primary" :disabled="fiken.busy || !fiken.companySlug" @click="selectFikenCompany">
                    {{ fiken.busy ? 'Velger…' : 'Velg selskap' }}
                  </button>
                </div>
                <p v-if="!fiken.companies.length" class="acct__meta">
                  Ingen selskaper på den godkjente kontoen. Fikens API-tillegg må være aktivt på
                  selskapet før Okam kan bokføre i det.
                </p>
              </div>

              <div v-if="showBankAccountPicker" class="acct__company">
                <p class="acct__meta">
                  Fiken bokfører hver betaling mot en bankkonto den kjenner ved sin egen bankkontokode
                  («1920:XXXXX»), ikke ved kontonummeret fra kontoplanen. Velg kontoen oppgjørene skal
                  gå til.
                </p>
                <div class="sb-inline">
                  <div class="form-group sb-grow">
                    <label>Bankkonto</label>
                    <select v-model="fiken.bankAccountCode" class="form-select">
                      <option value="">
                        Velg bankkonto&hellip;
                      </option>
                      <option
                        v-for="a in fiken.bankAccounts"
                        :key="a.accountCode"
                        :value="a.accountCode"
                        :disabled="a.inactive"
                      >
                        {{ bankAccountLabel(a) }}
                      </option>
                    </select>
                  </div>
                  <button
                    class="btn btn-primary"
                    :disabled="fiken.busy || !fiken.bankAccountCode"
                    @click="saveFikenBankAccount"
                  >
                    {{ fiken.busy ? 'Lagrer…' : 'Lagre bankkonto' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Token-provider (Tripletex). The token endpoints are PowerUser at the backend
                 (TripletexAdminController), so a store admin is told rather than shown a form that
                 answers 403. -->
            <TripletexTokenForm
              v-else-if="isTripletex && isPowerUser"
              :key="'ttf-' + selectedStoreId"
              :store-id="selectedStoreId"
              @notify="showNotification"
              @saved="loadStatus"
            />

            <p v-else-if="isTripletex" class="sb-hint">
              Tripletex-nøkkelen legges inn av Okam. Ta kontakt, så kobles butikken opp.
            </p>

            <p v-else class="sb-hint">
              {{ systemLabel(settings.form.accountingSystem) }} har ingen tilkobling som settes opp
              herfra.
            </p>
          </template>
        </section>

        <!-- ============================ KONTOER ============================ -->
        <section v-if="hasSystem" class="acct__section">
          <div class="acct__section-head">
            <h3>Kontoer</h3>
            <button
              v-if="capabilities.canCreateLedgerAccounts"
              class="btn btn-secondary"
              :disabled="busy.ensure"
              @click="ensureAccounts"
            >
              {{ busy.ensure ? 'Oppretter…' : 'Opprett manglende kontoer' }}
            </button>
          </div>

          <p class="sb-hint">
            Okam kjenner hva en konto er <em>for</em> — ikke kontonummeret. Kartlegg hver rolle til
            kontoen den skal bokføres på i {{ systemLabel(settings.form.accountingSystem) }}.
          </p>

          <div class="table-wrap">
            <table class="sb-table">
              <thead>
                <tr>
                  <th>Rolle</th>
                  <th>Konto</th>
                  <th v-if="capabilities.requiresIncomeAccountPerLine">
                    Inntektskonto
                  </th>
                  <th>Forslag</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!roles.length">
                  <td :colspan="capabilities.requiresIncomeAccountPerLine ? 4 : 3" class="sb-empty">
                    Ingen kontoroller å fylle ut ennå.
                  </td>
                </tr>
                <tr v-for="row in roles" :key="rowKey(row)">
                  <td>
                    <strong>{{ roleLabel(row.role) }}</strong>
                    <span v-if="row.qualifier" class="acct__qualifier">{{ qualifierLabel(row.qualifier) }}</span>
                    <span v-if="!row.required" class="sb-badge">valgfri</span>
                    <div v-if="row.description" class="acct__meta">
                      {{ row.description }}
                    </div>
                    <div v-if="bankHint(row)" class="acct__meta">
                      {{ bankHint(row) }}
                    </div>
                  </td>
                  <td>
                    <input v-model="edits[rowKey(row)].accountCode" class="form-control" :placeholder="row.suggestedAccountCode || ''">
                  </td>
                  <td v-if="capabilities.requiresIncomeAccountPerLine">
                    <input v-model="edits[rowKey(row)].incomeAccountCode" class="form-control">
                  </td>
                  <td class="acct__meta">
                    {{ row.suggestedAccountCode || '—' }}
                    <span v-if="row.canBeCreated" class="sb-badge">kan opprettes</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="acct__hint">
            Tomt kontofelt sletter kartleggingen — «ikke satt» har én representasjon.
          </p>

          <div class="acct__actions">
            <button class="btn btn-primary" :disabled="busy.roles || !roles.length" @click="saveRoles">
              {{ busy.roles ? 'Lagrer…' : 'Lagre kontoer' }}
            </button>
          </div>

          <div v-if="pspWarningApplies" class="acct__warning">
            <strong>Ikke slå på {{ systemLabel(settings.form.accountingSystem) }}s eget
              «Betalingsoppgjør» for en betalingsleverandør Okam bokfører.</strong>
            Da bokføres oppgjøret to ganger, og ingen API kan oppdage det. Dintero og Surfboard står
            ikke på Fikens liste i dag, men Vipps og Stripe gjør det — og Okam har Vipps-ordrer utenfor
            dagens feed. Bruk mellomkontoene over, og la importen i regnskapssystemet være av.
          </div>

          <!-- Checklist: what only a human can do, in the accounting system's own UI -->
          <div v-if="status && (!capabilities.canCreateLedgerAccounts || manualTasks.length)" class="acct__checklist">
            <h4 class="acct__group-title">
              Dette må gjøres i {{ systemLabel(settings.form.accountingSystem) }}
            </h4>
            <ul>
              <li v-for="task in manualTasks" :key="task.key">
                <span :class="['sb-badge', task.done ? 'sb-badge--ok' : '']">{{ task.done ? 'OK' : 'Gjenstår' }}</span>
                <strong>{{ task.title }}</strong>
                <div v-if="task.detail" class="acct__meta">
                  {{ task.detail }}
                </div>
              </li>
              <li v-for="row in missingRoles" :key="'missing-' + rowKey(row)">
                <span class="sb-badge sb-badge--bad">Mangler</span>
                Opprett konto for <strong>{{ roleLabel(row.role) }}</strong>
                <span v-if="row.qualifier">{{ qualifierLabel(row.qualifier) }}</span>
                <span v-if="row.suggestedAccountCode">(forslag {{ row.suggestedAccountCode }})</span>
                og skriv kontonummeret inn over.
              </li>
              <li v-if="!manualTasks.length && !missingRoles.length">
                Ingenting gjenstår ✓
              </li>
            </ul>
          </div>
        </section>

        <!-- ============================ AVSTEMMING ============================ -->
        <section v-if="hasSystem" class="acct__section">
          <div class="acct__section-head">
            <h3>Avstemming</h3>
            <button class="btn btn-secondary" :disabled="busy.recon" @click="loadReconciliation">
              {{ busy.recon ? 'Henter…' : 'Oppdater' }}
            </button>
          </div>

          <div v-if="reconciliation" class="sb-result acct__recon">
            <span>Online: <strong>{{ oreToKr(reconciliation.onlineGrossOre) }}</strong></span>
            <span>Kasse: <strong>{{ oreToKr(reconciliation.posGrossOre) }}</strong></span>
            <span>Utbetalt: <strong>{{ oreToKr(reconciliation.paidOutGrossOre) }}</strong></span>
            <span>Korrigert: <strong>{{ oreToKr(reconciliation.correctedGrossOre) }}</strong></span>
            <span>Restfordring online: <strong>{{ oreToKr(reconciliation.onlineResidualOre) }}</strong></span>
            <span :class="{ 'acct__error': reconciliation.failedPostings > 0 }">
              Feilede: <strong>{{ reconciliation.failedPostings }}</strong>
            </span>
            <span :class="{ 'acct__error': reconciliation.periodLockedPostings > 0 }">
              Låst periode: <strong>{{ reconciliation.periodLockedPostings }}</strong>
            </span>
          </div>

          <div class="acct__filters">
            <div class="form-group">
              <label>Fra</label>
              <input v-model="range.from" type="date" class="form-control" @change="loadReconciliation">
            </div>
            <div class="form-group">
              <label>Til</label>
              <input v-model="range.to" type="date" class="form-control" @change="loadReconciliation">
            </div>
            <p class="acct__meta acct__filters-note">
              Summene over gjelder perioden som er valgt her — {{ rangeLabel }}.
            </p>
          </div>

          <div class="table-wrap">
            <table class="sb-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Dato</th>
                  <th>Status</th>
                  <th>Ekstern id</th>
                  <th>Melding</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-if="!postings.length">
                  <td colspan="6" class="sb-empty">
                    Ingen bilag i perioden.
                  </td>
                </tr>
                <tr v-for="(p, i) in postings" :key="p.accountingPostingLogId || (p.externalKey + '-' + i)">
                  <td>{{ kindLabel(p.kind) }}</td>
                  <td>{{ formatDay(p.businessDate) }}</td>
                  <td>
                    <span :class="['sb-badge', statusClass(p.status)]">{{ statusLabel(p.status) }}</span>
                    <div v-if="p.status === 'PeriodLocked'" class="acct__meta">
                      Perioden er låst i regnskapssystemet, så bilaget kan ikke kjøres på nytt. Åpne
                      perioden i regnskapssystemet først — det finnes ikke noe API for det.
                    </div>
                  </td>
                  <td class="sb-mono">
                    {{ p.externalId || '' }}
                  </td>
                  <td :class="{ 'acct__error': !!p.error }">
                    {{ p.error || p.externalKey }}
                  </td>
                  <td>
                    <button
                      v-if="isPowerUser && p.accountingPostingLogId && p.status !== 'Posted'"
                      class="btn btn-secondary"
                      :disabled="busy.retry"
                      @click="retryPosting(p)"
                    >
                      Nullstill
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <template v-if="isPowerUser">
            <h4 class="acct__group-title">
              Kjør på nytt
            </h4>
            <p class="sb-hint">
              Alle kjøringer er idempotente. «Nullstill» over frigjør bare nøkkelen til en feilet
              postering — den sender ingenting.
            </p>
            <div class="acct__rerun">
              <div class="acct__rerun-item">
                <div class="form-group">
                  <label>Dagsbilag online — dato</label>
                  <input v-model="rerun.day" type="date" class="form-control">
                </div>
                <button class="btn btn-secondary" :disabled="busy.day" @click="rerunDay">
                  Kjør dag
                </button>
              </div>
              <div class="acct__rerun-item">
                <div class="form-group">
                  <label>Z-bilag — Z-rapport-id</label>
                  <input v-model.number="rerun.zReportId" type="number" min="1" class="form-control">
                </div>
                <button class="btn btn-secondary" :disabled="busy.z || !rerun.zReportId" @click="rerunZ">
                  Kjør Z
                </button>
              </div>
            </div>

            <div v-if="capabilities.supportsPayoutPosting" class="acct__payout">
              <h4 class="acct__group-title">
                Utbetalingsbilag
              </h4>
              <div class="acct__grid3">
                <div class="form-group">
                  <label>Leverandør</label>
                  <select v-model="rerun.payout.pspQualifier" class="form-select">
                    <option value="Dintero">
                      Dintero
                    </option>
                    <option value="Surfboard">
                      Surfboard
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Oppgjørs-id</label>
                  <input v-model="rerun.payout.payoutId" class="form-control">
                </div>
                <div class="form-group">
                  <label>Oppgjørsdato</label>
                  <input v-model="rerun.payout.settlementDate" type="date" class="form-control">
                </div>
                <div class="form-group">
                  <label>Utbetalt (kr)</label>
                  <input v-model.number="rerun.payout.payoutKr" type="number" step="0.01" class="form-control">
                </div>
                <div class="form-group">
                  <label>Gebyr (kr)</label>
                  <input v-model.number="rerun.payout.feeKr" type="number" step="0.01" class="form-control">
                </div>
              </div>
              <div class="acct__actions">
                <button class="btn btn-secondary" :disabled="busy.payout || !payoutIsComplete" @click="rerunPayout">
                  Kjør utbetalingsbilag
                </button>
              </div>
            </div>
          </template>

          <div v-if="results.length" class="table-wrap acct__results">
            <table class="sb-table">
              <thead>
                <tr>
                  <th>System</th>
                  <th>Status</th>
                  <th>Ekstern id</th>
                  <th>Melding</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in results" :key="'res-' + i">
                  <td>{{ systemLabel(r.system) }}</td>
                  <td>
                    <span :class="['sb-badge', r.success ? (r.skipped ? '' : 'sb-badge--ok') : 'sb-badge--bad']">
                      {{ r.success ? (r.skipped ? 'Hoppet over' : 'OK') : 'Feil' }}
                    </span>
                  </td>
                  <td class="sb-mono">
                    {{ r.externalId || '' }}
                  </td>
                  <td>{{ r.message }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import Loading from '~/components/atoms/Loading.vue';
import TripletexTokenForm from '~/components/admin/accounting/TripletexTokenForm.vue';

// The generic accounting page. Every section is driven by the capability record the provider reports
// on its status and by the role list, so adding a third accounting system is a backend change only.
//
// Open to store admins for their own stores: AccountingAdminController authorises PER ACTION on the
// store, so a merchant owns their own connection and chart of accounts. The four actions that post
// into a merchant's books on their behalf — the day, Z and payout re-runs, and the retry that frees a
// posting's key — stay PowerUser at the backend, so their controls are hidden rather than shown and
// answered with a 403.
export default {
  name: 'AdminAccounting',
  components: { AdminPage, Loading, TripletexTokenForm },
  data () {
    return {
      isLoading: false,
      notification: { show: false, message: '', type: 'success' },
      allStores: [],
      selectedStoreId: 0,
      status: null,
      roles: [],
      edits: {},
      reconciliation: null,
      results: [],
      range: { from: '', to: '' },
      rerun: {
        day: '',
        zReportId: null,
        payout: { pspQualifier: 'Dintero', payoutId: '', settlementDate: '', payoutKr: 0, feeKr: 0 }
      },
      fiken: { busy: false, companySlug: '', companies: [], bankAccountCode: '', bankAccounts: [], loadError: '' },
      settings: {
        busy: false,
        effective: null,
        form: { accountingSystem: 'None', invoiceChannel: 'Kravia', invoiceDueDays: 14 }
      },
      busy: { verify: false, ensure: false, roles: false, recon: false, day: false, z: false, payout: false, retry: false, connect: false }
    };
  },
  computed: {
    hasSystem () {
      return this.settings.form.accountingSystem && this.settings.form.accountingSystem !== 'None';
    },
    // The answering provider's own record, carried on the status. There is deliberately no local
    // table keyed by system to fall back to: that is a second source of truth, and it goes stale the
    // first time a provider gains or loses an ability. Before the status has loaded every capability
    // reads false, so a control appears only once the backend has said it exists.
    capabilities () {
      return (this.status && this.status.capabilities) || {};
    },
    isPowerUser () {
      return !!(this.$store.state.currentUser && this.$store.state.currentUser.isPowerUser);
    },
    isTripletex () {
      return this.settings.form.accountingSystem === 'Tripletex';
    },
    accountingSystemOptions () {
      return [
        { value: 'None', label: 'Ingen' },
        { value: 'Emonkey', label: 'eMonkey' },
        { value: 'Tripletex', label: 'Tripletex' },
        { value: 'Fiken', label: 'Fiken' }
      ];
    },
    channelBlockedReason () {
      const effective = this.settings.effective;
      if (!effective || effective.canInvoiceViaAccountingSystem) { return ''; }
      return effective.blockedReason || 'Regnskapssystemet kan ikke sende faktura ennå';
    },
    invoiceChannelOptions () {
      const blocked = !!this.channelBlockedReason;
      const isSelected = this.settings.form.invoiceChannel === 'AccountingSystem';
      return [
        { value: 'Kravia', label: 'Kravia (Okam fakturerer)', disabled: false },
        {
          value: 'AccountingSystem',
          label: blocked ? 'Via regnskapssystem — ' + this.channelBlockedReason : 'Via regnskapssystem',
          disabled: blocked && !isSelected
        }
      ];
    },
    manualTasks () {
      return (this.status && this.status.manualTasks) || [];
    },
    missingRoles () {
      return (this.status && this.status.missingRoles) || [];
    },
    // Fiken's own payment-settlement import double-books what Okam posts, so the warning belongs
    // next to the PSP interim accounts rather than in a document nobody opens.
    pspWarningApplies () {
      return this.settings.form.accountingSystem === 'Fiken' &&
        this.roles.some(r => r.role === 'PspIntermediary');
    },
    needsCompanySelection () {
      return !!(this.status && this.status.exists && !this.status.externalCompanyRef);
    },
    showBankAccountPicker () {
      return !!(this.capabilities.requiresBankAccountSelection && this.status && this.status.externalCompanyRef);
    },
    connectButtonLabel () {
      if (this.busy.connect) { return 'Åpner…'; }
      return this.status && this.status.exists ? 'Koble til på nytt' : 'Koble til Fiken';
    },
    // The backend filters and sums the same range, and echoes it back, so the list under the totals
    // is the list those totals were made of. Filtering here as well would show sums for one period
    // beside vouchers from another.
    postings () {
      if (this.reconciliation && this.reconciliation.recent) { return this.reconciliation.recent; }
      return (this.status && this.status.recentPostings) || [];
    },
    rangeLabel () {
      const from = this.reconciliation && this.reconciliation.from;
      const to = this.reconciliation && this.reconciliation.to;
      if (!from && !to) { return 'hele historikken'; }
      if (from && to) { return this.formatDay(from) + ' til ' + this.formatDay(to); }
      return from ? 'fra ' + this.formatDay(from) : 'til ' + this.formatDay(to);
    },
    payoutIsComplete () {
      const p = this.rerun.payout;
      return !!(p.pspQualifier && p.payoutId && p.settlementDate);
    }
  },
  mounted () {
    if (!this.$store.getters.userIsLoggedIn) { return; }
    this.init();
  },
  methods: {
    // A store admin sees the stores they administer; only a power user needs the full list, and
    // GetAll is theirs alone to call.
    init () {
      if (!this.isPowerUser) {
        this.allStores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
        if (this.applyConnectReturn()) { return; }
        const preselected = this.$store.state.selectedAdminStore;
        const known = this.allStores.some(s => s.id === preselected);
        this.selectedStoreId = known ? preselected : ((this.allStores[0] && this.allStores[0].id) || 0);
        if (this.selectedStoreId > 0) { this.onStoreChange(); }
        return;
      }
      this.isLoading = true;
      this._storeService.GetAll()
        .then((stores) => {
          this.allStores = stores || [];
          this.applyConnectReturn();
        })
        .catch(e => this.apiError(e, 'Kunne ikke hente butikker'))
        .finally(() => { this.isLoading = false; });
    },
    // Fiken sends the browser back here with ?storeId= and
    // ?fiken=connected|choose-company|no-companies|denied|error. Read it once, tell the user, and
    // strip it so a refresh does not repeat the message. Answers whether it selected a store.
    applyConnectReturn () {
      const query = this.$route.query || {};
      if (!query.fiken) { return false; }
      const storeId = Number(query.storeId) || 0;
      if (storeId > 0) {
        this.selectedStoreId = storeId;
        this.onStoreChange();
      }
      const outcome = {
        connected: ['Fiken er koblet til. Sett kontoene under.', 'success'],
        'choose-company': ['Fiken er koblet til. Kontoen har flere selskaper — velg hvilket under.', 'success'],
        'no-companies': ['Fiken-kontoen har ingen selskaper Okam kan bokføre i. API-tillegget må være aktivt på selskapet.', 'error'],
        denied: ['Tilgangen ble ikke godkjent i Fiken.', 'error'],
        error: ['Fiken-tilkoblingen feilet.', 'error']
      }[query.fiken] || ['Ukjent svar fra Fiken-tilkoblingen.', 'error'];
      this.showNotification(outcome[0], outcome[1]);
      this.$router.replace({ path: this.$route.path, query: {} }).catch(() => {});
      return storeId > 0;
    },
    onStoreChange () {
      this.status = null;
      this.roles = [];
      this.edits = {};
      this.reconciliation = null;
      this.results = [];
      this.fiken = { busy: false, companySlug: '', companies: [], bankAccountCode: '', bankAccounts: [], loadError: '' };
      this.settings.effective = null;
      this.settings.form = { accountingSystem: 'None', invoiceChannel: 'Kravia', invoiceDueDays: 14 };
      if (this.selectedStoreId > 0) {
        this.loadSettings();
      }
    },
    loadSettings () {
      const storeId = this.selectedStoreId;
      Promise.all([
        this._storeAccountingSettingsService.Get(storeId),
        this._storeAccountingSettingsService.GetEffective(storeId)
      ])
        .then(([settings, effective]) => {
          if (this.selectedStoreId !== storeId) { return; }
          this.settings.effective = effective;
          this.settings.form = {
            accountingSystem: settings.accountingSystem,
            invoiceChannel: settings.invoiceChannel,
            invoiceDueDays: settings.invoiceDueDays
          };
          if (this.hasSystem) {
            this.loadStatus();
            this.loadRoles();
            this.loadReconciliation();
          }
        })
        .catch(e => this.apiError(e, 'Kunne ikke hente regnskapsoppsett'));
    },
    saveSettings () {
      this.settings.busy = true;
      this._storeAccountingSettingsService.Update(this.selectedStoreId, {
        accountingSystem: this.settings.form.accountingSystem,
        invoiceChannel: this.settings.form.invoiceChannel,
        invoiceDueDays: Number(this.settings.form.invoiceDueDays) || 0
      })
        .then(() => {
          this.showNotification('Regnskapsoppsettet er lagret.');
          this.loadSettings();
        })
        .catch(e => this.apiError(e, 'Kunne ikke lagre regnskapsoppsett'))
        .finally(() => { this.settings.busy = false; });
    },
    loadStatus () {
      const storeId = this.selectedStoreId;
      this._accountingAdminService.Status(storeId)
        .then((status) => {
          if (this.selectedStoreId !== storeId) { return; }
          this.status = status;
          this.loadFikenChoices();
        })
        .catch(e => this.apiError(e, 'Kunne ikke hente status'));
    },
    // The company and bank-account lists are read from Fiken itself, so they are fetched only when
    // the connection can answer: companies once tokens exist, bank accounts once a company is bound.
    // A failure here is reported in place rather than as a toast — it is a background read the user
    // did not ask for, and Fiken answering slowly is not an error the page should shout about.
    loadFikenChoices () {
      if (!this.capabilities.requiresOAuthConsent || !this.status || !this.status.exists) { return; }
      const storeId = this.selectedStoreId;
      this.fiken.loadError = '';
      if (this.needsCompanySelection) {
        this._fikenConnectService.ListCompanies(storeId)
          .then((companies) => {
            if (this.selectedStoreId !== storeId) { return; }
            this.fiken.companies = companies || [];
          })
          .catch((e) => { this.fiken.loadError = this.errorMessage(e, 'Kunne ikke hente Fiken-selskapene'); });
      }
      if (this.showBankAccountPicker) {
        this._fikenConnectService.ListBankAccounts(storeId)
          .then((accounts) => {
            if (this.selectedStoreId !== storeId) { return; }
            this.fiken.bankAccounts = accounts || [];
          })
          .catch((e) => { this.fiken.loadError = this.errorMessage(e, 'Kunne ikke hente bankkontoene'); });
      }
    },
    verify () {
      this.busy.verify = true;
      this._accountingAdminService.Verify(this.selectedStoreId)
        .then((status) => {
          this.status = status;
          this.showNotification(status.verified ? 'Tilkoblingen er verifisert.' : 'Verifiseringen feilet.',
            status.verified ? 'success' : 'error');
        })
        .catch(e => this.apiError(e, 'Verifiseringen feilet'))
        .finally(() => { this.busy.verify = false; });
    },
    connectFiken () {
      this.busy.connect = true;
      // The return URL is this page for this store. The backend does not redirect to it verbatim —
      // a target kept from a query string for ten minutes is an open redirect — but it is what tells
      // it which admin surface the merchant came from.
      const returnUrl = window.location.origin + this.$route.path + '?storeId=' + this.selectedStoreId;
      this._fikenConnectService.Start(this.selectedStoreId, returnUrl)
        .then((start) => {
          if (!start || !start.authorizeUrl) {
            this.showNotification('Fikens autoriserings-URL manglet i svaret.', 'error');
            return;
          }
          window.location.href = start.authorizeUrl;
        })
        .catch(e => this.apiError(e, 'Kunne ikke starte Fiken-tilkoblingen'))
        .finally(() => { this.busy.connect = false; });
    },
    selectFikenCompany () {
      this.fiken.busy = true;
      this._fikenConnectService.SelectCompany(this.selectedStoreId, this.fiken.companySlug)
        .then((status) => {
          this.status = status;
          this.showNotification('Selskapet er valgt.');
          this.loadFikenChoices();
          this.loadRoles();
        })
        .catch(e => this.apiError(e, 'Kunne ikke velge selskap'))
        .finally(() => { this.fiken.busy = false; });
    },
    saveFikenBankAccount () {
      this.fiken.busy = true;
      this._fikenConnectService.SetBankAccount(this.selectedStoreId, this.fiken.bankAccountCode)
        .then((status) => {
          this.status = status;
          this.showNotification('Bankkontoen er lagret.');
          this.loadRoles();
        })
        .catch(e => this.apiError(e, 'Kunne ikke lagre bankkontoen'))
        .finally(() => { this.fiken.busy = false; });
    },
    disconnectFiken () {
      if (!window.confirm('Koble butikken fra Fiken? Ingenting kan bokføres før den kobles til igjen.')) { return; }
      this.fiken.busy = true;
      this._fikenConnectService.Disconnect(this.selectedStoreId)
        .then(() => {
          this.showNotification('Butikken er koblet fra Fiken.');
          this.fiken.companies = [];
          this.fiken.bankAccounts = [];
          this.fiken.companySlug = '';
          this.fiken.bankAccountCode = '';
          this.loadStatus();
        })
        .catch(e => this.apiError(e, 'Kunne ikke koble fra Fiken'))
        .finally(() => { this.fiken.busy = false; });
    },
    loadRoles () {
      this._accountingAdminService.GetRoleMappings(this.selectedStoreId)
        .then((roles) => { this.setRoles(roles || []); })
        .catch(e => this.apiError(e, 'Kunne ikke hente kontoroller'));
    },
    setRoles (roles) {
      const edits = {};
      roles.forEach((row) => {
        edits[this.rowKey(row)] = {
          accountCode: row.accountCode || '',
          incomeAccountCode: row.incomeAccountCode || ''
        };
      });
      this.roles = roles;
      this.edits = edits;
    },
    saveRoles () {
      this.busy.roles = true;
      const payload = this.roles.map(row => ({
        role: row.role,
        qualifier: row.qualifier || '',
        accountCode: (this.edits[this.rowKey(row)].accountCode || '').trim(),
        incomeAccountCode: (this.edits[this.rowKey(row)].incomeAccountCode || '').trim()
      }));
      this._accountingAdminService.UpsertRoleMappings(this.selectedStoreId, payload)
        .then((roles) => {
          this.setRoles(roles || []);
          this.showNotification('Kontoene er lagret.');
          this.loadStatus();
        })
        .catch(e => this.apiError(e, 'Kunne ikke lagre kontoene'))
        .finally(() => { this.busy.roles = false; });
    },
    ensureAccounts () {
      this.busy.ensure = true;
      this._accountingAdminService.EnsureAccounts(this.selectedStoreId)
        .then((status) => {
          this.status = status;
          const created = status.createdAccounts || [];
          this.showNotification(created.length
            ? 'Opprettet: ' + created.join(', ')
            : 'Ingen kontoer måtte opprettes.');
          this.loadRoles();
        })
        .catch(e => this.apiError(e, 'Kunne ikke opprette kontoer'))
        .finally(() => { this.busy.ensure = false; });
    },
    loadReconciliation () {
      const storeId = this.selectedStoreId;
      this.busy.recon = true;
      this._accountingAdminService.Reconciliation(storeId, {
        from: this.range.from || undefined,
        to: this.range.to || undefined
      })
        .then((recon) => {
          if (this.selectedStoreId !== storeId) { return; }
          this.reconciliation = recon;
        })
        .catch(e => this.apiError(e, 'Kunne ikke hente avstemming'))
        .finally(() => { this.busy.recon = false; });
    },
    rerunDay () {
      this.busy.day = true;
      this._accountingAdminService.RerunDay(this.selectedStoreId, this.rerun.day || undefined)
        .then(r => this.afterRun(r))
        .catch(e => this.apiError(e, 'Dagsbilaget feilet'))
        .finally(() => { this.busy.day = false; });
    },
    rerunZ () {
      this.busy.z = true;
      this._accountingAdminService.RerunZ(this.selectedStoreId, this.rerun.zReportId)
        .then(r => this.afterRun(r))
        .catch(e => this.apiError(e, 'Z-bilaget feilet'))
        .finally(() => { this.busy.z = false; });
    },
    rerunPayout () {
      const p = this.rerun.payout;
      this.busy.payout = true;
      this._accountingAdminService.RerunPayout(this.selectedStoreId, {
        pspQualifier: p.pspQualifier,
        payoutId: p.payoutId,
        settlementDate: p.settlementDate,
        // The API takes ore; the form asks for kroner, because that is what a settlement report shows.
        payoutOre: Math.round((Number(p.payoutKr) || 0) * 100),
        feeOre: Math.round((Number(p.feeKr) || 0) * 100)
      })
        .then(r => this.afterRun(r))
        .catch(e => this.apiError(e, 'Utbetalingsbilaget feilet'))
        .finally(() => { this.busy.payout = false; });
    },
    retryPosting (posting) {
      this.busy.retry = true;
      this._accountingAdminService.RetryPosting(this.selectedStoreId, posting.accountingPostingLogId)
        .then(() => {
          this.showNotification('Posteringen er nullstilt. Kjør bilaget på nytt for å sende det.');
          this.loadReconciliation();
          this.loadStatus();
        })
        .catch(e => this.apiError(e, 'Kunne ikke nullstille posteringen'))
        .finally(() => { this.busy.retry = false; });
    },
    afterRun (result) {
      this.results = result ? [result] : [];
      this.showNotification(result && result.success ? 'Kjørt.' : 'Kjøringen feilet — se resultatet under.',
        result && result.success ? 'success' : 'error');
      this.loadReconciliation();
      this.loadStatus();
    },
    rowKey (row) {
      return row.role + '|' + (row.qualifier || '');
    },
    roleLabel (role) {
      return {
        Sales: 'Salg',
        Tips: 'Tips',
        Rounding: 'Øreavrunding',
        Bank: 'Bankkonto',
        Cashbox: 'Kontantkasse',
        CashDifference: 'Kassedifferanse',
        BankDeposit: 'Bankinnskudd',
        Receivables: 'Kundefordringer',
        CompanyReceivable: 'Bedriftsfordring',
        PspIntermediary: 'Mellomkonto',
        Fee: 'Gebyr'
      }[role] || role;
    },
    // A qualifier is either a VatCategory member name or a payment provider's name; the provider
    // names are shown as they are.
    qualifierLabel (qualifier) {
      return {
        Standard25: '25 % (servering)',
        Reduced15: '15 % (mat/take-away)',
        Low12: '12 % (lav sats)',
        Zero: '0 % (avgiftsfri)',
        Exempt: 'Unntatt',
        OutsideVatAct: 'Utenfor mva-loven',
        Export: 'Eksport',
        None: 'Uten mva-behandling'
      }[qualifier] || qualifier;
    },
    // Fiken posts every payment against a bank account it knows by its own bankAccountCode, not by
    // an account number from the chart of accounts.
    companyLabel (company) {
      const parts = [company.name || company.slug];
      if (company.organizationNumber) { parts.push(company.organizationNumber); }
      if (company.testCompany) { parts.push('testselskap'); }
      if (!company.hasApiAccess) { parts.push('mangler API-tillegg'); }
      return parts.join(' — ');
    },
    bankAccountLabel (account) {
      const parts = [account.name || account.accountCode, account.accountCode];
      if (account.accountNumber) { parts.push(account.accountNumber); }
      if (account.inactive) { parts.push('inaktiv'); }
      return parts.join(' — ');
    },
    bankHint (row) {
      if (row.role !== 'Bank' || !this.capabilities.requiresBankAccountSelection) { return ''; }
      return 'Fiken vil ha bankkontokoden (bankAccountCode) fra kontoen i Fiken, ikke kontonummeret fra kontoplanen.';
    },
    kindLabel (kind) {
      return {
        OnlineDaily: 'Dagsbilag online',
        PosZ: 'Z-bilag kasse',
        Payout: 'Utbetaling',
        Correction: 'Korreksjon',
        Adjustment: 'Justering'
      }[kind] || kind;
    },
    statusLabel (status) {
      return {
        Posted: 'Bokført',
        Failed: 'Feilet',
        Reversed: 'Reversert',
        Skipped: 'Hoppet over',
        Pending: 'Underveis',
        PeriodLocked: 'Låst periode'
      }[status] || status;
    },
    statusClass (status) {
      if (status === 'Posted') { return 'sb-badge--ok'; }
      if (status === 'Failed' || status === 'PeriodLocked') { return 'sb-badge--bad'; }
      return '';
    },
    systemLabel (system) {
      return { None: 'Ingen', Emonkey: 'eMonkey', Tripletex: 'Tripletex', Fiken: 'Fiken' }[system] || system;
    },
    showNotification (message, type = 'success') {
      this.notification = { show: true, message, type };
      setTimeout(() => { this.notification.show = false; }, 5000);
    },
    // A 400 carries the backend's own Norwegian explanation; surface it verbatim.
    errorMessage (error, fallback) {
      return (error && error.response && error.response.data && error.response.data.message) ||
        (error && error.message) || fallback;
    },
    apiError (error, fallback) {
      this.showNotification(this.errorMessage(error, fallback), 'error');
    },
    oreToKr (ore) {
      return ((ore || 0) / 100).toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr';
    },
    formatDate (value) {
      if (!value) { return ''; }
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : d.toLocaleString('nb-NO');
    },
    formatDay (value) {
      return (value || '').slice(0, 10);
    }
  }
};
</script>

<style scoped>
.acct {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1.5rem;
}
.acct__header {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.acct__title {
  font-size: 1.6rem;
  font-weight: 700;
}
.acct__intro {
  color: #6b7280;
  margin: 0.25rem 0 1.25rem;
}
.acct__store-picker {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  max-width: 560px;
}
.acct__store-picker label {
  font-weight: 600;
}
.acct__section {
  background: #fff;
  border: 1px solid #eef0f2;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.25rem;
}
.acct__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}
.acct__section-head h3 {
  margin: 0;
}
.acct__grid3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem 1rem;
}
.acct__status {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  align-items: center;
}
.acct__meta {
  color: #6b7280;
  font-size: 0.88rem;
}
.acct__hint {
  color: #6b7280;
  font-size: 0.85rem;
  margin: 0.6rem 0 0;
}
.acct__error {
  color: #dc2626;
}
.acct__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
.acct__group-title {
  margin: 1.25rem 0 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
}
.acct__connect {
  margin-top: 0.75rem;
}
.acct__company {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid #eef0f2;
}
.acct__qualifier {
  margin-left: 0.4rem;
  color: #374151;
}
.acct__warning {
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  background: #fff7ed;
  border: 1px solid #fdba74;
  color: #7c2d12;
  font-size: 0.9rem;
}
.acct__checklist {
  margin-top: 1rem;
}
.acct__checklist ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.acct__checklist li {
  padding: 0.4rem 0;
  border-bottom: 1px solid #f3f4f6;
}
.acct__recon {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  align-items: center;
}
.acct__filters {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  margin: 1rem 0 0.5rem;
  flex-wrap: wrap;
}
.acct__filters .form-group {
  margin-bottom: 0;
}
.acct__filters-note {
  margin: 0 0 0.4rem;
}
.acct__rerun {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem 1.5rem;
}
.acct__rerun-item {
  display: flex;
  gap: 0.6rem;
  align-items: flex-end;
  flex-wrap: wrap;
}
.acct__rerun-item .form-group {
  margin-bottom: 0;
  flex: 1;
  min-width: 160px;
}
.acct__results {
  margin-top: 1rem;
}
</style>
