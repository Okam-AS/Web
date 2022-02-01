<template>
  <div class="shop">
    <div class="shop__header">
      <button v-if="storeId" class="shop__header-back" @click="goToStore">
        <span class="shop__header-back-icon material-icons">arrow_back</span>
      </button>
      <span>Mine betalingskort</span>
      <MyUserDropdown style="float:right" @close="load" />
    </div>
    <div v-if="!$store.getters.userIsLoggedIn">
      Du må logge inn for å se dine betalingskort
    </div>
    <div v-else>
      <span>
        Din kortinformasjon blir lagret trygt hos vår betalingsleverandør. Du kan legge til et nytt kort neste gang du handler.
      </span>
      <span v-if="!isLoading && cards.length === 0">
        Du har ingen registrerte kort
      </span>
      <div v-if="!isLoading">
        <div
          v-for="(item, index) in cards"
          :key="index"
        >
          <span>{{ '****' + item.card.last4 + ' ' + item.card.exp_month + '/' + item.card.exp_year }}</span>
          <span class="material-icons" style="cursor:pointer" @click="deleteCard(item.id)">delete</span>
        </div>
      </div>
      <Loading v-if="isLoading" />
    </div>
  </div>
</template>

<script>
import Loading from '@/components/atoms/Loading.vue'
import MyUserDropdown from '@/components/atoms/MyUserDropdown.vue'

export default {
  components: { Loading, MyUserDropdown },
  data: () => ({
    isLoading: false,
    cards: [],
    storeId: undefined
  }),
  mounted () {
    this.load()
  },
  methods: {
    goToStore () {
      window.location.href = '/webshop' + this.urlQueryStrings
    },
    load () {
      if (!this.$store.getters.userIsLoggedIn) { return }
      this.isLoading = true
      this._stripeService.GetPaymentMethods().then((cards) => {
        if (Array.isArray(cards)) { this.cards = cards }
        this.isLoading = false
      }).catch(() => {
        this.isLoading = false
      })
    },
    deleteCard (id) {
      if (confirm('Er du sikker på at du ønsker å slette dette kortet?')) {
        this._stripeService.DeletePaymentMethod(id).then(() => {
          this.load()
        })
      }
    }
  }
}
</script>