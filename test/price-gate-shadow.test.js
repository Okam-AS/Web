import fs from 'fs'
import path from 'path'
import { mount } from '@vue/test-utils'
import { globalMixin } from '~/plugins/global-mixin'
import { UNKNOWN_AMOUNT } from '~/utils/price'
import CustomerInfoModal from '~/components/molecules/CustomerInfoModal.vue'

// The money gate lives in ONE place — `priceLabel` on the global mixin in `plugins/global-mixin.js`,
// which is what keeps "costs nothing" and "nobody said" apart on every screen in this admin.
//
// That is the right seam. What it lacked was any guarantee that a screen actually SITS on it.
//
// THE MECHANISM. In Vue 2, a component's own `methods` win over a mixin's on a name collision —
// silently, with no warning and no lint. So a component that declares a method called `priceLabel`
// does not merely add a helper: it takes the whole surface off the gate, and every `priceLabel(...)`
// in its template resolves to the local one instead.
//
// Two components had already done exactly that, and one of them is why the gate never ran on the
// invoice page at all. Both are resolved and the ledger below is empty — so what this file does from
// here is not clean up, it is keep the estate at zero.
//
// WHY THIS IS ABOUT DEFINITION, NOT CALLS. A grep for the name cannot express this rule. There are
// 239 occurrences of `priceLabel` in this repo and nearly all of them are legitimate CALLS — the
// mixin's own definition, and every template that renders a price through it. Shadowing is a
// statement about where a name is DECLARED. So this guard:
//
//   1. blanks everything outside `<script>`, which removes every template call site structurally
//      (`components/organisms/Product.vue` calls `priceLabel(...)` inside a `{{ }}` and is not a
//      shadow);
//   2. blanks comment bodies, string interiors, template literals and regex literals, so no brace
//      or identifier inside them can steer the scan;
//   3. walks the braces of each `methods:` / `computed:` / `props:` object literal and collects only
//      the keys at DEPTH 1 of that object — a key is an identifier whose previous non-space
//      character is `{` or `,`. A call inside a method body sits at depth 2 or deeper and is never
//      a key, which is the whole distinction, made structurally rather than by pattern.
//
// The mixin itself is excluded by LOCATION, not by name: it lives in `plugins/`, and this scan only
// opens `components/`, `pages/` and `layouts/` — the three roots that hold components which inherit
// the mixin. Nothing here has to special-case the definition it is protecting.
//
// KNOWN LIMIT, recorded rather than hidden: a shadow declared as a `data` property is not caught.
// The negative-control test below pins that gap so it is visible to the next reader instead of being
// discovered the hard way. It is a narrow one — the template calls `priceLabel(x)`, so a data-shaped
// shadow would have to hold a function value — but it is a gap and it is stated.

const REPO_ROOT = path.join(__dirname, '..')
const ROOTS = ['components', 'pages', 'layouts']

// The mixin's MONEY members. `priceLabel` is the gate; `wholeAmount` and `fractionAmount` are the two
// digit helpers it sits beside, deliberately ungated but still part of the same seam — a component
// redeclaring one of those has taken the same silent exit. Non-money mixin members are out of scope
// on purpose: `formatDate` is shadowed by nine components today, which is the same CLASS of defect
// but not this lane's, and pinning nine files here would bury the money rule in noise.
const GUARDED = ['priceLabel', 'wholeAmount', 'fractionAmount']

// ---------------------------------------------------------------------------------------------
// The scanner.
// ---------------------------------------------------------------------------------------------

// Blank comment bodies, string interiors, template literals and regex literals to spaces, PRESERVING
// offsets and newlines so a reported line number is the line a reader opens the file to.
// `blankStringInteriors` is the difference between the two views this scanner needs. Braces must be
// walked over a source where a `{` inside a string cannot move the depth — but a KEY may itself be a
// quoted string (`"priceLabel": fn` is a shadow), and blanking its interior would hide the very name
// being looked for. So the same masking runs twice and the two results, which share every offset, are
// used for the two different jobs: depth from the blanked one, names from the intact one.
function maskNonCode (src, blankStringInteriors = true) {
  const out = src.split('')
  const blank = (from, to) => {
    for (let k = from; k < to && k < out.length; k++) {
      if (out[k] !== '\n') { out[k] = ' ' }
    }
  }
  let i = 0
  // The last significant character seen. A `/` after one of `)]}` or an identifier character is a
  // DIVISION; a `/` anywhere else starts a regex literal. That is the standard disambiguation.
  let previous = ''
  while (i < src.length) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') {
      const quote = c
      const start = i
      i++
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue }
        if (src[i] === quote) { i++; break }
        i++
      }
      // Interior only — the quotes stay, so the masked source is still balanced for a reader.
      if (blankStringInteriors) { blank(start + 1, Math.max(i - 1, start + 1)) }
      previous = quote
      continue
    }
    if (c === '/' && src[i + 1] === '/') {
      const start = i
      while (i < src.length && src[i] !== '\n') { i++ }
      blank(start, i)
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      const start = i
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { i++ }
      i += 2
      blank(start, i)
      continue
    }
    if (c === '/' && !/[A-Za-z0-9_$)\]}]/.test(previous)) {
      const start = i
      i++
      let inClass = false
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue }
        if (src[i] === '[') { inClass = true } else if (src[i] === ']') { inClass = false } else if (src[i] === '/' && !inClass) { i++; break } else if (src[i] === '\n') { break }
        i++
      }
      blank(start, i)
      continue
    }
    if (!/\s/.test(c)) { previous = c }
    i++
  }
  return out.join('')
}

// Blank everything outside a `<script>` block. This is what removes every TEMPLATE call site — the
// commonest legitimate use of the guarded names — without naming or excusing any of them.
function scriptOnly (raw) {
  const out = raw.split('').map(ch => (ch === '\n' ? '\n' : ' '))
  const lower = raw.toLowerCase()
  const open = /<script\b[^>]*>/gi
  let m
  while ((m = open.exec(raw)) !== null) {
    const start = m.index + m[0].length
    const close = lower.indexOf('</script>', start)
    const end = close === -1 ? raw.length : close
    for (let k = start; k < end; k++) { out[k] = raw[k] }
    open.lastIndex = end
  }
  return out.join('')
}

const OPTION_BLOCK = /(^|[{,;\s])(methods|computed|props)\s*:\s*\{/g
// `async`, `get`, `set` and generator prefixes are all still key positions.
const KEY_AT = /^(?:(?:async|get|set)\s+|\*\s*)*(?:([A-Za-z_$][\w$]*)|['"]([A-Za-z_$][\w$]*)['"])\s*(?::|\()/

// Every DEPTH-1 property key of every `methods` / `computed` / `props` object literal.
//
// `code` has string interiors blanked and drives the brace depth and the key-position test; `text`
// has them intact and supplies the key NAME, so a quoted key is read rather than lost. They are the
// same source at the same offsets.
export function optionKeys (code, text = code) {
  const found = []
  OPTION_BLOCK.lastIndex = 0
  let m
  while ((m = OPTION_BLOCK.exec(code)) !== null) {
    const openIdx = m.index + m[0].length - 1
    const block = m[2]
    let depth = 0
    for (let i = openIdx; i < code.length; i++) {
      if (code[i] === '{') { depth++; continue }
      if (code[i] === '}') {
        depth--
        if (depth === 0) { break }
        continue
      }
      if (depth !== 1) { continue }
      // A key position: the previous non-space character is the object's `{` or a separating `,`.
      let p = i - 1
      while (p >= 0 && /\s/.test(code[p])) { p-- }
      if (code[p] !== '{' && code[p] !== ',') { continue }
      const hit = KEY_AT.exec(text.slice(i, i + 160))
      if (!hit) { continue }
      const name = hit[1] || hit[2]
      found.push({ name, block, index: i })
      i += name.length - 1
    }
  }
  return found
}

function lineOf (code, index) {
  return code.slice(0, index).split('\n').length
}

function vueFiles (dir, found) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) { continue }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) { vueFiles(full, found) } else if (entry.name.endsWith('.vue')) { found.push(full) }
  }
  return found
}

// Read off `__dirname`, never the checkout's name, so this holds in a lane worktree too.
const components = ROOTS.reduce((acc, root) => vueFiles(path.join(REPO_ROOT, root), acc), [])
  .map((full) => {
    const script = scriptOnly(fs.readFileSync(full, 'utf8'))
    const code = maskNonCode(script, true)
    const text = maskNonCode(script, false)
    return { rel: path.relative(REPO_ROOT, full), code, keys: optionKeys(code, text) }
  })

const shadows = []
for (const file of components) {
  for (const key of file.keys) {
    if (GUARDED.includes(key.name)) {
      shadows.push({ rel: file.rel, member: key.name, block: key.block, line: lineOf(file.code, key.index) })
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The ledger. This is a ledger, not an allowlist: an entry records a shadow that still exists and
// says who owns removing it. Buying a permanent exemption is the one thing this file exists to stop,
// which is why every entry is checked in BOTH directions below.
// ---------------------------------------------------------------------------------------------

// EMPTY, and that is the end state this file was written to reach.
//
// It held one entry: `pages/admin/kravia-invoice.vue`, which declared its own `priceLabel`. That was
// the estate's last shadow. `L-PRICE-BYPASS-FIVE` renamed it to `invoiceAmountLabel` across all 11
// sites in `c4a4fa44`, leaving the delegation bytes untouched — the page keeps its own invoice-shaped
// formatter, but under a name that no longer collides with the mixin's, so the collision is gone
// rather than documented. The stale-entry test below is what reported it: the entry stopped
// describing anything real the moment that rename landed, and deleting it was the whole fix.
//
// An entry here is a shadow that still exists, with an owner. It is not an exemption anybody keeps.
const PINNED_SHADOWS = []

describe('the extractor tells a definition apart from a call', () => {
  // The positive and negative controls for the mechanism itself, independent of the corpus. Without
  // these, a scan that silently stopped matching anything would look exactly like a clean estate.
  const scan = (source) => {
    const script = scriptOnly(source)
    return optionKeys(maskNonCode(script, true), maskNonCode(script, false)).map(k => k.name)
  }

  test('a method a component declares IS found', () => {
    expect(scan('<script>export default { methods: { priceLabel (a) { return a } } }</script>')).toContain('priceLabel')
  })

  test('the same name declared as a computed or a prop is found too', () => {
    expect(scan('<script>export default { computed: { priceLabel () { return 1 } } }</script>')).toContain('priceLabel')
    expect(scan('<script>export default { props: { priceLabel: { type: Function } } }</script>')).toContain('priceLabel')
  })

  test('an `async` or quoted key is still a key', () => {
    expect(scan('<script>export default { methods: { async priceLabel (a) { return a } } }</script>')).toContain('priceLabel')
    expect(scan('<script>export default { methods: { "priceLabel": function (a) { return a } } }</script>')).toContain('priceLabel')
  })

  // A QUOTED key is the shape most likely to slip past a scanner like this one, because the masking
  // that stops a brace inside a string from moving the depth also blanks the key's own name. That is
  // a real hole and this scanner had it: the two-view read (depth from the blanked source, names from
  // the intact one, identical offsets) is what closes it. Every shape is pinned, not just the one
  // that was found, because a quoted shadow renders money exactly like an unquoted one.
  test.each([
    ['double-quoted, function value', '{ methods: { "priceLabel": function (a) { return a } } }'],
    ['single-quoted, function value', "{ methods: { 'priceLabel': function (a) { return a } } }"],
    ['double-quoted, arrow value', '{ methods: { "priceLabel": (a) => a } }'],
    ['quoted, after a string-valued property', '{ methods: { other: "x", "priceLabel": function (a) { return a } } }'],
    ['quoted, after a shorthand method', '{ methods: { other () { return 1 }, "priceLabel": function (a) { return a } } }'],
    ['quoted, in computed', '{ computed: { "priceLabel": function () { return 1 } } }'],
    ['quoted, in props', '{ props: { "priceLabel": { type: Function } } }'],
    ['quoted, value on the next line', '{ methods: {\n  "priceLabel":\n    function (a) { return a }\n} }'],
    ['quoted, with a stray brace inside a neighbouring string', '{ methods: { other () { return "{" }, "priceLabel": function (a) { return a } } }']
  ])('a quoted shadow is found: %s', (_label, options) => {
    expect(scan('<script>export default ' + options + '</script>')).toContain('priceLabel')
  })

  test('a CALL inside a method body is not a definition', () => {
    const source = '<script>export default { methods: { total () { return this.priceLabel(1) + priceLabel(2) } } }</script>'
    expect(scan(source)).toContain('total')
    expect(scan(source)).not.toContain('priceLabel')
  })

  test('a call in the TEMPLATE is not a definition', () => {
    const source = '<template><span>{{ priceLabel(row.amount) }}</span></template>\n<script>export default { methods: { other () { return 1 } } }</script>'
    expect(scan(source)).not.toContain('priceLabel')
  })

  test('a key of a NESTED object inside a method is not a component member', () => {
    const source = '<script>export default { methods: { build () { return { priceLabel: 1 } } } }</script>'
    expect(scan(source)).toContain('build')
    expect(scan(source)).not.toContain('priceLabel')
  })

  test('the name inside a comment or a string cannot fake a definition', () => {
    expect(scan('<script>export default { methods: { /* priceLabel (a) {} */ other () { return 1 } } }</script>')).not.toContain('priceLabel')
    expect(scan('<script>export default { methods: { other () { return "priceLabel: x" } } }</script>')).not.toContain('priceLabel')
  })

  test('the KNOWN LIMIT is a data-declared shadow, and it is stated rather than implied', () => {
    // Not caught. Recorded here so the gap is visible in the file that owns the rule.
    expect(scan('<script>export default { data () { return { priceLabel: () => "x" } } }</script>')).not.toContain('priceLabel')
  })
})

describe('the guard is actually looking at something', () => {
  test('the guarded names are real members of the shipped mixin', () => {
    // If the seam is renamed, this guard would quietly match nothing forever. This is the tripwire.
    for (const name of GUARDED) {
      expect(typeof globalMixin.methods[name]).toBe('function')
    }
  })

  test('the walk opened the estate, not an empty directory', () => {
    expect(components.length).toBeGreaterThanOrEqual(280)
  })

  test('and it parsed real option blocks out of them', () => {
    // A floor on total keys, not on shadows: this stays honest when the shadow count is zero, which
    // is the state this guard is trying to reach.
    const totalKeys = components.reduce((sum, file) => sum + file.keys.length, 0)
    expect(totalKeys).toBeGreaterThanOrEqual(3500)
    expect(components.filter(file => file.keys.length > 0).length).toBeGreaterThanOrEqual(250)
  })
})

describe('no component takes a silent exit from the money gate', () => {
  test('every component that redeclares a gated money member is one the ledger already names', () => {
    const pinned = new Set(PINNED_SHADOWS.map(entry => entry.rel + '|' + entry.member))
    const unpinned = shadows
      .filter(hit => !pinned.has(hit.rel + '|' + hit.member))
      .map(hit => hit.rel + ':' + hit.line + ' declares `' + hit.member + '` in `' + hit.block +
        '`, which in Vue 2 overrides the gated mixin member of that name — this surface would render money without the gate. Render through the mixin instead of redeclaring it.')
    expect(unpinned).toEqual([])
  })

  test('every ledger entry still describes a shadow that is really there', () => {
    // The direction an exemption list normally forgets. An entry whose shadow is gone is an excuse
    // sitting in the file waiting to cover the next one.
    const present = new Set(shadows.map(hit => hit.rel + '|' + hit.member))
    const stale = PINNED_SHADOWS
      .filter(entry => !present.has(entry.rel + '|' + entry.member))
      .map(entry => entry.rel + ' no longer declares `' + entry.member + '` — delete this ledger entry.')
    expect(stale).toEqual([])
  })

  test('every ledger entry names an owner and says why, at length', () => {
    for (const entry of PINNED_SHADOWS) {
      expect(entry.owner).toMatch(/^[A-Z0-9-]+$/)
      expect(entry.why.length).toBeGreaterThan(40)
    }
  })

  test('there is no ledger left: every surface in the estate is on the gate', () => {
    // A census, so that adding an entry is a visible act rather than a quiet one. Both sides are
    // zero now — no component declares a gated money member, and nothing is excused from that.
    // If this ever reds upward, read it as "the estate acquired a shadow", not "update the number".
    expect(shadows).toEqual([])
    expect(PINNED_SHADOWS).toEqual([])
  })
})

// The structural rule above says the modal no longer declares its own label. This is the same fact
// read off a real DOM: the reward balance now renders through the gated mixin method, in the shape
// the rest of this admin prints money in.
describe('the customer modal, in a real DOM, after its shadow was removed', () => {
  // `extends` rather than a rewrite: everything about the component is real except the one method
  // that would go to the network. Importantly it does NOT redeclare `priceLabel`, so what renders
  // below is the mixin's — which is the whole point of the test.
  const mountModal = async (balance) => {
    const wrapper = mount({
      extends: CustomerInfoModal,
      methods: {
        // The one method that would go to the network. `customer` is what opens the modal body;
        // `customerRewards` is what the balance cell reads through `primaryRewardCard`.
        async fetchCustomerInfo () {
          this.customer = { fullName: 'Kari', phoneNumber: '-', email: '-' }
          this.customerRewards = [{ balance }]
        }
      }
    }, {
      propsData: { userId: 1, storeId: 2 },
      mocks: {
        $i: key => key,
        $store: { dispatch: () => {}, subscribe: () => {} }
      }
    })
    await wrapper.vm.$nextTick()
    return wrapper
  }

  const balanceText = wrapper => wrapper.findAll('.reward-info-item').at(0).find('span').text()

  test('a balance that never arrived is withheld, with the estate mark', async () => {
    // It used to answer an ASCII hyphen — a second, unexplained absence mark a reader could not tell
    // from a dash somebody typed.
    const wrapper = await mountModal(null)
    expect(balanceText(wrapper)).toBe(UNKNOWN_AMOUNT)
    expect(balanceText(wrapper)).not.toBe('-')
    wrapper.destroy()
  })

  test('a genuine zero balance is still a figure', async () => {
    const wrapper = await mountModal(0)
    expect(balanceText(wrapper)).toBe('kr 0,00')
    wrapper.destroy()
  })

  test('a real balance prints in the shape the rest of this admin uses', async () => {
    // Was "206,80 kr" from a local Intl formatter; the admin's declared format is the `kr ` prefix.
    const wrapper = await mountModal(20680)
    expect(balanceText(wrapper)).toBe('kr 206,80')
    wrapper.destroy()
  })

  test('absent, zero and a real balance are three different renderings', async () => {
    const wrappers = await Promise.all([null, 0, 20680].map(mountModal))
    expect(new Set(wrappers.map(balanceText)).size).toBe(3)
    wrappers.forEach(w => w.destroy())
  })
})
