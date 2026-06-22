<template>
  <div>
    <page-header />
    <main class="ch-landing">
      <!-- Hero -->
      <section class="hero">
        <div class="hero__bg" aria-hidden="true"></div>
        <div class="container hero__inner">
          <div class="hero__copy">
            <span class="eyebrow">Bestellplattform für die Schweiz</span>
            <h1 class="hero__title">
              Ihre eigene Bestell-App. <span class="accent">Ohne Provisionen.</span>
            </h1>
            <p class="hero__lead">
              Okam ist die All-in-One Bestellplattform für Restaurants und Kleinbetriebe.
              Webshop, eigene App, Kasse und Lieferung &ndash; alles aus einer Hand,
              entwickelt für den Schweizer Markt.
            </p>
            <div class="hero__cta">
              <a href="/kontakt" class="btn btn--primary">Demo buchen</a>
              <a href="/priser" class="btn btn--ghost">Preise ansehen</a>
            </div>
            <ul class="hero__points">
              <li><span class="material-icons">check_circle</span> In wenigen Tagen startklar</li>
              <li><span class="material-icons">check_circle</span> Keine Bestellgebühren pro Order</li>
              <li><span class="material-icons">check_circle</span> Support auf Deutsch</li>
            </ul>
          </div>
          <div class="hero__visual">
            <img
              src="~/assets/UI/front-page.png"
              alt="Okam Bestell-App für Restaurants"
              width="440"
              height="440"
            />
          </div>
        </div>
      </section>

      <!-- Trust / social proof -->
      <section class="trust">
        <div class="container">
          <p class="trust__label">Beliebt bei Gastronomen und Kleinbetrieben</p>
          <div class="trust__stats">
            <div class="trust__stat">
              <span class="trust__num">4,9</span>
              <span class="trust__desc">
                <span class="stars" aria-hidden="true">★★★★★</span>
                Durchschnittliche App-Bewertung
              </span>
            </div>
            <div class="trust__stat">
              <span class="trust__num">1000+</span>
              <span class="trust__desc">Bestellungen jeden Monat verarbeitet</span>
            </div>
            <div class="trust__stat">
              <span class="trust__num">0&nbsp;%</span>
              <span class="trust__desc">Provision auf Ihre Bestellungen</span>
            </div>
          </div>
        </div>
      </section>

      <!-- How it works -->
      <section class="how">
        <div class="container">
          <header class="section-head">
            <h2 class="section-title">So einfach erhalten Sie Bestellungen</h2>
            <p class="section-sub">In drei Schritten zu Ihrer eigenen digitalen Bestelllosung.</p>
          </header>
          <div class="how__grid">
            <article
              v-for="(step, i) in steps"
              :key="step.title"
              class="how__step"
            >
              <div class="how__num">{{ i + 1 }}</div>
              <span class="material-icons how__icon">{{ step.icon }}</span>
              <h3 class="how__title">{{ step.title }}</h3>
              <p class="how__text">{{ step.text }}</p>
            </article>
          </div>
        </div>
      </section>

      <!-- Showcase -->
      <section class="showcase">
        <div class="container showcase__inner">
          <div class="showcase__copy">
            <span class="eyebrow eyebrow--dark">Alles im Blick</span>
            <h2 class="section-title section-title--left">Ein Dashboard für Ihren ganzen Betrieb</h2>
            <p class="showcase__text">
              Verwalten Sie Bestellungen aus Webshop, App und Lieferpartnern an einem Ort.
              Aktualisieren Sie die Speisekarte in Echtzeit und behalten Sie Ihren Umsatz im Blick &ndash;
              vom Tablet, Telefon oder Computer.
            </p>
            <ul class="showcase__list">
              <li><span class="material-icons">bolt</span> Bestellungen automatisch auf der Küche ausdrucken</li>
              <li><span class="material-icons">insights</span> Umsatz und Statistiken in Echtzeit</li>
              <li><span class="material-icons">restaurant_menu</span> Speisekarte jederzeit selbst anpassen</li>
            </ul>
            <a href="/kontakt" class="btn btn--primary">Live-Demo anfordern</a>
          </div>
          <div class="showcase__visual">
            <img
              src="~/assets/UI/okam-admin-bestillinger.png"
              alt="Okam Admin-Dashboard mit Bestellübersicht"
              width="560"
              height="530"
            />
          </div>
        </div>
      </section>

      <!-- Features -->
      <section class="features">
        <div class="container">
          <header class="section-head">
            <h2 class="section-title">Das ist alles dabei</h2>
            <p class="section-sub">Eine Plattform, die mit Ihrem Betrieb mitwächst.</p>
          </header>
          <div class="features__grid">
            <article
              v-for="feature in features"
              :key="feature.title"
              class="feature-card"
            >
              <div class="feature-card__icon">
                <span class="material-icons">{{ feature.icon }}</span>
              </div>
              <h3 class="feature-card__title">{{ feature.title }}</h3>
              <p class="feature-card__text">{{ feature.text }}</p>
            </article>
          </div>
        </div>
      </section>

      <!-- Why Okam -->
      <section class="why">
        <div class="container">
          <header class="section-head">
            <h2 class="section-title">Warum Okam?</h2>
            <p class="section-sub">Die direkte Verbindung zu Ihren Gästen &ndash; ohne Mittelsmann.</p>
          </header>
          <div class="why__grid">
            <article
              v-for="benefit in benefits"
              :key="benefit.title"
              class="why-card"
            >
              <span class="material-icons why-card__icon">{{ benefit.icon }}</span>
              <div>
                <h3 class="why-card__title">{{ benefit.title }}</h3>
                <p class="why-card__text">{{ benefit.text }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- Payments / TWINT -->
      <section class="payments">
        <div class="container">
          <header class="section-head">
            <span class="eyebrow">Bezahlen</span>
            <h2 class="section-title">Zahlung, die Ihre Gäste kennen</h2>
            <p class="section-sub">
              Mit <strong>TWINT</strong> bezahlen Ihre Gäste in Sekunden &ndash; scannen,
              bestätigen, fertig. Karten, Wallets und Bezahlung im Lokal inklusive.
            </p>
          </header>
          <div class="payments__panel">
            <div class="payments__methods">
              <div class="pay-method pay-method--twint">
                <span class="pay-method__badge">TWINT</span>
                <span class="pay-method__label">Schnell mit der App</span>
              </div>
              <div class="pay-method">
                <span class="material-icons">credit_card</span>
                <span class="pay-method__label">Kredit- &amp; Debitkarte</span>
              </div>
              <div class="pay-method">
                <span class="material-icons">smartphone</span>
                <span class="pay-method__label">Apple Pay &amp; Google Pay</span>
              </div>
              <div class="pay-method">
                <span class="material-icons">storefront</span>
                <span class="pay-method__label">Im Lokal bezahlen</span>
              </div>
            </div>
            <div class="payments__cta">
              <p>Sehen Sie, wie eine TWINT-Zahlung für Ihre Gäste aussieht &ndash; live im Demo-Checkout.</p>
              <a href="/twint" class="btn btn--primary">TWINT-Zahlung ansehen</a>
            </div>
          </div>
        </div>
      </section>

      <!-- Pricing teaser -->
      <section class="pricing">
        <div class="container">
          <header class="section-head">
            <h2 class="section-title">Faire Preise, keine Überraschungen</h2>
            <p class="section-sub">Ein fester Monatspreis &ndash; und Sie behalten jeden Franken Ihrer Bestellungen.</p>
          </header>
          <div class="pricing__card">
            <div class="pricing__badge">Beliebt</div>
            <p class="pricing__plan">Okam Komplett</p>
            <p class="pricing__amount">
              <span class="pricing__currency">CHF</span>
              <span class="pricing__value">99.&ndash;</span>
              <span class="pricing__period">/ Monat</span>
            </p>
            <p class="pricing__note">Eigener Webshop, Admin-Dashboard und persönlicher Support inklusive.</p>
            <ul class="pricing__list">
              <li><span class="material-icons">check</span> Keine Provision pro Bestellung</li>
              <li><span class="material-icons">check</span> Unbegrenzte Bestellungen und Produkte</li>
              <li><span class="material-icons">check</span> Eigene App optional zubuchbar</li>
              <li><span class="material-icons">check</span> Monatlich kündbar</li>
            </ul>
            <a href="/priser" class="btn btn--primary btn--block">Alle Preise ansehen</a>
            <p class="pricing__hint">Preise in CHF, exkl. MwSt.</p>
          </div>
        </div>
      </section>

      <!-- Closing CTA / demo form -->
      <section ref="contact" class="cta">
        <div class="container">
          <div class="cta__panel">
            <div class="cta__intro">
              <h2 class="cta__title">Bereit für Ihre eigene Bestellplattform?</h2>
              <p class="cta__lead">
                Buchen Sie eine unverbindliche Demo. Wir zeigen Ihnen in 20 Minuten,
                wie Okam für Ihren Betrieb funktioniert.
              </p>
              <ul class="cta__points">
                <li><span class="material-icons">schedule</span> Unverbindlich und kostenlos</li>
                <li><span class="material-icons">support_agent</span> Beratung auf Deutsch</li>
              </ul>
            </div>

            <form
              v-if="!messageSent"
              class="cta__form"
              @submit.prevent="submitDemo"
            >
              <div class="field">
                <label>Name des Betriebs</label>
                <input v-model="storeName" type="text" maxlength="100" />
                <p v-if="showValidation && !storeName.length" class="field__error">
                  Bitte geben Sie den Namen Ihres Betriebs ein
                </p>
              </div>
              <div class="field">
                <label>Name der Kontaktperson</label>
                <input v-model="contactName" type="text" maxlength="100" />
                <p v-if="showValidation && !contactName.length" class="field__error">
                  Bitte geben Sie eine Kontaktperson ein
                </p>
              </div>
              <div class="field">
                <label>Wie möchten Sie kontaktiert werden?</label>
                <select v-model="contactPreference">
                  <option value="phone">Rufen Sie mich an</option>
                  <option value="email">Schreiben Sie mir eine E-Mail</option>
                </select>
              </div>
              <div class="field">
                <label>Telefonnummer</label>
                <input
                  v-model="phone"
                  type="text"
                  maxlength="100"
                  :placeholder="phonePrefix + ' ...'"
                  :required="contactPreference === 'phone'"
                />
                <p
                  v-if="showValidation && contactPreference === 'phone' && !phone.trim().length"
                  class="field__error"
                >
                  Bitte geben Sie eine Telefonnummer ein
                </p>
              </div>
              <div class="field">
                <label>E-Mail</label>
                <input
                  v-model="email"
                  type="email"
                  maxlength="100"
                  :required="contactPreference === 'email'"
                />
                <p
                  v-if="showValidation && contactPreference === 'email' && !email.trim().length"
                  class="field__error"
                >
                  Bitte geben Sie eine E-Mail-Adresse ein
                </p>
              </div>
              <button type="submit" class="btn btn--primary btn--block">Demo buchen</button>
            </form>

            <div v-else class="cta__success">
              <span class="material-icons">check_circle</span>
              <p>
                Vielen Dank für Ihr Interesse! Wir melden uns
                {{ contactPreference === "phone" ? "telefonisch" : "per E-Mail" }}
                so schnell wie möglich bei Ihnen.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
    <page-footer />
  </div>
</template>

<script>
import { market } from "~/config/edition";
import PageHeader from "~/components/organisms/PageHeader.vue";
import PageFooter from "~/components/organisms/PageFooter.vue";

export default {
  name: "SwissLanding",
  components: { PageHeader, PageFooter },
  data: () => ({
    phonePrefix: market.phonePrefix,
    steps: [
      {
        icon: "design_services",
        title: "Wir richten Ihren Shop ein",
        text: "Wir erstellen Ihren Webshop und Ihre Speisekarte mit Ihrem Logo und Ihrem Design – passend zu Ihrer Marke.",
      },
      {
        icon: "smartphone",
        title: "Ihre Gäste bestellen",
        text: "Ihre Kundinnen und Kunden bestellen bequem über den Webshop, die App oder direkt am Tisch per QR-Code.",
      },
      {
        icon: "receipt_long",
        title: "Sie erhalten die Bestellung",
        text: "Bestellungen erscheinen sofort im Dashboard und können für die Küche automatisch ausgedruckt werden.",
      },
    ],
    features: [
      {
        icon: "language",
        title: "Eigener Webshop",
        text: "Eine komplette Bestellseite, die auf jedem Gerät funktioniert – ganz ohne App-Download.",
      },
      {
        icon: "phone_iphone",
        title: "Eigene App",
        text: "Eine massgeschneiderte App mit Ihrem Branding für App Store und Google Play.",
      },
      {
        icon: "settings",
        title: "Admin-Dashboard",
        text: "Bestellungen verwalten, Speisekarte aktualisieren und Verkaufszahlen verfolgen – alles an einem Ort.",
      },
      {
        icon: "delivery_dining",
        title: "Lieferung integriert",
        text: "Nahtlose Anbindung an Lieferpartner für eine effiziente Auslieferung an Ihre Gäste.",
      },
      {
        icon: "qr_code_scanner",
        title: "QR-Bestellung am Tisch",
        text: "Gäste bestellen direkt am Tisch – ohne auf die Bedienung zu warten.",
      },
      {
        icon: "card_giftcard",
        title: "Treueprogramm",
        text: "Integrierte Bonus- und Cashback-Programme, die Ihre Gäste immer wieder zurückbringen.",
      },
      {
        icon: "print",
        title: "Automatischer Bondruck",
        text: "Bestellungen werden für die Küche automatisch gedruckt – ideal für Stosszeiten.",
      },
      {
        icon: "insights",
        title: "Statistiken und Einblicke",
        text: "Verstehen Sie Ihre Gäste mit klaren Auswertungen zu Umsatz und Bestellverhalten.",
      },
    ],
    benefits: [
      {
        icon: "trending_up",
        title: "Dokumentiertes Wachstum",
        text: "Betriebe verzeichnen im ersten Jahr nach dem Start oft deutlich mehr Bestellungen.",
      },
      {
        icon: "handshake",
        title: "Direkte Kundenbeziehung",
        text: "Bauen Sie eine starke Beziehung zu Ihren Gästen auf – über Ihre eigene Plattform statt über Dritte.",
      },
      {
        icon: "savings",
        title: "Keine Provisionen",
        text: "Sie zahlen einen festen Monatspreis und behalten den vollen Ertrag jeder Bestellung.",
      },
      {
        icon: "bolt",
        title: "Effizienter Betrieb",
        text: "Automatisieren Sie den Bestellablauf, reduzieren Sie Telefonzeit und vermeiden Sie Fehler.",
      },
      {
        icon: "verified",
        title: "Persönlicher Support",
        text: "Wir begleiten Sie persönlich – mit Beratung und technischem Support auf Deutsch.",
      },
      {
        icon: "devices",
        title: "Einfache Verwaltung",
        text: "Steuern Sie alles vom Tablet, Telefon oder Computer – jederzeit und überall.",
      },
    ],
    storeName: "",
    contactName: "",
    phone: "",
    email: "",
    contactPreference: "phone",
    showValidation: false,
    messageSent: false,
  }),

  head() {
    return {
      title: "Okam – Ihre eigene Bestell-App für Restaurants in der Schweiz",
      meta: [
        {
          hid: "description",
          name: "description",
          content:
            "Okam ist die All-in-One Bestellplattform für Schweizer Restaurants und Kleinbetriebe: eigener Webshop, App, Dashboard und Lieferung – ohne Provisionen.",
        },
        {
          hid: "og:title",
          property: "og:title",
          content: "Okam – Bestellplattform für die Schweiz",
        },
        {
          hid: "og:description",
          property: "og:description",
          content:
            "Eigener Webshop und App für Ihren Betrieb. Bestellungen ohne Provision, Support auf Deutsch.",
        },
      ],
    };
  },

  computed: {
    isFormValid() {
      const hasBasics = this.storeName.length > 0 && this.contactName.length > 0;
      const hasContact =
        this.contactPreference === "phone"
          ? this.phone.trim().length > 0
          : this.email.trim().length > 0;
      return hasBasics && hasContact;
    },
  },

  methods: {
    async submitDemo() {
      this.showValidation = true;
      if (!this.isFormValid) return;

      this.messageSent = true;
      const data = {
        feedback: `[CH] Betrieb: ${this.storeName} | Name: ${this.contactName} | Tel: ${this.phone} | Mail: ${this.email} | Kontaktart: ${this.contactPreference} | Startseite`,
        source: "/",
      };
      await fetch("https://okamapi.azurewebsites.net/stores/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
  },
};
</script>

<style lang="scss" scoped>
$green: #1bb776;
$green-dark: #159f63;
$ink: #292c34;
$muted: #64748b;
$line: #e2e8f0;
$bg-soft: #f8f9fa;

.ch-landing {
  min-height: 100vh;
  font-family: "Montserrat", sans-serif;
  color: $ink;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Shared bits ------------------------------------------------------------ */
.eyebrow {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $green-dark;
  background: rgba(27, 183, 118, 0.1);
  padding: 6px 14px;
  border-radius: 999px;
  margin-bottom: 20px;

  &--dark {
    color: $green-dark;
  }
}

.accent {
  color: $green;
}

.section-head {
  text-align: center;
  max-width: 640px;
  margin: 0 auto 56px;
}

.section-title {
  font-size: 2.4rem;
  font-weight: 700;
  color: $ink;
  margin: 0 0 14px;
  line-height: 1.2;

  &--left {
    text-align: left;
    margin-bottom: 20px;
  }
}

.section-sub {
  font-size: 1.1rem;
  color: $muted;
  margin: 0;
  line-height: 1.6;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  padding: 14px 28px;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;

  &--primary {
    background: linear-gradient(135deg, $green 0%, $green-dark 100%);
    color: #fff;
    box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
    }
  }

  &--ghost {
    background: #fff;
    color: $ink;
    border-color: $line;

    &:hover {
      background: $bg-soft;
      border-color: #cbd5e0;
      transform: translateY(-1px);
    }
  }

  &--block {
    width: 100%;
  }
}

/* Hero ------------------------------------------------------------------- */
.hero {
  position: relative;
  background: linear-gradient(180deg, #f4fbf8 0%, #ffffff 100%);
  overflow: hidden;
}

.hero__bg {
  position: absolute;
  top: -160px;
  right: -160px;
  width: 560px;
  height: 560px;
  background: radial-gradient(circle, rgba(27, 183, 118, 0.16) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.hero__inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 64px;
  padding-top: 88px;
  padding-bottom: 96px;
}

.hero__copy {
  flex: 1 1 540px;
}

.hero__title {
  font-size: 3.2rem;
  font-weight: 700;
  line-height: 1.1;
  margin: 0 0 22px;
  color: $ink;
}

.hero__lead {
  font-size: 1.2rem;
  line-height: 1.65;
  color: $muted;
  margin: 0 0 32px;
  max-width: 520px;
}

.hero__cta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 32px;
}

.hero__points {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
    font-weight: 500;
    color: $ink;
  }

  .material-icons {
    font-size: 1.2rem;
    color: $green;
  }
}

.hero__visual {
  flex: 1 1 380px;
  display: flex;
  justify-content: center;

  img {
    width: 100%;
    max-width: 440px;
    height: auto;
    filter: drop-shadow(0 24px 48px rgba(0, 0, 0, 0.12));
  }
}

/* Trust ------------------------------------------------------------------ */
.trust {
  background: #fff;
  padding: 48px 0;
  border-bottom: 1px solid $line;
}

.trust__label {
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.8rem;
  font-weight: 600;
  color: $muted;
  margin: 0 0 28px;
}

.trust__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.trust__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.trust__num {
  font-size: 2.6rem;
  font-weight: 800;
  color: $green;
  line-height: 1;
}

.trust__desc {
  font-size: 0.95rem;
  color: $muted;
  max-width: 220px;
}

.stars {
  display: block;
  color: #ffc107;
  font-size: 1rem;
  letter-spacing: 2px;
}

/* How it works ----------------------------------------------------------- */
.how {
  background: $bg-soft;
  padding: 96px 0;
}

.how__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}

.how__step {
  position: relative;
  background: #fff;
  border: 1px solid $line;
  border-radius: 16px;
  padding: 40px 28px 32px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  }
}

.how__num {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, $green 0%, $green-dark 100%);
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
}

.how__icon {
  font-size: 2.6rem;
  color: $green;
  margin-bottom: 14px;
}

.how__title {
  font-size: 1.2rem;
  font-weight: 600;
  color: $ink;
  margin: 0 0 10px;
}

.how__text {
  color: $muted;
  line-height: 1.6;
  margin: 0;
}

/* Showcase --------------------------------------------------------------- */
.showcase {
  background: #fff;
  padding: 96px 0;
}

.showcase__inner {
  display: flex;
  align-items: center;
  gap: 64px;
}

.showcase__copy {
  flex: 1 1 460px;
}

.showcase__text {
  font-size: 1.1rem;
  line-height: 1.7;
  color: $muted;
  margin: 0 0 24px;
}

.showcase__list {
  list-style: none;
  margin: 0 0 32px;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1rem;
    font-weight: 500;
    color: $ink;
    padding: 10px 0;
    border-bottom: 1px solid $line;
  }

  .material-icons {
    color: $green;
    font-size: 1.4rem;
  }
}

.showcase__visual {
  flex: 1 1 480px;
  display: flex;
  justify-content: center;

  img {
    width: 100%;
    max-width: 560px;
    height: auto;
    border-radius: 16px;
    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.14);
  }
}

/* Features --------------------------------------------------------------- */
.features {
  background: $bg-soft;
  padding: 96px 0;
}

.features__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}

.feature-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 28px 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
  }
}

.feature-card__icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: rgba(27, 183, 118, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;

  .material-icons {
    font-size: 1.6rem;
    color: $green;
  }
}

.feature-card__title {
  font-size: 1.15rem;
  font-weight: 600;
  color: $ink;
  margin: 0 0 10px;
}

.feature-card__text {
  color: $muted;
  line-height: 1.6;
  margin: 0;
}

/* Why -------------------------------------------------------------------- */
.why {
  background: #fff;
  padding: 96px 0;
}

.why__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.why-card {
  display: flex;
  gap: 18px;
  background: $bg-soft;
  border-radius: 12px;
  padding: 26px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(27, 183, 118, 0.05);
    transform: translateY(-2px);
  }
}

.why-card__icon {
  flex-shrink: 0;
  font-size: 2rem;
  color: $green;
}

.why-card__title {
  font-size: 1.15rem;
  font-weight: 600;
  color: $ink;
  margin: 0 0 8px;
}

.why-card__text {
  color: $muted;
  line-height: 1.6;
  margin: 0;
}

/* Pricing ---------------------------------------------------------------- */
.pricing {
  background: linear-gradient(180deg, #f4fbf8 0%, #ffffff 100%);
  padding: 96px 0;
}

.pricing__card {
  position: relative;
  max-width: 460px;
  margin: 0 auto;
  background: #fff;
  border: 2px solid rgba(27, 183, 118, 0.25);
  border-radius: 20px;
  padding: 44px 36px 36px;
  text-align: center;
  box-shadow: 0 12px 32px rgba(27, 183, 118, 0.12);
}

.pricing__badge {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, $green 0%, $green-dark 100%);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 6px 18px;
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
}

.pricing__plan {
  font-size: 1.1rem;
  font-weight: 600;
  color: $muted;
  margin: 0 0 12px;
}

.pricing__amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin: 0 0 16px;
}

.pricing__currency {
  font-size: 1.4rem;
  font-weight: 600;
  color: $green;
}

.pricing__value {
  font-size: 3.2rem;
  font-weight: 800;
  color: $ink;
  line-height: 1;
}

.pricing__period {
  font-size: 1rem;
  color: $muted;
}

.pricing__note {
  color: $muted;
  line-height: 1.6;
  margin: 0 0 24px;
}

.pricing__list {
  list-style: none;
  margin: 0 0 28px;
  padding: 0;
  text-align: left;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    color: $ink;
    font-weight: 500;
  }

  .material-icons {
    font-size: 1.2rem;
    color: $green;
  }
}

.pricing__hint {
  font-size: 0.85rem;
  color: $muted;
  margin: 14px 0 0;
}

/* CTA -------------------------------------------------------------------- */
.cta {
  background: $bg-soft;
  padding: 96px 0;
}

.cta__panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
  background: linear-gradient(135deg, $green 0%, $green-dark 100%);
  border-radius: 24px;
  padding: 56px;
  box-shadow: 0 20px 48px rgba(27, 183, 118, 0.25);
}

.cta__title {
  font-size: 2.1rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 16px;
  line-height: 1.2;
}

.cta__lead {
  font-size: 1.1rem;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 24px;
}

.cta__points {
  list-style: none;
  margin: 0;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #fff;
    font-weight: 500;
    padding: 6px 0;
  }

  .material-icons {
    font-size: 1.3rem;
  }
}

.cta__form {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.field {
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.85em;
    font-weight: 600;
    color: $ink;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  input,
  select {
    width: 100%;
    padding: 12px;
    border: 2px solid $line;
    border-radius: 8px;
    background: #fff;
    font-family: inherit;
    font-size: 0.95em;
    color: $ink;
    transition: all 0.3s ease;

    &:hover {
      border-color: #cbd5e0;
    }

    &:focus {
      outline: none;
      border-color: $green;
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    }

    &::placeholder {
      color: #94a3b8;
    }
  }

  select {
    cursor: pointer;
    appearance: none;
    background: #fff url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z' fill='%2364748b'/%3E%3C/svg%3E") no-repeat right 12px center;
    padding-right: 40px;
  }

  &__error {
    color: #ef4444;
    font-size: 0.8rem;
    margin: 6px 0 0;
  }
}

.cta__form .btn {
  margin-top: 8px;
}

.cta__success {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  background: #fff;
  border-radius: 16px;
  padding: 48px 32px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

  .material-icons {
    font-size: 3rem;
    color: $green;
  }

  p {
    font-size: 1.1rem;
    line-height: 1.6;
    color: $ink;
    margin: 0;
  }
}

/* Responsive ------------------------------------------------------------- */
@media (max-width: 1024px) and (min-width: 769px) {
  .how__grid {
    grid-template-columns: 1fr;
    max-width: 520px;
    margin: 0 auto;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }

  .hero__inner {
    flex-direction: column;
    text-align: center;
    padding-top: 56px;
    padding-bottom: 64px;
    gap: 40px;
  }

  .hero__title {
    font-size: 2.3rem;
  }

  .hero__lead {
    font-size: 1.05rem;
    margin-left: auto;
    margin-right: auto;
  }

  .hero__cta,
  .hero__points {
    justify-content: center;
  }

  .hero__visual img {
    max-width: 320px;
  }

  .section-title {
    font-size: 1.9rem;

    &--left {
      text-align: center;
    }
  }

  .trust__stats {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .how,
  .showcase,
  .features,
  .why,
  .pricing,
  .cta {
    padding: 64px 0;
  }

  .how__grid {
    grid-template-columns: 1fr;
    max-width: 420px;
    margin: 0 auto;
  }

  .showcase__inner {
    flex-direction: column-reverse;
    gap: 40px;
  }

  .eyebrow {
    margin-left: auto;
    margin-right: auto;
    display: inline-block;
  }

  .showcase__copy {
    text-align: center;
  }

  .showcase__list li {
    justify-content: flex-start;
    text-align: left;
  }

  .cta__panel {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 36px 24px;
  }

  .cta__title {
    font-size: 1.7rem;
  }
}

/* Payments / TWINT ------------------------------------------------------- */
.payments {
  padding: 88px 0;
  background: $bg-soft;
}

.payments__panel {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 40px;
  align-items: center;
  background: #fff;
  border: 1px solid $line;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.payments__methods {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.pay-method {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border: 1px solid $line;
  border-radius: 12px;
  background: #fff;
  font-weight: 600;
  font-size: 0.95rem;
  color: $ink;
  transition: all 0.25s ease;

  .material-icons { color: $green; }

  &:hover {
    border-color: #cbd5e0;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
  }

  &--twint {
    border-color: #000;
    background: #000;
    color: #fff;

    &:hover { box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25); }
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    color: #000;
    font-weight: 800;
    font-size: 0.72rem;
    letter-spacing: 0.5px;
    padding: 5px 9px;
    border-radius: 5px;
  }
}

.payments__cta {
  p {
    color: $muted;
    margin: 0 0 18px;
    line-height: 1.6;
  }
}

/* Hero load + float motion ---------------------------------------------- */
@keyframes heroRise {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes heroFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.hero__copy > * {
  opacity: 0;
  animation: heroRise 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
.hero__copy .eyebrow { animation-delay: 0.05s; }
.hero__copy .hero__title { animation-delay: 0.15s; }
.hero__copy .hero__lead { animation-delay: 0.25s; }
.hero__copy .hero__cta { animation-delay: 0.35s; }
.hero__copy .hero__points { animation-delay: 0.45s; }

.hero__visual {
  opacity: 0;
  animation: heroRise 0.9s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards;

  img {
    animation: heroFloat 6s ease-in-out 1.2s infinite;
    filter: drop-shadow(0 24px 48px rgba(41, 44, 52, 0.16));
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__copy > *,
  .hero__visual,
  .hero__visual img { animation: none; opacity: 1; }
}

@media (max-width: 768px) {
  .payments { padding: 56px 0; }
  .payments__panel { grid-template-columns: 1fr; padding: 28px 20px; gap: 28px; }
  .payments__methods { grid-template-columns: 1fr; }
}
</style>
