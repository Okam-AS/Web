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
            <article class="page type-page status-publish hentry">
              <div v-if="page.body" v-html="$md.render(page.body || '')" />
            </article>
          </div>
        </div>
      </div>
    </main>

    <page-footer />
  </div>
</template>
<script>
export default {
  data: () => ({
    strapiBaseUrl: process.env.STRAPI_BASE_URL,
    page: {
      id: 0,
      heading: '',
      body: '',
      created_at: '',
      updated_at: ''
    }
  }),
  mounted () {
    fetch(`${this.strapiBaseUrl}/terms`)
      .then((res) => {
        res.json().then(
          (jsonResponse) => {
            this.page = jsonResponse
          })
      })
  }
}
</script>