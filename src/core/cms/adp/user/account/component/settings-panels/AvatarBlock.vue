<script setup>
import { ref, computed, onBeforeUnmount, defineAsyncComponent } from 'vue'
import ImageHoverFrame from '@/components/ImageHoverFrame.vue'
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
      <ImageHoverFrame class="avatar-preview" editable :busy="avatarLoading" :disabled="props.saving || avatarLoading" :primary-label="uploadAvatarLabel" :remove-label="showAvatarRemove ? t('settings.profile.remove') : ''" @primary="triggerAvatarUpload" @remove="handleAvatarRemove">
        <UserAvatar :size="200" :user-ref="isAdminMode ? userRef : null" :avatar-url="avatarExplicitUrl" :first-name="isAdminMode ? firstName : null" :last-name="isAdminMode ? lastName : null" :title="avatarTitle"/>
        <template #busy>
          <SpinnerLoading color="primary" variant="button" />
        </template>
      </ImageHoverFrame>
      <input ref="fileInputRef" type="file" class="visually-hidden" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp" @change="handleAvatarFileChange"/>
    </div>
    <p class="avatar-block__hint">
      {{ t('settings.profile.photoHint', { size: MAX_AVATAR_SIZE_MB }) }}
    </p>
    <AvatarCropModal v-if="showCropModal || cropImageSrc" :show="showCropModal" :image-src="cropImageSrc" @confirm="handleCropConfirm" @cancel="handleCropCancel" @close="handleCropCancel"/>
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
  width: min(200px, 45vw);
  flex-shrink: 0;
}

.avatar-preview :deep(.image-hover__media) {
  height: min(200px, 45vw);
  border-radius: 50%;
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