<template>
  <footer class="admin__footer">
    <div class="admin__wrapper">
      <div v-if="userIsLoggedIn">
        <span>Du er logget inn med {{ user.phoneNumber }} </span>
        <span
          style="text-decoration: underline; cursor: pointer"
          @click="logout"
        >
          Logg ut
        </span>
      </div>
    </div>
  </footer>
</template>
<script>
export default {
  computed: {
    user () {
      return this.$store.state.currentUser
    },
    userIsLoggedIn () {
      return this.$store.getters.userIsLoggedIn
    }
  },
  methods: {
    logout () {
      this._userService.Logout()
      if (window && window.location) { window.location.href = '/' }
    }
  }
}
</script>

      if (!) {
      this.showLogin = true
      return
    }

</style>