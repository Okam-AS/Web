<template>
  <div class="my-user">
    <div>
      <div class="my-user__trigger" v-if="isLoggedIn" @click="optionsToggle">
        <span class="my-user__trigger-icon material-icons">person</span>
        <!--span>{{ $store.state.currentUser.phoneNumber }}</span-->
      </div>
      <div v-else @click="loginClick">
        <span class="material-icons">login</span><span>Logg inn</span>
      </div>
    </div>
    <div class="my-user__menu" v-if="showOptions">
      <div class="my-user__menu-item" @click="myOrders">
        <span class="my-user__menu-icon material-icons">receipt</span>
        <span>Mine bestillinger</span>
      </div>
      <div class="my-user__menu-item" @click="logout">
        <span class="my-user__menu-icon material-icons">logout</span>
        <span>Logg ut</span>
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
      location.href = '/webshop/orders?nolayout=true'
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

    &-icon {
      border-radius: 50%;
      background-color: $color-dark;
      color: #fff;
      padding: rem(4);
      font-size: rem(22);
      margin-right: rem(-8);
    }
  }

  &__menu {
    position: absolute;
    right: 0;
    background-color: #fff;
    margin-top: rem(8);

    &-item {
      display: flex;
      align-items: center;
      padding: rem(10) rem(12);
      border-bottom: 1px solid $color-dark;
    }

    &-icon {
      margin-right: rem(8);
      font-size: rem(22);
    }
  }
}

</style>