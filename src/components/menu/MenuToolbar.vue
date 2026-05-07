<template>
  <div class="menu-toolbar">
    <div id="menu-toolbar-content" class="tools" :class="{ collapsed: isCollapsed && !isHovering }">
      <div class="toolbar__user" :class="{ collapsed: isCollapsed && !isHovering }">
        <div class="tools__user__avatar">
          <UserMenu ref="userMenuRef" @dropdown-toggle="(active) => setDropdownActive('userMenu', active)" />
        </div>
        <div class="tools__user__name" v-if="shouldShowFullInfo">
          <div class="user__fullname" :title="getFullUserName()">{{ userFullName }}</div>
        </div>
      </div>
      <div class="tools-buttons" v-if="shouldShowFullInfo">
        <div class="tools__notifications">
          <SidebarNotifications
            v-if="actionButton === 'notifications'"
            ref="notificationsMenuRef"
            @dropdown-toggle="(active) => setDropdownActive('notifications', active)"
          />
          <AppsMenu
            v-else
            ref="appsMenuRef"
            @dropdown-toggle="(active) => setDropdownActive('apps', active)"
          />
        </div>
        <div v-if="isAssistantAvailable" class="tools__assistant" @click="toggleAssistant">
          <div class="header-btn assistant-btn" :class="{ active: isAssistantVisible }" v-tooltip title="AI Ассистент">
            <Bot :size="20" />
          </div>
        </div>
        <div class="tools__settings">
          <SettingsMenu
            ref="settingsMenuRef"
            @dropdown-toggle="(active) => setDropdownActive('settings', active)"
            @open-user-settings="showUserSettingsModal = true"
          />
        </div>
      </div>
    </div>

    <UserSettingsModal :show="showUserSettingsModal" @close="showUserSettingsModal = false" />

    <component v-if="isAssistantAvailable && currentModuleComponent && shouldShowFullInfo" :is="currentModuleComponent" ref="assistantChat" :is-visible="isAssistantVisible" @bi-query="handleBIQuery" @chat-message="handleChatMessage"/>
  </div>
</template>

<script setup>
import { Bot } from 'lucide-vue-next'
import UserMenu from '@/components/header/UserMenu.vue'
import SidebarNotifications from '@/components/menu/SidebarNotifications.vue'
import AppsMenu from '@/components/menu/AppsMenu.vue'
import SettingsMenu from '@/components/menu/SettingsMenu.vue'
import UserSettingsModal from '@/core/cms/adp/user/account/component/UserSettingsModal.vue'
import { computed, ref, onMounted, watch, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { useUiSettings, initUserSettings } from '@/core/cms/js/uiSettings.js'
import { useToast } from 'vue-toastification'

const _aiGlob = {
  manager: import.meta.glob('@/modules/ai_assistant/client/core/AssistantModuleManager.js'),
  service: import.meta.glob('@/modules/ai_assistant/client/js/assistantService.js'),
}

const toast = useToast()

let assistantModuleManager = null
let assistantService = null
const isAssistantAvailable = ref(false)

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
const wasAssistantVisibleBeforeCollapse = ref(false) // Сохраняем состояние перед сворачиванием
const assistantChat = ref(null)
const currentModuleComponent = shallowRef(null)
const currentModuleClient = ref(null)
const currentModuleConfig = ref(null)
const userMenuRef = ref(null)
const notificationsMenuRef = ref(null)
const appsMenuRef = ref(null)
const settingsMenuRef = ref(null)
const showUserSettingsModal = ref(false)

const { actionButton } = useUiSettings()

watch(
  () => userStore.user?.id,
  (userId) => initUserSettings(userId ?? null),
  { immediate: true },
)

// Состояние для отслеживания активных выпадающих элементов
const activeDropdowns = ref(new Set())

// Сброс состояния модуля
const resetModuleState = () => {
  currentModuleComponent.value = null
  currentModuleClient.value = null
  currentModuleConfig.value = null
}

// Загрузка модуля для текущего роута
const loadModuleForRoute = async (routePath) => {
  if (!assistantModuleManager) return

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
      resetModuleState()
    }
  } catch (error) {
    console.error('Ошибка загрузки модуля ассистента:', error)
    resetModuleState()
  }
}

// Загрузка модуля при смене роута (начальная загрузка — в onMounted)
watch(
  () => route.path,
  async (newPath) => {
    await loadModuleForRoute(newPath)
  }
)

// Управление чатом при сворачивании/развёртывании меню
watch(
  () => props.isCollapsed && !props.isHovering,
  (shouldHide) => {
    if (shouldHide) {
      // Сохраняем состояние и закрываем чат при сворачивании
      wasAssistantVisibleBeforeCollapse.value = isAssistantVisible.value
      isAssistantVisible.value = false
    } else if (wasAssistantVisibleBeforeCollapse.value) {
      // Восстанавливаем состояние при развёртывании
      isAssistantVisible.value = true
      wasAssistantVisibleBeforeCollapse.value = false
    }
  }
)

const shouldShowFullInfo = computed(() => {
  return !props.isCollapsed || props.isHovering
})

// Функции для управления состоянием выпадающих элементов
const setDropdownActive = (dropdownId, active) => {
  if (active) {
    // Закрываем другие выпадающие меню ПЕРЕД открытием нового (синхронно)
    const allMenus = [
      { id: 'userMenu', ref: userMenuRef },
      { id: 'notifications', ref: notificationsMenuRef },
      { id: 'apps', ref: appsMenuRef },
      { id: 'settings', ref: settingsMenuRef }
    ]
    
    allMenus.forEach(({ id, ref }) => {
      if (id !== dropdownId && ref.value?.closeDropdown) {
        ref.value.closeDropdown()
      }
    })
    
    activeDropdowns.value.add(dropdownId)
  } else {
    activeDropdowns.value.delete(dropdownId)
  }
  
  // Уведомляем родительский компонент об изменении состояния
  emit('dropdown-state-change', activeDropdowns.value.size > 0)
}


// Функция для получения имени пользователя
const getUserName = (truncate = false) => {
  if (!userStore.user) return 'Гость'
  
  let name = ''
  if (userStore.user.initials_name?.trim()) {
    name = userStore.user.initials_name
  } else if (userStore.user.full_name?.trim()) {
    name = userStore.user.full_name
  } else {
    name = userStore.user.username || 'Гость'
  }
  
  if (truncate && name.length > 30) {
    return name.substring(0, 30) + '...'
  }
  return name
}

// Функция для получения полного имени пользователя без обрезки
const getFullUserName = () => getUserName(false)

const userFullName = computed(() => getUserName(true))

const toggleAssistant = () => {
  if (!isAssistantAvailable.value) {
    toast.warning('Модуль нейропомощника не загружен в систему')
    return
  }
  isAssistantVisible.value = !isAssistantVisible.value
}


// Регистрируем функции в глобальном сервисе
onMounted(async () => {
  try {
    const managerPath = Object.keys(_aiGlob.manager)[0]
    const servicePath = Object.keys(_aiGlob.service)[0]

    if (!managerPath || !servicePath) {
      isAssistantAvailable.value = false
      return
    }

    const [managerModule, serviceModule] = await Promise.all([
      _aiGlob.manager[managerPath](),
      _aiGlob.service[servicePath](),
    ])
    assistantModuleManager = managerModule.assistantModuleManager
    assistantService = serviceModule.assistantService
    isAssistantAvailable.value = true

    await loadModuleForRoute(route.path)

    assistantService.registerOpenChat(() => {
      isAssistantVisible.value = true
    })
    assistantService.registerAnalyzeChart(handleChartAnalysis)
  } catch {
    isAssistantAvailable.value = false
    console.warn('AI Assistant: модуль нейропомощника не загружен в систему')
  }
})

// Счетчик для уникальных ID streaming сообщений
let streamingMessageIdCounter = 20000

// Общая функция обработки streaming событий
const handleStreamingEvent = (event, messageId, state) => {
  const { currentMessage, sqlQuery, stageMessage, tableData } = state

  switch (event.type) {
    case 'start':
    case 'stage':
      state.stageMessage = event.message || event.text || ''
      assistantChat.value?.updateStreamingMessage(messageId, {
        stage: state.stageMessage,
        sql: sqlQuery,
        content: currentMessage,
        data: tableData,
      })
      break

    case 'sql_generation':
      state.currentMessage += event.text || ''
      assistantChat.value?.updateStreamingMessage(messageId, {
        stage: stageMessage,
        sqlGenerating: state.currentMessage,
        data: tableData,
      })
      break

    case 'sql':
      state.sqlQuery = event.text || ''
      state.currentMessage = ''
      assistantChat.value?.updateStreamingMessage(messageId, {
        stage: stageMessage,
        sql: state.sqlQuery,
        sqlGenerating: null,
        content: state.currentMessage,
        data: tableData,
      })
      break

    case 'commentary':
      state.currentMessage += event.text || ''
      assistantChat.value?.updateStreamingMessage(messageId, {
        stage: stageMessage,
        sql: sqlQuery,
        sqlGenerating: null,
        content: state.currentMessage,
        data: tableData,
      })
      break

    case 'complete':
      state.tableData = {
        rows: event.rows,
        columns: event.columns,
        data: event.data,
      }
      assistantChat.value?.updateStreamingMessage(messageId, {
        sql: event.sql || sqlQuery,
        sqlGenerating: null,
        content: currentMessage,
        data: state.tableData,
        completed: true,
        streaming: false,
        stage: '',
      })
      break

    case 'error':
      assistantChat.value?.updateStreamingMessage(messageId, {
        error: event.message || event.text,
        sqlGenerating: null,
        completed: true,
        streaming: false,
        stage: '',
      })
      break

    case 'done':
      assistantChat.value?.finalizeStreamingMessage(messageId)
      break
  }
}

// Общая функция обработки ошибок streaming
const handleStreamingError = (error, messageId, errorMessage) => {
  console.error(errorMessage, error)
  assistantChat.value?.finalizeStreamingMessage(messageId)
  if (assistantChat.value) {
    assistantChat.value.addAssistantMessage(
      `❌ **${errorMessage}:**\n\n${error.message}\n\nУбедитесь, что Ollama запущен и доступен.`
    )
  }
}

const handleBIQuery = async ({ fileId, question }) => {
  if (!currentModuleClient.value) {
    console.error('BI клиент не загружен')
    return
  }
  console.log('BI Query from toolbar:', { fileId, question })

  const state = {
    currentMessage: '',
    sqlQuery: '',
    stageMessage: '',
    tableData: null,
  }

  const messageId = streamingMessageIdCounter++

  try {
    const ollamaConfig = currentModuleConfig.value?.ollama || null
    await currentModuleClient.value.askQuestionStream(fileId, question, true, ollamaConfig, (event) => {
      console.log('Streaming event:', event)
      handleStreamingEvent(event, messageId, state)
    })
    
    assistantChat.value?.finalizeStreamingMessage(messageId)
  } catch (error) {
    handleStreamingError(error, messageId, 'Ошибка подключения к BI Assistant')
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

  const state = {
    currentMessage: '',
    sqlQuery: '',
    stageMessage: '',
    tableData: null,
  }

  const messageId = streamingMessageIdCounter++

  try {
    await currentModuleClient.value.analyzeChart(chartId, (event) => {
      console.log('Chart analysis event:', event)
      handleStreamingEvent(event, messageId, state)
    })
    
    assistantChat.value?.finalizeStreamingMessage(messageId)
  } catch (error) {
    handleStreamingError(error, messageId, 'Ошибка анализа графика')
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
  margin: 2%;
  width: auto;
  height: auto;
  padding: 8px 12px;
  border-radius: 8px;

  .tools {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    &.collapsed {
      justify-content: center;
    }
  }
}

.toolbar__user {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;

  &.collapsed {
    justify-content: center;
    gap: 0;
    flex: 0;
  }
}

.tools__user__name {
  display: flex;
  flex-direction: column;
  min-width: 0;
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
  gap: 4px;
  justify-content: flex-end;
  align-items: center;
  flex-shrink: 0;
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

.tools__user__avatar {
  cursor: pointer;
  background-color: grey;
  border-radius: 50%;
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

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
    z-index: 1;
  }
  
  // Обрезаем содержимое по кругу (но не сам контейнер, чтобы зеленая точка не обрезалась)
  :deep(.user-menu-wrapper) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  :deep(.tools__avatar) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    overflow: hidden;
  }
  
  :deep(.user-avatar) {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
  }
  
  :deep(.user-avatar-image) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
}
</style>