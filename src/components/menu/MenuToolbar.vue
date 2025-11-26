<template>
  <div class="menu-toolbar">
    <div id="menu-toolbar-content" class="tools" :class="{ collapsed: isCollapsed && !isHovering }">
      <div class="toolbar__user" :class="{ collapsed: isCollapsed && !isHovering }">
        <div class="tools__user__avatar">
          <UserMenu @dropdown-toggle="(active) => setDropdownActive('userMenu', active)" />
        </div>
        <div class="tools__user__name" v-if="shouldShowFullInfo">
          <div class="user__fullname" :title="getFullUserName()">{{ userFullName }}</div>
          <div class="user__description">В сети</div>
        </div>
      </div>
      <div class="tools-buttons" v-if="shouldShowFullInfo">
        <div class="tools__assistant" @click="toggleAssistant">
          <div
            class="header-btn assistant-btn"
            :class="{ active: isAssistantVisible }"
            v-tooltip
            title="AI Ассистент"
          >
            <Bot :size="24" />
          </div>
        </div>
        <div class="tools__theme">
          <ToggleTheme @dropdown-toggle="(active) => setDropdownActive('theme', active)" />
        </div>
        <div class="tools__notifications">
          <UserNotifications @dropdown-toggle="(active) => setDropdownActive('notifications', active)" />
        </div>
      </div>
    </div>

    <component
      v-if="currentModuleComponent"
      :is="currentModuleComponent"
      ref="assistantChat"
      :is-visible="isAssistantVisible"
      @bi-query="handleBIQuery"
      @chat-message="handleChatMessage"
    />
  </div>
</template>

<script setup>
import { Bot } from 'lucide-vue-next'
import UserMenu from '@/components/header/UserMenu.vue'
import ToggleTheme from '@/components/header/ToggleTheme.vue'
import UserNotifications from '@/components/header/UserNotifications.vue'
import { assistantModuleManager } from '@/core/ai-assistant/core/AssistantModuleManager.js'
import { assistantService } from '@/core/ai-assistant/js/assistantService.js'
import { computed, ref, onMounted, watch, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/core/cms/js/userStore.js'

const props = defineProps({
  isCollapsed: {
    type: Boolean,
    default: false,
  },
  isHovering: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['dropdown-state-change'])

const userStore = useUserStore()
const route = useRoute()
const isAssistantVisible = ref(false)
const assistantChat = ref(null)
const currentModuleComponent = shallowRef(null)
const currentModuleClient = ref(null)
const currentModuleConfig = ref(null)

// Состояние для отслеживания активных выпадающих элементов
const activeDropdowns = ref(new Set())

// Загрузка модуля для текущего роута
const loadModuleForRoute = async (routePath) => {
  try {
    const module = await assistantModuleManager.loadModuleForRoute(routePath)
    if (module) {
      currentModuleComponent.value = module.component
      currentModuleClient.value = module.client
      currentModuleConfig.value = module.config
      
      // Передаем настройки Ollama в клиент, если они есть
      if (module.config.ollama && currentModuleClient.value && typeof currentModuleClient.value.setOllamaConfig === 'function') {
        currentModuleClient.value.setOllamaConfig(module.config.ollama)
      }
    } else {
      console.warn('AI Assistant: Module not found for route:', routePath)
      currentModuleComponent.value = null
      currentModuleClient.value = null
      currentModuleConfig.value = null
    }
  } catch (error) {
    console.error('Ошибка загрузки модуля ассистента:', error)
    currentModuleComponent.value = null
    currentModuleClient.value = null
    currentModuleConfig.value = null
  }
}

// Загрузка модуля при изменении роута
watch(
  () => route.path,
  async (newPath) => {
    await loadModuleForRoute(newPath)
  },
  { immediate: true }
)

const shouldShowFullInfo = computed(() => {
  return !props.isCollapsed || props.isHovering
})

// Функции для управления состоянием выпадающих элементов
const setDropdownActive = (dropdownId, active) => {
  if (active) {
    activeDropdowns.value.add(dropdownId)
  } else {
    activeDropdowns.value.delete(dropdownId)
  }
  
  // Уведомляем родительский компонент об изменении состояния
  emit('dropdown-state-change', activeDropdowns.value.size > 0)
}


// Функция для обрезки текста до определенного количества символов
const truncateText = (text, maxLength = 30) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Функция для получения полного имени пользователя без обрезки
const getFullUserName = () => {
  if (!userStore.user) return 'Гость'

  if (userStore.displayName === 'Гость') return 'Гость'

  const firstName = userStore.user.first_name?.trim()
  const lastName = userStore.user.last_name?.trim()

  const cleanFirstName = firstName === ' ' ? '' : firstName
  const cleanLastName = lastName === ' ' ? '' : lastName

  if (cleanFirstName && cleanLastName) {
    return `${cleanFirstName} ${cleanLastName}`
  }

  if (cleanFirstName) {
    return cleanFirstName
  }

  if (cleanLastName) {
    return cleanLastName
  }

  return 'Гость'
}

const userFullName = computed(() => {
  if (!userStore.user) return 'Гость'

  if (userStore.displayName === 'Гость') return 'Гость'

  const firstName = userStore.user.first_name?.trim()
  const lastName = userStore.user.last_name?.trim()

  const cleanFirstName = firstName === ' ' ? '' : firstName
  const cleanLastName = lastName === ' ' ? '' : lastName

  let fullName = ''

  if (cleanFirstName && cleanLastName) {
    fullName = `${cleanFirstName} ${cleanLastName}`
  } else if (cleanFirstName) {
    fullName = cleanFirstName
  } else if (cleanLastName) {
    fullName = cleanLastName
  } else {
    return 'Гость'
  }

  // Ограничиваем длину имени до 30 символов
  return truncateText(fullName, 30)
})

const toggleAssistant = () => {
  isAssistantVisible.value = !isAssistantVisible.value
}

// Регистрируем функции в глобальном сервисе
onMounted(async () => {
  await loadModuleForRoute(route.path)
  
  assistantService.registerOpenChat(() => {
    isAssistantVisible.value = true
  })
  assistantService.registerAnalyzeChart(handleChartAnalysis)
})

// Счетчик для уникальных ID streaming сообщений
let streamingMessageIdCounter = 20000

const handleBIQuery = async ({ fileId, question }) => {
  if (!currentModuleClient.value) {
    console.error('BI клиент не загружен')
    return
  }
  console.log('BI Query from toolbar:', { fileId, question })

  let currentMessage = ''
  let sqlQuery = ''
  let stageMessage = ''
  let tableData = null

  const messageId = streamingMessageIdCounter++

  try {
    // Используем streaming запрос через текущий клиент модуля
    // Передаем настройки Ollama из конфига модуля
    const ollamaConfig = currentModuleConfig.value?.ollama || null
    await currentModuleClient.value.askQuestionStream(fileId, question, true, ollamaConfig, (event) => {
      console.log('Streaming event:', event)

      switch (event.type) {
        case 'start':
        case 'stage':
          stageMessage = event.message || event.text || ''
          assistantChat.value?.updateStreamingMessage(messageId, {
            stage: stageMessage,
            sql: sqlQuery,
            content: currentMessage,
            data: tableData,
          })
          break

        case 'sql_generation':
          currentMessage += event.text || ''
          assistantChat.value?.updateStreamingMessage(messageId, {
            stage: stageMessage,
            sqlGenerating: currentMessage,
            data: tableData,
          })
          break

        case 'sql':
          sqlQuery = event.text || ''
          currentMessage = ''
          assistantChat.value?.updateStreamingMessage(messageId, {
            stage: stageMessage,
            sql: sqlQuery,
            sqlGenerating: null,  // Очищаем - кружок "Генерация SQL" останавливается
            content: currentMessage,
            data: tableData,
          })
          break

        case 'commentary':
          currentMessage += event.text || ''
          assistantChat.value?.updateStreamingMessage(messageId, {
            stage: stageMessage,
            sql: sqlQuery,
            sqlGenerating: null,  // Очищаем генерацию SQL
            content: currentMessage,
            data: tableData,
          })
          break

        case 'complete':
          tableData = {
            rows: event.rows,
            columns: event.columns,
            data: event.data,
          }
          assistantChat.value?.updateStreamingMessage(messageId, {
            sql: event.sql || sqlQuery,
            sqlGenerating: null,  // Очищаем генерацию SQL
            content: currentMessage,
            data: tableData,
            completed: true,
            streaming: false,
            stage: '',  // Очищаем стадию
          })
          break

        case 'error':
          assistantChat.value?.updateStreamingMessage(messageId, {
            error: event.message || event.text,
            sqlGenerating: null,  // Очищаем генерацию SQL
            completed: true,
            streaming: false,
            stage: '',  // Очищаем стадию
          })
          break

        case 'done':
          assistantChat.value?.finalizeStreamingMessage(messageId)
          break
      }
    })
    
    // Финализируем на всякий случай после завершения streaming
    assistantChat.value?.finalizeStreamingMessage(messageId)
  } catch (error) {
    console.error('Error processing BI query:', error)
    // Останавливаем кружок при ошибке
    assistantChat.value?.finalizeStreamingMessage(messageId)
    if (assistantChat.value) {
      assistantChat.value.addAssistantMessage(
        `❌ **Ошибка подключения к BI Assistant:**\n\n${error.message}\n\nУбедитесь, что Ollama запущен и доступен.`
      )
    }
  }
}

const handleChatMessage = async ({ message }) => {
  // Обработка сообщений для RAG модуля (если нужно)
  console.log('Chat message:', message)
}

const handleChartAnalysis = async (chartId) => {
  if (!currentModuleClient.value || !currentModuleClient.value.analyzeChart) {
    console.warn('Анализ графиков доступен только в BI модуле')
    return
  }

  console.log('Chart Analysis from toolbar:', { chartId })

  let currentMessage = ''
  let sqlQuery = ''
  let stageMessage = ''
  let tableData = null

  const messageId = streamingMessageIdCounter++

  try {
    // Используем streaming запрос для анализа графика
    await currentModuleClient.value.analyzeChart(chartId, (event) => {
      console.log('Chart analysis event:', event)

      switch (event.type) {
        case 'start':
        case 'stage':
          stageMessage = event.message || event.text || ''
          assistantChat.value?.updateStreamingMessage(messageId, {
            stage: stageMessage,
            sql: sqlQuery,
            content: currentMessage,
            data: tableData,
          })
          break

        case 'sql_generation':
          currentMessage += event.text || ''
          assistantChat.value?.updateStreamingMessage(messageId, {
            stage: stageMessage,
            sqlGenerating: currentMessage,
            data: tableData,
          })
          break

        case 'sql':
          sqlQuery = event.text || ''
          currentMessage = ''
          assistantChat.value?.updateStreamingMessage(messageId, {
            stage: stageMessage,
            sql: sqlQuery,
            sqlGenerating: null,  // Очищаем - кружок останавливается
            content: currentMessage,
            data: tableData,
          })
          break

        case 'commentary':
          currentMessage += event.text || ''
          assistantChat.value?.updateStreamingMessage(messageId, {
            stage: stageMessage,
            sql: sqlQuery,
            sqlGenerating: null,  // Очищаем генерацию SQL
            content: currentMessage,
            data: tableData,
          })
          break

        case 'complete':
          tableData = {
            rows: event.rows,
            columns: event.columns,
            data: event.data,
          }
          assistantChat.value?.updateStreamingMessage(messageId, {
            sql: event.sql || sqlQuery,
            sqlGenerating: null,  // Очищаем генерацию SQL
            content: currentMessage,
            data: tableData,
            completed: true,
            streaming: false,
            stage: '',  // Очищаем стадию
          })
          break

        case 'error':
          assistantChat.value?.updateStreamingMessage(messageId, {
            error: event.message || event.text,
            sqlGenerating: null,  // Очищаем генерацию SQL
            completed: true,
            streaming: false,
            stage: '',  // Очищаем стадию
          })
          break

        case 'done':
          assistantChat.value?.finalizeStreamingMessage(messageId)
          break
      }
    })
    
    // Финализируем на всякий случай после завершения streaming
    assistantChat.value?.finalizeStreamingMessage(messageId)
  } catch (error) {
    console.error('Error analyzing chart:', error)
    // Останавливаем кружок при ошибке
    assistantChat.value?.finalizeStreamingMessage(messageId)
    if (assistantChat.value) {
      assistantChat.value.addAssistantMessage(
        `❌ **Ошибка анализа графика:**\n\n${error.message}\n\nУбедитесь, что Ollama запущен и доступен.`
      )
    }
  }
}
</script>

<style scoped lang="scss">
@media (width >= 1200px) {
  .header__menu {
    display: none;
  }
}

.menu-toolbar {
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: var(--color-secondary-background);
  margin: 3%;
  width: auto;
  height: auto;
  padding: 10px;
  border-radius: 10px;

  .tools {
    display: flex;
    justify-content: space-between;
    width: 100%;

    &.collapsed {
      justify-content: center;
    }
  }
}

.toolbar__user {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;

  &.collapsed {
    justify-content: center;
    gap: 0;
  }
}

.tools__user__name {
  display: flex;
  flex-direction: column;
  min-width: 0; // Позволяет flex элементам сжиматься
  overflow: hidden;
}

.user__fullname {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.tools-buttons {
  display: flex;
  gap: 2px;
  justify-content: center;
  align-items: center;
}

.tools__assistant {
  .assistant-btn {
    color: var(--color-primary-text);
    border-radius: 0.5rem;

    &:hover {
      background-color: var(--color-hover-background);
      color: var(--color-accent);
    }

    &.active {
      background-color: var(--bs-primary-bg-subtle);
      color: var(--bs-primary);

      &:hover {
        background-color: var(--bs-primary-border-subtle);
      }
    }
  }
}

.user__description {
  font-size: 12px;
  color: var(--color-secondary-text);
}

.search {
  @include flex-row-gap($padding-internal, center);
  width: 50%;

  input {
    border: none;
    outline: none;
    width: 100%;
  }
}

.tools {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.tools__user__avatar {
  cursor: pointer;
  background-color: grey;
  border-radius: 50%;

  position: relative;

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 3px;
    width: 8px;
    height: 8px;
    border-radius: 100%;
    box-shadow: 0 0 0 2px var(--color-primary-background);
    background-color: #4caf50;
  }
}
</style>

<style lang="scss">
.header-btn {
  padding: 7px 8px;
  border-radius: 100%;
  cursor: pointer;
  transition: background-color $transition;

  &:hover {
    background-color: var(--color-secondary-background);
  }
}

.header-dropdown-item {
  @include flex-row-gap(12px, center);
  transition: all $transition;
  padding: $padding-internal $padding-external;
  cursor: pointer;
}

.header-dropdown-center .header-dropdown-menu {
  inset: 0 auto auto 0;
  transform: translate3d(-60px, 60.6px, 0px);
}
</style>
