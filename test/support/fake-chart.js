// A Chart.js double for `pages/admin/poweruser-growth.vue`.
//
// jsdom ships no canvas, so `getContext('2d')` answers null and real Chart.js refuses to construct
// ("Failed to create chart: can't acquire context from the given item"). Mocking it is not a way of
// avoiding the chart — it is what makes the chart ASSERTABLE. The page's zoom arithmetic and its
// marker placement are written against `chart.chartArea` and `chart.scales`, so a double with a
// known, linear pixel mapping is the only way to say "dragging from this pixel to that one selects
// the months the operator dragged across" and have the sentence mean something.
//
// The mapping is deliberately simple and stated once here: the plot area is 600px wide starting at
// x=60, and the N labels are spread evenly across it. A test therefore knows that month `i` sits at
// `60 + i * (600 / (N - 1))`.

class FakeChart {
  constructor (ctx, config) {
    this.ctx = ctx
    this.data = config.data
    this.options = config.options
    this.pluginList = config.plugins || []
    this.chartArea = { left: 60, right: 660, top: 20, bottom: 420 }

    const self = this
    this.scales = {
      x: {
        get step () {
          return 600 / Math.max((self.data.labels || []).length - 1, 1)
        },
        getPixelForValue: index => 60 + index * self.scales.x.step,
        getValueForPixel: pixel => (pixel - 60) / self.scales.x.step
      },
      y: {
        // Zero sits on the floor of the plot and values grow upwards. No assertion turns on the
        // slope; that markers land inside the plot area is all this has to be right about.
        getPixelForValue: value => 420 - Math.min(Number(value) || 0, 1000) * 0.4
      }
    }

    this.updates = []
    this.destroyed = false
    FakeChart.instances.push(this)
    this.runPlugins()
  }

  // Chart.js calls `afterDatasetsDraw` on every draw, and the page's annotation plugin is what
  // fills `annotationHitAreas`. Without this the markers would never become hoverable and every
  // annotation assertion would be reading an empty list — passing for the wrong reason.
  runPlugins () {
    this.pluginList.forEach(plugin => plugin.afterDatasetsDraw && plugin.afterDatasetsDraw(this))
  }

  update (mode) {
    this.updates.push(mode)
    this.runPlugins()
  }

  destroy () {
    this.destroyed = true
  }
}

FakeChart.instances = []
FakeChart.register = () => {}
FakeChart.reset = () => { FakeChart.instances = [] }
FakeChart.latest = () => FakeChart.instances[FakeChart.instances.length - 1]

// A 2d context that records nothing and refuses nothing. `drawAnnotations` paints every marker
// through it; what the tests assert is where the markers ENDED UP, which the page records in
// `annotationHitAreas`, not what was painted.
FakeChart.installCanvasContext = () => {
  window.HTMLCanvasElement.prototype.getContext = () => ({
    save () {}, restore () {}, beginPath () {}, arc () {}, fill () {}, stroke () {},
    set fillStyle (v) {}, set strokeStyle (v) {}, set lineWidth (v) {}
  })
}

module.exports = { FakeChart }
