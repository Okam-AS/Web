<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">Personvernerklæring</h1>
            <article class="page type-page status-publish hentry">
              <div class="privacy-content">
                <p><strong>Sist oppdatert: 7. mars 2025</strong></p>

                <h2>Generelt</h2>
                <p>Okam AS er selskap med adresse Landstads gate 54, 2000 Lillestrøm, som står bak plattformen Okam og som er behandlingsansvarlig for alle peronopplysninger i appikasjonen. Hvordan vi lagrer og behandler informasjon om deg når du bruker mobilapplikasjonen eller besøker nettsidene våre er beskrevet i denne erklæringen. Vår innhenting og bruk av informasjon er innenfor de kravene som er satt av EU's GDPR-forordning og norsk lov (personopplysningsloven).</p>

                <h2>Hvilke opplysninger vi lagrer</h2>
                <p>Når du bruker Okam-appen, eller andre white label apper levert av Okam, vil Okam-systemet kun lagre informasjon som er nødvendig for å levere tjenesten til deg. Når du legger inn en bestilling vil systemet lagre telefonnummer og bestillingsinformasjon. Telefonnummeret vil være din brukeridentitet og bestillingshistorikken din lagres sammen med dette telefonnummeret for å gi deg en samlet oversikt over dine bestillinger. Dette er informasjon du har tilgang til via applikasjonen og du kan når som helst velge å slette denne informasjon dersom du ikke ønsker å ha det lagret på din bruker. Vi benytter Stripe for kortbetaling og Vipps for mobilbetaling via appen.</p>

                <h2>Hvor lenge opplysningene lagres</h2>
                <p>Din data, inkludert all bestillingshistorikk, lagres inntil du eventuelt velger å slette den.</p>

                <h2>Informasjonsdeling med tredjepart</h2>
                <p>Vi selger ikke dine personopplysninger til tredjepart. Dersom du legger inn en bestilling deler vi informasjon med den gjeldende butikken om:</p>
                <ul>
                  <li>Telefonnummer</li>
                  <li>Dato og klokkelsett for bestilling</li>
                  <li>Betalingsmetode (ingen sensitiv data)</li>
                  <li>Vareliste og kommentarer</li>
                  <li>Leveringsadresse (hvis oppgitt)</li>
                  <li>E-postadresse (hvis oppgitt)</li>
                  <li>Fornavn og etternavn (hvis oppgitt)</li>
                </ul>
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
import PageHeader from '@/components/organisms/PageHeader.vue'
import PageFooter from '@/components/organisms/PageFooter.vue'

export default {
  components: { PageHeader, PageFooter }
}
</script>

<style scoped>
.privacy-content h2 {
  margin-top: 2rem;
  margin-bottom: 1rem;
}
.privacy-content ul {
  list-style-type: disc;
  margin-left: 2rem;
}
</style>