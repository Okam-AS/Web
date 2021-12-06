<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">
              {{ blogsRoot.heading }}
            </h1>
            <p>{{ blogsRoot.main_intro }}</p>
            <div>
              <a v-for="article in blogs" :key="article.id" :href="'/aktuelt/'+article.url">
                <div style="border:1px solid black;">
                  <h2>{{ article.heading }}</h2>
                  <p>{{ article.main_intro }}</p>
                  <img :src="article.main_image.formats.thumbnail.url" :alt="article.main_image.alternativeText">
                </div>
              </a>
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
  data: () => ({
    strapiBaseUrl: process.env.STRAPI_BASE_URL,
    blogsRoot: {
      id: 0,
      heading: '',
      main_intro: ''
    },
    blogs: [{
      id: 0,
      heading: '',
      main_intro: '',
      main_body: '',
      main_image: {
        alternativeText: '',
        formats: {
          small: {
            url: ''
          },
          thumbnail: {
            url: ''
          }
        }
      },
      images: [],
      created_at: '',
      updated_at: ''
    }]
  }),
  mounted () {
    fetch(`${this.strapiBaseUrl}/blog-posts`)
      .then((res) => {
        res.json().then(
          (jsonResponse) => {
            this.blogs = jsonResponse
          })
      })
    fetch(`${this.strapiBaseUrl}/blog-posts-root`)
      .then((res) => {
        res.json().then(
          (jsonResponse) => {
            this.blogsRoot = jsonResponse
          })
      })
  }
}
</script>
