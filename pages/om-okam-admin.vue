<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <h1 class="heading-1 u-center">
            Bli med på å gjøre lokal handel enklere for alle
          </h1>
          <!-- article -->
          <article
            id="post-20"
            class="post-20 page type-page status-publish hentry"
          >
            <div class="wp-block-group alignwide">
              <div class="wp-block-group__inner-container">
                <p>
                  Sett opp din butikk i Okam Admin for å gi dine kunder en bedre
                  kjøpsopplevelse. Ta noen bilder av varene du selger, last de
                  opp i din Okam Admin og kunder kan straks legge inn sine
                  bestillinger. I Okam Admin har du full oversikt over
                  bestillingene som kommer inn, og kan enkelt behandle disse.
                </p>
                <p>
                  Okam passer til alle typer butikker, store og små. Skru på
                  funksjonene din butikk trenger, helt gratis. Vi tar bare 3% +
                  2 kr per transaksjon som går gjennom platformen. Ingen skjulte
                  kostnader.
                </p>
              </div>
            </div>
            <div style="margin-top: 100px; margin-bottom: 100px">
              <img
                style="display: block; margin-left: auto; margin-right: auto"
                width="800"
                src="~/assets/UI/okam-admin-bestillinger.png"
                alt=""
              >
            </div>

            <div style="margin-top: 50px">
              <h2 class="heading-1 u-center">
                Okam gir bedriften din
              </h2>
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
                description="Legg inn dine priser for hjemlevering etter kjøreavstand"
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
                mer... Skru på funksjonene butikk din trenger, helt gratis.
              </p>

              <p style="font-weight: bold">
                Last ned Okam Admin og sett opp din butikk gratis
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

            <div class="faq-list" style="margin-top: 100px">
              <h2 class="heading-1 u-center">
                Spørsmål og svar
              </h2>
              <details class="faq-list__item">
                <summary class="faq-list__question-wrapper">
                  <div class="faq-list__question ga-how-much-does-it-cost">
                    Hvordan legger jeg inn mine produkter?
                    <svg
                      class="icon"
                      viewbox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                    >
                      <path
                        d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z"
                      />
                    </svg>
                  </div>
                </summary>
                <div class="faq-list__answer">
                  Okam Admin har et enkelt brukergrensesnitt for å legge til,
                  endre eller slette produkter. Dersom du har en større
                  vareliste kan vi hjelp med import av produktlista.
                </div>
              </details>
              <details class="faq-list__item">
                <summary class="faq-list__question-wrapper">
                  <div
                    class="faq-list__question ga-how-do-i-get-users-to-my-store"
                  >
                    Hvordan får jeg kunder til butikksiden min?
                    <svg
                      class="icon"
                      viewbox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                    >
                      <path
                        d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z"
                      />
                    </svg>
                  </div>
                </summary>
                <div class="faq-list__answer">
                  Alle Okam butikker får en direkte lenke til sin butikkside i
                  Okam. Den kan for eksempel deles via sosiale medier, e-post
                  eller SMS. Butikken får også en unik QR-kode som kan printes
                  ut og plasseres i butikken.
                </div>
              </details>
              <details class="faq-list__item">
                <summary class="faq-list__question-wrapper">
                  <div
                    class="faq-list__question ga-how-do-i-get-users-to-my-store"
                  >
                    Hva koster det?
                    <svg
                      class="icon"
                      viewbox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                    >
                      <path
                        d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z"
                      />
                    </svg>
                  </div>
                </summary>
                <div class="faq-list__answer">
                  Skru på funksjonene din butikk trenger, helt gratis. Vi tar
                  bare 3% + 2 kr per transaksjon som går gjennom platformen.
                  Ingen bindingstid, månedskostnad, oppstartsgebyr eller andre
                  skjulte kostnader.
                </div>
              </details>
              <details class="faq-list__item">
                <summary class="faq-list__question-wrapper">
                  <div class="faq-list__question ga-how-much-does-it-cost">
                    Kan jeg få hjelp?
                    <svg
                      class="icon"
                      viewbox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                    >
                      <path
                        d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z"
                      />
                    </svg>
                  </div>
                </summary>
                <div class="faq-list__answer">
                  Okam Admin vil veilede deg gjennom oppsettet av butikken din,
                  men vi er her for deg hvis du trenger hjelp. Ta kontakt via
                  <a href="/kontakt">kontaktskjema</a> så svarer vi innen kort
                  tid.
                </div>
              </details>
            </div>

            <br class="clear">
          </article>
        </div>
      </div>
    </main>
    <page-footer />
  </div>
</template>
import FeatureInfo from '../components/FeatureInfo.vue'
export default {
  components: { FeatureInfo }
}
</script>
