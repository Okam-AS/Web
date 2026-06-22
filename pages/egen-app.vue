<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="testimonials-seksjon jungel-header">
        <div class="container">
          <h2 class="seksjons-tittel">{{ copy.ownAppTitle }}</h2>

          <div class="featured-testimonial" @click="openJungelPizza">
            <div class="featured-testimonial-content">
              <div class="featured-person">
                <img
                  src="~/assets/UI/jungelpizza/petter.png"
                  :alt="copy.petterAlt"
                  class="person-image"
                />
                <div class="featured-quote">
                  <p class="testimonial-sitat">{{ copy.featuredQuote }}</p>
                  <div class="testimonial-info">
                    <p class="testimonial-navn">{{ copy.featuredName }}</p>
                    <p class="testimonial-bedrift">{{ copy.featuredCompany }}</p>
                  </div>
                </div>
              </div>
              <img
                src="~/assets/UI/jungelpizza/screenshots.png"
                :alt="copy.screenshotsAlt"
                class="featured-image"
              />
            </div>
          </div>

          <div class="header-action">
            <button
              class="handling-knapp header-handling"
              @click="scrollToRegistration"
            >
              {{ copy.bookDemo }}
            </button>
          </div>

          <div class="testimonials-rutenett">
            <div
              v-for="testimonial in testimonials"
              :key="testimonial.navn"
              class="testimonial-kort"
            >
              <div class="testimonial-innhold">
                <div class="testimonial-venstre">
                  <img
                    :src="testimonial.bilde"
                    :alt="copy.portraitAltPrefix + testimonial.navn"
                    class="testimonial-bilde"
                  />
                </div>
                <div class="testimonial-høyre">
                  <p class="testimonial-sitat">
                    {{ testimonial.sitat }}
                  </p>
                  <div class="testimonial-info">
                    <p class="testimonial-navn">
                      {{ testimonial.navn }}
                    </p>
                    <p class="testimonial-bedrift">
                      {{ testimonial.bedrift }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="funksjoner-seksjon">
        <div class="container">
          <h2 class="seksjons-tittel">{{ copy.featuresTitle }}</h2>
          <div class="funksjoner-rutenett">
            <div
              v-for="funksjon in copy.funksjoner"
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
          <h2 class="seksjons-tittel">{{ copy.benefitsTitle }}</h2>
          <div class="fordeler-rutenett">
            <div
              v-for="fordel in copy.fordeler"
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
            <h2 class="seksjons-tittel">{{ copy.formTitle }}</h2>
            <div class="skjema-felt">
              <label>{{ copy.companyNameLabel }}</label>
              <input
                v-model="storeName"
                type="text"
                maxlength="100"
              />
              <p
                v-if="showValidation && !storeName.length"
                class="validation-message"
              >
                {{ copy.companyNameValidation }}
              </p>
            </div>
            <div class="skjema-felt">
              <label>{{ copy.contactNameLabel }}</label>
              <input
                v-model="userContactName"
                type="text"
                maxlength="100"
              />
              <p
                v-if="showValidation && !userContactName.length"
                class="validation-message"
              >
                {{ copy.contactNameValidation }}
              </p>
            </div>
            <div class="skjema-felt">
              <label>{{ copy.contactPreferenceLabel }}</label>
              <select v-model="contactPreference">
                <option value="phone">{{ copy.contactPhoneOption }}</option>
                <option value="email">{{ copy.contactEmailOption }}</option>
              </select>
            </div>
            <div class="skjema-felt">
              <label>{{ copy.phoneLabel }}</label>
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
                {{ copy.phoneValidation }}
              </p>
            </div>
            <div class="skjema-felt">
              <label>{{ copy.emailLabel }}</label>
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
                {{ copy.emailValidation }}
              </p>
            </div>
            <div class="skjema-handling">
              <button
                type="button"
                class="handling-knapp"
                @click="submitFeedback"
              >
                {{ copy.bookDemo }}
              </button>
            </div>
          </div>
          <div
            v-else
            class="registrering-bekreftelse"
          >
            <p>
              {{ copy.confirmationPrefix }}
              {{ contactPreference === "phone" ? copy.confirmationPhone : copy.confirmationEmail }}
              {{ copy.confirmationSuffix }}
            </p>
          </div>
        </div>
      </div>
    </main>
    <page-footer />
  </div>
</template>

<script>
import { isCh } from "~/config/edition";
import PageHeader from "~/components/organisms/PageHeader.vue";
import PageFooter from "~/components/organisms/PageFooter.vue";
import PerImage from "~/assets/UI/testimonials/per.png";
import TamImage from "~/assets/UI/testimonials/tam.png";
import CatharinaImage from "~/assets/UI/testimonials/catharina.png";

export default {
  components: { PageHeader, PageFooter },
  data: () => ({
    storeName: "",
    userContactName: "",
    userPhone: "",
    userEmail: "",
    contactPreference: "phone",
    messageSent: false,
    testimonials: [],
    showValidation: false,
  }),

  head() {
    if (!isCh) {
      return {};
    }
    return {
      title: "Ihre eigene Bestell-App - Okam",
      meta: [
        {
          hid: "description",
          name: "description",
          content:
            "Erhalten Sie Ihre eigene Bestell-App mit Ihrem Logo, Ihren Farben und Ihrem Design. Online-Bestellung, Lieferung, Treueprogramm und flexible Zahlung - alles in einer Lösung.",
        },
      ],
    };
  },

  computed: {
    copy() {
      return isCh
        ? {
            ownAppTitle: "Ihre eigene Bestell-App",
            petterAlt: "Porträtbild von Petter von Jungel Pizza",
            featuredQuote:
              '"Nach über einem Jahr Nutzung unserer eigenen App können wir mit Sicherheit sagen, dass es ein Erfolg war. Wir sparen Zeit und Geld, haben eine bessere Kontrolle und unsere Kunden lieben die neue Lösung."',
            featuredName: "Sukumar Sathiyamoorthy",
            featuredCompany: "Geschäftsführer von Jungel Pizza",
            screenshotsAlt: "Screenshots der Bestell-App von Jungel Pizza",
            bookDemo: "Demo buchen",
            portraitAltPrefix: "Porträtbild von ",
            featuresTitle: "Das ist ein Teil von dem, was Sie erhalten:",
            benefitsTitle: "Warum uns wählen?",
            formTitle: "Buchen Sie eine unverbindliche Demo",
            companyNameLabel: "Name des Unternehmens",
            companyNameValidation: "Bitte geben Sie den Namen des Unternehmens ein",
            contactNameLabel: "Name der Kontaktperson",
            contactNameValidation: "Bitte geben Sie den Namen der Kontaktperson ein",
            contactPreferenceLabel: "Wie möchten Sie kontaktiert werden?",
            contactPhoneOption: "Rufen Sie mich an",
            contactEmailOption: "Senden Sie mir eine E-Mail",
            phoneLabel: "Telefonnummer",
            phoneValidation: "Bitte geben Sie die Telefonnummer ein",
            emailLabel: "E-Mail",
            emailValidation: "Bitte geben Sie die E-Mail-Adresse ein",
            confirmationPrefix: "Vielen Dank für Ihr Interesse! Wir kontaktieren Sie",
            confirmationPhone: "telefonisch",
            confirmationEmail: "per E-Mail",
            confirmationSuffix: "so bald wie möglich.",
            funksjoner: [
              {
                tittel: "Ihre eigene Marken-App",
                ikon: "smartphone",
                beskrivelse: "App mit Ihrem Logo, Ihren Farben und Ihrem Design",
              },
              {
                tittel: "Online-Bestellung",
                ikon: "language",
                beskrivelse: "Integrierte Lösung für Online-Bestellungen",
              },
              {
                tittel: "Verwaltung",
                ikon: "settings",
                beskrivelse:
                  "Leistungsstarke Admin-App für die volle Übersicht über Bestellungen und Menü",
              },
              {
                tittel: "Hauslieferung",
                ikon: "delivery_dining",
                beskrivelse:
                  "Günstige und effiziente Hauslieferung über unseren Partner",
              },
              {
                tittel: "Treueprogramm",
                ikon: "card_giftcard",
                beskrivelse: "Integriertes System für Treuekarten und Geschenkkarten",
              },
              {
                tittel: "Flexible Zahlung",
                ikon: "payment",
                beskrivelse:
                  "Unterstützung für verschiedene Zahlungsarten (TWINT, Karte, Bargeld)",
              },
            ],
            fordeler: [
              {
                tittel: "Niedrige Kosten",
                ikon: "savings",
                beskrivelse: "Okam berechnet einen niedrigen Monatspreis.",
              },
              {
                tittel: "Höherer Umsatz",
                ikon: "trending_up",
                beskrivelse: "Unsere Kunden berichten von 20-50% mehr Umsatz",
              },
              {
                tittel: "Kundentreue",
                ikon: "favorite",
                beskrivelse: "Schaffen Sie engere Kundenbeziehungen",
              },
              {
                tittel: "Einfacherer Betrieb",
                ikon: "bolt",
                beskrivelse: "Effiziente Auftragsabwicklung und weniger Fehler",
              },
              {
                tittel: "Wertvolle Einblicke",
                ikon: "bar_chart",
                beskrivelse: "Erhalten Sie nützliche Daten über Kunden und Verkäufe",
              },
              {
                tittel: "24/7 Support",
                ikon: "support_agent",
                beskrivelse:
                  "Technischer Support und Schulung, wann immer Sie ihn brauchen",
              },
              {
                tittel: "Flexible Lösung",
                ikon: "devices",
                beskrivelse:
                  "Verwalten Sie alles vom iPad oder Ihrem eigenen Telefon aus",
              },
              {
                tittel: "Marktführend",
                ikon: "verified",
                beskrivelse:
                  "Aufgebaut auf jahrelanger Erfahrung und kontinuierlicher Entwicklung",
              },
            ],
          }
        : {
            ownAppTitle: "Din egen bestillingsapp",
            petterAlt: "Portrettbilde av Petter fra Jungel Pizza",
            featuredQuote:
              '"Etter over ett års bruk av vår egen app, kan vi trygt si at det har vært en suksess. Vi sparer tid og penger, har bedre kontroll, og kundene våre elsker den nye løsningen."',
            featuredName: "Sukumar Sathiyamoorthy",
            featuredCompany: "Daglig leder av Jungel Pizza",
            screenshotsAlt: "Skjermbilder av Jungel Pizza sin bestillingsapp",
            bookDemo: "Book demo",
            portraitAltPrefix: "Portrettbilde av ",
            featuresTitle: "Dette er noe av det du får:",
            benefitsTitle: "Hvorfor velge oss?",
            formTitle: "Book en uforpliktende demo",
            companyNameLabel: "Navn på selskap",
            companyNameValidation: "Vennligst fyll inn navn på selskap",
            contactNameLabel: "Navn på kontaktperson",
            contactNameValidation: "Vennligst fyll inn navn på kontaktperson",
            contactPreferenceLabel: "Hvordan ønsker du å bli kontaktet?",
            contactPhoneOption: "Ring meg",
            contactEmailOption: "Send meg e-post",
            phoneLabel: "Telefonnummer",
            phoneValidation: "Vennligst fyll inn telefonnummer",
            emailLabel: "E-post",
            emailValidation: "Vennligst fyll inn e-post",
            confirmationPrefix: "Takk for din interesse! Vi kontakter deg",
            confirmationPhone: "på telefon",
            confirmationEmail: "på e-post",
            confirmationSuffix: "snarest.",
            funksjoner: [
              {
                tittel: "Din egen merkevareapp",
                ikon: "smartphone",
                beskrivelse: "App med din logo, farger og design",
              },
              {
                tittel: "Nettbestilling",
                ikon: "language",
                beskrivelse: "Integrert løsning for bestilling på nett",
              },
              {
                tittel: "Administrasjon",
                ikon: "settings",
                beskrivelse: "Kraftig admin-app for full oversikt over bestillinger og meny",
              },
              {
                tittel: "Hjemlevering",
                ikon: "delivery_dining",
                beskrivelse: "Rimelig og effektiv hjemlevering gjennom vår samarbeidspartner",
              },
              {
                tittel: "Lojalitetsprogram",
                ikon: "card_giftcard",
                beskrivelse: "Innebygd system for lojalitetskort og gavekort",
              },
              {
                tittel: "Fleksibel betaling",
                ikon: "payment",
                beskrivelse: "Støtte for flere betalingsmåter (Vipps, kort, kontant)",
              },
            ],
            fordeler: [
              {
                tittel: "Lave kostnader",
                ikon: "savings",
                beskrivelse: "Okam tar en lav månedspris.",
              },
              {
                tittel: "Økt omsetning",
                ikon: "trending_up",
                beskrivelse: "Våre kunder rapporterer 20-50% økt omsetning",
              },
              {
                tittel: "Kundelojalitet",
                ikon: "favorite",
                beskrivelse: "Skap tettere kunderelasjoner",
              },
              {
                tittel: "Enklere drift",
                ikon: "bolt",
                beskrivelse: "Effektiv ordrehåndtering og færre feil",
              },
              {
                tittel: "Verdifull innsikt",
                ikon: "bar_chart",
                beskrivelse: "Få nyttig data om kunder og salg",
              },
              {
                tittel: "24/7 Support",
                ikon: "support_agent",
                beskrivelse: "Teknisk støtte og opplæring når du trenger det",
              },
              {
                tittel: "Fleksibel løsning",
                ikon: "devices",
                beskrivelse: "Administrer alt fra iPad eller din egen telefon",
              },
              {
                tittel: "Markedsledende",
                ikon: "verified",
                beskrivelse: "Bygget på mange års erfaring og kontinuerlig utvikling",
              },
            ],
          };
    },

    isFormValid() {
      const hasBasicInfo = this.storeName.length > 0 && this.userContactName.length > 0;
      const hasValidContact = this.contactPreference === "phone" ? this.userPhone.trim().length > 0 : this.userEmail.trim().length > 0;
      return hasBasicInfo && hasValidContact;
    },
  },

  methods: {
    scrollToRegistration() {
      this.$refs.registrationForm.scrollIntoView({ behavior: "smooth" });
    },

    async submitFeedback() {
      this.showValidation = true;

      if (this.isFormValid) {
        this.messageSent = true;
        const data = {
          feedback: `Butikk: ${this.storeName} | Navn: ${this.userContactName} | Tlf: ${this.userPhone} | Mail: ${this.userEmail} | Kontaktmetode: ${this.contactPreference}`,
          source: "/egen-app",
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
    openJungelPizza() {
      window.open('https://jungelpizza.no', '_blank');
    },
  },
};
</script>

<style lang="scss" scoped>
.egen-app-side {
  line-height: 1.6;
  color: #333;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.seksjons-tittel {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #003058;
}

.handling-knapp {
  display: inline-block;
  background-color: #ff6b6b;
  color: white;
  text-decoration: none;
  font-size: 1.25rem;
  padding: 1rem 2rem;
  border-radius: 5px;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: #ff5252;
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.handling-garanti {
  margin-top: 1rem;
  font-style: italic;
}

.testimonials-seksjon {
  padding: 4rem 0;
  background: #fff;

  &.jungel-header {
    .seksjons-tittel {
      font-size: 2.5rem;
      margin-bottom: 2rem;
      text-align: center;
    }

    .header-action {
      text-align: center;
      margin: 2rem 0;
    }

    .header-handling {
      background: #1bb776;
      color: white;
      border: none;
      padding: 1rem 2rem;
      font-size: 1.1rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.3s ease;

      &:hover {
        background: #159a63;
      }
    }
  }

  .featured-testimonial {
    margin-bottom: 3rem;
    background: #afdbbd;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }

    &-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .featured-person {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .person-image {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
    }

    .featured-image {
      width: 100%;
      height: auto;
      max-width: 100%;
      object-fit: contain;
    }
  }

  .testimonials-rutenett {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }
}

.testimonial-kort {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.testimonial-innhold {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.testimonial-venstre {
  flex-shrink: 0;
}

.testimonial-høyre {
  flex-grow: 1;
}

.testimonial-bilde {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.testimonial-sitat {
  margin-bottom: 1rem;
  font-style: italic;
  color: #4b5563;
}

.testimonial-navn {
  font-weight: bold;
  color: black;
  margin-bottom: 0.25rem;
}

.testimonial-bedrift {
  color: #666;
  font-size: 0.9rem;
}

.funksjoner-seksjon,
.fordeler-seksjon {
  padding: 4rem 0;
  background: #f2f4fb;

  .funksjoner-rutenett,
  .fordeler-rutenett {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
  }
}

.funksjons-kort {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;

  .funksjons-ikon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;

    &:nth-child(8n + 1) {
      background: #e8f5e9;
      .material-icons {
        color: #2e7d32;
      }
    }
    &:nth-child(8n + 2) {
      background: #e3f2fd;
      .material-icons {
        color: #1565c0;
      }
    }
    &:nth-child(8n + 3) {
      background: #fff3e0;
      .material-icons {
        color: #ef6c00;
      }
    }
    &:nth-child(8n + 4) {
      background: #f3e5f5;
      .material-icons {
        color: #7b1fa2;
      }
    }
    &:nth-child(8n + 5) {
      background: #e0f7fa;
      .material-icons {
        color: #00838f;
      }
    }
    &:nth-child(8n + 6) {
      background: #fbe9e7;
      .material-icons {
        color: #d84315;
      }
    }
    &:nth-child(8n + 7) {
      background: #f1f8e9;
      .material-icons {
        color: #558b2f;
      }
    }
    &:nth-child(8n + 8) {
      background: #e8eaf6;
      .material-icons {
        color: #283593;
      }
    }

    .material-icons {
      font-size: 2rem;
    }
  }

  .funksjons-tittel {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
    color: #003058;
  }
}

.handling-seksjon {
  background: #e6f7f0;
  padding: 4rem 0;
  text-align: center;

  .handling-tittel {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: #003058;
  }

  .handling-beskrivelse {
    font-size: 1.25rem;
    margin-bottom: 2rem;
  }
}

.registrering-seksjon {
  padding: 4rem 0;
  background: white;

  .registrering-skjema {
    max-width: 600px;
    margin: 0 auto;
  }

  .skjema-felt {
    margin-bottom: 1.5rem;

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #003058;
      font-size: 1rem;
    }

    input,
    select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      height: 50px;
      cursor: pointer;

      &:focus {
        outline: none;
        border-color: #1bb776;
        box-shadow: 0 0 0 2px rgba(27, 183, 118, 0.1);
      }
    }

    select {
      appearance: none;
      background: #fff url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z' fill='%23003058'/%3E%3C/svg%3E") no-repeat right 12px center;
      padding-right: 40px;
    }
  }
}

.kontakt-seksjon {
  padding: 4rem 0;
  text-align: center;

  .telefon-lenke,
  .les-mer-lenke {
    color: #003058;
    text-decoration: none;
    font-weight: bold;

    &:hover {
      text-decoration: underline;
    }
  }
}

.fordel-kort {
  padding: 1.5rem;
  text-align: left;

  .fordel-ikon {
    display: inline-flex;
    align-items: center;
    margin-right: 0.5rem;
    vertical-align: middle;

    .material-icons {
      font-size: 1.5rem;
      color: #1bb776;
    }
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
}

.validation-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.skjema-felt {
  margin-bottom: 1.5rem;

  input.error {
    border-color: #dc3545;
  }
}

@media (max-width: 768px) {
  .intro-seksjon {
    .intro-tittel {
      font-size: 2rem;
    }

    .intro-undertittel {
      font-size: 1rem;
    }
  }

  .handling-knapp {
    font-size: 1rem;
    padding: 0.75rem 1.5rem;
  }

  .funksjoner-seksjon,
  .fordeler-seksjon,
  .handling-seksjon {
    .seksjons-tittel,
    .handling-tittel {
      font-size: 1.75rem;
    }

    .handling-beskrivelse {
      font-size: 1rem;
    }
  }
}
</style>
