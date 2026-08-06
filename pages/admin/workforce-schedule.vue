<template>
  <AdminPage full-width @login-success="init">
    <div class="wf-page">
      <div class="wf-page__header">
        <h1 class="wf-page__title">
          {{ $i('wf_page_title') }}
        </h1>
        <p class="wf-page__intro">
          {{ $i('wf_page_intro') }}
        </p>
      </div>

      <transition name="wf-toast">
        <div v-if="toast.show" class="wf-page__toast" :class="'wf-page__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <div v-if="contextError" class="wf-page__blocker">
        {{ contextError }}
      </div>

      <template v-else>
        <div class="wf-page__controls">
          <!-- The stepper moves whatever scale is on screen. Week and month keep SEPARATE offsets,
               so stepping through a month and switching back does not silently move the week. -->
          <div v-if="!isMonth" class="wf-page__weeknav">
            <button class="wf-page__step" :disabled="loading" @click="stepWeek(-1)">
              ‹
            </button>
            <span class="wf-page__week">{{ weekLabel }}</span>
            <button class="wf-page__step" :disabled="loading" @click="stepWeek(1)">
              ›
            </button>
            <button class="wf-page__btn wf-page__btn--ghost" :disabled="loading || weekOffset === 0" @click="goToThisWeek">
              {{ $i('wf_this_week') }}
            </button>
          </div>
          <div v-else class="wf-page__weeknav">
            <button class="wf-page__step" :disabled="loading" @click="stepMonth(-1)">
              ‹
            </button>
            <span class="wf-page__week">{{ monthLabel }}</span>
            <button class="wf-page__step" :disabled="loading" @click="stepMonth(1)">
              ›
            </button>
            <button class="wf-page__btn wf-page__btn--ghost" :disabled="loading || monthOffset === 0" @click="goToThisMonth">
              {{ $i('wf_month_this_month') }}
            </button>
          </div>

          <!-- The same schedule, three ways. -->
          <div class="wf-page__views wf-page__views--pivot">
            <button
              v-for="option in pivotOptions"
              :key="option.key"
              class="wf-page__view"
              :class="{ 'is-active': pivot === option.key }"
              :disabled="loading"
              @click="setPivot(option.key)"
            >
              {{ option.label }}
            </button>
          </div>

          <div class="wf-page__views">
            <button
              v-for="option in viewOptions"
              :key="option.key"
              class="wf-page__view"
              :class="{ 'is-active': view === option.key }"
              :disabled="loading"
              @click="setView(option.key)"
            >
              {{ option.label }}
            </button>
          </div>

          <div class="wf-page__actions">
            <label v-if="canCreateDraft" class="wf-page__copy">
              <input v-model="copyPreviousWeek" type="checkbox">
              {{ $i('wf_copy_previous') }}
            </label>
            <button v-if="canCreateDraft" class="wf-page__btn" :disabled="busy" @click="createDraft">
              {{ $i('wf_create_draft') }}
            </button>
            <button v-if="canValidate" class="wf-page__btn wf-page__btn--ghost" :disabled="busy" @click="validate">
              {{ $i('wf_validate') }}
            </button>
            <button v-if="canPublish" class="wf-page__btn" :disabled="busy" @click="publish">
              {{ $i('wf_publish') }}
            </button>
            <button class="wf-page__btn wf-page__btn--ghost" :disabled="loading" @click="reload">
              {{ $i('wf_reload') }}
            </button>
            <!-- The way OUT of the publish flow and into what the publish actually reached. The
                 toast beside it reports a recipient COUNT, which is how many outbox rows were
                 enqueued and not how many arrived; this is the only link on the surface that leads
                 to the difference. Always offered, not just after a publish: the outbox is
                 store-scoped and last week's dead letter is still undelivered today. -->
            <nuxt-link
              class="wf-page__btn wf-page__btn--ghost wf-page__btn--link"
              data-testid="wf-delivery-link"
              to="/admin/workforce-delivery"
            >
              {{ $i('wf_delivery_link') }}
            </nuxt-link>
          </div>
        </div>

        <!-- Revision, publication and timezone all belong to ONE revision. A month spans several, so
             the band is week-scale only rather than showing the state of an arbitrary one. -->
        <div v-if="!isMonth" class="wf-page__state">
          <span class="wf-page__badge" :class="'wf-page__badge--' + stateBadge.tone">{{ stateBadge.label }}</span>
          <span v-if="grid.revisionNumber !== null" class="wf-page__meta">{{ $i('wf_revision', { number: grid.revisionNumber }) }}</span>
          <span v-if="grid.publicationNumber !== null" class="wf-page__meta">{{ $i('wf_publication', { number: grid.publicationNumber }) }}</span>
          <span v-if="grid.timeZoneId" class="wf-page__meta">{{ $i('wf_timezone', { zone: grid.timeZoneId }) }}</span>
          <span v-if="grid.asOfUtc" class="wf-page__meta">{{ $i('wf_as_of', { time: formatDate(grid.asOfUtc) }) }}</span>
        </div>

        <!-- The double-booking guard is enforced server-side across every store the person is
             engaged in, so the only place it becomes visible is the typed 409 a mutation returns.
             It is surfaced verbatim: the same-store variant names the shift (and the grid marks it),
             the cross-store variant deliberately names nothing, and this says so rather than
             inventing a store. -->
        <div v-if="conflict && !(staleWrite && editor)" class="wf-page__conflict">
          <strong>{{ conflictHeadline }}</strong>
          <span>{{ conflictDetail }}</span>
          <!-- The one refusal on this surface an operator can act on WITHOUT calling anybody: the
               stage flag has a lever, and it is a page in this admin. The link is drawn only for
               that refusal, because every other conflict here is about the roster or a race and
               sending somebody to the switchboard for one would be a wrong instruction. -->
          <nuxt-link v-if="conflictFlag" class="wf-page__conflict-link" to="/admin/feature-flags">
            {{ $i('wf_conflict_flag_link') }}
          </nuxt-link>
        </div>

        <!-- The same guard, asked EARLY. Until this read existed the manager only met a cross-store
             double booking as the opaque 409 above, at publish, after the week was built. This says
             it while there is still something to do about it — and says it with the same opacity the
             refusal has: how many shifts collide and when, never which store the person is at. -->
        <div v-if="!isMonth && externalClashNotice" class="wf-page__notice wf-page__notice--warn">
          {{ externalClashNotice }}
        </div>

        <div v-if="!isMonth && stateNotice" class="wf-page__notice">
          {{ stateNotice }}
        </div>

        <!-- The role pivot re-groups the same week but is not an authoring surface: a shift belongs to
             a person and a day, and the role rows carry neither. Editing stays on the pivot that has
             both axes rather than being half-answered on one that has one.

             IT SITS ABOVE THE GRID CHAIN AND OUTSIDE IT. This notice used to be the `v-if` that HEADED
             the chain below, with the role grid as its `v-else-if` and the month grid as its `v-else`
             — which meant the week grid's own `v-if` stood alone and the month grid's `v-else` bound
             to THIS condition rather than to it. Two pivots rendered the wrong thing at once: the
             employees pivot drew the week grid AND the month grid (the latter fetching nothing and
             announcing that five weeks failed to load), and a scheduler on the roles pivot of an
             editable week got this sentence INSTEAD OF a schedule. Keeping the notice out of the
             chain is what makes it an addition to a pivot rather than a replacement for one. -->
        <p v-if="isRoles && canAuthorHere" class="wf-page__notice">
          {{ $i('wf_author_employees_only') }}
        </p>

        <!-- ONE chain, three pivots, exactly one grid on screen. Nothing may be inserted between these
             three elements: a `v-if` in the middle re-heads the chain and the `v-else` silently
             re-binds to it, which is the defect above.

             Only the employee pivot takes `currency`, because it is the only one that prints money.
             The role and month pivots are given none: the API totals cost per shift, per day and per
             range, never per role and never per month, and a pivot handed a formatter but no server
             figure is one refactor away from summing the chips itself. -->
        <WorkforceWeekGrid
          v-if="isEmployees"
          :grid="grid"
          :locale="locale"
          :currency="currency"
          :can-author="canAuthor"
          :busy="busy"
          @create="openCreate"
          @edit="openEdit"
          @move="moveShift"
        />
        <WorkforceRoleGrid v-else-if="isRoles" :grid="roleGrid" :locale="locale" />
        <WorkforceMonthGrid v-else :grid="monthGrid" :locale="locale" />

        <!-- The shift editor. It is the ONE place a shift is authored: the grid's plus button, a chip
             click and a drag all land here or go straight through it, so there is a single set of
             rules about what a shift is rather than one per affordance.

             It holds no money and computes none. The wage a shift costs is priced by the backend from
             effective-dated rates and comes back on the response; a figure invented here while the
             manager types would be a second, disagreeing source for the number in the footer. -->
        <section v-if="editor" class="wf-editor">
          <div class="wf-editor__head">
            <h2 class="wf-page__section-title">
              {{ editor.shiftAssignmentId ? $i('wf_edit_shift') : $i('wf_new_shift') }}
            </h2>
            <button class="wf-editor__close" :disabled="busy" @click="closeEditor">
              ✕
            </button>
          </div>

          <!-- A refused write, said in full. The manager's edit is still in the fields above it: the
               only way forward is to re-read the week and decide again, and that is a button they
               press rather than something that happens to them. -->
          <div v-if="staleWrite" class="wf-editor__stale">
            <strong>{{ $i('wf_stale_title') }}</strong>
            <span>{{ $i('wf_stale_detail') }}</span>
            <button class="wf-page__btn" :disabled="busy" @click="reloadAfterStale">
              {{ $i('wf_stale_reload') }}
            </button>
          </div>

          <div class="wf-editor__fields">
            <label class="wf-editor__field">
              <span class="wf-editor__label">{{ $i('wf_field_person') }}</span>
              <select v-model="editor.staffMemberId" :disabled="busy">
                <option :value="null">{{ $i('wf_open_option') }}</option>
                <option v-for="option in personOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="wf-editor__field">
              <span class="wf-editor__label">{{ $i('wf_field_role') }}</span>
              <select v-model="editor.roleId" :disabled="busy">
                <option :value="null">{{ $i('wf_role_none') }}</option>
                <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="wf-editor__field">
              <span class="wf-editor__label">{{ $i('wf_field_day') }}</span>
              <select v-model="editor.dayKey" :disabled="busy">
                <option v-for="day in dayOptions" :key="day.value" :value="day.value">
                  {{ day.label }}
                </option>
              </select>
            </label>

            <label class="wf-editor__field wf-editor__field--narrow">
              <span class="wf-editor__label">{{ $i('wf_field_start') }}</span>
              <input v-model="editor.start" type="time" :disabled="busy">
            </label>

            <label class="wf-editor__field wf-editor__field--narrow">
              <span class="wf-editor__label">{{ $i('wf_field_end') }}</span>
              <input v-model="editor.end" type="time" :disabled="busy">
            </label>

            <label class="wf-editor__field wf-editor__field--narrow">
              <span class="wf-editor__label">{{ $i('wf_field_unpaid_break') }}</span>
              <input v-model.number="editor.unpaidBreakMinutes" type="number" min="0" step="5" :disabled="busy">
            </label>

            <label class="wf-editor__field wf-editor__field--wide">
              <span class="wf-editor__label">{{ $i('wf_field_note') }}</span>
              <input v-model="editor.note" type="text" :disabled="busy">
            </label>
          </div>

          <p v-if="!rolesKnown" class="wf-editor__hint">
            {{ $i('wf_editor_roles_unknown') }}
          </p>
          <!-- An overnight shift keeps the DAY it was placed on: the backend takes the business date
               from the submitted start, so a 22:00–02:00 close belongs to the evening it began. -->
          <p v-if="editorCrossesMidnight" class="wf-editor__hint">
            {{ $i('wf_overnight_hint') }}
          </p>

          <div class="wf-editor__actions">
            <button class="wf-page__btn" :disabled="busy || !canSaveShift" @click="saveShift">
              {{ $i('wf_save_shift') }}
            </button>
            <button
              v-if="editor.shiftAssignmentId"
              class="wf-page__btn wf-page__btn--danger"
              :disabled="busy"
              @click="deleteShift"
            >
              {{ $i('wf_delete_shift') }}
            </button>
            <button class="wf-page__btn wf-page__btn--ghost" :disabled="busy" @click="closeEditor">
              {{ $i('wf_cancel') }}
            </button>
          </div>
        </section>

        <section v-if="!isMonth && validation" class="wf-page__validation">
          <h2 class="wf-page__section-title">
            {{ $i('wf_validation_title') }}
          </h2>
          <p class="wf-page__validation-note">
            {{ validation.isValid ? $i('wf_validation_structural_ok') : $i('wf_validation_structural_bad') }}
            — {{ $i('wf_validation_note') }}
          </p>
          <ul class="wf-page__results">
            <li v-if="!validation.ruleResults.length" class="wf-page__result">
              {{ $i('wf_validation_no_results') }}
            </li>
            <li
              v-for="(result, index) in validation.ruleResults"
              :key="result.ruleId + '-' + index"
              class="wf-page__result"
              :class="'is-' + (result.result || 'unknown')"
            >
              <span class="wf-page__result-flag">{{ resultLabel(result.result) }}</span>
              <span class="wf-page__result-id">{{ result.ruleId }}</span>
              <span v-if="result.remediation" class="wf-page__result-text">{{ result.remediation }}</span>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import WorkforceWeekGrid from '~/components/admin/workforce/WorkforceWeekGrid.vue';
import WorkforceRoleGrid from '~/components/admin/workforce/WorkforceRoleGrid.vue';
import WorkforceMonthGrid from '~/components/admin/workforce/WorkforceMonthGrid.vue';
import { isWorkforceApiError, toUtcRangeParam } from '~/utils/workforce/api-client';
import { WorkforceRequestsService } from '~/utils/workforce/requests-client';
import { WorkforceScheduleService } from '~/utils/workforce/schedule-client';
import { weekRange, monthRange, isoWeekNumber } from '~/utils/workforce/week-range';
import {
  buildWeekGrid,
  buildRoleGrid,
  markersFromRequests,
  toAssignmentInput,
  toDeleteInput,
  isAuthorable,
  DATA_UNKNOWN,
  DATA_NO_PLAN
} from '~/utils/workforce/week-grid';
import { buildMonthGrid } from '~/utils/workforce/month-grid';

const VIEW_DRAFT = 'draft';
const VIEW_PUBLISHED = 'published';

// The same schedule, three ways. Planday shows four tabs; this is three, and the missing one is a
// decision rather than a gap: its "Personalgrupper" axis is a staff-group object parallel to the
// role a shift is scheduled as, and a venue keeping both would be aligning two lists by hand.
// `WorkforceRole` is already on every assignment, so it IS the group axis here.
const PIVOT_EMPLOYEES = 'employees';
const PIVOT_ROLES = 'roles';
const PIVOT_MONTH = 'month';

// The Workforce week grid page. Reads only; the schedule state machine (draft → validate → publish)
// is driven from here because those three routes are what make the draft/published distinction on
// screen real, and because publish is where the cross-store double-booking guard answers.
export default {
  name: 'AdminWorkforceSchedule',
  components: { AdminPage, WorkforceWeekGrid, WorkforceRoleGrid, WorkforceMonthGrid },
  data () {
    return {
      loading: false,
      busy: false,
      pivot: PIVOT_EMPLOYEES,
      weekOffset: 0,
      monthOffset: 0,
      view: VIEW_DRAFT,
      copyPreviousWeek: false,
      timeZoneId: null,
      capabilities: [],
      contextError: '',
      range: null,
      staff: null,
      roles: null,
      markers: null,
      external: null,
      // One `GET /schedules` body per ISO week of the month, or null where that week's read failed.
      // See month-grid.js: the range read resolves to a single revision, so a month is N week reads.
      monthWeeks: null,
      validation: null,
      conflict: null,
      // The open shift editor, or null. It holds the manager's INTENT and nothing the server has
      // said: no id it invented, no total it computed. It survives a refused write on purpose — a
      // stale-revision 409 must not throw away what somebody just typed.
      editor: null,
      toast: { show: false, message: '', type: 'success' },
      toastTimer: null
    };
  },
  computed: {
    storeId () {
      const selected = this.$store.state.selectedAdminStore;
      if (selected) { return selected; }
      const stores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      return stores.length ? stores[0].id : '';
    },
    locale () {
      return this.$store.state.adminLocale || 'no';
    },
    // The market is the single source for currency (`marketConfig`), and it is what `priceLabel`
    // already formats in. Passed down so the grid can tell a figure it CAN print in that currency
    // from one the rates priced in another — it refuses the symbol rather than relabel the money.
    currency () {
      return (this.marketConfig && this.marketConfig.currency) || null;
    },
    _workforceScheduleService () {
      return new WorkforceScheduleService(this._coreInitializer);
    },
    // The absence markers come off the REQUESTS controller, which has its own client. The grid reads
    // that surface; deciding on it is the inbox page's job (/admin/workforce-requests).
    _workforceRequestsService () {
      return new WorkforceRequestsService(this._coreInitializer);
    },
    isEmployees () {
      return this.pivot === PIVOT_EMPLOYEES;
    },
    isRoles () {
      return this.pivot === PIVOT_ROLES;
    },
    isMonth () {
      return this.pivot === PIVOT_MONTH;
    },
    week () {
      // Without the store's own timezone the week cannot be placed, so nothing is guessed: the page
      // blocks on the context read instead of falling back to the browser's zone.
      if (!this.timeZoneId) { return null; }
      return weekRange(this.timeZoneId, new Date(), this.weekOffset);
    },
    // Same rule, same zone. The month's weeks come from `weekRange` itself, so the two scales can
    // never disagree about where a week starts.
    month () {
      if (!this.timeZoneId) { return null; }
      return monthRange(this.timeZoneId, new Date(), this.monthOffset);
    },
    weekLabel () {
      if (!this.week) { return '—'; }
      const first = this.week.days[0];
      const iso = isoWeekNumber(first.year, first.month, first.day);
      return this.$i('wf_week', { week: iso.week, year: iso.year });
    },
    monthLabel () {
      if (!this.month) { return '—'; }
      return new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(this.month.year, this.month.month - 1, 1)));
    },
    pivotOptions () {
      return [
        { key: PIVOT_EMPLOYEES, label: this.$i('wf_pivot_employees') },
        { key: PIVOT_ROLES, label: this.$i('wf_pivot_roles') },
        { key: PIVOT_MONTH, label: this.$i('wf_pivot_month') }
      ];
    },
    grid () {
      return buildWeekGrid({
        days: this.week ? this.week.days : [],
        range: this.range,
        staff: this.staff,
        markers: this.markers,
        external: this.external,
        conflict: this.conflict
      });
    },
    // The same week's reads, grouped by role instead of by person — deliberately the SAME `range`
    // and `external` objects, so the two pivots cannot show different weeks.
    roleGrid () {
      return buildRoleGrid({
        days: this.week ? this.week.days : [],
        range: this.range,
        roles: this.roles,
        external: this.external,
        conflict: this.conflict,
        windowStartUtc: this.week ? this.week.startUtc : null,
        windowEndUtc: this.week ? this.week.endUtc : null
      });
    },
    monthGrid () {
      return buildMonthGrid({
        month: this.month || { days: [], weeks: [] },
        weekRanges: this.monthWeeks || [],
        conflict: this.conflict
      });
    },
    viewOptions () {
      return [
        { key: VIEW_DRAFT, label: this.$i('wf_view_draft') },
        { key: VIEW_PUBLISHED, label: this.$i('wf_view_published') }
      ];
    },
    isScheduler () {
      return this.capabilities.includes('WorkforceScheduler');
    },
    isManager () {
      return this.capabilities.includes('WorkforceManager');
    },
    // The draft → validate → publish actions are all scoped to ONE revision, and a month spans
    // several. They are withheld in the month pivot rather than guessing which week they meant.
    canCreateDraft () {
      return !this.isMonth && this.isScheduler && this.view === VIEW_DRAFT && this.grid.dataState === DATA_NO_PLAN;
    },
    canValidate () {
      return !this.isMonth && this.isScheduler && this.view === VIEW_DRAFT && !!this.grid.scheduleRevisionId;
    },
    canPublish () {
      return !this.isMonth && this.isManager && this.view === VIEW_DRAFT && this.grid.state === 'Validated';
    },

    /**
     * Whether this week can be WRITTEN to, stated the same way the backend states it rather than
     * inferred from a 409 after the fact.
     *
     * `WorkforceScheduler` is the capability the batch edit requires. A PUBLISHED revision is
     * terminal server-side — it answers `workforce.revision-not-editable` — and the draft view never
     * resolves one, so both halves of that rule are asserted here rather than trusted to one. A
     * VALIDATED revision IS editable; the edit simply sends it back to Draft, which is why publishing
     * disappears after one (see `canPublish`) instead of the receipt going quietly stale.
     *
     * The `If-Match` token is part of the precondition, not a detail: without it there is nothing to
     * write against, and offering an affordance that is guaranteed to be refused is worse than
     * offering none.
     */
    canAuthorHere () {
      return !this.isMonth &&
        this.isScheduler &&
        this.view === VIEW_DRAFT &&
        !!this.grid.scheduleRevisionId &&
        !!this.grid.etag &&
        this.grid.state !== 'Published';
    },
    // The employee pivot is the only one with both axes a shift needs (a person and a day), so it is
    // the only one that draws the affordance.
    canAuthor () {
      return this.isEmployees && this.canAuthorHere;
    },

    /** True while the LAST write was refused as stale. Cleared by any new attempt or a reload. */
    staleWrite () {
      return !!(this.conflict && this.conflict.conflictKind === 'stale-revision');
    },

    /**
     * The §9.2 stage flag that refused the last write, or null.
     *
     * The backend carries the key in `flag` on the problem body precisely so a client can name it:
     * the family has eight stage flags, and "a workforce feature is disabled" does not tell an
     * operator which lever to pull. It is read off `problem` rather than off a named field on the
     * error because `WorkforceApiError` promotes only the conflict family's shared extensions, and
     * this one belongs to a single refusal.
     *
     * ALL FOUR schedule writes are gated on the SAME flag (`workforce.publication` — draft creation,
     * the batch edit, validation and publish all pass it to `RequireWriteCapabilityAsync`), so the
     * refusal is not specific to the publish button; it is what the whole authoring surface answers
     * while that flag is down. The banner therefore names the flag rather than the button.
     */
    conflictFlag () {
      if (!this.conflict || this.conflict.conflictKind !== 'flag-disabled-read-only') { return null; }
      return (this.conflict.problem && this.conflict.problem.flag) || null;
    },

    // The same people the grid draws, in the same order — including anyone off the roster who already
    // holds a shift, because a person the grid shows must be a person the editor can name.
    personOptions () {
      return this.grid.rows
        .filter(row => row.staffMemberId)
        .map(row => ({ value: row.staffMemberId, label: row.name }));
    },
    rolesKnown () {
      return Array.isArray(this.roles);
    },
    /**
     * The role axis, plus — when the list has not answered — the role the shift being edited already
     * carries. Without that fallback, saving an untouched shift would silently strip its role, since
     * the item is a full replace and a role absent from the select is a role absent from the payload.
     */
    roleOptions () {
      const options = (this.roles || [])
        .filter(role => role && role.roleId)
        .map(role => ({ value: role.roleId, label: role.name || role.roleId }));

      const current = this.editor && this.editor.roleId;
      if (current && !options.some(option => option.value === current)) {
        options.push({ value: current, label: (this.editor.roleName || current) });
      }
      return options;
    },
    dayOptions () {
      const days = this.week ? this.week.days : [];
      return days.map(day => ({
        value: day.isoDate,
        label: new Intl.DateTimeFormat(this.locale, { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' })
          .format(new Date(Date.UTC(day.year, day.month - 1, day.day)))
      }));
    },
    canSaveShift () {
      return this.canAuthorHere && isAuthorable(this.editor);
    },
    // An end that is not after the start is the NEXT local day — the same rule the payload builder
    // applies, said out loud so a manager knows which day the shift will be filed under.
    editorCrossesMidnight () {
      return !!(this.editor && this.editor.start && this.editor.end && this.editor.end <= this.editor.start);
    },
    stateBadge () {
      if (this.grid.dataState === DATA_UNKNOWN) { return { label: this.$i('wf_state_unknown'), tone: 'unknown' }; }
      if (this.grid.dataState === DATA_NO_PLAN) { return { label: this.$i('wf_state_none'), tone: 'none' }; }
      switch (this.grid.state) {
      case 'Draft': return { label: this.$i('wf_state_draft'), tone: 'draft' };
      case 'Validated': return { label: this.$i('wf_state_validated'), tone: 'validated' };
      case 'Published': return { label: this.$i('wf_state_published'), tone: 'published' };
      default: return { label: this.$i('wf_state_unknown'), tone: 'unknown' };
      }
    },
    stateNotice () {
      if (this.grid.dataState === DATA_UNKNOWN) { return this.$i('wf_unknown_range'); }
      if (this.grid.dataState !== DATA_NO_PLAN) { return ''; }
      return this.view === VIEW_PUBLISHED ? this.$i('wf_no_publication') : this.$i('wf_no_plan');
    },
    // Silent unless there is something to say. A zero here is a real zero — the overlay answered and
    // nothing collides — so it gets no banner; an overlay that did NOT answer says so in the grid's
    // own caveat instead, which is a different sentence.
    externalClashNotice () {
      const count = this.grid.externalClashCount;
      if (!count) { return ''; }
      return count === 1
        ? this.$i('wf_external_clash_notice_one')
        : this.$i('wf_external_clash_notice', { count });
    },
    // The surface has a whole family of typed conflicts (stale revision, unvalidated publish,
    // reused idempotency key). Only two of them are double-bookings, so the other kinds keep a
    // neutral headline and the server's own detail rather than being mislabelled.
    conflictHeadline () {
      if (!this.conflict) { return ''; }
      switch (this.conflict.conflictKind) {
      case 'hidden-engagement-conflict': return this.$i('wf_conflict_hidden_title');
      case 'assignment-overlap': return this.$i('wf_conflict_overlap_title');
      case 'stale-revision': return this.$i('wf_stale_title');
      case 'flag-disabled-read-only': return this.$i('wf_conflict_flag_title');
      case 'revision-not-editable': return this.$i('wf_conflict_frozen_title');
      case 'assignment-invalid': return this.$i('wf_conflict_invalid_title');
      case 'dst-ambiguous-offset-required':
      case 'dst-nonexistent-time': return this.$i('wf_conflict_dst_title');
      default: return this.$i('wf_conflict_generic_title');
      }
    },
    conflictDetail () {
      if (!this.conflict) { return ''; }
      switch (this.conflict.conflictKind) {
      case 'hidden-engagement-conflict': return this.$i('wf_conflict_hidden');
      case 'assignment-overlap': return this.$i('wf_conflict_overlap');
      case 'stale-revision': return this.$i('wf_stale_detail');
      // The flag key is the actionable part, so it is in the sentence. A refusal that carried no key
      // says so rather than leaving a blank where a lever's name belongs.
      case 'flag-disabled-read-only': return this.conflictFlag
        ? this.$i('wf_conflict_flag', { flag: this.conflictFlag })
        : this.$i('wf_conflict_flag_unnamed');
      case 'revision-not-editable': return this.$i('wf_conflict_frozen');
      // The server names the offending field and says why in prose it wrote for this purpose. It is
      // shown verbatim rather than mapped to a second, thinner sentence per field.
      case 'assignment-invalid': return this.conflict.message;
      case 'dst-ambiguous-offset-required': return this.$i('wf_conflict_dst_ambiguous');
      case 'dst-nonexistent-time': return this.$i('wf_conflict_dst_gap');
      default: return this.conflict.message;
      }
    }
  },
  watch: {
    storeId () { this.init(); },
    weekOffset () { this.load(); },
    monthOffset () { this.loadMonth(); },
    view () { this.reload(); },
    // Switching pivot changes WHICH reads are needed (roles only for the role pivot, N week reads
    // for the month), so it reloads rather than re-slicing what happens to be in hand.
    pivot () { this.reload(); }
  },
  mounted () {
    this.init();
  },
  beforeDestroy () {
    if (this.toastTimer) { clearTimeout(this.toastTimer); }
  },
  methods: {
    async init () {
      if (!this.$store.getters.userIsLoggedIn || !this.storeId) { return; }
      this.contextError = '';
      this.timeZoneId = null;
      this.capabilities = [];
      try {
        const context = await this._workforceScheduleService.GetContext(this.storeId);
        this.timeZoneId = context && context.timeZone ? context.timeZone.id : null;
        this.capabilities = (context && context.capabilities) || [];
        if (!this.timeZoneId) {
          this.contextError = this.$i('wf_context_failed');
          return;
        }
      } catch (e) {
        this.contextError = isWorkforceApiError(e) && e.status === 403
          ? this.$i('wf_no_capability')
          : this.$i('wf_context_failed');
        return;
      }
      await this.reload();
    },

    /** The one entry point that knows which scale the visible pivot is on. */
    reload () {
      return this.isMonth ? this.loadMonth() : this.load();
    },

    async load () {
      if (!this.week || !this.storeId) { return; }
      this.loading = true;
      this.conflict = null;
      this.validation = null;
      // The editor is written against a revision and an `If-Match` token that this read replaces, and
      // the shift it points at may not survive it. It closes rather than being carried across.
      this.editor = null;
      // Cleared to unknown, not to empty: a failed or in-flight read must not render as an empty
      // week, which is a different claim.
      this.range = null;
      this.staff = null;
      this.roles = null;
      this.markers = null;
      this.external = null;
      this.monthWeeks = null;

      const from = toUtcRangeParam(this.week.startUtc);
      const to = toUtcRangeParam(this.week.endUtc);

      const [range, staff, roles, requests, external] = await Promise.all([
        this._workforceScheduleService.GetRange(this.storeId, from, to, this.view).catch((e) => { this.notifyError(e); return null; }),
        this._workforceScheduleService.ListStaff(this.storeId).catch(() => null),
        // Only the role pivot needs the role axis, and it is the only pivot that can render an
        // UNSTAFFED role — which is precisely why it must not silently fall back to the roles that
        // happen to appear on shifts. A failure leaves it null, and the pivot says the list is
        // unknown rather than showing a shorter one.
        this.pivot === PIVOT_ROLES
          ? this._workforceScheduleService.ListRoles(this.storeId).catch(() => null)
          : Promise.resolve(null),
        // The absence read needs WorkforceManager. A scheduler-only caller gets a 403 here, and the
        // grid then says the absences are unknown rather than drawing everyone as available.
        // `state=all` rather than the default in-flight inbox: an APPROVED time-off is decided, so
        // the default projection omits it — and an approved absence is exactly what the grid shows.
        this._workforceRequestsService.ListRequests(this.storeId, null, 'all').catch(() => null),
        // The cross-store overlay. Failing quietly on purpose: it is advisory, and the guard it
        // previews still runs server-side at publish either way. The grid then says the check did
        // not answer, which is not the same claim as "nobody is committed elsewhere".
        this._workforceScheduleService.GetExternalCommitments(this.storeId, from, to).catch(() => null)
      ]);

      this.range = range;
      this.staff = Array.isArray(staff) ? staff : null;
      this.roles = Array.isArray(roles) ? roles : null;
      this.markers = requests && Array.isArray(requests.items) ? markersFromRequests(requests.items) : null;
      this.external = external && Array.isArray(external.items) ? external : null;
      this.loading = false;
    },

    /**
     * The month, fetched one ISO week at a time.
     *
     * NOT one 31-day call. `GET /schedules?from&to` resolves the range to a SINGLE revision — the
     * latest-starting one that overlaps — and returns that revision's whole assignment set, so a
     * month-wide range would answer with one week and silently drop the rest.
     *
     * A week that fails stays null and becomes an UNKNOWN week in the grid, which is excluded from
     * every total and named in the caveat. One failed week must never quietly shrink a month total.
     */
    async loadMonth () {
      if (!this.month || !this.storeId) { return; }
      this.loading = true;
      this.conflict = null;
      this.validation = null;
      this.editor = null;
      this.monthWeeks = null;

      const weeks = await Promise.all(this.month.weeks.map(week =>
        this._workforceScheduleService
          .GetRange(
            this.storeId,
            toUtcRangeParam(week.startUtc),
            toUtcRangeParam(week.endUtc),
            this.view
          )
          .catch(() => null)
      ));

      this.monthWeeks = weeks;
      this.loading = false;
    },

    setView (view) {
      if (this.view !== view) { this.view = view; }
    },
    setPivot (pivot) {
      if (this.pivot !== pivot) { this.pivot = pivot; }
    },
    stepWeek (delta) {
      this.weekOffset += delta;
    },
    goToThisWeek () {
      this.weekOffset = 0;
    },
    stepMonth (delta) {
      this.monthOffset += delta;
    },
    goToThisMonth () {
      this.monthOffset = 0;
    },

    async createDraft () {
      if (this.busy || !this.week) { return; }
      this.busy = true;
      try {
        const previous = weekRange(this.timeZoneId, new Date(), this.weekOffset - 1);
        const result = await this._workforceScheduleService.CreateDraft(this.storeId, {
          rangeStartUtc: toUtcRangeParam(this.week.startUtc),
          rangeEndUtc: toUtcRangeParam(this.week.endUtc),
          copyFromRangeStartUtc: this.copyPreviousWeek ? toUtcRangeParam(previous.startUtc) : null
        });
        this.notify(this.copyPreviousWeek
          ? this.$i('wf_copied', { count: (result && result.copiedAssignmentCount) || 0 })
          : this.$i('wf_draft_created'));
        await this.load();
      } catch (e) {
        this.handleMutationError(e);
      } finally {
        this.busy = false;
      }
    },

    async validate () {
      if (this.busy || !this.grid.scheduleRevisionId) { return; }
      this.busy = true;
      try {
        const receipt = await this._workforceScheduleService.Validate(this.storeId, this.grid.scheduleRevisionId);
        await this.load();
        // `load` resets the week, receipt included; the freshly produced one is put back after it.
        this.validation = receipt;
      } catch (e) {
        this.handleMutationError(e);
      } finally {
        this.busy = false;
      }
    },

    async publish () {
      if (this.busy || !this.grid.scheduleRevisionId) { return; }
      this.busy = true;
      const revisionId = this.grid.scheduleRevisionId;
      try {
        const publication = await this._workforceScheduleService.Publish(this.storeId, revisionId);
        this.notify(this.$i('wf_published_ok', { count: (publication && publication.recipientCount) || 0 }));
        // Switching the view is what reloads: the `view` watcher owns that, so calling `load` here
        // as well would fire the whole week's reads twice.
        this.view = VIEW_PUBLISHED;
      } catch (e) {
        this.handleMutationError(e);
      } finally {
        this.busy = false;
      }
    },

    // --- authoring ------------------------------------------------------------------------------

    /**
     * The role axis, fetched on demand rather than on every load.
     *
     * It is needed only once a shift is being authored, and the employee pivot deliberately does not
     * read it otherwise. A failure leaves `roles` null, which the editor reports as an UNKNOWN list —
     * never as a store with no roles — and the current role stays selectable regardless.
     */
    async ensureRoles () {
      if (this.roles || !this.storeId) { return; }
      this.roles = await this._workforceScheduleService.ListRoles(this.storeId)
        .then(roles => (Array.isArray(roles) ? roles : null))
        .catch(() => null);
    },

    openCreate (target) {
      if (!this.canAuthorHere) { return; }
      this.conflict = null;
      this.editor = {
        shiftAssignmentId: null,
        staffMemberId: target.staffMemberId,
        roleId: null,
        roleName: null,
        dayKey: target.isoDate,
        start: '',
        end: '',
        paidBreakMinutes: 0,
        unpaidBreakMinutes: 0,
        note: '',
        // No existing shift, so no stored fold offset to preserve.
        current: null
      };
      this.ensureRoles();
    },

    openEdit (event) {
      if (!this.canAuthorHere) { return; }
      const shift = event.shift;
      this.conflict = null;
      this.editor = {
        shiftAssignmentId: shift.id,
        staffMemberId: shift.staffMemberId,
        roleId: shift.roleId,
        roleName: shift.roleName,
        dayKey: event.isoDate,
        start: shift.start,
        end: shift.end,
        // Round-tripped, not defaulted: endpoint 18's item is a full replace, so a break dropped here
        // would be a break deleted server-side — and the shift's paid time, and its wage, with it.
        paidBreakMinutes: shift.paidBreakMinutes,
        unpaidBreakMinutes: shift.unpaidBreakMinutes,
        note: shift.note || '',
        // The shift as the server last stated it, so an unchanged wall clock keeps its resolved
        // DST-fold offset instead of the save being refused as ambiguous.
        current: shift
      };
      this.ensureRoles();
    },

    closeEditor () {
      this.editor = null;
    },

    /**
     * A drag between cells: the shift keeps its clock and its every other field, and changes only the
     * day it sits on and the person it belongs to. Dropping on the open row passes a null person,
     * which is what UNASSIGNS it.
     */
    moveShift (event) {
      const shift = event.shift;
      // A shift whose instants were unusable has no honest wall clock to resubmit, and endpoint 18's
      // item is a full replace — sending a guess would rewrite the times the server holds.
      if (!shift.start || !shift.end) {
        this.notify(this.$i('wf_move_unavailable'), 'error');
        return Promise.resolve();
      }

      return this.submitBatch([toAssignmentInput({
        shiftAssignmentId: shift.id,
        staffMemberId: event.staffMemberId,
        roleId: shift.roleId,
        dayKey: event.isoDate,
        start: shift.start,
        end: shift.end,
        paidBreakMinutes: shift.paidBreakMinutes,
        unpaidBreakMinutes: shift.unpaidBreakMinutes,
        note: shift.note,
        current: shift
      })], 'wf_shift_moved');
    },

    saveShift () {
      if (!this.canSaveShift) { return Promise.resolve(); }
      const created = !this.editor.shiftAssignmentId;
      return this.submitBatch([toAssignmentInput(this.editor)], created ? 'wf_shift_created' : 'wf_shift_saved');
    },

    deleteShift () {
      if (!this.editor || !this.editor.shiftAssignmentId) { return Promise.resolve(); }
      return this.submitBatch([toDeleteInput(this.editor.shiftAssignmentId)], 'wf_shift_deleted');
    },

    /**
     * The one write. Every authored change — create, move, reassign, unassign, edit, remove — is this
     * call, because endpoint 18 is the only route on the surface that mutates an assignment at all.
     *
     * THE MONEY. What comes back is the whole revision as the server now holds it: the assignment set,
     * the next `eTag` and the recomputed `cost`, all projected from the SAME in-transaction rows so
     * they describe one moment. It is adopted whole and nothing here adds, adjusts or carries forward
     * a figure — the backend rounds each shift once and each day and the week once over the UNROUNDED
     * amounts, so any total this page arrived at by arithmetic would disagree with the one it calls
     * true. A refetch is not used either: it would answer a LATER moment, which could fold in a
     * second manager's edit and pair this week's footer with a set of shifts nobody wrote together.
     *
     * A FAILED WRITE CHANGES NOTHING ON SCREEN. `range` is left exactly as it was read, so the grid
     * keeps showing a state that was actually answered rather than one this page hoped for.
     */
    async submitBatch (assignments, okKey) {
      if (this.busy || !this.canAuthorHere) { return; }
      this.busy = true;
      this.conflict = null;
      try {
        const response = await this._workforceScheduleService.BatchAssignments(
          this.storeId, this.grid.scheduleRevisionId, this.grid.etag, { assignments });

        this.range = response;
        // An edit knocks a Validated revision back to Draft, so the receipt on screen was produced
        // against a revision that no longer exists. It is dropped rather than left to be read as
        // current — and `canPublish`, which keys on the Validated state, closes with it.
        this.validation = null;
        this.editor = null;
        this.notify(this.$i(okKey));
      } catch (e) {
        this.handleMutationError(e);
      } finally {
        this.busy = false;
      }
    },

    /**
     * The only way out of a stale write, and it is a deliberate act.
     *
     * The refusal carries the current checksum, and this page pointedly does NOT resubmit against it.
     * Doing so would take the other manager's week as the base for an edit written against a week
     * they had already replaced — the overwrite the precondition exists to prevent, performed
     * automatically. Re-reading is the honest move: it shows what they did, and the manager decides
     * again with their own edit still in front of them until they leave.
     */
    async reloadAfterStale () {
      this.editor = null;
      await this.load();
    },

    handleMutationError (e) {
      if (isWorkforceApiError(e) && e.conflictKind) {
        this.conflict = e;
        return;
      }
      this.notifyError(e);
    },

    resultLabel (result) {
      switch (result) {
      case 'pass': return this.$i('wf_result_pass');
      case 'warn': return this.$i('wf_result_warn');
      case 'block': return this.$i('wf_result_block');
      default: return this.$i('wf_result_unknown');
      }
    },

    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 5000);
    },
    notifyError (e) {
      this.notify((e && e.message) || this.$i('wf_generic_error'), 'error');
    }
  }
};
</script>

<style scoped>
.wf-page { max-width: 1560px; margin: 0 auto; padding: 24px; }
.wf-page__header { margin-bottom: 18px; }
.wf-page__title { font-size: 1.9rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.wf-page__intro { color: #64748b; margin: 0; }

.wf-page__toast { position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 10px; color: #fff; font-weight: 600; z-index: 1000; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
.wf-page__toast--success { background: #159f63; }
.wf-page__toast--error { background: #ef4444; }
.wf-toast-enter-active, .wf-toast-leave-active { transition: opacity 0.25s ease; }
.wf-toast-enter, .wf-toast-leave-to { opacity: 0; }

.wf-page__blocker { padding: 18px 20px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; color: #64748b; }

.wf-page__controls { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-bottom: 14px; }
.wf-page__weeknav { display: flex; align-items: center; gap: 8px; }
.wf-page__week { font-weight: 600; color: #292c34; min-width: 130px; text-align: center; }
.wf-page__step { width: 34px; height: 34px; border: 1px solid #cbd5e0; background: #fff; border-radius: 8px; cursor: pointer; font-size: 1.1rem; line-height: 1; color: #292c34; }
.wf-page__step:disabled { opacity: 0.4; cursor: not-allowed; }

.wf-page__views { display: flex; gap: 4px; background: #f1f5f9; padding: 3px; border-radius: 9px; }
/* The pivot switch is the primary control on this page and the draft/published switch is a filter
   on top of it, so the pivot reads a shade stronger rather than as a second identical pill row. */
.wf-page__views--pivot { background: #eef2f6; }
.wf-page__views--pivot .wf-page__view.is-active { color: #292c34; }
.wf-page__view { border: none; background: none; padding: 7px 16px; border-radius: 7px; font-weight: 600; color: #64748b; cursor: pointer; font-size: 0.86rem; }
.wf-page__view.is-active { background: #fff; color: #159f63; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); }
.wf-page__view:disabled { cursor: not-allowed; }

.wf-page__actions { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.wf-page__copy { display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 0.84rem; }
.wf-page__btn { border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; }
.wf-page__btn--ghost { background: #fff; color: #292c34; border: 1px solid #cbd5e0; }
.wf-page__btn:disabled { background: #cbd5e0; color: #fff; cursor: not-allowed; border-color: #cbd5e0; }
/* The delivery link sits in the same row as the buttons and has to line up with them. `inline-flex`
   with a min-height rather than the buttons' bare padding: an anchor has no default line-box height,
   so padding alone leaves it a couple of pixels short and it reads as misaligned beside them. */
.wf-page__btn--link { display: inline-flex; align-items: center; min-height: 38px; text-decoration: none; }

.wf-page__state { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.wf-page__badge { padding: 4px 12px; border-radius: 999px; font-size: 0.76rem; font-weight: 700; letter-spacing: 0.02em; }
.wf-page__badge--draft { background: #f1f5f9; color: #64748b; }
.wf-page__badge--validated { background: #fef3c7; color: #92400e; }
.wf-page__badge--published { background: rgba(27, 183, 118, 0.14); color: #159f63; }
.wf-page__badge--none, .wf-page__badge--unknown { background: #f8f9fa; color: #94a3b8; border: 1px dashed #cbd5e0; }
.wf-page__meta { color: #94a3b8; font-size: 0.78rem; }

.wf-page__conflict { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 12px 16px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); color: #b91c1c; margin-bottom: 12px; font-size: 0.86rem; }
.wf-page__conflict-link { margin-top: 6px; color: #b91c1c; font-weight: 600; text-decoration: underline; }
.wf-page__notice { padding: 10px 16px; border-radius: 10px; background: #f8f9fa; border: 1px dashed #e2e8f0; color: #64748b; margin-bottom: 12px; font-size: 0.86rem; }
.wf-page__notice--warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }

.wf-page__btn--danger { background: #fff; color: #ef4444; border: 1px solid #ef4444; }

.wf-editor { margin-top: 20px; padding: 18px 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); }
.wf-editor__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.wf-editor__head .wf-page__section-title { margin: 0; }
.wf-editor__close { border: none; background: none; color: #94a3b8; font-size: 1rem; cursor: pointer; padding: 4px 8px; }
.wf-editor__fields { display: flex; flex-wrap: wrap; gap: 12px; }
.wf-editor__field { display: flex; flex-direction: column; gap: 4px; flex: 1 1 180px; }
.wf-editor__field--narrow { flex: 0 1 120px; }
.wf-editor__field--wide { flex: 2 1 260px; }
.wf-editor__label { font-size: 0.74rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
.wf-editor__field select, .wf-editor__field input { padding: 9px 10px; border: 1px solid #cbd5e0; border-radius: 8px; font-size: 0.88rem; color: #292c34; background: #fff; }
.wf-editor__field select:focus, .wf-editor__field input:focus { outline: none; border-color: #1bb776; box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1); }
.wf-editor__hint { margin: 10px 0 0; color: #94a3b8; font-size: 0.78rem; }
.wf-editor__actions { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
/* A refused write, not a warning about one: it keeps the money-red weight of the conflict banner and
   carries the only action that resolves it. */
.wf-editor__stale { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 12px 16px; margin-bottom: 14px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); color: #b91c1c; font-size: 0.86rem; }

.wf-page__validation { margin-top: 24px; }
.wf-page__section-title { font-size: 1.05rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.wf-page__validation-note { color: #64748b; font-size: 0.84rem; margin: 0 0 12px; }
.wf-page__results { list-style: none; margin: 0; padding: 0; }
.wf-page__result { display: flex; align-items: baseline; gap: 12px; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.84rem; color: #292c34; }
.wf-page__result-flag { min-width: 78px; font-weight: 700; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; }
.wf-page__result.is-pass .wf-page__result-flag { color: #159f63; }
.wf-page__result.is-warn .wf-page__result-flag { color: #92400e; }
.wf-page__result.is-block .wf-page__result-flag { color: #ef4444; }
.wf-page__result-id { color: #64748b; font-family: monospace; font-size: 0.78rem; }
.wf-page__result-text { color: #64748b; }
</style>
