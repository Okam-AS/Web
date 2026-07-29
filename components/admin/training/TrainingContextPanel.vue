<template>
  <section class="trn-context">
    <h2 class="trn-context__title">
      {{ $i('trn_context_title') }}
    </h2>

    <dl class="trn-context__facts">
      <div class="trn-context__fact">
        <dt>{{ $i('trn_context_zone') }}</dt>
        <dd data-test="context-zone">
          {{ zoneId || dash }}
          <span v-if="zoneIsFallback" class="trn-flag" data-test="context-zone-fallback">{{ $i('trn_context_zone_fallback') }}</span>
        </dd>
      </div>
      <div class="trn-context__fact">
        <dt>{{ $i('trn_context_capabilities') }}</dt>
        <dd data-test="context-capabilities">
          {{ capabilities.length ? capabilities.join(', ') : dash }}
        </dd>
      </div>
      <div class="trn-context__fact">
        <dt>{{ $i('trn_context_seam') }}</dt>
        <dd data-test="context-seam">
          {{ seamLabel }}
        </dd>
      </div>
    </dl>

    <h3 class="trn-context__sub">
      {{ $i('trn_flags_title') }}
    </h3>
    <ul class="trn-context__flags" data-test="context-flags">
      <li v-for="flag in flagRows" :key="flag.name" class="trn-context__flag">
        <span class="trn-context__flag-name">{{ flagLabel(flag.name) }}</span>
        <span class="trn-badge" :class="flagTone(flag.state)" :data-test="'flag-' + flag.name">
          {{ flagStateLabel(flag.state) }}
        </span>
      </li>
    </ul>
    <p class="trn-form__hint">
      {{ $i('trn_flags_note') }}
    </p>
  </section>
</template>

<script>
import { flagState, zoneIdOf, zoneIsFallback } from '~/utils/training/journey';

/**
 * What `GET /context` said, rendered rather than inferred.
 *
 * The endpoint exists precisely so a client never guesses four things — the caller's capabilities,
 * the store's timezone, the whole `training.*` flag family, and whether the competency seam is bound
 * — and this panel's only job is to show all four as the server reported them.
 *
 * THE FLAG LIST IS THE SERVER'S, NOT A HARD-CODED ONE. It is rendered off the keys the response
 * carries, in the order the server sent them, so a flag added to the family upstream appears here
 * without this file changing and a flag the server did not report is visibly absent instead of
 * silently defaulting to "off". A flag whose value is not a boolean renders UNKNOWN, never OFF: "we
 * did not hear" and "the operator has not switched it on" are different sentences and only one of
 * them is a venue's problem.
 */
export default {
  name: 'TrainingContextPanel',
  props: {
    /** The `GET /context` document, or null while unknown. */
    context: { type: Object, default: null }
  },
  computed: {
    dash () { return '—'; },
    zoneId () { return zoneIdOf(this.context); },
    zoneIsFallback () { return zoneIsFallback(this.context); },
    capabilities () {
      const list = this.context && this.context.capabilities;
      return Array.isArray(list) ? list : [];
    },
    /**
     * Three-valued, like every other flag on this surface: the server reports it as a boolean, and
     * anything else means the read did not answer rather than that the seam is unbound.
     */
    seamLabel () {
      const bound = this.context && this.context.competencySeamBound;
      if (bound === true) { return this.$i('trn_seam_bound'); }
      if (bound === false) { return this.$i('trn_seam_unbound'); }
      return this.$i('trn_flag_unknown');
    },
    flagRows () {
      const flags = this.context && this.context.featureFlags;
      if (!flags || typeof flags !== 'object') { return []; }
      return Object.keys(flags).map(name => ({ name, state: flagState(this.context, name) }));
    }
  },
  methods: {
    /** A known flag gets its own sentence; an unrecognised one is shown by its wire name, not hidden. */
    flagLabel (name) {
      const key = {
        'training.setup': 'trn_flag_setup',
        'training.assignments': 'trn_flag_assignments',
        'training.onboarding': 'trn_flag_onboarding',
        'training.checklists': 'trn_flag_checklists',
        'training.deviations': 'trn_flag_deviations',
        'training.competency-seam': 'trn_flag_competency_seam',
        'training.reminders': 'trn_flag_reminders'
      }[name];
      return key ? this.$i(key) : name;
    },
    flagStateLabel (state) {
      if (state === true) { return this.$i('trn_flag_on'); }
      if (state === false) { return this.$i('trn_flag_off'); }
      return this.$i('trn_flag_unknown');
    },
    flagTone (state) {
      if (state === true) { return 'trn-badge--on'; }
      if (state === false) { return 'trn-badge--off'; }
      return '';
    }
  }
};
</script>

<style lang="scss" scoped>
@import './training-panel';

.trn-context__title {
  @extend %trn-panel-title;
}

.trn-context__sub {
  font-size: 0.9em;
  font-weight: 600;
  color: #292c34;
  margin: 16px 0 8px;
}

.trn-context__facts {
  margin: 0;
}

.trn-context__fact {
  display: flex;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.9em;

  dt {
    color: #64748b;
    min-width: 180px;
  }

  dd {
    margin: 0;
    color: #292c34;
  }
}

.trn-context__flags {
  list-style: none;
  padding: 0;
  margin: 0 0 8px;
}

.trn-context__flag {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 0.9em;
  border-bottom: 1px solid #e2e8f0;
}

.trn-context__flag-name {
  color: #292c34;
}
</style>
