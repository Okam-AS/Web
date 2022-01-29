<template>
  <div ref="container" class="checkout-page">
    <div class="shop-menu">
      <span>Kasse</span>
      <MyUserDropdown style="float:right" @close="closeLoginModal" />
    </div>

    <div class="section">
      <span class="title">Leveringsmetoder</span>

      <div v-if="store.selfPickUp" class="clickable" @click="setLocalDeliveryType('SelfPickup')">
        <span>{{ localDeliveryType === 'SelfPickup' ? '✅' : '⬜️' }}</span>
        <span>Hent selv</span>
      </div>

      <div
        v-if="store.homeDeliveryMethods && store.homeDeliveryMethods.length > 0"
        class="clickable"
        @click="
          storeCart.calculations.itemsAmount >=
            store.minimumOrderPriceForHomeDelivery
            ? setLocalDeliveryType('InstantHomeDelivery')
            : false
        "
      >
        <span>{{ localDeliveryType === 'InstantHomeDelivery' ? '✅' : '⬜️' }}</span>
        <span>Hjemlevering</span>
        <span
          v-if="
            store.minimumOrderPriceForHomeDelivery > 0 &&
              storeCart.calculations.itemsAmount <
              store.minimumOrderPriceForHomeDelivery
          "
        >{{ 'Min. bestilling: ' + priceLabel(store.minimumOrderPriceForHomeDelivery) }}</span>
      </div>

      <div v-if="store.tableDelivery" class="clickable" @click="setLocalDeliveryType('TableDelivery')">
        <span>{{ localDeliveryType === 'TableDelivery' ? '✅' : '⬜️' }}</span>
        <span>Spis inne</span>
      </div>

      <div class="section">
        <span class="title">Betalingsmetoder</span>
        <div>
          <Loading
            v-if="isLoadingCards"
          />
          <div v-else>
            <div v-for="(item, index) in cards" :key="index" class="clickable" @click="setPaymentMethodId(item.id)">
              <div v-if="item.id === 'waiter'">
                <span>{{ selectedPaymentMethodId === item.id ? '✅' : '⬜️' }}</span>
                <span class="material-icons">edit_note</span>
                <span>Legg inn bestilling som servitør</span>
              </div>
              <div v-else-if="item.card">
                <span>{{ selectedPaymentMethodId === item.id ? '✅' : '⬜️' }}</span>
                <span class="material-icons">credit_card</span>
                <span>{{ '****' + item.card.last4 + ' ' + item.card.exp_month + '/' + item.card.exp_year }}</span>
              </div>
            </div>
            <div>
              <div class="clickable" @click="setPaymentMethodId('')">
                <span>{{ selectedPaymentMethodId === '' ? '✅' : '⬜️' }}</span><span>Nytt kort</span>
              </div>
              <div v-show="selectedPaymentMethodId === ''">
                <client-only>
                  <stripe-element-card
                    ref="cardElement"
                    :pk="stripePublishableKey"
                    :hide-postal-code="true"
                    :elements-options="{ locale: 'nb' }"
                  />
                </client-only>
                <label><input v-model="rememberCard" type="checkbox">Husk dette kortet</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!isLoadingCards" class="section">
        <span class="title">Tips</span>
        <div>
          <span class="clickable" @click="setTip(0)">{{ localTipPercent === 0 ? '✅' : '⬜️' }} 0%</span>
          <span class="clickable" @click="setTip(5)">{{ localTipPercent === 5 ? '✅' : '⬜️' }} 5%</span>
          <span class="clickable" @click="setTip(10)">{{ localTipPercent === 10 ? '✅' : '⬜️' }} 10%</span>
          <span class="clickable" @click="setTip(20)">{{ localTipPercent === 20 ? '✅' : '⬜️' }} 20%</span>
        </div>
      </div>
      <div class="section">
        <span class="title">Kommentar</span>
        <div>
          <textarea v-model="localComment" style="width:100%;height:100px" maxlength="100" :placeholder="commentHint" />
        </div>
      </div>
      <Loading v-if="isLoading" />
      <div v-else-if="storeCart.calculations">
        <div>
          <span>{{ totalQuantityLabel }}</span>
          <span v-show="storeCart.calculations.itemsAmountLineThrough > 0" class="right" style="text-decoration: line-through;">
            {{ priceLabel(storeCart.calculations.itemsAmountLineThrough) + ' ' }}
          </span>
          <span class="right">{{ priceLabel(storeCart.calculations.itemsAmount) }}</span>
        </div>
        <div v-show="storeCart.calculations.tipAmount > 0">
          <span>Tips</span>
          <span class="right">{{ priceLabel(storeCart.calculations.tipAmount) }}</span>
        </div>
        <div>
          <span>Levering</span>
          <span class="right">{{ priceLabel(storeCart.calculations.deliveryAmount) }}</span>
        </div>
        <div v-show="storeCart.calculations.orderDiscountAmount > 0">
          <span>Rabatt</span>
          <span class="right">{{ '-' + priceLabel(storeCart.calculations.orderDiscountAmount) }}</span>
        </div>
        <div v-show="storeCart.calculations.tableAdditionalAmount > 0">
          <span>Spis inne</span>
          <span class="right">{{ priceLabel(storeCart.calculations.tableAdditionalAmount) }}</span>
        </div>
        <div>
          <span>Totalt</span>
          <span class="right">{{ priceLabel(storeCart.calculations.finalAmount) }}</span>
        </div>
      </div>

      <div v-if="!isLoading" class="section">
        <p v-if="!store.isOpenNow && store.name" style="padding:1em;background:#fcf0cc;">
          {{ store.name + ' er stengt for øyeblikket' }}
        </p>
        <continue-button
          :class="{'disabled': submitDisabled }"
          @click="submit"
        >
          Bekreft og betal
        </continue-button>
        <div class="terms">
          <span>Jeg er enig i </span>
          <span class="clickable" style="font-weight:bold" @click="showTerms = true">salgsbetingelsene</span>
          <span> og klar over at kjøpet innebærer begrensinger i </span>
          <span class="clickable" style="font-weight:bold" @click="showTerms = true">angreretten</span>
        </div>
      </div>
    </div>
    <LoginModal v-if="showLogin" @close="closeLoginModal" />
    <Modal v-if="showTerms" @close="showTerms = false">
      <iframe style="border:none;" weight="400" height="400" src="https://www.okam.no/personvern-og-vilkar/?nolayout" />
    </Modal>
  </div>
</template>

<script type="ts">
import Loading from '@/components/atoms/Loading.vue'
import ContinueButton from '@/components/atoms/ContinueButton.vue'
import Modal from '@/components/atoms/Modal.vue'
import $config from '@/core/helpers/configuration'
import MyUserDropdown from '@/components/atoms/MyUserDropdown.vue'
import { debounce } from '../../core/helpers/ts-debounce'
import LoginModal from '~/components/molecules/LoginModal.vue'

export default {
  components: { ContinueButton, MyUserDropdown, Loading, Modal, LoginModal },
  data: () => ({
    showLogin: false,
    store: {},

    isSending: false,
    errorMessage: '',
    deliveryAddressError: false,
    tableNameError: false,
    showTerms: false,

    localDeliveryType: 'NotSet',
    localComment: '',
    localTableName: '',
    localTipPercent: 0,

    // DELIVERY METHOD
    deliveryMethodError: false,

    // CREDITCARD DATA
    cards: [],
    selectedPaymentMethodId: '',
    rememberCard: true,
    isLoadingCards: true,
    creditCardError: false
  }),
  computed: {
    userIsLoggedIn () {
      return this.$store.getters.userIsLoggedIn
    },
    stripePublishableKey () {
      return $config.stripePublishableKey
    },
    cartIsEmpty () {
      return !this.storeCart || (this.storeCart.items || []).length <= 0
    },
    cartItems () {
      return this.cartIsEmpty ? [] : this.storeCart.items
    },
    storeCart () {
      return this.$store.getters.cartByStoreId(this.store.id)
    },
    totalQuantityLabel () {
      const totalQuantity = this.cartItems
        .map(item => item.quantity)
        .reduce((a, b) => a + b, 0)
      return totalQuantity + (totalQuantity === 1 ? ' vare' : ' varer')
    },
    commentHint () {
      if (this.localDeliveryType === 'SelfPickup') { return 'Ønsker du å hente bestillingen på et senere tidspunkt eller har en annen beskjed til den som behandler din bestilling, kan du skrive den inn her.' }
      if (this.localDeliveryType === 'InstantHomeDelivery') { return 'Ønsker du å få bestillingen levert på et senere tidspunkt, har en beskjed til sjåføren eller den som behandler din bestilling, kan du skrive den inn her.' }

      return 'Har du en beskjed til den som behandler din bestilling, kan du skrive den inn her'
    },
    isLoading () {
      return (
        this.isSending || this.$store.state.cartIsLoading || this.isLoadingCards
      )
    },
    submitDisabled () {
      return this.isLoading && this.store.isOpenNow && !this.isSending && !this.cartIsEmpty
    }
  },
  watch: {
    localComment () {
      this.debouncedUpdateCart()
    },
    localTableName () {
      this.debouncedUpdateCart()
    }
  },
  mounted () {
    if (this.storeId) {
      this.getStore()
      this.getAvailablePaymentMethods()
    }

    this.localDeliveryType = 'NotSet'
    if (this.storeCart) {
      this.localTableName = this.storeCart.tableName === undefined ? '' : this.storeCart.tableName + ''
      this.localComment = this.storeCart.comment === undefined || this.storeCart.comment === 'Ingen kommentar' ? '' : this.storeCart.comment + ''
    }

    if (this.storeId && this.userIsLoggedIn) {
      this.updateCart()
    } else {
      this.showLogin = true
    }
  },
  methods: {
    closeLoginModal (isLoggedIn) {
      if (isLoggedIn) { location.reload() } else { this.showLogin = false }
    },
    createPaymentIntent (paymentMethodId, setupFutureUsage) {
      const comp = this
      comp.isSending = true
      comp._stripeService
        .CreatePaymentIntent(
          comp.storeCart.calculations.finalAmount,
          'NOK',
          paymentMethodId,
          comp.storeCart.id,
          setupFutureUsage
        )
        .then((result) => {
          if (result && result.paymentIntentId) {
            if (!result.nextAction) {
              // SUCCESS
              comp.completeCart()
            } else if (result.nextAction.type === 'redirect_to_url') {
              // 3D SECURE
              // TODO:
              // comp
              //   .$showModal(SecureWebViewModal, {
              //     fullscreen: true,
              //     props: {
              //       url: result.nextAction.redirect_to_url.url,
              //       returnUrl: result.nextAction.redirect_to_url.return_url
              //     }
              //   })
              //   .then((success) => {
              //     if (!success) {
              //       comp.errorMessage = 'Kortautentisering feilet'
              //       comp.isSending = false
              //     } else {
              //       comp.completeCart()
              //     }
              //   })
            } else {
              // NOT HANDLED
              comp.errorMessage =
                'Betalingen kunne ikke gjennomføres for øyeblikket. Prøv igjen senere!'
              comp.isSending = false
            }
          } else {
            comp.isSending = false
          }
        })
        .catch(() => {
          comp.errorMessage =
            'Betalingen kunne ikke gjennomføres på grunn av manglende dekning eller ugyldig kortinformasjon'
          comp.isSending = false
        })
    },
    completeCart () {
      const comp = this
      comp._cartService
        .Complete(comp.store.id)
        .then(() => {
          location.href = '/webshop/orders?nolayout=true'

          // TODO:
          // comp.$navigator.navigate('OrderList', {
          //   clearHistory: true,
          //   props: {
          //     showConfirmation: true,
          //     clearCartInStore: comp.store.id
          //   }
          // })
        })
        .catch(() => {
          comp.errorMessage =
            'Betalingen kunne ikke gjennomføres. Prøv igjen senere.'
          comp.isSending = false
          comp.updateCart()
        })
    },
    submit () {
      if (!this.userIsLoggedIn) {
        this.showLogin = true
        return
      }
      if (this.submitDisabled) { return }
      this.isSending = true
      try {
        // Valider først!
        if (this.selectedPaymentMethodId === 'waiter') {
          this.completeCart()
        } else if (this.selectedPaymentMethodId) {
          // Using saved card
          this.createPaymentIntent(this.selectedPaymentMethodId, true)
        } else {
          // Nytt kort:
          this.$refs.cardElement.stripe.createPaymentMethod({
            type: 'card',
            card: this.$refs.cardElement.element
          }).then((paymentMethod) => {
            this.createPaymentIntent(paymentMethod.id, this.rememberCard)
          }).catch(() => {
            this.isSending = false
          })
        }
        this.isSending = true
      } catch (error) {
        this.isSending = false
        this.errorMessage = 'Betalingen kunne ikke gjennomføres. Kontroller kortinformasjon og prøv igjen.'
      }
    },
    setTip (tipPercent) {
      this.localTipPercent = tipPercent
      this.debouncedUpdateCart()
    },
    setPaymentMethodId (id) {
      this.selectedPaymentMethodId = id
      this.debouncedUpdateCart()
    },
    setLocalDeliveryType (value) {
      this.clearErrors()
      this.localDeliveryType = value
      this.updateCart(true)
    },
    debouncedUpdateCart: debounce(function () { this.updateCart() }, 400),
    updateCart (updateAvailablePaymentMethods) {
      if (!this.storeId) { return }
      this._cartService.SetCartRootProperties({
        storeId: this.storeId,
        isWaiterOrder: this.selectedPaymentMethodId === 'waiter',
        deliveryType: this.localDeliveryType,
        fullAddress: this.$store.state.currentUser.address
          ? this.$store.state.currentUser.address.fullAddress
          : '',
        zipCode: this.$store.state.currentUser.address
          ? this.$store.state.currentUser.address.zipCode
          : '',
        city: this.$store.state.currentUser.address
          ? this.$store.state.currentUser.address.city
          : '',
        comment: this.localComment ? this.localComment : 'Ingen kommentar',
        tipPercent: this.localTipPercent,
        tableName: this.localTableName
      }, updateAvailablePaymentMethods ? this.getAvailablePaymentMethods : undefined)
    },
    clearErrors () {
      this.errorMessage = ''
      this.deliveryMethodError = false
      this.deliveryAddressError = false
      this.tableNameError = false
      this.creditCardError = false
    },
    getStore () {
      this._storeService.Get(this.storeId).then((res) => {
        this.store = res
      })
    },
    getAvailablePaymentMethods () {
      this._stripeService
        .GetPaymentMethods(this.storeCart.id)
        .then((result) => {
          if (Array.isArray(result)) { this.cards = result }
          this.isLoadingCards = false
          if (
            !this.selectedPaymentMethodId ||
            this.selectedPaymentMethodId === 'waiter'
          ) {
            this.setPaymentMethodId(
              this.cards.length > 0 ? this.cards[0].id : ''
            )
          }
        })
        .catch(() => {
          this.isLoadingCards = false
        })
    }
  }
}
</script>
<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.checkout-page {
  max-width: rem(600);
  margin: 0 auto;
  padding: rem(20);
}

.emoji-btn {
  cursor: pointer;
  padding: 0 5px 0 5px;
}

.clickable {
  cursor: pointer;
}

.section {
  margin-top: 2em;
}

.title {
  font-weight: bold;
  margin-top: 100px;
}

.right {
  float:right;
}

.terms span {
  font-size: 10px;
}
</style>