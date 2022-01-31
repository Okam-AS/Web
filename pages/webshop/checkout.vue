<template>
  <div ref="container" class="shop">
    <div class="shop__header">
      <button v-if="storeId" class="shop__header-back" @click="goToStore">
        <span class="shop__header-back-icon material-icons">arrow_back</span>
      </button>
      <h2 class="shop__heading">
        Kasse
      </h2>
      <MyUserDropdown @close="closeLoginModal" />
    </div>
    <div class="message-box message-box--error m-b">
      <div>
        Betalingen med BankID feilet. Prøv igjen.
      </div>
      <div>
        <span class="message-box__close material-icons" @click="errorMessage=''">close</span>
      </div>
    </div>
    <div class="checkout-form">
      <span class="label">Leveringsmetoder</span>

      <SelectButton v-if="store.selfPickUp" :selected="localDeliveryType === 'SelfPickup'" text="Hent selv" @change="setLocalDeliveryType('SelfPickup')" />
      <SelectButton
        v-if="store.homeDeliveryMethods && store.homeDeliveryMethods.length > 0"
        text="Hjemlevering"
        :disabled="storeCart.calculations.itemsAmount < store.minimumOrderPriceForHomeDelivery"
        :selected="localDeliveryType === 'InstantHomeDelivery'"
        @change="setLocalDeliveryType('InstantHomeDelivery')"
      >
        <template slot="suffix">
          <span
            v-if="
              store.minimumOrderPriceForHomeDelivery > 0 &&
                storeCart.calculations.itemsAmount <
                store.minimumOrderPriceForHomeDelivery
            "
            class="sold-out"
          >{{ 'Min. bestilling: ' + priceLabel(store.minimumOrderPriceForHomeDelivery) }}</span>
        </template>
      </SelectButton>
      <SelectButton v-if="store.tableDelivery" text="Spis inne" :selected="localDeliveryType === 'TableDelivery'" @change="setLocalDeliveryType('TableDelivery')" />
      <div v-if="localDeliveryType === 'SelfPickup'" class="section">
        <span class="label">Henteadresse</span>
        <div>{{ storeAddressOneLiner }}</div>
      </div>
      <div v-if="localDeliveryType === 'TableDelivery'" class="section">
        <span class="label">Bordnummer</span>
        <div>
          <input v-model="localTableName" class="input" maxlength="30" rows="1" placeholder="F.eks: 7">
        </div>
      </div>
      <DeliveryAddressInputs v-if="localDeliveryType === 'InstantHomeDelivery'" />

      <div class="section">
        <span class="label">Betalingsmetoder</span>
        <div>
          <Loading
            v-if="isLoadingCards"
          />
          <div v-else>
            <div v-for="(item, index) in cards" :key="index">
              <SelectButton v-if="item.id === 'waiter'" text="Betal på stedet" :selected="selectedPaymentMethodId === item.id" @change="setPaymentMethodId(item.id)">
                <span class="material-icons">point_of_sale</span>
              </SelectButton>
              <SelectButton v-else-if="item.card" :text="'****' + item.card.last4 + ' ' + item.card.exp_month + '/' + item.card.exp_year" :selected="selectedPaymentMethodId === item.id" @change="setPaymentMethodId(item.id)">
                <span class="material-icons">credit_card</span>
              </SelectButton>
            </div>
            <div>
              <SelectButton text="Nytt kort" :selected="selectedPaymentMethodId === ''" @change="setPaymentMethodId('')" />
              <div v-show="selectedPaymentMethodId === ''">
                <client-only>
                  <stripe-element-card
                    ref="cardElement"
                    :pk="stripePublishableKey"
                    :hide-postal-code="true"
                    :elements-options="{ locale: 'nb' }"
                    class="card-input"
                  />
                </client-only>
                <label class="checkbox-label"><input v-model="rememberCard" type="checkbox">Husk dette kortet</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!isLoadingCards" class="section">
        <span class="label" style="margin-bottom:1em;">Tips</span>
        <div>
          <span :class="{'tip': true, 'selected': localTipPercent === 0}" @click="setTip(0)">🙂 0%</span>
          <span :class="{'tip': true, 'selected': localTipPercent === 5}" @click="setTip(5)">😀 5%</span>
          <span :class="{'tip': true, 'selected': localTipPercent === 10}" @click="setTip(10)">😃 10%</span>
          <span :class="{'tip': true, 'selected': localTipPercent === 20}" @click="setTip(20)">😍 20%</span>
        </div>
      </div>
      <div class="section">
        <span class="label">Kommentar</span>
        <div>
          <textarea v-model="localComment" class="input" maxlength="100" rows="7" :placeholder="commentHint" />
        </div>
      </div>
      <Loading v-if="isLoading" />
      <div v-else-if="storeCart.calculations" class="section price-summary">
        <div class="price-summary__row">
          <span>{{ totalQuantityLabel }}</span>
          <span v-show="storeCart.calculations.itemsAmountLineThrough > 0" class="right" style="text-decoration: line-through;">
            {{ priceLabel(storeCart.calculations.itemsAmountLineThrough) + ' ' }}
          </span>
          <span class="right">{{ priceLabel(storeCart.calculations.itemsAmount) }}</span>
        </div>
        <div v-show="storeCart.calculations.tipAmount > 0" class="price-summary__row">
          <span>Tips</span>
          <span class="right">{{ priceLabel(storeCart.calculations.tipAmount) }}</span>
        </div>
        <div class="price-summary__row">
          <span>Levering</span>
          <span class="right">{{ priceLabel(storeCart.calculations.deliveryAmount) }}</span>
        </div>
        <div v-show="storeCart.calculations.orderDiscountAmount > 0" class="price-summary__row">
          <span>Rabatt</span>
          <span class="right">{{ '-' + priceLabel(storeCart.calculations.orderDiscountAmount) }}</span>
        </div>
        <div v-show="storeCart.calculations.tableAdditionalAmount > 0" class="price-summary__row">
          <span>Spis inne</span>
          <span class="right">{{ priceLabel(storeCart.calculations.tableAdditionalAmount) }}</span>
        </div>
        <div class="price-summary__row price-summary__row--total">
          <span>Totalt</span>
          <span class="right">{{ priceLabel(storeCart.calculations.finalAmount) }}</span>
        </div>
      </div>
    </div>
    <div v-if="!isLoading" class="btn-row btn-row--center">
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
        Jeg er enig i <span class="clickable" style="font-weight:bold" @click="showTerms = true">salgsbetingelsene</span> og klar over at kjøpet innebærer begrensinger i <span class="clickable" style="font-weight:bold" @click="showTerms = true">angreretten</span>.
      </div>
    </div>
    <LoginModal v-if="showLogin" @close="closeLoginModal" />
    <Modal v-if="showTerms" @close="showTerms = false">
      <iframe style="border:none;" width="100%" height="800" src="https://www.okam.no/personvern-og-vilkar/?nolayout" />
    </Modal>
  </div>
</template>

<script type="ts">
import Loading from '@/components/atoms/Loading.vue'
import ContinueButton from '@/components/atoms/ContinueButton.vue'
import DeliveryAddressInputs from '@/components/atoms/DeliveryAddressInputs.vue'
import Modal from '@/components/atoms/Modal.vue'
import $config from '@/core/helpers/configuration'
import MyUserDropdown from '@/components/atoms/MyUserDropdown.vue'
import { debounce } from '../../core/helpers/ts-debounce'
import SelectButton from '~/components/atoms/SelectButton.vue'
import LoginModal from '~/components/molecules/LoginModal.vue'

export default {
  components: { ContinueButton, DeliveryAddressInputs, SelectButton, MyUserDropdown, Loading, Modal, LoginModal },
  data: () => ({
    storeId: undefined,
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
      return this.$store.getters.cartByStoreId(this.storeId) || { calculations: {} }
    },
    storeAddressOneLiner () {
      if (this.store && this.store.address) { return (this.store.address.fullAddress + ', ' + this.store.address.zipCode + ' ' + this.store.address.city) } else { return '' }
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
      this.getAvailablePaymentMethods()
      this._storeService.Get(this.storeId).then((res) => {
        this.store = res
        this.localDeliveryType = 'NotSet'
        if (this.storeCart) {
          this.localTableName = this.storeCart.tableName === undefined ? '' : this.storeCart.tableName + ''
          if (!this.localTableName && this.qsTableName) {
            this.localTableName = this.qsTableName
          }
          if (this.localTableName) { this.localDeliveryType = 'TableDelivery' }

          this.localComment = this.storeCart.comment === undefined || this.storeCart.comment === 'Ingen kommentar' ? '' : this.storeCart.comment + ''
        }

        if (this.userIsLoggedIn) {
          this.updateCart()
        } else {
          this.showLogin = true
        }

        if (this.paymentStatus === 'failed') {
          this.errorMessage = 'Betalingen med BankID feilet. Prøv igjen.'
        }
      })
    }
  },
  methods: {
    goToStore () {
      window.location.href = '/webshop' + this.urlQueryStrings
    },
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
              window.location.href = result.nextAction.redirect_to_url.url
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
            'Betalingen kunne ikke gjennomføres på grunn av manglende dekning eller ugyldig kortinformasjon'
          comp.isSending = false
        })
    },
    completeCart () {
      const comp = this
      comp._cartService
        .Complete(comp.store.id)
        .then(() => {
          this.paymentStatus = 'success'
          window.location.href = '/webshop/orders' + this.urlQueryStrings
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
        // TODO: Valider først!
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
          }).then((result) => {
            this.createPaymentIntent(result.paymentMethod.id, this.rememberCard)
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

.sold-out{
  background-color: $color-neutral-light;
  padding: rem(4) rem(8);
  font-style: italic;
  font-size: 11px;
  margin-left: 1em;
}
.tip {
  cursor: pointer;
  background: white;
  padding: 5px;
  border-radius: 1em;
}
.tip.selected {
  border: 2px solid black;
}

.checkout-page {
  max-width: rem(600);
  margin: 0 auto;
  padding: rem(16) rem(24);
}

.checkout-form {
  background-color: $color-support-light;
  padding: rem(24);
  margin-right: rem(-24);
  margin-left: rem(-24);
}

.emoji-btn {
  cursor: pointer;
  padding: 0 5px 0 5px;
}

.clickable {
  cursor: pointer;
}

.section {
  margin-top: rem(24);
}

.title {
  font-weight: bold;
  margin-top: 100px;
}

.right {
  float:right;
}

.terms {
  font-size: rem(12);
  margin-top: rem(16);

  span {
    font-weight: 700;
    text-decoration: underline;
  }
}

.card-input {
  margin: rem(8) 0;
}

.price-summary {
  &__row {
    &--total {
      font-weight: 700;
      border-top: 1px solid $color-dark;
      padding-top: rem(8);
      margin-top: rem(8);
    }
  }
}
</style>