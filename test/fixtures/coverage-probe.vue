<template>
  <div class="coverage-probe">
    {{ shouted }} {{ doubled(2) }}
  </div>
</template>

<script>
// A fixture with exactly one job. Every line below tagged `PROBE(...)` is an INDENTED statement,
// and `test/vue-coverage-instrumentation.test.js` asserts that the coverage instrument can see it.
//
// It is deliberately not under `components/` or `pages/`, so it is outside `collectCoverageFrom`
// and contributes nothing to any reported figure. Nothing mounts it. Do not "tidy" the
// indentation or delete a marker: the indentation IS the thing under test.
const BASE = 1

if (BASE > 0) {
  const indentedAtModuleScope = BASE + 1 // PROBE(module-scope-indented)
  Object.freeze({ indentedAtModuleScope })
}

export default {
  data () { // PROBE-FN(data)
    return { label: 'probe', factor: 2 } // PROBE(data-body)
  },
  computed: {
    shouted () { // PROBE-FN(shouted)
      return this.label.toUpperCase() // PROBE(computed-body)
    }
  },
  methods: {
    doubled (n) { // PROBE-FN(doubled)
      if (n < 0) { // PROBE-BRANCH(negative-guard)
        return 0 // PROBE(branch-consequent)
      }
      return n * this.factor // PROBE(method-body)
    }
  }
}
</script>
