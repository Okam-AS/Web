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
            <article
              :id="'post-'+page.id"
              class="page type-page status-publish hentry"
            >
              <div v-if="page.body" v-html="$md.render(page.body || '')" />
              <div class="faq-list">
                <h2 v-if="page.accordion_heading" class="heading-1 u-center">
                  {{ page.accordion_heading }}
                </h2>
                <div v-for="accordionItem in page.accordion" :key="accordionItem.id">
                  <FaqItem :q="accordionItem.title">
                    <span v-html="$md.render(accordionItem.description || '')" />
                  </FaqItem>
                </div>
              </div>
              <div v-if="page.body_below_accordion" v-html="$md.render(page.body_below_accordion || '')" />
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
import FaqItem from '@/components/atoms/FaqItem.vue'

export default {
  components: { PageHeader, PageFooter, FaqItem },
  data: () => ({
    strapiBaseUrl: process.env.STRAPI_BASE_URL,
    page: {
      id: '',
      heading: '',
      accordion_heading: '',
      body: '',
      body_below_accordion: '',
      published_at: '',
      created_at: '',
      updated_at: '',
      accordion: [] // {id,title,description}
    }
  }),
  mounted () {
    fetch(`${this.strapiBaseUrl}/for-consumers`)
      .then((res) => {
        res.json().then(
          (jsonResponse) => {
            this.page = jsonResponse
          })
      })
  }
}
</script>
