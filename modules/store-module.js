let store

export function init (context) {
  store = context.store
};

export default () => { return store }
