<script setup>
import { ref, computed } from 'vue'
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Sun,
  Moon,
  AlertCircle,
} from 'lucide-vue-next'
import SelectBox from '@/components/SelectBox.vue'
import SearchInput from '@/components/SearchInput.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import ColorPicker from './ColorPicker.vue'
import ThemePickerCard from './ThemePickerCard.vue'
import { useThemeEditor, isColorLikeToken } from './useThemeEditor.js'
import { isAccessibilityTheme, resolveThemePresentation } from './themeCategories.js'

const {
  BASE_THEME_OPTIONS,
  activateTheme,
  toggleThemeAvailable,
  bootstrapCategories,
  changeBaseTheme,
  canEditCurrentTheme,
  changeEditingVariant,
  isModuleScope,
  isDirty,
  colorDescriptions,
  createNewTheme,
  currentTheme,
  deleteTheme,
  discardDraft,
  discardModulePairDraft,
  displayThemes,
  duplicateTheme,
  exportTheme,
  fileInput,
  getDefaultValue,
  handleFileImport,
  importTheme,
  isNewTheme,
  loading,
  moduleTokenEntries,
  isEditingModulePair,
  resetSystemTheme,
  resetToDefaults,
  resettingThemeId,
  saveTheme,
  saveModulePair,
  saving,
  selectTheme,
  selectedThemeId,
  editingVariant,
  showBootstrapColors,
  textContrast,
  updateBootstrapColor,
  updateColor,
  updateModuleToken,
} = useThemeEditor()

const listSearch = ref('')
const modeFilter = ref('all')

const MODE_FILTER_OPTIONS = [
  { id: 'all', label: 'Все' },
  { id: 'light', label: 'Светлые' },
  { id: 'dark', label: 'Тёмные' },
  { id: 'a11y', label: 'Доступность' },
]

function themeMatchesMode(theme, mode) {
  if (mode === 'all') {
    return true
  }
  if (mode === 'a11y') {
    return isAccessibilityTheme(theme.name)
  }
  if (theme.is_pair) {
    return true
  }
  return theme.base_theme === mode
}

const filteredThemes = computed(() => {
  const q = listSearch.value.trim().toLowerCase()
  const mode = modeFilter.value
  return displayThemes.value.filter((theme) => {
    if (!themeMatchesMode(theme, mode)) {
      return false
    }
    if (!q) {
      return true
    }
    const name = String(theme.name || '').toLowerCase()
    const desc = String(theme.description || '').toLowerCase()
    return name.includes(q) || desc.includes(q)
  })
})

const themePresentations = computed(() => {
  const selectedId = selectedThemeId.value
  const fallback = currentTheme.colors || null
  const map = new Map()
  for (const theme of filteredThemes.value) {
    const colors = selectedId === theme.id ? fallback : null
    map.set(theme.id, resolveThemePresentation(theme, colors))
  }
  return map
})

const showListSearch = computed(() => displayThemes.value.length > 4)

function isThemeResetting(theme) {
  return resettingThemeId.value === theme.id || resettingThemeId.value === theme.module_pair
}

function onVariantTabKeydown(event) {
  if (!isEditingModulePair.value) {
    return
  }
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    changeEditingVariant(editingVariant.value === 'light' ? 'dark' : 'light')
  }
  if (event.key === 'Home') {
    event.preventDefault()
    changeEditingVariant('light')
  }
  if (event.key === 'End') {
    event.preventDefault()
    changeEditingVariant('dark')
  }
}

const liveColors = computed(() => currentTheme.colors || {})

const formPanelKey = computed(() => `${selectedThemeId.value || 'none'}-${editingVariant.value}`)

const showSystemBanner = computed(() => !canEditCurrentTheme.value && !isModuleScope.value)
</script>

<template>
  <div class="theme-editor">
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      class="visually-hidden"
      @change="handleFileImport"
    />

    <div class="theme-editor__workspace">
      <section class="theme-editor__section theme-editor__section--list">
          <div class="theme-editor__section-head">
            <div class="table-header theme-editor__list-heading">
              <h2 class="admin-section-heading theme-editor__list-title">Список тем</h2>
              <div class="actions-wrapper">
                <HoverTooltip text="Новая тема" wrap>
                  <button
                    type="button"
                    class="theme-list-add-btn"
                    aria-label="Новая тема"
                    @click="createNewTheme"
                  >
                    <Plus :size="18" aria-hidden="true" />
                  </button>
                </HoverTooltip>
              </div>
            </div>

            <div class="theme-list-toolbar">
              <div
                class="theme-editor__mode-filter"
                role="group"
                aria-label="Фильтр по режиму темы"
              >
                <button
                  v-for="option in MODE_FILTER_OPTIONS"
                  :key="option.id"
                  type="button"
                  class="theme-editor__mode-filter-btn"
                  :class="{ 'is-active': modeFilter === option.id }"
                  :aria-pressed="modeFilter === option.id ? 'true' : 'false'"
                  @click="modeFilter = option.id"
                >
                  {{ option.label }}
                </button>
              </div>
              <div
                class="theme-editor__search-slot"
                :class="{ 'theme-editor__search-slot--empty': !showListSearch }"
              >
                <SearchInput
                  v-if="showListSearch"
                  v-model="listSearch"
                  placeholder="Поиск по названию..."
                  layout="grow"
                  :show-icon="true"
                />
              </div>
            </div>
          </div>

          <div class="content-card content-card--flush theme-editor__list-card">
            <div class="theme-editor__list-loading">
              <LoadingContentArea :loading="loading" min-height="8rem">
                <div
                  v-if="!filteredThemes.length"
                  class="theme-editor__empty"
                >
                  <p class="mb-2">
                    {{
                      listSearch.trim() || modeFilter !== 'all'
                        ? 'Ничего не найдено по фильтру.'
                        : 'Тем пока нет.'
                    }}
                  </p>
                  <button
                    v-if="!listSearch.trim() && modeFilter === 'all'"
                    type="button"
                    class="btn btn-outline-primary btn-sm"
                    @click="createNewTheme"
                  >
                    Создать тему
                  </button>
                </div>
                <div
                  v-else
                  class="theme-gallery"
                >
                  <ThemePickerCard
                    v-for="theme in filteredThemes"
                    :key="theme.id"
                    :theme="theme"
                    :presentation="themePresentations.get(theme.id)"
                    :selected="selectedThemeId === theme.id"
                    :resetting="isThemeResetting(theme)"
                    :is-module-scope="isModuleScope"
                    @select="selectTheme"
                    @activate="activateTheme"
                    @toggle-available="toggleThemeAvailable"
                    @reset="resetSystemTheme"
                    @duplicate="duplicateTheme"
                    @delete="deleteTheme"
                    @discard-draft="discardDraft"
                    @discard-pair-draft="discardModulePairDraft"
                  />
                </div>
              </LoadingContentArea>
            </div>
          </div>
      </section>

      <section class="theme-editor__section theme-editor__section--form">
          <div class="theme-editor__toolbar table-header mb-3">
            <h2 class="admin-section-heading mb-0">
              <template v-if="isEditingModulePair">
                Редактирование пары
                <span class="theme-editor__variant-label">
                  ({{ editingVariant === 'dark' ? 'тёмный' : 'светлый' }} вариант)
                </span>
              </template>
              <template v-else>
                {{ isNewTheme ? 'Новая тема' : 'Редактирование' }}
              </template>
              <span
                class="theme-editor__dirty-dot"
                :class="{ 'is-visible': isDirty }"
                title="Есть несохранённые изменения"
                aria-label="Есть несохранённые изменения"
                :aria-hidden="!isDirty"
              />
            </h2>
            <div class="actions-wrapper theme-editor__actions">
              <button
                v-if="isEditingModulePair"
                type="button"
                class="btn btn-outline-primary d-inline-flex align-items-center gap-2"
                :disabled="saving || !canEditCurrentTheme"
                @click="saveModulePair"
              >
                <Save :size="16" aria-hidden="true" />
                <span>{{ saving ? 'Сохранение...' : 'Сохранить пару' }}</span>
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                :disabled="!canEditCurrentTheme"
                title="Сбросить цвета текущего варианта"
                @click="resetToDefaults"
              >
                <RotateCcw :size="16" aria-hidden="true" />
                <span>Сбросить</span>
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                @click="importTheme"
              >
                <Upload :size="16" aria-hidden="true" />
                <span>Импорт</span>
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                @click="exportTheme"
              >
                <Download :size="16" aria-hidden="true" />
                <span>Экспорт</span>
              </button>
              <button
                type="button"
                class="btn btn-primary d-inline-flex align-items-center gap-2"
                :disabled="saving || !canEditCurrentTheme"
                @click="saveTheme"
              >
                <Save :size="16" aria-hidden="true" />
                <span>
                  {{
                    saving
                      ? 'Сохранение...'
                      : (isEditingModulePair ? 'Сохранить вариант' : 'Сохранить')
                  }}
                </span>
              </button>
            </div>
          </div>

          <div class="content-card theme-editor__form-card">
            <div
              class="theme-editor__banner-slot"
              :class="{ 'is-empty': !showSystemBanner }"
            >
              <div
                v-if="showSystemBanner"
                class="theme-editor__banner"
                role="status"
              >
                <AlertCircle :size="18" aria-hidden="true" />
                <div>
                  <strong>Системная тема.</strong>
                  Палитру менять нельзя — можно активировать или сбросить к начальным значениям.
                  Чтобы править цвета, создайте копию темы.
                </div>
              </div>
            </div>

            <div v-if="isEditingModulePair" class="theme-editor__variant-tabs mb-4">
              <span class="theme-editor__variant-tabs-label" id="variant-tabs-label">
                Редактируемый вариант
              </span>
              <div
                class="theme-editor__variant-tabs-group"
                role="tablist"
                aria-labelledby="variant-tabs-label"
                @keydown="onVariantTabKeydown"
              >
                <button
                  type="button"
                  id="variant-tab-light"
                  class="theme-editor__variant-tab"
                  :class="{ active: editingVariant === 'light' }"
                  role="tab"
                  :aria-selected="editingVariant === 'light'"
                  aria-controls="theme-form-panel"
                  :tabindex="editingVariant === 'light' ? 0 : -1"
                  @click="changeEditingVariant('light')"
                >
                  <Sun :size="16" aria-hidden="true" />
                  <span>Светлый</span>
                </button>
                <button
                  type="button"
                  id="variant-tab-dark"
                  class="theme-editor__variant-tab"
                  :class="{ active: editingVariant === 'dark' }"
                  role="tab"
                  :aria-selected="editingVariant === 'dark'"
                  aria-controls="theme-form-panel"
                  :tabindex="editingVariant === 'dark' ? 0 : -1"
                  @click="changeEditingVariant('dark')"
                >
                  <Moon :size="16" aria-hidden="true" />
                  <span>Тёмный</span>
                </button>
              </div>
              <p class="form-text small text-muted mb-0">
                Цвета и токены задаются отдельно для каждого варианта. На сайте показывается вариант по глобальной теме пользователя.
              </p>
            </div>

            <Transition name="theme-panel" mode="out-in">
              <div
                :key="formPanelKey"
                id="theme-form-panel"
                class="theme-editor__form-panel"
                role="tabpanel"
                :aria-label="`Панель темы ${formPanelKey}`"
              >
              <div class="row g-3 mb-4">
                <div class="col-12 col-md-4">
                  <label class="form-label" for="theme-name">Название{{ isEditingModulePair ? ' пары' : '' }}</label>
                  <input
                    id="theme-name"
                    v-model="currentTheme.name"
                    type="text"
                    class="form-control theme-editor__input"
                    :disabled="!canEditCurrentTheme"
                    placeholder="Название темы"
                  />
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label" for="theme-author">Автор</label>
                  <input
                    id="theme-author"
                    v-model="currentTheme.author"
                    type="text"
                    class="form-control theme-editor__input"
                    :disabled="!canEditCurrentTheme"
                    placeholder="Автор"
                  />
                </div>
                <div v-if="!isModuleScope" class="col-12 col-md-4">
                  <SelectBox
                    id="theme-base"
                    label="Базовая тема"
                    :model-value="currentTheme.base_theme"
                    :options="BASE_THEME_OPTIONS"
                    :include-all-option="false"
                    :disabled="!canEditCurrentTheme"
                    @update:model-value="changeBaseTheme"
                  >
                    <template #selected="{ option, label }">
                      <span class="theme-editor__select-option">
                        <component :is="option?.icon" v-if="option?.icon" :size="16" />
                        <span>{{ label }}</span>
                      </span>
                    </template>
                    <template #option="{ option, label }">
                      <span class="theme-editor__select-option">
                        <component :is="option?.icon" v-if="option?.icon" :size="16" />
                        <span>{{ label }}</span>
                      </span>
                    </template>
                  </SelectBox>
                </div>
                <div class="col-12">
                  <label class="form-label" for="theme-description">Описание</label>
                  <input
                    id="theme-description"
                    v-model="currentTheme.description"
                    type="text"
                    class="form-control theme-editor__input"
                    :disabled="!canEditCurrentTheme"
                    placeholder="Описание темы"
                  />
                </div>
              </div>

              <div class="theme-editor__live mb-4" aria-label="Быстрый предпросмотр палитры">
                <div
                  class="theme-editor__live-header"
                  :style="{ background: liveColors.headerBackground || '#ccc' }"
                >
                  <span :style="{ color: liveColors.primaryText || '#222' }">Шапка</span>
                  <span
                    class="theme-editor__live-accent"
                    :style="{ background: liveColors.accent || '#888' }"
                  />
                </div>
                <div
                  class="theme-editor__live-body"
                  :style="{ background: liveColors.background || '#f5f5f5' }"
                >
                  <div
                    class="theme-editor__live-card"
                    :style="{
                      background: liveColors.primaryBackground || '#fff',
                      borderColor: liveColors.border || '#ddd',
                      color: liveColors.primaryText || '#222',
                    }"
                  >
                    <span>Карточка</span>
                    <small :style="{ color: liveColors.secondaryText || '#666' }">Вторичный текст</small>
                    <button
                      type="button"
                      class="theme-editor__live-btn"
                      :style="{ background: liveColors.accent || '#888', color: '#fff' }"
                      tabindex="-1"
                    >
                      Кнопка
                    </button>
                  </div>
                  <div
                    v-if="textContrast.ratio != null"
                    class="theme-editor__contrast"
                    :class="textContrast.ok ? 'is-ok' : 'is-warn'"
                    :title="'Контраст основного текста к фону: ' + textContrast.ratio + ':1 (цель ≥ 4.5:1)'"
                  >
                    {{ textContrast.label }}
                    <span v-if="textContrast.ratio != null">({{ textContrast.ratio }}:1)</span>
                  </div>
                </div>
              </div>

              <template v-if="selectedThemeId">
              <div class="form-check form-switch mb-4">
                <input
                  id="showBootstrap"
                  v-model="showBootstrapColors"
                  class="form-check-input"
                  type="checkbox"
                />
                <label class="form-check-label" for="showBootstrap">
                  Показать Bootstrap переменные
                </label>
              </div>

              <h3 class="admin-section-heading mb-3">
                Основные цвета
                <span v-if="isEditingModulePair" class="theme-editor__variant-label">
                  — {{ editingVariant === 'dark' ? 'тёмный' : 'светлый' }} вариант
                </span>
              </h3>
              <div class="row">
                <div
                  v-for="(desc, key) in colorDescriptions"
                  :key="key || `color-${desc.label}`"
                  class="col-12 col-md-6"
                >
                  <ColorPicker
                    :label="desc.label"
                    :value="currentTheme.colors[key] || ''"
                    :description="desc.description"
                    :disabled="!canEditCurrentTheme"
                    @update:value="updateColor(key, $event)"
                  />
                </div>
              </div>

              <template v-if="isModuleScope && moduleTokenEntries.length">
                <hr class="theme-editor__divider" />
                <h3 class="admin-section-heading mb-3">
                  Токены модуля
                  <span class="theme-editor__variant-label">
                    — {{ editingVariant === 'dark' ? 'тёмный' : 'светлый' }} вариант
                  </span>
                </h3>
                <div class="row g-3">
                  <div
                    v-for="entry in moduleTokenEntries"
                    :key="entry.key"
                    class="col-12 col-md-6"
                  >
                    <ColorPicker
                      v-if="isColorLikeToken(entry.value)"
                      :label="entry.label"
                      :value="entry.value || ''"
                      :disabled="!canEditCurrentTheme"
                      @update:value="updateModuleToken(entry.key, $event)"
                    />
                    <template v-else>
                      <label class="form-label" :for="`module-token-${entry.key}`">{{ entry.label }}</label>
                      <input
                        :id="`module-token-${entry.key}`"
                        type="text"
                        class="form-control theme-editor__input"
                        :value="entry.value"
                        :disabled="!canEditCurrentTheme"
                        placeholder="Цвет или значение CSS (например тень)"
                        @input="updateModuleToken(entry.key, $event.target.value)"
                      />
                      <small class="form-text text-muted">Не цветовой токен — редактируется текстом</small>
                    </template>
                  </div>
                </div>
              </template>

              <template v-if="showBootstrapColors">
                <template v-for="(category, categoryKey) in bootstrapCategories" :key="categoryKey">
                  <hr class="theme-editor__divider" />
                  <h3 class="admin-section-heading mb-3">{{ category.label }}</h3>
                  <div class="row">
                    <div
                      v-for="(varConfig, key) in category.variables"
                      :key="key || `${categoryKey}-${varConfig.label}`"
                      class="col-12 col-md-6"
                    >
                      <ColorPicker
                        :label="varConfig.label"
                        :value="currentTheme.bootstrap_colors[key] || getDefaultValue(key)"
                        :description="varConfig.variable"
                        :disabled="!canEditCurrentTheme"
                        @update:value="updateBootstrapColor(key, $event)"
                      />
                    </div>
                  </div>
                </template>
              </template>
              </template>
              </div>
            </Transition>
          </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './theme-editor.scss';
</style>
