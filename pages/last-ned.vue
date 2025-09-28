<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="download-section">
            <h1>Last ned Okam Admin-appen</h1>
            <p class="description">og begynn å sette opp din butikk nå!</p>

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
                  alt="Last ned Okam Admin-appen på App Store"
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
                  alt="Last ned Okam Admin-appen på Google Play"
                />
              </a>
            </div>

            <div class="app-features">
              <div class="feature">
                <span class="material-icons feature-icon">edit</span>
                <h3>Administrer menyen</h3>
                <p>Oppdater priser, legg til retter og rediger menyen din når som helst</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">receipt_long</span>
                <h3>Håndter bestillinger</h3>
                <p>Motta og behandle bestillinger direkte på mobilen</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">analytics</span>
                <h3>Se statistikk</h3>
                <p>Få oversikt over salg og populære retter</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">delivery_dining</span>
                <h3>Hjemlevering</h3>
                <p>Administrer leveringer gjennom vår samarbeidspartner</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">card_giftcard</span>
                <h3>Lojalitetsprogram</h3>
                <p>Administrer lojalitetskort og gavekort</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">qr_code_scanner</span>
                <h3>QR-kodebestilling</h3>
                <p>Håndter bordbestillinger via QR-kode</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">language</span>
                <h3>Nettbestilling</h3>
                <p>Integrert løsning for bestilling på nett</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">payment</span>
                <h3>Fleksibel betaling</h3>
                <p>Støtte for flere betalingsmåter (Vipps, kort, kontant)</p>
              </div>

              <div class="feature">
                <span class="material-icons feature-icon">support_agent</span>
                <h3>24/7 Support</h3>
                <p>Teknisk støtte og opplæring når du trenger det</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">bar_chart</span>
                <h3>Verdifull innsikt</h3>
                <p>Få nyttig data om kunder og salg</p>
              </div>
              <div class="feature">
                <span class="material-icons feature-icon">devices</span>
                <h3>Fleksibel løsning</h3>
                <p>Administrer alt fra iPad eller din egen telefon</p>
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
                  alt="Last ned Okam Admin-appen på App Store"
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
                  alt="Last ned Okam Admin-appen på Google Play"
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
