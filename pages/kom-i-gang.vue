<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">
              Vi ønsker å gjøre lokal handel enklere for alle
            </h1>
            <p>
              Sett opp din butikk i Okam Admin for å gi dine kunder en bedre
              kjøpsopplevelse
            </p>

            <feature-info
              name="Mobil bestillingsplattform"
              description="Motta og administrer bestillinger fra ubegrenset antall telefoner eller tableter"
              :icon-url="require('~/assets/UI/icon_card.svg')"
            />
            <feature-info
              name="Selvbetjening i butikk"
              :icon-url="require('~/assets/UI/icon_barcode.svg')"
            />
            <feature-info
              name="Spis inne"
              :icon-url="require('~/assets/UI/icon_food.svg')"
            />
            <feature-info
              name="Klikk & hent"
              :icon-url="require('~/assets/UI/icon_click.svg')"
            />
            <feature-info
              name="Hjemlevering"
              :icon-url="require('~/assets/UI/icon_car.svg')"
            />
            <feature-info
              name="QR bestillingssystem"
              :icon-url="require('~/assets/UI/icon_qr.svg')"
            />
            <!-- article -->
            <article
              id="post-17"
              class="post-17 page type-page status-publish hentry"
            >
              <p style="font-weight: bold">
                Last ned Okam Admin og sett opp din butikk gratis
              </p>
              <div class="big-teaser__links">
                <a
                  href="https://apps.apple.com/no/app/okam-butikk/id1514667230"
                >
                  <img
                    alt="AppStore"
                    height="40"
                    src="~/assets/UI/appstore-btn.png"
                  >
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=no.okam.store"
                >
                  <img
                    alt="Google Play"
                    height="40"
                    src="~/assets/UI/googleplay-btn.png"
                  >
                </a>
              </div>
              <br class="clear">
            </article>
            <!-- /article -->
          </div>
        </div>
      </div>
    </main>
    <page-footer />
  </div>
</template>

<script>
import FeatureInfo from '../components/FeatureInfo.vue'
export default {
  components: { FeatureInfo }
}
</script>
