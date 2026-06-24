<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">{{ copy.heading }}</h1>

            <article class="page type-page status-publish">
              <div>
                <div class="tiers">
                  <div class="tier">
                    <h4>{{ copy.freeTitle }}</h4>
                    <p class="price">
                      {{ copy.freePrice }}
                      <span class="price-qualifier">{{ copy.freeQualifier }}</span>
                    </p>

                    <div class="feature-list">
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> {{ copy.freeFeature1 }} </span>
                      </div>
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> {{ copy.freeFeature2 }} </span>
                      </div>
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> {{ copy.freeFeature3 }} </span>
                      </div>
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> {{ copy.freeFeature4 }} </span>
                      </div>
                    </div>
                    <FaqItem
                      :q="copy.readMore"
                      :a="copy.freeReadMore"
                    />

                    <div class="cta-wrapper">
                      <a
                        href="/registrer?price=0"
                        class="cta-link"
                        >{{ copy.getStarted }}</a
                      >
                    </div>
                  </div>

                  <div class="tier">
                    <h4>{{ copy.premiumTitle }}</h4>
                    <p class="price">
                      {{ copy.premiumPrice }}
                      <span class="price-qualifier">{{ copy.premiumQualifier }}</span>
                    </p>

                    <div class="feature-list">
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> {{ copy.premiumFeature1 }} </span>
                      </div>
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> {{ copy.premiumFeature2 }} </span>
                      </div>
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> {{ copy.premiumFeature3 }} </span>
                      </div>
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> {{ copy.premiumFeature4 }} </span>
                      </div>
                    </div>

                    <FaqItem
                      :q="copy.readMore"
                      :a="copy.premiumReadMore"
                    />

                    <div class="cta-wrapper">
                      <a
                        href="/registrer?price=1"
                        class="cta-link"
                        >{{ copy.getStarted }}</a
                      >
                    </div>
                  </div>

                  <div class="tier">
                    <div>
                      <h4>{{ copy.ownAppTitle }}</h4>

                      <p class="price">{{ copy.ownAppPrice }}</p>
                      <div class="feature-list">
                        <div class="feature">
                          <span class="material-icons"> check_circle </span>
                          <span class="feature-text"> {{ copy.ownAppFeature1 }} </span>
                        </div>
                        <div class="feature">
                          <span class="material-icons"> check_circle </span>
                          <span class="feature-text"> {{ copy.ownAppFeature2 }} </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <FaqItem
                        :q="copy.readMore"
                        :a="copy.ownAppReadMore"
                      />
                    </div>
                    <div class="cta-wrapper">
                      <a
                        href="/registrer?price=2"
                        class="cta-link"
                        >{{ copy.getStarted }}</a
                      >
                    </div>
                  </div>
                </div>
                <p class="small-text">
                  {{ copy.vatNoteBefore }}
                  <a href="/vilkar">{{ copy.vatNoteLink }}</a>{{ copy.vatNoteAfter }}
                </p>

                <div>
                  <h4>{{ copy.equipmentTitle }}</h4>
                  <p>{{ copy.equipmentText }}</p>
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
import PageHeader from "~/components/organisms/PageHeader.vue";
import PageFooter from "~/components/organisms/PageFooter.vue";
import FaqItem from "~/components/atoms/FaqItem.vue";

export default {
  components: {
    FaqItem,
    PageHeader,
    PageFooter,
  },
  head () {
    return this.isCh
      ? {
          title: "Preise - Okam",
          meta: [
            {
              hid: "description",
              name: "description",
              content:
                "Faire und transparente Preise für Ihre Okam-Bestellplattform. Starten Sie gratis und wählen Sie das Abo, das zu Ihrem Betrieb passt.",
            },
          ],
        }
      : {};
  },
  computed: {
    copy () {
      return this.isCh
        ? {
            heading: "Preise",
            getStarted: "Jetzt starten",
            readMore: "Mehr erfahren",
            freeTitle: "Gratis",
            freePrice: "CHF 0/Monat",
            freeQualifier:
              "Komplett gratis, solange Ihr Umsatz über die App unter CHF 500/Monat liegt",
            freeFeature1: "Voller Zugang zur gesamten Plattform",
            freeFeature2: "Zahlung mit TWINT, Karte oder an der Kasse",
            freeFeature3: "Berichte für die Buchhaltung",
            freeFeature4: "Keine Startkosten",
            freeReadMore:
              "Voller Zugang zu allen Funktionen, komplett gratis, solange der monatliche Umsatz unter CHF 500 liegt. Inklusive Online-Zahlung, Berichten und allem, was Sie für die Verwaltung Ihres Geschäfts brauchen.",
            premiumTitle: "Premium",
            premiumPrice: "CHF 99/Monat",
            premiumQualifier:
              "Wenn Sie über die App mehr als CHF 500/Monat umsetzen",
            premiumFeature1: "Alles aus der Gratisversion",
            premiumFeature2: "Unbegrenzter Umsatz",
            premiumFeature3: "Priorisierter Support",
            premiumFeature4: "Lieferung",
            premiumReadMore:
              "Für Betriebe mit über CHF 500 monatlichem Umsatz. Inklusive aller Funktionen aus der Gratisversion, unbegrenztem Umsatz und priorisiertem Support.",
            ownAppTitle: "Ihre eigene App",
            ownAppPrice: "Kontaktieren Sie uns",
            ownAppFeature1: "Alles aus Premium",
            ownAppFeature2:
              "Eigene Marken-App für iOS und Android sowie im Web.",
            ownAppReadMore:
              "Ihre ganz eigene App mit eigenem Branding, inklusive aller Funktionen aus Premium. Verfügbar im App Store, bei Google Play und im Web.",
            vatNoteBefore:
              "Alle Preise verstehen sich exkl. MwSt. Mehr über unsere Bedingungen erfahren Sie",
            vatNoteLink: "hier",
            vatNoteAfter: ".",
            equipmentTitle: "Ausrüstung",
            equipmentText:
              "Okam funktioniert mit Ihrem eigenen Smartphone oder Tablet. Auf Wunsch können Sie iPad und Drucker bei uns kaufen oder mieten.",
          }
        : {
            heading: "Priser",
            getStarted: "Kom i gang",
            readMore: "Les mer",
            freeTitle: "Gratis",
            freePrice: "0 kr/mnd",
            freeQualifier:
              "Helt gratis inntil du omsetter for 5 000 kr/mnd via appen",
            freeFeature1: "Full tilgang til hele plattformen",
            freeFeature2: "Betaling med Vipps, kort, eller i kassen",
            freeFeature3: "Rapporter til regnskap",
            freeFeature4: "Ingen oppstartskostnad",
            freeReadMore:
              "Full tilgang til alle funksjoner helt gratis så lenge månedlig omsetning er under 5 000 kr. Inkluderer online betaling, rapportering og alt du trenger for å administrere butikken din.",
            premiumTitle: "Premium",
            premiumPrice: "1000 kr/mnd",
            premiumQualifier:
              "Når du omsetter for mer enn 5 000 kr/mnd via appen",
            premiumFeature1: "Alt fra gratisversjonen",
            premiumFeature2: "Ubegrenset omsetning",
            premiumFeature3: "Prioritert support",
            premiumFeature4: "Wolt levering",
            premiumReadMore:
              "For bedrifter med over 5 000 kr i månedlig omsetning. Inkluderer alle funksjoner fra gratisversjonen, ubegrenset omsetning og prioritert support.",
            ownAppTitle: "Din egen app",
            ownAppPrice: "Ta kontakt",
            ownAppFeature1: "Alt fra Premium",
            ownAppFeature2:
              "Egen merkevare-app for både iOS og Android, og på web.",
            ownAppReadMore:
              "Din helt egen app, med egen branding, inkludert alle funksjonene fra Premium. Tilgjengelig i AppStore og Google Play og på web.",
            vatNoteBefore: "Alle priser er ekskl. mva. Les mer om våre vilkår",
            vatNoteLink: "her",
            vatNoteAfter: ".",
            equipmentTitle: "Utstyr",
            equipmentText:
              "Okam fungerer med din egen telefon eller tablet, men dersom ønskelig kan du kjøpe eller leie iPad og printer av oss.",
          };
    },
  },
};
</script>

<style lang="scss">
.small-text {
  font-size: 12px;
}
.tiers {
  .faq-list__item {
    margin-top: 10px;
  }

  .faq-list__question-wrapper {
    padding: 0;
    font-size: 14px;
  }
  .faq-list__answer {
    border: none;
    font-size: 14px;
    padding: 0;
    padding-top: 20px;
  }
  .faq-list__question {
    font-weight: bold;
    svg {
      display: none;
    }
  }

  .price {
    font-size: 32px;
    font-weight: bold;
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;

    .price-qualifier {
      font-size: 14px;
      font-weight: normal;
      color: #666;
      margin-top: 2px;
    }
  }

  .feature-list {
    .material-icons {
      color: #1bb776;
      font-size: 16px;
      padding-top: 2px;
      padding-right: 7px;
    }
    font-size: 14px;

    .feature {
      padding-bottom: 10px;
      display: flex;
      justify-content: space-between;

      &-text {
        flex-grow: 1;
        text-align: left;
      }
    }
  }

  @media only screen and (min-width: 700px) {
    display: flex;
    justify-content: space-between;
  }

  .tier {
    background: #f2f4fb;
    padding: 20px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;

    .cta {
      &-wrapper {
        margin-top: 20px;
        flex-grow: 1;
        display: flex;
        flex-direction: row;
        align-items: flex-end;
      }

      &-link {
        background: #1bb776;
        color: white;
        padding: 10px;
        border-bottom: none;
        text-decoration: none;
        width: 100%;
        text-align: center;
      }
    }

    @media only screen and (min-width: 700px) {
      width: 32%;
    }

    h4 {
      padding-bottom: 20px;
    }

    .campaign-container {
      background-color: #fff3f3;
      border: 1px solid #ff6b6b;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 15px;
    }

    .campaign-label {
      background-color: #ff6b6b;
      color: white;
      font-size: 14px;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .campaign-info {
      font-size: 14px;
      color: #333;
      margin-top: 8px;
      line-height: 1.4;

      strong {
        color: #ff6b6b;
      }
    }
  }
}
</style>
