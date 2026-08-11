<template>
  <div class="terms-content">
    <!-- Norway's merchant agreement. Gated on its OWN documentId, not on
         `market !== 'ch'`: an inverted fork would hand market #3 Norwegian law
         and Oslo tingrett as its venue without anyone editing a line.
         The id is READ FROM the registry rather than repeated as a literal, so
         the two cannot drift apart and leave this block silently unreachable. -->
    <template v-if="terms.documentId === norwegianDocumentId">
    <h1>Avtalevilkår for Okam AS</h1>
    <p class="terms-date">Sist oppdatert: 12. april 2025</p>
    <h2>Generelle Avtalevilkår for Okam AS</h2>

    <p>Disse avtalevilkårene («Vilkårene») gjelder mellom deg som kunde («Kunden») og Okam AS org. nr. 925 024 414, ved kjøp av Okam AS sine produkter og tjenester («Produktene»).</p>

    <h3>1. Avtaleinngåelse og varighet</h3>
    <ul>
      <li><strong>Kontraktsinngåelse:</strong> Kunden aksepterer Avtalen ved å skrive inn en bekreftelseskode som mottas på SMS. Dette anses som juridisk bindende. Ved motstrid mellom Vilkår og Ordren, går Ordren foran.</li>
      <li><strong>Varighet og oppsigelse:</strong> Avtalen løper inntil den sies opp av en av partene med én (1) måneds skriftlig varsel til hei@okam.no.</li>
      <li><strong>Overdragelse:</strong> Kunden kan ikke overdra Avtalen uten skriftlig forhåndssamtykke fra Okam AS.</li>
    </ul>

    <h3>2. Betaling og ansvar</h3>
    <ul>
      <li><strong>Vederlag:</strong> Kunden betaler vederlag som fremgår av Ordren. Alle priser er eks. mva. Betalingsfrist er 14 dager fra fakturadato.</li>
      <li><strong>Ansvar:</strong> Ved avtalebrudd skal forholdet rettes innen rimelig tid. Ansvaret er begrenset til verdien av den aktuelle tjenesten per skadetilfelle.</li>
      <li><strong>Manglende leveranse:</strong> Dersom Okam AS ikke leverer avtalte tjenester, har Kunden krav på tilbakebetaling av innbetalt vederlag for den delen som ikke er levert. Tilbakebetaling skjer innen 14 dager.</li>
    </ul>

    <h3>3. Øvrige bestemmelser</h3>
    <ul>
      <li><strong>Kundens ansvar:</strong> Kunden er ansvarlig for å oppgi korrekte opplysninger om egen virksomhet og kontrollere avtalen før oppstart.</li>
      <li><strong>Endringer:</strong> Okam AS kan endre Vilkårene med én måneds varsel. Økonomiske vilkår endres kun ved ny avtaleperiode.</li>
      <li><strong>Drift:</strong> Okam AS garanterer 99% oppetid på månedsbasis. Dette gjelder ikke ved planlagt vedlikehold eller forhold utenfor Okam AS sin kontroll.</li>
      <li><strong>Lovvalg og tvister:</strong> Avtalen reguleres av norsk rett. Tvister løses i minnelighet eller ved Oslo tingrett.</li>
    </ul>
    </template>

    <!-- A market whose row SAYS an agreement is published, for which this file
         has no matching block. Whoever adds market #3's document adds its
         markup above with its own v-else-if, ahead of this branch. Until then
         this must be loud: pages/offer/_code.vue shows this component directly
         above an acceptance tick-box, and a blank page under the heading
         "Avtalevilkår for Okam AS" is a contract a merchant can accept. -->
    <div
      v-else-if="terms.published"
      class="terms-unavailable"
    >
      <h1>{{ missing.title }}</h1>
      <p>{{ missing.body }}</p>
      <p>
        <a :href="`mailto:${marketConfig.contactEmail}`">{{ marketConfig.contactEmail }}</a>
      </p>
    </div>

    <!-- A market with no agreement of its own says so, and says who to ask. -->
    <div
      v-else
      class="terms-unpublished"
    >
      <h1>{{ terms.title }}</h1>
      <p>{{ terms.body }}</p>
      <p>
        <a :href="`mailto:${marketConfig.contactEmail}`">{{ marketConfig.contactEmail }}</a>
      </p>
    </div>
  </div>
</template>

<script>
import { MERCHANT_TERMS, merchantTermsFor, merchantTermsUnavailableCopy } from "~/utils/merchant-terms";

export default {
  name: "TermsContent",
  computed: {
    terms() {
      return merchantTermsFor(this.marketConfig);
    },
    // Read from the registry, never retyped. A one-sided edit to either would
    // otherwise leave `published: true` with no branch to render it.
    norwegianDocumentId() {
      return MERCHANT_TERMS.no.documentId;
    },
    missing() {
      return merchantTermsUnavailableCopy(this.marketConfig);
    },
  },
};
</script>

<style scoped>
.terms-content {
  font-family: "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
}

h1 {
  font-size: 24px;
  margin-bottom: 10px;
  color: #333;
}

.terms-date {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
  font-style: italic;
}

h2 {
  font-size: 20px;
  margin-bottom: 15px;
  color: #333;
}

h3 {
  font-size: 18px;
  margin-top: 25px;
  margin-bottom: 10px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

p {
  margin-bottom: 15px;
}

ul {
  padding-left: 20px;
  margin-bottom: 20px;
}

li {
  margin-bottom: 10px;
}

strong {
  font-weight: bold;
}
</style>
