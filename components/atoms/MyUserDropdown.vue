<template>
  <div style="background:white">
    <div style="cursor:pointer;border:1px solid black">
      <div v-if="isLoggedIn" @click="optionsToggle">
        <span class="material-icons">face</span><span>{{ $store.state.currentUser.phoneNumber }}</span>
      </div>
      <div v-else @click="loginClick">
        <span class="material-icons">login</span><span>Logg inn</span>
      </div>
    </div>
    <div v-if="showOptions">
      <div style="cursor:pointer;border:1px solid black">
        <span class="material-icons">receipt</span><span>Mine bestillinger</span>
      </div>
      <div style="cursor:pointer;border:1px solid black" @click="logout">
        <span class="material-icons">logout</span><span>Logg ut</span>
      </div>
    </div>
    <LoginModal v-if="showLogin" @close="closeLoginModal" />
  </div>
</template>

<script>
import LoginModal from '~/components/molecules/LoginModal.vue'

export default {
  components: { LoginModal },
  props: {
    text: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      showLogin: false,
      showOptions: false
    }
  },
  computed: {
    isLoggedIn () {
      return this.$store.getters.userIsLoggedIn
    }
  },
  methods: {
    loginClick () {
      this.showLogin = true
      this.showOptions = false
    },
    optionsToggle () {
      this.showLogin = false
      this.showOptions = !this.showOptions
    },
    closeLoginModal () {
      this.showLogin = false
      this.showOptions = false
      this.$emit('close', this.$store.getters.userIsLoggedIn)
    },
    logout () {
      this._userService.Logout()
      this.showLogin = false
      this.showOptions = false
    }
  }
}
</script>