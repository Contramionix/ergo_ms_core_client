<template>
  <div class="msng-input" :class="{ 'msng-input--dragover': isDragover }" @dragover.prevent="onDragover" @dragleave="onDragleave" @drop.prevent="onDrop">
    <AttachmentPreview v-if="pendingFiles.length > 0" :files="pendingFiles" @remove="removeFile"/>

    <div v-if="editingMessage" class="msng-input__edit-bar">
      <Pencil :size="14" class="msng-input__edit-icon" />
      <span class="msng-input__edit-text">{{ editPreviewText }}</span>
      <button type="button" class="btn btn-link p-0 msng-input__edit-close" :aria-label="t('settings.messenger.cancelEdit')" @click="cancelEdit">
        <X :size="16" aria-hidden="true" />
      </button>
    </div>

    <div v-if="editingMessage && keptAttachments.length > 0" class="msng-input__edit-attachments">
      <div v-for="att in keptAttachments" :key="att.id" class="msng-input__edit-att">
        <ContentImage
          v-if="isImageAtt(att.mime_type) && getSafeHref(att.file_url)"
          :src="getSafeHref(att.file_url)"
          :alt="att.original_filename || t('settings.messenger.attachment')"
          class="msng-input__edit-att-thumb"
        />
        <div v-else class="msng-input__edit-att-icon">
          <FileText :size="20" />
        </div>
        <span class="msng-input__edit-att-name" :title="att.original_filename">{{ att.original_filename }}</span>
        <button type="button" class="btn btn-link p-0 msng-input__edit-att-remove" :aria-label="t('settings.messenger.removeAttachment')" @click="markAttachmentRemoved(att.id)">
          <X :size="14" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-if="replyingTo && !editingMessage" class="msng-input__reply-bar">
      <CornerDownLeft :size="14" class="msng-input__reply-icon" />
      <div class="msng-input__reply-info">
        <span class="msng-input__reply-author">{{ replyAuthorName }}</span>
        <span class="msng-input__reply-text">{{ replyPreviewText }}</span>
      </div>
      <button type="button" class="btn btn-link p-0 msng-input__reply-close" :aria-label="t('settings.messenger.cancelReply')" @click="cancelReply">
        <X :size="16" aria-hidden="true" />
      </button>
    </div>

    <div class="msng-input__row">
      <button type="button" class="btn btn-link p-0 msng-input__btn" :disabled="disabled" :title="t('settings.messenger.attachFile')" :aria-label="t('settings.messenger.attachFile')" @click="triggerFileInput">
        <Paperclip :size="18" aria-hidden="true" />
      </button>

      <div class="msng-input__field-wrap">
        <textarea ref="textareaRef" v-model="text" class="form-control msng-input__textarea" :placeholder="editingMessage ? t('settings.messenger.editingPlaceholder') : t('settings.messenger.placeholder')" :disabled="disabled" rows="1" @input="autoResize" @keydown="onKeydown"/>
      </div>

      <button type="button" class="btn btn-link p-0 msng-input__btn" :disabled="disabled" :title="t('settings.messenger.emoji')" :aria-label="t('settings.messenger.emoji')" @click="toggleEmoji">
        <Smile :size="18" aria-hidden="true" />
      </button>

      <button type="button" class="btn btn-link p-0 msng-input__btn msng-input__btn--send" :disabled="sendDisabled" :title="editingMessage ? t('common.save') : t('common.send')" :aria-label="editingMessage ? t('common.save') : t('common.send')" @click="handleSend">
        <Check v-if="editingMessage" :size="18" aria-hidden="true" />
        <SendHorizonal v-else :size="18" aria-hidden="true" />
      </button>
    </div>

    <EmojiPicker v-if="showEmoji" @select="onEmojiSelect" @close="showEmoji = false"/>

    <input ref="fileInputRef" type="file" multiple class="d-none" @change="onFilesSelected"/>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed, defineAsyncComponent } from 'vue'
import { Paperclip, Smile, SendHorizonal, Pencil, X, Check, FileText, CornerDownLeft } from '@lucide/vue'
import ContentImage from '@/components/ContentImage.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { getSafeHref } from '@/js/utils/urlUtils.js'

const AttachmentPreview = defineAsyncComponent(() => import('./AttachmentPreview.vue'))
const EmojiPicker = defineAsyncComponent(() => import('./EmojiPicker.vue'))

const { t } = useAppI18n()

const props = defineProps({
  disabled: { type: Boolean, default: false },
  editingMessage: { type: Object, default: null },
  replyingTo: { type: Object, default: null },
})

const emit = defineEmits(['send', 'edit-save', 'edit-cancel', 'reply-cancel', 'typing'])

const text = ref('')
const pendingFiles = ref([])
const attachmentIdsToRemove = ref([])
const showEmoji = ref(false)
const isDragover = ref(false)
const textareaRef = ref(null)
const fileInputRef = ref(null)

let typingTimeout = null

const keptAttachments = computed(() => {
  if (!props.editingMessage?.attachments?.length) return []
  return props.editingMessage.attachments.filter((a) => !attachmentIdsToRemove.value.includes(a.id))
})

const editPreviewText = computed(() => {
  const preview = props.editingMessage?.text?.trim() || ''
  if (preview) return preview.length > 60 ? preview.slice(0, 60) + '...' : preview
  if (keptAttachments.value.length > 0) {
    const first = keptAttachments.value[0]
    return isImageAtt(first.mime_type)
      ? t('settings.messenger.image')
      : (first.original_filename || t('settings.messenger.attachment'))
  }
  return ''
})

const replyAuthorName = computed(() => {
  const ad = props.replyingTo?.author_data
  if (ad) return ad.full_name || ad.username || t('settings.messenger.user')
  return t('settings.messenger.user')
})

const replyPreviewText = computed(() => {
  const preview = (props.replyingTo?.text || '').trim()
  if (preview) return preview.length > 60 ? preview.slice(0, 60) + '...' : preview
  if (props.replyingTo?.attachments?.length > 0) return t('settings.messenger.attachment')
  return t('settings.messenger.message')
})

const sendDisabled = computed(() => {
  if (props.disabled) return true
  if (props.editingMessage) return false
  return !text.value.trim() && pendingFiles.value.length === 0
})

watch(() => props.editingMessage, (msg) => {
  if (msg) {
    text.value = msg.text || ''
    attachmentIdsToRemove.value = []
    nextTick(() => {
      autoResize()
      textareaRef.value?.focus()
    })
  }
})

watch(() => props.replyingTo, (msg) => {
  if (msg) nextTick(() => textareaRef.value?.focus())
})

function isImageAtt(mimeType) {
  return mimeType && mimeType.startsWith('image/')
}

function markAttachmentRemoved(attachmentId) {
  if (!attachmentIdsToRemove.value.includes(attachmentId)) {
    attachmentIdsToRemove.value = [...attachmentIdsToRemove.value, attachmentId]
  }
}

function handleSend() {
  if (props.disabled) return

  if (props.editingMessage) {
    emit('edit-save', {
      messageId: props.editingMessage.id,
      text: text.value.trim(),
      attachmentIdsToRemove: [...attachmentIdsToRemove.value],
      files: [...pendingFiles.value],
    })
    text.value = ''
    attachmentIdsToRemove.value = []
    pendingFiles.value = []
    nextTick(resetTextarea)
    return
  }

  if (!text.value.trim() && pendingFiles.value.length === 0) return
  emit('send', { text: text.value, files: [...pendingFiles.value], replyToId: props.replyingTo?.id || null })
  text.value = ''
  pendingFiles.value = []
  nextTick(resetTextarea)
}

function cancelEdit() {
  text.value = ''
  attachmentIdsToRemove.value = []
  pendingFiles.value = []
  nextTick(resetTextarea)
  emit('edit-cancel')
}

function cancelReply() {
  emit('reply-cancel')
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    if (props.editingMessage) { cancelEdit(); return }
    if (props.replyingTo) { cancelReply(); return }
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
    return
  }
  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => emit('typing'), 300)
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

function resetTextarea() {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFilesSelected(e) {
  addFiles(Array.from(e.target.files))
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function addFiles(files) {
  pendingFiles.value = [...pendingFiles.value, ...files]
}

function removeFile(index) {
  pendingFiles.value.splice(index, 1)
}

function onDragover() {
  isDragover.value = true
}

function onDragleave() {
  isDragover.value = false
}

function onDrop(e) {
  isDragover.value = false
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length > 0) addFiles(files)
}

function toggleEmoji() {
  showEmoji.value = !showEmoji.value
}

function onEmojiSelect(emoji) {
  text.value += emoji
  nextTick(() => {
    textareaRef.value?.focus()
    autoResize()
  })
}
</script>

<style lang="scss" scoped>
.msng-input {
  border-top: 1px solid var(--bs-border-color);
  padding: 0.5rem 0.75rem;
  position: relative;
  transition: background 0.2s;

  &--dragover {
    background: rgba(var(--bs-primary-rgb), 0.06);
    border-color: var(--bs-primary);
  }

  &__edit-bar {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.5rem;
    margin-bottom: 0.35rem;
    background: rgba(var(--bs-primary-rgb), 0.08);
    border-left: 3px solid var(--bs-primary);
    border-radius: 0 0.5rem 0.5rem 0;
    font-size: 0.8rem;
    color: var(--bs-body-color);
  }

  &__edit-icon {
    color: var(--bs-primary);
    flex-shrink: 0;
  }

  &__edit-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--bs-secondary-color);
  }

  &__edit-close {
    color: var(--bs-secondary-color);
    flex-shrink: 0;
    display: flex;
    align-items: center;

    &:hover {
      color: var(--bs-danger);
    }
  }

  &__edit-attachments {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.35rem;
  }

  &__edit-att {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.4rem;
    background: var(--bs-tertiary-bg, #f0f2f5);
    border-radius: 0.5rem;
    font-size: 0.75rem;
    max-width: 180px;
  }

  &__edit-att-thumb,
  :deep(.msng-input__edit-att-thumb) {
    width: 32px;
    height: 32px;
    object-fit: cover;
    border-radius: 0.25rem;
    flex-shrink: 0;
  }

  &__edit-att-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--bs-secondary-color);
    flex-shrink: 0;
  }

  &__edit-att-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__edit-att-remove {
    color: var(--bs-secondary-color);
    flex-shrink: 0;
    display: flex;
    align-items: center;

    &:hover {
      color: var(--bs-danger);
    }
  }

  &__reply-bar {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.5rem;
    margin-bottom: 0.35rem;
    background: rgba(var(--bs-info-rgb), 0.08);
    border-left: 3px solid var(--bs-info);
    border-radius: 0 0.5rem 0.5rem 0;
    font-size: 0.8rem;
    color: var(--bs-body-color);
  }

  &__reply-icon {
    color: var(--bs-info);
    flex-shrink: 0;
  }

  &__reply-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
  }

  &__reply-author {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--bs-info);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__reply-text {
    font-size: 0.75rem;
    color: var(--bs-secondary-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__reply-close {
    color: var(--bs-secondary-color);
    flex-shrink: 0;
    display: flex;
    align-items: center;

    &:hover {
      color: var(--bs-danger);
    }
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  &__field-wrap {
    flex: 1;
    min-width: 0;
  }

  &__textarea {
    resize: none;
    border-radius: 1rem;
    font-size: 0.875rem;
    padding: 0.45rem 0.75rem;
    max-height: 120px;
    overflow-y: auto;
    line-height: 1.4;
  }

  &__btn {
    color: var(--bs-secondary-color);
    transition: color 0.2s;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover:not(:disabled) {
      color: var(--bs-primary);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &--send {
      color: var(--bs-primary);

      &:disabled {
        color: var(--bs-secondary-color);
      }
    }
  }
}
</style>
