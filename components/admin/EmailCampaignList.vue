<template>
  <div class="campaign-list">
    <div v-if="campaigns.length === 0" class="empty-state">
      <span class="material-icons">campaign</span>
      <h3>Ingen kampanjer enda</h3>
      <p>Opprett din forste e-postkampanje for a na dine lojalitetsmedlemmer</p>
      <button class="btn-primary" @click="$emit('create')">
        <i class="fas fa-plus" /> Ny kampanje
      </button>
    </div>

    <div v-else class="campaigns-grid">
      <div
        v-for="campaign in campaigns"
        :key="campaign.emailCampaignId"
        class="campaign-card"
        @click="$emit('select', campaign)"
      >
        <div class="card-header">
          <h3 class="card-title">{{ campaign.name }}</h3>
          <span class="status-badge" :class="statusClass(campaign.status)">
            {{ statusLabel(campaign.status) }}
          </span>
        </div>

        <p class="card-subject">{{ campaign.subject || 'Ingen emne satt' }}</p>

        <div class="card-stats" v-if="campaign.status === 'Sent' || campaign.status === 'Sending'">
          <div class="stat">
            <span class="stat-value">{{ campaign.totalRecipients }}</span>
            <span class="stat-label">Mottakere</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ campaign.sentCount }}</span>
            <span class="stat-label">Sendt</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ openRate(campaign) }}%</span>
            <span class="stat-label">Apnet</span>
          </div>
        </div>

        <div class="card-footer">
          <span class="card-date">{{ formatDate(campaign.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EmailCampaignList',
  props: {
    campaigns: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    statusClass(status) {
      return {
        'status-draft': status === 'Draft',
        'status-sending': status === 'Sending',
        'status-sent': status === 'Sent',
        'status-failed': status === 'Failed'
      }
    },
    statusLabel(status) {
      const labels = {
        Draft: 'Utkast',
        Sending: 'Sender...',
        Sent: 'Sendt',
        Failed: 'Feilet'
      }
      return labels[status] || status
    },
    openRate(campaign) {
      if (!campaign.sentCount || campaign.sentCount === 0) return 0
      return Math.round((campaign.openedCount / campaign.sentCount) * 100)
    }
  }
}
</script>

<style lang="scss" scoped>
.campaign-list {
  .empty-state {
    text-align: center;
    padding: 64px 24px;
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    border-radius: 12px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

    .material-icons {
      font-size: 4em;
      color: #cbd5e0;
      margin-bottom: 16px;
    }

    h3 {
      font-size: 1.5em;
      color: #292c34;
      margin-bottom: 8px;
      font-weight: 600;
    }

    p {
      color: #64748b;
      margin-bottom: 24px;
    }
  }

  .campaigns-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;

    @media (max-width: 480px) {
      gap: 16px;
    }
  }

  .campaign-card {
    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
    border: 1px solid #e8e8e8;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
    cursor: pointer;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      gap: 12px;
    }

    .card-title {
      font-size: 1.1em;
      font-weight: 600;
      color: #292c34;
      margin: 0;
    }

    .card-subject {
      color: #64748b;
      font-size: 0.9em;
      margin: 0 0 16px 0;
    }

    .card-stats {
      display: flex;
      gap: 20px;
      padding: 12px 0;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 12px;

      .stat {
        display: flex;
        flex-direction: column;
        align-items: center;

        .stat-value {
          font-size: 1.2em;
          font-weight: 600;
          color: #292c34;
        }

        .stat-label {
          font-size: 0.75em;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
      }
    }

    .card-footer {
      .card-date {
        font-size: 0.8em;
        color: #94a3b8;
      }
    }
  }

  .status-badge {
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;

    &.status-draft {
      background: #f1f5f9;
      color: #64748b;
    }

    &.status-sending {
      background: #fef3c7;
      color: #92400e;
    }

    &.status-sent {
      background: #d1fae5;
      color: #065f46;
    }

    &.status-failed {
      background: #fee2e2;
      color: #991b1b;
    }
  }

  .btn-primary {
    background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
    color: white;
    border: none;
    padding: 14px 24px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.95em;
    box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
    transition: all 0.3s ease;
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
    }

    i {
      margin-right: 8px;
    }
  }
}
</style>
