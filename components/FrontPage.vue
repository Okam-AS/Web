<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="big-teaser">
        <div class="wrapper">
          <div class="big-teaser__content element">
            <img src="~/assets/UI/startpage_stores.png">
          </div>
          <div class="big-teaser__content element">
            <h1 class="heading-1">
              Den enkleste veien til egen nettbutikk
            </h1>
            <p>Det har aldri vært enklere å starte egen nettbutikk. Ta et bilde av varene du selger, last det opp i din Okam butikk og kunder kan straks legge inn sine bestillinger.</p>
            <div class="big-teaser__links">
              <a class="ga-ios-download" href="https://apps.apple.com/no/developer/okam/id1514296964"><img alt="AppStore" height="40" src="~/assets/UI/appstore-btn.png"></a>
              <a class="ga-android-download" href="https://play.google.com/store/apps/developer?id=Okam"><img alt="Google Play" height="40" src="~/assets/UI/googleplay-btn.png"></a>
            </div>
          </div>
        </div>
      </div>
      <section class="contrast-block">
        <div class="wrapper">
          <h2 class="heading-1 u-center">
            Slik fungerer det
          </h2>
          <p>
            Ta et bilde av varene du selger, last det opp i din Okam butikk og kunder kan straks legge inn sine bestillinger. Okam Butikk registrerer hvilke varer kundene trykker på i bildene dine og lager en bestillingssliste hvor de kan redigere antall og legge til kommentarer før de betaler og sender inn bestillingen til deg. Okam sørger for å varsle kunden når du har bekreftet bestillingen og når den er klar for henting eller på vei til hjemlevering. Du velger selv om du vil tilby hjemlevering til dine kunder.
          </p>
          <div class="media-items media-items--counter">
            <article class="media-item">
              <div class="media-item__content element">
                <h3 class="media-item__title">
                  Velg butikk
                </h3>
                <p class="media-item__ingress">
                  Kundene velger butikken de vil handle i eller kommer rett inn på din butikk via lenken du har delt med dem.
                </p>
              </div>
              <div class="media-item__image element">
                <img src="~/assets/UI/ill_store.svg" alt="">
              </div>
            </article>
            <article class="media-item">
              <div class="media-item__content element">
                <h3 class="media-item__title">
                  Trykk på varene du vil ha
                </h3>
                <p class="media-item__ingress">
                  Kundene velger varene de vil ha fra bildene, slik som i en fysisk butikk.
                </p>
              </div>
              <div class="media-item__image element">
                <img src="~/assets/UI/ill-phone.svg" alt="">
              </div>
            </article>
            <article class="media-item">
              <div class="media-item__content element">
                <h3 class="media-item__title">
                  Bestill og betal
                </h3>
                <p class="media-item__ingress">
                  Betalingen gjøres ved bestilling. Enkelt og greit.
                </p>
              </div>
              <div class="media-item__image element">
                <img src="~/assets/UI/ill-cart.svg" alt="">
              </div>
            </article>
          </div>
        </div>
      </section>
      <section class="big-teaser big-teaser--dark">
        <div class="wrapper">
          <div class="big-teaser__content element">
            <h1 class="heading-1">
              Den enkleste veien til egen nettbutikk.
            </h1>
            <br>     <h1 class="heading-1">
              Den enkleste måten å netthandle på.
            </h1>
            <p />
            <div class="big-teaser__links" />
          </div>
          <div class="big-teaser__image element">
            <img src="~/assets/UI/ill-store-dark.svg" alt="">
          </div>
        </div>
      </section>
      <section class="faq">
        <div class="wrapper">
          <h2 class="heading-1 u-center">
            Ofte stilte spørsmål
          </h2>
          <div class="faq-list">
            <details class="faq-list__item">
              <summary class="faq-list__question-wrapper">
                <div class="faq-list__question ga-is-it-safe">
                  Er det trygt å handle med Okam?
                  <svg class="icon" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z" /></svg>
                </div>
              </summary>
              <div class="faq-list__answer">
                Ja. Kundene sender sine bestillinger direkte til butikken. Okam lagrer kun kundens telefonnummer og bestillingen og formidler beskjed når bestillingen er klar for å hentes. Betalingen gjøres ved bestilling i appen. Les mer om hvordan vi behandler personopplysninger i <a href="/personvern">personvernerklæringen</a>.
              </div>
            </details>
            <details class="faq-list__item">
              <summary class="faq-list__question-wrapper">
                <div class="faq-list__question ga-is-it-more-expensive">
                  Blir det dyrere å handle via Okam?
                  <svg class="icon" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z" /></svg>
                </div>
              </summary>
              <div class="faq-list__answer">
                Nei. Bruken av Okam til å kjøpe varer er helt gratis. Prisen kundene betaler er den butikken setter selv.
              </div>
            </details>
            <details class="faq-list__item">
              <summary class="faq-list__question-wrapper">
                <div class="faq-list__question ga-add-product-list">
                  Må jeg legge inn produktlister?
                  <svg class="icon" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z" /></svg>
                </div>
              </summary>
              <div class="faq-list__answer">
                Både ja og nei. Du trenger ikke å integrere med noen av dine butikksystemer men kan legge inn produktene du ønsker å selge i Okam direkte i Okam Butikk. Når du har registrert en vare så er den tilgjengelig for å på en enkel måte  markeres i bildene du tar av produktene dine, gjerne der produktene står sammen i butikkhyllene.
              </div>
            </details>
            <details class="faq-list__item">
              <summary class="faq-list__question-wrapper">
                <div class="faq-list__question ga-use-okam-as-campain">
                  Kan jeg bruke Okam til kampanjer?
                  <svg class="icon" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z" /></svg>
                </div>
              </summary>
              <div class="faq-list__answer">
                Ja. Trenger du en midlertidig butikk eller en kampanjebutikk er Okam perfekt for anledningen. Ta bilde av kampanjevarene og del butikken med kundene dine. Enkelt og greit.
              </div>
            </details>
            <details class="faq-list__item">
              <summary class="faq-list__question-wrapper">
                <div class="faq-list__question ga-how-much-does-it-cost">
                  Hva med priser?
                  <svg class="icon" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z" /></svg>
                </div>
              </summary>
              <div class="faq-list__answer">
                Du legger inn priser på hvert produkt. Du kan når som helst endre på prisene.
              </div>
            </details>
            <details class="faq-list__item">
              <summary class="faq-list__question-wrapper">
                <div class="faq-list__question ga-may-i-use-okam-private">
                  Kan jeg bruke Okam som privatperson, for eksempel til et garasjesalg?
                  <svg class="icon" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z" /></svg>
                </div>
              </summary>
              <div class="faq-list__answer">
                Nei. For å benytte deg av Okam må du ha en Stripekonto som krever at du har et organisasjonsnummer.
              </div>
            </details>
            <details class="faq-list__item">
              <summary class="faq-list__question-wrapper">
                <div class="faq-list__question ga-how-do-i-get-users-to-my-store">
                  Hvordan får jeg kunder til butikksiden min?
                  <svg class="icon" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z" /></svg>
                </div>
              </summary>
              <div class="faq-list__answer">
                Okam lister ut alle godkjente butikker. I tillegg kan du dele lenke til butikksiden via meldingstjenester som sms og mail i tillegg til å poste den på sosiale medier selvsagt. Har du et tilbud du vil sende ut til kundene dine så kan du enkelt laste opp bilde av varene og dele det der og da. Du kan også printe ut en enkel plakat du kan ha i butikken din. Plakaten har en QR-kode som er unik for din butikk og som kundene dine kan scanne med telefonene sine for å komme til butikken din i Okam.
              </div>
            </details>
            <details class="faq-list__item">
              <summary class="faq-list__question-wrapper">
                <div class="faq-list__question ga-how-does-okam-earn-money">
                  Hvordan tjener Okam penger?
                  <svg class="icon" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z" /></svg>
                </div>
              </summary>
              <div class="faq-list__answer">
                All funksjonalitet i Okam er gratis å bruke og Okam selger ikke informasjon om bruk eller brukere til tredjepart. Okam tar kun en liten transaksjonskostnad av butikken. Det finnes ingen skjulte kostander.
              </div>
            </details>
          </div>
        </div>
      </section>
    </main>

    <page-footer />
  </div>
</template>

<script>
import PageHeader from './PageHeader.vue'
export default {
  components: { PageHeader },
  data: () => ({
    menuExpanded: false
  })
}
</script>