<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">
              Personvern og vilkår
            </h1>
            <!-- article -->
            <article
              id="post-41"
              class="post-41 page type-page status-publish hentry"
            >
              <p>
                <a href="/personvern/?nolayout">Personvern</a>
              </p>

              <p><a href="/vilkar/?nolayout">Vilkår</a></p>

              <br class="clear">
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
  components: { PageHeader, PageFooter }
}
</script>