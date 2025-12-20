<template>
  <div class="slideshow" @touchstart="onTouchStart" @touchend="onTouchEnd">
    <!-- Progress Bar - skjul hvis bare én slide -->
    <div v-if="slides.length > 1" class="slideshow__progress">
      <div
        v-for="(slide, index) in slides"
        :key="index"
        class="progress-segment"
        :class="{ active: index === currentSlide, completed: index < currentSlide }"
      />
    </div>

    <!-- Close Button -->
    <button class="slideshow__close" @click="$emit('close')">
      <span class="material-icons">close</span>
    </button>

    <!-- Slides Container -->
    <div ref="container" class="slideshow__container">
      <transition :name="slideDirection" mode="out-in">
        <component
          :is="currentSlideComponent"
          :key="currentSlide"
          :data="data"
          :active="true"
          @next="nextSlide"
          @finish="$emit('close')"
        />
      </transition>
    </div>

    <!-- Navigation - skjul hvis bare én slide -->
    <div v-if="slides.length > 1" class="slideshow__nav">
      <button
        class="nav-btn nav-btn--prev"
        :disabled="currentSlide === 0"
        @click="prevSlide"
      >
        <span class="material-icons">chevron_left</span>
      </button>

      <div class="slide-counter">
        {{ currentSlide + 1 }} / {{ slides.length }}
      </div>

      <button
        class="nav-btn nav-btn--next"
        :disabled="currentSlide === slides.length - 1"
        @click="nextSlide"
      >
        <span class="material-icons">chevron_right</span>
      </button>
    </div>

    <!-- Keyboard hint -->
    <div v-if="slides.length > 1" class="keyboard-hint">
      Bruk piltastene eller sveip for å navigere
    </div>
  </div>
</template>

<script>
import SlideIntro from './slides/SlideIntro.vue'
import SlideOverview from './slides/SlideOverview.vue'
import SlideBusiestDay from './slides/SlideBusiestDay.vue'
import SlideTopProducts from './slides/SlideTopProducts.vue'
import SlidePlatforms from './slides/SlidePlatforms.vue'
import SlidePayments from './slides/SlidePayments.vue'
import SlideDelivery from './slides/SlideDelivery.vue'
import SlideTips from './slides/SlideTips.vue'
import SlideFunFacts from './slides/SlideFunFacts.vue'
import SlideOkamHighlights from './slides/SlideOkamHighlights.vue'
import Slide2026 from './slides/Slide2026.vue'
import SlideNotEnoughData from './slides/SlideNotEnoughData.vue'

const MIN_ORDERS_FOR_WRAPPED = 5

export default {
  name: 'WrappedSlideshow',
  components: {
    SlideIntro,
    SlideOverview,
    SlideBusiestDay,
    SlideTopProducts,
    SlidePlatforms,
    SlidePayments,
    SlideDelivery,
    SlideTips,
    SlideFunFacts,
    SlideOkamHighlights,
    Slide2026,
    SlideNotEnoughData
  },
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  data: () => ({
    currentSlide: 0,
    slideDirection: 'slide-left',
    touchStartX: 0,
    touchEndX: 0
  }),
  computed: {
    hasEnoughData() {
      return (this.data.totalOrders || 0) >= MIN_ORDERS_FOR_WRAPPED
    },
    slides() {
      if (!this.hasEnoughData) {
        return ['SlideNotEnoughData']
      }
      // Dynamisk bygg slides-listen basert på tilgjengelig data
      const allSlides = [
        'SlideIntro',
        'SlideOverview',
        'SlideBusiestDay',
        'SlideTopProducts',
        'SlidePlatforms',
        'SlidePayments',
        'SlideDelivery'
      ]
      // Bare vis Tips-slide hvis det er tips
      if ((this.data.totalTips || 0) > 0) {
        allSlides.push('SlideTips')
      }
      allSlides.push('SlideFunFacts', 'SlideOkamHighlights', 'Slide2026')
      return allSlides
    },
    currentSlideComponent() {
      return this.slides[this.currentSlide]
    }
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeydown)
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.handleKeydown)
  },
  methods: {
    nextSlide() {
      if (this.currentSlide < this.slides.length - 1) {
        this.slideDirection = 'slide-left'
        this.currentSlide++
        this.scrollToTop()
      }
    },
    prevSlide() {
      if (this.currentSlide > 0) {
        this.slideDirection = 'slide-right'
        this.currentSlide--
        this.scrollToTop()
      }
    },
    scrollToTop() {
      this.$nextTick(() => {
        if (this.$refs.container) {
          this.$refs.container.scrollTop = 0
        }
      })
    },
    handleKeydown(e) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        this.nextSlide()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        this.prevSlide()
      } else if (e.key === 'Escape') {
        this.$emit('close')
      }
    },
    onTouchStart(e) {
      this.touchStartX = e.changedTouches[0].screenX
    },
    onTouchEnd(e) {
      this.touchEndX = e.changedTouches[0].screenX
      this.handleSwipe()
    },
    handleSwipe() {
      const swipeThreshold = 50
      const diff = this.touchStartX - this.touchEndX

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          this.nextSlide()
        } else {
          this.prevSlide()
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.slideshow {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #191414;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &__progress {
    position: absolute;
    top: 16px;
    left: 16px;
    right: 16px;
    display: flex;
    gap: 4px;
    z-index: 100;

    .progress-segment {
      flex: 1;
      height: 3px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      transition: background 0.3s;

      &.active {
        background: #1bb776;
      }

      &.completed {
        background: rgba(27, 183, 118, 0.6);
      }
    }
  }

  &__close {
    position: absolute;
    top: 40px;
    right: 16px;
    z-index: 100;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    transition: background 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .material-icons {
      font-size: 24px;
    }
  }

  &__container {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 60px 0 120px 0; // Space for progress bar and nav
    -webkit-overflow-scrolling: touch;
  }

  &__nav {
    position: absolute;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 24px;
    z-index: 100;

    .nav-btn {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.2);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
        border-color: #1bb776;
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .material-icons {
        font-size: 28px;
      }
    }

    .slide-counter {
      font-size: 0.9rem;
      opacity: 0.6;
      min-width: 60px;
      text-align: center;
    }
  }

  .keyboard-hint {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.75rem;
    opacity: 0.4;

    @media (max-width: 768px) {
      display: none;
    }
  }
}

// Slide transitions
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter {
  opacity: 0;
  transform: translateX(100px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-100px);
}

.slide-right-enter {
  opacity: 0;
  transform: translateX(-100px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(100px);
}
</style>
