// Puts a borrowed `core/` back after the run, whatever happened to the dev server.
//
// The dev-server wrapper releases it on SIGTERM and on exit, and that is the normal path. This is
// the path for when there is no normal path: Playwright kills a webServer's whole process tree, and
// a SIGKILLed process runs no handler. The marker `artifacts/.core-borrowed` is what lets a
// different process know the directory is ours to remove — see test/e2e/support/core-checkout.js.
//
// It never removes a real checkout: without the marker it does nothing at all.

const { releaseBorrowedCore } = require('../support/core-checkout');

module.exports = () => {
  if (releaseBorrowedCore()) {
    process.stdout.write('[teardown] returned core/ to an empty submodule mount\n');
  }
};
