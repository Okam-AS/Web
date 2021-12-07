<template>
  <div>
    <page-header />
    <main class="page-content blog-post">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">
              {{ article.heading }}
            </h1>
            <img
              class="blog-post__image"
              :src="article.main_image.formats.small.url"
              :alt="article.main_image.alternativeText"
            >
            <p>{{ article.main_intro }}</p>
            <p>{{ article.main_body }}</p>
          </div>
        </div>
      </div>
    </main>
    <page-footer />
  </div>
</template>
<script>
export default {
  async asyncData ({ params, redirect }) {
    const blogPosts = await fetch(
      `${process.env.STRAPI_BASE_URL}/blog-posts`
    ).then(res => res.json())
    const filteredPost = blogPosts.find(
      el => !!el.url && el.url.toLowerCase() === params.article
    )
    if (filteredPost) {
      return {
        article: filteredPost
      }
    } else {
      redirect('/aktuelt')
    }
  },
  data: () => ({
    strapiBaseUrl: process.env.STRAPI_BASE_URL,
    article: {
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
    }
  })
}
</script>

<style lang="scss">
.blog-post {
	&__image {
		margin-bottom: 3rem;
		max-width: 100%;
	}
}
</style>
