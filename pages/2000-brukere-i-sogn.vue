<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="content-background">
            <img
              src="~/assets/UI/sogn-banner.png"
              alt="banner"
            />

            <article class="grid-wrapper">
              <h1 class="heading-1 u-center">🎉 Feiring av 2000 brukere i Sogn - Eksklusivt tilbud! 🌟</h1>
              <p>
                🍽️ Driver du med take away i Sogn?
                <br />
                📲 Bli med i vår bestillingsapp og gjør det enkelt for kundene dine å bestille direkte fra deg. Vi tilbyr en brukervennlig Admin-app som gir deg full kontroll og oversikt - enkelt, effektivt og raskt!
              </p>
              <p>📈 Vi er stolte over at våre partnere i Sogn har rapportert om opptil <strong>50% økning i omsetning</strong> og håper du ønsker å være med på å styrke lokal handel</p>
              <p>🌟 Ditt tilbud inkluderer:</p>
              <p>
                ✅ Gratis registrering og synlighet for hele 2024 <br />
                ✅ Ingen skjulte avgifter eller bindingstid <br />
                ✅ Komplett kontroll i admin-appen for enkel ordrehåndtering<br />
                ✅ Vi bistår deg underveis med personlig oppstartshjelp<br />
                ✅ Gratis tilgang til Pro versjon (ordinærpris 1000 kr/mnd)
              </p>
              <p>⏰ Begrenset tid: Bruk kampanjekoden <strong>"Sogn"</strong></p>
              <br />
              <a
                class="cta-link"
                :href="registrationLink"
                >Gå til registrering</a
              >
            </article>
          </div>
          <div class="read-more">
            <p class="read-more-heading">Ønsker du å vite mer?</p>
            <p>
              Ta kontakt med oss på telefon
              <a href="tel:+4798865120">988 65 120</a> eller les mer
              <a href="/om-okam-admin">her</a>
            </p>
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
  data: () => ({
    registrationLink: "/registrer?price=1&code=sogn",
  }),
};
</script>
<style lang="scss" scoped>
.grid-wrapper {
  padding: 3em;
}
.cta-link {
  font-size: 22px;
  font-size: bold;
}
.wrapper {
  padding: 0;
  padding-bottom: 6em;
}
.heading-1 {
  margin-top: 1em;
  margin-bottom: 2em;
}
.read-more-heading {
  font-size: 20px;
  font-size: bold;
  margin-bottom: 10px;
  margin-top: 3em;
}
.content-background {
  background: #f2f4fb;
}
.read-more {
  margin-left: 3em;
}

@media (min-width: 800px) {
  .read-more {
    margin-left: 0em;
  }
}
</style>
