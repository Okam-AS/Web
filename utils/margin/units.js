// The unit codes a component line may be authored in, per ingredient base unit.
//
// WHY THIS LIST IS NARROW ON PURPOSE. A component's `unitCode` is a free-text string on the wire, and
// the backend resolves it in a fixed order (`MarginRecipeSupport.TryConvertToBaseUnit`): first any
// conversion the venue authored on the ingredient itself (pack → base), then the universal metric
// family, then FAIL — and a failure is not an error, it is a line that silently does not price. The
// venue-authored conversions live on `GET /margin/ingredients/{id}`, a per-ingredient read this
// surface does not make, so the only codes it can offer with a guarantee are the universal ones. A
// picker that offered a code we cannot promise converts would manufacture unpriced lines and blame
// the price data for them.
//
// The lists mirror `MarginRecipeSupport.TryFamilyFactor` exactly — one representative spelling per
// factor, since that switch accepts several aliases for each ("g"/"gram"/"grams"/"gr" are one entry
// here). If that switch gains a unit, this gains one; if it loses one, a line authored in it stops
// pricing. `test/margin-units.test.js` pins the correspondence.

/** The `MarginBaseUnit` members as they serialise (string enum, Newtonsoft convention). */
export const BASE_UNITS = ['Gram', 'Kilogram', 'Milliliter', 'Liter', 'Piece'];

const MASS = ['g', 'kg'];
const VOLUME = ['ml', 'cl', 'dl', 'l'];
const COUNT = ['stk'];

const BY_BASE_UNIT = {
  Gram: MASS,
  Kilogram: MASS,
  Milliliter: VOLUME,
  Liter: VOLUME,
  Piece: COUNT
};

/**
 * The unit codes guaranteed to convert to `baseUnit` without a venue-authored conversion.
 *
 * An unrecognised base unit yields an EMPTY list rather than a default family: guessing "probably
 * grams" for a unit the backend does not know would author lines that cannot price. The caller shows
 * that the units are unknown instead.
 */
export function unitCodesFor (baseUnit) {
  const codes = BY_BASE_UNIT[baseUnit];
  return codes ? codes.slice() : [];
}

/** The code a component defaults to for an ingredient: its own base unit's canonical spelling. */
export function defaultUnitCodeFor (baseUnit) {
  switch (baseUnit) {
  case 'Gram': return 'g';
  case 'Kilogram': return 'kg';
  case 'Milliliter': return 'ml';
  case 'Liter': return 'l';
  case 'Piece': return 'stk';
  default: return '';
  }
}
