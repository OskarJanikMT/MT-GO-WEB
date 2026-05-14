<template>
  <div class="app-layout">
    <div class="app-content">
      <header class="app-header">
        <div class="header-left">
          <img class="header-logo" src="/logo-light.png" alt="Metal-Technika" />
          <div class="header-divider"></div>
          <div class="header-title-block">
            <h1>MT-GO-WEB</h1>
            <span class="header-subtitle">Globalna optymalizacja receptur cięcia desek</span>
          </div>
        </div>

        <div class="header-right">
          <div class="connection-badge online">
            <div class="conn-dot"></div>
            SQL Msm
          </div>
          <span class="timestamp">{{ currentTime }}</span>
        </div>
      </header>

      <main class="dashboard">
        <nav class="filter-bar">
          <div class="filter-btns">
            <template v-for="(tab, index) in tabs" :key="tab.id">
              <button class="filter-btn" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
                {{ tab.label }}
              </button>
              <span v-if="index < tabs.length - 1" class="filter-arrow" aria-hidden="true">→</span>
            </template>
          </div>

        </nav>

        <section v-if="activeTab === 'products'" class="section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Twoje produkty</h2>
              <p class="section-subtitle">Lista plików `.xlsx` z folderu `Produkty`.</p>
            </div>
            <div class="section-actions">
              <div class="metric-row">
                <StatPill label="Produkty" :value="filteredProductSummaries.length" />
                <StatPill label="Elementy" :value="totalVisibleProductRows" />
              </div>
              <div class="toolbar-actions">
                <input
                  ref="fileImportInput"
                  type="file"
                  accept=".xlsx"
                  class="visually-hidden"
                  @change="handleImportExcel"
                />
                <button class="tool-btn" :disabled="isFileActionLoading" @click="triggerImportExcel">Import Excel</button>
              </div>
            </div>
          </div>

          <div v-if="productFileActionMessage" class="save-status product-file-status" :class="{ error: productFileActionError }">
            {{ productFileActionMessage }}
          </div>

          <div class="produkcja-container">
            <DataTable
              :columns="productSummaryColumns"
              :rows="filteredProductSummaries"
              :labels="productSummaryLabels"
              :external-sort-key="productSortKey"
              :external-sort-direction="productSortDirection"
              empty-text="Brak wyników"
              @header-click="sortProductsBy"
              @row-click="selectProduct"
            />
          </div>

          <div v-if="selectedProductName" class="product-modal-overlay">
            <div class="product-modal panel panel-wide" @click.stop>
              <div class="panel-header">
                <div class="modal-title-group">
                  <span>Elementy produktu</span>
                  <template v-if="isRenameMode">
                    <div class="rename-field">
                      <input
                        v-model="renameDraft"
                        class="text-input rename-input"
                        :class="{ invalid: renameDraft.trim() && !hasValidRenameExtension }"
                      />
                      <span v-if="renameDraft.trim() && !hasValidRenameExtension" class="rename-hint error">
                        Nazwa pliku musi kończyć się na `.xlsx`
                      </span>
                    </div>
                  </template>
                  <span v-else class="panel-caption">{{ selectedProductName }}</span>
                </div>
                <span class="row-limit modal-row-limit" :class="{ warn: selectedProductSourceRows.length > 450 }">
                  Pozycje: {{ selectedProductSourceRows.length }} / {{ MAX_PRODUCT_ROWS }}
                </span>
                <div class="panel-actions">
                  <button
                    v-if="!isRenameMode"
                    class="tool-btn compact"
                    :disabled="isFileActionLoading || isEditMode"
                    @click="startRenameSelectedProductFile"
                  >
                    Zmień nazwę
                  </button>
                  <button
                    v-if="isRenameMode"
                    class="tool-btn compact primary"
                    :disabled="isFileActionLoading || !canSubmitRename"
                    @click="submitRenameSelectedProductFile"
                  >
                    Zapisz nazwę
                  </button>
                  <button
                    v-if="isRenameMode"
                    class="tool-btn compact"
                    :disabled="isFileActionLoading"
                    @click="cancelRenameSelectedProductFile"
                  >
                    Anuluj nazwę
                  </button>
                  <button class="tool-btn compact" :disabled="isFileActionLoading" @click="exportSelectedProductFile">
                    Eksport Excel
                  </button>
                  <button class="tool-btn compact" :disabled="isFileActionLoading" @click="duplicateSelectedProductFile">
                    Duplikuj plik
                  </button>
                  <button class="tool-btn compact danger" :disabled="isFileActionLoading" @click="requestDeleteSelectedProductFile">
                    Usuń plik
                  </button>
                  <button class="tool-btn compact" @click="toggleEditMode">
                    {{ isEditMode ? 'Anuluj edycję' : 'Tryb Edycji' }}
                  </button>
                  <button
                    v-if="isEditMode"
                    class="tool-btn compact"
                    :disabled="selectedProductSourceRows.length >= MAX_PRODUCT_ROWS"
                    @click="addProductRow"
                  >
                    Dodaj wiersz
                  </button>
                  <button
                    v-if="isEditMode"
                    class="tool-btn compact primary"
                    :disabled="isSaving"
                    @click="saveProductChanges"
                  >
                    {{ isSaving ? 'Zapisywanie...' : 'Zapisz' }}
                  </button>
                  <button class="tool-btn compact" @click="closeProductModal">Zamknij</button>
                </div>
              </div>

              <div v-if="saveMessage" class="save-status" :class="{ error: saveError }">{{ saveMessage }}</div>

              <div v-if="selectedProductRows.length" class="table-wrap product-modal-table">
                <table class="nested-table standalone-table">
                  <thead>
                    <tr>
                      <th
                        v-for="column in productColumns"
                        :key="column"
                        @click="!isEditMode && column !== 'Nr' ? sortNestedProductsBy(column) : undefined"
                        :class="{ sorted: !isEditMode && nestedProductSortKey === column, disabled: column === 'Nr' || isEditMode }"
                      >
                        {{ productColumnLabels[column] ?? column }}
                        <span v-if="!isEditMode && column !== 'Nr' && nestedProductSortKey === column" class="sort-mark">
                          {{ nestedProductSortDirection > 0 ? '▲' : '▼' }}
                        </span>
                      </th>
                      <th v-if="isEditMode" class="actions-column">Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in selectedProductRows" :key="item._localId">
                      <td v-for="column in productColumns" :key="column">
                        <select
                          v-if="isEditMode && editableProductColumns.includes(column) && isDropdownColumn(column)"
                          class="edit-input"
                          :value="item[column] ?? ''"
                          @focus="activeEditCell = `${item._localId}:${column}`"
                          @blur="activeEditCell = null"
                          @input="updateEditedCell(item._localId, column, $event.target.value)"
                        >
                          <option value=""></option>
                          <option
                            v-for="option in getProductDropdownOptions(editingRows, item, column)"
                            :key="`${column}-${item._localId}-${option}`"
                            :value="option"
                          >
                            {{ option }}
                          </option>
                        </select>
                        <input
                          v-else-if="isEditMode && editableProductColumns.includes(column)"
                          class="edit-input"
                          :value="item[column] ?? ''"
                          :style="getEditInputStyle(item[column], item._localId, column)"
                          @focus="activeEditCell = `${item._localId}:${column}`"
                          @blur="activeEditCell = null"
                          @input="updateEditedCell(item._localId, column, $event.target.value)"
                        />
                        <span v-else>{{ item[column] ?? '' }}</span>
                      </td>
                      <td v-if="isEditMode" class="row-actions-cell">
                        <button
                          class="tool-btn compact"
                          :disabled="selectedProductSourceRows.length >= MAX_PRODUCT_ROWS"
                          @click="duplicateProductRow(item._localId)"
                        >
                          Duplikuj
                        </button>
                        <button class="tool-btn compact danger" @click="removeProductRow(item._localId)">Usuń</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="expanded-empty">
                {{ productsLoading ? 'Wczytywanie elementów...' : 'Brak elementów w tym pliku.' }}
              </div>
            </div>

            <div v-if="confirmDialog.visible" class="confirm-modal-overlay" @click.self="cancelConfirmAction">
              <div class="confirm-modal panel" @click.stop>
                <div class="panel-header">
                  <span>Potwierdzenie</span>
                </div>
                <div class="confirm-modal-body">
                  <p>{{ confirmDialog.message }}</p>
                  <div class="confirm-modal-actions">
                    <button class="tool-btn compact" @click.stop="cancelConfirmAction">Anuluj</button>
                    <button class="tool-btn compact primary" @click.stop="confirmAction">Potwierdź</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'merge'" class="section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Scal produkty</h2>
              <p class="section-subtitle">Budowanie i podgląd receptur z tymczasowych kopii produktów.</p>
            </div>
          </div>

          <div class="merge-grid" :class="{ collapsed: isMergeSelectionCollapsed }">
            <div class="panel merge-selection-panel" :class="{ collapsed: isMergeSelectionCollapsed }">
              <div class="panel-header">
                <span v-if="!isMergeSelectionCollapsed">Produkty do scalenia</span>
                <button v-if="!isMergeSelectionCollapsed" class="tool-btn compact danger" @click="resetMergeSelection">Wyczyść wybór</button>
              </div>
              <div class="merge-selection-body">
                <div v-if="!isMergeSelectionCollapsed" class="merge-selection-content">
                  <div class="merge-search">
                    <div class="search-input-wrap">
                      <span class="search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false">
                          <path
                            d="M10.5 4a6.5 6.5 0 1 0 4.06 11.58l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                      <input v-model="mergeProductSearch" class="text-input merge-search-input" placeholder="Szukaj produktu" />
                    </div>
                  </div>
                  <div class="temporary-product-toolbar">
                    <button
                      class="tool-btn compact"
                      :disabled="!availableProductNames.length || !remainingRecipeCapacity"
                      @click="openSingleElementModal"
                    >
                      Dodaj pojedynczy element
                    </button>
                    <button class="tool-btn compact danger" :disabled="!temporaryProductRows.length" @click="clearTemporaryProduct">
                      Wyczyść elementy dodatkowe
                    </button>
                  </div>
                  <div class="product-list">
                    <div v-for="productName in filteredAvailableProductNames" :key="productName" class="product-check">
                      <label class="product-check-main">
                        <input
                          :key="getMergeCheckboxKey(productName)"
                          :checked="isMergeProductSelected(productName)"
                          type="checkbox"
                          @change="handleMergeCheckboxChange(productName, $event.target.checked)"
                        />
                        <span>{{ formatProductDisplayName(productName) }}</span>
                        <small>{{ productRowsByName[productName]?.length ?? 0 }} elementów</small>
                      </label>
                      <button class="tool-btn compact product-preview-btn" :title="`Podgląd ${formatProductDisplayName(productName)}`" @click="openMergeProductPreview(productName)">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path
                            d="M10.5 4a6.5 6.5 0 1 0 4.06 11.58l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  class="merge-selection-toggle"
                  :title="isMergeSelectionCollapsed ? 'Rozwiń panel produktów' : 'Zwiń panel produktów'"
                  @click="toggleMergeSelectionPanel"
                >
                  <span class="merge-selection-toggle-icon">{{ isMergeSelectionCollapsed ? '▸' : '◂' }}</span>
                </button>
              </div>
            </div>

            <div v-if="mergeAlert.visible" class="confirm-modal-overlay" @click.self="closeMergeAlert">
              <div class="confirm-modal panel" @click.stop>
                <div class="panel-header">
                  <span>Ostrzeżenie</span>
                </div>
                <div class="confirm-modal-body">
                  <p>{{ mergeAlert.message }}</p>
                  <div class="confirm-modal-actions">
                    <button class="tool-btn compact primary" @click="closeMergeAlert">Rozumiem</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="isSingleElementModalOpen" class="confirm-modal-overlay single-element-overlay" @click.self="closeSingleElementModal">
              <div class="confirm-modal panel single-element-modal" @click.stop>
                <div class="panel-header">
                  <span>Dodaj pojedynczy element</span>
                  <span class="panel-caption">Wolne miejsca: {{ remainingRecipeCapacity }}</span>
                </div>
                <div class="confirm-modal-body single-element-body">
                  <label class="rename-field">
                    <span>Produkt źródłowy</span>
                    <select :value="temporarySourceProductName" class="select-input" @change="handleTemporarySourceProductChange($event.target.value)">
                      <option value="">Wybierz produkt</option>
                      <option v-for="productName in availableProductNames" :key="`single-source-${productName}`" :value="productName">
                        {{ formatProductDisplayName(productName) }}
                      </option>
                    </select>
                  </label>
                  <div class="single-element-summary">
                    <span>{{ temporarySourceRowOptions.length }} elementów w produkcie</span>
                    <span>Zaznaczone: {{ selectedTemporaryRowCount }}</span>
                  </div>
                  <div v-if="temporarySourceRowOptions.length" class="single-element-list">
                    <label v-for="row in temporarySourceRowOptions" :key="row._localId" class="single-element-row">
                      <input
                        type="checkbox"
                        :checked="isTemporaryRowSelected(row._localId)"
                        :disabled="!isTemporaryRowSelected(row._localId) && selectedTemporaryRowCount >= remainingRecipeCapacity"
                        @change="handleTemporaryRowCheckboxChange(row._localId, $event.target.checked)"
                      />
                      <span class="single-element-row-text">{{ formatTemporaryRowOption(row) }}</span>
                    </label>
                  </div>
                  <div v-else class="expanded-empty single-element-empty">
                    Wybierz produkt, aby zobaczyć jego elementy.
                  </div>
                  <div class="confirm-modal-actions">
                    <div class="single-element-capacity" :class="{ full: !remainingRecipeCapacityAfterSelection }">
                      <strong>Pozycje: {{ projectedRecipeCount }} / {{ MAX_PRODUCT_ROWS }}</strong>
                    </div>
                    <button class="tool-btn compact" @click="closeSingleElementModal">Anuluj</button>
                    <button class="tool-btn compact primary" :disabled="!selectedTemporaryRowCount" @click="addSelectedTemporaryRows">
                      Dodaj zaznaczone
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="temporarySourceChangeDialog.visible"
              class="confirm-modal-overlay single-element-overlay"
              @click.self="cancelTemporarySourceChange"
            >
              <div class="confirm-modal panel" @click.stop>
                <div class="panel-header">
                  <span>Zmiana produktu</span>
                </div>
                <div class="confirm-modal-body">
                  <p>Masz zaznaczone elementy. Dodać je przed przejściem do innego produktu, czy odznaczyć i przejść dalej?</p>
                  <div class="confirm-modal-actions">
                    <button class="tool-btn compact" @click="cancelTemporarySourceChange">Anuluj</button>
                    <button class="tool-btn compact" @click="discardTemporarySourceSelectionAndChange">Odznacz i przejdź</button>
                    <button class="tool-btn compact primary" @click="applyTemporarySourceChangeWithSelectedRows">Dodaj i przejdź</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="mergePreviewProductName" class="confirm-modal-overlay single-element-overlay" @click.self="closeMergeProductPreview">
              <div class="confirm-modal panel merge-product-preview-modal" @click.stop>
                <div class="panel-header">
                  <span>Podgląd produktu</span>
                  <span class="panel-caption">{{ formatProductDisplayName(mergePreviewProductName) }}</span>
                </div>
                <div v-if="mergePreviewProductRows.length" class="table-wrap merge-product-preview-table">
                  <table class="nested-table standalone-table">
                    <thead>
                      <tr>
                        <th
                          v-for="column in productColumns"
                          :key="`merge-preview-${column}`"
                          @click="column !== 'Nr' ? sortMergePreviewProductsBy(column) : undefined"
                          :class="{ sorted: column !== 'Nr' && mergePreviewSortKey === column, disabled: column === 'Nr' }"
                        >
                          {{ productColumnLabels[column] ?? column }}
                          <span v-if="column !== 'Nr' && mergePreviewSortKey === column" class="sort-mark">
                            {{ mergePreviewSortDirection > 0 ? '▲' : '▼' }}
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in mergePreviewProductRows" :key="row._localId">
                        <td v-for="column in productColumns" :key="`merge-preview-${row._localId}-${column}`">
                          {{ row[column] ?? '' }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="expanded-empty">Brak elementów w tym produkcie.</div>
                <div class="confirm-modal-actions merge-preview-actions">
                  <button class="tool-btn compact" @click="closeMergeProductPreview">Zamknij</button>
                </div>
              </div>
            </div>

            <div class="panel panel-wide merge-preview-panel">
              <div class="panel-header">
                <span>Podgląd scalonej receptury</span>
                <div class="panel-actions">
                  <div v-if="availableMergeGroups.length" class="merge-group-filter">
                    <button
                      class="tool-btn compact"
                      :class="{ primary: !mergeGroupFilter }"
                      @click="mergeGroupFilter = ''"
                    >
                      Wszystkie
                    </button>
                    <button
                      v-for="groupName in availableMergeGroups"
                      :key="`merge-group-filter-${groupName}`"
                      class="tool-btn compact"
                      :class="{ primary: mergeGroupFilter === groupName }"
                      @click="mergeGroupFilter = groupName"
                    >
                      {{ groupName }}
                    </button>
                  </div>
                  <span class="row-limit" :class="{ warn: recipeRows.length > 450 }">Pozycje: {{ recipeRows.length }} / 500</span>
                  <button class="tool-btn compact danger" @click="resetMergeSelection">Wyczyść</button>
                </div>
              </div>
              <div v-if="groupedRecipeRows.length" class="recipe-groups-wrap">
                <section
                  v-for="(group, groupIndex) in groupedRecipeRows"
                  :key="group.productName"
                  class="recipe-group"
                  :class="`recipe-group-${(groupIndex % 4) + 1}`"
                >
                  <button class="recipe-group-header" @click="toggleRecipeGroup(group.productName)">
                    <span class="recipe-group-toggle">{{ isRecipeGroupCollapsed(group.productName) ? '▸' : '▾' }}</span>
                    <div class="recipe-group-meta">
                      <strong>{{ getMergeProductDisplayName(group.productName) }}</strong>
                      <small>{{ group.rows.length }} pozycji, mnożnik x{{ group.multiplier }}</small>
                    </div>
                    <div class="product-quantity recipe-group-quantity" @click.stop>
                      <span>Ilość</span>
                      <div class="quantity-stepper">
                        <button class="quantity-arrow" @click="stepMergeProductQuantity(group.productName, -1)">-</button>
                        <input
                          class="quantity-input"
                          type="number"
                          min="0"
                          step="1"
                          inputmode="numeric"
                          max="500"
                          :value="getMergeProductQuantity(group.productName)"
                          @click.stop
                          @keydown.stop
                          @input="updateMergeProductQuantity(group.productName, $event.target.value)"
                        />
                        <button class="quantity-arrow" @click="stepMergeProductQuantity(group.productName, 1)">+</button>
                      </div>
                    </div>
                    <button
                      class="tool-btn compact"
                      @click.stop="toggleMergeProductEditMode(group.productName)"
                    >
                      {{ isMergeProductEditMode(group.productName) ? 'Zakończ edycję' : 'Edytuj recepturę' }}
                    </button>
                    <button class="recipe-group-remove" @click.stop="removeMergeProduct(group.productName)">Usuń</button>
                  </button>

                  <div v-if="!isRecipeGroupCollapsed(group.productName)" class="table-wrap recipe-group-table-wrap">
                    <table class="data-table recipe-group-table">
                      <thead>
                        <tr>
                          <th
                            v-for="column in mergeRecipeColumns"
                            :key="`${group.productName}-${column}`"
                            @click="!isMergeProductEditMode(group.productName) ? sortMergeRecipeBy(column) : undefined"
                            :class="{ sorted: !isMergeProductEditMode(group.productName) && mergeRecipeSortKey === column, disabled: isMergeProductEditMode(group.productName) }"
                          >
                            {{ recipeColumnLabels[column] ?? column }}
                            <span v-if="!isMergeProductEditMode(group.productName) && mergeRecipeSortKey === column" class="sort-mark">
                              {{ mergeRecipeSortDirection > 0 ? '▲' : '▼' }}
                            </span>
                          </th>
                          <th v-if="isMergeProductEditMode(group.productName)" class="actions-column">Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in group.rows" :key="`${group.productName}-${row._localId}`">
                          <td v-for="column in mergeRecipeColumns" :key="`${group.productName}-${row.idSkladowej}-${column}`">
                            <select
                              v-if="isMergeProductEditMode(group.productName) && isDropdownColumn(column)"
                              class="edit-input"
                              :value="row[column] ?? ''"
                              @focus="mergeEditingCell = `${row._localId}:${column}`"
                              @blur="mergeEditingCell = null"
                              @input="updateMergeRecipeCell(group.productName, row._localId, column, $event.target.value)"
                            >
                              <option value=""></option>
                              <option
                                v-for="option in getMergeDropdownOptions(group.productName, row, column)"
                                :key="`${column}-${row._localId}-${option}`"
                                :value="option"
                              >
                                {{ option }}
                              </option>
                            </select>
                            <input
                              v-else-if="isMergeProductEditMode(group.productName)"
                              class="edit-input"
                              :value="row[column] ?? ''"
                              :style="getMergeEditInputStyle(column, row[column])"
                              @focus="mergeEditingCell = `${row._localId}:${column}`"
                              @blur="mergeEditingCell = null"
                              @input="updateMergeRecipeCell(group.productName, row._localId, column, $event.target.value)"
                            />
                            <span v-else>{{ row[column] ?? '' }}</span>
                          </td>
                          <td v-if="isMergeProductEditMode(group.productName)" class="row-actions-cell">
                            <button
                              class="tool-btn compact"
                              :disabled="recipeRows.length >= MAX_PRODUCT_ROWS"
                              @click="duplicateMergeRecipeRow(group.productName, row._localId)"
                            >
                              Duplikuj
                            </button>
                            <button class="tool-btn compact danger" @click="removeMergeRecipeRow(group.productName, row._localId)">
                              Usuń
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div v-if="isMergeProductEditMode(group.productName)" class="merge-group-footer">
                      <button
                        class="tool-btn compact"
                        :disabled="recipeRows.length >= MAX_PRODUCT_ROWS"
                        @click="addMergeRecipeRow(group.productName)"
                      >
                        Dodaj nowy wiersz
                      </button>
                    </div>
                  </div>
                </section>
              </div>
              <div v-else class="expanded-empty recipe-empty-state">
                Zaznacz produkty do scalenia receptury z panelu&nbsp;<strong>"Produkty do scalenia"</strong>
              </div>
              <div class="merge-preview-footer">
                <button class="tool-btn primary merge-save-btn" :disabled="!recipeRows.length" @click="openSaveRecipeDialog">
                  Zapisz recepturę
                </button>
              </div>
            </div>
          </div>

          <div v-if="saveRecipeDialog.visible" class="confirm-modal-overlay" @click.self="closeSaveRecipeDialog">
            <div class="confirm-modal panel save-recipe-modal" @click.stop>
              <div class="panel-header">
                <span>Zapisz recepturę</span>
              </div>
              <div class="confirm-modal-body">
                <label class="rename-field">
                  <span>Nazwa receptury</span>
                  <input
                    v-model="saveRecipeDialog.name"
                    class="text-input"
                    :class="{ invalid: saveRecipeDialog.error }"
                    placeholder="Wpisz nazwę receptury"
                    @input="saveRecipeDialog.error = ''"
                    @keydown.enter.prevent="submitSaveRecipe"
                  />
                  <span v-if="saveRecipeDialog.error" class="rename-hint error">{{ saveRecipeDialog.error }}</span>
                </label>
                <div class="confirm-modal-actions">
                  <button class="tool-btn compact" @click="closeSaveRecipeDialog">Anuluj</button>
                  <button class="tool-btn compact primary" @click="submitSaveRecipe">Zapisz</button>
                </div>
              </div>
            </div>
          </div>

          <div class="recipe-preview-section">
            <div class="panel">
              <div class="panel-header">
                <span>Zapisane receptury</span>
                <span class="panel-caption">{{ recipeCatalog.length }}</span>
              </div>
              <DataTable
                :columns="recipeSummaryColumns"
                :rows="recipeCatalog"
                :labels="recipeSummaryLabels"
                empty-text="Brak receptur"
                @row-click="selectRecipePreview"
              />
            </div>
            <div class="panel panel-wide">
              <div class="panel-header">
                <span>Podgląd receptury</span>
                <span class="panel-caption">{{ selectedRecipePreviewName || 'Wybierz recepturę' }}</span>
              </div>
              <DataTable
                :columns="recipeColumns"
                :rows="selectedRecipePreviewRows"
                :labels="recipeColumnLabels"
                empty-text="Wybierz recepturę, aby zobaczyć jej skład"
              />
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'work'" class="section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Aktualnie cięte</h2>
              <p class="section-subtitle">Wszystkie pojedyncze elementy: deski i ich wymiary.</p>
            </div>
            <div class="work-actions">
              <select v-model="selectedRecipe" class="select-input">
                <option v-for="name in recipeNames" :key="name" :value="name">{{ name }}</option>
              </select>
              <button class="tool-btn primary" :disabled="!selectedRecipe || isWorkUploadLoading" @click="loadRecipeToWorkMain">
                {{ isWorkUploadLoading ? 'Wgrywanie...' : 'Wgraj do bazy danych' }}
              </button>
              <button class="tool-btn" @click="showSaved = !showSaved">
                {{ showSaved ? 'Ukryj odłożone' : 'Odłożone prace' }}
              </button>
            </div>
          </div>

          <div v-if="workUploadMessage" class="save-status" :class="{ error: workUploadError }">{{ workUploadMessage }}</div>

          <div class="work-grid" :class="{ withSaved: showSaved }">
            <div class="produkcja-container">
              <DataTable :columns="workColumns" :rows="workDisplayRows" empty-text="WorkMain jest pusty" />
            </div>

            <aside v-if="showSaved" class="saved-panel">
              <div class="panel-header">
                <span>Odłożone prace</span>
                <button class="tool-btn compact">Usuń</button>
              </div>
              <DataTable
                :columns="savedColumns"
                :rows="savedRows"
                :labels="savedColumnLabels"
                empty-text="Brak odłożonych prac"
              />
            </aside>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, onUnmounted, ref, watch } from 'vue';
import * as XLSX from 'xlsx';

const MAX_PRODUCT_ROWS = 500;
const PRODUCT_PREVIEW_STORAGE_KEY = 'mt-go-web:selected-product-preview';
const TEMP_PRODUCT_KEY = '__TEMP_PRODUCT__';

const tabs = [
  { id: 'products', label: '1. Twoje Produkty' },
  { id: 'merge', label: '2. Scal produkty' },
  { id: 'work', label: '3. Aktualnie cięte' },
];

const productSummaryColumns = ['nazwaProduktu', 'liczbaPozycji', 'sumaElementow', 'materialy', 'ostatniaAktualizacja'];
const productSummaryLabels = {
  nazwaProduktu: 'Plik',
  liczbaPozycji: 'Pozycje',
  sumaElementow: 'Elementy',
  materialy: 'Materiały',
  ostatniaAktualizacja: 'Źródło',
};

const productColumns = ['Nr', 'Nazwa', 'Długość', 'Grubość', 'Szerokość', 'Materiał', 'Kod', 'Grupa', 'Priorytet', 'ilość', 'Wybijak'];
const groupOptions = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
const priorityOptions = Array.from({ length: 10 }, (_, index) => String(index));
const productColumnLabels = {
  Nr: 'Nr',
  Nazwa: 'Nazwa',
  'Długość': 'Długość',
  'Grubość': 'Grubość',
  'Szerokość': 'Szerokość',
  'Materiał': 'Materiał',
  Kod: 'Kod',
  Grupa: 'Grupa',
  Priorytet: 'Priorytet',
  'ilość': 'ilość',
  Wybijak: 'Wybijak',
};
const editableProductColumns = ['Nazwa', 'Długość', 'Grubość', 'Szerokość', 'Materiał', 'Kod', 'Grupa', 'Priorytet', 'ilość', 'Wybijak'];

const recipeSummaryColumns = ['nazwaReceptury', 'liczbaPozycji', 'sumaElementow', 'materialy'];
const recipeSummaryLabels = {
  liczbaPozycji: 'Pozycje',
  sumaElementow: 'Elementy',
  materialy: 'Materiały',
};

const recipeColumns = [
  'nazwaSkladowej',
  'dlugosc',
  'grubosc',
  'szerokosc',
  'material',
  'idReceptury',
  'idSkladowej',
  'wybijak',
  'grupa',
  'priorytet',
  'ilosc',
  'iloscWykonana',
  'Klasa',
  'Stanowisko',
  'Informacje',
  'TekstDoDruku',
];
const mergeRecipeColumns = recipeColumns.filter(
  (column) => !['Informacje', 'idReceptury', 'idSkladowej', 'iloscWykonana'].includes(column),
);
const recipeColumnLabels = {
  nazwaSkladowej: 'Nazwa',
  dlugosc: 'Długość',
  grubosc: 'Grubość',
  szerokosc: 'Szerokość',
  material: 'Materiał',
  idReceptury: 'ID receptury',
  idSkladowej: 'ID składowej',
  wybijak: 'Wybijak',
  grupa: 'Grupa',
  priorytet: 'Priorytet',
  ilosc: 'Ilość',
  iloscWykonana: 'Wykonano',
  Klasa: 'Klasa',
  Stanowisko: 'Stanowisko',
  Informacje: 'Informacje',
  TekstDoDruku: 'Tekst do druku',
};

const workColumns = ['NR', 'Nazwa', 'Długość', 'Grubość', 'Szerokość', 'Materiał', 'ilość', 'wykonano', 'Wybijak'];

const savedColumns = ['idRap', 'NazwaRec', 'Wiersze', 'CzasOdloz', 'Usr'];
const savedColumnLabels = {
  idRap: 'ID',
  NazwaRec: 'Receptura',
  Wiersze: 'Wiersze',
  CzasOdloz: 'Czas odłożenia',
  Usr: 'Użytkownik',
};

const activeTab = ref('products');
const currentTime = ref('');
const selectedProducts = ref([]);
const mergeProductQuantities = ref({});
const mergeProductSearch = ref('');
const mergeAlert = ref({
  visible: false,
  message: '',
});
const lastMergeInteractedProduct = ref('');
const mergeCheckboxResetProduct = ref('');
const mergeCheckboxResetVersion = ref(0);
const isMergeSelectionCollapsed = ref(false);
const mergeEditModes = ref({});
const mergeEditingCell = ref(null);
const mergeRecipeDrafts = ref({});
const mergePreviewProductName = ref('');
const isSingleElementModalOpen = ref(false);
const temporarySourceChangeDialog = ref({
  visible: false,
  nextProductName: '',
});
const temporaryProductName = ref('Produkt dodatkowy');
const temporarySourceProductName = ref('');
const temporarySourceRowId = ref('');
const temporarySelectedRowIds = ref({});
const selectedRecipe = ref('');
const selectedRecipePreviewName = ref('');
const selectedProductName = ref('');
const showSaved = ref(false);
const productsLoading = ref(false);
const productFiles = ref([]);
const productRowsMap = ref({});
const productSortKey = ref('');
const productSortDirection = ref(1);
const nestedProductSortKey = ref('');
const nestedProductSortDirection = ref(1);
const mergePreviewSortKey = ref('');
const mergePreviewSortDirection = ref(1);
const mergeRecipeSortKey = ref('');
const mergeRecipeSortDirection = ref(1);
const mergeGroupFilter = ref('');
const isEditMode = ref(false);
const isSaving = ref(false);
const saveMessage = ref('');
const saveError = ref(false);
const isWorkUploadLoading = ref(false);
const workUploadMessage = ref('');
const workUploadError = ref(false);
const isFileActionLoading = ref(false);
const productFileActionMessage = ref('');
const productFileActionError = ref(false);
const isRenameMode = ref(false);
const renameDraft = ref('');
const editingRows = ref([]);
const activeEditCell = ref(null);
const collapsedRecipeGroups = ref({});
const fileImportInput = ref(null);
const confirmDialog = ref({
  visible: false,
  action: '',
  message: '',
});
const saveRecipeDialog = ref({
  visible: false,
  name: '',
  error: '',
});

let timerId = null;
let productLocalIdCounter = 1;

const workRows = ref([
  {
    id: 1,
    Kod: '',
    Nazwa: 'PLAZA L',
    Material: 'So',
    Przekroj: '025x050',
    Dlugosc: 255,
    Sztuk: 30,
    WykonaneSztuki: 0,
    Wybijak: 4,
    Rodzaj: '',
    TekstDoDruku: 'PLAZA L 25.5',
    idrec: 25,
    ids: 0,
    CzasUtw: '08.05.2026 12:01:04',
    Usr: 'Default',
    NazwaRec: 'monika',
    gr: 25,
    szer: 50,
    Klasa: 2,
    Stanowisko: 21,
    Informacje: '',
  },
  {
    id: 2,
    Kod: '',
    Nazwa: 'PLAZA L',
    Material: 'So',
    Przekroj: '025x050',
    Dlugosc: 200,
    Sztuk: 15,
    WykonaneSztuki: 0,
    Wybijak: 4,
    Rodzaj: '',
    TekstDoDruku: 'PLAZA L 20',
    idrec: 25,
    ids: 1,
    CzasUtw: '08.05.2026 12:01:04',
    Usr: 'Default',
    NazwaRec: 'monika',
    gr: 25,
    szer: 50,
    Klasa: 2,
    Stanowisko: 21,
    Informacje: '',
  },
]);

const savedRows = ref([
  { idRap: 1777388312283, NazwaRec: 'wtorek bull', Wiersze: 24, CzasOdloz: '29.04.2026 08:08:03', Usr: 'Default' },
  { idRap: 1778234464839, NazwaRec: 'monika kopia', Wiersze: 96, CzasOdloz: '08.05.2026 12:12:40', Usr: 'Default' },
]);

const savedRecipeCatalog = ref([]);

const selectedProductFile = computed(() => productFiles.value.find((entry) => entry.name === selectedProductName.value) || null);
const hasValidRenameExtension = computed(() => renameDraft.value.trim().toLowerCase().endsWith('.xlsx'));
const canSubmitRename = computed(() => {
  const nextName = renameDraft.value.trim();
  return Boolean(
    selectedProductName.value &&
      nextName &&
      hasValidRenameExtension.value &&
      nextName !== selectedProductName.value,
  );
});

const availableProductNames = computed(() => productFiles.value.map((entry) => entry.name));
const filteredAvailableProductNames = computed(() => {
  const query = mergeProductSearch.value.trim().toLowerCase();
  if (!query) return availableProductNames.value;
  return availableProductNames.value.filter((name) => name.toLowerCase().includes(query));
});
const productRowsByName = computed(() => productRowsMap.value);
const temporaryProductRows = computed(() => mergeRecipeDrafts.value[TEMP_PRODUCT_KEY] ?? []);
const temporarySourceRowOptions = computed(() => productRowsByName.value[temporarySourceProductName.value] ?? []);
const selectedTemporaryRowCount = computed(
  () => Object.values(temporarySelectedRowIds.value).filter(Boolean).length,
);
const projectedRecipeCount = computed(() => recipeRows.value.length + selectedTemporaryRowCount.value);
const remainingRecipeCapacity = computed(() => Math.max(0, MAX_PRODUCT_ROWS - recipeRows.value.length));
const remainingRecipeCapacityAfterSelection = computed(() => Math.max(0, MAX_PRODUCT_ROWS - projectedRecipeCount.value));

const productSummaries = computed(() =>
  productFiles.value.map((file) => {
    const rows = productRowsByName.value[file.name] ?? [];
    return {
      nazwaProduktu: file.name,
      liczbaPozycji: rows.length,
      sumaElementow: rows.reduce((sum, row) => sum + Number(row['ilość'] || 0), 0),
      materialy: [...new Set(rows.map((row) => row['Materiał']).filter(Boolean))].join(', ') || '—',
      ostatniaAktualizacja: 'folder Produkty',
    };
  }),
);

const filteredProductSummaries = computed(() => {
  if (!productSortKey.value) return productSummaries.value;
  return [...productSummaries.value].sort(
    (left, right) => compareValues(left[productSortKey.value], right[productSortKey.value]) * productSortDirection.value,
  );
});

const selectedProductSourceRows = computed(() => {
  if (!selectedProductName.value) return [];
  return isEditMode.value ? editingRows.value : productRowsByName.value[selectedProductName.value] ?? [];
});

const selectedProductRows = computed(() =>
  [...selectedProductSourceRows.value]
    .sort((left, right) => {
      if (isEditMode.value || !nestedProductSortKey.value) return 0;
      return compareValues(left[nestedProductSortKey.value], right[nestedProductSortKey.value]) * nestedProductSortDirection.value;
    })
    .map((row, index) => ({
      ...row,
      Nr: index + 1,
    })),
);

const mergePreviewProductRows = computed(() =>
  [...(productRowsByName.value[mergePreviewProductName.value] ?? [])]
    .sort((left, right) => {
      if (!mergePreviewSortKey.value) return 0;
      return compareValues(left[mergePreviewSortKey.value], right[mergePreviewSortKey.value]) * mergePreviewSortDirection.value;
    })
    .map((row, index) => ({
      ...row,
      Nr: index + 1,
    })),
);

const totalVisibleProductRows = computed(() =>
  filteredProductSummaries.value.reduce((sum, product) => sum + (productRowsByName.value[product.nazwaProduktu]?.length ?? 0), 0),
);

const mergeProductCopies = computed(() => mergeRecipeDrafts.value);

const selectedMergeRowCount = computed(() =>
  selectedProducts.value.reduce((sum, productName) => sum + (mergeRecipeDrafts.value[productName]?.length ?? 0), 0),
);

const recipeRows = computed(() => {
  const result = [];
  let rowId = 0;

  for (const productName of selectedProducts.value) {
    const multiplier = getMergeProductQuantity(productName);
    const sourceRows = mergeRecipeDrafts.value[productName] ?? [];

    for (const row of sourceRows) {
      const baseQuantity = Number(String(row._baseIlosc ?? row.ilosc ?? 0).replace(',', '.'));
      const multipliedQuantity = Number.isFinite(baseQuantity) ? baseQuantity * multiplier : row.ilosc;

      result.push({
        ...row,
        nazwaProduktu: productName,
        idSkladowej: rowId,
        ilosc: multipliedQuantity,
      });
      rowId += 1;
    }
  }

  return result.slice(0, 500);
});

const availableMergeGroups = computed(() =>
  [...new Set(recipeRows.value.map((row) => getRowGroupValue(row)).filter(Boolean))].sort(),
);

const groupedRecipeRows = computed(() =>
  selectedProducts.value
    .map((productName) => ({
      productName,
      multiplier: getMergeProductQuantity(productName),
      rows: recipeRows.value
        .filter((row) => row.nazwaProduktu === productName)
        .filter((row) => !mergeGroupFilter.value || getRowGroupValue(row) === mergeGroupFilter.value)
        .sort((left, right) => {
          if (!mergeRecipeSortKey.value) return 0;
          return compareValues(left[mergeRecipeSortKey.value], right[mergeRecipeSortKey.value]) * mergeRecipeSortDirection.value;
        }),
    }))
    .filter((group) => group.rows.length),
);

const recipeCatalogEntries = computed(() => savedRecipeCatalog.value);

const recipeCatalog = computed(() =>
  recipeCatalogEntries.value.map((entry) => ({
    nazwaReceptury: entry.nazwaReceptury,
    liczbaPozycji: entry.rows.length,
    sumaElementow: entry.rows.reduce((sum, row) => sum + Number(row.ilosc || 0), 0),
    materialy: [...new Set(entry.rows.map((row) => row.material).filter(Boolean))].join(', '),
  })),
);

const selectedRecipePreviewRows = computed(() => {
  const recipe = recipeCatalogEntries.value.find((entry) => entry.nazwaReceptury === selectedRecipePreviewName.value);
  return recipe ? recipe.rows : [];
});

const recipeNames = computed(() => [...new Set(savedRecipeCatalog.value.map((entry) => entry.nazwaReceptury).filter(Boolean))]);

const workDisplayRows = computed(() =>
  workRows.value.map((row, index) => ({
    NR: row.id ?? index + 1,
    Nazwa: row.Nazwa ?? '',
    'Długość': row.Dlugosc ?? '',
    'Grubość': row.gr ?? '',
    'Szerokość': row.szer ?? '',
    'Materiał': row.Material ?? '',
    'ilość': row.Sztuk ?? '',
    wykonano: row.WykonaneSztuki ?? '',
    Wybijak: row.Wybijak ?? '',
  })),
);

function compareValues(a, b) {
  const left = a ?? '';
  const right = b ?? '';
  const leftNumber = Number(String(left).replace(',', '.'));
  const rightNumber = Number(String(right).replace(',', '.'));
  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return String(left).localeCompare(String(right), 'pl', { sensitivity: 'base' });
}

function updateClock() {
  currentTime.value = new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());
}

function normalizeHeaderKey(value) {
  return String(value || '')
    .replace(/[łŁ]/g, (match) => (match === 'ł' ? 'l' : 'L'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function getCellValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }

  const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeHeaderKey(key), value]);
  for (const key of keys) {
    const normalizedKey = normalizeHeaderKey(key);
    const match = normalizedEntries.find(([candidateKey, value]) => candidateKey === normalizedKey && value !== '');
    if (match) {
      return match[1];
    }
  }

  return '';
}

function buildRowFromHeaders(headers, rowValues) {
  const entries = headers.map((header, index) => [header, rowValues[index] ?? '']);
  return Object.fromEntries(entries);
}

function formatProductDisplayName(fileName) {
  return String(fileName || '').replace(/\.xlsx$/i, '');
}

function getMergeProductDisplayName(productName) {
  if (productName === TEMP_PRODUCT_KEY) {
    return temporaryProductName.value.trim() || 'Produkt dodatkowy';
  }
  return formatProductDisplayName(productName);
}

function formatTemporaryRowOption(row) {
  const name = row.Nazwa || row.nazwaSkladowej || 'Bez nazwy';
  const length = row['Długość'] ?? row.dlugosc ?? '—';
  const width = row['Szerokość'] ?? row.szerokosc ?? '—';
  const thickness = row['Grubość'] ?? row.grubosc ?? '—';
  return `${name} | ${length} x ${width} x ${thickness}`;
}

function normalizeGroupValue(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]$/.test(normalized) ? normalized : normalized.slice(0, 1).replace(/[^A-Z]/g, '');
}

function normalizePriorityValue(value) {
  const normalized = String(value ?? '').trim();
  return /^[0-9]$/.test(normalized) ? normalized : normalized.replace(/\D/g, '').slice(0, 1);
}

function normalizeEditableCellValue(column, value) {
  if (column === 'Grupa' || column === 'grupa') {
    return normalizeGroupValue(value);
  }
  if (column === 'Priorytet' || column === 'priorytet') {
    return normalizePriorityValue(value);
  }
  return value;
}

function getDropdownOptions(column) {
  if (column === 'Grupa' || column === 'grupa') return groupOptions;
  if (column === 'Priorytet' || column === 'priorytet') return priorityOptions;
  return [];
}

function isDropdownColumn(column) {
  return getDropdownOptions(column).length > 0;
}

function getRowGroupValue(row) {
  return normalizeGroupValue(row?.Grupa ?? row?.grupa ?? '');
}

function getRowPriorityValue(row) {
  return normalizePriorityValue(row?.Priorytet ?? row?.priorytet ?? '');
}

function getUsedPrioritiesForGroup(rows, groupValue, excludedLocalId) {
  const normalizedGroup = normalizeGroupValue(groupValue);
  if (!normalizedGroup) return new Set();

  return new Set(
    rows
      .filter((row) => row?._localId !== excludedLocalId && getRowGroupValue(row) === normalizedGroup)
      .map((row) => getRowPriorityValue(row))
      .filter(Boolean),
  );
}

function getGlobalMergeDraftRows(excludedProductName = '') {
  return selectedProducts.value.flatMap((selectedProductName) => {
    if (excludedProductName && selectedProductName === excludedProductName) {
      return [];
    }
    return mergeRecipeDrafts.value[selectedProductName] ?? [];
  });
}

function getSmallestAvailablePriority(rows, groupValue, excludedLocalId) {
  const usedPriorities = getUsedPrioritiesForGroup(rows, groupValue, excludedLocalId);
  return priorityOptions.find((priority) => !usedPriorities.has(priority)) ?? '';
}

function hasAvailablePriorityInGroup(rows, groupValue, excludedLocalId) {
  return Boolean(getSmallestAvailablePriority(rows, groupValue, excludedLocalId));
}

function getPriorityDropdownOptions(rows, currentRow) {
  const groupValue = getRowGroupValue(currentRow);
  if (!groupValue) return [];

  const usedPriorities = getUsedPrioritiesForGroup(rows, groupValue, currentRow?._localId);
  const currentPriority = getRowPriorityValue(currentRow);

  return priorityOptions.filter((priority) => priority === currentPriority || !usedPriorities.has(priority));
}

function getProductDropdownOptions(rows, row, column) {
  if (column === 'Grupa' || column === 'grupa') {
    const currentGroup = getRowGroupValue(row);
    return groupOptions.filter(
      (group) => group === currentGroup || hasAvailablePriorityInGroup(rows, group, row?._localId),
    );
  }
  if (column === 'Priorytet' || column === 'priorytet') return getPriorityDropdownOptions(rows, row);
  return [];
}

function getMergeDropdownOptions(productName, row, column) {
  const allMergeRows = [...getGlobalMergeDraftRows(productName), ...(mergeRecipeDrafts.value[productName] ?? [])];

  if (column === 'grupa') {
    const currentGroup = getRowGroupValue(row);
    return groupOptions.filter(
      (group) => group === currentGroup || hasAvailablePriorityInGroup(allMergeRows, group, row?._localId),
    );
  }

  if (column === 'priorytet') {
    return getPriorityDropdownOptions(allMergeRows, row);
  }

  return [];
}

function getSequentialGroupValidationError(rows) {
  const normalizedRows = rows.map((row, index) => ({
    index: index + 1,
    group: getRowGroupValue(row),
    priority: getRowPriorityValue(row),
  }));

  const incompleteRow = normalizedRows.find((row) => row.group && row.priority === '');
  if (incompleteRow) {
    return `Wiersz ${incompleteRow.index} ma ustawioną Grupę, więc musi mieć też Priorytet.`;
  }

  const groupedRows = normalizedRows.filter((row) => row.group);
  const usedGroups = [...new Set(groupedRows.map((row) => row.group))].sort();
  for (let index = 0; index < usedGroups.length; index += 1) {
    const expectedGroup = groupOptions[index];
    if (usedGroups[index] !== expectedGroup) {
      return 'Grupy muszą być ustawione kolejno bez przerw, zaczynając od A.';
    }
  }

  for (const group of usedGroups) {
    const priorities = groupedRows
      .filter((row) => row.group === group)
      .map((row) => Number.parseInt(row.priority, 10))
      .sort((left, right) => left - right);

    for (let index = 0; index < priorities.length; index += 1) {
      if (priorities[index] !== index) {
        return `W grupie ${group} priorytety muszą być ustawione kolejno bez przerw, zaczynając od 0.`;
      }
    }
  }

  return '';
}

function createMergeDraftRow(productName, sourceRow = {}) {
  const rawQuantity = sourceRow['ilość'] ?? sourceRow.ilosc ?? 0;
  const numericQuantity = Number(String(rawQuantity).replace(',', '.'));
  const baseQuantity = Number.isFinite(numericQuantity) ? numericQuantity : 0;

  return {
    _localId: createProductLocalId(),
    _baseIlosc: baseQuantity,
    nazwaReceptury: '',
    nazwaProduktu: productName,
    nazwaSkladowej: sourceRow.Nazwa ?? sourceRow.nazwaSkladowej ?? '',
    dlugosc: sourceRow['Długość'] ?? sourceRow.dlugosc ?? '',
    grubosc: sourceRow['Grubość'] ?? sourceRow.grubosc ?? '',
    szerokosc: sourceRow['Szerokość'] ?? sourceRow.szerokosc ?? '',
    material: sourceRow['Materiał'] ?? sourceRow.material ?? '',
    idReceptury: sourceRow.idReceptury ?? 26,
    idSkladowej: sourceRow.idSkladowej ?? 0,
    wybijak: sourceRow.Wybijak ?? sourceRow.wybijak ?? 0,
    grupa: sourceRow.Grupa ?? sourceRow.grupa ?? '',
    priorytet: sourceRow.Priorytet ?? sourceRow.priorytet ?? '',
    ilosc: baseQuantity,
    iloscWykonana: sourceRow.iloscWykonana ?? 0,
    Klasa: sourceRow.Klasa ?? 2,
    Stanowisko: sourceRow.Stanowisko ?? 0,
    Informacje: sourceRow.Informacje ?? 'Kopia tymczasowa',
    TekstDoDruku: sourceRow.Kod || sourceRow.TekstDoDruku || sourceRow.nazwaSkladowej || sourceRow.Nazwa || '',
  };
}

function ensureMergeRecipeDraft(productName) {
  if (mergeRecipeDrafts.value[productName]) return;
  const sourceRows = productRowsByName.value[productName] ?? [];
  mergeRecipeDrafts.value = {
    ...mergeRecipeDrafts.value,
    [productName]: sourceRows.map((row) => createMergeDraftRow(productName, row)),
  };
}

function syncTemporaryProductSelection() {
  const hasRows = temporaryProductRows.value.length > 0;

  if (hasRows) {
    if (!selectedProducts.value.includes(TEMP_PRODUCT_KEY)) {
      selectedProducts.value = [...selectedProducts.value, TEMP_PRODUCT_KEY];
    }
    const currentQuantity = getMergeProductQuantity(TEMP_PRODUCT_KEY);
    mergeProductQuantities.value = {
      ...mergeProductQuantities.value,
      [TEMP_PRODUCT_KEY]: Math.max(1, currentQuantity),
    };
    return;
  }

  selectedProducts.value = selectedProducts.value.filter((name) => name !== TEMP_PRODUCT_KEY);
  const nextQuantities = { ...mergeProductQuantities.value };
  delete nextQuantities[TEMP_PRODUCT_KEY];
  mergeProductQuantities.value = nextQuantities;
  const nextModes = { ...mergeEditModes.value };
  delete nextModes[TEMP_PRODUCT_KEY];
  mergeEditModes.value = nextModes;
}

function resetTemporarySelection() {
  temporarySelectedRowIds.value = {};
  temporarySourceRowId.value = '';
}

function createProductLocalId() {
  const nextId = productLocalIdCounter;
  productLocalIdCounter += 1;
  return `product-row-${nextId}`;
}

function rememberProductPreview(fileName) {
  if (!fileName) return;
  window.sessionStorage.setItem(PRODUCT_PREVIEW_STORAGE_KEY, fileName);
}

function clearRememberedProductPreview() {
  window.sessionStorage.removeItem(PRODUCT_PREVIEW_STORAGE_KEY);
}

function clearProductFileActionMessage() {
  productFileActionMessage.value = '';
  productFileActionError.value = false;
}

function setProductFileActionMessage(message, isError = false) {
  productFileActionMessage.value = message;
  productFileActionError.value = isError;
}

function resetRenameState() {
  isRenameMode.value = false;
  renameDraft.value = '';
}

function reopenRememberedProductPreview() {
  const rememberedFileName = window.sessionStorage.getItem(PRODUCT_PREVIEW_STORAGE_KEY);
  if (!rememberedFileName || !productRowsMap.value[rememberedFileName]) return;
  activeTab.value = 'products';
  selectedProductName.value = rememberedFileName;
  isEditMode.value = false;
  editingRows.value = [];
  activeEditCell.value = null;
  clearRememberedProductPreview();
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const [, base64 = ''] = result.split(',');
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error('Nie udało się odczytać pliku.'));
    reader.readAsDataURL(file);
  });
}

async function postProductFileAction(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Operacja na pliku XLSX nie powiod?a si?.');
  }
  return data;
}

function buildProductFileUrl(fileName) {
  return `/api/products/file?fileName=${encodeURIComponent(fileName)}`;
}

function reloadProductsAfterFileAction(fileName = '') {
  if (fileName) {
    rememberProductPreview(fileName);
  } else {
    clearRememberedProductPreview();
  }
  window.location.reload();
}
function createEditableProductRow(fileName = "") {
  return {
    Nazwa: '',
    'Długość': '',
    'Grubość': '',
    'Szerokość': '',
    'Materiał': '',
    Kod: '',
    Grupa: '',
    Priorytet: '',
    'ilość': '',
    Wybijak: '',
    _sourceFile: fileName,
    _localId: createProductLocalId(),
    _originalRowData: {},
  };
}

function normalizeProductRows(fileName, headers, rows) {
  return rows
    .map((rowValues, index) => {
      const sourceRow = Array.isArray(rowValues) ? buildRowFromHeaders(headers, rowValues) : rowValues;
      const quantity = getCellValue(sourceRow, ['Ilość', 'ILOŚĆ', 'ILOSC', 'Ilosc']) || rowValues[5] || '';
      const name = getCellValue(sourceRow, ['Nazwa', 'TYTUŁ', 'TYTUL', 'Nazwa mebla']) || rowValues[0] || '';
      const length = getCellValue(sourceRow, ['Dł', 'DŁ', 'Dł. [mm]', 'DŁ. [mm]', 'DL', 'DL. [mm]', 'DŁUGOŚĆ', 'DLUGOSC', 'Dlugosc']) || rowValues[2] || '';
      const thickness = getCellValue(sourceRow, ['GR.', 'GR. [mm]', 'Grubosc']) || rowValues[3] || '';
      const width = getCellValue(sourceRow, ['Sz', 'SZER. [mm]', 'SZEROKOŚĆ', 'SZEROKOSC', 'Szerokosc']) || rowValues[4] || '';
      const material = getCellValue(sourceRow, ['Materiał', 'MATERIAŁ', 'MATERIAL', 'OPIS', 'gatunek drewna']) || rowValues[7] || '';
      const code = getCellValue(sourceRow, ['Kod', 'NR CZĘŚCI', 'NR CZESCI', 'Nadruk']) || rowValues[1] || rowValues[0] || '';
      const grupa = getCellValue(sourceRow, ['Grupa', 'GRUPA']) || '';
      const priorytet = getCellValue(sourceRow, ['Priorytet', 'PRIORYTET']) || '';

      return {
        Nazwa: name,
        'Długość': length,
        'Grubość': thickness,
        'Szerokość': width,
        'Materiał': material,
        Kod: code,
        Grupa: normalizeGroupValue(grupa),
        Priorytet: normalizePriorityValue(priorytet),
        'ilość': quantity,
        Wybijak: getCellValue(sourceRow, ['Wybijak']) || 0,
        _sourceFile: fileName,
        _rowIndex: index,
        _localId: createProductLocalId(),
        _originalRowData: { ...sourceRow },
      };
    })
    .filter((row) => row.Nazwa || row['Długość'] || row.Kod || Object.keys(row._originalRowData || {}).length > 0);
}

async function loadProductFiles() {
  productsLoading.value = true;
  const nextMap = {};

  try {
    const listResponse = await fetch(`/api/products/list?t=${Date.now()}`, { cache: 'no-store' });
    const listPayload = await listResponse.json().catch(() => ({}));
    if (!listResponse.ok) {
      throw new Error(listPayload.error || 'Nie udało się pobrać listy plików.');
    }

    productFiles.value = (Array.isArray(listPayload.files) ? listPayload.files : []).map((fileName) => ({
      name: fileName,
      url: buildProductFileUrl(fileName),
    }));

    for (const file of productFiles.value) {
      const requestUrl = `${file.url}&t=${Date.now()}`;
      const response = await fetch(requestUrl, { cache: 'no-store' });
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      const headers = matrix[0] || [];
      const rows = matrix.slice(1);
      nextMap[file.name] = normalizeProductRows(file.name, headers, rows);
    }
    productRowsMap.value = nextMap;
    reopenRememberedProductPreview();
  } finally {
    productsLoading.value = false;
  }
}

function sortProductsBy(column) {
  if (productSortKey.value !== column) {
    productSortKey.value = column;
    productSortDirection.value = 1;
    return;
  }

  if (productSortDirection.value === 1) {
    productSortDirection.value = -1;
    return;
  }

  productSortKey.value = '';
  productSortDirection.value = 1;
}

function sortNestedProductsBy(column) {
  if (nestedProductSortKey.value !== column) {
    nestedProductSortKey.value = column;
    nestedProductSortDirection.value = 1;
    return;
  }

  if (nestedProductSortDirection.value === 1) {
    nestedProductSortDirection.value = -1;
    return;
  }

  nestedProductSortKey.value = '';
  nestedProductSortDirection.value = 1;
}

function sortMergePreviewProductsBy(column) {
  if (column === 'Nr') return;

  if (mergePreviewSortKey.value !== column) {
    mergePreviewSortKey.value = column;
    mergePreviewSortDirection.value = 1;
    return;
  }

  if (mergePreviewSortDirection.value === 1) {
    mergePreviewSortDirection.value = -1;
    return;
  }

  mergePreviewSortKey.value = '';
  mergePreviewSortDirection.value = 1;
}

function sortMergeRecipeBy(column) {
  if (mergeRecipeSortKey.value !== column) {
    mergeRecipeSortKey.value = column;
    mergeRecipeSortDirection.value = 1;
    return;
  }

  if (mergeRecipeSortDirection.value === 1) {
    mergeRecipeSortDirection.value = -1;
    return;
  }

  mergeRecipeSortKey.value = '';
  mergeRecipeSortDirection.value = 1;
}

function selectProduct(row) {
  selectedProductName.value = row.nazwaProduktu;
  isEditMode.value = false;
  saveMessage.value = '';
  saveError.value = false;
  nestedProductSortKey.value = '';
  nestedProductSortDirection.value = 1;
  resetRenameState();
  clearProductFileActionMessage();
  clearRememberedProductPreview();
}

function openConfirmDialog(action, message) {
  confirmDialog.value = {
    visible: true,
    action,
    message,
  };
}

function cancelConfirmAction() {
  confirmDialog.value = {
    visible: false,
    action: '',
    message: '',
  };
}

function resetProductModalState() {
  selectedProductName.value = '';
  isEditMode.value = false;
  editingRows.value = [];
  saveMessage.value = '';
  saveError.value = false;
  activeEditCell.value = null;
  resetRenameState();
  cancelConfirmAction();
  clearRememberedProductPreview();
}

function startRenameSelectedProductFile() {
  if (!selectedProductName.value || isFileActionLoading.value || isEditMode.value) return;
  renameDraft.value = selectedProductName.value;
  isRenameMode.value = true;
  clearProductFileActionMessage();
}

function cancelRenameSelectedProductFile() {
  resetRenameState();
}

function triggerImportExcel() {
  if (isFileActionLoading.value) return;
  fileImportInput.value?.click();
}

async function handleImportExcel(event) {
  const [file] = event.target.files || [];
  event.target.value = '';
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    setProductFileActionMessage('Możesz importować tylko pliki .xlsx.', true);
    return;
  }

  isFileActionLoading.value = true;
  clearProductFileActionMessage();

  try {
    const contentBase64 = await readFileAsBase64(file);
    const result = await postProductFileAction('/api/products/import', {
      fileName: file.name,
      contentBase64,
    });
    reloadProductsAfterFileAction(result.fileName || file.name);
  } catch (error) {
    setProductFileActionMessage(error.message || 'Nie udało się zaimportować pliku.', true);
  } finally {
    isFileActionLoading.value = false;
  }
}

function exportSelectedProductFile() {
  if (!selectedProductFile.value || isFileActionLoading.value) return;
  const link = document.createElement('a');
  link.href = buildProductFileUrl(selectedProductFile.value.name);
  link.download = selectedProductFile.value.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function duplicateSelectedProductFile() {
  if (!selectedProductName.value || isFileActionLoading.value) return;

  isFileActionLoading.value = true;
  clearProductFileActionMessage();

  try {
    const result = await postProductFileAction('/api/products/duplicate', {
      fileName: selectedProductName.value,
    });
    reloadProductsAfterFileAction(result.fileName || '');
  } catch (error) {
    setProductFileActionMessage(error.message || 'Nie udało się zduplikować pliku.', true);
  } finally {
    isFileActionLoading.value = false;
  }
}

async function submitRenameSelectedProductFile() {
  if (!selectedProductName.value || isFileActionLoading.value) return;
  if (!hasValidRenameExtension.value) {
    setProductFileActionMessage('Nazwa pliku po zmianie musi kończyć się na .xlsx.', true);
    return;
  }
  if (!canSubmitRename.value) return;

  isFileActionLoading.value = true;
  clearProductFileActionMessage();

  try {
    const result = await postProductFileAction('/api/products/rename', {
      fileName: selectedProductName.value,
      nextFileName: renameDraft.value.trim(),
    });
    resetRenameState();
    reloadProductsAfterFileAction(result.fileName || '');
  } catch (error) {
    setProductFileActionMessage(error.message || 'Nie udało się zmienić nazwy pliku.', true);
  } finally {
    isFileActionLoading.value = false;
  }
}

function requestDeleteSelectedProductFile() {
  if (!selectedProductName.value || isFileActionLoading.value) return;
  openConfirmDialog('delete-file', `Na pewno chcesz usunąć plik ${selectedProductName.value}?`);
}

async function executeDeleteSelectedProductFile() {
  if (!selectedProductName.value || isFileActionLoading.value) return;

  const fileName = selectedProductName.value;
  isFileActionLoading.value = true;
  clearProductFileActionMessage();

  try {
    await postProductFileAction('/api/products/delete', { fileName });
    resetProductModalState();
    reloadProductsAfterFileAction('');
  } catch (error) {
    setProductFileActionMessage(error.message || 'Nie udało się usunąć pliku.', true);
  } finally {
    isFileActionLoading.value = false;
  }
}

function performCloseProductModal() {
  resetProductModalState();
}

function resetEditStateAfterSave() {
  isEditMode.value = false;
  editingRows.value = [];
  activeEditCell.value = null;
  cancelConfirmAction();
}

function closeProductModal() {
  if (isEditMode.value) {
    openConfirmDialog('close', 'Na pewno chcesz zamknąć panel bez zapisywania zmian?');
    return;
  }
  performCloseProductModal();
}

function toggleEditMode() {
  if (isEditMode.value) {
    isEditMode.value = false;
    editingRows.value = [];
    saveMessage.value = '';
    saveError.value = false;
    activeEditCell.value = null;
    return;
  }
  editingRows.value = JSON.parse(JSON.stringify(selectedProductRows.value));
  isEditMode.value = true;
  saveMessage.value = '';
  saveError.value = false;
}

function showRowLimitMessage() {
  saveError.value = true;
  saveMessage.value = `Maksymalnie ${MAX_PRODUCT_ROWS} pozycji w pliku.`;
}

function addProductRow() {
  if (editingRows.value.length >= MAX_PRODUCT_ROWS) {
    showRowLimitMessage();
    return;
  }
  editingRows.value.push(createEditableProductRow(selectedProductName.value));
  saveMessage.value = '';
  saveError.value = false;
}

function duplicateProductRow(localId) {
  if (editingRows.value.length >= MAX_PRODUCT_ROWS) {
    showRowLimitMessage();
    return;
  }
  const rowIndex = editingRows.value.findIndex((item) => item._localId === localId);
  if (rowIndex === -1) return;
  const duplicate = JSON.parse(JSON.stringify(editingRows.value[rowIndex]));
  duplicate._localId = createProductLocalId();
  editingRows.value.splice(rowIndex + 1, 0, duplicate);
  saveMessage.value = '';
  saveError.value = false;
}

function removeProductRow(localId) {
  editingRows.value = editingRows.value.filter((item) => item._localId !== localId);
  saveMessage.value = '';
  saveError.value = false;
}

function updateEditedCell(localId, column, value) {
  const row = editingRows.value.find((item) => item._localId === localId);
  if (!row) return;
  const normalizedValue = normalizeEditableCellValue(column, value);

  if (column === 'Grupa') {
    row.Grupa = normalizedValue;
    row.Priorytet = normalizedValue
      ? getSmallestAvailablePriority(editingRows.value, normalizedValue, localId)
      : '';
    return;
  }

  if (column === 'Priorytet') {
    if (!getRowGroupValue(row)) {
      row.Priorytet = '';
      return;
    }

    const availablePriorities = getPriorityDropdownOptions(editingRows.value, row);
    row.Priorytet = availablePriorities.includes(normalizedValue) ? normalizedValue : '';
    return;
  }

  row[column] = normalizedValue;
}

function getEditInputStyle(value, localId, column) {
  const length = String(value ?? '').length;
  const isActive = activeEditCell.value === `${localId}:${column}`;
  const isWideColumn = ['Nazwa', 'Kod'].includes(column);
  const minWidth = isWideColumn ? 10 : 4;
  const maxWidth = isWideColumn ? 24 : 10;
  const activePadding = isWideColumn ? 2 : 1;
  const chWidth = isActive
    ? Math.max(minWidth, Math.min(length + activePadding, maxWidth + 4))
    : Math.max(minWidth, Math.min(length + 1, maxWidth));
  return { width: `${chWidth}ch` };
}

function getMergeEditInputStyle(column, value) {
  const length = String(value ?? '').length;
  const isWideColumn = ['nazwaSkladowej', 'TekstDoDruku'].includes(column);
  const minWidth = isWideColumn ? 10 : 4;
  const maxWidth = isWideColumn ? 24 : 10;
  const chWidth = Math.max(minWidth, Math.min(length + 1, maxWidth));
  return { width: `${chWidth}ch` };
}

async function saveProductChanges() {
  if (!selectedProductName.value || !isEditMode.value) return;
  openConfirmDialog(
    'save',
    `Na pewno chcesz zapisać zmiany?
Zmiany będą nieodwracalne.
Edycja dotyczy głównych plików wsadowych.`,
  );
}

async function executeSaveProductChanges() {
  if (!selectedProductName.value || !isEditMode.value) return;
  rememberProductPreview(selectedProductName.value);
  isSaving.value = true;
  saveMessage.value = '';
  saveError.value = false;

  try {
    const response = await fetch('/api/products/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: selectedProductName.value,
        rows: editingRows.value,
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || 'Nie udało się zapisać zmian.');
    }

    productRowsMap.value = {
      ...productRowsMap.value,
      [selectedProductName.value]: JSON.parse(JSON.stringify(editingRows.value)),
    };
    resetEditStateAfterSave();
    saveMessage.value = 'Zmiany zapisane do pliku XLSX.';
  } catch (error) {
    clearRememberedProductPreview();
    saveError.value = true;
    saveMessage.value = error.message || 'Nie udało się zapisać zmian.';
  } finally {
    isSaving.value = false;
  }
}

function confirmAction() {
  const action = confirmDialog.value.action;
  cancelConfirmAction();

  if (action === 'close') {
    performCloseProductModal();
    return;
  }
  if (action === 'save') {
    executeSaveProductChanges();
    return;
  }
  if (action === 'delete-file') {
    executeDeleteSelectedProductFile();
  }
}

function getMergeProductQuantity(productName) {
  const rawValue = mergeProductQuantities.value[productName];
  const parsedValue = Number.parseInt(String(rawValue ?? 0), 10);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
}

function isMergeProductSelected(productName) {
  return getMergeProductQuantity(productName) > 0;
}

function getMergeCheckboxKey(productName) {
  if (mergeCheckboxResetProduct.value !== productName) return productName;
  return `${productName}-${mergeCheckboxResetVersion.value}`;
}

function clearMergeMessage() {
  mergeAlert.value = {
    visible: false,
    message: '',
  };
}

function showMergeLimitMessage() {
  mergeAlert.value = {
    visible: true,
    message: `Nie można dodać produktu, bo został osiągnięty limit ${MAX_PRODUCT_ROWS} elementów.`,
  };
}

function closeMergeAlert() {
  clearMergeMessage();
}

function toggleMergeSelectionPanel() {
  isMergeSelectionCollapsed.value = !isMergeSelectionCollapsed.value;
}

function openSaveRecipeDialog() {
  if (!recipeRows.value.length) return;
  saveRecipeDialog.value = {
    visible: true,
    name: '',
    error: '',
  };
}

function closeSaveRecipeDialog() {
  saveRecipeDialog.value = {
    visible: false,
    name: '',
    error: '',
  };
}

async function submitSaveRecipe() {
  const nextName = saveRecipeDialog.value.name.trim();
  if (!nextName) {
    saveRecipeDialog.value = {
      ...saveRecipeDialog.value,
      error: 'Podaj nazwę receptury.',
    };
    return;
  }

  if (savedRecipeCatalog.value.some((entry) => entry.nazwaReceptury === nextName)) {
    saveRecipeDialog.value = {
      ...saveRecipeDialog.value,
      error: 'Receptura o tej nazwie już istnieje.',
    };
    return;
  }

  const groupingValidationError = getSequentialGroupValidationError(recipeRows.value);
  if (groupingValidationError) {
    saveRecipeDialog.value = {
      ...saveRecipeDialog.value,
      error: groupingValidationError,
    };
    return;
  }

  const rowsToSave = recipeRows.value.map((row) => ({
    ...row,
    _localId: undefined,
    _baseIlosc: undefined,
    nazwaProduktu: getMergeProductDisplayName(row.nazwaProduktu),
    nazwaReceptury: nextName,
  }));

  try {
    const response = await fetch('/api/recipes/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipe: {
          idRap: Date.now(),
          nazwaReceptury: nextName,
          CzasOdloz: new Date().toLocaleString('pl-PL'),
          Usr: 'Default',
          rows: rowsToSave,
        },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Nie udało się zapisać receptury.');
    }

    const savedRecipe = payload.recipe ?? {
      nazwaReceptury: nextName,
      rows: rowsToSave,
    };

    savedRecipeCatalog.value = [...savedRecipeCatalog.value, savedRecipe];
    selectedRecipe.value = nextName;
    selectedRecipePreviewName.value = nextName;
    closeSaveRecipeDialog();
  } catch (error) {
    saveRecipeDialog.value = {
      ...saveRecipeDialog.value,
      error: error.message || 'Nie udało się zapisać receptury.',
    };
  }
}

function rejectMergeProductSelection(productName) {
  const targetProduct = productName || lastMergeInteractedProduct.value;
  selectedProducts.value = selectedProducts.value.filter((name) => name !== targetProduct);
  mergeProductQuantities.value = {
    ...mergeProductQuantities.value,
    [targetProduct]: 0,
  };
  mergeCheckboxResetProduct.value = targetProduct;
  mergeCheckboxResetVersion.value += 1;
  showMergeLimitMessage();
}

function canSelectMergeProduct(productName) {
  if (selectedProducts.value.includes(productName)) return true;
  const nextCount = selectedMergeRowCount.value + (productRowsByName.value[productName]?.length ?? 0);
  return nextCount <= MAX_PRODUCT_ROWS;
}

function updateMergeProductQuantity(productName, value) {
  const normalizedText = String(value ?? '')
    .replace(/[^\d]/g, '')
    .trim();
  const parsedValue = normalizedText ? Number.parseInt(normalizedText, 10) : 0;
  const normalizedValue = Number.isFinite(parsedValue) ? Math.min(Math.max(parsedValue, 0), 500) : 0;

  if (normalizedValue > 0 && !selectedProducts.value.includes(productName) && !canSelectMergeProduct(productName)) {
    rejectMergeProductSelection(productName);
    return;
  }

  mergeProductQuantities.value = {
    ...mergeProductQuantities.value,
    [productName]: normalizedValue,
  };

  if (normalizedValue > 0 && !selectedProducts.value.includes(productName)) {
    ensureMergeRecipeDraft(productName);
    selectedProducts.value = [...selectedProducts.value, productName];
    clearMergeMessage();
  }

  if (normalizedValue === 0 && selectedProducts.value.includes(productName)) {
    selectedProducts.value = selectedProducts.value.filter((name) => name !== productName);
    const nextDrafts = { ...mergeRecipeDrafts.value };
    delete nextDrafts[productName];
    mergeRecipeDrafts.value = nextDrafts;
    const nextEditModes = { ...mergeEditModes.value };
    delete nextEditModes[productName];
    mergeEditModes.value = nextEditModes;
    mergeEditingCell.value = null;
    clearMergeMessage();
  }
}

async function loadSavedRecipes() {
  const response = await fetch(`/api/recipes?t=${Date.now()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Nie udało się pobrać zapisanych receptur.');
  }

  const recipes = Array.isArray(payload.recipes) ? payload.recipes : [];
  savedRecipeCatalog.value = recipes;

  if (recipes.length) {
    const hasSelectedRecipe = recipes.some((entry) => entry.nazwaReceptury === selectedRecipe.value);
    const hasSelectedPreview = recipes.some((entry) => entry.nazwaReceptury === selectedRecipePreviewName.value);
    const fallbackName = recipes[0]?.nazwaReceptury || '';

    if (!hasSelectedRecipe) {
      selectedRecipe.value = fallbackName;
    }
    if (!hasSelectedPreview) {
      selectedRecipePreviewName.value = fallbackName;
    }
    return;
  }

  selectedRecipe.value = '';
  selectedRecipePreviewName.value = '';
}

function stepMergeProductQuantity(productName, delta) {
  lastMergeInteractedProduct.value = productName;
  const nextValue = Math.min(500, Math.max(0, getMergeProductQuantity(productName) + delta));
  updateMergeProductQuantity(productName, nextValue);
}

function removeMergeProduct(productName) {
  if (productName === TEMP_PRODUCT_KEY) {
    clearTemporaryProduct();
    return;
  }
  lastMergeInteractedProduct.value = productName;
  updateMergeProductQuantity(productName, 0);
}

function handleMergeCheckboxChange(productName, isChecked) {
  lastMergeInteractedProduct.value = productName;
  toggleMergeProduct(productName, isChecked);
}

function toggleMergeProduct(productName, isChecked) {
  if (isChecked) {
    if (!canSelectMergeProduct(productName)) {
      rejectMergeProductSelection(productName);
      return;
    }
    selectedProducts.value = selectedProducts.value.includes(productName)
      ? selectedProducts.value
      : [...selectedProducts.value, productName];
    ensureMergeRecipeDraft(productName);
    mergeProductQuantities.value = {
      ...mergeProductQuantities.value,
      [productName]: Math.max(1, getMergeProductQuantity(productName)),
    };
    clearMergeMessage();
    return;
  }

  selectedProducts.value = selectedProducts.value.filter((name) => name !== productName);
  const nextDrafts = { ...mergeRecipeDrafts.value };
  delete nextDrafts[productName];
  mergeRecipeDrafts.value = nextDrafts;
  const nextEditModes = { ...mergeEditModes.value };
  delete nextEditModes[productName];
  mergeEditModes.value = nextEditModes;
  mergeEditingCell.value = null;
  mergeProductQuantities.value = {
    ...mergeProductQuantities.value,
    [productName]: 0,
  };
  clearMergeMessage();
}

function resetMergeSelection() {
  selectedProducts.value = [];
  mergeProductQuantities.value = {};
  collapsedRecipeGroups.value = {};
  mergeRecipeDrafts.value = {};
  mergeEditModes.value = {};
  mergeEditingCell.value = null;
  mergeRecipeSortKey.value = '';
  mergeRecipeSortDirection.value = 1;
  mergeGroupFilter.value = '';
  mergePreviewProductName.value = '';
  temporaryProductName.value = 'Produkt dodatkowy';
  temporarySourceProductName.value = '';
  resetTemporarySelection();
  isSingleElementModalOpen.value = false;
  clearMergeMessage();
}

function toggleRecipeGroup(productName) {
  collapsedRecipeGroups.value = {
    ...collapsedRecipeGroups.value,
    [productName]: !isRecipeGroupCollapsed(productName),
  };
}

function isRecipeGroupCollapsed(productName) {
  const savedState = collapsedRecipeGroups.value[productName];
  return savedState === undefined ? true : Boolean(savedState);
}

function selectRecipePreview(row) {
  selectedRecipePreviewName.value = row.nazwaReceptury;
}

function openMergeProductPreview(productName) {
  mergePreviewSortKey.value = '';
  mergePreviewSortDirection.value = 1;
  mergePreviewProductName.value = productName;
}

function closeMergeProductPreview() {
  mergePreviewSortKey.value = '';
  mergePreviewSortDirection.value = 1;
  mergePreviewProductName.value = '';
}

function handleGlobalEscape(event) {
  if (event.key !== 'Escape') return;

  if (temporarySourceChangeDialog.value.visible) {
    cancelTemporarySourceChange();
    return;
  }

  if (isSingleElementModalOpen.value) {
    closeSingleElementModal();
    return;
  }

  if (mergePreviewProductName.value) {
    closeMergeProductPreview();
    return;
  }

  if (saveRecipeDialog.value.visible) {
    closeSaveRecipeDialog();
    return;
  }

  if (mergeAlert.value.visible) {
    closeMergeAlert();
    return;
  }

  if (confirmDialog.value.visible) {
    cancelConfirmAction();
    return;
  }

  if (selectedProductName.value) {
    closeProductModal();
  }
}

function openSingleElementModal() {
  if (!availableProductNames.value.length) return;
  if (!temporarySourceProductName.value || !availableProductNames.value.includes(temporarySourceProductName.value)) {
    temporarySourceProductName.value = availableProductNames.value[0] || '';
  }
  resetTemporarySelection();
  isSingleElementModalOpen.value = true;
}

function closeSingleElementModal() {
  isSingleElementModalOpen.value = false;
  resetTemporarySelection();
  cancelTemporarySourceChange();
}

function isTemporaryRowSelected(localId) {
  return Boolean(temporarySelectedRowIds.value[localId]);
}

function cancelTemporarySourceChange() {
  temporarySourceChangeDialog.value = {
    visible: false,
    nextProductName: '',
  };
}

function finalizeTemporarySourceProductChange(nextProductName) {
  temporarySourceProductName.value = nextProductName;
  resetTemporarySelection();
  cancelTemporarySourceChange();
}

function handleTemporarySourceProductChange(nextProductName) {
  if (nextProductName === temporarySourceProductName.value) return;

  if (selectedTemporaryRowCount.value > 0) {
    temporarySourceChangeDialog.value = {
      visible: true,
      nextProductName,
    };
    return;
  }

  finalizeTemporarySourceProductChange(nextProductName);
}

function handleTemporaryRowCheckboxChange(localId, isChecked) {
  if (isChecked && selectedTemporaryRowCount.value >= remainingRecipeCapacity.value) {
    showMergeLimitMessage();
    return;
  }

  temporarySelectedRowIds.value = {
    ...temporarySelectedRowIds.value,
    [localId]: isChecked,
  };
}

function addSelectedTemporaryRows({ closeModal = true } = {}) {
  if (!selectedTemporaryRowCount.value) return;
  if (selectedTemporaryRowCount.value > remainingRecipeCapacity.value) {
    showMergeLimitMessage();
    return;
  }

  const selectedIds = Object.entries(temporarySelectedRowIds.value)
    .filter(([, isSelected]) => isSelected)
    .map(([localId]) => localId);
  const rowsToAdd = temporarySourceRowOptions.value
    .filter((row) => selectedIds.includes(row._localId))
    .map((row) => createMergeDraftRow(TEMP_PRODUCT_KEY, row));

  mergeRecipeDrafts.value = {
    ...mergeRecipeDrafts.value,
    [TEMP_PRODUCT_KEY]: [...temporaryProductRows.value, ...rowsToAdd],
  };
  syncTemporaryProductSelection();
  if (closeModal) {
    closeSingleElementModal();
  } else {
    resetTemporarySelection();
  }
  clearMergeMessage();
}

function discardTemporarySourceSelectionAndChange() {
  finalizeTemporarySourceProductChange(temporarySourceChangeDialog.value.nextProductName);
}

function applyTemporarySourceChangeWithSelectedRows() {
  const nextProductName = temporarySourceChangeDialog.value.nextProductName;
  addSelectedTemporaryRows({ closeModal: false });
  finalizeTemporarySourceProductChange(nextProductName);
}

function clearTemporaryProduct() {
  const nextDrafts = { ...mergeRecipeDrafts.value };
  delete nextDrafts[TEMP_PRODUCT_KEY];
  mergeRecipeDrafts.value = nextDrafts;
  const nextModes = { ...mergeEditModes.value };
  delete nextModes[TEMP_PRODUCT_KEY];
  mergeEditModes.value = nextModes;
  mergeEditingCell.value = null;
  resetTemporarySelection();
  isSingleElementModalOpen.value = false;
  syncTemporaryProductSelection();
}

function isMergeProductEditMode(productName) {
  return Boolean(mergeEditModes.value[productName]);
}

function toggleMergeProductEditMode(productName) {
  mergeEditModes.value = {
    ...mergeEditModes.value,
    [productName]: !isMergeProductEditMode(productName),
  };
  mergeEditingCell.value = null;
}

function updateMergeRecipeCell(productName, localId, column, value) {
  const rows = mergeRecipeDrafts.value[productName] ?? [];
  const row = rows.find((item) => item._localId === localId);
  if (!row) return;
  const allMergeRows = [...getGlobalMergeDraftRows(productName), ...rows];

  if (column === 'ilosc') {
    const normalizedValue = Number(String(value ?? '').replace(',', '.'));
    const multiplier = Math.max(getMergeProductQuantity(productName), 1);
    row._baseIlosc = Number.isFinite(normalizedValue) ? normalizedValue / multiplier : 0;
    return;
  }

  const normalizedValue = normalizeEditableCellValue(column, value);

  if (column === 'grupa') {
    row.grupa = normalizedValue;
    row.priorytet = normalizedValue
      ? getSmallestAvailablePriority(allMergeRows, normalizedValue, localId)
      : '';
    return;
  }

  if (column === 'priorytet') {
    if (!getRowGroupValue(row)) {
      row.priorytet = '';
      return;
    }

    const availablePriorities = getPriorityDropdownOptions(allMergeRows, row);
    row.priorytet = availablePriorities.includes(normalizedValue) ? normalizedValue : '';
    return;
  }

  row[column] = normalizedValue;
}

function addMergeRecipeRow(productName) {
  const currentRows = mergeRecipeDrafts.value[productName] ?? [];
  if (selectedMergeRowCount.value >= MAX_PRODUCT_ROWS) {
    showMergeLimitMessage();
    return;
  }

  mergeRecipeDrafts.value = {
    ...mergeRecipeDrafts.value,
    [productName]: [...currentRows, createMergeDraftRow(productName)],
  };
}

function duplicateMergeRecipeRow(productName, localId) {
  if (selectedMergeRowCount.value >= MAX_PRODUCT_ROWS) {
    showMergeLimitMessage();
    return;
  }

  const currentRows = mergeRecipeDrafts.value[productName] ?? [];
  const rowIndex = currentRows.findIndex((item) => item._localId === localId);
  if (rowIndex === -1) return;

  const duplicate = {
    ...JSON.parse(JSON.stringify(currentRows[rowIndex])),
    _localId: createProductLocalId(),
  };

  mergeRecipeDrafts.value = {
    ...mergeRecipeDrafts.value,
    [productName]: [...currentRows.slice(0, rowIndex + 1), duplicate, ...currentRows.slice(rowIndex + 1)],
  };
}

function removeMergeRecipeRow(productName, localId) {
  const currentRows = mergeRecipeDrafts.value[productName] ?? [];
  mergeRecipeDrafts.value = {
    ...mergeRecipeDrafts.value,
    [productName]: currentRows.filter((item) => item._localId !== localId),
  };
  mergeEditingCell.value = null;
  if (productName === TEMP_PRODUCT_KEY) {
    syncTemporaryProductSelection();
  }
}

async function loadRecipeToWorkMain() {
  const savedRecipeRows =
    recipeCatalogEntries.value.find((entry) => entry.nazwaReceptury === selectedRecipe.value)?.rows ?? [];
  const source = savedRecipeRows;
  if (!source.length) return;

  const nextWorkRows = source.map((row, index) => ({
    id: index + 1,
    Kod: row.Kod || '',
    Nazwa: row.nazwaSkladowej || row.Nazwa,
    Material: row.material || row.Material,
    Przekroj: `${String(row.grubosc || row.gr || 0).padStart(3, '0')}x${String(row.szerokosc || row.szer || 0).padStart(3, '0')}`,
    Dlugosc: row.dlugosc || row.Dlugosc,
    Sztuk: row.ilosc || row.Sztuk,
    WykonaneSztuki: row.iloscWykonana || row.WykonaneSztuki || 0,
    Wybijak: row.wybijak || row.Wybijak || 0,
    Rodzaj: row.rodzaj || row.Rodzaj || '',
    TekstDoDruku: row.TekstDoDruku,
    idrec: row.idReceptury || row.idrec || 0,
    ids: row.idSkladowej ?? row.ids ?? index,
    CzasUtw: new Date().toLocaleString('pl-PL'),
    Usr: 'Default',
    NazwaRec: selectedRecipe.value,
    gr: row.grubosc || row.gr,
    szer: row.szerokosc || row.szer,
    Klasa: row.Klasa,
    Stanowisko: row.Stanowisko,
    Informacje: row.Informacje,
  }));

  const payloadRows = nextWorkRows.map((row) => ({
    id: row.id,
    Material: row.Material ?? '',
    Przekroj: row.Przekroj ?? '',
    Dlugosc: row.Dlugosc ?? 0,
    Sztuk: row.Sztuk ?? 0,
    Wybijaki: row.Wybijak ?? 0,
    TekstDoDruku: row.TekstDoDruku ?? '',
    Klasa: row.Klasa ?? 0,
    Nazwa: row.Nazwa ?? '',
    zliczonaIloscIn: row.Sztuk ?? 0,
  }));

  isWorkUploadLoading.value = true;
  workUploadMessage.value = '';
  workUploadError.value = false;

  try {
    const response = await fetch('/api/workmain/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: payloadRows }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Nie udało się wgrać danych do WorkMain.');
    }

    workRows.value = nextWorkRows;
    workUploadMessage.value = `Wgrano ${payload.insertedRows ?? payloadRows.length} wierszy do WorkMain.`;
  } catch (error) {
    workUploadError.value = true;
    workUploadMessage.value = error.message || 'Nie udało się wgrać danych do WorkMain.';
  } finally {
    isWorkUploadLoading.value = false;
  }
}

onMounted(() => {
  updateClock();
  timerId = window.setInterval(updateClock, 1000);
  window.addEventListener('keydown', handleGlobalEscape);
  loadProductFiles();
  loadSavedRecipes();
});

watch(availableMergeGroups, (groups) => {
  if (mergeGroupFilter.value && !groups.includes(mergeGroupFilter.value)) {
    mergeGroupFilter.value = '';
  }
});

onUnmounted(() => {
  window.clearInterval(timerId);
  window.removeEventListener('keydown', handleGlobalEscape);
});

const StatPill = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number], required: true },
  },
  setup(props) {
    return () =>
      h('div', { class: 'stat-pill' }, [h('span', { class: 'stat-label' }, props.label), h('strong', props.value)]);
  },
});

const DataTable = defineComponent({
  props: {
    columns: { type: Array, required: true },
    rows: { type: Array, required: true },
    labels: { type: Object, default: () => ({}) },
    emptyText: { type: String, default: 'Brak danych' },
    externalSortKey: { type: String, default: '' },
    externalSortDirection: { type: Number, default: 1 },
  },
  emits: ['row-click', 'header-click'],
  setup(props, { emit }) {
    const sortKey = ref('');
    const sortDirection = ref(1);

    const sortedRows = computed(() => {
      if (props.externalSortKey) return props.rows;
      const rows = [...props.rows];
      if (!sortKey.value) return rows;
      return rows.sort((a, b) => compareValues(a[sortKey.value], b[sortKey.value]) * sortDirection.value);
    });

    function sortBy(column) {
      if (props.externalSortKey) {
        emit('header-click', column);
        return;
      }
      if (sortKey.value !== column) {
        sortKey.value = column;
        sortDirection.value = 1;
        return;
      }

      if (sortDirection.value === 1) {
        sortDirection.value = -1;
        return;
      }

      sortKey.value = '';
      sortDirection.value = 1;
    }

    function isSorted(column) {
      return props.externalSortKey ? props.externalSortKey === column : sortKey.value === column;
    }

    function currentDirection() {
      return props.externalSortKey ? props.externalSortDirection : sortDirection.value;
    }

    return () =>
      h('div', { class: 'table-wrap' }, [
        h('table', { class: 'data-table' }, [
          h(
            'thead',
            h(
              'tr',
              props.columns.map((column) =>
                h(
                  'th',
                  {
                    onClick: () => sortBy(column),
                    class: { sorted: isSorted(column) },
                  },
                  [
                    props.labels[column] ?? column,
                    isSorted(column) ? h('span', { class: 'sort-mark' }, currentDirection() > 0 ? '▲' : '▼') : null,
                  ],
                ),
              ),
            ),
          ),
          h(
            'tbody',
            sortedRows.value.length
              ? sortedRows.value.map((row) =>
                  h(
                    'tr',
                    { onClick: () => emit('row-click', row) },
                    props.columns.map((column) => h('td', row[column] ?? '')),
                  ),
                )
              : h('tr', [h('td', { colspan: props.columns.length, class: 'empty-cell' }, props.emptyText)]),
          ),
        ]),
      ]);
  },
});
</script>

