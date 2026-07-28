<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { ref, computed, defineAsyncComponent } from 'vue'
import { Plus } from 'lucide-vue-next'
import SearchInput from '@/components/SearchInput.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import ThemePickerCard from './ThemePickerCard.vue'
import { useThemeEditor } from './useThemeEditor.js'
import { isAccessibilityTheme, resolveThemePresentation } from './themeCategories.js'
import {
  resolveThemeDisplayDescription,
  resolveThemeDisplayName,
} from './resolveSystemThemeLabel.js'

const ThemeEditorForm = defineAsyncComponent({
  loader: () => import('./ThemeEditorForm.vue'),
  loadingComponent: SpinnerLoading,
  delay: 80,
})

const {
  activateTheme,
  toggleThemeAvailable,
  confirmLeaveIfDirty,
  isModuleScope,
  createNewTheme,
  currentTheme,
  deleteTheme,
  discardDraft,
  discardModulePairDraft,
  displayThemes,
  duplicateTheme,
  fileInput,
  handleFileImport,
  loading,
  resetSystemTheme,
  resettingThemeId,
  selectTheme,
  selectedThemeId,
} = useThemeEditor()

const { t, tm } = useAppI18n()

/** 'list' — галерея на всю ширину; 'form' — редактор выбранной темы */
const editorStep = ref('list')
const listSearch = ref('')
const modeFilter = ref('all')

function prefetchFormChunk() {
  void import('./ThemeEditorForm.vue')
}

function openTheme(theme) {
  prefetchFormChunk()
  selectTheme(theme)
  editorStep.value = 'form'
}

function selectThemeInList(theme) {
  selectTheme(theme)
}

function openNewTheme() {
  prefetchFormChunk()
  createNewTheme()
  editorStep.value = 'form'
}

async function onDuplicateTheme(theme) {
  await duplicateTheme(theme)
  if (selectedThemeId.value) {
    prefetchFormChunk()
    editorStep.value = 'form'
  }
}

async function backToList() {
  const ok = await confirmLeaveIfDirty()
  if (!ok) {
    return
  }
  editorStep.value = 'list'
}

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

    <div
      class="theme-editor__workspace"
      :class="{ 'theme-editor__workspace--form': editorStep === 'form' }"
    >
      <Transition name="theme-step" mode="out-in">
        <section
          v-if="editorStep === 'list'"
          key="list"
          class="theme-editor__section theme-editor__section--list"
        >
          <div class="content-card content-card--flush theme-editor__list-card">
            <header class="theme-editor__panel-header">
              <h2 class="admin-section-heading theme-editor__list-title">{{ t('settings.themes.listTitle') }}</h2>
              <div class="actions-wrapper">
                <HoverTooltip :text="t('settings.themes.newTheme')" wrap>
                  <button
                    type="button"
                    class="theme-list-add-btn"
                    :aria-label="t('settings.themes.newTheme')"
                    @mouseenter="prefetchFormChunk"
                    @focus="prefetchFormChunk"
                    @click="openNewTheme"
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
                    @mouseenter="prefetchFormChunk"
                    @click="openNewTheme"
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
                    @select="selectThemeInList"
                    @edit="openTheme"
                    @activate="activateTheme"
                    @toggle-available="toggleThemeAvailable"
                    @reset="resetSystemTheme"
                    @duplicate="onDuplicateTheme"
                    @delete="deleteTheme"
                    @discard-draft="discardDraft"
                    @discard-pair-draft="discardModulePairDraft"
                  />
                </div>
              </LoadingContentArea>
            </div>
          </div>
        </section>

        <section
          v-else
          key="form"
          class="theme-editor__section theme-editor__section--form"
        >
          <ThemeEditorForm @back="backToList" />
        </section>
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './theme-editor.scss';
</style>

<style lang="scss">
.theme-step-enter-active,
.theme-step-leave-active {
  transition:
    opacity 280ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.theme-step-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.theme-step-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

@media (prefers-reduced-motion: reduce) {
  .theme-step-enter-active,
  .theme-step-leave-active {
    transition: none !important;
  }

  .theme-step-enter-from,
  .theme-step-leave-to {
    opacity: 1;
    transform: none;
  }
}
</style>
