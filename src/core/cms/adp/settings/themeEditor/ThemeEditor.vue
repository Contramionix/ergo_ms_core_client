<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { 
  Save, Download, Upload, RotateCcw, Plus, Copy, Trash2, 
  Check, Palette, Sun, Moon, Settings2
} from 'lucide-vue-next'
import ColorPicker from './ColorPicker.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { logError } from '@/js/utils/logError.js'
import { 
  getDefaultColors, 
  getColorDescriptions,
  getBootstrapByCategories,
  previewTheme,
  applyTheme,
  resetToInitialTheme
} from '@/js/theme-manager'

const toast = useToast()

// Состояние
const themes = ref([])
const selectedThemeId = ref(null)
const loading = ref(false)
const saving = ref(false)
const showBootstrapColors = ref(false)
const fileInput = ref(null)

// Диалог подтверждения
const showConfirmDialog = ref(false)
const confirmDialogConfig = ref({
  title: '',
  message: '',
  confirmText: 'Удалить',
  cancelText: 'Отмена'
})
const pendingDeleteTheme = ref(null)

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
const isNewTheme = computed(() => !currentTheme.id)

// Загрузка списка тем
const loadThemes = async () => {
  loading.value = true
  try {
    const res = await apiClient.get(endpoints.themes.list)
    if (res.success) {
      themes.value = res.data || []
      
      // Если нет тем, создаем системные
      if (themes.value.length === 0) {
        await createSystemThemes()
      }
      
      // Выбираем активную или первую тему
      const activeTheme = themes.value.find(t => t.is_active) || themes.value[0]
      if (activeTheme) {
        selectTheme(activeTheme)
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

// Сброс системных тем к начальным значениям
const resetSystemThemes = async () => {
  try {
    const res = await apiClient.post(endpoints.themes.createSystemThemes)
    if (res.success) {
      toast.success('Системные темы сброшены к начальным значениям')
      await loadThemes()
    } else {
      toast.error(res.message || 'Ошибка сброса тем')
    }
  } catch (e) {
    logError('Ошибка сброса тем:', e)
    toast.error('Ошибка сброса системных тем')
  }
}

// Выбор темы для редактирования
const selectTheme = (theme) => {
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
    bootstrap_colors: {},  // Игнорируем bootstrap_colors из БД
    is_active: theme.is_active,
    is_default: theme.is_default,
    is_system: theme.is_system
  })
  
  // Применяем превью темы
  previewTheme({
    base_theme: currentTheme.base_theme,
    colors: { ...currentTheme.colors },
    bootstrap_colors: {}
  })
}

// Создание новой темы
const createNewTheme = () => {
  const baseTheme = 'light'
  Object.assign(currentTheme, {
    id: null,
    name: 'Новая тема',
    description: '',
    author: '',
    base_theme: baseTheme,
    colors: { ...getDefaultColors(baseTheme) },
    bootstrap_colors: {},  // Начинаем без переопределений Bootstrap
    is_active: false,
    is_default: false,
    is_system: false
  })
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
    bootstrap_colors: {}
  })
}

// Обновление цвета
const updateColor = (key, value) => {
  currentTheme.colors[key] = value
  // Передаём копию объекта для previewTheme
  previewTheme({
    base_theme: currentTheme.base_theme,
    colors: { ...currentTheme.colors },
    bootstrap_colors: {}
  })
}

// Обновление Bootstrap цвета (сейчас не используется, но оставим для будущего)
const updateBootstrapColor = (key, value) => {
  currentTheme.bootstrap_colors[key] = value
  // Bootstrap переменные пока игнорируются
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

// Сброс к начальным значениям из _theme.scss
const resetToDefaults = () => {
  const base = currentTheme.base_theme
  
  // Сброс к начальным значениям
  currentTheme.colors = { ...getDefaultColors(base) }
  currentTheme.bootstrap_colors = {}  // Bootstrap переменные сбрасываются
  
  // Применяем сброс
  resetToInitialTheme(base)
  
  // Обновляем отображение
  Object.assign(currentTheme, {
    colors: { ...getDefaultColors(base) },
    bootstrap_colors: {}
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
    if (currentTheme.id) {
      res = await apiClient.put(endpoints.themes.update(currentTheme.id), data)
    } else {
      res = await apiClient.post(endpoints.themes.create, data)
    }
    
    if (res.success) {
      toast.success('Тема сохранена')
      await loadThemes()
      
      // Выбираем сохраненную тему
      const savedTheme = themes.value.find(t => t.name === data.name)
      if (savedTheme) {
        selectTheme(savedTheme)
        
        // Если тема активна - сохраняем в localStorage
        if (savedTheme.is_active) {
          applyTheme({
            base_theme: savedTheme.base_theme,
            colors: savedTheme.colors || {},
            bootstrap_colors: {}
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
        bootstrap_colors: {}
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

// Удаление темы - показать диалог
const deleteTheme = (theme) => {
  if (theme.is_system) {
    toast.error('Нельзя удалить системную тему')
    return
  }
  
  pendingDeleteTheme.value = theme
  confirmDialogConfig.value = {
    title: 'Удаление темы',
    message: `Вы уверены, что хотите удалить тему "${theme.name}"?`,
    confirmText: 'Удалить',
    cancelText: 'Отмена'
  }
  showConfirmDialog.value = true
}

// Подтверждение удаления
const confirmDelete = async () => {
  const theme = pendingDeleteTheme.value
  if (!theme) return
  
  try {
    const res = await apiClient.delete(endpoints.themes.delete(theme.id))
    if (res.success) {
      toast.success('Тема удалена')
      await loadThemes()
    }
  } catch {
    toast.error('Ошибка удаления темы')
  } finally {
    showConfirmDialog.value = false
    pendingDeleteTheme.value = null
  }
}

// Отмена удаления
const cancelDelete = () => {
  showConfirmDialog.value = false
  pendingDeleteTheme.value = null
}

// Экспорт темы
const exportTheme = async () => {
  if (!currentTheme.id) {
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
  
  // Экспорт сохраненной темы через API
  window.open(`/api/${endpoints.themes.export(currentTheme.id)}`, '_blank')
  toast.success('Тема экспортирована')
}

// Импорт темы
const importTheme = () => {
  fileInput.value?.click()
}

const handleFileImport = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    const res = await apiClient.uploadFile(endpoints.themes.import, formData)
    
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

// Загрузка при монтировании
onMounted(() => {
  loadThemes()
})

// При выходе из редактора - ничего не сбрасываем, активная тема сохранена в localStorage
</script>

<template>
  <div class="theme-editor">
    <!-- Скрытый input для импорта -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileImport"
    />
    
    <!-- Диалог подтверждения удаления -->
    <ConfirmDialog
      :show="showConfirmDialog"
      :title="confirmDialogConfig.title"
      :message="confirmDialogConfig.message"
      :confirm-text="confirmDialogConfig.confirmText"
      :cancel-text="confirmDialogConfig.cancelText"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
      @close="cancelDelete"
    />
    
    <div class="row g-4">
      <!-- Левая панель: список тем -->
      <div class="col-12 col-lg-4">
        <div class="card rounded-3 shadow-sm h-100">
          <div class="card-header bg-white border-bottom d-flex align-items-center justify-content-between">
            <h5 class="mb-0 d-flex align-items-center">
              <Palette :size="20" class="me-2 text-primary" />
              Темы
            </h5>
            <div class="d-flex gap-2">
              <button 
                class="btn btn-sm btn-outline-secondary" 
                @click="resetSystemThemes"
                title="Сбросить системные темы к начальным значениям"
              >
                <RotateCcw :size="16" />
              </button>
              <button class="btn btn-sm btn-primary" @click="createNewTheme">
                <Plus :size="16" class="me-1" />
                Новая
              </button>
            </div>
          </div>
          
          <div class="card-body p-0">
            <div v-if="loading" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary"></div>
            </div>
            
            <div v-else class="theme-list">
              <div
                v-for="theme in themes"
                :key="theme.id"
                class="theme-item"
                :class="{ 
                  active: selectedThemeId === theme.id,
                  'is-active-theme': theme.is_active
                }"
                @click="selectTheme(theme)"
              >
                <div class="theme-info">
                  <div class="d-flex align-items-center gap-2">
                    <component 
                      :is="theme.base_theme === 'dark' ? Moon : Sun" 
                      :size="16" 
                      class="theme-icon"
                    />
                    <span class="theme-name">{{ theme.name }}</span>
                    <span v-if="theme.is_system" class="badge bg-secondary">Системная</span>
                    <span v-if="theme.is_active" class="badge bg-success">Активна</span>
                  </div>
                  <small class="text-muted">{{ theme.description || 'Без описания' }}</small>
                </div>
                
                <div class="theme-actions">
                  <button
                    v-if="!theme.is_active"
                    class="btn btn-sm btn-outline-success"
                    @click.stop="activateTheme(theme)"
                    title="Активировать"
                  >
                    <Check :size="14" />
                  </button>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click.stop="duplicateTheme(theme)"
                    title="Дублировать"
                  >
                    <Copy :size="14" />
                  </button>
                  <button
                    v-if="!theme.is_system"
                    class="btn btn-sm btn-outline-danger"
                    @click.stop="deleteTheme(theme)"
                    title="Удалить"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Правая панель: редактор -->
      <div class="col-12 col-lg-8">
        <div class="card rounded-3 shadow-sm">
          <div class="card-header bg-white border-bottom">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <h5 class="mb-0 d-flex align-items-center">
                <Settings2 :size="20" class="me-2 text-primary" />
                {{ isNewTheme ? 'Новая тема' : 'Редактирование' }}
              </h5>
              
              <div class="d-flex gap-2 flex-wrap">
                <button
                  class="btn btn-sm btn-outline-secondary"
                  @click="resetToDefaults"
                  :disabled="currentTheme.is_system"
                  title="Сбросить цвета"
                >
                  <RotateCcw :size="16" class="me-1" />
                  Сбросить
                </button>
                <button class="btn btn-sm btn-outline-primary" @click="importTheme">
                  <Upload :size="16" class="me-1" />
                  Импорт
                </button>
                <button class="btn btn-sm btn-outline-primary" @click="exportTheme">
                  <Download :size="16" class="me-1" />
                  Экспорт
                </button>
                <button
                  class="btn btn-sm btn-primary"
                  @click="saveTheme"
                  :disabled="saving || currentTheme.is_system"
                >
                  <Save :size="16" class="me-1" />
                  {{ saving ? 'Сохранение...' : 'Сохранить' }}
                </button>
              </div>
            </div>
          </div>
          
          <div class="card-body">
            <!-- Информация о теме -->
            <div class="row g-3 mb-4">
              <div class="col-12 col-md-4">
                <label class="form-label">Название</label>
                <input
                  v-model="currentTheme.name"
                  type="text"
                  class="form-control"
                  :disabled="currentTheme.is_system"
                  placeholder="Название темы"
                />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">Автор</label>
                <input
                  v-model="currentTheme.author"
                  type="text"
                  class="form-control"
                  :disabled="currentTheme.is_system"
                  placeholder="Автор"
                />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label">Базовая тема</label>
                <div class="btn-group w-100">
                  <button
                    type="button"
                    class="btn"
                    :class="currentTheme.base_theme === 'light' ? 'btn-primary' : 'btn-outline-secondary'"
                    @click="changeBaseTheme('light')"
                    :disabled="currentTheme.is_system"
                  >
                    <Sun :size="16" class="me-1" />
                    Светлая
                  </button>
                  <button
                    type="button"
                    class="btn"
                    :class="currentTheme.base_theme === 'dark' ? 'btn-primary' : 'btn-outline-secondary'"
                    @click="changeBaseTheme('dark')"
                    :disabled="currentTheme.is_system"
                  >
                    <Moon :size="16" class="me-1" />
                    Тёмная
                  </button>
                </div>
              </div>
              <div class="col-12">
                <label class="form-label">Описание</label>
                <input
                  v-model="currentTheme.description"
                  type="text"
                  class="form-control"
                  :disabled="currentTheme.is_system"
                  placeholder="Описание темы"
                />
              </div>
            </div>
            
            <!-- Переключатель расширенных настроек -->
            <div class="form-check form-switch mb-4">
              <input
                class="form-check-input"
                type="checkbox"
                id="showBootstrap"
                v-model="showBootstrapColors"
              />
              <label class="form-check-label" for="showBootstrap">
                Показать Bootstrap переменные
              </label>
            </div>
            
            <!-- Основные цвета -->
            <h6 class="mb-3">Основные цвета</h6>
            <div class="row">
              <div 
                class="col-12 col-md-6" 
                v-for="(desc, key) in colorDescriptions" 
                :key="key"
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
            
            <!-- Bootstrap цвета по категориям -->
            <template v-if="showBootstrapColors">
              <template v-for="(category, categoryKey) in bootstrapCategories" :key="categoryKey">
                <hr class="my-4" />
                <h6 class="mb-3 d-flex align-items-center">
                  <span class="text-primary me-2">●</span>
                  {{ category.label }}
                </h6>
                <div class="row">
                  <div 
                    class="col-12 col-md-6" 
                    v-for="(varConfig, key) in category.variables" 
                    :key="key"
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
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.theme-editor {
  .theme-list {
    max-height: 600px;
    overflow-y: auto;
  }
  
  .theme-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border, #e0e0e0);
    cursor: pointer;
    transition: background-color 0.2s;
    
    &:hover {
      background-color: var(--color-hover-background, #e1e1e1);
    }
    
    &.active {
      background-color: var(--bs-primary-bg-subtle, #cfe2ff);
      border-left: 3px solid var(--bs-primary, #0d6efd);
    }
    
    &.is-active-theme {
      border-left: 3px solid var(--bs-success, #198754);
    }
  }
  
  .theme-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    overflow: hidden;
  }
  
  .theme-name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .theme-icon {
    flex-shrink: 0;
    color: var(--color-secondary-text, #6e6e6e);
  }
  
  .theme-actions {
    display: flex;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .theme-item:hover .theme-actions {
    opacity: 1;
  }
  
  .badge {
    font-size: 0.65rem;
    font-weight: 500;
  }
}
</style>
