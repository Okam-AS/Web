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
              <small>{{ $i('menuUpdate_columnsAskedAfterReading') }}</small>
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
                <small>{{ sourcePageSummary(source) }}</small>
                <small v-if="source.proposedInterpretation">{{ source.proposedInterpretation }}</small>
              </div>
            </div>
          </div>
          <div v-for="warning in allSourceWarnings" :key="warning.key" class="note">
            {{ warning.message }}
          </div>
        </section>

        <section v-if="analysis" class="panel columns-panel">
          <div class="panel-head">
            <h2>{{ $i('menuUpdate_columnsTitle') }}</h2>
            <small>{{ $i('menuUpdate_columnsHelp') }}</small>
          </div>

          <div v-for="source in analysis.sources" :key="'map-' + source.documentName" class="column-doc">
            <div class="column-doc-head">
              <strong>{{ source.documentName }}</strong>
              <label class="inline-field">
                {{ $i('menuUpdate_documentDefaultChannel') }}
                <select :value="defaultChannelFor(source.documentName)" @change="setDefaultChannel(source.documentName, $event.target.value)">
                  <option value="">{{ $i('menuUpdate_noDefaultChannel') }}</option>
                  <option value="Takeaway">{{ $i('menuUpdate_channelTakeaway') }}</option>
                  <option value="EatIn">{{ $i('menuUpdate_channelEatIn') }}</option>
                  <option value="Delivery">{{ $i('menuUpdate_channelDelivery') }}</option>
                </select>
              </label>
            </div>

            <div class="tablewrap">
              <table class="column-table">
                <thead>
                  <tr>
                    <th scope="col">
                      {{ $i('menuUpdate_columnLabel') }}
                    </th>
                    <th scope="col">
                      {{ $i('menuUpdate_columnKind') }}
                    </th>
                    <th scope="col">
                      {{ $i('menuUpdate_columnChannel') }}
                    </th>
                    <th scope="col">
                      {{ $i('menuUpdate_columnStatus') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="column in source.columns" :key="source.documentName + '::' + column.label">
                    <th scope="row">
                      {{ column.label }}
                    </th>
                    <td>
                      <select
                        :value="columnKind(source.documentName, column)"
                        :aria-label="$i('menuUpdate_columnKindFor', { label: column.label })"
                        @change="setColumnKind(source.documentName, column, $event.target.value)"
                      >
                        <option value="Size">
                          {{ $i('menuUpdate_kindSize') }}
                        </option>
                        <option value="Channel">
                          {{ $i('menuUpdate_kindChannel') }}
                        </option>
                        <option value="Ignore">
                          {{ $i('menuUpdate_kindIgnore') }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <select
                        :value="columnChannel(source.documentName, column)"
                        :disabled="columnKind(source.documentName, column) === 'Ignore'"
                        :aria-label="$i('menuUpdate_columnChannelFor', { label: column.label })"
                        @change="setColumnChannel(source.documentName, column, $event.target.value)"
                      >
                        <option value="">
                          {{ $i('menuUpdate_useDocumentDefault') }}
                        </option>
                        <option value="Takeaway">
                          {{ $i('menuUpdate_channelTakeaway') }}
                        </option>
                        <option value="EatIn">
                          {{ $i('menuUpdate_channelEatIn') }}
                        </option>
                        <option value="Delivery">
                          {{ $i('menuUpdate_channelDelivery') }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <span v-if="column.ignored" class="badge skip">{{ $i('menuUpdate_kindIgnore') }}</span>
                      <span v-else-if="column.unresolved" class="badge warn">{{ $i('menuUpdate_columnNeedsMeaning') }}</span>
                      <span v-else class="badge">{{ $i('menuUpdate_channel' + column.resolvedChannel) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="remapNotice" class="note">
            {{ remapNotice }}
          </div>

          <div class="actions">
            <button class="btn-primary" type="button" :disabled="!columnMappingChanged || isRemapping" @click="applyColumnMapping">
              {{ isRemapping ? $i('menuUpdate_remapping') : $i('menuUpdate_applyColumnMapping') }}
            </button>
            <small class="helper-text">{{ $i('menuUpdate_remapFree') }}</small>
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
            <button
              class="disclosure"
              type="button"
              :aria-expanded="rulesExpanded ? 'true' : 'false'"
              aria-controls="price-rules"
              @click="rulesExpanded = !rulesExpanded"
            >
              <span class="chevron">{{ rulesExpanded ? '▾' : '▸' }}</span>
              <h2>{{ $i('menuUpdate_rulesTitle') }}</h2>
            </button>
            <small>{{ rulesSummary }}</small>
          </div>

          <div v-show="rulesExpanded" id="price-rules">
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

            <div v-if="previewDiff" class="preview" role="region" :aria-label="$i('menuUpdate_previewTitle')">
              <div class="preview-head">
                <strong>{{ $i('menuUpdate_previewTitle') }}</strong>
                <small>
                  {{ $i('menuUpdate_previewCounts', {
                    products: previewDiff.productCount,
                    scope: previewDiff.scopeCount,
                    calculated: previewDiff.fromRule,
                    fromSource: previewDiff.fromSource,
                    manual: previewDiff.manual
                  }) }}
                </small>
              </div>

              <p v-if="!previewDiff.productCount" class="muted">
                {{ $i('menuUpdate_previewNoChanges') }}
              </p>

              <div v-else class="tablewrap">
                <table class="preview-table">
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
                    <tr v-for="row in previewDiff.shown" :key="'preview-' + row.rowKey">
                      <th scope="row">
                        {{ row.productName || row.rowKey }}
                      </th>
                      <td v-for="channel in channels" :key="channel" class="price">
                        <template v-if="row[channel] && row[channel].changed">
                          <del>{{ formatMoney(row[channel].currentAmount) }}</del>
                          <span class="newprice">{{ formatMoney(row[channel].newAmount) }}</span>
                          <small class="origin">{{ $i('menuUpdate_origin' + row[channel].origin) }}</small>
                        </template>
                        <span v-else class="muted">{{ formatMoney(row[channel] && row[channel].newAmount) }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <small v-if="previewDiff.hidden" class="muted">
                {{ $i('menuUpdate_previewMore', { count: previewDiff.hidden }) }}
              </small>
              <small class="helper-text">{{ $i('menuUpdate_previewNotAppliedYet') }}</small>
            </div>
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
                  <th v-if="ruleScope === 'CheckedRows'" scope="col" class="col-select">
                    <span class="sr-only">{{ $i('menuUpdate_select') }}</span>
                  </th>
                  <th scope="col" class="col-product">
                    {{ $i('menuUpdate_colProduct') }}
                  </th>
                  <th scope="col" class="col-suggestion">
                    {{ $i('menuUpdate_colSuggestion') }}
                  </th>
                  <th scope="col" class="col-price">
                    {{ $i('menuUpdate_channelTakeaway') }}
                  </th>
                  <th scope="col" class="col-price">
                    {{ $i('menuUpdate_channelEatIn') }}
                  </th>
                  <th scope="col" class="col-price">
                    {{ $i('menuUpdate_channelDelivery') }}
                  </th>
                  <th scope="col" class="col-action">
                    {{ $i('menuUpdate_colAction') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in shownRows" :key="row.rowKey" :class="{ 'row-warning': isRowUnresolved(row) }">
                  <td v-if="ruleScope === 'CheckedRows'" class="col-select">
                    <input
                      type="checkbox"
                      :checked="checkedKeys.includes(row.rowKey)"
                      :aria-label="$i('menuUpdate_selectRow', { name: rowPrimaryName(row) })"
                      @change="toggleChecked(row.rowKey)"
                    >
                  </td>
                  <td class="col-product">
                    <strong>
                      <span v-if="rowNumberPrefix(row)" class="num">{{ rowNumberPrefix(row) }}</span>
                      {{ rowPrimaryName(row) }}
                      <span v-if="row.sizeLabel" class="size">· {{ row.sizeLabel }}</span>
                    </strong>
                    <small v-if="rowSourceText(row)" class="clamp" :title="rowSourceText(row)">{{ rowSourceText(row) }}</small>
                    <small v-if="rowLinkText(row)">{{ rowLinkText(row) }}</small>
                    <button class="link-btn" type="button" @click="openDetail(row)">
                      {{ $i('menuUpdate_openDetail') }}
                    </button>
                  </td>
                  <td class="col-suggestion">
                    <span class="badge" :class="badgeClass(row)">{{ rowStateLabel(row) }}</span>
                    <small>{{ rowStateHint(row) }}</small>
                  </td>
                  <td v-for="channel in channels" :key="channel" class="col-price price">
                    <template v-if="resolvedFor(row)">
                      <span class="amounts">
                        <del v-if="showsOldPrice(row, channel)">{{ formatMoney(resolvedFor(row)[channel].currentAmount) }}</del>
                        <span class="newprice">{{ formatMoney(resolvedFor(row)[channel].newAmount) }}</span>
                      </span>
                      <small v-if="channelDelta(row, channel)" class="delta">{{ channelDelta(row, channel) }}</small>
                      <small class="origin clamp" :title="originLabel(resolvedFor(row)[channel])">{{ originLabel(resolvedFor(row)[channel]) }}</small>
                    </template>
                    <span v-else class="muted">…</span>
                  </td>
                  <td class="col-action">
                    <select
                      :value="row.action"
                      :aria-label="$i('menuUpdate_actionFor', { name: rowPrimaryName(row) })"
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
              <strong>{{ row.newProduct.name }}</strong>
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
            <p v-if="outcomeUnknown">
              {{ $i('menuUpdate_outcomeUnknown') }}
            </p>
            <div class="actions">
              <button v-if="lastOperationId" class="btn-secondary" type="button" :disabled="isCheckingStatus" @click="checkStatus">
                {{ isCheckingStatus ? $i('menuUpdate_checkingStatus') : $i('menuUpdate_checkStatus') }}
              </button>
              <button v-if="pendingApplyRequest" class="btn-secondary" type="button" :disabled="isApplying" @click="retryPendingApply">
                {{ $i('menuUpdate_retrySameOperation') }}
              </button>
            </div>
          </div>

          <div class="actions">
            <button class="btn-secondary" type="button" @click="step = 2">
              {{ $i('common_back') }}
            </button>
            <button class="btn-primary" type="button" :disabled="!canApply || isApplying || outcomeUnknown" @click="applyPlan">
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
              <select v-model="detailRow.targetProductId" @change="onTargetChanged(detailRow)">
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

            <label v-if="needsMatchConfirmation(detailRow)" class="checkbox-label confirm">
              <input
                type="checkbox"
                :checked="detailRow.matchConfirmed"
                @change="setMatchConfirmed(detailRow, $event.target.checked)"
              >
              {{ detailRow.matchConfirmed ? $i('menuUpdate_matchConfirmed') : $i('menuUpdate_confirmMatch') }}
            </label>

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
  carryDecisions,
  clearRuleState,
  counts,
  defaultRules,
  isUnresolved,
  money,
  newProductName,
  percent,
  resolvedByKey,
  ruleImpact,
  scopeRows,
  setManualPrice,
  snapshot,
  toValidateRequest,
  visibleRows,
  withScopeApplied
} from '~/utils/menu-update'

const DEFAULT_RULES = defaultRules

// Codes whose message is written by the reading rather than by us. Their text is already in the
// operator's language and says something specific, so it is never swapped for a fixed string.
const DYNAMIC_ISSUE_CODES = ['documentNotice']

// How many changed products the preview lists before summarising the rest.
const PREVIEW_ROW_LIMIT = 8

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
      isCheckingStatus: false,
      applyError: '',
      receipt: null,
      lastOperationId: '',
      // Set when an apply ended with an unknown result. Until the operation's status is known
      // the plan is frozen: re-validating would mint a new operation, and applying that could
      // create a second copy of something the first call may already have written.
      outcomeUnknown: false,

      rulesExpanded: false,
      columnMappings: {},
      isRemapping: false,
      remapNotice: '',
      // The exact signed request of an apply whose result never came back. Retrying uses this
      // and nothing else, so a retry can only ever repeat that one operation.
      pendingApplyRequest: null,

      filter: 'all',
      query: '',
      detailRow: null,
      candidateQuery: '',

      channels: CHANNELS,
      filterKeys: ['all', 'updated', 'new', 'review', 'unchanged', 'notInSource'],
      // Matches MenuUpdateAnalysisService and the extraction client, so a file can never pass
      // here and then be refused by the reader.
      limits: { maxFiles: 8, maxFileMb: 14, maxTotalMb: 56 },

      // Bumped on every store change so a response from the previous store is discarded
      // instead of quietly repopulating the screen.
      requestGeneration: 0,
      // Bumped on every edit. A validate reply for an older revision is dropped: without this a
      // slow earlier reply could land last and overwrite the current plan and its canApply.
      planRevision: 0,
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
      return !this.isAnalyzing &&
        this.selectedStore > 0 &&
        !this.uploadTooLarge &&
        (this.files.length > 0 || !!this.pastedText.trim())
    },
    /** True when the chosen files break a limit, which also disables analysing. */
    uploadTooLarge () {
      const total = this.files.reduce((sum, f) => sum + f.size, 0)
      return this.files.length > this.limits.maxFiles ||
        this.files.some(f => f.size > this.limits.maxFileMb * 1024 * 1024) ||
        total > this.limits.maxTotalMb * 1024 * 1024
    },
    columnMappingChanged () {
      return Object.keys(this.columnMappings).some((doc) => {
        const mapping = this.columnMappings[doc]
        return !!mapping.defaultChannel || Object.keys(mapping.columns).length > 0
      })
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
    canApply () {
      // Frozen while an apply's result is unknown: the only safe moves then are asking for the
      // status or repeating that same operation.
      return !!(this.validation && this.validation.canApply) && !this.isApplying && !this.outcomeUnknown
    },
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
    /**
     * What the previewed rule would actually do, read off the plan the server returned for it.
     *
     * This comes from the preview snapshot rather than the current draft on purpose: the point
     * of a preview is to show the candidate prices before anything is committed, and the draft
     * has not changed yet. The counts follow the scope that was previewed, for the same reason.
     */
    previewDiff () {
      if (!this.rulePreview) { return null }

      const scoped = new Set(this.rulePreview.scopedKeys)
      const rows = ((this.rulePreview.validation && this.rulePreview.validation.rows) || [])
        .filter(row => scoped.has(row.rowKey))

      const counts = { fromRule: 0, fromSource: 0, manual: 0 }
      const changed = []

      rows.forEach((row) => {
        let touched = false
        this.channels.forEach((channel) => {
          const field = row[channel]
          if (!field || !field.changed) { return }
          touched = true
          if (field.origin === 'Rule') { counts.fromRule++ }
          if (field.origin === 'Source') { counts.fromSource++ }
          if (field.origin === 'Manual') { counts.manual++ }
        })
        if (touched) { changed.push(row) }
      })

      return {
        rows: changed,
        shown: changed.slice(0, PREVIEW_ROW_LIMIT),
        hidden: Math.max(0, changed.length - PREVIEW_ROW_LIMIT),
        productCount: changed.length,
        scopeCount: rows.length,
        ...counts
      }
    },
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
      ;((this.analysis && this.analysis.warnings) || []).forEach((w, i) => {
        warnings.push({ key: 'a' + i, message: this.issueText(w) })
      })
      ;((this.analysis && this.analysis.sources) || []).forEach((source) => {
        (source.warnings || []).forEach((w, i) => {
          warnings.push({ key: source.documentName + i, message: source.documentName + ': ' + this.issueText(w) })
        })
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
      const tooLarge = this.$i('menuUpdate_tooLarge', {
        files: this.limits.maxFiles,
        perFile: this.limits.maxFileMb,
        total: this.limits.maxTotalMb
      })

      if (this.uploadTooLarge) {
        this.analysisError = tooLarge
      } else if (this.analysisError === tooLarge) {
        this.analysisError = ''
      }
    },
    // ------------------------------------------------------------ column mapping
    /**
     * What the operator has decided about each price column, keyed by document.
     *
     * The reading proposes, this decides. On the real takeaway menu the reading returns "Medium"
     * and "Stor" as sizes with no channel at all and an "Extra" column it cannot classify, so
     * without this none of that document's prices could be used.
     */
    mappingFor (documentName) {
      if (!this.columnMappings[documentName]) {
        this.$set(this.columnMappings, documentName, { defaultChannel: '', columns: {} })
      }
      return this.columnMappings[documentName]
    },
    defaultChannelFor (documentName) {
      return (this.columnMappings[documentName] || {}).defaultChannel || ''
    },
    setDefaultChannel (documentName, value) {
      this.$set(this.mappingFor(documentName), 'defaultChannel', value)
    },
    columnEntry (documentName, column) {
      const mapping = this.columnMappings[documentName]
      return (mapping && mapping.columns[column.label]) || null
    },
    columnKind (documentName, column) {
      const entry = this.columnEntry(documentName, column)
      if (entry) { return entry.kind }
      if (column.ignored) { return 'Ignore' }
      return column.resolvedKind === 'Size' ? 'Size' : 'Channel'
    },
    columnChannel (documentName, column) {
      const entry = this.columnEntry(documentName, column)
      if (entry) { return entry.channel || '' }
      return column.resolvedChannel || ''
    },
    setColumnKind (documentName, column, kind) {
      const mapping = this.mappingFor(documentName)
      const entry = mapping.columns[column.label] || { kind, channel: this.columnChannel(documentName, column) }
      entry.kind = kind
      this.$set(mapping.columns, column.label, entry)
    },
    setColumnChannel (documentName, column, channel) {
      const mapping = this.mappingFor(documentName)
      const entry = mapping.columns[column.label] || { kind: this.columnKind(documentName, column), channel }
      entry.channel = channel
      this.$set(mapping.columns, column.label, entry)
    },
    sourceMappings () {
      return Object.keys(this.columnMappings).map((documentName) => {
        const mapping = this.columnMappings[documentName]
        return {
          documentName,
          defaultChannel: mapping.defaultChannel || null,
          columns: Object.keys(mapping.columns).map((label) => {
            const entry = mapping.columns[label]
            return {
              label,
              kind: entry.kind === 'Ignore' ? 'Unknown' : entry.kind,
              channel: entry.channel || null,
              ignore: entry.kind === 'Ignore'
            }
          })
        }
      }).filter(m => m.defaultChannel || m.columns.length)
    },
    /**
     * Re-merges the documents that were already read against the corrected mapping. This calls
     * no AI provider, so fixing a column costs nothing and never forces a re-upload.
     */
    async applyColumnMapping () {
      if (!this.analysis || this.isRemapping) { return }

      const generation = this.requestGeneration
      this.isRemapping = true
      this.analysisError = ''
      this.remapNotice = ''

      // The plan in hand was built on the old column meanings, so it stops being applicable the
      // moment a remap starts. Dropping it here closes the window where Apply could still fire.
      this.validation = null
      this.rulePreview = null
      this.planRevision++

      try {
        const remapped = await this._menuUpdateService.Remap(this.selectedStore, {
          documents: this.analysis.documents,
          sourceMappings: this.sourceMappings(),
          // Returned exactly as issued, so the coverage the server established survives.
          sourceMetadata: this.analysis.sourceMetadata,
          sourceMetadataToken: this.analysis.sourceMetadataToken
        })

        if (generation !== this.requestGeneration) { return }

        this.adoptAnalysis(remapped, { preserveDecisions: true })
        await this.validate()
      } catch (error) {
        if (generation !== this.requestGeneration || error.cancelled) { return }
        this.analysisError = error.message || this.$i('menuUpdate_remapFailed')
      } finally {
        if (generation === this.requestGeneration) { this.isRemapping = false }
      }
    },
    /**
     * Takes a fresh analysis, keeping the decisions the operator has already made where the new
     * reading still has the same row. Anything that can no longer be carried is named, not
     * silently dropped.
     */
    adoptAnalysis (analysis, { preserveDecisions = false } = {}) {
      const previous = preserveDecisions ? this.rows : []
      const fresh = buildDraft(analysis)
      const merged = preserveDecisions ? carryDecisions(previous, fresh) : { rows: fresh, carried: 0, dropped: [] }

      this.analysis = analysis
      this.rows = merged.rows
      this.initialRows = snapshot(this.rows)
      this.prepareNewProducts()
      this.checkedKeys = []
      this.undoSnapshot = null
      this.rulePreview = null
      this.planRevision++

      if (merged.dropped.length) {
        this.remapNotice = this.$i('menuUpdate_remapDroppedDecisions', {
          kept: merged.carried,
          lost: merged.dropped.length,
          names: merged.dropped.slice(0, 5).join(', ')
        })
      } else if (merged.carried) {
        this.remapNotice = this.$i('menuUpdate_remapKeptDecisions', { kept: merged.carried })
      }
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
            // The columns are mapped after the reading, against the labels it actually returns,
            // rather than guessed from the file name beforehand.
            sourceMappings: []
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

        this.adoptAnalysis(analysis)
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
      // and a fresh validation is requested for this revision of the plan.
      this.validation = null
      this.rulePreview = null
      this.planRevision++
      if (this.validateTimer) { clearTimeout(this.validateTimer) }
      this.validateTimer = setTimeout(() => this.validate(), 250)
    },
    /**
     * Asks the server to recompute the plan.
     *
     * `rows` and `rules` let a preview be checked without touching the live draft. The result is
     * only stored when it still belongs to the current store and the current revision, so a slow
     * earlier reply can never overwrite a newer answer or its canApply.
     */
    async validate ({ rules, rows, store } = {}) {
      const useRows = rows || this.rows
      if (!useRows.length || this.selectedStore <= 0) { return null }
      if (this.outcomeUnknown) { return null }

      const generation = this.requestGeneration
      const revision = this.planRevision
      this.isValidating = true
      this.validationError = ''

      try {
        const result = await this._menuUpdateService.Validate(
          toValidateRequest(this.selectedStore, rules || this.activeRules, useRows))

        if (generation !== this.requestGeneration || revision !== this.planRevision) { return null }
        if (store !== false) { this.validation = result }
        return result
      } catch (error) {
        if (generation !== this.requestGeneration || revision !== this.planRevision || error.cancelled) {
          return null
        }
        this.validationError = error.message || this.$i('menuUpdate_validationFailed')
        return null
      } finally {
        if (generation === this.requestGeneration && revision === this.planRevision) {
          this.isValidating = false
        }
      }
    },

    // ------------------------------------------------------------ bulk rules
    /**
     * Checks a candidate rule without touching the draft.
     *
     * The scope is applied to a copy, so abandoning a preview cannot leave rows permanently
     * excluded from rules, and the live validation is left alone until the rule is committed.
     */
    async previewRules () {
      const scopedKeys = this.currentScopeRows.map(r => r.rowKey)
      const candidateRows = withScopeApplied(this.rows, scopedKeys)
      const candidateRules = { ...this.draftRules }

      const result = await this.validate({ rules: candidateRules, rows: candidateRows, store: false })
      if (!result) { return }

      this.rulePreview = {
        validation: result,
        rules: candidateRules,
        rows: candidateRows,
        scopedKeys
      }
    },
    /** Commits exactly the rule and scope that were previewed. */
    commitRulePreview () {
      if (!this.rulePreview) { return }

      // Captured before anything changes, so undo restores the draft the operator actually had.
      this.undoSnapshot = {
        rows: snapshot(this.rows),
        activeRules: { ...this.activeRules },
        draftRules: { ...this.draftRules }
      }

      this.rows = this.rulePreview.rows.map(row => ({ ...row }))
      this.activeRules = { ...this.rulePreview.rules }
      this.draftRules = { ...this.rulePreview.rules }
      this.rulePreview = null
      this.onPlanChanged()
    },
    undoBulk () {
      if (!this.undoSnapshot) { return }
      this.rows = this.undoSnapshot.rows
      this.activeRules = { ...this.undoSnapshot.activeRules }
      this.draftRules = { ...this.undoSnapshot.draftRules }
      this.undoSnapshot = null
      this.onPlanChanged()
    },
    /**
     * Clears the price rules and nothing else. Manual prices, chosen actions, catalogue links,
     * accepted warnings and new product setup are the operator's own work, not rule output, so
     * they survive. No document is read again.
     */
    resetRules () {
      this.rows = clearRuleState(this.rows)
      this.activeRules = DEFAULT_RULES()
      this.draftRules = DEFAULT_RULES()
      this.rulePreview = null
      this.undoSnapshot = null
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
        // The number and the size both stay in the name, because that is where the next import
        // reads them back from. Two sizes of one dish must not become two products called the
        // same thing.
        name: newProductName(row),
        // What the document said about it. Dropping these would create a product with no
        // description and no allergens even though both were read off the menu.
        description: row.description || '',
        otherInformation: row.otherInformation || '',
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
    /** True when the reading was not sure this row belongs to the product it picked. */
    needsMatchConfirmation (row) {
      return row.action === ACTION.update &&
        (row.sourceIssues || []).some(code => code === 'matchNotConfirmed')
    },
    setMatchConfirmed (row, confirmed) {
      row.matchConfirmed = confirmed
      this.onPlanChanged()
    },
    /** Choosing a different product is itself a confirmation of which product it is. */
    onTargetChanged (row) {
      if (this.needsMatchConfirmation(row)) { row.matchConfirmed = true }
      this.onPlanChanged()
    },
    setManual (row, channel, value) {
      const trimmed = String(value == null ? '' : value).trim()
      setManualPrice(row, channel, trimmed === '' ? null : Math.round(Number(trimmed) * 100))
      this.onPlanChanged()
    },

    // ------------------------------------------------------------ apply
    async applyPlan () {
      if (!this.canApply || this.outcomeUnknown) { return }

      this.isApplying = true
      this.applyError = ''
      const generation = this.requestGeneration
      const operationId = this.validation.operationId

      try {
        // Exactly the plan the server normalised and signed, sent back untouched. Rebuilding it
        // here would drop the ids the server generated for new products.
        const request = {
          operationId,
          planToken: this.validation.planToken,
          expiresAt: this.validation.expiresAt,
          catalogueHash: this.validation.catalogueHash,
          plan: this.validation.normalizedPlan
        }
        this.lastOperationId = operationId
        this.pendingApplyRequest = request

        const receipt = await this._menuUpdateService.Apply(request)
        if (generation !== this.requestGeneration) { return }
        this.receipt = receipt
        this.pendingApplyRequest = null
      } catch (error) {
        if (generation !== this.requestGeneration || error.cancelled) { return }
        this.applyError = error.message || this.$i('menuUpdate_applyFailed')

        if (error.status === 400) {
          // The server answered and refused, so nothing was written. Re-checking is safe.
          await this.validate()
        } else {
          // No answer, so whether the operation committed is unknown. The plan is frozen until
          // the status says: validating again would mint a new operation, and applying that
          // could create a second copy of something already written.
          this.outcomeUnknown = true
        }
      } finally {
        if (generation === this.requestGeneration) { this.isApplying = false }
      }
    },
    /**
     * Asks whether the operation committed.
     *
     * A "not applied" answer is not a verdict. The status endpoint reads the ledger, and the
     * ledger row is only written when the transaction commits, so an apply that is still in
     * flight looks exactly like one that never happened. Treating that as failure and building a
     * new plan would mint a second operation, and applying it could create a duplicate of
     * something the first call was about to write. So the plan stays frozen either way, and the
     * only ways forward are to ask again or to repeat the very same operation.
     */
    async checkStatus () {
      if (!this.lastOperationId || this.isCheckingStatus) { return }

      const generation = this.requestGeneration
      const operationId = this.lastOperationId
      this.isCheckingStatus = true

      try {
        const status = await this._menuUpdateService.GetStatus(this.selectedStore, operationId)
        if (generation !== this.requestGeneration || operationId !== this.lastOperationId) { return }

        if (status.applied) {
          this.receipt = status.receipt
          this.applyError = ''
          this.outcomeUnknown = false
          this.pendingApplyRequest = null
        } else {
          this.applyError = this.$i('menuUpdate_statusNotApplied')
        }
      } catch (error) {
        if (generation !== this.requestGeneration) { return }
        this.applyError = error.message || this.$i('menuUpdate_statusFailed')
      } finally {
        if (generation === this.requestGeneration) { this.isCheckingStatus = false }
      }
    },
    /**
     * Sends the very same signed request again. The server keys the operation in its ledger, so
     * repeating it either commits the one operation or replays the receipt it already wrote. It
     * can never produce a second set of products.
     */
    async retryPendingApply () {
      if (!this.pendingApplyRequest || this.isApplying) { return }

      const generation = this.requestGeneration
      this.isApplying = true
      this.applyError = ''

      try {
        const receipt = await this._menuUpdateService.Apply(this.pendingApplyRequest)
        if (generation !== this.requestGeneration) { return }
        this.receipt = receipt
        this.outcomeUnknown = false
        this.pendingApplyRequest = null
      } catch (error) {
        if (generation !== this.requestGeneration || error.cancelled) { return }
        this.applyError = error.message || this.$i('menuUpdate_applyFailed')

        // The frozen state survives every failure here, including a refusal. A refusal of the
        // retry says this attempt was rejected, not that the original one was: the first call may
        // still be in flight and about to commit, while the retry loses a race or finds the plan
        // expired. Only a receipt proves the outcome, so the operation stays pending and the
        // operator can ask for the status or repeat it again.
      } finally {
        if (generation === this.requestGeneration) { this.isApplying = false }
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
      // Everything, including the in-flight flags and the operation whose result was unknown.
      // Leaving any of it behind is how a stale status lookup or a frozen plan would survive
      // into work that has nothing to do with it.
      this.step = 1
      this.files = []
      this.pastedText = ''
      this.analysis = null
      this.rows = []
      this.initialRows = []
      this.columnMappings = {}
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
      this.lastOperationId = ''
      this.outcomeUnknown = false
      this.pendingApplyRequest = null
      this.remapNotice = ''
      this.isApplying = false
      this.isCheckingStatus = false
      this.isAnalyzing = false
      this.isRemapping = false
      this.isValidating = false
      this.uploadPercent = 0
      this.rulesExpanded = false
      this.planRevision++
      if (this.validateTimer) { clearTimeout(this.validateTimer); this.validateTimer = null }
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
    /**
     * What the row is called in the table.
     *
     * A matched update is about a catalogue product, so it leads with that product's name. The
     * menus this was built for print a number and an ingredient list and no dish name at all, so
     * leading with the document's own wording filled the column with a paragraph and made the
     * table impossible to scan.
     */
    rowPrimaryName (row) {
      const resolved = this.resolvedFor(row)
      if (row.action !== ACTION.create && row.targetProductId && resolved && resolved.productName) {
        return resolved.productName
      }
      return row.displayName
    },
    /**
     * The menu number shown in front of the name, when it adds anything.
     *
     * A catalogue product usually carries its own number in its name, so once a matched row
     * leads with that name, prefixing it again reads as "1. 1. Jungel sterk salami". The name's
     * own number wins; the menu number is still searchable and still shown in the details.
     */
    rowNumberPrefix (row) {
      if (!row.menuNumber) { return '' }
      return /^\s*\d/.test(this.rowPrimaryName(row) || '') ? '' : row.menuNumber + '.'
    },
    /** The menu's own line, shown clamped under the name. The detail panel has all of it. */
    rowSourceText (row) {
      const primary = this.rowPrimaryName(row)
      return row.displayName && row.displayName !== primary ? row.displayName : ''
    },
    rowLinkText (row) {
      if (row.action === ACTION.create) { return this.$i('menuUpdate_willCreate') }
      // A linked row already leads with the catalogue name, so saying it again adds nothing.
      if (!row.targetProductId) { return this.$i('menuUpdate_noLink') }
      return ''
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
    /**
     * The text shown for one issue.
     *
     * Most codes mean a fixed thing and read better in the page's own language. A few carry the
     * reading's own words, and those words are the whole content: the note that product 19 is
     * printed as 223 / 325 is the useful part, and replacing it with a generic heading turned
     * three different warnings into three identical lines. For those the heading introduces the
     * message rather than replacing it.
     */
    issueText (issue) {
      const key = 'menuUpdate_issue_' + issue.code
      const translated = this.$i(key)
      const heading = translated === key ? '' : translated
      const message = (issue.message || '').trim()

      if (DYNAMIC_ISSUE_CODES.includes(issue.code) && message) {
        return heading ? heading + ' ' + message : message
      }

      return heading || message
    },
    blockerText (blocker) {
      const row = this.rows.find(r => r.rowKey === blocker.rowKey)
      const name = row ? row.displayName : ''
      return (name ? name + ': ' : '') + this.issueText(blocker)
    },
    sourceRowCount (source) {
      return (source.pages || []).reduce((sum, page) => sum + page.rowCount, 0)
    },
    /**
     * How much of a document was read.
     *
     * Only a page count taken from the file itself is stated as fact. When the server could not
     * establish one, the count is reported as unchecked rather than quietly showing the number
     * the reading claimed for itself.
     */
    sourcePageSummary (source) {
      const rows = this.sourceRowCount(source)

      if (source.coverageVerified) {
        return this.$i('menuUpdate_sourcePagesVerified', { pages: source.detectedPageCount, rows })
      }

      if (source.detectedPageCount) {
        return this.$i('menuUpdate_sourcePagesIncomplete', {
          returned: source.pagesReturned,
          pages: source.detectedPageCount,
          rows
        })
      }

      return this.$i('menuUpdate_sourcePagesUnverified', { returned: source.pagesReturned, rows })
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
  max-width: 100%;
  min-width: 0;
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

.column-doc {
  max-width: 100%;
  min-width: 0;
  padding: 16px;
  margin-bottom: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.column-doc-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.column-table {
  min-width: 460px;
  background: #fff;
  border-radius: 6px;

  th[scope="row"] {
    background: transparent;
    text-transform: none;
    letter-spacing: 0;
    color: #292c34;
    font-weight: 600;
  }

  select { max-width: 160px; }
}

.columns-panel {
  max-width: 100%;
  min-width: 0;
}

.preview {
  max-width: 100%;
  min-width: 0;
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8f9fa;

  .helper-text { display: block; margin-top: 8px; }
}

.preview-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;

  small { color: #64748b; }
}

.preview-table {
  min-width: 420px;
  background: #fff;
  border-radius: 6px;

  th[scope="row"] {
    background: transparent;
    text-transform: none;
    letter-spacing: 0;
    color: #292c34;
    font-weight: 600;
  }

  .origin { font-style: italic; }
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

.review {
  padding: 0;

  // Fixed layout makes the widths above authoritative. Otherwise the longest cell wins, which
  // is how an ingredient paragraph came to own the product column and the price provenance came
  // to own everything else.
  table {
    table-layout: fixed;
    min-width: 900px;
  }
}

// Two lines and then an ellipsis, with the full text on hover and in the details.
.clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

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

.tablewrap {
  overflow-x: auto;
  max-width: 100%;
  // A flex or grid child defaults to min-width:auto, which lets a wide table push the whole
  // page sideways instead of scrolling within its own panel.
  min-width: 0;
  -webkit-overflow-scrolling: touch;
}

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
    // Ingredient lists and file names have no natural break points, so without this a single
    // long token would widen its column and push the actions past the edge.
    overflow-wrap: anywhere;
  }

  // Columns are sized explicitly rather than by position. The old rule keyed off the second
  // cell, which is the product only while the checkbox column is present; without it the width
  // landed on Suggestion and squeezed the product to a sliver.
  .col-select { width: 3%; }
  .col-product { width: 26%; }
  .col-suggestion { width: 11%; }
  .col-price { width: 15%; }
  .col-action { width: 14%; }

  .col-action select {
    width: 100%;
    max-width: none;
  }
  td strong { display: block; font-size: 1.05em; }
  td small { display: block; margin-top: 3px; font-size: 0.9em; color: #64748b; }
}

.row-warning { background: #fffcf5; }
.num { color: #8a958b; margin-right: 5px; }
.size { color: #64748b; font-weight: 400; }

.price {
  font-variant-numeric: tabular-nums;

  // Only the amounts stay on one line. The provenance underneath names a document, a page and a
  // column, and keeping that unbreakable is what pushed the action column off the screen.
  .amounts { white-space: nowrap; }

  del { color: #94a3b8; margin-right: 6px; }
  .newprice { color: #1bb776; font-weight: 600; }

  .origin {
    font-style: italic;
    white-space: normal;
  }

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
