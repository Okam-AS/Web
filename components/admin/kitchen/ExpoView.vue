<template>
  <div class="kds-expo">
    <div
      v-for="ticket in tickets"
      :key="ticket.key"
      class="kds-expo__row"
      :class="rowClass(ticket)"
    >
      <span
        class="kds-expo__source"
        :class="{ 'is-table': ticket.kind !== 'online' }"
      >
        <span class="material-icons">{{ sourceIcon(ticket) }}</span>
      </span>

      <div class="kds-expo__id">
        <div class="kds-expo__table">
          {{ title(ticket) }}
        </div>
        <div class="kds-expo__sub">
          {{ subtitle(ticket) }}
        </div>
      </div>

      <div class="kds-expo__progress">
        <div class="kds-expo__bar">
          <div
            class="kds-expo__fill"
            :style="{ width: progressPct(ticket) + '%' }"
          />
        </div>
        <div class="kds-expo__count">
          {{ countText(ticket) }}
        </div>
      </div>

      <span
        class="kds-expo__state"
        :class="{ 'is-ready': runnable(ticket) }"
      >
        <span class="material-icons">{{ runnable(ticket) ? 'room_service' : 'local_fire_department' }}</span>
        {{ runnable(ticket) ? $i('kds_readyToRun') : $i('kds_cooking') }}
      </span>

      <button
        v-if="ticket.kind === 'online' && primaryLabel(ticket)"
        class="kds-expo__run"
        @click="$emit('primary', ticket.order)"
      >
        {{ primaryLabel(ticket) }}
      </button>
      <button
        v-else-if="ticket.kind !== 'online' && ticketBumpable(ticket)"
        class="kds-expo__run"
        @click="$emit('bump-ticket', ticket)"
      >
        {{ $i('kds_bumpTicket') }}
      </button>
    </div>

    <div
      v-if="!tickets.length"
      class="kds-empty"
    >
      <span class="material-icons">restaurant</span>
      <span>{{ $i('kds_emptyBoard') }}</span>
    </div>
  </div>
</template>

<script>
const READY_STATUSES = ['ReadyForPickup', 'ReadyForDriver', 'DriverPickedUp', 'Served']

export default {
  props: {
    tickets: {
      type: Array,
      default: () => []
    },
    now: {
      type: Number,
      default: () => Date.now()
    },
    amberMinutes: {
      type: Number,
      default: 8
    },
    redMinutes: {
      type: Number,
      default: 15
    },
    multiStore: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    ageLevel (t) {
      if (!t.createdAt) { return 'green' }
      const minutes = (this.now - new Date(t.createdAt).getTime()) / 60000
      if (minutes >= this.redMinutes) { return 'red' }
      if (minutes >= this.amberMinutes) { return 'amber' }
      return 'green'
    },
    runnable (t) {
      if (t.kind === 'online') { return READY_STATUSES.includes(t.status) }
      return t.overallStatus === 'Ready'
    },
    rowClass (t) {
      const level = this.ageLevel(t)
      return {
        'is-age-amber': level === 'amber',
        'is-age-red': level === 'red',
        'is-runnable': this.runnable(t)
      }
    },
    sourceIcon (t) {
      if (t.kind !== 'online') { return 'table_restaurant' }
      const dt = t.deliveryType
      if (dt === 'InstantHomeDelivery' || dt === 'DineHomeDelivery' || dt === 'WoltDelivery') {
        return 'delivery_dining'
      }
      if (dt === 'SelfPickup') { return 'shopping_bag' }
      if (dt === 'TableDelivery') { return 'deck' }
      return 'receipt_long'
    },
    title (t) {
      if (t.kind !== 'online') { return t.tableName || ('#' + t.friendlyId) }
      return '#' + t.friendlyId
    },
    subtitle (t) {
      const parts = []
      if (t.kind === 'online') {
        parts.push(this.deliveryTypeLabel(t.deliveryType))
        if (this.multiStore && t.order && t.order.storeLegalName) { parts.push(t.order.storeLegalName) }
      } else {
        if (t.couverts) { parts.push(this.$i('kds_guests', { count: t.couverts })) }
        if (t.tableName) { parts.push('#' + t.friendlyId) }
      }
      return parts.join(' · ')
    },
    readyCount (t) {
      return (t.lines || []).filter(l => l.status === 'Ready' || l.status === 'Served').length
    },
    totalLines (t) {
      return (t.lines || []).length
    },
    progressPct (t) {
      if (t.kind === 'online') {
        if (READY_STATUSES.includes(t.status)) { return 100 }
        if (t.status === 'Processing') { return 50 }
        return 10
      }
      const total = this.totalLines(t)
      if (!total) { return 0 }
      return Math.round((this.readyCount(t) / total) * 100)
    },
    countText (t) {
      if (t.kind === 'online') {
        return t.status ? this.orderStatusLabel(t.status) : ''
      }
      return this.$i('kds_readyOfTotal', { ready: this.readyCount(t), total: this.totalLines(t) })
    },
    ticketBumpable (t) {
      return (t.lines || []).some(l => l.status === 'Sent' || l.status === 'Fired')
    },
    primaryLabel (t) {
      if (t.kind !== 'online') { return '' }
      if (t.status === 'Accepted' || t.status === 'Processing') { return this.$i('ongoing_actionNext') }
      if (READY_STATUSES.includes(t.status)) { return this.$i('ongoing_actionComplete') }
      return ''
    }
  }
}
</script>
