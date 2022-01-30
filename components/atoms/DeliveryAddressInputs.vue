<template>
  <div class="section">
    <span class="label">Leveringsadresse</span>
    <div>
      <input
        v-model="fullAddress"
        class="input"
        style="margin-bottom:0.5em;"
        maxlength="30"
        rows="1"
        placeholder="Adresse"
      >
      <input
        v-model="zipCode"
        class="input"
        style="margin-bottom:0.5em;"
        maxlength="30"
        rows="1"
        placeholder="Postnummer"
      >
      <input
        v-model="city"
        class="input"
        style="margin-bottom:0.5em;"
        maxlength="30"
        rows="1"
        placeholder="Poststed"
      >
    </div>
  </div>
</template>

<script>
import { debounce } from '../../core/helpers/ts-debounce'

export default {
  data () {
    return {
      fullAddress: '',
      zipCode: '',
      city: ''
    }
  },
  watch: {
    fullAddress () {
      this.saveToState()
    },
    zipCode () {
      this.saveToState()
    },
    city () {
      this.saveToState()
    }
  },
  mounted () {
    const currentUser = this.$store.state.currentUser || {}
    const currentAddress = currentUser.address || {}
    this.fullAddress = currentAddress.fullAddress
    this.zipCode = currentAddress.zipCode
    this.city = currentAddress.city
  },
  methods: {
    saveToState: debounce(function () {
      this._userService.UpdateDeliveryAddress({
        fullAddress: this.fullAddress,
        zipCode: this.zipCode,
        city: this.city
      })
    }, 400)
  }
}
</script>
