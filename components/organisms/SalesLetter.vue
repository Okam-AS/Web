<template>
  <div class="page">
    <img
      v-if="imageUrl"
      width="100"
      :src="imageUrl"
      :alt="name"
      class="client-logo"
    >

    <h1>{{ copy.greeting }} {{ name }},</h1>
    <p>
      {{ copy.intro }}
    </p>

    <p>
      {{ copy.paragraph2 }}
    </p>

    <h3>{{ copy.whyTitle }}</h3>
    <p /><div>
      <strong>{{ copy.benefit1Label }}</strong> {{ copy.benefit1Text }}
    </div>

    <div>
      <strong>{{ copy.benefit2Label }}</strong> {{ copy.benefit2Text }}
    </div>

    <div>
      <strong>{{ copy.benefit3Label }}</strong> {{ copy.benefit3Text }}
    </div>
    </p>

    <h3>{{ copy.priceTitle }}</h3>
    <p>
      {{ copy.priceText }}
    </p>

    <p>
      {{ copy.closingText }}
    </p>

    <p class="signature">
      {{ copy.signOff }}
      <br>
      <br><strong>André Sharghi</strong> <br>{{ copy.role }} <br>(+47) 988 65 120
      <br>
      <img class="okam-logo" src="~/assets/UI/okam-png-logo.png" :alt="copy.okamLogoAlt">
      <br>
      <span class="small-text">{{ copy.website }}</span>
    </p>
  </div>
</template>

<style lang="scss">
.print {
  h1 {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 1em;
    text-align: center;
  }
  .page {
    padding: 4em;
  }
  .okam-logo {
    padding: 0;
    margin: 0;
    height: 25px;
    margin-top: 10px;
  }
  .small-text {
    font-size: 0.8em;
  }
  .client-logo {
    margin: 0 auto;
    display: block;
    margin-bottom: 1em;
  }
}
</style>

<script>
import { isCh } from "~/config/edition";

export default {
  props: {
    name: {
      type: String,
      required: true
    },
    imageUrl: {
      type: String,
      required: true
    }
  },
  computed: {
    copy() {
      return isCh
        ? {
            greeting: "Sehr geehrtes Team von",
            intro:
              "Wir haben " +
              this.name +
              " sorgfältig ausgewählt, weil wir überzeugt sind, dass Sie von einer von uns angebotenen massgeschneiderten Lösung erheblich profitieren werden – einer eigenen Bestell-App.",
            paragraph2:
              "Wir bei Okam haben ein einzigartiges System entwickelt, mit dem Restaurants wie das Ihre eine eigene, an die Marke angepasste Bestell-App lancieren können. Diese App stärkt nicht nur Ihre Marke, sondern bietet auch eine direkte und verbesserte Verbindung zu Ihren Gästen und steigert gleichzeitig den Umsatz. Unsere Partner, wie Jungel Pizza, berichten von beträchtlichem Wachstum und höherer Kundenzufriedenheit dank unseres Dienstes.",
            whyTitle: "Warum eine eigene App?",
            benefit1Label: "Höherer Umsatz:",
            benefit1Text:
              "Erweitern Sie Ihre digitale Präsenz, erreichen Sie mehr Gäste und steigern Sie den Verkauf mit einfacher Online-Bestellung.",
            benefit2Label: "Kundentreue:",
            benefit2Text:
              "Schaffen Sie Treue mit exklusiven Angeboten und einem einfachen Bestellprozess.",
            benefit3Label: "Markenaufbau:",
            benefit3Text:
              "Stärken Sie Ihre Marke mit einer an Ihr Branding angepassten App.",
            priceTitle: "Was kostet das?",
            priceText:
              "Unser regulärer Preis für diesen Dienst beträgt 2000 CHF/Monat. Für " +
              this.name +
              " möchten wir Ihnen jedoch ein besonderes Angebot machen, das noch besser ist. Wir berechnen einen tiefen Monatspreis und sind stolz darauf, das zu bieten, was wir für die beste Benutzerfreundlichkeit der Schweiz für Bestell-Apps halten.",
            closingText:
              "Gerne komme ich für eine Demonstration vorbei, um zu besprechen, wie sich unsere Lösung an die besonderen Bedürfnisse von " +
              this.name +
              " anpassen lässt. Schreiben Sie mir gerne eine E-Mail oder rufen Sie mich unter 988 65 120 an, um einen Termin zu vereinbaren.",
            signOff: "Freundliche Grüsse,",
            role: "Geschäftsführer, Okam AS",
            okamLogoAlt: "Logo",
            website: "https://okam.ch"
          }
        : {
            greeting: "Kjære",
            intro:
              "Vi har nøye håndplukket " +
              this.name +
              " fordi vi tror dere vil ha stor nytte av en skreddersydd løsning vi tilbyr – en egen bestillingsapp.",
            paragraph2:
              "Vi i Okam har utviklet et unikt system som lar restauranter som deres lansere en egen, merkevaretilpasset bestillingsapp. Denne appen vil ikke bare styrke merkevaren deres, men også tilby en direkte og forbedret forbindelse med kundene, samtidig som den øker omsetningen. Våre partnere, som Jungel Pizza, har rapportert betydelig vekst og forbedret kundetilfredshet med vår tjeneste.",
            whyTitle: "Hvorfor egen app?",
            benefit1Label: "Økt Inntekt:",
            benefit1Text:
              "Utvid din digitale tilstedeværelse, nå ut til flere kunder og øk salget med enkel onlinebestilling.",
            benefit2Label: "Kundelojalitet:",
            benefit2Text:
              "Bygg lojalitet med eksklusive tilbud og en enkel bestillingsprosess.",
            benefit3Label: "Merkevarebygging:",
            benefit3Text:
              "Styrk merkevaren din med en merkevaretilpasset app.",
            priceTitle: "Hva koster det?",
            priceText:
              "Vår vanlige pris for denne tjenesten er 2000 kr/måned. Men, for " +
              this.name +
              ", vil vi gjerne tilby en spesiell avtale som er enda bedre. Vi tar en lav månedspris og er stolte av å tilby det vi mener er Norges beste brukervennlighet for bestillingsapper.",
            closingText:
              "Jeg vil gjerne komme innom for en demonstrasjon og for å diskutere hvordan vår løsning kan tilpasses til " +
              this.name +
              "s unike behov. Send meg gjerne en e-post eller ring meg på 988 65 120 for å avtale et møte.",
            signOff: "Vennlig hilsen,",
            role: "Daglig leder, Okam AS",
            okamLogoAlt: "logo",
            website: "https://okam.no"
          };
    }
  }
}
</script>