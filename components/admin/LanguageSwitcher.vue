<template>
  <div class="lang-switcher" v-click-outside="close">
    <button
      class="lang-switcher__trigger"
      type="button"
      :aria-expanded="open"
      aria-haspopup="true"
      @click="open = !open"
    >
      <span class="lang-switcher__flag">{{ current.flag }}</span>
      <span class="lang-switcher__label">{{ current.label }}</span>
      <svg
        class="lang-switcher__chevron"
        :class="{ 'lang-switcher__chevron--open': open }"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <transition name="lang-popover">
      <div v-if="open" class="lang-switcher__popover" role="menu">
        <button
          v-for="lang in languages"
          :key="lang.code"
          class="lang-switcher__option"
          :class="{ 'lang-switcher__option--active': lang.code === locale }"
          type="button"
          role="menuitemradio"
          :aria-checked="lang.code === locale"
          @click="select(lang.code)"
        >
          <span class="lang-switcher__flag">{{ lang.flag }}</span>
          <span class="lang-switcher__option-label">{{ lang.label }}</span>
          <svg
            v-if="lang.code === locale"
            class="lang-switcher__check"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </transition>
  </div>
</template>

<script>
// Closes the popover when clicking anywhere outside the component.
const clickOutside = {
  bind (el, binding) {
    el.__clickOutside__ = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event)
      }
    }
    document.addEventListener('click', el.__clickOutside__)
  },
  unbind (el) {
    document.removeEventListener('click', el.__clickOutside__)
    delete el.__clickOutside__
  }
}

export default {
  directives: {
    'click-outside': clickOutside
  },
  data () {
    return {
      open: false,
    }
  },
  computed: {
    locale () {
      return this.$store.state.adminLocale || 'no'
    },
    languages () {
      return [
        { code: 'no', flag: '🇳🇴', label: this.$i('nav_language_no') },
        { code: 'en', flag: '🇬🇧', label: this.$i('nav_language_en') },
        { code: 'de', flag: '🇩🇪', label: this.$i('nav_language_de') },
      ]
    },
    current () {
      return this.languages.find(l => l.code === this.locale) || this.languages[0]
    },
  },
  methods: {
    select (code) {
      if (code !== this.locale) {
        this.$store.dispatch('SetAdminLocale', code)
      }
      this.close()
    },
    close () {
      this.open = false
    },
  },
}
</script>

<style lang="scss" scoped>
.lang-switcher {
  position: relative;
  width: 100%;

  &__trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    background: #f8f9fa;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9em;
    color: #292c34;
    transition: all 0.2s ease;

    &:hover {
      background: #f1f5f9;
      border-color: #cbd5e0;
    }
  }

  &__flag {
    font-size: 1.2em;
    line-height: 1;
  }

  &__label {
    flex: 1;
    text-align: left;
    font-weight: 500;
  }

  &__chevron {
    width: 16px;
    height: 16px;
    color: #94a3b8;
    transition: transform 0.2s ease;

    &--open {
      transform: rotate(180deg);
    }
  }

  &__popover {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    right: 0;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
    padding: 6px;
    z-index: 50;
  }

  &__option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9em;
    color: #292c34;
    transition: all 0.2s ease;

    &:hover {
      background: #f8f9fa;
    }

    &--active {
      color: #1bb776;
      font-weight: 600;
    }
  }

  &__option-label {
    flex: 1;
    text-align: left;
  }

  &__check {
    width: 16px;
    height: 16px;
    color: #1bb776;
  }
}

.lang-popover-enter-active,
.lang-popover-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.lang-popover-enter,
.lang-popover-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
