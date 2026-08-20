<script setup>
import { ref, computed, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { Upload, Trash2 } from '@lucide/vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { useToast } from '@/js/utils/toast.js'

const AvatarCropModal = defineAsyncComponent(() => import('@/components/AvatarCropModal.vue'))

const props = defineProps({
  saving: { type: Boolean, default: false },
  userId: { type: Number, default: null },
  userRef: { type: String, default: null },
  avatarUrl: { type: String, default: null },
  displayName: { type: String, default: '' },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  onUpload: { type: Function, default: null },
  onRemove: { type: Function, default: null },
})

const emit = defineEmits(['avatar-updated'])

const MAX_AVATAR_SIZE_MB = 5

const { t } = useAppI18n()
const toast = useToast()
const userStore = useUserStore()

const fileInputRef = ref(null)
const avatarRef = ref(null)
const avatarLoading = ref(false)
const avatarPreviewUrl = ref('')
const showCropModal = ref(false)
const cropImageSrc = ref(null)

const isAdminMode = computed(() => typeof props.onUpload === 'function')

const avatarExplicitUrl = computed(() => {
  if (avatarPreviewUrl.value) return avatarPreviewUrl.value
  if (isAdminMode.value) return props.avatarUrl || undefined
  return undefined
})

const avatarTitle = computed(() => {
  if (props.displayName) return props.displayName
  if (isAdminMode.value) return t('settings.profile.userFallback')
  return userStore.displayName || userStore.fullName || t('settings.profile.userFallback')
})

const hasRemoteAvatar = computed(() => {
  if (isAdminMode.value) return !!props.avatarUrl
  return userStore.hasCustomAvatar
})

const uploadAvatarLabel = computed(() =>
  hasRemoteAvatar.value || avatarPreviewUrl.value
    ? t('settings.profile.replace')
    : t('settings.profile.upload'),
)

const showAvatarRemove = computed(() => hasRemoteAvatar.value || !!avatarPreviewUrl.value)

const cleanupAvatarPreview = () => {
  if (avatarPreviewUrl.value) {
    URL.revokeObjectURL(avatarPreviewUrl.value)
    avatarPreviewUrl.value = ''
  }
}

const cleanupCropImage = () => {
  if (cropImageSrc.value) {
    URL.revokeObjectURL(cropImageSrc.value)
    cropImageSrc.value = null
  }
}

const triggerAvatarUpload = () => {
  if (avatarLoading.value || props.saving) return
  fileInputRef.value?.click()
  avatarRef.value?.blur()
}

const handleAvatarFileChange = (event) => {
  const [file] = event.target.files || []
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
  if (!file || !file.type.startsWith('image/')) {
    if (file) toast.error(t('settings.profile.selectImage'))
    return
  }

  const maxBytes = MAX_AVATAR_SIZE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    toast.error(t('settings.profile.fileTooLarge', { size: MAX_AVATAR_SIZE_MB }))
    return
  }

  cleanupAvatarPreview()
  cleanupCropImage()
  cropImageSrc.value = URL.createObjectURL(file)
  showCropModal.value = true
}

const handleCropConfirm = async (croppedFile) => {
  showCropModal.value = false
  avatarLoading.value = true
  try {
    if (isAdminMode.value && props.onUpload) {
      const result = await props.onUpload(croppedFile)
      if (result?.avatar_url) {
        avatarPreviewUrl.value = result.avatar_url
      }
      emit('avatar-updated', result)
      toast.success(t('settings.profile.avatarUpdated'))
    } else {
      await userStore.updateAvatar(croppedFile)
    }
  } catch (error) {
    logError('Ошибка обновления аватара:', error)
    if (isAdminMode.value) {
      toast.error(t('settings.profile.avatarUploadError'))
    }
  } finally {
    avatarLoading.value = false
    cleanupCropImage()
  }
}

const handleCropCancel = () => {
  showCropModal.value = false
  cleanupCropImage()
}

const handleAvatarRemove = async () => {
  if (avatarLoading.value || props.saving) return
  if (showCropModal.value || cropImageSrc.value) {
    handleCropCancel()
    return
  }
  if (avatarPreviewUrl.value) {
    cleanupAvatarPreview()
    return
  }
  avatarLoading.value = true
  try {
    if (isAdminMode.value && props.onRemove) {
      await props.onRemove()
      cleanupAvatarPreview()
      emit('avatar-updated', { avatar_url: null })
      toast.success(t('settings.profile.avatarReset'))
    } else {
      await userStore.resetAvatar()
    }
  } catch (error) {
    logError('Ошибка сброса аватара:', error)
    if (isAdminMode.value) {
      toast.error(t('settings.profile.avatarResetError'))
    }
  } finally {
    avatarLoading.value = false
  }
}

onBeforeUnmount(() => {
  cleanupAvatarPreview()
  cleanupCropImage()
})
</script>

<template>
  <div class="avatar-block">
    <p class="avatar-block__label">{{ t('settings.profile.photoLabel') }}</p>
    <div class="avatar-section">
      <div ref="avatarRef" class="avatar-preview" tabindex="0" :class="{ 'avatar-preview--loading': avatarLoading }">
        <UserAvatar
          :size="200"
          :user-ref="isAdminMode ? userRef : null"
          :avatar-url="avatarExplicitUrl"
          :first-name="isAdminMode ? firstName : null"
          :last-name="isAdminMode ? lastName : null"
          :title="avatarTitle"
        />
        <div v-if="avatarLoading" class="avatar-preview__overlay avatar-preview__overlay--busy">
          <SpinnerLoading color="primary" variant="button" />
        </div>
        <div v-else class="avatar-preview__hover-layer">
          <div class="avatar-preview__dimmer" aria-hidden="true" />
          <div class="avatar-preview__actions">
            <button type="button" class="avatar-preview__action" :disabled="props.saving || avatarLoading" @click.stop="triggerAvatarUpload">
              <Upload :size="16" />
              <span>{{ uploadAvatarLabel }}</span>
            </button>
            <button v-if="showAvatarRemove" type="button" class="avatar-preview__action avatar-preview__action--danger" :disabled="props.saving || avatarLoading" @click.stop="handleAvatarRemove">
              <Trash2 :size="16" />
              <span>{{ t('settings.profile.remove') }}</span>
            </button>
          </div>
        </div>
      </div>
      <input ref="fileInputRef" type="file" class="visually-hidden" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" @change="handleAvatarFileChange"/>
      <div class="avatar-buttons avatar-buttons--fallback">
        <button type="button" class="btn-avatar-action" :disabled="props.saving || avatarLoading" @click="triggerAvatarUpload">
          <Upload :size="16" />
          <span>{{ uploadAvatarLabel }}</span>
        </button>
        <button v-if="showAvatarRemove" type="button" class="btn-avatar-action btn-avatar-remove" :disabled="props.saving || avatarLoading" @click="handleAvatarRemove">
          <Trash2 :size="16" />
          <span>{{ t('settings.profile.remove') }}</span>
        </button>
      </div>
    </div>
    <p class="avatar-block__hint">
      {{ t('settings.profile.photoHint', { size: MAX_AVATAR_SIZE_MB }) }}
    </p>
    <AvatarCropModal
      v-if="showCropModal || cropImageSrc"
      :show="showCropModal"
      :image-src="cropImageSrc"
      @confirm="handleCropConfirm"
      @cancel="handleCropCancel"
      @close="handleCropCancel"
    />
  </div>
</template>

<style scoped lang="scss">
.avatar-block {
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-block__label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-secondary-text);
  margin: 0 0 0.75rem;
  width: 100%;
  text-align: center;
}

.avatar-block__hint {
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
  margin: 0.5rem 0 0;
  line-height: 1.4;
  width: 100%;
  text-align: center;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  width: 100%;
}

.avatar-preview {
  position: relative;
  width: min(200px, 45vw);
  height: min(200px, 45vw);
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  border-radius: 50%;
  outline: none;

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--color-accent);
  }

  &--loading {
    pointer-events: none;
  }
}

.avatar-preview__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  z-index: 2;

  &--busy {
    background: color-mix(in srgb, var(--color-primary-background) 55%, transparent);
  }
}

.avatar-preview__hover-layer {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.22s ease;
  pointer-events: none;
  z-index: 1;
}

.avatar-preview:not(.avatar-preview--loading):hover .avatar-preview__hover-layer {
  opacity: 1;
  pointer-events: auto;
}

.avatar-preview__dimmer {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.52);
}

.avatar-preview__actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  padding: 0 0.65rem;
  width: 100%;
  max-width: 11.5rem;
}

.avatar-preview__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.4rem 0.65rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.2;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 0.375rem;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.55);
    border-color: rgba(255, 255, 255, 0.55);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.avatar-preview__action--danger {
  border-color: color-mix(in srgb, #f8b4b4 55%, transparent);
  color: #ffe8e8;

  &:hover:not(:disabled) {
    background: rgba(180, 40, 40, 0.55);
    border-color: rgba(255, 200, 200, 0.65);
  }
}

.avatar-buttons {
  display: none;
}

.avatar-buttons--fallback {
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

@media (hover: none) {
  .avatar-preview__hover-layer {
    display: none;
  }

  .avatar-buttons--fallback {
    display: flex;
  }
}

.btn-avatar-action {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.375rem;
  border: 1px solid var(--color-border);
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;

  &:hover:not(:disabled) {
    background: var(--color-hover-background);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-avatar-remove {
  border-color: color-mix(in srgb, var(--bs-danger, #dc3545) 45%, var(--color-border));
  color: var(--bs-danger, #dc3545);

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--bs-danger, #dc3545) 12%, transparent);
    border-color: var(--bs-danger, #dc3545);
  }
}

.visually-hidden {
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
</style>
