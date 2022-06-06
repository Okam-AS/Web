<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">
              Priser
            </h1>
            <article class="page type-page status-publish">
              <PriceTable />

              <CheckInfo text="Ingen bindingstid" />
              <CheckInfo text="Ingen skjulte kostnader" />
              <CheckInfo text="Første måned GRATIS" />
              <CheckInfo text="Gratis support" />
              <CheckInfo text="Lav transaksjonskostnad" />

              <br>
              <h3>Ingen oppstartskostnad</h3>
              <p>
                Okam er en automatisert tjeneste og du kan sette opp butikken
                din selv i Okam Admin-appen. Gjør du dette har vi ingen
                oppstartskostnad.
              </p>

              <div style="background: #ffffe0">
                <h3>Oppsett av butikk</h3>
                <p>
                  Vi kan sette opp butikken for deg hvis ønskelig. Denne
                  tjenesten koster 2499,- eks mva.
                </p>
                <p style="font-weight: bold">
                  Kampanje: Vi hjelper til med å sette opp alt du trenger, uten
                  ekstra kostnad. Tilbudet varer ut juni
                </p>
              </div>

              <h3 style="margin-top: 1em">
                Administrasjon
              </h3>
              <p>
                Du setter opp og administrerer butikken med produkter, priser,
                bilder og informasjon i appen Okam Admin helt kostnadsfritt.
                Dette kan utføres på en hvilken som helst Android- eller
                iOS-enhet. Det er her du også mottar bestillingene.
              </p>

              <h3>Tablet og printer</h3>
              <p>
                Bestillinger mottas rett i Okam Admin til hvilken som helst
                mobil eller tablet. Hvis ønskelig, tilbyr vi også en egen
                tablet- og printerpakke for å gjøre samhandlingen mellom Okam og
                kjøkkenet mest mulig sømløst for restauranter. Samsung Galaxy
                Tab A7 og printer kan leveres for kr 4000,- eks mva.
              </p>

              <h3>100% fornøyd-garanti</h3>
              <p>
                Dersom du har kjøpt tablet og printer og ikke er fornøyd kan du
                returnere innen 3 måneder og få pengene tilbake.
              </p>

              <div style="margin-top: 50px">
                <h3>
                  Last ned Okam Admin og registrer butikken din i dag og få
                  gratis månedsavgift den første måneden
                </h3>
                <div style="margin-top: 1em" class="big-teaser__links">
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
            </article>
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
import PriceTable from '@/components/molecules/PriceTable.vue'
import CheckInfo from '@/components/atoms/CheckInfo.vue'

export default {
  components: { PageHeader, PageFooter, PriceTable, CheckInfo }
}
</script>
