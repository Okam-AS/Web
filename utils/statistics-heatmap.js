// Use server-provided calendar buckets: parsing a sample timestamp in the
// browser would move orders to another hour/day for users in another timezone.
export function createHeatmapGrid(cells = []) {
  const grid = {};
  for (let day = 0; day < 7; day++) {
    grid[day] = {};
    for (let hour = 0; hour < 24; hour++) grid[day][hour] = { orders: 0, revenue: 0 };
  }
  cells.forEach((cell) => {
    if (!cell || !Number.isInteger(cell.dayOfWeek) || cell.dayOfWeek < 0 || cell.dayOfWeek > 6 ||
        !Number.isInteger(cell.hour) || cell.hour < 0 || cell.hour > 23 ||
        !Number.isFinite(cell.orderCount) || cell.orderCount < 0) return;
    grid[cell.dayOfWeek][cell.hour].orders += cell.orderCount;
    if (Number.isFinite(cell.revenue)) grid[cell.dayOfWeek][cell.hour].revenue += cell.revenue;
  });
  return grid;
}

export const heatmapIntensity = (count, maximum) => count > 0 && maximum > 0 ? count / maximum : 0;

export function heatmapResponseMatchesBasis(response, basis) {
  return response?.timeBasis === basis && Array.isArray(response.data);
}
