<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="download-section">
            <h1>{{ copy.title }}</h1>
            <p class="description">{{ copy.description }}</p>

            <div class="download-buttons">
              <a
                href="https://apps.apple.com/no/app/okam-admin/id1514667230?l=nb"
                target="_blank"
                class="store-button"
              >
                <img
                  class="appstore"
                  height="40"
                  width="120"
                  src="~/assets/UI/appstore-btn.png"
                  :alt="copy.appStoreAlt"
                />
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=no.okam.store"
                target="_blank"
                class="store-button"
              >
                <img
                  class="googleplay"
                  height="40"
                  width="130"
                  src="~/assets/UI/googleplay-btn.png"
                  :alt="copy.googlePlayAlt"
                />
              </a>
            </div>

            <div class="app-features">
              <div class="feature">
                <span class="material-icons feature-icon">edit</span>
                <h3>{{ copy.featureMenuTitle }}</h3>
                <p>{{ copy.featureMenuText }}</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">receipt_long</span>
                <h3>{{ copy.featureOrdersTitle }}</h3>
                <p>{{ copy.featureOrdersText }}</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">analytics</span>
                <h3>{{ copy.featureStatsTitle }}</h3>
                <p>{{ copy.featureStatsText }}</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">delivery_dining</span>
                <h3>{{ copy.featureDeliveryTitle }}</h3>
                <p>{{ copy.featureDeliveryText }}</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">card_giftcard</span>
                <h3>{{ copy.featureLoyaltyTitle }}</h3>
                <p>{{ copy.featureLoyaltyText }}</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">qr_code_scanner</span>
                <h3>{{ copy.featureQrTitle }}</h3>
                <p>{{ copy.featureQrText }}</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">language</span>
                <h3>{{ copy.featureWebTitle }}</h3>
                <p>{{ copy.featureWebText }}</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">payment</span>
                <h3>{{ copy.featurePaymentTitle }}</h3>
                <p>{{ copy.featurePaymentText }}</p>
              </div>

              <div class="feature">
                <span class="material-icons feature-icon">support_agent</span>
                <h3>{{ copy.featureSupportTitle }}</h3>
                <p>{{ copy.featureSupportText }}</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">bar_chart</span>
                <h3>{{ copy.featureInsightTitle }}</h3>
                <p>{{ copy.featureInsightText }}</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">devices</span>
                <h3>{{ copy.featureFlexTitle }}</h3>
                <p>{{ copy.featureFlexText }}</p>
              </div>
            </div>

            <div class="download-buttons">
              <a
                href="https://apps.apple.com/no/app/okam-admin/id1514667230?l=nb"
                target="_blank"
                class="store-button"
              >
                <img
                  class="appstore"
                  src="~/assets/UI/appstore-btn.png"
                  :alt="copy.appStoreAlt"
                />
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=no.okam.store"
                target="_blank"
                class="store-button"
              >
                <img
                  class="googleplay"
                  src="~/assets/UI/googleplay-btn.png"
                  :alt="copy.googlePlayAlt"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
    <page-footer />
  </div>
</template>

<script>
import PageHeader from "~/components/organisms/PageHeader.vue";
import PageFooter from "~/components/organisms/PageFooter.vue";

export default {
  components: {
    PageHeader,
    PageFooter,
  },
  computed: {
    copy() {
      return this.isCh
        ? {
            title: "Laden Sie die Okam Admin-App herunter",
            description: "und richten Sie Ihr Geschäft jetzt ein!",
            appStoreAlt: "Okam Admin-App im App Store herunterladen",
            googlePlayAlt: "Okam Admin-App bei Google Play herunterladen",
            featureMenuTitle: "Menü verwalten",
            featureMenuText: "Aktualisieren Sie Preise, fügen Sie Gerichte hinzu und bearbeiten Sie Ihr Menü jederzeit",
            featureOrdersTitle: "Bestellungen verwalten",
            featureOrdersText: "Empfangen und bearbeiten Sie Bestellungen direkt auf dem Mobiltelefon",
            featureStatsTitle: "Statistiken ansehen",
            featureStatsText: "Verschaffen Sie sich einen Überblick über Umsätze und beliebte Gerichte",
            featureDeliveryTitle: "Hauslieferung",
            featureDeliveryText: "Verwalten Sie Lieferungen über unseren Partner",
            featureLoyaltyTitle: "Treueprogramm",
            featureLoyaltyText: "Verwalten Sie Treuekarten und Geschenkkarten",
            featureQrTitle: "QR-Code-Bestellung",
            featureQrText: "Verwalten Sie Tischbestellungen per QR-Code",
            featureWebTitle: "Online-Bestellung",
            featureWebText: "Integrierte Lösung für die Bestellung im Internet",
            featurePaymentTitle: "Flexible Bezahlung",
            featurePaymentText: "Unterstützung für mehrere Zahlungsmethoden (TWINT, Karte, Bargeld)",
            featureSupportTitle: "24/7 Support",
            featureSupportText: "Technischer Support und Schulung, wann immer Sie ihn brauchen",
            featureInsightTitle: "Wertvolle Einblicke",
            featureInsightText: "Erhalten Sie nützliche Daten über Kunden und Umsätze",
            featureFlexTitle: "Flexible Lösung",
            featureFlexText: "Verwalten Sie alles vom iPad oder Ihrem eigenen Telefon aus",
          }
        : {
            title: "Last ned Okam Admin-appen",
            description: "og begynn å sette opp din butikk nå!",
            appStoreAlt: "Last ned Okam Admin-appen på App Store",
            googlePlayAlt: "Last ned Okam Admin-appen på Google Play",
            featureMenuTitle: "Administrer menyen",
            featureMenuText: "Oppdater priser, legg til retter og rediger menyen din når som helst",
            featureOrdersTitle: "Håndter bestillinger",
            featureOrdersText: "Motta og behandle bestillinger direkte på mobilen",
            featureStatsTitle: "Se statistikk",
            featureStatsText: "Få oversikt over salg og populære retter",
            featureDeliveryTitle: "Hjemlevering",
            featureDeliveryText: "Administrer leveringer gjennom vår samarbeidspartner",
            featureLoyaltyTitle: "Lojalitetsprogram",
            featureLoyaltyText: "Administrer lojalitetskort og gavekort",
            featureQrTitle: "QR-kodebestilling",
            featureQrText: "Håndter bordbestillinger via QR-kode",
            featureWebTitle: "Nettbestilling",
            featureWebText: "Integrert løsning for bestilling på nett",
            featurePaymentTitle: "Fleksibel betaling",
            featurePaymentText: "Støtte for flere betalingsmåter (Vipps, kort, kontant)",
            featureSupportTitle: "24/7 Support",
            featureSupportText: "Teknisk støtte og opplæring når du trenger det",
            featureInsightTitle: "Verdifull innsikt",
            featureInsightText: "Få nyttig data om kunder og salg",
            featureFlexTitle: "Fleksibel løsning",
            featureFlexText: "Administrer alt fra iPad eller din egen telefon",
          };
    },
  },
};
</script>

<style lang="scss" scoped>
.download-section {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
  text-align: center;

  h1 {
    font-size: 32px;
    color: #333;
    margin-bottom: 20px;
  }

  .description {
    font-size: 18px;
    color: #666;
    margin-bottom: 48px;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .app-features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 32px;
    margin-bottom: 48px;

    .feature {
      padding: 24px;

      .feature-icon {
        width: 48px;
        height: 48px;
        color: #1bb776;
        margin-bottom: 16px;
      }

      h3 {
        font-size: 20px;
        color: #333;
        margin-bottom: 12px;
      }

      p {
        font-size: 16px;
        color: #666;
        line-height: 1.5;
      }
    }
  }

  .download-buttons {
    margin: 32px 0;
    display: flex;
    justify-content: center;
    gap: 24px;
    flex-wrap: wrap;

    .store-button {
      border-bottom: none;
      img {
        height: 48px;
        transition: transform 0.2s ease;

        &:hover {
          transform: translateY(-2px);
        }
      }
    }
  }
}

@media (max-width: 600px) {
  .download-section {
    padding: 32px 16px;

    h1 {
      font-size: 28px;
    }

    .description {
      font-size: 16px;
    }

    .app-features {
      gap: 24px;
    }
  }
}

.material-icons.feature-icon {
  width: 48px;
  height: 48px;
  color: #1bb776;
  margin-bottom: 16px;
  font-size: 48px;
}
</style>
