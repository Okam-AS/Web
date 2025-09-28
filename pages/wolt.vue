<template>
  <div>
    <page-header />
    <main class="page-content">
      <!-- Hero Section -->
      <div class="hero-seksjon">
        <div class="container">
          <div class="hero-innhold">
            <div class="hero-tekst">
              <h1 class="hero-tittel">Rimeligere levering med Wolt</h1>
              <p class="hero-undertittel">Okam samarbeider med Wolt for å gi hjemlevering direkte i Okam-appen, for en lavere pris.</p>
              <div class="hero-fordeler">
                <div class="fordel-punkt">
                  <span class="material-icons">trending_down</span>
                  <span>Lavere provisjon</span>
                </div>
                <div class="fordel-punkt">
                  <span class="material-icons">support_agent</span>
                  <span>Norsk 24/7 support</span>
                </div>
                <div class="fordel-punkt">
                  <span class="material-icons">location_on</span>
                  <span>Tilgjengelig alle steder Wolt opererer</span>
                </div>
              </div>
              <button
                class="handling-knapp hero-handling"
                @click="scrollToRegistration"
              >
                Prøv gratis
              </button>
            </div>
            <div class="hero-bilde">
              <div class="logo-kombinasjon">
                <img
                  src="~/assets/UI/okam-logo-white.svg"
                  alt="Okam logo"
                  class="okam-logo"
                />
                <span class="pluss-tegn">+</span>
                <img
                  src="~/assets/UI/wolt-logo.svg"
                  alt="Wolt logo"
                  class="wolt-logo"
                />
              </div>
              <p class="partnerskap-tekst">Offisiell partner</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Benefits Section -->
      <div class="fordeler-seksjon">
        <div class="container">
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

      <!-- How it works Section -->
      <div class="hvordan-seksjon">
        <div class="container">
          <div class="steg-rutenett">
            <div
              v-for="(steg, index) in steg"
              :key="steg.tittel"
              class="steg-kort"
            >
              <div class="steg-nummer">
                {{ index + 1 }}
              </div>
              <div class="steg-ikon">
                <span class="material-icons">{{ steg.ikon }}</span>
              </div>
              <h3 class="steg-tittel">
                {{ steg.tittel }}
              </h3>
              <p class="steg-beskrivelse">
                {{ steg.beskrivelse }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div
        ref="registrationForm"
        class="registrering-seksjon"
      >
        <div class="container">
          <div
            v-if="!messageSent"
            class="registrering-skjema"
          >
            <h2 class="seksjons-tittel">Prøv Okam gratis</h2>
            <p class="registrering-undertekst">Registrer din restaurant og få tilgang til Okam Admin helt gratis inntil du omsetter for 5 000 kr/mnd.</p>
            <div class="skjema-felt">
              <label>Navn på restaurant</label>
              <input
                v-model="restaurantName"
                type="text"
                placeholder="Din restaurant"
                maxlength="100"
              />
            </div>
            <div class="skjema-felt">
              <label>Din e-post</label>
              <input
                v-model="email"
                type="email"
                placeholder="din@epost.no"
                maxlength="100"
              />
            </div>
            <div class="skjema-felt">
              <label>Telefonnummer</label>
              <input
                v-model="phone"
                type="tel"
                placeholder="12345678"
                maxlength="8"
              />
            </div>
            <div class="handling-knapper">
              <button
                type="button"
                class="handling-knapp handling-knapp--primær"
                @click="registerRestaurant"
              >
                Registrer restaurant
              </button>
            </div>
          </div>
          <div
            v-else
            class="registrering-bekreftelse"
          >
            <div class="bekreftelse-ikon">
              <span class="material-icons">check_circle</span>
            </div>
            <h3>Takk for din registrering!</h3>
            <p>Vi har mottatt din forespørsel og vil kontakte deg snarest for å hjelpe deg med å komme i gang.</p>
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

  data() {
    return {
      restaurantName: "",
      email: "",
      phone: "",
      messageSent: false,

      fordeler: [
        {
          ikon: "trending_down",
          tittel: "Lavere provisjon",
          beskrivelse: "Spar penger på hver levering.",
        },
        {
          ikon: "support_agent",
          tittel: "Norsk 24/7 support",
          beskrivelse: "Få hjelp når du trenger det med direktenummer og e-post.",
        },
        {
          ikon: "location_on",
          tittel: "Bred dekning",
          beskrivelse: "Tilgjengelig alle steder Wolt opererer i Norge.",
        },
      ],

      steg: [
        {
          ikon: "app_registration",
          tittel: "Registrer restaurant",
          beskrivelse: "Opprett din Okam-konto og få tilgang til admin-panelet helt gratis.",
        },
        {
          ikon: "restaurant_menu",
          tittel: "Last opp meny",
          beskrivelse: "Legg inn dine retter og priser i det brukervennlige admin-systemet.",
        },
        {
          ikon: "toggle_on",
          tittel: "Aktiver Wolt-levering",
          beskrivelse: "Skru på Wolt-levering med ett enkelt klikk når du er klar til å tilby levering.",
        },
        {
          ikon: "trending_up",
          tittel: "Øk salget",
          beskrivelse: "Motta bestillinger med Wolt-levering og øk omsetningen med lavere kostnader.",
        },
      ],
    };
  },

  methods: {
    scrollToRegistration() {
      this.$refs.registrationForm.scrollIntoView({ behavior: "smooth" });
    },

    async registerRestaurant() {
      if (!this.restaurantName.trim()) {
        alert("Vennligst oppgi restaurantens navn");
        return;
      }

      if (!this.email.trim() || !this.email.includes("@")) {
        alert("Vennligst oppgi en gyldig e-postadresse");
        return;
      }

      if (!this.phone.trim() || this.phone.length < 8) {
        alert("Vennligst oppgi et gyldig telefonnummer");
        return;
      }

      this.messageSent = true;
      const data = {
        feedback: `Butikk: ${this.restaurantName} | Mail: ${this.email} | Tlf: ${this.phone} | Wolt-registrering`,
        source: "/wolt",
      };
      await fetch("https://okamapi.azurewebsites.net/stores/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.page-content {
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.seksjons-tittel {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 3rem;
  color: #fff;
  font-weight: 700;
}

.handling-knapp {
  background: #1bb776;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
  text-align: center;

  &:hover {
    background: #159a63;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
  }

  &--sekundær {
    background: transparent;
    color: #003058;
    border: 2px solid #003058;

    &:hover {
      background: #003058;
      color: white;
    }
  }
}

// Hero Section
.hero-seksjon {
  background: linear-gradient(135deg, #009de0 0%, #0077b6 100%);
  color: white;
  padding: 6rem 0;
  min-height: 70vh;
  display: flex;
  align-items: center;

  .hero-innhold {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
  }

  .hero-tittel {
    font-size: 3.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    line-height: 1.2;
  }

  .hero-undertittel {
    font-size: 1.25rem;
    margin-bottom: 2rem;
    opacity: 0.9;
    line-height: 1.6;
  }

  .hero-fordeler {
    margin-bottom: 2.5rem;

    .fordel-punkt {
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
      font-size: 1.1rem;

      .material-icons {
        margin-right: 0.75rem;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        padding: 0.5rem;
        font-size: 1.5rem;
      }
    }
  }

  .hero-handling {
    background: white;
    color: #009de0;
    font-size: 1.25rem;
    padding: 1.25rem 2.5rem;

    &:hover {
      background: #f8f9fa;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
  }

  .logo-kombinasjon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 1rem;

    .okam-logo {
      height: 50px;
      width: auto;
    }

    .wolt-logo {
      height: 65px;
      width: auto;
    }

    .pluss-tegn {
      font-size: 2.5rem;
      font-weight: bold;
      margin: 0 1.5rem;
      opacity: 0.8;
    }

    @media (max-width: 768px) {
      flex-direction: column;
      gap: 1.5rem;

      .pluss-tegn {
        margin: 0;
        font-size: 2rem;
      }
    }
  }

  .hero-bilde {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 1.5rem;
  }

  .partnerskap-tekst {
    text-align: center;
    font-size: 1.1rem;
    opacity: 0.8;
    font-weight: 500;
  }
}

// Benefits Section
.fordeler-seksjon {
  padding: 6rem 0;
  background: #f8f9fa;

  .fordeler-rutenett {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2.5rem;
  }

  .fordel-kort {
    background: white;
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    text-align: center;
    transition: transform 0.3s ease, box-shadow 0.3s ease;

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }

    .fordel-ikon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #009de0, #0077b6);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;

      .material-icons {
        font-size: 2.5rem;
        color: white;
      }
    }

    .fordel-tittel {
      font-size: 1.5rem;
      color: #003058;
      margin-bottom: 1rem;
      font-weight: 600;
    }

    .fordel-beskrivelse {
      color: #666;
      line-height: 1.6;
      font-size: 1rem;
    }
  }
}

// How it works Section
.hvordan-seksjon {
  padding: 6rem 0;
  background: white;

  .steg-rutenett {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 3rem;
  }

  .steg-kort {
    text-align: center;
    position: relative;

    .steg-nummer {
      position: absolute;
      top: -10px;
      right: -10px;
      width: 40px;
      height: 40px;
      background: #1bb776;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.25rem;
    }

    .steg-ikon {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: linear-gradient(135deg, #e3f2fd, #bbdefb);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;

      .material-icons {
        font-size: 3rem;
        color: #1565c0;
      }
    }

    .steg-tittel {
      font-size: 1.25rem;
      color: #003058;
      margin-bottom: 1rem;
      font-weight: 600;
    }

    .steg-beskrivelse {
      color: #666;
      line-height: 1.6;
    }
  }
}

// Pricing Section
.pris-sammenligning-seksjon {
  padding: 6rem 0;
  background: #f8f9fa;

  .pris-tabell {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    max-width: 800px;
    margin: 0 auto 2rem;
  }

  .pris-kolonne {
    background: white;
    border-radius: 12px;
    padding: 2.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    position: relative;

    &--okam {
      border: 3px solid #1bb776;
      transform: scale(1.05);

      .pris-badge {
        position: absolute;
        top: -15px;
        left: 50%;
        transform: translateX(-50%);
        background: #1bb776;
        color: white;
        padding: 0.5rem 1.5rem;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.9rem;
      }
    }
  }

  .pris-tittel {
    font-size: 1.5rem;
    color: #003058;
    margin-bottom: 2rem;
    text-align: center;
    font-weight: 600;
  }

  .pris-punkt {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #eee;

    .pris-label {
      color: #666;
    }

    .pris-verdi {
      font-weight: 600;
      color: #003058;
    }
  }

  .pris-total {
    display: flex;
    justify-content: space-between;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 2px solid #eee;
    font-size: 1.1rem;

    .pris-label {
      font-weight: 600;
      color: #003058;
    }

    .pris-verdi--høy {
      color: #dc3545;
      font-weight: 700;
    }

    .pris-verdi--lav {
      color: #1bb776;
      font-weight: 700;
    }
  }

  .pris-merknad {
    text-align: center;
    color: #666;
    font-size: 0.9rem;
    font-style: italic;
  }
}

// Registration Section
.registrering-seksjon {
  padding: 6rem 0;
  background: linear-gradient(135deg, #003058 0%, #004080 100%);
  color: white;

  .registrering-skjema {
    max-width: 600px;
    margin: 0 auto;
    text-align: center;
  }

  .registrering-undertekst {
    font-size: 1.1rem;
    margin-bottom: 3rem;
    opacity: 0.9;
    line-height: 1.6;
  }

  .skjema-felt {
    margin-bottom: 2rem;
    text-align: left;

    label {
      display: block;
      margin-bottom: 0.75rem;
      font-weight: 600;
      font-size: 1rem;
    }

    input {
      width: 100%;
      padding: 1rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      background: white;
      color: #003058;

      &:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.3);
      }

      &::placeholder {
        color: #999;
      }
    }
  }

  .handling-knapper {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .registrering-bekreftelse {
    text-align: center;
    max-width: 500px;
    margin: 0 auto;

    .bekreftelse-ikon {
      .material-icons {
        font-size: 4rem;
        color: #1bb776;
        margin-bottom: 1rem;
      }
    }

    h3 {
      font-size: 2rem;
      margin-bottom: 1rem;
    }

    p {
      font-size: 1.1rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }

    .app-lenker {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;

      .app-lenke img {
        height: 50px;
        width: auto;
      }
    }
  }
}

// Responsive Design
@media (max-width: 768px) {
  .hero-seksjon {
    padding: 4rem 0;

    .hero-innhold {
      grid-template-columns: 1fr;
      gap: 3rem;
      text-align: center;
    }

    .hero-tittel {
      font-size: 2.5rem;
    }
  }

  .seksjons-tittel {
    font-size: 2rem;
  }

  .fordeler-rutenett,
  .steg-rutenett {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .pris-tabell {
    grid-template-columns: 1fr;
    gap: 1.5rem;

    .pris-kolonne--okam {
      transform: none;
    }
  }

  .handling-knapper {
    flex-direction: column;
    align-items: center;

    .handling-knapp {
      width: 100%;
      max-width: 300px;
    }
  }

  .logo-kombinasjon {
    .okam-logo {
      height: 45px;
    }

    .wolt-logo {
      height: 60px;
    }

    .pluss-tegn {
      font-size: 2rem;
      margin: 0 1rem;
    }
  }
}
</style>
