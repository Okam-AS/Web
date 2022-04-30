<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <h1 class="heading-1 u-center">
            Bli med på å gjøre lokal handel enklere for alle
          </h1>
          <p>
            Det tar bare noen minutter å sette opp butikken din i Okam og det
            vil gi dine kunder en bedre kjøpsopplevelse. Okam Admin vil veilede
            deg gjennom oppsettet av butikken din, men vi hjeper deg gjerne hvis
            du trenger det.
          </p>

          <feature-info
            name="Mobil bestillingsplattform"
            description="Motta og administrer bestillinger fra ubegrenset antall telefoner eller tableter"
            :icon-url="require('~/assets/UI/icon_card.svg')"
          />
          <feature-info
            name="Klikk & hent"
            description="Gjør det enkelt og raskt for kundene dine å handle hos deg"
            :icon-url="require('~/assets/UI/icon_click.svg')"
          />
          <feature-info
            name="Hjemlevering"
            description="Legg inn dine priser for hjemlevering etter kjøreavstand dersom du tilbyr dette"
            :icon-url="require('~/assets/UI/icon_car.svg')"
          />
          <feature-info
            name="Selvbetjening i butikk"
            description="Kunder kan scanne strekkoder og betale for varene fra sin telefon"
            :icon-url="require('~/assets/UI/icon_barcode.svg')"
          />
          <feature-info
            name="Spis inne"
            description="Serveringsteder kan tilby sine kunder å spise inne"
            :icon-url="require('~/assets/UI/icon_food.svg')"
          />
          <feature-info
            name="QR bestillingssystem"
            description="QR-koden kan scannes av kunden for å se vareutvalg og handle "
            :icon-url="require('~/assets/UI/icon_qr.svg')"
          />
          <p style="margin-top: 2em">
            Rabattkoder, statistikk, lagerstyring, servitørfunksjon og mye
            mer... Skru på funksjonene butikken din trenger.
          </p>

          <div>
            <CheckInfo text="Ingen bindingstid" />
            <CheckInfo text="Første måned GRATIS" />
            <CheckInfo text="Gratis support" />
            <CheckInfo text="Lav transaksjonskostnad" />

            <p>Se prisene våres <a href="/priser">her</a></p>
          </div>

          <div style="margin-top: 50px">
            <p style="font-weight: bold">
              Last ned Okam Admin og sett opp din butikk
            </p>
            <div class="big-teaser__links">
              <a
                href="https://apps.apple.com/no/app/okam-butikk/id1514667230"
              ><img
                alt="AppStore"
                height="40"
                src="~/assets/UI/appstore-btn.png"
              ></a>
              <a
                href="https://play.google.com/store/apps/details?id=no.okam.store"
              ><img
                alt="Google Play"
                height="40"
                src="~/assets/UI/googleplay-btn.png"
              ></a>
            </div>
          </div>
        </div>
      </div>
    </main>
    <page-footer />
  </div>
</template>
<script>
import PageHeader from '@/components/organisms/PageHeader.vue'
import PageFooter from '@/components/organisms/PageFooter.vue'
import FeatureInfo from '@/components/atoms/FeatureInfo.vue'
import CheckInfo from '@/components/atoms/CheckInfo.vue'

export default {
  components: { PageHeader, PageFooter, FeatureInfo, CheckInfo }
}
</script>