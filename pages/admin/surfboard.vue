<template>
  <AdminPage @login-success="handleLoginSuccess">
    <div class="surfboard">
      <div class="surfboard__header">
        <h1 class="surfboard__title">
          {{ $i("nav_surfboard") }}-administrasjon
        </h1>
        <Loading v-if="isLoading" :loading="true" />
      </div>

      <p class="surfboard__intro">
        Onboard butikker som Surfboard-merchants, administrer stores og terminaler, og koble alt til Okam-butikkene
        &mdash; uten Partner Portal.
      </p>

      <div
        v-if="notification.show"
        :class="['notification', `notification--${notification.type}`]"
      >
        {{ notification.message }}
      </div>

      <!-- Tabs -->
      <div class="surfboard__tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['surfboard__tab', { 'surfboard__tab--active': activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Store selector (all tabs except overview operate on one Okam store) -->
      <div
        v-if="activeTab !== 'overview'"
        class="surfboard__store-picker"
      >
        <label>Okam-butikk</label>
        <select
          v-model.number="selectedStoreId"
          class="form-select"
          @change="onStoreChange"
        >
          <option :value="0">
            Velg butikk&hellip;
          </option>
          <option
            v-for="s in allStores"
            :key="s.id"
            :value="s.id"
          >
            {{ s.name }} ({{ s.vat }})
          </option>
        </select>
      </div>

      <!-- ============================ OVERVIEW ============================ -->
      <section v-if="activeTab === 'overview'" class="surfboard__section">
        <div class="surfboard__section-head">
          <h3>Merchants</h3>
          <button class="btn btn-secondary" @click="loadOverview">
            Oppdater
          </button>
        </div>
        <div class="table-wrap">
          <table class="sb-table">
            <thead>
              <tr>
                <th>Navn</th>
                <th>Org.nr</th>
                <th>Merchant ID</th>
                <th>Land</th>
                <th>Valuta</th>
                <th>Opprettet</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!merchants.length">
                <td colspan="6" class="sb-empty">
                  Ingen merchants.
                </td>
              </tr>
              <tr v-for="m in merchants" :key="m.merchantId">
                <td>{{ m.merchantName }}</td>
                <td>{{ m.companyId }}</td>
                <td class="sb-mono">
                  {{ m.merchantId }}
                </td>
                <td>{{ m.countryCode }}</td>
                <td>{{ m.currencyCode }}</td>
                <td>{{ formatDate(m.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="surfboard__section-head" style="margin-top: 1.5rem">
          <h3>Søknader (KYB)</h3>
        </div>
        <div class="table-wrap">
          <table class="sb-table">
            <thead>
              <tr>
                <th>Org.nr</th>
                <th>Land</th>
                <th>Status</th>
                <th>Opprettet</th>
                <th>KYB-lenke</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!applications.length">
                <td colspan="5" class="sb-empty">
                  Ingen søknader.
                </td>
              </tr>
              <tr v-for="a in applications" :key="a.applicationId">
                <td>{{ a.corporateId }}</td>
                <td>{{ a.country }}</td>
                <td><span :class="statusClass(a.applicationStatus)">{{ a.applicationStatus }}</span></td>
                <td>{{ formatDate(a.createdAt) }}</td>
                <td>
                  <a v-if="a.webKybUrl" :href="a.webKybUrl" target="_blank" rel="noopener">Åpne</a>
                  <span v-else>&mdash;</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ============================ ONBOARDING ============================ -->
      <section v-else-if="activeTab === 'onboarding'" class="surfboard__section">
        <template v-if="selectedStoreId > 0">
          <h3>Onboard butikk som ny merchant</h3>
          <p class="sb-hint">
            Fyll ut foretaksinfo (hentes fra Brreg), send inn, og del KYB-lenken med butikken. Når søknaden er
            fullført og signert henter du merchant-/store-ID med &laquo;Synk status&raquo;.
          </p>

          <div class="sb-form">
            <div class="form-group">
              <label>Org.nr</label>
              <div class="sb-inline">
                <input v-model="onboardForm.corporateId" class="form-control" type="text">
                <button class="btn btn-secondary" :disabled="brregLoading" @click="fetchBrreg">
                  Hent fra Brreg
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>Juridisk navn</label>
              <input v-model="onboardForm.legalName" class="form-control" type="text">
            </div>
            <div class="form-group">
              <label>E-post</label>
              <input v-model="onboardForm.email" class="form-control" type="email">
            </div>
            <div class="sb-row">
              <div class="form-group">
                <label>Landkode</label>
                <input v-model="onboardForm.phoneCode" class="form-control" type="text" placeholder="47">
              </div>
              <div class="form-group sb-grow">
                <label>Telefon</label>
                <input v-model="onboardForm.phoneNumber" class="form-control" type="text">
              </div>
            </div>
            <div class="form-group">
              <label>Adresse</label>
              <input v-model="onboardForm.addressLine1" class="form-control" type="text">
            </div>
            <div class="sb-row">
              <div class="form-group">
                <label>Postnr</label>
                <input v-model="onboardForm.postalCode" class="form-control" type="text">
              </div>
              <div class="form-group sb-grow">
                <label>Poststed</label>
                <input v-model="onboardForm.city" class="form-control" type="text">
              </div>
            </div>
            <div class="form-group">
              <label>Store-navn</label>
              <input v-model="onboardForm.storeName" class="form-control" type="text">
            </div>

            <div class="form-group">
              <label>Betalingsmetoder</label>
              <div class="sb-checks">
                <label><input v-model="onboardForm.cardEnabled" type="checkbox"> Kort</label>
                <label><input v-model="onboardForm.vippsEnabled" type="checkbox"> Vipps</label>
                <label><input v-model="onboardForm.mobilePayEnabled" type="checkbox"> MobilePay</label>
                <label><input v-model="onboardForm.swishEnabled" type="checkbox"> Swish</label>
                <label><input v-model="onboardForm.klarnaEnabled" type="checkbox"> Klarna</label>
              </div>
            </div>

            <div class="form-group">
              <label class="sb-check-line">
                <input v-model="onboardForm.includeOnline" type="checkbox">
                Aktiver online (nettbetaling / PaymentPage)
              </label>
            </div>
            <template v-if="onboardForm.includeOnline">
              <div class="form-group">
                <label>Nettbutikk-URL</label>
                <input v-model="onboardForm.merchantWebshopUrl" class="form-control" type="text">
              </div>
              <div class="form-group">
                <label>Vilkår-URL</label>
                <input v-model="onboardForm.termsAndConditionsUrl" class="form-control" type="text">
              </div>
              <div class="form-group">
                <label>Personvern-URL</label>
                <input v-model="onboardForm.privacyPolicyUrl" class="form-control" type="text">
              </div>
            </template>

            <button class="btn btn-primary" :disabled="onboardLoading" @click="doOnboard">
              {{ onboardLoading ? "Sender inn&hellip;" : "Opprett merchant-søknad" }}
            </button>
          </div>

          <div v-if="onboardResult" class="sb-result">
            <p><strong>Søknad opprettet.</strong> Application ID: <span class="sb-mono">{{ onboardResult.applicationId }}</span></p>
            <p v-if="onboardResult.webKybUrl">
              KYB-lenke å dele med butikken:
              <a :href="onboardResult.webKybUrl" target="_blank" rel="noopener">{{ onboardResult.webKybUrl }}</a>
            </p>
            <button class="btn btn-secondary" :disabled="syncLoading" @click="doSync">
              Synk status
            </button>
            <span v-if="config.onboardingStatus" class="sb-badge">{{ config.onboardingStatus }}</span>
          </div>
        </template>
        <p v-else class="sb-hint">
          Velg en Okam-butikk øverst for å starte onboarding.
        </p>
      </section>

      <!-- ============================ CONFIG ============================ -->
      <section v-else-if="activeTab === 'config'" class="surfboard__section">
        <template v-if="selectedStoreId > 0">
          <h3>Butikk-konfigurasjon</h3>

          <div v-if="config.applicationId || config.onboardingStatus" class="sb-result">
            <p>
              Onboarding-søknad: <span class="sb-mono">{{ config.applicationId || "&mdash;" }}</span>
              <span v-if="config.onboardingStatus" class="sb-badge">{{ config.onboardingStatus }}</span>
            </p>
            <button class="btn btn-secondary" :disabled="syncLoading" @click="doSync">
              Hent ID-er fra Surfboard
            </button>
          </div>

          <div class="sb-form">
            <div class="form-group">
              <label class="sb-check-line">
                <input v-model="config.surfboardEnabled" type="checkbox">
                Surfboard aktivert for butikken
              </label>
            </div>
            <div class="form-group">
              <label>Merchant ID</label>
              <input v-model="config.merchantId" class="form-control" type="text">
            </div>
            <div class="form-group">
              <label>Store ID (Surfboard)</label>
              <input v-model="config.storeExternalId" class="form-control" type="text">
            </div>
            <div class="form-group">
              <label>Online terminal-ID (PaymentPage)</label>
              <input v-model="config.onlineTerminalId" class="form-control" type="text">
            </div>
            <div class="form-group">
              <label>Webhook-secret</label>
              <input v-model="config.webhookSecret" class="form-control" type="text">
            </div>
            <div class="form-group">
              <label>Betalingsmetoder</label>
              <div class="sb-checks">
                <label><input v-model="config.cardEnabled" type="checkbox"> Kort</label>
                <label><input v-model="config.vippsEnabled" type="checkbox"> Vipps</label>
                <label><input v-model="config.mobilePayEnabled" type="checkbox"> MobilePay</label>
                <label><input v-model="config.swishEnabled" type="checkbox"> Swish</label>
                <label><input v-model="config.klarnaEnabled" type="checkbox"> Klarna</label>
              </div>
            </div>
            <div class="sb-row">
              <div class="form-group">
                <label>Kommisjon online (%)</label>
                <input v-model.number="config.commissionPercentage" class="form-control" type="number" step="0.01">
              </div>
              <div class="form-group">
                <label>Kommisjon terminal (%)</label>
                <input v-model.number="config.terminalCommissionPercentage" class="form-control" type="number" step="0.01">
              </div>
            </div>
            <button class="btn btn-primary" :disabled="savingConfig" @click="saveConfig">
              {{ savingConfig ? "Lagrer&hellip;" : "Lagre konfigurasjon" }}
            </button>
          </div>
        </template>
        <p v-else class="sb-hint">
          Velg en Okam-butikk øverst for å se konfigurasjon.
        </p>
      </section>

      <!-- ============================ TERMINALS ============================ -->
      <section v-else-if="activeTab === 'terminals'" class="surfboard__section">
        <template v-if="selectedStoreId > 0">
          <template v-if="config.merchantId && config.storeExternalId">
            <h3>Registrer terminal</h3>
            <p class="sb-hint">
              Skru på terminalen (SurfTouch: 6-sifret kode ved oppstart; SurfPad/SurfPrint: serienr på baksiden).
            </p>
            <div class="sb-form">
              <div class="form-group">
                <label>Registrerings-ID / serienr</label>
                <input v-model="registerForm.registrationIdentifier" class="form-control" type="text">
              </div>
              <div class="form-group">
                <label>Terminal-navn</label>
                <input v-model="registerForm.terminalName" class="form-control" type="text">
              </div>
              <button class="btn btn-primary" :disabled="registerLoading" @click="doRegisterDevice">
                Registrer
              </button>
            </div>

            <h3 style="margin-top: 1.5rem">
              Aktiver terminal (partner-lager)
            </h3>
            <div class="sb-form">
              <div class="form-group">
                <label>Serienr</label>
                <input v-model="activateSerial" class="form-control" type="text">
              </div>
              <button class="btn btn-secondary" :disabled="activateLoading" @click="doActivate">
                Aktiver
              </button>
            </div>

            <div class="surfboard__section-head" style="margin-top: 1.5rem">
              <h3>Terminaler</h3>
              <button class="btn btn-secondary" @click="loadTerminals">
                Oppdater
              </button>
            </div>
            <div class="table-wrap">
              <table class="sb-table">
                <thead>
                  <tr>
                    <th>Navn</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Serienr</th>
                    <th>Terminal ID</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!terminals.length">
                    <td colspan="5" class="sb-empty">
                      Ingen terminaler.
                    </td>
                  </tr>
                  <tr v-for="t in terminals" :key="t.terminalId">
                    <td>{{ t.terminalName }}</td>
                    <td>{{ t.terminalType }}</td>
                    <td><span :class="statusClass(t.terminalStatus)">{{ t.terminalStatus }}</span></td>
                    <td>{{ t.serialNo }}</td>
                    <td class="sb-mono">
                      {{ t.terminalId }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <p v-else class="sb-hint">
            Butikken mangler merchant-/store-ID. Fullfør onboarding og trykk &laquo;Hent ID-er fra Surfboard&raquo; under Butikk-konfig først.
          </p>
        </template>
        <p v-else class="sb-hint">
          Velg en Okam-butikk øverst for å administrere terminaler.
        </p>
      </section>
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
      activeTab: 'overview',
      tabs: [
        { key: 'overview', label: 'Oversikt' },
        { key: 'onboarding', label: 'Onboarding' },
        { key: 'config', label: 'Butikk-konfig' },
        { key: 'terminals', label: 'Terminaler' }
      ],
      notification: { show: false, message: '', type: 'success' },
      allStores: [],
      selectedStoreId: 0,
      merchants: [],
      applications: [],
      onboardForm: this.emptyOnboardForm(),
      onboardResult: null,
      onboardLoading: false,
      brregLoading: false,
      syncLoading: false,
      config: this.emptyConfig(),
      savingConfig: false,
      terminals: [],
      registerForm: { registrationIdentifier: '', terminalName: '' },
      registerLoading: false,
      activateSerial: '',
      activateLoading: false
    };
  },
  watch: {
    activeTab (tab) {
      if (tab === 'terminals' && this.config.merchantId && this.config.storeExternalId) {
        this.loadTerminals();
      }
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
    emptyOnboardForm () {
      return {
        corporateId: '',
        legalName: '',
        mccCode: '',
        email: '',
        phoneCode: '47',
        phoneNumber: '',
        addressLine1: '',
        city: '',
        postalCode: '',
        storeName: '',
        cardEnabled: true,
        vippsEnabled: false,
        mobilePayEnabled: false,
        swishEnabled: false,
        klarnaEnabled: false,
        includeOnline: false,
        merchantWebshopUrl: '',
        termsAndConditionsUrl: '',
        privacyPolicyUrl: ''
      };
    },
    emptyConfig () {
      return {
        surfboardEnabled: false,
        merchantId: '',
        storeExternalId: '',
        onlineTerminalId: '',
        webhookSecret: '',
        applicationId: '',
        onboardingStatus: '',
        cardEnabled: false,
        vippsEnabled: false,
        mobilePayEnabled: false,
        swishEnabled: false,
        klarnaEnabled: false,
        commissionPercentage: 0,
        terminalCommissionPercentage: 0,
        woltDeliveryFeePercent: 0,
        woltCustomerDeliveryFeeAmount: 0,
        woltServiceFeeAmount: 0
      };
    },
    handleLoginSuccess () {
      this.init();
    },
    init () {
      this._storeService.GetAll().then((stores) => {
        this.allStores = stores || [];
      });
      this.loadOverview();
    },
    showNotification (message, type = 'success') {
      this.notification = { show: true, message, type };
      setTimeout(() => {
        this.notification.show = false;
      }, 5000);
    },
    apiError (error, fallback) {
      const message = error?.response?.data?.message || error?.message || fallback;
      this.showNotification(message, 'error');
    },
    formatDate (value) {
      if (!value) { return ''; }
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : d.toLocaleDateString('nb-NO');
    },
    statusClass (status) {
      const s = (status || '').toUpperCase();
      if (s === 'MERCHANT_CREATED' || s === 'APPLICATION_COMPLETED' || s === 'ACTIVE') { return 'sb-badge sb-badge--ok'; }
      if (s === 'APPLICATION_REJECTED' || s === 'APPLICATION_EXPIRED' || s === 'DE_REGISTERED') { return 'sb-badge sb-badge--bad'; }
      return 'sb-badge';
    },
    loadOverview () {
      this.isLoading = true;
      Promise.all([
        this._surfboardService.getMerchants().catch(() => []),
        this._surfboardService.getApplications().catch(() => [])
      ])
        .then(([merchants, applications]) => {
          this.merchants = merchants || [];
          this.applications = applications || [];
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    onStoreChange () {
      this.onboardResult = null;
      this.terminals = [];
      if (this.selectedStoreId > 0) {
        this.loadStore(this.selectedStoreId);
      } else {
        this.config = this.emptyConfig();
      }
    },
    loadStore (storeId) {
      this.isLoading = true;
      const store = this.allStores.find(s => s.id === storeId);
      // Prefill the onboarding form from the Okam store. The online terms/privacy URLs are Okam's
      // standard pages (privacy is shared; the store terms carry the Okam store id).
      this.onboardForm = Object.assign(this.emptyOnboardForm(), {
        corporateId: store && store.vat ? String(store.vat) : '',
        legalName: store ? store.name : '',
        storeName: store ? store.name : '',
        privacyPolicyUrl: 'https://okam.no/personvern/',
        termsAndConditionsUrl: 'https://okam.no/vilkar-store/?id=' + storeId
      });

      Promise.all([
        this._storeService.Get(storeId).catch(() => null),
        this._storeService.GetSurfboardConfig(storeId).catch(() => ({}))
      ])
        .then(([store2, config]) => {
          this.config = Object.assign(this.emptyConfig(), config || {}, {
            surfboardEnabled: store2 ? !!store2.surfboardEnabled : false
          });
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    fetchBrreg () {
      const org = (this.onboardForm.corporateId || '').replace(/\s/g, '');
      if (!org) {
        this.showNotification('Fyll inn org.nr først.', 'error');
        return;
      }
      this.brregLoading = true;
      this._surfboardService
        .brregLookup(Number(org))
        .then((p) => {
          this.onboardForm.legalName = p.legalName || this.onboardForm.legalName;
          this.onboardForm.addressLine1 = p.addressLine1 || '';
          this.onboardForm.city = p.city || '';
          this.onboardForm.postalCode = p.postalCode || '';
          this.showNotification('Foretaksinfo hentet fra Brreg.');
        })
        .catch(e => this.apiError(e, 'Klarte ikke hente fra Brreg.'))
        .finally(() => {
          this.brregLoading = false;
        });
    },
    doOnboard () {
      this.onboardLoading = true;
      this._surfboardService
        .onboardStore(this.selectedStoreId, this.onboardForm)
        .then((result) => {
          this.onboardResult = result;
          this.showNotification('Merchant-søknad opprettet.');
          this.loadStore(this.selectedStoreId);
          this.loadOverview();
        })
        .catch(e => this.apiError(e, 'Onboarding feilet.'))
        .finally(() => {
          this.onboardLoading = false;
        });
    },
    doSync () {
      this.syncLoading = true;
      this._surfboardService
        .syncOnboarding(this.selectedStoreId)
        .then((status) => {
          this.showNotification('Status: ' + status.applicationStatus);
          this.loadStore(this.selectedStoreId);
        })
        .catch(e => this.apiError(e, 'Kunne ikke synke status.'))
        .finally(() => {
          this.syncLoading = false;
        });
    },
    saveConfig () {
      this.savingConfig = true;
      this._storeService
        .UpdateSurfboardConfig(this.selectedStoreId, {
          surfboardEnabled: this.config.surfboardEnabled,
          merchantId: this.config.merchantId || '',
          storeExternalId: this.config.storeExternalId || '',
          onlineTerminalId: this.config.onlineTerminalId || '',
          webhookSecret: this.config.webhookSecret || '',
          cardEnabled: this.config.cardEnabled,
          vippsEnabled: this.config.vippsEnabled,
          mobilePayEnabled: this.config.mobilePayEnabled,
          swishEnabled: this.config.swishEnabled,
          klarnaEnabled: this.config.klarnaEnabled,
          commissionPercentage: Number(this.config.commissionPercentage) || 0,
          terminalCommissionPercentage: Number(this.config.terminalCommissionPercentage) || 0,
          woltDeliveryFeePercent: Number(this.config.woltDeliveryFeePercent) || 0,
          woltCustomerDeliveryFeeAmount: Number(this.config.woltCustomerDeliveryFeeAmount) || 0,
          woltServiceFeeAmount: Number(this.config.woltServiceFeeAmount) || 0
        })
        .then(() => this.showNotification('Konfigurasjon lagret.'))
        .catch(e => this.apiError(e, 'Lagring feilet.'))
        .finally(() => {
          this.savingConfig = false;
        });
    },
    loadTerminals () {
      if (!this.config.merchantId || !this.config.storeExternalId) { return; }
      this.isLoading = true;
      this._surfboardService
        .getStoreTerminals(this.config.merchantId, this.config.storeExternalId)
        .then((list) => {
          this.terminals = list || [];
        })
        .catch(e => this.apiError(e, 'Kunne ikke hente terminaler.'))
        .finally(() => {
          this.isLoading = false;
        });
    },
    doRegisterDevice () {
      this.registerLoading = true;
      this._surfboardService
        .registerDevice({
          merchantId: this.config.merchantId,
          storeExternalId: this.config.storeExternalId,
          registrationIdentifier: this.registerForm.registrationIdentifier,
          terminalName: this.registerForm.terminalName
        })
        .then((res) => {
          this.showNotification('Terminal registrert: ' + res.terminalId + ' (' + res.registrationStatus + ')');
          this.registerForm = { registrationIdentifier: '', terminalName: '' };
          this.loadTerminals();
        })
        .catch(e => this.apiError(e, 'Registrering feilet.'))
        .finally(() => {
          this.registerLoading = false;
        });
    },
    doActivate () {
      this.activateLoading = true;
      this._surfboardService
        .activateTerminal(this.activateSerial)
        .then(() => {
          this.showNotification('Terminal aktivert.');
          this.activateSerial = '';
          this.loadTerminals();
        })
        .catch(e => this.apiError(e, 'Aktivering feilet.'))
        .finally(() => {
          this.activateLoading = false;
        });
    }
  }
};
</script>

<style scoped>
.surfboard {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}
.surfboard__header {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.surfboard__title {
  font-size: 1.6rem;
  font-weight: 700;
}
.surfboard__intro {
  color: #6b7280;
  margin: 0.25rem 0 1.25rem;
}
.surfboard__tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.25rem;
}
.surfboard__tab {
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 2px solid transparent;
}
.surfboard__tab--active {
  color: #1bb776;
  border-bottom-color: #1bb776;
}
.surfboard__store-picker {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.surfboard__store-picker label {
  font-weight: 600;
}
.surfboard__section {
  background: #fff;
  border: 1px solid #eef0f2;
  border-radius: 12px;
  padding: 1.25rem;
}
.surfboard__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.sb-form {
  max-width: 560px;
}
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
}
.sb-row {
  display: flex;
  gap: 0.75rem;
}
.sb-grow {
  flex: 1;
}
.sb-inline {
  display: flex;
  gap: 0.5rem;
}
.sb-inline .form-control {
  flex: 1;
}
.sb-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
}
.sb-checks label,
.sb-check-line {
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
}
.btn-primary {
  background: #1bb776;
  color: #fff;
}
.btn-secondary {
  background: #eef2f1;
  color: #1f2937;
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
  margin-left: 0.4rem;
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
