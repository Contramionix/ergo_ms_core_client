<template>
  <div ref="listRef" class="msng-list" @scroll="onScroll">
    <div v-if="sortedItems.length === 0" class="msng-list__empty">
      <MessageSquareMore :size="48" class="msng-list__empty-icon" />
      <p class="msng-list__empty-text">{{ t('settings.messenger.empty') }}</p>
    </div>

    <template v-for="(item, idx) in sortedItems" :key="item._key">
      <div v-if="shouldShowDateSeparator(item, idx)" class="msng-list__date-sep">
        <span>{{ formatDateSeparator(item.created_at) }}</span>
      </div>

      <SystemMessage v-if="item._isSystem" :message="item" />
      <MessageBubble
        v-else
        :message="item"
        :is-own="item.author != null && currentUserId != null && Number(item.author) === Number(currentUserId)"
        :show-author-name="isFirstInGroup(idx)"
        :show-avatar="isLastInGroup(idx)"
        @delete="(id) => emit('delete', id)"
        @edit-start="(msg) => emit('edit-start', msg)"
        @reply="(msg) => emit('reply', msg)"
        @preview-image="openPreview"
      />
    </template>

    <ImageLightbox
      :visible="previewIndex != null"
      :items="imageGallery"
      :index="previewIndex || 0"
      @update:index="previewIndex = $event"
      @close="closePreview"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { MessageSquareMore } from '@lucide/vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { getCurrentBcp47 } from '@/i18n/index.js'
import { getSafeHref } from '@/js/utils/urlUtils.js'
import ImageLightbox from '@/components/ImageLightbox.vue'
import MessageBubble from './MessageBubble.vue'
import SystemMessage from './SystemMessage.vue'

const { t } = useAppI18n()

const props = defineProps({
  messages: { type: Array, default: () => [] },
  currentUserId: { type: Number, default: null },
  showSystemMessages: { type: Boolean, default: false },
  systemMessages: { type: Array, default: () => [] },
})

const emit = defineEmits(['delete', 'edit-start', 'reply'])

const listRef = ref(null)
const previewIndex = ref(null)
let userScrolledUp = false

const sortedItems = computed(() => {
  const userMsgs = props.messages.map((m) => ({
    ...m,
    _key: `msg_${m.id}`,
    _isSystem: m.message_type === 'system',
  }))

  if (!props.showSystemMessages) return userMsgs

  const sysMsgs = props.systemMessages.map((s) => ({
    ...s,
    _key: `sys_${s.id}`,
    _isSystem: true,
    message_type: 'system',
  }))

  return [...userMsgs, ...sysMsgs].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  )
})

const imageGallery = computed(() => {
  const items = []
  for (const msg of sortedItems.value) {
    if (msg._isSystem) continue
    for (const att of msg.attachments || []) {
      const src = getSafeHref(att.file_url)
      if (!att?.mime_type?.startsWith('image/') || !src) continue
      items.push({
        id: att.id,
        src,
        filename: att.original_filename || '',
      })
    }
  }
  return items
})

function openPreview(attId) {
  const idx = imageGallery.value.findIndex((item) => item.id === attId)
  if (idx === -1) return
  previewIndex.value = idx
}

function closePreview() {
  previewIndex.value = null
}

function isFirstInGroup(idx) {
  const item = sortedItems.value[idx]
  if (idx === 0) return true
  const prev = sortedItems.value[idx - 1]
  if (prev._isSystem) return true
  return prev.author !== item.author
}

function isLastInGroup(idx) {
  const items = sortedItems.value
  const item = items[idx]
  if (idx === items.length - 1) return true
  const next = items[idx + 1]
  if (next._isSystem) return true
  return next.author !== item.author
}

function shouldShowDateSeparator(item, idx) {
  if (idx === 0) return true
  const prev = sortedItems.value[idx - 1]
  return formatDateSeparator(item.created_at) !== formatDateSeparator(prev.created_at)
}

function formatDateSeparator(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  if (isToday) return t('settings.messenger.today')
  if (isYesterday) return t('settings.messenger.yesterday')
  return d.toLocaleDateString(getCurrentBcp47(), { day: 'numeric', month: 'long', year: 'numeric' })
}

function onScroll() {
  if (!listRef.value) return
  const el = listRef.value
  userScrolledUp = el.scrollTop + el.clientHeight < el.scrollHeight - 40
}

function scrollToBottom() {
  nextTick(() => {
    if (listRef.value && !userScrolledUp) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  })
}

watch(
  () => sortedItems.value.length,
  () => scrollToBottom(),
)

watch(
  () => props.messages,
  () => scrollToBottom(),
  { deep: true },
)

watch(imageGallery, (items) => {
  if (previewIndex.value == null) return
  if (!items.length) {
    previewIndex.value = null
    return
  }
  if (previewIndex.value >= items.length) {
    previewIndex.value = items.length - 1
  }
})
</script>

<style lang="scss" scoped>
.msng-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 200px;
    text-align: center;
  }

  &__empty-icon {
    color: var(--bs-secondary-color);
    opacity: 0.4;
    margin-bottom: 0.75rem;
  }

  &__empty-text {
    color: var(--bs-secondary-color);
    margin: 0;
    font-size: 0.9rem;
  }

  &__date-sep {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0.75rem 0;

    span {
      background: var(--bs-tertiary-bg, #e9ecef);
      color: var(--bs-secondary-color);
      font-size: 0.75rem;
      padding: 0.2rem 0.75rem;
      border-radius: 1rem;
    }
  }
}
</style>
