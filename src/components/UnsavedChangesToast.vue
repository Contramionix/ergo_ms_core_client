<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="permission-unsaved-toast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <AlertTriangle :size="26" class="permission-unsaved-toast__icon" aria-hidden="true" />
      <div class="permission-unsaved-toast__content">
        <div class="permission-unsaved-toast__text">
          <p>{{ resolvedTitle }}</p>
          <span>{{ resolvedDescription }}</span>
        </div>
        <div class="permission-unsaved-toast__actions">
          <button
            type="button"
            class="permission-unsaved-toast__link"
            :disabled="saving"
            @click="$emit('cancel')"
          >
            {{ resolvedCancelLabel }}
          </button>
          <button
            type="button"
            class="btn btn-success"
            :disabled="saving"
            @click="$emit('save')"
          >
            {{ saving ? resolvedSavingLabel : resolvedSaveLabel }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: undefined,
  },
  description: {
    type: String,
    default: undefined,
  },
  cancelLabel: {
    type: String,
    default: undefined,
  },
  saveLabel: {
    type: String,
    default: undefined,
  },
  savingLabel: {
    type: String,
    default: undefined,
  },
})

defineEmits(['save', 'cancel'])

const resolvedTitle = computed(() => props.title ?? t('components.unsavedChanges.title'))
const resolvedDescription = computed(
  () => props.description ?? t('components.unsavedChanges.message'),
)
const resolvedCancelLabel = computed(
  () => props.cancelLabel ?? t('components.unsavedChanges.discard'),
)
const resolvedSaveLabel = computed(() => props.saveLabel ?? t('components.unsavedChanges.save'))
const resolvedSavingLabel = computed(
  () => props.savingLabel ?? t('components.unsavedChanges.saving'),
)
</script>

<style scoped lang="scss">
.permission-unsaved-toast {
  --unsaved-toast-bg: var(--color-primary-background);
  --unsaved-toast-color: var(--color-primary-text);
  --unsaved-toast-border: var(--color-border);
  --unsaved-toast-icon-color: var(--ui-warning, var(--bs-warning));
  --unsaved-toast-link-color: var(--color-primary-text);
  --unsaved-toast-link-color-hover: var(--color-accent);
  --unsaved-toast-muted-color: var(--color-secondary-text);

  position: fixed;
  bottom: calc(32px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translate(-50%, 0);
  width: min(640px, calc(100% - 32px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)));
  padding: 16px 20px;
  border-radius: 16px;
  background-color: var(--unsaved-toast-bg);
  color: var(--unsaved-toast-color);
  border: 1px solid var(--unsaved-toast-border);
  box-shadow: 0 16px 40px color-mix(in srgb, var(--color-primary-text) 16%, transparent);
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  z-index: 1060;

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--unsaved-toast-icon-color);
  }

  &__content {
    display: flex;
    flex: 1 1 auto;
    gap: 20px;
    align-items: center;
  }

  &__text {
    flex: 1 1 auto;
    min-width: 180px;

    p {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }

    span {
      display: block;
      font-size: 13px;
      color: var(--unsaved-toast-muted-color);
    }
  }

  &__actions {
    display: inline-flex;
    gap: 12px;

    .btn {
      min-width: 120px;
    }

    .btn.btn-success {
      color: #fff;
    }

    .permission-unsaved-toast__link {
      background: transparent;
      border: none;
      color: var(--unsaved-toast-link-color);
      text-decoration: none;
      padding: 0;
      min-width: auto;
      cursor: pointer;

      &:hover,
      &:focus {
        color: var(--unsaved-toast-link-color-hover);
        text-decoration: none;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

@media (width < $ui-bp-md) {
  .permission-unsaved-toast {
    flex-direction: column;
    flex-wrap: wrap;
    align-items: stretch;
  }

  .permission-unsaved-toast__content {
    flex-direction: column;
    align-items: stretch;
  }

  .permission-unsaved-toast__actions {
    width: 100%;
    flex-direction: column;

    .btn {
      width: 100%;
    }
  }
}
</style>
