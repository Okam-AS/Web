<template>
  <Modal @close="close">
    <div class="shop__content">
      <Loading :loading="isLoading" />
      <template v-if="!isLoading">
        <h1 class="shop__heading">
          {{ $t('login') }}
        </h1>
        <div v-if="user && user.token">
          {{ $t('youAreLoggedIn') + ' ' + user.phoneNumber }}
          <div>
            <input type="button" class="emoji-btn" :value="$t('close')" @click="close">
            <input type="button" class="emoji-btn"  :value="$t('logout')" @click="wipeUser">
          </div>
        </div>
        <div class="m-t-xs" v-else>
          <template v-if="!smsSent">
            <p>{{ $t('enterPhoneNumberLabel') }}</p>
            <div class="input-btn-row">
              <input
                v-model="phone"
                :placeholder="$t('enterPhoneNumberPlaceholder')"
                type="text"
                @keyup.enter="getCode"
                class="input"
              >
              <input type="button" class="btn btn--primary" :value="$t('enterPhoneNumberSubmit')" @click="getCode">
            </div>
          </template>
          <template v-else-if="!codeSent">
            <p>{{ $t('enterPhoneCodeLabel') }}</p>
            <OtpInput loading="true" @complete="login" />
            <div class="m-b">{{ phone }} <input class="btn-link" type="button" value="Endre telefonnummer" @click="reset"></div>
          </template>
          <div v-if="errorMessage" class="message-box message-box--error">
            {{ errorMessage }}
          </div>
        </div>
      </template>
    </div>
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