<template>
  <section class="growth-standing">
    <header class="growth-standing__head">
      <h2 class="growth-standing__title">
        {{ $i('growth_standing_title') }}
      </h2>
      <p class="growth-standing__intro">
        {{ $i('growth_standing_intro') }}
      </p>
    </header>

    <!-- The read failed. This is NOT "no consents": it is the absence of an answer, and it is said
         in those words rather than shown as an empty table. Every figure below stays a dash. -->
    <p v-if="isUnknown" class="growth-standing__unknown">
      {{ $i('growth_standing_unknown') }}
    </p>

    <dl class="growth-standing__figures">
      <div class="growth-standing__figure">
        <dt>{{ $i('growth_standing_consented') }}</dt>
        <dd :class="{ 'is-unknown': standing.consented === null }">
          {{ figure(standing.consented) }}
        </dd>
      </div>
      <div class="growth-standing__figure">
        <dt>{{ $i('growth_standing_withdrawn') }}</dt>
        <dd :class="{ 'is-unknown': standing.withdrawn === null }">
          {{ figure(standing.withdrawn) }}
        </dd>
      </div>
      <div class="growth-standing__figure">
        <dt>{{ $i('growth_standing_suppressed') }}</dt>
        <dd :class="{ 'is-unknown': standing.suppressed === null }">
          {{ figure(standing.suppressed) }}
        </dd>
      </div>
      <div class="growth-standing__figure">
        <dt>{{ $i('growth_standing_pending') }}</dt>
        <dd :class="{ 'is-unknown': standing.pendingInvites === null }">
          {{ figure(standing.pendingInvites) }}
        </dd>
      </div>
    </dl>

    <div v-if="!isUnknown" class="growth-standing__reasons">
      <h3 class="growth-standing__subtitle">
        {{ $i('growth_standing_reasons') }}
      </h3>
      <p v-if="!standing.reasons.length" class="growth-standing__none">
        {{ $i('growth_standing_no_suppressions') }}
      </p>
      <ul v-else class="growth-standing__list">
        <li v-for="entry in standing.reasons" :key="entry.reason">
          <span class="growth-standing__reason">{{ entry.reason }}</span>
          <span class="growth-standing__count">{{ figure(entry.count) }}</span>
        </li>
      </ul>
      <!-- The reasons are reported as the backend gave them and are NOT annotated with how far each
           suppression reaches. Unsubscribe writes a store-scoped suppression while erasure writes a
           channel-global one, and whether a venue is an independent controller is an open ruling.
           Saying "these guests are blocked everywhere" or "only here" would pre-empt it. -->
      <p class="growth-standing__note">
        {{ $i('growth_standing_scope_note') }}
      </p>
    </div>

    <!-- The one thing this panel must never become. There is no admin path to grant consent on a
         guest's behalf anywhere in the backend, so there is no control here that could look like one. -->
    <p class="growth-standing__note">
      {{ $i('growth_standing_no_grant_note') }}
    </p>
  </section>
</template>

<script>
import { UNKNOWN } from '~/utils/growth/send-gate';

/**
 * The store's consent standing (#8) — aggregate counts only, never a contact list.
 *
 * Purely presentational: it owns no fetching and computes nothing. The `standing` prop is the
 * output of `readConsentStanding`, which has already drawn the line between "unknown" and "zero";
 * this component's only job is to keep that line visible.
 *
 * THESE FIGURES ARE NOT AN AUDIENCE. `consented` is a live count that applies neither verification
 * gating nor the rolling frequency cap. The recipient count lives on the audience panel, and comes
 * only from a computed snapshot.
 */
export default {
  name: 'GrowthConsentStanding',
  props: {
    /** The `readConsentStanding` projection. Its nulls are meaningful and are rendered as dashes. */
    standing: { type: Object, required: true }
  },
  data () {
    return { unknownMark: '—' };
  },
  computed: {
    isUnknown () {
      return this.standing.state === UNKNOWN;
    }
  },
  methods: {
    // Null in, dash out. A null count must never print as 0 — "we could not read consent" and
    // "nobody has consented" are different sentences, and only one of them is a reason to stop.
    figure (value) {
      return value === null || value === undefined ? this.unknownMark : String(value);
    }
  }
};
</script>

<style scoped>
.growth-standing { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #fff; }
.growth-standing__head { margin-bottom: 16px; }
.growth-standing__title { font-size: 16px; font-weight: 600; color: #292c34; margin: 0 0 4px; }
.growth-standing__intro { font-size: 13px; color: #64748b; margin: 0; }
.growth-standing__unknown { font-size: 13px; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 12px; margin: 0 0 16px; }
.growth-standing__figures { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 0 0 16px; }
.growth-standing__figure { border: 1px solid #f1f5f9; border-radius: 8px; padding: 12px; background: #f8f9fa; }
.growth-standing__figure dt { font-size: 12px; color: #64748b; margin-bottom: 6px; }
.growth-standing__figure dd { font-size: 22px; font-weight: 600; color: #292c34; margin: 0; }
.growth-standing__figure dd.is-unknown { color: #94a3b8; font-weight: 400; }
.growth-standing__subtitle { font-size: 13px; font-weight: 600; color: #292c34; margin: 0 0 8px; }
.growth-standing__none { font-size: 13px; color: #64748b; margin: 0 0 8px; }
.growth-standing__list { list-style: none; margin: 0 0 8px; padding: 0; }
.growth-standing__list li { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
.growth-standing__reason { color: #292c34; }
.growth-standing__count { color: #64748b; font-variant-numeric: tabular-nums; }
.growth-standing__note { font-size: 12px; color: #64748b; margin: 8px 0 0; line-height: 1.5; }
</style>
