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
    <div
      v-if="errorMessage"
      :class="{
        'message-box': true,
        'message-box--error': errorMessage,
        'm-b': true,
      }"
    >
      <div>
        {{ errorMessage }}
      </div>
      <div>
        <span
          class="message-box__close material-icons"
          @click="clearErrors"
        >close</span>
      </div>
    </div>
    <div v-if="!userIsLoggedIn" class="checkout-form">
      <p>Du må bekrefte telefonnummer for å kunne gjennomføre bestillingen</p>
      <continue-button @click="showLogin = true">
        Bekreft telefonnummer
      </continue-button>
    </div>
    <div v-else-if="cartIsEmpty" class="checkout-form">
      <p>Handlevogna er tom</p>
    </div>
    <div v-if="userIsLoggedIn && !cartIsEmpty" class="checkout-form">
      <span class="label">Leveringsmetoder</span>

      <SelectButton
        v-if="store.selfPickUp"
        :selected="localDeliveryType === 'SelfPickup'"
        text="Hent selv"
        @change="setLocalDeliveryType('SelfPickup')"
      />
      <SelectButton
        v-if="
          storeCart &&
            storeCart.calculations &&
            store.homeDeliveryMethods &&
            store.homeDeliveryMethods.length > 0
        "
        text="Hjemlevering"
        :disabled="
          storeCart.calculations.itemsAmount <
            store.minimumOrderPriceForHomeDelivery
        "
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
          >{{
            "Min. bestilling: " +
              priceLabel(store.minimumOrderPriceForHomeDelivery)
          }}</span>
        </template>
      </SelectButton>
      <SelectButton
        v-if="store.tableDeliveryEnabled"
        text="Spis inne"
        :selected="localDeliveryType === 'TableDelivery'"
        @change="setLocalDeliveryType('TableDelivery')"
      />
      <div v-if="localDeliveryType === 'SelfPickup'" class="section">
        <span class="label">Henteadresse</span>
        <div>{{ storeAddressOneLiner }}</div>
      </div>
      <div v-if="localDeliveryType === 'TableDelivery'" class="section">
        <span class="label">Bordnummer</span>
        <div>
          <input
            v-model="localTableName"
            :class="{ input: true, 'border-error': tableNameError }"
            maxlength="30"
            rows="1"
            placeholder="F.eks: 7"
          >
        </div>
      </div>
      <DeliveryAddressInputs
        v-if="localDeliveryType === 'InstantHomeDelivery'"
        :has-errors="deliveryAddressError"
      />

      <div class="section">
        <span class="label">Betalingsmetoder</span>
        <div>
          <Loading v-if="isLoadingCards" />
          <div v-else>
            <div v-for="(item, index) in cards" :key="index">
              <SelectButton
                v-if="item.paymentType === 'PayInStore'"
                text="Betal på stedet"
                :selected="selectedPaymentMethodId === item.id"
                @change="setPaymentMethod(item)"
              >
                <span class="material-icons">point_of_sale</span>
              </SelectButton>
              <SelectButton
                v-if="item.paymentType === 'Stripe'"
                :text="
                  '****' + item.last4 + ' ' + item.expMonth + '/' + item.expYear
                "
                :selected="selectedPaymentMethodId === item.id"
                @change="setPaymentMethod(item)"
              >
                <span class="material-icons">credit_card</span>
              </SelectButton>
              <SelectButton
                v-if="item.paymentType === 'Vipps'"
                text="Vipps"
                :selected="selectedPaymentMethodId === item.id"
                @change="setPaymentMethod(item)"
              >
                <span class="material-icons">credit_card</span>
              </SelectButton>
            </div>
            <div v-if="store.payment && store.payment.stripeEnabled === true">
              <SelectButton
                text="Nytt kort"
                :selected="selectedPaymentMethodId === ''"
                @change="setPaymentMethod(undefined)"
              />
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
                <label
                  class="checkbox"
                ><input v-model="rememberCard" type="checkbox">Husk dette
                  kortet</label>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="!isLoadingCards && store.tip && store.tip.percentEnabled"
        class="section"
      >
        <span class="label" style="margin-bottom: 1em">
          {{ store.tip && store.tip.heading ? store.tip.heading : "Tips" }}
        </span>
        <div>
          <span
            :class="{ tip: true, selected: localTipPercent === 0 }"
            @click="setTip(0)"
          >🙂 0%</span>
          <span
            :class="{ tip: true, selected: localTipPercent === 5 }"
            @click="setTip(5)"
          >😀 5%</span>
          <span
            :class="{ tip: true, selected: localTipPercent === 10 }"
            @click="setTip(10)"
          >😃 10%</span>
          <span
            :class="{ tip: true, selected: localTipPercent === 20 }"
            @click="setTip(20)"
          >😍 20%</span>
        </div>
      </div>
      <div class="section">
        <span class="label">Kommentar</span>
        <div>
          <textarea
            v-model="localComment"
            class="input"
            maxlength="100"
            rows="4"
            :placeholder="commentHint"
          />
        </div>
      </div>
      <Loading v-if="isLoading" />
      <div
        v-else-if="storeCart && storeCart.calculations"
        class="section price-summary"
      >
        <div class="price-summary__row">
          <span>{{ totalQuantityLabel }}</span>
          <span
            v-show="storeCart.calculations.itemsAmountLineThrough > 0"
            class="right"
            style="text-decoration: line-through"
          >
            {{
              priceLabel(storeCart.calculations.itemsAmountLineThrough) + " "
            }}
          </span>
          <span class="right">{{
            priceLabel(storeCart.calculations.itemsAmount)
          }}</span>
        </div>
        <div
          v-show="storeCart.calculations.tipAmount > 0"
          class="price-summary__row"
        >
          <span>Tips</span>
          <span class="right">{{
            priceLabel(storeCart.calculations.tipAmount)
          }}</span>
        </div>
        <div class="price-summary__row">
          <span>Levering</span>
          <span class="right">{{
            priceLabel(storeCart.calculations.deliveryAmount)
          }}</span>
        </div>
        <div
          v-show="storeCart.calculations.orderDiscountAmount > 0"
          class="price-summary__row"
        >
          <span>Rabatt</span>
          <span class="right">{{
            "-" + priceLabel(storeCart.calculations.orderDiscountAmount)
          }}</span>
        </div>
        <div
          v-show="storeCart.calculations.tableAdditionalAmount > 0"
          class="price-summary__row"
        >
          <span>Spis inne</span>
          <span class="right">{{
            priceLabel(storeCart.calculations.tableAdditionalAmount)
          }}</span>
        </div>
        <div class="price-summary__row price-summary__row--total">
          <span>Totalt</span>
          <span class="right">{{
            priceLabel(storeCart.calculations.finalAmount)
          }}</span>
        </div>
      </div>
    </div>
    <div v-if="userIsLoggedIn && !cartIsEmpty" class="btn-row btn-row--center">
      <p
        v-if="!store.isOpenNow && store.name"
        style="padding: 1em; background: #fcf0cc"
      >
        {{ store.name + " er stengt for øyeblikket" }}
      </p>
      <continue-button :class="{ disabled: submitDisabled }" @click="submit">
        Bekreft og betal
      </continue-button>
      <div class="terms">
        Jeg er enig i
        <span
          class="clickable"
          style="font-weight: bold"
          @click="showTerms = true"
        >salgsbetingelsene</span>
        og klar over at kjøpet innebærer begrensinger i
        <span
          class="clickable"
          style="font-weight: bold"
          @click="showTerms = true"
        >angreretten</span>.
      </div>
    </div>
    <LoginModal v-if="showLogin" @close="closeLoginModal" />
    <Modal v-if="showTerms" @close="showTerms = false">
      <iframe
        style="border: none"
        width="100%"
        height="800"
        src="https://www.okam.no/personvern-og-vilkar/?nolayout"
      />
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
  components: {
    ContinueButton,
    DeliveryAddressInputs,
    SelectButton,
    MyUserDropdown,
    Loading,
    Modal,
    LoginModal
  },
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
    localPaymentType: 'NotSet',
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
      return (
        this.$store.getters.cartByStoreId(this.storeId) || { calculations: {} }
      )
    },
    storeAddressOneLiner () {
      if (this.store && this.store.address) {
        return (
          this.store.address.fullAddress +
          ', ' +
          this.store.address.zipCode +
          ' ' +
          this.store.address.city
        )
      } else {
        return ''
      }
    },
    totalQuantityLabel () {
      const totalQuantity = this.cartItems
        .map(item => item.quantity)
        .reduce((a, b) => a + b, 0)
      return totalQuantity + (totalQuantity === 1 ? ' vare' : ' varer')
    },
    commentHint () {
      if (this.localDeliveryType === 'SelfPickup') {
        return 'Ønsker du å hente bestillingen på et senere tidspunkt eller har en annen beskjed til den som behandler din bestilling, kan du skrive den inn her.'
      }
      if (this.localDeliveryType === 'InstantHomeDelivery') {
        return 'Ønsker du å få bestillingen levert på et senere tidspunkt, har en beskjed til sjåføren eller den som behandler din bestilling, kan du skrive den inn her.'
      }

      return 'Har du en beskjed til den som behandler din bestilling, kan du skrive den inn her'
    },
    isLoading () {
      return (
        this.isSending || this.$store.state.cartIsLoading || this.isLoadingCards
      )
    },
    submitDisabled () {
      return (
        this.isLoading ||
        !this.store.isOpenNow ||
        this.isSending ||
        this.cartIsEmpty
      )
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
    if (!this.storeId) {
      return
    }
    if (!this.userIsLoggedIn) {
      this.showLogin = true
      return
    }

    this._storeService.Get(this.storeId).then((res) => {
      this.store = res
      this.localDeliveryType = 'NotSet'
      if (this.storeCart) {
        this.localTableName = !this.storeCart.tableName
          ? ''
          : this.storeCart.tableName + ''
        if (!this.localTableName && this.qsTableName) {
          this.localTableName = this.qsTableName
        }
        if (this.localTableName && this.store.tableDelivery) {
          this.localDeliveryType = 'TableDelivery'
        }

        this.localComment = this.storeCart.comment
          ? this.storeCart.comment + ''
          : ''
      }

      if (this.userIsLoggedIn) {
        this.updateCart(true)
      }

      if (this.paymentStatus === 'failed') {
        this.errorMessage = 'Betalingen feilet. Prøv igjen.'
      }
    })
  },
  methods: {
    async validate () {
      const comp = this
      comp.clearErrors()
      let containsErrors = false
      if (
        comp.localDeliveryType === 'InstantHomeDelivery' &&
        (!comp.$store.getters.deliveryAddress().trim() || !comp.validAddress())
      ) {
        comp.deliveryAddressError = true
        comp.errorMessage = 'Legg inn en gyldig leveringsadresse'
        containsErrors = true
      }
      if (comp.localPaymentType === 'NotSet') {
        comp.errorMessage = 'Velg betalingsmetode'
        containsErrors = true
      }
      if (comp.localDeliveryType === 'NotSet') {
        comp.errorMessage = 'Velg leveringsmetode'
        containsErrors = true
      }
      if (
        comp.localDeliveryType === 'TableDelivery' &&
        (!comp.localTableName || comp.localTableName.trim() === '')
      ) {
        comp.tableNameError = true
        comp.errorMessage = 'Skriv inn bordnummer'
        containsErrors = true
      }

      if (containsErrors) {
        return false
      }

      try {
        const {
          itemsOutOfStock,
          cartIsEmpty,
          storeIsClosed,
          deliveryAddressError,
          deliveryMethodError,
          priceDifferError,
          priceTooLowError,
          minimumPrice,
          hasErrors
        } = await this._cartService.Validate(comp.store.id)

        if (priceTooLowError) {
          comp.errorMessage =
            'Beløpet er for lite. Du må minst handle for ' +
            comp.priceLabel(minimumPrice)
        }

        if (priceDifferError) {
          comp.errorMessage =
            'Prisene er endret siden sist. Gå tilbake for å oppdatere handlevogna.'
        }
        if (itemsOutOfStock.length > 0) {
          let itemNames = ''
          if (itemsOutOfStock.length === 1) {
            itemNames = `'${itemsOutOfStock[0].name}'`
          } else if (itemsOutOfStock.length === 2) {
            itemNames = `'${itemsOutOfStock[0].name}' og '${itemsOutOfStock[1].name}'`
          } else {
            itemNames = `'${itemsOutOfStock[0].name}', '${
              itemsOutOfStock[1].name
            }' og ${itemsOutOfStock.length - 2} ${
              itemsOutOfStock.length - 2 === 1 ? 'annen vare' : 'andre varer'
            }`
          }
          comp.errorMessage = `Det er ikke nok av ${itemNames} på lager. Gå tilbake for å fjerne ${
            itemsOutOfStock.length === 1 ? 'den' : 'de'
          } fra handlevogna.`
        }
        if (deliveryAddressError) {
          comp.deliveryAddressError = true
          comp.errorMessage = 'Leveringsadressen er ikke gyldig'
        }
        if (deliveryMethodError) {
          comp.deliveryMethodError = true
          comp.errorMessage =
            'Butikken leverer ikke til din adresse for øyeblikket'
        }
        if (storeIsClosed) {
          comp.errorMessage = comp.store.name + ' er stengt for øyeblikket'
        }
        if (cartIsEmpty) {
          comp.errorMessage = 'Handlevogna er tom'
        }

        return !hasErrors
      } catch (err) {
        comp.errorMessage = 'Noe gikk galt. Prøv igjen senere!'
        return false
      }
    },
    validAddress () {
      const address = this.$store.state.currentUser.address
      if (!address) {
        return false
      }
      if (
        !address.fullAddress ||
        address.fullAddress.toString().trim().length < 3
      ) {
        return false
      }
      if (!address.zipCode || address.zipCode.trim().length !== 4) {
        return false
      }
      if (!address.city || address.city.trim().length < 3) {
        return false
      }
      return true
    },
    goToStore () {
      window.location.href = '/webshop' + this.urlQueryStrings
    },
    closeLoginModal (isLoggedIn) {
      if (isLoggedIn) {
        window.location.reload()
      } else {
        this.showLogin = false
      }
    },
    initiateVipps () {
      this.isSending = true
      this._vippsService
        .Initiate(
          this.storeCart.id,
          this.storeCart.calculations.finalAmount,
          false
        )
        .then((result) => {
          window.location.href = result.url
          this.isSending = false
        })
        .catch(() => {
          this.errorMessage =
            'Betaling med Vipps kunne ikke gjennomføres for øyeblikket.'
          this.isSending = false
        })
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
    async submit () {
      if (!this.userIsLoggedIn) {
        this.showLogin = true
        return
      }
      if (this.submitDisabled) {
        return
      }
      this.isSending = true
      try {
        await this.validate()
        if (!this.errorMessage) {
          if (this.localPaymentType === 'PayInStore') {
            this.completeCart()
          } else if (this.localPaymentType === 'Stripe') {
            // Using saved card
            this.createPaymentIntent(this.selectedPaymentMethodId, true)
          } else if (this.localPaymentType === 'Vipps') {
            this.initiateVipps()
          } else if (!this.selectedPaymentMethodId) {
            // Nytt kort:
            this.$refs.cardElement.stripe
              .createPaymentMethod({
                type: 'card',
                card: this.$refs.cardElement.element
              })
              .then((result) => {
                this.createPaymentIntent(
                  result.paymentMethod.id,
                  this.rememberCard
                )
              })
              .catch(() => {
                this.isSending = false
              })
          }
          this.isSending = true
        } else {
          this.isSending = false
        }
      } catch (error) {
        this.isSending = false
        this.errorMessage =
          'Betalingen kunne ikke gjennomføres. Kontroller kortinformasjon og prøv igjen.'
      }
    },
    setTip (tipPercent) {
      this.localTipPercent = tipPercent
      this.debouncedUpdateCart()
    },
    setPaymentMethod (item) {
      this.selectedPaymentMethodId = item === undefined ? '' : item.id
      this.localPaymentType = item === undefined ? 'NotSet' : item.paymentType
      this.debouncedUpdateCart()
    },
    setLocalDeliveryType (value) {
      this.clearErrors()
      this.localDeliveryType = value
      this.updateCart(true)
    },
    debouncedUpdateCart: debounce(function () {
      this.updateCart()
    }, 400),
    updateCart (updateAvailablePaymentMethods) {
      if (!this.storeId) {
        return
      }
      this._cartService.SetCartRootProperties(
        {
          storeId: this.storeId,
          paymentType: this.localPaymentType,
          deliveryType: this.localDeliveryType,
          fullAddress: this.$store.state.currentUser.address?.fullAddress || '',
          zipCode: this.$store.state.currentUser.address?.zipCode || '',
          city: this.$store.state.currentUser.address?.city || '',
          comment: this.localComment,
          tipPercent: this.localTipPercent,
          tableName: this.localTableName
        },
        updateAvailablePaymentMethods
          ? this.getAvailablePaymentMethods
          : undefined
      )
    },
    clearErrors () {
      this.errorMessage = ''
      this.deliveryMethodError = false
      this.deliveryAddressError = false
      this.tableNameError = false
      this.creditCardError = false
    },
    getAvailablePaymentMethods () {
      this.isLoadingCards = true
      this._paymentService
        .GetPaymentMethods(this.storeCart.id)
        .then((result) => {
          if (Array.isArray(result)) {
            this.cards = result
          }
          if ((this.cards || []).length === 1) {
            this.setPaymentMethod(this.cards[0])
          } else if (!this.selectedPaymentMethodId) {
            this.setPaymentMethod(
              (this.cards || []).find(
                x => x.id === this.selectedPaymentMethodId
              )
            )
          }
          this.isLoadingCards = false
        })
        .catch(() => {
          this.isLoadingCards = false
        })
    }
  }
}
</script>
<style lang="scss" >
@import "../../assets/sass/common.scss";
.disabled {
  opacity: 0.5;
}
.border-error {
  border-color: $color-error;
}
#stripe-element-errors {
  color: $color-error;
  padding-top: rem(5);
  padding-bottom: rem(5);
  font-size: 0.75em;
}

.sold-out {
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
  float: right;
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