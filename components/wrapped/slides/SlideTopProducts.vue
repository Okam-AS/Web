<template>
  <div class="slide slide-products">
    <div class="slide-content">
      <div class="section-label">Dine bestselgere</div>

      <div class="podium" v-if="topThree.length > 0">
        <!-- Second place -->
        <div
          v-if="topThree[1]"
          class="podium-item second"
          :class="{ 'animate-in': showPodium }"
        >
          <div class="rank">2</div>
          <div class="product-name">{{ topThree[1].name }}</div>
          <div class="product-qty">{{ topThree[1].quantitySold }}x</div>
          <div class="podium-bar"></div>
        </div>

        <!-- First place -->
        <div
          v-if="topThree[0]"
          class="podium-item first"
          :class="{ 'animate-in': showPodium }"
        >
          <div class="crown">👑</div>
          <div class="rank">1</div>
          <div class="product-name">{{ topThree[0].name }}</div>
          <div class="product-qty">{{ topThree[0].quantitySold }}x</div>
          <div class="podium-bar"></div>
        </div>

        <!-- Third place -->
        <div
          v-if="topThree[2]"
          class="podium-item third"
          :class="{ 'animate-in': showPodium }"
        >
          <div class="rank">3</div>
          <div class="product-name">{{ topThree[2].name }}</div>
          <div class="product-qty">{{ topThree[2].quantitySold }}x</div>
          <div class="podium-bar"></div>
        </div>
      </div>

      <div class="other-products" :class="{ 'animate-in': showOthers }">
        <div
          v-for="(product, index) in otherProducts"
          :key="product.productId"
          class="other-product"
        >
          <span class="other-rank">{{ index + 4 }}.</span>
          <span class="other-name">{{ product.name }}</span>
          <span class="other-qty">{{ product.quantitySold }}x</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SlideTopProducts',
  props: {
    data: { type: Object, required: true },
    active: { type: Boolean, default: false }
  },
  data: () => ({
    showPodium: false,
    showOthers: false
  }),
  computed: {
    topThree() {
      return (this.data.topProducts || []).slice(0, 3)
    },
    otherProducts() {
      return (this.data.topProducts || []).slice(3, 5)
    }
  },
  mounted() {
    this.animateIn()
  },
  methods: {
    animateIn() {
      setTimeout(() => { this.showPodium = true }, 300)
      setTimeout(() => { this.showOthers = true }, 1000)
    }
  }
}
</script>

<style lang="scss" scoped>
.slide-products {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(180deg, #11998e 0%, #38ef7d 30%, #191414 70%);
  padding: 24px;
  padding-top: 40px;
  padding-bottom: 40px;

  .slide-content {
    text-align: center;
    max-width: 600px;
    width: 100%;
  }

  .section-label {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    margin-bottom: 48px;
  }

  .podium {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 16px;
    margin-bottom: 48px;

    .podium-item {
      text-align: center;
      opacity: 0;
      transform: translateY(50px);
      transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);

      &.animate-in {
        opacity: 1;
        transform: translateY(0);
      }

      &.first {
        transition-delay: 0.2s;

        .podium-bar {
          height: 140px;
          background: linear-gradient(180deg, #FFD700, #FFA500);
        }

        .crown {
          font-size: 2rem;
          margin-bottom: 8px;
          animation: bounce 1s ease-in-out infinite;
        }
      }

      &.second {
        transition-delay: 0.4s;

        .podium-bar {
          height: 100px;
          background: linear-gradient(180deg, #C0C0C0, #A0A0A0);
        }
      }

      &.third {
        transition-delay: 0.6s;

        .podium-bar {
          height: 70px;
          background: linear-gradient(180deg, #CD7F32, #8B4513);
        }
      }

      .rank {
        font-size: 1.5rem;
        font-weight: 800;
        margin-bottom: 8px;
      }

      .product-name {
        font-size: 0.95rem;
        font-weight: 600;
        max-width: 120px;
        margin: 0 auto 4px;
        line-height: 1.2;
      }

      .product-qty {
        font-size: 0.85rem;
        color: #ffffff;
        font-weight: 700;
        margin-bottom: 12px;
        background: rgba(0, 0, 0, 0.3);
        padding: 4px 10px;
        border-radius: 12px;
        display: inline-block;
      }

      .podium-bar {
        width: 100px;
        border-radius: 8px 8px 0 0;

        @media (max-width: 768px) {
          width: 80px;
        }
      }
    }
  }

  .other-products {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 16px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .other-product {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);

      &:last-child {
        border-bottom: none;
      }

      .other-rank {
        font-weight: 700;
        opacity: 0.5;
        width: 30px;
      }

      .other-name {
        flex: 1;
        text-align: left;
      }

      .other-qty {
        color: #1bb776;
        font-weight: 600;
      }
    }
  }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
</style>
