<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="big-teaser">
        <div class="wrapper">
          <iframe
            style="margin-left: auto; margin-right: auto"
            width="800"
            height="448"
            src="https://www.youtube-nocookie.com/embed/gKwyq1n4ilM?controls=0"
            title="Ikigai + Okam"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />
        </div>
      </div>

      <section class="contrast-block">
        <div class="wrapper">
          <h2 class="heading-1 u-center">
            Enkel og rask handel fra ditt nærområde
          </h2>
          <p>
            Okam gjør det enkelt å handle fra virksomhetene du bryr deg om. Via
            et enkelt brukergrensesnitt får du handlet på en trygg og rask måte.
          </p>

          <div class="media-items media-items--counter">
            <article class="media-item">
              <div class="media-item__content element">
                <h3 class="media-item__title">
                  Velg butikk
                </h3>
                <p class="media-item__ingress">
                  Velg bedriften du ønsker å se utvalget til, eller handle fra
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
                  Legg til i handlekurven
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
                  Gå til handlekurven, se over handlelisten, og betal. Så
                  enkelt.
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
              Vi ønsker å gjøre lokal handel enklere for alle
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
            Noen eier en bedrift mens andre bruker Okam for å handle. Hva
            beskriver deg best?
          </p>

          <div class="faq-list" style="margin-bottom: 50px">
            <details class="faq-list__item">
              <summary class="faq-list__question-wrapper">
                <div class="faq-list__question">
                  Jeg bruker Okam for å handle varer
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
                Supert! Vi håper du liker Okam.
                <a
                  href="/om-okam/"
                >Klikk her for å lese hva andre som bruker Okam lurer på</a>.
              </div>
            </details>
            <details class="faq-list__item">
              <summary class="faq-list__question-wrapper">
                <div class="faq-list__question">
                  Jeg eier en bedrift
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
                Supert! Da har du trolig interesse av å
                <a href="/om-okam-admin/">lese mer her</a>.
              </div>
            </details>
          </div>
          <h3 style="margin-top: 5em">
            Last ned Okam for å utforske
          </h3>
          <div style="margin-top: 1em" class="big-teaser__links">
            <a
              class="ga-ios-download"
              href="https://apps.apple.com/no/developer/okam/id1514296964"
            ><img
              alt="AppStore"
              height="40"
              src="~/assets/UI/appstore-btn.png"
            ></a>
            <a
              class="ga-android-download"
              href="https://play.google.com/store/apps/developer?id=Okam"
            ><img
              alt="Google Play"
              height="40"
              src="~/assets/UI/googleplay-btn.png"
            ></a>
          </div>
        </div>
      </section>
    </main>

    <page-footer />
  </div>
</template>

<script>
import PageHeader from '@/components/organisms/PageHeader.vue'
import PageFooter from '@/components/organisms/PageFooter.vue'

export default {
  components: { PageHeader, PageFooter },
  data: () => ({
    menuExpanded: false
  })
}
</script>