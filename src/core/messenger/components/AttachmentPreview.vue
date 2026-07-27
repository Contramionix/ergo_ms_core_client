<template>
  <div class="msng-att-preview">
    <div v-for="(file, idx) in files" :key="idx" class="msng-att-preview__item">
      <ContentImage
        v-if="isImage(file)"
        :src="getPreviewUrl(file)"
        :alt="file.name || t('settings.messenger.file')"
        class="msng-att-preview__thumb"
      />
      <div v-else class="msng-att-preview__file-icon">
        <FileText :size="20" aria-hidden="true" />
      </div>

      <span class="msng-att-preview__name" :title="file.name">{{ file.name }}</span>
      <span class="msng-att-preview__size">{{ formatSize(file.size) }}</span>

      <button
        type="button"
        class="btn btn-link p-0 msng-att-preview__remove"
        :aria-label="t('settings.messenger.removeFile')"
        @click="$emit('remove', idx)"
      >
        <X :size="14" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { FileText, X } from 'lucide-vue-next'
import ContentImage from '@/components/ContentImage.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'

defineProps({
  files: { type: Array, default: () => [] },
})

defineEmits(['remove'])

const { t } = useAppI18n()

function isImage(file) {
  return file.type && file.type.startsWith('image/')
}

function getPreviewUrl(file) {
  try {
    return URL.createObjectURL(file)
  } catch {
    return ''
  }
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style lang="scss" scoped>
.msng-att-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem 0;

  &__item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--bs-tertiary-bg, #f0f2f5);
    border-radius: 0.5rem;
    padding: 0.3rem 0.5rem;
    max-width: 220px;
  }

  &__thumb {
    width: 32px;
    height: 32px;
    border-radius: 0.25rem;
    object-fit: cover;
    flex-shrink: 0;
  }

  :deep(.msng-att-preview__thumb) {
    width: 32px;
    height: 32px;
    border-radius: 0.25rem;
    object-fit: cover;
    flex-shrink: 0;
  }

  &__file-icon {
    color: var(--bs-secondary-color);
    flex-shrink: 0;
  }

  &__name {
    font-size: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  &__size {
    font-size: 0.65rem;
    color: var(--bs-secondary-color);
    flex-shrink: 0;
  }

  &__remove {
    color: var(--bs-secondary-color);
    flex-shrink: 0;
    display: flex;
    align-items: center;

    &:hover {
      color: var(--bs-danger);
    }
  }
}
</style>
