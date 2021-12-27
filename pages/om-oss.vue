<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">
              {{ page.heading }}
            </h1>
            <!-- article -->
            <article
              :id="'post-'+page.id"
              class="page type-page status-publish hentry"
            >
              <div v-if="page.main_intro" v-html="$md.render(page.main_intro || '')" />
              <div v-if="page.main_body" v-html="$md.render(page.main_body || '')" />

              <p style="margin-top:50px;">
                <strong>Har du tips om et sted du skulle likt å handle med
                  Okam?</strong>
                <a href="/kontakt/">Send oss gjerne en melding her</a>.
              </p>

              <p>Last ned Okam for å handle fra butikker i ditt nærområde</p>
              <div class="big-teaser__links">
                <a
                  class="ga-ios-download"
                  href="https://apps.apple.com/no/app/okam/id1514296965"
                ><img
                  alt="AppStore"
                  height="40"
                  src="~assets/UI/appstore-btn.png"
                ></a>
                <a
                  class="ga-android-download"
                  href="https://play.google.com/store/apps/details?id=no.okam.consumer"
                ><img
                  alt="Google Play"
                  height="40"
                  src="~assets/UI/googleplay-btn.png"
                ></a>
              </div>
            </article>
            <!-- /article -->
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
  data: () => ({
    strapiBaseUrl: process.env.STRAPI_BASE_URL,
    page: {
      id: 0,
      heading: '',
      main_intro: '',
      main_body: '',
      employee: [], // {id, name, description, job_title, profile}
      created_at: '',
      updated_at: ''
    }
  }),
  mounted () {
    fetch(`${this.strapiBaseUrl}/about-us`)
      .then((res) => {
        res.json().then(
          (jsonResponse) => {
            this.page = jsonResponse
          })
      })
  }
}
</script>
