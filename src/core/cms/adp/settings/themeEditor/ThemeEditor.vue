<script setup>
import { ref, reactive, computed, onMounted, markRaw } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { confirmAction } from '@/js/utils/confirm.js'
import {
  Save, Download, Upload, RotateCcw, Plus, Copy, Trash2,
  Check, Sun, Moon,
} from 'lucide-vue-next'
import ColorPicker from './ColorPicker.vue'
import SelectBox from '@/components/SelectBox.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { apiClient } from '@/js/api/manager'
import { mediaApiClient } from '@/js/api/media-api-client.js'
import { endpoints, initEndpoints } from '@/js/api/endpoints.js'
import { 
  getDefaultColors, 
  getColorDescriptions,
  getBootstrapByCategories,
  previewTheme,
  applyTheme,
  resetPreviewToDefaults,
  getCurrentThemeMode,
  loadThemeFromLocalStorage,
} from '@/js/theme-manager'
const toast = useToast()

const BASE_THEME_OPTIONS = [
  { id: 'light', name: 'Светлая', icon: markRaw(Sun) },
  { id: 'dark', name: 'Тёмная', icon: markRaw(Moon) },
]

const DRAFT_THEME_ID = '__draft__'

// Состояние
const themes = ref([])
const selectedThemeId = ref(null)
const loading = ref(false)
const saving = ref(false)
const resettingThemeId = ref(null)
const showBootstrapColors = ref(false)
const fileInput = ref(null)
const draftTheme = ref(null)

// Текущая редактируемая тема
const currentTheme = reactive({
  id: null,
  name: '',
  description: '',
  author: '',
  base_theme: 'light',
  colors: {},
  bootstrap_colors: {},
  is_active: false,
  is_default: false,
  is_system: false
})

// Описания цветов
const colorDescriptions = getColorDescriptions()
const bootstrapCategories = getBootstrapByCategories()

// Вычисляемые свойства
const isDraftSelected = computed(() => selectedThemeId.value === DRAFT_THEME_ID)
const isNewTheme = computed(() => isDraftSelected.value)

const displayThemes = computed(() => {
  if (!draftTheme.value) {
    return themes.value
  }

  const source = isDraftSelected.value ? currentTheme : draftTheme.value
  const draft = {
    id: DRAFT_THEME_ID,
    name: source.name || 'Новая тема',
    description: source.description || '',
    base_theme: source.base_theme,
    is_system: false,
    is_active: false,
    is_draft: true,
  }

  return [draft, ...themes.value]
})

function createEmptyDraft(baseTheme = 'light') {
  return {
    id: DRAFT_THEME_ID,
    name: 'Новая тема',
    description: '',
    author: '',
    base_theme: baseTheme,
    colors: { ...getDefaultColors(baseTheme) },
    bootstrap_colors: {},
    is_active: false,
    is_default: false,
    is_system: false,
  }
}

function snapshotTheme(source) {
  return {
    id: source.id,
    name: source.name,
    description: source.description || '',
    author: source.author || '',
    base_theme: source.base_theme,
    colors: { ...(source.colors || {}) },
    bootstrap_colors: { ...(source.bootstrap_colors || {}) },
    is_active: Boolean(source.is_active),
    is_default: Boolean(source.is_default),
    is_system: Boolean(source.is_system),
  }
}

function applyThemeToCurrent(theme) {
  Object.assign(currentTheme, snapshotTheme(theme))
}

function syncCurrentToDraft() {
  if (!draftTheme.value) {
    return
  }
  draftTheme.value = snapshotTheme(currentTheme)
  draftTheme.value.id = DRAFT_THEME_ID
  draftTheme.value.is_active = false
  draftTheme.value.is_default = false
  draftTheme.value.is_system = false
}

// Загрузка списка тем
const loadThemes = async () => {
  loading.value = true
  try {
    await initEndpoints()
    const res = await apiClient.get(endpoints.themes.list)
    if (res.success) {
      themes.value = res.data || []
      
      // Если нет тем, создаем системные
      if (themes.value.length === 0) {
        await createSystemThemes()
      }
      
      // Выбираем тему для формы без смены текущего оформления сайта
      const initialTheme = pickInitialTheme(themes.value)
      if (initialTheme) {
        selectTheme(initialTheme, { preview: false })
      }
    }
  } catch (e) {
    logError('Ошибка загрузки тем:', e)
    toast.error('Ошибка загрузки списка тем')
  } finally {
    loading.value = false
  }
}

// Создание/обновление системных тем
const createSystemThemes = async () => {
  try {
    await apiClient.post(endpoints.themes.createSystemThemes)
    const res = await apiClient.get(endpoints.themes.list)
    if (res.success) {
      themes.value = res.data || []
    }
  } catch (e) {
    logError('Ошибка создания системных тем:', e)
  }
}

// Сброс одной системной темы к начальным значениям
const resetSystemTheme = async (theme) => {
  if (!theme.is_system) {
    return
  }

  const ok = await confirmAction({
    title: 'Сброс темы',
    message: `Сбросить тему «${theme.name}» к начальным значениям?`,
    confirmText: 'Сбросить',
    cancelText: 'Отмена',
    variant: 'warning',
  })
  if (!ok) {
    return
  }

  resettingThemeId.value = theme.id
  try {
    const res = await apiClient.post(endpoints.themes.resetDefaults(theme.id))
    if (res.success) {
      toast.success(`Тема «${theme.name}» сброшена к начальным значениям`)
      await loadThemes()
      const resetTheme = res.data || themes.value.find((t) => t.id === theme.id)
      if (resetTheme) {
        selectTheme(resetTheme)
        if (resetTheme.is_active) {
          applyTheme({
            base_theme: resetTheme.base_theme,
            colors: resetTheme.colors || {},
            bootstrap_colors: resetTheme.bootstrap_colors || {},
          }, true)
        }
      }
    } else {
      toast.error(res.message || 'Ошибка сброса темы')
    }
  } catch (e) {
    logError('Ошибка сброса темы:', e)
    toast.error('Ошибка сброса темы')
  } finally {
    resettingThemeId.value = null
  }
}

// Выбор темы в списке при первой загрузке (без смены глобальной темы)
function pickInitialTheme(themeList) {
  if (!themeList.length) {
    return null
  }

  const active = themeList.find((t) => t.is_active)
  if (active) {
    return active
  }

  const saved = loadThemeFromLocalStorage()
  if (saved?.id) {
    const byId = themeList.find((t) => t.id === saved.id)
    if (byId) {
      return byId
    }
  }

  const mode = getCurrentThemeMode()
  const byMode = themeList.find((t) => t.base_theme === mode)
  if (byMode) {
    return byMode
  }

  return themeList[0]
}

// Выбор темы для редактирования
const selectTheme = (theme, { preview = true } = {}) => {
  if (isDraftSelected.value) {
    syncCurrentToDraft()
  }

  if (theme.id === DRAFT_THEME_ID) {
    if (!draftTheme.value) {
      return
    }
    selectedThemeId.value = DRAFT_THEME_ID
    applyThemeToCurrent(draftTheme.value)
    if (preview) {
      previewTheme({
        base_theme: currentTheme.base_theme,
        colors: { ...currentTheme.colors },
        bootstrap_colors: { ...currentTheme.bootstrap_colors },
      })
    }
    return
  }

  selectedThemeId.value = theme.id
  
  // Берём цвета из темы или дефолтные из _theme.scss
  const colors = theme.colors && Object.keys(theme.colors).length > 0 
    ? { ...theme.colors }
    : { ...getDefaultColors(theme.base_theme) }
  
  Object.assign(currentTheme, {
    id: theme.id,
    name: theme.name,
    description: theme.description || '',
    author: theme.author || '',
    base_theme: theme.base_theme,
    colors: colors,
    bootstrap_colors: theme.bootstrap_colors ? { ...theme.bootstrap_colors } : {},
    is_active: theme.is_active,
    is_default: theme.is_default,
    is_system: theme.is_system
  })
  
  if (preview) {
    previewTheme({
      base_theme: currentTheme.base_theme,
      colors: { ...currentTheme.colors },
      bootstrap_colors: { ...currentTheme.bootstrap_colors },
    })
  }
}

// Создание новой темы
const createNewTheme = () => {
  if (draftTheme.value) {
    selectTheme({ id: DRAFT_THEME_ID })
    return
  }

  draftTheme.value = createEmptyDraft()
  selectTheme({ id: DRAFT_THEME_ID })
}

const discardDraft = async () => {
  const ok = await confirmAction({
    title: 'Удаление черновика',
    message: 'Удалить несохранённый черновик темы?',
    confirmText: 'Удалить',
    cancelText: 'Отмена',
    variant: 'danger',
  })
  if (!ok) {
    return
  }

  const wasSelected = isDraftSelected.value
  draftTheme.value = null

  if (!wasSelected) {
    return
  }

  const fallback = themes.value[0]
  if (fallback) {
    selectTheme(fallback, { preview: false })
    return
  }

  selectedThemeId.value = null
}

// Смена базовой темы
const changeBaseTheme = (base) => {
  currentTheme.base_theme = base
  // Сбрасываем цвета к начальным для новой базовой темы
  if (!currentTheme.is_system) {
    currentTheme.colors = { ...getDefaultColors(base) }
    currentTheme.bootstrap_colors = {}
  }
  previewTheme({
    base_theme: base,
    colors: { ...currentTheme.colors },
    bootstrap_colors: { ...currentTheme.bootstrap_colors },
  })
}

// Обновление цвета
const updateColor = (key, value) => {
  currentTheme.colors[key] = value
  // Передаём копию объекта для previewTheme
  previewTheme({
    base_theme: currentTheme.base_theme,
    colors: { ...currentTheme.colors },
    bootstrap_colors: { ...currentTheme.bootstrap_colors },
  })
}

const updateBootstrapColor = (key, value) => {
  currentTheme.bootstrap_colors[key] = value
  previewTheme({
    base_theme: currentTheme.base_theme,
    colors: { ...currentTheme.colors },
    bootstrap_colors: { ...currentTheme.bootstrap_colors },
  })
}

// Получить значение по умолчанию для Bootstrap переменной
const getDefaultValue = (key) => {
  // Ищем в категориях Bootstrap переменных
  const categories = getBootstrapByCategories()
  const defaultKey = currentTheme.base_theme === 'dark' ? 'darkDefault' : 'lightDefault'
  
  for (const category of Object.values(categories)) {
    if (category.variables && category.variables[key]) {
      return category.variables[key][defaultKey] || ''
    }
  }
  return ''
}

// Сброс к начальным значениям из _theme.scss (только превью редактора)
const resetToDefaults = () => {
  const base = currentTheme.base_theme
  const defaults = resetPreviewToDefaults(base)
  currentTheme.colors = { ...defaults.colors }
  currentTheme.bootstrap_colors = {}
  previewTheme({
    base_theme: base,
    colors: { ...currentTheme.colors },
    bootstrap_colors: {},
  })
  toast.success('Тема сброшена к начальным значениям')
}

// Сохранение темы
const saveTheme = async () => {
  if (!currentTheme.name.trim()) {
    toast.error('Укажите название темы')
    return
  }
  
  saving.value = true
  try {
    const data = {
      name: currentTheme.name,
      description: currentTheme.description,
      author: currentTheme.author,
      base_theme: currentTheme.base_theme,
      colors: currentTheme.colors,
      bootstrap_colors: currentTheme.bootstrap_colors
    }
    
    let res
    if (isDraftSelected.value) {
      syncCurrentToDraft()
      res = await apiClient.post(endpoints.themes.create, data)
    } else if (currentTheme.id) {
      res = await apiClient.put(endpoints.themes.update(currentTheme.id), data)
    } else {
      res = await apiClient.post(endpoints.themes.create, data)
    }
    
    if (res.success) {
      toast.success('Тема сохранена')
      draftTheme.value = null
      const savedId = res.data?.id || currentTheme.id
      await loadThemes()
      const savedTheme = themes.value.find((t) => t.id === savedId)
        || themes.value.find((t) => t.name === data.name)
      if (savedTheme) {
        selectTheme(savedTheme)
        if (savedTheme.is_active) {
          applyTheme({
            base_theme: savedTheme.base_theme,
            colors: savedTheme.colors || {},
            bootstrap_colors: savedTheme.bootstrap_colors || {},
          }, true)
        }
      }
    } else {
      toast.error(res.message || 'Ошибка сохранения')
    }
  } catch (e) {
    toast.error(e.message || 'Ошибка сохранения темы')
  } finally {
    saving.value = false
  }
}

// Активация темы
const activateTheme = async (theme) => {
  try {
    const res = await apiClient.post(endpoints.themes.activate(theme.id))
    if (res.success) {
      toast.success(`Тема "${theme.name}" активирована`)
      await loadThemes()
      // Применяем тему и сохраняем в localStorage
      applyTheme({
        base_theme: res.data.base_theme,
        colors: res.data.colors || {},
        bootstrap_colors: res.data.bootstrap_colors || {},
      }, true)
      selectTheme(res.data)
    }
  } catch {
    toast.error('Ошибка активации темы')
  }
}

// Дублирование темы
const duplicateTheme = async (theme) => {
  try {
    const res = await apiClient.post(endpoints.themes.duplicate(theme.id), {
      name: `${theme.name} (копия)`
    })
    if (res.success) {
      toast.success('Копия создана')
      await loadThemes()
      selectTheme(res.data)
    }
  } catch {
    toast.error('Ошибка создания копии')
  }
}

const deleteTheme = async (theme) => {
  if (theme.is_system) {
    toast.error('Нельзя удалить системную тему')
    return
  }

  const ok = await confirmAction({
    title: 'Удаление темы',
    message: `Вы уверены, что хотите удалить тему "${theme.name}"?`,
    confirmText: 'Удалить',
    cancelText: 'Отмена',
    variant: 'danger',
  })
  if (!ok) return

  try {
    const res = await apiClient.delete(endpoints.themes.delete(theme.id))
    if (res.success) {
      toast.success('Тема удалена')
      await loadThemes()
    }
  } catch {
    toast.error('Ошибка удаления темы')
  }
}

// Экспорт темы
const exportTheme = async () => {
  if (!currentTheme.id || isDraftSelected.value) {
    // Экспорт несохраненной темы
    const data = {
      name: currentTheme.name,
      description: currentTheme.description,
      author: currentTheme.author,
      base_theme: currentTheme.base_theme,
      colors: currentTheme.colors,
      bootstrap_colors: currentTheme.bootstrap_colors,
      version: '1.0',
      exported_at: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${currentTheme.name || 'theme'}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Тема экспортирована')
    return
  }
  
  try {
    const res = await apiClient.downloadFile(endpoints.themes.export(currentTheme.id))
    if (!res.success || !res.data) {
      toast.error(res.message || 'Ошибка экспорта темы')
      return
    }
    const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${currentTheme.name || 'theme'}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Тема экспортирована')
  } catch {
    toast.error('Ошибка экспорта темы')
  }
}

// Импорт темы
const importTheme = () => {
  fileInput.value?.click()
}

const handleFileImport = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  try {
    const uploadResult = await mediaApiClient.upload(file, {
      targetDir: 'imports/themes',
      allowedTypes: ['json'],
    })

    const res = await apiClient.post(endpoints.themes.import, {
      file_path: uploadResult.path,
    })
    
    if (res.success) {
      toast.success('Тема импортирована')
      await loadThemes()
      selectTheme(res.data)
    } else {
      toast.error(res.message || 'Ошибка импорта')
    }
  } catch (e) {
    toast.error(e.message || 'Ошибка импорта темы')
  }
  
  // Сброс input
  event.target.value = ''
}

// Следим за изменениями и применяем превью
// Watch удалён - превью применяется только при явном изменении цвета

onMounted(() => {
  loadThemes()
})

// При выходе из редактора - ничего не сбрасываем, активная тема сохранена в localStorage
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

    <div class="row g-4">
      <div class="col-12 col-lg-4">
        <section class="theme-editor__section">
          <div class="table-header mb-3">
            <h2 class="admin-section-heading mb-0">Список тем</h2>
            <div class="actions-wrapper">
              <button
                type="button"
                class="btn btn-primary d-inline-flex align-items-center gap-2"
                @click="createNewTheme"
              >
                <Plus :size="16" />
                <span>Новая тема</span>
              </button>
            </div>
          </div>

          <div class="content-card content-card--flush">
            <LoadingContentArea :loading="loading" min-height="8rem">
              <div class="theme-list">
                <div
                  v-for="theme in displayThemes"
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
                      <component
                        :is="theme.base_theme === 'dark' ? Moon : Sun"
                        :size="16"
                        class="theme-icon"
                      />
                      <span class="theme-name">{{ theme.name }}</span>
                      <span v-if="theme.is_draft" class="theme-badge theme-badge--draft">Черновик</span>
                      <span v-if="theme.is_system" class="theme-badge theme-badge--muted">Системная</span>
                      <span v-if="theme.is_active" class="theme-badge theme-badge--active">Активна</span>
                    </div>
                    <small>{{ theme.description || 'Без описания' }}</small>
                  </div>

                  <div class="theme-actions actions-cell">
                    <button
                      v-if="theme.is_system"
                      type="button"
                      class="btn-action"
                      title="Сбросить к начальным значениям"
                      :disabled="resettingThemeId === theme.id"
                      @click.stop="resetSystemTheme(theme)"
                    >
                      <RotateCcw :size="15" />
                    </button>
                    <button
                      v-if="!theme.is_active && !theme.is_draft"
                      type="button"
                      class="btn-action"
                      title="Активировать"
                      @click.stop="activateTheme(theme)"
                    >
                      <Check :size="15" />
                    </button>
                    <button
                      v-if="!theme.is_draft"
                      type="button"
                      class="btn-action btn-action--edit"
                      title="Дублировать"
                      @click.stop="duplicateTheme(theme)"
                    >
                      <Copy :size="15" />
                    </button>
                    <button
                      v-if="theme.is_draft"
                      type="button"
                      class="btn-action btn-action--delete"
                      title="Удалить черновик"
                      @click.stop="discardDraft"
                    >
                      <Trash2 :size="15" />
                    </button>
                    <button
                      v-if="!theme.is_system && !theme.is_draft"
                      type="button"
                      class="btn-action btn-action--delete"
                      title="Удалить"
                      @click.stop="deleteTheme(theme)"
                    >
                      <Trash2 :size="15" />
                    </button>
                  </div>
                </div>
              </div>
            </LoadingContentArea>
          </div>
        </section>
      </div>

      <div class="col-12 col-lg-8">
        <section class="theme-editor__section">
          <div class="table-header mb-3">
            <h2 class="admin-section-heading mb-0">
              {{ isNewTheme ? 'Новая тема' : 'Редактирование' }}
            </h2>
            <div class="actions-wrapper">
              <button
                type="button"
                class="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                :disabled="currentTheme.is_system"
                title="Сбросить цвета"
                @click="resetToDefaults"
              >
                <RotateCcw :size="16" />
                <span>Сбросить</span>
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                @click="importTheme"
              >
                <Upload :size="16" />
                <span>Импорт</span>
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                @click="exportTheme"
              >
                <Download :size="16" />
                <span>Экспорт</span>
              </button>
              <button
                type="button"
                class="btn btn-primary d-inline-flex align-items-center gap-2"
                :disabled="saving || currentTheme.is_system"
                @click="saveTheme"
              >
                <Save :size="16" />
                <span>{{ saving ? 'Сохранение...' : 'Сохранить' }}</span>
              </button>
            </div>
          </div>

          <div class="content-card">
            <div class="row g-3 mb-4">
              <div class="col-12 col-md-4">
                <label class="form-label" for="theme-name">Название</label>
                <input
                  id="theme-name"
                  v-model="currentTheme.name"
                  type="text"
                  class="form-control theme-editor__input"
                  :disabled="currentTheme.is_system"
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
                  :disabled="currentTheme.is_system"
                  placeholder="Автор"
                />
              </div>
              <div class="col-12 col-md-4">
                <SelectBox
                  id="theme-base"
                  label="Базовая тема"
                  :model-value="currentTheme.base_theme"
                  :options="BASE_THEME_OPTIONS"
                  :include-all-option="false"
                  :disabled="currentTheme.is_system"
                  fixed-trigger-label-font-size
                  @update:model-value="changeBaseTheme"
                >
                  <template #selected="{ option, label }">
                    <span class="theme-editor__select-option">
                      <component v-if="option?.icon" :is="option.icon" :size="16" />
                      <span>{{ label }}</span>
                    </span>
                  </template>
                  <template #option="{ option, label }">
                    <span class="theme-editor__select-option">
                      <component v-if="option?.icon" :is="option.icon" :size="16" />
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
                  :disabled="currentTheme.is_system"
                  placeholder="Описание темы"
                />
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

            <h3 class="admin-section-heading mb-3">Основные цвета</h3>
            <div class="row">
              <div
                v-for="(desc, key) in colorDescriptions"
                :key="key"
                class="col-12 col-md-6"
              >
                <ColorPicker
                  :label="desc.label"
                  :value="currentTheme.colors[key] || ''"
                  :description="desc.description"
                  :disabled="currentTheme.is_system"
                  @update:value="updateColor(key, $event)"
                />
              </div>
            </div>

            <template v-if="showBootstrapColors">
              <template v-for="(category, categoryKey) in bootstrapCategories" :key="categoryKey">
                <hr class="theme-editor__divider" />
                <h3 class="admin-section-heading mb-3">{{ category.label }}</h3>
                <div class="row">
                  <div
                    v-for="(varConfig, key) in category.variables"
                    :key="key"
                    class="col-12 col-md-6"
                  >
                    <ColorPicker
                      :label="varConfig.label"
                      :value="currentTheme.bootstrap_colors[key] || getDefaultValue(key)"
                      :description="varConfig.variable"
                      :disabled="currentTheme.is_system"
                      @update:value="updateBootstrapColor(key, $event)"
                    />
                  </div>
                </div>
              </template>
            </template>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/core/cms/adp/admin/admin-page.scss';

.theme-editor {
  .admin-section-heading {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-primary-text);
  }

  .content-card--flush {
    padding: 0;
    overflow: hidden;
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
    max-height: 600px;
    overflow-y: auto;
  }

  .theme-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: var(--color-hover-background);
    }

    &.active {
      background-color: color-mix(in srgb, var(--color-accent) 14%, var(--color-primary-background));
      border-left: 3px solid var(--color-accent);
    }

    &.is-active-theme:not(.active) {
      border-left: 3px solid var(--bs-success, #198754);
    }
  }

  .theme-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    overflow: hidden;
    min-width: 0;

    small {
      color: color-mix(in srgb, var(--ui-text) 88%, var(--ui-text-muted));
      font-size: 0.8125rem;
    }
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
    transition: opacity 0.15s ease;
    flex-shrink: 0;

    :deep(.btn-action) {
      color: var(--ui-text);

      &:hover:not(:disabled) {
        color: var(--ui-text);
      }
    }
  }

  .theme-item:hover .theme-actions,
  .theme-item.active .theme-actions {
    opacity: 1;
  }
}
</style>
