<template>
  <AdminPage @login-success="handleLoginSuccess">
    <div class="sb">
      <!-- ============================ HEADER ============================ -->
      <header class="sb__head">
        <div>
          <h1 class="sb__title">
            Surfboard
          </h1>
          <p class="sb__intro">
            Onboard butikker som Surfboard-merchants, koble merchant- og store-ID-er til Okam-butikken,
            og registrer terminaler &mdash; alt uten Partner Portal.
          </p>
        </div>
        <Loading v-if="isLoading" :loading="true" />
      </header>

      <!-- ============================ TOAST ============================ -->
      <transition name="sb-toast">
        <div
          v-if="notification.show"
          class="sb__toast"
          :class="'sb__toast--' + notification.type"
        >
          {{ notification.message }}
        </div>
      </transition>

      <!-- ============================ TABS ============================ -->
      <nav class="sb-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="sb-tabs__tab"
          :class="{ 'is-active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <!-- ============================ STORE CONTEXT ============================ -->
      <div v-if="activeTab !== 'overview'" class="sb-context">
        <div class="sb-context__picker">
          <label>Okam-butikk</label>
          <div class="sb-select-wrap">
            <select
              v-model.number="selectedStoreId"
              class="sb-select"
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
        </div>

        <!-- Live status pills for the selected store -->
        <div v-if="storeSelected" class="sb-context__status">
          <span class="sb-pill" :class="isLive ? 'sb-pill--ok' : 'sb-pill--muted'">
            <span class="sb-dot" />{{ isLive ? 'Aktiv i kassa' : 'Ikke aktiv' }}
          </span>
          <span v-if="config.onboardingStatus" class="sb-pill" :class="onboardingPillClass">
            {{ config.onboardingStatus }}
          </span>
          <span class="sb-pill sb-pill--muted">
            {{ terminals.length }} terminal{{ terminals.length === 1 ? '' : 'er' }}
          </span>
        </div>
      </div>

      <!-- ============================ JOURNEY STEPPER ============================ -->
      <div v-if="storeSelected && activeTab !== 'overview'" class="sb-journey">
        <ol class="sb-steps">
          <li
            v-for="(step, i) in steps"
            :key="step.label"
            class="sb-steps__item"
            :class="'is-' + stepState(i)"
          >
            <span class="sb-steps__marker">
              <svg v-if="step.done" viewBox="0 0 24 24" width="14" height="14">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M5 12l4 4L19 7"
                />
              </svg>
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="sb-steps__label">{{ step.label }}</span>
          </li>
        </ol>
        <div v-if="nextAction" class="sb-journey__next">
          <span class="sb-journey__next-label">Neste steg</span>
          <button class="sb-btn sb-btn--primary" @click="activeTab = nextAction.tab">
            {{ nextAction.label }}
          </button>
        </div>
        <div v-else class="sb-journey__done">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M5 12l4 4L19 7"
            />
          </svg>
          Butikken er ferdig satt opp og aktiv i kassa.
        </div>
      </div>

      <!-- ============================ OVERVIEW ============================ -->
      <section v-if="activeTab === 'overview'">
        <div class="sb-stats">
          <div class="sb-stat">
            <span class="sb-stat__value">{{ merchants.length }}</span>
            <span class="sb-stat__label">Merchants</span>
          </div>
          <div class="sb-stat">
            <span class="sb-stat__value">{{ openApplications }}</span>
            <span class="sb-stat__label">Åpne søknader</span>
          </div>
          <div class="sb-stat sb-stat--action">
            <button class="sb-btn sb-btn--ghost" :disabled="isLoading" @click="loadOverview">
              Oppdater
            </button>
          </div>
        </div>

        <div class="sb-card">
          <div class="sb-card__head">
            <div class="sb-card__title-wrap">
              <span class="sb-card__icon">
                <svg viewBox="0 0 24 24" width="18" height="18"><path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 21V7l6-4 6 4v14M9 21v-4h4v4M15 21h6V11l-6-4"
                /></svg>
              </span>
              <div>
                <h2 class="sb-card__title">
                  Merchants
                </h2>
                <p class="sb-card__sub">
                  Alle virksomheter opprettet under Okam-partneren.
                </p>
              </div>
            </div>
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
                    Ingen merchants ennå.
                  </td>
                </tr>
                <tr v-for="m in merchants" :key="m.merchantId">
                  <td class="sb-strong">
                    {{ m.merchantName }}
                  </td>
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
        </div>

        <div class="sb-card">
          <div class="sb-card__head">
            <div class="sb-card__title-wrap">
              <span class="sb-card__icon">
                <svg viewBox="0 0 24 24" width="18" height="18"><path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h5"
                /></svg>
              </span>
              <div>
                <h2 class="sb-card__title">
                  Søknader (KYB)
                </h2>
                <p class="sb-card__sub">
                  Onboarding-søknader som venter på utfylling eller signering.
                </p>
              </div>
            </div>
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
                    <a v-if="a.webKybUrl" class="sb-link" :href="a.webKybUrl" target="_blank" rel="noopener">Åpne &rarr;</a>
                    <span v-else class="sb-muted">&mdash;</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ============================ ONBOARDING ============================ -->
      <section v-else-if="activeTab === 'onboarding'">
        <template v-if="storeSelected">
          <div class="sb-card">
            <div class="sb-card__head">
              <div class="sb-card__title-wrap">
                <span class="sb-card__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18"><path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M22 2L11 13M22 2l-7 20-4-9-9-4z"
                  /></svg>
                </span>
                <div>
                  <h2 class="sb-card__title">
                    Onboard butikk som ny merchant
                  </h2>
                  <p class="sb-card__sub">
                    Feltene er forhåndsutfylt fra Okam-butikken. Send inn, del KYB-lenken med butikken,
                    og hent merchant-/store-ID med &laquo;Synk status&raquo; når den er signert.
                  </p>
                </div>
              </div>
            </div>

            <div class="sb-fieldset">
              <h3 class="sb-fieldset__legend">
                Foretak
              </h3>
              <div class="sb-grid">
                <div class="sb-field">
                  <label>Org.nr</label>
                  <div class="sb-inline">
                    <input v-model="onboardForm.corporateId" class="sb-input" type="text">
                    <button class="sb-btn sb-btn--subtle" :disabled="brregLoading" @click="fetchBrreg">
                      {{ brregLoading ? 'Henter&hellip;' : 'Hent fra Brreg' }}
                    </button>
                  </div>
                </div>
                <div class="sb-field">
                  <label>Juridisk navn</label>
                  <input v-model="onboardForm.legalName" class="sb-input" type="text">
                </div>
              </div>
            </div>

            <div class="sb-fieldset">
              <h3 class="sb-fieldset__legend">
                Kontakt
              </h3>
              <div class="sb-grid">
                <div class="sb-field sb-field--full">
                  <label>E-post</label>
                  <input v-model="onboardForm.email" class="sb-input" type="email">
                </div>
                <div class="sb-field">
                  <label>Landkode</label>
                  <input v-model="onboardForm.phoneCode" class="sb-input" type="text" placeholder="47">
                </div>
                <div class="sb-field">
                  <label>Telefon</label>
                  <input v-model="onboardForm.phoneNumber" class="sb-input" type="text">
                </div>
                <div class="sb-field sb-field--full">
                  <label>Adresse</label>
                  <input v-model="onboardForm.addressLine1" class="sb-input" type="text">
                </div>
                <div class="sb-field">
                  <label>Postnr</label>
                  <input v-model="onboardForm.postalCode" class="sb-input" type="text">
                </div>
                <div class="sb-field">
                  <label>Poststed</label>
                  <input v-model="onboardForm.city" class="sb-input" type="text">
                </div>
                <div class="sb-field sb-field--full">
                  <label>Store-navn</label>
                  <input v-model="onboardForm.storeName" class="sb-input" type="text">
                </div>
              </div>
            </div>

            <div class="sb-fieldset">
              <h3 class="sb-fieldset__legend">
                Betalingsmetoder
              </h3>
              <div class="sb-chips">
                <label class="sb-chip" :class="{ 'is-on': onboardForm.cardEnabled }"><input v-model="onboardForm.cardEnabled" type="checkbox"> Kort</label>
                <label class="sb-chip" :class="{ 'is-on': onboardForm.vippsEnabled }"><input v-model="onboardForm.vippsEnabled" type="checkbox"> Vipps</label>
                <label class="sb-chip" :class="{ 'is-on': onboardForm.mobilePayEnabled }"><input v-model="onboardForm.mobilePayEnabled" type="checkbox"> MobilePay</label>
                <label class="sb-chip" :class="{ 'is-on': onboardForm.swishEnabled }"><input v-model="onboardForm.swishEnabled" type="checkbox"> Swish</label>
                <label class="sb-chip" :class="{ 'is-on': onboardForm.klarnaEnabled }"><input v-model="onboardForm.klarnaEnabled" type="checkbox"> Klarna</label>
              </div>
            </div>

            <div class="sb-fieldset">
              <label class="sb-toggle">
                <input v-model="onboardForm.includeOnline" type="checkbox">
                <span class="sb-toggle__track"><span class="sb-toggle__thumb" /></span>
                <span>
                  <strong>Aktiver online</strong>
                  <small>Nettbetaling / PaymentPage for butikken.</small>
                </span>
              </label>
              <div v-if="onboardForm.includeOnline" class="sb-grid sb-grid--indent">
                <div class="sb-field sb-field--full">
                  <label>Nettbutikk-URL</label>
                  <input v-model="onboardForm.merchantWebshopUrl" class="sb-input" type="text">
                </div>
                <div class="sb-field sb-field--full">
                  <label>Vilkår-URL</label>
                  <input v-model="onboardForm.termsAndConditionsUrl" class="sb-input" type="text">
                </div>
                <div class="sb-field sb-field--full">
                  <label>Personvern-URL</label>
                  <input v-model="onboardForm.privacyPolicyUrl" class="sb-input" type="text">
                </div>
              </div>
            </div>

            <div class="sb-card__foot">
              <button class="sb-btn sb-btn--primary" :disabled="onboardLoading" @click="doOnboard">
                {{ onboardLoading ? "Sender inn&hellip;" : "Opprett merchant-søknad" }}
              </button>
            </div>
          </div>

          <div v-if="onboardResult" class="sb-result">
            <div class="sb-result__row">
              <span class="sb-result__label">Application ID</span>
              <span class="sb-mono">{{ onboardResult.applicationId }}</span>
            </div>
            <div v-if="onboardResult.webKybUrl" class="sb-result__row">
              <span class="sb-result__label">KYB-lenke</span>
              <a class="sb-link" :href="onboardResult.webKybUrl" target="_blank" rel="noopener">{{ onboardResult.webKybUrl }}</a>
            </div>
            <div class="sb-result__foot">
              <button class="sb-btn sb-btn--subtle" :disabled="syncLoading" @click="doSync">
                {{ syncLoading ? 'Synker&hellip;' : 'Synk status' }}
              </button>
              <span v-if="config.onboardingStatus" :class="statusClass(config.onboardingStatus)">{{ config.onboardingStatus }}</span>
            </div>
          </div>
        </template>
        <div v-else class="sb-empty-state">
          Velg en Okam-butikk øverst for å starte onboarding.
        </div>
      </section>

      <!-- ============================ CONFIG ============================ -->
      <section v-else-if="activeTab === 'config'">
        <template v-if="storeSelected">
          <div v-if="config.applicationId || config.onboardingStatus" class="sb-result">
            <div class="sb-result__row">
              <span class="sb-result__label">Onboarding-søknad</span>
              <span class="sb-mono">{{ config.applicationId || "&mdash;" }}</span>
              <span v-if="config.onboardingStatus" :class="statusClass(config.onboardingStatus)">{{ config.onboardingStatus }}</span>
            </div>
            <div class="sb-result__foot">
              <button class="sb-btn sb-btn--subtle" :disabled="syncLoading" @click="doSync">
                {{ syncLoading ? 'Henter&hellip;' : 'Hent ID-er fra Surfboard' }}
              </button>
            </div>
          </div>

          <div class="sb-card">
            <div class="sb-card__head">
              <div class="sb-card__title-wrap">
                <span class="sb-card__icon">
                  <svg viewBox="0 0 24 24" width="18" height="18"><path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M4 6h16M4 12h16M4 18h16M8 6v0M14 12v0M10 18v0"
                  /><circle cx="8" cy="6" r="2" fill="currentColor" /><circle cx="14" cy="12" r="2" fill="currentColor" /><circle cx="10" cy="18" r="2" fill="currentColor" /></svg>
                </span>
                <div>
                  <h2 class="sb-card__title">
                    Butikk-konfigurasjon
                  </h2>
                  <p class="sb-card__sub">
                    Slå på Surfboard, velg betalingsmetoder og sett kommisjon for butikken.
                  </p>
                </div>
              </div>
            </div>

            <div class="sb-fieldset">
              <label class="sb-toggle">
                <input v-model="config.surfboardEnabled" type="checkbox">
                <span class="sb-toggle__track"><span class="sb-toggle__thumb" /></span>
                <span>
                  <strong>Surfboard aktivert for butikken</strong>
                  <small>Gjør Surfboard tilgjengelig som betaling i kassa.</small>
                </span>
              </label>
            </div>

            <div class="sb-fieldset">
              <h3 class="sb-fieldset__legend">
                Betalingsmetoder
              </h3>
              <div class="sb-chips">
                <label class="sb-chip" :class="{ 'is-on': config.cardEnabled }"><input v-model="config.cardEnabled" type="checkbox"> Kort</label>
                <label class="sb-chip" :class="{ 'is-on': config.vippsEnabled }"><input v-model="config.vippsEnabled" type="checkbox"> Vipps</label>
                <label class="sb-chip" :class="{ 'is-on': config.mobilePayEnabled }"><input v-model="config.mobilePayEnabled" type="checkbox"> MobilePay</label>
                <label class="sb-chip" :class="{ 'is-on': config.swishEnabled }"><input v-model="config.swishEnabled" type="checkbox"> Swish</label>
                <label class="sb-chip" :class="{ 'is-on': config.klarnaEnabled }"><input v-model="config.klarnaEnabled" type="checkbox"> Klarna</label>
              </div>
            </div>

            <div class="sb-fieldset">
              <label class="sb-toggle">
                <input v-model="config.partialPaymentsEnabled" type="checkbox">
                <span class="sb-toggle__track"><span class="sb-toggle__thumb" /></span>
                <span>
                  <strong>Delbetaling på terminal</strong>
                  <!-- Rollout-port: én Surfboard-ordre per regning + én betaling per porsjon. Skru
                       først på etter bestått fysisk terminaltest for butikken. -->
                  <small>Splittet regning. Skru først på etter bestått fysisk terminaltest.</small>
                </span>
              </label>
            </div>

            <div class="sb-fieldset">
              <h3 class="sb-fieldset__legend">
                Kommisjon
              </h3>
              <div class="sb-grid">
                <div class="sb-field">
                  <label>Online (%)</label>
                  <input v-model.number="config.commissionPercentage" class="sb-input" type="number" step="0.01">
                </div>
                <div class="sb-field">
                  <label>Terminal (%)</label>
                  <input v-model.number="config.terminalCommissionPercentage" class="sb-input" type="number" step="0.01">
                </div>
              </div>
            </div>

            <details class="sb-advanced">
              <summary>Tekniske ID-er</summary>
              <p class="sb-advanced__hint">
                Fylles vanligvis automatisk av &laquo;Hent ID-er fra Surfboard&raquo;. Rediger kun manuelt ved behov.
              </p>
              <div class="sb-grid">
                <div class="sb-field">
                  <label>Merchant ID</label>
                  <input v-model="config.merchantId" class="sb-input sb-input--mono" type="text">
                </div>
                <div class="sb-field">
                  <label>Store ID (Surfboard)</label>
                  <input v-model="config.storeExternalId" class="sb-input sb-input--mono" type="text">
                </div>
                <div class="sb-field">
                  <label>Online terminal-ID (PaymentPage)</label>
                  <input v-model="config.onlineTerminalId" class="sb-input sb-input--mono" type="text">
                </div>
                <div class="sb-field">
                  <label>Webhook-secret</label>
                  <input v-model="config.webhookSecret" class="sb-input sb-input--mono" type="text">
                </div>
              </div>
            </details>

            <div class="sb-card__foot">
              <button class="sb-btn sb-btn--primary" :disabled="savingConfig" @click="saveConfig">
                {{ savingConfig ? "Lagrer&hellip;" : "Lagre konfigurasjon" }}
              </button>
            </div>
          </div>
        </template>
        <div v-else class="sb-empty-state">
          Velg en Okam-butikk øverst for å se konfigurasjon.
        </div>
      </section>

      <!-- ============================ TERMINALS ============================ -->
      <section v-else-if="activeTab === 'terminals'">
        <template v-if="storeSelected">
          <template v-if="config.merchantId && config.storeExternalId">
            <!-- Onboard a terminal Surfboard shipped directly to the store, by serial number -->
            <div class="sb-card">
              <div class="sb-card__head">
                <div class="sb-card__title-wrap">
                  <span class="sb-card__icon">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M3 9l9-6 9 6v9a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 9l9 6 9-6"
                    /></svg>
                  </span>
                  <div>
                    <h2 class="sb-card__title">
                      Terminal sendt direkte til butikk
                    </h2>
                    <p class="sb-card__sub">
                      Fikk butikken en terminal i posten fra Surfboard? Skriv inn serienummeret fra esken,
                      så tildeler, registrerer og kobler vi den til et kassapunkt i ett steg &mdash; uten Partner Portal.
                    </p>
                  </div>
                </div>
              </div>

              <div class="sb-grid">
                <div class="sb-field">
                  <label>Serienummer</label>
                  <input v-model="shipForm.serialNo" class="sb-input" type="text" placeholder="f.eks. NDD500101170">
                </div>
                <div class="sb-field">
                  <label>Terminal-navn (valgfritt)</label>
                  <input v-model="shipForm.terminalName" class="sb-input" type="text" placeholder="f.eks. Kasse 1">
                </div>
                <div class="sb-field sb-field--full">
                  <label>Bind til kassapunkt (valgfritt)</label>
                  <div class="sb-select-wrap">
                    <select v-model.number="shipForm.cashPointId" class="sb-select" style="min-width: 100%">
                      <option :value="0">
                        Ikke bind &mdash; gjør det senere i POS-innstillinger
                      </option>
                      <option
                        v-for="cp in cashPoints"
                        :key="cp.cashPointId"
                        :value="cp.cashPointId"
                      >
                        {{ cp.name || cp.registerId }}{{ cp.surfboardTerminalId ? ' (har alt en terminal)' : '' }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="sb-card__foot">
                <button class="sb-btn sb-btn--primary" :disabled="shipLoading || !shipForm.serialNo" @click="onboardBySerial">
                  {{ shipLoading ? 'Onboarder&hellip;' : 'Onboard terminal' }}
                </button>
              </div>
            </div>

            <div class="sb-card">
              <div class="sb-card__head">
                <div class="sb-card__title-wrap">
                  <span class="sb-card__icon">
                    <svg viewBox="0 0 24 24" width="18" height="18"><rect
                      x="4"
                      y="2"
                      width="16"
                      height="20"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                    /><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M8 6h8M8 10h8" /><rect
                      x="8"
                      y="14"
                      width="8"
                      height="4"
                      rx="1"
                      fill="currentColor"
                    /></svg>
                  </span>
                  <div>
                    <h2 class="sb-card__title">
                      Registrer ny terminal
                    </h2>
                    <p class="sb-card__sub">
                      Følg stegene og skriv koden inn på terminalen.
                    </p>
                  </div>
                </div>
              </div>

              <ol class="sb-guide">
                <li>Skru på terminalen og la den stå på &laquo;Register terminal&raquo;-skjermen.</li>
                <li>Trykk <strong>Generer kode</strong> under.</li>
                <li>Skriv koden inn i de <strong>tomme feltene øverst</strong> på terminalskjermen.</li>
              </ol>
              <p class="sb-note">
                Ikke bruk koden terminalen selv viser nederst &mdash; den registreringsmåten avvises for de
                fleste terminaler (&laquo;TM_0011&raquo;).
              </p>

              <div v-if="!regCode" class="sb-card__foot">
                <button class="sb-btn sb-btn--primary" :disabled="regCodeLoading" @click="generateRegCode">
                  {{ regCodeLoading ? "Henter kode&hellip;" : "Generer kode" }}
                </button>
              </div>

              <div v-else class="sb-code-card">
                <p class="sb-code-label">
                  Skriv denne koden på terminalen
                </p>
                <p class="sb-code">
                  {{ regCode.registrationCode }}
                </p>
                <div v-if="regCode.registrationLink" class="sb-code-qr">
                  <vue-qrcode
                    :value="regCode.registrationLink"
                    :options="{ width: 170, margin: 1 }"
                  />
                  <p class="sb-code-label">
                    &hellip;eller skann denne med terminalens kamera
                  </p>
                </div>
                <p :class="['sb-code-expiry', { 'sb-code-expiry--dead': regCodeSeconds <= 0 }]">
                  <template v-if="regCodeSeconds > 0">
                    Utløper om {{ regCodeSeconds }} s
                  </template>
                  <template v-else>
                    Koden er utløpt &mdash; generer en ny.
                  </template>
                </p>
                <div class="sb-code-actions">
                  <button class="sb-btn sb-btn--primary" :disabled="regCodeLoading" @click="generateRegCode">
                    Generer ny kode
                  </button>
                  <button class="sb-btn sb-btn--subtle" @click="loadTerminals">
                    Sjekk om terminalen kom inn
                  </button>
                </div>
              </div>

              <details class="sb-advanced">
                <summary>Andre registreringsmåter</summary>
                <p class="sb-advanced__hint">
                  Kun for terminaler som krever det: SurfPad/SurfPrint registreres med serienummeret på
                  baksiden, og terminaler fra eget partner-lager aktiveres før bruk.
                </p>
                <div class="sb-grid">
                  <div class="sb-field">
                    <label>Registrerings-ID / serienr</label>
                    <input v-model="registerForm.registrationIdentifier" class="sb-input" type="text">
                  </div>
                  <div class="sb-field">
                    <label>Terminal-navn</label>
                    <input v-model="registerForm.terminalName" class="sb-input" type="text">
                  </div>
                </div>
                <div class="sb-advanced__actions">
                  <button class="sb-btn sb-btn--subtle" :disabled="registerLoading" @click="doRegisterDevice">
                    Registrer med serienr
                  </button>
                </div>
                <div class="sb-grid sb-grid--spaced">
                  <div class="sb-field">
                    <label>Aktiver fra partner-lager (serienr)</label>
                    <input v-model="activateSerial" class="sb-input" type="text">
                  </div>
                </div>
                <div class="sb-advanced__actions">
                  <button class="sb-btn sb-btn--subtle" :disabled="activateLoading" @click="doActivate">
                    Aktiver
                  </button>
                </div>
              </details>
            </div>

            <!-- Test terminal -->
            <div class="sb-card">
              <div class="sb-card__head">
                <div class="sb-card__title-wrap">
                  <span class="sb-card__icon">
                    <svg viewBox="0 0 24 24" width="18" height="18"><path
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M5 13l4 4L19 7"
                    /></svg>
                  </span>
                  <div>
                    <h2 class="sb-card__title">
                      Test terminal
                    </h2>
                    <p class="sb-card__sub">
                      Send en ekte kort-testbetaling til en terminal for å bekrefte at den virker. Ingen
                      Okam-ordre eller kvittering opprettes &mdash; beløpet trekkes på kortet, så annuller etterpå.
                    </p>
                  </div>
                </div>
              </div>

              <div class="sb-grid">
                <div class="sb-field">
                  <label>Terminal</label>
                  <div class="sb-select-wrap">
                    <select v-model="testForm.terminalId" class="sb-select" style="min-width: 100%">
                      <option value="">
                        Velg terminal&hellip;
                      </option>
                      <option
                        v-for="t in terminals"
                        :key="t.terminalId"
                        :value="t.terminalId"
                      >
                        {{ t.terminalName || t.terminalType || t.terminalId }} ({{ t.terminalType }})
                      </option>
                    </select>
                  </div>
                </div>
                <div class="sb-field">
                  <label>Beløp (kr)</label>
                  <input v-model.number="testForm.amountKr" class="sb-input" type="number" min="1" step="1">
                </div>
              </div>

              <div class="sb-card__foot">
                <button class="sb-btn sb-btn--primary" :disabled="testLoading || !testForm.terminalId" @click="startTest">
                  {{ testLoading ? 'Sender til terminal&hellip;' : 'Send testbetaling' }}
                </button>
              </div>

              <div v-if="testResult" class="sb-result">
                <div class="sb-result__row">
                  <span class="sb-result__label">Testbetaling</span>
                  <span>{{ (testResult.amount / 100).toFixed(2) }} kr</span>
                  <span :class="testStateBadgeClass">{{ testStateLabel }}</span>
                </div>
                <div v-if="testStatus && testStatus.isCompleted" class="sb-result__row">
                  <span class="sb-result__label">Trukket</span>
                  <span>{{ (testStatus.capturedAmount / 100).toFixed(2) }} kr</span>
                </div>
                <p class="sb-note" style="margin-top: 4px">
                  {{ testHint }}
                </p>
                <div class="sb-result__foot">
                  <button
                    v-if="!testDone || (testStatus && testStatus.isCompleted)"
                    class="sb-btn sb-btn--subtle"
                    :disabled="testCancelLoading"
                    @click="cancelTest"
                  >
                    {{ testCancelLoading ? 'Annullerer&hellip;' : (testStatus && testStatus.isCompleted ? 'Annuller / krediter' : 'Avbryt') }}
                  </button>
                  <button class="sb-btn sb-btn--ghost" @click="resetTest">
                    Ny test
                  </button>
                </div>
              </div>
            </div>

            <div class="sb-card">
              <div class="sb-card__head">
                <div class="sb-card__title-wrap">
                  <div>
                    <h2 class="sb-card__title">
                      Terminaler
                    </h2>
                    <p class="sb-card__sub">
                      Registrerte terminaler for denne butikken.
                    </p>
                  </div>
                </div>
                <button class="sb-btn sb-btn--ghost" @click="loadTerminals">
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
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!terminals.length">
                      <td colspan="6" class="sb-empty">
                        Ingen terminaler ennå.
                      </td>
                    </tr>
                    <tr v-for="t in terminals" :key="t.terminalId">
                      <td class="sb-strong">
                        {{ t.terminalName }}
                      </td>
                      <td>{{ t.terminalType }}</td>
                      <td><span :class="statusClass(t.terminalStatus)">{{ t.terminalStatus }}</span></td>
                      <td>{{ t.serialNo }}</td>
                      <td class="sb-mono">
                        {{ t.terminalId }}
                      </td>
                      <td>
                        <button class="sb-btn sb-btn--ghost sb-btn--sm" @click="pickTestTerminal(t)">
                          Test
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
          <div v-else class="sb-empty-state">
            Butikken mangler merchant-/store-ID. Fullfør onboarding og trykk
            &laquo;Hent ID-er fra Surfboard&raquo; under Butikk-konfig først.
          </div>
        </template>
        <div v-else class="sb-empty-state">
          Velg en Okam-butikk øverst for å administrere terminaler.
        </div>
      </section>
    </div>
  </AdminPage>
</template>

<script>
import VueQrcode from '@chenfengyuan/vue-qrcode';
import AdminPage from '~/components/organisms/AdminPage.vue';
import Loading from '~/components/atoms/Loading.vue';

export default {
  components: {
    AdminPage,
    Loading,
    VueQrcode
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
      regCode: null,
      regCodeLoading: false,
      regCodeSeconds: 0,
      regCodeTimer: null,
      registerLoading: false,
      activateSerial: '',
      activateLoading: false,
      testForm: { terminalId: '', amountKr: 10 },
      testResult: null,
      testStatus: null,
      testLoading: false,
      testCancelLoading: false,
      testTimer: null,
      cashPoints: [],
      shipForm: { serialNo: '', terminalName: '', cashPointId: 0 },
      shipLoading: false
    };
  },
  computed: {
    storeSelected () {
      return this.selectedStoreId > 0;
    },
    openApplications () {
      return this.applications.filter((a) => {
        const s = (a.applicationStatus || '').toUpperCase();
        return s !== 'MERCHANT_CREATED' && s !== 'APPLICATION_COMPLETED' &&
          s !== 'APPLICATION_REJECTED' && s !== 'APPLICATION_EXPIRED';
      }).length;
    },
    isLive () {
      return !!this.config.surfboardEnabled;
    },
    onboardingComplete () {
      const s = (this.config.onboardingStatus || '').toUpperCase();
      return s === 'MERCHANT_CREATED' || s === 'APPLICATION_COMPLETED' || s === 'ACTIVE';
    },
    idsLinked () {
      return !!(this.config.merchantId && this.config.storeExternalId);
    },
    onboardingPillClass () {
      return this.onboardingComplete ? 'sb-pill--ok' : 'sb-pill--warn';
    },
    // The five-stage journey a store passes through, from application to live in the POS. Drives both
    // the stepper and the "next action" CTA so the power user always sees where a store stands.
    steps () {
      return [
        { label: 'Søknad sendt', done: !!this.config.applicationId, tab: 'onboarding' },
        { label: 'KYB fullført', done: this.onboardingComplete, tab: 'onboarding' },
        { label: 'ID-er koblet', done: this.idsLinked, tab: 'config' },
        { label: 'Terminal registrert', done: this.terminals.length > 0, tab: 'terminals' },
        { label: 'Aktiv i kassa', done: this.isLive, tab: 'config' }
      ];
    },
    nextAction () {
      const labels = {
        'Søknad sendt': 'Start onboarding',
        'KYB fullført': 'Del KYB-lenke / synk status',
        'ID-er koblet': 'Hent ID-er fra Surfboard',
        'Terminal registrert': 'Registrer terminal',
        'Aktiv i kassa': 'Aktiver i kassa'
      };
      const next = this.steps.find(s => !s.done);
      return next ? { label: labels[next.label], tab: next.tab } : null;
    },
    testDone () {
      return !!(this.testStatus && (this.testStatus.isCompleted || this.testStatus.isFailed || this.testStatus.isCancelled));
    },
    testStateLabel () {
      if (!this.testStatus) { return 'Venter på kort…'; }
      if (this.testStatus.isCompleted) { return 'Godkjent'; }
      if (this.testStatus.isFailed) { return 'Feilet'; }
      if (this.testStatus.isCancelled) { return 'Avbrutt'; }
      return this.testStatus.effectiveStatus || 'Behandler…';
    },
    testStateBadgeClass () {
      if (this.testStatus && this.testStatus.isCompleted) { return 'sb-badge sb-badge--ok'; }
      if (this.testStatus && (this.testStatus.isFailed || this.testStatus.isCancelled)) { return 'sb-badge sb-badge--bad'; }
      return 'sb-badge';
    },
    testHint () {
      if (this.testStatus && this.testStatus.isCompleted) {
        return 'Terminalen virker. Kortet ble trukket — annuller for å kreditere beløpet tilbake.';
      }
      if (this.testStatus && this.testStatus.isFailed) { return 'Betalingen feilet på terminalen.'; }
      if (this.testStatus && this.testStatus.isCancelled) { return 'Betalingen ble avbrutt.'; }
      return 'Tapp kortet på terminalen for å fullføre testen.';
    }
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
  beforeDestroy () {
    this.clearRegCodeTimer();
    this.stopTestPolling();
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
        partialPaymentsEnabled: false,
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
    // The pairing code Surfboard issues is short-lived; the countdown mirrors the terminal's own
    // 90-second window so an expired code is obvious instead of failing silently on the terminal.
    generateRegCode () {
      this.regCodeLoading = true;
      this._surfboardService
        .getDeviceRegistrationCode(this.config.merchantId, this.config.storeExternalId)
        .then((code) => {
          this.regCode = code;
          this.startRegCodeCountdown();
        })
        .catch(e => this.apiError(e, 'Kunne ikke generere registreringskode.'))
        .finally(() => {
          this.regCodeLoading = false;
        });
    },
    startRegCodeCountdown () {
      this.clearRegCodeTimer();
      this.regCodeSeconds = 90;
      this.regCodeTimer = setInterval(() => {
        this.regCodeSeconds -= 1;
        if (this.regCodeSeconds <= 0) { this.clearRegCodeTimer(); }
      }, 1000);
    },
    clearRegCodeTimer () {
      if (this.regCodeTimer) {
        clearInterval(this.regCodeTimer);
        this.regCodeTimer = null;
      }
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
    stepState (i) {
      if (this.steps[i].done) { return 'done'; }
      if (this.steps.findIndex(s => !s.done) === i) { return 'current'; }
      return 'todo';
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
      // Prefill the onboarding form from the Okam store. The online webshop/terms/privacy URLs are
      // Okam's standard pages (privacy is shared; the webshop and store terms carry the Okam store id).
      this.onboardForm = Object.assign(this.emptyOnboardForm(), {
        corporateId: store && store.vat ? String(store.vat) : '',
        legalName: store ? store.name : '',
        storeName: store ? store.name : '',
        merchantWebshopUrl: 'https://shop.okam.no/shop?id=' + storeId,
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
          // Load terminals up front when the store already has its IDs, so the journey stepper and
          // status pills reflect terminal state on every tab (not only after opening Terminaler).
          if (this.config.merchantId && this.config.storeExternalId) {
            this.loadTerminals();
          }
          // Cash points feed the "bind to cash point" selector in serial onboarding.
          this._cashPointService.GetForStore(storeId)
            .then((list) => { this.cashPoints = list || []; })
            .catch(() => { this.cashPoints = []; });
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
          partialPaymentsEnabled: this.config.partialPaymentsEnabled,
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
    },
    pickTestTerminal (t) {
      this.testForm.terminalId = t.terminalId;
      this.resetTest();
    },
    startTest () {
      const amount = Math.round((this.testForm.amountKr || 0) * 100);
      if (!this.testForm.terminalId) {
        this.showNotification('Velg en terminal.', 'error');
        return;
      }
      if (amount <= 0) {
        this.showNotification('Beløpet må være større enn 0.', 'error');
        return;
      }
      this.testLoading = true;
      this.testStatus = null;
      this._surfboardService
        .startTestPayment(this.config.merchantId, this.testForm.terminalId, { amount, currency: 'NOK', message: 'Terminaltest' })
        .then((result) => {
          this.testResult = result;
          this.startTestPolling();
        })
        .catch(e => this.apiError(e, 'Kunne ikke starte testbetaling.'))
        .finally(() => {
          this.testLoading = false;
        });
    },
    startTestPolling () {
      this.stopTestPolling();
      this.pollTestStatus();
      this.testTimer = setInterval(this.pollTestStatus, 2000);
    },
    stopTestPolling () {
      if (this.testTimer) {
        clearInterval(this.testTimer);
        this.testTimer = null;
      }
    },
    pollTestStatus () {
      if (!this.testResult) { return; }
      this._surfboardService
        .getTestPaymentStatus(this.config.merchantId, this.testResult.orderId)
        .then((status) => {
          this.testStatus = status;
          if (status.isCompleted || status.isFailed || status.isCancelled) {
            this.stopTestPolling();
            this.loadTerminals();
          }
        })
        // A transient read must not kill the loop; the next tick retries.
        .catch(() => {});
    },
    cancelTest () {
      if (!this.testResult) { return; }
      this.testCancelLoading = true;
      this._surfboardService
        .cancelTestPayment(this.config.merchantId, this.testResult.paymentId)
        .then((res) => {
          this.showNotification(res.action === 'VOIDED' ? 'Testbetaling annullert (kreditert).' : 'Testbetaling avbrutt.');
          this.stopTestPolling();
          this.pollTestStatus();
        })
        .catch(e => this.apiError(e, 'Kunne ikke annullere testbetaling.'))
        .finally(() => {
          this.testCancelLoading = false;
        });
    },
    resetTest () {
      this.stopTestPolling();
      this.testResult = null;
      this.testStatus = null;
    },
    onboardBySerial () {
      const serialNo = (this.shipForm.serialNo || '').trim();
      if (!serialNo) {
        this.showNotification('Skriv inn serienummeret.', 'error');
        return;
      }
      this.shipLoading = true;
      this._surfboardService
        .onboardTerminalBySerial(this.selectedStoreId, {
          serialNo,
          terminalName: this.shipForm.terminalName || '',
          cashPointId: this.shipForm.cashPointId > 0 ? this.shipForm.cashPointId : undefined
        })
        .then((res) => {
          const bound = res.cashPointBound ? ' og bundet til kassapunkt' : '';
          this.showNotification('Terminal onboardet: ' + res.terminalId + bound + '.');
          this.shipForm = { serialNo: '', terminalName: '', cashPointId: 0 };
          this.loadTerminals();
          this.loadStore(this.selectedStoreId);
        })
        .catch(e => this.apiError(e, 'Onboarding av terminal feilet.'))
        .finally(() => {
          this.shipLoading = false;
        });
    }
  }
};
</script>

<style scoped>
.sb {
  max-width: 1040px;
  margin: 0 auto;
  padding: 24px;
}

/* ---------- Header ---------- */
.sb__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 20px;
}
.sb__title {
  font-size: 1.9rem;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 6px;
}
.sb__intro {
  color: #64748b;
  margin: 0;
  max-width: 620px;
  line-height: 1.5;
}

/* ---------- Toast ---------- */
.sb__toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.sb__toast--success { background: #159f63; }
.sb__toast--error { background: #ef4444; }
.sb-toast-enter-active, .sb-toast-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.sb-toast-enter, .sb-toast-leave-to { opacity: 0; transform: translateY(-8px); }

/* ---------- Tabs ---------- */
.sb-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.sb-tabs__tab {
  border: none;
  background: none;
  padding: 10px 16px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.sb-tabs__tab:hover { color: #292c34; }
.sb-tabs__tab.is-active { color: #159f63; border-bottom-color: #1bb776; }

/* ---------- Store context bar ---------- */
.sb-context {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.sb-context__picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sb-context__picker label {
  font-weight: 600;
  font-size: 0.85rem;
  color: #475569;
}
.sb-select-wrap { position: relative; }
.sb-select {
  min-width: 260px;
  padding: 0.6rem 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #fff;
}
.sb-context__status {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.sb-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  background: #f1f5f9;
  color: #475569;
}
.sb-pill--ok { background: #dcfce7; color: #166534; }
.sb-pill--warn { background: #fef3c7; color: #92400e; }
.sb-pill--muted { background: #f1f5f9; color: #64748b; }
.sb-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

/* ---------- Journey stepper ---------- */
.sb-journey {
  background: #fff;
  border: 1px solid #eef0f2;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06);
}
.sb-steps {
  list-style: none;
  display: flex;
  gap: 4px;
  padding: 0;
  margin: 0 0 16px;
  flex-wrap: wrap;
}
.sb-steps__item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 140px;
  position: relative;
}
.sb-steps__item:not(:last-child)::after {
  content: "";
  flex: 1;
  height: 2px;
  background: #e2e8f0;
  margin-left: 4px;
}
.sb-steps__item.is-done:not(:last-child)::after { background: #1bb776; }
.sb-steps__marker {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  background: #f1f5f9;
  color: #94a3b8;
  border: 2px solid #e2e8f0;
}
.sb-steps__item.is-done .sb-steps__marker {
  background: #1bb776;
  border-color: #1bb776;
  color: #fff;
}
.sb-steps__item.is-current .sb-steps__marker {
  background: #fff;
  border-color: #1bb776;
  color: #159f63;
  box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.15);
}
.sb-steps__label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}
.sb-steps__item.is-done .sb-steps__label,
.sb-steps__item.is-current .sb-steps__label { color: #292c34; }
.sb-journey__next {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
}
.sb-journey__next-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #94a3b8;
}
.sb-journey__done {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
  color: #166534;
  font-weight: 600;
}

/* ---------- Stat tiles (overview) ---------- */
.sb-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.sb-stat {
  background: #fff;
  border: 1px solid #eef0f2;
  border-radius: 12px;
  padding: 16px 20px;
  min-width: 140px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
}
.sb-stat__value {
  display: block;
  font-size: 1.7rem;
  font-weight: 700;
  color: #292c34;
  line-height: 1.1;
}
.sb-stat__label {
  font-size: 0.82rem;
  color: #64748b;
  font-weight: 600;
}
.sb-stat--action {
  display: flex;
  align-items: center;
  margin-left: auto;
  box-shadow: none;
  border: none;
  background: transparent;
  padding: 0;
}

/* ---------- Cards ---------- */
.sb-card {
  background: #fff;
  border: 1px solid #eef0f2;
  border-radius: 12px;
  padding: 20px 22px;
  margin-bottom: 20px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06);
}
.sb-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 18px;
}
.sb-card__title-wrap {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.sb-card__icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #159f63;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sb-card__title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #292c34;
  margin: 0;
}
.sb-card__sub {
  margin: 3px 0 0;
  color: #64748b;
  font-size: 0.88rem;
  line-height: 1.45;
  max-width: 560px;
}
.sb-card__foot {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

/* ---------- Fieldsets & forms ---------- */
.sb-fieldset {
  padding: 16px 0;
  border-top: 1px solid #f1f5f9;
}
.sb-fieldset:first-of-type { border-top: none; padding-top: 0; }
.sb-fieldset__legend {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
  margin: 0 0 12px;
}
.sb-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.sb-grid--indent { margin-top: 14px; padding-left: 4px; }
.sb-grid--spaced { margin-top: 14px; }
.sb-field { display: flex; flex-direction: column; gap: 6px; }
.sb-field--full { grid-column: 1 / -1; }
.sb-field label {
  font-weight: 600;
  font-size: 0.85rem;
  color: #475569;
}
.sb-input {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.sb-input:focus {
  outline: none;
  border-color: #1bb776;
  box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.12);
}
.sb-input--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
}
.sb-inline { display: flex; gap: 8px; }
.sb-inline .sb-input { flex: 1; }

/* ---------- Payment chips ---------- */
.sb-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.sb-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  color: #475569;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
}
.sb-chip input { margin: 0; accent-color: #1bb776; }
.sb-chip.is-on {
  border-color: #1bb776;
  background: #ecfdf5;
  color: #159f63;
}

/* ---------- Toggle ---------- */
.sb-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.sb-toggle input { display: none; }
.sb-toggle__track {
  flex-shrink: 0;
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: #cbd5e1;
  position: relative;
  transition: background 0.2s ease;
}
.sb-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.sb-toggle input:checked + .sb-toggle__track { background: #1bb776; }
.sb-toggle input:checked + .sb-toggle__track .sb-toggle__thumb { transform: translateX(18px); }
.sb-toggle strong { display: block; color: #292c34; font-size: 0.92rem; }
.sb-toggle small { display: block; color: #64748b; font-size: 0.82rem; margin-top: 1px; }

/* ---------- Advanced (details) ---------- */
.sb-advanced {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}
.sb-advanced summary {
  cursor: pointer;
  font-weight: 600;
  color: #475569;
  font-size: 0.9rem;
}
.sb-advanced__hint {
  color: #94a3b8;
  font-size: 0.85rem;
  margin: 10px 0 14px;
}
.sb-advanced__actions { margin-top: 12px; }

/* ---------- Buttons ---------- */
.sb-btn {
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.sb-btn--primary { background: #1bb776; color: #fff; }
.sb-btn--primary:hover { background: #159f63; }
.sb-btn--subtle { background: #eef2f1; color: #1f2937; }
.sb-btn--subtle:hover { background: #e2e8e6; }
.sb-btn--ghost { background: #fff; color: #475569; border-color: #d1d5db; }
.sb-btn--ghost:hover { background: #f8fafc; }
.sb-btn:disabled { opacity: 0.55; cursor: default; }
.sb-btn--sm { padding: 0.3rem 0.7rem; font-size: 0.82rem; }

/* ---------- Result box ---------- */
.sb-result {
  background: #f6fbf9;
  border: 1px solid #d5efe4;
  border-radius: 10px;
  padding: 16px 18px;
  margin-bottom: 20px;
}
.sb-result__row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.sb-result__label {
  font-weight: 600;
  font-size: 0.82rem;
  color: #475569;
  min-width: 130px;
}
.sb-result__foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

/* ---------- Guide / notes ---------- */
.sb-guide {
  margin: 0 0 12px 1.1rem;
  padding: 0;
  line-height: 1.8;
  color: #334155;
}
.sb-note {
  color: #94a3b8;
  font-size: 0.85rem;
  margin: 0 0 4px;
}

/* ---------- Registration code card ---------- */
.sb-code-card {
  border: 1px solid #d7dce3;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  max-width: 360px;
  margin-top: 16px;
  background: #fafbfc;
}
.sb-code-label { margin: 0; font-size: 0.85rem; color: #64748b; }
.sb-code {
  margin: 0.35rem 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 2.75rem;
  font-weight: 700;
  letter-spacing: 0.35rem;
  color: #292c34;
}
.sb-code-qr { margin: 0.75rem 0 0.35rem; }
.sb-code-qr p { margin-top: 0.4rem; }
.sb-code-expiry { margin: 0.9rem 0; font-size: 0.85rem; color: #64748b; }
.sb-code-expiry--dead { color: #b91c1c; font-weight: 600; }
.sb-code-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* ---------- Tables ---------- */
.table-wrap { overflow-x: auto; }
.sb-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.sb-table th,
.sb-table td {
  text-align: left;
  padding: 0.65rem 0.7rem;
  border-bottom: 1px solid #f1f3f5;
}
.sb-table th {
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.sb-table tbody tr:hover { background: #fafbfc; }
.sb-strong { font-weight: 600; color: #292c34; }
.sb-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
  color: #475569;
}
.sb-empty {
  color: #94a3b8;
  text-align: center;
  padding: 1.5rem;
}
.sb-muted { color: #cbd5e1; }
.sb-link { color: #159f63; font-weight: 600; text-decoration: none; }
.sb-link:hover { text-decoration: underline; }

/* ---------- Empty state ---------- */
.sb-empty-state {
  background: #fff;
  border: 1px dashed #d7dce3;
  border-radius: 12px;
  padding: 40px 24px;
  text-align: center;
  color: #94a3b8;
  font-weight: 500;
}

/* ---------- Badges ---------- */
.sb-badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.76rem;
  font-weight: 600;
}
.sb-badge--ok { background: #dcfce7; color: #166534; }
.sb-badge--bad { background: #fee2e2; color: #991b1b; }

/* ---------- Responsive ---------- */
@media (max-width: 640px) {
  .sb-grid { grid-template-columns: 1fr; }
  .sb-context { flex-direction: column; align-items: stretch; }
}
</style>
