<template>
  <div class="assistant-widget">
    <AssistantButton ref="assistantButton" @toggle-chat="toggleChat" />

    <AssistantChat ref="assistantChat" :is-visible="isChatVisible" @send-message="handleMessage" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AssistantButton from './AssistantButton.vue'
import AssistantChat from './AssistantChat.vue'
import { intentAnalyzer } from '@/js/ai-assistant/intent-analyzer.js'
import { routerActions } from '@/js/ai-assistant/router-actions.js'
import { componentAnalyzer } from '@/js/ai-assistant/component-analyzer.js'
import { connectionStatus } from '@/js/ai-assistant/connection-status.js'
import '@/js/ai-assistant/test-connection.js'

const route = useRoute()
const assistantButton = ref(null)
const assistantChat = ref(null)
const isChatVisible = ref(false)

const toggleChat = (isOpen) => {
  isChatVisible.value = isOpen

  if (isOpen) {
    assistantButton.value?.hideNotification()
    connectionStatus.show()
  } else {
    connectionStatus.hide()
  }
}

const handleMessage = async (message) => {
  console.log('User message:', message)

  assistantButton.value?.startPulsing()

  try {
    const context = await getCurrentContext()

    const intentResult = await intentAnalyzer.analyzeIntent(message, context)

    if (intentResult.success) {
      const actionResult = await executeAction(intentResult)
      assistantChat.value?.addAssistantMessage(actionResult.message)

      if (actionResult.usedLLM) {
        connectionStatus.show()
      }
    } else {
      assistantChat.value?.addAssistantMessage(
        'Не удалось понять ваш запрос. Попробуйте переформулировать.',
      )
    }
  } catch (error) {
    console.error('Error processing message:', error)
    assistantChat.value?.addAssistantMessage(
      'Извините, произошла ошибка при обработке вашего сообщения.',
    )
  } finally {
    assistantButton.value?.stopPulsing()
  }
}

const getCurrentContext = async () => {
  try {
    const currentRoute = routerActions.getCurrentRoute()
    const availableRoutes = routerActions.getAvailableRoutes().map((r) => r.name || r.path)
    const pageAnalysis = routerActions.analyzeCurrentPage()
    const componentAnalysis = componentAnalyzer.analyzePageComponents()

    return {
      currentRoute: currentRoute.path,
      currentPage: pageAnalysis.pageName,
      availableRoutes: availableRoutes.slice(0, 10),
      pageComponents: Object.keys(componentAnalysis.descriptions || {}).slice(0, 5),
      breadcrumbs: pageAnalysis.breadcrumbs,
      availableActions: pageAnalysis.availableActions,
    }
  } catch (error) {
    console.error('Error getting context:', error)
    return {
      currentRoute: route.path,
      currentPage: 'текущая страница',
      availableRoutes: [],
      pageComponents: [],
      breadcrumbs: [],
      availableActions: [],
    }
  }
}

const executeAction = async (intentResult) => {
  switch (intentResult.intent) {
    case 'NAVIGATION':
      return await handleNavigationIntent(intentResult)

    case 'PAGE_ANALYZE':
      return await handlePageAnalyzeIntent(intentResult)

    case 'COMPONENT_EXPLAIN':
      return await handleComponentExplainIntent(intentResult)

    case 'HELP':
      return await handleHelpIntent(intentResult)

    case 'CHAT':
    default:
      return {
        message: intentResult.message,
        usedLLM: intentResult.action === null,
      }
  }
}

const handleNavigationIntent = async (intentResult) => {
  const { params } = intentResult

  if (params.route) {
    const result = await routerActions.navigateToRoute(params.route)

    if (result.success) {
      return {
        message: `✅ ${result.message}\n\nВы перешли на страницу: ${params.routeName || params.route}`,
        usedLLM: false,
      }
    } else {
      const suggestions = result.suggestions || []
      let message = `❌ ${result.message}`

      if (suggestions.length > 0) {
        message += '\n\n🔍 Возможно, вы имели в виду:\n'
        suggestions.forEach((route) => {
          message += `• ${route.name || route.path}\n`
        })
      }

      return { message, usedLLM: false }
    }
  }

  return { message: intentResult.message, usedLLM: false }
}

const handlePageAnalyzeIntent = async () => {
  try {
    const pageAnalysis = routerActions.analyzeCurrentPage()
    const componentAnalysis = componentAnalyzer.analyzePageComponents()

    let message = `📍 **Анализ текущей страницы:**\n\n`
    message += `**Страница:** ${pageAnalysis.pageName}\n`
    message += `**Путь:** ${pageAnalysis.route.path}\n\n`

    if (pageAnalysis.breadcrumbs.length > 1) {
      message += `**Навигация:** ${pageAnalysis.breadcrumbs.map((b) => b.name).join(' → ')}\n\n`
    }

    if (componentAnalysis.totalComponents) {
      message += `**Компоненты на странице:** ${componentAnalysis.totalComponents}\n`

      const mainComponents = Object.entries(componentAnalysis.componentTypes)
        .filter(([, components]) => components.length > 0)
        .map(([type, components]) => `${type}: ${components.length}`)
        .join(', ')

      if (mainComponents) {
        message += `**Типы:** ${mainComponents}\n\n`
      }
    }

    if (componentAnalysis.interactiveElements?.length > 0) {
      message += `**Интерактивные элементы:**\n`
      componentAnalysis.interactiveElements.forEach((element) => {
        message += `• ${element.description}\n`
      })
      message += '\n'
    }

    if (pageAnalysis.availableActions.length > 0) {
      message += `**Что можно сделать:**\n`
      pageAnalysis.availableActions.slice(0, 5).forEach((action) => {
        message += `• ${action}\n`
      })
    }

    return { message, usedLLM: false }
  } catch {
    return { message: 'Не удалось проанализировать страницу. Попробуйте еще раз.', usedLLM: false }
  }
}

const handleComponentExplainIntent = async () => {
  try {
    const componentAnalysis = componentAnalyzer.analyzePageComponents()

    let message = `🔧 **Компоненты на странице:**\n\n`

    const descriptions = componentAnalysis.descriptions || {}
    const componentsToShow = Object.entries(descriptions).slice(0, 8)

    if (componentsToShow.length > 0) {
      componentsToShow.forEach(([component, description]) => {
        message += `**${component}**\n${description}\n\n`
      })

      if (Object.keys(descriptions).length > 8) {
        message += `_И еще ${Object.keys(descriptions).length - 8} компонентов..._\n\n`
      }

      message += `💡 Спросите про конкретный компонент для подробного объяснения!`
    } else {
      message = 'На этой странице не обнаружено распознаваемых компонентов.'
    }

    return { message, usedLLM: false }
  } catch {
    return {
      message: 'Не удалось проанализировать компоненты. Попробуйте еще раз.',
      usedLLM: false,
    }
  }
}

const handleHelpIntent = async () => {
  const message = `🤖 **AI Ассистент ERGO MS**\n\n**Что я умею:**\n\n🧭 **Навигация**\n• "Перейди в профиль"\n• "Открой настройки"\n• "Покажи пользователей"\n\n📋 **Анализ страниц**\n• "Где я нахожусь?"\n• "Как работает эта страница?"\n• "Что здесь можно сделать?"\n\n🔧 **Объяснение компонентов**\n• "Объясни компоненты"\n• "Что делает эта кнопка?"\n• "Как работает таблица?"\n\n💬 **Общение**\n• Просто задавайте вопросы обычным языком\n• Я понимаю контекст текущей страницы\n\n📞 **Примеры запросов:**\n• "Как добавить нового пользователя?"\n• "Перейди на главную"\n• "Объясни что здесь происходит"\n\nПросто пишите как обычно - я вас пойму! 😊`

  return { message, usedLLM: false }
}

onMounted(() => {
  connectionStatus.init()
})

onUnmounted(() => {
  connectionStatus.destroy()
})

defineExpose({
  showNotification: () => assistantButton.value?.showNotification(),
  openChat: () => toggleChat(true),
  closeChat: () => toggleChat(false),
  showConnectionStatus: () => connectionStatus.show(),
})
</script>
