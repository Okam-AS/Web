<template>
  <header v-if="show" class="page-header">
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
          <li class="main-menu__item">
            <a class="main-menu__link" href="/om-okam/">
              For kunder
            </a>
          </li>
          <li class="main-menu__item">
            <a
              class="main-menu__link"
              href="/rask-vei-til-egen-nettbutikk/"
            >
              For butikkeiere
            </a>
          </li>
          <li class="main-menu__item">
            <a class="main-menu__link" href="/kontakt/">
              Kontakt oss
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<script>
export default {
  data: () => ({
    show: false,
    isActive: false
  }),
  mounted () {
    const search = new URLSearchParams(window.location.search) || {}
    const hideLayout = search.has('nolayout') || false

    if (!hideLayout) {
      this.show = true
    }
  },
  methods: {
    toggle () {
      document.querySelector('body').classList.toggle('has-overlay')
      this.isActive = !this.isActive
    }
  }
}
</script>