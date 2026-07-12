<!--
  Kitchen Display System (KDS) — the unified kitchen board (plan Fase 3).

  EVOLVE-IN-PLACE DECISION: /admin/ongoing IS the restaurants' kitchen/status screen today, so
  this page (not a new /admin/kitchen) is reworked in place into the one unified board. Keeping the
  route + nav entry means no parallel screen, no redirect, and no broken bookmarks — ongoing simply
  grows up into the KDS. Every action the old ongoing board had survives on the online tickets
  (accept -> processing prep-timer, next -> delivery-type-aware ready, complete, transfer, change
  delivery type, driver SMS, receipt, cancel, customer, Complete-all); POS table checks add the new
  per-line / coursing layer on top.

  DATA SOURCES (two feeds, polled together, see the note above `refresh`):
    * _kitchenService.GetBoard(storeId)  -> POS table tickets (per-line coursing) AND online orders
      that are Accepted/Processing, with full kitchen detail (courses, options, notes, allergens).
      Drives the POS tickets and enriches active online tickets.
    * _orderService.GetAllOngoing()      -> the full online Order objects. This stays a REAL source,
      not just "detail": the kitchen board omits online orders once they reach a ready state
      (ReadyForPickup / ReadyForDriver / Served), but those still need their Complete / SMS / receipt
      actions — so online tickets are rendered from this feed (enriched with board detail when the
      order is still on the board) and every online mutation runs through _orderService exactly as
      the old ongoing board did.

  Timers key off createdAt: there is no per-line sent-at column yet (KitchenTicketModel.sentAt is
  always null) — a real sent-at is a later migration/UI pass.
-->
<template>
  <AdminPage full-width>
    <div
      ref="kdsBoard"
      class="kds-board"
      :class="{ 'is-dark': darkMode }"
    >
      <!-- Toolbar -->
      <div class="kds-toolbar">
        <h1 class="kds-toolbar__title">
          {{ $i('kds_title') }}
          <span
            v-if="currentStoreName"
            class="kds-toolbar__store"
          >{{ currentStoreName }}</span>
        </h1>

        <span class="kds-toolbar__spacer" />

        <span class="kds-live">
          <span class="kds-live__dot" />{{ $i('kds_live') }}
        </span>

        <div class="kds-seg">
          <button
            class="kds-seg__btn"
            :class="{ 'is-active': viewMode === 'wall' }"
            @click="viewMode = 'wall'"
          >
            <span class="material-icons">grid_view</span>{{ $i('kds_viewWall') }}
          </button>
          <button
            class="kds-seg__btn"
            :class="{ 'is-active': viewMode === 'expo' }"
            @click="viewMode = 'expo'"
          >
            <span class="material-icons">list_alt</span>{{ $i('kds_viewExpo') }}
          </button>
        </div>

        <button
          class="kds-completeall"
          :disabled="!hasReadyOnline"
          @click="completeAll"
        >
          <span class="material-icons">done_all</span>{{ $i('kds_completeAll') }}
        </button>

        <button
          class="kds-iconbtn"
          :class="{ 'is-active': darkMode }"
          :title="$i('kds_toggleDark')"
          @click="toggleDark"
        >
          <span class="material-icons">{{ darkMode ? 'light_mode' : 'dark_mode' }}</span>
        </button>

        <button
          class="kds-iconbtn"
          :title="$i('kds_fullscreen')"
          @click="toggleFullscreen"
        >
          <span class="material-icons">{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</span>
        </button>
      </div>

      <!-- All-day counts (expo aggregate) -->
      <AllDayCounts :counts="allDayCounts" />

      <!-- Loading -->
      <div
        v-if="isLoading"
        class="kds-loading"
      >
        <Loading :loading="true" />
      </div>

      <!-- Empty -->
      <div
        v-else-if="!unifiedTickets.length"
        class="kds-empty"
      >
        <span class="material-icons">restaurant</span>
        <span>{{ $i('kds_emptyBoard') }}</span>
      </div>

      <!-- Ticket wall -->
      <div
        v-else-if="viewMode === 'wall'"
        class="kds-wall"
      >
        <KitchenTicket
          v-for="ticket in unifiedTickets"
          :key="ticket.key"
          :ticket="ticket"
          :now="now"
          :amber-minutes="amberMinutes"
          :red-minutes="redMinutes"
          :multi-store="multiStore"
          @bump-line="(line) => onBumpLine(ticket, line)"
          @bump-course="(seq) => onBumpCourse(ticket, seq)"
          @bump-ticket="onBumpTicket(ticket)"
          @recall-line="(line) => onRecallLine(ticket, line)"
          @primary-action="onPrimaryAction"
          @transfer="transferOrder"
          @change-delivery="changeDeliveryType"
          @sms-driver="openSmsDriver"
          @receipt="openReceipt"
          @cancel="cancelOrder"
          @open-customer="openCustomerModal"
        />
      </div>

      <!-- Expo / pass view -->
      <ExpoView
        v-else
        :tickets="unifiedTickets"
        :now="now"
        :amber-minutes="amberMinutes"
        :red-minutes="redMinutes"
        :multi-store="multiStore"
        @bump-ticket="onBumpTicket"
        @primary="onPrimaryAction"
      />

      <!-- Modals (preserved from the old ongoing board) -->
      <LoginModal
        v-if="showLogin"
        @close="closeLoginModal"
      />

      <OrderProcessingModal
        v-if="showProcessingModal && currentOrder"
        :order="currentOrder"
        @close="closeProcessingModal"
      />

      <ReceiptModal
        v-if="showReceiptModal && currentOrder"
        :order="currentOrder"
        @close="closeReceiptModal"
      />

      <TransferOrderModal
        v-if="showTransferModal && currentOrder"
        :order="currentOrder"
        :stores="adminStores"
        @close="closeTransferModal"
      />

      <ChangeDeliveryTypeModal
        v-if="showChangeDeliveryModal && currentOrder"
        :order="currentOrder"
        @close="closeChangeDeliveryModal"
      />

      <SmsDriverModal
        v-if="showSmsDriverModal && currentOrder"
        :order="currentOrder"
        @close="closeSmsDriverModal"
        @success="onSmsSuccess"
      />

      <CustomerInfoModal
        v-if="showCustomerModal && currentOrder"
        :user-id="currentOrder.userId || (currentOrder.user && currentOrder.user.id)"
        :store-id="currentOrder.storeId"
        :customer-name="currentOrder.userFullName"
        :customer-phone="currentOrder.user && currentOrder.user.phoneNumber"
        @close="closeCustomerModal"
      />
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import Loading from '~/components/atoms/Loading.vue'
import LoginModal from '~/components/molecules/LoginModal.vue'
import OrderProcessingModal from '~/components/molecules/OrderProcessingModal.vue'
import ReceiptModal from '~/components/molecules/ReceiptModal.vue'
import TransferOrderModal from '~/components/molecules/TransferOrderModal.vue'
import ChangeDeliveryTypeModal from '~/components/molecules/ChangeDeliveryTypeModal.vue'
import SmsDriverModal from '~/components/molecules/SmsDriverModal.vue'
import CustomerInfoModal from '~/components/molecules/CustomerInfoModal.vue'
import KitchenTicket from '~/components/admin/kitchen/KitchenTicket.vue'
import AllDayCounts from '~/components/admin/kitchen/AllDayCounts.vue'
import ExpoView from '~/components/admin/kitchen/ExpoView.vue'

const READY_STATUSES = ['ReadyForPickup', 'ReadyForDriver', 'DriverPickedUp', 'Served']

export default {
  components: {
    AdminPage,
    Loading,
    LoginModal,
    OrderProcessingModal,
    ReceiptModal,
    TransferOrderModal,
    ChangeDeliveryTypeModal,
    SmsDriverModal,
    CustomerInfoModal,
    KitchenTicket,
    AllDayCounts,
    ExpoView
  },
  data: () => ({
    showLogin: false,
    isLoading: true,
    board: { tickets: [] },
    onlineOrders: [],
    now: Date.now(),
    viewMode: 'wall',
    darkMode: false,
    amberMinutes: 8,
    redMinutes: 15,
    refreshInterval: null,
    clockInterval: null,
    isRefreshing: false,
    isFullscreen: false,
    // Preserved ongoing modal state
    showProcessingModal: false,
    currentOrder: null,
    showReceiptModal: false,
    showTransferModal: false,
    showChangeDeliveryModal: false,
    showSmsDriverModal: false,
    showCustomerModal: false
  }),
  computed: {
    adminStores () {
      return (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || []
    },
    multiStore () {
      return this.adminStores.length > 1
    },
    selectedStore () {
      const selected = this.$store.state.selectedAdminStore
      if (selected) { return selected }
      return this.adminStores.length ? this.adminStores[0].id : null
    },
    currentStoreName () {
      const store = this.adminStores.find(s => s.id === this.selectedStore)
      return store ? store.name : ''
    },
    posTickets () {
      return (this.board.tickets || [])
        .filter(t => t.source === 'PosTable')
        .map(t => ({
          key: 'pos-' + t.orderId,
          kind: 'pos',
          orderId: t.orderId,
          friendlyId: t.friendlyId,
          tableName: t.tableName,
          couverts: t.couverts,
          comment: t.comment,
          createdAt: t.createdAt,
          deliveryType: t.deliveryType,
          status: t.status,
          overallStatus: t.overallStatus,
          lines: t.lines || [],
          order: null
        }))
    },
    onlineTickets () {
      // Board online tickets (Accepted/Processing) carry the full kitchen detail; index them so a
      // still-active online order shows options/notes/allergens. Ready online orders are not on the
      // board, so they fall back to their plain order items.
      const boardByFriendly = {}
      ;(this.board.tickets || []).forEach((t) => {
        if (t.source === 'Online') { boardByFriendly[t.friendlyId] = t }
      })
      const storeId = this.selectedStore
      return (this.onlineOrders || [])
        .filter(o => !storeId || o.storeId === storeId)
        .map((o) => {
          const bt = boardByFriendly[o.friendlyOrderId] || null
          return {
            key: 'online-' + o.id,
            kind: 'online',
            orderId: bt ? bt.orderId : null,
            friendlyId: o.friendlyOrderId,
            tableName: o.tableName,
            couverts: null,
            comment: o.comment,
            createdAt: o.created,
            deliveryType: o.deliveryType,
            status: o.status,
            overallStatus: bt ? bt.overallStatus : null,
            lines: bt ? bt.lines : this.normalizeOrderItems(o.items),
            order: o
          }
        })
    },
    unifiedTickets () {
      return this.posTickets.concat(this.onlineTickets).sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER
        return at - bt
      })
    },
    allDayCounts () {
      // Aggregate everything still to be made across the kitchen (expo volume). POS: lines not yet
      // ready. Online: all lines while the order is still Accepted/Processing.
      const counts = {}
      const add = (name, qty) => { counts[name] = (counts[name] || 0) + (qty || 0) }
      this.posTickets.forEach((t) => {
        t.lines.forEach((l) => {
          if (l.status === 'Sent' || l.status === 'Fired') { add(l.name, l.quantity) }
        })
      })
      this.onlineTickets.forEach((t) => {
        if (t.status === 'Accepted' || t.status === 'Processing') {
          t.lines.forEach(l => add(l.name, l.quantity))
        }
      })
      return Object.keys(counts)
        .map(name => ({ name, quantity: counts[name] }))
        .sort((a, b) => b.quantity - a.quantity)
    },
    hasReadyOnline () {
      return this.onlineTickets.some(t => READY_STATUSES.includes(t.status))
    }
  },
  watch: {
    selectedStore () {
      // Switching store: drop stale tickets and reload for the new kitchen.
      this.board = { tickets: [] }
      this.onlineOrders = []
      this.isLoading = true
      this.refresh()
    }
  },
  mounted () {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true
      this.isLoading = false
      return
    }
    this.darkMode = localStorage.getItem('kdsDarkMode') === '1'
    this.refresh()
    this.startAutoRefresh()
    this.clockInterval = setInterval(() => { this.now = Date.now() }, 1000)
    document.addEventListener('fullscreenchange', this.onFullscreenChange)
  },
  beforeDestroy () {
    this.stopAutoRefresh()
    if (this.clockInterval) { clearInterval(this.clockInterval) }
    document.removeEventListener('fullscreenchange', this.onFullscreenChange)
  },
  methods: {
    // Poll both feeds together and merge incrementally so cards/timers/scroll never flicker.
    refresh () {
      const storeId = this.selectedStore
      if (!storeId || this.isRefreshing) { return Promise.resolve() }
      this.isRefreshing = true
      return Promise.all([
        this._kitchenService.GetBoard(storeId),
        this._orderService.GetAllOngoing()
      ])
        .then(([board, online]) => {
          this.mergeBoard(board)
          this.onlineOrders = online || []
        })
        .catch(() => {
          // Keep the last good board on a transient poll failure.
        })
        .finally(() => {
          this.isRefreshing = false
          this.isLoading = false
        })
    },
    startAutoRefresh () {
      this.refreshInterval = setInterval(this.refresh, 5000)
    },
    stopAutoRefresh () {
      if (this.refreshInterval) { clearInterval(this.refreshInterval) }
    },
    // Diff the incoming board against current state and update tickets/lines in place (keyed by
    // orderId / orderLineItemId) so Vue patches rather than recreates — no flicker, no lost scroll.
    mergeBoard (newBoard) {
      const incoming = (newBoard && newBoard.tickets) || []
      const byId = {}
      ;(this.board.tickets || []).forEach((t) => { byId[t.orderId] = t })
      this.board.tickets = incoming.map((nt) => {
        const cur = byId[nt.orderId]
        if (!cur) { return nt }
        cur.source = nt.source
        cur.friendlyId = nt.friendlyId
        cur.tableName = nt.tableName
        cur.couverts = nt.couverts
        cur.comment = nt.comment
        cur.createdAt = nt.createdAt
        cur.sentAt = nt.sentAt
        cur.deliveryType = nt.deliveryType
        cur.status = nt.status
        cur.overallStatus = nt.overallStatus
        cur.lines = this.mergeLines(cur.lines, nt.lines)
        return cur
      })
    },
    mergeLines (existing, incoming) {
      const cur = existing || []
      const next = incoming || []
      const byId = {}
      cur.forEach((l) => { byId[l.orderLineItemId] = l })
      return next.map((nl) => {
        const line = byId[nl.orderLineItemId]
        if (!line) { return nl }
        line.name = nl.name
        line.quantity = nl.quantity
        line.courseSequence = nl.courseSequence
        line.status = nl.status
        line.notes = nl.notes
        line.allergens = nl.allergens
        line.options = nl.options
        return line
      })
    },
    normalizeOrderItems (items) {
      return (items || []).map(it => ({
        orderLineItemId: it.id,
        name: it.name,
        quantity: it.quantity,
        courseSequence: null,
        status: null,
        notes: it.notes,
        allergens: [],
        options: it.options || []
      }))
    },
    // ---- POS coursing mutations (every call returns the refreshed board) ----
    onBumpLine (ticket, line) {
      this._kitchenService
        .BumpLine(this.selectedStore, ticket.orderId, line.orderLineItemId)
        .then(board => this.mergeBoard(board))
        .catch(error => this.reportError(error))
    },
    onBumpCourse (ticket, courseSequence) {
      this._kitchenService
        .BumpCourse(this.selectedStore, ticket.orderId, courseSequence)
        .then(board => this.mergeBoard(board))
        .catch(error => this.reportError(error))
    },
    onBumpTicket (ticket) {
      // Only POS tickets emit a kitchen ticket-bump; online tickets use their primary action.
      this._kitchenService
        .BumpTicket(this.selectedStore, ticket.orderId)
        .then(board => this.mergeBoard(board))
        .catch(error => this.reportError(error))
    },
    onRecallLine (ticket, line) {
      this._kitchenService
        .RecallLine(this.selectedStore, ticket.orderId, line.orderLineItemId)
        .then(board => this.mergeBoard(board))
        .catch(error => this.reportError(error))
    },
    reportError (error) {
      alert(this.$i('ongoing_errorUpdate', { error: (error && error.message) || this.$i('ongoing_unknownError') }))
    },
    // ---- Online order actions (unchanged behaviour from the old ongoing board) ----
    onPrimaryAction (order) {
      if (!order) { return }
      if (order.status === 'Accepted') {
        this.startProcessing(order)
      } else if (order.status === 'Processing') {
        this.updateOrderToReady(order)
      } else if (READY_STATUSES.includes(order.status)) {
        this.completeOrder(order)
      }
    },
    startProcessing (order) {
      this.currentOrder = order
      this.showProcessingModal = true
    },
    closeProcessingModal (success) {
      this.showProcessingModal = false
      if (success) { this.refresh() }
      this.currentOrder = null
    },
    updateOrderToReady (order) {
      if (!order) { return }
      let nextStatus
      if (order.deliveryType === 'SelfPickup') {
        nextStatus = 'ReadyForPickup'
      } else if (order.deliveryType === 'InstantHomeDelivery' || order.deliveryType === 'DineHomeDelivery' || order.deliveryType === 'WoltDelivery') {
        nextStatus = 'ReadyForDriver'
      } else if (order.deliveryType === 'TableDelivery') {
        nextStatus = 'Served'
      } else {
        nextStatus = 'ReadyForPickup'
      }
      this._orderService
        .UpdateStatus(order.id, nextStatus)
        .then(() => this.refresh())
        .catch((error) => {
          alert(this.$i('ongoing_errorUpdate', { error: error.message || this.$i('ongoing_unknownError') }))
        })
    },
    completeOrder (order) {
      if (!order) { return }
      let confirmMessage = this.$i('ongoing_confirmComplete', { orderId: order.friendlyOrderId })
      if (order.deliveryType === 'WoltDelivery' && order.woltDeliveryInfo && order.woltDeliveryInfo.status !== 'Delivered') {
        confirmMessage = this.$i('ongoing_confirmCompleteNotDelivered', { orderId: order.friendlyOrderId })
      } else if (order.deliveryType === 'DineHomeDelivery' && order.dineHomeStatus !== 'Completed') {
        confirmMessage = this.$i('ongoing_confirmCompleteNotDelivered', { orderId: order.friendlyOrderId })
      }
      if (!confirm(confirmMessage)) { return }
      this._orderService
        .UpdateStatus(order.id, 'Completed')
        .then(() => this.refresh())
        .catch((error) => {
          alert(this.$i('ongoing_errorComplete', { error: error.message || this.$i('ongoing_unknownError') }))
        })
    },
    cancelOrder (order) {
      if (!order) { return }
      const confirmed = confirm(this.$i('ongoing_confirmCancel', { storeName: order.storeLegalName, orderId: order.friendlyOrderId }))
      if (!confirmed) { return }
      this._orderService
        .UpdateStatus(order.id, 'Canceled')
        .then(() => this.refresh())
        .catch((error) => {
          alert(this.$i('ongoing_errorCancel', { error: error.message || this.$i('ongoing_unknownError') }))
        })
    },
    transferOrder (order) {
      if (!order || this.adminStores.length <= 1) { return }
      this.currentOrder = order
      this.showTransferModal = true
    },
    closeTransferModal (success) {
      this.showTransferModal = false
      if (success) { this.refresh() }
      this.currentOrder = null
    },
    changeDeliveryType (order) {
      if (!order) { return }
      this.currentOrder = order
      this.showChangeDeliveryModal = true
    },
    closeChangeDeliveryModal (success) {
      this.showChangeDeliveryModal = false
      if (success) { this.refresh() }
      this.currentOrder = null
    },
    openReceipt (order) {
      this.currentOrder = order
      this.showReceiptModal = true
    },
    closeReceiptModal () {
      this.showReceiptModal = false
      this.currentOrder = null
    },
    openSmsDriver (order) {
      this.currentOrder = order
      this.showSmsDriverModal = true
    },
    closeSmsDriverModal () {
      this.showSmsDriverModal = false
      this.currentOrder = null
    },
    onSmsSuccess () {
      this.refresh()
    },
    openCustomerModal (order) {
      if (!order || !order.userId || !order.storeId) { return }
      this.currentOrder = order
      this.showCustomerModal = true
    },
    closeCustomerModal () {
      this.showCustomerModal = false
      this.currentOrder = null
    },
    completeAll () {
      if (!this.hasReadyOnline) { return }
      const confirmed = confirm(this.$i('kds_confirmCompleteAll', { storeName: this.currentStoreName }))
      if (!confirmed) { return }
      this._orderService
        .CompleteAll(this.selectedStore)
        .then(() => this.refresh())
        .catch((error) => {
          alert(this.$i('ongoing_errorComplete', { error: error.message || this.$i('ongoing_unknownError') }))
        })
    },
    closeLoginModal (isLoggedIn) {
      this.showLogin = !isLoggedIn
      if (isLoggedIn) {
        this.isLoading = true
        this.refresh()
        this.startAutoRefresh()
      }
    },
    toggleDark () {
      this.darkMode = !this.darkMode
      localStorage.setItem('kdsDarkMode', this.darkMode ? '1' : '0')
    },
    toggleFullscreen () {
      const el = this.$refs.kdsBoard
      if (!document.fullscreenElement) {
        if (el && el.requestFullscreen) { el.requestFullscreen() }
      } else if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    },
    onFullscreenChange () {
      this.isFullscreen = !!document.fullscreenElement
    }
  }
}
</script>

<style lang="scss">
@import '../../assets/sass/kds';
</style>
