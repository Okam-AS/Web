<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">Om oss</h1>
            <!-- article -->
            <article class="page type-page status-publish hentry">
              <div>
                <p>Okam er en norskutviklet bestillingsplattform som gjør lokal handel enklere for alle. Vi gir bedrifter sin egen merkevareapp og nettbutikk.</p>

                <p>Vår misjon er å styrke lokale bedrifter i en tid der store kjeder dominerer - fordi det er de små, uavhengige bedriftene som skaper mangfold og særpreg i lokalmiljøet vårt.</p>

                <p>Gjennom flere års utvikling i Norge har vi skapt en løsning som er både kraftfull og enkel å bruke. Våre kunder melder om:</p>

                <ul>
                  <li>Økt omsetning</li>
                  <li>Bedre kundelojalitet</li>
                  <li>Mer effektiv drift</li>
                  <li>Betydelige kostnadsbesparelser</li>
                </ul>
              </div>

              <div class="founder-section">
                <img
                  src="~/assets/UI/team/andre.png"
                  alt="Alireza Sharghi"
                  class="founder-image"
                />
                <div class="founder-content">
                  <blockquote class="leader-quote">
                    <p>"Vi bygger en stor plattform for de små, og måler vår suksess etter hvor fornøyde våre partnere er. Ved å gi restauranter og lokale butikker tilgang til moderne teknologi, kan de konkurrere på like vilkår med de store kjedene."</p>
                    <footer>- Alireza Sharghi, Daglig leder</footer>
                  </blockquote>
                </div>
              </div>

              <div class="cta-section">
                <div class="cta-card">
                  <h3>Er du butikkeier?</h3>
                  <p>Øk salget med din egen app og nettbutikk</p>
                  <nuxt-link
                    to="/egen-app"
                    class="cta-button"
                  >
                    Les mer om egen app
                  </nuxt-link>
                </div>

                <div class="cta-card">
                  <h3>Er du kunde?</h3>
                  <p>Last ned Okam for å handle fra butikker i ditt nærområde</p>
                  <div class="app-download-buttons">
                    <a
                      class="ga-ios-download"
                      href="https://apps.apple.com/no/app/okam/id1514296965"
                      ><img
                        alt="Last ned Okam-appen på App Store"
                        height="40"
                        width="120"
                        src="~assets/UI/appstore-btn.png"
                    /></a>
                    <a
                      class="ga-android-download"
                      href="https://play.google.com/store/apps/details?id=no.okam.consumer"
                      ><img
                        alt="Last ned Okam-appen på Google Play"
                        height="40"
                        width="130"
                        src="~assets/UI/googleplay-btn.png"
                    /></a>
                  </div>
                </div>
              </div>

              <p style="margin-top: 50px">
                <strong>Har du tips om et sted du skulle likt å handle med Okam?</strong>
                <a href="/kontakt/">Send oss gjerne en melding her</a>.
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
import PageHeader from "@/components/organisms/PageHeader.vue";
import PageFooter from "@/components/organisms/PageFooter.vue";

export default {
  components: { PageHeader, PageFooter },
};
</script>

<style lang="scss" scoped>
.cta-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin: 3rem 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.cta-card {
  background: #f5f5f5;
  padding: 2rem;
  border-radius: 8px;
  text-align: center;

  h3 {
    color: #003058;
    margin-bottom: 1rem;
  }

  p {
    margin-bottom: 1.5rem;
  }
}

.cta-button {
  display: inline-block;
  background: #ff6b6b;
  color: white;
  padding: 0.8rem 1.5rem;
  border-radius: 4px;
  text-decoration: none;
  transition: background 0.2s;
  border-bottom: none;

  &:hover {
    background: #ff5252;
  }
}

.app-download-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;

  img {
    height: 40px;
    width: auto;
  }

  a {
    border-bottom: none;
  }
}

.founder-section {
  display: flex;
  gap: 2rem;
  align-items: center;
  margin: 3rem 0;
  padding: 2rem;
  background: #f5f5f5;
  border-radius: 8px;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
}

.founder-image {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  object-fit: cover;
}

.founder-content {
  h2 {
    color: #003058;
    margin-bottom: 1rem;
  }
}

.leader-quote {
  margin-top: 1.5rem;
  padding-left: 1rem;
  border-left: 3px solid #003058;
  font-style: italic;

  footer {
    margin-top: 0.5rem;
    font-style: normal;
    color: #666;
  }
}

ul {
  list-style: none;
  margin: 2rem 0;

  li {
    position: relative;
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;

    &:before {
      content: "";
      position: absolute;
      left: 0;
      top: 0.5rem;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ff6b6b;
    }
  }
}
</style>
