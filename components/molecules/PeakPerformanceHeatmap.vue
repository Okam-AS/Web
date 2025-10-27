<template>
  <div class="peak-performance-heatmap">
    <div class="heatmap-header">
      <h3 class="heatmap-title">
        <span class="material-icons">assessment</span>
        Toppytelse Oversikt
      </h3>
    </div>

    <div class="heatmap-description">
      <p>Oversikt over aktivitet fordelt på ukedag og time. Mørkere grønn = høyere aktivitet.</p>
    </div>

    <div class="heatmap-container">
      <div class="heatmap-grid">
        <!-- Y-axis labels (days) -->
        <div class="y-axis">
          <div class="axis-label-spacer"></div>
          <div
            v-for="day in days"
            :key="day.id"
            class="day-label"
          >
            {{ day.short }}
          </div>
        </div>

        <!-- Heatmap cells -->
        <div class="heatmap-content">
          <!-- X-axis labels (hours) -->
          <div class="x-axis">
            <div
              v-for="hour in hours"
              :key="hour"
              class="hour-label"
              :class="{ 'major-label': hour % 3 === 0 }"
            >
              <span v-if="hour % 3 === 0">{{ hour }}</span>
            </div>
          </div>

          <!-- Grid cells -->
          <div
            v-for="day in days"
            :key="day.id"
            class="heatmap-row"
          >
            <div
              v-for="hour in 24"
              :key="`${day.id}-${hour - 1}`"
              class="heatmap-cell"
              :class="getCellClass(day.id, hour - 1)"
              :style="getCellStyle(day.id, hour - 1)"
              @mouseenter="showTooltip($event, day, hour - 1)"
              @mouseleave="hideTooltip"
            >
              <div
                v-if="isBusiestHour(day.id, hour - 1)"
                class="busiest-badge"
              >
                <span class="material-icons">star</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Color scale legend -->
      <div class="color-legend">
        <span class="legend-label">Lav</span>
        <div class="legend-gradient"></div>
        <span class="legend-label">Høy</span>
      </div>
    </div>

    <!-- Tooltip -->
    <div
      v-if="tooltip.visible"
      class="heatmap-tooltip"
      :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }"
    >
      <div class="tooltip-header">{{ tooltip.title }}</div>
      <div class="tooltip-content">
        <div class="tooltip-row">
          <span class="material-icons">shopping_cart</span>
          <span>{{ tooltip.orders }} bestillinger</span>
        </div>
        <div
          v-if="dateRange"
          class="tooltip-row secondary"
        >
          <span class="material-icons">date_range</span>
          <span>{{ dateRange }}</span>
        </div>
        <div
          v-if="tooltip.percentage"
          class="tooltip-row secondary"
        >
          <span>{{ tooltip.percentage }} av total</span>
        </div>
        <div
          v-if="tooltip.isBusiest"
          class="tooltip-badge"
        >
          <span class="material-icons">star</span>
          Travleste time
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PeakPerformanceHeatmap',
  props: {
    data: {
      type: Array,
      required: true,
      // Expected: array of { timestamp, orders, revenue }
    },
    dateRange: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      days: [
        { id: 1, name: 'Mandag', short: 'Man' },
        { id: 2, name: 'Tirsdag', short: 'Tir' },
        { id: 3, name: 'Onsdag', short: 'Ons' },
        { id: 4, name: 'Torsdag', short: 'Tor' },
        { id: 5, name: 'Fredag', short: 'Fre' },
        { id: 6, name: 'Lørdag', short: 'Lør' },
        { id: 0, name: 'Søndag', short: 'Søn' },
      ],
      hours: Array.from({ length: 24 }, (_, i) => i),
      tooltip: {
        visible: false,
        x: 0,
        y: 0,
        title: '',
        orders: 0,
        percentage: '',
        isBusiest: false,
      },
      heatmapData: {},
      maxValue: 0,
      minValue: 0,
    };
  },
  watch: {
    data: {
      immediate: true,
      handler() {
        this.processData();
      },
    },
  },
  methods: {
    processData() {
      // Initialize heatmap data structure
      const processed = {};
      this.days.forEach((day) => {
        processed[day.id] = {};
        for (let hour = 0; hour < 24; hour++) {
          processed[day.id][hour] = { orders: 0, revenue: 0 };
        }
      });

      // Process input data - backend already aggregates by day/hour
      this.data.forEach((item) => {
        const date = new Date(item.timestamp || item.key || item.x);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();

        if (processed[dayOfWeek] && processed[dayOfWeek][hour]) {
          // Backend sends pre-aggregated data, so just use the orders count directly
          processed[dayOfWeek][hour].orders = item.orders || item.value || item.y || 0;
          processed[dayOfWeek][hour].revenue = item.revenue || item.amount || 0;
        }
      });

      this.heatmapData = processed;

      // Calculate max/min values for scaling (only based on orders)
      let max = 0;
      let min = Infinity;

      Object.values(processed).forEach((dayData) => {
        Object.values(dayData).forEach((hourData) => {
          const value = hourData.orders;
          if (value > max) max = value;
          if (value < min && value > 0) min = value;
        });
      });

      this.maxValue = max;
      this.minValue = min === Infinity ? 0 : min;
    },
    getCellValue(dayId, hour) {
      const cellData = this.heatmapData[dayId]?.[hour];
      if (!cellData) return 0;
      return cellData.orders;
    },
    getCellIntensity(dayId, hour) {
      const value = this.getCellValue(dayId, hour);
      if (value === 0 || this.maxValue === 0) return 0;
      return (value - this.minValue) / (this.maxValue - this.minValue);
    },
    getCellStyle(dayId, hour) {
      const intensity = this.getCellIntensity(dayId, hour);
      if (intensity === 0) {
        return { backgroundColor: '#f8f9fa' };
      }

      // Color scale from light green to dark green
      const hue = 142; // Green hue
      const saturation = 50 + intensity * 30; // 50-80%
      const lightness = 95 - intensity * 50; // 95% to 45%

      return {
        backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      };
    },
    getCellClass(dayId, hour) {
      const intensity = this.getCellIntensity(dayId, hour);
      if (intensity === 0) return 'empty';
      if (intensity > 0.8) return 'very-high';
      if (intensity > 0.6) return 'high';
      if (intensity > 0.4) return 'medium';
      if (intensity > 0.2) return 'low';
      return 'very-low';
    },
    isBusiestHour(dayId, hour) {
      const value = this.getCellValue(dayId, hour);
      return value === this.maxValue && value > 0;
    },
    showTooltip(event, day, hour) {
      const cellData = this.heatmapData[day.id]?.[hour];
      if (!cellData) return;

      const rect = event.target.getBoundingClientRect();
      const totalOrders = this.getTotalOrders();

      this.tooltip = {
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
        title: `${day.name} ${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`,
        orders: cellData.orders,
        percentage: totalOrders > 0 ? `${((cellData.orders / totalOrders) * 100).toFixed(1)}%` : '',
        isBusiest: this.isBusiestHour(day.id, hour),
      };
    },
    hideTooltip() {
      this.tooltip.visible = false;
    },
    getTotalOrders() {
      let total = 0;
      Object.values(this.heatmapData).forEach((dayData) => {
        Object.values(dayData).forEach((hourData) => {
          total += hourData.orders;
        });
      });
      return total;
    },
  },
};
</script>

<style lang="scss" scoped>
.peak-performance-heatmap {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 32px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.heatmap-header {
  margin-bottom: 12px;

  .heatmap-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0;
    font-size: 1.3em;
    font-weight: 600;
    color: #292c34;

    .material-icons {
      font-size: 28px;
      color: #1bb776;
    }
  }
}

.heatmap-description {
  margin-bottom: 20px;

  p {
    color: #666;
    font-size: 0.95em;
    margin: 0;
    line-height: 1.5;
  }
}

.heatmap-container {
  overflow-x: auto;
  padding: 16px 0;

  @media (max-width: 768px) {
    overflow-x: scroll;
    -webkit-overflow-scrolling: touch;
  }
}

.heatmap-grid {
  display: flex;
  gap: 8px;
  min-width: 900px;

  @media (max-width: 1024px) {
    min-width: 750px;
  }

  @media (max-width: 768px) {
    min-width: 650px;
    gap: 6px;
  }
}

.y-axis {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;

  .axis-label-spacer {
    height: 24px;
    flex-shrink: 0;
  }

  .day-label {
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 12px;
    font-size: 0.9em;
    font-weight: 600;
    color: #4a5568;
    min-width: 45px;

    @media (max-width: 768px) {
      height: 26px;
      font-size: 0.85em;
      padding-right: 8px;
      min-width: 40px;
    }
  }
}

.heatmap-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.x-axis {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 2px;
  margin-bottom: 8px;
  height: 24px;

  .hour-label {
    text-align: center;
    font-size: 0.7em;
    font-weight: 500;
    color: transparent;
    padding: 4px 0;
    position: relative;

    &.major-label {
      font-weight: 600;
      color: #4a5568;
      font-size: 0.85em;

      span {
        display: inline-block;
      }
    }

    @media (max-width: 768px) {
      font-size: 0.65em;

      &.major-label {
        font-size: 0.75em;
      }
    }
  }
}

.heatmap-row {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 2px;
}

.heatmap-cell {
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  height: 32px;
  width: 100%;

  &:hover {
    transform: scale(1.15);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    z-index: 10;
  }

  &.empty {
    background: #f8f9fa !important;
    border: 1px solid #e8ecef;
  }

  @media (max-width: 768px) {
    height: 26px;
    border-radius: 2px;
  }
}

.busiest-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  background: #fbbf24;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  .material-icons {
    font-size: 10px;
    color: white;
  }
}

.color-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  justify-content: center;

  .legend-label {
    font-size: 0.85em;
    color: #666;
    font-weight: 500;
  }

  .legend-gradient {
    width: 200px;
    height: 20px;
    border-radius: 10px;
    background: linear-gradient(
      to right,
      #f0fdf4,
      #bbf7d0,
      #86efac,
      #4ade80,
      #22c55e,
      #16a34a,
      #15803d,
      #14532d
    );
    border: 1px solid #e2e8f0;
  }
}

.heatmap-tooltip {
  position: fixed;
  transform: translate(-50%, -100%);
  background: white;
  padding: 16px;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  pointer-events: none;
  min-width: 220px;
  border: 2px solid #1bb776;
  animation: tooltipFadeIn 0.2s ease;

  .tooltip-header {
    font-weight: 700;
    color: #292c34;
    margin-bottom: 12px;
    font-size: 0.95em;
    border-bottom: 2px solid #e8f7f1;
    padding-bottom: 8px;
  }

  .tooltip-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tooltip-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #4a5568;
    font-size: 0.9em;
    font-weight: 500;

    .material-icons {
      font-size: 16px;
      color: #1bb776;
    }

    &.secondary {
      font-size: 0.85em;
      color: #718096;

      .material-icons {
        font-size: 14px;
        color: #718096;
      }
    }
  }

  .tooltip-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.85em;
    font-weight: 700;
    margin-top: 8px;

    .material-icons {
      font-size: 14px;
    }
  }
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -100%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%) scale(1);
  }
}
</style>
