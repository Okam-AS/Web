<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">
              Enkel og rask handel fra ditt nærområde
            </h1>
            <!-- article -->
            <article
              id="post-17"
              class="post-17 page type-page status-publish hentry"
            >
              <p>
                Okam gjør det enkelt å handle fra butikker og serveringssteder
                du bryr deg om. Gjennom et enkelt brukergrensesnitt får du
                handlet på en trygg og rask måte. Finn butikk, trykk på varene
                du vil ha, gjør eventuelle justeringer. Legg til eventuelle
                kommentarer og send inn bestillingen.
              </p>

              <p>
                Du betaler ved bestilling. Du får beskjed når bestillingen er
                klar for henting, eller når varene er på vei dersom du har valgt
                hjemlevering.
              </p>

              <p>
                Vi tar personvern på alvor. Du trenger ikke å legge inn
                påloggingsinformasjon eller andre personlige data. Et
                telefonnummer er nok for å bevare kvitteringene dine i appen.
              </p>

              <p>
                Bruken av Okam er helt gratis. For butikker tar Okam en liten
                transaksjonskostnad per bestilling. Det finnes ingen skjulte
                kostander.
              </p>

              <p>
                <strong>Har du tips om et sted du skulle likt å handle med
                  Okam?</strong>
                <a href="/kontakt/">Send oss gjerne en melding her</a>.
              </p>

              <div
                class="faq-list"
                style="margin-bottom: 50px; margin-top: 50px"
              >
                <h2 class="heading-1 u-center">
                  Spørsmål og svar
                </h2>
                <FaqItem q="Er det trygt å handle med Okam?">
                  <span>
                    Ja. Kundene sender sine bestillinger direkte til butikken.
                    Okam lagrer kun kundens telefonnummer og bestillingen og
                    formidler beskjed når bestillingen er klar for å hentes.
                    Betalingen gjøres ved bestilling i appen. Les mer om hvordan
                    vi behandler personopplysninger i
                    <a href="/personvern">personvernerklæringen</a>.</span>
                </FaqItem>
                <FaqItem
                  q="Blir det dyrere å handle via Okam?"
                  a="Nei. Bruken av Okam til å kjøpe varer er helt gratis. Prisen
                    kundene betaler er den butikken setter selv."
                />
                <FaqItem
                  q="Kan jeg bruke Okam som privatperson, for eksempel til et
                      garasjesalg?"
                  a="Nei. For å benytte deg av Okam må du ha et
                    organisasjonsnummer."
                />
                <FaqItem
                  q="Hvordan tjener Okam penger?"
                  a="All funksjonalitet i Okam er gratis å bruke og Okam selger
                    ikke informasjon om bruk eller brukere til tredjepart. Okam
                    tar kun en liten transaksjonskostnad av butikken. Det finnes
                    ingen skjulte kostander."
                />
              </div>

              <p>Last ned Okam for å handle fra butikker i ditt nærområde</p>
              <div class="big-teaser__links">
                <a
                  class="ga-ios-download"
                  href="https://apps.apple.com/no/app/okam/id1514296965"
                ><img
                  alt="AppStore"
                  height="40"
                  src="~assets/UI/appstore-btn.png"
                ></a>
                <a
                  class="ga-android-download"
                  href="https://play.google.com/store/apps/details?id=no.okam.consumer"
                ><img
                  alt="Google Play"
                  height="40"
                  src="~assets/UI/googleplay-btn.png"
                ></a>
              </div>

              <p style="margin-top: 100px">
                <strong>Driver du butikk?</strong> Da har du trolig interesse av
                å <a href="/om-okam-admin/">lese mer her</a>.
              </p>
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
import FaqItem from '../components/FaqItem.vue'
export default {
  components: { FaqItem }
}
</script>
