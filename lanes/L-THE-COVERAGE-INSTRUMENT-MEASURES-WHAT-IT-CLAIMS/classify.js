module.exports = function classify (f) {
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
