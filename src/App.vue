<template>
  <div class="app-layout" :class="{ 'animations-disabled': !animationsEnabled }">
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
          <button
            class="settings-gear-btn"
            :class="{ active: isSettingsPanelOpen }"
            type="button"
            title="Ustawienia"
            aria-label="Otwórz ustawienia"
            @click="toggleSettingsPanel"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.18 7.18 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.8a.5.5 0 0 0 .49-.42l.36-2.54c.58-.23 1.13-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
              />
            </svg>
          </button>
          <div class="connection-badge" :class="databaseConnectionBadgeClass">
            <div class="conn-dot"></div>
            {{ databaseConnectionLabel }}
          </div>
          <div class="connection-badge" :class="machineStatusBadgeClass">
            <div class="conn-dot"></div>
            {{ machineStatusLabel }}
          </div>
          <span class="timestamp">{{ currentTime }}</span>
        </div>
      </header>

      <div v-if="isSettingsPanelOpen" class="settings-panel-overlay" @click.self="closeSettingsPanel">
        <section class="settings-panel panel" @click.stop>
          <div class="panel-header">
            <span>Ustawienia</span>
            <div class="panel-actions">
              <button class="tool-btn compact" @click="closeSettingsPanel">Zamknij</button>
            </div>
          </div>
          <div class="settings-panel-body">
            <label class="settings-toggle-row">
              <div class="settings-toggle-copy">
                <strong>Animacje interfejsu</strong>
                <span>Włącza lub wyłącza animacje rozwijania, przejść i efektów pomocniczych.</span>
              </div>
              <button
                class="settings-switch"
                :class="{ enabled: animationsEnabled }"
                type="button"
                :aria-pressed="animationsEnabled ? 'true' : 'false'"
                @click="toggleAnimationsEnabled"
              >
                <span class="settings-switch-thumb"></span>
              </button>
            </label>
          </div>
        </section>
      </div>

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
          <div class="filter-actions">
            <button class="tool-btn" :class="{ primary: activeTab === 'reports' }" @click="activeTab = 'reports'">
              Raporty
            </button>
            <button class="tool-btn" :class="{ primary: isConfigPanelOpen }" @click="toggleConfigPanel">
              Config
            </button>
          </div>
        </nav>

        <div v-if="isConfigPanelOpen" class="config-panel-overlay" @click.self="toggleConfigPanel">
          <section class="config-panel panel" @click.stop>
            <div class="panel-header">
              <span>Config</span>
              <div class="panel-actions">
                <button class="tool-btn compact primary" :disabled="!isConfigLoaded || !isConfigDirty || isConfigSaving" @click="saveConfig">
                  {{ isConfigSaving ? 'Zapisywanie...' : 'Zapisz' }}
                </button>
                <button class="tool-btn compact" @click="toggleConfigPanel">Zamknij</button>
              </div>
            </div>
            <div class="config-panel-body">
              <div v-if="configSaveMessage" data-error-anchor="config-save" class="save-status config-save-status" :class="{ error: configSaveError }">{{ configSaveMessage }}</div>
              <div class="config-tabs">
                <button
                  v-for="tab in configTabs"
                  :key="tab.id"
                  class="tool-btn compact"
                  :class="{ primary: activeConfigTab === tab.id }"
                  @click="requestConfigTabChange(tab.id)"
                >
                  {{ tab.label }}
                </button>
              </div>

              <div v-if="activeConfigTab === 'stations'" class="config-section">
                <div class="config-section-header">
                  <span class="panel-caption">Konfiguracja zestawów wybijaków</span>
                  <button class="tool-btn compact primary" :disabled="configStations.length >= maxConfiguredStationCount" @click="addConfigStation">Dodaj zestaw</button>
                </div>

                <div v-if="configStations.length" class="config-stations">
                  <article v-for="(station, stationIndex) in configStations" :key="station.id" class="config-station-card">
                    <div class="config-station-header">
                      <div class="config-station-title-wrap">
                        <span class="config-station-title">{{ getConfigStationLabel(stationIndex) }}</span>
                      </div>
                      <div class="config-station-actions">
                        <button class="tool-btn compact" :disabled="station.punches.length >= 2" @click="addConfigStationPunch(station.id)">Dodaj wybijak</button>
                        <button class="tool-btn compact danger" @click="removeConfigStation(station.id)">Usuń zestaw</button>
                      </div>
                    </div>

                    <div v-if="station.punches.length" class="config-punch-list">
                      <div v-for="punch in station.punches" :key="punch.id" class="config-punch-row">
                        <span class="config-punch-label">Wybijak</span>
                        <input
                          class="text-input config-punch-input"
                          :value="punch.number"
                          inputmode="numeric"
                          placeholder="Nr"
                          @input="updateConfigStationPunch(station.id, punch.id, $event.target.value)"
                        />
                        <button class="tool-btn compact danger" @click="removeConfigStationPunch(station.id, punch.id)">Usuń</button>
                      </div>
                    </div>

                    <div v-else class="expanded-empty config-empty-state">
                      Brak wybijaków w tym zestawie.
                    </div>

                    <div class="config-station-lengths">
                      <div class="config-subsection-header">
                        <span class="panel-caption">Zakres długości desek</span>
                      </div>

                      <div class="config-length-row">
                        <span class="config-length-label">Od</span>
                        <input
                          class="text-input config-length-input"
                          :value="station.lengthRange?.minLength ?? ''"
                          inputmode="numeric"
                          placeholder="Min"
                          @input="updateConfigStationLengthRange(station.id, 'minLength', $event.target.value)"
                        />
                        <span class="config-input-unit">[mm]</span>
                        <span class="config-length-separator">do</span>
                        <input
                          class="text-input config-length-input"
                          :value="station.lengthRange?.maxLength ?? ''"
                          inputmode="numeric"
                          placeholder="Max"
                          @input="updateConfigStationLengthRange(station.id, 'maxLength', $event.target.value)"
                        />
                        <span class="config-input-unit">[mm]</span>
                      </div>
                    </div>
                  </article>
                </div>

                <div v-else class="expanded-empty config-empty-state">
                  Brak zestawów wybijaków. Dodaj pierwszy zestaw.
                </div>
              </div>

              <div v-else-if="activeConfigTab === 'distances'" class="config-section">
                <div class="config-section-header">
                  <span class="panel-caption">Odległości między wybijakami</span>
                </div>

                <div v-if="configStations.length" class="config-stations">
                  <article v-for="(station, stationIndex) in configStations" :key="`dist-${station.id}`" class="config-station-card">
                    <div class="config-station-header">
                      <div class="config-station-title-wrap">
                        <span class="config-station-title">{{ getConfigStationLabel(stationIndex) }}</span>
                      </div>
                    </div>

                    <div v-if="station.distanceRules.length" class="config-distance-flow">
                      <template v-for="(rule, ruleIndex) in station.distanceRules" :key="rule.id">
                        <div v-if="ruleIndex === 0" class="config-punch-node">
                          <span class="config-punch-node-number">{{ rule.leftPunch }}</span>
                          <span class="config-punch-node-label">Wybijak</span>
                        </div>
                        <div class="config-distance-link">
                          <div class="config-distance-input-wrap">
                            <input
                              class="text-input config-distance-input"
                              :value="rule.distance"
                              inputmode="numeric"
                              :placeholder="`Odległość ${rule.leftPunch}-${rule.rightPunch}`"
                              @focus="rememberConfigDistanceEditStart(station.id, rule.id, rule.distance)"
                              @input="updateConfigStationDistance(station.id, rule.id, 'distance', $event.target.value)"
                              @blur="handleConfigDistanceEditBlur(station.id, rule.id)"
                            />
                            <span class="config-input-unit">[mm]</span>
                          </div>
                          <span class="config-distance-arrow" aria-hidden="true">⟷</span>
                        </div>
                        <div class="config-punch-node">
                          <span class="config-punch-node-number">{{ rule.rightPunch }}</span>
                          <span class="config-punch-node-label">Wybijak</span>
                        </div>
                      </template>
                    </div>

                    <div v-else class="expanded-empty config-empty-state">
                      Dodaj co najmniej dwa wybijaki w zakładce `Wybijaki`, aby ustawić odległości.
                    </div>
                  </article>
                </div>

                <div v-else class="expanded-empty config-empty-state">
                  Najpierw dodaj zestaw w zakładce `Wybijaki`.
                </div>
              </div>

              <div v-else-if="activeConfigTab === 'parameters'" class="config-section">
                <div class="config-section-header">
                  <span class="panel-caption">Parametry maszyn</span>
                </div>

                <article class="config-station-card">
                  <div class="config-station-header">
                    <div class="config-station-title-wrap">
                      <span class="config-station-title">Folder źródłowy Excel</span>
                    </div>
                    <div class="config-station-actions">
                      <button class="tool-btn compact" :disabled="isSelectingProductsDirectory" @click="selectProductsDirectory">
                        {{ isSelectingProductsDirectory ? 'Otwieranie...' : 'Wybierz folder' }}
                      </button>
                    </div>
                  </div>

                  <div class="config-punch-list">
                    <div class="config-punch-row config-machine-row">
                      <span class="config-punch-label">Ścieżka</span>
                      <input
                        class="text-input config-punch-input config-products-directory-input"
                        :value="configProductsDirectory"
                        placeholder="C:\\Folder\\Z\\Plikami"
                        @input="updateConfigProductsDirectory($event.target.value)"
                      />
                    </div>
                    <div class="panel-caption">
                      Z tego folderu aplikacja odczytuje, importuje i zapisuje pliki `.xlsx`.
                    </div>
                  </div>
                </article>

                <article class="config-station-card">
                  <div class="config-station-header">
                    <div class="config-station-title-wrap">
                      <span class="config-station-title">Ustawienia ograniczeń</span>
                    </div>
                  </div>

                  <div class="config-punch-list">
                    <div class="config-punch-row config-machine-row">
                      <span class="config-punch-label">Znaki tekstu do druku</span>
                      <input
                        class="text-input config-punch-input"
                        :value="configSettings.printTextMaxLength"
                        inputmode="numeric"
                        @input="updateConfigSetting('printTextMaxLength', $event.target.value)"
                      />
                    </div>
                    <div class="config-punch-row config-machine-row">
                      <span class="config-punch-label">Maks. długość deski [mm]</span>
                      <input
                        class="text-input config-punch-input"
                        :value="configSettings.boardMaxLength"
                        inputmode="numeric"
                        @input="updateConfigSetting('boardMaxLength', $event.target.value)"
                      />
                    </div>
                    <div class="config-punch-row config-machine-row">
                      <span class="config-punch-label">Maks. ilość sztuk</span>
                      <input
                        class="text-input config-punch-input"
                        :value="configSettings.maxQuantity"
                        inputmode="numeric"
                        @input="updateConfigSetting('maxQuantity', $event.target.value)"
                      />
                    </div>
                    <div class="config-punch-row config-machine-row">
                      <span class="config-punch-label">Maks. ilość wybijaków maszyny</span>
                      <input
                        class="text-input config-punch-input"
                        :value="configSettings.machinePunchCount"
                        inputmode="numeric"
                        @input="updateConfigSetting('machinePunchCount', $event.target.value)"
                      />
                    </div>
                    <div class="config-punch-row config-machine-row">
                      <span class="config-punch-label">Maks. ilość pozycji / elementów</span>
                      <input
                        class="text-input config-punch-input"
                        :value="activeMachine?.rowLimit ?? DEFAULT_ROW_LIMIT"
                        inputmode="numeric"
                        @input="updateConfigMachine(activeMachine?.id || 'machine-1', 'rowLimit', $event.target.value)"
                      />
                    </div>
                  </div>
                </article>

                <article class="config-station-card">
                  <div class="config-station-header">
                    <div class="config-station-title-wrap">
                      <span class="config-station-title">Aktywne kolumny Excel</span>
                    </div>
                  </div>

                  <div class="config-punch-list config-excel-columns-list">
                    <label v-for="field in productImportFieldDefinitions" :key="field.key" class="config-excel-column-row">
                      <input
                        type="checkbox"
                        :checked="configSettings.activeExcelColumns.includes(field.key)"
                        @change="toggleConfigActiveExcelColumn(field.key)"
                      />
                      <span>{{ field.label }}</span>
                    </label>
                  </div>
                  <div class="panel-caption config-excel-columns-note">
                    Wyłączenie kolumny może ukryć ją z importu, ale aplikacja nadal może jej potrzebować do podstawowego działania maszyny.
                  </div>
                </article>
              </div>
            </div>
          </section>
        </div>

        <div v-if="configUnsavedDialog.visible" class="confirm-modal-overlay" @click.self="cancelConfigUnsavedDialog">
          <div class="confirm-modal panel" @click.stop>
            <div class="panel-header">
              <span>Niezapisane zmiany</span>
            </div>
            <div class="confirm-modal-body">
              <p>Masz niezapisane zmiany w konfiguracji. Chcesz je zapisać czy porzucić?</p>
              <div class="confirm-modal-actions">
                <button class="tool-btn compact" @click="cancelConfigUnsavedDialog">Anuluj</button>
                <button class="tool-btn compact" @click="discardConfigChangesAndContinue">Porzuć</button>
                <button class="tool-btn compact primary" :disabled="isConfigSaving" @click="saveConfigAndContinue">
                  {{ isConfigSaving ? 'Zapisywanie...' : 'Zapisz' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="configDistanceImpactDialog.visible"
          class="confirm-modal-overlay"
          @click.self="cancelConfigDistanceImpactDialog"
        >
          <div class="confirm-modal panel" @click.stop>
            <div class="panel-header">
              <span>Zmiana odległości</span>
            </div>
            <div class="confirm-modal-body">
              <p>Czy zastosować nową odległość do aktualnie wgranej receptury w zakładce 3, czy pominąć tę zmianę dla bieżących wierszy?</p>
              <p class="panel-caption">
                Jeśli zastosujesz zmianę, wartości `Wybijak` dla tej receptury zostaną przeliczone ponownie.
                Wcześniejsze ręczne zmiany `Wybijak` mogą zostać utracone.
              </p>
              <div class="confirm-modal-actions">
                <button class="tool-btn compact" @click="cancelConfigDistanceImpactDialog">Pomiń</button>
                <button class="tool-btn compact primary" @click="applyConfigDistanceToCurrentWorkRecipe">Zastosuj do aktualnej receptury</button>
              </div>
            </div>
          </div>
        </div>

        <section v-if="activeTab === 'products'" class="section">
          <div class="section-header">
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
                  multiple
                  class="visually-hidden"
                  @change="handleImportExcel"
                />
                <button class="tool-btn" :disabled="isFileActionLoading" @click="triggerImportExcel">Import Excel</button>
              </div>
            </div>
          </div>

          <div v-if="productFileActionMessage" data-error-anchor="product-file-action" class="save-status product-file-status" :class="{ error: productFileActionError }">
            {{ productFileActionMessage }}
          </div>

          <div class="produkcja-container products-summary-panel">
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
                <span class="row-limit modal-row-limit">
                  Ilość pozycji: {{ selectedProductSourceRows.length }}
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
                  <div class="product-image-control product-image-control-inline">
                    <button class="tool-btn compact" :disabled="isSelectedProductImageBusy" @click="editSelectedProductImage">
                      <span v-if="isSelectedProductImageBusy" class="button-spinner" aria-hidden="true"></span>
                      {{ isSelectedProductImageBusy ? 'Wczytywanie...' : 'Dodaj zdjęcie' }}
                    </button>
                    <button
                      v-if="selectedProductHasImage"
                      class="product-image-thumb"
                      :class="{ loading: isSelectedProductImageBusy }"
                      type="button"
                      :title="`Powiększ zdjęcie ${formatProductDisplayName(selectedProductName)}`"
                      @click="openSelectedProductImage"
                    >
                      <img :src="getProductImageUrl(selectedProductName)" :alt="`Miniatura produktu ${formatProductDisplayName(selectedProductName)}`" />
                      <span v-if="isSelectedProductImageBusy" class="product-image-thumb-overlay" aria-hidden="true">
                        <span class="button-spinner"></span>
                      </span>
                    </button>
                  </div>
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
                    :disabled="selectedProductSourceRows.length >= activeRowLimit"
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

              <div v-if="saveMessage" data-error-anchor="product-save" class="save-status" :class="{ error: saveError }">{{ saveMessage }}</div>

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
                          <span>{{ getColumnLabelText(column, productColumnLabels) }}</span>
                          <span v-if="isDimensionColumn(column)" class="dimension-unit">₍ₘₘ₎</span>
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
                          v-if="isEditMode && editableProductColumns.includes(column) && (isDropdownColumn(column) || isStationColumn(column))"
                          class="edit-input"
                          :value="item[column] ?? ''"
                          :style="getEditInputStyle(item[column], item._localId, column)"
                          @focus="activeEditCell = `${item._localId}:${column}`"
                          @blur="activeEditCell = null"
                          @input="updateEditedCell(item._localId, column, $event.target.value)"
                        >
                          <option value=""></option>
                          <option
                            v-for="option in isStationColumn(column) ? getStationDropdownOptions(item[column]) : getProductDropdownOptions(editingRows, item, column)"
                            :key="`${column}-${item._localId}-${option.value ?? option}`"
                            :value="option.value ?? option"
                          >
                            {{ option.label ?? option }}
                          </option>
                        </select>
                        <div
                          v-else-if="isEditMode && editableProductColumns.includes(column) && column === 'Wybijak'"
                          class="wybijak-edit-group"
                          @focusin="activeEditCell = `${item._localId}:${column}`"
                          @focusout="activeEditCell = null"
                        >
                          <input
                            class="edit-input wybijak-part-input"
                            :value="getWybijakInputParts(item[column], item.Stanowisko)[0]"
                            inputmode="numeric"
                            maxlength="1"
                            @input="updateEditedWybijakPart(item._localId, 0, $event.target.value)"
                          />
                          <span class="wybijak-separator">i</span>
                          <input
                            class="edit-input wybijak-part-input"
                            :value="getWybijakInputParts(item[column], item.Stanowisko)[1]"
                            inputmode="numeric"
                            maxlength="1"
                            @input="updateEditedWybijakPart(item._localId, 1, $event.target.value)"
                          />
                        </div>
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
                          :disabled="selectedProductSourceRows.length >= activeRowLimit"
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

            <div
              v-if="productImagePreview.visible && activeTab === 'products'"
              class="confirm-modal-overlay single-element-overlay"
              @click.self="closeProductImagePreview"
            >
              <div class="confirm-modal panel product-image-preview-modal" @click.stop>
                <div class="panel-header">
                  <span>Zdjęcie produktu</span>
                  <span class="panel-caption">{{ productImagePreview.title }}</span>
                </div>
                <div class="product-image-preview-body">
                  <img :src="productImagePreview.url" :alt="`Zdjęcie produktu ${productImagePreview.title}`" class="product-image-preview-img" />
                </div>
                <div class="confirm-modal-actions merge-preview-actions">
                  <button class="tool-btn compact" :disabled="isProductImageBusy(productImagePreview.productName)" @click="editProductImageFromPreview">
                    Zmień zdjęcie
                  </button>
                  <button class="tool-btn compact" @click="closeProductImagePreview">Zamknij</button>
                </div>
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

        <div v-if="productImportMappingDialog.visible" class="confirm-modal-overlay" @click.self="closeProductImportMappingDialog">
          <div class="confirm-modal panel panel-wide import-mapping-modal" @click.stop>
            <div class="panel-header">
              <span>Mapowanie kolumn przy imporcie</span>
              <span class="panel-caption">{{ productImportMappingDialog.fileName }}</span>
            </div>
            <div class="confirm-modal-body import-mapping-body">
              <p>{{ productImportMappingDialog.message }}</p>
              <div class="import-mapping-summary">
                <span>Wolne kolumny w Excelu:</span>
                <div class="import-mapping-chips">
                  <span v-for="header in getProductImportAvailableHeaders(productImportMappingDialog.headers, productImportMappingDialog.mapping)" :key="header" class="import-mapping-chip">
                    {{ header }}
                  </span>
                  <span v-if="!getProductImportAvailableHeaders(productImportMappingDialog.headers, productImportMappingDialog.mapping).length" class="import-mapping-chip muted">
                    Brak wolnych kolumn
                  </span>
                </div>
              </div>
              <div class="import-mapping-grid">
                <label v-for="field in getActiveProductImportFieldDefinitions()" :key="field.key" class="import-mapping-row">
                  <span class="import-mapping-label">
                    {{ field.label }}
                    <strong v-if="field.required">*</strong>
                  </span>
                  <select
                    class="select-input import-mapping-select"
                    :value="productImportMappingDialog.mapping[field.key] ?? ''"
                    @change="updateProductImportMapping(field.key, $event.target.value)"
                  >
                    <option value="">Nie mapuj</option>
                    <option v-for="header in productImportMappingDialog.headers" :key="`${field.key}-${header}`" :value="header">
                      {{ header }}
                    </option>
                  </select>
                </label>
              </div>
              <div class="import-mapping-preview">
                <span class="import-mapping-preview-title">Podgląd pierwszych wierszy</span>
                <div class="table-wrap import-mapping-preview-wrap">
                  <table class="data-table import-mapping-preview-table">
                    <thead>
                      <tr>
                        <th v-for="header in productImportMappingDialog.headers" :key="`preview-head-${header}`">{{ header }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, rowIndex) in productImportMappingDialog.previewRows" :key="`preview-row-${rowIndex}`">
                        <td v-for="(header, cellIndex) in productImportMappingDialog.headers" :key="`preview-cell-${rowIndex}-${cellIndex}`">
                          {{ row[cellIndex] ?? '' }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div class="confirm-modal-actions">
                <button class="tool-btn compact" type="button" @click="closeProductImportMappingDialog">Anuluj import</button>
                <button class="tool-btn compact primary" type="button" :disabled="productImportMappingDialog.processing" @click="confirmProductImportMapping">
                  {{ productImportMappingDialog.processing ? 'Sprawdzanie...' : 'Zatwierdź mapowanie' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="confirmDialog.visible && activeTab !== 'products'" class="confirm-modal-overlay" @click.self="cancelConfirmAction">
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

        <section v-if="activeTab === 'merge'" class="section">
          <div class="merge-grid" :class="{ collapsed: isMergeSelectionCollapsed }">
            <div class="panel merge-selection-panel" :class="{ collapsed: isMergeSelectionCollapsed }">
              <div class="panel-header">
                <span v-if="!isMergeSelectionCollapsed">Produkty do scalenia</span>
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
                  <div class="favorite-elements-panel">
                    <div class="product-check favorite-elements-trigger">
                      <button class="product-check-main favorite-elements-trigger-main" @click="openFavoriteElementsModal">
                        <span class="favorite-elements-star" aria-hidden="true">★</span>
                        <span class="favorite-elements-trigger-copy">
                          <span>Ulubione elementy</span>
                          <small>{{ favoriteElements.length }} elementów</small>
                        </span>
                      </button>
                      <button class="tool-btn compact product-preview-btn" title="Podgląd ulubionych elementów" @click="openFavoriteElementsModal">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path
                            d="M10.5 4a6.5 6.5 0 1 0 4.06 11.58l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    </div>
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
                  <div v-if="temporarySourceRowOptions.length" class="favorite-elements-legend">
                    Kod | Długość x Grubość x Szerokość | Materiał
                  </div>
                  <div v-if="temporarySourceRowOptions.length" class="single-element-list">
                    <div v-for="row in temporarySourceRowOptions" :key="row._localId" class="single-element-row">
                      <label class="single-element-check">
                        <input
                          type="checkbox"
                          :checked="isTemporaryRowSelected(row._localId)"
                          :disabled="!isTemporaryRowSelected(row._localId) && selectedTemporaryRowCount >= remainingRecipeCapacity"
                          @change="handleTemporaryRowCheckboxChange(row._localId, $event.target.checked)"
                        />
                        <span class="single-element-row-text">{{ formatTemporaryRowOption(row) }}</span>
                      </label>
                    </div>
                  </div>
                  <div v-else class="expanded-empty single-element-empty">
                    Wybierz produkt, aby zobaczyć jego elementy.
                  </div>
                  <div class="confirm-modal-actions">
                    <div class="single-element-capacity" :class="{ full: !remainingRecipeCapacityAfterSelection }">
                      <strong>Pozycje: {{ projectedRecipeCount }} / {{ activeRowLimit }}</strong>
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

            <div v-if="isFavoriteElementsModalOpen" class="confirm-modal-overlay single-element-overlay" @click.self="closeFavoriteElementsModal">
              <div class="confirm-modal panel favorite-elements-modal" @click.stop>
                <div class="panel-header">
                  <span>Ulubione elementy</span>
                  <span class="panel-caption">{{ favoriteElements.length }}</span>
                </div>
                <div class="confirm-modal-body favorite-elements-modal-body">
                  <div class="favorite-elements-modal-toolbar">
                    <button
                      class="tool-btn compact"
                      :disabled="!availableProductNames.length"
                      @click="openFavoriteSourceModal"
                    >
                      Dodaj element do ulubionych
                    </button>
                  </div>
                  <div v-if="favoriteElements.length" class="favorite-elements-legend">
                    Kod | Długość x Grubość x Szerokość | Materiał
                  </div>
                  <div v-if="favoriteElements.length" class="favorite-elements-list">
                    <article v-for="favorite in favoriteElements" :key="favorite.id" class="favorite-element-card">
                      <div class="favorite-element-main">
                        <span class="favorite-element-line">
                          {{ favorite.row.Kod || '—' }} | {{ favorite.row['Długość'] || '—' }} x {{ favorite.row['Grubość'] || '—' }} x {{ favorite.row['Szerokość'] || '—' }} | {{ favorite.row['Materiał'] || '—' }}
                        </span>
                      </div>
                      <div class="favorite-element-actions">
                        <button
                          v-if="!isFavoriteElementInRecipe(favorite.id)"
                          class="tool-btn compact"
                          :disabled="!remainingRecipeCapacity"
                          @click="addFavoriteElementToMerge(favorite.id)"
                        >
                          Dodaj
                        </button>
                        <button
                          v-else
                          class="tool-btn compact"
                          @click="removeFavoriteElementFromMerge(favorite.id)"
                        >
                          Usuń z receptury
                        </button>
                        <button class="tool-btn compact danger" @click="removeFavoriteElement(favorite.id)">Usuń z ulubionych</button>
                      </div>
                    </article>
                  </div>
                  <div v-else class="expanded-empty favorite-elements-empty">
                    Dodaj ulubione z okna `Dodaj pojedynczy element`.
                  </div>
                  <div class="confirm-modal-actions merge-preview-actions">
                    <button class="tool-btn compact" @click="closeFavoriteElementsModal">Zamknij</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="isFavoriteSourceModalOpen" class="confirm-modal-overlay single-element-overlay" @click.self="closeFavoriteSourceModal">
              <div class="confirm-modal panel favorite-elements-modal" @click.stop>
                <div class="panel-header">
                  <span>Dodaj element do ulubionych</span>
                  <div class="panel-actions">
                    <span class="panel-caption">{{ favoriteSourceRowOptions.length }}</span>
                    <button class="tool-btn compact" @click="openFavoriteElementsModalFromSource">Pokaż ulubione elementy</button>
                    <button class="tool-btn compact" @click="closeFavoriteSourceModal">Zamknij</button>
                  </div>
                </div>
                <div class="confirm-modal-body favorite-elements-modal-body">
                  <label class="rename-field">
                    <span>Produkt źródłowy</span>
                    <select v-model="favoriteSourceProductName" class="select-input">
                      <option value="">Wybierz produkt</option>
                      <option v-for="productName in availableProductNames" :key="`favorite-source-${productName}`" :value="productName">
                        {{ formatProductDisplayName(productName) }}
                      </option>
                    </select>
                  </label>
                  <div class="single-element-summary">
                    <span>{{ favoriteSourceRowOptions.length }} elementów w produkcie</span>
                    <span>Ulubione: {{ favoriteElements.length }}</span>
                  </div>
                  <div v-if="favoriteSourceRowOptions.length" class="favorite-elements-legend">
                    Kod | Długość x Grubość x Szerokość | Materiał
                  </div>
                  <div v-if="favoriteSourceRowOptions.length" class="single-element-list">
                    <div v-for="row in favoriteSourceRowOptions" :key="row._localId" class="single-element-row favorite-source-item">
                      <div class="single-element-check favorite-source-row">
                        <span class="single-element-row-text">{{ formatTemporaryRowOption(row) }}</span>
                      </div>
                      <button
                        class="tool-btn compact favorite-source-action"
                        :class="{ primary: isFavoriteSourceRow(favoriteSourceProductName, row) }"
                        @click="toggleFavoriteSourceRow(favoriteSourceProductName, row)"
                      >
                        {{ isFavoriteSourceRow(favoriteSourceProductName, row) ? 'Usuń z ulubionych' : 'Dodaj do ulubionych' }}
                      </button>
                    </div>
                  </div>
                  <div v-else class="expanded-empty single-element-empty">
                    Wybierz produkt, aby zobaczyć jego elementy.
                  </div>
                  <div class="confirm-modal-actions merge-preview-actions">
                    <button class="tool-btn compact" @click="closeFavoriteSourceModal">Zamknij</button>
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
                          <span>{{ getColumnLabelText(column, productColumnLabels) }}</span>
                          <span v-if="isDimensionColumn(column)" class="dimension-unit">₍ₘₘ₎</span>
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

            <div v-if="productImagePreview.visible" class="confirm-modal-overlay single-element-overlay" @click.self="closeProductImagePreview">
              <div class="confirm-modal panel product-image-preview-modal" @click.stop>
                <div class="panel-header">
                  <span>Zdjęcie produktu</span>
                  <span class="panel-caption">{{ productImagePreview.title }}</span>
                </div>
                <div class="product-image-preview-body">
                  <img :src="productImagePreview.url" :alt="`Zdjęcie produktu ${productImagePreview.title}`" class="product-image-preview-img" />
                </div>
                <div class="confirm-modal-actions merge-preview-actions">
                  <button class="tool-btn compact" :disabled="isProductImageBusy(productImagePreview.productName)" @click="editProductImageFromPreview">
                    Zmień zdjęcie
                  </button>
                  <button class="tool-btn compact" @click="closeProductImagePreview">Zamknij</button>
                </div>
              </div>
            </div>

            <div class="panel panel-wide merge-preview-panel">
              <div class="panel-header">
                <span>Podgląd scalonej receptury</span>
                <div class="panel-actions">
                  <button
                    class="tool-btn compact primary"
                    :disabled="!recipeRows.length || !hasConfiguredStationLengthRanges"
                    @click="applyMergePunchAssignmentsByLength"
                  >
                    Przypisz wybijaki wg długości
                  </button>
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
                  <span class="row-limit" :class="{ warn: recipeRows.length >= activeRowLimit }">Pozycje: {{ recipeRows.length }} / {{ activeRowLimit }}</span>
                  <button class="tool-btn compact danger" @click="resetMergeSelection">Wyczyść</button>
                </div>
              </div>
              <TransitionGroup name="merge-product-fade" tag="div" class="recipe-groups-wrap">
                <section
                  v-for="(group, groupIndex) in groupedRecipeRows"
                  :key="group.productName"
                  class="recipe-group"
                  :class="`recipe-group-${(groupIndex % 4) + 1}`"
                >
                  <div
                    class="recipe-group-header"
                    role="button"
                    tabindex="0"
                    @click="toggleRecipeGroup(group.productName)"
                    @keydown.enter.prevent="toggleRecipeGroup(group.productName)"
                    @keydown.space.prevent="toggleRecipeGroup(group.productName)"
                  >
                    <span class="recipe-group-toggle">{{ isRecipeGroupCollapsed(group.productName) ? '▸' : '▾' }}</span>
                    <div class="recipe-group-meta">
                      <div class="recipe-group-title-row">
                        <strong v-if="mergeProductNameEditKey !== group.productName">{{ getMergeProductDisplayName(group.productName) }}</strong>
                        <input
                          v-else
                          v-model="mergeProductNameDraft"
                          class="text-input recipe-group-name-input"
                          @click.stop
                          @keydown.space.stop
                          @keydown.enter.prevent.stop="saveMergeProductName(group.productName)"
                          @keydown.esc.prevent.stop="cancelMergeProductNameEdit"
                          @blur="saveMergeProductName(group.productName)"
                        />
                        <button
                          v-if="canRenameMergeProduct(group.productName) && mergeProductNameEditKey !== group.productName"
                          class="recipe-group-rename-btn"
                          title="Zmień nazwę produktu"
                          @click.stop="startMergeProductNameEdit(group.productName)"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path
                              d="M4 20h4l9.8-9.8-4-4L4 16v4Zm12.6-13.4 1.8-1.8a1.4 1.4 0 0 1 2 0l.8.8a1.4 1.4 0 0 1 0 2l-1.8 1.8-2.8-2.8Z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                      </div>
                      <small>{{ group.rows.length }} pozycji, mnożnik x{{ group.multiplier }}</small>
                    </div>
                    <div class="product-image-control" @click.stop>
                      <button
                        v-if="hasProductImage(group.productName)"
                        class="product-image-thumb"
                        :class="{ loading: isProductImageBusy(group.productName) }"
                        type="button"
                        :title="`Powiększ zdjęcie ${getProductDisplayTitle(group.productName)}`"
                        @click.stop="openGroupProductImage(group.productName)"
                      >
                        <img :src="getProductImageUrl(group.productName)" :alt="`Miniatura produktu ${getProductDisplayTitle(group.productName)}`" />
                        <span v-if="isProductImageBusy(group.productName)" class="product-image-thumb-overlay" aria-hidden="true">
                          <span class="button-spinner"></span>
                        </span>
                      </button>
                      <button
                        class="tool-btn compact"
                        :disabled="isProductImageBusy(group.productName)"
                        @click.stop="editGroupProductImage(group.productName)"
                      >
                        <span v-if="isProductImageBusy(group.productName)" class="button-spinner" aria-hidden="true"></span>
                        {{ isProductImageBusy(group.productName) ? 'Wczytywanie...' : 'Dodaj zdjęcie' }}
                      </button>
                    </div>
                    <div class="product-quantity recipe-group-quantity" @click.stop>
                      <span>Ilość</span>
                      <div class="quantity-stepper" :class="{ pulse: mergeQuantityPulse[group.productName] }">
                        <button class="quantity-arrow" @click="stepMergeProductQuantity(group.productName, -1)">-</button>
                        <input
                          class="quantity-input"
                          type="number"
                          min="0"
                          step="1"
                          inputmode="numeric"
                          :max="activeRowLimit"
                          :value="getMergeProductQuantityInputValue(group.productName)"
                          @click.stop
                          @keydown.stop
                          @focus="startMergeProductQuantityEdit(group.productName)"
                          @input="updateMergeProductQuantityDraft(group.productName, $event.target.value)"
                          @keydown.enter.prevent.stop="commitMergeProductQuantity(group.productName)"
                          @blur="commitMergeProductQuantity(group.productName)"
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
                    <button
                      v-if="canPersistMergeProduct(group.productName)"
                      class="tool-btn compact"
                      :disabled="isMergeProductPersisting(group.productName)"
                      @click.stop="saveTemporaryMergeProduct(group.productName)"
                    >
                      {{ isMergeProductPersisting(group.productName) ? 'Zapisywanie...' : 'Zapisz jako produkt' }}
                    </button>
                    <button class="recipe-group-remove" @click.stop="removeMergeProduct(group.productName)">Usuń</button>
                  </div>

                  <transition name="recipe-group-expand">
                    <div v-if="!isRecipeGroupCollapsed(group.productName)" class="table-wrap recipe-group-table-wrap">
                      <div class="recipe-group-table-content">
                      <table class="data-table recipe-group-table">
                        <thead>
                          <tr>
                            <th class="recipe-index-column">Nr</th>
                            <th
                              v-for="column in mergeRecipeColumns"
                              :key="`${group.productName}-${column}`"
                              @click="!isMergeProductEditMode(group.productName) ? sortMergeRecipeBy(column) : undefined"
                              :class="{ sorted: !isMergeProductEditMode(group.productName) && mergeRecipeSortKey === column, disabled: isMergeProductEditMode(group.productName) }"
                            >
                              <span>{{ getColumnLabelText(column, recipeColumnLabels) }}</span>
                              <span v-if="isDimensionColumn(column)" class="dimension-unit">₍ₘₘ₎</span>
                              <span v-if="!isMergeProductEditMode(group.productName) && mergeRecipeSortKey === column" class="sort-mark">
                                {{ mergeRecipeSortDirection > 0 ? '▲' : '▼' }}
                              </span>
                            </th>
                            <th v-if="isMergeProductEditMode(group.productName)" class="actions-column">Akcje</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="row in group.rows" :key="`${group.productName}-${row._localId}`">
                            <td class="recipe-index-column">{{ getMergeRecipeRowDisplayIndex(row) }}</td>
                            <td v-for="column in mergeRecipeColumns" :key="`${group.productName}-${row.idSkladowej}-${column}`">
                              <div
                                v-if="isMergeProductEditMode(group.productName) && (isDropdownColumn(column) || isStationColumn(column))"
                                class="cell-edit-with-warning"
                              >
                                <select
                                  class="edit-input"
                                  :value="row[column] ?? ''"
                                  @focus="mergeEditingCell = `${row._localId}:${column}`"
                                  @blur="mergeEditingCell = null"
                                  @input="updateMergeRecipeCell(group.productName, row._localId, column, $event.target.value)"
                                >
                                  <option value=""></option>
                                  <option
                                    v-for="option in getMergeDropdownOptions(group.productName, row, column)"
                                    :key="`${column}-${row._localId}-${option.value ?? option}`"
                                    :value="option.value ?? option"
                                  >
                                    {{ option.label ?? option }}
                                  </option>
                                </select>
                                <span
                                  v-if="getMergeCellValidationMessage(row, column)"
                                  class="cell-warning-indicator inline-warning-indicator"
                                  :title="getMergeCellValidationCriteria(column)"
                                >
                                  !
                                </span>
                              </div>
                              <div
                                v-else-if="isMergeProductEditMode(group.productName) && column === 'wybijak'"
                                class="wybijak-edit-group"
                                @focusin="mergeEditingCell = `${row._localId}:${column}`"
                                @focusout="mergeEditingCell = null"
                              >
                                <input
                                  class="edit-input wybijak-part-input"
                                  :value="getWybijakInputParts(row[column], row.Stanowisko)[0]"
                                  inputmode="numeric"
                                  maxlength="1"
                                  @input="updateMergeRecipeWybijakPart(group.productName, row._localId, 0, $event.target.value)"
                                />
                                <span class="wybijak-separator">i</span>
                                <input
                                  class="edit-input wybijak-part-input"
                                  :value="getWybijakInputParts(row[column], row.Stanowisko)[1]"
                                  inputmode="numeric"
                                  maxlength="1"
                                  @input="updateMergeRecipeWybijakPart(group.productName, row._localId, 1, $event.target.value)"
                                />
                                <span
                                  v-if="getRecipeWybijakValidationIssue(row)"
                                  class="cell-warning-indicator"
                                  :title="getMergeCellValidationCriteria(column)"
                                >
                                  !
                                </span>
                              </div>
                              <div
                                v-else-if="isMergeProductEditMode(group.productName)"
                                class="cell-edit-with-warning"
                              >
                                <input
                                  class="edit-input"
                                  :value="row[column] ?? ''"
                                  :style="getMergeEditInputStyle(column, row[column])"
                                  @focus="mergeEditingCell = `${row._localId}:${column}`"
                                  @blur="mergeEditingCell = null"
                                  @input="updateMergeRecipeCell(group.productName, row._localId, column, $event.target.value)"
                                />
                                <span
                                  v-if="getMergeCellValidationMessage(row, column)"
                                  class="cell-warning-indicator inline-warning-indicator"
                                  :title="getMergeCellValidationCriteria(column)"
                                >
                                  !
                                </span>
                              </div>
                              <span v-else-if="column === 'wybijak'" class="cell-warning-wrap">
                                <span>{{ row[column] ?? '' }}</span>
                                <span
                                  v-if="getRecipeWybijakValidationIssue(row)"
                                  class="cell-warning-indicator"
                                  :title="getMergeCellValidationCriteria(column)"
                                >
                                  !
                                </span>
                              </span>
                              <span v-else-if="getMergeCellValidationMessage(row, column)" class="cell-warning-wrap">
                                <span>{{ row[column] ?? '' }}</span>
                                <span
                                  class="cell-warning-indicator"
                                  :title="getMergeCellValidationCriteria(column)"
                                >
                                  !
                                </span>
                              </span>
                              <span v-else>{{ row[column] ?? '' }}</span>
                            </td>
                            <td v-if="isMergeProductEditMode(group.productName)" class="row-actions-cell">
                              <button
                                class="tool-btn compact"
                                :disabled="recipeRows.length >= activeRowLimit"
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
                          class="tool-btn compact merge-group-add-row-btn"
                          :disabled="recipeRows.length >= activeRowLimit"
                          @click="addMergeRecipeRow(group.productName)"
                        >
                          Dodaj nowy wiersz
                        </button>
                      </div>
                      </div>
                    </div>
                  </transition>
                </section>
                <section key="add-empty-product" class="recipe-group recipe-group-add-card">
                  <button
                    class="recipe-group-header recipe-group-add-trigger"
                    :disabled="!remainingRecipeCapacity"
                    @click="addEmptyMergeProduct"
                  >
                    <span class="recipe-group-toggle">+</span>
                    <div class="recipe-group-meta">
                      <div class="recipe-group-title-row">
                        <strong>Dodaj pusty produkt</strong>
                      </div>
                      <small>Tworzy nowy pusty produkt do edycji w recepturze</small>
                    </div>
                  </button>
                </section>
              </TransitionGroup>
              <transition name="merge-empty-fade">
                <div v-if="!groupedRecipeRows.length" class="expanded-empty recipe-empty-state">
                  <span>Zaznacz produkty do scalenia receptury z panelu&nbsp;<strong>"Produkty do scalenia"</strong></span>
                </div>
              </transition>
              <div
                v-if="mergeProductSaveMessage"
                data-error-anchor="merge-product-save"
                class="save-status"
                :class="{ error: mergeProductSaveError }"
              >
                {{ mergeProductSaveMessage }}
              </div>
              <div
                v-if="mergeWorkUploadMessage"
                data-error-anchor="merge-work-upload"
                class="save-status"
                :class="{ error: mergeWorkUploadError }"
              >
                {{ mergeWorkUploadMessage }}
              </div>
              <div class="merge-preview-footer">
                <button class="tool-btn primary merge-save-btn" :disabled="!recipeRows.length || !!saveRecipeValidationError || isMergeUploadingToWorkMain" @click="requestUploadMergeToWorkMain">
                  {{ isMergeUploadingToWorkMain ? 'Wgrywanie...' : 'Wgraj do aktualnie ciętych' }}
                </button>
              </div>
            </div>
          </div>

        </section>

        <section v-if="activeTab === 'reports'" class="section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Raporty</h2>
              <p class="section-subtitle">Eksport raportu Excel z aktualnej bazy danych albo z wybranych odłożonych prac.</p>
            </div>
          </div>

          <div class="panel recipe-library-panel">
            <div class="panel-header">
              <span>Generator raportu</span>
              <div class="panel-actions">
                <button class="tool-btn compact primary" :disabled="!canExportReport || isReportExportLoading" @click="exportReportToExcel">
                  {{ isReportExportLoading ? 'Eksport...' : 'Eksport do Excela' }}
                </button>
              </div>
            </div>
            <div v-if="reportMessage" data-error-anchor="report-status" class="save-status" :class="{ error: reportError }">{{ reportMessage }}</div>

            <div class="recipe-library-filters">
              <label class="rename-field">
                <span>Źródło raportu</span>
                <select v-model="reportSourceMode" class="select-input recipe-filter-select">
                  <option value="current">Aktualna baza danych</option>
                  <option value="saved">Wybrane odłożone prace</option>
                </select>
              </label>
            </div>

            <div v-if="reportSourceMode === 'current'" class="expanded-empty">
              Raport zostanie wygenerowany z aktualnie wczytanych wierszy `WorkMain` z bazy danych.
              Znaleziono: <strong>{{ activeWorkRows.length }}</strong> aktywnych pozycji.
            </div>

            <div v-else>
              <div class="single-element-summary report-saved-summary">
                <span>Dostępne odłożone prace: {{ savedRows.length }}</span>
                <span>Zaznaczone: {{ selectedReportSavedWorkCount }}</span>
              </div>
              <div v-if="savedRows.length" class="single-element-list report-saved-list">
                <div v-for="row in savedRows" :key="`report-${row.idRap}`" class="single-element-row">
                  <label class="single-element-check">
                    <input
                      type="checkbox"
                      :checked="isReportSavedWorkSelected(row.idRap)"
                      @change="toggleReportSavedWork(row.idRap, $event.target.checked)"
                    />
                    <span class="single-element-row-text">
                      {{ row.NazwaRec || 'Odłożona praca' }} | {{ row.Wiersze || 0 }} pozycji | {{ row.CzasOdloz || 'Brak daty' }}
                    </span>
                  </label>
                </div>
              </div>
              <div v-else class="expanded-empty">Brak odłożonych prac do raportu.</div>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'work'" class="section">
          <div class="work-topbar">
            <div class="work-summary-group">
              <div class="work-summary-card">
                <div class="work-summary-row">
                  <span>Włączone</span>
                  <strong>{{ activeWorkRows.length }}</strong>
                </div>
                <div class="work-summary-row">
                  <span>W recepturze</span>
                  <strong>{{ workRows.length }}</strong>
                </div>
                <div class="work-summary-row">
                  <span>Limit</span>
                  <strong>{{ activeRowLimit }}</strong>
                </div>
              </div>
              <div class="work-overall-progress-card">
                <div class="work-overall-progress-header">
                  <span>Postęp ogólny</span>
                  <strong>{{ formatProgressPercent(overallWorkProgressPercent) }}%</strong>
                </div>
                <div class="work-overall-progress-track">
                  <div class="work-overall-progress-fill" :style="{ width: `${overallWorkProgressPercent}%` }"></div>
                  <div class="work-overall-progress-content">
                    <strong>{{ overallWorkDone }}</strong>
                    <span>/</span>
                    <strong>{{ overallWorkTotal }}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div class="work-actions">
              <div class="work-actions-stack">
                <div class="work-actions-row">
                  <button
                    class="tool-btn"
                    :disabled="!activeWorkRows.length || !hasConfiguredStationLengthRanges || workEditingRowId !== null || isWorkCorrectionSaving || isWorkEditPreparing"
                    @click="applyWorkPunchAssignmentsByLength"
                  >
                    Przypisz wybijaki wg długości
                  </button>
                  <button
                    class="tool-btn"
                    :disabled="!activeWorkRows.length || isReportExportLoading"
                    @click="exportCurrentWorkReport"
                  >
                    {{ isReportExportLoading ? 'Generowanie...' : 'Generuj raport' }}
                  </button>
                  <button
                    class="tool-btn"
                    :disabled="isWorkCorrectionSaving || isWorkEditPreparing || workEditingRowId !== null || hasPendingWorkChanges"
                    @click="openPostponeWorkDialog"
                  >
                    Odłóż aktualną pracę
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="workUploadMessage" data-error-anchor="work-upload" class="save-status" :class="{ error: workUploadError }" v-html="getWorkUploadMessageHtml()"></div>

          <div class="work-grid">
            <div class="produkcja-container">
              <div class="work-table-source-banner">
                <div class="work-table-source-info">
                  <span class="work-table-source-label">{{ workTableSourceNameLabel }}</span>
                  <span class="work-table-source-status" :class="workTableSourceMode">
                    {{ workTableSourceStatusLabel }}
                  </span>
                  <div v-if="isWorkTableSourceActive" class="work-table-refresh-meta">
                    <span class="work-table-refresh-time">{{ workMainLastRefreshLabel }}</span>
                    <button
                      class="work-table-refresh-btn"
                      type="button"
                      :disabled="isWorkMainManualRefreshDisabled"
                      title="Odśwież aktualną pracę z bazy danych"
                      aria-label="Odśwież aktualną pracę z bazy danych"
                      @click="refreshWorkMainRowsManually"
                    >
                      <img src="/reload-outline.svg" alt="" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div class="work-table-source-actions">
                  <button
                    class="tool-btn compact"
                    :disabled="!hasPendingWorkChanges || isWorkCorrectionSaving || isWorkEditPreparing"
                    @click="discardWorkPendingChanges"
                  >
                    Porzuć zmiany
                  </button>
                  <button
                    class="tool-btn compact primary work-table-save-btn"
                    :disabled="!hasPendingWorkChanges || isWorkCorrectionSaving || isWorkEditPreparing"
                    @click="saveWorkTable"
                  >
                    {{ isWorkCorrectionSaving ? 'Zapisywanie...' : 'Zapisz zmiany do bazy danych' }}
                  </button>
                </div>
              </div>
              <WorkTable
                :columns="workColumns"
                :rows="workDisplayRows"
                :labels="workColumnLabels"
                empty-text="WorkMain jest pusty"
              />
              <div class="work-table-footer">
                <button class="tool-btn" :disabled="isWorkCorrectionSaving || isWorkEditPreparing" @click="addWorkRow">Dodaj wiersz</button>
                <button
                  class="tool-btn"
                  :disabled="isWorkCorrectionSaving || isWorkEditPreparing || !availableProductNames.length || workRows.length >= activeRowLimit"
                  @click="openWorkProductModal"
                >
                  Dodaj z produktu
                </button>
              </div>
            </div>
          </div>

          <aside class="saved-panel">
            <div class="panel-header">
              <span>Odłożone prace</span>
            </div>
            <div class="table-wrap saved-table-wrap">
              <table class="data-table saved-data-table">
                <thead>
                  <tr>
                    <th v-for="column in savedColumns" :key="column">{{ savedColumnLabels[column] ?? column }}</th>
                    <th class="actions-column">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="savedRows.length">
                    <tr v-for="row in savedRows" :key="row.idRap">
                      <td v-for="column in savedColumns" :key="`${row.idRap}-${column}`">{{ row[column] ?? '' }}</td>
                      <td class="row-actions-cell saved-row-actions">
                        <button
                          class="tool-btn compact product-preview-btn"
                          type="button"
                          title="Podgląd odłożonej pracy"
                          :disabled="!row.rows"
                          @click.stop.prevent="openSavedWorkPreview(row.idRap)"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path
                              d="M10.5 4a6.5 6.5 0 1 0 4.06 11.58l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                        <button
                          class="tool-btn compact primary"
                          type="button"
                          :disabled="!row.rows"
                          @click.stop.prevent="requestRestoreSavedRow(row.idRap)"
                        >
                          Wczytaj
                        </button>
                        <button class="tool-btn compact danger" type="button" @click.stop.prevent="requestRemoveSavedRow(row.idRap)">Usuń</button>
                      </td>
                    </tr>
                  </template>
                  <tr v-else>
                    <td :colspan="savedColumns.length + 1" class="empty-cell">Brak odłożonych prac</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </aside>

          <div v-if="selectedSavedWorkPreview" class="confirm-modal-overlay saved-work-preview-overlay" @click.self="closeSavedWorkPreview">
            <div class="confirm-modal panel panel-wide work-recipe-preview-modal saved-work-preview-modal" @click.stop>
              <div class="panel-header">
                <span>Podgląd odłożonej pracy</span>
                <div class="panel-actions">
                  <span class="panel-caption">{{ selectedSavedWorkPreview.NazwaRec || 'Odłożona praca' }}</span>
                  <button class="tool-btn compact" type="button" @click.stop="closeSavedWorkPreview">Zamknij</button>
                </div>
              </div>
              <RecipePreviewTable
                :columns="savedWorkPreviewColumns"
                :rows="savedWorkPreviewRows"
                :labels="workColumnLabels"
                empty-text="Brak pozycji w odłożonej pracy"
              />
              <div class="confirm-modal-actions">
                <button class="tool-btn compact" @click="closeSavedWorkPreview">Zamknij</button>
              </div>
            </div>
          </div>

          <div
            v-if="restoreSavedWorkDialog.visible"
            class="confirm-modal-overlay"
            @click.self="cancelRestoreSavedWorkDialog"
          >
            <div class="confirm-modal panel" @click.stop>
              <div class="panel-header">
                <span>Wczytać odłożoną pracę?</span>
              </div>
              <div class="confirm-modal-body">
                <p>
                  Czy na pewno chcesz wczytać odłożoną pracę
                  "{{ restoreSavedWorkDialog.name || 'Bez nazwy' }}"?
                </p>
                <p class="panel-caption">
                  Wybierz, co zrobić z aktualnym stanem pracy przed wczytaniem.
                </p>
                <div class="confirm-modal-actions">
                  <button class="tool-btn compact" @click="cancelRestoreSavedWorkDialog">Anuluj</button>
                  <button
                    class="tool-btn compact"
                    :disabled="restoreSavedWorkDialog.loading"
                    @click="confirmRestoreSavedWork('discard')"
                  >
                    Porzuć aktualny stan
                  </button>
                  <button
                    class="tool-btn compact primary"
                    :disabled="restoreSavedWorkDialog.loading || !workRows.length"
                    @click="confirmRestoreSavedWork('postpone')"
                  >
                    {{ restoreSavedWorkDialog.loading ? 'Wczytywanie...' : 'Odłóż i wczytaj' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="postponeWorkDialog.visible"
            class="confirm-modal-overlay"
            @click.self="cancelPostponeWorkDialog"
          >
            <div class="confirm-modal panel" @click.stop>
              <div class="panel-header">
                <span>Odłożyć aktualną pracę?</span>
              </div>
              <div class="confirm-modal-body">
                <label class="rename-field">
                  <span>Notatka</span>
                  <input
                    v-model="postponeWorkDialog.note"
                    class="text-input"
                    maxlength="250"
                    placeholder="Opcjonalna notatka do odłożonej pracy"
                  />
                </label>
                <div class="confirm-modal-actions">
                  <button class="tool-btn compact" @click="cancelPostponeWorkDialog">Anuluj</button>
                  <button
                    class="tool-btn compact primary"
                    :disabled="postponeWorkDialog.loading"
                    @click="confirmPostponeCurrentWork"
                  >
                    {{ postponeWorkDialog.loading ? 'Odkładanie...' : 'Odłóż pracę' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="isWorkProductModalOpen" class="confirm-modal-overlay single-element-overlay" @click.self="closeWorkProductModal">
            <div class="confirm-modal panel single-element-modal" @click.stop>
              <div class="panel-header">
                <span>Dodaj z produktu</span>
                <span class="panel-caption">Wolne miejsca: {{ workRemainingCapacity }}</span>
              </div>
              <div class="confirm-modal-body single-element-body">
                <label class="rename-field">
                  <span>Produkt źródłowy</span>
                  <select :value="workSourceProductName" class="select-input" @change="handleWorkSourceProductChange($event.target.value)">
                    <option value="">Wybierz produkt</option>
                    <option v-for="productName in availableProductNames" :key="`work-source-${productName}`" :value="productName">
                      {{ formatProductDisplayName(productName) }}
                    </option>
                  </select>
                </label>
                <label v-if="workSourceRowOptions.length" class="rename-field">
                  <span>Szukaj elementu po nazwie</span>
                  <input v-model="workSourceRowSearch" class="text-input" placeholder="Wpisz nazwę elementu" />
                </label>
                <div class="single-element-summary">
                  <span>{{ filteredWorkSourceRowOptions.length }} / {{ workSourceRowOptions.length }} elementów w produkcie</span>
                  <span>Zaznaczone: {{ selectedWorkRowCount }}</span>
                </div>
                <div v-if="workSourceRowOptions.length" class="favorite-elements-legend">
                  Kod | Długość x Grubość x Szerokość | Materiał
                </div>
                <div v-if="filteredWorkSourceRowOptions.length" class="single-element-list">
                  <div v-for="row in filteredWorkSourceRowOptions" :key="row._localId" class="single-element-row">
                    <label class="single-element-check">
                      <input
                        type="checkbox"
                        :checked="isWorkSourceRowSelected(row._localId)"
                        :disabled="!isWorkSourceRowSelected(row._localId) && selectedWorkRowCount >= workRemainingCapacity"
                        @change="handleWorkSourceRowCheckboxChange(row._localId, $event.target.checked)"
                      />
                      <span class="single-element-row-text">{{ formatTemporaryRowOption(row) }}</span>
                    </label>
                  </div>
                </div>
                <div v-else-if="workSourceRowOptions.length" class="expanded-empty single-element-empty">
                  Brak elementów pasujących do wpisanej nazwy.
                </div>
                <div v-else class="expanded-empty single-element-empty">
                  Wybierz produkt, aby zobaczyć jego elementy.
                </div>
                <div class="confirm-modal-actions">
                  <div class="single-element-capacity" :class="{ full: !workRemainingCapacityAfterSelection }">
                    <strong>Pozycje: {{ projectedWorkRowCount }} / {{ activeRowLimit }}</strong>
                  </div>
                  <button class="tool-btn compact" @click="closeWorkProductModal">Anuluj</button>
                  <button class="tool-btn compact primary" :disabled="!selectedWorkRowCount" @click="addSelectedWorkRows">
                    Dodaj zaznaczone
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <input
        ref="productImageInput"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        class="visually-hidden"
        @change="handleProductImageImport"
      />
      <footer class="app-footer">
        <a class="app-footer-copy app-footer-link" href="https://metal-technika.com.pl/" target="_blank" rel="noopener noreferrer">
          © Metal-Technika
        </a>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import * as XLSX from 'xlsx';

const DEFAULT_ROW_LIMIT = 500;
const PRODUCT_PREVIEW_STORAGE_KEY = 'mt-go-web:selected-product-preview';
const TEMP_PRODUCT_KEY = '__TEMP_PRODUCT__';
const TEMP_EMPTY_PRODUCT_PREFIX = '__TEMP_EMPTY_PRODUCT__';
const SAVED_ROWS_STORAGE_KEY = 'mt-go-web:saved-rows';
const UI_SETTINGS_STORAGE_KEY = 'mt-go-web:ui-settings';
const WORK_MAIN_RECIPE_NAME = 'MT-GO-WEB';

const tabs = [
  { id: 'products', label: '1. Twoje Produkty' },
  { id: 'merge', label: '2. Scal produkty' },
  { id: 'work', label: '3. Aktualnie cięte' },
];
const configTabs = [
  { id: 'stations', label: 'Wybijaki' },
  { id: 'distances', label: 'Odległości' },
  { id: 'parameters', label: 'Parametry' },
];

const productSummaryColumns = ['nazwaProduktu', 'liczbaPozycji', 'sumaElementow', 'materialy', 'ostatniaAktualizacja'];
const productSummaryLabels = {
  nazwaProduktu: 'Plik',
  liczbaPozycji: 'Pozycje',
  sumaElementow: 'Elementy',
  materialy: 'Materiały',
  ostatniaAktualizacja: 'Źródło',
};

const productColumns = ['Nr', 'Kod', 'Długość', 'Grubość', 'Szerokość', 'Materiał', 'ilość', 'Wybijak'];
const productImportFieldDefinitions = [
  {
    key: 'Nazwa',
    label: 'Nazwa',
    required: false,
    aliases: ['Nazwa', 'TYTUŁ', 'TYTUL', 'Nazwa mebla'],
  },
  {
    key: 'Kod',
    label: 'Tekst do druku',
    required: true,
    aliases: ['Kod', 'NR CZĘŚCI', 'NR CZESCI', 'Nadruk', 'Tekst do druku'],
  },
  {
    key: 'Długość',
    label: 'Długość',
    required: true,
    aliases: ['Długość', 'Dł', 'DŁ', 'Dł. [mm]', 'DŁ. [mm]', 'DL', 'DL. [mm]', 'DŁUGOŚĆ', 'DLUGOSC', 'Dlugosc'],
  },
  {
    key: 'Grubość',
    label: 'Grubość',
    required: true,
    aliases: ['Grubość', 'GR.', 'GR. [mm]', 'Grubosc'],
  },
  {
    key: 'Szerokość',
    label: 'Szerokość',
    required: true,
    aliases: ['Szerokość', 'Sz', 'SZER. [mm]', 'SZEROKOŚĆ', 'SZEROKOSC', 'Szerokosc'],
  },
  {
    key: 'Materiał',
    label: 'Materiał',
    required: true,
    aliases: ['Materiał', 'MATERIAŁ', 'MATERIAL', 'OPIS', 'gatunek drewna'],
  },
  {
    key: 'ilość',
    label: 'ilość',
    required: true,
    aliases: ['Ilość', 'ILOŚĆ', 'ILOSC', 'Ilosc', 'ilość'],
  },
  {
    key: 'Wybijak',
    label: 'Wybijak',
    required: false,
    aliases: ['Wybijak'],
  },
  {
    key: 'Klasa',
    label: 'Klasa',
    required: false,
    aliases: ['Klasa', 'KLASA'],
  },
  {
    key: 'Stanowisko',
    label: 'Stanowisko',
    required: false,
    aliases: ['Stanowisko', 'STANOWISKO'],
  },
];
const productImportExportColumns = productImportFieldDefinitions.map((field) => field.key);
const groupOptions = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
const priorityOptions = Array.from({ length: 10 }, (_, index) => String(index));
const materialOptions = ['BUK', 'So'];
const productColumnLabels = {
  Nr: 'Nr',
  Kod: 'Tekst do druku',
  'Długość': 'Długość',
  'Grubość': 'Grubość',
  'Szerokość': 'Szerokość',
  'Materiał': 'Materiał',
  'ilość': 'ilość',
  Wybijak: 'Wybijak',
};
const editableProductColumns = ['Długość', 'Grubość', 'Szerokość', 'Materiał', 'Kod', 'ilość', 'Wybijak'];

const recipeSummaryColumns = ['nazwaReceptury', 'liczbaPozycji', 'sumaElementow', 'materialy', 'createdAt', 'lastUsedAt'];
const recipeCatalogColumns = ['nazwaReceptury', 'liczbaPozycji', 'sumaElementow', 'materialy', 'createdAt', 'lastUsedAt'];
const recipeSummaryLabels = {
  nazwaReceptury: 'Nazwa receptury',
  liczbaPozycji: 'Pozycje',
  sumaElementow: 'Elementy',
  materialy: 'Materiały',
  createdAt: 'Data utworzenia',
  lastUsedAt: 'Ostatnio użyta',
};

const recipeColumns = [
  'TekstDoDruku',
  'nazwaSkladowej',
  'dlugosc',
  'grubosc',
  'szerokosc',
  'material',
  'idReceptury',
  'idSkladowej',
  'wybijak',
  'Klasa',
  'Stanowisko',
  'grupa',
  'priorytet',
  'ilosc',
  'iloscWykonana',
  'Informacje',
];
const workRecipePreviewColumns = recipeColumns.filter(
  (column) => !['nazwaSkladowej', 'idReceptury', 'idSkladowej', 'iloscWykonana', 'Informacje', 'grupa', 'priorytet'].includes(column),
);
const mergeRecipeColumns = [
  'TekstDoDruku',
  'dlugosc',
  'szerokosc',
  'grubosc',
  'material',
  'Klasa',
  'Stanowisko',
  'ilosc',
  'wybijak',
];
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

const workColumns = [
  'id',
  'TekstDoDruku',
  'Dlugosc',
  'Szerokosc',
  'Grubosc',
  'Material',
  'Klasa',
  'Stanowisko',
  'Wybijak',
  'Progress',
];
const savedWorkPreviewColumns = [
  'id',
  'Nazwa',
  'Dlugosc',
  'Szerokosc',
  'Grubosc',
  'Material',
  'TekstDoDruku',
  'Klasa',
  'Stanowisko',
  'Wybijak',
  'Sztuk',
  'ProgressLabel',
];
const workColumnLabels = {
  id: 'ID',
  Nazwa: 'Nazwa',
  Material: 'Materiał',
  Grubosc: 'Grubość',
  Szerokosc: 'Szerokość',
  Dlugosc: 'Długość',
  Progress: 'Progress',
  Wybijak: 'Wybijak',
  TekstDoDruku: 'Tekst do druku',
  Klasa: 'Klasa',
  Stanowisko: 'Stanowisko',
  Sztuk: 'Ilość',
  ProgressLabel: 'Progress',
};

const savedColumns = ['NazwaRec', 'Wiersze', 'CzasOdloz', 'Notatka'];
const savedColumnLabels = {
  NazwaRec: 'Receptura',
  Wiersze: 'Wiersze',
  CzasOdloz: 'Czas odłożenia',
  Notatka: 'Notatka',
};

const activeTab = ref('products');
const DEFAULT_PRINT_TEXT_MAX_LENGTH = 100;
const DEFAULT_BOARD_MAX_LENGTH = 3500;
const DEFAULT_MAX_QUANTITY = 10000;
const DEFAULT_MACHINE_PUNCH_COUNT = 6;
const DEFAULT_ACTIVE_EXCEL_COLUMNS = ['Nazwa', 'Kod', 'Długość', 'Grubość', 'Szerokość', 'Materiał', 'ilość', 'Wybijak', 'Klasa', 'Stanowisko'];
const currentTime = ref('');
const machineStatusRow = ref(null);
const isDatabaseConnected = ref(false);
const isSettingsPanelOpen = ref(false);
const animationsEnabled = ref(loadAnimationsEnabledSetting());
const isConfigPanelOpen = ref(false);
const activeConfigTab = ref('stations');
const configStations = ref([]);
const configMachines = ref([]);
const configProductsDirectory = ref('');
const configSettings = ref({
  printTextMaxLength: DEFAULT_PRINT_TEXT_MAX_LENGTH,
  boardMaxLength: DEFAULT_BOARD_MAX_LENGTH,
  maxQuantity: DEFAULT_MAX_QUANTITY,
  machinePunchCount: DEFAULT_MACHINE_PUNCH_COUNT,
  activeExcelColumns: DEFAULT_ACTIVE_EXCEL_COLUMNS,
});
const favoriteElements = ref([]);
const activeMachineId = ref('machine-1');
const savedConfigSnapshot = ref('{"productsDirectory":"","stations":[],"settings":{"printTextMaxLength":100,"boardMaxLength":3500,"maxQuantity":10000,"machinePunchCount":6,"activeExcelColumns":["Nazwa","Kod","Długość","Grubość","Szerokość","Materiał","ilość","Wybijak","Klasa","Stanowisko"]},"activeMachineId":"machine-1","machines":[{"id":"machine-1","name":"Maszyna 1","rowLimit":500}],"favoriteElements":[]}');
const isConfigSaving = ref(false);
const isSelectingProductsDirectory = ref(false);
const isConfigLoaded = ref(false);
const configSaveMessage = ref('');
const configSaveError = ref(false);
const configUnsavedDialog = ref({
  visible: false,
  nextTab: '',
  shouldClosePanel: false,
});
const configDistanceImpactDialog = ref({
  visible: false,
  stationId: '',
  ruleId: '',
});
const selectedProducts = ref([]);
const mergeProductQuantities = ref({});
const mergeProductQuantityDrafts = ref({});
const mergeProductSearch = ref('');
const mergeAlert = ref({
  visible: false,
  message: '',
});
const stationAutoAssignDialog = ref({
  visible: false,
  target: '',
});
const lastMergeInteractedProduct = ref('');
const mergeCheckboxResetProduct = ref('');
const mergeCheckboxResetVersion = ref(0);
const isMergeSelectionCollapsed = ref(false);
const mergeEditModes = ref({});
const mergeEditingCell = ref(null);
const mergeRecipeDrafts = ref({});
const temporaryMergeProductNames = ref({});
const mergeProductNameEditKey = ref('');
const mergeProductNameDraft = ref('');
const mergeQuantityPulse = ref({});
const mergeProductSaveMessage = ref('');
const mergeProductSaveError = ref(false);
const mergeProductSavingMap = ref({});
const mergeWorkUploadMessage = ref('');
const mergeWorkUploadError = ref(false);
const isMergeUploadingToWorkMain = ref(false);
const mergePreviewProductName = ref('');
const isFavoriteElementsModalOpen = ref(false);
const isFavoriteSourceModalOpen = ref(false);
const isSingleElementModalOpen = ref(false);
const temporarySourceChangeDialog = ref({
  visible: false,
  nextProductName: '',
});
const temporaryProductName = ref('Produkt dodatkowy');
const temporarySourceProductName = ref('');
const favoriteSourceProductName = ref('');
const temporarySourceRowId = ref('');
const temporarySelectedRowIds = ref({});
const selectedRecipe = ref('');
const selectedRecipePreviewName = ref('');
const recipeCatalogSearch = ref('');
const recipeCatalogMaterialFilter = ref('');
const recipeCatalogUsageFilter = ref('all');
const reportSourceMode = ref('current');
const selectedReportSavedWorkIds = ref([]);
const reportMessage = ref('');
const reportError = ref(false);
const isReportExportLoading = ref(false);
const selectedRecipeNames = ref([]);
const recipeCatalogActionMessage = ref('');
const recipeCatalogActionError = ref(false);
const isRecipeCatalogActionLoading = ref(false);
const isRecipePreviewEditMode = ref(false);
const recipePreviewDraftRows = ref([]);
const recipePreviewEditingCell = ref(null);
const recipePreviewSaveMessage = ref('');
const recipePreviewSaveError = ref(false);
const isWorkRecipeMenuOpen = ref(false);
const workRecipePickerRef = ref(null);
const isWorkRecipePreviewOpen = ref(false);
const isSavedRecipePreviewOpen = ref(false);
const savedWorkPreviewId = ref('');
const workRecipeSearch = ref('');
const workTableSourceName = ref('');
const workTableSourceMode = ref('active');
const workMainLastRefreshAt = ref(null);
const isWorkMainManualRefreshLoading = ref(false);
const selectedProductName = ref('');
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
const isWorkCorrectionSaving = ref(false);
const isWorkEditPreparing = ref(false);
const workUploadMessage = ref('');
const workUploadError = ref(false);
const workEditingRowId = ref(null);
const workDisableCooldownRowId = ref(null);
const isWorkProductModalOpen = ref(false);
const workSourceProductName = ref('');
const workSourceRowSearch = ref('');
const workSelectedRowIds = ref({});
const workCorrectionDrafts = ref({});
let workDisableCooldownTimerId = null;
const isFileActionLoading = ref(false);
const productFileActionMessage = ref('');
const productFileActionError = ref(false);
const productImageSavingMap = ref({});
const productImageState = ref({});
const productImagePreview = ref({
  visible: false,
  productName: '',
  title: '',
  url: '',
});
const pendingProductImageTarget = ref({
  productName: '',
  title: '',
});
const isRenameMode = ref(false);
const renameDraft = ref('');
const editingRows = ref([]);
const activeEditCell = ref(null);
const collapsedRecipeGroups = ref({});
const fileImportInput = ref(null);
const productImageInput = ref(null);
const recipeImportInput = ref(null);
const confirmDialog = ref({
  visible: false,
  action: '',
  message: '',
});
const saveRecipeValidationError = computed(() => {
  if (!recipeRows.value.length) return 'Brak wierszy do zapisania.';

  const groupingValidationError = getSequentialGroupValidationError(recipeRows.value);
  if (groupingValidationError) return groupingValidationError;

  const recipeValidationMessage = getRecipeRowsValidationMessage(recipeRows.value, 'Nie można zapisać receptury.');
  if (recipeValidationMessage) return recipeValidationMessage;

  const wybijakValidationError = getRecipePreviewWybijakValidationError(recipeRows.value);
  if (wybijakValidationError) return wybijakValidationError;

  return '';
});
const recipeImportConflictDialog = ref({
  visible: false,
  contentText: '',
  duplicateNames: [],
});
const restoreSavedWorkDialog = ref({
  visible: false,
  idRap: '',
  name: '',
  loading: false,
});
const postponeWorkDialog = ref({
  visible: false,
  note: '',
  loading: false,
});
const configDistanceEditStart = ref({
  stationId: '',
  ruleId: '',
  value: '',
});
const productImportMappingDialog = ref({
  visible: false,
  fileName: '',
  headers: [],
  previewRows: [],
  mapping: {},
  missingTargets: [],
  message: '',
  processing: false,
});
let productImportMappingResolver = null;

let timerId = null;
let workRefreshTimerId = null;
let machineStatusTimerId = null;
let recipePreviewMessageTimerId = null;
const mergeQuantityPulseTimers = new Map();
let productLocalIdCounter = 1;
let workRowClientIdCounter = 1;
let configStationIdCounter = 1;
let configPunchIdCounter = 1;
let configDistanceIdCounter = 1;
let configLengthRangeIdCounter = 1;
let configMachineIdCounter = 2;

const workRows = ref([]);

const defaultSavedRows = [];
const savedRows = ref(loadSavedRows());

function isElementVisible(element) {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function findVisibleErrorAnchor(anchorName) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const elements = document.querySelectorAll(`[data-error-anchor="${anchorName}"]`);
  for (const element of elements) {
    if (isElementVisible(element)) {
      return element;
    }
  }
  return null;
}

async function scrollToErrorAnchor(anchorName) {
  await nextTick();
  const element = findVisibleErrorAnchor(anchorName);
  if (!element) return;
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
  });
}

function watchErrorAnchor(source, anchorName, isActive = (value) => Boolean(value)) {
  watch(source, (value) => {
    if (!isActive(value)) return;
    scrollToErrorAnchor(anchorName);
  });
}

watch(
  savedRows,
  () => {
    persistSavedRows();
  },
  { deep: true },
);
watch(animationsEnabled, () => {
  persistUiSettings();
});
watchErrorAnchor(() => (configSaveError.value ? configSaveMessage.value : ''), 'config-save');
watchErrorAnchor(() => (productFileActionError.value ? productFileActionMessage.value : ''), 'product-file-action');
watchErrorAnchor(() => (saveError.value ? saveMessage.value : ''), 'product-save');
watchErrorAnchor(() => (mergeProductSaveError.value ? mergeProductSaveMessage.value : ''), 'merge-product-save');
watchErrorAnchor(() => (mergeWorkUploadError.value ? mergeWorkUploadMessage.value : ''), 'merge-work-upload');
watchErrorAnchor(() => (recipeCatalogActionError.value ? recipeCatalogActionMessage.value : ''), 'recipe-catalog-action');
watchErrorAnchor(() => (reportError.value ? reportMessage.value : ''), 'report-status');
watchErrorAnchor(() => (recipePreviewSaveError.value ? recipePreviewSaveMessage.value : ''), 'recipe-preview-save');
watchErrorAnchor(() => (workUploadError.value ? workUploadMessage.value : ''), 'work-upload');

const savedRecipeCatalog = ref([]);
const workRowsSnapshot = ref('[]');

const selectedProductFile = computed(() => productFiles.value.find((entry) => entry.name === selectedProductName.value) || null);
const selectedProductHasImage = computed(() => hasProductImage(selectedProductName.value));
const isSelectedProductImageBusy = computed(() => isProductImageBusy(selectedProductName.value));
const activeMachine = computed(
  () => configMachines.value.find((machine) => machine.id === activeMachineId.value) ?? configMachines.value[0] ?? null,
);
const activeRowLimit = computed(() => {
  const rawLimit = Number(String(activeMachine.value?.rowLimit ?? DEFAULT_ROW_LIMIT).replace(',', '.'));
  return Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : DEFAULT_ROW_LIMIT;
});
const stationOptions = computed(() =>
  configStations.value.map((station, index) => ({
    id: station.id,
    value: String(index + 1),
    label: getConfigStationLabel(index),
  })),
);
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
const favoriteSourceRowOptions = computed(() => productRowsByName.value[favoriteSourceProductName.value] ?? []);
const selectedTemporaryRowCount = computed(
  () => Object.values(temporarySelectedRowIds.value).filter(Boolean).length,
);
const projectedRecipeCount = computed(() => recipeRows.value.length + selectedTemporaryRowCount.value);
const remainingRecipeCapacity = computed(() => Math.max(0, activeRowLimit.value - recipeRows.value.length));
const remainingRecipeCapacityAfterSelection = computed(() => Math.max(0, activeRowLimit.value - projectedRecipeCount.value));

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

  return result.slice(0, activeRowLimit.value);
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
    createdAt: entry.createdAt || entry.CzasOdloz || '',
    lastUsedAt: entry.lastUsedAt || 'Nigdy',
  })),
);
const recipeCatalogMaterials = computed(() =>
  [...new Set(recipeCatalog.value.flatMap((entry) => String(entry.materialy || '').split(',').map((item) => item.trim()).filter(Boolean)))].sort((a, b) =>
    a.localeCompare(b, 'pl', { sensitivity: 'base' }),
  ),
);
const filteredRecipeCatalog = computed(() => {
  const query = recipeCatalogSearch.value.trim().toLowerCase();
  return recipeCatalog.value.filter((entry) => {
    const matchesQuery =
      !query ||
      [
        entry.nazwaReceptury,
        entry.materialy,
        entry.createdAt,
        entry.lastUsedAt,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesMaterial =
      !recipeCatalogMaterialFilter.value ||
      String(entry.materialy || '')
        .split(',')
        .map((item) => item.trim())
        .includes(recipeCatalogMaterialFilter.value);
    const matchesUsage =
      recipeCatalogUsageFilter.value === 'all' ||
      (recipeCatalogUsageFilter.value === 'used' && entry.lastUsedAt !== 'Nigdy') ||
      (recipeCatalogUsageFilter.value === 'unused' && entry.lastUsedAt === 'Nigdy');
    return matchesQuery && matchesMaterial && matchesUsage;
  });
});
const selectedRecipeCatalogEntries = computed(() =>
  savedRecipeCatalog.value.filter((entry) => selectedRecipeNames.value.includes(entry.nazwaReceptury)),
);
const selectedRecipeCatalogCount = computed(() => selectedRecipeCatalogEntries.value.length);

const selectedRecipePreviewRows = computed(() => {
  const recipe = recipeCatalogEntries.value.find((entry) => entry.nazwaReceptury === selectedRecipePreviewName.value);
  return recipe ? recipe.rows : [];
});
const recipePreviewRows = computed(() => (isRecipePreviewEditMode.value ? recipePreviewDraftRows.value : selectedRecipePreviewRows.value));

const recipeNames = computed(() => [...new Set(savedRecipeCatalog.value.map((entry) => entry.nazwaReceptury).filter(Boolean))]);
const filteredWorkRecipeNames = computed(() => {
  const query = workRecipeSearch.value.trim().toLowerCase();
  if (!query) return recipeNames.value;
  return recipeNames.value.filter((name) => name.toLowerCase().includes(query));
});
const selectedSavedWorkPreview = computed(
  () => savedRows.value.find((row) => String(row.idRap) === String(savedWorkPreviewId.value)) || null,
);
const selectedReportSavedWorkRows = computed(() =>
  savedRows.value.filter((row) => selectedReportSavedWorkIds.value.includes(String(row.idRap))),
);
const selectedReportSavedWorkCount = computed(() => selectedReportSavedWorkRows.value.length);
const canExportReport = computed(() =>
  reportSourceMode.value === 'current' ? activeWorkRows.value.length > 0 : selectedReportSavedWorkCount.value > 0,
);
const savedWorkPreviewRows = computed(() => {
  if (!selectedSavedWorkPreview.value?.rows) return [];
  try {
    const parsedRows = JSON.parse(selectedSavedWorkPreview.value.rows);
    if (!Array.isArray(parsedRows)) return [];
    return parsedRows.map((row) => {
      const doneValue = getWorkDisplayedDoneValue('', row?.Progress?.done ?? row?.WykonaneSztuki ?? 0);
      const totalValue = getWorkDisplayedTotalValue('', row?.Progress?.total ?? row?.Sztuk ?? 0);
      return {
        ...row,
        Wybijak: formatWorkWybijakDisplayValue(row),
        ProgressLabel: `${doneValue}/${totalValue}`,
      };
    });
  } catch {
    return [];
  }
});
const workSourceRowOptions = computed(() => productRowsByName.value[workSourceProductName.value] ?? []);
const filteredWorkSourceRowOptions = computed(() => {
  const query = workSourceRowSearch.value.trim().toLowerCase();
  if (!query) return workSourceRowOptions.value;
  return workSourceRowOptions.value.filter((row) =>
    String(row?.Nazwa ?? row?.nazwaSkladowej ?? '')
      .toLowerCase()
      .includes(query),
  );
});
const selectedWorkRowCount = computed(() => Object.values(workSelectedRowIds.value).filter(Boolean).length);
const projectedWorkRowCount = computed(() => workRows.value.length + selectedWorkRowCount.value);
const workRemainingCapacity = computed(() => Math.max(0, activeRowLimit.value - workRows.value.length));
const workRemainingCapacityAfterSelection = computed(() => Math.max(0, activeRowLimit.value - projectedWorkRowCount.value));
const hasPendingRecipePreviewChanges = computed(() => {
  if (!isRecipePreviewEditMode.value) return false;
  const normalizeRows = (rows) =>
    rows.map((row) => {
      const { _localId, ...rest } = row || {};
      return rest;
    });
  return JSON.stringify(normalizeRows(recipePreviewDraftRows.value)) !== JSON.stringify(normalizeRows(selectedRecipePreviewRows.value));
});
function normalizeMachineWorkingState(rawValue) {
  if (rawValue === null || rawValue === undefined) return false;
  if (typeof rawValue === 'boolean') return rawValue;

  const normalizedText = String(rawValue).trim().toLowerCase();
  if (!normalizedText) return false;

  if (['0', 'false', 'off', 'stop', 'stopped', 'idle', 'wyłączona', 'wylaczona', 'zatrzymana', 'nie'].includes(normalizedText)) {
    return false;
  }

  if (['1', 'true', 'on', 'run', 'running', 'pracuje', 'włączona', 'wlaczona', 'tak'].includes(normalizedText)) {
    return true;
  }

  const normalizedNumber = Number(normalizedText.replace(',', '.'));
  return Number.isFinite(normalizedNumber) && normalizedNumber === 1;
}

const machineStatusValue = computed(() => {
  const rawValue = machineStatusRow.value?.Wartosc ?? machineStatusRow.value?.statusPracy ?? 0;
  return normalizeMachineWorkingState(rawValue) ? 1 : 0;
});
const databaseConnectionLabel = computed(() => (isDatabaseConnected.value ? 'SQL Msm' : 'SQL Msm offline'));
const databaseConnectionBadgeClass = computed(() => (isDatabaseConnected.value ? 'online' : 'offline'));
const isMachineWorking = computed(() => machineStatusValue.value === 1);
const machineStatusLabel = computed(() => (isMachineWorking.value ? 'Maszyna pracuje' : 'Maszyna zatrzymana'));
const machineStatusBadgeClass = computed(() => (isMachineWorking.value ? 'online' : 'offline'));
const configPayload = computed(() => ({
  productsDirectory: String(configProductsDirectory.value ?? '').trim(),
  stations: configStations.value.map((station) => ({
    id: station.id,
    punches: station.punches.map((punch) => ({
      id: punch.id,
      number: String(punch.number ?? ''),
    })),
    lengthRange: station.lengthRange
      ? {
          id: station.lengthRange.id,
          minLength: String(station.lengthRange.minLength ?? ''),
          maxLength: String(station.lengthRange.maxLength ?? ''),
        }
      : null,
    distanceRules: station.distanceRules.map((rule) => ({
      id: rule.id,
      leftPunch: String(rule.leftPunch ?? ''),
      rightPunch: String(rule.rightPunch ?? ''),
      distance: String(rule.distance ?? ''),
    })),
  })),
  settings: {
    printTextMaxLength: Math.max(1, normalizeWorkCorrectionValue(configSettings.value.printTextMaxLength || DEFAULT_PRINT_TEXT_MAX_LENGTH)),
    boardMaxLength: Math.max(1, normalizeWorkCorrectionValue(configSettings.value.boardMaxLength || DEFAULT_BOARD_MAX_LENGTH)),
    maxQuantity: Math.max(1, normalizeWorkCorrectionValue(configSettings.value.maxQuantity || DEFAULT_MAX_QUANTITY)),
    machinePunchCount: Math.max(1, normalizeWorkCorrectionValue(configSettings.value.machinePunchCount || DEFAULT_MACHINE_PUNCH_COUNT)),
    activeExcelColumns: sanitizeActiveExcelColumns(configSettings.value.activeExcelColumns),
  },
  activeMachineId: activeMachineId.value,
  machines: configMachines.value.map((machine) => ({
    id: machine.id,
    rowLimit: Math.max(1, normalizeWorkCorrectionValue(machine.rowLimit || DEFAULT_ROW_LIMIT)),
  })),
  favoriteElements: favoriteElements.value.map((favorite) => ({
    id: favorite.id,
    sourceProductName: favorite.sourceProductName,
    sourceRowIndex: favorite.sourceRowIndex,
    label: favorite.label,
    row: favorite.row,
  })),
}));
const isConfigDirty = computed(() => JSON.stringify(configPayload.value) !== savedConfigSnapshot.value);
const hasConfiguredStationLengthRanges = computed(() =>
  configStations.value.some((station) => {
    const minLength = getNormalizedLengthValue(station.lengthRange?.minLength);
    const maxLength = getNormalizedLengthValue(station.lengthRange?.maxLength);
    return minLength > 0 || maxLength > 0;
  }),
);
const hasConfiguredStations = computed(() => configStations.value.length > 0);
const maxConfiguredStationCount = computed(() => Math.max(1, normalizeWorkCorrectionValue(configSettings.value.machinePunchCount || DEFAULT_MACHINE_PUNCH_COUNT)));

const hasPendingWorkChanges = computed(() => serializeWorkRows(workRows.value) !== workRowsSnapshot.value);
const savedWorkRowsSnapshot = computed(() => {
  try {
    const parsed = JSON.parse(workRowsSnapshot.value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});
const savedWorkRowsById = computed(
  () =>
    new Map(
      savedWorkRowsSnapshot.value.map((row, index) => [
        Number(getWorkRowPayload(row, index).id),
        {
          ...getWorkRowPayload(row, index),
          __disabled: Boolean(row?.__disabled),
        },
      ]),
    ),
);
const activeWorkRows = computed(() => workRows.value.filter((row) => !row.__disabled));
const overallWorkDone = computed(() =>
  activeWorkRows.value.reduce((sum, row) => sum + normalizeWorkCorrectionValue(row?.WykonaneSztuki), 0),
);
const overallWorkTotal = computed(() =>
  activeWorkRows.value.reduce((sum, row) => sum + normalizeWorkCorrectionValue(row?.Sztuk), 0),
);
const overallWorkProgressPercent = computed(() => getWorkProgressPercent(overallWorkDone.value, overallWorkTotal.value));
const workTableSourceNameLabel = computed(() => workTableSourceName.value || 'Aktualna praca');
const workTableSourceStatusLabel = computed(() => (workTableSourceMode.value === 'preview' ? 'podgląd' : 'aktywna'));
const isWorkTableSourceActive = computed(() => workTableSourceMode.value === 'active');
const workMainLastRefreshLabel = computed(() => {
  if (!(workMainLastRefreshAt.value instanceof Date)) return 'Ostatnia aktualizacja : --:--:--';
  return `Ostatnia aktualizacja : ${workMainLastRefreshAt.value.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`;
});
const isWorkMainManualRefreshDisabled = computed(
  () =>
    !isWorkTableSourceActive.value ||
    isWorkMainManualRefreshLoading.value ||
    workEditingRowId.value !== null ||
    hasPendingWorkChanges.value ||
    isWorkCorrectionSaving.value ||
    isWorkEditPreparing.value,
);

const workDisplayRows = computed(() =>
  workRows.value.map((row) => ({
    __clientId: row.__clientId,
    __disabled: Boolean(row.__disabled),
    __isPendingSync: isWorkRowPendingSync(row),
    id: row.id ?? '',
    Nazwa: row.Nazwa ?? '',
    Material: row.Material ?? '',
    Grubosc: row.Grubosc ?? '',
    Szerokosc: row.Szerokosc ?? '',
    Dlugosc: row.Dlugosc ?? '',
    Progress: {
      done: row.WykonaneSztuki ?? 0,
      total: row.Sztuk ?? 0,
    },
    Wybijak: row.Wybijak ?? '',
    TekstDoDruku: row.TekstDoDruku ?? '',
    Klasa: row.Klasa ?? '',
    Sztuk: row.Sztuk ?? '',
    Stanowisko: row.Stanowisko ?? '',
  })),
);

function isWorkRowPendingSync(row, index = 0) {
  if (row?.__isLocalDraft) return true;

  const currentRowSnapshot = {
    ...getWorkRowPayload(row, index),
    __disabled: Boolean(row?.__disabled),
  };
  const savedRowSnapshot = savedWorkRowsById.value.get(Number(currentRowSnapshot.id));
  if (!savedRowSnapshot) return true;

  return JSON.stringify(currentRowSnapshot) !== JSON.stringify(savedRowSnapshot);
}

function syncWorkTableSourceFromRows(rows = []) {
  const uniqueNames = [...new Set(rows.map((row) => String(row?.NazwaRec ?? '').trim()).filter(Boolean))];
  if (!uniqueNames.length) {
    workTableSourceName.value = '';
    workTableSourceMode.value = 'active';
    return;
  }

  workTableSourceName.value = uniqueNames.length === 1 ? uniqueNames[0] : 'Aktualna praca';
  if (workTableSourceMode.value !== 'preview') {
    workTableSourceMode.value = 'active';
  }
}

function normalizeWorkCorrectionValue(value) {
  const normalizedText = String(value ?? '')
    .replace(/[^\d]/g, '')
    .trim();
  const parsed = normalizedText ? Number.parseInt(normalizedText, 10) : 0;
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function normalizeWybijakPartInputValue(value) {
  return String(value ?? '')
    .replace(/[^\d]/g, '')
    .slice(0, 1);
}

function getRecipeWybijakValidationIssue(row, rowIndex = null) {
  const maxPunchCount = Math.max(1, normalizeWorkCorrectionValue(configSettings.value.machinePunchCount || DEFAULT_MACHINE_PUNCH_COUNT));
  const rowPrefix = rowIndex === null ? '' : `Wiersz ${rowIndex + 1}: `;
  const sourceRow = row || {};
  const rawValue = String(sourceRow.wybijak ?? sourceRow.Wybijak ?? '').trim();
  const [firstPart, secondPart] = getWybijakInputParts(rawValue, sourceRow.Stanowisko);
  const normalizedFirstPart = String(firstPart ?? '').replace(/[^\d]/g, '').trim();
  const normalizedSecondPart = String(secondPart ?? '').replace(/[^\d]/g, '').trim();

  if (!normalizedFirstPart && !normalizedSecondPart) {
    return `${rowPrefix}wybijak jest wymagany.`;
  }

  if (rawValue.includes(' i ')) {
    if (!normalizedFirstPart || !normalizedSecondPart) {
      return `${rowPrefix}wybijak musi mieć dwie poprawne wartości.`;
    }
    if (normalizedFirstPart.length > 1 || normalizedSecondPart.length > 1) {
      return `${rowPrefix}każdy wybijak może mieć tylko jedną cyfrę.`;
    }
    if (normalizedFirstPart === '0' || Number(normalizedFirstPart) > maxPunchCount) {
      return `${rowPrefix}pierwszy wybijak musi być w zakresie 1-${maxPunchCount}.`;
    }
    if (normalizedSecondPart === '0' || Number(normalizedSecondPart) > maxPunchCount) {
      return `${rowPrefix}drugi wybijak musi być w zakresie 1-${maxPunchCount}.`;
    }
    return '';
  }

  const rawDigits = `${normalizedFirstPart}${normalizedSecondPart}`;

  if (rawDigits.length > 2) {
    return `${rowPrefix}wybijak może mieć maksymalnie 2 cyfry.`;
  }

  const digitFirstPart = rawDigits[0] ?? '';
  const digitSecondPart = rawDigits[1] ?? '';

  if (digitFirstPart === '0' || Number(digitFirstPart) > maxPunchCount) {
    return `${rowPrefix}pierwszy wybijak musi być w zakresie 1-${maxPunchCount}.`;
  }

  if (rawDigits.length === 2 && (digitSecondPart === '0' || Number(digitSecondPart) > maxPunchCount)) {
    return `${rowPrefix}drugi wybijak musi być w zakresie 1-${maxPunchCount}.`;
  }

  return '';
}

function getRecipePreviewWybijakValidationError(rows = []) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const issue = getRecipeWybijakValidationIssue(rows[rowIndex], rowIndex);
    if (issue) return issue;
  }
  return '';
}

function getMergeCellValidationMessage(row, column) {
  if (column === 'wybijak') {
    return getRecipeWybijakValidationIssue(row);
  }

  const validationLabelByKey = {
    TekstDoDruku: ['Tekst do druku >'],
    material: ['Materiał'],
    dlugosc: ['Długość', 'Długość: nieprawidłowy format'],
    grubosc: ['Grubość', 'Grubość: nieprawidłowy format'],
    szerokosc: ['Szerokość', 'Szerokość: nieprawidłowy format'],
    ilosc: ['Ilość', 'Ilość: nieprawidłowy format', 'Ilość >'],
  };

  const expectedLabels = validationLabelByKey[column];
  if (!expectedLabels) return '';

  const missingFields = getRecipeRowMissingFields(row);
  const matchedMessage = missingFields.find((field) =>
    expectedLabels.some((label) => (label.endsWith('>') ? field.startsWith(label) : field === label)),
  );
  if (!matchedMessage) return '';

  if (matchedMessage.includes(': nieprawidłowy format')) {
    return matchedMessage.replace(': nieprawidłowy format', ' musi być liczbą całkowitą.');
  }

  if (column === 'ilosc' && matchedMessage.startsWith('Ilość > ')) {
    return matchedMessage;
  }

  if (column === 'TekstDoDruku' && matchedMessage.startsWith('Tekst do druku > ')) {
    return matchedMessage;
  }

  const expectedLabel = expectedLabels[0];
  if (!expectedLabel) return '';
  return `${expectedLabel} jest wymagane.`;
}

function getMergeCellValidationCriteria(column) {
  const printTextMaxLength = Math.max(1, normalizeWorkCorrectionValue(configSettings.value.printTextMaxLength || DEFAULT_PRINT_TEXT_MAX_LENGTH));
  const boardMaxLength = Math.max(1, normalizeWorkCorrectionValue(configSettings.value.boardMaxLength || DEFAULT_BOARD_MAX_LENGTH));
  const maxQuantity = Math.max(1, normalizeWorkCorrectionValue(configSettings.value.maxQuantity || DEFAULT_MAX_QUANTITY));
  const maxPunchCount = Math.max(1, normalizeWorkCorrectionValue(configSettings.value.machinePunchCount || DEFAULT_MACHINE_PUNCH_COUNT));

  switch (column) {
    case 'TekstDoDruku':
      return `Pole opcjonalne. Maksymalnie ${printTextMaxLength} znaków, bez polskich znaków.`;
    case 'material':
      return 'Wymagane pole.';
    case 'dlugosc':
      return `Wymagane pole. Liczba całkowita w mm. Zakres: 1-${boardMaxLength}.`;
    case 'grubosc':
      return 'Wymagane pole. Liczba całkowita.';
    case 'szerokosc':
      return 'Wymagane pole. Liczba całkowita.';
    case 'ilosc':
      return `Wymagane pole. Liczba całkowita. Zakres: 1-${maxQuantity}.`;
    case 'wybijak':
      return `Wymagane pole. 1 lub 2 wybijaki. Każdy wybijak musi mieć 1 cyfrę i być w zakresie 1-${maxPunchCount}.`;
    default:
      return '';
  }
}

function getMergeRecipeRowDisplayIndex(row) {
  const numericIndex = Number(row?.idSkladowej);
  if (!Number.isFinite(numericIndex) || numericIndex < 0) return '';
  return numericIndex + 1;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getWorkUploadMessageHtml() {
  const normalizedMessage = String(workUploadMessage.value ?? '').trim();
  const targetMessage = 'Edycja aktualnej pracy jest dostępna tylko gdy maszyna jest zatrzymana.';
  if (normalizedMessage === targetMessage) {
    return 'Edycja <strong>aktualnej pracy</strong> jest dostępna tylko gdy maszyna jest zatrzymana.';
  }
  return escapeHtml(workUploadMessage.value);
}

function nextWorkRowClientId() {
  const nextId = workRowClientIdCounter;
  workRowClientIdCounter += 1;
  return `work-row-${nextId}`;
}

function buildPrzekrojValue(grubosc, szerokosc) {
  const normalizedGrubosc = normalizeWorkCorrectionValue(grubosc);
  const normalizedSzerokosc = normalizeWorkCorrectionValue(szerokosc);
  if (!normalizedGrubosc && !normalizedSzerokosc) return '';
  return `${String(normalizedGrubosc).padStart(3, '0')}x${String(normalizedSzerokosc).padStart(3, '0')}`;
}

function parsePrzekrojValue(przekroj) {
  const normalized = String(przekroj ?? '').trim();
  const match = normalized.match(/(\d+)\D+(\d+)/);
  if (!match) {
    return {
      Grubosc: 0,
      Szerokosc: 0,
    };
  }

  return {
    Grubosc: normalizeWorkCorrectionValue(match[1]),
    Szerokosc: normalizeWorkCorrectionValue(match[2]),
  };
}

function resolveWorkWybijakValue(stanowisko, dlugosc, wybijak) {
  const explicitWybijak = normalizeWorkCorrectionValue(wybijak);
  if (explicitWybijak > 0) return explicitWybijak;

  const normalizedStation = normalizeStationValue(stanowisko);
  const normalizedLength = normalizeWorkCorrectionValue(dlugosc);
  if (!normalizedStation || !normalizedLength) return explicitWybijak;

  return normalizeWorkCorrectionValue(getWybijakValueForStation(normalizedStation, normalizedLength));
}

function resolveStationFromWybijak(wybijak) {
  const normalizedWybijak = String(wybijak ?? '').replace(/[^\d]/g, '').trim();
  if (!normalizedWybijak) return '';

  for (let index = 0; index < configStations.value.length; index += 1) {
    const punchNumbers = getConfigStationOrderedPunches(configStations.value[index])
      .map((punch) => String(punch ?? '').replace(/[^\d]/g, '').trim())
      .filter(Boolean)
      .slice(0, 2);

    if (!punchNumbers.length) continue;
    if (punchNumbers.length === 2 && normalizedWybijak === punchNumbers.join('')) {
      return String(index + 1);
    }
    if (punchNumbers[0] === normalizedWybijak) {
      return String(index + 1);
    }
  }

  return '';
}

function getWorkRowPayload(row, index = 0) {
  const parsedPrzekroj = parsePrzekrojValue(row?.Przekroj);
  const grubosc = normalizeWorkCorrectionValue(row?.Grubosc ?? parsedPrzekroj.Grubosc);
  const szerokosc = normalizeWorkCorrectionValue(row?.Szerokosc ?? parsedPrzekroj.Szerokosc);
  const sztuk = normalizeWorkCorrectionValue(row?.Sztuk);
  const dlugosc = normalizeWorkCorrectionValue(row?.Dlugosc);
  const explicitStation = normalizeStationValue(row?.Stanowisko ?? row?.stanowisko);
  const stanowisko = explicitStation || resolveStationFromWybijak(row?.Wybijak);
  const wybijak = resolveWorkWybijakValue(stanowisko, dlugosc, row?.Wybijak);
  const tekstDoDruku = normalizePrintTextValue(row?.TekstDoDruku ?? '');
  return {
    id: normalizeWorkCorrectionValue(row?.id || index + 1),
    SourceProductName: String(row?.SourceProductName ?? '').trim(),
    Nazwa: tekstDoDruku,
    NazwaRec: WORK_MAIN_RECIPE_NAME,
    Material: String(row?.Material ?? '').trim(),
    Przekroj: buildPrzekrojValue(grubosc, szerokosc),
    Grubosc: grubosc,
    Szerokosc: szerokosc,
    Dlugosc: dlugosc,
    Sztuk: sztuk,
    WykonaneSztuki: normalizeWorkCorrectionValue(row?.WykonaneSztuki),
    Wybijak: wybijak,
    TekstDoDruku: tekstDoDruku,
    Grupa: normalizeGroupValue(row?.Grupa ?? row?.grupa ?? ''),
    Priorytet: normalizePriorityValue(row?.Priorytet ?? row?.priorytet ?? ''),
    Klasa: normalizeWorkCorrectionValue(row?.Klasa ?? row?.klasa),
    Usr: String(row?.Usr ?? 'Default').trim() || 'Default',
    zliczonaIloscIn: sztuk,
    Stanowisko: stanowisko,
  };
}

function normalizeDefaultClassValue(value, fallback = 2) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' && !value.trim()) return fallback;
  const normalizedValue = normalizeWorkCorrectionValue(value);
  return normalizedValue > 0 ? normalizedValue : fallback;
}

function serializeWorkRows(rows) {
  return JSON.stringify(
    rows.map((row, index) => ({
      ...getWorkRowPayload(row, index),
      __disabled: Boolean(row?.__disabled),
      __isLocalDraft: Boolean(row?.__isLocalDraft),
    })),
  );
}

function normalizeWorkRow(row, index = 0) {
  const payload = getWorkRowPayload(row, index);
  return {
    __clientId: row?.__clientId || nextWorkRowClientId(),
    __disabled: Boolean(row?.__disabled),
    __isLocalDraft: Boolean(row?.__isLocalDraft),
    ...payload,
  };
}

function getNextWorkRowIdFromRows(rows = workRows.value) {
  return rows.reduce((maxId, row, index) => Math.max(maxId, getWorkRowPayload(row, index).id), 0) + 1;
}

function getNextWorkRowId() {
  return getNextWorkRowIdFromRows(workRows.value);
}

function createEmptyWorkRow(rowId = getNextWorkRowId()) {
  return normalizeWorkRow({
    id: rowId,
    __isLocalDraft: true,
    SourceProductName: '',
    Nazwa: '',
    Material: '',
    Przekroj: '',
    Grubosc: 0,
    Szerokosc: 0,
    Dlugosc: 0,
    Sztuk: 0,
    WykonaneSztuki: 0,
    Wybijak: 0,
    TekstDoDruku: '',
    Klasa: 2,
    zliczonaIloscIn: 0,
    Stanowisko: '',
  });
}

function getWorkDisplayedDoneValue(rowId, fallbackValue) {
  const row = workRows.value.find((entry) => entry.__clientId === rowId);
  return row ? normalizeWorkCorrectionValue(row.WykonaneSztuki) : normalizeWorkCorrectionValue(fallbackValue);
}

function getWorkDisplayedTotalValue(rowId, fallbackValue) {
  const row = workRows.value.find((entry) => entry.__clientId === rowId);
  return row ? normalizeWorkCorrectionValue(row.Sztuk) : normalizeWorkCorrectionValue(fallbackValue);
}

function isWorkRowEditing(rowId) {
  return workEditingRowId.value === rowId;
}

async function ensureCurrentWorkEditingReady(targetRowId = null, options = {}) {
  const { refreshRows = true } = options;
  if (workTableSourceMode.value !== 'active') {
    return { allowed: true, resolvedRowId: targetRowId };
  }

  if (workEditingRowId.value !== null || hasPendingWorkChanges.value) {
    return { allowed: true, resolvedRowId: targetRowId };
  }

  const targetRow = targetRowId ? workRows.value.find((entry) => entry.__clientId === targetRowId) ?? null : null;
  const targetDatabaseRowId = targetRow ? getWorkRowPayload(targetRow).id : null;

  isWorkEditPreparing.value = true;
  workUploadMessage.value = '';
  workUploadError.value = false;

  try {
    await loadMachineStatus();

    if (machineStatusValue.value !== 0) {
      workUploadError.value = true;
      workUploadMessage.value = 'Edycja aktualnej pracy jest dostępna tylko gdy maszyna jest zatrzymana.';
      return { allowed: false, resolvedRowId: null };
    }

    if (!refreshRows) {
      return { allowed: true, resolvedRowId: targetRowId };
    }

    await loadWorkMainRows({ preserveDisabled: true });

    if (targetDatabaseRowId === null) {
      return { allowed: true, resolvedRowId: null };
    }

    const refreshedRow = workRows.value.find((entry) => Number(entry.id ?? 0) === Number(targetDatabaseRowId)) ?? null;
    if (!refreshedRow) {
      workUploadError.value = true;
      workUploadMessage.value = 'Nie udało się odnaleźć wybranego wiersza po odświeżeniu danych z bazy.';
      return { allowed: false, resolvedRowId: null };
    }

    return { allowed: true, resolvedRowId: refreshedRow.__clientId };
  } catch (error) {
    workUploadError.value = true;
    workUploadMessage.value = error.message || 'Nie udało się sprawdzić statusu maszyny i odświeżyć aktualnej pracy.';
    return { allowed: false, resolvedRowId: null };
  } finally {
    isWorkEditPreparing.value = false;
  }
}

async function startWorkCorrectionEdit(rowId) {
  if (isWorkCorrectionSaving.value || isWorkEditPreparing.value) return;

  const { allowed, resolvedRowId } = await ensureCurrentWorkEditingReady(rowId);
  if (!allowed) return;

  const effectiveRowId = resolvedRowId ?? rowId;
  const row = workRows.value.find((entry) => entry.__clientId === effectiveRowId);
  workEditingRowId.value = effectiveRowId;
  if (row) {
    workCorrectionDrafts.value = {
      ...workCorrectionDrafts.value,
      [effectiveRowId]: {
        WykonaneSztuki: String(normalizeWorkCorrectionValue(row.WykonaneSztuki)),
        Sztuk: String(normalizeWorkCorrectionValue(row.Sztuk)),
      },
    };
  }
}

function startWorkDisableCooldown(rowId) {
  workDisableCooldownRowId.value = rowId;
  if (workDisableCooldownTimerId) {
    window.clearTimeout(workDisableCooldownTimerId);
  }
  workDisableCooldownTimerId = window.setTimeout(() => {
    if (workDisableCooldownRowId.value === rowId) {
      workDisableCooldownRowId.value = null;
    }
    workDisableCooldownTimerId = null;
  }, 300);
}

function finishWorkCorrectionEdit(targetRowId = workEditingRowId.value) {
  if (targetRowId === null) return;

  if (workEditingRowId.value !== targetRowId) {
    workEditingRowId.value = targetRowId;
  }

  const activeEditor = document.activeElement;
  if (activeEditor instanceof HTMLElement && activeEditor.closest?.(`[data-work-progress-editor="${targetRowId}"]`)) {
    return;
  }

  if (targetRowId !== null && Object.prototype.hasOwnProperty.call(workCorrectionDrafts.value, targetRowId)) {
    commitWorkProgressDraft(targetRowId);
  }
  workEditingRowId.value = null;
  startWorkDisableCooldown(targetRowId);
}

function handleWorkProgressInputBlur(event, rowId) {
  const nextTarget = event?.relatedTarget;
  if (nextTarget instanceof HTMLElement && nextTarget.closest?.(`[data-work-progress-editor="${rowId}"]`)) {
    return;
  }

  window.setTimeout(() => {
    finishWorkCorrectionEdit(rowId);
  }, 0);
}

function updateWorkCell(rowId, column, value) {
  const row = workRows.value.find((entry) => entry.__clientId === rowId);
  if (!row || column === 'id') return;

  if (isStationColumn(column)) {
    row[column] = normalizeStationValue(value);
    row.Wybijak = getWybijakValueForStation(row[column], row.Dlugosc);
    return;
  }

  if (column === 'Wybijak') {
    row[column] = buildWybijakValueFromParts(...getWybijakInputParts(value, row.Stanowisko));
    return;
  }

  if (['Dlugosc', 'Grubosc', 'Szerokosc', 'Sztuk'].includes(column)) {
    row[column] = normalizeWorkCorrectionValue(value);
    if (column === 'Grubosc' || column === 'Szerokosc') {
      row.Przekroj = buildPrzekrojValue(row.Grubosc, row.Szerokosc);
    }
    if (column === 'Sztuk') {
      row.zliczonaIloscIn = row.Sztuk;
    }
    if (column === 'Dlugosc' && row.Stanowisko) {
      row.Wybijak = getWybijakValueForStation(row.Stanowisko, row.Dlugosc);
    }
    return;
  }

  row[column] = String(value ?? '');
}

function updateWorkWybijakPart(rowId, partIndex, value) {
  const row = workRows.value.find((entry) => entry.__clientId === rowId);
  if (!row) return;
  const parts = getWybijakInputParts(row.Wybijak, row.Stanowisko);
  parts[partIndex] = String(value ?? '').replace(/[^\d]/g, '').trim();
  row.Wybijak = buildWybijakValueFromParts(parts[0], parts[1]);
}

function updateWorkProgressValue(rowId, field, value) {
  const currentDraft = workCorrectionDrafts.value[rowId] ?? {
    WykonaneSztuki: '0',
    Sztuk: '0',
  };
  workCorrectionDrafts.value = {
    ...workCorrectionDrafts.value,
    [rowId]: {
      ...currentDraft,
      [field]: String(value ?? '').replace(/[^\d]/g, ''),
    },
  };
}

function getWorkProgressDraftValue(rowId, field, fallbackValue) {
  const draft = workCorrectionDrafts.value[rowId];
  if (!draft) return normalizeWorkCorrectionValue(fallbackValue);
  if (!Object.prototype.hasOwnProperty.call(draft, field)) return normalizeWorkCorrectionValue(fallbackValue);
  return normalizeWorkCorrectionValue(draft[field]);
}

function commitWorkProgressDraft(rowId) {
  const row = workRows.value.find((entry) => entry.__clientId === rowId);
  const draft = workCorrectionDrafts.value[rowId];
  if (!row || !draft) return;

  row.WykonaneSztuki = normalizeWorkCorrectionValue(draft.WykonaneSztuki);
  row.Sztuk = normalizeWorkCorrectionValue(draft.Sztuk);
  delete workCorrectionDrafts.value[rowId];
  workCorrectionDrafts.value = { ...workCorrectionDrafts.value };
}

function clearWorkCorrectionState() {
  workEditingRowId.value = null;
  workCorrectionDrafts.value = {};
}

function resetWorkRowsSnapshot() {
  workRowsSnapshot.value = serializeWorkRows(workRows.value);
}

function restoreWorkRowsFromSnapshot() {
  workRows.value = savedWorkRowsSnapshot.value.map((row, index) =>
    normalizeWorkRow({
      ...getWorkRowPayload(row, index),
      __disabled: Boolean(row?.__disabled),
      __isLocalDraft: Boolean(row?.__isLocalDraft),
    }, index),
  );
  syncWorkTableSourceFromRows(workRows.value.filter((row) => !row.__disabled && !row.__isLocalDraft));
}

async function addWorkRow() {
  if (isWorkCorrectionSaving.value || isWorkEditPreparing.value) return;

  const { allowed } = await ensureCurrentWorkEditingReady();
  if (!allowed) return;

  const newRow = createEmptyWorkRow();
  workRows.value = [...workRows.value, newRow];
  workEditingRowId.value = newRow.__clientId;
}

async function toggleWorkRowDisabled(rowId) {
  if (isWorkCorrectionSaving.value || isWorkEditPreparing.value || workDisableCooldownRowId.value === rowId) return;

  const { allowed, resolvedRowId } = await ensureCurrentWorkEditingReady(rowId);
  if (!allowed) return;

  const effectiveRowId = resolvedRowId ?? rowId;
  workRows.value = workRows.value.map((row) =>
    row.__clientId === effectiveRowId
      ? {
          ...row,
          __disabled: !row.__disabled,
        }
      : row,
  );

  if (workEditingRowId.value === effectiveRowId) {
    workEditingRowId.value = null;
  }
}

function resetWorkSourceSelection() {
  workSelectedRowIds.value = {};
}

async function openWorkProductModal() {
  if (!availableProductNames.value.length) return;
  if (isWorkCorrectionSaving.value || isWorkEditPreparing.value) return;

  const { allowed } = await ensureCurrentWorkEditingReady();
  if (!allowed) return;

  if (!workSourceProductName.value || !availableProductNames.value.includes(workSourceProductName.value)) {
    workSourceProductName.value = availableProductNames.value[0] || '';
  }
  workSourceRowSearch.value = '';
  resetWorkSourceSelection();
  isWorkProductModalOpen.value = true;
}

function closeWorkProductModal() {
  isWorkProductModalOpen.value = false;
  workSourceRowSearch.value = '';
  resetWorkSourceSelection();
}

function handleWorkSourceProductChange(nextProductName) {
  workSourceProductName.value = nextProductName;
  workSourceRowSearch.value = '';
  resetWorkSourceSelection();
}

function isWorkSourceRowSelected(localId) {
  return Boolean(workSelectedRowIds.value[localId]);
}

function handleWorkSourceRowCheckboxChange(localId, isChecked) {
  if (isChecked && selectedWorkRowCount.value >= workRemainingCapacity.value) {
    showMergeLimitMessage();
    return;
  }

  workSelectedRowIds.value = {
    ...workSelectedRowIds.value,
    [localId]: isChecked,
  };
}

function createWorkRowFromProductRow(sourceRow = {}, rowId = getNextWorkRowId()) {
  const length = normalizeWorkCorrectionValue(sourceRow['Długość'] ?? sourceRow.dlugosc);
  const thickness = normalizeWorkCorrectionValue(sourceRow['Grubość'] ?? sourceRow.grubosc);
  const width = normalizeWorkCorrectionValue(sourceRow['Szerokość'] ?? sourceRow.szerokosc);
  const quantity = normalizeWorkCorrectionValue(sourceRow['ilość'] ?? sourceRow.ilosc ?? 0);
  const station = normalizeStationValue(sourceRow.Stanowisko ?? sourceRow.stanowisko);

  return normalizeWorkRow({
    id: rowId,
    __isLocalDraft: true,
    SourceProductName: sourceRow._sourceFile ?? sourceRow.SourceProductName ?? '',
    Nazwa: sourceRow.Nazwa ?? sourceRow.nazwaSkladowej ?? '',
    Material: sourceRow['Materiał'] ?? sourceRow.material ?? '',
    Przekroj: buildPrzekrojValue(thickness, width),
    Grubosc: thickness,
    Szerokosc: width,
    Dlugosc: length,
    Sztuk: quantity,
    WykonaneSztuki: 0,
    Wybijak: station ? getWybijakValueForStation(station, length) : normalizeWorkCorrectionValue(sourceRow.Wybijak ?? sourceRow.wybijak ?? 0),
    TekstDoDruku: normalizePrintTextValue(sourceRow.Kod ?? sourceRow.TekstDoDruku ?? ''),
    Klasa: normalizeDefaultClassValue(sourceRow.Klasa ?? sourceRow.klasa),
    zliczonaIloscIn: quantity,
    Stanowisko: station,
  });
}

function addSelectedWorkRows() {
  if (!selectedWorkRowCount.value) return;
  if (selectedWorkRowCount.value > workRemainingCapacity.value) {
    showMergeLimitMessage();
    return;
  }

  const selectedIds = Object.entries(workSelectedRowIds.value)
    .filter(([, isSelected]) => isSelected)
    .map(([localId]) => localId);
  const startingRowId = getNextWorkRowId();
  const rowsToAdd = workSourceRowOptions.value
    .filter((row) => selectedIds.includes(row._localId))
    .map((row, index) => createWorkRowFromProductRow(row, startingRowId + index));
  const validationInfo = rowsToAdd.map((row) => ({
    row,
    missingFields: getWorkRowMissingFields(row),
  }));
  const blockingRows = validationInfo.filter(({ missingFields }) =>
    missingFields.some((field) => field !== 'Wybijak'),
  );

  if (blockingRows.length) {
    const validationMessage = getWorkRowsValidationMessage(
      blockingRows.map(({ row }) => row),
      'Nie można dodać elementów z produktu.',
    );
    workUploadError.value = true;
    workUploadMessage.value = validationMessage;
    return;
  }

  workRows.value = [...workRows.value, ...rowsToAdd];
  const rowToEdit = validationInfo.find(({ missingFields }) => missingFields.includes('Wybijak'))?.row;
  if (rowToEdit) {
    workEditingRowId.value = rowToEdit.__clientId;
  }
  closeWorkProductModal();
}

function openSavedWorkPreview(idRap) {
  savedWorkPreviewId.value = String(idRap);
}

function closeSavedWorkPreview() {
  savedWorkPreviewId.value = '';
}

function removeSavedRow(idRap) {
  if (String(savedWorkPreviewId.value) === String(idRap)) {
    closeSavedWorkPreview();
  }
  savedRows.value = savedRows.value.filter((row) => String(row.idRap) !== String(idRap));
  persistSavedRows();
}

function requestRemoveSavedRow(idRap) {
  const snapshot = savedRows.value.find((row) => String(row.idRap) === String(idRap));
  if (!snapshot) return;
  const label = snapshot.NazwaRec || 'odłożoną pracę';
  openConfirmDialog('delete-saved-row:' + String(idRap), `Na pewno chcesz usunąć odłożoną pracę "${label}"?`);
}

function requestRestoreSavedRow(idRap) {
  const snapshot = savedRows.value.find((row) => String(row.idRap) === String(idRap));
  if (!snapshot || !snapshot.rows) return;

  restoreSavedWorkDialog.value = {
    visible: true,
    idRap: String(idRap),
    name: snapshot.NazwaRec || 'Odłożona praca',
    loading: false,
  };
}

function cancelRestoreSavedWorkDialog(force = false) {
  if (restoreSavedWorkDialog.value.loading && !force) return;
  restoreSavedWorkDialog.value = {
    visible: false,
    idRap: '',
    name: '',
    loading: false,
  };
}

function restoreSavedRow(idRap) {
  const snapshot = savedRows.value.find((row) => String(row.idRap) === String(idRap));
  if (!snapshot || !snapshot.rows) return;

  try {
    const parsedRows = JSON.parse(snapshot.rows);
    if (!Array.isArray(parsedRows)) {
      throw new Error('Nieprawidłowy zapis odłożonej pracy.');
    }

    workRows.value = parsedRows.map((row, index) => normalizeWorkRow(row, index));
    workEditingRowId.value = null;
    clearWorkCorrectionState();
    if (snapshot.selectedRecipe) {
      selectedRecipe.value = snapshot.selectedRecipe;
    }
    workUploadError.value = false;
    workUploadMessage.value = `Wczytano odłożoną pracę "${snapshot.NazwaRec}".`;
  } catch (error) {
    workUploadError.value = true;
    workUploadMessage.value = error.message || 'Nie udało się wczytać odłożonej pracy.';
  }
}

function restoreSavedRowDeferred(idRap) {
  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      restoreSavedRow(idRap);
    }, 0);
  });
}

async function confirmRestoreSavedWork(mode) {
  if (!restoreSavedWorkDialog.value.idRap) return;
  if (workEditingRowId.value !== null) {
    workUploadError.value = true;
    workUploadMessage.value = 'Najpierw zakończ edycję wszystkich wierszy, zanim wczytasz odłożoną pracę.';
    cancelRestoreSavedWorkDialog(true);
    return;
  }

  restoreSavedWorkDialog.value = {
    ...restoreSavedWorkDialog.value,
    loading: true,
  };

  try {
    const targetId = restoreSavedWorkDialog.value.idRap;

    if (mode === 'discard') {
      cancelRestoreSavedWorkDialog(true);
      restoreSavedRowDeferred(targetId);
      return;
    }

    if (mode === 'postpone' && workRows.value.length) {
      const rowsToSave = activeWorkRows.value.map((row, index) => getWorkRowPayload(row, index));
      const payload = await persistWorkRowsToDatabase(rowsToSave);
      const snapshot = createWorkSnapshot();
      addWorkSnapshot(snapshot);
      workUploadError.value = false;
      workUploadMessage.value = `Odłożono pracę "${snapshot.NazwaRec}" i zapisano ${payload.updatedRows ?? rowsToSave.length} wierszy WorkMain.`;
    }

    cancelRestoreSavedWorkDialog(true);
    restoreSavedRowDeferred(targetId);
  } catch (error) {
    workUploadError.value = true;
    workUploadMessage.value = error.message || 'Nie udało się przygotować wczytania odłożonej pracy.';
    cancelRestoreSavedWorkDialog(true);
  }
}

function loadSavedRows() {
  try {
    const rawValue = window.localStorage.getItem(SAVED_ROWS_STORAGE_KEY);
    if (!rawValue) return [...defaultSavedRows];
    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) return [...defaultSavedRows];
    return parsedValue.map((row) => ({
      idRap: row.idRap ?? Date.now(),
      NazwaRec: row.NazwaRec ?? 'Odłożona praca',
      Wiersze: normalizeWorkCorrectionValue(row.Wiersze ?? 0),
      CzasOdloz: row.CzasOdloz ?? '',
      Usr: row.Usr ?? 'Default',
      Notatka: String(row.Notatka ?? '').trim(),
      rows: row.rows ?? '',
      selectedRecipe: row.selectedRecipe ?? '',
    }));
  } catch {
    return [...defaultSavedRows];
  }
}

function loadAnimationsEnabledSetting() {
  try {
    const rawValue = window.localStorage.getItem(UI_SETTINGS_STORAGE_KEY);
    if (!rawValue) return true;
    const parsedValue = JSON.parse(rawValue);
    if (typeof parsedValue?.animationsEnabled === 'boolean') {
      return parsedValue.animationsEnabled;
    }
  } catch {
    // Ignore storage errors.
  }
  return true;
}

function persistUiSettings() {
  try {
    window.localStorage.setItem(
      UI_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        animationsEnabled: animationsEnabled.value,
      }),
    );
  } catch {
    // Ignore storage errors.
  }
}

function persistSavedRows() {
  try {
    window.localStorage.setItem(SAVED_ROWS_STORAGE_KEY, JSON.stringify(savedRows.value));
  } catch {
    // Ignore storage errors.
  }
}

function openPostponeWorkDialog() {
  if (workEditingRowId.value !== null || hasPendingWorkChanges.value) {
    workUploadError.value = true;
    workUploadMessage.value = 'Odłożenie aktualnej pracy jest możliwe tylko wtedy, gdy nie ma niezapisanych zmian.';
    return;
  }

  postponeWorkDialog.value = {
    visible: true,
    note: '',
    loading: false,
  };
}

function cancelPostponeWorkDialog(force = false) {
  if (postponeWorkDialog.value.loading && !force) return;
  postponeWorkDialog.value = {
    visible: false,
    note: '',
    loading: false,
  };
}

function createWorkSnapshot(note = '') {
  return {
    idRap: Date.now(),
    NazwaRec: selectedRecipe.value || 'Aktualna praca',
    Wiersze: activeWorkRows.value.length,
    CzasOdloz: new Date().toLocaleString('pl-PL'),
    Usr: 'Default',
    Notatka: String(note ?? '').trim(),
    rows: serializeWorkRows(workRows.value),
    selectedRecipe: selectedRecipe.value,
  };
}

function addWorkSnapshot(snapshot) {
  savedRows.value = [snapshot, ...savedRows.value.filter((row) => String(row.idRap) !== String(snapshot.idRap))];
  persistSavedRows();
}

function getWorkRowMissingFields(row) {
  const payload = getWorkRowPayload(row);
  const missingFields = [];
  const printTextMaxLength = Math.max(1, normalizeWorkCorrectionValue(configSettings.value.printTextMaxLength || DEFAULT_PRINT_TEXT_MAX_LENGTH));
  const boardMaxLength = Math.max(1, normalizeWorkCorrectionValue(configSettings.value.boardMaxLength || DEFAULT_BOARD_MAX_LENGTH));
  const maxQuantity = Math.max(1, normalizeWorkCorrectionValue(configSettings.value.maxQuantity || DEFAULT_MAX_QUANTITY));

  if (String(payload.TekstDoDruku ?? '').trim().length > printTextMaxLength) missingFields.push(`Tekst do druku > ${printTextMaxLength} znaków`);
  if (!payload.Material) missingFields.push('Materiał');
  if (!payload.Przekroj) missingFields.push('Przekrój');
  if (!payload.Dlugosc) missingFields.push('Długość');
  if (payload.Dlugosc > boardMaxLength) missingFields.push(`Długość > ${boardMaxLength} mm`);
  if (!payload.Grubosc) missingFields.push('Grubość');
  if (!payload.Szerokosc) missingFields.push('Szerokość');
  if (!payload.Wybijak) missingFields.push('Wybijak');
  if (!payload.Sztuk) missingFields.push('Ilość');
  if (payload.Sztuk > maxQuantity) missingFields.push(`Ilość > ${maxQuantity}`);

  return missingFields;
}

function getWorkRowsValidationErrors(rows) {
  return rows
    .map((row) => {
      const missingFields = getWorkRowMissingFields(row);
      if (!missingFields.length) return '';
      return `Brak pól ${missingFields.join(', ')}.`;
    })
    .filter(Boolean);
}

function getWorkRowsValidationMessage(rows, contextMessage) {
  const validationErrors = getWorkRowsValidationErrors(rows);
  if (!validationErrors.length) return '';

  const invalidRowsCount = validationErrors.length;
  const pluralLabel =
    invalidRowsCount === 1 ? '1 wiersz ma braki' : invalidRowsCount < 5 ? `${invalidRowsCount} wiersze mają braki` : `${invalidRowsCount} wierszy ma braki`;

  return `${contextMessage} ${pluralLabel}. ${validationErrors[0]}`;
}

function getWorkCellValidationMessage(row, column) {
  const validationLabelByKey = {
    TekstDoDruku: ['Tekst do druku >'],
    Material: ['Materiał'],
    Dlugosc: ['Długość', 'Długość >'],
    Grubosc: ['Grubość'],
    Szerokosc: ['Szerokość'],
    Wybijak: ['Wybijak'],
    Sztuk: ['Ilość', 'Ilość >'],
  };

  const expectedLabels = validationLabelByKey[column];
  if (!expectedLabels) return '';

  const missingFields = getWorkRowMissingFields(row);
  const matchedMessage = missingFields.find((field) =>
    expectedLabels.some((label) => (label.endsWith('>') ? field.startsWith(label) : field === label)),
  );
  if (!matchedMessage) return '';

  if (column === 'Dlugosc' && matchedMessage.startsWith('Długość > ')) {
    return matchedMessage;
  }

  if (column === 'Sztuk' && matchedMessage.startsWith('Ilość > ')) {
    return matchedMessage;
  }

  if (column === 'TekstDoDruku' && matchedMessage.startsWith('Tekst do druku > ')) {
    return matchedMessage;
  }

  const expectedLabel = expectedLabels[0];
  return `Pole ${expectedLabel} jest wymagane.`;
}

function getWorkCellValidationCriteria(column) {
  const validationMessagesByColumn = {
    Material: 'Wybierz lub wpisz materiał.',
    Dlugosc: `Podaj długość elementu w mm. Maksymalna długość: ${Math.max(1, normalizeWorkCorrectionValue(configSettings.value.boardMaxLength || DEFAULT_BOARD_MAX_LENGTH))} mm.`,
    Grubosc: 'Podaj grubość elementu w mm.',
    Szerokosc: 'Podaj szerokość elementu w mm.',
    Wybijak: 'Wybierz stanowisko lub uzupełnij wartość wybijaka.',
    Sztuk: `Podaj ilość elementów. Maksymalna ilość: ${Math.max(1, normalizeWorkCorrectionValue(configSettings.value.maxQuantity || DEFAULT_MAX_QUANTITY))}.`,
  };

  return validationMessagesByColumn[column] || '';
}

function isStrictPositiveIntegerValue(value) {
  const normalizedValue = String(value ?? '').trim();
  return /^\d+$/.test(normalizedValue);
}

function getRecipeRowMissingFields(row) {
  const missingFields = [];
  const printTextMaxLength = Math.max(1, normalizeWorkCorrectionValue(configSettings.value.printTextMaxLength || DEFAULT_PRINT_TEXT_MAX_LENGTH));
  const boardMaxLength = Math.max(1, normalizeWorkCorrectionValue(configSettings.value.boardMaxLength || DEFAULT_BOARD_MAX_LENGTH));
  const maxQuantity = Math.max(1, normalizeWorkCorrectionValue(configSettings.value.maxQuantity || DEFAULT_MAX_QUANTITY));

  if (String(row?.TekstDoDruku ?? '').trim().length > printTextMaxLength) missingFields.push(`Tekst do druku > ${printTextMaxLength} znaków`);
  if (!String(row?.material ?? '').trim()) missingFields.push('Materiał');
  if (String(row?.dlugosc ?? '').trim() && !isStrictPositiveIntegerValue(row?.dlugosc)) missingFields.push('Długość: nieprawidłowy format');
  if (!normalizeWorkCorrectionValue(row?.dlugosc)) missingFields.push('Długość');
  if (normalizeWorkCorrectionValue(row?.dlugosc) > boardMaxLength) missingFields.push(`Długość > ${boardMaxLength} mm`);
  if (String(row?.grubosc ?? '').trim() && !isStrictPositiveIntegerValue(row?.grubosc)) missingFields.push('Grubość: nieprawidłowy format');
  if (!normalizeWorkCorrectionValue(row?.grubosc)) missingFields.push('Grubość');
  if (String(row?.szerokosc ?? '').trim() && !isStrictPositiveIntegerValue(row?.szerokosc)) missingFields.push('Szerokość: nieprawidłowy format');
  if (!normalizeWorkCorrectionValue(row?.szerokosc)) missingFields.push('Szerokość');
  if (!String(row?.wybijak ?? '').replace(/[^\d]/g, '').trim()) missingFields.push('Wybijak');
  if (String(row?.ilosc ?? '').trim() && !isStrictPositiveIntegerValue(row?.ilosc)) missingFields.push('Ilość: nieprawidłowy format');
  if (!normalizeWorkCorrectionValue(row?.ilosc)) missingFields.push('Ilość');
  if (normalizeWorkCorrectionValue(row?.ilosc) > maxQuantity) missingFields.push(`Ilość > ${maxQuantity}`);

  return missingFields;
}

function getRecipeRowsValidationMessage(rows, contextMessage) {
  const invalidRows = rows
    .map((row, index) => ({
      index: index + 1,
      missingFields: getRecipeRowMissingFields(row),
    }))
    .filter((entry) => entry.missingFields.length);

  if (!invalidRows.length) return '';

  const invalidRowsCount = invalidRows.length;
  const pluralLabel =
    invalidRowsCount === 1 ? '1 wiersz ma braki' : invalidRowsCount < 5 ? `${invalidRowsCount} wiersze mają braki` : `${invalidRowsCount} wierszy ma braki`;
  const firstInvalidRow = invalidRows[0];

  return `${contextMessage} ${pluralLabel}. Wiersz ${firstInvalidRow.index}: ${firstInvalidRow.missingFields.join(', ')}.`;
}

function duplicateWorkRow(rowId) {
  const rowIndex = workRows.value.findIndex((entry) => entry.__clientId === rowId);
  if (rowIndex === -1) return;
  const duplicate = normalizeWorkRow({
    ...JSON.parse(JSON.stringify(workRows.value[rowIndex])),
    __clientId: null,
    __isLocalDraft: true,
    id: getNextWorkRowId(),
  });
  workRows.value = [...workRows.value.slice(0, rowIndex + 1), duplicate, ...workRows.value.slice(rowIndex + 1)];
}

function removeWorkRow(rowId) {
  workRows.value = workRows.value.filter((entry) => entry.__clientId !== rowId);
  if (workEditingRowId.value === rowId) {
    workEditingRowId.value = null;
  }
}

async function loadWorkMainRows({ preserveDisabled = true, preserveLocalDrafts = true } = {}) {
  const disabledRows = preserveDisabled
    ? workRows.value.filter((row) => row.__disabled && !row.__isLocalDraft).map((row) => normalizeWorkRow(row))
    : [];
  const localDraftRows = preserveLocalDrafts
    ? workRows.value.filter((row) => row.__isLocalDraft).map((row) => normalizeWorkRow(row))
    : [];

  const response = await fetch(`/api/workmain?t=${Date.now()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Nie udało się pobrać danych WorkMain.');
  }

  const activeRows = Array.isArray(payload.rows) ? payload.rows.map((row, index) => normalizeWorkRow(row, index)) : [];
  const disabledRowIds = new Set(disabledRows.map((row, index) => Number(getWorkRowPayload(row, index).id)).filter((id) => Number.isFinite(id) && id > 0));
  const visibleDatabaseRows = disabledRowIds.size
    ? activeRows.filter((row, index) => !disabledRowIds.has(Number(getWorkRowPayload(row, index).id)))
    : activeRows;
  let nextDraftId = getNextWorkRowIdFromRows(activeRows);
  const reconciledLocalDraftRows = localDraftRows.map((row) =>
    normalizeWorkRow({
      ...row,
      id: nextDraftId++,
      __isLocalDraft: true,
    }),
  );
  workRows.value = [...visibleDatabaseRows, ...reconciledLocalDraftRows, ...disabledRows];
  syncWorkTableSourceFromRows(activeRows);
  workRowsSnapshot.value = serializeWorkRows([...activeRows, ...disabledRows]);
  workMainLastRefreshAt.value = new Date();
}

async function refreshWorkMainRowsManually() {
  if (isWorkMainManualRefreshDisabled.value) return;

  isWorkMainManualRefreshLoading.value = true;
  workUploadMessage.value = '';
  workUploadError.value = false;

  try {
    await loadWorkMainRows({ preserveDisabled: true });
  } catch (error) {
    workUploadError.value = true;
    workUploadMessage.value = error?.message || 'Nie udało się odświeżyć aktualnej pracy z bazy danych.';
  } finally {
    isWorkMainManualRefreshLoading.value = false;
  }
}

async function discardWorkPendingChanges() {
  if (!hasPendingWorkChanges.value || isWorkCorrectionSaving.value || isWorkEditPreparing.value) return;

  isWorkEditPreparing.value = true;
  workUploadMessage.value = '';
  workUploadError.value = false;

  try {
    clearWorkCorrectionState();
    restoreWorkRowsFromSnapshot();
    workUploadMessage.value = 'Porzucono lokalne zmiany i przywrócono ostatni zapisany stan tabeli.';
  } catch (error) {
    workUploadError.value = true;
    workUploadMessage.value = error?.message || 'Nie udało się porzucić zmian i przywrócić ostatniego zapisanego stanu tabeli.';
  } finally {
    isWorkEditPreparing.value = false;
  }
}

async function loadMachineStatus() {
  const response = await fetch(`/api/machine-status?t=${Date.now()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Nie udało się pobrać statusu maszyny.');
  }

  if (payload.status && typeof payload.status === 'object') {
    machineStatusRow.value = payload.status;
  }
}

async function loadDatabaseConnectionStatus() {
  const response = await fetch(`/api/sql-status?t=${Date.now()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Nie udało się sprawdzić połączenia z bazą.');
  }

  isDatabaseConnected.value = payload.ok === true;
}

function startWorkMainAutoRefresh() {
  if (workRefreshTimerId) return;
  workRefreshTimerId = window.setInterval(() => {
    if (activeTab.value !== 'work' || workEditingRowId.value !== null || hasPendingWorkChanges.value || isWorkCorrectionSaving.value) return;
    loadWorkMainRows().catch(() => {});
  }, 5000);
}

function stopWorkMainAutoRefresh() {
  if (!workRefreshTimerId) return;
  window.clearInterval(workRefreshTimerId);
  workRefreshTimerId = null;
}

function getWorkProgressPercent(doneValue, totalValue) {
  const done = normalizeWorkCorrectionValue(doneValue);
  const total = normalizeWorkCorrectionValue(totalValue);
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (done / total) * 100));
}

function formatProgressPercent(value) {
  const normalizedValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return normalizedValue.toFixed(1).replace('.', ',');
}

function startMachineStatusAutoRefresh() {
  if (machineStatusTimerId) return;
  machineStatusTimerId = window.setInterval(() => {
    loadMachineStatus().catch(() => {});
    loadDatabaseConnectionStatus().catch(() => {
      isDatabaseConnected.value = false;
    });
  }, 3000);
}

function stopMachineStatusAutoRefresh() {
  if (!machineStatusTimerId) return;
  window.clearInterval(machineStatusTimerId);
  machineStatusTimerId = null;
}

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

function toggleWorkRecipeMenu() {
  isWorkRecipeMenuOpen.value = !isWorkRecipeMenuOpen.value;
  if (!isWorkRecipeMenuOpen.value) {
    workRecipeSearch.value = '';
  }
}

function closeWorkRecipeMenu() {
  if (!isWorkRecipeMenuOpen.value) return;
  isWorkRecipeMenuOpen.value = false;
  workRecipeSearch.value = '';
}

function selectWorkRecipe(recipeName) {
  selectedRecipe.value = recipeName;
  closeWorkRecipeMenu();
}

function openWorkRecipePreview(recipeName) {
  openRecipePreviewEditor(recipeName);
  isWorkRecipePreviewOpen.value = true;
  closeWorkRecipeMenu();
}

function closeWorkRecipePreview() {
  isWorkRecipePreviewOpen.value = false;
}

function handleWorkRecipeMenuOutsideClick(event) {
  if (!isWorkRecipeMenuOpen.value) return;
  const pickerEl = workRecipePickerRef.value;
  if (pickerEl && !pickerEl.contains(event.target)) {
    closeWorkRecipeMenu();
  }
}

function toggleConfigPanel() {
  if (isConfigPanelOpen.value && isConfigDirty.value) {
    openConfigUnsavedDialog({ shouldClosePanel: true });
    return;
  }
  isConfigPanelOpen.value = !isConfigPanelOpen.value;
  if (isConfigPanelOpen.value) {
    clearConfigSaveMessage();
  }
}

function toggleSettingsPanel() {
  isSettingsPanelOpen.value = !isSettingsPanelOpen.value;
}

function closeSettingsPanel() {
  isSettingsPanelOpen.value = false;
}

function toggleAnimationsEnabled() {
  animationsEnabled.value = !animationsEnabled.value;
}

function createConfigStation() {
  return {
    id: `station-${Date.now()}-${configStationIdCounter++}`,
    punches: [],
    lengthRange: createConfigLengthRange(),
    distanceRules: [],
  };
}

function clearConfigSaveMessage() {
  configSaveMessage.value = '';
  configSaveError.value = false;
}

function normalizeLoadedConfigStation(station) {
  const loadedLengthRange = station?.lengthRange ?? station?.lengthRanges?.[0] ?? null;
  return syncConfigStationDistanceRules({
    id: station?.id || `station-${configStationIdCounter++}`,
    punches: Array.isArray(station?.punches)
      ? station.punches.slice(0, 2).map((punch) => ({
          id: punch?.id || `punch-${configPunchIdCounter++}`,
          number: String(punch?.number ?? '').replace(/[^\d]/g, '').trim(),
        }))
      : [],
    lengthRange: {
      id: loadedLengthRange?.id || `length-${configLengthRangeIdCounter++}`,
      minLength: String(loadedLengthRange?.minLength ?? '').replace(/[^\d]/g, '').trim(),
      maxLength: String(loadedLengthRange?.maxLength ?? '').replace(/[^\d]/g, '').trim(),
    },
    distanceRules: Array.isArray(station?.distanceRules)
      ? station.distanceRules.map((rule) => ({
          id: rule?.id || `distance-${configDistanceIdCounter++}`,
          leftPunch: String(rule?.leftPunch ?? '').replace(/[^\d]/g, '').trim(),
          rightPunch: String(rule?.rightPunch ?? '').replace(/[^\d]/g, '').trim(),
          distance: String(rule?.distance ?? '').replace(/[^\d]/g, '').trim(),
        }))
      : [],
  });
}

function createConfigMachine() {
  return {
    id: `machine-${Date.now()}-${configMachineIdCounter++}`,
    rowLimit: DEFAULT_ROW_LIMIT,
  };
}

function normalizeFavoriteElementRow(row) {
  return {
    Nazwa: row?.Nazwa ?? row?.nazwaSkladowej ?? '',
    'Długość': row?.['Długość'] ?? row?.dlugosc ?? '',
    'Grubość': row?.['Grubość'] ?? row?.grubosc ?? '',
    'Szerokość': row?.['Szerokość'] ?? row?.szerokosc ?? '',
    'Materiał': row?.['Materiał'] ?? row?.material ?? '',
    Kod: normalizePrintTextValue(row?.Kod ?? row?.TekstDoDruku ?? ''),
    Grupa: normalizeGroupValue(row?.Grupa ?? row?.grupa ?? ''),
    Priorytet: normalizePriorityValue(row?.Priorytet ?? row?.priorytet ?? ''),
    'ilość': row?.['ilość'] ?? row?.ilosc ?? 0,
    Wybijak: row?.Wybijak ?? row?.wybijak ?? 0,
    Stanowisko: normalizeStationValue(row?.Stanowisko ?? row?.stanowisko ?? ''),
  };
}

function createFavoriteElementEntry(sourceProductName, row = {}) {
  return {
    id: `favorite-${Date.now()}-${createProductLocalId()}`,
    sourceProductName,
    sourceRowIndex: Number.isFinite(row?._rowIndex) ? row._rowIndex : -1,
    label: formatTemporaryRowOption(row),
    row: normalizeFavoriteElementRow(row),
  };
}

function normalizeLoadedFavoriteElement(entry) {
  return {
    id: entry?.id || `favorite-${Date.now()}-${createProductLocalId()}`,
    sourceProductName: String(entry?.sourceProductName ?? ''),
    sourceRowIndex: Number.isFinite(entry?.sourceRowIndex) ? entry.sourceRowIndex : -1,
    label: String(entry?.label ?? formatTemporaryRowOption(entry?.row ?? {})),
    row: normalizeFavoriteElementRow(entry?.row ?? {}),
  };
}

function normalizeLoadedConfigMachine(machine, index = 0) {
  return {
    id: machine?.id || `machine-${index + 1}`,
    rowLimit: Math.max(1, normalizeWorkCorrectionValue(machine?.rowLimit ?? DEFAULT_ROW_LIMIT)),
  };
}

function applyLoadedConfig(config) {
  const productsDirectory = String(config?.productsDirectory || '').trim();
  const loadedSettings = config?.settings && typeof config.settings === 'object' ? config.settings : {};
  const settings = {
    printTextMaxLength: Math.max(1, normalizeWorkCorrectionValue(loadedSettings.printTextMaxLength || DEFAULT_PRINT_TEXT_MAX_LENGTH)),
    boardMaxLength: Math.max(1, normalizeWorkCorrectionValue(loadedSettings.boardMaxLength || DEFAULT_BOARD_MAX_LENGTH)),
    maxQuantity: Math.max(1, normalizeWorkCorrectionValue(loadedSettings.maxQuantity || DEFAULT_MAX_QUANTITY)),
    machinePunchCount: Math.max(1, normalizeWorkCorrectionValue(loadedSettings.machinePunchCount || DEFAULT_MACHINE_PUNCH_COUNT)),
    activeExcelColumns: sanitizeActiveExcelColumns(loadedSettings.activeExcelColumns),
  };
  const stations = Array.isArray(config?.stations)
    ? config.stations.slice(0, settings.machinePunchCount).map((station) => normalizeLoadedConfigStation(station))
    : [];
  const machines = Array.isArray(config?.machines) && config.machines.length
    ? config.machines.map((machine, index) => normalizeLoadedConfigMachine(machine, index))
    : [normalizeLoadedConfigMachine({ id: 'machine-1', rowLimit: DEFAULT_ROW_LIMIT }, 0)];
  const favorites = Array.isArray(config?.favoriteElements)
    ? config.favoriteElements.map((entry) => normalizeLoadedFavoriteElement(entry))
    : [];
  configProductsDirectory.value = productsDirectory;
  configSettings.value = settings;
  configStations.value = stations;
  configMachines.value = machines;
  favoriteElements.value = favorites;
  activeMachineId.value = machines.some((machine) => machine.id === config?.activeMachineId)
    ? config.activeMachineId
    : machines[0].id;
  savedConfigSnapshot.value = JSON.stringify({
    productsDirectory,
    stations: stations.map((station) => ({
      id: station.id,
      punches: station.punches.map((punch) => ({ id: punch.id, number: String(punch.number ?? '') })),
      lengthRange: station.lengthRange
        ? {
            id: station.lengthRange.id,
            minLength: String(station.lengthRange.minLength ?? ''),
            maxLength: String(station.lengthRange.maxLength ?? ''),
          }
        : null,
      distanceRules: station.distanceRules.map((rule) => ({
        id: rule.id,
        leftPunch: String(rule.leftPunch ?? ''),
        rightPunch: String(rule.rightPunch ?? ''),
        distance: String(rule.distance ?? ''),
      })),
    })),
    settings,
    activeMachineId: activeMachineId.value,
    machines: machines.map((machine) => ({
      id: machine.id,
      rowLimit: machine.rowLimit,
    })),
    favoriteElements: favorites.map((favorite) => ({
      id: favorite.id,
      sourceProductName: favorite.sourceProductName,
      sourceRowIndex: favorite.sourceRowIndex,
      label: favorite.label,
      row: favorite.row,
    })),
  });
}

async function loadConfig() {
  isConfigLoaded.value = false;
  const response = await fetch(`/api/config?t=${Date.now()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Nie udało się pobrać konfiguracji.');
  }

  applyLoadedConfig(payload.config ?? { stations: [] });
  isConfigLoaded.value = true;
  await loadProductFiles();
}

async function saveConfig() {
  if (!isConfigLoaded.value) {
    configSaveError.value = true;
    configSaveMessage.value = 'Konfiguracja nie została jeszcze w pełni wczytana. Spróbuj ponownie za chwilę.';
    return;
  }

  isConfigSaving.value = true;
  clearConfigSaveMessage();

  try {
    const previousProductsDirectory = savedConfigSnapshot.value ? JSON.parse(savedConfigSnapshot.value).productsDirectory || '' : '';
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: configPayload.value }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Nie udało się zapisać konfiguracji.');
    }

    applyLoadedConfig(payload.config ?? configPayload.value);
    if (previousProductsDirectory !== configProductsDirectory.value) {
      try {
        await loadProductFiles();
        if (selectedProductName.value && !productRowsMap.value[selectedProductName.value]) {
          resetProductModalState();
        }
      } catch (reloadError) {
        configSaveError.value = false;
        configSaveMessage.value =
          `Konfiguracja została zapisana, ale nie udało się odświeżyć plików z nowego folderu: ${reloadError.message || reloadError}`;
        return;
      }
    }
    configSaveMessage.value = 'Konfiguracja została zapisana.';
  } catch (error) {
    configSaveError.value = true;
    configSaveMessage.value = error.message || 'Nie udało się zapisać konfiguracji.';
    throw error;
  } finally {
    isConfigSaving.value = false;
  }
}

function openConfigUnsavedDialog({ nextTab = '', shouldClosePanel = false } = {}) {
  configUnsavedDialog.value = {
    visible: true,
    nextTab,
    shouldClosePanel,
  };
}

function cancelConfigUnsavedDialog() {
  configUnsavedDialog.value = {
    visible: false,
    nextTab: '',
    shouldClosePanel: false,
  };
}

function applyConfigPendingNavigation() {
  const { nextTab, shouldClosePanel } = configUnsavedDialog.value;
  cancelConfigUnsavedDialog();

  if (nextTab) {
    activeConfigTab.value = nextTab;
  }

  if (shouldClosePanel) {
    isConfigPanelOpen.value = false;
  }
}

async function saveConfigAndContinue() {
  try {
    await saveConfig();
    applyConfigPendingNavigation();
  } catch {}
}

function discardConfigChangesAndContinue() {
  applyLoadedConfig(JSON.parse(savedConfigSnapshot.value));
  clearConfigSaveMessage();
  applyConfigPendingNavigation();
}

function requestConfigTabChange(nextTab) {
  if (activeConfigTab.value === nextTab) return;
  if (isConfigDirty.value) {
    openConfigUnsavedDialog({ nextTab });
    return;
  }
  activeConfigTab.value = nextTab;
}

function createConfigPunch() {
  return {
    id: `punch-${Date.now()}-${configPunchIdCounter++}`,
    number: '',
  };
}

function createConfigDistanceRule() {
  return {
    id: `distance-${Date.now()}-${configDistanceIdCounter++}`,
    leftPunch: '',
    rightPunch: '',
    distance: '',
  };
}

function createConfigLengthRange() {
  return {
    id: `length-${Date.now()}-${configLengthRangeIdCounter++}`,
    minLength: '',
    maxLength: '',
  };
}

function addConfigStation() {
  if (configStations.value.length >= maxConfiguredStationCount.value) return;
  configStations.value = [...configStations.value, createConfigStation()];
}

function removeConfigStation(stationId) {
  configStations.value = configStations.value.filter((station) => station.id !== stationId);
}

function addConfigMachine() {
  configMachines.value = [...configMachines.value, createConfigMachine()];
}

function removeConfigMachine(machineId) {
  const remainingMachines = configMachines.value.filter((machine) => machine.id !== machineId);
  if (!remainingMachines.length) return;
  configMachines.value = remainingMachines;
  if (!remainingMachines.some((machine) => machine.id === activeMachineId.value)) {
    activeMachineId.value = remainingMachines[0].id;
  }
}

function updateConfigMachine(machineId, field, value) {
  configMachines.value = configMachines.value.map((machine) =>
    machine.id === machineId
      ? {
          ...machine,
          [field]:
            field === 'rowLimit'
              ? Math.max(1, normalizeWorkCorrectionValue(value || DEFAULT_ROW_LIMIT))
              : String(value ?? ''),
        }
      : machine,
  );
}

function updateConfigProductsDirectory(value) {
  configProductsDirectory.value = String(value ?? '');
}

function updateConfigSetting(field, value) {
  const defaults = {
    printTextMaxLength: DEFAULT_PRINT_TEXT_MAX_LENGTH,
    boardMaxLength: DEFAULT_BOARD_MAX_LENGTH,
    maxQuantity: DEFAULT_MAX_QUANTITY,
    machinePunchCount: DEFAULT_MACHINE_PUNCH_COUNT,
  };
  const normalizedValue = Math.max(1, normalizeWorkCorrectionValue(value || defaults[field] || 1));
  configSettings.value = {
    ...configSettings.value,
    [field]: normalizedValue,
  };
  if (field === 'machinePunchCount' && configStations.value.length > normalizedValue) {
    configStations.value = configStations.value.slice(0, normalizedValue);
  }
}

function toggleConfigActiveExcelColumn(columnKey) {
  if (!DEFAULT_ACTIVE_EXCEL_COLUMNS.includes(columnKey)) return;
  const current = sanitizeActiveExcelColumns(configSettings.value.activeExcelColumns);
  if (current.includes(columnKey) && current.length === 1) return;
  const nextColumns = current.includes(columnKey)
    ? current.filter((column) => column !== columnKey)
    : [...current, columnKey];
  configSettings.value = {
    ...configSettings.value,
    activeExcelColumns: sanitizeActiveExcelColumns(nextColumns),
  };
}

async function selectProductsDirectory() {
  if (isSelectingProductsDirectory.value) return;

  isSelectingProductsDirectory.value = true;
  clearConfigSaveMessage();

  try {
    const response = await fetch('/api/config/select-products-directory', {
      method: 'POST',
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || 'Nie udało się wybrać folderu.');
    }

    if (payload.cancelled) return;

    configProductsDirectory.value = String(payload.productsDirectory || '');
    configSaveError.value = false;
    configSaveMessage.value = 'Wybrano folder. Kliknij "Zapisz" u góry panelu, aby zapisać zmianę.';
  } catch (error) {
    configSaveError.value = true;
    configSaveMessage.value = error.message || 'Nie udało się wybrać folderu.';
  } finally {
    isSelectingProductsDirectory.value = false;
  }
}

function getConfigStationLabel(stationIndex) {
  return `Zestaw ${stationIndex + 1}`;
}

function getConfigStationValueById(stationId) {
  const stationIndex = configStations.value.findIndex((station) => station.id === stationId);
  return stationIndex >= 0 ? String(stationIndex + 1) : '';
}

function getConfigStationValueByLength(lengthValue) {
  const normalizedLength = getNormalizedLengthValue(lengthValue);
  if (!normalizedLength) return '';

  for (let stationIndex = 0; stationIndex < configStations.value.length; stationIndex += 1) {
    const station = configStations.value[stationIndex];
    const minLength = getNormalizedLengthValue(station.lengthRange?.minLength);
    const maxLength = getNormalizedLengthValue(station.lengthRange?.maxLength);
    const hasRange = minLength > 0 || maxLength > 0;
    const matchesRange =
      hasRange &&
      (!minLength || normalizedLength >= minLength) &&
      (!maxLength || normalizedLength <= maxLength);

    if (matchesRange) {
      return String(stationIndex + 1);
    }
  }

  return '';
}

function getConfiguredStationValues() {
  return configStations.value.map((_, index) => String(index + 1));
}

function getStationAutoAssignModeLabel(mode) {
  if (mode === 'similar-together') return 'bliskich wymiarów razem';
  if (mode === 'similar-separate') return 'bliskich wymiarów osobno';
  if (mode === 'by-products') return 'produktów';
  return 'ustawień długości';
}

function buildStationAssignments(rows, mode, getLength, getRowKey) {
  const assignments = new Map();

  if (mode === 'length-ranges') {
    rows.forEach((row) => {
      const station = getConfigStationValueByLength(getLength(row));
      if (station) {
        assignments.set(getRowKey(row), station);
      }
    });
    return assignments;
  }

  const stationValues = getConfiguredStationValues();
  if (!stationValues.length) return assignments;

  const sortableRows = rows
    .map((row, index) => ({
      row,
      key: getRowKey(row),
      length: getNormalizedLengthValue(getLength(row)),
      index,
    }))
    .filter((entry) => entry.length > 0)
    .sort((left, right) => left.length - right.length || left.index - right.index);

  if (!sortableRows.length) return assignments;

  sortableRows.forEach((entry, index) => {
    let stationIndex = 0;

    if (mode === 'similar-separate') {
      stationIndex = index % stationValues.length;
    } else {
      stationIndex = Math.min(Math.floor((index * stationValues.length) / sortableRows.length), stationValues.length - 1);
    }

    assignments.set(entry.key, stationValues[stationIndex]);
  });

  return assignments;
}

function buildStationAssignmentsByGroup(rows, getRowKey, getGroupKey) {
  const assignments = new Map();
  const stationValues = getConfiguredStationValues();
  if (!stationValues.length) return assignments;

  const normalizedGroups = [];
  rows.forEach((row) => {
    const groupKey = String(getGroupKey(row) ?? '').trim();
    if (groupKey && !normalizedGroups.includes(groupKey)) {
      normalizedGroups.push(groupKey);
    }
  });

  normalizedGroups.forEach((groupKey, groupIndex) => {
    const stationValue = stationValues[groupIndex % stationValues.length];
    rows.forEach((row) => {
      if (String(getGroupKey(row) ?? '').trim() === groupKey) {
        assignments.set(getRowKey(row), stationValue);
      }
    });
  });

  return assignments;
}

function closeStationAutoAssignDialog() {
  stationAutoAssignDialog.value = {
    visible: false,
    target: '',
  };
}

function openStationAutoAssignDialog(target) {
  if (!hasConfiguredStations.value) {
    if (target === 'merge') {
      mergeAlert.value = {
        visible: true,
        message: 'Najpierw dodaj co najmniej jeden zestaw wybijaków w konfiguracji.',
      };
      return;
    }

    workUploadError.value = true;
    workUploadMessage.value = 'Najpierw dodaj co najmniej jeden zestaw wybijaków w konfiguracji.';
    return;
  }

  stationAutoAssignDialog.value = {
    visible: true,
    target,
  };
}

function applyMergeStationAssignments(mode) {
  if (!recipeRows.value.length) return;
  if (mode === 'length-ranges' && !hasConfiguredStationLengthRanges.value) {
    mergeAlert.value = {
      visible: true,
      message: 'Brak zakresów długości w konfiguracji wybijaków.',
    };
    return;
  }

  const allRows = Object.values(mergeRecipeDrafts.value).flat();
  const assignments =
    mode === 'by-products'
      ? buildStationAssignmentsByGroup(allRows, (row) => row._localId, (row) => row._sourceProductName ?? row.nazwaProduktu)
      : buildStationAssignments(allRows, mode, (row) => row.dlugosc, (row) => row._localId);
  let updatedCount = 0;
  let assignedCount = 0;

  mergeRecipeDrafts.value = Object.fromEntries(
    Object.entries(mergeRecipeDrafts.value).map(([productName, rows]) => [
      productName,
      rows.map((row) => {
        const autoStation = assignments.get(row._localId) || '';
        const nextStation = autoStation || normalizeStationValue(row.Stanowisko);
        const nextWybijak = nextStation ? getWybijakValueForStation(nextStation, row.dlugosc) : '';
        const hasChanged =
          String(nextStation ?? '') !== String(normalizeStationValue(row.Stanowisko) ?? '') ||
          String(nextWybijak ?? '') !== String(row.wybijak ?? '');

        if (autoStation) {
          assignedCount += 1;
        }
        if (hasChanged) {
          updatedCount += 1;
        }

        return {
          ...row,
          Stanowisko: nextStation,
          wybijak: nextWybijak,
        };
      }),
    ]),
  );

  mergeEditingCell.value = null;
  mergeAlert.value = {
    visible: true,
    message:
      updatedCount > 0
        ? `Przypisano wybijaki dla ${assignedCount} wierszy według zakresów długości.`
        : 'Nie udało się przypisać wybijaków dla żadnego wiersza.',
  };
}

function applyWorkStationAssignments(mode) {
  if (workEditingRowId.value !== null) {
    workUploadError.value = true;
    workUploadMessage.value = 'Najpierw zakończ edycję wszystkich wierszy, zanim przypiszesz wybijaki.';
    return;
  }

  if (!activeWorkRows.value.length) {
    workUploadError.value = true;
    workUploadMessage.value = 'Brak wierszy do przypisania wybijaków.';
    return;
  }

  if (mode === 'length-ranges' && !hasConfiguredStationLengthRanges.value) {
    workUploadError.value = true;
    workUploadMessage.value = 'Brak zakresów długości w konfiguracji wybijaków.';
    return;
  }

  if (mode === 'by-products' && !activeWorkRows.value.some((row) => String(row.SourceProductName ?? '').trim())) {
    workUploadError.value = true;
    workUploadMessage.value = 'Brak informacji o produktach źródłowych dla aktualnych wierszy.';
    return;
  }

  const assignments =
    mode === 'by-products'
      ? buildStationAssignmentsByGroup(activeWorkRows.value, (row) => row.__clientId, (row) => row.SourceProductName)
      : buildStationAssignments(activeWorkRows.value, mode, (row) => row.Dlugosc, (row) => row.__clientId);
  let updatedCount = 0;
  let assignedCount = 0;

  workRows.value = workRows.value.map((row) => {
    if (row.__disabled) return row;

    const autoStation = assignments.get(row.__clientId) || '';
    const nextStation = autoStation || normalizeStationValue(row.Stanowisko);
    const nextWybijak = nextStation ? getWybijakValueForStation(nextStation, row.Dlugosc) : '';
    const hasChanged =
      String(nextStation ?? '') !== String(normalizeStationValue(row.Stanowisko) ?? '') ||
      String(nextWybijak ?? '') !== String(row.Wybijak ?? '');

    if (autoStation) {
      assignedCount += 1;
    }
    if (hasChanged) {
      updatedCount += 1;
    }

    return {
      ...row,
      Stanowisko: nextStation,
      Wybijak: nextWybijak,
    };
  });

  workUploadError.value = false;
  workUploadMessage.value =
    updatedCount > 0
      ? `Przypisano wybijaki dla ${assignedCount} wierszy według zakresów długości.`
      : 'Nie udało się przypisać wybijaków dla żadnego wiersza.';
}

function applyStationAutoAssignMode(mode) {
  const target = stationAutoAssignDialog.value.target;
  closeStationAutoAssignDialog();

  if (target === 'merge') {
    applyMergeStationAssignments(mode);
    return;
  }

  if (target === 'work') {
    applyWorkStationAssignments(mode);
  }
}

function applyMergePunchAssignmentsByLength() {
  applyMergeStationAssignments('length-ranges');
}

function applyWorkPunchAssignmentsByLength() {
  applyWorkStationAssignments('length-ranges');
}

function getConfigStationOrderedPunches(station) {
  if (!station || !Array.isArray(station.punches)) {
    return [];
  }

  return station.punches
    .map((punch) => String(punch.number ?? '').trim())
    .filter(Boolean);
}

function syncConfigStationDistanceRules(station) {
  const orderedPunches = getConfigStationOrderedPunches(station);
  const syncedRules = [];

  for (let index = 0; index < orderedPunches.length - 1; index += 1) {
    const leftPunch = orderedPunches[index];
    const rightPunch = orderedPunches[index + 1];
    const existingRule = station.distanceRules.find(
      (rule) => rule.leftPunch === leftPunch && rule.rightPunch === rightPunch,
    );

    syncedRules.push(
      existingRule || {
        ...createConfigDistanceRule(),
        leftPunch,
        rightPunch,
      },
    );
  }

  return {
    ...station,
    distanceRules: syncedRules,
  };
}

function addConfigStationPunch(stationId) {
  configStations.value = configStations.value.map((station) =>
    station.id === stationId
      ? station.punches.length >= 2
        ? station
        : syncConfigStationDistanceRules({ ...station, punches: [...station.punches, createConfigPunch()] })
      : station,
  );
}

function updateConfigStationPunch(stationId, punchId, value) {
  const normalizedValue = String(value ?? '')
    .replace(/[^\d]/g, '')
    .trim();

  configStations.value = configStations.value.map((station) =>
    station.id === stationId
      ? syncConfigStationDistanceRules({
          ...station,
          punches: station.punches.map((punch) =>
            punch.id === punchId ? { ...punch, number: normalizedValue } : punch,
          ),
        })
      : station,
  );
}

function removeConfigStationPunch(stationId, punchId) {
  configStations.value = configStations.value.map((station) =>
    station.id === stationId
      ? syncConfigStationDistanceRules({ ...station, punches: station.punches.filter((punch) => punch.id !== punchId) })
      : station,
  );
}

function updateConfigStationLengthRange(stationId, field, value) {
  const normalizedValue = String(value ?? '')
    .replace(/[^\d]/g, '')
    .trim();

  configStations.value = configStations.value.map((station) =>
    station.id === stationId
      ? {
          ...station,
          lengthRange: {
            ...(station.lengthRange ?? createConfigLengthRange()),
            [field]: normalizedValue,
          },
        }
      : station,
  );
}

function rememberConfigDistanceEditStart(stationId, ruleId, value) {
  configDistanceEditStart.value = {
    stationId,
    ruleId,
    value: String(value ?? ''),
  };
}

function cancelConfigDistanceImpactDialog() {
  configDistanceImpactDialog.value = {
    visible: false,
    stationId: '',
    ruleId: '',
  };
}

function handleConfigDistanceEditBlur(stationId, ruleId) {
  const start = configDistanceEditStart.value;
  const station = configStations.value.find((entry) => entry.id === stationId);
  const rule = station?.distanceRules.find((entry) => entry.id === ruleId);
  const currentValue = String(rule?.distance ?? '');

  configDistanceEditStart.value = {
    stationId: '',
    ruleId: '',
    value: '',
  };

  if (start.stationId !== stationId || start.ruleId !== ruleId) return;
  if (start.value === currentValue) return;
  if (!workRows.value.length) return;

  configDistanceImpactDialog.value = {
    visible: true,
    stationId,
    ruleId,
  };
}

function applyConfigDistanceToCurrentWorkRecipe() {
  const stationValue = getConfigStationValueById(configDistanceImpactDialog.value.stationId);
  if (stationValue) {
    workRows.value = workRows.value.map((row) =>
      normalizeStationValue(row.Stanowisko) === stationValue
        ? {
            ...row,
            Wybijak: getWybijakValueForStation(stationValue, row.Dlugosc),
          }
        : row,
    );
    workUploadError.value = false;
    workUploadMessage.value =
      'Przeliczono wartości Wybijak dla aktualnie wgranej receptury. Wcześniejsze ręczne zmiany Wybijak mogły zostać utracone.';
  }

  cancelConfigDistanceImpactDialog();
}

function updateConfigStationDistance(stationId, ruleId, field, value) {
  const normalizedValue = String(value ?? '')
    .replace(/[^\d]/g, '')
    .trim();

  configStations.value = configStations.value.map((station) =>
    station.id === stationId
      ? {
          ...station,
          distanceRules: station.distanceRules.map((rule) =>
            rule.id === ruleId ? { ...rule, [field]: normalizedValue } : rule,
          ),
        }
      : station,
  );
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

function sanitizeActiveExcelColumns(columns = []) {
  const allowed = new Set(DEFAULT_ACTIVE_EXCEL_COLUMNS);
  const nextColumns = Array.isArray(columns)
    ? [...new Set(columns.map((column) => String(column ?? '').trim()).filter((column) => allowed.has(column)))]
    : [];
  return nextColumns.length ? nextColumns : [...DEFAULT_ACTIVE_EXCEL_COLUMNS];
}

function getConfiguredActiveExcelColumns() {
  return sanitizeActiveExcelColumns(configSettings.value.activeExcelColumns);
}

function getActiveProductImportFieldDefinitions() {
  const allowed = new Set(getConfiguredActiveExcelColumns());
  return productImportFieldDefinitions.filter((field) => allowed.has(field.key));
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

function getProductImportAutoMapping(headers = [], fieldDefinitions = getActiveProductImportFieldDefinitions()) {
  const normalizedHeaders = headers.map((header) => String(header ?? '').trim()).filter(Boolean);
  const mapping = {};
  const usedHeaders = new Set();

  for (const field of fieldDefinitions) {
    const matchedHeader = normalizedHeaders.find(
      (header) =>
        !usedHeaders.has(header) &&
        field.aliases.some((alias) => normalizeHeaderKey(alias) === normalizeHeaderKey(header)),
    );
    mapping[field.key] = matchedHeader || '';
    if (matchedHeader) {
      usedHeaders.add(matchedHeader);
    }
  }

  return {
    mapping,
    usedHeaders,
  };
}

function getProductImportMissingTargets(mapping = {}, fieldDefinitions = getActiveProductImportFieldDefinitions()) {
  return fieldDefinitions.filter((field) => field.required && !String(mapping[field.key] ?? '').trim());
}

function isProductImportMappingComplete(mapping = {}, fieldDefinitions = getActiveProductImportFieldDefinitions()) {
  return getProductImportMissingTargets(mapping, fieldDefinitions).length === 0;
}

function getProductImportAvailableHeaders(headers = [], mapping = {}, fieldDefinitions = getActiveProductImportFieldDefinitions()) {
  const selectedHeaders = new Set(
    Object.values(mapping)
      .map((value) => String(value ?? '').trim())
      .filter(Boolean),
  );
  return headers.map((header) => String(header ?? '').trim()).filter((header) => header && !selectedHeaders.has(header));
}

function normalizeProductImportRow(sourceRow, mapping, fieldDefinitions = getActiveProductImportFieldDefinitions()) {
  const activeKeys = new Set(fieldDefinitions.map((field) => field.key));
  return {
    Nazwa: activeKeys.has('Nazwa') ? String(sourceRow?.[mapping.Nazwa] ?? '').trim() : '',
    Kod: activeKeys.has('Kod') ? normalizePrintTextValue(sourceRow?.[mapping.Kod] ?? '') : '',
    'Długość': activeKeys.has('Długość') ? String(sourceRow?.[mapping['Długość']] ?? '').trim() : '',
    'Grubość': activeKeys.has('Grubość') ? String(sourceRow?.[mapping['Grubość']] ?? '').trim() : '',
    'Szerokość': activeKeys.has('Szerokość') ? String(sourceRow?.[mapping['Szerokość']] ?? '').trim() : '',
    'Materiał': activeKeys.has('Materiał') ? String(sourceRow?.[mapping['Materiał']] ?? '').trim() : '',
    'ilość': activeKeys.has('ilość') ? String(sourceRow?.[mapping['ilość']] ?? '').trim() : '',
    Wybijak: activeKeys.has('Wybijak') ? String(sourceRow?.[mapping.Wybijak] ?? '').trim() : '',
    Klasa: activeKeys.has('Klasa') ? normalizeDefaultClassValue(sourceRow?.[mapping.Klasa] ?? '') : '',
    Stanowisko: activeKeys.has('Stanowisko') ? normalizeStationValue(sourceRow?.[mapping.Stanowisko] ?? '') : '',
    Grupa: '',
    Priorytet: '',
  };
}

function buildProductImportWorkbook(headers, rows, mapping, fieldDefinitions = getActiveProductImportFieldDefinitions()) {
  const normalizedRows = rows.map((rowValues) => {
    const sourceRow = buildRowFromHeaders(headers, rowValues);
    return normalizeProductImportRow(sourceRow, mapping, fieldDefinitions);
  });

  const matrix = [
    productImportExportColumns,
    ...normalizedRows.map((row) => productImportExportColumns.map((column) => row[column] ?? '')),
  ];

  return XLSX.utils.aoa_to_sheet(matrix);
}

function buildRowFromHeaders(headers, rowValues) {
  const entries = headers.map((header, index) => [header, rowValues[index] ?? '']);
  return Object.fromEntries(entries);
}

function formatProductDisplayName(fileName) {
  return String(fileName || '').replace(/\.xlsx$/i, '');
}

function isGeneratedTemporaryMergeProduct(productName) {
  return String(productName ?? '').startsWith(TEMP_EMPTY_PRODUCT_PREFIX);
}

function isTemporaryMergeProduct(productName) {
  return productName === TEMP_PRODUCT_KEY || isGeneratedTemporaryMergeProduct(productName);
}

function canRenameMergeProduct(productName) {
  return isGeneratedTemporaryMergeProduct(productName);
}

function canPersistMergeProduct(productName) {
  return isGeneratedTemporaryMergeProduct(productName);
}

function getMergeProductDisplayName(productName) {
  if (productName === TEMP_PRODUCT_KEY) {
    return temporaryProductName.value.trim() || 'Produkt dodatkowy';
  }
  if (isGeneratedTemporaryMergeProduct(productName)) {
    return temporaryMergeProductNames.value[productName]?.trim() || 'Pusty produkt';
  }
  return formatProductDisplayName(productName);
}

function createTemporaryMergeProductKey() {
  return `${TEMP_EMPTY_PRODUCT_PREFIX}${createProductLocalId()}`;
}

function createTemporaryMergeProductName() {
  const usedNames = new Set(Object.values(temporaryMergeProductNames.value).map((name) => String(name ?? '').trim().toLowerCase()).filter(Boolean));
  let index = 1;
  while (usedNames.has(`Pusty produkt ${index}`.toLowerCase())) {
    index += 1;
  }
  return `Pusty produkt ${index}`;
}

function startMergeProductNameEdit(productName) {
  if (!canRenameMergeProduct(productName)) return;
  mergeProductNameEditKey.value = productName;
  mergeProductNameDraft.value = getMergeProductDisplayName(productName);
}

function cancelMergeProductNameEdit() {
  mergeProductNameEditKey.value = '';
  mergeProductNameDraft.value = '';
}

function saveMergeProductName(productName) {
  if (!canRenameMergeProduct(productName) || mergeProductNameEditKey.value !== productName) return;
  const nextName = mergeProductNameDraft.value.trim() || temporaryMergeProductNames.value[productName] || createTemporaryMergeProductName();
  temporaryMergeProductNames.value = {
    ...temporaryMergeProductNames.value,
    [productName]: nextName,
  };
  cancelMergeProductNameEdit();
}

function clearMergeProductSaveMessage() {
  mergeProductSaveMessage.value = '';
  mergeProductSaveError.value = false;
}

function setMergeProductSaveMessage(message, isError = false) {
  mergeProductSaveMessage.value = message;
  mergeProductSaveError.value = isError;
}

function clearMergeWorkUploadMessage() {
  mergeWorkUploadMessage.value = '';
  mergeWorkUploadError.value = false;
}

function setMergeWorkUploadMessage(message, isError = false) {
  mergeWorkUploadMessage.value = message;
  mergeWorkUploadError.value = isError;
}

function isMergeProductPersisting(productName) {
  return Boolean(mergeProductSavingMap.value[productName]);
}

function getPersistedMergeProductRows(productName) {
  return (mergeRecipeDrafts.value[productName] ?? []).map((row) => ({
    Nazwa: String(row?.nazwaSkladowej ?? '').trim(),
    Kod: normalizePrintTextValue(row?.TekstDoDruku ?? ''),
    'Długość': String(row?.dlugosc ?? '').trim(),
    'Grubość': String(row?.grubosc ?? '').trim(),
    'Szerokość': String(row?.szerokosc ?? '').trim(),
    'Materiał': String(row?.material ?? '').trim(),
    'ilość': String(row?._baseIlosc ?? row?.ilosc ?? '').trim(),
    Wybijak: String(row?.wybijak ?? '').trim(),
    Klasa: String(row?.Klasa ?? '').trim(),
    Stanowisko: String(row?.Stanowisko ?? '').trim(),
  }));
}

function buildWorkMainRowsFromMergeRecipe() {
  return recipeRows.value.map((row, index) =>
    getWorkRowPayload({
      id: index + 1,
      SourceProductName: row.nazwaProduktu || '',
      Nazwa: row.nazwaSkladowej || '',
      NazwaRec: 'Aktualna praca',
      Material: row.material || '',
      Grubosc: row.grubosc || 0,
      Szerokosc: row.szerokosc || 0,
      Dlugosc: row.dlugosc || 0,
      Sztuk: row.ilosc || 0,
      WykonaneSztuki: row.iloscWykonana || 0,
      Wybijak: row.wybijak || 0,
      TekstDoDruku: row.TekstDoDruku || '',
      Grupa: row.grupa || '',
      Priorytet: row.priorytet || '',
      Klasa: row.Klasa ?? 2,
      Usr: 'Default',
      Stanowisko: row.Stanowisko || '',
      zliczonaIloscIn: row.ilosc || 0,
    }, index),
  );
}

function requestUploadMergeToWorkMain() {
  if (!recipeRows.value.length) return;
  if (saveRecipeValidationError.value) {
    setMergeWorkUploadMessage(saveRecipeValidationError.value, true);
    return;
  }

  clearMergeWorkUploadMessage();
  openConfirmDialog(
    'upload-merge-to-workmain',
    'Na pewno chcesz wgrać wybrane produkty do aktualnie ciętych? Obecna zawartość WorkMain zostanie zastąpiona.',
  );
}

function replaceTemporaryMergeProductWithSavedFile(productName, savedFileName) {
  const sourceRows = mergeRecipeDrafts.value[productName] ?? [];
  const nextRows = sourceRows.map((row) => ({
    ...createMergeDraftRow(savedFileName, {
      Nazwa: row?.nazwaSkladowej ?? '',
      Kod: row?.TekstDoDruku ?? '',
      'Długość': row?.dlugosc ?? '',
      'Grubość': row?.grubosc ?? '',
      'Szerokość': row?.szerokosc ?? '',
      'Materiał': row?.material ?? '',
      'ilość': row?._baseIlosc ?? row?.ilosc ?? '',
      Wybijak: row?.wybijak ?? '',
      Klasa: row?.Klasa ?? '',
      Stanowisko: row?.Stanowisko ?? '',
    }),
    grupa: row?.grupa ?? '',
    priorytet: row?.priorytet ?? '',
    Informacje: row?.Informacje ?? 'Kopia tymczasowa',
    iloscWykonana: row?.iloscWykonana ?? 0,
  }));

  const nextDrafts = { ...mergeRecipeDrafts.value };
  delete nextDrafts[productName];
  nextDrafts[savedFileName] = nextRows;
  mergeRecipeDrafts.value = nextDrafts;

  selectedProducts.value = selectedProducts.value.map((name) => (name === productName ? savedFileName : name));

  const nextQuantities = { ...mergeProductQuantities.value };
  nextQuantities[savedFileName] = nextQuantities[productName] ?? 1;
  delete nextQuantities[productName];
  mergeProductQuantities.value = nextQuantities;

  const nextModes = { ...mergeEditModes.value };
  nextModes[savedFileName] = nextModes[productName] ?? false;
  delete nextModes[productName];
  mergeEditModes.value = nextModes;

  const nextCollapsed = { ...collapsedRecipeGroups.value };
  nextCollapsed[savedFileName] = nextCollapsed[productName] ?? false;
  delete nextCollapsed[productName];
  collapsedRecipeGroups.value = nextCollapsed;

  const nextSavingMap = { ...mergeProductSavingMap.value };
  delete nextSavingMap[productName];
  mergeProductSavingMap.value = nextSavingMap;

  const nextNames = { ...temporaryMergeProductNames.value };
  delete nextNames[productName];
  temporaryMergeProductNames.value = nextNames;

  const nextImages = { ...productImageState.value };
  revokeLocalProductImage(productName);
  delete nextImages[productName];
  productImageState.value = nextImages;
  if (productImagePreview.value.visible && productImagePreview.value.productName === productName) {
    closeProductImagePreview();
  }

  if (mergeProductNameEditKey.value === productName) {
    cancelMergeProductNameEdit();
  }
}

async function saveTemporaryMergeProduct(productName) {
  if (!canPersistMergeProduct(productName) || isMergeProductPersisting(productName)) return;

  const productLabel = getMergeProductDisplayName(productName).trim();
  const rows = mergeRecipeDrafts.value[productName] ?? [];

  if (!productLabel) {
    setMergeProductSaveMessage('Nadaj nazwę produktu przed zapisem.', true);
    return;
  }

  if (!rows.length) {
    setMergeProductSaveMessage('Nie można zapisać pustego produktu bez elementów.', true);
    return;
  }

  const validationMessage = getRecipeRowsValidationMessage(rows, 'Nie można zapisać produktu.');
  if (validationMessage) {
    setMergeProductSaveMessage(validationMessage, true);
    return;
  }

  const wybijakValidationError = getRecipePreviewWybijakValidationError(rows);
  if (wybijakValidationError) {
    setMergeProductSaveMessage(wybijakValidationError, true);
    return;
  }

  clearMergeProductSaveMessage();
  mergeProductSavingMap.value = {
    ...mergeProductSavingMap.value,
    [productName]: true,
  };

  try {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      productImportExportColumns,
      ...getPersistedMergeProductRows(productName).map((row) => productImportExportColumns.map((column) => row[column] ?? '')),
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produkty');
    const contentBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    const normalizedFileName = `${productLabel.replace(/[\\/:*?\"<>|]+/g, ' ').trim() || 'Nowy produkt'}.xlsx`;

    const result = await postProductFileAction('/api/products/import', {
      fileName: normalizedFileName,
      contentBase64,
    });
    const savedFileName = result.fileName || normalizedFileName;
    const imageState = productImageState.value[productName];
    if (imageState?.source === 'local' && imageState?.base64 && imageState?.mimeType) {
      await postProductFileAction('/api/products/image', {
        fileName: savedFileName,
        contentBase64: imageState.base64,
        mimeType: imageState.mimeType,
      });
    }

    await reloadProductsAfterFileAction(savedFileName);
    replaceTemporaryMergeProductWithSavedFile(productName, savedFileName);
    setMergeProductSaveMessage(`Zapisano produkt ${formatProductDisplayName(savedFileName)}.`, false);
  } catch (error) {
    setMergeProductSaveMessage(error.message || 'Nie udało się zapisać produktu.', true);
  } finally {
    const nextSavingMap = { ...mergeProductSavingMap.value };
    delete nextSavingMap[productName];
    mergeProductSavingMap.value = nextSavingMap;
  }
}

async function uploadMergeToWorkMain() {
  if (isMergeUploadingToWorkMain.value) return;

  const rowsToUpload = buildWorkMainRowsFromMergeRecipe();
  if (!rowsToUpload.length) {
    setMergeWorkUploadMessage('Brak wierszy do wgrania.', true);
    return;
  }

  const validationMessage = getWorkRowsValidationMessage(rowsToUpload, 'Nie można wgrać produktów do aktualnie ciętych.');
  if (validationMessage) {
    setMergeWorkUploadMessage(validationMessage, true);
    return;
  }

  isMergeUploadingToWorkMain.value = true;
  clearMergeWorkUploadMessage();

  try {
    const response = await fetch('/api/workmain/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: rowsToUpload }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Nie udało się wgrać danych do aktualnie ciętych.');
    }

    await loadWorkMainRows({ preserveDisabled: false, preserveLocalDrafts: false });
    workTableSourceMode.value = 'active';
    workTableSourceName.value = 'Aktualna praca';
    clearWorkCorrectionState();
    setMergeWorkUploadMessage(`Wgrano ${payload.insertedRows ?? rowsToUpload.length} wierszy do aktualnie ciętych.`, false);
  } catch (error) {
    setMergeWorkUploadMessage(error.message || 'Nie udało się wgrać danych do aktualnie ciętych.', true);
  } finally {
    isMergeUploadingToWorkMain.value = false;
  }
}

function formatTemporaryRowOption(row) {
  const code = row.Kod ?? row.TekstDoDruku ?? '—';
  const length = row['Długość'] ?? row.dlugosc ?? '—';
  const thickness = row['Grubość'] ?? row.grubosc ?? '—';
  const width = row['Szerokość'] ?? row.szerokosc ?? '—';
  const material = row['Materiał'] ?? row.material ?? '—';
  return `${code} | ${length} x ${thickness} x ${width} | ${material}`;
}

function getFavoriteElementIdentity(sourceProductName, row = {}, sourceRowIndex = -1) {
  return JSON.stringify({
    sourceProductName: String(sourceProductName ?? ''),
    sourceRowIndex,
    name: String(row?.Nazwa ?? row?.nazwaSkladowej ?? ''),
    length: String(row?.['Długość'] ?? row?.dlugosc ?? ''),
    width: String(row?.['Szerokość'] ?? row?.szerokosc ?? ''),
    thickness: String(row?.['Grubość'] ?? row?.grubosc ?? ''),
    code: String(row?.Kod ?? row?.TekstDoDruku ?? ''),
  });
}

function isFavoriteSourceRow(sourceProductName, row = {}) {
  const targetIdentity = getFavoriteElementIdentity(
    sourceProductName,
    row,
    Number.isFinite(row?._rowIndex) ? row._rowIndex : -1,
  );
  return favoriteElements.value.some(
    (favorite) =>
      getFavoriteElementIdentity(favorite.sourceProductName, favorite.row, favorite.sourceRowIndex) === targetIdentity,
  );
}

async function persistFavoriteElements() {
  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: configPayload.value }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Nie udało się zapisać ulubionych elementów.');
    }
    applyLoadedConfig(payload.config ?? configPayload.value);
  } catch (error) {
    mergeAlert.value = {
      visible: true,
      message: error.message || 'Nie udało się zapisać ulubionych elementów.',
    };
  }
}

async function toggleFavoriteSourceRow(sourceProductName, row) {
  if (!sourceProductName || !row) return;

  const targetIdentity = getFavoriteElementIdentity(
    sourceProductName,
    row,
    Number.isFinite(row?._rowIndex) ? row._rowIndex : -1,
  );
  const existingFavorite = favoriteElements.value.find(
    (favorite) =>
      getFavoriteElementIdentity(favorite.sourceProductName, favorite.row, favorite.sourceRowIndex) === targetIdentity,
  );

  if (existingFavorite) {
    favoriteElements.value = favoriteElements.value.filter((favorite) => favorite.id !== existingFavorite.id);
    await persistFavoriteElements();
    return;
  }

  favoriteElements.value = [...favoriteElements.value, createFavoriteElementEntry(sourceProductName, row)];
  await persistFavoriteElements();
}

async function removeFavoriteElement(favoriteId) {
  removeFavoriteElementFromMerge(favoriteId);
  favoriteElements.value = favoriteElements.value.filter((favorite) => favorite.id !== favoriteId);
  if (!favoriteElements.value.length) {
    closeFavoriteElementsModal();
  }
  await persistFavoriteElements();
}

function isFavoriteElementInRecipe(favoriteId) {
  return temporaryProductRows.value.some((row) => row?._favoriteId === favoriteId);
}

function addFavoriteElementToMerge(favoriteId) {
  const favorite = favoriteElements.value.find((entry) => entry.id === favoriteId);
  if (!favorite) return;
  if (isFavoriteElementInRecipe(favoriteId)) return;
  if (!remainingRecipeCapacity.value) {
    showMergeLimitMessage();
    return;
  }

  const nextRow = {
    ...createMergeDraftRow(TEMP_PRODUCT_KEY, favorite.row),
    _favoriteId: favoriteId,
  };
  mergeRecipeDrafts.value = {
    ...mergeRecipeDrafts.value,
    [TEMP_PRODUCT_KEY]: [...temporaryProductRows.value, nextRow],
  };
  syncTemporaryProductSelection();
  clearMergeMessage();
}

function addEmptyMergeElement() {
  if (!remainingRecipeCapacity.value) {
    showMergeLimitMessage();
    return;
  }

  const nextRow = createMergeDraftRow(TEMP_PRODUCT_KEY);
  mergeRecipeDrafts.value = {
    ...mergeRecipeDrafts.value,
    [TEMP_PRODUCT_KEY]: [...temporaryProductRows.value, nextRow],
  };
  syncTemporaryProductSelection();
  mergeEditModes.value = {
    ...mergeEditModes.value,
    [TEMP_PRODUCT_KEY]: true,
  };
  collapsedRecipeGroups.value = {
    ...collapsedRecipeGroups.value,
    [TEMP_PRODUCT_KEY]: false,
  };
  mergeEditingCell.value = `${nextRow._localId}:TekstDoDruku`;
  clearMergeMessage();
}

function addEmptyMergeProduct() {
  if (!remainingRecipeCapacity.value) {
    showMergeLimitMessage();
    return;
  }

  const productKey = createTemporaryMergeProductKey();
  const productName = createTemporaryMergeProductName();
  const nextRow = createMergeDraftRow(productKey);

  mergeRecipeDrafts.value = {
    ...mergeRecipeDrafts.value,
    [productKey]: [nextRow],
  };
  temporaryMergeProductNames.value = {
    ...temporaryMergeProductNames.value,
    [productKey]: productName,
  };
  selectedProducts.value = [...selectedProducts.value, productKey];
  mergeProductQuantities.value = {
    ...mergeProductQuantities.value,
    [productKey]: 1,
  };
  mergeEditModes.value = {
    ...mergeEditModes.value,
    [productKey]: true,
  };
  collapsedRecipeGroups.value = {
    ...collapsedRecipeGroups.value,
    [productKey]: false,
  };
  mergeEditingCell.value = `${nextRow._localId}:TekstDoDruku`;
  clearMergeMessage();
}

function removeFavoriteElementFromMerge(favoriteId) {
  if (!favoriteId) return;
  const nextRows = temporaryProductRows.value.filter((row) => row?._favoriteId !== favoriteId);
  mergeRecipeDrafts.value = {
    ...mergeRecipeDrafts.value,
    [TEMP_PRODUCT_KEY]: nextRows,
  };
  if (!nextRows.length) {
    const nextDrafts = { ...mergeRecipeDrafts.value };
    delete nextDrafts[TEMP_PRODUCT_KEY];
    mergeRecipeDrafts.value = nextDrafts;
  }
  syncTemporaryProductSelection();
  mergeEditingCell.value = null;
}

function removeTemporaryMergeProduct(productName) {
  const nextDrafts = { ...mergeRecipeDrafts.value };
  delete nextDrafts[productName];
  mergeRecipeDrafts.value = nextDrafts;

  selectedProducts.value = selectedProducts.value.filter((name) => name !== productName);

  const nextQuantities = { ...mergeProductQuantities.value };
  delete nextQuantities[productName];
  mergeProductQuantities.value = nextQuantities;

  const nextModes = { ...mergeEditModes.value };
  delete nextModes[productName];
  mergeEditModes.value = nextModes;

  const nextCollapsed = { ...collapsedRecipeGroups.value };
  delete nextCollapsed[productName];
  collapsedRecipeGroups.value = nextCollapsed;

  if (isGeneratedTemporaryMergeProduct(productName)) {
    const nextNames = { ...temporaryMergeProductNames.value };
    delete nextNames[productName];
    temporaryMergeProductNames.value = nextNames;
  }

  const nextImages = { ...productImageState.value };
  revokeLocalProductImage(productName);
  delete nextImages[productName];
  productImageState.value = nextImages;
  if (productImagePreview.value.visible && productImagePreview.value.productName === productName) {
    closeProductImagePreview();
  }

  if (mergeProductNameEditKey.value === productName) {
    cancelMergeProductNameEdit();
  }

  if (productName === TEMP_PRODUCT_KEY) {
    resetTemporarySelection();
    isSingleElementModalOpen.value = false;
    syncTemporaryProductSelection();
  }

  mergeEditingCell.value = null;
}

function normalizeGroupValue(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  return /^[A-Z]$/.test(normalized) ? normalized : normalized.slice(0, 1).replace(/[^A-Z]/g, '');
}

function normalizePriorityValue(value) {
  const normalized = String(value ?? '').trim();
  return /^[0-9]$/.test(normalized) ? normalized : normalized.replace(/\D/g, '').slice(0, 1);
}

function normalizePrintTextValue(value) {
  const maxLength = Math.max(1, normalizeWorkCorrectionValue(configSettings.value?.printTextMaxLength || DEFAULT_PRINT_TEXT_MAX_LENGTH));
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .slice(0, maxLength)
    .trim();
}

function normalizeStationValue(value) {
  const normalized = String(value ?? '')
    .replace(/[^\d]/g, '')
    .trim();
  return normalized === '0' ? '' : normalized;
}

function normalizeMaterialValue(value) {
  const normalized = String(value ?? '').trim();
  return materialOptions.includes(normalized) ? normalized : '';
}

function normalizeEditableCellValue(column, value) {
  if (column === 'Kod' || column === 'TekstDoDruku') {
    return normalizePrintTextValue(value);
  }
  if (column === 'Materiał' || column === 'material' || column === 'Material') {
    return normalizeMaterialValue(value);
  }
  if (column === 'Grupa' || column === 'grupa') {
    return normalizeGroupValue(value);
  }
  if (column === 'Priorytet' || column === 'priorytet') {
    return normalizePriorityValue(value);
  }
  if (column === 'Stanowisko' || column === 'stanowisko') {
    return normalizeStationValue(value);
  }
  return value;
}

function getDropdownOptions(column) {
  if (column === 'Grupa' || column === 'grupa') return groupOptions;
  if (column === 'Priorytet' || column === 'priorytet') return priorityOptions;
  if (column === 'Materiał' || column === 'material' || column === 'Material') return materialOptions;
  return [];
}

function isDropdownColumn(column) {
  return getDropdownOptions(column).length > 0;
}

function isStationColumn(column) {
  return column === 'Stanowisko' || column === 'stanowisko';
}

function isDimensionColumn(column) {
  return ['Długość', 'Grubość', 'Szerokość', 'dlugosc', 'grubosc', 'szerokosc', 'Dlugosc', 'Grubosc', 'Szerokosc'].includes(column);
}

function getColumnLabelText(column, labels = {}) {
  return labels[column] ?? column;
}

function getStationDropdownOptions(currentValue = '') {
  const normalizedCurrentValue = normalizeStationValue(currentValue);
  const options = [...stationOptions.value];

  if (normalizedCurrentValue && !options.some((option) => option.value === normalizedCurrentValue)) {
    options.push({
      id: `legacy-station-${normalizedCurrentValue}`,
      value: normalizedCurrentValue,
      label: `Stanowisko ${normalizedCurrentValue}`,
    });
  }

  return options;
}

function getNormalizedLengthValue(lengthValue) {
  const normalized = Number(String(lengthValue ?? '').replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : 0;
}

function getWybijakValueForStation(stationValue, lengthValue = 0) {
  const normalizedStationValue = normalizeStationValue(stationValue);
  if (!normalizedStationValue) return '';

  const stationIndex = Number.parseInt(normalizedStationValue, 10) - 1;
  if (!Number.isFinite(stationIndex) || stationIndex < 0) return '';

  const station = configStations.value[stationIndex];
  if (!station) return '';

  const punchNumbers = getConfigStationOrderedPunches(station)
    .map((punch) => String(punch ?? '').replace(/[^\d]/g, '').trim())
    .filter(Boolean)
    .slice(0, 2);

  if (!punchNumbers.length) return '';
  const normalizedLength = getNormalizedLengthValue(lengthValue);
  const orderedDistanceRules = Array.isArray(station.distanceRules) ? station.distanceRules : [];
  const hasTooShortLengthForDistance = orderedDistanceRules.some((rule) => {
    const distance = getNormalizedLengthValue(rule?.distance);
    return distance > 0 && normalizedLength > 0 && normalizedLength < distance;
  });

  if (hasTooShortLengthForDistance) {
    return punchNumbers[0];
  }
  if (punchNumbers.length === 1) return punchNumbers[0];
  return punchNumbers.join(' i ');
}

function formatWorkWybijakDisplayValue(row) {
  const rawValue = String(row?.Wybijak ?? '').trim();
  if (!rawValue) return '';
  if (rawValue.includes(' i ')) return rawValue;
  const normalizedRawValue = rawValue.replace(/[^\d]/g, '');
  if (!normalizedRawValue) return rawValue;

  const normalizedStationValue = normalizeStationValue(row?.Stanowisko);
  const stationIndex = Number.parseInt(normalizedStationValue, 10) - 1;
  if (Number.isFinite(stationIndex) && stationIndex >= 0) {
    const station = configStations.value[stationIndex];
    const punchNumbers = getConfigStationOrderedPunches(station)
      .map((punch) => String(punch ?? '').replace(/[^\d]/g, '').trim())
      .filter(Boolean)
      .slice(0, 2);

    if (punchNumbers.length === 2 && normalizedRawValue === punchNumbers.join('')) {
      return `${punchNumbers[0]} i ${punchNumbers[1]}`;
    }
  }

  for (const station of configStations.value) {
    const punchNumbers = getConfigStationOrderedPunches(station)
      .map((punch) => String(punch ?? '').replace(/[^\d]/g, '').trim())
      .filter(Boolean)
      .slice(0, 2);

    if (punchNumbers.length === 2 && normalizedRawValue === punchNumbers.join('')) {
      return `${punchNumbers[0]} i ${punchNumbers[1]}`;
    }
  }

  return rawValue;
}

function getConfiguredWybijakPair(rawDigits, stationValue = '') {
  const normalizedRawDigits = String(rawDigits ?? '').replace(/[^\d]/g, '').trim();
  if (!normalizedRawDigits) return null;

  const collectPairs = [];
  const normalizedStationValue = normalizeStationValue(stationValue);
  const stationIndex = Number.parseInt(normalizedStationValue, 10) - 1;
  if (Number.isFinite(stationIndex) && stationIndex >= 0 && configStations.value[stationIndex]) {
    collectPairs.push(configStations.value[stationIndex]);
  }
  collectPairs.push(...configStations.value);

  for (const station of collectPairs) {
    const punchNumbers = getConfigStationOrderedPunches(station)
      .map((punch) => String(punch ?? '').replace(/[^\d]/g, '').trim())
      .filter(Boolean)
      .slice(0, 2);

    if (punchNumbers.length === 2 && normalizedRawDigits === punchNumbers.join('')) {
      return punchNumbers;
    }
  }

  return null;
}

function getWybijakInputParts(value, stationValue = '') {
  const rawValue = String(value ?? '').trim();
  if (!rawValue) return ['', ''];

  const explicitParts = rawValue.match(/\d+/g)?.slice(0, 2) ?? [];
  if (rawValue.includes(' i ') || explicitParts.length > 1) {
    return [explicitParts[0] ?? '', explicitParts[1] ?? ''];
  }

  const configuredPair = getConfiguredWybijakPair(rawValue, stationValue);
  if (configuredPair) {
    return [configuredPair[0] ?? '', configuredPair[1] ?? ''];
  }

  return [String(rawValue).replace(/[^\d]/g, '').trim(), ''];
}

function buildWybijakValueFromParts(firstPart, secondPart) {
  const first = String(firstPart ?? '').replace(/[^\d]/g, '').trim();
  const second = String(secondPart ?? '').replace(/[^\d]/g, '').trim();
  if (first && second) return `${first} i ${second}`;
  return first || second || '';
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
  return getDropdownOptions(column);
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

  if (isStationColumn(column)) {
    return getStationDropdownOptions(row?.[column]);
  }

  return getDropdownOptions(column);
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
  const defaultClassValue =
    sourceRow.Klasa !== undefined || sourceRow.klasa !== undefined
      ? normalizeDefaultClassValue(sourceRow.Klasa ?? sourceRow.klasa)
      : isTemporaryMergeProduct(productName)
        ? 1
        : 2;

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
    grupa: '',
    priorytet: '',
    ilosc: baseQuantity,
    iloscWykonana: sourceRow.iloscWykonana ?? 0,
    Klasa: defaultClassValue,
    Stanowisko: normalizeStationValue(sourceRow.Stanowisko ?? sourceRow.stanowisko),
    Informacje: sourceRow.Informacje ?? 'Kopia tymczasowa',
    TekstDoDruku: normalizePrintTextValue(sourceRow.Kod || sourceRow.TekstDoDruku || sourceRow.nazwaSkladowej || sourceRow.Nazwa || ''),
  };
}

function createRecipePreviewDraftRow(sourceRow = {}) {
  return {
    _localId: createProductLocalId(),
    nazwaSkladowej: sourceRow.nazwaSkladowej ?? '',
    dlugosc: sourceRow.dlugosc ?? '',
    grubosc: sourceRow.grubosc ?? '',
    szerokosc: sourceRow.szerokosc ?? '',
    material: sourceRow.material ?? '',
    idReceptury: sourceRow.idReceptury ?? 0,
    idSkladowej: sourceRow.idSkladowej ?? 0,
    wybijak: sourceRow.wybijak ?? '',
    grupa: '',
    priorytet: '',
    ilosc: sourceRow.ilosc ?? 0,
    iloscWykonana: sourceRow.iloscWykonana ?? 0,
    Klasa: sourceRow.Klasa ?? sourceRow.klasa ?? 0,
    Stanowisko: normalizeStationValue(sourceRow.Stanowisko ?? sourceRow.stanowisko),
    Informacje: sourceRow.Informacje ?? '',
    TekstDoDruku: normalizePrintTextValue(sourceRow.TekstDoDruku ?? ''),
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

function setSelectedProductMessage(message, isError = false) {
  saveMessage.value = message;
  saveError.value = isError;
}

function resetProductImportMappingDialogState() {
  productImportMappingDialog.value = {
    visible: false,
    fileName: '',
    headers: [],
    previewRows: [],
    mapping: {},
    missingTargets: [],
    message: '',
    processing: false,
  };
}

function closeProductImportMappingDialog() {
  if (productImportMappingResolver) {
    productImportMappingResolver.reject(new Error('Import został anulowany.'));
    productImportMappingResolver = null;
  }
  resetProductImportMappingDialogState();
}

function openProductImportMappingDialog({ fileName, headers, rows, mapping, missingTargets, message }) {
  resetProductImportMappingDialogState();
  productImportMappingDialog.value = {
    visible: true,
    fileName,
    headers,
    previewRows: rows.slice(0, 3),
    mapping,
    missingTargets,
    message,
    processing: false,
  };
  return new Promise((resolve, reject) => {
    productImportMappingResolver = { resolve, reject };
  });
}

function updateProductImportMapping(targetKey, sourceHeader) {
  const nextMapping = { ...productImportMappingDialog.value.mapping };
  for (const field of productImportFieldDefinitions) {
    if (field.key !== targetKey && nextMapping[field.key] === sourceHeader) {
      nextMapping[field.key] = '';
    }
  }
  nextMapping[targetKey] = sourceHeader;
  productImportMappingDialog.value.mapping = nextMapping;
}

function confirmProductImportMapping() {
  if (!productImportMappingResolver) return;

  const mapping = { ...productImportMappingDialog.value.mapping };
  if (!isProductImportMappingComplete(mapping)) {
    productImportMappingDialog.value.message = 'Uzupełnij wszystkie wymagane pola przed kontynuacją importu.';
    return;
  }

  productImportMappingDialog.value.processing = true;
  const { resolve } = productImportMappingResolver;
  productImportMappingResolver = null;
  closeProductImportMappingDialog();
  resolve(mapping);
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

function revokeLocalProductImage(productName) {
  const currentImage = productImageState.value[productName];
  if (currentImage?.source === 'local' && currentImage?.url) {
    URL.revokeObjectURL(currentImage.url);
  }
}

function getProductDisplayTitle(productName) {
  if (!productName) return '';
  return isTemporaryMergeProduct(productName)
    ? getMergeProductDisplayName(productName)
    : formatProductDisplayName(productName);
}

function hasProductImage(productName) {
  return Boolean(productImageState.value[productName]?.url);
}

function getProductImageUrl(productName) {
  return productImageState.value[productName]?.url || '';
}

function isProductImageBusy(productName) {
  return Boolean(productName && productImageSavingMap.value[productName]);
}

function setProductImageBusy(productName, isBusy) {
  if (!productName) return;
  const nextSavingMap = { ...productImageSavingMap.value };
  if (isBusy) {
    nextSavingMap[productName] = true;
  } else {
    delete nextSavingMap[productName];
  }
  productImageSavingMap.value = nextSavingMap;
}

function buildProductImageUrl(fileName) {
  return `/api/products/image?fileName=${encodeURIComponent(fileName)}&t=${Date.now()}`;
}

function normalizeProductFileEntry(fileEntry) {
  if (typeof fileEntry === 'string') {
    return {
      name: fileEntry,
      url: buildProductFileUrl(fileEntry),
      hasImage: false,
      imageUrl: '',
    };
  }

  const name = String(fileEntry?.name || '');
  const hasImage = Boolean(fileEntry?.hasImage);
  return {
    name,
    url: buildProductFileUrl(name),
    hasImage,
    imageUrl: hasImage ? buildProductImageUrl(name) : '',
  };
}

function syncProductImageStateWithFiles(files) {
  const nextState = Object.fromEntries(
    Object.entries(productImageState.value).filter(([, image]) => image?.source === 'local'),
  );

  for (const file of files) {
    if (file.hasImage) {
      nextState[file.name] = {
        source: 'server',
        url: file.imageUrl,
      };
    }
  }

  productImageState.value = nextState;
}

function openProductImagePicker(productName, title = getProductDisplayTitle(productName)) {
  if (!productName) return;
  pendingProductImageTarget.value = {
    productName,
    title,
  };
  if (productImageInput.value) {
    productImageInput.value.value = '';
    productImageInput.value.click();
  }
}

function openProductImagePreview(productName, title = getProductDisplayTitle(productName)) {
  const imageUrl = productImageState.value[productName]?.url || '';
  if (!imageUrl) {
    openProductImagePicker(productName, title);
    return;
  }

  productImagePreview.value = {
    visible: true,
    productName,
    title,
    url: imageUrl,
  };
}

function closeProductImagePreview() {
  productImagePreview.value = {
    visible: false,
    productName: '',
    title: '',
    url: '',
  };
}

function openSelectedProductImage() {
  if (!selectedProductName.value) return;
  openProductImagePreview(selectedProductName.value, formatProductDisplayName(selectedProductName.value));
}

function editSelectedProductImage() {
  if (!selectedProductName.value) return;
  openProductImagePicker(selectedProductName.value, formatProductDisplayName(selectedProductName.value));
}

function openGroupProductImage(productName) {
  openProductImagePreview(productName, getProductDisplayTitle(productName));
}

function editGroupProductImage(productName) {
  openProductImagePicker(productName, getProductDisplayTitle(productName));
}

function editProductImageFromPreview() {
  if (!productImagePreview.value.productName) return;
  openProductImagePicker(productImagePreview.value.productName, productImagePreview.value.title);
}

async function saveLocalProductImage(productName, file, title) {
  revokeLocalProductImage(productName);
  const base64 = await readFileAsBase64(file);
  const objectUrl = URL.createObjectURL(file);
  productImageState.value = {
    ...productImageState.value,
    [productName]: {
      source: 'local',
      url: objectUrl,
      base64,
      mimeType: file.type,
      title,
    },
  };
}

async function uploadProductImageToServer(fileName, file) {
  const contentBase64 = await readFileAsBase64(file);
  await postProductFileAction('/api/products/image', {
    fileName,
    contentBase64,
    mimeType: file.type,
  });
  productImageState.value = {
    ...productImageState.value,
    [fileName]: {
      source: 'server',
      url: buildProductImageUrl(fileName),
    },
  };
}

async function handleProductImageImport(event) {
  const [file] = Array.from(event.target.files || []);
  event.target.value = '';
  const productName = pendingProductImageTarget.value.productName;
  const title = pendingProductImageTarget.value.title || getProductDisplayTitle(productName);
  pendingProductImageTarget.value = { productName: '', title: '' };

  if (!file || !productName) return;
  if (!file.type.startsWith('image/')) {
    if (productName === selectedProductName.value) {
      setSelectedProductMessage('Wybierz plik obrazu w formacie PNG, JPG, WEBP lub GIF.', true);
    } else {
      setProductFileActionMessage('Wybierz plik obrazu w formacie PNG, JPG, WEBP lub GIF.', true);
    }
    return;
  }

  setProductImageBusy(productName, true);
  try {
    if (isTemporaryMergeProduct(productName)) {
      await saveLocalProductImage(productName, file, title);
      setMergeProductSaveMessage(`Dodano zdjęcie dla produktu ${title}.`, false);
      if (productImagePreview.value.visible && productImagePreview.value.productName === productName) {
        openProductImagePreview(productName, title);
      }
      return;
    }

    await uploadProductImageToServer(productName, file);
    if (productName === selectedProductName.value) {
      setSelectedProductMessage(`Zapisano zdjęcie dla produktu ${formatProductDisplayName(productName)}.`, false);
    } else {
      setProductFileActionMessage(`Zapisano zdjęcie dla produktu ${formatProductDisplayName(productName)}.`, false);
    }
    if (productImagePreview.value.visible && productImagePreview.value.productName === productName) {
      openProductImagePreview(productName, title);
    }
    productFiles.value = productFiles.value.map((entry) =>
      entry.name === productName
        ? { ...entry, hasImage: true, imageUrl: buildProductImageUrl(productName) }
        : entry,
    );
  } catch (error) {
    if (isTemporaryMergeProduct(productName)) {
      setMergeProductSaveMessage(error.message || 'Nie udało się dodać zdjęcia produktu.', true);
    } else if (productName === selectedProductName.value) {
      setSelectedProductMessage(error.message || 'Nie udało się zapisać zdjęcia produktu.', true);
    } else {
      setProductFileActionMessage(error.message || 'Nie udało się zapisać zdjęcia produktu.', true);
    }
  } finally {
    setProductImageBusy(productName, false);
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error || new Error('Nie udało się odczytać pliku.'));
    reader.readAsText(file, 'utf-8');
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Nie udało się odczytać pliku.'));
    reader.readAsArrayBuffer(file);
  });
}

function parseSavedWorkRows(serializedRows) {
  try {
    const parsedRows = JSON.parse(serializedRows);
    if (!Array.isArray(parsedRows)) return [];
    return parsedRows.map((row, index) => normalizeWorkRow(row, index));
  } catch {
    return [];
  }
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

async function reloadProductsAfterFileAction(fileName = '') {
  if (fileName) {
    rememberProductPreview(fileName);
  } else {
    clearRememberedProductPreview();
  }

  await loadProductFiles();
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
    Stanowisko: '',
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
      const length = getCellValue(sourceRow, ['Długość', 'Dł', 'DŁ', 'Dł. [mm]', 'DŁ. [mm]', 'DL', 'DL. [mm]', 'DŁUGOŚĆ', 'DLUGOSC', 'Dlugosc']) || rowValues[2] || '';
      const thickness = getCellValue(sourceRow, ['Grubość', 'GR.', 'GR. [mm]', 'Grubosc']) || rowValues[3] || '';
      const width = getCellValue(sourceRow, ['Szerokość', 'Sz', 'SZER. [mm]', 'SZEROKOŚĆ', 'SZEROKOSC', 'Szerokosc']) || rowValues[4] || '';
      const material = getCellValue(sourceRow, ['Materiał', 'MATERIAŁ', 'MATERIAL', 'OPIS', 'gatunek drewna']) || rowValues[7] || '';
      const code = normalizePrintTextValue(getCellValue(sourceRow, ['Kod', 'NR CZĘŚCI', 'NR CZESCI', 'Nadruk']) || rowValues[1] || rowValues[0] || '');
      const klasa = normalizeDefaultClassValue(getCellValue(sourceRow, ['Klasa', 'KLASA']));
      const stanowisko = getCellValue(sourceRow, ['Stanowisko', 'STANOWISKO']) || '';

      return {
        Nazwa: name,
        'Długość': length,
        'Grubość': thickness,
        'Szerokość': width,
        'Materiał': material,
        Kod: code,
        Klasa: klasa,
        Grupa: '',
        Priorytet: '',
        'ilość': quantity,
        Wybijak: getCellValue(sourceRow, ['Wybijak']) || 0,
        Stanowisko: normalizeStationValue(stanowisko),
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

    productFiles.value = (Array.isArray(listPayload.files) ? listPayload.files : [])
      .map((fileEntry) => normalizeProductFileEntry(fileEntry))
      .filter((file) => file.name);
    syncProductImageStateWithFiles(productFiles.value);

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
    if (selectedProductName.value && !nextMap[selectedProductName.value]) {
      resetProductModalState();
    }
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
  if (productImagePreview.value.visible && productImagePreview.value.productName === selectedProductName.value) {
    closeProductImagePreview();
  }
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

async function importSingleProductFile(file) {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  if (!workbook.SheetNames.length) {
    throw new Error(`Plik ${file.name} nie zawiera arkuszy do importu.`);
  }
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const headers = matrix[0] || [];
  const rows = matrix.slice(1);
  const autoMapping = getProductImportAutoMapping(headers);
  const missingTargets = getProductImportMissingTargets(autoMapping.mapping);
  const availableHeaders = getProductImportAvailableHeaders(headers, autoMapping.mapping);

  let mapping = autoMapping.mapping;
  if (missingTargets.length && availableHeaders.length) {
    const message =
      'Nie udało się automatycznie rozpoznać wszystkich kolumn. Wybierz, która kolumna z Excela ma trafić do odpowiednich pól.';
    mapping = await openProductImportMappingDialog({
      fileName: file.name,
      headers,
      rows,
      mapping: autoMapping.mapping,
      missingTargets,
      message,
    });
  } else if (missingTargets.length) {
    throw new Error('Nie udało się automatycznie rozpoznać kolumn, a w arkuszu nie ma wolnych kolumn do mapowania.');
  }

  if (!isProductImportMappingComplete(mapping)) {
    throw new Error('Nie wszystkie wymagane kolumny zostały zmapowane.');
  }

  const mappedSheet = buildProductImportWorkbook(headers, rows, mapping);
  workbook.Sheets[firstSheetName || 'Arkusz1'] = mappedSheet;
  const contentBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

  const result = await postProductFileAction('/api/products/import', {
    fileName: file.name,
    contentBase64,
  });
  return result.fileName || file.name;
}

async function handleImportExcel(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = '';
  if (!files.length) return;

  const invalidFile = files.find((file) => !file.name.toLowerCase().endsWith('.xlsx'));
  if (invalidFile) {
    setProductFileActionMessage(`Plik ${invalidFile.name} nie jest w formacie .xlsx.`, true);
    return;
  }

  isFileActionLoading.value = true;
  clearProductFileActionMessage();

  try {
    const importedFileNames = [];

    for (const file of files) {
      const nextFileName = await importSingleProductFile(file);
      importedFileNames.push(nextFileName);
    }

    const lastImportedFileName = importedFileNames[importedFileNames.length - 1] || '';
    await reloadProductsAfterFileAction(lastImportedFileName);
    setProductFileActionMessage(
      importedFileNames.length === 1
        ? `Zaimportowano plik ${importedFileNames[0]}.`
        : `Zaimportowano ${importedFileNames.length} pliki Excela.`,
    );
  } catch (error) {
    if (error?.message !== 'Import został anulowany.') {
      setProductFileActionMessage(error.message || 'Nie udało się zaimportować pliku.', true);
    }
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
    await reloadProductsAfterFileAction(result.fileName || '');
    setProductFileActionMessage(`Utworzono kopię pliku ${result.fileName || ''}.`);
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
    await reloadProductsAfterFileAction(result.fileName || '');
    setProductFileActionMessage(`Zmieniono nazwę pliku na ${result.fileName || renameDraft.value.trim()}.`);
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
    await reloadProductsAfterFileAction('');
    setProductFileActionMessage(`Usunięto plik ${fileName}.`);
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
  saveMessage.value = `Maksymalnie ${activeRowLimit.value} pozycji w pliku dla aktywnej maszyny.`;
}

function addProductRow() {
  if (editingRows.value.length >= activeRowLimit.value) {
    showRowLimitMessage();
    return;
  }
  editingRows.value.push(createEditableProductRow(selectedProductName.value));
  saveMessage.value = '';
  saveError.value = false;
}

function duplicateProductRow(localId) {
  if (editingRows.value.length >= activeRowLimit.value) {
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

  if (isStationColumn(column)) {
    row[column] = normalizedValue;
    row.Wybijak = getWybijakValueForStation(normalizedValue, row['Długość']);
    return;
  }

  if (column === 'Długość') {
    row[column] = normalizedValue;
    if (row.Stanowisko) {
      row.Wybijak = getWybijakValueForStation(row.Stanowisko, normalizedValue);
    }
    return;
  }

  row[column] = normalizedValue;
}

function updateEditedWybijakPart(localId, partIndex, value) {
  const row = editingRows.value.find((item) => item._localId === localId);
  if (!row) return;
  const parts = getWybijakInputParts(row.Wybijak, row.Stanowisko);
  parts[partIndex] = normalizeWybijakPartInputValue(value);
  row.Wybijak = buildWybijakValueFromParts(parts[0], parts[1]);
}

function getEditInputStyle(value, localId, column) {
  let contentLength = String(value ?? '').length;
  if (isStationColumn(column)) {
    const selectedOption = getStationDropdownOptions(value).find((option) => option.value === normalizeStationValue(value));
    contentLength = String(selectedOption?.label || value || '').length;
  }
  const isActive = activeEditCell.value === `${localId}:${column}`;
  const widthConfig = {
    Nazwa: { min: 10, max: 24 },
    Kod: { min: 10, max: 24 },
    Materiał: { min: 8, max: 12 },
    Stanowisko: { min: 14, max: 18 },
  };
  const { min = 4, max = 10 } = widthConfig[column] ?? {};
  const activePadding = column === 'Nazwa' || column === 'Kod' ? 2 : 1;
  const chWidth = isActive
    ? Math.max(min, Math.min(contentLength + activePadding, max + 4))
    : Math.max(min, Math.min(contentLength + 1, max));
  return {
    width: isStationColumn(column) ? `calc(${chWidth}ch + 20px)` : `${chWidth}ch`,
    minWidth: `${min}ch`,
  };
}

function getMergeEditInputStyle(column, value) {
  const length = String(value ?? '').length;
  const widthConfig = {
    TekstDoDruku: { min: 10, max: 24 },
    material: { min: 8, max: 12 },
  };
  const { min = 4, max = 10 } = widthConfig[column] ?? {};
  const minWidth = min;
  const maxWidth = max;
  const chWidth = Math.max(minWidth, Math.min(length + 1, maxWidth));
  return { width: `${chWidth}ch` };
}

function getRecipePreviewEditInputStyle(column, value) {
  let contentLength = String(value ?? '').length;
  if (isStationColumn(column)) {
    const selectedOption = getStationDropdownOptions(value).find((option) => option.value === normalizeStationValue(value));
    contentLength = String(selectedOption?.label || value || '').length;
  }
  const widthConfig = {
    nazwaSkladowej: { min: 14, max: 34 },
    material: { min: 8, max: 12 },
    TekstDoDruku: { min: 12, max: 26 },
    dlugosc: { min: 6, max: 10 },
    grubosc: { min: 6, max: 10 },
    szerokosc: { min: 6, max: 10 },
    wybijak: { min: 6, max: 10 },
    grupa: { min: 4, max: 6 },
    priorytet: { min: 4, max: 6 },
    ilosc: { min: 5, max: 8 },
    Stanowisko: { min: 14, max: 18 },
    Klasa: { min: 5, max: 8 },
  };
  const { min = 7, max = 14 } = widthConfig[column] ?? {};
  const chWidth = Math.max(min, Math.min(contentLength + 2, max));
  return {
    width: isStationColumn(column) ? `calc(${chWidth}ch + 20px)` : `${chWidth}ch`,
    minWidth: `${min}ch`,
  };
}

function getWorkEditInputStyle(column, value) {
  let contentLength = String(value ?? '').length;
  if (isStationColumn(column)) {
    const selectedOption = getStationDropdownOptions(value).find((option) => option.value === normalizeStationValue(value));
    contentLength = String(selectedOption?.label || value || '').length;
  }

  const widthConfig = {
    Nazwa: { min: 14, max: 30 },
    Dlugosc: { min: 6, max: 10 },
    Grubosc: { min: 6, max: 10 },
    Szerokosc: { min: 6, max: 10 },
    Material: { min: 12, max: 16 },
    TekstDoDruku: { min: 12, max: 28 },
    Wybijak: { min: 6, max: 10 },
    Stanowisko: { min: 14, max: 18 },
    Klasa: { min: 5, max: 8 },
    Sztuk: { min: 5, max: 8 },
  };

  const { min = 7, max = 14 } = widthConfig[column] ?? {};
  const chWidth = Math.max(min, Math.min(contentLength + 2, max));

  return {
    width: isStationColumn(column) ? `calc(${chWidth}ch + 20px)` : `${chWidth}ch`,
    minWidth: `${min}ch`,
  };
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
  if (action === 'upload-merge-to-workmain') {
    uploadMergeToWorkMain();
    return;
  }
  if (action === 'cancel-recipe-preview-edit') {
    cancelRecipePreviewEdit();
    return;
  }
  if (action === 'delete-file') {
    executeDeleteSelectedProductFile();
    return;
  }
  if (action === 'delete-recipe') {
    executeDeleteRecipePreview();
    return;
  }
  if (action.startsWith('delete-saved-row:')) {
    removeSavedRow(action.slice('delete-saved-row:'.length));
    return;
  }
}

function getMergeProductQuantity(productName) {
  const rawValue = mergeProductQuantities.value[productName];
  const parsedValue = Number.parseInt(String(rawValue ?? 0), 10);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
}

function getMergeProductQuantityInputValue(productName) {
  if (Object.prototype.hasOwnProperty.call(mergeProductQuantityDrafts.value, productName)) {
    return mergeProductQuantityDrafts.value[productName];
  }
  return getMergeProductQuantity(productName);
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
    message: `Nie można dodać produktu, bo został osiągnięty limit ${activeRowLimit.value} elementów dla aktywnej maszyny.`,
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
  if (saveRecipeValidationError.value) {
    mergeAlert.value = {
      visible: true,
      message: saveRecipeValidationError.value,
    };
    return;
  }

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

  if (saveRecipeValidationError.value) {
    saveRecipeDialog.value = {
      ...saveRecipeDialog.value,
      error: saveRecipeValidationError.value,
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
  return nextCount <= activeRowLimit.value;
}

function triggerMergeQuantityPulse(productName) {
  if (!productName) return;

  if (mergeQuantityPulseTimers.has(productName)) {
    window.clearTimeout(mergeQuantityPulseTimers.get(productName));
  }

  mergeQuantityPulse.value = {
    ...mergeQuantityPulse.value,
    [productName]: false,
  };

  window.requestAnimationFrame(() => {
    mergeQuantityPulse.value = {
      ...mergeQuantityPulse.value,
      [productName]: true,
    };

    const timerId = window.setTimeout(() => {
      mergeQuantityPulse.value = {
        ...mergeQuantityPulse.value,
        [productName]: false,
      };
      mergeQuantityPulseTimers.delete(productName);
    }, 260);

    mergeQuantityPulseTimers.set(productName, timerId);
  });
}

function startMergeProductQuantityEdit(productName) {
  mergeProductQuantityDrafts.value = {
    ...mergeProductQuantityDrafts.value,
    [productName]: String(getMergeProductQuantity(productName)),
  };
}

function updateMergeProductQuantityDraft(productName, value) {
  mergeProductQuantityDrafts.value = {
    ...mergeProductQuantityDrafts.value,
    [productName]: String(value ?? ''),
  };
}

function clearMergeProductQuantityDraft(productName) {
  if (!Object.prototype.hasOwnProperty.call(mergeProductQuantityDrafts.value, productName)) return;
  const nextDrafts = { ...mergeProductQuantityDrafts.value };
  delete nextDrafts[productName];
  mergeProductQuantityDrafts.value = nextDrafts;
}

function applyMergeProductQuantity(productName, value) {
  const normalizedText = String(value ?? '')
    .replace(/[^\d]/g, '')
    .trim();
  const parsedValue = normalizedText ? Number.parseInt(normalizedText, 10) : 0;
  const normalizedValue = Number.isFinite(parsedValue) ? Math.min(Math.max(parsedValue, 0), activeRowLimit.value) : 0;

  if (normalizedValue > 0 && !selectedProducts.value.includes(productName) && !canSelectMergeProduct(productName)) {
    rejectMergeProductSelection(productName);
    return;
  }

  mergeProductQuantities.value = {
    ...mergeProductQuantities.value,
    [productName]: normalizedValue,
  };
  triggerMergeQuantityPulse(productName);

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

function commitMergeProductQuantity(productName) {
  const draftValue = getMergeProductQuantityInputValue(productName);
  clearMergeProductQuantityDraft(productName);
  applyMergeProductQuantity(productName, draftValue);
}

async function loadSavedRecipes() {
  const response = await fetch(`/api/recipes?t=${Date.now()}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Nie udało się pobrać zapisanych receptur.');
  }

  const recipes = Array.isArray(payload.recipes) ? payload.recipes : [];
  savedRecipeCatalog.value = recipes;
  selectedRecipeNames.value = selectedRecipeNames.value.filter((name) => recipes.some((entry) => entry.nazwaReceptury === name));

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

watch(
  savedRows,
  () => {
    selectedReportSavedWorkIds.value = selectedReportSavedWorkIds.value.filter((idRap) =>
      savedRows.value.some((row) => String(row.idRap) === String(idRap)),
    );
  },
  { deep: true },
);

function stepMergeProductQuantity(productName, delta) {
  lastMergeInteractedProduct.value = productName;
  const nextValue = Math.min(activeRowLimit.value, Math.max(0, getMergeProductQuantity(productName) + delta));
  clearMergeProductQuantityDraft(productName);
  applyMergeProductQuantity(productName, nextValue);
}

function removeMergeProduct(productName) {
  if (isTemporaryMergeProduct(productName)) {
    removeTemporaryMergeProduct(productName);
    return;
  }
  lastMergeInteractedProduct.value = productName;
  clearMergeProductQuantityDraft(productName);
  applyMergeProductQuantity(productName, 0);
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
  temporaryMergeProductNames.value = {};
  cancelMergeProductNameEdit();
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
  isRecipePreviewEditMode.value = false;
  recipePreviewDraftRows.value = [];
  recipePreviewEditingCell.value = null;
  recipePreviewSaveMessage.value = '';
  recipePreviewSaveError.value = false;
  selectedRecipePreviewName.value = row.nazwaReceptury;
  isSavedRecipePreviewOpen.value = true;
}

function resetRecipeCatalogFilters() {
  recipeCatalogSearch.value = '';
  recipeCatalogMaterialFilter.value = '';
  recipeCatalogUsageFilter.value = 'all';
}

function clearRecipeCatalogActionMessage() {
  recipeCatalogActionMessage.value = '';
  recipeCatalogActionError.value = false;
}

function clearReportMessage() {
  reportMessage.value = '';
  reportError.value = false;
}

function isReportSavedWorkSelected(idRap) {
  return selectedReportSavedWorkIds.value.includes(String(idRap));
}

function toggleReportSavedWork(idRap, isChecked) {
  const normalizedId = String(idRap);
  selectedReportSavedWorkIds.value = isChecked
    ? [...new Set([...selectedReportSavedWorkIds.value, normalizedId])]
    : selectedReportSavedWorkIds.value.filter((entry) => entry !== normalizedId);
}

function buildReportDimensionLabel(row = {}) {
  const dlugosc = normalizeWorkCorrectionValue(row.Dlugosc ?? row.dlugosc);
  const szerokosc = normalizeWorkCorrectionValue(row.Szerokosc ?? row.szerokosc);
  const grubosc = normalizeWorkCorrectionValue(row.Grubosc ?? row.grubosc ?? row.gr);
  return `[${dlugosc} x ${szerokosc} x ${grubosc}]`;
}

function aggregateReportRows(rows = []) {
  const reportMap = new Map();

  rows.forEach((row) => {
    const code = String(row?.TekstDoDruku ?? row?.Kod ?? '').trim() || '—';
    const dimensions = buildReportDimensionLabel(row);
    const total = normalizeWorkCorrectionValue(row?.Sztuk ?? row?.ilosc ?? row?.Progress?.total ?? 0);
    const done = normalizeWorkCorrectionValue(row?.WykonaneSztuki ?? row?.iloscWykonana ?? row?.Progress?.done ?? 0);
    const key = `${code}__${dimensions}`;
    const current = reportMap.get(key) || {
      'Kod / Tekst do druku': code,
      'Wymiar [długość x szerokość x grubość]': dimensions,
      'Ilość sztuk wyciętych': 0,
      'Cel sztuk': 0,
    };

    current['Ilość sztuk wyciętych'] += done;
    current['Cel sztuk'] += total;
    reportMap.set(key, current);
  });

  return [...reportMap.values()].sort((left, right) => {
    const codeCompare = String(left['Kod / Tekst do druku']).localeCompare(String(right['Kod / Tekst do druku']), 'pl', { sensitivity: 'base' });
    if (codeCompare !== 0) return codeCompare;
    return String(left['Wymiar [długość x szerokość x grubość]']).localeCompare(String(right['Wymiar [długość x szerokość x grubość]']), 'pl', { sensitivity: 'base' });
  });
}

function applyReportWorksheetStyles(worksheet, rows) {
  const columns = [
    'Kod / Tekst do druku',
    'Wymiar [długość x szerokość x grubość]',
    'Ilość sztuk wyciętych',
    'Cel sztuk',
  ];

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '163A63' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const oddRowStyle = {
    fill: { fgColor: { rgb: 'F2F4F7' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const evenRowStyle = {
    fill: { fgColor: { rgb: 'E3E7ED' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  columns.forEach((_, columnIndex) => {
    const headerRef = XLSX.utils.encode_cell({ r: 0, c: columnIndex });
    if (worksheet[headerRef]) {
      worksheet[headerRef].s = headerStyle;
    }
  });

  rows.forEach((_, rowIndex) => {
    const rowStyle = rowIndex % 2 === 0 ? oddRowStyle : evenRowStyle;
    columns.forEach((_, columnIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = rowStyle;
      }
    });
  });
}

async function getStyledXlsx() {
  const module = await import('xlsx-js-style');
  const styledXlsx = module?.default ?? module;
  if (styledXlsx?.utils?.book_new && styledXlsx?.writeFile) {
    return styledXlsx;
  }
  if (XLSX?.utils?.book_new && XLSX?.writeFile) {
    return XLSX;
  }
  throw new Error('Nie udało się załadować modułu eksportu Excela.');
}

function getReportSourceRows() {
  if (reportSourceMode.value === 'saved') {
    return selectedReportSavedWorkRows.value.flatMap((snapshot) => parseSavedWorkRows(snapshot.rows).filter((row) => !row.__disabled));
  }
  return activeWorkRows.value.map((row) => normalizeWorkRow(row));
}

async function exportReportToExcel() {
  if (!canExportReport.value || isReportExportLoading.value) return;

  isReportExportLoading.value = true;
  clearReportMessage();

  try {
    const sourceRows = getReportSourceRows();
    const aggregatedRows = aggregateReportRows(sourceRows);

    if (!aggregatedRows.length) {
      throw new Error('Brak danych do wygenerowania raportu.');
    }

    const XLSXStyle = await getStyledXlsx();
    const workbook = XLSXStyle.utils.book_new();
    const worksheet = XLSXStyle.utils.json_to_sheet(aggregatedRows);
    applyReportWorksheetStyles(worksheet, aggregatedRows);
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 28 },
      { wch: 18 },
      { wch: 14 },
    ];
    XLSXStyle.utils.book_append_sheet(workbook, worksheet, 'Raport');
    const fileName =
      reportSourceMode.value === 'saved'
        ? `raport-odlozone-prace-${new Date().toISOString().slice(0, 10)}.xlsx`
        : `raport-workmain-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSXStyle.writeFile(workbook, fileName);
    reportMessage.value = `Wyeksportowano raport do pliku ${fileName}.`;
  } catch (error) {
    reportError.value = true;
    reportMessage.value = error.message || 'Nie udało się wygenerować raportu.';
  } finally {
    isReportExportLoading.value = false;
  }
}

async function exportCurrentWorkReport() {
  reportSourceMode.value = 'current';
  await exportReportToExcel();
}

function cancelRecipeImportConflict() {
  recipeImportConflictDialog.value = {
    visible: false,
    contentText: '',
    duplicateNames: [],
  };
}

function triggerRecipeImport() {
  if (isRecipeCatalogActionLoading.value) return;
  recipeImportInput.value?.click();
}

function exportRecipeCatalog() {
  if (isRecipeCatalogActionLoading.value) return;
  clearRecipeCatalogActionMessage();
  const link = document.createElement('a');
  link.href = `/api/recipes/export?t=${Date.now()}`;
  link.download = `receptury-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  recipeCatalogActionMessage.value = 'Rozpoczęto eksport receptur.';
}

function downloadRecipesExport(recipes, fileName) {
  const blob = new Blob([JSON.stringify({ recipes }, null, 2)], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function exportSelectedRecipes() {
  if (isRecipeCatalogActionLoading.value || !selectedRecipeCatalogCount.value) return;
  clearRecipeCatalogActionMessage();
  downloadRecipesExport(
    selectedRecipeCatalogEntries.value,
    `receptury-zaznaczone-${new Date().toISOString().slice(0, 10)}.json`,
  );
  recipeCatalogActionMessage.value = `Wyeksportowano ${selectedRecipeCatalogCount.value} zaznaczonych receptur.`;
}

async function importRecipesFromContent(contentText) {
  const response = await fetch('/api/recipes/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentText }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Nie udało się zaimportować receptur.');
  }

  savedRecipeCatalog.value = Array.isArray(payload.recipes) ? payload.recipes : [];
  selectedRecipeNames.value = [];
  if (savedRecipeCatalog.value.length) {
    const fallbackName = savedRecipeCatalog.value[0]?.nazwaReceptury || '';
    if (!savedRecipeCatalog.value.some((entry) => entry.nazwaReceptury === selectedRecipe.value)) {
      selectedRecipe.value = fallbackName;
    }
    if (!savedRecipeCatalog.value.some((entry) => entry.nazwaReceptury === selectedRecipePreviewName.value)) {
      selectedRecipePreviewName.value = fallbackName;
    }
  }

  recipeCatalogActionError.value = false;
  const updatedRecipeNames = Array.isArray(payload.updatedRecipeNames) ? payload.updatedRecipeNames.filter(Boolean) : [];
  const duplicateMessage = updatedRecipeNames.length
    ? ` Istniały już receptury o tych nazwach i zostały podmienione: ${updatedRecipeNames.join(', ')}.`
    : '';
  recipeCatalogActionMessage.value =
    `Zaimportowano receptury: dodano ${payload.addedCount ?? 0}, zaktualizowano ${payload.updatedCount ?? 0}.${duplicateMessage}`;
}

async function confirmRecipeImportConflict() {
  if (!recipeImportConflictDialog.value.contentText) return;

  isRecipeCatalogActionLoading.value = true;
  clearRecipeCatalogActionMessage();

  try {
    const contentText = recipeImportConflictDialog.value.contentText;
    await importRecipesFromContent(contentText);
    cancelRecipeImportConflict();
  } catch (error) {
    recipeCatalogActionError.value = true;
    recipeCatalogActionMessage.value = error.message || 'Nie udało się zaimportować receptur.';
  } finally {
    isRecipeCatalogActionLoading.value = false;
  }
}

function toggleRecipeCatalogSelection(row) {
  const recipeName = String(row?.nazwaReceptury || '').trim();
  if (!recipeName) return;
  selectedRecipeNames.value = selectedRecipeNames.value.includes(recipeName)
    ? selectedRecipeNames.value.filter((name) => name !== recipeName)
    : [...selectedRecipeNames.value, recipeName];
}

function toggleAllRecipeCatalogSelection(rows) {
  const visibleNames = rows.map((row) => String(row?.nazwaReceptury || '').trim()).filter(Boolean);
  if (!visibleNames.length) {
    selectedRecipeNames.value = [];
    return;
  }

  const allVisibleSelected = visibleNames.every((name) => selectedRecipeNames.value.includes(name));
  if (allVisibleSelected) {
    selectedRecipeNames.value = selectedRecipeNames.value.filter((name) => !visibleNames.includes(name));
    return;
  }

  selectedRecipeNames.value = [...new Set([...selectedRecipeNames.value, ...visibleNames])];
}

async function handleRecipeImport(event) {
  const [file] = event.target.files || [];
  event.target.value = '';
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.json')) {
    recipeCatalogActionError.value = true;
    recipeCatalogActionMessage.value = 'Możesz importować tylko pliki .json.';
    return;
  }

  isRecipeCatalogActionLoading.value = true;
  clearRecipeCatalogActionMessage();

  try {
    const contentText = await readFileAsText(file);
    const parsedPayload = JSON.parse(contentText);
    const importedRecipes = Array.isArray(parsedPayload)
      ? parsedPayload
      : Array.isArray(parsedPayload?.recipes)
        ? parsedPayload.recipes
        : [];

    if (!importedRecipes.length) {
      throw new Error('Plik importu nie zawiera żadnych receptur.');
    }

    const existingRecipeNames = new Set(savedRecipeCatalog.value.map((entry) => String(entry?.nazwaReceptury || '').trim()).filter(Boolean));
    const duplicateNames = [...new Set(
      importedRecipes
        .map((entry) => String(entry?.nazwaReceptury || '').trim())
        .filter((name) => name && existingRecipeNames.has(name)),
    )];

    if (duplicateNames.length) {
      isRecipeCatalogActionLoading.value = false;
      recipeImportConflictDialog.value = {
        visible: true,
        contentText,
        duplicateNames,
      };
      return;
    }

    await importRecipesFromContent(contentText);
  } catch (error) {
    recipeCatalogActionError.value = true;
    recipeCatalogActionMessage.value = error.message || 'Nie udało się zaimportować receptur.';
  } finally {
    isRecipeCatalogActionLoading.value = false;
  }
}

function requestDeleteRecipePreview() {
  if (!selectedRecipePreviewName.value) return;
  openConfirmDialog('delete-recipe', `Na pewno chcesz usunąć recepturę "${selectedRecipePreviewName.value}"?`);
}

function clearRecipePreviewStatusMessage() {
  if (recipePreviewMessageTimerId) {
    window.clearTimeout(recipePreviewMessageTimerId);
    recipePreviewMessageTimerId = null;
  }
  recipePreviewSaveMessage.value = '';
  recipePreviewSaveError.value = false;
}

function setRecipePreviewStatusMessage(message, isError = false) {
  if (recipePreviewMessageTimerId) {
    window.clearTimeout(recipePreviewMessageTimerId);
    recipePreviewMessageTimerId = null;
  }

  recipePreviewSaveMessage.value = message;
  recipePreviewSaveError.value = isError;

  if (!isError && message) {
    recipePreviewMessageTimerId = window.setTimeout(() => {
      recipePreviewSaveMessage.value = '';
      recipePreviewSaveError.value = false;
      recipePreviewMessageTimerId = null;
    }, 3500);
  }
}

async function executeDeleteRecipePreview() {
  if (!selectedRecipePreviewName.value) return;
  const deletedRecipeName = selectedRecipePreviewName.value;

  clearRecipePreviewStatusMessage();

  try {
    const response = await fetch('/api/recipes/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipeName: deletedRecipeName,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Nie udało się usunąć receptury.');
    }

    await loadSavedRecipes();
    selectedRecipeNames.value = selectedRecipeNames.value.filter((name) => name !== deletedRecipeName);
    isRecipePreviewEditMode.value = false;
    recipePreviewDraftRows.value = [];
    recipePreviewEditingCell.value = null;
    isSavedRecipePreviewOpen.value = false;

    const fallbackName = savedRecipeCatalog.value[0]?.nazwaReceptury || '';
    selectedRecipePreviewName.value = savedRecipeCatalog.value.some((entry) => entry.nazwaReceptury === selectedRecipePreviewName.value)
      ? selectedRecipePreviewName.value
      : fallbackName;
    selectedRecipe.value = savedRecipeCatalog.value.some((entry) => entry.nazwaReceptury === selectedRecipe.value)
      ? selectedRecipe.value
      : fallbackName;

    setRecipePreviewStatusMessage('Receptura została usunięta.');
  } catch (error) {
    setRecipePreviewStatusMessage(error?.message || 'Nie udało się usunąć receptury.', true);
  }
}

function openRecipePreviewEditor(recipeName) {
  isRecipePreviewEditMode.value = false;
  recipePreviewDraftRows.value = [];
  recipePreviewEditingCell.value = null;
  clearRecipePreviewStatusMessage();
  selectedRecipePreviewName.value = recipeName;
}

function closeSavedRecipePreview() {
  isSavedRecipePreviewOpen.value = false;
  cancelRecipePreviewEdit();
}

function startRecipePreviewEdit() {
  if (!selectedRecipePreviewName.value) return;
  recipePreviewDraftRows.value = selectedRecipePreviewRows.value.map((row) => createRecipePreviewDraftRow(row));
  isRecipePreviewEditMode.value = true;
  clearRecipePreviewStatusMessage();
}

function cancelRecipePreviewEdit() {
  isRecipePreviewEditMode.value = false;
  recipePreviewDraftRows.value = [];
  recipePreviewEditingCell.value = null;
  clearRecipePreviewStatusMessage();
}

function requestCancelRecipePreviewEdit() {
  if (!isRecipePreviewEditMode.value) return;
  if (!hasPendingRecipePreviewChanges.value) {
    cancelRecipePreviewEdit();
    return;
  }
  openConfirmDialog('cancel-recipe-preview-edit', 'Na pewno chcesz anulować edycję receptury? Niezapisane zmiany zostaną utracone.');
}

function updateRecipePreviewCell(localId, column, value) {
  const row = recipePreviewDraftRows.value.find((item) => item._localId === localId);
  if (!row) return;
  const normalizedValue = normalizeEditableCellValue(column, value);

  if (column === 'grupa') {
    row.grupa = normalizedValue;
    row.priorytet = normalizedValue
      ? getSmallestAvailablePriority(recipePreviewDraftRows.value, normalizedValue, localId)
      : '';
    return;
  }

  if (column === 'priorytet') {
    if (!getRowGroupValue(row)) {
      row.priorytet = '';
      return;
    }

    const availablePriorities = getPriorityDropdownOptions(recipePreviewDraftRows.value, row);
    row.priorytet = availablePriorities.includes(normalizedValue) ? normalizedValue : '';
    return;
  }

  if (isStationColumn(column)) {
    row[column] = normalizedValue;
    row.wybijak = getWybijakValueForStation(normalizedValue, row.dlugosc);
    return;
  }

  if (column === 'dlugosc') {
    row[column] = normalizedValue;
    if (row.Stanowisko) {
      row.wybijak = getWybijakValueForStation(row.Stanowisko, normalizedValue);
    }
    return;
  }

  row[column] = normalizedValue;
}

function updateRecipePreviewWybijakPart(localId, partIndex, value) {
  const row = recipePreviewDraftRows.value.find((item) => item._localId === localId);
  if (!row) return;
  const parts = getWybijakInputParts(row.wybijak, row.Stanowisko);
  parts[partIndex] = normalizeWybijakPartInputValue(value);
  row.wybijak = buildWybijakValueFromParts(parts[0], parts[1]);
}

function addRecipePreviewRow() {
  if (recipePreviewDraftRows.value.length >= activeRowLimit.value) return;
  recipePreviewDraftRows.value = [...recipePreviewDraftRows.value, createRecipePreviewDraftRow()];
}

function duplicateRecipePreviewRow(localId) {
  if (recipePreviewDraftRows.value.length >= activeRowLimit.value) return;
  const rowIndex = recipePreviewDraftRows.value.findIndex((item) => item._localId === localId);
  if (rowIndex === -1) return;
  const duplicate = createRecipePreviewDraftRow(JSON.parse(JSON.stringify(recipePreviewDraftRows.value[rowIndex])));
  recipePreviewDraftRows.value = [
    ...recipePreviewDraftRows.value.slice(0, rowIndex + 1),
    duplicate,
    ...recipePreviewDraftRows.value.slice(rowIndex + 1),
  ];
}

function removeRecipePreviewRow(localId) {
  recipePreviewDraftRows.value = recipePreviewDraftRows.value.filter((item) => item._localId !== localId);
}

async function saveRecipePreviewChanges() {
  if (!selectedRecipePreviewName.value || !isRecipePreviewEditMode.value) return;

  const rows = recipePreviewDraftRows.value.map(({ _localId, ...row }) => row);
  clearRecipePreviewStatusMessage();

  const wybijakValidationError = getRecipePreviewWybijakValidationError(rows);
  if (wybijakValidationError) {
    setRecipePreviewStatusMessage(wybijakValidationError, true);
    return;
  }

  try {
    const response = await fetch('/api/recipes/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipe: {
          nazwaReceptury: selectedRecipePreviewName.value,
          rows,
        },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Nie udało się zaktualizować receptury.');
    }

    savedRecipeCatalog.value = savedRecipeCatalog.value.map((entry) =>
      entry.nazwaReceptury === selectedRecipePreviewName.value ? payload.recipe ?? { ...entry, rows } : entry,
    );
    cancelRecipePreviewEdit();
    setRecipePreviewStatusMessage('Zmiany zapisane.');
  } catch (error) {
    setRecipePreviewStatusMessage(error?.message || 'Nie udało się zaktualizować receptury.', true);
  }
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

  if (isSettingsPanelOpen.value) {
    closeSettingsPanel();
    return;
  }

  if (selectedSavedWorkPreview.value) {
    closeSavedWorkPreview();
    return;
  }

  if (isSavedRecipePreviewOpen.value) {
    closeSavedRecipePreview();
    return;
  }

  if (isWorkRecipePreviewOpen.value) {
    closeWorkRecipePreview();
    return;
  }

  if (isWorkRecipeMenuOpen.value) {
    isWorkRecipeMenuOpen.value = false;
    return;
  }

  if (configUnsavedDialog.value.visible) {
    cancelConfigUnsavedDialog();
    return;
  }

  if (recipeImportConflictDialog.value.visible) {
    cancelRecipeImportConflict();
    return;
  }

  if (stationAutoAssignDialog.value.visible) {
    closeStationAutoAssignDialog();
    return;
  }

  if (reportMessage.value) {
    clearReportMessage();
  }

  if (isConfigPanelOpen.value) {
    toggleConfigPanel();
    return;
  }

  if (temporarySourceChangeDialog.value.visible) {
    cancelTemporarySourceChange();
    return;
  }

  if (isFavoriteElementsModalOpen.value) {
    closeFavoriteElementsModal();
    return;
  }

  if (isFavoriteSourceModalOpen.value) {
    closeFavoriteSourceModal();
    return;
  }

  if (isWorkProductModalOpen.value) {
    closeWorkProductModal();
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

function openFavoriteElementsModal() {
  isFavoriteElementsModalOpen.value = true;
}

function closeFavoriteElementsModal() {
  isFavoriteElementsModalOpen.value = false;
}

function openFavoriteElementsModalFromSource() {
  closeFavoriteSourceModal();
  openFavoriteElementsModal();
}

function openFavoriteSourceModal() {
  if (!availableProductNames.value.length) return;
  if (!favoriteSourceProductName.value || !availableProductNames.value.includes(favoriteSourceProductName.value)) {
    favoriteSourceProductName.value = availableProductNames.value[0] || '';
  }
  closeFavoriteElementsModal();
  isFavoriteSourceModalOpen.value = true;
}

function closeFavoriteSourceModal() {
  isFavoriteSourceModalOpen.value = false;
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
  removeTemporaryMergeProduct(TEMP_PRODUCT_KEY);
}

function isMergeProductEditMode(productName) {
  return Boolean(mergeEditModes.value[productName]);
}

function toggleMergeProductEditMode(productName) {
  const nextEditMode = !isMergeProductEditMode(productName);
  mergeEditModes.value = {
    ...mergeEditModes.value,
    [productName]: nextEditMode,
  };
  if (nextEditMode) {
    collapsedRecipeGroups.value = {
      ...collapsedRecipeGroups.value,
      [productName]: false,
    };
  }
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
    const nextBaseQuantity = Number.isFinite(normalizedValue) ? normalizedValue / multiplier : 0;
    row._baseIlosc = nextBaseQuantity;
    row.ilosc = Number.isFinite(normalizedValue) ? normalizedValue : 0;
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

  if (isStationColumn(column)) {
    row[column] = normalizedValue;
    row.wybijak = getWybijakValueForStation(normalizedValue, row.dlugosc);
    return;
  }

  if (column === 'dlugosc') {
    row[column] = normalizedValue;
    if (row.Stanowisko) {
      row.wybijak = getWybijakValueForStation(row.Stanowisko, normalizedValue);
    }
    return;
  }

  row[column] = normalizedValue;
}

function updateMergeRecipeWybijakPart(productName, localId, partIndex, value) {
  const row = (mergeRecipeDrafts.value[productName] ?? []).find((item) => item._localId === localId);
  if (!row) return;
  const parts = getWybijakInputParts(row.wybijak, row.Stanowisko);
  parts[partIndex] = normalizeWybijakPartInputValue(value);
  row.wybijak = buildWybijakValueFromParts(parts[0], parts[1]);
}

function addMergeRecipeRow(productName) {
  const currentRows = mergeRecipeDrafts.value[productName] ?? [];
  if (selectedMergeRowCount.value >= activeRowLimit.value) {
    showMergeLimitMessage();
    return;
  }

  mergeRecipeDrafts.value = {
    ...mergeRecipeDrafts.value,
    [productName]: [...currentRows, createMergeDraftRow(productName)],
  };
}

function duplicateMergeRecipeRow(productName, localId) {
  if (selectedMergeRowCount.value >= activeRowLimit.value) {
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
  if (workEditingRowId.value !== null) {
    workUploadError.value = true;
    workUploadMessage.value = 'Najpierw zakończ edycję wszystkich wierszy, zanim wczytasz recepturę do podglądu.';
    return;
  }

  const sourceRecipeName =
    isWorkRecipePreviewOpen.value && selectedRecipePreviewName.value ? selectedRecipePreviewName.value : selectedRecipe.value;
  const savedRecipeRows = recipeCatalogEntries.value.find((entry) => entry.nazwaReceptury === sourceRecipeName)?.rows ?? [];
  if (!savedRecipeRows.length) {
    workUploadError.value = true;
    workUploadMessage.value = 'Nie znaleziono wybranej receptury do wczytania.';
    return;
  }

  workRows.value = savedRecipeRows.map((row, index) =>
    normalizeWorkRow({
      id: index + 1,
      Kod: row.Kod || '',
      SourceProductName: row.nazwaProduktu || row.SourceProductName || '',
      Nazwa: row.nazwaSkladowej || row.Nazwa || row.nazwaProduktu || row.SourceProductName || '',
      Material: row.material || row.Material,
      Przekroj: buildPrzekrojValue(row.grubosc || row.gr || 0, row.szerokosc || row.szer || 0),
      Grubosc: normalizeWorkCorrectionValue(row.grubosc || row.gr || 0),
      Szerokosc: normalizeWorkCorrectionValue(row.szerokosc || row.szer || 0),
      Dlugosc: row.dlugosc || row.Dlugosc,
      Sztuk: row.ilosc || row.Sztuk,
      WykonaneSztuki: row.iloscWykonana ?? row.WykonaneSztuki ?? 0,
      Wybijak: row.wybijak ?? row.Wybijak ?? 0,
      Rodzaj: row.rodzaj || row.Rodzaj || '',
      TekstDoDruku: row.TekstDoDruku,
      idrec: row.idReceptury || row.idrec || 0,
      ids: row.idSkladowej ?? row.ids ?? index,
      CzasUtw: new Date().toLocaleString('pl-PL'),
      Usr: 'Default',
      NazwaRec: sourceRecipeName,
      gr: row.grubosc || row.gr,
      szer: row.szerokosc || row.szer,
      Grupa: row.grupa || row.Grupa || '',
      Priorytet: row.priorytet || row.Priorytet || '',
      Klasa: row.Klasa ?? row.klasa,
      Stanowisko: row.Stanowisko ?? row.stanowisko,
      Informacje: row.Informacje,
    }),
  );
  workTableSourceName.value = sourceRecipeName;
  workTableSourceMode.value = 'preview';
  selectedRecipe.value = sourceRecipeName;
  clearWorkCorrectionState();
  workUploadError.value = false;
  workUploadMessage.value = `Wczytano recepturę "${sourceRecipeName}" do podglądu. Wartości możesz teraz skorygować ręcznie, a zapis wykonać później do bazy danych.`;

  try {
    const response = await fetch('/api/recipes/mark-used', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeName: sourceRecipeName }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Nie udało się zaktualizować czasu użycia receptury.');
    }
    if (payload.recipe) {
      savedRecipeCatalog.value = savedRecipeCatalog.value.map((entry) =>
        entry.nazwaReceptury === payload.recipe.nazwaReceptury ? payload.recipe : entry,
      );
    }
  } catch (error) {
    console.error(error);
  }
}

async function persistWorkRowsToDatabase(rowsToSave) {
  isWorkCorrectionSaving.value = true;
  workUploadMessage.value = '';
  workUploadError.value = false;

  try {
    const response = await fetch('/api/workmain/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: rowsToSave }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Nie udało się zapisać zmian WorkMain.');
    }

    clearWorkCorrectionState();
    await loadWorkMainRows({ preserveLocalDrafts: false });
    return payload;
  } finally {
    isWorkCorrectionSaving.value = false;
  }
}

async function saveWorkTable() {
  if (!hasPendingWorkChanges.value) return;
  if (workEditingRowId.value !== null) {
    workUploadError.value = true;
    workUploadMessage.value = 'Najpierw zakończ edycję wszystkich wierszy, zanim zapiszesz zmiany do bazy danych.';
    return;
  }

  const rowsToSave = activeWorkRows.value.map((row, index) => getWorkRowPayload(row, index));
  const validationMessage = getWorkRowsValidationMessage(rowsToSave, 'Nie można zapisać zmian.');
  if (validationMessage) {
    workUploadError.value = true;
    workUploadMessage.value = validationMessage;
    return;
  }

  try {
    const payload = await persistWorkRowsToDatabase(rowsToSave);
    workUploadMessage.value = `Zapisano ${payload.updatedRows ?? rowsToSave.length} wierszy WorkMain.`;
  } catch (error) {
    workUploadError.value = true;
    workUploadMessage.value = error.message || 'Nie udało się zapisać zmian WorkMain.';
  }
}

async function postponeCurrentWork(note = '') {
  if (workEditingRowId.value !== null) {
    workUploadError.value = true;
    workUploadMessage.value = 'Najpierw zakończ edycję wszystkich wierszy, zanim odłożysz pracę.';
    return false;
  }

  const rowsToSave = activeWorkRows.value.map((row, index) => getWorkRowPayload(row, index));

  try {
    const payload = await persistWorkRowsToDatabase(rowsToSave);
    const snapshot = createWorkSnapshot(note);
    addWorkSnapshot(snapshot);
    workUploadMessage.value = `Odłożono pracę "${snapshot.NazwaRec}" i zapisano ${payload.updatedRows ?? rowsToSave.length} wierszy WorkMain.`;
    return true;
  } catch (error) {
    workUploadError.value = true;
    workUploadMessage.value = error.message || 'Nie udało się odłożyć aktualnej pracy.';
    return false;
  }
}

async function confirmPostponeCurrentWork() {
  if (postponeWorkDialog.value.loading) return;
  postponeWorkDialog.value = {
    ...postponeWorkDialog.value,
    loading: true,
  };

  const wasPostponed = await postponeCurrentWork(postponeWorkDialog.value.note);
  if (wasPostponed) {
    cancelPostponeWorkDialog(true);
  } else {
    postponeWorkDialog.value = {
      ...postponeWorkDialog.value,
      loading: false,
    };
  }
}

onMounted(() => {
  updateClock();
  timerId = window.setInterval(updateClock, 1000);
  window.addEventListener('keydown', handleGlobalEscape);
  window.addEventListener('pointerdown', handleWorkRecipeMenuOutsideClick);
  loadWorkMainRows().catch(() => {});
  loadConfig().catch(() => {});
  loadMachineStatus().catch(() => {});
  loadDatabaseConnectionStatus().catch(() => {
    isDatabaseConnected.value = false;
  });
  startMachineStatusAutoRefresh();
});

watch(activeTab, (tab) => {
  if (tab === 'work') {
    loadWorkMainRows().catch(() => {});
    startWorkMainAutoRefresh();
    return;
  }

  stopWorkMainAutoRefresh();
});

watch(availableMergeGroups, (groups) => {
  if (mergeGroupFilter.value && !groups.includes(mergeGroupFilter.value)) {
    mergeGroupFilter.value = '';
  }
});

onUnmounted(() => {
  window.clearInterval(timerId);
  stopWorkMainAutoRefresh();
  stopMachineStatusAutoRefresh();
  mergeQuantityPulseTimers.forEach((pulseTimerId) => window.clearTimeout(pulseTimerId));
  mergeQuantityPulseTimers.clear();
  Object.keys(productImageState.value).forEach((productName) => revokeLocalProductImage(productName));
  if (workDisableCooldownTimerId) {
    window.clearTimeout(workDisableCooldownTimerId);
  }
  if (recipePreviewMessageTimerId) {
    window.clearTimeout(recipePreviewMessageTimerId);
  }
  window.removeEventListener('keydown', handleGlobalEscape);
  window.removeEventListener('pointerdown', handleWorkRecipeMenuOutsideClick);
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

const WorkTable = defineComponent({
  props: {
    columns: { type: Array, required: true },
    rows: { type: Array, required: true },
    labels: { type: Object, default: () => ({}) },
    emptyText: { type: String, default: 'Brak danych' },
  },
  setup(props) {
    function isCompletedProgressRow(row) {
      const doneValue = normalizeWorkCorrectionValue(row?.Progress?.done ?? 0);
      const totalValue = normalizeWorkCorrectionValue(row?.Progress?.total ?? 0);
      return totalValue > 0 && doneValue >= totalValue;
    }

    const sortKey = ref('');
    const sortDirection = ref(1);

    const sortedRows = computed(() => {
      const rows = [...props.rows];
      if (sortKey.value) {
        rows.sort((a, b) => compareValues(a[sortKey.value], b[sortKey.value]) * sortDirection.value);
      }

      const activeRows = [];
      const completedRows = [];

      rows.forEach((row) => {
        if (isCompletedProgressRow(row)) {
          completedRows.push(row);
          return;
        }
        activeRows.push(row);
      });

      return [...activeRows, ...completedRows];
    });

    function sortBy(column) {
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
      return sortKey.value === column;
    }

    return () =>
      h('div', { class: 'table-wrap' }, [
        h('table', { class: 'data-table work-data-table' }, [
          h(
            'thead',
            h(
              'tr',
              [
                ...props.columns.map((column) =>
                  h(
                    'th',
                    {
                      onClick: () => sortBy(column),
                      class: { sorted: isSorted(column) },
                    },
                    [
                      h('span', getColumnLabelText(column, props.labels)),
                      isDimensionColumn(column) ? h('span', { class: 'dimension-unit' }, '₍ₘₘ₎') : null,
                      isSorted(column) ? h('span', { class: 'sort-mark' }, sortDirection.value > 0 ? '▲' : '▼') : null,
                    ],
                  ),
                ),
                h('th', 'Akcje'),
              ],
            ),
          ),
          h(
            'tbody',
                sortedRows.value.length
                  ? sortedRows.value.map((row) => {
                      const rowCells = props.columns.map((column) => {
                      if (column === 'id') {
                        return h('td', { key: `${row.__clientId}-${column}` }, row.id ?? '');
                      }

                      if (column !== 'Progress' && !isWorkRowEditing(row.__clientId)) {
                        const displayValue = column === 'Wybijak' ? formatWorkWybijakDisplayValue(row) : (row[column] ?? '');
                        const validationMessage = getWorkCellValidationMessage(row, column);
                        if (!validationMessage) {
                          return h('td', { key: `${row.__clientId}-${column}` }, displayValue);
                        }

                        return h('td', { key: `${row.__clientId}-${column}` }, [
                          h('span', { class: 'cell-warning-wrap' }, [
                            h('span', displayValue),
                            h(
                              'span',
                              {
                                class: 'cell-warning-indicator',
                                title: validationMessage || getWorkCellValidationCriteria(column),
                              },
                              '!',
                            ),
                          ]),
                        ]);
                      }

                      if (column !== 'Progress') {
                        if (row.__disabled) {
                          const validationMessage = getWorkCellValidationMessage(row, column);
                          if (!validationMessage) {
                            return h('td', { key: `${row.__clientId}-${column}` }, row[column] ?? '');
                          }

                          return h('td', { key: `${row.__clientId}-${column}` }, [
                            h('span', { class: 'cell-warning-wrap' }, [
                              h('span', row[column] ?? ''),
                              h(
                                'span',
                                {
                                  class: 'cell-warning-indicator',
                                  title: validationMessage || getWorkCellValidationCriteria(column),
                                },
                                '!',
                              ),
                            ]),
                          ]);
                        }
                        if (isDropdownColumn(column) || isStationColumn(column)) {
                          const validationMessage = getWorkCellValidationMessage(row, column);
                          const options = isStationColumn(column)
                            ? getStationDropdownOptions(row[column])
                            : getDropdownOptions(column);
                          return h('td', { key: `${row.__clientId}-${column}` }, [
                            h('div', { class: 'cell-edit-with-warning' }, [
                              h(
                                'select',
                                {
                                  class: 'edit-input work-cell-input',
                                  value: row[column] ?? '',
                                  style: getWorkEditInputStyle(column, row[column]),
                                  onInput: (event) => updateWorkCell(row.__clientId, column, event.target.value),
                                },
                                [
                                  h('option', { value: '' }, ''),
                                  ...options.map((option) =>
                                    h(
                                      'option',
                                      {
                                        key: `${row.__clientId}-${column}-${option.value ?? option}`,
                                        value: option.value ?? option,
                                      },
                                      option.label ?? option,
                                    ),
                                  ),
                                ],
                              ),
                              validationMessage
                                ? h(
                                    'span',
                                    {
                                      class: 'cell-warning-indicator inline-warning-indicator',
                                      title: validationMessage || getWorkCellValidationCriteria(column),
                                    },
                                    '!',
                                  )
                                : null,
                            ]),
                          ]);
                        }

                        if (column === 'Wybijak') {
                          const [firstPart, secondPart] = getWybijakInputParts(row[column], row.Stanowisko);
                          const validationMessage = getWorkCellValidationMessage(row, column);
                          return h('td', { key: `${row.__clientId}-${column}` }, [
                            h('div', { class: 'wybijak-edit-group' }, [
                              h('input', {
                                class: 'edit-input work-cell-input wybijak-part-input',
                                value: firstPart,
                                inputmode: 'numeric',
                                onInput: (event) => updateWorkWybijakPart(row.__clientId, 0, event.target.value),
                              }),
                              h('span', { class: 'wybijak-separator' }, 'i'),
                              h('input', {
                                class: 'edit-input work-cell-input wybijak-part-input',
                                value: secondPart,
                                inputmode: 'numeric',
                                onInput: (event) => updateWorkWybijakPart(row.__clientId, 1, event.target.value),
                              }),
                              validationMessage
                                ? h(
                                    'span',
                                    {
                                      class: 'cell-warning-indicator',
                                      title: validationMessage || getWorkCellValidationCriteria(column),
                                    },
                                    '!',
                                  )
                                : null,
                            ]),
                          ]);
                        }

                        const validationMessage = getWorkCellValidationMessage(row, column);
                        return h('td', { key: `${row.__clientId}-${column}` }, [
                          h('div', { class: 'cell-edit-with-warning' }, [
                            h('input', {
                              class: 'edit-input work-cell-input',
                              value: row[column] ?? '',
                              style: getWorkEditInputStyle(column, row[column]),
                              inputmode: ['Dlugosc', 'Wybijak', 'Grubosc', 'Szerokosc', 'Sztuk', 'Stanowisko', 'Klasa'].includes(column) ? 'numeric' : undefined,
                              onInput: (event) => updateWorkCell(row.__clientId, column, event.target.value),
                            }),
                            validationMessage
                              ? h(
                                  'span',
                                  {
                                    class: 'cell-warning-indicator inline-warning-indicator',
                                    title: validationMessage || getWorkCellValidationCriteria(column),
                                  },
                                  '!',
                                )
                              : null,
                          ]),
                        ]);
                      }

                      const doneValue = getWorkDisplayedDoneValue(row.__clientId, row.Progress?.done ?? 0);
                      const totalValue = getWorkDisplayedTotalValue(row.__clientId, row.Progress?.total ?? 0);
                      const draftDoneValue = getWorkProgressDraftValue(row.__clientId, 'WykonaneSztuki', doneValue);
                      const draftTotalValue = getWorkProgressDraftValue(row.__clientId, 'Sztuk', totalValue);
                      const progressPercent = getWorkProgressPercent(doneValue, totalValue);

                      return h('td', { key: `${row.__clientId}-${column}` }, [
                        h('div', { class: 'work-progress-cell' }, [
                          h('span', { class: 'work-progress-complete-slot', 'aria-hidden': 'true' }),
                          h('div', { class: 'work-progress-bar-wrap' }, [
                            h('div', { class: 'work-progress-bar-track' }, [
                              h('div', {
                                class: ['work-progress-bar-fill', { complete: progressPercent >= 100 }],
                                style: { width: `${progressPercent}%` },
                              }),
                              h('div', { class: 'work-progress-bar-content' }, [
                                isWorkRowEditing(row.__clientId)
                                  ? h('div', { class: 'work-progress-inline-edit', 'data-work-progress-editor': row.__clientId }, [
                                      h('input', {
                                        class: 'edit-input work-done-input',
                                        value: draftDoneValue,
                                        inputmode: 'numeric',
                                        onInput: (event) => updateWorkProgressValue(row.__clientId, 'WykonaneSztuki', event.target.value),
                                        onKeydown: (event) => {
                                          if (event.key === 'Enter') finishWorkCorrectionEdit(row.__clientId);
                                        },
                                        onBlur: (event) => handleWorkProgressInputBlur(event, row.__clientId),
                                      }),
                                      h('span', { class: 'work-progress-slash' }, '/'),
                                      h('input', {
                                        class: 'edit-input work-done-input',
                                        value: draftTotalValue,
                                        inputmode: 'numeric',
                                        onInput: (event) => updateWorkProgressValue(row.__clientId, 'Sztuk', event.target.value),
                                        onKeydown: (event) => {
                                          if (event.key === 'Enter') finishWorkCorrectionEdit(row.__clientId);
                                        },
                                        onBlur: (event) => handleWorkProgressInputBlur(event, row.__clientId),
                                      }),
                                    ])
                                  : h('span', { class: 'work-progress-value' }, `${doneValue}/${totalValue}`),
                              ]),
                            ]),
                          ]),
                          h(
                            'span',
                            {
                              class: ['work-progress-complete-slot', 'work-progress-complete-mark', { visible: progressPercent >= 100 && !isWorkRowEditing(row.__clientId) }],
                              title: progressPercent >= 100 && !isWorkRowEditing(row.__clientId) ? 'Skończone' : undefined,
                              'aria-hidden': progressPercent >= 100 && !isWorkRowEditing(row.__clientId) ? 'false' : 'true',
                            },
                            '✓',
                          ),
                        ]),
                      ]);
                    });

                      rowCells.push(
                        h(
                          'td',
                          { key: `${row.__clientId}-actions-${isWorkRowEditing(row.__clientId) ? 'editing' : 'view'}`, class: 'row-actions-cell work-row-actions' },
                          isWorkRowEditing(row.__clientId)
                            ? [
                                h(
                                  'button',
                                  {
                                    key: `${row.__clientId}-done`,
                                    class: 'tool-btn compact primary',
                                    type: 'button',
                                    title: 'Zakończ edycję wiersza',
                                    onClick: () => finishWorkCorrectionEdit(row.__clientId),
                                  },
                                  'Gotowe',
                                ),
                                h(
                                  'button',
                                  {
                                    key: `${row.__clientId}-duplicate`,
                                    class: 'tool-btn compact',
                                    type: 'button',
                                    title: 'Duplikuj wiersz',
                                    onClick: () => duplicateWorkRow(row.__clientId),
                                  },
                                  'Duplikuj',
                                ),
                                h(
                                  'button',
                                  {
                                    key: `${row.__clientId}-remove`,
                                    class: 'tool-btn compact danger',
                                    type: 'button',
                                    title: 'Usuń wiersz',
                                    onClick: () => removeWorkRow(row.__clientId),
                                  },
                                  'Usuń',
                                ),
                              ]
                            : [
                                h(
                                  'button',
                                  {
                                    key: `${row.__clientId}-${row.__disabled ? 'enable' : 'disable'}`,
                                    class: ['tool-btn compact', row.__disabled ? 'primary' : ''],
                                    type: 'button',
                                    title: row.__disabled ? 'Włącz wiersz do wysyłki' : 'Wyłącz wiersz z wysyłki',
                                    disabled: isWorkCorrectionSaving.value || isWorkEditPreparing.value || workDisableCooldownRowId.value === row.__clientId,
                                    onClick: () => toggleWorkRowDisabled(row.__clientId),
                                  },
                                  row.__disabled ? 'Włącz' : 'Wyłącz',
                                ),
                                h(
                                  'button',
                                  {
                                    key: `${row.__clientId}-edit`,
                                    class: 'tool-btn compact',
                                    type: 'button',
                                    title: 'Edytuj wiersz',
                                    disabled: isWorkCorrectionSaving.value || isWorkEditPreparing.value,
                                    onClick: () => startWorkCorrectionEdit(row.__clientId),
                                  },
                                  'Edytuj',
                                ),
                              ],
                        ),
                      );

                      return h(
                        'tr',
                        {
                          key: row.__clientId ?? row.id ?? row.Nazwa,
                          class: {
                            disabled: row.__disabled,
                            'pending-sync': row.__isPendingSync,
                          },
                        },
                        rowCells,
                      );
                    })
              : h('tr', [h('td', { colspan: props.columns.length + 1, class: 'empty-cell' }, props.emptyText)]),
          ),
        ]),
      ]);
  },
});

const RecipePreviewTable = defineComponent({
  props: {
    columns: { type: Array, required: true },
    rows: { type: Array, required: true },
    labels: { type: Object, default: () => ({}) },
    isEditMode: { type: Boolean, default: false },
    emptyText: { type: String, default: 'Brak danych' },
  },
  setup(props) {
    return () =>
      h('div', { class: 'table-wrap' }, [
        h('table', { class: 'data-table' }, [
          h(
            'thead',
            h(
              'tr',
              [
                h('th', 'Lp.'),
                ...props.columns.map((column) =>
                  h('th', [
                    h('span', getColumnLabelText(column, props.labels)),
                    isDimensionColumn(column) ? h('span', { class: 'dimension-unit' }, '₍ₘₘ₎') : null,
                  ]),
                ),
                props.isEditMode ? h('th', { class: 'actions-column' }, 'Akcje') : null,
              ].filter(Boolean),
            ),
          ),
          h(
            'tbody',
            props.rows.length
              ? props.rows.map((row, rowIndex) =>
                  h(
                    'tr',
                    {
                      key: row._localId ?? `${row.nazwaSkladowej}-${row.idSkladowej}`,
                      class: { disabled: row.__disabled },
                    },
                    [
                      h('td', rowIndex + 1),
                      ...props.columns.map((column) => {
                        if (!props.isEditMode) {
                          return h('td', row[column] ?? '');
                        }

                        if (isDropdownColumn(column) || isStationColumn(column)) {
                          const options = isStationColumn(column)
                            ? getStationDropdownOptions(row?.[column])
                            : getMergeDropdownOptions('', row, column);
                          return h('td', [
                            h(
                              'select',
                              {
                                class: 'edit-input recipe-preview-input',
                                value: row[column] ?? '',
                                style: getRecipePreviewEditInputStyle(column, row[column]),
                                onInput: (event) => updateRecipePreviewCell(row._localId, column, event.target.value),
                              },
                              [
                                h('option', { value: '' }, ''),
                                ...options.map((option) =>
                                  h('option', { value: option.value ?? option }, option.label ?? option),
                                ),
                              ],
                            ),
                          ]);
                        }

                        if (column === 'wybijak') {
                          const [firstPart, secondPart] = getWybijakInputParts(row[column], row.Stanowisko);
                          return h('td', [
                            h('div', { class: 'wybijak-edit-group' }, [
                              h('input', {
                                class: 'edit-input recipe-preview-input wybijak-part-input',
                                value: firstPart,
                                inputmode: 'numeric',
                                maxlength: 1,
                                onInput: (event) => updateRecipePreviewWybijakPart(row._localId, 0, event.target.value),
                              }),
                              h('span', { class: 'wybijak-separator' }, 'i'),
                              h('input', {
                                class: 'edit-input recipe-preview-input wybijak-part-input',
                                value: secondPart,
                                inputmode: 'numeric',
                                maxlength: 1,
                                onInput: (event) => updateRecipePreviewWybijakPart(row._localId, 1, event.target.value),
                              }),
                            ]),
                          ]);
                        }

                        return h('td', [
                          h('input', {
                            class: 'edit-input recipe-preview-input',
                            value: row[column] ?? '',
                            style: getRecipePreviewEditInputStyle(column, row[column]),
                            onInput: (event) => updateRecipePreviewCell(row._localId, column, event.target.value),
                          }),
                        ]);
                      }),
                      props.isEditMode
                        ? h('td', { class: 'row-actions-cell' }, [
                            h(
                              'button',
                              {
                                class: 'tool-btn compact',
                                type: 'button',
                                disabled: props.rows.length >= activeRowLimit.value,
                                onClick: () => duplicateRecipePreviewRow(row._localId),
                              },
                              'Duplikuj',
                            ),
                            h(
                              'button',
                              {
                                class: 'tool-btn compact danger',
                                type: 'button',
                                onClick: () => removeRecipePreviewRow(row._localId),
                              },
                              'Usuń',
                            ),
                          ])
                        : null,
                    ].filter(Boolean),
                  ),
                )
              : h('tr', [h('td', { colspan: props.columns.length + (props.isEditMode ? 2 : 1), class: 'empty-cell' }, props.emptyText)]),
          ),
        ]),
      ]);
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
    selectable: { type: Boolean, default: false },
    selectionKey: { type: String, default: 'id' },
    selectedKeys: { type: Array, default: () => [] },
  },
  emits: ['row-click', 'header-click', 'toggle-row', 'toggle-all'],
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

    function getRowSelectionKey(row) {
      return row?.[props.selectionKey];
    }

    function isRowSelected(row) {
      return props.selectedKeys.includes(getRowSelectionKey(row));
    }

    function areAllVisibleRowsSelected() {
      return sortedRows.value.length > 0 && sortedRows.value.every((row) => isRowSelected(row));
    }

    return () =>
      h('div', { class: 'table-wrap' }, [
        h('table', { class: 'data-table' }, [
          h(
            'thead',
            h(
              'tr',
              [
                ...(props.selectable
                  ? [
                      h('th', { class: 'selection-column' }, [
                        h('input', {
                          type: 'checkbox',
                          checked: areAllVisibleRowsSelected(),
                          onClick: (event) => event.stopPropagation(),
                          onChange: () => emit('toggle-all', sortedRows.value),
                        }),
                      ]),
                    ]
                  : []),
                ...props.columns.map((column) =>
                  h(
                    'th',
                    {
                      onClick: () => sortBy(column),
                      class: { sorted: isSorted(column) },
                    },
                    [
                      h('span', getColumnLabelText(column, props.labels)),
                      isDimensionColumn(column) ? h('span', { class: 'dimension-unit' }, '₍ₘₘ₎') : null,
                      isSorted(column) ? h('span', { class: 'sort-mark' }, currentDirection() > 0 ? '▲' : '▼') : null,
                    ],
                  ),
                ),
              ],
            ),
          ),
          h(
            'tbody',
            sortedRows.value.length
              ? sortedRows.value.map((row) =>
                  h(
                    'tr',
                    { onClick: () => emit('row-click', row) },
                    [
                      ...(props.selectable
                        ? [
                            h('td', { class: 'selection-column' }, [
                              h('input', {
                                type: 'checkbox',
                                checked: isRowSelected(row),
                                onClick: (event) => event.stopPropagation(),
                                onChange: () => emit('toggle-row', row),
                              }),
                            ]),
                          ]
                        : []),
                      ...props.columns.map((column) => h('td', row[column] ?? '')),
                    ],
                  ),
                )
              : h('tr', [h('td', { colspan: props.columns.length + (props.selectable ? 1 : 0), class: 'empty-cell' }, props.emptyText)]),
          ),
        ]),
      ]);
  },
});
</script>
