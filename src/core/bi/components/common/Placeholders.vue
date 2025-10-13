<template>
  <div class="placeholder-container" :class="type">
    <div class="placeholder-content">
      <div class="placeholder-icon" :class="{ 'loading-spinner': type === 'loading' }">
        <component :is="iconComponent" :width="48" :height="48" />
      </div>
      <h3 class="placeholder-title">{{ title }}</h3>
      <p class="placeholder-description">{{ description }}</p>
      
      <!-- Кнопки действий -->
      <div v-if="actions && actions.length > 0" class="placeholder-actions">
        <button 
          v-for="action in actions" 
          :key="action.key"
          :class="['btn', action.variant || 'btn-primary']"
          @click="action.onClick"
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { 
  AlertTriangle, 
  FileText, 
  Loader2, 
  Database, 
  Search,
  AlertCircle,
  Info
} from 'lucide-vue-next'

const props = defineProps({
  // Тип плейсхолдера
  type: {
    type: String,
    default: 'empty',
    validator: (value) => [
      'empty',           // Пустое состояние
      'loading',         // Загрузка
      'error',           // Ошибка
      'connection-error', // Ошибка подключения
      'no-data',         // Нет данных
      'search',          // Поиск
      'info'             // Информация
    ].includes(value)
  },
  
  // Заголовок
  title: {
    type: String,
    default: ''
  },
  
  // Описание
  description: {
    type: String,
    default: ''
  },
  
  // Действия (кнопки)
  actions: {
    type: Array,
    default: () => []
  },
  
  // Кастомная иконка (опционально)
  customIcon: {
    type: String,
    default: null
  }
})

// Вычисляемое свойство для иконки
const iconComponent = computed(() => {
  if (props.customIcon) {
    return props.customIcon
  }
  
  const iconMap = {
    'empty': FileText,
    'loading': Loader2,
    'error': AlertCircle,
    'connection-error': AlertTriangle,
    'no-data': Database,
    'search': Search,
    'info': Info
  }
  
  return iconMap[props.type] || FileText
})

// Предустановленные конфигурации для разных типов
const defaultConfigs = {
  'empty': {
    title: 'Данные не найдены',
    description: 'В данном разделе пока нет данных. Добавьте первую запись для начала работы.',
    actions: [
      {
        key: 'add',
        label: 'Добавить',
        variant: 'btn-primary',
        onClick: () => emit('action', 'add')
      }
    ]
  },
  'loading': {
    title: 'Загрузка...',
    description: 'Пожалуйста, подождите, загружаем данные.',
    actions: []
  },
  'error': {
    title: 'Произошла ошибка',
    description: 'Не удалось загрузить данные. Попробуйте обновить страницу или обратитесь к администратору.',
    actions: [
      {
        key: 'retry',
        label: 'Повторить',
        variant: 'btn-primary',
        onClick: () => emit('action', 'retry')
      }
    ]
  },
  'connection-error': {
    title: 'Проблемы с подключением',
    description: 'Не удается подключиться к источнику данных. Проверьте настройки подключения и попробуйте снова.',
    actions: [
      {
        key: 'retry',
        label: 'Повторить попытку',
        variant: 'btn-primary',
        onClick: () => emit('action', 'retry')
      }
    ]
  },
  'no-data': {
    title: 'Нет данных',
    description: 'По вашему запросу ничего не найдено. Попробуйте изменить параметры поиска.',
    actions: []
  },
  'search': {
    title: 'Начните поиск',
    description: 'Введите поисковый запрос в поле выше, чтобы найти нужные данные.',
    actions: []
  },
  'info': {
    title: 'Информация',
    description: 'Здесь будет отображаться полезная информация о данном разделе.',
    actions: []
  }
}

// Вычисляемое свойство для заголовка
const computedTitle = computed(() => {
  return props.title || defaultConfigs[props.type]?.title || ''
})

// Вычисляемое свойство для описания
const computedDescription = computed(() => {
  return props.description || defaultConfigs[props.type]?.description || ''
})

// Вычисляемое свойство для действий
const computedActions = computed(() => {
  if (props.actions && props.actions.length > 0) {
    return props.actions
  }
  return defaultConfigs[props.type]?.actions || []
})

const emit = defineEmits(['action'])
</script>

<style scoped lang="scss">
.placeholder-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  height: 100%;
  width: 100%;
  padding: 2rem;
  text-align: center;
}

.placeholder-content {
  max-width: 400px;
}

.placeholder-icon {
  margin: 0 auto 1.5rem;
  color: var(--color-text-secondary);
  
  &.loading-spinner {
    animation: spin 1s linear infinite;
  }
}

.placeholder-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--color-text-primary);
}

.placeholder-description {
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
  color: var(--color-text-secondary);
}

.placeholder-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* Стили для разных типов */
.connection-error .placeholder-icon,
.error .placeholder-icon {
  color: var(--color-danger);
}

.connection-error .placeholder-title,
.error .placeholder-title {
  color: var(--color-danger);
}

.empty .placeholder-icon,
.no-data .placeholder-icon {
  color: var(--color-text-tertiary);
}

.loading .placeholder-icon {
  color: var(--color-primary);
}

.search .placeholder-icon {
  color: var(--color-info);
}

.info .placeholder-icon {
  color: var(--color-info);
}

/* Анимация загрузки */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Адаптивность */
@media (max-width: 768px) {
  .placeholder-container {
    padding: 1rem;
    min-height: 250px;
    height: 100%;
  }
  
  .placeholder-content {
    max-width: 100%;
  }
  
  .placeholder-title {
    font-size: 1.125rem;
  }
  
  .placeholder-description {
    font-size: 0.8125rem;
  }
  
  .placeholder-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .placeholder-actions .btn {
    width: 100%;
    max-width: 200px;
  }
}

/* Стили для кнопок */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.btn-primary {
  color: white;
}

.btn-secondary {
  background: var(--color-secondary);
  color: white;
  
  &:hover {
    background: var(--color-secondary-dark);
  }
}

.btn-outline {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  
  &:hover {
    background: var(--color-primary);
    color: white;
  }
}
</style>
