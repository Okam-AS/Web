<template>
  <div>
    <header class="page-header">
      <div class="page-header__wrapper">
        <div class="page-header__logo-wrapper">
          <a class="page-header__logo-link" href="/">
            <img class="page-header__logo" src="https://okam.no/UI/logo.svg" alt="">
          </a>
        </div>
        <button class="page-header__menu-trigger" :aria-expanded="menuExpanded" aria-controls="main-menu" type="button">
          <span class="sr-only">Meny</span>
          <span class="burger" />
        </button>
        <nav id="main-menu" class="main-menu">
          <ul class="main-menu__list">
            <li class="main-menu__item">
              <a class="main-menu__link" href="/om-okam/">For forbrukere</a>
            </li>
            <li class="main-menu__item">
              <a class="main-menu__link" href="/verdens-raskeste-vei-til-egen-nettbutikk/">For butikker</a>
            </li>
            <li class="main-menu__item">
              <a class="main-menu__link" href="/kontakt/">Kontakt oss</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
    <main class="page-content">
      <div class="big-teaser">
        <div class="wrapper">
          <div class="big-teaser__content element">
            <img src="https://usercontent.one/wp/www.okam.no/wp-content/uploads/2021/05/startpage_stores.png">
          </div>
          <div class="big-teaser__content element">
            <h1 class="heading-1">
              Den enkleste veien til egen nettbutikk
            </h1>
            <p>Det har aldri vært enklere å starte egen nettbutikk. Ta et bilde av varene du selger, last det opp i din Okam butikk og kunder kan straks legge inn sine bestillinger.</p>
            <div class="big-teaser__links">
              <a class="ga-ios-download" href="https://apps.apple.com/no/developer/okam/id1514296964"><img alt="AppStore" height="40" src="/UI/appstore-btn.png"></a>
              <a class="ga-android-download" href="https://play.google.com/store/apps/developer?id=Okam"><img alt="Google Play" height="40" src="/UI/googleplay-btn.png"></a>
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
                <img src="UI/ill_store.svg" alt="">
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
                <img src="UI/ill-phone.svg" alt="">
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
                <img src="UI/ill-cart.svg" alt="">
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
            <img src="UI/ill-store-dark.svg" alt="">
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

    <footer class="page-footer">
      <div class="wrapper">
        <div class="page-footer__cols">
          <div class="page-footer__col">
            <img class="page-header__logo" src="/UI/okam_logo_dark.svg" alt="">
          </div>
          <div class="page-footer__col">
            <ul class="link-list">
              <li class="link-list__item">
                <a href="/om-okam">Om Okam</a>
              </li>
              <li class="link-list__item">
                <a href="/verdens-raskeste-vei-til-egen-nettbutikk">Om Okam Butikk</a>
              </li>
              <li class="link-list__item">
                <a href="/personvern">Personvern</a>
              </li>
              <li class="link-list__item">
                <a href="/kontakt">Kontakt</a>
              </li>
            </ul>
          </div>
          <div class="page-footer__col">
            <div class="page-footer__contact">
              <h2>Okam AS</h2>
              <p>Org nr.: 925 024 414</p>
              <p>Tlf: 988 65 120<br>E-post: <a href="mailto:post@okam.no">kontakt@okam.no</a></p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
export default {
  data: () => ({
    menuExpanded: false
  })
}
</script>

<style>
/* Old styles */
  .wrapper{max-width:900px;margin-right:auto;margin-left:auto;padding-right:1.875rem;padding-left:1.875rem}.page-header{margin-top:1.875rem}.page-header__wrapper{max-width:1200px;margin-right:auto;margin-left:auto;text-align:center;position:relative;padding-right:1.875rem;padding-left:1.875rem}.page-header__logo{width:60px}@media only screen and (min-width: 40em){.page-header__logo{width:100px}}.page-header__logo-link{border-bottom:none}.page-header__logo-link:focus{box-shadow:none}.page-header__menu-trigger{position:absolute;top:0;right:1.25rem;border:none;background-color:transparent;padding:0;margin:0;width:24px;height:24px;outline:none;z-index:11}.page-header__menu-trigger .burger,.page-header__menu-trigger .burger:before,.page-header__menu-trigger .burger:after{content:"";position:absolute;top:50%;left:0;width:100%;height:2px;background-color:#000;display:block;transition:all .2s ease-in-out}.page-header__menu-trigger .burger:before{top:-8px}.page-header__menu-trigger .burger:after{top:8px}.page-header__menu-trigger:focus .burger,.page-header__menu-trigger:focus .burger:before,.page-header__menu-trigger:focus .burger:after{content:"";height:3px}.page-header__menu-trigger[aria-expanded=true] .burger,.page-header__menu-trigger[aria-expanded=true] .burger:before,.page-header__menu-trigger[aria-expanded=true] .burger:after{top:50%}.page-header__menu-trigger[aria-expanded=true] .burger{background-color:transparent}.page-header__menu-trigger[aria-expanded=true] .burger:before{transform:rotate(45deg);background-color:#fff}.page-header__menu-trigger[aria-expanded=true] .burger:after{transform:rotate(-45deg);background-color:#fff}.page-footer{padding:0 0 4rem;position:relative;background-color:#d5f6e5;margin-top:4rem}@media only screen and (min-width: 40em){.page-footer{padding-bottom:6.25rem;margin-top:6.25rem}}.page-footer:before{content:"";position:absolute;top:-4rem;right:0;bottom:50px;left:0;background-color:#d5f6e5;transform:skewY(2deg);z-index:-1}@media only screen and (min-width: 40em){.page-footer:before{top:-6.25rem}}.page-footer__cols{text-align:center}@media only screen and (min-width: 40em){.page-footer__cols{display:flex;text-align:left}}.page-footer__col{margin-bottom:2.5rem}@media only screen and (min-width: 40em){.page-footer__col{flex:0 0 33.33%;padding-right:1.875rem;margin-bottom:0}}.page-footer__contact h2{font-size:18px;font-size:1.125rem;font-weight:normal;margin-bottom:.625rem}.page-footer__contact p{font-size:14px;font-size:0.875rem}.contrast-block{background-color:#d5f6e5;padding:5rem 0 8rem;transform:skewY(2deg);margin:0 0 -4rem}@media only screen and (min-width: 40em){.contrast-block{padding:6.25rem 0 12.5rem;margin:0 0 -6.25rem}}.contrast-block .wrapper{transform:skewY(-2deg)}.element{padding:1.25rem 1.875rem}.article .wrapper{padding-top:4rem;padding-bottom:4rem}@media only screen and (min-width: 40em){.article .wrapper{padding-top:6.25rem;padding-bottom:6.25rem}}body{margin:0;font-family:"Montserrat",sans-serif;font-size:100%;line-height:1.5;color:#000}body.has-overlay{overflow:hidden}*{box-sizing:border-box}img{max-width:100%;vertical-align:middle}a{color:#000;text-decoration:none;border-bottom:1px solid #000;outline:none}a:focus{box-shadow:0 3px 0 0 #000}button{cursor:pointer}h1,h2,h3,p,ul,ol,form,blockquote,figure{margin:0}.heading-1{font-size:24px;font-size:1.5rem;margin-bottom:.75em;line-height:1.2}@media only screen and (min-width: 40em){.heading-1{font-size:42px;font-size:2.625rem}}p{margin-bottom:1.5em}p:last-child{margin-bottom:0}.sr-only{clip:rect(1px, 1px, 1px, 1px);position:absolute !important}.u-center{text-align:center}.big-teaser .wrapper{padding-top:4rem;padding-bottom:4rem}@media only screen and (min-width: 40em){.big-teaser .wrapper{padding-top:6.25rem;padding-bottom:6.25rem;display:flex;align-items:center}}@media only screen and (min-width: 40em){.big-teaser__content,.big-teaser__image{flex:0 0 50%}}.big-teaser__content{order:2}.big-teaser__content p{font-size:18px;font-size:1.125rem}@media only screen and (min-width: 40em){.big-teaser__content p{font-size:20px;font-size:1.25rem}}.big-teaser__image{text-align:right}.big-teaser--dark{background-color:#4a3a5a;color:#fff;transform:skewY(-2deg)}.big-teaser--dark .wrapper{transform:skewY(2deg)}.big-teaser--dark .big-teaser__content{order:-1;text-align:right}.big-teaser--dark .big-teaser__content a{color:#fff}.big-teaser--dark .big-teaser__image{text-align:left}.media-items--counter{counter-reset:media-counter}.media-item{counter-increment:media-counter}@media only screen and (min-width: 40em){.media-item{display:flex;align-items:center}}.media-item:nth-child(2n+2) .media-item__content{text-align:left}.media-item:nth-child(2n+2) .media-item__image{order:-1;text-align:right}.media-item__content,.media-item__image{flex:0 0 50%}.media-item__content{text-align:right}.media-item__title{font-size:20px;font-size:1.25rem;margin-bottom:.5em}@media only screen and (min-width: 40em){.media-item__title{font-size:24px;font-size:1.5rem}}.media-item__title:before{content:counter(media-counter);background-color:#000;color:#fff;margin-right:.8333333333rem;border-radius:50%;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px #000}.media-item__ingress{font-size:18px;font-size:1.125rem}@media only screen and (min-width: 40em){.media-item__ingress{font-size:20px;font-size:1.25rem}}.faq{padding:4rem 0 5.5rem}@media only screen and (min-width: 40em){.faq{padding:6.25rem 0 9.375rem}}.faq-list__item{margin-bottom:4px;font-size:16px;font-size:1rem}@media only screen and (min-width: 40em){.faq-list__item{font-size:18px;font-size:1.125rem}}.faq-list__item[open] .faq-list__question .icon{transform:rotate(180deg)}.faq-list__question-wrapper{background-color:#ece4ef;padding:1.25rem;cursor:pointer;outline:none}.faq-list__question-wrapper::-webkit-details-marker{display:none}.faq-list__question-wrapper .icon{transition:transform .2s ease-in-out;fill:#4a3a5a;margin-left:1.25rem;width:20px;height:20px;flex-shrink:0}.faq-list__question{display:flex;justify-content:space-between;align-items:center}.faq-list__answer{padding:1rem;margin-bottom:1.25rem;border:5px solid #ece4ef;border-top:none}.link-list{list-style:none;padding:0}.link-list__item{font-size:18px;font-size:1.125rem;margin-bottom:.625rem}.main-menu{position:fixed;background-color:#4a3a5a;top:0;right:0;bottom:0;left:0;z-index:10;padding:5rem 2rem;display:none;overflow:auto}@media only screen and (min-width: 40em){.main-menu{padding:10rem 2rem}}.main-menu__list{list-style:none;padding:0}.main-menu__item{padding:.8333333333rem 0}.main-menu__link{color:#fff;display:inline-block;padding:.15625rem 0;font-size:20px;font-size:1.25rem;border-bottom:none}@media only screen and (min-width: 40em){.main-menu__link{font-size:24px;font-size:1.5rem}}.main-menu__link:hover,.main-menu__link:focus{box-shadow:0 2px 0 0 #fff}.main-menu.is-active{display:block}.wp-block-table{margin:2.5rem 0 .625rem}@media only screen and (min-width: 40em){.wp-block-table{margin-top:3.75rem}}.wp-block-table table{width:100%;padding:0;border-collapse:collapse}.wp-block-table table th,.wp-block-table table td{padding:.625rem;color:#fff;font-size:14px;font-size:0.875rem}@media only screen and (min-width: 40em){.wp-block-table table th,.wp-block-table table td{padding:.8333333333rem 1.25rem;font-size:16px;font-size:1rem}}.wp-block-table table thead th{background-color:#000;padding:.8333333333rem .625rem;border-left:1px solid #fff}@media only screen and (min-width: 40em){.wp-block-table table thead th{font-size:20px;font-size:1.25rem;padding:1.25rem}}.wp-block-table table tbody th{font-weight:normal;text-align:left}.wp-block-table table tbody td{text-align:center;border-left:1px solid #fff}.wp-block-table table tbody td svg{fill:#fff;width:22px;height:22px}@media only screen and (min-width: 40em){.wp-block-table table tbody td.xl-text{font-size:24px;font-size:1.5rem}}.wp-block-table table tbody tr th,.wp-block-table table tbody tr td{background-color:#4a3a5a}.wp-block-table table tbody tr:nth-child(2n+2) th,.wp-block-table table tbody tr:nth-child(2n+2) td{background-color:#6e5f7e}

</style>