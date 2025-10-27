<template>
  <div class="statistics-chart">
    <canvas :id="chartId" ref="canvas"></canvas>
  </div>
</template>

<script>
export default {
  name: 'StatisticsChart',
  props: {
    data: {
      type: Object,
      required: true,
      // Expected format: { labels: [], values: [], label: '' }
    },
    comparisonData: {
      type: Object,
      default: null,
      // Expected format: { labels: [], values: [], label: '' }
    },
    chartId: {
      type: String,
      required: true,
    },
    valueIsPrice: {
      type: Boolean,
      default: false,
    },
    dateRange: {
      type: String,
      default: '',
    },
    comparisonDateRange: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      chart: null,
    };
  },
  computed: {
    average() {
      if (!this.data.values || this.data.values.length === 0) return 0;
      const sum = this.data.values.reduce((a, b) => a + b, 0);
      return sum / this.data.values.length;
    },
  },
  watch: {
    data: {
      deep: true,
      handler() {
        this.updateChart();
      },
    },
    comparisonData: {
      deep: true,
      handler() {
        this.updateChart();
      },
    },
  },
  mounted() {
    this.initChart();
  },
  beforeDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  },
  methods: {
    async initChart() {
      // Dynamically import Chart.js only when needed
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      const ctx = this.$refs.canvas.getContext('2d');

      // Store component instance reference for use in callbacks
      const self = this;

      // Build datasets array
      const datasets = [
        {
          label: this.dateRange || 'Periode 1',
          data: this.data.values || [],
          borderColor: '#1bb776',
          backgroundColor: 'rgba(27, 183, 118, 0.15)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: '#1bb776',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBorderWidth: 3,
        },
      ];

      // Add comparison dataset if available
      if (this.comparisonData && this.comparisonData.values) {
        datasets.push({
          label: this.comparisonDateRange || 'Periode 2',
          data: this.comparisonData.values || [],
          borderColor: '#1e40af',
          backgroundColor: 'rgba(30, 64, 175, 0.1)',
          borderWidth: 2.5,
          borderDash: [8, 4],
          fill: false,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: '#1e40af',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBorderWidth: 3,
        });
      }

      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: this.data.labels || [],
          datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              display: this.comparisonData != null,
              position: 'top',
              align: 'end',
              labels: {
                usePointStyle: true,
                pointStyle: 'line',
                padding: 15,
                font: {
                  size: 12,
                  weight: '600',
                },
                color: '#4a5568',
              },
            },
            tooltip: {
              enabled: true,
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              titleColor: '#292c34',
              bodyColor: '#4a5568',
              borderColor: '#e2e8f0',
              borderWidth: 2,
              padding: 16,
              bodySpacing: 8,
              displayColors: true,
              boxWidth: 12,
              boxHeight: 12,
              usePointStyle: true,
              cornerRadius: 8,
              titleFont: {
                size: 13,
                weight: '700',
              },
              bodyFont: {
                size: 13,
                weight: '500',
              },
              callbacks: {
                title: (items) => {
                  return items[0].label || '';
                },
                label: (context) => {
                  const value = context.parsed.y;
                  const datasetLabel = context.dataset.label || '';
                  let formattedValue;

                  if (self.valueIsPrice) {
                    formattedValue = 'kr ' + value.toLocaleString('nb-NO', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    });
                  } else {
                    formattedValue = value.toLocaleString('nb-NO');
                  }

                  return `${datasetLabel}: ${formattedValue}`;
                },
                afterBody: (items) => {
                  if (!self.comparisonData || items.length < 2) {
                    // Show average line
                    const avgText = self.valueIsPrice
                      ? 'kr ' + self.average.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : self.average.toFixed(0);
                    return [``, `Gjennomsnitt: ${avgText}`];
                  }

                  // Show comparison if both datasets present
                  const period1Value = items[0].parsed.y;
                  const period2Value = items[1]?.parsed.y;

                  if (period2Value != null && period2Value !== 0) {
                    const diff = period1Value - period2Value;
                    const percentChange = ((diff / period2Value) * 100).toFixed(1);
                    const icon = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
                    const sign = diff > 0 ? '+' : '';

                    return [``, `Endring: ${icon} ${sign}${percentChange}%`];
                  }

                  return [];
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.06)',
                drawBorder: false,
              },
              ticks: {
                color: '#718096',
                font: {
                  size: 11,
                  weight: '500',
                },
                padding: 8,
                callback: (value) => {
                  if (self.valueIsPrice) {
                    return 'kr ' + value.toLocaleString('nb-NO', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    });
                  }
                  return value.toLocaleString('nb-NO');
                },
              },
            },
            x: {
              grid: {
                display: false,
                drawBorder: false,
              },
              ticks: {
                color: '#718096',
                font: {
                  size: 11,
                  weight: '500',
                },
                padding: 8,
              },
            },
          },
        },
      });
    },
    updateChart() {
      if (!this.chart) return;

      this.chart.data.labels = this.data.labels || [];
      this.chart.data.datasets[0].data = this.data.values || [];
      this.chart.data.datasets[0].label = this.dateRange || 'Periode 1';

      // Update or add comparison dataset
      if (this.comparisonData && this.comparisonData.values) {
        if (this.chart.data.datasets.length > 1) {
          // Update existing comparison dataset
          this.chart.data.datasets[1].data = this.comparisonData.values || [];
          this.chart.data.datasets[1].label = this.comparisonDateRange || 'Periode 2';
        } else {
          // Add new comparison dataset
          this.chart.data.datasets.push({
            label: this.comparisonDateRange || 'Periode 2',
            data: this.comparisonData.values || [],
            borderColor: '#1e40af',
            backgroundColor: 'rgba(30, 64, 175, 0.1)',
            borderWidth: 2.5,
            borderDash: [8, 4],
            fill: false,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: '#1e40af',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverBorderWidth: 3,
          });
        }
        this.chart.options.plugins.legend.display = true;
      } else if (this.chart.data.datasets.length > 1) {
        // Remove comparison dataset
        this.chart.data.datasets.splice(1, 1);
        this.chart.options.plugins.legend.display = false;
      }

      this.chart.update('active');
    },
  },
};
</script>

<style lang="scss" scoped>
.statistics-chart {
  position: relative;
  width: 100%;
  height: 250px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  canvas {
    width: 100% !important;
    height: 100% !important;
  }

  @media (max-width: 768px) {
    height: 200px;
    padding: 12px;
  }
}
</style>
