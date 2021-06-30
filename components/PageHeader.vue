<template>
  <header v-if="show" class="page-header">
    <!-- Messenger Chattillegg Code -->
    <div id="fb-root" />

    <!-- Your Chattillegg code -->
    <div id="fb-customer-chat" class="fb-customerchat" />

    <script>
      var chatbox = document.getElementById("fb-customer-chat");
      chatbox.setAttribute("page_id", "106381431516230");
      chatbox.setAttribute("attribution", "biz_inbox");
      window.fbAsyncInit = function () {
      FB.init({
      xfbml: true,
      version: "v11.0",
      });
      };

      (function (d, s, id) {
      var js,
      fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s);
      js.id = id;
      js.src = "https://connect.facebook.net/nb_NO/sdk/xfbml.customerchat.js";
      fjs.parentNode.insertBefore(js, fjs);
      })(document, "script", "facebook-jssdk");
    </script>

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
            <a class="main-menu__link" href="/om-okam/"> For kunder </a>
          </li>
          <li class="main-menu__item">
            <a class="main-menu__link" href="/om-okam-admin/">
              For butikkeiere
            </a>
          </li>
          <li class="main-menu__item">
            <a class="main-menu__link" href="/kontakt/"> Kontakt oss </a>
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