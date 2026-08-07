<template>
  <section class="trn-ev">
    <p v-if="read.state === 'idle'" class="trn-note" data-test="evidence-idle">
      {{ $i('trn_ev_prompt') }}
    </p>
    <p v-else-if="read.state === 'unknown'" class="trn-note trn-note--unknown" data-test="evidence-unknown">
      {{ $i('trn_ev_unknown') }}
    </p>
    <!-- A refusal is never an empty document. "This store holds no training record for this person"
         is a finding an inspection can act on; "you may not ask" is not, and printing the second as
         the first would hand somebody an exoneration the server never issued. -->
    <p v-else-if="read.state === 'refused'" class="trn-note trn-note--refused" data-test="evidence-refused">
      {{ $i('trn_ev_refused') }}
    </p>

    <article v-else class="trn-ev__doc" data-test="evidence-document">
      <header class="trn-ev__head">
        <h2 class="trn-ev__subject" data-test="evidence-person">
          {{ subjectName }}
        </h2>
        <!-- The id is printed beside the name, always. The name is a convenience for checking the
             document against a payroll; the id is what the record is actually about. -->
        <p class="trn-ev__meta">
          <code class="trn-ref" data-test="evidence-person-ref">{{ doc.personRef }}</code>
        </p>
        <!-- An invented reference and a colleague who was never trained produce the same empty
             document. The server separates them and so does this: without the badge, an empty file
             could be handed over as evidence about a person it does not describe. -->
        <p v-if="!doc.personOnFile" class="trn-note trn-note--blocked" data-test="evidence-person-absent">
          {{ $i('trn_ev_person_absent') }}
        </p>
        <p class="trn-ev__meta" data-test="evidence-state">
          {{ stateLabel }}
        </p>
        <p class="trn-ev__meta" data-test="evidence-asof">
          {{ $i('trn_ev_asof', { when: asOfLabel }) }}
        </p>
      </header>

      <!-- WHAT THE DOCUMENT SAYS ABOUT ITSELF. Three answers, never two: a finding, a clean bill, and
           «it could not tell us» — which is not a clean bill and must never render as one. -->
      <p
        class="trn-note"
        :class="integrityClass"
        data-test="evidence-integrity"
      >
        {{ integrityLabel }}
      </p>

      <h3 class="trn-ev__section">
        {{ $i('trn_ev_completions_title') }}
      </h3>
      <p v-if="!doc.completions.length" class="trn-note" data-test="evidence-completions-empty">
        {{ $i('trn_ev_completions_empty') }}
      </p>
      <div v-else class="trn-ev__scroll">
        <table class="trn-table trn-ev__table--completions" data-test="evidence-completions">
          <thead>
            <tr>
              <th>{{ $i('trn_col_course') }}</th>
              <th>{{ $i('trn_col_when') }}</th>
              <th>{{ $i('trn_col_score') }}</th>
              <th>{{ $i('trn_col_result') }}</th>
              <th>{{ $i('trn_ev_col_material') }}</th>
              <th>{{ $i('trn_ev_col_provenance') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in doc.completions" :key="index" data-test="evidence-completion-row">
              <td data-test="evidence-completion-course">
                {{ row.courseTitle || dash }}
                <span class="trn-ev__version">{{ versionLabel(row) }}</span>
              </td>
              <td data-test="evidence-completion-when">
                {{ whenLabel(row.completed) }}
              </td>
              <!-- The score and the threshold it was measured against, side by side. The threshold is
                   the one FROZEN into the version the attempt was stamped to, not one in force
                   today, which is the only reason the pair means anything years later. -->
              <td data-test="evidence-completion-score">
                {{ percent(row.scorePercent) }}
                <span class="trn-ev__threshold" data-test="evidence-completion-threshold">
                  {{ thresholdLabel(row) }}
                </span>
              </td>
              <!-- READ, NEVER RECOMPUTED. The comparison that produced this was the server's, in
                   exact decimal, against that frozen threshold. A browser re-deciding it here would
                   be a second opinion about append-only statutory evidence. -->
              <td>
                <span class="trn-badge" :class="verdictClass(row)" data-test="evidence-completion-verdict">
                  {{ verdictLabel(row) }}
                </span>
              </td>
              <td data-test="evidence-completion-material">
                <code class="trn-ref" data-test="evidence-completion-hash">{{ row.contentHash || dash }}</code>
                <span class="trn-badge" :class="linkageClass(row)" data-test="evidence-completion-linkage">
                  {{ linkageLabel(row) }}
                </span>
                <!-- The three inputs the hash was computed over, printed so a reader can re-derive it
                     rather than believe it. That is the whole difference between this and a report. -->
                <details class="trn-ev__material">
                  <summary>{{ $i('trn_ev_material_open') }}</summary>
                  <p class="trn-ev__material-label">
                    {{ $i('trn_ev_material_pages') }}
                  </p>
                  <pre class="trn-ev__pre" data-test="evidence-completion-pages">{{ row.contentPages || dash }}</pre>
                  <p class="trn-ev__material-label">
                    {{ $i('trn_ev_material_quiz') }}
                  </p>
                  <pre class="trn-ev__pre" data-test="evidence-completion-quiz">{{ row.quiz || $i('trn_ev_material_quiz_absent') }}</pre>
                  <p class="trn-ev__material-label">
                    {{ thresholdInputLabel(row) }}
                  </p>
                </details>
              </td>
              <td data-test="evidence-completion-provenance">
                <span class="trn-ev__by">{{ recordedByLabel(row) }}</span>
                <span class="trn-badge" :class="coverageClass(row)" data-test="evidence-completion-coverage">
                  {{ coverageLabel(row) }}
                </span>
                <span class="trn-ev__source">{{ sourceLabel(row) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 class="trn-ev__section">
        {{ $i('trn_ev_certificates_title') }}
      </h3>
      <p v-if="!doc.certificates.length" class="trn-note" data-test="evidence-certificates-empty">
        {{ $i('trn_ev_certificates_empty') }}
      </p>
      <div v-else class="trn-ev__scroll">
        <table class="trn-table trn-ev__table--certificates" data-test="evidence-certificates">
          <thead>
            <tr>
              <th>{{ $i('trn_col_type') }}</th>
              <th>{{ $i('trn_col_issuer') }}</th>
              <th>{{ $i('trn_col_issue') }}</th>
              <th>{{ $i('trn_col_expiry') }}</th>
              <th>{{ $i('trn_col_status') }}</th>
              <th>{{ $i('trn_ev_col_provenance') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in doc.certificates" :key="index" data-test="evidence-certificate-row">
              <td data-test="evidence-certificate-type">
                {{ row.type || dash }}
              </td>
              <td>{{ row.issuer || dash }}</td>
              <!-- Sliced, never converted. Whether a stored expiry denotes UTC or the store's own
                   local midnight is an open ruling (TR-B3), and on this document the cost of guessing
                   wrong is a certificate printed as lapsing the day before the venue wrote it. -->
              <td>{{ row.issueDate || dash }}</td>
              <td data-test="evidence-certificate-expiry">
                {{ row.hasExpiry ? row.expiryDate : $i('trn_ev_no_expiry') }}
              </td>
              <td>{{ statusLabel(row) }}</td>
              <td>
                <span class="trn-badge" :class="coverageClass(row)">{{ coverageLabel(row) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 class="trn-ev__section">
        {{ $i('trn_ev_chain_title') }}
      </h3>
      <!-- THIS IS NOT AN ACCESS LOG, and the sentence saying so is not optional. The chain carries the
           ledger rows about the completion and certificate ROWS; the disclosures written when somebody
           opens this document are keyed to the person and are deliberately excluded from it. A reader
           who took the chain for a list of who has seen the file would conclude nobody had. -->
      <p class="trn-form__hint" data-test="evidence-chain-not-access-log">
        {{ $i('trn_ev_chain_not_access_log') }}
      </p>
      <p v-if="!doc.auditChain.length" class="trn-note" data-test="evidence-chain-empty">
        {{ $i('trn_ev_chain_empty') }}
      </p>
      <div v-else class="trn-ev__scroll">
        <table class="trn-table trn-ev__table--chain" data-test="evidence-chain">
          <thead>
            <tr>
              <th>{{ $i('trn_col_when') }}</th>
              <th>{{ $i('trn_ev_col_event') }}</th>
              <th>{{ $i('trn_ev_col_leg') }}</th>
              <th>{{ $i('trn_ev_col_actor') }}</th>
              <th>{{ $i('trn_ev_col_delta') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in doc.auditChain" :key="index" data-test="evidence-audit-row">
              <td>{{ whenLabel(row.occurred) }}</td>
              <td><code class="trn-ref">{{ row.eventType || dash }}</code></td>
              <td>{{ legLabel(row) }}</td>
              <!-- The id the ledger stores, NOT a name. Resolving it against a roster would put a
                   disclosure about the recorder into a document that leaves the building, which is
                   exactly what the backend withheld it to prevent. -->
              <td><code class="trn-ref">{{ row.actorReference || dash }}</code></td>
              <td><code class="trn-ref">{{ row.payloadSnapshotJson || dash }}</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="trn-form__hint" data-test="evidence-no-names">
        {{ $i('trn_ev_no_names') }}
      </p>
    </article>
  </section>
</template>

<script>
import {
  TRAINING_STATE_NONE,
  TRAINING_STATE_NO_PASS,
  TRAINING_STATE_PASSED,
  AUDIT_COVERED,
  LINKAGE_INTACT,
  LINKAGE_BROKEN,
  LINKAGE_UNRESOLVABLE,
  integrityFinding
} from '~/utils/training/evidence';
import { instantLabel } from '~/utils/training/journey';

const STATE_KEYS = {
  [TRAINING_STATE_NONE]: 'trn_ev_state_none',
  [TRAINING_STATE_NO_PASS]: 'trn_ev_state_no_pass',
  [TRAINING_STATE_PASSED]: 'trn_ev_state_passed'
};

const LINKAGE_KEYS = {
  [LINKAGE_INTACT]: 'trn_ev_linkage_intact',
  [LINKAGE_BROKEN]: 'trn_ev_linkage_broken',
  [LINKAGE_UNRESOLVABLE]: 'trn_ev_linkage_unresolvable'
};

/**
 * ONE PERSON'S TRAINING RECORD, ASSEMBLED — the document a venue hands to a tilsyn.
 *
 * Every other Training panel is a working surface: a list to act on, a form to file against. This one
 * is the output. It is rendered on its own page, without the authoring controls, because it is the
 * only Training screen whose audience is somebody from outside the venue.
 *
 * ---- IT ASSERTS NOTHING. IT PRINTS THE SERVER'S CLAIMS BESIDE THEIR INPUTS. ----------------------
 *
 * The verdict is printed next to the score AND the pass threshold frozen into the version the attempt
 * was stamped to. The content hash is printed next to the pages, the quiz and that same threshold —
 * the three values it was computed over. An inspector can therefore re-derive both without trusting
 * this page, which is the only reason to produce a document at all.
 *
 * So nothing here compares anything. No `score >= threshold`, no re-hashing, no re-deriving a
 * certificate's validity from the browser's clock. Those comparisons were made once, by the server,
 * against rows that are append-only under a database trigger; a second opinion rendered here would
 * disagree with the record the day a rounding differs or a later version moves the bar.
 *
 * ---- WHY THE DISCLOSURE NOTICE IS PRINTED, AND HOW THE CLAIM WAS CHECKED ------------------------
 *
 * The notice itself lives on the PAGE rather than here, above the button that performs the read: a
 * warning rendered with the document would arrive after the act it warns about, and the whole reason
 * to print it is that the choice is still the manager's when they read it. It is documented here
 * because this component is where the claim it makes is otherwise checkable.
 *
 * The notice says that opening this document is recorded. That is a statement about a control, and
 * this estate has repeatedly shipped screens naming controls nothing implements — so it was verified
 * in the backend before it was written here, three ways:
 *
 *   the call site   `TrainingEvidenceService.GetEvidenceAsync` ends with `RecordDisclosureAsync`,
 *                   which calls `ITrainingAuditWriter.Append` with `EventType = "evidence.read"` and
 *                   then `await _context.SaveChangesAsync(ct)` — committed in the same request, not
 *                   queued for a background writer that may not exist.
 *   the writer      `TrainingAuditWriter.Append` stages the row into the caller's own DbContext, so
 *                   it commits atomically with the request rather than on a best-effort path.
 *   the pin         `TrainingEvidenceReadTests` reads the row back out of the database after a call,
 *                   asserts a SECOND read appends a SECOND row (an access log that deduplicated would
 *                   answer "somebody looked once" for a record read daily), and has a negative
 *                   control proving a REFUSED read appends nothing.
 *
 * What the notice therefore does NOT say is anything about who can later read those disclosures. The
 * ledger holds them; whether a subject can retrieve them is a different route, and this page makes no
 * promise on its behalf.
 */
export default {
  name: 'TrainingEvidenceDocument',
  props: {
    /** `readEvidence(payload, error)`, or `{ state: 'idle' }` before anybody has asked. */
    read: { type: Object, required: true },
    locale: { type: String, default: 'no' },
    /** The zone the context read resolved. Null renders instants in UTC and the page says so. */
    zoneId: { type: String, default: null }
  },
  computed: {
    dash () { return '—'; },
    doc () { return this.read.document || null; },
    subjectName () {
      if (!this.doc) { return this.dash; }
      // The id is on screen either way, immediately below. A document about a reference that names
      // nobody says so in its own banner rather than by showing a blank where a name goes.
      return this.doc.displayName || this.$i('trn_ev_person_unnamed');
    },
    stateLabel () {
      const key = STATE_KEYS[this.doc && this.doc.trainingState];
      return key ? this.$i(key) : this.$i('trn_ev_state_unknown');
    },
    asOfLabel () {
      return (this.doc && instantLabel(this.doc.asOf, this.locale, this.zoneId)) || this.dash;
    },
    /**
     * The document's verdict on itself — and the third answer matters as much as the other two.
     * `integrityFinding` returns null when either half could not tell us, and a document that could
     * not report its own integrity has NOT reported it sound.
     */
    finding () {
      return integrityFinding(this.doc && this.doc.integrity);
    },
    integrityLabel () {
      const integrity = (this.doc && this.doc.integrity) || {};
      if (this.finding === null) { return this.$i('trn_ev_integrity_unknown'); }
      if (this.finding === false) { return this.$i('trn_ev_integrity_clean'); }
      return this.$i('trn_ev_integrity_finding', {
        linkage: this.$i(LINKAGE_KEYS[integrity.linkage] || 'trn_ev_linkage_unknown'),
        rows: integrity.rowsWithoutAuditEvent
      });
    },
    integrityClass () {
      if (this.finding === null) { return 'trn-note--unknown'; }
      return this.finding ? 'trn-note--blocked' : '';
    }
  },
  methods: {
    whenLabel (instant) {
      return instantLabel(instant, this.locale, this.zoneId) || this.dash;
    },
    /** `typeof`, not truthiness: 0 is a real score and would otherwise print as a dash. */
    percent (value) {
      return typeof value === 'number' ? value + '%' : this.dash;
    },
    versionLabel (row) {
      return row.versionNo === null ? '' : ' v' + row.versionNo;
    },
    thresholdLabel (row) {
      return row.passThreshold === null
        ? this.$i('trn_ev_threshold_unknown')
        : this.$i('trn_ev_threshold', { threshold: row.passThreshold });
    },
    thresholdInputLabel (row) {
      return row.passThreshold === null
        ? this.$i('trn_ev_material_threshold_unknown')
        : this.$i('trn_ev_material_threshold', { threshold: row.passThreshold });
    },
    verdictLabel (row) {
      if (row.passed === null) { return this.$i('trn_result_unknown'); }
      return row.passed ? this.$i('trn_result_passed') : this.$i('trn_result_failed');
    },
    verdictClass (row) {
      if (row.passed === null) { return ''; }
      return row.passed ? 'trn-badge--on' : 'trn-badge--off';
    },
    linkageLabel (row) {
      return this.$i(LINKAGE_KEYS[row.linkage] || 'trn_ev_linkage_unknown');
    },
    /**
     * Intact is the ONLY state that reads as reassuring. Unresolvable is amber rather than neutral:
     * a completion whose version cannot be read has nothing to be checked against, which is a gap in
     * the evidence and not a clean row.
     */
    linkageClass (row) {
      if (row.linkage === LINKAGE_INTACT) { return 'trn-badge--on'; }
      if (row.linkage === LINKAGE_BROKEN) { return 'trn-badge--off'; }
      return 'trn-badge--warn';
    },
    coverageLabel (row) {
      return row.auditCoverage === AUDIT_COVERED
        ? this.$i('trn_ev_coverage_covered')
        : this.$i('trn_ev_coverage_absent');
    },
    coverageClass (row) {
      return row.auditCoverage === AUDIT_COVERED ? 'trn-badge--on' : 'trn-badge--warn';
    },
    /**
     * Who filed the row, recoverable from the audit ledger and from nowhere else — the completion
     * table carries no recorder column. A row written before the ledger covered it names nobody, and
     * that absence is a finding about the record rather than a rendering problem, so it prints its
     * own sentence instead of a dash.
     */
    recordedByLabel (row) {
      return row.recordedBy
        ? this.$i('trn_ev_recorded_by', { actor: row.recordedBy })
        : this.$i('trn_ev_recorded_by_absent');
    },
    /** The stored value, printed as-is when it is one this build does not know. */
    sourceLabel (row) {
      if (row.source === 'ManagerRecorded') { return this.$i('trn_source_manager'); }
      if (row.source === 'Quiz') { return this.$i('trn_source_quiz'); }
      return row.source || this.dash;
    },
    statusLabel (row) {
      if (row.status === 'Valid') { return this.$i('trn_status_valid'); }
      if (row.status === 'Expiring') { return this.$i('trn_status_expiring'); }
      if (row.status === 'Expired') { return this.$i('trn_status_expired'); }
      return row.status || this.dash;
    },
    legLabel (row) {
      if (row.linkedTo === 'completion') { return this.$i('trn_ev_leg_completion'); }
      if (row.linkedTo === 'certificate') { return this.$i('trn_ev_leg_certificate'); }
      return row.linkedTo || this.dash;
    }
  }
};
</script>

<style lang="scss" scoped>
@import './training-panel';

.trn-ev__doc {
  border: 1px solid $trn-border;
  border-radius: 12px;
  padding: 24px;
  background: #fff;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.trn-ev__head {
  border-bottom: 2px solid $trn-border;
  padding-bottom: 16px;
  margin-bottom: 20px;
}

.trn-ev__subject {
  font-size: 1.4em;
  font-weight: 600;
  color: $trn-ink;
  margin: 0 0 6px;
}

.trn-ev__meta {
  margin: 0 0 4px;
  font-size: 0.9em;
  color: $trn-muted;
}

.trn-ev__section {
  @extend %trn-panel-title;

  margin-top: 28px;
}

// The tables scroll INSIDE the document rather than overflowing it. A sibling lane measured the
// Training course page's six-column versions table overflowing its grid track at 1280px and landing
// under the next column, which painted over the publish button and made it unclickable by pointer.
// This document is a single column, so it cannot repeat that exact failure — but a six-column table
// on a laptop is the same shape, and the fix is the same one that lane recommended.
.trn-ev__scroll {
  overflow-x: auto;
  margin-bottom: 8px;
}

.trn-ev__version,
.trn-ev__threshold,
.trn-ev__source,
.trn-ev__by {
  display: block;
  font-size: 0.85em;
  color: $trn-muted;
}

.trn-ev__material {
  margin-top: 6px;
  font-size: 0.85em;

  summary {
    cursor: pointer;
    color: $trn-muted;
  }
}

.trn-ev__material-label {
  margin: 8px 0 2px;
  color: $trn-muted;
}

.trn-ev__pre {
  margin: 0;
  padding: 8px;
  border-radius: 6px;
  background: $trn-surface;
  font-family: 'SFMono-Regular', Menlo, Consolas, monospace;
  font-size: 0.9em;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ---- THE COPY THAT LEAVES THE BUILDING --------------------------------------------------------
   The page's own print block decides that nothing but this document reaches the paper; this half
   decides how the document sets on it. Between them they are what makes `trn_ev_page_intro`'s claim
   — that this is the record «slik den kan legges fram ved tilsyn» — a thing the product can do
   rather than a sentence it prints.

   SCOPED, AND THAT IS THE GUARD. Every selector carries this component's own `data-v-` attribute, so
   it can only match an element this component rendered and it is dead the moment the component
   unmounts. An UNSCOPED `@media print` block would outlive the page in a Nuxt build and quietly
   restyle the printing of every other admin screen; `pages/admin/events-pipeline.vue` records the
   time this estate paid for a print stylesheet guarded by a body class instead.

   ONE RENDERING FOR BOTH. There is no print-only markup tree here and no second assembly of the
   record — the rules below change what SURROUNDS the same tables the screen shows. A separate print
   template is the classic way a statutory sheet ends up carrying something the screen never did, or
   the reverse, and on an append-only record either direction is a document disagreeing with itself.

   THE THREE-STATE NOTES STAY ON THE PAPER. Idle, unknown and refused all print. A refusal handed
   over as a sheet saying «the server declined» is a finding; the same refusal printed as a blank
   page reads as a clean file, and this document exists to keep those two apart. */
@media print {
  .trn-ev__doc {
    border: 0;
    border-radius: 0;
    padding: 0;
    color: #000;
  }

  // A heading is never the last thing on a sheet of paper.
  .trn-ev__head {
    border-bottom: 1pt solid #000;
    padding-bottom: 8pt;
    margin-bottom: 10pt;
    break-inside: avoid;
    page-break-inside: avoid;
    break-after: avoid;
    page-break-after: avoid;
  }

  .trn-ev__subject { font-size: 13pt; }

  .trn-ev__section {
    font-size: 11pt;
    margin-top: 14pt;
    break-after: avoid;
    page-break-after: avoid;
  }

  /* THE ONE RULE WITHOUT WHICH THE RECORD IS INCOMPLETE ON PAPER RATHER THAN MERELY UGLY.
     `.trn-ev__scroll` is `overflow-x: auto` on screen, which is correct there — the chain is a
     five-column table and its delta column carries whole JSON snapshots. A printer cannot scroll, so
     an overflow container CLIPS: the columns past the page width simply do not exist on the sheet,
     and the missing ones would be the actor and the delta. */
  .trn-ev__scroll {
    overflow: visible;
    margin-bottom: 0;
  }

  // Grey-on-grey screen furniture becomes readable text rather than a photocopy of a panel.
  .trn-ev__meta,
  .trn-ev__version,
  .trn-ev__threshold,
  .trn-ev__source,
  .trn-ev__by,
  .trn-ev__material-label,
  .trn-note,
  .trn-form__hint,
  .trn-table th,
  .trn-table td { color: #000; }

  .trn-note {
    background: transparent;
    padding: 0 0 6pt;
    font-size: 9pt;
    margin: 0 0 6pt;
  }

  // A finding and a refusal are the two notes an inspection acts on, so they keep a mark of their
  // own on a sheet that has no colour left to say it with.
  .trn-note--blocked,
  .trn-note--refused,
  .trn-note--unknown {
    border-left: 2pt solid #000;
    padding-left: 6pt;
  }

  .trn-form__hint { font-style: normal; font-size: 8pt; }

  /* MEASURED, NOT ASSUMED, AND THE FIRST VERSION OF THIS FILE GOT IT WRONG.
     A table left at `table-layout: auto` is sized by its content's MIN width, and these carry a
     71-character sha256, whole JSON snapshots and a course title. On screen that is fine — the
     wrapper scrolls. On paper the table simply ran off the right-hand edge, and Chromium clips
     rather than scrolls: the first PDF this lane produced had «Opphav» printed as «Opp» and the
     ledger's delta column cut mid-JSON, which is a record that LOOKS complete and is not.
     `fixed` makes the declared widths authoritative and `anywhere` breaks the long tokens inside
     them. The widths are per table because equal sixths would give a date column the same room as a
     JSON snapshot; they sum to 100 in each case. */
  .trn-table {
    font-size: 8pt;
    margin-bottom: 6pt;
    table-layout: fixed;
    width: 100%;
  }

  .trn-table th,
  .trn-table td { overflow-wrap: anywhere; word-break: break-word; }
  .trn-table th { border-bottom: 1pt solid #000; padding: 3pt 4pt; white-space: normal; }
  .trn-table td { border-bottom: 0.5pt solid #666; padding: 4pt; }

  .trn-ev__table--completions th:nth-child(1) { width: 20%; }
  .trn-ev__table--completions th:nth-child(2) { width: 10%; }
  .trn-ev__table--completions th:nth-child(3) { width: 9%; }
  .trn-ev__table--completions th:nth-child(4) { width: 9%; }
  .trn-ev__table--completions th:nth-child(5) { width: 33%; }
  .trn-ev__table--completions th:nth-child(6) { width: 19%; }

  .trn-ev__table--certificates th:nth-child(1) { width: 18%; }
  .trn-ev__table--certificates th:nth-child(2) { width: 24%; }
  .trn-ev__table--certificates th:nth-child(3) { width: 13%; }
  .trn-ev__table--certificates th:nth-child(4) { width: 13%; }
  .trn-ev__table--certificates th:nth-child(5) { width: 13%; }
  .trn-ev__table--certificates th:nth-child(6) { width: 19%; }

  .trn-ev__table--chain th:nth-child(1) { width: 12%; }
  .trn-ev__table--chain th:nth-child(2) { width: 16%; }
  .trn-ev__table--chain th:nth-child(3) { width: 11%; }
  .trn-ev__table--chain th:nth-child(4) { width: 21%; }
  .trn-ev__table--chain th:nth-child(5) { width: 40%; }

  // The column headings repeat at the top of every printed page: `table-header-group` is the only
  // thing a browser repeats across a page break, and a two-page chain would otherwise be a list of
  // unlabelled columns from sheet two onwards.
  .trn-table thead { display: table-header-group; }

  // A row is never split across two sheets of paper.
  .trn-table tr { break-inside: avoid; page-break-inside: avoid; }

  // Colour is the only thing separating a pass from a fail on screen. On paper — and on the
  // photocopy an inspector takes away — it is not there, so the badges are outlined and the two
  // that carry a verdict are marked apart from the ones that carry a state.
  .trn-badge {
    background: transparent;
    color: #000;
    border: 0.5pt solid #000;
    border-radius: 0;
    padding: 0 3pt;
    font-size: 7.5pt;
  }

  .trn-badge--off { font-weight: 700; text-decoration: underline; }
  .trn-badge--warn { border-style: dashed; }

  .trn-ref { font-size: 7pt; word-break: break-all; }

  .trn-ev__pre {
    background: transparent;
    border: 0.5pt solid #666;
    border-radius: 0;
    padding: 3pt;
    font-size: 7.5pt;
    // A JSON page-list has no spaces to break at, so `break-word` alone leaves it as one long token
    // and the fixed column it sits in cannot hold it.
    overflow-wrap: anywhere;
  }

  /* THE MATERIAL IS NOT OPTIONAL ON PAPER, AND A DISCLOSURE WIDGET CANNOT BE OPENED ON IT.
     `trn_ev_page_intro` promises that this document prints the server's figures BESIDE the values
     they were computed from — the pages, the quiz and the frozen threshold the content hash was
     taken over. On screen those sit behind a `<details>` because a reader can open it; a printer
     cannot, so a closed one would take the re-derivable half of the promise off the sheet and leave
     a hash an inspector can only believe. That is the difference between evidence and a report.

     Two mechanisms, because engines disagree about how a closed `<details>` hides its contents:
     current Chromium, Firefox and Safari render them into a `::details-content` box carrying
     `content-visibility: hidden`, and older engines do not lay the children out at all. Both are
     addressed; a browser that supports neither form drops the declaration it does not understand and
     keeps the other. The summary itself goes — it is a control, and its label («vis materialet»)
     would be an instruction to press something on a piece of paper. */
  .trn-ev__material { display: block; margin-top: 4pt; font-size: 8pt; }
  .trn-ev__material > summary { display: none; }
  .trn-ev__material > *:not(summary) { display: block !important; }
  .trn-ev__material::details-content { content-visibility: visible; block-size: auto; }
}
</style>
