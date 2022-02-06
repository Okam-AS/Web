<template>
  <div class="my-user">
    <div>
      <div v-if="isLoggedIn" class="my-user__trigger" @click="optionsToggle">
        <span v-if="!showOptions" class="my-user__trigger-icon material-icons">person</span>
        <span v-else class="my-user__trigger-icon material-icons">close</span>
      </div>
      <div v-else class="btn btn--primary btn--small" @click="loginClick">
        <span class="material-icons">login</span>
        <span>Logg inn</span>
      </div>
    </div>
    <div v-if="showOptions" class="my-user__menu">
      <div class="my-user__menu-item" @click="myOrders">
        <span class="my-user__menu-icon material-icons">receipt</span><span>Mine bestillinger</span>
      </div>
      <div class="my-user__menu-item" @click="myCards">
        <span class="my-user__menu-icon material-icons">payment</span><span>Mine betalingskort</span>
      </div>
      <div class="my-user__menu-item" @click="logout">
        <span class="my-user__menu-icon material-icons">logout</span><span>Logg ut</span>
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
    myOrders () {
      window.location.href = '/webshop/orders' + this.urlQueryStrings
    },
    myCards () {
      window.location.href = '/webshop/mycards' + this.urlQueryStrings
    },
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

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.my-user {
  &__trigger {
    display: flex;
    align-items: center;
    position: relative;
    @include z-index('menu-trigger');
    margin-right: rem(-4);
    cursor: pointer;

    &-icon {
      border-radius: 50%;
      background-color: $color-dark;
      color: #fff;
      padding: rem(4);
      font-size: rem(22);
    }
  }

  &__menu {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
    background-color: $color-profile;
    @include z-index('menu');
    box-shadow: 0 1px 5px 0 rgba(0 0 0 / 20%);
    padding: rem(16) rem(24);
    max-width: rem(600);
    margin: 0 auto;

    &-item {
      display: flex;
      align-items: center;
      padding: rem(10) 0;
      margin-right: rem(64);
    }

    &-icon {
      margin-right: rem(8);
      font-size: rem(22);
    }
  }
}

</style>