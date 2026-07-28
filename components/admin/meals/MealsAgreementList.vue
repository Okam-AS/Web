<template>
  <section class="meals-agreements">
    <h2 class="meals-agreements__title">
      {{ $i('meals_agreements_title') }}
    </h2>

    <!-- The read did not answer. This is NOT the empty state, and the two are never the same
         element: the empty state below makes a claim about the venue, this one makes none. -->
    <p v-if="isUnknown" class="meals-agreements__notice meals-agreements__notice--unknown">
      {{ refusalNotice }}
    </p>

    <p v-else-if="agreements.isEmpty" class="meals-agreements__notice">
      {{ $i('meals_agreements_none') }}
    </p>

    <table v-else class="meals-agreements__table">
      <thead>
        <tr>
          <th scope="col">
            {{ $i('meals_col_company') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_orgnr') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_agreement') }}
          </th>
          <th scope="col">
            {{ $i('meals_col_currency') }}
          </th>
          <th scope="col" class="is-numeric">
            {{ $i('meals_col_members') }}
          </th>
          <th scope="col" class="is-numeric">
            {{ $i('meals_col_orders') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in agreements.rows"
          :key="row.agreementId || row.companyId"
          class="meals-agreements__row"
          :class="{ 'is-selected': row.isSelected }"
          tabindex="0"
          @click="$emit('select', row.companyId)"
          @keyup.enter="$emit('select', row.companyId)"
        >
          <td>
            <span class="meals-agreements__name">{{ row.label || unknownMark }}</span>
            <span v-if="row.secondaryName" class="meals-agreements__legal">{{ row.secondaryName }}</span>
            <!-- An ACTIVE agreement can sit on an ARCHIVED company: archiving preserves history
                 rather than deleting it. Said plainly instead of being folded into one badge. -->
            <span v-if="isArchivedCompany(row)" class="meals-agreements__flag">{{ $i('meals_company_archived') }}</span>
          </td>
          <td>{{ row.organizationNumber || unknownMark }}</td>
          <td>
            <span class="meals-agreements__badge" :class="'meals-agreements__badge--' + agreementTone(row)">
              {{ agreementLabel(row) }}
            </span>
          </td>
          <!-- The agreement's currency, never an amount: the directory read carries no money at
               all, and inventing one from the orders read would be this surface computing money. -->
          <td>{{ row.currency || unknownMark }}</td>
          <td class="is-numeric">
            {{ row.activeMemberCount === null ? unknownMark : row.activeMemberCount }}
          </td>
          <td class="is-numeric">
            {{ row.orderCount === null ? unknownMark : row.orderCount }}
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script>
import { DATA_UNKNOWN } from '~/utils/meals/store-view';
import { refusalKey } from '~/utils/meals/refusal-copy';

// The store's Company Meals agreements. Purely presentational: it renders what `buildStoreView`
// produced and owns no fetching, so every rule it draws is testable without a network.
//
// It prints NO money. The directory read (`GET /v1/stores/{id}/meals/companies`) exposes an
// agreement's currency and its active-member count and nothing else — no limit, no balance, no
// spend — so this column set is the whole of what the backend is willing to say.
export default {
  name: 'MealsAgreementList',
  props: {
    agreements: {
      type: Object,
      required: true
    }
  },
  data () {
    return {
      // One mark for every unknown, so "we do not know" never looks like a value.
      unknownMark: '—'
    };
  },
  computed: {
    isUnknown () {
      return this.agreements.state === DATA_UNKNOWN;
    },
    /**
     * Why the list is not on screen, keyed on the refusal KIND rather than on any server prose.
     *
     * The `dark` sentence is deliberately narrow. Meals' 404 hides which company and which
     * agreement exist; it does not hide that the module is deployed, because the module's 404
     * carries a problem document while an unrouted path's 404 carries an empty body. So the copy
     * says "not switched on for this venue" — a claim the wire supports — and never "Meals does not
     * exist here", which the wire contradicts.
     */
    refusalNotice () {
      return this.$i(refusalKey(this.agreements.refusal));
    }
  },
  methods: {
    isArchivedCompany (row) {
      return row.companyStatus === 'Archived';
    },
    // Unrecognised states are shown verbatim with an unknown tone rather than being mapped onto
    // Active or Ended — a state this client has not heard of is not a state it may rename.
    agreementTone (row) {
      switch (row.agreementStatus) {
      case 'Active': return 'active';
      case 'Ended': return 'ended';
      default: return 'unknown';
      }
    },
    agreementLabel (row) {
      switch (row.agreementStatus) {
      case 'Active': return this.$i('meals_agreement_active');
      case 'Ended': return this.$i('meals_agreement_ended');
      default: return row.agreementStatus || this.unknownMark;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.meals-agreements {
  margin-bottom: 32px;
}

.meals-agreements__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 12px;
}

.meals-agreements__notice {
  padding: 16px;
  border-radius: 8px;
  background: #f8f9fa;
  color: #64748b;
  font-size: 0.9em;
  margin: 0;
}

/* An unknown reads as a caveat, never as a result. */
.meals-agreements__notice--unknown {
  background: #fff8e6;
  color: #92400e;
}

.meals-agreements__table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  th {
    text-align: left;
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #64748b;
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
  }

  td {
    padding: 12px 16px;
    font-size: 0.9em;
    color: #292c34;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
  }

  .is-numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
}

.meals-agreements__row {
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover,
  &:focus {
    background: #f8f9fa;
  }

  &.is-selected {
    background: rgba(27, 183, 118, 0.08);
  }
}

.meals-agreements__name {
  display: block;
  font-weight: 600;
}

.meals-agreements__legal,
.meals-agreements__flag {
  display: block;
  font-size: 0.85em;
  color: #64748b;
}

.meals-agreements__flag {
  color: #92400e;
}

.meals-agreements__badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 600;
}

.meals-agreements__badge--active {
  background: rgba(27, 183, 118, 0.12);
  color: #159f63;
}

.meals-agreements__badge--ended {
  background: #f1f5f9;
  color: #64748b;
}

.meals-agreements__badge--unknown {
  background: #fff8e6;
  color: #92400e;
}
</style>
