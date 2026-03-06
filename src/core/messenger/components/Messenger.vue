<template>
  <div class="msng">
    <div v-if="loading && messages.length === 0" class="msng__loader">
      <div class="spinner-border spinner-border-sm text-secondary" role="status" />
      <span class="ms-2 text-secondary">Загрузка сообщений...</span>
    </div>

    <MessagesList
      v-else
      :messages="messages"
      :current-user-id="currentUserId()"
      :show-system-messages="showSystemMessages"
      :system-messages="systemMessages"
      @delete="handleDelete"
      @edit-start="handleEditStart"
      @reply="handleReply"
    />

    <MessageInput
      v-if="!readonly"
      :disabled="sending"
      :editing-message="editingMessage"
      :replying-to="replyingTo"
      @send="handleSend"
      @edit-save="handleEditSave"
      @edit-cancel="editingMessage = null"
      @reply-cancel="replyingTo = null"
      @typing="sendTyping"
    />
  </div>
</template>

<script setup>
import { ref, toRef } from 'vue'
import { useMessenger } from '../js/useMessenger'
import MessagesList from './MessagesList.vue'
import MessageInput from './MessageInput.vue'

const props = defineProps({
  contentType: { type: String, required: true },
  objectId: { type: Number, default: null },
  readonly: { type: Boolean, default: false },
  showSystemMessages: { type: Boolean, default: false },
  systemMessages: { type: Array, default: () => [] },
})

const contentType = toRef(props, 'contentType')
const objectId = toRef(props, 'objectId')

const { messages, loading, sending, sendMessage, deleteMessage, editMessage, sendTyping, currentUserId } =
  useMessenger(contentType, objectId)

const editingMessage = ref(null)
const replyingTo = ref(null)

function handleSend({ text, files, replyToId }) {
  sendMessage(text, files, replyToId)
  replyingTo.value = null
}

function handleDelete(messageId) {
  deleteMessage(messageId)
}

function handleEditStart(message) {
  replyingTo.value = null
  editingMessage.value = message
}

function handleReply(message) {
  editingMessage.value = null
  replyingTo.value = message
}

async function handleEditSave({ messageId, text, attachmentIdsToRemove = [], files = [] }) {
  const msg = editingMessage.value
  const currentAttachments = msg?.attachments ?? []
  const remainingCount = currentAttachments.length - attachmentIdsToRemove.length
  const hasContentAfterSave = text || remainingCount > 0 || (files && files.length > 0)

  if (!hasContentAfterSave) {
    await deleteMessage(messageId)
  } else {
    await editMessage(messageId, text, attachmentIdsToRemove, files)
  }
  editingMessage.value = null
}
</script>

<style lang="scss" scoped>
.msng {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  &__loader {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 200px;
  }
}
</style>
