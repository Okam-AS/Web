<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">
              Priser
            </h1>
            <article class="page type-page status-publish">
              <PriceTable />

              <CheckInfo text="Ingen bindingstid" />
              <CheckInfo text="Ingen skjulte kostnader" />
              <CheckInfo text="Første måned GRATIS" />
              <CheckInfo text="Gratis support" />
              <CheckInfo text="Lav transaksjonskostnad" />

              <div style="margin-top: 50px">
                <h2>Last ned Okam Admin og kom i gang!</h2>
                <div style="margin-top: 1em" class="big-teaser__links">
                  <a
                    href="https://apps.apple.com/no/app/okam-butikk/id1514667230"
                  ><img
                    alt="AppStore"
                    height="40"
                    src="~/assets/UI/appstore-btn.png"
                  ></a>
                  <a
                    href="https://play.google.com/store/apps/details?id=no.okam.store"
                  ><img
                    alt="Google Play"
                    height="40"
                    src="~/assets/UI/googleplay-btn.png"
                  ></a>
                </div>
              </div>
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
import PriceTable from '@/components/molecules/PriceTable.vue'
import CheckInfo from '@/components/atoms/CheckInfo.vue'

export default {
  components: { PageHeader, PageFooter, PriceTable, CheckInfo }
}
</script>
