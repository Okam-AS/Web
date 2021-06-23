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
              Enkel og rask handel fra ditt nærområde
            </h1>
            <p>
              Okam gjør det enkelt å handle fra bedriftene du bryr deg om. Via et enkelt brukergrensesnitt, får du handlet på en trygg og rask måte. 
            </p>
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
            Okam er laget sånn at alt skal være så enkelt og raskt som overhode mulig. 
          </p>
          <div class="media-items media-items--counter">
            <article class="media-item">
              <div class="media-item__content element">
                <h3 class="media-item__title">
                  Velg butikk
                </h3>
                <p class="media-item__ingress">
                  Velg bedriften du ønsker å se utvalget i, eller handle fra
                </p>
              </div>
              <div class="media-item__image element">
                <img src="~/assets/UI/ill_store.svg" alt="">
              </div>
            </article>
            <article class="media-item">
              <div class="media-item__content element">
                <h3 class="media-item__title">
                  Velg varer
                </h3>
                <p class="media-item__ingress">
                  Du legger de deretter i en handlekurv, som i en fysisk butikk. 
                </p>
              </div>
              <div class="media-item__image element">
                <img src="~/assets/UI/ill-phone.svg" alt="">
              </div>
            </article>
            <article class="media-item">
              <div class="media-item__content element">
                <h3 class="media-item__title">
                  Se over og betal
                </h3>
                <p class="media-item__ingress">
                  Gå til handlekurven, se over handlelisten, og betal. Så enkelt.
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
              Okam gjør netthandel enkelt for alle
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
            Ønsker du å vite mer?
          </h2>
          <p>
            Noen eier en bedrift mens andre bruker Okam for å handle. Hva beskriver deg best? 
          </p>

          <div class="faq-list" style="margin-bottom: 50px;">
            <details class="faq-list__item">
              <summary class="faq-list__question-wrapper">
                <div class="faq-list__question ga-is-it-more-expensive">
                  Jeg bruker Okam for å handle varer
                  <svg class="icon" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z" /></svg>
                </div>
              </summary>
              <div class="faq-list__answer">
                Supert! Vi håper du liker Okam. <a href="/om-okam/">Klikk her for å lese hva andre som bruker Okam lurer på</a>.
              </div>
            </details>
            <details class="faq-list__item">
              <summary class="faq-list__question-wrapper">
                <div class="faq-list__question ga-is-it-safe">
                  Jeg eier en bedrift
                  <svg class="icon" viewbox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M23.245 4l-11.245 14.374-11.219-14.374-.781.619 12 15.381 12-15.391-.755-.609z" /></svg>
                </div>
              </summary>
              <div class="faq-list__answer">
                Supert! Da har du trolig interesse av å <a href="/rask-vei-til-egen-nettbutikk/">lese mer her</a>.
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