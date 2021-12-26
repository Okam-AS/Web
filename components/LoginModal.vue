<template>
  <Modal>
    <Loading :loading="isLoading" />
    <template v-if="!isLoading">
      <h1 style="margin-bottom:1em">
        {{ $t('login') }}
      </h1>
      <div v-if="user && user.token">
        {{ $t('youAreLoggedIn') + ' ' + user.phoneNumber }}
        <div>
          <input type="button" class="emoji-btn" style="margin-top:1em" :value="$t('close')" @click="$emit('loggedIn')">
          <input type="button" class="emoji-btn" style="margin-top:1em" :value="$t('logout')" @click="wipeUser">
        </div>
      </div>
      <div v-else>
        <template v-if="!smsSent">
          <p>{{ $t('enterPhoneNumberLabel') }}</p>
          <input
            v-model="phone"
            :placeholder="$t('enterPhoneNumberPlaceholder')"
            type="text"
            @keyup.enter="getCode"
          >
          <input type="button" class="emoji-btn" :value="$t('enterPhoneNumberSubmit')" @click="getCode">
        </template>
        <template v-else-if="!codeSent">
          <p>{{ $t('enterPhoneCodeLabel') }}</p>
          <div>{{ phone }} <input type="button" style="font-size:10px;margin-bottom:16px" value="✏️" @click="reset"></div>
          <input
            v-model="code"
            :placeholder="$t('enterPhoneCodePlaceholder')"
            type="text"
            @keyup.enter="login"
          >
          <input type="button" class="emoji-btn" :value="$t('enterPhoneCodeSubmit')" @click="login">
        </template>
        <p v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </p>
      </div>
    </template>
  </Modal>
</template>
<script>
import Modal from '~/components/lang/Modal.vue'
import Loading from '~/components/Loading.vue'

export default {
  components: { Modal, Loading },
  props: {
    closeIfLoggedIn: {
      type: Boolean,
      default: true
    }
  },
  data: () => ({
    isLoading: true,
    countryCode: '+47',
    phone: '',
    code: '',
    smsSent: false,
    codeSent: false,
    errorMessage: ''
  }),
  computed: {
    user () {
      return this.$store.state.currentUser
    }
  },
  mounted () {
    this.$store.dispatch('Load')
    this.$store.subscribe((mutation, state) => {
      if (mutation && window && window.localStorage) {
        localStorage.setItem('state', JSON.stringify(state))
      }
    })
    this.isLoading = false
    if (this.$store.getters.userIsLoggedIn && this.closeIfLoggedIn) { this.$emit('loggedIn') }
  },
  methods: {
    reset () {
      this.isLoading = false
      this.errorMessage = ''
      this.smsSent = false
      this.codeSent = false
      this.code = ''
    },
    getCode () {
      const _this = this
      _this.errorMessage = ''
      _this.isLoading = true
      this._userService.SendVerificationToken(this.countryCode + this.phone).then(() => {
        this.smsSent = true
      }).catch(() => {
        _this.errorMessage = 'Feil telefonnummer'
      }).finally(() => {
        _this.isLoading = false
      })
    },
    login () {
      const _this = this
      _this.errorMessage = ''
      _this.isLoading = true
      this._userService.Login(this.countryCode + this.phone, this.code)
        .then(() => {
          this.codeSent = true
          this.$emit('loggedIn')
        }).catch(() => {
          this.codeSent = false
          _this.errorMessage = 'Feil kode'
        }).finally(() => {
          _this.isLoading = false
        })
    },
    wipeUser () {
      this._userService.Logout()
      this.smsSent = false
      this.codeSent = false
      this.$emit('loggedOut')
    }
  }
}
</script>
<style lang="scss" scoped>
.error-message{
  background: crimson;
  color: white;
  margin-top: 1em;
  padding: 6px;
  border-radius: 3px;
  font-size: 10px;
}
.emoji-btn{
  cursor: pointer;
  padding: 0 5px 0 5px;
}
</style>