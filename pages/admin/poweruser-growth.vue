<template>
  <AdminPage :full-width="true" @login-success="handleLoginSuccess">
    <div class="growth-page">
      <div class="growth-shell">
        <header class="growth-header">
          <div>
            <h1>Okam vekst</h1>
            <p class="period">
              Fullførte bestillinger fra {{ formatShortDate(reportRange.from) }} til {{ formatShortDate(reportRange.to) }}
            </p>
          </div>
          <div class="metric-toggle" role="tablist" aria-label="Velg metrikk">
            <button
              type="button"
              :class="{ active: selectedMetric === 'orders' }"
              @click="setMetric('orders')"
            >
              Bestillinger
            </button>
            <button
              type="button"
              :class="{ active: selectedMetric === 'revenue' }"
              @click="setMetric('revenue')"
            >
              Kroner
            </button>
          </div>
        </header>

        <section class="hero-stats" v-if="growthData">
          <div class="hero-stat">
            <span>Bestillinger</span>
            <strong>{{ formatNumber(latestOrderCount) }}</strong>
          </div>
          <div class="hero-stat">
            <span>Omsetning</span>
            <strong>{{ formatCurrency(latestRevenueAmount) }}</strong>
          </div>
          <div class="hero-stat">
            <span>Siste måned</span>
            <strong>{{ formatMonth(latestPointDate) }}</strong>
          </div>
        </section>

        <div v-if="isLoading" class="loading-state">
          <Loading :loading="true" />
        </div>

        <div v-else-if="errorMessage" class="empty-state">
          <h2>Kunne ikke hente vekstdata</h2>
          <p>{{ errorMessage }}</p>
        </div>

        <section v-else-if="growthData" ref="chartPanel" class="chart-panel">
          <div class="chart-zoom-controls">
            <span>{{ isZoomed ? zoomRangeLabel : "Dra i grafen for å zoome" }}</span>
            <button v-if="isZoomed" type="button" @click="resetZoom">Vis alt</button>
          </div>
          <div class="chart-legend">
            <button
              type="button"
              class="chart-legend-button"
              :class="{ 'chart-legend-button--inactive': !visibleAnnotationTypes.store }"
              :aria-pressed="visibleAnnotationTypes.store.toString()"
              @click="toggleAnnotationType('store')"
            >
              <i class="legend-dot legend-dot--store"></i>Nye butikker
            </button>
            <button
              type="button"
              class="chart-legend-button"
              :class="{ 'chart-legend-button--inactive': !visibleAnnotationTypes.feature }"
              :aria-pressed="visibleAnnotationTypes.feature.toString()"
              @click="toggleAnnotationType('feature')"
            >
              <i class="legend-dot legend-dot--milestone"></i>Nye features
            </button>
          </div>
          <canvas ref="growthCanvas"></canvas>
          <div v-if="zoomDraftStyle" class="zoom-selection" :style="zoomDraftStyle"></div>
          <div
            v-if="activeAnnotationItem && activeAnnotationPosition"
            class="annotation-popover"
            :class="{
              'annotation-popover--store': activeAnnotationItem.type === 'store',
              'annotation-popover--feature': activeAnnotationItem.type === 'feature',
            }"
            :style="activeAnnotationStyle"
          >
            <strong>{{ activeAnnotationItem.title }}</strong>
            <span>{{ activeAnnotationItem.dateLabel }}</span>
            <small>{{ activeAnnotationItem.type === "store" ? "Butikker som startet" : "Hendelser" }}</small>
            <ul>
              <li v-for="line in activeAnnotationLines" :key="line">{{ line }}</li>
            </ul>
            <div v-if="activeAnnotationMonthStats" class="annotation-month-stats">
              <small>Månedspunkt på kurven</small>
              <div>
                <span>{{ activeAnnotationMonthStats.monthLabel }}</span>
                <strong>{{ activeAnnotationMonthStats.monthValue }}</strong>
              </div>
              <div>
                <span>{{ activeAnnotationMonthStats.totalLabel }}</span>
                <strong>{{ activeAnnotationMonthStats.totalValue }}</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import Loading from "~/components/atoms/Loading.vue";

const STORE_START_EVENTS = [
  { date: "2021-02-15T14:07:29", name: "Stolpen butikk" },
  { date: "2021-05-07T13:49:53", name: "Istanbul" },
  { date: "2021-05-28T19:39:16", name: "Hotpot Oslo" },
  { date: "2022-05-14T11:30:35", name: "Ikigai Sushi" },
  { date: "2022-06-07T14:49:00", name: "Ugress Burger" },
  { date: "2023-04-27T12:15:55", name: "Skei Servicenter" },
  { date: "2023-09-26T15:02:39", name: "Jungel Pizza Sagene" },
  { date: "2023-10-09T19:40:57", name: "Jungel Pizza St. Haugen" },
  { date: "2023-10-10T19:42:45", name: "Jungel Pizza Torshov" },
  { date: "2024-02-09T17:00:39", name: "Jungel Pizza Adamstuen" },
  { date: "2024-04-25T12:46:40", name: "Circle K Ølensvåg" },
  { date: "2024-11-02T18:00:19", name: "Chili Food Market AS" },
  { date: "2025-01-19T00:56:17", name: "Chicken House" },
  { date: "2025-01-26T15:06:29", name: "Arena Restaurant & Kafe" },
  { date: "2025-01-29T16:39:59", name: "Alfonzo Pizzeria" },
  { date: "2025-03-19T17:28:28", name: "Alegria Bistro" },
  { date: "2025-03-25T14:35:50", name: "STRANDY" },
  { date: "2025-04-15T17:17:52", name: "Lierbyen Sushi & Wok" },
  { date: "2025-04-26T19:39:30", name: "Maxim´s Grill" },
  { date: "2025-05-07T12:28:36", name: "Miss Gin" },
  { date: "2025-05-22T22:36:32", name: "Hønefoss Pizza & Grill" },
  { date: "2025-05-30T17:08:14", name: "La spiseria" },
  { date: "2025-06-03T19:14:57", name: "Jungel Pizza Bedrift" },
  { date: "2025-10-23T18:50:02", name: "La Spiseria Drammen" },
  { date: "2026-03-10T17:55:24", name: "CieloPizzaBurger" },
];

const FEATURE_EVENTS = [
  { date: "2022-04-28T21:30:58", name: "Første Vipps-bestilling" },
  { date: "2025-05-07T12:28:36", name: "Første Wolt Drive-bestilling" },
  { date: "2025-05-07T12:28:36", name: "Første Dintero-bestilling" },
  { date: "2025-11-11T17:48:12", name: "Første Wolt Marketplace-bestilling" },
];

export default {
  name: "PoweruserGrowth",
  components: { AdminPage, Loading },
  data() {
    return {
      chart: null,
      zoomRange: null,
      zoomDraft: null,
      isZoomDragging: false,
      suppressNextChartClick: false,
      growthData: null,
      isLoading: false,
      errorMessage: "",
      selectedMetric: "orders",
      activeAnnotationKey: null,
      activeAnnotationPosition: null,
      pinnedAnnotationKey: null,
      visibleAnnotationTypes: {
        store: true,
        feature: true,
      },
      annotationHitAreas: [],
      chartMouseMoveHandler: null,
      chartMouseDownHandler: null,
      chartMouseUpHandler: null,
      chartClickHandler: null,
      chartMouseLeaveHandler: null,
    };
  },
  computed: {
    isPowerUser() {
      return this.$store.state.currentUser?.isPowerUser;
    },
    userIsLoggedIn() {
      return this.$store.getters.userIsLoggedIn;
    },
    currentUserId() {
      return this.$store.state.currentUser?.id;
    },
    reportRange() {
      return {
        from: this.growthData?.from || this.growthData?.From,
        to: this.growthData?.to || this.growthData?.To,
      };
    },
    fullPoints() {
      return this.growthData?.points || this.growthData?.Points || [];
    },
    points() {
      if (!this.zoomRange) return this.fullPoints;
      return this.fullPoints.slice(this.zoomRange.start, this.zoomRange.end + 1);
    },
    latestPoint() {
      return this.fullPoints[this.fullPoints.length - 1] || {
        cumulativeOrderCount: 0,
        CumulativeOrderCount: 0,
        cumulativeRevenueAmount: 0,
        CumulativeRevenueAmount: 0,
        date: null,
      };
    },
    latestOrderCount() {
      return this.getPointValue(this.latestPoint, "cumulativeOrderCount");
    },
    latestRevenueAmount() {
      return this.getPointValue(this.latestPoint, "cumulativeRevenueAmount");
    },
    latestPointDate() {
      return this.getPointDate(this.latestPoint);
    },
    labels() {
      return this.points.map((point) => this.getPointDate(point));
    },
    chartValues() {
      return this.points.map((point) => {
        if (this.selectedMetric === "revenue") {
          return this.getPointValue(point, "cumulativeRevenueAmount") / 100;
        }
        return this.getPointValue(point, "cumulativeOrderCount");
      });
    },
    annotationItems() {
      const items = [
        ...this.buildGroupedAnnotationItems(STORE_START_EVENTS, "store", "#1bb776"),
        ...this.buildGroupedAnnotationItems(FEATURE_EVENTS, "feature", "#2f80ed"),
      ];
      return items.filter((item) => this.visibleAnnotationTypes[item.type]);
    },
    activeAnnotationItem() {
      const key = this.pinnedAnnotationKey || this.activeAnnotationKey;
      return this.annotationItems.find((item) => item.key === key);
    },
    activeAnnotationLines() {
      if (!this.activeAnnotationItem) return [];
      const visibleLines = this.activeAnnotationItem.lines.slice(0, 7);
      const overflowCount = this.activeAnnotationItem.lines.length - visibleLines.length;
      return overflowCount > 0 ? [...visibleLines, `+ ${overflowCount} til`] : visibleLines;
    },
    activeAnnotationMonthStats() {
      if (!this.activeAnnotationItem) return null;

      const pointIndex = this.findNearestPointIndex(this.activeAnnotationItem.date);
      if (pointIndex < 0) return null;

      const point = this.points[pointIndex];
      if (!point) return null;

      const isRevenue = this.selectedMetric === "revenue";
      const monthValue = isRevenue
        ? this.getPointValue(point, "revenueAmount")
        : this.getPointValue(point, "orderCount");
      const totalValue = isRevenue
        ? this.getPointValue(point, "cumulativeRevenueAmount")
        : this.getPointValue(point, "cumulativeOrderCount");

      return {
        monthLabel: isRevenue ? "Omsetning denne måneden" : "Bestillinger denne måneden",
        monthValue: isRevenue ? this.formatCurrency(monthValue) : this.formatNumber(monthValue),
        totalLabel: isRevenue ? "Omsetning totalt til da" : "Bestillinger totalt til da",
        totalValue: isRevenue ? this.formatCurrency(totalValue) : this.formatNumber(totalValue),
      };
    },
    activeAnnotationStyle() {
      if (!this.activeAnnotationPosition || !this.activeAnnotationItem) return {};

      return {
        left: `${this.activeAnnotationPosition.x}px`,
        top: `${this.activeAnnotationPosition.y}px`,
        "--annotation-color": this.activeAnnotationItem.color,
      };
    },
    isZoomed() {
      return Boolean(this.zoomRange);
    },
    zoomRangeLabel() {
      if (!this.zoomRange) return "";
      const startPoint = this.fullPoints[this.zoomRange.start];
      const endPoint = this.fullPoints[this.zoomRange.end];
      return `${this.formatMonth(this.getPointDate(startPoint))} - ${this.formatMonth(this.getPointDate(endPoint))}`;
    },
    zoomDraftStyle() {
      if (!this.zoomDraft || !this.chart?.chartArea || !this.$refs.growthCanvas) return null;

      const canvas = this.$refs.growthCanvas;
      const { chartArea } = this.chart;
      const start = Math.min(this.zoomDraft.startX, this.zoomDraft.currentX);
      const end = Math.max(this.zoomDraft.startX, this.zoomDraft.currentX);
      const width = Math.max(end - start, 0);

      if (width < 6) return null;

      return {
        left: `${canvas.offsetLeft + start}px`,
        top: `${canvas.offsetTop + chartArea.top}px`,
        width: `${width}px`,
        height: `${chartArea.bottom - chartArea.top}px`,
      };
    },
  },
  watch: {
    currentUserId: {
      immediate: true,
      handler() {
        this.ensureDataLoaded();
      },
    },
    isPowerUser: {
      immediate: true,
      handler() {
        this.ensureDataLoaded();
      },
    },
    selectedMetric() {
      this.activeAnnotationKey = null;
      this.activeAnnotationPosition = null;
      this.pinnedAnnotationKey = null;
      this.updateChart();
    },
  },
  mounted() {
    this.ensureDataLoaded();
  },
  beforeDestroy() {
    this.removeChartListeners();
    if (this.chart) {
      this.chart.destroy();
    }
  },
  methods: {
    buildGroupedAnnotationItems(events, type, color) {
      const grouped = events.reduce((acc, event) => {
        const date = new Date(event.date);
        if (Number.isNaN(date.getTime())) return acc;

        const key = `${type}-${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!acc[key]) {
          acc[key] = {
            key,
            type,
            color,
            date: event.date,
            dateLabel: this.formatMonth(event.date),
            lines: [],
          };
        }

        acc[key].lines.push(event.name);
        return acc;
      }, {});

      return Object.values(grouped).map((item) => ({
        ...item,
        title: item.type === "store"
          ? (item.lines.length === 1 ? "Ny butikk" : `${item.lines.length} nye butikker`)
          : (item.lines.length === 1 ? "Ny feature" : `${item.lines.length} nye features`),
      }));
    },
    async loadData() {
      this.isLoading = true;
      this.errorMessage = "";
      try {
        this.growthData = await this._statisticsService.GetPlatformGrowth();
        this.$nextTick(() => this.renderChart());
      } catch (error) {
        this.errorMessage = error?.message || "Ukjent feil";
      } finally {
        this.isLoading = false;
      }
    },
    ensureDataLoaded() {
      if (!this.userIsLoggedIn) return;
      if (!this.isPowerUser) {
        this.$router.push("/admin");
        return;
      }
      if (!this.growthData && !this.isLoading) {
        this.loadData();
      }
    },
    handleLoginSuccess() {
      this.ensureDataLoaded();
    },
    setMetric(metric) {
      this.selectedMetric = metric;
    },
    toggleAnnotationType(type) {
      const activeType = this.activeAnnotationItem?.type;
      this.visibleAnnotationTypes = {
        ...this.visibleAnnotationTypes,
        [type]: !this.visibleAnnotationTypes[type],
      };

      if (activeType === type) {
        this.activeAnnotationKey = null;
        this.activeAnnotationPosition = null;
        this.pinnedAnnotationKey = null;
        this.setChartTooltipEnabled(true);
      }

      this.chart?.update("none");
    },
    getPointDate(point) {
      return point.date || point.Date;
    },
    getPointValue(point, key) {
      const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
      return point[key] ?? point[pascalKey] ?? 0;
    },
    async renderChart() {
      if (!this.$refs.growthCanvas || this.points.length === 0) return;

      this.removeChartListeners();
      if (this.chart) {
        this.chart.destroy();
      }

      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);

      const component = this;
      const annotationPlugin = {
        id: "growthAnnotations",
        afterDatasetsDraw(chart) {
          component.drawAnnotations(chart);
        },
      };

      this.chart = new Chart(this.$refs.growthCanvas.getContext("2d"), {
        type: "line",
        data: {
          labels: this.labels,
          datasets: [
            {
              label: this.selectedMetric === "revenue" ? "Kroner" : "Bestillinger",
              data: this.chartValues,
              borderColor: "#102a43",
              backgroundColor: "rgba(16, 42, 67, 0.08)",
              borderWidth: 4,
              fill: true,
              tension: 0.35,
              pointRadius: 0,
              pointHitRadius: 14,
              pointHoverRadius: 7,
              pointHoverBackgroundColor: "#ffffff",
              pointHoverBorderColor: "#102a43",
              pointHoverBorderWidth: 3,
            },
          ],
        },
        options: this.buildChartOptions(),
        plugins: [annotationPlugin],
      });

      this.addChartListeners();
    },
    addChartListeners() {
      const canvas = this.$refs.growthCanvas;
      if (!canvas) return;

      this.chartMouseMoveHandler = (event) => this.handleAnnotationPointerMove(event);
      this.chartMouseDownHandler = (event) => this.handleChartMouseDown(event);
      this.chartMouseUpHandler = (event) => this.handleChartMouseUp(event);
      this.chartClickHandler = (event) => this.handleAnnotationClick(event);
      this.chartMouseLeaveHandler = () => {
        if (this.isZoomDragging) return;
        if (!this.pinnedAnnotationKey) {
          this.activeAnnotationKey = null;
          this.activeAnnotationPosition = null;
          this.setChartTooltipEnabled(true);
          this.chart?.update("none");
        }
      };

      canvas.addEventListener("mousemove", this.chartMouseMoveHandler);
      canvas.addEventListener("mousedown", this.chartMouseDownHandler);
      canvas.addEventListener("click", this.chartClickHandler);
      canvas.addEventListener("mouseleave", this.chartMouseLeaveHandler);
      window.addEventListener("mouseup", this.chartMouseUpHandler);
    },
    removeChartListeners() {
      const canvas = this.$refs.growthCanvas;

      if (canvas) {
        if (this.chartMouseMoveHandler) canvas.removeEventListener("mousemove", this.chartMouseMoveHandler);
        if (this.chartMouseDownHandler) canvas.removeEventListener("mousedown", this.chartMouseDownHandler);
        if (this.chartClickHandler) canvas.removeEventListener("click", this.chartClickHandler);
        if (this.chartMouseLeaveHandler) canvas.removeEventListener("mouseleave", this.chartMouseLeaveHandler);
      }
      if (this.chartMouseUpHandler) window.removeEventListener("mouseup", this.chartMouseUpHandler);

      this.chartMouseMoveHandler = null;
      this.chartMouseDownHandler = null;
      this.chartMouseUpHandler = null;
      this.chartClickHandler = null;
      this.chartMouseLeaveHandler = null;
    },
    handleAnnotationPointerMove(event) {
      if (this.isZoomDragging) {
        this.updateZoomDraft(event);
        return;
      }

      const hitArea = this.getAnnotationHitArea(event);
      const nextKey = hitArea?.key || null;
      const canvas = this.$refs.growthCanvas;
      if (canvas) canvas.style.cursor = nextKey ? "pointer" : "crosshair";

      if (this.pinnedAnnotationKey || this.activeAnnotationKey === nextKey) return;

      this.activeAnnotationKey = nextKey;
      this.activeAnnotationPosition = hitArea ? this.getAnnotationPopoverPosition(hitArea) : null;
      this.setChartTooltipEnabled(!nextKey);
      this.chart?.update("none");
    },
    handleAnnotationClick(event) {
      if (this.suppressNextChartClick) {
        this.suppressNextChartClick = false;
        return;
      }

      const hitArea = this.getAnnotationHitArea(event);
      const nextPinnedKey = this.pinnedAnnotationKey === hitArea?.key ? null : hitArea?.key || null;
      this.pinnedAnnotationKey = nextPinnedKey;
      this.activeAnnotationKey = hitArea?.key || null;
      this.activeAnnotationPosition = hitArea ? this.getAnnotationPopoverPosition(hitArea) : null;
      this.setChartTooltipEnabled(!nextPinnedKey && !this.activeAnnotationKey);
      this.chart?.update("none");
    },
    handleChartMouseDown(event) {
      if (event.button !== 0 || !this.chart?.chartArea) return;

      const point = this.getCanvasPoint(event);
      if (!this.isInsideChartArea(point)) return;

      this.isZoomDragging = true;
      this.zoomDraft = { startX: point.x, currentX: point.x };
      this.activeAnnotationKey = null;
      this.activeAnnotationPosition = null;
      this.pinnedAnnotationKey = null;
      this.setChartTooltipEnabled(false);

      if (this.$refs.growthCanvas) this.$refs.growthCanvas.style.cursor = "ew-resize";
      event.preventDefault();
    },
    handleChartMouseUp(event) {
      if (!this.isZoomDragging) return;

      this.updateZoomDraft(event);
      const draft = this.zoomDraft;
      this.isZoomDragging = false;
      this.zoomDraft = null;
      if (this.$refs.growthCanvas) this.$refs.growthCanvas.style.cursor = "crosshair";

      if (!draft || Math.abs(draft.currentX - draft.startX) < 24) {
        this.setChartTooltipEnabled(true);
        this.chart?.update("none");
        return;
      }

      const startIndex = this.getPointIndexForPixel(Math.min(draft.startX, draft.currentX));
      const endIndex = this.getPointIndexForPixel(Math.max(draft.startX, draft.currentX));
      if (startIndex === null || endIndex === null || endIndex - startIndex < 1) {
        this.setChartTooltipEnabled(true);
        this.chart?.update("none");
        return;
      }

      const visibleStart = this.zoomRange ? this.zoomRange.start : 0;
      this.zoomRange = {
        start: visibleStart + startIndex,
        end: visibleStart + endIndex,
      };
      this.suppressNextChartClick = true;
      this.resetActiveAnnotation();
      this.setChartTooltipEnabled(true);
      this.updateChart();
    },
    updateZoomDraft(event) {
      if (!this.zoomDraft || !this.chart?.chartArea) return;

      const point = this.getCanvasPoint(event);
      this.zoomDraft = {
        ...this.zoomDraft,
        currentX: Math.min(Math.max(point.x, this.chart.chartArea.left), this.chart.chartArea.right),
      };
    },
    getCanvasPoint(event) {
      const rect = this.$refs.growthCanvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    },
    isInsideChartArea(point) {
      const { chartArea } = this.chart;
      return (
        point.x >= chartArea.left &&
        point.x <= chartArea.right &&
        point.y >= chartArea.top &&
        point.y <= chartArea.bottom
      );
    },
    getPointIndexForPixel(pixelX) {
      if (!this.chart?.scales?.x) return null;
      const rawValue = this.chart.scales.x.getValueForPixel(pixelX);
      const index = Math.round(Number(rawValue));
      if (Number.isNaN(index)) return null;
      return Math.min(Math.max(index, 0), this.points.length - 1);
    },
    resetActiveAnnotation() {
      this.activeAnnotationKey = null;
      this.activeAnnotationPosition = null;
      this.pinnedAnnotationKey = null;
    },
    resetZoom() {
      this.zoomRange = null;
      this.resetActiveAnnotation();
      this.setChartTooltipEnabled(true);
      this.updateChart();
    },
    getAnnotationHitArea(event) {
      const rect = event.target.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      return this.annotationHitAreas
        .map((area) => ({
          ...area,
          distance: Math.hypot(area.x - x, area.y - y),
        }))
        .filter((area) => area.distance <= area.radius)
        .sort((a, b) => a.distance - b.distance)[0];
    },
    getAnnotationPopoverPosition(hitArea) {
      const canvas = this.$refs.growthCanvas;
      const panel = this.$refs.chartPanel;
      if (!canvas || !panel) return null;

      const width = 300;
      const estimatedHeight = 205 + Math.min(hitArea.lines?.length || 0, 7) * 16;
      const rawX = canvas.offsetLeft + hitArea.x + (hitArea.preferLeft ? -width - 22 : 22);
      const rawY = canvas.offsetTop + hitArea.y - estimatedHeight / 2;
      const maxX = Math.max(panel.clientWidth - width - 12, 12);
      const maxY = Math.max(panel.clientHeight - estimatedHeight - 12, 12);

      return {
        x: Math.min(Math.max(rawX, 12), maxX),
        y: Math.min(Math.max(rawY, 48), maxY),
      };
    },
    setChartTooltipEnabled(enabled) {
      if (!this.chart?.options?.plugins?.tooltip) return;
      if (this.chart.options.plugins.tooltip.enabled === enabled) return;
      this.chart.options.plugins.tooltip.enabled = enabled;
    },
    buildChartOptions() {
      const component = this;
      return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            titleColor: "#102a43",
            bodyColor: "#334e68",
            borderColor: "#d9e2ec",
            borderWidth: 1,
            padding: 14,
            cornerRadius: 8,
            caretPadding: 14,
            caretSize: 7,
            usePointStyle: true,
            boxWidth: 9,
            boxHeight: 9,
            boxPadding: 7,
            titleMarginBottom: 8,
            bodySpacing: 4,
            filter() {
              return !component.activeAnnotationKey && !component.pinnedAnnotationKey;
            },
            callbacks: {
              title(items) {
                return component.formatMonth(items[0].label);
              },
              labelColor() {
                return {
                  backgroundColor: "#ffffff",
                  borderColor: "#102a43",
                  borderWidth: 3,
                };
              },
              labelPointStyle() {
                return {
                  pointStyle: "circle",
                  rotation: 0,
                };
              },
              label(context) {
                const value = context.parsed.y || 0;
                const point = component.points[context.dataIndex];
                const monthValue = component.selectedMetric === "revenue"
                  ? component.getPointValue(point, "revenueAmount")
                  : component.getPointValue(point, "orderCount");

                if (component.selectedMetric === "revenue") {
                  return [
                    `Totalt: ${component.formatCurrency(value * 100)}`,
                    `Måned: ${component.formatCurrency(monthValue)}`,
                  ];
                }
                return [
                  `Totalt: ${component.formatNumber(value)} bestillinger`,
                  `Måned: ${component.formatNumber(monthValue)} bestillinger`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              color(context) {
                const date = component.labels[context.index];
                if (!date) return "rgba(16, 42, 67, 0.04)";
                return new Date(date).getMonth() % 3 === 0 ? "rgba(16, 42, 67, 0.12)" : "rgba(16, 42, 67, 0.03)";
              },
            },
            ticks: {
              color: "#486581",
              maxRotation: 0,
              autoSkip: false,
              font(context) {
                const date = component.labels[context.index];
                const month = date ? new Date(date).getMonth() : 1;
                const showCompactMonths = component.isZoomed && component.labels.length <= 24;
                return {
                  size: month === 0 && !showCompactMonths ? 20 : 10,
                  weight: month === 0 ? "800" : "600",
                };
              },
              callback(value, index) {
                const date = component.labels[index];
                if (!date) return "";
                const parsed = new Date(date);
                const month = parsed.getMonth();
                if (component.isZoomed && component.labels.length <= 24) {
                  if (month === 0) return parsed.getFullYear();
                  return parsed.toLocaleDateString("nb-NO", { month: "short" });
                }
                if (month === 0) return parsed.getFullYear();
                if (month === 3) return "Q2";
                if (month === 6) return "Q3";
                if (month === 9) return "Q4";
                return "";
              },
            },
          },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: "rgba(16, 42, 67, 0.08)" },
            ticks: {
              color: "#627d98",
              padding: 10,
              callback(value) {
                if (component.selectedMetric === "revenue") {
                  return `${component.formatCompactNumber(value)} kr`;
                }
                return component.formatCompactNumber(value);
              },
            },
          },
        },
      };
    },
    updateChart() {
      if (!this.chart) {
        this.$nextTick(() => this.renderChart());
        return;
      }
      this.chart.data.labels = this.labels;
      this.chart.data.datasets[0].label = this.selectedMetric === "revenue" ? "Kroner" : "Bestillinger";
      this.chart.data.datasets[0].data = this.chartValues;
      this.chart.options = this.buildChartOptions();
      this.chart.update();
    },
    drawAnnotations(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!this.annotationItems.length || !chartArea) {
        this.annotationHitAreas = [];
        return;
      }

      const markers = this.annotationItems.map((item) => this.getAnnotationMarker(item, scales)).filter(Boolean);
      this.annotationHitAreas = markers.map((marker) => ({
        key: marker.item.key,
        x: marker.x,
        y: marker.y,
        radius: 30,
        preferLeft: marker.x > chartArea.left + (chartArea.right - chartArea.left) * 0.64,
        lines: marker.item.lines,
      }));

      ctx.save();
      markers.forEach((marker) => {
        this.drawMarker(ctx, marker.x, marker.y, marker.item.color, marker.item.key === this.activeAnnotationItem?.key);
      });
      ctx.restore();
    },
    getAnnotationMarker(item, scales) {
      const pointIndex = this.findNearestPointIndex(item.date);
      if (pointIndex < 0) return null;

      return {
        item,
        x: scales.x.getPixelForValue(pointIndex) + (item.type === "feature" ? 9 : -9),
        y: scales.y.getPixelForValue(this.chartValues[pointIndex]) + (item.type === "feature" ? -9 : 9),
      };
    },
    drawMarker(ctx, x, y, color, active = false) {
      ctx.save();
      if (active) {
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fillStyle = `${color}26`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, active ? 7.5 : 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = active ? 3 : 2.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.restore();
    },
    findNearestPointIndex(dateValue) {
      const target = new Date(dateValue);
      if (Number.isNaN(target.getTime())) return -1;
      const targetMonth = new Date(target.getFullYear(), target.getMonth(), 1).getTime();
      return this.points.findIndex((point) => {
        const pointDate = new Date(this.getPointDate(point));
        return new Date(pointDate.getFullYear(), pointDate.getMonth(), 1).getTime() === targetMonth;
      });
    },
    formatNumber(value) {
      return Number(value || 0).toLocaleString("nb-NO");
    },
    formatCompactNumber(value) {
      return Intl.NumberFormat("nb-NO", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(Number(value || 0));
    },
    formatCurrency(valueInOre) {
      return (Number(valueInOre || 0) / 100).toLocaleString("nb-NO", {
        style: "currency",
        currency: "NOK",
        maximumFractionDigits: 0,
      });
    },
    formatShortDate(value) {
      if (!value) return "";
      return new Date(value).toLocaleDateString("nb-NO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    },
    formatMonth(value) {
      if (!value) return "";
      return new Date(value).toLocaleDateString("nb-NO", {
        month: "short",
        year: "numeric",
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.growth-page {
  min-height: calc(100vh - 84px);
  background: #f8fafc;
  color: #102a43;
  padding: 32px 18px 48px;
}

.growth-shell {
  max-width: 1400px;
  margin: 0 auto;
}

.growth-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-end;
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: 48px;
    line-height: 1;
    font-weight: 800;
    letter-spacing: 0;
  }
}

.eyebrow {
  margin: 0 0 8px;
  color: #1bb776;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.period {
  margin: 10px 0 0;
  color: #627d98;
  font-size: 16px;
}

.metric-toggle {
  display: inline-flex;
  padding: 4px;
  background: #eaf5f0;
  border: 1px solid #c6f0dd;
  border-radius: 8px;

  button {
    min-width: 128px;
    border: 0;
    border-radius: 6px;
    padding: 10px 16px;
    background: transparent;
    color: #486581;
    font-weight: 800;
    cursor: pointer;
  }

  button.active {
    background: #ffffff;
    color: #102a43;
    box-shadow: 0 1px 3px rgba(16, 42, 67, 0.12);
  }
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.hero-stat {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 18px 20px;

  span {
    display: block;
    color: #627d98;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
  }

  strong {
    display: block;
    margin-top: 8px;
    color: #102a43;
    font-size: 30px;
    line-height: 1.1;
    font-weight: 800;
  }
}

.chart-panel {
  position: relative;
  height: min(74vh, 760px);
  min-height: 540px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 50px 24px 24px;
  box-shadow: 0 16px 40px rgba(16, 42, 67, 0.08);

  canvas {
    width: 100% !important;
    height: 100% !important;
    cursor: crosshair;
    user-select: none;
  }
}

.chart-zoom-controls {
  position: absolute;
  top: 15px;
  left: 22px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 28px;
  color: #627d98;
  font-size: 12px;
  font-weight: 800;

  span {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.88);
    padding: 0 11px;
    box-shadow: 0 8px 20px rgba(16, 42, 67, 0.06);
  }

  button {
    min-height: 28px;
    border: 1px solid #b7efda;
    border-radius: 999px;
    background: #eafaf3;
    color: #12805c;
    padding: 0 12px;
    font: inherit;
    font-weight: 800;
    cursor: pointer;

    &:hover {
      background: #d6f7e7;
      color: #0f6f50;
    }

    &:focus-visible {
      outline: 2px solid #1bb776;
      outline-offset: 2px;
    }
  }
}

.chart-legend {
  position: absolute;
  top: 16px;
  right: 22px;
  z-index: 3;
  display: flex;
  gap: 16px;
  align-items: center;
  color: #486581;
  font-size: 12px;
  font-weight: 800;
}

.zoom-selection {
  position: absolute;
  z-index: 1;
  pointer-events: none;
  border: 1px solid rgba(27, 183, 118, 0.44);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(27, 183, 118, 0.2), rgba(47, 128, 237, 0.1));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5), 0 14px 38px rgba(27, 183, 118, 0.16);
}

.annotation-popover {
  position: absolute;
  z-index: 2;
  width: 300px;
  max-width: calc(100% - 24px);
  pointer-events: none;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid #d9e2ec;
  border-left: 5px solid var(--annotation-color);
  border-radius: 8px;
  box-shadow: 0 14px 34px rgba(16, 42, 67, 0.16);
  padding: 12px 14px 13px 16px;
  color: #102a43;

  strong,
  span,
  small {
    display: block;
  }

  strong {
    font-size: 14px;
    line-height: 1.25;
    font-weight: 800;
  }

  span {
    margin-top: 3px;
    color: #627d98;
    font-size: 12px;
    font-weight: 700;
  }

  small {
    margin-top: 10px;
    color: var(--annotation-color);
    font-size: 11px;
    line-height: 1.2;
    font-weight: 800;
  }

  ul {
    margin: 5px 0 0;
    padding: 0;
    list-style: none;
  }

  li {
    margin-top: 3px;
    color: #334e68;
    font-size: 12px;
    line-height: 1.25;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
}

.annotation-month-stats {
  margin-top: 11px;
  padding-top: 10px;
  border-top: 1px solid #e6edf5;

  small {
    margin-top: 0;
    color: #627d98;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  div {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    margin-top: 6px;
    color: #334e68;
    font-size: 11px;
    line-height: 1.25;
  }

  span,
  strong {
    display: inline;
    margin: 0;
    font-size: 11px;
    line-height: 1.25;
  }

  span {
    color: #627d98;
    font-weight: 700;
  }

  strong {
    flex: 0 0 auto;
    color: #102a43;
    font-weight: 800;
    text-align: right;
  }
}

.chart-legend-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 0;
  border-radius: 6px;
  padding: 4px 6px;
  background: transparent;
  color: #486581;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.15s ease, background-color 0.15s ease, color 0.15s ease;

  &:hover {
    background: #f0f7ff;
    color: #102a43;
  }

  &:focus-visible {
    outline: 2px solid #2f80ed;
    outline-offset: 2px;
  }
}

.chart-legend-button--inactive {
  opacity: 0.42;

  .legend-dot {
    filter: grayscale(1);
  }
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 0 2px #ffffff, 0 0 0 3px rgba(16, 42, 67, 0.12);
}

.legend-dot--store {
  background: #1bb776;
}

.legend-dot--milestone {
  background: #2f80ed;
}

.loading-state,
.empty-state {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  text-align: center;
  padding: 32px;

  h2 {
    margin: 0 0 8px;
    font-size: 24px;
  }

  p {
    margin: 0;
    color: #627d98;
  }
}

@media (max-width: 900px) {
  .growth-header {
    align-items: stretch;
    flex-direction: column;

    h1 {
      font-size: 38px;
    }
  }

  .metric-toggle {
    width: 100%;

    button {
      flex: 1;
      min-width: 0;
    }
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }

  .chart-panel {
    height: 520px;
    min-height: 520px;
    padding: 88px 14px 14px;
  }

  .chart-zoom-controls {
    left: 16px;
    right: 16px;
    flex-wrap: wrap;

    span {
      max-width: 100%;
    }
  }

  .chart-legend {
    left: 16px;
    right: auto;
    top: 50px;
    flex-wrap: wrap;
    gap: 10px;
  }
}
</style>
