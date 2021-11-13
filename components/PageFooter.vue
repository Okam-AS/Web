<template>
  <footer v-if="show" class="page-footer">
    <div class="wrapper">
      <div class="page-footer__cols">
        <div class="page-footer__col">
          <img
            class="page-header__logo"
            src="~/assets/UI/okam_logo_dark.svg"
            alt=""
          >
          <div>
            <span
              style="font-size: 12px; margin-left: 6px"
            >Laget med ♥ i Norge</span>
          </div>
        </div>
        <div class="page-footer__col">
          <ul class="link-list">
            <li class="link-list__item">
              <a href="/om-oss">Om oss</a>
            </li>
            <li class="link-list__item">
              <a href="/om-okam">For kunder</a>
            </li>
            <li class="link-list__item">
              <a href="/om-okam-admin">For butikkeiere</a>
            </li>
            <li class="link-list__item">
              <a href="/personvern">Personvern</a>
            </li>
            <li class="link-list__item">
              <a href="/kontakt">Kontakt</a>
            </li>
          </ul>
        </div>
        <div class="page-footer__col">
          <div class="page-footer__contact">
            <h2>Okam AS</h2>
            <p>Org nr.: 925 024 414</p>
            <p>
              Tlf: 988 65 120<br>E-post:
              <a href="mailto:kontakt@okam.no">kontakt@okam.no</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  data: () => ({
    show: false
  }),
  mounted () {
    const search = new URLSearchParams(window.location.search) || {}
    const hideLayout = search.has('nolayout') || false

    if (!hideLayout) {
      this.show = true
    }
  }
}
</script>