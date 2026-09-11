import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const helper = read('utils/statistics-heatmap.js').replace(/^export /gm, '');
const { createHeatmapGrid, heatmapIntensity, heatmapResponseMatchesBasis } = vm.runInNewContext(
  helper + '\n({ createHeatmapGrid, heatmapIntensity, heatmapResponseMatchesBasis })', {},
);
const script = read('pages/admin/statistics.vue').match(/<script>([\s\S]*?)<\/script>/)[1];
const page = vm.runInNewContext(script.replace(/^import .*;$/gm, '').replace('export default', 'module.exports ='), {
  module: { exports: {} }, AdminPage: {}, LoginModal: {}, MultiSelectDropdown: {}, StatisticsChart: {}, LoadingSkeleton: {},
  PeakPerformanceHeatmap: {}, AIQueryBox: {}, heatmapResponseMatchesBasis, console: { error() {} },
});
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const plain = value => JSON.parse(JSON.stringify(value));
function statistics() {
  const requests = [];
  const state = { ...page.data(), $i: key => key };
  state.selectedStoreIds = [12];
  state.dateRange = { from: '2026-09-01', to: '2026-09-30' };
  state._statisticsService = {
    Get: async model => { requests.push(['general', model]); return { charts: [] }; },
    GetHeatmapData: model => { const response = deferred(); requests.push(['heatmap', model, response]); return response.promise; },
  };
  for (const [name, fn] of Object.entries(page.methods)) state[name] = fn.bind(state);
  return { state, requests };
}
test('heatmap uses explicit Sunday-midnight and Saturday-last-hour buckets regardless of sample timezone', () => {
  const grid = createHeatmapGrid([
    { dayOfWeek: 0, hour: 0, orderCount: 2, revenue: 200, sampleTimestamp: '2026-09-06T00:00:00+02:00' },
    { dayOfWeek: 6, hour: 23, orderCount: 3, revenue: 300, sampleTimestamp: '2026-09-05T23:00:00-10:00' },
  ]);
  assert.equal(grid[0][0].orders, 2);
  assert.equal(grid[6][23].orders, 3);
  assert.equal(grid[6][22].orders, 0);
  assert.equal(grid[0][9].orders, 0);
});
test('multiple rows in same bucket accumulate rather than overwrite', () => {
  const grid = createHeatmapGrid([
    { dayOfWeek: 1, hour: 12, orderCount: 2, revenue: 200 },
    { dayOfWeek: 1, hour: 12, orderCount: 3, revenue: 350 },
  ]);
  assert.deepEqual(plain(grid[1][12]), { orders: 5, revenue: 550 });
});
test('missing/invalid grouping keys never fall back to a potentially different sample timestamp', () => {
  const grid = createHeatmapGrid([
    { sampleTimestamp: '2026-09-07T12:00:00', orderCount: 7 },
    { dayOfWeek: 7, hour: 12, orderCount: 7 },
    { dayOfWeek: 1, hour: 24, orderCount: 7 },
    { dayOfWeek: 1, hour: 12, orderCount: -7 },
  ]);
  assert.equal(Object.values(grid).flatMap(Object.values).reduce((sum, cell) => sum + cell.orders, 0), 0);
});
test('uniform nonzero and smallest nonzero cells are visible, zero is empty', () => {
  assert.equal(heatmapIntensity(5, 5), 1);
  assert.equal(heatmapIntensity(2, 5), 0.4);
  assert.equal(heatmapIntensity(0, 5), 0);
  assert.equal(heatmapIntensity(0, 0), 0);
});
test('heatmap request opts into selected timestamp and exact date range, other statistics keep their basis', async () => {
  for (const basis of ['Created', 'RequestedCompletion', 'Completed']) {
    const s = statistics(); s.state.heatmapTimeBasis = basis;
    const work = s.state.loadStatistics();
    const [, model, pending] = s.requests.find(([kind]) => kind === 'heatmap');
    assert.equal(model.heatmapTimeBasis, basis);
    assert.equal(model.from, '2026-09-01'); assert.equal(model.to, '2026-09-30');
    assert.deepEqual(plain(model.storeIds), [12]);
    assert.deepEqual(plain(model.statuses), ['Completed']);
    assert.ok(s.requests.filter(([kind]) => kind === 'general').every(([, model]) => model.heatmapTimeBasis === undefined));
    pending.resolve({ timeBasis: basis, data: [] }); await work;
    assert.equal(s.state.heatmapError, '');
  }
});
test('older basis response cannot overwrite newer selection or release its loading state', async () => {
  const s = statistics(); const oldWork = s.state.loadStatistics();
  const old = s.requests.find(([kind]) => kind === 'heatmap')[2];
  s.state.heatmapTimeBasis = 'RequestedCompletion'; const newWork = s.state.loadStatistics();
  const latest = s.requests.filter(([kind]) => kind === 'heatmap')[1][2];
  old.resolve({ timeBasis: 'Created', data: [{ dayOfWeek: 1, hour: 10, orderCount: 1 }] }); await oldWork;
  assert.equal(s.state.isLoading, true); assert.equal(s.state.heatmapRawData.length, 0);
  const data = [{ dayOfWeek: 2, hour: 11, orderCount: 3 }];
  latest.resolve({ timeBasis: 'RequestedCompletion', data }); await newWork;
  assert.deepEqual(s.state.heatmapRawData, data); assert.equal(s.state.isLoading, false);
});
test('backend that ignores requested basis shows a clear error instead of mislabeled legacy Pickup data', async () => {
  const s = statistics(); s.state.heatmapTimeBasis = 'RequestedCompletion'; const work = s.state.loadStatistics();
  s.requests.find(([kind]) => kind === 'heatmap')[2].resolve({ data: [{ dayOfWeek: 1, hour: 12, orderCount: 3 }] });
  await work; assert.equal(s.state.heatmapRawData.length, 0);
  assert.equal(s.state.heatmapError, 'peakPerformanceHeatmap_loadError');
});
test('failed refresh clears old heatmap rather than labeling stale results with a new period', async () => {
  const s = statistics(); s.state.heatmapRawData = [{ orderCount: 5 }]; const work = s.state.loadStatistics();
  assert.equal(s.state.heatmapRawData.length, 0);
  s.requests.find(([kind]) => kind === 'heatmap')[2].reject(Error('offline')); await work;
  assert.equal(s.state.heatmapError, 'peakPerformanceHeatmap_loadError'); assert.equal(s.state.isLoading, false);
});
