<template>
  <AdminPage @login-success="handleLoginSuccess">
    <div class="menu-update-page">
      <div class="page-header">
        <div class="eyebrow">
          {{ $i('menuUpdate_eyebrow') }}
        </div>
        <h1>{{ $i('menuUpdate_pageTitle') }}</h1>
        <p>{{ $i('menuUpdate_pageSubtitle') }}</p>
      </div>

      <ol class="steps" :aria-label="$i('menuUpdate_stepsLabel')">
        <li v-for="(label, index) in stepLabels" :key="index" :class="{ current: step === index + 1, done: step > index + 1 }">
          <b>{{ step > index + 1 ? '✓' : index + 1 }}</b>{{ label }}
        </li>
      </ol>

      <div v-if="selectedStore <= 0" class="empty-state">
        <h3>{{ $i('menuUpdate_selectStoreTitle') }}</h3>
        <p>{{ $i('menuUpdate_selectStoreBody') }}</p>
      </div>

      <!-- ------------------------------------------------ step 1: sources -->
      <section v-else-if="step === 1" class="panel">
        <h2>{{ $i('menuUpdate_sourcesTitle') }}</h2>
        <p class="helper-text">
          {{ $i('menuUpdate_sourcesHelp') }}
        </p>

        <div
          class="upload"
          :class="{ dragging: isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
        >
          <label class="upload-label">
            <strong>{{ $i('menuUpdate_choosePdfs') }}</strong>
            <input ref="fileInput" type="file" accept="application/pdf" multiple @change="onFilesPicked">
          </label>
          <small>{{ $i('menuUpdate_uploadLimits', { files: limits.maxFiles, perFile: limits.maxFileMb, total: limits.maxTotalMb }) }}</small>
        </div>

        <ul v-if="files.length" class="source-list">
          <li v-for="(file, index) in files" :key="file.name + index" class="source">
            <span class="pdf-tag">PDF</span>
            <div class="source-body">
              <strong>{{ file.name }}</strong>
              <small>{{ formatBytes(file.size) }}</small>
              <label class="inline-field">
                {{ $i('menuUpdate_columnMeaning') }}
                <select v-model="mappingChoice[file.name]">
                  <option value="auto">{{ $i('menuUpdate_columnsAuto') }}</option>
                  <option value="sizes-takeaway">{{ $i('menuUpdate_columnsSizesTakeaway') }}</option>
                  <option value="sizes-eatIn">{{ $i('menuUpdate_columnsSizesEatIn') }}</option>
                  <option value="sizes-delivery">{{ $i('menuUpdate_columnsSizesDelivery') }}</option>
                </select>
              </label>
            </div>
            <button class="link-btn" type="button" @click="removeFile(index)">
              {{ $i('common_delete') }}
            </button>
          </li>
        </ul>

        <label class="field">
          {{ $i('menuUpdate_pasteText') }}
          <textarea v-model="pastedText" rows="6" :placeholder="$i('menuUpdate_pasteTextPlaceholder')" />
        </label>

        <div v-if="analysisError" class="error-box" role="alert">
          {{ analysisError }}
          <button class="link-btn" type="button" @click="runAnalysis">
            {{ $i('menuUpdate_tryAgain') }}
          </button>
        </div>

        <div v-if="isAnalyzing" class="progress" role="status">
          <div class="progress-bar">
            <div :style="{ width: uploadPercent + '%' }" />
          </div>
          <small>{{ analysisProgressText }}</small>
        </div>

        <div class="actions">
          <button v-if="hasDraft" class="btn-secondary" type="button" @click="step = 2">
            {{ $i('menuUpdate_backToDraft') }}
          </button>
          <button class="btn-primary" type="button" :disabled="!canAnalyze" @click="runAnalysis">
            {{ isAnalyzing ? $i('menuUpdate_analyzing') : $i('menuUpdate_analyze') }}
          </button>
        </div>
      </section>

      <!-- ------------------------------------------------ step 2: review -->
      <template v-else-if="step === 2">
        <section v-if="analysis" class="panel sources-summary">
          <div class="panel-head">
            <h2>{{ $i('menuUpdate_comparedMenus') }}</h2>
            <button class="btn-secondary" type="button" @click="step = 1">
              {{ $i('menuUpdate_changeSources') }}
            </button>
          </div>
          <div class="sources">
            <div v-for="source in analysis.sources" :key="source.documentName" class="source">
              <span class="pdf-tag">PDF</span>
              <div class="source-body">
                <strong>{{ source.documentName }}</strong>
                <small>{{ $i('menuUpdate_sourcePages', { pages: source.pageCount, rows: sourceRowCount(source) }) }}</small>
                <small v-if="source.proposedInterpretation">{{ source.proposedInterpretation }}</small>
              </div>
            </div>
          </div>
          <div v-for="warning in allSourceWarnings" :key="warning.key" class="note">
            {{ warning.message }}
          </div>
        </section>

        <div class="stats" role="group" :aria-label="$i('menuUpdate_filtersLabel')">
          <button
            v-for="key in filterKeys"
            :key="key"
            type="button"
            class="stat"
            :class="{ selected: filter === key }"
            :aria-pressed="filter === key ? 'true' : 'false'"
            @click="filter = key"
          >
            <strong :class="{ warn: key === 'review' }">{{ planCounts[key] }}</strong>
            <span>{{ $i('menuUpdate_filter_' + key) }}</span>
          </button>
        </div>

        <!-- price rules -->
        <section class="panel rules">
          <div class="panel-head">
            <h2>{{ $i('menuUpdate_rulesTitle') }}</h2>
            <small>{{ rulesSummary }}</small>
          </div>

          <div class="rules-grid">
            <label class="field">
              {{ $i('menuUpdate_ruleMissingChannel') }}
              <select v-model="draftRules.missingChannelRule">
                <option value="KeepCurrent">{{ $i('menuUpdate_ruleKeepCurrent') }}</option>
                <option value="SamePercent">{{ $i('menuUpdate_ruleSamePercent') }}</option>
                <option value="KeepKroneDelta">{{ $i('menuUpdate_ruleKeepKroneDelta') }}</option>
                <option value="CustomPercent">{{ $i('menuUpdate_ruleCustomPercent') }}</option>
              </select>
            </label>

            <label v-if="draftRules.missingChannelRule === 'CustomPercent'" class="field">
              {{ $i('menuUpdate_rulePercent') }}
              <input v-model.number="draftRules.missingChannelPercent" type="number" step="0.1">
            </label>

            <label class="field">
              {{ $i('menuUpdate_ruleReferenceChannel') }}
              <select v-model="draftRules.referenceChannel">
                <option value="Takeaway">{{ $i('menuUpdate_channelTakeaway') }}</option>
                <option value="EatIn">{{ $i('menuUpdate_channelEatIn') }}</option>
                <option value="Delivery">{{ $i('menuUpdate_channelDelivery') }}</option>
              </select>
            </label>

            <label class="field">
              {{ $i('menuUpdate_ruleAbsentProducts') }}
              <select v-model="draftRules.absentProductRule">
                <option value="Keep">{{ $i('menuUpdate_ruleAbsentKeep') }}</option>
                <option value="SuggestFromSimilar">{{ $i('menuUpdate_ruleAbsentSuggest') }}</option>
                <option value="CustomPercent">{{ $i('menuUpdate_ruleCustomPercent') }}</option>
              </select>
            </label>

            <label v-if="draftRules.absentProductRule === 'CustomPercent'" class="field">
              {{ $i('menuUpdate_rulePercent') }}
              <input v-model.number="draftRules.absentProductPercent" type="number" step="0.1">
            </label>

            <label class="field">
              {{ $i('menuUpdate_ruleScope') }}
              <select v-model="ruleScope">
                <option value="AllInFilter">{{ $i('menuUpdate_scopeAllInFilter') }}</option>
                <option value="SelectedCategory">{{ $i('menuUpdate_scopeCategory') }}</option>
                <option value="CheckedRows">{{ $i('menuUpdate_scopeChecked') }}</option>
              </select>
            </label>

            <label v-if="ruleScope === 'SelectedCategory'" class="field">
              {{ $i('menuUpdate_category') }}
              <select v-model="scopeCategoryName">
                <option v-for="name in categoryNames" :key="name" :value="name">{{ name }}</option>
              </select>
            </label>

            <label class="field">
              {{ $i('menuUpdate_ruleRounding') }}
              <select v-model="draftRules.rounding">
                <option value="NearestKrone">{{ $i('menuUpdate_roundingKrone') }}</option>
                <option value="NearestFiveKroner">{{ $i('menuUpdate_roundingFiveKroner') }}</option>
                <option value="KeepOre">{{ $i('menuUpdate_roundingOre') }}</option>
              </select>
            </label>

            <label class="field">
              {{ $i('menuUpdate_ruleNewProducts') }}
              <select v-model="draftRules.newProductChannelRule">
                <option value="RequireExplicit">{{ $i('menuUpdate_newProductExplicit') }}</option>
                <option value="SameAsTakeaway">{{ $i('menuUpdate_newProductSameAsTakeaway') }}</option>
                <option value="TakeawayPlusPercent">{{ $i('menuUpdate_newProductPlusPercent') }}</option>
              </select>
            </label>

            <template v-if="draftRules.newProductChannelRule === 'TakeawayPlusPercent'">
              <label class="field">
                {{ $i('menuUpdate_newProductEatInPercent') }}
                <input v-model.number="draftRules.newProductEatInPercent" type="number" step="0.1">
              </label>
              <label class="field">
                {{ $i('menuUpdate_newProductDeliveryPercent') }}
                <input v-model.number="draftRules.newProductDeliveryPercent" type="number" step="0.1">
              </label>
            </template>
          </div>

          <div v-if="rateSuggestions.length" class="rate-suggestions">
            <div v-for="suggestion in rateSuggestions" :key="suggestionKey(suggestion)" class="rate">
              <span v-if="suggestion.available">
                {{ $i('menuUpdate_rateAvailable', {
                  group: suggestionGroup(suggestion),
                  percent: formatPercent(suggestion.percent),
                  count: suggestion.observationCount
                }) }}
              </span>
              <span v-else class="muted">
                {{ suggestionGroup(suggestion) }}: {{ suggestion.reason }}
              </span>
            </div>
          </div>

          <div class="actions">
            <button class="btn-secondary" type="button" :disabled="isValidating" @click="previewRules">
              {{ $i('menuUpdate_previewRules', { count: rulePreviewImpact.productCount }) }}
            </button>
            <button class="btn-primary" type="button" :disabled="!rulePreview" @click="commitRulePreview">
              {{ $i('menuUpdate_applyRules') }}
            </button>
            <button class="btn-secondary" type="button" :disabled="!undoSnapshot" @click="undoBulk">
              {{ $i('menuUpdate_undoBulk') }}
            </button>
            <button class="btn-secondary" type="button" @click="resetRules">
              {{ $i('menuUpdate_resetRules') }}
            </button>
          </div>

          <div v-if="rulePreview" class="note">
            {{ $i('menuUpdate_previewSummary', {
              products: rulePreviewImpact.productCount,
              fields: rulePreviewImpact.fieldCount,
              scope: $i('menuUpdate_scope_' + ruleScope)
            }) }}
          </div>
        </section>

        <!-- review table -->
        <section class="panel review">
          <div class="tools">
            <div>
              <strong>{{ $i('menuUpdate_resultCount', { count: rows.length, visible: shownRows.length }) }}</strong>
              <small>{{ $i('menuUpdate_onlyPricesChange') }}</small>
            </div>
            <div class="tool-actions">
              <input v-model="query" type="search" :placeholder="$i('menuUpdate_searchPlaceholder')" :aria-label="$i('menuUpdate_searchPlaceholder')">
              <button v-if="planCounts.review" class="btn-secondary" type="button" @click="skipAllUnresolved">
                {{ $i('menuUpdate_skipAllUnresolved', { count: planCounts.review }) }}
              </button>
            </div>
          </div>

          <div class="tablewrap">
            <table>
              <thead>
                <tr>
                  <th v-if="ruleScope === 'CheckedRows'" scope="col">
                    <span class="sr-only">{{ $i('menuUpdate_select') }}</span>
                  </th>
                  <th scope="col">
                    {{ $i('menuUpdate_colProduct') }}
                  </th>
                  <th scope="col">
                    {{ $i('menuUpdate_colSuggestion') }}
                  </th>
                  <th scope="col">
                    {{ $i('menuUpdate_channelTakeaway') }}
                  </th>
                  <th scope="col">
                    {{ $i('menuUpdate_channelEatIn') }}
                  </th>
                  <th scope="col">
                    {{ $i('menuUpdate_channelDelivery') }}
                  </th>
                  <th scope="col">
                    {{ $i('menuUpdate_colAction') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in shownRows" :key="row.rowKey" :class="{ 'row-warning': isRowUnresolved(row) }">
                  <td v-if="ruleScope === 'CheckedRows'">
                    <input
                      type="checkbox"
                      :checked="checkedKeys.includes(row.rowKey)"
                      :aria-label="$i('menuUpdate_selectRow', { name: row.displayName })"
                      @change="toggleChecked(row.rowKey)"
                    >
                  </td>
                  <td>
                    <strong>
                      <span v-if="row.menuNumber" class="num">{{ row.menuNumber }}.</span>
                      {{ row.displayName }}
                      <span v-if="row.sizeLabel" class="size">· {{ row.sizeLabel }}</span>
                    </strong>
                    <small>{{ rowLinkText(row) }}</small>
                    <button class="link-btn" type="button" @click="openDetail(row)">
                      {{ $i('menuUpdate_openDetail') }}
                    </button>
                  </td>
                  <td>
                    <span class="badge" :class="badgeClass(row)">{{ rowStateLabel(row) }}</span>
                    <small>{{ rowStateHint(row) }}</small>
                  </td>
                  <td v-for="channel in channels" :key="channel" class="price">
                    <template v-if="resolvedFor(row)">
                      <del v-if="showsOldPrice(row, channel)">{{ formatMoney(resolvedFor(row)[channel].currentAmount) }}</del>
                      <span class="newprice">{{ formatMoney(resolvedFor(row)[channel].newAmount) }}</span>
                      <small class="origin">{{ originLabel(resolvedFor(row)[channel]) }}</small>
                      <small v-if="channelDelta(row, channel)" class="delta">{{ channelDelta(row, channel) }}</small>
                    </template>
                    <span v-else class="muted">…</span>
                  </td>
                  <td>
                    <select
                      :value="row.action"
                      :aria-label="$i('menuUpdate_actionFor', { name: row.displayName })"
                      @change="changeAction(row, $event.target.value)"
                    >
                      <option value="Update">
                        {{ $i('menuUpdate_actionUpdate') }}
                      </option>
                      <option value="Create">
                        {{ $i('menuUpdate_actionCreate') }}
                      </option>
                      <option value="Skip">
                        {{ $i('menuUpdate_actionSkip') }}
                      </option>
                    </select>
                  </td>
                </tr>
                <tr v-if="!shownRows.length">
                  <td :colspan="ruleScope === 'CheckedRows' ? 7 : 6" class="empty">
                    {{ $i('menuUpdate_noRowsInFilter') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="reviewbottom">
            {{ $i('menuUpdate_reviewFooterNote') }}
          </div>
        </section>

        <div class="sticky-footer">
          <div>
            <strong>{{ $i('menuUpdate_footerSummary', {
              updated: planCounts.updated,
              created: planCounts.new,
              kept: planCounts.unchanged + planCounts.skipped
            }) }}</strong>
            <small v-if="planCounts.review">{{ $i('menuUpdate_footerBlocking', { count: planCounts.review }) }}</small>
            <small v-else-if="isValidating">{{ $i('menuUpdate_validating') }}</small>
            <small v-else-if="validationError" class="error-text">{{ validationError }}</small>
            <small v-else>{{ $i('menuUpdate_footerReady') }}</small>
          </div>
          <div class="footactions">
            <button class="btn-secondary" type="button" @click="step = 1">
              {{ $i('menuUpdate_changeSources') }}
            </button>
            <button class="btn-primary" type="button" :disabled="!canGoToReview" @click="step = 3">
              {{ $i('menuUpdate_goToApproval') }}
            </button>
          </div>
        </div>
      </template>

      <!-- ------------------------------------------------ step 3: approve -->
      <section v-else-if="step === 3" class="panel">
        <h2>{{ $i('menuUpdate_approveTitle') }}</h2>
        <p>{{ storeName }}</p>

        <template v-if="!receipt">
          <div class="summary-grid">
            <div><strong>{{ planCounts.updated }}</strong><span>{{ $i('menuUpdate_filter_updated') }}</span></div>
            <div><strong>{{ planCounts.new }}</strong><span>{{ $i('menuUpdate_filter_new') }}</span></div>
            <div><strong>{{ planCounts.skipped }}</strong><span>{{ $i('menuUpdate_skipped') }}</span></div>
            <div><strong>{{ planCounts.unchanged }}</strong><span>{{ $i('menuUpdate_filter_unchanged') }}</span></div>
          </div>

          <table v-if="validation" class="channel-summary">
            <thead>
              <tr>
                <th scope="col">
                  {{ $i('menuUpdate_channel') }}
                </th>
                <th scope="col">
                  {{ $i('menuUpdate_originSource') }}
                </th>
                <th scope="col">
                  {{ $i('menuUpdate_originRule') }}
                </th>
                <th scope="col">
                  {{ $i('menuUpdate_originManual') }}
                </th>
                <th scope="col">
                  {{ $i('menuUpdate_originUnchanged') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="channel in validation.summary.channels" :key="channel.channel">
                <th scope="row">
                  {{ $i('menuUpdate_channel' + channel.channel) }}
                </th>
                <td>{{ channel.fromSource }}</td>
                <td>{{ channel.fromRule }}</td>
                <td>{{ channel.manual }}</td>
                <td>{{ channel.unchanged }}</td>
              </tr>
            </tbody>
          </table>

          <div v-if="newProductRows.length" class="new-product-setup">
            <h3>{{ $i('menuUpdate_newProductSetupTitle') }}</h3>
            <p class="helper-text">
              {{ $i('menuUpdate_newProductSetupHelp') }}
            </p>
            <div v-for="row in newProductRows" :key="row.rowKey" class="new-product-row">
              <strong>{{ row.displayName }}</strong>
              <div class="new-product-fields">
                <label class="field">
                  {{ $i('menuUpdate_category') }}
                  <select v-model="row.newProduct.categoryId" @change="onNewProductCategoryChange(row)">
                    <option v-for="category in categories" :key="category.categoryId" :value="category.categoryId">
                      {{ category.name }}
                    </option>
                  </select>
                </label>
                <label class="field">
                  {{ $i('menuUpdate_vatTakeaway') }}
                  <input v-model.number="row.newProduct.tax" type="number" min="0" max="50">
                </label>
                <label class="field">
                  {{ $i('menuUpdate_vatEatIn') }}
                  <input v-model.number="row.newProduct.eatInTax" type="number" min="0" max="50">
                </label>
                <label class="field">
                  {{ $i('menuUpdate_vatDelivery') }}
                  <input v-model.number="row.newProduct.deliveryTax" type="number" min="0" max="50">
                </label>
                <label class="checkbox-label">
                  <input v-model="row.newProduct.hide" type="checkbox">
                  {{ $i('menuUpdate_hideNewProduct') }}
                </label>
              </div>
            </div>
            <label class="checkbox-label confirm">
              <input :checked="newProductsConfirmed" type="checkbox" @change="setNewProductsConfirmed($event.target.checked)">
              {{ $i('menuUpdate_confirmNewProducts') }}
            </label>
          </div>

          <div v-if="blockers.length" class="blockers">
            <h3>{{ $i('menuUpdate_blockersTitle', { count: blockers.length }) }}</h3>
            <ul>
              <li v-for="(blocker, index) in blockers" :key="index">
                {{ blockerText(blocker) }}
              </li>
            </ul>
            <button class="btn-secondary" type="button" @click="skipAllUnresolved">
              {{ $i('menuUpdate_skipAllUnresolved', { count: planCounts.review }) }}
            </button>
            <button class="btn-secondary" type="button" @click="acceptAllWarnings">
              {{ $i('menuUpdate_acceptAllWarnings') }}
            </button>
          </div>

          <div v-if="applyError" class="error-box" role="alert">
            {{ applyError }}
            <button v-if="lastOperationId" class="link-btn" type="button" @click="checkStatus">
              {{ $i('menuUpdate_checkStatus') }}
            </button>
          </div>

          <div class="actions">
            <button class="btn-secondary" type="button" @click="step = 2">
              {{ $i('common_back') }}
            </button>
            <button class="btn-primary" type="button" :disabled="!canApply || isApplying" @click="applyPlan">
              {{ isApplying
                ? $i('menuUpdate_applying')
                : $i('menuUpdate_approveAndUpdate', { count: planCounts.updated + planCounts.new }) }}
            </button>
          </div>
        </template>

        <!-- receipt -->
        <div v-else class="receipt">
          <span class="badge">{{ $i('menuUpdate_receiptBadge') }}</span>
          <h3>
            {{ $i('menuUpdate_receiptTitle', {
              updated: receipt.updatedProductIds.length,
              created: receipt.createdProductIds.length
            }) }}
          </h3>
          <p v-if="receipt.replayed" class="muted">
            {{ $i('menuUpdate_receiptReplayed') }}
          </p>
          <table class="channel-summary">
            <thead>
              <tr>
                <th scope="col">
                  {{ $i('menuUpdate_colProduct') }}
                </th>
                <th scope="col">
                  {{ $i('menuUpdate_channelTakeaway') }}
                </th>
                <th scope="col">
                  {{ $i('menuUpdate_channelEatIn') }}
                </th>
                <th scope="col">
                  {{ $i('menuUpdate_channelDelivery') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="price in receipt.prices" :key="price.productId">
                <th scope="row">
                  {{ price.productName }}
                  <small>{{ price.created ? $i('menuUpdate_created') : price.productId }}</small>
                </th>
                <td>{{ receiptPrice(price, 'Takeaway') }}</td>
                <td>{{ receiptPrice(price, 'EatIn') }}</td>
                <td>{{ receiptPrice(price, 'Delivery') }}</td>
              </tr>
            </tbody>
          </table>
          <div class="actions">
            <button class="btn-primary" type="button" @click="startOver">
              {{ $i('menuUpdate_startOver') }}
            </button>
          </div>
        </div>
      </section>

      <!-- ------------------------------------------------ detail dialog -->
      <div v-if="detailRow" class="modal-overlay" @click.self="closeDetail">
        <div class="modal-card" role="dialog" aria-modal="true" :aria-label="detailRow.displayName" @keydown.esc="closeDetail">
          <div class="modal-head">
            <h3>{{ detailRow.displayName }}<span v-if="detailRow.sizeLabel"> · {{ detailRow.sizeLabel }}</span></h3>
            <button class="link-btn" type="button" @click="closeDetail">
              {{ $i('common_close') }}
            </button>
          </div>

          <div class="modal-body">
            <p v-if="detailRow.reason">
              {{ detailRow.reason }}
            </p>

            <h4>{{ $i('menuUpdate_sourceExcerpts') }}</h4>
            <ul class="source-prices">
              <li v-for="(price, index) in detailRow.sourcePrices" :key="index">
                {{ $i('menuUpdate_sourcePriceLine', {
                  channel: $i('menuUpdate_channel' + normalizeChannel(price.channel)),
                  amount: formatMoney(price.amount),
                  document: price.documentName,
                  page: price.pageNumber,
                  column: price.columnLabel
                }) }}
                <small v-if="price.excerpt" class="muted">{{ price.excerpt }}</small>
              </li>
              <li v-if="!detailRow.sourcePrices.length" class="muted">
                {{ $i('menuUpdate_noSourcePrices') }}
              </li>
            </ul>

            <h4>{{ $i('menuUpdate_targetProduct') }}</h4>
            <label v-if="detailRow.action !== 'Create'" class="field">
              {{ $i('menuUpdate_linkedProduct') }}
              <select v-model="detailRow.targetProductId" @change="onPlanChanged">
                <option :value="null">{{ $i('menuUpdate_noLink') }}</option>
                <option v-for="product in detailCandidates" :key="product.productId" :value="product.productId">
                  {{ candidateLabel(product) }}
                </option>
              </select>
            </label>
            <input
              v-if="detailRow.action !== 'Create'"
              v-model="candidateQuery"
              type="search"
              :placeholder="$i('menuUpdate_searchCatalogue')"
              :aria-label="$i('menuUpdate_searchCatalogue')"
            >

            <h4>{{ $i('menuUpdate_prices') }}</h4>
            <div class="price-fields">
              <label v-for="channel in channels" :key="channel" class="field">
                {{ $i('menuUpdate_channel' + channelEnumName(channel)) }}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  :value="manualValueFor(detailRow, channel)"
                  :placeholder="placeholderFor(detailRow, channel)"
                  @change="setManual(detailRow, channel, $event.target.value)"
                >
                <small class="muted">{{ originLabel(resolvedChannel(detailRow, channel)) }}</small>
              </label>
            </div>
            <p class="helper-text">
              {{ $i('menuUpdate_manualPriceHelp') }}
            </p>

            <div v-if="detailIssues.length" class="issues">
              <h4>{{ $i('menuUpdate_issues') }}</h4>
              <ul>
                <li v-for="(issue, index) in detailIssues" :key="index">
                  {{ issueText(issue) }}
                  <button
                    v-if="issue.requiresAcceptance && !issue.accepted"
                    class="link-btn"
                    type="button"
                    @click="acceptWarning(detailRow, issue.code)"
                  >
                    {{ $i('menuUpdate_acceptWarning') }}
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" type="button" @click="changeAction(detailRow, 'Skip'); closeDetail()">
              {{ $i('menuUpdate_actionSkip') }}
            </button>
            <button class="btn-secondary" type="button" @click="changeAction(detailRow, 'Create')">
              {{ $i('menuUpdate_actionCreate') }}
            </button>
            <button class="btn-primary" type="button" @click="closeDetail">
              {{ $i('menuUpdate_done') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import {
  ACTION,
  CHANNELS,
  buildDraft,
  channelEnum,
  channelName,
  counts,
  isUnresolved,
  money,
  percent,
  resolvedByKey,
  ruleImpact,
  scopeRows,
  setManualPrice,
  snapshot,
  toValidateRequest,
  visibleRows
} from '~/utils/menu-update'

const DEFAULT_RULES = () => ({
  missingChannelRule: 'KeepCurrent',
  referenceChannel: 'Takeaway',
  missingChannelPercent: null,
  absentProductRule: 'Keep',
  absentProductPercent: null,
  absentProductUseReferenceRateForAllChannels: false,
  newProductChannelRule: 'RequireExplicit',
  newProductEatInPercent: null,
  newProductDeliveryPercent: null,
  rounding: 'NearestKrone'
})

export default {
  components: { AdminPage },
  data () {
    return {
      step: 1,
      files: [],
      mappingChoice: {},
      pastedText: '',
      isDragging: false,

      isAnalyzing: false,
      uploadPercent: 0,
      analysisError: '',
      analysis: null,

      rows: [],
      initialRows: [],
      activeRules: DEFAULT_RULES(),
      draftRules: DEFAULT_RULES(),

      ruleScope: 'AllInFilter',
      scopeCategoryName: '',
      checkedKeys: [],
      rulePreview: null,
      undoSnapshot: null,

      validation: null,
      isValidating: false,
      validationError: '',

      isApplying: false,
      applyError: '',
      receipt: null,
      lastOperationId: '',

      filter: 'all',
      query: '',
      detailRow: null,
      candidateQuery: '',

      channels: CHANNELS,
      filterKeys: ['all', 'updated', 'new', 'review', 'unchanged', 'notInSource'],
      limits: { maxFiles: 8, maxFileMb: 20, maxTotalMb: 40 },

      // Bumped on every store change so a response from the previous store is discarded
      // instead of quietly repopulating the screen.
      requestGeneration: 0,
      abortController: null,
      validateTimer: null
    }
  },
  computed: {
    selectedStore () { return this.$store.state.selectedAdminStore },
    storeName () { return (this.analysis && this.analysis.storeName) || '' },
    stepLabels () {
      return [this.$i('menuUpdate_step1'), this.$i('menuUpdate_step2'), this.$i('menuUpdate_step3')]
    },
    hasDraft () { return this.rows.length > 0 },
    analysisProgressText () {
      return this.uploadPercent < 100
        ? this.$i('menuUpdate_uploading', { percent: this.uploadPercent })
        : this.$i('menuUpdate_readingDocuments', { count: this.files.length + (this.pastedText.trim() ? 1 : 0) })
    },
    canAnalyze () {
      return !this.isAnalyzing && this.selectedStore > 0 && (this.files.length > 0 || !!this.pastedText.trim())
    },
    resolvedMap () { return resolvedByKey(this.validation) },
    planCounts () { return counts(this.rows, this.resolvedMap) },
    shownRows () { return visibleRows(this.rows, this.resolvedMap, this.filter, this.query) },
    categories () { return (this.analysis && this.analysis.categories) || [] },
    categoryNames () {
      return [...new Set(this.rows.map(r => r.categoryName).filter(Boolean))].sort()
    },
    rateSuggestions () { return (this.validation && this.validation.rateSuggestions) || [] },
    blockers () { return (this.validation && this.validation.blockers) || [] },
    canApply () { return !!(this.validation && this.validation.canApply) && !this.isApplying },
    canGoToReview () { return this.rows.length > 0 && !this.isValidating },
    newProductRows () { return this.rows.filter(r => r.action === ACTION.create && r.newProduct) },
    newProductsConfirmed () {
      return this.newProductRows.length > 0 && this.newProductRows.every(r => r.newProduct.setupConfirmed)
    },
    currentScopeRows () {
      return scopeRows(this.rows, this.resolvedMap, this.ruleScope, {
        filter: this.filter,
        query: this.query,
        categoryName: this.scopeCategoryName,
        checkedKeys: this.checkedKeys
      })
    },
    rulePreviewImpact () { return ruleImpact(this.currentScopeRows) },
    rulesSummary () {
      const missingLabels = {
        KeepCurrent: 'menuUpdate_ruleKeepCurrent',
        SamePercent: 'menuUpdate_ruleSamePercent',
        KeepKroneDelta: 'menuUpdate_ruleKeepKroneDelta',
        CustomPercent: 'menuUpdate_ruleCustomPercent'
      }
      const absentLabels = {
        Keep: 'menuUpdate_ruleAbsentKeep',
        SuggestFromSimilar: 'menuUpdate_ruleAbsentSuggest',
        CustomPercent: 'menuUpdate_ruleCustomPercent'
      }
      const roundingLabels = {
        NearestKrone: 'menuUpdate_roundingKrone',
        NearestFiveKroner: 'menuUpdate_roundingFiveKroner',
        KeepOre: 'menuUpdate_roundingOre'
      }
      return this.$i('menuUpdate_rulesSummary', {
        missing: this.$i(missingLabels[this.activeRules.missingChannelRule]),
        absent: this.$i(absentLabels[this.activeRules.absentProductRule]),
        rounding: this.$i(roundingLabels[this.activeRules.rounding])
      })
    },
    allSourceWarnings () {
      const warnings = []
      ;((this.analysis && this.analysis.warnings) || []).forEach((w, i) => warnings.push({ key: 'a' + i, message: w.message }))
      ;((this.analysis && this.analysis.sources) || []).forEach((source) => {
        (source.warnings || []).forEach((w, i) => warnings.push({ key: source.documentName + i, message: source.documentName + ': ' + w.message }))
      })
      return warnings
    },
    detailCandidates () {
      if (!this.detailRow) { return [] }
      const catalogue = (this.analysis && this.analysis.catalogue) || []
      const needle = this.candidateQuery.trim().toLowerCase()
      if (needle) {
        return catalogue.filter(p => (p.name || '').toLowerCase().includes(needle)).slice(0, 50)
      }
      const suggested = (this.detailRow.candidates || []).map(c => c.productId)
      const byId = {}
      catalogue.forEach((p) => { byId[p.productId] = p })
      const preferred = suggested.map(id => byId[id]).filter(Boolean)
      const rest = catalogue.filter(p => !suggested.includes(p.productId)).slice(0, 50)
      return [...preferred, ...rest]
    },
    detailIssues () {
      const resolved = this.resolvedFor(this.detailRow)
      if (!resolved) { return this.detailRow ? this.detailRow.sourceWarnings : [] }
      return [...(resolved.blockers || []), ...(resolved.warnings || []), ...(this.detailRow.sourceWarnings || [])]
    }
  },
  watch: {
    selectedStore (newValue, oldValue) {
      if (newValue === oldValue) { return }
      this.onStoreChanged()
    },
    draftRules: {
      handler () { this.rulePreview = null },
      deep: true
    }
  },
  beforeDestroy () {
    this.cancelInFlight()
    if (this.validateTimer) { clearTimeout(this.validateTimer) }
  },
  methods: {
    handleLoginSuccess () { this.startOver() },

    // ------------------------------------------------------------ sources
    onFilesPicked (event) {
      this.addFiles(Array.from(event.target.files || []))
      if (this.$refs.fileInput) { this.$refs.fileInput.value = '' }
    },
    onDrop (event) {
      this.isDragging = false
      this.addFiles(Array.from((event.dataTransfer && event.dataTransfer.files) || []))
    },
    addFiles (incoming) {
      const pdfs = incoming.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
      const rejected = incoming.length - pdfs.length
      if (rejected > 0) {
        this.analysisError = this.$i('menuUpdate_onlyPdf')
      }
      pdfs.forEach((file) => {
        if (!this.files.some(existing => existing.name === file.name && existing.size === file.size)) {
          this.files.push(file)
          this.$set(this.mappingChoice, file.name, 'auto')
        }
      })
      this.checkLocalLimits()
    },
    removeFile (index) {
      this.files.splice(index, 1)
      this.checkLocalLimits()
    },
    /** Fails fast in the browser so the operator is not made to wait for a large upload. */
    checkLocalLimits () {
      const total = this.files.reduce((sum, f) => sum + f.size, 0)
      const tooManyFiles = this.files.length > this.limits.maxFiles
      const tooBigFile = this.files.some(f => f.size > this.limits.maxFileMb * 1024 * 1024)
      const tooBigTotal = total > this.limits.maxTotalMb * 1024 * 1024

      if (tooManyFiles || tooBigFile || tooBigTotal) {
        this.analysisError = this.$i('menuUpdate_tooLarge', {
          files: this.limits.maxFiles,
          perFile: this.limits.maxFileMb,
          total: this.limits.maxTotalMb
        })
      } else if (this.analysisError === this.$i('menuUpdate_tooLarge', {
        files: this.limits.maxFiles, perFile: this.limits.maxFileMb, total: this.limits.maxTotalMb
      })) {
        this.analysisError = ''
      }
    },
    sourceMappings () {
      return this.files
        .filter(file => (this.mappingChoice[file.name] || 'auto') !== 'auto')
        .map((file) => {
          const choice = this.mappingChoice[file.name]
          return {
            documentName: file.name,
            sizeColumns: [],
            sizeColumnChannel: choice === 'sizes-eatIn'
              ? 'EatIn'
              : choice === 'sizes-delivery' ? 'Delivery' : 'Takeaway',
            channelColumns: {}
          }
        })
    },
    async runAnalysis () {
      if (!this.canAnalyze) { return }

      this.cancelInFlight()
      const generation = ++this.requestGeneration
      this.abortController = typeof AbortController !== 'undefined' ? new AbortController() : null

      this.isAnalyzing = true
      this.analysisError = ''
      this.uploadPercent = 0

      try {
        const analysis = await this._menuUpdateService.Analyze(
          this.selectedStore,
          {
            files: this.files,
            text: this.pastedText,
            textLabel: this.$i('menuUpdate_pastedTextLabel'),
            sourceMappings: this.sourceMappings()
          },
          {
            signal: this.abortController && this.abortController.signal,
            onUploadProgress: (event) => {
              if (event.total) { this.uploadPercent = Math.round((event.loaded / event.total) * 100) }
            }
          }
        )

        // A response that belongs to a store the operator has since left is discarded.
        if (generation !== this.requestGeneration) { return }

        this.analysis = analysis
        this.rows = buildDraft(analysis)
        this.initialRows = snapshot(this.rows)
        this.prepareNewProducts()
        this.step = 2
        await this.validate()
      } catch (error) {
        if (generation !== this.requestGeneration || error.cancelled) { return }
        this.analysisError = error.message || this.$i('menuUpdate_analysisFailed')
      } finally {
        if (generation === this.requestGeneration) { this.isAnalyzing = false }
      }
    },

    // ------------------------------------------------------------ validation
    onPlanChanged () {
      // Any edit invalidates the previous server check, so the token is dropped immediately
      // and a fresh validation is requested.
      this.validation = null
      this.rulePreview = null
      if (this.validateTimer) { clearTimeout(this.validateTimer) }
      this.validateTimer = setTimeout(() => this.validate(), 250)
    },
    async validate (rulesOverride) {
      if (!this.rows.length || this.selectedStore <= 0) { return null }

      const generation = this.requestGeneration
      const rules = rulesOverride || this.activeRules
      this.isValidating = true
      this.validationError = ''

      try {
        const result = await this._menuUpdateService.Validate(
          toValidateRequest(this.selectedStore, rules, this.rows))

        if (generation !== this.requestGeneration) { return null }
        if (!rulesOverride) { this.validation = result }
        return result
      } catch (error) {
        if (generation !== this.requestGeneration || error.cancelled) { return null }
        this.validationError = error.message || this.$i('menuUpdate_validationFailed')
        return null
      } finally {
        if (generation === this.requestGeneration) { this.isValidating = false }
      }
    },

    // ------------------------------------------------------------ bulk rules
    async previewRules () {
      const scoped = new Set(this.currentScopeRows.map(r => r.rowKey))
      const before = snapshot(this.rows)

      this.rows.forEach((row) => { row.excludedFromRules = !scoped.has(row.rowKey) })

      const result = await this.validate(this.draftRules)
      if (!result) {
        this.rows = before
        return
      }
      this.rulePreview = result
      this.validation = result
    },
    commitRulePreview () {
      if (!this.rulePreview) { return }
      // The snapshot is taken before the rule becomes the active one, so undo restores exactly
      // the draft the operator had.
      this.undoSnapshot = { rows: snapshot(this.rows), rules: { ...this.activeRules } }
      this.activeRules = { ...this.draftRules }
      this.rulePreview = null
      this.onPlanChanged()
    },
    undoBulk () {
      if (!this.undoSnapshot) { return }
      this.rows = this.undoSnapshot.rows
      this.activeRules = this.undoSnapshot.rules
      this.draftRules = { ...this.undoSnapshot.rules }
      this.undoSnapshot = null
      this.onPlanChanged()
    },
    /** Restores the draft the analysis produced. No document is read again. */
    resetRules () {
      this.rows = snapshot(this.initialRows)
      this.prepareNewProducts()
      this.activeRules = DEFAULT_RULES()
      this.draftRules = DEFAULT_RULES()
      this.rulePreview = null
      this.undoSnapshot = null
      this.checkedKeys = []
      this.onPlanChanged()
    },

    // ------------------------------------------------------------ row editing
    changeAction (row, action) {
      row.action = action
      if (action === ACTION.create) {
        // Choosing "create new" drops the catalogue link but keeps every unresolved price.
        row.targetProductId = null
        this.ensureNewProduct(row)
      } else {
        row.newProduct = null
      }
      this.onPlanChanged()
    },
    ensureNewProduct (row) {
      if (row.newProduct) { return }
      const category = this.categories.find(c => c.name === row.categoryName) || this.categories[0]
      row.newProduct = {
        name: row.displayName,
        description: '',
        otherInformation: '',
        categoryId: category ? category.categoryId : null,
        // Proposed from what this store already charges in that category, never a fixed rate.
        tax: category ? category.suggestedTax : 0,
        eatInTax: category ? category.suggestedEatInTax : 0,
        deliveryTax: category ? category.suggestedDeliveryTax : 0,
        hide: false,
        setupConfirmed: false
      }
    },
    prepareNewProducts () {
      this.rows.filter(r => r.action === ACTION.create).forEach(row => this.ensureNewProduct(row))
    },
    onNewProductCategoryChange (row) {
      const category = this.categories.find(c => c.categoryId === row.newProduct.categoryId)
      if (category && category.taxSuggestionAvailable) {
        row.newProduct.tax = category.suggestedTax
        row.newProduct.eatInTax = category.suggestedEatInTax
        row.newProduct.deliveryTax = category.suggestedDeliveryTax
      }
      row.newProduct.setupConfirmed = false
      this.onPlanChanged()
    },
    setNewProductsConfirmed (confirmed) {
      this.newProductRows.forEach((row) => { row.newProduct.setupConfirmed = confirmed })
      this.onPlanChanged()
    },
    toggleChecked (rowKey) {
      const index = this.checkedKeys.indexOf(rowKey)
      if (index >= 0) { this.checkedKeys.splice(index, 1) } else { this.checkedKeys.push(rowKey) }
    },
    /** One click for every row still waiting on the operator. No dialog per row. */
    skipAllUnresolved () {
      this.rows.forEach((row) => {
        if (row.action !== ACTION.skip && this.isRowUnresolved(row)) { row.action = ACTION.skip }
      })
      this.onPlanChanged()
    },
    acceptAllWarnings () {
      ;((this.validation && this.validation.warnings) || []).forEach((warning) => {
        if (!warning.requiresAcceptance || warning.accepted) { return }
        const row = this.rows.find(r => r.rowKey === warning.rowKey)
        if (row && !row.acceptedWarnings.includes(warning.code)) { row.acceptedWarnings.push(warning.code) }
      })
      this.onPlanChanged()
    },
    acceptWarning (row, code) {
      if (!row.acceptedWarnings.includes(code)) { row.acceptedWarnings.push(code) }
      this.onPlanChanged()
    },
    setManual (row, channel, value) {
      const trimmed = String(value == null ? '' : value).trim()
      setManualPrice(row, channel, trimmed === '' ? null : Math.round(Number(trimmed) * 100))
      this.onPlanChanged()
    },

    // ------------------------------------------------------------ apply
    async applyPlan () {
      if (!this.canApply) { return }

      this.isApplying = true
      this.applyError = ''
      const generation = this.requestGeneration

      try {
        // Always apply exactly the plan the server just validated.
        const request = {
          operationId: this.validation.operationId,
          planToken: this.validation.planToken,
          expiresAt: this.validation.expiresAt,
          catalogueHash: this.validation.catalogueHash,
          plan: toValidateRequest(this.selectedStore, this.activeRules, this.rows)
        }
        this.lastOperationId = this.validation.operationId

        const receipt = await this._menuUpdateService.Apply(request)
        if (generation !== this.requestGeneration) { return }
        this.receipt = receipt
      } catch (error) {
        if (generation !== this.requestGeneration || error.cancelled) { return }
        this.applyError = error.message || this.$i('menuUpdate_applyFailed')
        // A plan the server refused as stale or expired is re-checked, never retried blindly.
        if (error.status === 400) { await this.validate() }
      } finally {
        if (generation === this.requestGeneration) { this.isApplying = false }
      }
    },
    /** After an unknown network result, ask whether the operation committed. Never retry. */
    async checkStatus () {
      if (!this.lastOperationId) { return }
      try {
        const status = await this._menuUpdateService.GetStatus(this.selectedStore, this.lastOperationId)
        if (status.applied) {
          this.receipt = status.receipt
          this.applyError = ''
        } else {
          this.applyError = this.$i('menuUpdate_statusNotApplied')
        }
      } catch (error) {
        this.applyError = error.message || this.$i('menuUpdate_statusFailed')
      }
    },

    // ------------------------------------------------------------ store change
    onStoreChanged () {
      this.cancelInFlight()
      this.requestGeneration++

      if (this.hasDraft) {
        // The draft belongs to the previous store, so it is dropped rather than silently
        // applied to a different catalogue.
        window.alert(this.$i('menuUpdate_storeChangedDraftDiscarded'))
      }
      this.startOver()
    },
    cancelInFlight () {
      if (this.abortController) {
        this.abortController.abort()
        this.abortController = null
      }
    },
    startOver () {
      this.step = 1
      this.files = []
      this.mappingChoice = {}
      this.pastedText = ''
      this.analysis = null
      this.rows = []
      this.initialRows = []
      this.validation = null
      this.receipt = null
      this.applyError = ''
      this.analysisError = ''
      this.validationError = ''
      this.checkedKeys = []
      this.undoSnapshot = null
      this.rulePreview = null
      this.filter = 'all'
      this.query = ''
      this.activeRules = DEFAULT_RULES()
      this.draftRules = DEFAULT_RULES()
    },

    // ------------------------------------------------------------ presentation
    formatMoney: money,
    formatPercent: percent,
    normalizeChannel (channel) { return channelEnum(channelName(channel)) },
    channelEnumName (channel) { return channelEnum(channel) },
    resolvedFor (row) { return row ? this.resolvedMap[row.rowKey] : null },
    resolvedChannel (row, channel) {
      const resolved = this.resolvedFor(row)
      return resolved ? resolved[channel] : null
    },
    isRowUnresolved (row) {
      return row.action !== ACTION.skip &&
        (isUnresolved(this.resolvedFor(row)) || (!this.validation && row.needsReview))
    },
    showsOldPrice (row, channel) {
      const field = this.resolvedChannel(row, channel)
      return !!(field && field.currentAmount !== null && field.currentAmount !== undefined && field.changed)
    },
    channelDelta (row, channel) {
      const field = this.resolvedChannel(row, channel)
      if (!field || !field.changed || field.deltaPercent === null || field.deltaPercent === undefined) { return '' }
      return percent(field.deltaPercent)
    },
    originLabel (field) {
      if (!field) { return '' }
      const key = 'menuUpdate_origin' + field.origin
      const label = this.$i(key)
      return field.originDetail ? label + ' · ' + field.originDetail : label
    },
    rowLinkText (row) {
      if (row.action === ACTION.create) { return this.$i('menuUpdate_willCreate') }
      if (!row.targetProductId) { return this.$i('menuUpdate_noLink') }
      const resolved = this.resolvedFor(row)
      const name = (resolved && resolved.productName) || ''
      return this.$i('menuUpdate_linkedTo', { name })
    },
    rowStateLabel (row) {
      if (row.action === ACTION.skip) { return this.$i('menuUpdate_actionSkip') }
      if (this.isRowUnresolved(row)) { return this.$i('menuUpdate_filter_review') }
      if (row.action === ACTION.create) { return this.$i('menuUpdate_actionCreate') }
      const resolved = this.resolvedFor(row)
      return resolved && resolved.changed ? this.$i('menuUpdate_actionUpdate') : this.$i('menuUpdate_filter_unchanged')
    },
    rowStateHint (row) {
      if (this.isRowUnresolved(row)) { return this.$i('menuUpdate_hintNeedsReview') }
      if (row.action === ACTION.create) { return this.$i('menuUpdate_hintNewId') }
      if (row.action === ACTION.update) { return this.$i('menuUpdate_hintKeepsId') }
      return ''
    },
    badgeClass (row) {
      if (row.action === ACTION.skip) { return 'skip' }
      if (this.isRowUnresolved(row)) { return 'warn' }
      if (row.action === ACTION.create) { return 'new' }
      return ''
    },
    manualValueFor (row, channel) {
      const manual = (row.manualPrices || []).find(m => channelName(m.channel) === channel)
      return manual ? manual.amount / 100 : ''
    },
    placeholderFor (row, channel) {
      const field = this.resolvedChannel(row, channel)
      return field && field.newAmount !== null && field.newAmount !== undefined ? money(field.newAmount) : ''
    },
    candidateLabel (product) {
      return product.name + ' · ' + money(product.takeaway) + ' / ' + money(product.eatIn) + ' / ' + money(product.delivery)
    },
    suggestionKey (suggestion) {
      return [suggestion.categoryId, suggestion.sizeLabel, suggestion.channel].join('|')
    },
    suggestionGroup (suggestion) {
      const parts = [suggestion.categoryName || this.$i('menuUpdate_noCategory')]
      if (suggestion.sizeLabel) { parts.push(suggestion.sizeLabel) }
      parts.push(this.$i('menuUpdate_channel' + suggestion.channel))
      return parts.join(' · ')
    },
    issueText (issue) {
      const key = 'menuUpdate_issue_' + issue.code
      const translated = this.$i(key)
      return translated === key ? issue.message : translated
    },
    blockerText (blocker) {
      const row = this.rows.find(r => r.rowKey === blocker.rowKey)
      const name = row ? row.displayName : ''
      return (name ? name + ': ' : '') + this.issueText(blocker)
    },
    sourceRowCount (source) {
      return (source.pages || []).reduce((sum, page) => sum + page.rowCount, 0)
    },
    receiptPrice (price, channel) {
      const before = price['previous' + channel]
      const after = price['new' + channel]
      return before === null || before === undefined
        ? money(after)
        : money(before) + ' → ' + money(after)
    },
    formatBytes (bytes) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    },
    openDetail (row) {
      this.detailRow = row
      this.candidateQuery = ''
    },
    closeDetail () { this.detailRow = null }
  }
}
</script>

<style lang="scss" scoped>
.menu-update-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 24px 120px;

  @media (max-width: 768px) { padding: 16px 16px 140px; }
}

.page-header {
  margin-bottom: 24px;

  .eyebrow {
    font-size: 0.7em;
    letter-spacing: 1.5px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
  }

  h1 {
    font-size: 2em;
    font-weight: 600;
    color: #292c34;
    margin: 8px 0;

    @media (max-width: 768px) { font-size: 1.5em; }
  }

  p { color: #64748b; margin: 0; }
}

.steps {
  display: flex;
  gap: 28px;
  margin: 0 0 24px;
  padding: 0;
  list-style: none;
  font-size: 0.8em;
  color: #64748b;
  flex-wrap: wrap;

  b {
    display: inline-grid;
    place-items: center;
    width: 23px;
    height: 23px;
    border: 1px solid #e2e8f0;
    border-radius: 50%;
    margin-right: 7px;
    font-weight: 600;
  }

  .current { color: #1bb776; font-weight: 600; }
  .current b { background: #1bb776; border-color: #1bb776; color: #fff; }
  .done b { border-color: #1bb776; color: #1bb776; }
}

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;

  h2 { font-size: 1.1em; font-weight: 600; color: #292c34; margin: 0 0 4px; }
  h3 { font-size: 1em; font-weight: 600; color: #292c34; margin: 24px 0 8px; }
  h4 { font-size: 0.85em; font-weight: 600; color: #292c34; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 0.3px; }
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.helper-text { font-size: 0.8em; color: #64748b; font-style: italic; }
.muted { color: #64748b; }
.error-text { color: #ef4444; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

.field {
  display: block;
  margin-bottom: 16px;

  select, input, textarea {
    display: block;
    width: 100%;
    margin-top: 8px;
    padding: 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    font-size: 0.95em;
    color: #292c34;
    transition: all 0.2s ease;

    &:hover { border-color: #cbd5e0; }

    &:focus {
      outline: none;
      border-color: #1bb776;
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    }
  }

  font-size: 0.85em;
  font-weight: 600;
  color: #292c34;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.inline-field {
  display: block;
  margin-top: 8px;
  font-size: 0.75em;
  text-transform: none;
  letter-spacing: 0;
  color: #64748b;

  select { margin-top: 4px; padding: 6px 8px; font-size: 0.95em; }
}

.upload {
  border: 2px dashed #cbd5e0;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  transition: all 0.2s ease;

  &.dragging { border-color: #1bb776; background: #f4fbf7; }
  input[type="file"] { display: block; margin: 12px auto 0; }
  small { display: block; margin-top: 8px; color: #64748b; }
}

.source-list { list-style: none; padding: 0; margin: 16px 0; }

.sources { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }

.source {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 8px;

  .source-body { flex: 1; }
  strong { display: block; font-size: 0.9em; }
  small { display: block; color: #64748b; font-size: 0.8em; }
}

.pdf-tag {
  background: #f1eee4;
  color: #82744f;
  font-size: 0.65em;
  font-weight: 700;
  padding: 10px 8px;
  border-radius: 6px;
}

.note {
  display: flex;
  gap: 12px;
  padding: 13px 16px;
  margin-top: 12px;
  border: 1px solid #e8d8b4;
  background: #fff8e9;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.8em;
}

.error-box {
  padding: 13px 16px;
  margin: 16px 0;
  border: 1px solid #ef4444;
  background: #fef2f2;
  border-radius: 8px;
  color: #b91c1c;
  font-size: 0.85em;
}

.progress {
  margin: 16px 0;

  .progress-bar {
    height: 6px;
    background: #e2e8f0;
    border-radius: 3px;
    overflow: hidden;

    div { height: 100%; background: #1bb776; transition: width 0.2s ease; }
  }

  small { display: block; margin-top: 8px; color: #64748b; }
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 24px;

  @media (max-width: 480px) { gap: 8px; }
}

.stat {
  padding: 16px 20px;
  text-align: left;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  strong { display: block; font-size: 1.6em; font-weight: 600; color: #292c34; }
  strong.warn { color: #92400e; }
  span { font-size: 0.8em; color: #64748b; }

  &:hover { border-color: #cbd5e0; }
  &.selected { border-color: #1bb776; box-shadow: inset 0 0 0 1px #1bb776; }
  &:focus-visible { outline: 3px solid rgba(27, 183, 118, 0.4); outline-offset: 2px; }
}

.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.rate-suggestions {
  margin: 8px 0 16px;
  font-size: 0.8em;

  .rate { padding: 4px 0; }
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.btn-primary {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95em;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4); }
  &:disabled { background: #cbd5e0; box-shadow: none; cursor: not-allowed; opacity: 0.6; }
}

.btn-secondary {
  background: #fff;
  color: #292c34;
  border: 2px solid #e2e8f0;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover:not(:disabled) { background: #f8f9fa; border-color: #cbd5e0; }
  &:disabled { cursor: not-allowed; opacity: 0.5; }
}

.link-btn {
  background: none;
  border: 0;
  padding: 4px 0;
  color: #1bb776;
  font-size: 0.8em;
  font-weight: 600;
  cursor: pointer;

  &:hover { text-decoration: underline; }
}

.review { padding: 0; }

.tools {
  padding: 19px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;

  strong { display: block; font-size: 0.9em; }
  small { color: #64748b; font-size: 0.8em; }
}

.tool-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;

  input[type="search"] {
    padding: 10px 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    width: 240px;

    &:focus { outline: none; border-color: #1bb776; box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1); }
  }
}

.tablewrap { overflow: auto; }

table {
  border-collapse: collapse;
  width: 100%;
  text-align: left;
  font-size: 0.8em;

  th {
    background: #fafbf8;
    color: #64748b;
    font-size: 0.85em;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 13px 15px;
    font-weight: 600;
  }

  td {
    padding: 16px 15px;
    border-top: 1px solid #edf0ea;
    vertical-align: top;
  }

  td:nth-child(2) { min-width: 215px; }
  td strong { display: block; font-size: 1.05em; }
  td small { display: block; margin-top: 3px; font-size: 0.9em; color: #64748b; }
}

.row-warning { background: #fffcf5; }
.num { color: #8a958b; margin-right: 5px; }
.size { color: #64748b; font-weight: 400; }

.price {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;

  del { color: #94a3b8; margin-right: 6px; }
  .newprice { color: #1bb776; font-weight: 600; }
  .origin { font-style: italic; }
  .delta { color: #64748b; }
}

.badge {
  display: inline-block;
  padding: 4px 9px;
  background: #edf2eb;
  border-radius: 6px;
  font-size: 0.85em;
  font-weight: 600;

  &.warn { color: #92400e; background: #fbf0da; }
  &.new { color: #466796; background: #edf2fa; }
  &.skip { color: #64748b; background: #f1f2f0; }
}

.empty { padding: 45px; text-align: center; color: #64748b; }
.reviewbottom { padding: 14px 19px; background: #fafbf8; color: #64748b; font-size: 0.75em; }

.empty-state {
  text-align: center;
  padding: 64px 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  h3 { font-size: 1.3em; color: #292c34; margin-bottom: 8px; }
  p { color: #64748b; }
}

.sticky-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.97);
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  z-index: 2;
  flex-wrap: wrap;

  strong { font-size: 0.9em; }
  small { display: block; color: #64748b; font-size: 0.8em; }
}

.footactions { display: flex; gap: 8px; }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin: 16px 0 24px;

  div { padding: 16px; background: #f8f9fa; border-radius: 8px; }
  strong { display: block; font-size: 1.6em; font-weight: 600; }
  span { font-size: 0.8em; color: #64748b; }
}

.channel-summary {
  margin-bottom: 24px;

  th[scope="row"] { background: transparent; text-transform: none; letter-spacing: 0; color: #292c34; }
}

.new-product-row {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 12px;
}

.new-product-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85em;

  &.confirm { margin-top: 12px; background: #edf2eb; font-weight: 600; }

  input[type="checkbox"] { width: 20px; height: 20px; accent-color: #1bb776; }
}

.blockers {
  padding: 16px;
  border: 1px solid #e8d8b4;
  background: #fff8e9;
  border-radius: 8px;
  margin: 16px 0;

  ul { margin: 8px 0 12px; padding-left: 20px; font-size: 0.85em; }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(23, 43, 37, 0.35);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 10;
}

.modal-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  max-width: 680px;
  width: 100%;
  max-height: 85vh;
  overflow: auto;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;

  h3 { margin: 0; font-size: 1.1em; }
}

.modal-body { padding: 8px 0; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; flex-wrap: wrap; }

.source-prices {
  list-style: none;
  padding: 0;
  font-size: 0.85em;

  li { padding: 8px 0; border-bottom: 1px solid #edf0ea; }
  small { display: block; }
}

.price-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.issues ul { font-size: 0.85em; padding-left: 20px; }

.receipt {
  .badge { margin-bottom: 12px; }
  h3 { margin-top: 8px; }
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid rgba(27, 183, 118, 0.5);
  outline-offset: 2px;
}
</style>
