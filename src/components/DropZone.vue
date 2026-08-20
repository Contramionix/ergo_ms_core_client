<template>
  <label
    class="drop-zone"
    :class="{
      'drop-zone--over': isDragOver,
      'drop-zone--compact': compact,
      'drop-zone--disabled': disabled,
    }"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <input
      :id="inputId"
      class="drop-zone__input"
      type="file"
      :multiple="multiple"
      :accept="accept || undefined"
      :disabled="disabled"
      :aria-label="resolvedAriaLabel"
      @change="onFileChange"
    />
    <span class="drop-zone__icon" aria-hidden="true">
      <slot name="icon">
        <UploadCloud :size="compact ? 24 : 30"/>
      </slot>
    </span>
    <span class="drop-zone__title">{{ resolvedTitle }}</span>
    <span class="drop-zone__hint">
      {{ resolvedHint }}
      <span class="drop-zone__browse">{{ resolvedBrowse }}</span>
    </span>
  </label>
</template>

<script setup>
import { computed, ref, useId } from 'vue'
import { UploadCloud } from 'lucide-vue-next'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const props = defineProps({
  multiple: {
    type: Boolean,
    default: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  accept: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  browse: {
    type: String,
    default: '',
  },
  id: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['files'])

const { t } = useAppI18n()
const dragDepth = ref(0)
const generatedId = useId()
const inputId = computed(() => props.id || generatedId)
const isDragOver = computed(() => !props.disabled && dragDepth.value > 0)
const resolvedTitle = computed(() => props.title || t('components.dropZone.title'))
const resolvedHint = computed(() => props.hint || t('components.dropZone.or'))
const resolvedBrowse = computed(() => props.browse || t('components.dropZone.browse'))
const resolvedAriaLabel = computed(() => props.ariaLabel || t('components.dropZone.ariaLabel'))

function toFileArray(fileList) {
  return Array.from(fileList || []).filter((file) => file instanceof File)
}

function isFileDrag(event) {
  return Array.from(event.dataTransfer?.types || []).includes('Files')
}

function onDragEnter(event) {
  if (props.disabled || !isFileDrag(event)) return
  event.preventDefault()
  dragDepth.value += 1
}

function onDragOver(event) {
  if (props.disabled || !isFileDrag(event)) return
  event.preventDefault()
}

function onDragLeave(event) {
  if (props.disabled || !isFileDrag(event)) return
  event.preventDefault()
  dragDepth.value = Math.max(0, dragDepth.value - 1)
}

function onDrop(event) {
  event.preventDefault()
  dragDepth.value = 0
  if (props.disabled) return
  const files = toFileArray(event.dataTransfer?.files)
  if (files.length) emit('files', files)
}

function onFileChange(event) {
  const input = event.target
  const files = toFileArray(input?.files)
  if (input) input.value = ''
  if (props.disabled || !files.length) return
  emit('files', files)
}
</script>

<style scoped lang="scss">
.drop-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-height: 13rem;
  padding: 2rem 1.5rem;
  border: 1.5px dashed color-mix(in srgb, var(--bs-primary) 32%, var(--color-border));
  border-radius: 0.75rem;
  background:
    radial-gradient(
      120% 80% at 50% 0%,
      color-mix(in srgb, var(--bs-primary) 8%, transparent) 0%,
      transparent 55%
    ),
    color-mix(in srgb, var(--bs-primary) 3%, var(--color-primary-background));
  color: var(--color-primary-text);
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    min-height 0.18s ease;

  &:hover:not(.drop-zone--disabled),
  &:has(:focus-visible):not(.drop-zone--disabled) {
    border-color: color-mix(in srgb, var(--bs-primary) 62%, var(--color-border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--bs-primary) 12%, transparent);
  }

  &--over {
    border-color: var(--bs-primary);
    border-style: solid;
    background:
      radial-gradient(
        120% 80% at 50% 0%,
        color-mix(in srgb, var(--bs-primary) 16%, transparent) 0%,
        transparent 60%
      ),
      color-mix(in srgb, var(--bs-primary) 8%, var(--color-primary-background));
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--bs-primary) 16%, transparent);
  }

  &--compact {
    min-height: 7.25rem;
    padding: 1.15rem 1.25rem;
  }

  &--disabled {
    cursor: default;
    opacity: 0.72;
  }
}

.drop-zone__input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.drop-zone__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.25rem;
  height: 3.25rem;
  margin-bottom: 0.35rem;
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--bs-primary) 14%, var(--color-primary-background));
  color: var(--bs-primary);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bs-primary) 18%, transparent);
}

.drop-zone--compact .drop-zone__icon {
  width: 2.5rem;
  height: 2.5rem;
  margin-bottom: 0.15rem;
  border-radius: 0.7rem;
}

.drop-zone__title {
  font-size: 1rem;
  font-weight: 650;
  line-height: 1.3;
}

.drop-zone__hint {
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--color-secondary-text);
}

.drop-zone__browse {
  color: var(--bs-primary);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
