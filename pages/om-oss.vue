<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">{{ copy.heading }}</h1>
            <!-- article -->
            <article class="page type-page status-publish hentry">
              <div>
                <p>{{ copy.intro1 }}</p>

                <p>{{ copy.intro2 }}</p>

                <p>{{ copy.intro3 }}</p>

                <ul>
                  <li>{{ copy.benefit1 }}</li>
                  <li>{{ copy.benefit2 }}</li>
                  <li>{{ copy.benefit3 }}</li>
                  <li>{{ copy.benefit4 }}</li>
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
                    <p>{{ copy.quote }}</p>
                    <footer>{{ copy.quoteAuthor }}</footer>
                  </blockquote>
                </div>
              </div>

              <div class="cta-section">
                <div class="cta-card">
                  <h3>{{ copy.ctaOwnerTitle }}</h3>
                  <p>{{ copy.ctaOwnerText }}</p>
                  <nuxt-link
                    to="/egen-app"
                    class="cta-button"
                  >
                    {{ copy.ctaOwnerLink }}
                  </nuxt-link>
                </div>

                <div class="cta-card">
                  <h3>{{ copy.ctaCustomerTitle }}</h3>
                  <p>{{ copy.ctaCustomerText }}</p>
                  <div class="app-download-buttons">
                    <a
                      class="ga-ios-download"
                      href="https://apps.apple.com/no/app/okam/id1514296965"
                      ><img
                        :alt="copy.appStoreAlt"
                        height="40"
                        width="120"
                        src="~assets/UI/appstore-btn.png"
                    /></a>
                    <a
                      class="ga-android-download"
                      href="https://play.google.com/store/apps/details?id=no.okam.consumer"
                      ><img
                        :alt="copy.googlePlayAlt"
                        height="40"
                        width="130"
                        src="~assets/UI/googleplay-btn.png"
                    /></a>
                  </div>
                </div>
              </div>

              <p style="margin-top: 50px">
                <strong>{{ copy.tipsTitle }}</strong>
                <a href="/kontakt/">{{ copy.tipsLink }}</a>.
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
import PageHeader from "~/components/organisms/PageHeader.vue";
import PageFooter from "~/components/organisms/PageFooter.vue";

export default {
  components: { PageHeader, PageFooter },
  head () {
    return this.isCh
      ? {
          title: "Über uns - Okam",
          meta: [
            {
              hid: "description",
              name: "description",
              content:
                "Okam stärkt lokale Betriebe mit einer eigenen Marken-App und einem Webshop. Erfahren Sie mehr über unsere Mission und unser Team."
            }
          ]
        }
      : {};
  },
  computed: {
    copy () {
      return this.isCh
        ? {
            heading: "Über uns",
            intro1:
              "Okam ist eine Bestellplattform, die den lokalen Handel für alle einfacher macht. Wir geben Betrieben ihre eigene Marken-App und ihren eigenen Webshop.",
            intro2:
              "Unsere Mission ist es, lokale Betriebe in einer Zeit zu stärken, in der grosse Ketten dominieren - denn es sind die kleinen, unabhängigen Betriebe, die Vielfalt und Charakter in unsere Quartiere bringen.",
            intro3:
              "In mehreren Jahren Entwicklung haben wir eine Lösung geschaffen, die leistungsstark und gleichzeitig einfach zu bedienen ist. Unsere Kundinnen und Kunden berichten von:",
            benefit1: "Höherem Umsatz",
            benefit2: "Besserer Kundenbindung",
            benefit3: "Effizienterem Betrieb",
            benefit4: "Spürbaren Kosteneinsparungen",
            quote:
              "\"Wir bauen eine grosse Plattform für die Kleinen und messen unseren Erfolg daran, wie zufrieden unsere Partner sind. Indem wir Restaurants und lokalen Geschäften Zugang zu moderner Technologie geben, können sie mit den grossen Ketten auf Augenhöhe konkurrieren.\"",
            quoteAuthor: "- Alireza Sharghi, Geschäftsführer",
            ctaOwnerTitle: "Sind Sie Geschäftsinhaber?",
            ctaOwnerText:
              "Steigern Sie Ihren Umsatz mit Ihrer eigenen App und Ihrem eigenen Webshop",
            ctaOwnerLink: "Mehr über die eigene App",
            ctaCustomerTitle: "Sind Sie Kundin oder Kunde?",
            ctaCustomerText:
              "Laden Sie Okam herunter, um bei Geschäften in Ihrer Nähe einzukaufen",
            appStoreAlt: "Okam-App im App Store herunterladen",
            googlePlayAlt: "Okam-App bei Google Play herunterladen",
            tipsTitle:
              "Haben Sie einen Tipp für einen Ort, an dem Sie gerne mit Okam einkaufen würden?",
            tipsLink: "Schreiben Sie uns hier gerne eine Nachricht"
          }
        : {
            heading: "Om oss",
            intro1:
              "Okam er en norskutviklet bestillingsplattform som gjør lokal handel enklere for alle. Vi gir bedrifter sin egen merkevareapp og nettbutikk.",
            intro2:
              "Vår misjon er å styrke lokale bedrifter i en tid der store kjeder dominerer - fordi det er de små, uavhengige bedriftene som skaper mangfold og særpreg i lokalmiljøet vårt.",
            intro3:
              "Gjennom flere års utvikling i Norge har vi skapt en løsning som er både kraftfull og enkel å bruke. Våre kunder melder om:",
            benefit1: "Økt omsetning",
            benefit2: "Bedre kundelojalitet",
            benefit3: "Mer effektiv drift",
            benefit4: "Betydelige kostnadsbesparelser",
            quote:
              "\"Vi bygger en stor plattform for de små, og måler vår suksess etter hvor fornøyde våre partnere er. Ved å gi restauranter og lokale butikker tilgang til moderne teknologi, kan de konkurrere på like vilkår med de store kjedene.\"",
            quoteAuthor: "- Alireza Sharghi, Daglig leder",
            ctaOwnerTitle: "Er du butikkeier?",
            ctaOwnerText: "Øk salget med din egen app og nettbutikk",
            ctaOwnerLink: "Les mer om egen app",
            ctaCustomerTitle: "Er du kunde?",
            ctaCustomerText:
              "Last ned Okam for å handle fra butikker i ditt nærområde",
            appStoreAlt: "Last ned Okam-appen på App Store",
            googlePlayAlt: "Last ned Okam-appen på Google Play",
            tipsTitle:
              "Har du tips om et sted du skulle likt å handle med Okam?",
            tipsLink: "Send oss gjerne en melding her"
          };
    }
  }
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
