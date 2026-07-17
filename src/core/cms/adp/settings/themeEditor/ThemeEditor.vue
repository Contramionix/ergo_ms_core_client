<script setup>
import { ref, computed } from 'vue'
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Copy,
  Trash2,
  Check,
  Sun,
  Moon,
  AlertCircle,
} from 'lucide-vue-next'
import SelectBox from '@/components/SelectBox.vue'
import SearchInput from '@/components/SearchInput.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import ColorPicker from './ColorPicker.vue'
import { useThemeEditor, isColorLikeToken } from './useThemeEditor.js'

const {
  BASE_THEME_OPTIONS,
  activateTheme,
  bootstrapCategories,
  changeBaseTheme,
  canEditCurrentTheme,
  changeEditingVariant,
  changeScope,
  selectedScope,
  scopeOptions,
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

const filteredThemes = computed(() => {
  const q = listSearch.value.trim().toLowerCase()
  if (!q) {
    return displayThemes.value
  }
  return displayThemes.value.filter((theme) => {
    const name = String(theme.name || '').toLowerCase()
    const desc = String(theme.description || '').toLowerCase()
    return name.includes(q) || desc.includes(q)
  })
})

const showListSearch = computed(() => displayThemes.value.length > 4)

function themeSwatches(theme) {
  if (theme.is_pair && theme.variants) {
    const light = theme.variants.light?.colors || {}
    const dark = theme.variants.dark?.colors || {}
    return {
      dual: true,
      light: [
        light.accent || '#888',
        light.background || '#f5f5f5',
        light.primaryText || '#222',
        light.primaryBackground || '#fff',
      ],
      dark: [
        dark.accent || '#888',
        dark.background || '#1a1a1a',
        dark.primaryText || '#eee',
        dark.primaryBackground || '#2a2a2a',
      ],
    }
  }
  let colors = theme.colors
  if ((!colors || !Object.keys(colors).length) && theme.id === selectedThemeId.value) {
    colors = currentTheme.colors || {}
  }
  colors = colors || {}
  return {
    dual: false,
    colors: [
      colors.accent || '#888',
      colors.background || '#f5f5f5',
      colors.primaryText || '#222',
      colors.primaryBackground || '#fff',
    ],
  }
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
            <div class="table-header mb-3">
              <h2 class="admin-section-heading mb-0">Список тем</h2>
              <div class="actions-wrapper">
                <button
                  type="button"
                  class="btn btn-primary d-inline-flex align-items-center gap-2"
                  @click="createNewTheme"
                >
                  <Plus :size="16" aria-hidden="true" />
                  <span>Новая тема</span>
                </button>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label small text-muted mb-1" for="theme-scope">Область</label>
              <SelectBox
                id="theme-scope"
                :model-value="selectedScope"
                :options="scopeOptions"
                value-key="id"
                label-key="name"
                :include-all-option="false"
                @update:model-value="changeScope"
              />
            </div>

            <div class="mb-3 theme-editor__search-slot">
              <SearchInput
                v-if="showListSearch"
                v-model="listSearch"
                placeholder="Поиск по названию..."
                layout="grow"
                :show-icon="true"
              />
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
                    {{ listSearch.trim() ? 'Ничего не найдено по запросу.' : 'В этой области пока нет тем.' }}
                  </p>
                  <button
                    v-if="!listSearch.trim()"
                    type="button"
                    class="btn btn-outline-primary btn-sm"
                    @click="createNewTheme"
                  >
                    Создать тему
                  </button>
                </div>
                <div v-else class="theme-list">
                  <div
                    v-for="theme in filteredThemes"
                    :key="theme.id"
                    class="theme-item"
                    :class="{
                      active: selectedThemeId === theme.id,
                      'is-active-theme': theme.is_active,
                      'is-draft-theme': theme.is_draft,
                    }"
                    @click="selectTheme(theme)"
                  >
                  <div class="theme-info">
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                      <template v-if="theme.is_pair">
                        <Sun :size="14" class="theme-icon" aria-hidden="true" />
                        <Moon :size="14" class="theme-icon" aria-hidden="true" />
                      </template>
                      <component
                        :is="theme.base_theme === 'dark' ? Moon : Sun"
                        v-else
                        :size="16"
                        class="theme-icon"
                        aria-hidden="true"
                      />
                      <span class="theme-name">{{ theme.name }}</span>
                      <span v-if="theme.is_draft" class="theme-badge theme-badge--draft">Черновик</span>
                      <span v-if="theme.is_draft_pair" class="theme-badge theme-badge--draft">Черновик пары</span>
                      <span v-if="theme.is_system" class="theme-badge theme-badge--muted">Системная</span>
                      <span v-if="theme.is_active" class="theme-badge theme-badge--active">Активна</span>
                    </div>
                    <div class="theme-swatches" aria-hidden="true">
                      <template v-if="themeSwatches(theme).dual">
                        <div class="theme-swatches__row">
                          <Sun :size="10" class="theme-swatches__mode" />
                          <span
                            v-for="(c, i) in themeSwatches(theme).light"
                            :key="`l-${i}`"
                            class="theme-swatch"
                            :style="{ background: c }"
                          />
                        </div>
                        <div class="theme-swatches__row">
                          <Moon :size="10" class="theme-swatches__mode" />
                          <span
                            v-for="(c, i) in themeSwatches(theme).dark"
                            :key="`d-${i}`"
                            class="theme-swatch"
                            :style="{ background: c }"
                          />
                        </div>
                      </template>
                      <div v-else class="theme-swatches__row">
                        <span
                          v-for="(c, i) in themeSwatches(theme).colors"
                          :key="i"
                          class="theme-swatch"
                          :style="{ background: c }"
                        />
                      </div>
                    </div>
                    <small>{{ theme.description || 'Без описания' }}</small>
                  </div>

                  <div class="theme-actions actions-cell">
                    <button
                      v-if="theme.is_system && !theme.is_draft_pair"
                      type="button"
                      class="btn-action"
                      title="Сбросить к начальным значениям"
                      aria-label="Сбросить к начальным значениям"
                      :disabled="resettingThemeId === theme.id || resettingThemeId === theme.module_pair"
                      @click.stop="resetSystemTheme(theme)"
                    >
                      <RotateCcw :size="15" />
                    </button>
                    <button
                      v-if="!theme.is_active && !theme.is_draft && !theme.is_draft_pair"
                      type="button"
                      class="btn-action"
                      title="Активировать"
                      aria-label="Активировать тему"
                      @click.stop="activateTheme(theme)"
                    >
                      <Check :size="15" />
                    </button>
                    <button
                      v-if="!theme.is_draft && !isModuleScope"
                      type="button"
                      class="btn-action btn-action--edit"
                      title="Дублировать"
                      aria-label="Дублировать тему"
                      @click.stop="duplicateTheme(theme)"
                    >
                      <Copy :size="15" />
                    </button>
                    <button
                      v-if="theme.is_draft_pair"
                      type="button"
                      class="btn-action btn-action--delete"
                      title="Удалить черновик пары"
                      aria-label="Удалить черновик пары"
                      @click.stop="discardModulePairDraft"
                    >
                      <Trash2 :size="15" />
                    </button>
                    <button
                      v-if="theme.is_draft"
                      type="button"
                      class="btn-action btn-action--delete"
                      title="Удалить черновик"
                      aria-label="Удалить черновик"
                      @click.stop="discardDraft"
                    >
                      <Trash2 :size="15" />
                    </button>
                    <button
                      v-if="!theme.is_system && !theme.is_draft && !theme.is_pair"
                      type="button"
                      class="btn-action btn-action--delete"
                      title="Удалить"
                      aria-label="Удалить тему"
                      @click.stop="deleteTheme(theme)"
                    >
                      <Trash2 :size="15" />
                    </button>
                  </div>
                  </div>
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
              </div>
            </Transition>
          </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/core/cms/adp/admin/admin-page.scss';

.theme-editor {
  --theme-editor-motion: 280ms;
  --theme-editor-ease: cubic-bezier(0.22, 1, 0.36, 1);

  .admin-section-heading {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-primary-text);
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .theme-editor__workspace {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    align-items: stretch;
  }

  .theme-editor__section {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }

  .theme-editor__section-head {
    flex: 0 0 auto;
  }

  .theme-editor__search-slot {
    min-height: 2.5rem;

    &--empty {
      display: none;
    }
  }

  .theme-editor__list-card {
    flex: 1 1 auto;
    min-height: 12rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .theme-editor__list-loading {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;

    :deep(.loading-content-area) {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    :deep(.loading-content-area__slot) {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }
  }

  .theme-editor__form-card {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .theme-editor__variant-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-secondary-text);
  }

  .theme-editor__dirty-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--bs-warning, #ffc107);
    flex-shrink: 0;
    opacity: 0;
    transform: scale(0.6);
    transition:
      opacity var(--theme-editor-motion) var(--theme-editor-ease),
      transform var(--theme-editor-motion) var(--theme-editor-ease);

    &.is-visible {
      opacity: 1;
      transform: scale(1);
    }
  }

  .theme-editor__banner-slot {
    min-height: 0;
    margin-bottom: 0;
    transition: min-height var(--theme-editor-motion) var(--theme-editor-ease);

    &:not(.is-empty) {
      min-height: 4.25rem;
      margin-bottom: 1.25rem;
    }

    &.is-empty {
      min-height: 0;
      margin-bottom: 0;
    }
  }

  .theme-editor__banner {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.875rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid color-mix(in srgb, var(--bs-info, #0dcaf0) 35%, var(--color-border));
    background: color-mix(in srgb, var(--bs-info, #0dcaf0) 10%, var(--color-primary-background));
    color: var(--color-primary-text);
    font-size: 0.875rem;
  }

  .theme-editor__variant-tabs {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 0 0 auto;
  }

  .theme-editor__variant-tabs-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary-text);
  }

  .theme-editor__variant-tabs-group {
    display: inline-flex;
    gap: 0.25rem;
    flex-wrap: wrap;
    padding: 0.25rem;
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
    background: var(--color-secondary-background);
    width: fit-content;
  }

  .theme-editor__variant-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    color: var(--color-primary-text);
    font-size: 0.875rem;
    cursor: pointer;
    transition:
      background-color var(--theme-editor-motion) var(--theme-editor-ease),
      box-shadow var(--theme-editor-motion) var(--theme-editor-ease);

    &:hover {
      background: var(--color-hover-background);
    }

    &.active {
      background: var(--color-primary-background);
      box-shadow: 0 0 0 1px var(--color-border);
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
  }

  .theme-editor__live {
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
    overflow: hidden;
  }

  .theme-editor__live-header,
  .theme-editor__live-body,
  .theme-editor__live-card,
  .theme-editor__live-accent,
  .theme-editor__live-btn {
    transition:
      background-color var(--theme-editor-motion) var(--theme-editor-ease),
      color var(--theme-editor-motion) var(--theme-editor-ease),
      border-color var(--theme-editor-motion) var(--theme-editor-ease);
  }

  .theme-editor__live-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 1rem;
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .theme-editor__live-accent {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.25rem;
  }

  .theme-editor__live-body {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
  }

  .theme-editor__live-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 10rem;
    padding: 0.75rem;
    border: 1px solid;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
  }

  .theme-editor__live-btn {
    align-self: flex-start;
    margin-top: 0.25rem;
    border: none;
    border-radius: 0.375rem;
    padding: 0.35rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    pointer-events: none;
  }

  .theme-editor__contrast {
    margin-left: auto;
    align-self: center;
    padding: 0.25rem 0.625rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid transparent;
    transition:
      background-color var(--theme-editor-motion) var(--theme-editor-ease),
      color var(--theme-editor-motion) var(--theme-editor-ease),
      border-color var(--theme-editor-motion) var(--theme-editor-ease);

    &.is-ok {
      background: rgba(var(--bs-success-rgb, 25, 135, 84), 0.12);
      color: var(--bs-success, #198754);
      border-color: rgba(var(--bs-success-rgb, 25, 135, 84), 0.25);
    }

    &.is-warn {
      background: rgba(var(--bs-warning-rgb, 255, 193, 7), 0.18);
      color: var(--color-primary-text);
      border-color: rgba(var(--bs-warning-rgb, 255, 193, 7), 0.4);
    }
  }

  .content-card--flush {
    padding: 0;
    overflow: hidden;
  }

  .theme-editor__empty {
    padding: 2rem 1.25rem;
    text-align: center;
    color: var(--color-secondary-text);
    font-size: 0.875rem;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .form-label,
  .form-check-label {
    color: var(--color-primary-text);
    font-size: 0.875rem;
  }

  .theme-editor__input {
    border: 1px solid var(--color-border);
    background: var(--color-secondary-background);
    color: var(--color-primary-text);
    border-radius: 0.5rem;
    font-size: 0.875rem;

    &:focus {
      border-color: var(--color-primary-text);
      box-shadow: none;
    }

    &::placeholder {
      color: var(--color-secondary-text);
    }

    &:disabled {
      opacity: 0.65;
    }
  }

  .theme-editor__select-option {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .theme-editor__divider {
    border-color: var(--color-border);
    margin: 1.5rem 0;
    opacity: 1;
  }

  .theme-list {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }

  .theme-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    border-left: 3px solid transparent;
    cursor: pointer;
    transition:
      background-color var(--theme-editor-motion) var(--theme-editor-ease),
      border-left-color var(--theme-editor-motion) var(--theme-editor-ease);

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: var(--color-hover-background);
    }

    &.active {
      background-color: color-mix(in srgb, var(--color-accent) 14%, var(--color-primary-background));
      border-left-color: var(--color-accent);
    }

    &.is-active-theme:not(.active) {
      border-left-color: var(--bs-success, #198754);
    }
  }

  .theme-info {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    overflow: hidden;
    min-width: 0;

    small {
      color: color-mix(in srgb, var(--ui-text) 88%, var(--ui-text-muted));
      font-size: 0.8125rem;
    }
  }

  .theme-swatches {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .theme-swatches__row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .theme-swatches__mode {
    color: var(--ui-text-muted);
    flex-shrink: 0;
  }

  .theme-swatch {
    width: 0.875rem;
    height: 0.875rem;
    border-radius: 0.2rem;
    border: 1px solid color-mix(in srgb, var(--ui-text) 12%, transparent);
    flex-shrink: 0;
    transition: background-color var(--theme-editor-motion) var(--theme-editor-ease);
  }

  .theme-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-primary-text);
  }

  .theme-icon {
    flex-shrink: 0;
    color: var(--ui-text);
  }

  .theme-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 500;
    line-height: 1.4;

    &--muted {
      background: var(--ui-surface-2);
      color: var(--ui-text);
    }

    &--active {
      background: rgba(var(--bs-success-rgb, 25, 135, 84), 0.12);
      color: var(--bs-success, #198754);
    }

    &--draft {
      background: rgba(var(--bs-primary-rgb, 13, 110, 253), 0.1);
      color: var(--color-accent, var(--bs-primary, #0d6efd));
    }
  }

  .theme-item.is-draft-theme.active {
    border-left-color: var(--color-accent, var(--bs-primary, #0d6efd));
  }

  .theme-actions {
    opacity: 1;
    transition: opacity var(--theme-editor-motion) var(--theme-editor-ease);
    flex-shrink: 0;

    :deep(.btn-action) {
      color: var(--ui-text);

      &:hover:not(:disabled) {
        color: var(--ui-text);
      }
    }
  }
}

@media (min-width: 992px) {
  .theme-editor {
    .theme-editor__workspace {
      grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
      min-height: min(70vh, 52rem);
      height: min(70vh, 52rem);
    }

    .theme-editor__section {
      height: 100%;
    }

    .theme-editor__list-card,
    .theme-editor__form-card {
      flex: 1 1 auto;
      min-height: 0;
    }
  }
}

@media (max-width: 991.98px) {
  .theme-editor {
    .theme-editor__workspace {
      min-height: 0;
      height: auto;
    }

    .theme-editor__list-card {
      max-height: 22rem;
    }

    .theme-editor__form-card {
      max-height: none;
      overflow: visible;
    }

    .theme-editor__toolbar {
      position: sticky;
      top: 0;
      z-index: 5;
      padding: 0.75rem 0;
      margin-left: -0.25rem;
      margin-right: -0.25rem;
      padding-left: 0.25rem;
      padding-right: 0.25rem;
      background: color-mix(in srgb, var(--ui-bg) 92%, transparent);
      backdrop-filter: blur(6px);
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .theme-editor__actions {
      width: 100%;
      flex-wrap: wrap;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .theme-editor {
    --theme-editor-motion: 0ms;

    .theme-item,
    .theme-editor__variant-tab,
    .theme-actions,
    .theme-swatch,
    .theme-editor__live-header,
    .theme-editor__live-body,
    .theme-editor__live-card,
    .theme-editor__live-accent,
    .theme-editor__live-btn,
    .theme-editor__contrast,
    .theme-editor__dirty-dot,
    .theme-editor__banner-slot {
      transition: none !important;
    }
  }
}
</style>

<!-- Transition-классы без scoped: иначе enter/leave часто не применяются -->
<style lang="scss">
.theme-panel-enter-active,
.theme-panel-leave-active {
  transition:
    opacity 320ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.theme-panel-enter-from,
.theme-panel-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (prefers-reduced-motion: reduce) {
  .theme-panel-enter-active,
  .theme-panel-leave-active {
    transition: none !important;
  }

  .theme-panel-enter-from,
  .theme-panel-leave-to {
    opacity: 1;
    transform: none;
  }
}
</style>
