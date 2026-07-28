<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
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
import {
  resolveThemeDisplayDescription,
  resolveThemeDisplayName,
} from './resolveSystemThemeLabel.js'

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

const { t, tm } = useAppI18n()

const listSearch = ref('')
const modeFilter = ref('all')

const modeFilterOptions = computed(() => [
  { id: 'all', label: t('common.all') },
  { id: 'light', label: t('settings.themes.lightThemes') },
  { id: 'dark', label: t('settings.themes.darkThemes') },
  { id: 'a11y', label: t('settings.themes.a11y') },
])

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
    const label = resolveThemeDisplayName(theme.name, tm).toLowerCase()
    const labelDesc = resolveThemeDisplayDescription(
      theme.name,
      theme.description || '',
      tm,
    ).toLowerCase()
    return name.includes(q) || desc.includes(q) || label.includes(q) || labelDesc.includes(q)
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
          <div class="content-card content-card--flush theme-editor__list-card">
            <header class="theme-editor__panel-header">
              <h2 class="admin-section-heading theme-editor__list-title">{{ t('settings.themes.listTitle') }}</h2>
              <div class="actions-wrapper">
                <HoverTooltip :text="t('settings.themes.newTheme')" wrap>
                  <button
                    type="button"
                    class="theme-list-add-btn"
                    :aria-label="t('settings.themes.newTheme')"
                    @click="createNewTheme"
                  >
                    <Plus :size="18" aria-hidden="true" />
                  </button>
                </HoverTooltip>
              </div>
            </header>

            <div class="theme-editor__panel-toolbar theme-list-toolbar">
              <div
                class="theme-editor__mode-filter"
                role="group"
                :aria-label="t('settings.themes.filterModeAria')"
              >
                <button
                  v-for="option in modeFilterOptions"
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
                  :placeholder="t('settings.themes.searchPlaceholder')"
                  layout="grow"
                  :show-icon="true"
                />
              </div>
            </div>

            <div class="theme-editor__list-loading">
              <LoadingContentArea :loading="loading" min-height="8rem">
                <div
                  v-if="!filteredThemes.length"
                  class="theme-editor__empty"
                >
                  <p class="mb-2">
                    {{
                      listSearch.trim() || modeFilter !== 'all'
                        ? t('settings.themes.emptyFilter')
                        : t('settings.themes.emptyList')
                    }}
                  </p>
                  <button
                    v-if="!listSearch.trim() && modeFilter === 'all'"
                    type="button"
                    class="btn btn-outline-primary btn-sm"
                    @click="createNewTheme"
                  >
                    {{ t('settings.themes.createTheme') }}
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
          <div class="content-card content-card--flush theme-editor__form-card">
            <header class="theme-editor__panel-header theme-editor__toolbar">
              <h2 class="admin-section-heading mb-0">
                <template v-if="isEditingModulePair">
                  {{ t('settings.themes.editingPair') }}
                  <span class="theme-editor__variant-label">
                    ({{ editingVariant === 'dark' ? t('settings.themes.darkVariantParen') : t('settings.themes.lightVariantParen') }})
                  </span>
                </template>
                <template v-else>
                  {{ isNewTheme ? t('settings.themes.newTheme') : t('settings.themes.editing') }}
                </template>
                <span
                  class="theme-editor__dirty-dot"
                  :class="{ 'is-visible': isDirty }"
                  :title="t('settings.themes.dirtyHint')"
                  :aria-label="t('settings.themes.dirtyHint')"
                  :aria-hidden="!isDirty"
                />
              </h2>
              <div class="actions-wrapper theme-editor__actions">
                <button
                  v-if="isEditingModulePair"
                  type="button"
                  class="ui-btn ui-btn--secondary"
                  :disabled="saving || !canEditCurrentTheme"
                  @click="saveModulePair"
                >
                  <Save :size="16" aria-hidden="true" />
                  <span>{{ saving ? t('settings.themes.saving') : t('settings.themes.savePair') }}</span>
                </button>
                <button
                  type="button"
                  class="ui-btn ui-btn--secondary"
                  :disabled="!canEditCurrentTheme"
                  :title="t('settings.themes.resetVariantColors')"
                  @click="resetToDefaults"
                >
                  <RotateCcw :size="16" aria-hidden="true" />
                  <span>{{ t('settings.themes.reset') }}</span>
                </button>
                <button
                  type="button"
                  class="ui-btn ui-btn--secondary"
                  @click="importTheme"
                >
                  <Upload :size="16" aria-hidden="true" />
                  <span>{{ t('settings.themes.import') }}</span>
                </button>
                <button
                  type="button"
                  class="ui-btn ui-btn--secondary"
                  @click="exportTheme"
                >
                  <Download :size="16" aria-hidden="true" />
                  <span>{{ t('settings.themes.export') }}</span>
                </button>
                <button
                  type="button"
                  class="ui-btn ui-btn--primary"
                  :disabled="saving || !canEditCurrentTheme"
                  @click="saveTheme"
                >
                  <Save :size="16" aria-hidden="true" />
                  <span>
                    {{
                      saving
                        ? t('settings.themes.saving')
                        : (isEditingModulePair ? t('settings.themes.saveVariant') : t('common.save'))
                    }}
                  </span>
                </button>
              </div>
            </header>

            <div class="theme-editor__form-body">
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
<strong>{{ t('settings.themes.systemThemeStrong') }}</strong>
                  {{ t('settings.themes.systemThemeHint') }}
                </div>
              </div>
            </div>

            <div v-if="isEditingModulePair" class="theme-editor__variant-tabs mb-4">
              <span class="theme-editor__variant-tabs-label" id="variant-tabs-label">
                {{ t('settings.themes.editableVariant') }}
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
<span>{{ t('settings.themes.light') }}</span>
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
<span>{{ t('settings.themes.dark') }}</span>
                </button>
              </div>
              <p class="form-text small text-muted mb-0">
                {{ t('settings.themes.variantHint') }}
              </p>
            </div>

            <Transition name="theme-panel" mode="out-in">
              <div
                :key="formPanelKey"
                id="theme-form-panel"
                class="theme-editor__form-panel"
                role="tabpanel"
                :aria-label="t('settings.themes.panelAria', { key: formPanelKey })"
              >
              <div class="row g-3 mb-4">
                <div class="col-12 col-md-4">
                  <label class="form-label" for="theme-name">{{ t('settings.themes.name') }}{{ isEditingModulePair ? t('settings.themes.namePairSuffix') : '' }}</label>
                  <input
                    id="theme-name"
                    v-model="currentTheme.name"
                    type="text"
                    class="form-control theme-editor__input"
                    :disabled="!canEditCurrentTheme"
                    :placeholder="t('settings.themes.namePlaceholder')"
                  />
                </div>
                <div class="col-12 col-md-4">
                  <label class="form-label" for="theme-author">{{ t('settings.themes.author') }}</label>
                  <input
                    id="theme-author"
                    v-model="currentTheme.author"
                    type="text"
                    class="form-control theme-editor__input"
                    :disabled="!canEditCurrentTheme"
                    :placeholder="t('settings.themes.author')"
                  />
                </div>
                <div v-if="!isModuleScope" class="col-12 col-md-4">
                  <SelectBox
                    id="theme-base"
                    :label="t('settings.themes.baseTheme')"
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
                  <label class="form-label" for="theme-description">{{ t('settings.themes.description') }}</label>
                  <input
                    id="theme-description"
                    v-model="currentTheme.description"
                    type="text"
                    class="form-control theme-editor__input"
                    :disabled="!canEditCurrentTheme"
                    :placeholder="t('settings.themes.descriptionPlaceholder')"
                  />
                </div>
              </div>

              <div class="theme-editor__live mb-4" :aria-label="t('settings.themes.livePreviewAria')">
                <div
                  class="theme-editor__live-header"
                  :style="{ background: liveColors.headerBackground || '#ccc' }"
                >
                  <span :style="{ color: liveColors.primaryText || '#222' }">{{ t('settings.themes.header') }}</span>
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
<span>{{ t('settings.themes.card') }}</span>
                    <small :style="{ color: liveColors.secondaryText || '#666' }">{{ t('settings.themes.secondaryText') }}</small>
                    <button
                      type="button"
                      class="theme-editor__live-btn"
                      :style="{ background: liveColors.accent || '#888', color: '#fff' }"
                      tabindex="-1"
                    >
                      {{ t('settings.themes.button') }}
                    </button>
                  </div>
                  <div
                    v-if="textContrast.ratio != null"
                    class="theme-editor__contrast"
                    :class="textContrast.ok ? 'is-ok' : 'is-warn'"
                    :title="t('settings.themes.contrastTitle', { ratio: textContrast.ratio })"
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
                  {{ t('settings.themes.showBootstrap') }}
                </label>
              </div>

              <h3 class="admin-section-heading mb-3">
                {{ t('settings.themes.mainColors') }}
                <span v-if="isEditingModulePair" class="theme-editor__variant-label">
                  — {{ editingVariant === 'dark' ? t('settings.themes.darkVariantParen') : t('settings.themes.lightVariantParen') }}
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
                  {{ t('settings.themes.moduleTokens') }}
                  <span class="theme-editor__variant-label">
                    — {{ editingVariant === 'dark' ? t('settings.themes.darkVariantParen') : t('settings.themes.lightVariantParen') }}
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
                        :placeholder="t('settings.themes.cssValuePlaceholder')"
                        @input="updateModuleToken(entry.key, $event.target.value)"
                      />
                      <small class="form-text text-muted">{{ t('settings.themes.nonColorToken') }}</small>
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
          </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './theme-editor.scss';
</style>
