<template>
  <div class="product-form-field" :class="{ 'is-inline': inline }">
    <label :for="controlId">{{ label }}</label>
    <slot :id="controlId" />
    <small v-if="hint" class="product-form-hint">{{ hint }}</small>
    <div v-if="$slots.actions" class="product-form-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script>
// One labelled field, looking the way the product editor's fields look.
//
// This is presentation and nothing else: it owns the label, the spacing and the control styling,
// and it never touches a value. Both editors keep their own bindings, so the products page still
// saves through the API it always did and the import panel still only edits a draft. That is the
// whole extent of what these two screens share, and sharing more would mean one of them
// inheriting the other's idea of when a change reaches the database.

export default {
  name: 'ProductFormField',
  props: {
    label: { type: String, required: true },
    /** Explanatory text under the control, for the things a label cannot say briefly. */
    hint: { type: String, default: '' },
    /** Ties the label to the control when the caller passes the slot id along. */
    controlId: { type: String, default: undefined },
    inline: Boolean
  }
}
</script>

<style lang="scss" scoped>
// Lifted from the product editor's .form-group so the two read as one design rather than two
// that happen to resemble each other.
.product-form-field {
  margin-bottom: 24px;

  &.is-inline { margin-bottom: 16px; }

  label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.85em;
    font-weight: 600;
    color: #292c34;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  ::v-deep input[type="text"],
  ::v-deep input[type="number"],
  ::v-deep textarea,
  ::v-deep select {
    width: 100%;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    font-size: 0.95em;
    color: #292c34;
    transition: all 0.3s ease;

    &:hover { border-color: #cbd5e0; }

    &:focus {
      outline: none;
      border-color: #94a3b8;
      box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
      background: #ffffff;
    }

    &::placeholder { color: #94a3b8; }
  }

  ::v-deep textarea {
    resize: vertical;
    min-height: 100px;
  }
}

.product-form-hint {
  display: block;
  margin-top: 6px;
  font-size: 0.8em;
  color: #64748b;
  font-style: italic;
}

.product-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}
</style>
