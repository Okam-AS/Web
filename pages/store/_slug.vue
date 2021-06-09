<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content u-center">

            <p v-if="res.logoUrl">
              <img :src="res.logoUrl" style="width: 100px; height: auto; margin: 0 auto 20px;">
            </p>

            <h1 class="heading-1">
              <template v-if="res.name">
                Velkommen til {{ res.name }}
              </template>
              <template v-else>
                Velkommen
              </template>
            </h1>

            <p>
              Last ned Okam for å se vareutvalg og legge inn bestilling hos oss
            </p>

            <p style="font-weight:bold;">
              Trykk for å laste ned
            </p>
            <div class="big-teaser__links">
              <a class="ga-ios-download" href="https://apps.apple.com/no/app/okam/id1514296965"><img alt="AppStore" height="40" src="~assets/UI/appstore-btn.png"></a>
              <a class="ga-android-download" href="https://play.google.com/store/apps/details?id=no.okam.consumer"><img alt="Google Play" height="40" src="~assets/UI/googleplay-btn.png"></a>
            </div>
          </div>
        </div>
      </div>
    </main>
    <page-footer />
  </div>
</template>

<script>
export default {
  async asyncData({ params, redirect }) {
    const slug = parseInt(params.slug, 10) || false // When calling /abc the slug will be "abc"
    if (slug) {
      const res = await fetch(
        `https://okamapi.azurewebsites.net/stores/basic/${slug}`
      ).then(res => res.json())
      return { res }
    } else {
      redirect('/')
    }
  }
}
</script>