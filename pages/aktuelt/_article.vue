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
              v-if="
                article.main_image &&
                  article.main_image.formats &&
                  article.main_image.formats.small &&
                  article.main_image.formats.small.url
              "
              class="blog-post__image"
              :src="article.main_image.formats.small.url"
              :alt="article.main_image.alternativeText"
            >
            <div v-html="$md.render(article.main_intro || '')" />
            <div v-html="$md.render(article.main_body || '')" />
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
    const blogPosts = await fetch(
      `${process.env.STRAPI_BASE_URL}/blog-posts`
    ).then(res => res.json())
    try {
      const filteredPost = blogPosts.find(
        el => el?.url?.toLowerCase() === params.article
      )
      if (filteredPost) {
        return {
          article: filteredPost
        }
      } else {
        redirect('/aktuelt')
      }
    } catch (error) {
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
