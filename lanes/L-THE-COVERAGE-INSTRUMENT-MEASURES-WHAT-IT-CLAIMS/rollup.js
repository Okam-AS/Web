const fs = require('fs')
const ROOT = '/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/L-COVINSTR/Web-modules/'
function classify (p) {
  const f = p.replace(ROOT, '')
  const l = f.toLowerCase()
  if (/workforce/.test(l)) return 'Workforce'
  if (/margin/.test(l)) return 'Margin'
  if (/meals/.test(l)) return 'Meals'
  if (/training/.test(l)) return 'Training'
  if (/growth/.test(l)) return 'Growth'
  if (/events|\/offer/.test(l)) return 'Events'
  if (/\/pos|pos-|floorplan|cart|checkout|order|product|receipt|till|kassa|payment|store-|\/store\/|category|giftcard|discount|price|payout|journal|dintero|vipps|saft|tripletex|accounting/.test(l)) return 'Core/POS'
  return 'Shared / unassigned'
}
const which = process.argv[2]
const sum = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'))
const acc = {}
let files = 0
for (const [p, v] of Object.entries(sum)) {
  if (p === 'total') continue
  if (!p.endsWith('.vue')) continue
  files++
  const m = classify(p)
  acc[m] = acc[m] || { files: 0, sc: 0, st: 0, bc: 0, bt: 0, fc: 0, ft: 0, lc: 0, lt: 0, loaded: 0 }
  const a = acc[m]
  a.files++
  a.sc += v.statements.covered; a.st += v.statements.total
  a.bc += v.branches.covered;   a.bt += v.branches.total
  a.fc += v.functions.covered;  a.ft += v.functions.total
  a.lc += v.lines.covered;      a.lt += v.lines.total
  if (v.statements.covered > 0) a.loaded++
}
const pct = (c, t) => t === 0 ? '  -  ' : (100 * c / t).toFixed(1)
const order = ['Core/POS','Workforce','Margin','Meals','Events','Training','Growth','Shared / unassigned']
console.log('### ' + which + '  (' + files + ' .vue files in report)')
console.log('| module | .vue files | stmts cov/total | stmt % | branch % | func % | line % | loaded |')
console.log('|---|---:|---:|---:|---:|---:|---:|---:|')
const tot = { files:0,sc:0,st:0,bc:0,bt:0,fc:0,ft:0,lc:0,lt:0,loaded:0 }
for (const m of order) {
  const a = acc[m]; if (!a) continue
  for (const k of Object.keys(tot)) tot[k] += a[k]
  console.log(`| ${m} | ${a.files} | ${a.sc}/${a.st} | **${pct(a.sc,a.st)}** | ${pct(a.bc,a.bt)} | ${pct(a.fc,a.ft)} | ${pct(a.lc,a.lt)} | ${a.loaded}/${a.files} |`)
}
console.log(`| **TOTAL** | ${tot.files} | ${tot.sc}/${tot.st} | **${pct(tot.sc,tot.st)}** | ${pct(tot.bc,tot.bt)} | ${pct(tot.fc,tot.ft)} | ${pct(tot.lc,tot.lt)} | ${tot.loaded}/${tot.files} |`)
