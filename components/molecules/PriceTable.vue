<template>
  <div class="highlight-table">
    <table>
      <thead>
        <tr>
          <th><span class="sr-only">Betalinger</span></th>
          <th class="hide-only-mobile">
            Kost. *
          </th>
          <th>Liten</th>
          <th>Medium</th>
          <th>Stor</th>
        </tr>
      </thead>
      <tbody>
        <tr class="highlight">
          <th class="border">
            Pris pr. måned
          </th>
          <td class="border hide-only-mobile" />
          <td class="xl-text border">
            49,-
          </td>
          <td class="xl-text border">
            399,-
          </td>
          <td class="xl-text border">
            599,-
          </td>
        </tr>
        <tr>
          <th>Betal i kassa</th>
          <td class="hide-only-mobile">
            0 %
          </td>
          <td>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                d="M0 12.116l2.053-1.897c2.401 1.162 3.924 2.045 6.622 3.969 5.073-5.757 8.426-8.678 14.657-12.555l.668 1.536c-5.139 4.484-8.902 9.479-14.321 19.198-3.343-3.936-5.574-6.446-9.679-10.251z"
              />
            </svg>
          </td>
          <td>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                d="M0 12.116l2.053-1.897c2.401 1.162 3.924 2.045 6.622 3.969 5.073-5.757 8.426-8.678 14.657-12.555l.668 1.536c-5.139 4.484-8.902 9.479-14.321 19.198-3.343-3.936-5.574-6.446-9.679-10.251z"
              />
            </svg>
          </td>
          <td>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                d="M0 12.116l2.053-1.897c2.401 1.162 3.924 2.045 6.622 3.969 5.073-5.757 8.426-8.678 14.657-12.555l.668 1.536c-5.139 4.484-8.902 9.479-14.321 19.198-3.343-3.936-5.574-6.446-9.679-10.251z"
              />
            </svg>
          </td>
        </tr>
        <tr>
          <th>Kortbetaling</th>
          <td class="hide-only-mobile">
            2,99 %
          </td>
          <td>–</td>
          <td>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                d="M0 12.116l2.053-1.897c2.401 1.162 3.924 2.045 6.622 3.969 5.073-5.757 8.426-8.678 14.657-12.555l.668 1.536c-5.139 4.484-8.902 9.479-14.321 19.198-3.343-3.936-5.574-6.446-9.679-10.251z"
              />
            </svg>
          </td>
          <td>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                d="M0 12.116l2.053-1.897c2.401 1.162 3.924 2.045 6.622 3.969 5.073-5.757 8.426-8.678 14.657-12.555l.668 1.536c-5.139 4.484-8.902 9.479-14.321 19.198-3.343-3.936-5.574-6.446-9.679-10.251z"
              />
            </svg>
          </td>
        </tr>
        <tr>
          <th>Vipps</th>
          <td class="hide-only-mobile">
            1,49 %
          </td>
          <td>–</td>
          <td>–</td>
          <td>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <path
                d="M0 12.116l2.053-1.897c2.401 1.162 3.924 2.045 6.622 3.969 5.073-5.757 8.426-8.678 14.657-12.555l.668 1.536c-5.139 4.484-8.902 9.479-14.321 19.198-3.343-3.936-5.574-6.446-9.679-10.251z"
              />
            </svg>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5">
            <span class="hide-only-mobile">* Kostnad pr. transaksjon</span>
            <p class="show-only-mobile">
              <span style="font-weight: bold;">Transaksjonskostnader:</span><br>
              Betal i kassa: 0,- per transaksjon<br>
              Vipps: 1,49 % per transaksjon<br>
              Kortbetaling: 2,99 % per transaksjon
            </p>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<style lang="scss">
@import "../../assets/sass/common.scss";

.highlight-table {
  @include br-mobile {
    margin-left: -20px;
  }

  .hide-only-mobile {
    @include br-mobile {
      display: none;
    }
  }

  .show-only-mobile {
    @include br-md {
      display: none;
    }
  }
}
</style>