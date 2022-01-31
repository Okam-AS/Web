<template>
  <Modal @close="close">
    <Loading :loading="isLoading" />
    <template v-if="!isLoading">
      <h1 style="margin-bottom:1em">
        {{ $t('login') }}
      </h1>
      <div v-if="user && user.token">
        {{ $t('youAreLoggedIn') + ' ' + user.phoneNumber }}
        <div>
          <input type="button" class="emoji-btn" style="margin-top:1em" :value="$t('close')" @click="close">
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
          <OtpInput loading="true" @complete="login" />
        </template>
        <p v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </p>
      </div>
    </template>
  </Modal>
</template>
<script>
import Modal from '@/components/atoms/Modal.vue'
import OtpInput from '@/components/atoms/OtpInput.vue'
import Loading from '@/components/atoms/Loading.vue'

export default {
  components: { Modal, OtpInput, Loading },
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
    this.isLoading = false
    if (this.$store.getters.userIsLoggedIn && this.closeIfLoggedIn) { this.$emit('close', true) }
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
      this.errorMessage = ''
      this.isLoading = true
      this._userService.SendVerificationToken(this.countryCode + this.phone).then(() => {
        this.smsSent = true
      }).catch(() => {
        this.errorMessage = 'Feil telefonnummer'
      }).finally(() => {
        this.isLoading = false
      })
    },
    login (code) {
      this.code = code
      this.errorMessage = ''
      this.isLoading = true
      this._userService.Login(this.countryCode + this.phone, this.code)
        .then(() => {
          this.codeSent = true
          this.$emit('close', true)
        }).catch(() => {
          this.codeSent = false
          this.errorMessage = 'Feil kode'
        }).finally(() => {
          this.isLoading = false
        })
    },
    close () {
      this.$emit('close', this.$store.getters.userIsLoggedIn)
    },
    wipeUser () {
      this._userService.Logout()
      this.smsSent = false
      this.codeSent = false
      this.$emit('close', false)
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