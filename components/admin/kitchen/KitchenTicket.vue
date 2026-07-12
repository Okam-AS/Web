<template>
  <div
    class="kds-ticket"
    :class="ticketClass"
  >
    <!-- Header: source, table/order id, guests / delivery, live age timer -->
    <div class="kds-ticket__header">
      <span
        class="kds-ticket__source"
        :class="{ 'is-table': !isOnline }"
      >
        <span class="material-icons">{{ sourceIcon }}</span>
      </span>

      <div class="kds-ticket__idbox">
        <div class="kds-ticket__table">
          {{ primaryTitle }}
        </div>
        <div class="kds-ticket__meta">
          <span v-if="secondaryTitle">{{ secondaryTitle }}</span>
          <span v-if="!isOnline && ticket.couverts">
            <span class="material-icons">people</span>{{ $i('kds_guests', { count: ticket.couverts }) }}
          </span>
          <span v-if="isOnline">{{ deliveryTypeLabel(ticket.deliveryType) }}</span>
          <span v-if="isOnline && statusText">· {{ statusText }}</span>
          <span v-if="multiStore && storeName">· {{ storeName }}</span>
        </div>
      </div>

      <span
        class="kds-timer"
        :class="timerClass"
      >
        <span class="material-icons">schedule</span>{{ timerText }}
      </span>
    </div>

    <!-- Kitchen / table message -->
    <div
      v-if="ticket.comment"
      class="kds-ticket__comment"
    >
      <span class="material-icons">chat</span>
      <span>{{ ticket.comment }}</span>
    </div>

    <!-- Customer (online only) -->
    <div
      v-if="isOnline && customerName"
      class="kds-ticket__customer"
      @click="$emit('open-customer', ticket.order)"
    >
      <span class="material-icons">person</span>
      <span>{{ customerName }}</span>
      <span class="material-icons kds-ticket__customer-chevron">chevron_right</span>
    </div>

    <!-- Lines, grouped into courses -->
    <div class="kds-ticket__body">
      <CourseSection
        v-for="group in courseGroups"
        :key="group.key"
        :course-sequence="group.courseSequence"
        :lines="group.lines"
        :interactive="!isOnline"
        :show-header="showCourseHeaders"
        @bump-course="$emit('bump-course', $event)"
        @bump-line="$emit('bump-line', $event)"
        @recall-line="$emit('recall-line', $event)"
      />
      <div
        v-if="!courseGroups.length"
        class="kds-line"
      >
        <div class="kds-line__main">
          <div class="kds-line__name">
            {{ $i('kds_noKitchenLines') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Online: expandable fulfilment actions -->
    <div
      v-if="isOnline && showActions"
      class="kds-actions"
    >
      <button
        v-if="multiStore"
        class="kds-actions__btn"
        @click="$emit('transfer', ticket.order)"
      >
        <span class="material-icons">swap_horiz</span>{{ $i('orderCard_transfer') }}
      </button>
      <button
        class="kds-actions__btn"
        @click="$emit('change-delivery', ticket.order)"
      >
        <span class="material-icons">edit</span>{{ $i('orderCard_changeDeliveryType') }}
      </button>
      <button
        v-if="ticket.deliveryType === 'InstantHomeDelivery'"
        class="kds-actions__btn"
        @click="$emit('sms-driver', ticket.order)"
      >
        <span class="material-icons">sms</span>{{ $i('orderCard_smsDriver') }}
      </button>
      <button
        class="kds-actions__btn"
        @click="$emit('receipt', ticket.order)"
      >
        <span class="material-icons">receipt</span>{{ $i('orderCard_receipt') }}
      </button>
      <button
        class="kds-actions__btn is-danger"
        @click="$emit('cancel', ticket.order)"
      >
        <span class="material-icons">block</span>{{ $i('orderCard_cancel') }}
      </button>
    </div>

    <!-- Footer actions -->
    <div class="kds-ticket__footer">
      <template v-if="isOnline">
        <button
          v-if="primaryLabel"
          class="kds-btn kds-btn--primary"
          @click="$emit('primary-action', ticket.order)"
        >
          <span class="material-icons">{{ primaryIcon }}</span>{{ primaryLabel }}
        </button>
        <button
          class="kds-btn kds-btn--ghost"
          :title="$i('kds_moreActions')"
          @click="showActions = !showActions"
        >
          <span class="material-icons">{{ showActions ? 'expand_less' : 'more_horiz' }}</span>
        </button>
      </template>
      <template v-else>
        <button
          class="kds-btn kds-btn--bump"
          :disabled="!ticketBumpable"
          @click="$emit('bump-ticket')"
        >
          <span class="material-icons">done_all</span>{{ $i('kds_bumpTicket') }}
        </button>
      </template>
    </div>
  </div>
</template>

<script>
import CourseSection from '~/components/admin/kitchen/CourseSection.vue'

const READY_STATUSES = ['ReadyForPickup', 'ReadyForDriver', 'DriverPickedUp', 'Served']

export default {
  components: { CourseSection },
  props: {
    ticket: {
      type: Object,
      required: true
    },
    // A shared, per-second ticking clock so every timer escalates without waiting for a poll.
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
  data: () => ({
    showActions: false
  }),
  computed: {
    isOnline () {
      return this.ticket.kind === 'online'
    },
    order () {
      return this.ticket.order || {}
    },
    ageSeconds () {
      if (!this.ticket.createdAt) { return 0 }
      const created = new Date(this.ticket.createdAt).getTime()
      return Math.max(0, Math.floor((this.now - created) / 1000))
    },
    ageMinutes () {
      return this.ageSeconds / 60
    },
    ageLevel () {
      if (this.ageMinutes >= this.redMinutes) { return 'red' }
      if (this.ageMinutes >= this.amberMinutes) { return 'amber' }
      return 'green'
    },
    timerClass () {
      return { 'is-amber': this.ageLevel === 'amber', 'is-red': this.ageLevel === 'red' }
    },
    timerText () {
      const total = this.ageSeconds
      const m = Math.floor(total / 60)
      const s = total % 60
      if (m >= 60) {
        const h = Math.floor(m / 60)
        return h + ':' + String(m % 60).padStart(2, '0')
      }
      return m + ':' + String(s).padStart(2, '0')
    },
    isRunnable () {
      // A whole POS ticket is ready to run when its least-advanced line is Ready.
      return !this.isOnline && this.ticket.overallStatus === 'Ready'
    },
    ticketClass () {
      return [
        {
          'is-online': this.isOnline,
          'is-age-amber': this.ageLevel === 'amber',
          'is-age-red': this.ageLevel === 'red',
          'is-runnable': this.isRunnable
        }
      ]
    },
    sourceIcon () {
      if (!this.isOnline) { return 'table_restaurant' }
      const dt = this.ticket.deliveryType
      if (dt === 'InstantHomeDelivery' || dt === 'DineHomeDelivery' || dt === 'WoltDelivery') {
        return 'delivery_dining'
      }
      if (dt === 'SelfPickup') { return 'shopping_bag' }
      if (dt === 'TableDelivery') { return 'deck' }
      return 'receipt_long'
    },
    primaryTitle () {
      if (!this.isOnline) {
        return this.ticket.tableName || ('#' + this.ticket.friendlyId)
      }
      return '#' + this.ticket.friendlyId
    },
    secondaryTitle () {
      if (!this.isOnline && this.ticket.tableName) {
        return '#' + this.ticket.friendlyId
      }
      return ''
    },
    storeName () {
      return this.order.storeLegalName || ''
    },
    statusText () {
      return this.ticket.status ? this.orderStatusLabel(this.ticket.status) : ''
    },
    customerName () {
      const o = this.order
      if (o.userFullName) { return o.userFullName }
      if (o.user && o.user.phoneNumber && o.user.phoneNumber !== '+4799999999') {
        return o.user.phoneNumber
      }
      return ''
    },
    courseGroups () {
      const groups = []
      const map = {}
      const lines = this.ticket.lines || []
      for (const line of lines) {
        const key = line.courseSequence == null ? 'none' : String(line.courseSequence)
        if (!map[key]) {
          map[key] = { key, courseSequence: line.courseSequence == null ? null : line.courseSequence, lines: [] }
          groups.push(map[key])
        }
        map[key].lines.push(line)
      }
      groups.sort((a, b) => {
        const av = a.courseSequence == null ? Number.MAX_SAFE_INTEGER : a.courseSequence
        const bv = b.courseSequence == null ? Number.MAX_SAFE_INTEGER : b.courseSequence
        return av - bv
      })
      return groups
    },
    showCourseHeaders () {
      if (this.isOnline) { return false }
      if (this.courseGroups.length > 1) { return true }
      return this.courseGroups.length === 1 && this.courseGroups[0].courseSequence != null
    },
    ticketBumpable () {
      return (this.ticket.lines || []).some(l => l.status === 'Sent' || l.status === 'Fired')
    },
    primaryLabel () {
      if (!this.isOnline) { return '' }
      const status = this.ticket.status
      if (status === 'Accepted' || status === 'Processing') {
        return this.$i('ongoing_actionNext')
      }
      if (READY_STATUSES.includes(status)) {
        return this.$i('ongoing_actionComplete')
      }
      return ''
    },
    primaryIcon () {
      const status = this.ticket.status
      if (status === 'Accepted') { return 'play_arrow' }
      if (status === 'Processing') { return 'check_circle' }
      return 'done_all'
    }
  }
}
</script>
