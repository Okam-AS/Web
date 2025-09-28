<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">Priser</h1>

            <article class="page type-page status-publish">
              <div>
                <div class="tiers">
                  <div class="tier">
                    <h4>Gratis</h4>
                    <p class="price">
                      0 kr/mnd
                      <span class="price-qualifier">Helt gratis inntil du omsetter for 5 000 kr/mnd via appen</span>
                    </p>

                    <div class="feature-list">
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> Full tilgang til hele plattformen </span>
                      </div>
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> Betaling med Vipps, kort, eller i kassen </span>
                      </div>
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> Rapporter til regnskap </span>
                      </div>
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> Ingen oppstartskostnad </span>
                      </div>
                    </div>
                    <FaqItem
                      q="Les mer"
                      a="Full tilgang til alle funksjoner helt gratis så lenge månedlig omsetning er under 5 000 kr. Inkluderer online betaling, rapportering og alt du trenger for å administrere butikken din."
                    />

                    <div class="cta-wrapper">
                      <a
                        href="/registrer?price=0"
                        class="cta-link"
                        >Kom i gang</a
                      >
                    </div>
                  </div>

                  <div class="tier">
                    <h4>Premium</h4>
                    <p class="price">
                      1000 kr/mnd
                      <span class="price-qualifier">Når du omsetter for mer enn 5 000 kr/mnd via appen</span>
                    </p>

                    <div class="feature-list">
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> Alt fra gratisversjonen </span>
                      </div>
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> Ubegrenset omsetning </span>
                      </div>
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> Prioritert support </span>
                      </div>
                      <div class="feature">
                        <span class="material-icons"> check_circle </span>
                        <span class="feature-text"> Wolt levering </span>
                      </div>
                    </div>

                    <FaqItem
                      q="Les mer"
                      a="For bedrifter med over 5 000 kr i månedlig omsetning. Inkluderer alle funksjoner fra gratisversjonen, ubegrenset omsetning og prioritert support."
                    />

                    <div class="cta-wrapper">
                      <a
                        href="/registrer?price=1"
                        class="cta-link"
                        >Kom i gang</a
                      >
                    </div>
                  </div>

                  <div class="tier">
                    <div>
                      <h4>Din merkevare</h4>

                      <p class="price">Ta kontakt</p>
                      <div class="feature-list">
                        <div class="feature">
                          <span class="material-icons"> check_circle </span>
                          <span class="feature-text"> Alt fra Premium </span>
                        </div>
                        <div class="feature">
                          <span class="material-icons"> check_circle </span>
                          <span class="feature-text"> Egen merkevare-app for både iOS og Android, og på web. </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <FaqItem
                        q="Les mer"
                        a="Din helt egen app, med egen branding, inkludert alle funksjonene fra Premium. Tilgjengelig i AppStore og Google Play og på web."
                      />
                    </div>
                    <div class="cta-wrapper">
                      <a
                        href="/registrer?price=2"
                        class="cta-link"
                        >Kom i gang</a
                      >
                    </div>
                  </div>
                </div>
                <p class="small-text">
                  Alle priser er ekskl. mva. Les mer om våre vilkår
                  <a href="/vilkar">her</a>.
                </p>

                <div>
                  <h4>Utstyr</h4>
                  <p>Okam fungerer med din egen telefon eller tablet, men dersom ønskelig kan du kjøpe eller leie iPad og printer av oss.</p>
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
