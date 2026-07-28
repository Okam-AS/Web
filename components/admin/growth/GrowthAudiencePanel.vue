<template>
  <section class="growth-audience">
    <header class="growth-audience__head">
      <div>
        <h2 class="growth-audience__title">
          {{ $i('growth_audience_title') }}
        </h2>
        <p class="growth-audience__intro">
          {{ $i('growth_audience_intro') }}
        </p>
      </div>
      <button
        type="button"
        class="growth-audience__btn"
        :disabled="busy"
        @click="$emit('compute')"
      >
        {{ busy ? $i('growth_audience_computing') : $i('growth_audience_compute') }}
      </button>
    </header>

    <!-- No snapshot has been computed (or the compute failed). NOTHING numeric is drawn here: an
         audience size that is wrong in the permissive direction is a lawful-basis breach, so the
         panel shows no figure at all rather than one an operator could act on. -->
    <p v-if="isUnknown" class="growth-audience__unknown">
      {{ $i('growth_audience_none') }}
    </p>

    <template v-else>
      <dl class="growth-audience__figures">
        <div class="growth-audience__figure growth-audience__figure--primary">
          <dt>{{ $i('growth_audience_included') }}</dt>
          <dd :class="{ 'is-unknown': audience.includedCount === null }">
            {{ figure(audience.includedCount) }}
          </dd>
        </div>
        <div class="growth-audience__figure">
          <dt>{{ $i('growth_audience_excluded') }}</dt>
          <dd :class="{ 'is-unknown': audience.excludedCount === null }">
            {{ figure(audience.excludedCount) }}
          </dd>
        </div>
      </dl>

      <div v-if="audience.exclusions.length" class="growth-audience__exclusions">
        <h3 class="growth-audience__subtitle">
          {{ $i('growth_audience_exclusions') }}
        </h3>
        <ul class="growth-audience__list">
          <li v-for="entry in audience.exclusions" :key="entry.reason">
            <span class="growth-audience__reason">{{ entry.reason }}</span>
            <span class="growth-audience__count">{{ figure(entry.count) }}</span>
          </li>
        </ul>
      </div>

      <dl class="growth-audience__meta">
        <div>
          <dt>{{ $i('growth_audience_computed_at') }}</dt>
          <dd>{{ stamp(audience.computedAt) }}</dd>
        </div>
        <div>
          <dt>{{ $i('growth_audience_watermark') }}</dt>
          <dd class="growth-audience__hash">
            {{ audience.watermarkHash || unknownMark }}
          </dd>
        </div>
      </dl>

      <p class="growth-audience__note">
        {{ $i('growth_audience_immutable_note') }}
      </p>
    </template>
  </section>
</template>

<script>
import { UNKNOWN } from '~/utils/growth/send-gate';

/**
 * The immutable segment snapshot (#10/#11) — the ONLY lawful source of a recipient count.
 *
 * Membership was decided by the same eligibility authority the dispatcher re-checks against, so the
 * figure here and the figure the send actually reads cannot drift apart. That is why the number
 * lives on this panel and not on the consent-standing one.
 *
 * `excludedCount` and its reason breakdown are shown deliberately: an operator who sees only the
 * included figure cannot tell a healthy audience from one that has quietly collapsed because most
 * of the list is suppressed or unverified.
 */
export default {
  name: 'GrowthAudiencePanel',
  props: {
    /** The `readAudience` projection. Its nulls are meaningful and render as dashes. */
    audience: { type: Object, required: true },
    /** A compute is in flight; the button is disabled but no figure changes. */
    busy: { type: Boolean, default: false },
    /** BCP-47 tag for the computed-at stamp. */
    locale: { type: String, default: 'nb-NO' }
  },
  data () {
    return { unknownMark: '—' };
  },
  computed: {
    isUnknown () {
      return this.audience.state === UNKNOWN;
    }
  },
  methods: {
    figure (value) {
      return value === null || value === undefined ? this.unknownMark : String(value);
    },
    // The Date arrived through `parseApiInstant`, so a bare wire stamp was read as UTC rather than
    // as the viewer's local time. Formatting it back out in the viewer's zone is correct — what
    // must not happen is the PARSE treating a bare stamp as local, which would move the instant.
    stamp (value) {
      if (!value) { return this.unknownMark; }
      return new Intl.DateTimeFormat(this.locale, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }).format(value);
    }
  }
};
</script>

<style scoped>
.growth-audience { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #fff; }
.growth-audience__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.growth-audience__title { font-size: 16px; font-weight: 600; color: #292c34; margin: 0 0 4px; }
.growth-audience__intro { font-size: 13px; color: #64748b; margin: 0; max-width: 46ch; }
.growth-audience__btn { border: 1px solid #cbd5e0; border-radius: 8px; background: #fff; color: #292c34; padding: 8px 14px; font-size: 13px; cursor: pointer; white-space: nowrap; }
.growth-audience__btn:disabled { color: #94a3b8; cursor: default; }
.growth-audience__unknown { font-size: 13px; color: #64748b; background: #f8f9fa; border: 1px dashed #cbd5e0; border-radius: 8px; padding: 12px; margin: 0; }
.growth-audience__figures { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 0 0 16px; }
.growth-audience__figure { border: 1px solid #f1f5f9; border-radius: 8px; padding: 12px; background: #f8f9fa; }
.growth-audience__figure--primary { background: #f0fdf4; border-color: #bbf7d0; }
.growth-audience__figure dt { font-size: 12px; color: #64748b; margin-bottom: 6px; }
.growth-audience__figure dd { font-size: 22px; font-weight: 600; color: #292c34; margin: 0; }
.growth-audience__figure dd.is-unknown { color: #94a3b8; font-weight: 400; }
.growth-audience__subtitle { font-size: 13px; font-weight: 600; color: #292c34; margin: 0 0 8px; }
.growth-audience__list { list-style: none; margin: 0 0 16px; padding: 0; }
.growth-audience__list li { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
.growth-audience__reason { color: #292c34; }
.growth-audience__count { color: #64748b; font-variant-numeric: tabular-nums; }
.growth-audience__meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 0 0 8px; }
.growth-audience__meta dt { font-size: 12px; color: #64748b; margin-bottom: 4px; }
.growth-audience__meta dd { font-size: 13px; color: #292c34; margin: 0; }
.growth-audience__hash { font-family: monospace; font-size: 11px; word-break: break-all; color: #64748b; }
.growth-audience__note { font-size: 12px; color: #64748b; margin: 8px 0 0; line-height: 1.5; }
</style>
