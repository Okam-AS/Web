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
  <AdminPage full-width @login-success="startLiveBoard">
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
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import Loading from '~/components/atoms/Loading.vue'
import KitchenTicket from '~/components/admin/kitchen/KitchenTicket.vue'

export default {
  components: { AdminPage, Loading, KitchenTicket },
  data: () => ({
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
    // `AdminPage` raises the sign-in modal for a signed-out visitor and emits `login-success` when
    // one arrives; the board must not spin behind it in the meantime.
    if (!this.$store.getters.userIsLoggedIn) {
      this.isLoading = false
      return
    }
    this.startLiveBoard()
  },
  beforeDestroy () {
    this.stopLiveBoard()
  },
  methods: {
    // THE ONE STARTER LIST for this screen. `mounted` runs it for a cook who arrives already signed
    // in, and the shell's `login-success` runs the SAME one for a cook who signs in on the page —
    // because a signed-out visitor is not always bounced to /admin first: `AdminPage.initAuth`
    // skips the bounce when a `redirect` query is already present (AdminPage.vue:99), which is
    // exactly the post-login return path, so this page does render with the sign-in modal over it.
    // The page's own duplicate modal is gone; `AdminPage` owns the only one.
    //
    // It is one list rather than two so a starter added later cannot be added to only one path.
    // That is not hypothetical: the per-second clock below was started on page load and not on
    // sign-in, so `this.now` stayed frozen at the moment the screen was opened. `KitchenTicket`
    // ages a ticket as `now - createdAt` clamped at zero, so every ticket sent after the screen was
    // opened — which on a kitchen display is every ticket — read `0:00` for the rest of service and
    // never went amber or red. The board looked alive; the timers on it were furniture.
    startLiveBoard () {
      this.isLoading = true
      this.refresh()
      this.startAutoRefresh()
      this.startClock()
      document.addEventListener('fullscreenchange', this.onFullscreenChange)
    },
    // The exact inverse, and the reason both starters below clear before they set: `beforeDestroy`
    // holds ONE handle per interval, so a second interval started over the top of the first is one
    // this page can never stop. It would keep polling and keep writing `now` after the screen is
    // gone.
    stopLiveBoard () {
      this.stopAutoRefresh()
      this.stopClock()
      document.removeEventListener('fullscreenchange', this.onFullscreenChange)
    },
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
      this.stopAutoRefresh()
      this.refreshInterval = setInterval(this.refresh, 5000)
    },
    stopAutoRefresh () {
      if (this.refreshInterval) { clearInterval(this.refreshInterval) }
      this.refreshInterval = null
    },
    // The ticking clock every ticket age is measured against. Nothing else writes `now`, so if this
    // is not running the whole wall of timers is frozen at whatever `data()` set on page load.
    startClock () {
      this.stopClock()
      this.clockInterval = setInterval(() => { this.now = Date.now() }, 1000)
    },
    stopClock () {
      if (this.clockInterval) { clearInterval(this.clockInterval) }
      this.clockInterval = null
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
