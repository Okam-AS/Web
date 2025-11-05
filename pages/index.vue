<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="big-teaser">
        <div class="wrapper">
          <div class="big-teaser__content">
            <img
              src="~/assets/UI/front-page.png"
              alt="Okam bestillingsplattform illustrasjon"
              width="360"
              height="360"
            />
          </div>

          <div class="big-teaser__content">
            <h1 class="heading-1">Få din egen bestillingsapp</h1>
            <p class="big-teaser__description">Bli en del av Okam appen eller få din egen bestillingsapp</p>
            <div class="big-teaser__links">
              <a
                class="ga-ios-download"
                href="https://apps.apple.com/no/developer/okam/id1514296964"
                ><img
                  alt="AppStore"
                  height="40"
                  width="120"
                  src="~/assets/UI/appstore-btn.png"
              /></a>
              <a
                class="ga-android-download"
                href="https://play.google.com/store/apps/developer?id=Okam"
                ><img
                  alt="Google Play"
                  height="40"
                  width="130"
                  src="~/assets/UI/googleplay-btn.png"
              /></a>
            </div>
          </div>
        </div>
      </div>

      <div class="testimonials-seksjon">
        <div class="container">
          <h2 class="seksjons-tittel">Våre kunder sier</h2>

          <div class="featured-testimonial">
            <div class="featured-testimonial-content">
              <div class="featured-quote-only">
                <p class="testimonial-sitat">"Vi har satset på vår egen app, og kan trygt si at det har vært en suksess. Vi sparer tid og penger, har bedre kontroll, og kundene våre elsker den nye løsningen."</p>
                <div class="testimonial-info">
                  <p class="testimonial-bedrift">- Jungel Pizza</p>
                </div>
              </div>
              <img
                src="~/assets/UI/jungelpizza/screenshots.png"
                alt="Skjermbilder av Jungel Pizza sin bestillingsapp"
                class="featured-image-large"
              />
            </div>
          </div>

          <div class="testimonials-rutenett">
            <div
              v-for="testimonial in testimonials"
              :key="testimonial.bedrift"
              class="testimonial-kort"
            >
              <div class="testimonial-innhold">
                <p class="testimonial-sitat">
                  {{ testimonial.sitat }}
                </p>
                <p class="testimonial-bedrift">- {{ testimonial.bedrift }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="app-rating-seksjon">
        <div class="container">
          <h2 class="app-rating-tittel">Vi er stolte av å levere høy kvalitet!</h2>
          <div class="app-rating-content">
            <div class="app-showcase">
              <div class="app-item">
                <img
                  src="~/static/okam-appicon.png"
                  alt="Okam App Icon"
                  class="app-icon"
                />
                <div class="app-rating">
                  <div class="stars">
                    <span class="star filled">★</span>
                    <span class="star filled">★</span>
                    <span class="star filled">★</span>
                    <span class="star filled">★</span>
                    <span class="star filled">★</span>
                  </div>
                  <span class="rating-number">4,9</span>
                </div>
              </div>
              <div class="app-item">
                <img
                  src="~/static/jungel-appicon.png"
                  alt="Jungel App Icon"
                  class="app-icon"
                />
                <div class="app-rating">
                  <div class="stars">
                    <span class="star filled">★</span>
                    <span class="star filled">★</span>
                    <span class="star filled">★</span>
                    <span class="star filled">★</span>
                    <span class="star filled">★</span>
                  </div>
                  <span class="rating-number">4,9</span>
                </div>
              </div>
            </div>
            <p class="volume-text">Med tusenvis av bestillinger håndtert hver måned!</p>
          </div>
        </div>
      </div>

      <div class="funksjoner-seksjon">
        <div class="container">
          <h2 class="seksjons-tittel">Dette er noe av det du får:</h2>
          <div class="funksjoner-rutenett">
            <div
              v-for="funksjon in funksjoner"
              :key="funksjon.tittel"
              class="funksjons-kort"
            >
              <div class="funksjons-ikon">
                <span class="material-icons">{{ funksjon.ikon }}</span>
              </div>
              <h3 class="funksjons-tittel">
                {{ funksjon.tittel }}
              </h3>
              <p class="funksjons-beskrivelse">
                {{ funksjon.beskrivelse }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="fordeler-seksjon">
        <div class="container">
          <h2 class="seksjons-tittel">Hvorfor velge oss?</h2>
          <div class="fordeler-rutenett">
            <div
              v-for="fordel in fordeler"
              :key="fordel.tittel"
              class="fordel-kort"
            >
              <div class="fordel-ikon">
                <span class="material-icons">{{ fordel.ikon }}</span>
              </div>
              <h3 class="fordel-tittel">
                {{ fordel.tittel }}
              </h3>
              <p class="fordel-beskrivelse">
                {{ fordel.beskrivelse }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        ref="registrationForm"
        class="registrering-seksjon"
      >
        <div class="container">
          <div
            v-if="!messageSent"
            class="registrering-skjema"
          >
            <h2 class="seksjons-tittel">Book en uforpliktende demo</h2>
            <div class="skjema-felt">
              <label>Navn på selskap</label>
              <input
                v-model="storeName"
                type="text"
                maxlength="100"
              />
              <p
                v-if="showValidation && !storeName.length"
                class="validation-message"
              >
                Vennligst fyll inn navn på selskap
              </p>
            </div>
            <div class="skjema-felt">
              <label>Navn på kontaktperson</label>
              <input
                v-model="userContactName"
                type="text"
                maxlength="100"
              />
              <p
                v-if="showValidation && !userContactName.length"
                class="validation-message"
              >
                Vennligst fyll inn navn på kontaktperson
              </p>
            </div>
            <div class="skjema-felt">
              <label>Hvordan ønsker du å bli kontaktet?</label>
              <select v-model="contactPreference">
                <option value="phone">Ring meg</option>
                <option value="email">Send meg e-post</option>
              </select>
            </div>
            <div class="skjema-felt">
              <label>Telefonnummer</label>
              <input
                v-model="userPhone"
                type="text"
                maxlength="100"
                :required="contactPreference === 'phone'"
              />
              <p
                v-if="showValidation && contactPreference === 'phone' && !userPhone.trim().length"
                class="validation-message"
              >
                Vennligst fyll inn telefonnummer
              </p>
            </div>
            <div class="skjema-felt">
              <label>E-post</label>
              <input
                v-model="userEmail"
                type="email"
                maxlength="100"
                :required="contactPreference === 'email'"
              />
              <p
                v-if="showValidation && contactPreference === 'email' && !userEmail.trim().length"
                class="validation-message"
              >
                Vennligst fyll inn e-post
              </p>
            </div>
            <div class="skjema-handling">
              <button
                type="button"
                class="handling-knapp"
                @click="submitFeedback"
              >
                Book demo
              </button>
            </div>
          </div>
          <div
            v-else
            class="registrering-bekreftelse"
          >
            <p>
              Takk for din interesse! Vi kontakter deg
              {{ contactPreference === "phone" ? "på telefon" : "på e-post" }}
              snarest.
            </p>
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
  data: () => ({
    funksjoner: [
      {
        tittel: "Skreddersydd bestillingsapp",
        ikon: "smartphone",
        beskrivelse: "Vi lager en komplett mobilapp med ditt merke, logo og design som kundene kan laste ned fra App Store og Google Play",
      },
      {
        tittel: "Nettbestilling",
        ikon: "language",
        beskrivelse: "Komplett nettside for bestillinger som fungerer på alle enheter - ingen app-nedlasting nødvendig",
      },
      {
        tittel: "Admin-dashboard",
        ikon: "settings",
        beskrivelse: "Kraftig administrasjonsverktøy hvor du enkelt kan håndtere bestillinger, oppdatere meny og følge salgsstatistikk",
      },
      {
        tittel: "Integrert levering",
        ikon: "delivery_dining",
        beskrivelse: "Sømløs integrasjon med leveringspartnere som Wolt for effektiv hjemlevering til dine kunder",
      },
      {
        tittel: "Kundelojalitet",
        ikon: "card_giftcard",
        beskrivelse: "Innebygde bonusprogram og cashback som holder kundene dine engasjerte og kommer tilbake",
      },
      {
        tittel: "QR-bordbestilling",
        ikon: "qr_code_scanner",
        beskrivelse: "QR-kode løsning som lar gjester bestille direkte fra bordet uten å vente på servitør",
      },
      {
        tittel: "Regnskapsintegrasjon",
        ikon: "account_balance",
        beskrivelse: "Automatisk import til regnskapssystemet, spar tid og reduser feil ved manuell dataregistrering",
      },
      {
        tittel: "AI-analyse av data",
        ikon: "psychology",
        beskrivelse: "Få innsikt i salg og kundemønstre med kunstig intelligens som analyserer dine data automatisk",
      },
      {
        tittel: "Alt i én app",
        ikon: "all_inclusive",
        beskrivelse: "Styr alle avdelinger og bestillinger fra nettside, Okam og Wolt i én app",
      },
    ],
    fordeler: [
      {
        tittel: "Dokumentert vekst",
        ikon: "trending_up",
        beskrivelse: "Flere av våre restauranter har opplevd 20-40% økning i bestillingsvolum første år etter lansering.",
      },
      {
        tittel: "Direkte kundeforhold",
        ikon: "favorite",
        beskrivelse: "Bygg sterke relasjoner med dine kunder gjennom din egen app - ikke gjennom en tredjepartsplattform.",
      },
      {
        tittel: "Effektiv drift",
        ikon: "bolt",
        beskrivelse: "Automatiser bestillingsflyt, reduser telefontid og eliminer feil fra manuell ordreregistrering.",
      },
      {
        tittel: "Verdifull data",
        ikon: "bar_chart",
        beskrivelse: "Få detaljert innsikt i kundepreferanser, bestillingsmønstre og lønnsomhet for å ta bedre forretningsbeslutninger.",
      },
      {
        tittel: "Norsk kvalitet og støtte",
        ikon: "verified",
        beskrivelse: "Utviklet i Norge for norske restauranter med personlig oppfølging og teknisk support.",
      },
      {
        tittel: "Enkel administrasjon",
        ikon: "devices",
        beskrivelse: "Håndter alt fra din iPad, telefon eller datamaskin - hvor som helst, når som helst.",
      },
    ],
    storeName: "",
    userContactName: "",
    userPhone: "",
    userEmail: "",
    contactPreference: "phone",
    messageSent: false,
    testimonials: [
      {
        bedrift: "Stolpen Restaurant",
        sitat: "Jeg kunne ikke ha tenkt meg å drive virksomheten uten appen nå.",
      },
      {
        bedrift: "Hotpot Oslo",
        sitat: "Veldig enkelt å motta bestillinger, og kundene er veldig fornøyde.",
      },
      {
        bedrift: "Lierbyen Sushi",
        sitat: "Flinke på det de gjør, veldig rask oppfølging på alle spørsmål, kan absolutt anbefale til andre",
      },
      {
        bedrift: "Circle K Skei",
        sitat: "Enkelt, brukervennlig og driftsikkert!",
      },
    ],
    showValidation: false,
  }),

  computed: {
    isFormValid() {
      const hasBasicInfo = this.storeName.length > 0 && this.userContactName.length > 0;
      const hasValidContact = this.contactPreference === "phone" ? this.userPhone.trim().length > 0 : this.userEmail.trim().length > 0;
      return hasBasicInfo && hasValidContact;
    },
  },

  methods: {
    async submitFeedback() {
      this.showValidation = true;

      if (this.isFormValid) {
        this.messageSent = true;
        const data = {
          feedback: `Butikk: ${this.storeName} | Navn: ${this.userContactName} | Tlf: ${this.userPhone} | Mail: ${this.userEmail} | Kontaktmetode: ${this.contactPreference} | Statsiden`,
          source: "/",
        };
        await fetch("https://okamapi.azurewebsites.net/stores/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      }
    },
  },
};
</script>

<style scoped>
.page-content {
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.big-teaser {
  padding: 80px 0;
  background: white;
}

.wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 60px;
}

.big-teaser__content {
  flex: 1;
}

.big-teaser__content img {
  width: 100%;
  max-width: 360px;
  height: auto;
  border-radius: 12px;
}

.heading-1 {
  font-size: 3rem;
  font-weight: 700;
  color: #003058;
  margin-bottom: 20px;
  line-height: 1.2;
}

.big-teaser__content p {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 30px;
}

.big-teaser__content a {
  color: #1bb776;
  text-decoration: none;
}

.big-teaser__content a:hover {
  text-decoration: underline;
}

.big-teaser__links {
  display: flex;
  gap: 15px;
  align-items: center;
}

.big-teaser__links a {
  display: inline-block;
  transition: transform 0.3s ease;
}

.big-teaser__links a:hover {
  transform: scale(1.05);
}

.big-teaser__links img {
  height: 50px;
  width: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.handling-knapp {
  background: #ff6b35;
  color: white;
  border: none;
  padding: 15px 30px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
}

.handling-knapp:hover {
  background: #e55a2b;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(255, 107, 53, 0.3);
}

.testimonials-seksjon {
  background: #f2f4fb;
  padding: 80px 0;
}

.seksjons-tittel {
  font-size: 2.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 60px;
  color: #003058;
}

.featured-testimonial {
  background: white;
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 60px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.featured-testimonial-content {
  display: flex;
  align-items: center;
  gap: 40px;
}

.featured-quote-only {
  flex: 1;
}

.featured-image-large {
  width: 500px;
  height: auto;
  border-radius: 15px;
}

.testimonial-info {
  text-align: center;
  margin-top: 20px;
}

.testimonials-rutenett {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  align-items: stretch;
}

.app-rating-seksjon {
  background: linear-gradient(135deg, #1bb776 0%, #15a065 100%);
  padding: 60px 0;
  position: relative;
  overflow: hidden;
}

.app-rating-seksjon::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  animation: pulse 4s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.05);
  }
}

.app-rating-tittel {
  font-size: 2.8rem;
  font-weight: 800;
  text-align: center;
  color: white;
  margin-bottom: 50px;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
  letter-spacing: -0.02em;
}

.app-rating-content {
  position: relative;
  z-index: 2;
}

.app-showcase {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 80px;
  margin-bottom: 40px;
}

.app-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.15);
  padding: 30px;
  border-radius: 25px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  transition: all 0.4s ease;
  position: relative;
}

.app-item::before {
  content: "";
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.3), transparent, rgba(255, 255, 255, 0.3));
  border-radius: 27px;
  z-index: -1;
}

.app-item:hover {
  transform: translateY(-10px) scale(1.05);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.25);
}

.app-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.app-item:hover .app-icon {
  transform: scale(1.1);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
}

.app-rating {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.stars {
  display: flex;
  gap: 4px;
}

.star {
  font-size: 1.5rem;
  color: #ffd700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
}

.rating-number {
  font-size: 1.4rem;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  background: rgba(255, 255, 255, 0.1);
  padding: 5px 15px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.volume-text {
  text-align: center;
  font-size: 1.5rem;
  font-weight: 500;
  color: white;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  margin: 0 auto;
  opacity: 0.95;
}

.testimonial-kort {
  background: white;
  border-radius: 12px;
  padding: 25px 20px;
  box-shadow: 0 3px 15px rgba(0, 48, 88, 0.08);
  transition: all 0.3s ease;
  position: relative;
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.testimonial-kort:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 35px rgba(0, 48, 88, 0.15);
  border-color: rgba(27, 183, 118, 0.2);
}

.testimonial-innhold {
  text-align: center;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.testimonial-sitat {
  font-size: 1rem;
  line-height: 1.5;
  margin: 15px 0;
  color: #333;
  font-style: italic;
  text-align: center;
  position: relative;
  padding: 15px;
  background: rgba(27, 183, 118, 0.02);
  border-radius: 6px;
  flex-grow: 1;
}

.testimonial-sitat::before {
  content: "❝";
  display: block;
  font-size: 1.5rem;
  color: #1bb776;
  text-align: center;
  margin-bottom: 8px;
  opacity: 0.7;
}

.testimonial-sitat::after {
  content: "❞";
  display: block;
  font-size: 1.5rem;
  color: #1bb776;
  text-align: center;
  margin-top: 8px;
  opacity: 0.7;
}

.testimonial-bedrift {
  color: #003058;
  font-size: 0.9rem;
  font-weight: 700;
  margin: 15px 0 0 0;
  margin-top: auto;
}

.funksjoner-seksjon {
  padding: 100px 0;
  background: white;
}

.funksjoner-rutenett {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
}

.funksjons-kort {
  text-align: center;
  padding: 30px 20px;
  border-radius: 15px;
  transition: transform 0.3s ease;
}

.funksjons-kort:hover {
  transform: translateY(-5px);
}

.funksjons-ikon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.funksjons-ikon:nth-child(8n + 1) {
  background: #e8f5e9;
}

.funksjons-ikon:nth-child(8n + 1) .material-icons {
  color: #2e7d32;
}

.funksjons-ikon:nth-child(8n + 2) {
  background: #e3f2fd;
}

.funksjons-ikon:nth-child(8n + 2) .material-icons {
  color: #1565c0;
}

.funksjons-ikon:nth-child(8n + 3) {
  background: #fff3e0;
}

.funksjons-ikon:nth-child(8n + 3) .material-icons {
  color: #ef6c00;
}

.funksjons-ikon:nth-child(8n + 4) {
  background: #f3e5f5;
}

.funksjons-ikon:nth-child(8n + 4) .material-icons {
  color: #7b1fa2;
}

.funksjons-ikon:nth-child(8n + 5) {
  background: #e0f7fa;
}

.funksjons-ikon:nth-child(8n + 5) .material-icons {
  color: #00838f;
}

.funksjons-ikon:nth-child(8n + 6) {
  background: #fbe9e7;
}

.funksjons-ikon:nth-child(8n + 6) .material-icons {
  color: #d84315;
}

.funksjons-ikon:nth-child(8n + 7) {
  background: #f1f8e9;
}

.funksjons-ikon:nth-child(8n + 7) .material-icons {
  color: #558b2f;
}

.funksjons-ikon:nth-child(8n + 8) {
  background: #e8eaf6;
}

.funksjons-ikon:nth-child(8n + 8) .material-icons {
  color: #283593;
}

.funksjons-ikon .material-icons {
  font-size: 2rem;
}

.funksjons-tittel {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 10px;
  color: #003058;
}

.funksjons-beskrivelse {
  color: #666;
  line-height: 1.6;
}

.fordeler-seksjon {
  padding: 80px 0;
  background: #e6f7f0;
}

.fordeler-rutenett {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
}

.fordel-kort {
  background: white;
  padding: 1.5rem;
  border-radius: 15px;
  text-align: left;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.fordel-kort:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
}

.fordel-ikon {
  display: inline-flex;
  align-items: center;
  margin-right: 0.5rem;
  vertical-align: middle;
}

.fordel-ikon .material-icons {
  font-size: 1.5rem;
  color: #1bb776;
}

.fordel-tittel {
  display: inline;
  vertical-align: middle;
  color: #003058;
  font-weight: 600;
}

.fordel-beskrivelse {
  margin-top: 0.5rem;
  padding-left: calc(1.5rem + 0.5rem);
  color: #666;
}

.registrering-seksjon {
  padding: 80px 0;
  background: white;
}

.registrering-skjema {
  max-width: 600px;
  margin: 0 auto;
}

.skjema-felt {
  margin-bottom: 1.5rem;
}

.skjema-felt label {
  display: block;
  margin-bottom: 0.5rem;
  color: #003058;
  font-size: 1rem;
}

.skjema-felt input,
.skjema-felt select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  height: 50px;
  cursor: pointer;
}

.skjema-felt input:focus,
.skjema-felt select:focus {
  outline: none;
  border-color: #1bb776;
  box-shadow: 0 0 0 2px rgba(27, 183, 118, 0.1);
}

.skjema-felt select {
  appearance: none;
  background: #fff url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z' fill='%23003058'/%3E%3C/svg%3E") no-repeat right 12px center;
  padding-right: 40px;
}

.validation-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.skjema-handling {
  text-align: center;
  margin-top: 30px;
}

.registrering-bekreftelse {
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.1);
  padding: 40px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.registrering-bekreftelse p {
  font-size: 1.2rem;
  line-height: 1.6;
}

@media (max-width: 1024px) and (min-width: 769px) {
  .testimonials-rutenett {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .wrapper {
    flex-direction: column;
    gap: 40px;
    text-align: center;
  }

  .heading-1 {
    font-size: 2.5rem;
  }

  .big-teaser__content p {
    font-size: 1.1rem;
  }

  .big-teaser__links {
    justify-content: center;
    flex-wrap: wrap;
  }

  .featured-testimonial-content {
    flex-direction: column;
    text-align: center;
  }

  .testimonials-rutenett {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .funksjoner-rutenett,
  .fordeler-rutenett {
    grid-template-columns: 1fr;
  }

  .registrering-skjema {
    padding: 30px 20px;
  }

  .app-rating-tittel {
    font-size: 2.2rem;
    margin-bottom: 30px;
  }

  .app-showcase {
    flex-direction: column;
    gap: 30px;
  }

  .app-item {
    padding: 25px;
    margin: 0 20px;
  }

  .volume-text {
    font-size: 1.3rem;
    margin: 0;
  }
}
</style>
