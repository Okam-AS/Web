<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content u-center">
            <p v-if="res && res.logoUrl">
              <img
                :src="res.logoUrl"
                :alt="res.name + ' logo'"
                style="width: 100px; height: auto; margin: 0 auto 20px"
              />
            </p>

            <h1 class="heading-1">
              <template v-if="res && res.name"> {{ copy.welcomeTo }} {{ res.name }} </template>
              <template v-else> {{ copy.welcome }} </template>
            </h1>

            <p>{{ copy.seeMenu }}</p>

            <p>{{ copy.downloadApp }}</p>
            <div class="big-teaser__links">
              <a
                class="ga-ios-download"
                href="https://apps.apple.com/no/app/okam/id1514296965"
                ><img
                  :alt="copy.appStoreAlt"
                  height="40"
                  width="120"
                  src="~assets/UI/appstore-btn.png"
              /></a>
              <a
                class="ga-android-download"
                href="https://play.google.com/store/apps/details?id=no.okam.consumer"
                ><img
                  :alt="copy.googlePlayAlt"
                  height="40"
                  width="130"
                  src="~assets/UI/googleplay-btn.png"
              /></a>
            </div>
            <p
              v-if="showWebshopUrl"
              style="margin-top: 2em"
            >
              <a :href="webshopUrl">{{ copy.continueInBrowser }}</a>
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
  async asyncData({ params, redirect }) {
    const slug = parseInt(params.slug, 10) || false; // When calling /abc the slug will be "abc"
    if (slug) {
      const res = await fetch(`https://okamapi.azurewebsites.net/stores/basic/${slug}`).then((res) => res.json());
      if (!res || !res.approved) {
        redirect("/store/notfound");
      }
      return { res };
    } else {
      redirect("/");
    }
  },
  data: () => ({
    hasWebLinks: [25, 28, 39],
  }),
  computed: {
    copy() {
      return this.isCh
        ? {
            welcomeTo: "Willkommen bei",
            welcome: "Willkommen",
            seeMenu: "Speisekarte ansehen und Bestellung aufgeben",
            downloadApp: "Laden Sie die Okam-App herunter und nutzen Sie sie",
            appStoreAlt: "Okam-App im App Store herunterladen",
            googlePlayAlt: "Okam-App bei Google Play herunterladen",
            continueInBrowser: "Oder im Browser fortfahren",
          }
        : {
            welcomeTo: "Velkommen til",
            welcome: "Velkommen",
            seeMenu: "Se meny og legge inn bestilling",
            downloadApp: "Last ned og bruk Okam appen",
            appStoreAlt: "Last ned Okam-appen på App Store",
            googlePlayAlt: "Last ned Okam-appen på Google Play",
            continueInBrowser: "Eller fortsett i nettleseren",
          };
    },
    showWebshopUrl() {
      return this.res && this.res.id && this.hasWebLinks.includes(this.res.id);
    },
    webshopUrl() {
      return this.res && this.res.id ? "/webshop/?nolayout=true&store=" + this.res.id : "/";
    },
  },
};
</script>
