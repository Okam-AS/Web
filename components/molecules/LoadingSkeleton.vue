<template>
  <div class="loading-skeleton">
    <!-- Delivery Stats Skeleton -->
    <div class="skeleton-stats-grid">
      <div
        v-for="i in 3"
        :key="'stat-' + i"
        class="skeleton-stat-card"
      >
        <div class="skeleton-icon"></div>
        <div class="skeleton-value"></div>
        <div class="skeleton-label"></div>
        <div class="skeleton-amount"></div>
      </div>
    </div>

    <!-- Charts Skeleton -->
    <div class="skeleton-charts-section">
      <div
        v-for="i in 4"
        :key="'chart-' + i"
        class="skeleton-chart-container"
      >
        <div class="skeleton-chart-title"></div>
        <div class="skeleton-chart-value"></div>
        <div class="skeleton-chart-body"></div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingSkeleton',
};
</script>

<style lang="scss" scoped>
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.loading-skeleton {
  width: 100%;
}

.skeleton-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 32px;

  .skeleton-stat-card {
    background: #f8f9fa;
    padding: 24px;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    border: 1px solid #e8e8e8;
  }
}

.skeleton-icon,
.skeleton-value,
.skeleton-label,
.skeleton-amount,
.skeleton-chart-title,
.skeleton-chart-value,
.skeleton-chart-body {
  background: linear-gradient(
    to right,
    #e8e8e8 0%,
    #f4f4f4 20%,
    #e8e8e8 40%,
    #e8e8e8 100%
  );
  background-size: 2000px 100%;
  animation: shimmer 2s linear infinite;
  border-radius: 6px;
}

.skeleton-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  border-radius: 50%;
}

.skeleton-value {
  width: 80px;
  height: 32px;
  margin: 12px auto;
}

.skeleton-label {
  width: 100px;
  height: 20px;
  margin: 8px auto;
}

.skeleton-amount {
  width: 120px;
  height: 24px;
  margin: 8px auto;
}

.skeleton-charts-section {
  margin-bottom: 32px;

  .skeleton-chart-container {
    background: #fff;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    margin-bottom: 24px;
  }

  .skeleton-chart-title {
    width: 200px;
    height: 20px;
    margin-bottom: 12px;
  }

  .skeleton-chart-value {
    width: 120px;
    height: 28px;
    margin-bottom: 20px;
  }

  .skeleton-chart-body {
    width: 100%;
    height: 200px;
  }
}

@media (max-width: 768px) {
  .skeleton-stats-grid {
    grid-template-columns: 1fr;
  }

  .skeleton-chart-body {
    height: 150px;
  }
}
</style>
