<template>
  <section class="wftb" data-testid="wft-batches">
    <h2 class="wftb__title">
      {{ $i('wft_batches_title') }}
    </h2>

    <!-- UNKNOWN, again, is not emptiness: "no batch has been sent" and "we could not read what was
         sent" are different answers and only one of them means an accountant is still waiting. -->
    <p v-if="batches === null" class="wftb__unknown" data-testid="wft-batches-unknown">
      {{ $i('wft_batches_unknown') }}
    </p>

    <p v-else-if="!batches.length" class="wftb__empty" data-testid="wft-batches-empty">
      {{ $i('wft_batches_empty') }}
    </p>

    <ul v-else class="wftb__list">
      <li
        v-for="batch in batches"
        :key="batch.batchId"
        class="wftb__item"
        :data-batch-id="batch.batchId"
      >
        <div class="wftb__item-head">
          <span class="wftb__file" data-testid="wft-batch-filename">{{ batch.fileName }}</span>
          <span
            class="wftb__outcome"
            :class="'wftb__outcome--' + String(batch.outcome).toLowerCase()"
            data-testid="wft-batch-outcome"
          >{{ $i('wft_outcome_' + String(batch.outcome).toLowerCase()) }}</span>
        </div>

        <dl class="wftb__meta">
          <div>
            <dt>{{ $i('wft_batch_provider') }}</dt>
            <dd>{{ batch.providerKey }}</dd>
          </div>
          <div>
            <dt>{{ $i('wft_batch_rows') }}</dt>
            <dd>{{ batch.lineCount }}</dd>
          </div>
          <div>
            <dt>{{ $i('wft_batch_sent_at') }}</dt>
            <dd>{{ batch.createdAtUtc }}</dd>
          </div>
          <!-- WHO SENT IT — the second money-path actor on this surface, printed for the same
               reason the approver is. -->
          <div>
            <dt>{{ $i('wft_batch_sent_by') }}</dt>
            <dd><code data-testid="wft-batch-actor">{{ batch.requestedByActorReference }}</code></dd>
          </div>
        </dl>

        <!-- THE DIGEST OF THE BYTES THAT WERE SENT, taken from the batch MODEL.
             It is deliberately NOT read from the download's `X-Okam-Content-Sha256` header: that
             header is not listed in `Access-Control-Expose-Headers` by the API, and this app is
             cross-origin to it, so `fetch` would hand back null and this line would print an empty
             string as an integrity claim. See `utils/workforce/timesheet-client.js`. -->
        <p v-if="batch.payloadSha256" class="wftb__digest">
          <strong>{{ $i('wft_batch_digest') }}</strong>
          <code data-testid="wft-batch-sha">{{ batch.payloadSha256 }}</code>
        </p>

        <p v-if="batch.failureReason" class="wftb__failure" data-testid="wft-batch-failure">
          {{ batch.failureReason }}
        </p>

        <button
          v-if="canDownload(batch)"
          class="wftb__download"
          type="button"
          :disabled="downloading === batch.batchId"
          :data-download="batch.batchId"
          data-testid="wft-download"
          @click="$emit('download', batch)"
        >
          {{ downloading === batch.batchId ? $i('wft_downloading') : $i('wft_download') }}
        </button>
        <!-- A failed batch has no bytes: the attempt is recorded and its key spent, but the provider
             never rendered anything. Saying so beats offering a button that can only 409. -->
        <p v-else class="wftb__no-download" data-testid="wft-no-download">
          {{ $i('wft_download_unavailable') }}
        </p>
      </li>
    </ul>
  </section>
</template>

<script>
import { canDownload } from '~/utils/workforce/timesheet';

/**
 * EVERY BATCH THIS PERIOD HAS SENT, and the bytes each one sent.
 *
 * Append-only on the server — `WorkforceTimesheetExportBatches` carries an `AFTER UPDATE, DELETE`
 * trigger, so what an accountant received never changes — and this list is therefore a record rather
 * than a view of current state. It renders failed attempts too: a spent key with no file is exactly
 * the thing somebody has to explain later, and a list that showed only successes would hide it.
 */
export default {
  props: {
    /** null is UNKNOWN, never emptiness. */
    batches: { type: Array, default: null },
    /** The batchId currently being fetched, so only that row says so. */
    downloading: { type: String, default: '' }
  },
  methods: { canDownload }
};
</script>

<style lang="scss" scoped>
.wftb {
  margin-top: 24px;

  &__title {
    font-size: 1.1em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 12px 0;
  }

  &__unknown,
  &__empty {
    color: #64748b;
    font-style: italic;
    margin: 0;
    padding: 20px;
    background: #f8f9fa;
    border: 1px dashed #cbd5e0;
    border-radius: 12px;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 16px;
  }

  &__item {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }

  &__item-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  &__file {
    font-weight: 600;
    color: #292c34;
    overflow-wrap: anywhere;
  }

  &__outcome {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;

    &--succeeded { background: #d1fae5; color: #065f46; }
    &--failed { background: #fee2e2; color: #991b1b; }
  }

  &__meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin: 0 0 12px 0;

    dt {
      font-size: 0.7em;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }

    dd {
      margin: 0;
      font-size: 0.85em;
      color: #292c34;
      overflow-wrap: anywhere;
    }
  }

  &__digest {
    margin: 0 0 12px 0;
    font-size: 0.8em;
    overflow-wrap: anywhere;

    strong { color: #64748b; margin-right: 8px; }
    code { color: #64748b; }
  }

  &__failure {
    margin: 0 0 12px 0;
    padding: 12px;
    background: #fee2e2;
    border-radius: 8px;
    color: #991b1b;
    font-size: 0.85em;
  }

  &__download {
    background: white;
    color: #292c34;
    border: 2px solid #e2e8f0;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover:not(:disabled) {
      background: #f8f9fa;
      border-color: #cbd5e0;
      transform: translateY(-1px);
    }

    &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  }

  &__no-download {
    margin: 0;
    font-size: 0.8em;
    color: #64748b;
    font-style: italic;
  }
}
</style>
