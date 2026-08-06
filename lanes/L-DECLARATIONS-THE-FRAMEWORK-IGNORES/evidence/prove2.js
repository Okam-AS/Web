#!/usr/bin/env node
/* Corrected FocusTrap proof. The first harness ran the control against a module
   scope already poisoned by the leak from the previous run, so "listeners
   released" passed for the wrong reason. Each run below gets a FRESH module
   instance (fresh module-scoped `instances` array) and a FRESH listener census. */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const REPO = '/Users/svendaneel/okam/Web-modules';
const req = Module.createRequire(path.join(REPO, 'package.json'));
const { JSDOM } = req('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
for (const k of ['window', 'document', 'navigator', 'Element', 'HTMLElement', 'Node', 'SVGElement', 'getComputedStyle']) {
  global[k] = k === 'window' ? dom.window : dom.window[k];
}
const Vue = req('vue/dist/vue.common.dev.js');
Vue.config.productionTip = false;
const compiler = req('vue-template-compiler');

let listeners = Object.create(null);
for (const target of [dom.window.document, dom.window]) {
  const add = target.addEventListener.bind(target);
  const rm = target.removeEventListener.bind(target);
  const label = target === dom.window ? 'window' : 'document';
  target.addEventListener = function (t, f, o) { const k = label + ':' + t; listeners[k] = (listeners[k] || 0) + 1; return add(t, f, o); };
  target.removeEventListener = function (t, f, o) { const k = label + ':' + t; listeners[k] = (listeners[k] || 0) - 1; return rm(t, f, o); };
}
const resetCensus = () => { listeners = Object.create(null); };
const census = () => JSON.stringify(listeners);

const origCompile = Module.prototype._compile;
Module.prototype._compile = function (content, filename) {
  const js = content
    .replace(/^\s*import\s+(\w+)\s*,\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?\s*$/gm,
      (_, def, named, src) => `const __m=require(${JSON.stringify(src)});const ${def}=__m.default||__m;const {${named}}=__m;`)
    .replace(/^\s*import\s+\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?\s*$/gm, (_, n, s) => `const {${n}}=require(${JSON.stringify(s)});`)
    .replace(/^\s*import\s+(\w+)\s+from\s*['"]([^'"]+)['"];?\s*$/gm, (_, d, s) => `const __d=require(${JSON.stringify(s)});const ${d}=__d.default||__d;`)
    .replace(/^\s*export\s+default\s+/m, 'module.exports.default = ');
  return origCompile.call(this, js, filename);
};

// FRESH module scope every call -> fresh `instances`, `lastActiveTrap`
function loadSFC (relPath) {
  const abs = path.join(REPO, relPath);
  const src = fs.readFileSync(abs, 'utf8');
  const parts = compiler.parseComponent(src);
  const compiled = compiler.compile(parts.template.content);
  const m = new Module(abs, null);
  m.filename = abs; m.paths = Module._nodeModulePaths(path.dirname(abs));
  m._compile(parts.script.content, abs);
  return { options: m.exports.default || m.exports, compiled };
}

function makeCtor (sfc, mutate) {
  const o = Object.assign({}, sfc.options);
  o.render = new Function(sfc.compiled.render); // eslint-disable-line no-new-func
  o.staticRenderFns = (sfc.compiled.staticRenderFns || []).map(c => new Function(c)); // eslint-disable-line no-new-func
  if (mutate) { mutate(o); }
  return Vue.extend(o);
}

function cycle (ctor, n) {
  for (let i = 0; i < n; i++) {
    const el = dom.window.document.createElement('div');
    dom.window.document.body.appendChild(el);
    const vm = new ctor({ propsData: { returnFocus: true } }).$mount(el);
    vm.$destroy();
  }
}

let fail = 0;
const assert = (l, c, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + l + (d ? '   [' + d + ']' : '')); if (!c) { fail++; } };

console.log('vue ' + req('vue/package.json').version + ' / compiler ' + req('vue-template-compiler/package.json').version +
            ' / package.json declares ' + req('./package.json').dependencies.vue);
console.log('');

// ---- RUN A: file exactly as written, fresh module ----
console.log('== A: components/molecules/FocusTrap.vue as written (`unmounted`), 5 mount/destroy cycles ==');
resetCensus();
const A = loadSFC('components/molecules/FocusTrap.vue');
let aCalls = 0;
const ctorA = makeCtor(A, (o) => { const b = o.unmounted; o.unmounted = function () { aCalls++; return b.apply(this, arguments); }; });
cycle(ctorA, 5);
console.log('  census after 5 mount+destroy cycles: ' + census());
assert('unmounted() body executed 0 times across 5 destroys', aCalls === 0, 'calls=' + aCalls);
assert('attachHandler ran exactly ONCE for 5 traps -> `instances` never empties', listeners['document:focusin'] === 1, census());
assert('every listener still attached after all 5 destroyed', listeners['document:focusout'] === 1 && listeners['window:blur'] === 1);

// ---- RUN B: control, fresh module, fresh census ----
console.log('');
console.log('== B: CONTROL - identical body renamed to `destroyed`, fresh module, 5 cycles ==');
resetCensus();
const B = loadSFC('components/molecules/FocusTrap.vue');
let bCalls = 0;
const ctorB = makeCtor(B, (o) => { const b = o.unmounted; delete o.unmounted; o.destroyed = function () { bCalls++; return b.apply(this, arguments); }; });
cycle(ctorB, 5);
console.log('  census after 5 mount+destroy cycles: ' + census());
assert('destroyed() body executed 5 times', bCalls === 5, 'calls=' + bCalls);
assert('listeners fully released (net zero) - the leak is the hook name alone',
  Object.values(listeners).every(v => v === 0), census());

// ---- C: returnFocus prop is dead as written ----
console.log('');
console.log('== C: what depends on it - the `returnFocus` prop ==');
resetCensus();
const C1 = loadSFC('components/molecules/FocusTrap.vue');
const el0 = dom.window.document.createElement('input');
dom.window.document.body.appendChild(el0);
el0.focus();
const focusedBefore = dom.window.document.activeElement.tagName;
const ctorC = makeCtor(C1);
const elc = dom.window.document.createElement('div');
dom.window.document.body.appendChild(elc);
const vmC = new ctorC({ propsData: { returnFocus: true } }).$mount(elc);
vmC.$destroy();
console.log('  activeElement before mount: ' + focusedBefore + ', after destroy: ' + dom.window.document.activeElement.tagName);
assert('returnFocus=true never restores focus (its only consumer is the dead hook)',
  typeof C1.options.unmounted === 'function' && typeof C1.options.destroyed === 'undefined' && typeof C1.options.beforeDestroy === 'undefined');

console.log('');
console.log(fail === 0 ? 'ALL ASSERTIONS HELD' : fail + ' FAILED');
process.exit(fail ? 1 : 0);
