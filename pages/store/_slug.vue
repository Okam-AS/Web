<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content u-center">
            <p v-if="res && res.logoUrl">
              <img :src="res.logoUrl" style="width: 100px; height: auto; margin: 0 auto 20px;">
            </p>

            <h1 class="heading-1">
              <template v-if="res && res.name">
                Velkommen til {{ res.name }}
              </template>
              <template v-else>
                Velkommen
              </template>
            </h1>

            <p>Se meny og legge inn bestilling</p>

            <p>
              Last ned og bruk Okam appen
            </p>
            <div class="big-teaser__links">
              <a class="ga-ios-download" href="https://apps.apple.com/no/app/okam/id1514296965"><img alt="AppStore" height="40" src="~assets/UI/appstore-btn.png"></a>
              <a class="ga-android-download" href="https://play.google.com/store/apps/details?id=no.okam.consumer"><img alt="Google Play" height="40" src="~assets/UI/googleplay-btn.png"></a>
            </div>
            <p v-if="showWebshopUrl" style="margin-top:2em;">
              <a :href="webshopUrl">Eller fortsett i nettleseren</a>
            </p>
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
  components: { PageHeader, PageFooter },
  async asyncData ({ params, redirect }) {
    const slug = parseInt(params.slug, 10) || false // When calling /abc the slug will be "abc"
    if (slug) {
      const res = await fetch(
        `https://okamapi.azurewebsites.net/stores/basic/${slug}`
      ).then(res => res.json())
      return { res }
    } else {
      redirect('/')
    }
  },
  data: () => ({
    hasWebLinks: [28, 39]
  }),
  computed: {
    showWebshopUrl () {
      return this.res && this.res.id && this.hasWebLinks.includes(this.res.id)
    },
    webshopUrl () {
      return this.res && this.res.id ? '/webshop/?nolayout=true&store=' + this.res.id : '/'
    }
  }
}
</script>