// The waste reason vocabulary, in ONE place, because two surfaces render it and a code the server
// accepts but a picker does not offer is a bucket no venue can ever fill.
//
// The order here is the order the picker offers, and it is deliberately NOT the server's enum order
// or an alphabetical one: it runs from the reason a venue records most often to the one it records
// least, so the common case is the first thing under the cursor.
//
// THE CODES ARE THE CONTRACT. They are `MarginWasteReason` names and travel verbatim; the labels are
// this build's words for them. A code the server sends that is missing from this map is rendered as
// the code itself rather than bucketed into `Other` — see `reasonLabel` on the panels for why.

export const WASTE_REASONS = [
  'Spoilage',
  'Preparation',
  'Breakage',
  'StaffMeal',
  'CustomerReturn',
  'Complimentary',
  'Other'
];

export const WASTE_REASON_KEYS = {
  Spoilage: 'mrgs_waste_reason_spoilage',
  Preparation: 'mrgs_waste_reason_preparation',
  Breakage: 'mrgs_waste_reason_breakage',
  StaffMeal: 'mrgs_waste_reason_staff_meal',
  CustomerReturn: 'mrgs_waste_reason_customer_return',
  Complimentary: 'mrgs_waste_reason_complimentary',
  Other: 'mrgs_waste_reason_other'
};
