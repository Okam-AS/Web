<template>
  <div class="slide slide-highlights">
    <div class="slide-content">
      <div class="section-label">Okam i 2025</div>
      <h2 class="main-title" :class="{ 'animate-in': showTitle }">
        Vi har også jobbet hardt!
      </h2>

      <div class="highlights-grid">
        <!-- Hovedfunksjoner -->
        <div
          class="highlight-category"
          :class="{ 'animate-in': showCategories }"
          :style="{ animationDelay: '0ms' }"
        >
          <div class="category-header">
            <span class="material-icons">star</span>
            <span>Hovedfunksjoner</span>
          </div>
          <div class="category-items">
            <div v-for="(item, index) in hovedfunksjoner" :key="index" class="highlight-item">
              <span class="material-icons item-icon">{{ item.icon }}</span>
              <div class="item-content">
                <div class="item-title">{{ item.title }}</div>
                <div class="item-desc">{{ item.desc }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Forbedringer -->
        <div
          class="highlight-category"
          :class="{ 'animate-in': showCategories }"
          :style="{ animationDelay: '200ms' }"
        >
          <div class="category-header">
            <span class="material-icons">trending_up</span>
            <span>Forbedringer</span>
          </div>
          <div class="category-items">
            <div v-for="(item, index) in forbedringer" :key="index" class="highlight-item">
              <span class="material-icons item-icon">{{ item.icon }}</span>
              <div class="item-content">
                <div class="item-title">{{ item.title }}</div>
                <div class="item-desc">{{ item.desc }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bak kulissene -->
        <div
          class="highlight-category"
          :class="{ 'animate-in': showCategories }"
          :style="{ animationDelay: '400ms' }"
        >
          <div class="category-header">
            <span class="material-icons">settings</span>
            <span>Bak kulissene</span>
          </div>
          <div class="category-items">
            <div v-for="(item, index) in bakKulissene" :key="index" class="highlight-item">
              <span class="material-icons item-icon">{{ item.icon }}</span>
              <div class="item-content">
                <div class="item-title">{{ item.title }}</div>
                <div class="item-desc">{{ item.desc }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SlideOkamHighlights',
  props: {
    data: { type: Object, required: true },
    active: { type: Boolean, default: false }
  },
  data: () => ({
    showTitle: false,
    showCategories: false,
    hovedfunksjoner: [
      {
        icon: 'storefront',
        title: 'Wolt Marketplace',
        desc: 'Full integrasjon med Wolt for ordremottak og synkronisering'
      },
      {
        icon: 'local_shipping',
        title: 'Wolt Drive',
        desc: 'Bestill levering via Wolt direkte fra admin'
      },
      {
        icon: 'smart_toy',
        title: 'AI-chat',
        desc: 'Påbegynt arbeid rundt bruken av AI'
      },
      {
        icon: 'receipt',
        title: 'Fakturabetaling',
        desc: 'Ny betalingsmetode for bedriftskunder'
      },
      {
        icon: 'savings',
        title: 'Lavere transaksjonskostnader',
        desc: 'Reduserte gebyrer på alle betalinger'
      },
      {
        icon: 'computer',
        title: 'Okam Admin på web',
        desc: 'Full admin-funksjonalitet nå tilgjengelig i nettleseren'
      }
    ],
    forbedringer: [
      {
        icon: 'grid_view',
        title: 'Heatmap statistikk',
        desc: 'Se når kundene dine bestiller mest'
      },
      {
        icon: 'replay',
        title: 'Gjenbestilling',
        desc: 'Kunder kan enkelt bestille på nytt'
      },
      {
        icon: 'search',
        title: 'Søk på tvers',
        desc: 'Finn ordrer uansett hvor de ble plassert'
      },
      {
        icon: 'sms',
        title: 'SMS-varsler',
        desc: 'Bedre kommunikasjon med kundene'
      }
    ],
    bakKulissene: [
      {
        icon: 'speed',
        title: 'Raskere lasting',
        desc: 'Ny caching for butikker og kategorier'
      },
      {
        icon: 'receipt_long',
        title: 'Bedre utbetalinger',
        desc: 'Forbedret faktura- og oppgjørshåndtering'
      },
      {
        icon: 'cloud',
        title: 'Azure-infrastruktur',
        desc: 'Mer stabil og rask plattform'
      }
    ]
  }),
  mounted() {
    this.animateIn()
  },
  methods: {
    animateIn() {
      setTimeout(() => { this.showTitle = true }, 300)
      setTimeout(() => { this.showCategories = true }, 600)
    }
  }
}
</script>

<style lang="scss" scoped>
.slide-highlights {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(180deg, #4c5eb0 0%, #593879 30%, #191414 70%);
  padding: 24px;
  padding-top: 40px;
  padding-bottom: 40px;

  .slide-content {
    text-align: center;
    max-width: 800px;
    width: 100%;
  }

  .section-label {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    margin-bottom: 16px;
  }

  .main-title {
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: 40px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    @media (max-width: 480px) {
      font-size: 1.4rem;
      margin-bottom: 24px;
    }
  }

  .highlights-grid {
    display: flex;
    flex-direction: column;
    gap: 20px;

    .highlight-category {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 20px;
      text-align: left;
      opacity: 0;
      transform: translateY(30px);
      transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);

      &.animate-in {
        opacity: 1;
        transform: translateY(0);
      }

      .category-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
        font-weight: 700;
        font-size: 1rem;
        color: #ffffff;

        .material-icons {
          font-size: 20px;
          color: #1bb776;
        }
      }

      .category-items {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .highlight-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;

          .item-icon {
            font-size: 18px;
            color: rgba(255, 255, 255, 0.7);
            margin-top: 2px;
          }

          .item-content {
            .item-title {
              font-weight: 600;
              font-size: 0.9rem;
              margin-bottom: 2px;
            }

            .item-desc {
              font-size: 0.8rem;
              opacity: 0.7;
              line-height: 1.3;
            }
          }
        }
      }
    }
  }
}
</style>
