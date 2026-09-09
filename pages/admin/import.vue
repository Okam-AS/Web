<template>
  <AdminPage @login-success="handleLoginSuccess">
    <div class="menu-import-page">
      <div class="page-header">
        <h1>{{ $i('menuImport_pageTitle') }}</h1>
        <p>{{ $i('menuImport_pageSubtitle') }}</p>
      </div>

      <div v-if="selectedStore <= 0" class="empty-state">
        <h3>{{ $i('menuImport_selectStoreTitle') }}</h3>
        <p>{{ $i('menuImport_selectStoreBody') }}</p>
      </div>

      <template v-else-if="receipt">
        <section class="panel receipt">
          <span class="badge">{{ $i('menuImport_receiptBadge') }}</span>
          <h3>
            {{ $i('menuImport_receiptTitle', {
              updated: receiptUpdatedIds.length,
              created: receiptCreatedIds.length
            }) }}
          </h3>
          <p v-if="receipt.replayed" class="muted">
            {{ $i('menuImport_receiptReplayed') }}
          </p>
          <p v-if="receiptMetadataIds.length" class="muted">
            {{ $i('menuImport_receiptMetadata', { count: receiptMetadataIds.length }) }}
          </p>
          <p v-if="receiptCreatedCategories.length" class="muted">
            {{ $i('menuImport_receiptCategories', { count: receiptCreatedCategories.length }) }}
          </p>
          <p v-if="receiptRemovedIds.length" class="muted danger-text">
            {{ $i('menuImport_receiptRemoved', { count: receiptRemovedIds.length }) }}
          </p>

          <table v-if="receiptPrices.length" class="channel-summary">
            <thead>
              <tr>
                <th scope="col">
                  {{ $i('menuImport_colProduct') }}
                </th>
                <th v-for="channel in channels" :key="channel" scope="col">
                  {{ $i('menuImport_channel' + channelKey(channel)) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="price in receiptPrices" :key="price.productId">
                <th scope="row">
                  {{ price.productName }}
                  <small>{{ price.created ? $i('menuImport_created') : price.productId }}</small>
                </th>
                <td v-for="channel in channels" :key="channel">
                  {{ receiptPrice(price, channelKey(channel)) }}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="actions">
            <button class="btn-primary" type="button" @click="startOver">
              {{ $i('menuImport_startOver') }}
            </button>
          </div>
        </section>
      </template>

      <template v-else>
        <!-- A draft the old import page left behind. Offered, never taken: those keys record no
             store, so where it lands is the operator's to say. -->
        <div v-if="legacyDraft" class="notice-box legacy-offer" role="status">
          <div>
            <strong>{{ $i('menuImport_legacyDraftFound') }}</strong>
            <p>{{ $i('menuImport_legacyDraftBody', { rows: legacyDraft.rows.length, groups: legacyDraft.categoryVariants.length }) }}</p>
          </div>
          <div class="legacy-actions">
            <button class="link-btn" type="button" @click="dismissLegacyDraft">
              {{ $i('menuImport_legacyDraftDismiss') }}
            </button>
            <button class="btn-secondary" type="button" :disabled="isLocked" @click="offerLegacyDraft">
              {{ $i('menuImport_legacyDraftOpen') }}
            </button>
          </div>
        </div>

        <!-- ------------------------------------------------------------ source bar -->
        <div class="sourcebar">
          <div class="source-left">
            <span class="file-icon">{{ files.length ? 'PDF' : $i('menuImport_sourceIconDraft') }}</span>
            <div>
              <strong>{{ sourceHeadline }}</strong>
              <small>{{ sourceDetail }}</small>
            </div>
          </div>
          <button class="link-btn" type="button" :disabled="isLocked" @click="showSource = true">
            {{ $i('menuImport_changeSource') }}
          </button>
        </div>

        <div v-if="isAnalyzing" class="progress panel">
          <!-- Sending the files is measured, so it gets a bar and a percentage. -->
          <template v-if="analysisPhase === 'uploading'">
            <div
              class="progress-bar"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="uploadPercent"
            >
              <div :style="{ width: uploadPercent + '%' }" />
            </div>
            <small role="status">{{ $i('menuImport_uploading', { percent: uploadPercent }) }}</small>
          </template>

          <!-- Reading is not measured by anything, so nothing here may look measured. -->
          <template v-else>
            <div class="reading">
              <span class="reading-spinner" aria-hidden="true" />
              <div>
                <strong role="status">{{ $i('menuImport_readingWithAi') }}</strong>
                <small aria-live="off">{{ $i('menuImport_readingElapsed', { seconds: analysisElapsedSeconds }) }}</small>
                <small v-if="analysisIsTakingLong" class="long-wait" role="status">
                  {{ $i('menuImport_readingTakingLonger') }}
                </small>
              </div>
            </div>
          </template>
        </div>

        <div v-if="analysisError" class="error-box" role="alert">
          {{ analysisError }}
          <button class="link-btn" type="button" @click="showSource = true">
            {{ $i('menuImport_tryAgain') }}
          </button>
        </div>

        <div v-if="remapNotice" class="notice-box" role="status">
          {{ remapNotice }}
        </div>

        <!-- ------------------------------------------------------------ workspace -->
        <section class="panel workspace">
          <div class="toolbar">
            <div>
              <h2>{{ $i('menuImport_workspaceTitle') }}</h2>
              <small>{{ rowSummary }}</small>
            </div>
            <div class="toolbar-actions">
              <MenuColumnPicker
                :visible="visibleColumns"
                :counts="columnCounts"
                @toggle="onColumnToggle"
                @preset="onColumnPreset"
              />
              <button class="btn-secondary" type="button" :disabled="isLocked" @click="addManualRow">
                {{ $i('menuImport_newRow') }}
              </button>
              <div class="more">
                <button
                  ref="moreTrigger"
                  class="btn-secondary"
                  type="button"
                  :aria-expanded="String(showMore)"
                  aria-haspopup="true"
                  :aria-label="$i('menuImport_moreTools')"
                  :disabled="isLocked"
                  @click="showMore = !showMore"
                >
                  ⋯
                </button>
                <ul v-if="showMore" class="more-menu" role="menu" @keydown.esc="closeMore">
                  <li role="none">
                    <button role="menuitem" type="button" @click="openTool('source')">
                      {{ $i('menuImport_toolAddSource') }}
                    </button>
                  </li>
                  <li role="none">
                    <button role="menuitem" type="button" @click="openTool('categoryVariants')">
                      {{ $i('menuImport_toolCategoryVariants') }}
                    </button>
                  </li>
                  <li class="separator" role="separator" />
                  <li role="none">
                    <button role="menuitem" type="button" @click="openTool('draft')">
                      {{ $i('menuImport_toolDraft') }}
                    </button>
                  </li>
                  <li role="none">
                    <button role="menuitem" type="button" @click="openTool('clear')">
                      {{ $i('menuImport_toolClear') }}
                    </button>
                  </li>
                  <li class="separator" role="separator" />
                  <li role="none">
                    <button class="danger-text" role="menuitem" type="button" @click="openTool('replace')">
                      {{ $i('menuImport_toolReplaceCatalogue') }}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <fieldset :disabled="isLocked" class="table-fieldset">
            <div class="tablewrap">
              <table class="workspace-table">
                <thead>
                  <tr>
                    <th
                      v-for="column in shownColumns"
                      :key="column.id"
                      scope="col"
                      :class="['col-' + column.id, { sticky: column.id === 'identity', wide: column.wide }]"
                    >
                      {{ $i(column.labelKey) }}
                    </th>
                    <th scope="col" class="col-tools">
                      <span class="sr-only">{{ $i('menuImport_rowActions') }}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in rows" :key="row.rowKey" :class="{ 'omitted-row': row.action === 'Skip' }">
                    <td
                      v-for="column in shownColumns"
                      :key="column.id"
                      :data-label="$i(column.labelKey)"
                      :class="['col-' + column.id, 'kind-' + column.kind, { sticky: column.id === 'identity' }]"
                    >
                      <!-- identity ------------------------------------------------ -->
                      <template v-if="column.id === 'identity'">
                        <strong>
                          <span v-if="row.menuNumber">{{ row.menuNumber }}.</span>
                          {{ row.displayName || $i('menuImport_untitledRow') }}
                          <span v-if="row.sizeLabel" class="size">{{ row.sizeLabel }}</span>
                        </strong>
                        <span v-if="row.description" class="clamp" :title="row.description">{{ row.description }}</span>
                        <small v-for="(issue, index) in rowIssues(row)" :key="index" class="inline-issue">{{ issueText(issue) }}</small>
                      </template>

                      <!-- link --------------------------------------------------- -->
                      <template v-else-if="column.id === 'link'">
                        <template v-if="row.action !== 'Skip'">
                          <MenuProductSearch
                            :value="row.targetProductId"
                            :options="productOptions(row)"
                            :create-label="$i('menuImport_createSeparate')"
                            :placeholder="$i('menuImport_findProduct')"
                            :aria-label="$i('menuImport_linkFor', { name: row.displayName })"
                            :disabled="isLocked"
                            @input="linkProduct(row, $event)"
                          />
                          <small class="row-intent" :class="{ 'new-intent': row.action === 'Create' }">
                            {{ $i(row.action === 'Create' ? 'menuImport_willCreate' : 'menuImport_willUpdate') }}
                          </small>
                          <!-- Only meaningful for a product that already exists. On a row that
                               creates one, every field is part of creating it, so saying its
                               details "also change" would mark every new row for nothing. -->
                          <small v-if="row.action === 'Update' && hasMetadataPatch(row)" class="row-intent modified">
                            {{ $i('menuImport_alsoChangesDetails') }}
                          </small>
                        </template>
                        <button v-else type="button" class="link-btn" @click="restoreRow(row)">
                          {{ $i('menuImport_restoreRow') }}
                        </button>
                      </template>

                      <!-- prices ------------------------------------------------- -->
                      <template v-else-if="column.kind === 'price'">
                        <template v-if="row.action !== 'Skip'">
                          <del v-if="showsOldPrice(row, column.channel)">{{ formatMoney(resolvedFor(row)[column.channel].currentAmount) }}</del>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            :value="priceValue(row, column.channel)"
                            :aria-label="$i('menuImport_priceFor', { channel: $i(column.labelKey), name: row.displayName })"
                            :placeholder="isValidating ? '…' : '—'"
                            @change="setManual(row, column.channel, $event.target.value)"
                          >
                          <small v-if="channelDelta(row, column.channel)" class="delta">{{ channelDelta(row, column.channel) }}</small>
                        </template>
                      </template>

                      <!-- category ----------------------------------------------- -->
                      <template v-else-if="column.kind === 'category'">
                        <MenuProductSearch
                          v-if="row.action !== 'Skip'"
                          :value="metadataValue(row, 'categoryId')"
                          :options="categoryOptions"
                          :allow-create="false"
                          :placeholder="pendingCategoryFor(row) || $i('menuImport_findCategory')"
                          :aria-label="$i('menuImport_categoryFor', { name: row.displayName })"
                          :disabled="isLocked"
                          @input="editMetadata(row, 'categoryId', $event)"
                        />
                      </template>

                      <!-- free text ---------------------------------------------- -->
                      <template v-else-if="column.kind === 'text'">
                        <!-- A menu description is a paragraph, so it gets a box that shows one
                             and can be dragged taller, the way the old import table did. -->
                        <textarea
                          v-if="row.action !== 'Skip' && column.wide"
                          rows="2"
                          :value="metadataValue(row, column.field)"
                          :class="{ edited: isEdited(row, column.field) }"
                          :aria-label="$i(column.labelKey) + ' — ' + row.displayName"
                          @change="editMetadata(row, column.field, $event.target.value)"
                        />
                        <input
                          v-else-if="row.action !== 'Skip'"
                          type="text"
                          :value="metadataValue(row, column.field)"
                          :class="{ edited: isEdited(row, column.field) }"
                          :aria-label="$i(column.labelKey) + ' — ' + row.displayName"
                          @change="editMetadata(row, column.field, $event.target.value)"
                        >
                        <button
                          v-if="row.action !== 'Skip' && sourceDiffers(row, column.field)"
                          type="button"
                          class="suggest-btn"
                          :title="row.sourceMeta[column.field]"
                          @click="editMetadata(row, column.field, row.sourceMeta[column.field])"
                        >
                          {{ $i('menuImport_useSourceShort') }}
                        </button>
                      </template>

                      <!-- whole numbers (VAT) ------------------------------------ -->
                      <template v-else-if="column.kind === 'number'">
                        <input
                          v-if="row.action !== 'Skip'"
                          type="number"
                          min="0"
                          max="99"
                          step="1"
                          :value="metadataValue(row, column.field)"
                          :class="{ edited: isEdited(row, column.field) }"
                          :aria-label="$i(column.labelKey) + ' — ' + row.displayName"
                          @change="editMetadataNumber(row, column.field, $event.target.value)"
                        >
                      </template>

                      <!-- money (deposit) ---------------------------------------- -->
                      <template v-else-if="column.kind === 'money'">
                        <input
                          v-if="row.action !== 'Skip'"
                          type="number"
                          min="0"
                          step="0.01"
                          :value="metadataMoney(row, column.field)"
                          :class="{ edited: isEdited(row, column.field) }"
                          :aria-label="$i(column.labelKey) + ' — ' + row.displayName"
                          @change="editMetadataMoney(row, column.field, $event.target.value)"
                        >
                      </template>

                      <!-- flags -------------------------------------------------- -->
                      <template v-else-if="column.kind === 'boolean'">
                        <input
                          v-if="row.action !== 'Skip'"
                          type="checkbox"
                          :checked="!!metadataValue(row, column.field)"
                          :class="{ edited: isEdited(row, column.field) }"
                          :aria-label="$i(column.labelKey) + ' — ' + row.displayName"
                          @change="editMetadata(row, column.field, $event.target.checked)"
                        >
                      </template>

                      <!-- derived eat-in surcharge ------------------------------- -->
                      <template v-else-if="column.id === 'eatInAddition'">
                        <span class="derived-value">{{ eatInAdditionText(row) }}</span>
                      </template>

                      <!-- variants ----------------------------------------------- -->
                      <template v-else-if="column.id === 'variants'">
                        <button
                          v-if="row.action !== 'Skip'"
                          type="button"
                          class="variant-chip"
                          :aria-label="$i('menuImport_variantsFor', { name: row.displayName })"
                          @click="openDetails(row)"
                        >
                          {{ variantCount(row) }}
                        </button>
                      </template>
                    </td>

                    <td class="col-tools" :data-label="$i('menuImport_rowActions')">
                      <button
                        v-if="row.action !== 'Skip'"
                        type="button"
                        class="icon-btn"
                        :disabled="isLocked"
                        :aria-label="$i('menuImport_editDetailsFor', { name: row.displayName })"
                        @click="openDetails(row)"
                      >
                        ⋯
                      </button>
                      <button
                        v-if="row.action !== 'Skip'"
                        type="button"
                        class="icon-btn remove"
                        :disabled="isLocked"
                        :aria-label="$i('menuImport_removeFromImport', { name: row.displayName })"
                        @click="removeRow(row)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div v-if="!rows.length" class="empty">
                <h3>{{ $i('menuImport_emptyTitle') }}</h3>
                <p>{{ $i('menuImport_emptyBody') }}</p>
                <button class="btn-primary" type="button" :disabled="isLocked" @click="showSource = true">
                  {{ $i('menuImport_emptyAction') }}
                </button>
              </div>
            </div>
          </fieldset>

          <div class="bottom-add">
            <button class="link-btn" type="button" :disabled="isLocked" @click="addManualRow">
              {{ $i('menuImport_addRow') }}
            </button>
            <button v-if="removedRows.length" class="link-btn" type="button" :disabled="isLocked" @click="undoRemove">
              {{ $i('menuImport_undoRemove') }}
            </button>
          </div>

          <div v-if="validationError || applyError" class="error-box" role="alert">
            {{ validationError || applyError }}
          </div>

          <div v-if="outcomeUnknown" class="error-box" role="alert">
            <p>{{ $i('menuImport_outcomeUnknown') }}</p>
            <button class="btn-secondary" :disabled="isCheckingStatus" type="button" @click="checkStatus">
              {{ $i('menuImport_checkStatus') }}
            </button>
            <button class="btn-secondary" :disabled="isApplying" type="button" @click="retryPendingApply">
              {{ $i('menuImport_retrySameOperation') }}
            </button>
          </div>

          <div class="savebar">
            <div>
              <strong>{{ $i('menuImport_totals', { update: countBy('Update'), create: countBy('Create') }) }}</strong>
              <p>{{ $i('menuImport_saveHint') }}</p>
            </div>
            <button
              type="button"
              class="btn-primary"
              :disabled="!canApprove"
              @click="approve"
            >
              {{ isApproving ? $i('menuImport_applying') : $i('menuImport_approve') }}
            </button>
          </div>
        </section>

        <div class="supportline">
          <span>{{ $i('menuImport_supportLine') }}</span>
          <button class="link-btn" type="button" :disabled="isLocked" @click="openTool('categoryVariants')">
            {{ $i('menuImport_toolCategoryVariants') }}
          </button>
        </div>
      </template>

      <!-- ------------------------------------------------------------ details drawer -->
      <MenuRowDetails
        v-if="detailRow"
        :row="detailRow"
        :categories="categories"
        :new-categories="newCategories"
        @close="detailRow = null"
        @edit="editMetadata(detailRow, $event.field, $event.value)"
        @reset="resetMetadata(detailRow, $event)"
        @create-category="createCategoryFor(detailRow, $event)"
        @add-variant="addVariantTo(detailRow)"
        @edit-variant="editVariantOf(detailRow, $event)"
        @remove-variant="removeVariantOf(detailRow, $event)"
        @clear-variants="clearVariantsOf(detailRow)"
        @duplicate="duplicateRow(detailRow)"
      />

      <!-- ------------------------------------------------------------ source modal -->
      <Modal v-if="showSource" @close="showSource = false">
        <div class="source-modal">
          <h2>{{ $i('menuImport_sourceTitle') }}</h2>
          <p class="helper-text">
            {{ $i('menuImport_sourceHelp') }}
          </p>

          <div
            class="upload"
            :class="{ dragging: isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
          >
            <label class="upload-label">
              <strong>{{ $i('menuImport_choosePdfs') }}</strong>
              <input ref="fileInput" type="file" accept="application/pdf" multiple @change="onFilesPicked">
            </label>
            <small>{{ $i('menuImport_uploadLimits', { files: limits.maxFiles, perFile: limits.maxFileMb, total: limits.maxTotalMb }) }}</small>
          </div>

          <ul v-if="files.length" class="source-list">
            <li v-for="(file, index) in files" :key="file.name + index">
              <span class="pdf-tag">PDF</span>
              <div>
                <strong>{{ file.name }}</strong>
                <small>{{ formatBytes(file.size) }}</small>
              </div>
              <button class="link-btn" type="button" @click="removeFile(index)">
                {{ $i('common_delete') }}
              </button>
            </li>
          </ul>

          <label class="field">
            {{ $i(files.length ? 'menuImport_instructionsLabel' : 'menuImport_pasteText') }}
            <textarea
              v-model="pastedText"
              rows="6"
              :maxlength="files.length ? 2000 : 400000"
              :placeholder="$i(files.length ? 'menuImport_instructionsPlaceholder' : 'menuImport_pasteTextPlaceholder')"
            />
            <small class="helper-text">{{ $i(files.length ? 'menuImport_instructionsHelp' : 'menuImport_menuTextHelp') }}</small>
            <small v-if="instructionsTooLong" class="error-box" role="alert">{{ $i('menuImport_instructionsTooLong') }}</small>
          </label>

          <details v-if="analysis && analysis.sources && analysis.sources.length" class="disclosure">
            <summary>{{ $i('menuImport_howPricesWereRead') }}</summary>
            <p class="helper-text">
              {{ $i('menuImport_howPricesWereReadHelp') }}
            </p>
            <div v-for="source in analysis.sources" :key="source.documentName" class="source-columns">
              <strong>{{ source.documentName }}</strong>
              <div v-for="column in source.columns || []" :key="column.label" class="column-row">
                <span :class="{ unresolved: column.unresolved }">{{ column.label }}</span>
                <MenuSelect
                  :value="columnKind(source.documentName, column)"
                  :options="columnKindOptions"
                  :aria-label="$i('menuImport_columnKindFor', { column: column.label })"
                  @input="setColumnKind(source.documentName, column, $event)"
                />
                <MenuSelect
                  v-if="columnKind(source.documentName, column) === 'Channel'"
                  :value="columnChannel(source.documentName, column)"
                  :options="channelOptions"
                  :aria-label="$i('menuImport_columnChannelFor', { column: column.label })"
                  @input="setColumnChannel(source.documentName, column, $event)"
                />
              </div>
            </div>
            <button
              class="btn-secondary"
              type="button"
              :disabled="!columnMappingChanged || isRemapping"
              @click="applyColumnMapping"
            >
              {{ isRemapping ? $i('menuImport_remapping') : $i('menuImport_applyColumnMapping') }}
            </button>
          </details>

          <!-- Adding to or replacing the work list is an explicit choice, and neither one ever
               touches a product in the store. -->
          <div v-if="rows.length" class="draft-choice">
            <p class="helper-text">
              {{ $i('menuImport_existingDraft', { count: rows.length }) }}
            </p>
            <div class="toggle-row">
              <button
                type="button"
                :class="['btn-secondary', { chosen: sourceMode === 'append' }]"
                :aria-pressed="String(sourceMode === 'append')"
                @click="sourceMode = 'append'"
              >
                {{ $i('menuImport_appendToDraft') }}
              </button>
              <button
                type="button"
                :class="['btn-secondary', { chosen: sourceMode === 'replace' }]"
                :aria-pressed="String(sourceMode === 'replace')"
                @click="sourceMode = 'replace'"
              >
                {{ $i('menuImport_replaceDraft') }}
              </button>
            </div>
            <p class="helper-text">
              {{ $i('menuImport_draftChoiceNote') }}
            </p>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" type="button" @click="showSource = false">
              {{ $i('common_cancel') }}
            </button>
            <button class="btn-primary" type="button" :disabled="!canAnalyze" @click="runAnalysis">
              {{ isAnalyzing ? $i('menuImport_analyzing') : $i('menuImport_analyze') }}
            </button>
          </div>
        </div>
      </Modal>

      <!-- ------------------------------------------------------------ draft transfer -->
      <Modal v-if="showDraft" @close="showDraft = false">
        <div class="draft-modal">
          <h2>{{ $i('menuImport_draftTitle') }}</h2>
          <p class="helper-text">
            {{ $i('menuImport_draftHelp') }}
          </p>

          <label class="field">
            {{ $i('menuImport_draftExportLabel') }}
            <textarea :value="draftJson" readonly rows="6" @focus="$event.target.select()" />
          </label>
          <button class="btn-secondary" type="button" @click="copyDraft">
            {{ $i('menuImport_copyToClipboard') }}
          </button>

          <label class="field">
            {{ $i('menuImport_draftImportLabel') }}
            <textarea v-model="draftImportText" rows="6" :placeholder="$i('menuImport_draftImportPlaceholder')" />
          </label>

          <!-- An old draft carries a store id that may be another store entirely, so where it
               lands is asked rather than assumed. -->
          <div v-if="pendingDraft" class="draft-confirm">
            <p>{{ $i('menuImport_draftFrom', { store: pendingDraft.declaredStoreId === null ? $i('menuImport_draftNoStore') : pendingDraft.declaredStoreId, count: pendingDraft.rows.length }) }}</p>
            <p v-if="pendingDraft.declaredStoreId !== null && pendingDraft.declaredStoreId !== selectedStore" class="warn">
              {{ $i('menuImport_draftOtherStore', { from: pendingDraft.declaredStoreId, to: selectedStore }) }}
            </p>
            <p v-if="pendingDraft.declaredReplaceAll" class="warn">
              {{ $i('menuImport_draftReplaceAllIgnored') }}
            </p>
            <p v-if="pendingDraft.newCategories.length" class="helper-text">
              {{ $i('menuImport_draftNewCategories', { names: pendingDraft.newCategories.map(c => c.name).join(', ') }) }}
            </p>
            <div class="modal-actions">
              <button class="btn-secondary" type="button" @click="pendingDraft = null">
                {{ $i('common_cancel') }}
              </button>
              <button class="btn-secondary" type="button" @click="acceptDraft(false)">
                {{ $i('menuImport_appendToDraft') }}
              </button>
              <button class="btn-primary" type="button" @click="acceptDraft(true)">
                {{ $i('menuImport_draftLoadInto', { store: selectedStore }) }}
              </button>
            </div>
          </div>
          <div v-else class="modal-actions">
            <button class="btn-secondary" type="button" @click="showDraft = false">
              {{ $i('common_close') }}
            </button>
            <button class="btn-primary" type="button" :disabled="!draftImportText.trim()" @click="readDraft">
              {{ $i('menuImport_draftRead') }}
            </button>
          </div>
          <p v-if="draftError" class="error-box" role="alert">
            {{ draftError }}
          </p>
        </div>
      </Modal>

      <!-- ------------------------------------------------------------ clear draft -->
      <Modal v-if="showClear" @close="showClear = false">
        <h2>{{ $i('menuImport_clearTitle') }}</h2>
        <p>{{ $i('menuImport_clearBody') }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" type="button" @click="showClear = false">
            {{ $i('common_cancel') }}
          </button>
          <button class="btn-primary" type="button" @click="clearDraft">
            {{ $i('menuImport_clearConfirm') }}
          </button>
        </div>
      </Modal>

      <!-- ------------------------------------------------------------ category variants -->
      <Modal v-if="showCategoryVariants" @close="showCategoryVariants = false">
        <div class="category-variants-modal">
          <h2>{{ $i('menuImport_categoryVariantsTitle') }}</h2>
          <p class="helper-text">
            {{ $i('menuImport_categoryVariantsHelp') }}
          </p>

          <div v-for="(group, groupIndex) in categoryVariants" :key="groupIndex" class="category-group">
            <div class="category-group-head">
              <MenuProductSearch
                :value="group.categoryId"
                :options="categoryOptions"
                :allow-create="false"
                :placeholder="group.newCategoryKey ? pendingCategoryName(group.newCategoryKey) : $i('menuImport_findCategory')"
                :aria-label="$i('menuImport_colCategory')"
                @input="setCategoryVariantCategory(groupIndex, $event)"
              />
              <button
                type="button"
                class="icon-btn"
                :aria-label="$i('menuImport_discardCategoryEntry')"
                :title="$i('menuImport_discardCategoryEntry')"
                @click="discardCategoryEntry(groupIndex)"
              >
                ×
              </button>
            </div>

            <ul v-if="group.variants.length" class="variant-list">
              <li v-for="(variant, index) in group.variants" :key="index">
                <button type="button" class="variant-row" @click="editCategoryVariant(groupIndex, index)">
                  <strong>{{ variant.name }}</strong>
                  <small>{{ optionsPreview(variant) }}</small>
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  :aria-label="$i('menuImport_removeGroup', { name: variant.name })"
                  @click="group.variants.splice(index, 1)"
                >
                  ×
                </button>
              </li>
            </ul>
            <p v-else class="helper-text">
              {{ $i('menuImport_noGroupsYet') }}
            </p>

            <div class="category-group-actions">
              <button class="link-btn" type="button" @click="addCategoryVariant(groupIndex)">
                {{ $i('menuImport_addGroup') }}
              </button>
              <!-- Taking the entry out of the draft changes nothing in the store. Emptying the
                   category's options is a different instruction, so it gets its own control. -->
              <button
                v-if="group.categoryId && (group.variants.length || group.clearGroups)"
                class="link-btn danger"
                type="button"
                :aria-pressed="String(!!group.clearGroups)"
                @click="clearCategoryGroups(groupIndex)"
              >
                {{ $i(group.clearGroups ? 'menuImport_categoryGroupsWillBeCleared' : 'menuImport_clearCategoryGroups') }}
              </button>
            </div>
          </div>

          <button class="btn-secondary" type="button" @click="addCategoryVariantGroup">
            {{ $i('menuImport_addCategoryGroup') }}
          </button>

          <div class="modal-actions">
            <button class="btn-primary" type="button" @click="closeCategoryVariants">
              {{ $i('menuImport_detailsDone') }}
            </button>
          </div>
        </div>
      </Modal>

      <!-- ------------------------------------------------------------ replace catalogue -->
      <Modal v-if="showReplace" @close="closeReplace">
        <div class="replace-modal">
          <h2>{{ $i('menuImport_replaceTitle') }}</h2>
          <div class="warning-box" role="alert">
            {{ $i('menuImport_replaceWarning') }}
          </div>

          <button
            v-if="!removalPreview"
            class="btn-secondary"
            type="button"
            :disabled="isValidating"
            @click="previewRemoval"
          >
            {{ isValidating ? $i('menuImport_replaceChecking') : $i('menuImport_replacePreview') }}
          </button>

          <template v-else>
            <p>{{ $i('menuImport_replaceSummary', { removed: removalPreview.products.length, kept: countBy('Update') + countBy('Create') }) }}</p>
            <ul class="removal-list">
              <li v-for="product in removalPreview.products" :key="product.productId">
                − {{ product.name }}
              </li>
            </ul>
            <label class="field">
              {{ $i('menuImport_replaceTypeToConfirm', { word: replaceWord }) }}
              <input v-model="replaceConfirmation" type="text" autocomplete="off">
            </label>
          </template>

          <div class="modal-actions">
            <button class="btn-secondary" type="button" @click="closeReplace">
              {{ $i('common_cancel') }}
            </button>
            <button
              class="btn-destructive"
              type="button"
              :disabled="!canConfirmReplace"
              @click="confirmReplace"
            >
              {{ $i('menuImport_replaceConfirm') }}
            </button>
          </div>
        </div>
      </Modal>

      <VariantEditorModal ref="variantEditor" />
    </div>
  </AdminPage>
</template>

<script>
// The single menu import workspace.
//
// One page for every way a menu gets into a store: a PDF, pasted text, a manually typed row, or
// a saved draft. There is no import-versus-update mode. A row linked to a catalogue product
// updates it; a row with no link creates one; the operator can override either.
//
// One approval. The visible work list is validated and applied through the same signed,
// normalised plan the price update already used — never an old bulk import behind the same
// button. Everything the API is told about metadata comes from edits the operator actually made.

import MenuColumnPicker from '~/components/admin/MenuColumnPicker.vue'
import MenuProductSearch from '~/components/admin/MenuProductSearch.vue'
import MenuRowDetails from '~/components/admin/MenuRowDetails.vue'
import MenuSelect from '~/components/admin/MenuSelect.vue'
import VariantEditorModal from '~/components/admin/VariantEditorModal.vue'
import Modal from '~/components/atoms/Modal.vue'
import AdminPage from '~/components/organisms/AdminPage.vue'
import {
  ACTION,
  CHANNELS,
  buildDraft,
  carryDecisions,
  channelEnum,
  channelName,
  defaultRules,
  isUnresolved,
  money,
  percent,
  resolvedByKey,
  setManualPrice
} from '~/utils/menu-update'
import {
  COLUMNS,
  COMPACT_COLUMNS,
  METADATA_FIELDS,
  COLUMN_IDS,
  adoptCurrentPrices,
  attachCurrent,
  buildNewProduct,
  carryWorkspaceState,
  clearMetadata,
  displayValue,
  draftStorageKey,
  eatInAddition,
  findLegacyDraft,
  forgetLegacyDraft,
  fromEditorVariant,
  fromLegacyDraft,
  hasMetadataPatch,
  makeRow,
  mergeForAppend,
  mergeVariantGroups,
  nextRowKey,
  normalizeVariantGroups,
  normalizeVisibleColumns,
  pendingApplyKey,
  priceFor,
  readColumnPreference,
  readDraftFile,
  recommendedColumns,
  setMetadata,
  sourceDiffers,
  stripVariantIds,
  toDraftFile,
  toEditorVariant,
  toValidateRequest,
  writeColumnPreference
} from '~/utils/menu-workspace'

const DEFAULT_RULES = defaultRules

// Codes whose message is written by the reading rather than by us.
const DYNAMIC_ISSUE_CODES = ['documentNotice']

// How long a reading has to run before the screen explains that this is normal.
const LONG_WAIT_SECONDS = 20

export default {
  components: {
    AdminPage,
    Modal,
    MenuColumnPicker,
    MenuProductSearch,
    MenuRowDetails,
    MenuSelect,
    VariantEditorModal
  },
  data () {
    return {
      rows: [],
      removedRows: [],
      categoryVariants: [],
      newCategories: [],

      files: [],
      pastedText: '',
      isDragging: false,
      sourceMode: 'append',

      isAnalyzing: false,
      uploadPercent: 0,
      analysisPhase: 'idle',
      analysisStartedAt: 0,
      analysisElapsedSeconds: 0,
      analysisTimer: null,
      analysisError: '',
      analysis: null,
      catalogueOnly: null,

      activeRules: DEFAULT_RULES(),
      columnMappings: {},
      isRemapping: false,
      remapNotice: '',

      validation: null,
      isValidating: false,
      validationError: '',

      isApproving: false,
      isApplying: false,
      isCheckingStatus: false,
      applyError: '',
      receipt: null,
      lastOperationId: '',
      outcomeUnknown: false,
      pendingApplyRequest: null,

      visibleColumns: [...COMPACT_COLUMNS],
      // Once the operator picks columns themselves the smart default stops deciding. Nothing
      // may quietly move their table afterwards.
      columnChoiceMade: false,

      detailRow: null,
      showSource: false,
      showMore: false,
      showDraft: false,
      showClear: false,
      showCategoryVariants: false,
      showReplace: false,

      draftImportText: '',
      draftError: '',
      pendingDraft: null,
      // A draft found under the old import page's keys. Reported, never adopted on sight.
      legacyDraft: null,

      removalPreview: null,
      replaceConfirmation: '',

      channels: CHANNELS,
      limits: { maxFiles: 8, maxFileMb: 14, maxTotalMb: 56 },

      requestGeneration: 0,
      planRevision: 0,
      abortController: null,
      validateTimer: null,
      autosaveTimer: null
    }
  },
  computed: {
    selectedStore () { return this.$store.state.selectedAdminStore },
    /** Scopes drafts and column choices to the signed-in account, per the store's own shape. */
    userId () {
      const user = this.$store.state.currentUser
      return (user && user.id) || 'anon'
    },
    catalogue () {
      const source = this.analysis || this.catalogueOnly
      return (source && source.catalogue) || []
    },
    categories () {
      const source = this.analysis || this.catalogueOnly
      return (source && source.categories) || []
    },
    categoryOptions () {
      return this.categories.map(category => ({ value: category.categoryId, label: category.name }))
    },
    resolvedMap () { return resolvedByKey(this.validation) },
    shownColumns () { return COLUMNS.filter(column => this.visibleColumns.includes(column.id)) },
    /** How many rows would actually have something to show in each optional column. */
    columnCounts () {
      const counts = {}
      COLUMNS.filter(column => !column.always).forEach((column) => {
        counts[column.id] = this.rows.filter((row) => {
          if (row.action === ACTION.skip) { return false }
          if (column.kind === 'price') { return priceFor(row, column.channel) !== null }
          if (column.id === 'variants') { return this.variantCountOf(row) > 0 }
          if (column.id === 'eatInAddition') { return eatInAddition(row) !== null }
          const value = displayValue(row, column.field)
          return value !== null && value !== undefined && value !== ''
        }).length
      })
      return counts
    },
    rowSummary () {
      return this.$i('menuImport_rowSummary', {
        total: this.rows.length,
        update: this.countBy(ACTION.update),
        create: this.countBy(ACTION.create)
      })
    },
    sourceHeadline () {
      if (this.files.length) { return this.files.map(file => file.name).join(', ') }
      if (this.analysis) { return this.$i('menuImport_sourcePasted') }
      if (this.rows.length) { return this.$i('menuImport_sourceDraft') }
      return this.$i('menuImport_sourceNone')
    },
    sourceDetail () {
      return this.$i('menuImport_sourceDetail', { count: this.rows.length })
    },
    instructionsTooLong () { return this.files.length > 0 && this.pastedText.trim().length > 2000 },
    uploadTooLarge () {
      const total = this.files.reduce((sum, file) => sum + file.size, 0)
      return this.files.length > this.limits.maxFiles ||
        this.files.some(file => file.size > this.limits.maxFileMb * 1024 * 1024) ||
        total > this.limits.maxTotalMb * 1024 * 1024
    },
    canAnalyze () {
      return !this.isAnalyzing && !this.instructionsTooLong &&
        this.selectedStore > 0 && !this.uploadTooLarge &&
        (this.files.length > 0 || !!this.pastedText.trim())
    },
    analysisIsTakingLong () {
      return this.analysisPhase === 'reading' && this.analysisElapsedSeconds >= LONG_WAIT_SECONDS
    },
    columnMappingChanged () {
      return Object.keys(this.columnMappings).some((document) => {
        const mapping = this.columnMappings[document]
        return !!mapping.defaultChannel || Object.keys(mapping.columns).length > 0
      })
    },
    columnKindOptions () {
      return [
        { value: 'Channel', label: this.$i('menuImport_columnKindChannel') },
        { value: 'Size', label: this.$i('menuImport_columnKindSize') },
        { value: 'Ignore', label: this.$i('menuImport_columnKindIgnore') }
      ]
    },
    channelOptions () {
      return CHANNELS.map(channel => ({
        value: channelEnum(channel),
        label: this.$i('menuImport_channel' + channelEnum(channel))
      }))
    },
    canApply () {
      return !!(this.validation && this.validation.canApply) && !this.isApplying && !this.outcomeUnknown
    },
    /**
     * Whether the draft may be changed at all right now.
     *
     * It may not while an approval is in flight, and it may not at all once an apply's result is
     * unknown. In that second state the plan is frozen deliberately: editing it would produce a
     * different plan for an operation that may already have committed. Disabling the table alone
     * was not enough — the toolbar, the source modal, the details drawer, the category editor and
     * loading or clearing a draft all change the same thing, so they are all held together.
     */
    isLocked () {
      return this.isApproving || this.isApplying || this.outcomeUnknown
    },
    /**
     * Whether this draft asks for anything at all.
     *
     * Usually that means product rows. Shared category options are their own intent, though:
     * adding a "choose a side" group to a whole category is real work with no product row in it,
     * and requiring a dummy row to save it would be an invented obstacle. An empty draft is
     * still not saveable — there is nothing to save.
     */
    hasSaveableIntent () {
      return this.rows.some(row => row.action !== ACTION.skip) ||
        this.categoryVariants.some(group => (group.categoryId || group.newCategoryKey) &&
          ((group.variants || []).length || group.clearGroups))
    },
    canApprove () {
      return !this.isApproving && !this.isValidating && !!this.validation &&
        !this.outcomeUnknown && this.hasSaveableIntent
    },
    draftJson () {
      return JSON.stringify(toDraftFile(this.selectedStore, this.rows, this.categoryVariants, this.newCategories, this.activeRules), null, 2)
    },
    replaceWord () { return this.$i('menuImport_replaceWord') },
    canConfirmReplace () {
      return !!this.removalPreview && this.replaceConfirmation.trim().toUpperCase() === this.replaceWord.toUpperCase()
    },
    receiptUpdatedIds () { return (this.receipt && this.receipt.updatedProductIds) || [] },
    receiptCreatedIds () { return (this.receipt && this.receipt.createdProductIds) || [] },
    receiptMetadataIds () { return (this.receipt && this.receipt.metadataUpdatedProductIds) || [] },
    receiptRemovedIds () { return (this.receipt && this.receipt.removedProductIds) || [] },
    receiptCreatedCategories () { return (this.receipt && this.receipt.createdCategoryIds) || [] },
    receiptPrices () { return (this.receipt && this.receipt.prices) || [] }
  },
  watch: {
    selectedStore (newValue, oldValue) {
      if (newValue === oldValue) { return }
      this.onStoreChanged()
    },
    rows: {
      handler () { this.scheduleAutosave() },
      deep: true
    },
    categoryVariants: {
      handler () { this.scheduleAutosave() },
      deep: true
    }
  },
  mounted () {
    if (!this.$store.getters.userIsLoggedIn) { return }
    this.init()
  },
  beforeDestroy () {
    this.cancelInFlight()
    this.stopAnalysisClock()
    if (this.validateTimer) { clearTimeout(this.validateTimer) }
    if (this.autosaveTimer) { clearTimeout(this.autosaveTimer) }
  },
  methods: {
    // ---------------------------------------------------------------- lifecycle
    init () {
      if (this.selectedStore <= 0) { return }
      this.loadColumnPreference()
      this.restoreDraft()
      // Before anything else can be started: an apply whose result was never seen leaves the
      // page frozen until its status is known, exactly as it was before the reload.
      this.restorePendingApply()
      this.legacyDraft = findLegacyDraft(this.storage())
      this.loadCatalogue()
    },
    handleLoginSuccess () { this.init() },

    /**
     * Fetches the store's catalogue without reading a document.
     *
     * A manual row needs the same product list an analysed row has, and the detail panel needs
     * the current metadata to show what a field holds today. Neither is worth a PDF.
     */
    async loadCatalogue () {
      if (this.selectedStore <= 0) { return }
      const generation = this.requestGeneration
      try {
        const result = await this._menuUpdateService.Catalogue(this.selectedStore)
        if (generation !== this.requestGeneration) { return }
        this.catalogueOnly = result
        this.rows.forEach(row => attachCurrent(row, this.catalogue))
      } catch (error) {
        // The workspace still works from a document, so a failed bootstrap is not fatal.
        if (generation !== this.requestGeneration) { return }
        this.catalogueOnly = null
      }
    },

    // ---------------------------------------------------------------- columns
    loadColumnPreference () {
      const stored = readColumnPreference(this.storage(), this.userId, this.selectedStore)
      if (stored && stored.chosen) {
        this.visibleColumns = stored.visible
        this.columnChoiceMade = true
      } else {
        this.columnChoiceMade = false
        this.applyRecommendedColumns()
      }
    },
    /**
     * Moves the table to the columns this particular import needs.
     *
     * Only ever called while the operator has made no choice of their own. Once they have, their
     * table is theirs: a new analysis must not rearrange it under them.
     */
    applyRecommendedColumns () {
      if (this.columnChoiceMade) { return }
      this.visibleColumns = recommendedColumns(this.rows)
    },
    onColumnToggle ({ id, visible }) {
      const next = visible
        ? [...this.visibleColumns, id]
        : this.visibleColumns.filter(column => column !== id)
      this.setColumns(next, true)
    },
    onColumnPreset (preset) {
      if (preset === 'all') { this.setColumns([...COLUMN_IDS], true) } else if (preset === 'compact') { this.setColumns([...COMPACT_COLUMNS], true) } else {
        // "Recommended" hands the decision back to the page, including for future imports.
        this.visibleColumns = recommendedColumns(this.rows)
        this.columnChoiceMade = false
        writeColumnPreference(this.storage(), this.userId, this.selectedStore, { chosen: false, visible: this.visibleColumns })
      }
    },
    setColumns (ids, chosen) {
      this.visibleColumns = normalizeVisibleColumns(ids)
      this.columnChoiceMade = !!chosen
      writeColumnPreference(this.storage(), this.userId, this.selectedStore, {
        chosen: this.columnChoiceMade,
        visible: this.visibleColumns
      })
    },
    storage () {
      try {
        return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
      } catch (error) {
        return null
      }
    },

    // ---------------------------------------------------------------- rows
    countBy (action) { return this.rows.filter(row => row.action === action).length },
    /**
     * The single gate every change to the draft passes through.
     *
     * Checked in the handlers as well as reflected in `disabled` attributes, because a disabled
     * button is a hint and this is a rule: a keyboard activation, a stale render or a method
     * called from anywhere else must hit the same answer.
     */
    guardEdit () {
      if (this.isLocked) { return false }
      return true
    },
    productOptions (row) {
      const ranks = new Map((row.candidates || []).map((candidate, index) => [candidate.productId, index]))
      return [...this.catalogue]
        .sort((a, b) => (ranks.has(a.productId) ? ranks.get(a.productId) : 999) - (ranks.has(b.productId) ? ranks.get(b.productId) : 999))
        .map(product => ({ value: product.productId, label: product.name }))
    },
    /**
     * Points a row at a catalogue product, or explicitly at nothing.
     *
     * A row that gains a link adopts that product's current prices for any channel it has no
     * price of its own for, so a manually typed row cannot zero out what the store charges. The
     * operator's own typed prices are never overwritten by this.
     */
    linkProduct (row, productId) {
      if (!this.guardEdit()) { return }
      row.targetProductId = productId
      row.matchConfirmed = productId !== null
      this.changeAction(row, productId === null ? ACTION.create : ACTION.update)
      if (productId) {
        adoptCurrentPrices(row, this.catalogue.find(product => product.productId === productId))
        attachCurrent(row, this.catalogue)
      } else {
        row.current = null
      }
      this.onPlanChanged()
    },
    changeAction (row, action) {
      row.action = action
      if (action === ACTION.create) {
        row.targetProductId = null
        this.ensureNewProduct(row)
      } else {
        row.newProduct = null
      }
    },
    ensureNewProduct (row) {
      row.newProduct = buildNewProduct(row, this.categories, row.newProduct)
    },
    addManualRow () {
      if (!this.guardEdit()) { return }
      const row = makeRow({ rowKey: nextRowKey('manual'), origin: 'manual', action: ACTION.create })
      this.ensureNewProduct(row)
      this.rows.push(row)
      this.applyRecommendedColumns()
      this.detailRow = row
      this.onPlanChanged()
    },
    /**
     * A copy that becomes its own new product, never a second write to the same one.
     *
     * Two things have to happen for that to be true. The copy loses its link, and with it the
     * `current` values it was reading from — so everything that was on screen is written into
     * the copy as its own, or duplicating a linked row would produce a blank product. And every
     * group and option id is dropped: those belong to the product that was copied, the server
     * checks that they do, and reusing them would either be refused or edit the original.
     */
    duplicateRow (row) {
      if (!this.guardEdit()) { return }
      const copy = makeRow({
        ...JSON.parse(JSON.stringify(row)),
        rowKey: nextRowKey('copy'),
        action: ACTION.create,
        targetProductId: null,
        plannedProductId: null,
        current: null,
        inferredPrices: [],
        matchConfirmed: false,
        newProduct: null,
        variantGroups: stripVariantIds(this.variantGroupsOf(row)),
        clearVariantGroups: false
      })

      // What the original showed becomes what the copy holds, since there is no linked product
      // behind it any more to fall back on.
      METADATA_FIELDS.forEach((field) => {
        const value = displayValue(row, field)
        if (value !== null && value !== undefined) { setMetadata(copy, field, value) }
      })

      // The prices it inherited from the product are now this row's own asking price.
      CHANNELS.forEach((channel) => {
        const amount = priceFor(row, channel)
        if (amount !== null) { setManualPrice(copy, channel, amount) }
      })

      this.ensureNewProduct(copy)
      this.rows.splice(this.rows.indexOf(row) + 1, 0, copy)
      this.detailRow = copy
      this.onPlanChanged()
    },
    /** Removing takes the row out of this draft. It never deletes anything in the store. */
    removeRow (row) {
      if (!this.guardEdit()) { return }
      const index = this.rows.indexOf(row)
      if (index < 0) { return }
      this.removedRows.push({ row, index })
      this.rows.splice(index, 1)
      if (this.detailRow === row) { this.detailRow = null }
      this.onPlanChanged()
    },
    undoRemove () {
      if (!this.guardEdit()) { return }
      const last = this.removedRows.pop()
      if (!last) { return }
      this.rows.splice(Math.min(last.index, this.rows.length), 0, last.row)
      this.onPlanChanged()
    },
    restoreRow (row) {
      if (!this.guardEdit()) { return }
      this.changeAction(row, row.targetProductId ? ACTION.update : ACTION.create)
      this.onPlanChanged()
    },
    openDetails (row) { this.detailRow = row },

    // ---------------------------------------------------------------- metadata editing
    metadataValue (row, field) {
      const value = displayValue(row, field)
      return value === null || value === undefined ? '' : value
    },
    metadataMoney (row, field) {
      const value = displayValue(row, field)
      return value === null || value === undefined ? '' : value / 100
    },
    isEdited (row, field) {
      return Object.prototype.hasOwnProperty.call(row.metadataEdits || {}, field)
    },
    sourceDiffers,
    hasMetadataPatch,
    /**
     * The only way a product's metadata ever changes.
     *
     * Rendering a column, opening the drawer or reading a suggestion all go nowhere near this,
     * which is what keeps an existing product untouched until someone actually edits it.
     */
    editMetadata (row, field, value) {
      if (!this.guardEdit()) { return }
      setMetadata(row, field, value)
      if (field === 'categoryId' && value) {
        // Choosing a real category retires any pending new one for this row.
        delete row.metadataEdits.newCategoryKey
        this.applyCategoryRates(row)
      }
      if (row.action === ACTION.create) { this.ensureNewProduct(row) }
      this.onPlanChanged()
    },
    editMetadataNumber (row, field, raw) {
      const trimmed = String(raw == null ? '' : raw).trim()
      this.editMetadata(row, field, trimmed === '' ? null : Math.round(Number(trimmed)))
    },
    editMetadataMoney (row, field, raw) {
      const trimmed = String(raw == null ? '' : raw).trim()
      // Blank leaves the field alone; a typed 0 turns it off. Those are different instructions.
      this.editMetadata(row, field, trimmed === '' ? null : Math.round(Number(trimmed) * 100))
    },
    resetMetadata (row, field) {
      if (!this.guardEdit()) { return }
      clearMetadata(row, field)
      if (row.action === ACTION.create) { this.ensureNewProduct(row) }
      this.onPlanChanged()
    },
    applyCategoryRates (row) {
      const category = this.categories.find(item => item.categoryId === row.metadataEdits.categoryId)
      if (!category || !category.taxSuggestionAvailable || row.action !== ACTION.create) { return }
      // Only a create row takes the category's suggested rates. Moving an existing product to
      // another category must not silently re-rate its VAT.
      row.newProduct = buildNewProduct(row, this.categories, null)
    },
    /** Declares a category to create. Explicitly typed, never inferred from an unmatched name. */
    createCategoryFor (row, name) {
      if (!this.guardEdit()) { return }
      const existing = this.categories.find(category => (category.name || '').toLowerCase() === name.toLowerCase())
      if (existing) {
        this.editMetadata(row, 'categoryId', existing.categoryId)
        return
      }
      const already = this.newCategories.find(category => category.name.toLowerCase() === name.toLowerCase())
      const key = already ? already.key : 'newcat-' + (this.newCategories.length + 1)
      if (!already) { this.newCategories.push({ key, name }) }
      delete row.metadataEdits.categoryId
      setMetadata(row, 'newCategoryKey', key)
      row.categoryName = name
      if (row.action === ACTION.create) { this.ensureNewProduct(row) }
      this.onPlanChanged()
    },
    pendingCategoryFor (row) {
      return row.metadataEdits.newCategoryKey ? this.pendingCategoryName(row.metadataEdits.newCategoryKey) : ''
    },
    categoryByName (name) {
      const trimmed = String(name || '').trim()
      if (!trimmed) { return null }
      return this.categories.find(category => (category.name || '').toLowerCase() === trimmed.toLowerCase()) || null
    },
    /**
     * Proposes a category for the rows a reading wants to create.
     *
     * A menu names its categories, so a new product should arrive already sorted into the one it
     * came from. Making the operator retype "Burger Meals" for each of eight rows is the busywork
     * this replaces. It is a proposal on a row that has to be approved anyway, and it is only
     * ever applied to rows that create a product — an existing product keeps the category it is
     * already in unless someone moves it deliberately.
     */
    proposeCategories (rows) {
      const declared = []
      const keyByName = {}

      rows.forEach((row) => {
        if (row.action !== ACTION.create) { return }
        const name = String(row.categoryName || '').trim()
        if (!name) { return }

        const existing = this.categoryByName(name)
        if (existing) {
          setMetadata(row, 'categoryId', existing.categoryId)
          return
        }

        const lower = name.toLowerCase()
        if (!keyByName[lower]) {
          keyByName[lower] = 'newcat-' + (declared.length + 1)
          declared.push({ key: keyByName[lower], name })
        }
        setMetadata(row, 'newCategoryKey', keyByName[lower])
      })

      return { declared, keyByName }
    },
    /**
     * A category group from a reading, resolved to an id or to a category to be created.
     *
     * An existing category's own groups come along, because a sent list replaces the category's
     * groups wholesale: an import that adds "choose a side" must not remove the three groups the
     * category already had.
     */
    resolveCategoryGroup (group) {
      const name = String(group.categoryName || '').trim()
      const existing = this.categoryByName(name)
      const current = (existing && normalizeVariantGroups(existing.variants)) || []
      // `groups` is what analyze returns; `variants` is what a draft file of ours holds.
      const incoming = normalizeVariantGroups(group.groups || group.variants) || []

      return {
        categoryName: name,
        categoryId: existing ? existing.categoryId : null,
        newCategoryKey: null,
        clearGroups: false,
        loaded: !!existing,
        variants: mergeVariantGroups(current, incoming)
      }
    },
    /**
     * The categories a freshly read draft needs created, and the keys its rows point at.
     *
     * Category groups for a category that does not exist yet are pointed at the same key the
     * rows use, so one category is created and both refer to it.
     */
    pendingFromRows (rows, categoryVariants) {
      const { declared, keyByName } = this.proposeCategories(rows)

      ;(categoryVariants || []).forEach((group) => {
        if (group.categoryId || !group.categoryName) { return }
        const lower = group.categoryName.toLowerCase()
        if (!keyByName[lower]) {
          keyByName[lower] = 'newcat-' + (declared.length + 1)
          declared.push({ key: keyByName[lower], name: group.categoryName })
        }
        group.newCategoryKey = keyByName[lower]
      })

      return declared
    },
    pendingCategoryName (key) {
      const pending = this.newCategories.find(category => category.key === key)
      return pending ? this.$i('menuImport_newCategoryTag', { name: pending.name }) : ''
    },

    // ---------------------------------------------------------------- variants
    variantGroupsOf (row) {
      if (row.variantGroups !== null) { return row.variantGroups }
      return (row.current && row.current.variants) || []
    },
    variantCountOf (row) { return this.variantGroupsOf(row).length },
    variantCount (row) { return this.$i('menuImport_groupCount', { count: this.variantCountOf(row) }) },
    /**
     * Takes a copy of the product's current groups before the first edit.
     *
     * The contract treats a sent list as authoritative, so editing one group has to send them
     * all. Copying the existing set first is what stops an edit to one group from deleting the
     * others.
     */
    beginVariantEdit (row) {
      if (!this.guardEdit()) { return row.variantGroups || [] }
      if (row.variantGroups === null) {
        row.variantGroups = JSON.parse(JSON.stringify((row.current && row.current.variants) || []))
      }
      row.clearVariantGroups = false
      return row.variantGroups
    },
    async addVariantTo (row) {
      if (!this.guardEdit()) { return }
      const edited = await this.$refs.variantEditor.open(null)
      if (!edited) { return }
      const groups = this.beginVariantEdit(row)
      groups.push(fromEditorVariant(edited, groups.length))
      this.onPlanChanged()
    },
    async editVariantOf (row, index) {
      if (!this.guardEdit()) { return }
      const groups = this.beginVariantEdit(row)
      const edited = await this.$refs.variantEditor.open(toEditorVariant(groups[index]))
      if (!edited) { return }
      this.$set(groups, index, fromEditorVariant({ ...groups[index], ...edited }, index))
      this.onPlanChanged()
    },
    removeVariantOf (row, index) {
      if (!this.guardEdit()) { return }
      const groups = this.beginVariantEdit(row)
      groups.splice(index, 1)
      // An empty list is refused by the API precisely because it is what a bug looks like, so
      // removing the last group is recorded as the explicit clear it is.
      if (!groups.length) { row.clearVariantGroups = true }
      this.onPlanChanged()
    },
    clearVariantsOf (row) {
      if (!this.guardEdit()) { return }
      row.variantGroups = []
      row.clearVariantGroups = true
      this.onPlanChanged()
    },
    optionsPreview (group) {
      const names = (group.options || []).map(option => option.name).filter(Boolean)
      if (!names.length) { return this.$i('menuImport_noOptions') }
      if (names.length <= 3) { return names.join(', ') }
      return this.$i('menuImport_optionsMore', { names: names.slice(0, 2).join(', '), count: names.length - 2 })
    },

    // ---------------------------------------------------------------- category variants
    addCategoryVariantGroup () {
      if (!this.guardEdit()) { return }
      this.categoryVariants.push({ categoryId: null, newCategoryKey: null, categoryName: '', variants: [], loaded: false })
    },
    /**
     * Points a shared-options entry at a category, bringing that category's existing groups with
     * it.
     *
     * The API takes a sent list as the whole truth for the category, so adding one group to a
     * category that already has three would otherwise delete the other three. Loading them here
     * means the list on screen is the list that will be saved.
     */
    setCategoryVariantCategory (index, categoryId) {
      if (!this.guardEdit()) { return }
      const entry = this.categoryVariants[index]
      const category = this.categories.find(item => item.categoryId === categoryId)

      entry.categoryId = categoryId
      entry.newCategoryKey = null
      entry.categoryName = category ? category.name : ''

      const existing = (category && normalizeVariantGroups(category.variants)) || []
      // Anything already typed here is kept and placed after what the category already has.
      this.$set(entry, 'variants', mergeVariantGroups(existing, entry.variants))
      entry.loaded = true
    },
    /**
     * Takes a shared-options entry out of the draft.
     *
     * This is the plain "I did not mean to add this" action: the category keeps whatever options
     * it already had, because a plan that says nothing about a category changes nothing about it.
     */
    discardCategoryEntry (index) {
      if (!this.guardEdit()) { return }
      this.categoryVariants.splice(index, 1)
      this.onPlanChanged()
    },
    /**
     * Asks for a category's option groups to be removed.
     *
     * A different instruction from discarding the entry, and it has to be said explicitly:
     * an entry with an empty list would otherwise be indistinguishable from one nobody filled
     * in, so the removal is carried as its own flag all the way to the request.
     */
    clearCategoryGroups (index) {
      if (!this.guardEdit()) { return }
      const entry = this.categoryVariants[index]
      entry.clearGroups = !entry.clearGroups
      if (entry.clearGroups) { this.$set(entry, 'variants', []) }
      this.onPlanChanged()
    },
    async addCategoryVariant (groupIndex) {
      if (!this.guardEdit()) { return }
      const edited = await this.$refs.variantEditor.open(null)
      if (!edited) { return }
      const entry = this.categoryVariants[groupIndex]
      entry.variants.push(fromEditorVariant(edited, entry.variants.length))
      this.onPlanChanged()
    },
    async editCategoryVariant (groupIndex, index) {
      if (!this.guardEdit()) { return }
      const variants = this.categoryVariants[groupIndex].variants
      const edited = await this.$refs.variantEditor.open(toEditorVariant(variants[index]))
      if (!edited) { return }
      this.$set(variants, index, fromEditorVariant({ ...variants[index], ...edited }, index))
      this.onPlanChanged()
    },
    /**
     * Merges freshly read shared options into what is already on screen.
     *
     * An import that mentions a category is adding to it, not redefining it, so the groups the
     * category already has and the ones the operator has edited both survive. Removing one is a
     * deliberate act through the × beside it.
     */
    mergeIncomingCategoryVariants (incoming) {
      ;(incoming || []).forEach((group) => {
        const at = this.categoryVariants.findIndex(entry =>
          (group.categoryId && entry.categoryId === group.categoryId) ||
          (group.newCategoryKey && entry.newCategoryKey === group.newCategoryKey) ||
          (!!group.categoryName && (entry.categoryName || '').toLowerCase() === group.categoryName.toLowerCase()))

        if (at >= 0) {
          this.$set(this.categoryVariants[at], 'variants',
            mergeVariantGroups(this.categoryVariants[at].variants, group.variants))
        } else {
          this.categoryVariants.push(group)
        }
      })
    },
    closeCategoryVariants () {
      this.showCategoryVariants = false
      this.onPlanChanged()
    },

    // ---------------------------------------------------------------- tools menu
    openTool (tool) {
      this.showMore = false
      // Reading the draft out as JSON changes nothing, so that stays open while frozen. Every
      // other tool here exists to change the draft.
      if (tool !== 'draft' && !this.guardEdit()) { return }
      if (tool === 'source') { this.showSource = true }
      if (tool === 'categoryVariants') { this.showCategoryVariants = true }
      if (tool === 'draft') { this.showDraft = true }
      if (tool === 'clear') { this.showClear = true }
      if (tool === 'replace') { this.showReplace = true }
    },
    closeMore () {
      this.showMore = false
      if (this.$refs.moreTrigger) { this.$refs.moreTrigger.focus() }
    },

    // ---------------------------------------------------------------- drafts
    scheduleAutosave () {
      if (this.autosaveTimer) { clearTimeout(this.autosaveTimer) }
      this.autosaveTimer = setTimeout(() => this.saveDraft(), 500)
    },
    saveDraft () {
      const storage = this.storage()
      if (!storage || this.selectedStore <= 0) { return }
      try {
        storage.setItem(
          draftStorageKey(this.userId, this.selectedStore),
          JSON.stringify(toDraftFile(this.selectedStore, this.rows, this.categoryVariants, this.newCategories, this.activeRules))
        )
      } catch (error) {
        // Autosave is a convenience; a full storage must never block the work.
      }
    },
    restoreDraft () {
      const storage = this.storage()
      if (!storage || this.selectedStore <= 0) { return }
      try {
        const raw = storage.getItem(draftStorageKey(this.userId, this.selectedStore))
        if (!raw) { return }
        const draft = readDraftFile(raw, { categories: this.categories })
        // The key is already store-scoped, so this draft belongs here by construction.
        this.rows = draft.rows.map(row => attachCurrent(row, this.catalogue))
        this.categoryVariants = draft.categoryVariants
        this.newCategories = draft.newCategories
        // Restored with the draft, because they decide what an unpriced channel is proposed as:
        // reopening under the defaults would show different money than was saved.
        if (draft.rules) { this.activeRules = { ...DEFAULT_RULES(), ...draft.rules } }
        this.applyRecommendedColumns()
        this.onPlanChanged()
      } catch (error) {
        // A corrupt autosave is dropped rather than shown as a broken work list.
      }
    },
    copyDraft () {
      if (navigator && navigator.clipboard) { navigator.clipboard.writeText(this.draftJson) }
    },
    /**
     * Reads a pasted draft without applying it.
     *
     * Nothing lands until the destination is confirmed: an old file names a store that may not
     * be this one, and its `replaceAll` flag must never become a deletion here.
     */
    readDraft () {
      this.draftError = ''
      try {
        this.pendingDraft = readDraftFile(this.draftImportText, { categories: this.categories })
      } catch (error) {
        this.pendingDraft = null
        this.draftError = this.$i('menuImport_draftInvalid')
      }
    },
    acceptDraft (replace) {
      if (!this.guardEdit()) { return }
      if (!this.pendingDraft) { return }

      if (replace) {
        this.rows = this.pendingDraft.rows.map(row => attachCurrent(row, this.catalogue))
        this.categoryVariants = this.pendingDraft.categoryVariants
        this.newCategories = this.pendingDraft.newCategories
        if (this.pendingDraft.rules) { this.activeRules = { ...DEFAULT_RULES(), ...this.pendingDraft.rules } }
      } else {
        // Every legacy file numbers its own categories from newcat-1, so appending a second one
        // without renaming would point its rows at the first file's category.
        const merged = mergeForAppend(this.rows, this.newCategories, this.pendingDraft)
        this.rows = [...this.rows, ...merged.rows.map(row => attachCurrent(row, this.catalogue))]
        this.categoryVariants = [...this.categoryVariants, ...merged.categoryVariants]
        this.newCategories = [...this.newCategories, ...merged.newCategories]
      }

      // Only now, once it has actually been taken into this store, are the old keys released.
      if (this.pendingDraft.fromLegacyStorage) {
        forgetLegacyDraft(this.storage())
        this.legacyDraft = null
      }

      this.pendingDraft = null
      this.draftImportText = ''
      this.showDraft = false
      this.applyRecommendedColumns()
      this.onPlanChanged()
    },
    /**
     * Offers the old import page's draft, without taking it.
     *
     * It goes through the same confirmation a pasted file does, because it has the same problem:
     * those keys record no store, so the only honest thing to do is show what is in them and ask
     * where it should land.
     */
    offerLegacyDraft () {
      if (!this.legacyDraft || !this.guardEdit()) { return }
      this.pendingDraft = {
        ...fromLegacyDraft(this.legacyDraft, { categories: this.categories }),
        fromLegacyStorage: true
      }
      this.showDraft = true
    },
    /**
     * Leaves the old keys exactly where they are.
     *
     * Declining is not deleting: the old page's draft may be the only copy of that work, and it
     * is not this page's to throw away.
     */
    dismissLegacyDraft () { this.legacyDraft = null },
    /** Empties the work list. Store products are untouched, which the dialog says outright. */
    clearDraft () {
      if (!this.guardEdit()) { return }
      this.rows = []
      this.removedRows = []
      this.categoryVariants = []
      this.newCategories = []
      this.validation = null
      this.showClear = false
      const storage = this.storage()
      if (storage && this.selectedStore > 0) {
        try { storage.removeItem(draftStorageKey(this.userId, this.selectedStore)) } catch (error) { /* ignore */ }
      }
    },

    // ---------------------------------------------------------------- sources
    onFilesPicked (event) {
      this.addFiles(Array.from(event.target.files || []))
      if (this.$refs.fileInput) { this.$refs.fileInput.value = '' }
    },
    onDrop (event) {
      this.isDragging = false
      this.addFiles(Array.from((event.dataTransfer && event.dataTransfer.files) || []))
    },
    addFiles (incoming) {
      if (!this.guardEdit()) { return }
      const pdfs = incoming.filter(file => file.type === 'application/pdf' || /\.pdf$/i.test(file.name))
      if (incoming.length - pdfs.length > 0) { this.analysisError = this.$i('menuImport_onlyPdf') }
      pdfs.forEach((file) => {
        if (!this.files.some(existing => existing.name === file.name && existing.size === file.size)) {
          this.files.push(file)
        }
      })
      this.checkLocalLimits()
    },
    removeFile (index) {
      this.files.splice(index, 1)
      this.checkLocalLimits()
    },
    checkLocalLimits () {
      const tooLarge = this.$i('menuImport_tooLarge', {
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
    formatBytes (bytes) {
      return this.$i('menuImport_megabytes', { value: (bytes / (1024 * 1024)).toFixed(1) })
    },

    // ---------------------------------------------------------------- column mapping
    mappingFor (documentName) {
      if (!this.columnMappings[documentName]) {
        this.$set(this.columnMappings, documentName, { defaultChannel: '', columns: {} })
      }
      return this.columnMappings[documentName]
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
      return entry ? (entry.channel || '') : (column.resolvedChannel || '')
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
      }).filter(mapping => mapping.defaultChannel || mapping.columns.length)
    },
    /** Re-merges documents already read against corrected columns. No AI provider is called. */
    async applyColumnMapping () {
      if (!this.analysis || this.isRemapping || !this.guardEdit()) { return }
      const generation = this.requestGeneration
      this.isRemapping = true
      this.analysisError = ''
      this.remapNotice = ''
      // The plan in hand was built on the old column meanings, so it stops being applicable now.
      this.validation = null
      this.planRevision++

      try {
        const remapped = await this._menuUpdateService.Remap(this.selectedStore, {
          documents: this.analysis.documents,
          sourceMappings: this.sourceMappings(),
          sourceMetadata: this.analysis.sourceMetadata,
          sourceMetadataToken: this.analysis.sourceMetadataToken,
          instructions: this.analysis.instructions || ''
        })
        if (generation !== this.requestGeneration) { return }
        this.adoptAnalysis(remapped, { preserveDecisions: true })
        await this.validate()
      } catch (error) {
        if (generation !== this.requestGeneration || error.cancelled) { return }
        this.analysisError = error.message || this.$i('menuImport_remapFailed')
      } finally {
        if (generation === this.requestGeneration) { this.isRemapping = false }
      }
    },

    // ---------------------------------------------------------------- analysis
    /**
     * Turns an analysis into work-list rows.
     *
     * Only rows the source actually mentions are taken. The store's other products are not
     * listed: this plan does not touch them, so showing them would be a catalogue browser rather
     * than a review of what is about to change.
     *
     * What the reading claims about a matched product's metadata is kept as `sourceMeta` — a
     * suggestion the operator can take — and never as an edit, so an analysis on its own can
     * never rewrite a product's name or description.
     */
    adoptAnalysis (analysis, { preserveDecisions = false, append = false } = {}) {
      const previous = preserveDecisions ? this.rows : []
      const fresh = buildDraft(analysis)
        .filter(row => row.inSource)
        .map(row => makeRow({
          ...row,
          origin: 'source',
          action: row.targetProductId ? ACTION.update : ACTION.create,
          sourceMeta: {
            name: row.displayName,
            description: row.description || null,
            otherInformation: row.otherInformation || null,
            soldOut: row.soldOut === undefined ? null : row.soldOut,
            // The reading returns this in ore, and null when the document printed none.
            depositAmount: row.depositAmount === undefined ? null : row.depositAmount
          },
          // Extracted option groups are a proposal for a new product and a suggestion for an
          // existing one; a linked row keeps `null` so nothing replaces groups it already has.
          variantGroups: row.targetProductId ? null : normalizeVariantGroups(row.variants)
        }))

      const merged = preserveDecisions ? carryDecisions(previous, fresh) : { rows: fresh, carried: 0, dropped: [] }
      if (preserveDecisions) {
        // `carryDecisions` predates metadata editing, so the edits and option groups the
        // operator made are carried on top of what it knows about.
        merged.rows = carryWorkspaceState(previous, fresh, merged.rows)
      }

      this.analysis = analysis
      if (!preserveDecisions) {
        const rules = { ...DEFAULT_RULES(), missingChannelRule: 'SamePercent', newProductChannelRule: 'SameAsTakeaway' }
        const preferences = analysis.instructions && analysis.operatorPreferences
        if (preferences) {
          if (['Takeaway', 'EatIn', 'Delivery'].includes(preferences.referenceChannel)) {
            rules.referenceChannel = preferences.referenceChannel
          }
          if (['KeepCurrent', 'SamePercent', 'KeepKroneDelta'].includes(preferences.missingChannelRule)) {
            rules.missingChannelRule = preferences.missingChannelRule
          }
          if (['Keep', 'SuggestFromSimilar'].includes(preferences.absentProductRule)) {
            rules.absentProductRule = preferences.absentProductRule
          }
        }
        this.activeRules = rules
      }

      // What the reading understood about shared category options. The analysis calls these
      // `sourceCategoryVariants` and puts the list under `groups`; both names are the API's, and
      // reading the wrong one is how a whole menu's shared choices disappear silently.
      const incomingCategoryVariants = (analysis.sourceCategoryVariants || [])
        .filter(group => (group.groups || []).length)
        .map(group => this.resolveCategoryGroup(group))

      const incoming = {
        rows: merged.rows,
        categoryVariants: incomingCategoryVariants,
        newCategories: this.pendingFromRows(merged.rows, incomingCategoryVariants)
      }

      if (append || preserveDecisions) {
        // Row keys and new-category keys from two separate readings collide, so both are renamed
        // and every reference to them moved before the lists are joined.
        const rekeyed = mergeForAppend(append ? this.rows : [], this.newCategories, incoming)
        this.rows = append ? [...this.rows, ...rekeyed.rows] : rekeyed.rows
        // Merged, not replaced. A re-read after a corrected column mapping must not throw away
        // the shared option groups the operator set up in between.
        this.mergeIncomingCategoryVariants(rekeyed.categoryVariants)
        this.newCategories = [...this.newCategories, ...rekeyed.newCategories]
      } else {
        this.rows = incoming.rows
        this.categoryVariants = incoming.categoryVariants
        this.newCategories = incoming.newCategories
      }

      this.rows.forEach((row) => {
        attachCurrent(row, this.catalogue)
        if (row.action === ACTION.create) { this.ensureNewProduct(row) }
      })
      this.applyRecommendedColumns()
      this.planRevision++

      if (merged.dropped.length) {
        this.remapNotice = this.$i('menuImport_remapDroppedDecisions', {
          kept: merged.carried,
          lost: merged.dropped.length,
          names: merged.dropped.slice(0, 5).join(', ')
        })
      } else if (merged.carried) {
        this.remapNotice = this.$i('menuImport_remapKeptDecisions', { kept: merged.carried })
      }
    },
    async runAnalysis () {
      if (!this.canAnalyze || !this.guardEdit()) { return }

      this.cancelInFlight()
      const generation = ++this.requestGeneration
      this.abortController = typeof AbortController !== 'undefined' ? new AbortController() : null
      const append = this.rows.length > 0 && this.sourceMode === 'append'

      this.isAnalyzing = true
      this.analysisError = ''
      this.uploadPercent = 0
      this.showSource = false
      this.analysisPhase = this.files.length > 0 ? 'uploading' : 'reading'
      this.startAnalysisClock()

      try {
        let analysis = await this._menuUpdateService.Analyze(
          this.selectedStore,
          {
            files: this.files,
            text: this.files.length ? '' : this.pastedText,
            instructions: this.files.length ? this.pastedText : '',
            textLabel: this.$i('menuImport_pastedTextLabel'),
            sourceMappings: []
          },
          {
            signal: this.abortController && this.abortController.signal,
            onUploadProgress: (event) => {
              if (generation !== this.requestGeneration || !event.total) { return }
              const sent = event.loaded >= event.total
              this.uploadPercent = sent ? 100 : Math.min(99, Math.floor((event.loaded / event.total) * 100))
              if (sent) { this.analysisPhase = 'reading' }
            }
          }
        )

        if (generation !== this.requestGeneration) { return }

        const unmapped = (analysis.sources || []).filter(source => (source.columns || []).some(column => column.unresolved))
        if (unmapped.length) {
          analysis = await this._menuUpdateService.Remap(this.selectedStore, {
            documents: analysis.documents,
            sourceMetadata: analysis.sourceMetadata,
            sourceMetadataToken: analysis.sourceMetadataToken,
            instructions: analysis.instructions || '',
            sourceMappings: unmapped.map(source => ({
              documentName: source.documentName,
              defaultChannel: (analysis.operatorPreferences || {}).referenceChannel || 'Takeaway',
              columns: []
            }))
          })
          if (generation !== this.requestGeneration) { return }
        }

        this.adoptAnalysis(analysis, { append })
        await this.validate()
      } catch (error) {
        if (generation !== this.requestGeneration || error.cancelled) { return }
        this.analysisError = error.message || this.$i('menuImport_analysisFailed')
      } finally {
        if (generation === this.requestGeneration) {
          this.isAnalyzing = false
          this.analysisPhase = 'idle'
          this.stopAnalysisClock()
        }
      }
    },
    startAnalysisClock () {
      this.stopAnalysisClock()
      this.analysisStartedAt = Date.now()
      this.analysisElapsedSeconds = 0
      this.analysisTimer = setInterval(() => {
        this.analysisElapsedSeconds = Math.round((Date.now() - this.analysisStartedAt) / 1000)
      }, 1000)
    },
    stopAnalysisClock () {
      if (this.analysisTimer) {
        clearInterval(this.analysisTimer)
        this.analysisTimer = null
      }
    },

    // ---------------------------------------------------------------- validation
    onPlanChanged () {
      // Any edit invalidates the previous signed check, so the token is dropped immediately.
      this.validation = null
      this.planRevision++
      if (this.validateTimer) { clearTimeout(this.validateTimer) }
      this.validateTimer = setTimeout(() => this.validate(), 250)
    },
    requestPayload (rows, options = {}) {
      return toValidateRequest(this.selectedStore, this.activeRules, rows || this.rows, {
        categoryVariants: this.categoryVariants,
        newCategories: this.newCategories,
        catalogueReplacement: options.catalogueReplacement || null
      })
    },
    async validate (options = {}) {
      const rows = options.rows || this.rows
      // Checked against the whole draft, not just the row count: a plan may legitimately be
      // nothing but category option groups.
      if (!this.hasSaveableIntent || this.selectedStore <= 0) { return null }
      if (this.outcomeUnknown) { return null }

      const generation = this.requestGeneration
      const revision = this.planRevision
      this.isValidating = true
      this.validationError = ''

      try {
        const result = await this._menuUpdateService.Validate(this.requestPayload(rows, options))
        if (generation !== this.requestGeneration || revision !== this.planRevision) { return null }
        if (options.store !== false) { this.validation = result }
        return result
      } catch (error) {
        if (generation !== this.requestGeneration || revision !== this.planRevision || error.cancelled) { return null }
        this.validationError = error.message || this.$i('menuImport_validationFailed')
        return null
      } finally {
        if (generation === this.requestGeneration && revision === this.planRevision) { this.isValidating = false }
      }
    },
    /**
     * The prices and names currently on screen, as one comparable string.
     *
     * Approval re-validates, and if that fresh plan shows different numbers than the ones just
     * reviewed, it is a different plan and has to be looked at again.
     */
    priceSignature (validation) {
      return JSON.stringify((validation.rows || []).map(row => [
        row.rowKey,
        row.productName,
        ...this.channels.map((channel) => {
          const price = row[channel] || {}
          return [price.currentAmount, price.newAmount]
        }),
        // A metadata change that appeared between the review and the approval changes what is
        // about to be written just as much as a price does.
        (row.metadataChanges || []).map(change => [change.field, change.from, change.to])
      ]))
    },

    // ---------------------------------------------------------------- approval
    /**
     * The one approval path. Every way of saving — the ordinary button and the catalogue
     * replacement — comes through here, so the lock, the freshness check and the confirmation of
     * links all apply to each of them. A second entry point is how two clicks mint two
     * operations, so there is only this one.
     */
    async approve (options = {}) {
      if (!this.canApprove || this.isApproving || this.isApplying) { return }
      if (options.catalogueReplacement && !this.removalPreview) { return }

      const displayed = this.priceSignature(this.validation)
      this.isApproving = true
      if (this.validateTimer) { clearTimeout(this.validateTimer) }

      // Approving the visible list confirms its chosen links and proposed new-product setup.
      // Hard price, catalogue and concurrency checks remain enforced by the API.
      this.rows.forEach((row) => {
        if (row.action === ACTION.skip) { return }
        row.matchConfirmed = !!row.targetProductId
        if (row.newProduct) { row.newProduct.setupConfirmed = true }
        this.rowIssues(row).filter(issue => issue.requiresAcceptance).forEach((issue) => {
          if (!row.acceptedWarnings.includes(issue.code)) { row.acceptedWarnings.push(issue.code) }
        })
      })
      this.planRevision++

      try {
        const result = await this.validate({ catalogueReplacement: options.catalogueReplacement || null })
        if (!result) { return }

        // What was reviewed has to be what is saved. Anything else needs another look.
        if (displayed !== this.priceSignature(result)) {
          this.validationError = this.$i('menuImport_pricesRefreshed')
          return
        }

        if (options.catalogueReplacement) {
          // The deletion is confirmed against the list that was actually read, not whatever the
          // server would compute now: a product added since then must not be swept up silently.
          const removal = result.removal || {}
          const now = [...(removal.productIds || [])].sort().join(',')
          const reviewed = [...this.removalPreview.productIds].sort().join(',')
          if (now !== reviewed) {
            this.removalPreview = { products: removal.products || [], productIds: removal.productIds || [] }
            this.validationError = this.$i('menuImport_replaceChanged')
            return
          }
        }

        if (this.canApply) { await this.applyPlan() }
      } finally {
        this.isApproving = false
      }
    },
    async applyPlan () {
      if (!this.canApply || this.outcomeUnknown) { return }

      this.isApplying = true
      this.applyError = ''
      const generation = this.requestGeneration
      const operationId = this.validation.operationId

      // Exactly the plan the server normalised and signed, sent back untouched. Rebuilding it
      // here would drop the ids the server generated for new products and categories.
      const request = {
        operationId,
        planToken: this.validation.planToken,
        expiresAt: this.validation.expiresAt,
        catalogueHash: this.validation.catalogueHash,
        plan: this.validation.normalizedPlan
      }
      this.lastOperationId = operationId
      this.pendingApplyRequest = request
      // Written before the call, not after it fails. A tab that closes or reloads mid-apply must
      // come back knowing this operation is outstanding; coming back clean is what would let the
      // operator build a second plan for work this one may already have committed.
      this.rememberPendingApply(request)

      try {
        const receipt = await this._menuUpdateService.Apply(request)
        if (generation !== this.requestGeneration) { return }
        this.finishOperation(receipt)
      } catch (error) {
        if (generation !== this.requestGeneration || error.cancelled) { return }
        this.applyError = error.message || this.$i('menuImport_applyFailed')

        if (error.status === 400) {
          // The server answered and refused, so nothing was written. Re-checking is safe, and
          // the outstanding note is dropped because there is no outstanding operation.
          this.pendingApplyRequest = null
          this.forgetPendingApply()
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
     * Closes out an operation once a receipt proves what happened.
     *
     * The autosave timer is stopped as well as the saved draft removed: a pending write firing
     * a moment later would put the finished work list straight back and offer it for import
     * again.
     */
    finishOperation (receipt) {
      this.receipt = receipt || {}
      this.pendingApplyRequest = null
      this.outcomeUnknown = false
      this.applyError = ''
      if (this.autosaveTimer) { clearTimeout(this.autosaveTimer); this.autosaveTimer = null }
      this.clearAutosave()
      this.forgetPendingApply()
    },
    rememberPendingApply (request) {
      const storage = this.storage()
      if (!storage || this.selectedStore <= 0) { return }
      try {
        storage.setItem(pendingApplyKey(this.userId, this.selectedStore), JSON.stringify(request))
      } catch (error) {
        // Best effort. The in-memory freeze still holds for this tab.
      }
    },
    forgetPendingApply () {
      const storage = this.storage()
      if (!storage || this.selectedStore <= 0) { return }
      try { storage.removeItem(pendingApplyKey(this.userId, this.selectedStore)) } catch (error) { /* ignore */ }
    },
    /**
     * Picks an outstanding operation back up after a reload or a return to this store.
     *
     * It comes back frozen on purpose. Whether that apply committed is still unknown, and the
     * only safe moves are the same two as before: ask for its status, or repeat that exact
     * request.
     */
    restorePendingApply () {
      const storage = this.storage()
      if (!storage || this.selectedStore <= 0) { return false }
      try {
        const raw = storage.getItem(pendingApplyKey(this.userId, this.selectedStore))
        if (!raw) { return false }
        const request = JSON.parse(raw)
        if (!request || !request.operationId) { return false }
        this.pendingApplyRequest = request
        this.lastOperationId = request.operationId
        this.outcomeUnknown = true
        this.applyError = this.$i('menuImport_outcomeUnknownRestored')
        return true
      } catch (error) {
        return false
      }
    },
    /**
     * Asks whether the operation committed.
     *
     * A "not applied" answer is not a verdict: the ledger row is only written when the
     * transaction commits, so an apply still in flight looks exactly like one that never
     * happened. The plan therefore stays frozen either way, and the only ways forward are to ask
     * again or to repeat the very same operation.
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
          this.finishOperation(status.receipt)
        } else {
          this.applyError = this.$i('menuImport_statusNotApplied')
        }
      } catch (error) {
        if (generation !== this.requestGeneration) { return }
        this.applyError = error.message || this.$i('menuImport_statusFailed')
      } finally {
        if (generation === this.requestGeneration) { this.isCheckingStatus = false }
      }
    },
    /**
     * Sends the very same signed request again. The server keys the operation in its ledger, so
     * repeating it either commits that one operation or replays the receipt it already wrote. It
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
        this.finishOperation(receipt)
      } catch (error) {
        if (generation !== this.requestGeneration || error.cancelled) { return }
        this.applyError = error.message || this.$i('menuImport_applyFailed')
        // The frozen state survives every failure here, including a refusal: a refusal of the
        // retry says this attempt was rejected, not that the original one was.
      } finally {
        if (generation === this.requestGeneration) { this.isApplying = false }
      }
    },

    // ---------------------------------------------------------------- catalogue replacement
    /**
     * Asks the server which products a replacement would remove.
     *
     * The list is never guessed at in the browser and never implied by a checkbox: it is
     * returned by validate, shown in full, and sent back with the apply so a product added in
     * between cannot be swept up.
     */
    async previewRemoval () {
      const result = await this.validate({
        store: false,
        catalogueReplacement: { requested: true, expectedRemovedProductIds: [] }
      })
      if (!result) { return }
      const removal = result.removal || { products: [], productIds: [] }
      this.removalPreview = {
        products: removal.products || [],
        productIds: removal.productIds || (removal.products || []).map(product => product.productId)
      }
    },
    /**
     * Confirms a replacement through the same locked approval every other save uses.
     *
     * It carries the exact ids that were shown, so the apply is bound to the list the operator
     * read rather than to whatever the catalogue looks like by then.
     */
    async confirmReplace () {
      if (!this.canConfirmReplace || this.isApproving || this.isApplying) { return }
      await this.approve({
        catalogueReplacement: {
          requested: true,
          expectedRemovedProductIds: this.removalPreview.productIds
        }
      })
      if (this.receipt) { this.closeReplace() }
    },
    closeReplace () {
      this.showReplace = false
      this.removalPreview = null
      this.replaceConfirmation = ''
    },

    // ---------------------------------------------------------------- store change
    onStoreChanged () {
      this.cancelInFlight()
      this.requestGeneration++
      // A draft belongs to the store it was built against, so it is set aside rather than
      // quietly applied to a different catalogue. It stays autosaved under its own key.
      this.startOver()
      this.init()
    },
    cancelInFlight () {
      if (this.abortController) {
        this.abortController.abort()
        this.abortController = null
      }
    },
    clearAutosave () {
      const storage = this.storage()
      if (!storage || this.selectedStore <= 0) { return }
      try { storage.removeItem(draftStorageKey(this.userId, this.selectedStore)) } catch (error) { /* ignore */ }
    },
    startOver () {
      this.rows = []
      this.removedRows = []
      this.categoryVariants = []
      this.newCategories = []
      this.files = []
      this.pastedText = ''
      this.analysis = null
      this.catalogueOnly = null
      this.columnMappings = {}
      this.validation = null
      this.receipt = null
      this.applyError = ''
      this.analysisError = ''
      this.validationError = ''
      this.remapNotice = ''
      this.detailRow = null
      this.pendingDraft = null
      this.legacyDraft = null
      this.draftImportText = ''
      this.draftError = ''
      this.removalPreview = null
      this.replaceConfirmation = ''
      this.activeRules = DEFAULT_RULES()
      this.lastOperationId = ''
      this.outcomeUnknown = false
      this.pendingApplyRequest = null
      this.isApplying = false
      this.isCheckingStatus = false
      this.isAnalyzing = false
      this.isRemapping = false
      this.isValidating = false
      this.isApproving = false
      this.uploadPercent = 0
      this.analysisPhase = 'idle'
      this.analysisElapsedSeconds = 0
      this.sourceMode = 'append'
      this.stopAnalysisClock()
      this.planRevision++
      if (this.validateTimer) { clearTimeout(this.validateTimer); this.validateTimer = null }
    },

    // ---------------------------------------------------------------- presentation
    formatMoney: money,
    channelKey (channel) { return channelEnum(channelName(channel)) },
    resolvedFor (row) { return row ? this.resolvedMap[row.rowKey] : null },
    resolvedChannel (row, channel) {
      const resolved = this.resolvedFor(row)
      return resolved ? resolved[channel] : null
    },
    priceValue (row, channel) {
      const manual = (row.manualPrices || []).find(price => channelName(price.channel) === channel)
      if (manual) { return manual.amount / 100 }
      const resolved = this.resolvedChannel(row, channel)
      if (resolved && resolved.newAmount != null) { return resolved.newAmount / 100 }
      const source = priceFor(row, channel)
      return source === null ? '' : source / 100
    },
    setManual (row, channel, value) {
      if (!this.guardEdit()) { return }
      const trimmed = String(value == null ? '' : value).trim()
      setManualPrice(row, channel, trimmed === '' ? null : Math.round(Number(trimmed) * 100))
      this.onPlanChanged()
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
    eatInAdditionText (row) {
      const addition = eatInAddition(row)
      return addition === null ? '—' : money(addition)
    },
    isRowUnresolved (row) {
      return row.action !== ACTION.skip &&
        (isUnresolved(this.resolvedFor(row)) || (!this.validation && row.needsReview))
    },
    rowIssues (row) {
      const resolved = this.resolvedFor(row)
      if (!resolved) { return [] }
      return [
        ...(resolved.blockers || []),
        ...(resolved.warnings || []).filter(issue => issue.requiresAcceptance && !issue.accepted)
      ].filter(issue => !['matchNotConfirmed', 'newProductSetupUnconfirmed'].includes(issue.code))
    },
    /**
     * The text shown for one issue. Most codes read better in the page's own language; a few
     * carry the reading's own wording, and that wording is the whole content.
     */
    issueText (issue) {
      const key = 'menuImport_issue_' + issue.code
      const translated = this.$i(key)
      const heading = translated === key ? '' : translated
      const message = (issue.message || '').trim()
      if (DYNAMIC_ISSUE_CODES.includes(issue.code) && message) {
        return heading ? heading + ' ' + message : message
      }
      return heading || message
    },
    receiptPrice (price, channel) {
      const field = (price.channels || []).find(item => item.channel === channel)
      return field ? money(field.amount) : '—'
    }
  }
}
</script>

<style lang="scss" scoped>
.menu-import-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) { padding: 16px; }
}

.page-header {
  margin-bottom: 24px;

  h1 {
    margin: 0 0 8px;
    font-size: 2em;
    font-weight: 600;
    color: #292c34;

    @media (max-width: 768px) { font-size: 1.5em; }
  }

  p { margin: 0; color: #64748b; }
}

.panel {
  padding: 24px;
  margin-bottom: 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  @media (max-width: 768px) { padding: 16px; }
}

.empty-state {
  padding: 64px 24px;
  margin: 32px 0;
  text-align: center;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  h3 { margin-bottom: 8px; font-size: 1.5em; font-weight: 600; color: #292c34; }
  p { margin-bottom: 24px; color: #64748b; }
}

// ------------------------------------------------------------------ source bar
.sourcebar {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding: 16px 20px; margin-bottom: 16px;
  background: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 12px;

  .source-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
  strong { display: block; color: #292c34; overflow-wrap: anywhere; }
  small { display: block; color: #64748b; font-size: 0.85em; }
}

.file-icon {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 44px; min-height: 44px; padding: 0 10px;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
  color: #64748b; font-size: 0.75em; font-weight: 700; letter-spacing: 0.5px;
}

// ------------------------------------------------------------------ toolbar
.toolbar {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  margin-bottom: 16px;

  h2 { margin: 0 0 4px; font-size: 1.1em; font-weight: 600; color: #292c34; }
  small { color: #64748b; font-size: 0.85em; }
}

.toolbar-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.more { position: relative; }

.more-menu {
  position: absolute; z-index: 60; top: calc(100% + 6px); right: 0;
  min-width: 240px; padding: 6px; margin: 0; list-style: none;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);

  button {
    display: block; width: 100%; min-height: 44px; padding: 10px 12px;
    background: none; border: 0; border-radius: 8px;
    font: inherit; font-size: 0.92em; color: #292c34; text-align: left; cursor: pointer;

    &:hover { background: #f8f9fa; }
    &:focus-visible { outline: 2px solid #1bb776; outline-offset: -2px; }
    &.danger-text { color: #ef4444; }
  }

  .separator { height: 1px; margin: 6px 4px; background: #e2e8f0; }
}

// ------------------------------------------------------------------ table
.table-fieldset { padding: 0; margin: 0; border: 0; min-width: 0; }

.tablewrap {
  // The optional columns make this table wider than any screen, so it scrolls sideways and the
  // row's identity stays pinned. Without that the numbers stop belonging to anything.
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;

  // A shadow on the right edge while there is more table to the right, so the sideways scroll
  // is visible rather than something you have to discover.
  background:
    linear-gradient(to right, #fff 30%, rgba(255, 255, 255, 0)) left / 40px 100% no-repeat,
    linear-gradient(to left, #fff 30%, rgba(255, 255, 255, 0)) right / 40px 100% no-repeat,
    radial-gradient(farthest-side at 0 50%, rgba(41, 44, 52, 0.12), transparent) left / 14px 100% no-repeat,
    radial-gradient(farthest-side at 100% 50%, rgba(41, 44, 52, 0.12), transparent) right / 14px 100% no-repeat;
  background-attachment: local, local, scroll, scroll;

  @media (max-width: 768px) {
    overflow-x: visible;
    border: 0;
    background: none;
  }
}

.workspace-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92em;

  th, td {
    padding: 12px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid #f1f5f9;
  }

  thead th {
    position: sticky; top: 0; z-index: 2;
    background: #f8f9fa;
    color: #292c34;
    font-size: 0.78em; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.3px;
    white-space: nowrap;
  }

  tbody tr:hover { background: #fbfefc; }

  .sticky {
    position: sticky; left: 0; z-index: 3;
    min-width: 220px;
    background: #fff;
    box-shadow: 1px 0 0 #e2e8f0;
  }

  thead .sticky { z-index: 4; background: #f8f9fa; }
  tbody tr:hover .sticky { background: #fbfefc; }

  .col-description { min-width: 260px; }
  .col-name, .col-category { min-width: 180px; }
  .col-link { min-width: 220px; }
  .col-takeaway, .col-eatIn, .col-delivery { min-width: 110px; }
  .col-tools { width: 96px; white-space: nowrap; }

  input[type="text"], input[type="number"] {
    width: 100%; min-width: 80px; min-height: 40px; padding: 8px 10px;
    border: 1px solid #cbd5e1; border-radius: 8px; background: #fff;
    font: inherit; color: #292c34;

    &:hover { border-color: #94a3b8; }
    &:focus { outline: none; border-color: #1bb776; box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1); }
    // A field the operator changed is marked, so a metadata write is never invisible.
    &.edited { border-color: #1bb776; background: #f7fdfa; }
  }

  input[type="checkbox"] { width: 20px; height: 20px; accent-color: #1bb776; }

  del { display: block; color: #94a3b8; font-size: 0.85em; }

  .size {
    padding: 1px 6px; margin-left: 4px; border-radius: 6px;
    background: #f1f5f9; color: #64748b; font-size: 0.8em; font-weight: 500;
  }

  .clamp {
    display: -webkit-box; overflow: hidden;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    margin-top: 4px; color: #64748b; font-size: 0.85em;
  }

  .row-intent { display: block; margin-top: 4px; color: #64748b; font-size: 0.8em; }
  .row-intent.new-intent { color: #159f63; }
  .row-intent.modified { color: #92400e; }

  .inline-issue { display: block; margin-top: 4px; color: #92400e; font-size: 0.8em; }
  .delta { display: block; margin-top: 2px; color: #64748b; font-size: 0.8em; }
  .derived-value { color: #64748b; font-variant-numeric: tabular-nums; }

  .omitted-row { opacity: 0.55; }

  textarea {
    width: 100%; min-width: 180px; padding: 8px 10px;
    border: 1px solid #cbd5e1; border-radius: 8px; background: #fff;
    font: inherit; font-size: 0.95em; color: #292c34; resize: vertical;

    &:hover { border-color: #94a3b8; }
    &:focus { outline: none; border-color: #1bb776; box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1); }
    &.edited { border-color: #1bb776; background: #f7fdfa; }
  }

  // ---------------------------------------------------------------- mobile
  //
  // A phone cannot show a wide table sideways and still be usable: the identity column alone
  // fills the screen and every price ends up past the edge. So each row becomes a card, and the
  // column headers move onto the fields as labels. The operator sees exactly the columns they
  // chose — hiding a column still hides it here — just stacked instead of side by side.
  @media (max-width: 768px) {
    display: block;

    thead { display: none; }
    tbody { display: block; }

    tr {
      display: block;
      padding: 12px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #fff;
    }

    td {
      display: grid;
      grid-template-columns: minmax(96px, 34%) 1fr;
      gap: 12px;
      align-items: center;
      padding: 8px 0;
      border-bottom: 0;

      &::before {
        content: attr(data-label);
        color: #64748b;
        font-size: 0.78em;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      // The row's own identity leads the card as a heading rather than as a labelled field.
      &.col-identity {
        display: block;
        padding: 0 0 12px;
        margin-bottom: 8px;
        border-bottom: 1px solid #f1f5f9;

        &::before { display: none; }
      }

      &.col-tools {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        width: auto;
        padding-top: 12px;
        margin-top: 4px;
        border-top: 1px solid #f1f5f9;

        &::before { display: none; }
      }

      &.kind-boolean { grid-template-columns: minmax(96px, 34%) auto; justify-content: start; }
    }

    // Nothing is pinned on a phone: there is no second axis to pin against.
    .sticky {
      position: static;
      min-width: 0;
      box-shadow: none;
    }

    input[type="text"], input[type="number"], textarea { min-width: 0; }
  }
}

.suggest-btn {
  margin-top: 4px; padding: 2px 8px;
  background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px;
  color: #92400e; font: inherit; font-size: 0.78em; cursor: pointer;

  &:hover { background: #ffedd5; }
  &:focus-visible { outline: 2px solid #1bb776; outline-offset: 1px; }
}

.variant-chip {
  min-height: 36px; padding: 6px 12px;
  background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px;
  color: #292c34; font: inherit; font-size: 0.85em; cursor: pointer; white-space: nowrap;

  &:hover { background: #e2e8f0; }
  &:focus-visible { outline: 2px solid #1bb776; outline-offset: 1px; }
}

.empty {
  padding: 48px 24px;
  text-align: center;

  h3 { margin: 0 0 8px; font-size: 1.2em; color: #292c34; }
  p { margin: 0 0 20px; color: #64748b; }
}

.bottom-add {
  display: flex; gap: 20px; flex-wrap: wrap;
  padding: 12px 4px;
}

// ------------------------------------------------------------------ save bar
.savebar {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding: 20px; margin-top: 16px;
  background: #f8f9fa; border-radius: 12px;

  strong { display: block; color: #292c34; }
  p { margin: 4px 0 0; color: #64748b; font-size: 0.88em; }
}

.supportline {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  padding: 0 4px;
  color: #64748b; font-size: 0.85em;
}

// ------------------------------------------------------------------ progress
.progress-bar {
  height: 8px; overflow: hidden;
  background: #e2e8f0; border-radius: 4px;

  div { height: 100%; background: #1bb776; transition: width 0.2s ease; }
}

.reading { display: flex; align-items: center; gap: 16px; }

.reading-spinner {
  width: 24px; height: 24px; flex-shrink: 0;
  border: 3px solid #e2e8f0; border-top-color: #1bb776; border-radius: 50%;
  animation: menu-import-spin 0.9s linear infinite;
}

@keyframes menu-import-spin { to { transform: rotate(360deg); } }

.long-wait { display: block; color: #92400e; }

// ------------------------------------------------------------------ messages
.error-box {
  padding: 12px 16px; margin: 16px 0;
  background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 6px;
  color: #292c34; font-size: 0.9em;

  p { margin: 0 0 8px; }
}

.notice-box {
  padding: 12px 16px; margin: 16px 0;
  background: #f8f9fa; border-left: 3px solid #1bb776; border-radius: 6px;
  color: #292c34; font-size: 0.9em;
}

.legacy-offer {
  display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;

  p { margin: 4px 0 0; color: #64748b; }
}

.legacy-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.category-group-actions { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }

.warning-box {
  padding: 12px 16px; margin: 16px 0;
  background: #fffbeb; border-left: 3px solid #92400e; border-radius: 6px;
  color: #292c34; font-size: 0.9em;
}

// ------------------------------------------------------------------ modals
.source-modal, .draft-modal, .category-variants-modal, .replace-modal {
  width: min(640px, 100%);

  h2 { margin: 0 0 8px; font-size: 1.2em; font-weight: 600; color: #292c34; }
}

.upload {
  padding: 24px; margin: 16px 0;
  border: 2px dashed #cbd5e1; border-radius: 12px;
  text-align: center;

  &.dragging { border-color: #1bb776; background: #f7fdfa; }
  small { display: block; margin-top: 8px; color: #64748b; font-size: 0.82em; }
}

.upload-label { display: block; cursor: pointer; strong { color: #292c34; } }

.source-list {
  margin: 0 0 16px; padding: 0; list-style: none;

  li { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
  strong { display: block; font-size: 0.92em; overflow-wrap: anywhere; }
  small { color: #64748b; font-size: 0.82em; }
}

.pdf-tag {
  padding: 4px 8px; border-radius: 6px;
  background: #f1f5f9; color: #64748b; font-size: 0.72em; font-weight: 700;
}

.field {
  display: block; margin-bottom: 16px;
  font-size: 0.85em; font-weight: 600; color: #292c34;
  text-transform: uppercase; letter-spacing: 0.3px;

  input[type="text"], textarea {
    display: block; width: 100%; margin-top: 8px; padding: 12px;
    border: 2px solid #e2e8f0; border-radius: 8px;
    font: inherit; font-size: 1rem; font-weight: 400; color: #292c34;
    text-transform: none; letter-spacing: normal;

    &:focus { outline: none; border-color: #1bb776; box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1); }
  }

  textarea { resize: vertical; }
}

.helper-text {
  display: block; margin-top: 6px;
  color: #64748b; font-size: 0.8em; font-style: italic;
  text-transform: none; letter-spacing: normal; font-weight: 400;
}

.disclosure {
  margin: 16px 0; padding-top: 12px; border-top: 1px solid #e2e8f0;

  summary { min-height: 44px; padding: 10px 0; cursor: pointer; font-weight: 600; color: #292c34; }
}

.source-columns {
  margin-bottom: 12px;

  strong { display: block; margin-bottom: 8px; font-size: 0.9em; }
}

.column-row {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; align-items: center;
  margin-bottom: 8px;

  .unresolved { color: #92400e; font-weight: 600; }

  @media (max-width: 600px) { grid-template-columns: 1fr; }
}

.draft-choice { padding: 16px 0; border-top: 1px solid #e2e8f0; }

.toggle-row { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }

.draft-confirm {
  padding: 16px; margin-top: 16px;
  background: #f8f9fa; border-radius: 8px;

  p { margin: 0 0 8px; font-size: 0.9em; }
  .warn { color: #92400e; font-weight: 600; }
}

.category-group {
  padding: 16px; margin-bottom: 16px;
  border: 1px solid #e2e8f0; border-radius: 12px;
}

.category-group-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }

.variant-list {
  margin: 0 0 12px; padding: 0; list-style: none;

  li { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f1f5f9; }
}

.variant-row {
  flex: 1; padding: 12px 8px;
  background: none; border: 0; border-radius: 8px;
  font: inherit; text-align: left; cursor: pointer;

  &:hover { background: #f8f9fa; }
  &:focus-visible { outline: 2px solid #1bb776; outline-offset: -2px; }

  strong { display: block; color: #292c34; font-size: 0.95em; }
  small { display: block; margin-top: 2px; color: #64748b; font-size: 0.82em; }
}

.removal-list {
  max-height: 240px; overflow-y: auto;
  padding: 12px 16px; margin: 12px 0;
  background: #fef2f2; border-radius: 8px;
  list-style: none;

  li { padding: 4px 0; color: #292c34; font-size: 0.9em; }
}

.modal-actions {
  display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end;
  margin-top: 24px;
}

// ------------------------------------------------------------------ receipt
.receipt {
  .badge {
    display: inline-block; padding: 4px 10px; margin-bottom: 12px; border-radius: 6px;
    background: #eaf7f0; color: #116a44; font-size: 0.78em; font-weight: 600;
  }

  h3 { margin: 0 0 8px; font-size: 1.2em; color: #292c34; }
  .muted { color: #64748b; font-size: 0.9em; }
  .danger-text { color: #ef4444; }
}

.channel-summary {
  width: 100%; margin: 16px 0; border-collapse: collapse; font-size: 0.9em;

  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
  thead th { background: #f8f9fa; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.3px; }
  small { display: block; color: #64748b; font-size: 0.85em; font-weight: 400; }
}

.actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; }

// ------------------------------------------------------------------ buttons
.btn-primary {
  padding: 14px 24px;
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff; border: 0; border-radius: 8px;
  font: inherit; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
  transition: all 0.2s ease;

  &:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4); }
  &:focus-visible { outline: 2px solid #1bb776; outline-offset: 2px; }
  &:disabled { background: #cbd5e0; box-shadow: none; cursor: not-allowed; opacity: 0.6; }
}

.btn-secondary {
  min-height: 44px; padding: 10px 18px;
  background: #fff; color: #292c34;
  border: 2px solid #e2e8f0; border-radius: 8px;
  font: inherit; font-weight: 500; cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) { background: #f8f9fa; border-color: #cbd5e0; }
  &:focus-visible { outline: 2px solid #1bb776; outline-offset: 2px; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &.chosen { border-color: #1bb776; background: #f7fdfa; color: #116a44; }
}

.btn-destructive {
  padding: 14px 24px;
  background: #fff; color: #ef4444;
  border: 2px solid #ef4444; border-radius: 8px;
  font: inherit; font-weight: 500; cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) { background: #ef4444; color: #fff; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
  &:focus-visible { outline: 2px solid #ef4444; outline-offset: 2px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.link-btn {
  padding: 4px 0;
  background: none; border: 0; color: #159f63;
  font: inherit; font-size: 0.9em; font-weight: 500;
  cursor: pointer; text-decoration: underline;

  &:hover:not(:disabled) { color: #116a44; }
  &:disabled { color: #94a3b8; cursor: not-allowed; }
  &.danger { color: #ef4444; }
  &.danger[aria-pressed="true"] { font-weight: 600; }
  &:focus-visible { outline: 2px solid #1bb776; outline-offset: 2px; }
}

.icon-btn {
  min-width: 40px; min-height: 40px;
  background: none; border: 0; border-radius: 8px;
  color: #64748b; font-size: 1.2em; line-height: 1; cursor: pointer;

  &:hover { background: #f1f5f9; color: #292c34; }
  &:focus-visible { outline: 2px solid #1bb776; outline-offset: -2px; }
  &.remove:hover { background: #fef2f2; color: #ef4444; }
}

.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
</style>
