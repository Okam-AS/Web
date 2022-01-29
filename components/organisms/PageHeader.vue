<template>
  <header v-if="!noLayout" class="page-header">
    <div class="page-header__wrapper">
      <div class="page-header__logo-wrapper">
        <a class="page-header__logo-link" href="/">
          <img class="page-header__logo" src="~/assets/UI/logo.svg" alt="">
        </a>
      </div>
      <button
        class="page-header__menu-trigger"
        :aria-expanded="isActive"
        aria-controls="main-menu"
        type="button"
        @click="toggle"
      >
        <span class="sr-only">Meny</span>
        <span class="burger" />
      </button>
      <nav
        id="main-menu"
        :class="{
          'main-menu': true,
          'is-active': isActive,
        }"
      >
        <ul class="main-menu__list">
          <li
            v-for="(link, index) in links"
            :key="`link-${index}`"
            class="main-menu__item"
          >
            <a class="main-menu__link" :href="link.href">{{ link.title }}</a>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<script>
const ogImage = require('~/assets/UI/kom-i-gang.png')

export default {
  data: () => ({
    isActive: false,
    links: [
      {
        href: '/om-oss/',
        title: 'Om oss'
      },

      {
        href: '/om-okam/',
        title: 'For kunder'
      },

      {
        href: '/om-okam-admin/',
        title: 'For butikkeiere'
      },

      {
        href: '/kontakt/',
        title: 'Kontakt oss'
      }
    ]
  }),
  methods: {
    toggle () {
      document.querySelector('body').classList.toggle('has-overlay')
      this.isActive = !this.isActive
    }
  },
  head () {
    return {
      meta: [
        {
          hid: 'og:image',
          property: 'og:image',
          content: ogImage
        },
        {
          hid: 'og:image:secure_url',
          property: 'og:image:secure_url',
          content: ogImage
        },
        {
          hid: 'og:image:alt',
          property: 'og:image:alt',
          content: 'Vi forenkler lokal handel'
        }
      ]
    }
  }
}
</script>