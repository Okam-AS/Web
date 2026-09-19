import fs from 'fs'
import path from 'path'
import translations from '~/translations'

// «SKJUL FOR KASSA» IS A FIELD OF ITS OWN, AND THAT IS THE WHOLE ASSERTION.
//
// The backend carries it as `hideFromPos` (`bool?`) on StoreProductModel and CategoryModel, beside
// — never inside — `hideFromDeliveryTypes`. The till is not a DeliveryType, so a fourth member
// pushed into that list would be rebuilt away by the server on the next save: `products.vue`
// §`buildHideFromDeliveryTypes` REBUILDS the list from its booleans, so anything the builder does
// not know is dropped with a 200 and no words. This pins the boundary the two editors must keep.
//
// Neither page can be imported here — their templates use optional chaining, which this repo's
// Vue 2 template compiler cannot parse (`test/product-vat-rate-is-the-decimal.test.js` §the same
// limitation) — so the source is read as text, which is what the precedent above does too.

const read = file => fs.readFileSync(path.resolve(__dirname, '..', 'pages/admin', file), 'utf8')
const products = read('products.vue')
const categoryEditor = read('category-editor.vue')

describe('the register checkbox writes hideFromPos', () => {
  test('the product editor binds the field itself', () => {
    expect(products).toContain('v-model="selectedProduct.hideFromPos"')
    expect(products).toContain('$i(\'products_hideForPos\')')
  })

  test('the category editor binds the field itself', () => {
    expect(categoryEditor).toContain('v-model="category.hideFromPos"')
    expect(categoryEditor).toContain('$i(\'categoryEditor_deliveryPos\')')
  })

  test('a category that never said anything reads as shown, not as hidden', () => {
    // `=== true` and not `||`: `undefined` must open the box unticked without the page inventing a
    // stored `false` the server was never told about.
    expect(categoryEditor).toContain('hideFromPos: category.hideFromPos === true')
  })

  test('a product that never said anything reads as shown, not as hidden', () => {
    expect(products).toContain('this.$set(this.selectedProduct, \'hideFromPos\', this.selectedProduct.hideFromPos === true)')
  })

  // THE LOAD-BEARING LINE, not the checkbox: the body is built by spreading the edited product, so
  // that spread is what actually carries the field to `POST /products`. A page that bound the box
  // and then hand-picked its save fields would satisfy every assertion above and still drop it.
  test('the save spreads the edited product, which is what carries the field to the wire', () => {
    const save = products.slice(
      products.indexOf('async saveProduct()'),
      products.indexOf('async savePendingCategoryChanges()')
    )
    expect(save).toContain('...this.selectedProduct')
    expect(save).not.toContain('hideFromPos:')
  })

  test('the delivery-type builder is untouched — the register is not one of its members', () => {
    const builder = products.slice(
      products.indexOf('buildHideFromDeliveryTypes() {'),
      products.indexOf('async saveProduct()')
    )
    expect(builder).not.toContain('hideFromPos')
    expect(builder).not.toContain('Pos"')
  })
})

describe('the words exist in every language the estate ships', () => {
  const LOCALES = ['no', 'en', 'de']

  test.each(LOCALES)('%s names both checkboxes', (locale) => {
    expect(translations[locale].products_hideForPos).toBeTruthy()
    expect(translations[locale].categoryEditor_deliveryPos).toBeTruthy()
  })
})
