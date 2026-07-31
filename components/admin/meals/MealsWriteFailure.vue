<template>
  <div v-if="failureKey" class="mls-note mls-note--warn">
    <span>{{ $i(failureKey) }}</span>
    <!-- The platform's own words, second and marked as such. `detail` is untranslated English server
         prose that may be reworded without notice, so it may add specifics — which field, which
         currency — but it is never allowed to be the only sentence on screen. This is the treatment
         `components/admin/StoreMarketCard.vue` established for the same problem. -->
    <span v-if="detail" class="mls-detail">{{ detail }}</span>
  </div>
</template>

<script>
/**
 * One failed mutation, said once.
 *
 * It exists so the six write forms on this surface cannot come to disagree about how a refusal
 * reads, and so the "did anything get saved?" obligation is discharged in one place: every sentence
 * `writeFailureKey` can return states whether the write landed, and this component never adds a
 * hopeful one of its own.
 */
export default {
  name: 'MealsWriteFailure',
  props: {
    /** A translation key from `writeFailureKey`, or null when the last attempt did not fail. */
    failureKey: { type: String, default: null },
    /** The server's own `detail`, from `problemDetail`. Optional. */
    detail: { type: String, default: null }
  }
};
</script>

<style lang="scss" scoped>
@import './meals-admin';

.mls-detail {
  display: block;
  margin: 6px 0 0;
}
</style>
