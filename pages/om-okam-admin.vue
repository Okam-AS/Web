<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <h1 class="heading-1 u-center">
            {{ page.heading }}
          </h1>
          <article
            :id="'post-'+page.id"
            class="page type-page status-publish hentry"
          >
            <div v-if="page.body" v-html="$md.render(page.body || '')" />

            <div style="margin-top: 50px">
              <h2 class="heading-1 u-center">
                {{ page.features_title }}
              </h2>
              <feature-info
                v-for="feature in page.features"
                :key="feature.id"
                :name="feature.title"
                :description="feature.description"
                :icon-url="feature.icon.url"
              />
              <div v-if="page.body_below_features" v-html="$md.render(page.body_below_features || '')" />
            </div>
            <div class="faq-list">
              <h2 v-if="page.accordion_title" class="heading-1 u-center">
                {{ page.accordion_title }}
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
    </main>
    <page-footer />
  </div>
</template>
<script>
import FeatureInfo from '@/components/atoms/FeatureInfo.vue'
import FaqItem from '@/components/atoms/FaqItem.vue'
export default {
  components: { FeatureInfo, FaqItem },
  data: () => ({
    strapiBaseUrl: process.env.STRAPI_BASE_URL,
    page: {
      id: '',
      heading: '',
      accordion_title: '',
      body: '',
      body_below_accordion: '',
      published_at: '',
      created_at: '',
      updated_at: '',
      features_title: '',
      features: [], // {id,title,description,icon{url} }
      accordion: [] // {id,title,description}
    }
  }),
  mounted () {
    fetch(`${this.strapiBaseUrl}/for-stores`)
      .then((res) => {
        res.json().then(
          (jsonResponse) => {
            this.page = jsonResponse
          })
      })
  }
}
</script>
