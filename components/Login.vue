<template>
  <div>
    <div style="margin-top: 20px; padding: 20px; border: 1px dashed #f00;">
      <div v-if="mounted">
        <div v-if="user && user.token">
          {{ $t('youAreLoggedIn') }}
          <button @click="wipeUser">
            {{ $t('logout') }}
          </button>
          <div v-if="activeStore">
            <button @click="activeStore = null">
              {{ $t('back') }}
            </button>
            <h1>{{ activeStore.name }}</h1>
          </div>
          <div v-else>
            <ul>
              <li
                v-for="(s, index) in stores"
                :key="index"
                @click="activateStore(s)"
              >
                {{ s.name }}
              </li>
            </ul>
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
            <button @click="getCode">
              {{ $t('enterPhoneNumberSubmit') }}
            </button>
          </template>
          <template v-else-if="!codeSent">
            <p>{{ $t('enterPhoneCodeLabel') }}</p>
            <input
              v-model="code"
              :placeholder="$t('enterPhoneCodePlaceholder')"
              type="text"
              @keyup.enter="login"
            >
            <button @click="login">
              {{ $t('enterPhoneCodeSubmit') }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  data: () => ({
    mounted: false,
    countryCode: '+47',
    phone: '',
    code: '',
    smsSent: false,
    codeSent: false,
    stores: [],
    activeStore: null
  }),
  computed: {
    user () {
      return this.$store.state.currentUser
    }
  },
  mounted () {
    const storedUser = localStorage.getItem('user') || false
    if (storedUser) {
      const user = JSON.parse(storedUser)
      this.$store.dispatch('SetCurrentUser', user)
      this.getStores()
      this.$emit('loggedIn')
    }
    this.mounted = true
  },
  methods: {
    activateStore (s) {
      this.activeStore = { ...s }
      this._productService.Get(s.id).then((res) => {
        window.console.log(res)
      })
    },
    getCode () {
      this._userService.SendVerificationToken(this.countryCode + this.phone).finally(() => {
        this.smsSent = true
      })
    },
    login () {
      this._userService.Login(this.countryCode + this.phone, this.code).then(() => {
        this.codeSent = true
      }).catch(() => {
        this.codeSent = false
      }).finally(() => {
        this.getStores()
        this.$emit('loggedIn')
      })
    },
    wipeUser () {
      this.$store.dispatch('SetCurrentUser', {})
      this.smsSent = false
      this.codeSent = false
    },
    getStores () {
      this._storeService.GetAll().then((res) => {
        this.stores = res
      })
    }
  }
}
</script>