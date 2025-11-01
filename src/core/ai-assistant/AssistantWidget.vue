<template>
  <div class="assistant-widget">
    <AssistantButton ref="assistantButton" @toggle-chat="toggleChat" />

    <AssistantChat
      ref="assistantChat"
      :is-visible="isChatVisible"
      @bi-query="handleBIQuery"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AssistantButton from './AssistantButton.vue'
import AssistantChat from './AssistantChat.vue'
import { biClient } from './js/bi-client.js'

const assistantButton = ref(null)
const assistantChat = ref(null)
const isChatVisible = ref(false)

const toggleChat = (isOpen) => {
  isChatVisible.value = isOpen

  if (isOpen) {
    assistantButton.value?.hideNotification()
  }
}

// Счетчик для уникальных ID streaming сообщений
let streamingMessageIdCounter = 10000

const handleBIQuery = async ({ fileId, question }) => {
  console.log('BI Query:', { fileId, question })

  assistantButton.value?.startPulsing()

  let currentMessage = ''
  let sqlQuery = ''
  let stageMessage = ''
  let tableData = null

  const messageId = streamingMessageIdCounter++

  try {
    // Используем streaming запрос
    await biClient.askQuestionStream(fileId, question, true, (event) => {
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
          // Накапливаем генерацию SQL
          currentMessage += event.text || ''
          assistantChat.value?.updateStreamingMessage(messageId, {
            stage: stageMessage,
            sqlGenerating: currentMessage,
            data: tableData,
          })
          break

        case 'sql':
          // Финальный SQL запрос
          sqlQuery = event.text || ''
          currentMessage = ''
          assistantChat.value?.updateStreamingMessage(messageId, {
            stage: stageMessage,
            sql: sqlQuery,
            content: currentMessage,
            data: tableData,
          })
          break

        case 'commentary':
          // Streaming комментария
          currentMessage += event.text || ''
          assistantChat.value?.updateStreamingMessage(messageId, {
            stage: stageMessage,
            sql: sqlQuery,
            content: currentMessage,
            data: tableData,
          })
          break

        case 'complete':
          // Финальные данные
          tableData = {
            rows: event.rows,
            columns: event.columns,
            data: event.data,
          }
          assistantChat.value?.updateStreamingMessage(messageId, {
            sql: event.sql || sqlQuery,
            content: currentMessage,
            data: tableData,
            completed: true,
          })
          break

        case 'error':
          assistantChat.value?.updateStreamingMessage(messageId, {
            error: event.message || event.text,
            completed: true,
          })
          break

        case 'done':
          // Завершение streaming
          assistantChat.value?.finalizeStreamingMessage(messageId)
          break
      }
    })
  } catch (error) {
    console.error('Error processing BI query:', error)
    assistantChat.value?.addAssistantMessage(
      `❌ **Ошибка подключения к BI Assistant:**\n\n${error.message}\n\nУбедитесь, что Ollama запущен и доступен.`,
    )
  } finally {
    assistantButton.value?.stopPulsing()
  }
}

defineExpose({
  showNotification: () => assistantButton.value?.showNotification(),
  openChat: () => toggleChat(true),
  closeChat: () => toggleChat(false),
})
</script>
