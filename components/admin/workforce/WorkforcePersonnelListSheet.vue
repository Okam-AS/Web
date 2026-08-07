<template>
  <section class="wfpl-sheet">
    <header class="wfpl-sheet__head">
      <div class="wfpl-sheet__heading">
        <h2 class="wfpl-sheet__title">
          {{ $i('wfpl_sheet_title') }}
        </h2>
        <p class="wfpl-sheet__law">
          {{ $i('wfpl_sheet_law') }}
        </p>
      </div>

      <!-- § 8-5-6 first paragraph. Every value here is READ off the register's own entries; a field
           the entries did not carry is named as missing rather than filled from somewhere else. -->
      <dl class="wfpl-sheet__identity">
        <div class="wfpl-sheet__fact">
          <dt>{{ $i('wfpl_f_workplace') }}</dt>
          <dd>{{ businessName || dash }}</dd>
        </div>
        <div class="wfpl-sheet__fact">
          <dt>{{ $i('wfpl_f_orgnr') }}</dt>
          <dd>{{ organizationNumber || dash }}</dd>
        </div>
        <div class="wfpl-sheet__fact">
          <dt>{{ $i('wfpl_f_date') }}</dt>
          <dd>{{ sheet.businessDate || dash }}</dd>
        </div>
        <div class="wfpl-sheet__fact">
          <dt>{{ $i('wfpl_f_zone') }}</dt>
          <dd>{{ sheet.timeZoneId || dash }}</dd>
        </div>
      </dl>
    </header>

    <!-- THE GAP, PRINTED. Not a screen-only hint and not dismissible: a sheet handed to an inspector
         that stayed silent about this would be claiming an identification it does not have. -->
    <p class="wfpl-sheet__gap">
      {{ $i('wfpl_identity_gap') }}
    </p>

    <p v-if="sheet.hasMixedBusinessIdentity" class="wfpl-sheet__flag">
      {{ $i('wfpl_business_mixed', { count: sheet.businesses.length }) }}
      <span class="wfpl-sheet__flag-list">{{ mixedBusinessList }}</span>
    </p>

    <p v-if="sheet.timeZoneIsFallback" class="wfpl-sheet__flag">
      {{ $i('wfpl_zone_fallback', { zone: sheet.timeZoneId }) }}
    </p>

    <p v-if="isZoneUnusable" class="wfpl-sheet__unknown">
      {{ $i('wfpl_zone_unusable', { zone: sheet.timeZoneId || dash }) }}
    </p>

    <p v-else-if="isUnknown" class="wfpl-sheet__unknown">
      {{ $i('wfpl_unknown') }}
    </p>

    <p v-else-if="isEmpty" class="wfpl-sheet__empty">
      {{ $i('wfpl_empty') }}
    </p>

    <template v-else>
      <table class="wfpl-sheet__table">
        <thead>
          <!-- Print-only, and it earns its place on paper: `thead` is the only block a browser
               repeats on every printed page, so a two-page list would otherwise carry the venue and
               the date on sheet one and anonymous rows on sheet two. -->
          <tr class="wfpl-sheet__repeat">
            <th :colspan="columnCount">
              {{ runningIdentity }}
            </th>
          </tr>
          <tr>
            <th>{{ $i('wfpl_col_name') }}</th>
            <th>{{ $i('wfpl_col_code') }}</th>
            <th>{{ $i('wfpl_col_category') }}</th>
            <th>{{ $i('wfpl_col_start') }}</th>
            <th>{{ $i('wfpl_col_end') }}</th>
            <th>{{ $i('wfpl_col_note') }}</th>
            <!-- Screen only. The correction control is not part of the register, so it comes off the
                 paper with the rest of the chrome — see the print rules below. -->
            <th v-if="correctable" class="wfpl-sheet__actions-head" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in sheet.rows" :key="row.entryId" :class="{ 'wfpl-sheet__row--open': row.status !== completed }">
            <td class="wfpl-sheet__name">
              {{ row.name || $i('wfpl_row_unnamed') }}
            </td>
            <td class="wfpl-sheet__code">
              {{ row.identityCode || $i('wfpl_no_code') }}
            </td>
            <td>{{ categoryLabel(row) }}</td>
            <td class="wfpl-sheet__time">
              <template v-if="row.start">
                {{ row.start.time }}<span v-if="dayNote(row.start)" class="wfpl-sheet__daynote">{{ dayNote(row.start) }}</span>
              </template>
              <template v-else>
                {{ dash }}
              </template>
            </td>
            <td class="wfpl-sheet__time">
              <template v-if="row.end">
                {{ row.end.time }}<span v-if="dayNote(row.end)" class="wfpl-sheet__daynote">{{ dayNote(row.end) }}</span>
              </template>
              <span v-else class="wfpl-sheet__open">{{ openLabel(row) }}</span>
            </td>
            <td class="wfpl-sheet__note">
              <span v-if="row.hiredInOrganizationNumber" class="wfpl-sheet__note-line">
                {{ $i('wfpl_note_hiredin', { orgnr: hiredInOrgnr(row) }) }}
              </span>
              <!-- § 8-5-6: a correction must show WHO made it and WHEN. Both are rendered; a
                   correction that named neither would still be shown, because the fact that the row
                   was corrected is itself part of the record. -->
              <span v-if="row.correction" class="wfpl-sheet__note-line">
                {{ correctionLabel(row.correction) }}
              </span>
              <span v-if="!row.hiredInOrganizationNumber && !row.correction">{{ dash }}</span>
            </td>
            <td v-if="correctable" class="wfpl-sheet__actions">
              <!-- § 8-5-6's rettelse. Offered only for a row the register can identify, because the
                   correction names the entry it supersedes and a row with no id could only produce a
                   request the server refuses. -->
              <button
                v-if="row.entryId"
                type="button"
                class="wfpl-sheet__correct"
                @click="$emit('correct', row)"
              >
                {{ $i('wfpl_correct') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p class="wfpl-sheet__summary">
        {{ summaryLabel }}
      </p>
    </template>

    <footer class="wfpl-sheet__foot">
      <p v-if="sheet.asOf" class="wfpl-sheet__foot-line">
        {{ $i('wfpl_asof', { date: sheet.asOf.isoDate, time: sheet.asOf.time, zone: sheet.timeZoneId }) }}
      </p>
      <p v-if="sheet.retainUntil" class="wfpl-sheet__foot-line">
        {{ $i('wfpl_retain_until', { date: sheet.retainUntil }) }}
      </p>
      <p v-if="sheet.correctedCount > 0" class="wfpl-sheet__foot-line">
        {{ $i('wfpl_corrections', { count: sheet.correctedCount }) }}
      </p>
    </footer>
  </section>
</template>

<script>
import {
  SHEET_EMPTY,
  SHEET_UNKNOWN,
  STATUS_COMPLETED,
  STATUS_PRESENT,
  formatOrganizationNumber
} from '~/utils/workforce/personnel-list';

// The personalliste as an inspector reads it — on screen and, unchanged, on paper.
//
// ONE RENDERING FOR BOTH. The print path is a stylesheet over this component, not a second markup
// tree built for the printer. A separate print template is the classic way a statutory sheet ends up
// showing something the screen never did (or the reverse); here there is one table, and print only
// changes what surrounds it.
//
// The component holds NO clock of its own. Every instant on the sheet was resolved in the STORE's
// zone by `buildPersonnelSheet`, and the freshness stamp is the server's `asOfUtc`. A browser-made
// "printed at" would be a second clock nobody asked for, and on a statutory register a second clock
// is a second version of when.
const CATEGORY_KEYS = {
  Employee: 'wfpl_cat_employee',
  WorkingOwnerManager: 'wfpl_cat_owner',
  Unpaid: 'wfpl_cat_unpaid',
  HiredIn: 'wfpl_cat_hiredin'
};

export default {
  name: 'WorkforcePersonnelListSheet',
  props: {
    /** The output of `buildPersonnelSheet`. Required — the component never fetches or derives. */
    sheet: {
      type: Object,
      required: true
    },
    /**
     * Whether to offer the § 8-5-6 correction control per row (emits `correct` with the row).
     *
     * Default false, so a surface that has no correction path — the POS on-venue view, a print-only
     * render — cannot grow a button that leads nowhere. The register itself is identical either way:
     * the control is chrome around the sheet, never a column of it.
     */
    correctable: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return { dash: '—', completed: STATUS_COMPLETED };
  },
  computed: {
    isUnknown () {
      return this.sheet.state === SHEET_UNKNOWN;
    },
    isEmpty () {
      return this.sheet.state === SHEET_EMPTY;
    },
    isZoneUnusable () {
      return this.sheet.zoneUnusable === true;
    },
    /** Kept in step with the header cells so the repeated print row never spans the wrong width. */
    columnCount () {
      return this.correctable ? 7 : 6;
    },
    /**
     * The single business the day was recorded under, or nothing.
     *
     * Nothing rather than the first of several: with two bokføringspliktige on one day the header
     * cannot answer, and `wfpl_business_mixed` names them instead.
     */
    businessName () {
      return this.sheet.businessIdentity ? this.sheet.businessIdentity.name : null;
    },
    organizationNumber () {
      return this.sheet.businessIdentity
        ? formatOrganizationNumber(this.sheet.businessIdentity.organizationNumber)
        : null;
    },
    mixedBusinessList () {
      return this.sheet.businesses
        .map(business => [business.name, formatOrganizationNumber(business.organizationNumber)].filter(Boolean).join(' — '))
        .join('; ');
    },
    /** The line every printed page repeats: which venue, which day. */
    runningIdentity () {
      return [this.businessName, this.organizationNumber, this.sheet.businessDate]
        .filter(Boolean)
        .join(' · ');
    },
    summaryLabel () {
      const count = this.sheet.rows.length;
      // The server's own count of open windows. Null when the response did not carry one — and then
      // the summary reports only what it can count itself rather than inventing the figure.
      const open = this.sheet.openWindowCount;
      if (open === null) { return this.$i('wfpl_summary_rows_only', { count }); }
      return this.sheet.isToday === true
        ? this.$i('wfpl_summary_today', { count, open })
        : this.$i('wfpl_summary_past', { count, open });
    }
  },
  methods: {
    categoryLabel (row) {
      if (!row.category) { return this.dash; }
      // An unrecognised category is printed verbatim. Folding it into a known one would state a
      // relationship to the business that the register never recorded.
      return row.categoryIsKnown ? this.$i(CATEGORY_KEYS[row.category]) : row.category;
    },
    hiredInOrgnr (row) {
      return formatOrganizationNumber(row.hiredInOrganizationNumber) || row.hiredInOrganizationNumber;
    },
    /** A missing departure and a person still on site are the same wire flag and different facts. */
    openLabel (row) {
      return row.status === STATUS_PRESENT ? this.$i('wfpl_status_present') : this.$i('wfpl_status_no_departure');
    },
    /**
     * The marker on a time that does not fall on the sheet's own business day.
     *
     * Empty for the ordinary case, so a normal row stays clean; the neighbouring day is named in
     * full rather than as "+1", because the printed sheet has to be readable without this legend.
     */
    dayNote (stamp) {
      if (!stamp || stamp.dayOffset === null || stamp.dayOffset === 0) { return ''; }
      if (stamp.dayOffset === 1) { return ' ' + this.$i('wfpl_stamp_next_day', { date: stamp.isoDate }); }
      if (stamp.dayOffset === -1) { return ' ' + this.$i('wfpl_stamp_prev_day', { date: stamp.isoDate }); }
      return ' ' + this.$i('wfpl_stamp_other_day', { date: stamp.isoDate });
    },
    correctionLabel (correction) {
      const actor = correction.actor || this.$i('wfpl_correction_actor_unknown');
      return correction.at
        ? this.$i('wfpl_note_correction', { actor, date: correction.at.isoDate, time: correction.at.time })
        : this.$i('wfpl_note_correction_undated', { actor });
    }
  }
};
</script>

<style scoped>
.wfpl-sheet { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #292c34; }

.wfpl-sheet__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap; border-bottom: 2px solid #292c34; padding-bottom: 14px; margin-bottom: 14px; }
.wfpl-sheet__title { font-size: 1.35rem; font-weight: 700; margin: 0 0 2px; letter-spacing: 0.4px; }
.wfpl-sheet__law { font-size: 0.78rem; color: #64748b; margin: 0; }

.wfpl-sheet__identity { display: grid; grid-template-columns: repeat(2, minmax(160px, auto)); gap: 6px 28px; margin: 0; }
.wfpl-sheet__fact dt { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; margin: 0; }
.wfpl-sheet__fact dd { font-size: 0.92rem; font-weight: 600; margin: 0; }

.wfpl-sheet__gap { font-size: 0.82rem; line-height: 1.45; color: #92400e; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin: 0 0 14px; }
.wfpl-sheet__flag { font-size: 0.82rem; color: #92400e; margin: 0 0 12px; }
.wfpl-sheet__flag-list { display: block; color: #64748b; }

.wfpl-sheet__unknown { font-size: 0.9rem; color: #92400e; background: #fffbeb; border-radius: 8px; padding: 14px; margin: 0; }
.wfpl-sheet__empty { font-size: 0.9rem; color: #64748b; background: #f8f9fa; border-radius: 8px; padding: 14px; margin: 0; }

.wfpl-sheet__table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
.wfpl-sheet__table th { text-align: left; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; padding: 6px 8px; border-bottom: 1px solid #292c34; }
.wfpl-sheet__table td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
.wfpl-sheet__repeat { display: none; }
.wfpl-sheet__name { font-weight: 600; }
.wfpl-sheet__code { font-family: 'SFMono-Regular', Menlo, Consolas, monospace; font-size: 0.7rem; color: #64748b; word-break: break-all; }
.wfpl-sheet__time { font-variant-numeric: tabular-nums; white-space: nowrap; }
.wfpl-sheet__daynote { color: #64748b; font-size: 0.74rem; }
.wfpl-sheet__open { color: #b91c1c; font-weight: 600; }
.wfpl-sheet__row--open { background: #fffdf7; }
.wfpl-sheet__note { font-size: 0.78rem; color: #64748b; }
.wfpl-sheet__note-line { display: block; }

.wfpl-sheet__actions { text-align: right; white-space: nowrap; }
.wfpl-sheet__correct { background: #fff; border: 2px solid #e2e8f0; border-radius: 8px; padding: 5px 10px; font-size: 0.78rem; color: #292c34; cursor: pointer; }
.wfpl-sheet__correct:hover { background: #f8f9fa; border-color: #cbd5e0; }
.wfpl-sheet__correct:focus { outline: none; border-color: #1bb776; box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.2); }

.wfpl-sheet__summary { font-size: 0.86rem; font-weight: 600; margin: 14px 0 0; }
.wfpl-sheet__foot { margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
.wfpl-sheet__foot-line { font-size: 0.76rem; color: #64748b; margin: 0 0 4px; }

/* THE PRINT SHEET. A4, black on white, and nothing on it that is not part of the register.
   `display: table-header-group` is what makes the browser repeat the column headings — and the
   venue/date line above them — at the top of every printed page. */
@media print {
  /* Claims the `@page wfpl-sheet` box the page component declares (A4 portrait, 14 mm). Ignored,
     harmlessly, by a browser without named-page support. */
  .wfpl-sheet { border: 0; border-radius: 0; padding: 0; color: #000; page: wfpl-sheet; }
  .wfpl-sheet__title { font-size: 15pt; }
  .wfpl-sheet__law,
  .wfpl-sheet__fact dt { color: #000; }
  .wfpl-sheet__head { border-bottom: 1.5pt solid #000; }
  .wfpl-sheet__identity { grid-template-columns: repeat(2, minmax(140px, auto)); }

  .wfpl-sheet__gap { color: #000; background: transparent; border: 1pt solid #000; font-size: 8.5pt; }
  .wfpl-sheet__flag,
  .wfpl-sheet__flag-list,
  .wfpl-sheet__note,
  .wfpl-sheet__daynote,
  .wfpl-sheet__code,
  .wfpl-sheet__foot-line { color: #000; }

  .wfpl-sheet__table { font-size: 9pt; }
  .wfpl-sheet__table th { color: #000; border-bottom: 1pt solid #000; }
  .wfpl-sheet__table td { border-bottom: 0.5pt solid #666; }
  .wfpl-sheet__row--open { background: transparent; }
  .wfpl-sheet__open { color: #000; text-decoration: underline; }

  /* Repeated on every page, so page two is not a list of anonymous rows. */
  .wfpl-sheet__table thead { display: table-header-group; }
  .wfpl-sheet__repeat { display: table-row; }
  .wfpl-sheet__repeat th { font-size: 8pt; text-transform: none; letter-spacing: 0; border-bottom: 0; padding-bottom: 2px; }

  /* The correction control is chrome, not register. It comes off the paper entirely — a printed
     sheet handed to an inspector must show what was recorded and nothing that could be pressed. */
  .wfpl-sheet__actions,
  .wfpl-sheet__actions-head { display: none; }

  /* A person's row is never split across two sheets of paper. */
  .wfpl-sheet__table tr { break-inside: avoid; page-break-inside: avoid; }
  .wfpl-sheet__head,
  .wfpl-sheet__gap { break-inside: avoid; page-break-inside: avoid; }
}
</style>
