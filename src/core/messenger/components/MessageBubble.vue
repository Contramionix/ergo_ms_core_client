<template>
  <div class="msng-bubble" :class="{ 'msng-bubble--own': isOwn }" @contextmenu.prevent="onContextMenu">
    <div v-if="!isOwn" class="msng-bubble__avatar">
      <UserAvatar v-if="showAvatar" :user-id="message.author" :avatar-url="message.author_data?.avatar_url || null" :size="32" :title="authorName" />
    </div>

    <div class="msng-bubble__body">
      <div class="msng-bubble__content">
        <div v-if="!isOwn && showAuthorName" class="msng-bubble__author">{{ authorName }}</div>

        <div v-if="message.reply_to_data" class="msng-bubble__reply-quote">
          <span class="msng-bubble__reply-author">{{ message.reply_to_data.author_data?.full_name || 'Пользователь' }}</span>
          <span class="msng-bubble__reply-text">{{ message.reply_to_data.text_preview || 'Сообщение' }}</span>
        </div>

        <p v-if="message.text" class="msng-bubble__text">{{ message.text }}</p>

        <div v-if="hasAttachments" class="msng-bubble__attachments">
          <a v-for="att in message.attachments" :key="att.id" :href="att.file_url" target="_blank" class="msng-bubble__attachment">
            <img v-if="isImage(att.mime_type)" :src="att.file_url" :alt="att.original_filename" class="msng-bubble__attachment-img"/>
            <span v-else class="msng-bubble__attachment-file">
              <Paperclip :size="14" class="msng-bubble__attachment-icon" />
              {{ att.original_filename }}
            </span>
          </a>
        </div>

        <span class="msng-bubble__time">
          <span v-if="message.is_edited" class="msng-bubble__edited">ред.</span>
          {{ formattedTime }}
        </span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showMenu" ref="menuRef" class="msng-ctx-menu" :style="menuStyle">
        <button class="msng-ctx-menu__item" @click="onReply">
          <Reply :size="14" />
          <span>Ответить</span>
        </button>
        <template v-if="isOwn">
          <button class="msng-ctx-menu__item" @click="onEdit">
            <Pencil :size="14" />
            <span>Редактировать</span>
          </button>
          <button class="msng-ctx-menu__item msng-ctx-menu__item--danger" @click="onDeleteClick">
            <Trash2 :size="14" />
            <span>Удалить</span>
          </button>
        </template>
      </div>
    </Teleport>

    <ConfirmDialog :show="showConfirm" title="Удалить сообщение" message="Вы уверены, что хотите удалить это сообщение?" confirm-text="Удалить" cancel-text="Отмена" variant="danger" @confirm="onDeleteConfirm" @cancel="showConfirm = false" @close="showConfirm = false"/>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Paperclip, Pencil, Trash2, Reply } from 'lucide-vue-next'
import UserAvatar from '@/components/UserAvatar.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const props = defineProps({
  message: { type: Object, required: true },
  isOwn: { type: Boolean, default: false },
  showAuthorName: { type: Boolean, default: true },
  showAvatar: { type: Boolean, default: true },
})

const emit = defineEmits(['delete', 'edit-start', 'reply'])

const showMenu = ref(false)
const showConfirm = ref(false)
const menuStyle = ref({})
const menuRef = ref(null)

const authorName = computed(() => {
  const ad = props.message.author_data
  if (ad) return ad.full_name || ad.username || 'Пользователь'
  return 'Пользователь'
})

const hasAttachments = computed(
  () => props.message.attachments && props.message.attachments.length > 0,
)

const formattedTime = computed(() => {
  if (!props.message.created_at) return ''
  const d = new Date(props.message.created_at)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
})

function isImage(mimeType) {
  return mimeType && mimeType.startsWith('image/')
}

function onContextMenu(e) {
  showMenu.value = true
  menuStyle.value = { position: 'fixed', top: `${e.clientY}px`, left: `${e.clientX}px` }
}

function closeMenu() {
  showMenu.value = false
}

function onReply() {
  closeMenu()
  emit('reply', props.message)
}

function onEdit() {
  closeMenu()
  emit('edit-start', props.message)
}

function onDeleteClick() {
  closeMenu()
  showConfirm.value = true
}

function onDeleteConfirm() {
  showConfirm.value = false
  emit('delete', props.message.id)
}

function handleOutsideClick(e) {
  if (showMenu.value && menuRef.value && !menuRef.value.contains(e.target)) {
    closeMenu()
  }
}

onMounted(() => document.addEventListener('click', handleOutsideClick))
onUnmounted(() => document.removeEventListener('click', handleOutsideClick))
</script>

<style lang="scss" scoped>
.msng-bubble {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  max-width: 80%;
  position: relative;

  &--own {
    margin-left: auto;
    flex-direction: row-reverse;

    .msng-bubble__content {
      background: #007bff;
      color: #fff;
      border-radius: 1rem 1rem 0.25rem 1rem;
    }

    .msng-bubble__time {
      color: rgba(255, 255, 255, 0.7);
    }

    .msng-bubble__edited {
      color: rgba(255, 255, 255, 0.5);
    }

    .msng-bubble__attachment-file {
      color: rgba(255, 255, 255, 0.9);
    }
  }

  &__avatar {
    flex-shrink: 0;
    width: 32px;
    min-width: 32px;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  &__author {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--bs-primary);
    padding-left: 0.25rem;
    margin-bottom: 0.25rem;
  }

  &__content {
    background: var(--bs-tertiary-bg, #f0f2f5);
    padding: 0.5rem 0.75rem;
    border-radius: 1rem 1rem 1rem 0.25rem;
    word-break: break-word;
  }

  &__reply-quote {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.3rem 0.5rem;
    margin-bottom: 0.35rem;
    background: rgba(0, 0, 0, 0.06);
    border-left: 3px solid var(--bs-primary);
    border-radius: 0 0.35rem 0.35rem 0;
    cursor: pointer;
  }

  &__reply-author {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--bs-primary);
  }

  &__reply-text {
    font-size: 0.75rem;
    color: var(--bs-secondary-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 240px;
  }

  &--own .msng-bubble__reply-quote {
    background: rgba(255, 255, 255, 0.15);
    border-left-color: rgba(255, 255, 255, 0.6);
  }

  &--own .msng-bubble__reply-author {
    color: rgba(255, 255, 255, 0.9);
  }

  &--own .msng-bubble__reply-text {
    color: rgba(255, 255, 255, 0.7);
  }

  &__text {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.4;
    white-space: pre-wrap;
  }

  &__time {
    display: block;
    font-size: 0.65rem;
    color: var(--bs-secondary-color);
    text-align: right;
    margin-top: 0.2rem;
  }

  &__edited {
    font-style: italic;
    color: var(--bs-secondary-color);
    margin-right: 0.25rem;
  }

  &__attachments {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-top: 0.35rem;
  }

  &__attachment {
    text-decoration: none;
  }

  &__attachment-img {
    max-width: 240px;
    max-height: 200px;
    border-radius: 0.5rem;
    object-fit: cover;
  }

  &__attachment-file {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.8rem;
    color: var(--bs-primary);

    &:hover {
      text-decoration: underline;
    }
  }

  &__attachment-icon {
    flex-shrink: 0;
  }

}

@media (max-width: 576px) {
  .msng-bubble {
    max-width: 92%;
  }
}
</style>

<style lang="scss">
.msng-ctx-menu {
  position: fixed;
  z-index: 9999;
  background: var(--bs-body-bg, #fff);
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.25rem 0;
  min-width: 160px;

  &__item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.4rem 0.75rem;
    border: none;
    background: none;
    font-size: 0.8rem;
    color: var(--bs-body-color);
    cursor: pointer;
    text-align: left;

    &:hover {
      background: var(--bs-tertiary-bg, #f0f2f5);
    }

    &--danger {
      color: var(--bs-danger);

      &:hover {
        background: rgba(var(--bs-danger-rgb), 0.1);
      }
    }
  }
}
</style>