<template>
  <div class="page">
    <img
      v-if="imageUrl"
      width="100"
      :src="imageUrl"
      :alt="name"
      class="client-logo"
    >

    <h1>Kjære {{ name }},</h1>
    <p>
      Vi har nøye håndplukket {{ name }} fordi vi tror dere vil ha stor nytte av
      en skreddersydd løsning vi tilbyr – en egen bestillingsapp.
    </p>

    <p>
      Vi i Okam har utviklet et unikt system som lar restauranter som deres
      lansere en egen, merkevaretilpasset bestillingsapp. Denne appen vil ikke
      bare styrke merkevaren deres, men også tilby en direkte og forbedret
      forbindelse med kundene, samtidig som den øker omsetningen. Våre partnere,
      som Jungel Pizza, har rapportert betydelig vekst og forbedret
      kundetilfredshet med vår tjeneste.
    </p>

    <h3>Hvorfor egen app?</h3>
    <p /><div>
      <strong>Økt Inntekt:</strong> Utvid din digitale tilstedeværelse, nå ut
      til flere kunder og øk salget med enkel onlinebestilling.
    </div>

    <div>
      <strong>Kundelojalitet:</strong> Bygg lojalitet med eksklusive tilbud og
      en enkel bestillingsprosess.
    </div>

    <div>
      <strong>Merkevarebygging:</strong> Styrk merkevaren din med en
      merkevaretilpasset app.
    </div>
    </p>

    <h3>Hva koster det?</h3>
    <p>
      Vår vanlige pris for denne tjenesten er 2000 kr/måned. Men, for
      {{ name }}, vil vi gjerne tilby en spesiell avtale som er enda bedre. Vi
      tar en lav månedspris og er stolte av å tilby det vi mener er Norges beste
      brukervennlighet for bestillingsapper.
    </p>

    <p>
      Jeg vil gjerne komme innom for en demonstrasjon og for å diskutere hvordan
      vår løsning kan tilpasses til {{ name }}s unike behov. Send meg gjerne en
      e-post eller ring meg på 988 65 120 for å avtale et møte.
    </p>

    <p class="signature">
      Vennlig hilsen,
      <br>
      <br><strong>André Sharghi</strong> <br>Daglig leder, Okam AS <br>(+47) 988 65 120
      <br>
      <img class="okam-logo" src="~/assets/UI/okam-png-logo.png" alt="logo">
      <br>
      <span class="small-text">https://okam.no</span>
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
  }
}
</script>