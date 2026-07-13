<!--
  Kitchen Display (KDS) — the kitchen's production board.

  This page answers exactly one question: "what does the kitchen make right now?". Everything
  order-logistics (accept with prep time, transfer, change delivery type, driver SMS, receipt,
  cancel, customer) lives on /admin/ongoing — each action has one home so the two screens never
  fight over the same order.

  One feed: _kitchenService.GetBoard(storeId). It carries both in-house POS table checks (per-line
  coursing with bump/recall) and online orders. Online orders are shown only once the counter has
  accepted them (Processing) — the kitchen cooks what is confirmed — and the kitchen's bump marks
  them ready (delivery-type-aware, handled server-side by BumpTicket, which also drives Wolt/push
  side effects). Ready online orders leave this board and are completed from /admin/ongoing.

  Timers key off createdAt: there is no per-line sent-at column yet (KitchenTicketModel.sentAt is
  always null) — a real sent-at is a later migration/UI pass.
-->
<template>
  <AdminPage full-width>
    <div
      ref="kdsBoard"
      class="kds-board"
    >
      <div class="kds-header">
        <div class="kds-header__titles">
          <h1>{{ $i('kds_title') }}</h1>
          <span
            v-if="currentStoreName"
            class="kds-header__store"
          >{{ currentStoreName }}</span>
        </div>

        <span class="kds-live">
          <span class="kds-live__dot" />{{ $i('kds_live') }}
        </span>

        <button
          class="kds-iconbtn"
          :title="$i('kds_fullscreen')"
          @click="toggleFullscreen"
        >
          <span class="material-icons">{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</span>
        </button>
      </div>

      <div
        v-if="isLoading"
        class="kds-loading"
      >
        <Loading :loading="true" />
      </div>

      <div
        v-else-if="!tickets.length"
        class="kds-empty"
      >
        <span class="material-icons">restaurant</span>
        <span>{{ $i('kds_emptyBoard') }}</span>
      </div>

      <div
        v-else
        class="kds-wall"
      >
        <KitchenTicket
          v-for="ticket in tickets"
          :key="ticket.orderId"
          :ticket="ticket"
          :now="now"
          :amber-minutes="amberMinutes"
          :red-minutes="redMinutes"
          @bump-line="(line) => onBumpLine(ticket, line)"
          @bump-course="(seq) => onBumpCourse(ticket, seq)"
          @bump-ticket="onBumpTicket(ticket)"
          @recall-line="(line) => onRecallLine(ticket, line)"
        />
      </div>

      <LoginModal
        v-if="showLogin"
        @close="closeLoginModal"
      />
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import Loading from '~/components/atoms/Loading.vue'
import LoginModal from '~/components/molecules/LoginModal.vue'
import KitchenTicket from '~/components/admin/kitchen/KitchenTicket.vue'

export default {
  components: { AdminPage, Loading, LoginModal, KitchenTicket },
  data: () => ({
    showLogin: false,
    isLoading: true,
    board: { tickets: [] },
    now: Date.now(),
    amberMinutes: 8,
    redMinutes: 15,
    refreshInterval: null,
    clockInterval: null,
    isRefreshing: false,
    isFullscreen: false
  }),
  computed: {
    adminStores () {
      return (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || []
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
    tickets () {
      // POS table checks always; an online order only once the counter has accepted it
      // (Processing). The backend sorts oldest-first — the kitchen works the longest wait first.
      return (this.board.tickets || [])
        .filter(t => t.source === 'PosTable' || t.status === 'Processing')
    }
  },
  watch: {
    selectedStore () {
      // Switching store: drop stale tickets and reload for the new kitchen.
      this.board = { tickets: [] }
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
    refresh () {
      const storeId = this.selectedStore
      if (!storeId || this.isRefreshing) { return Promise.resolve() }
      this.isRefreshing = true
      return this._kitchenService
        .GetBoard(storeId)
        .then(board => this.mergeBoard(board))
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
    // Every mutation returns the refreshed board. For an online ticket, BumpTicket transitions the
    // order to its delivery-type's ready status server-side — it then leaves this board and is
    // completed from /admin/ongoing.
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
    closeLoginModal (isLoggedIn) {
      this.showLogin = !isLoggedIn
      if (isLoggedIn) {
        this.isLoading = true
        this.refresh()
        this.startAutoRefresh()
      }
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
