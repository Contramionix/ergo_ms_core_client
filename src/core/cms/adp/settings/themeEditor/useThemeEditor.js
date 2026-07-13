import { ref, reactive, computed, onMounted, markRaw } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { confirmAction } from '@/js/utils/confirm.js'
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
} from 'lucide-vue-next'
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

export function useThemeEditor() {
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
  return {
    BASE_THEME_OPTIONS,
    DRAFT_THEME_ID,
    activateTheme,
    active,
    applyThemeToCurrent,
    base,
    blob,
    bootstrapCategories,
    byId,
    byMode,
    categories,
    category,
    changeBaseTheme,
    colorDescriptions,
    colors,
    createEmptyDraft,
    createNewTheme,
    createSystemThemes,
    currentTheme,
    data,
    defaultKey,
    defaults,
    deleteTheme,
    discardDraft,
    displayThemes,
    draft,
    draftTheme,
    duplicateTheme,
    exportTheme,
    fallback,
    file,
    fileInput,
    getDefaultValue,
    handleFileImport,
    importTheme,
    initialTheme,
    isDraftSelected,
    isNewTheme,
    link,
    loadThemes,
    loading,
    mode,
    ok,
    pickInitialTheme,
    res,
    resetSystemTheme,
    resetTheme,
    resetToDefaults,
    resettingThemeId,
    saveTheme,
    saved,
    savedId,
    savedTheme,
    saving,
    selectTheme,
    selectedThemeId,
    showBootstrapColors,
    snapshotTheme,
    source,
    syncCurrentToDraft,
    themes,
    toast,
    updateBootstrapColor,
    updateColor,
    uploadResult,
    url,
    wasSelected,
  }
}
