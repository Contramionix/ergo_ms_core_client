<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDropdown } from '@/composables/useDropdown.js'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { CORE_ICON } from '@/config/coreIconNames.js'
import { collectVisibleAppsMenuItems } from '@/integrations/appsMenu.js'
import { APPS_MENU_ITEMS_GROUP } from '@/integrations/moduleContracts.js'
import bridge from '@/integrations/ModuleBridge.js'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { logError } from '@/js/utils/logError.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const props = defineProps({
  iconSize: {
    type: Number,
    default: 20,
  },
})

const { t } = useAppI18n()
const emit = defineEmits(['dropdown-toggle', 'visibility-change'])
const router = useRouter()
const userStore = useUserStore()
const { dropdownRef, isOpen, toggleDropdown, closeDropdown } = useDropdown(emit)
const apps = ref([])
const isLoading = ref(true)
const hasLoaded = ref(false)
/** Повторные попытки: remotes/токен часто появляются позже первой сборки. */
const RETRY_DELAYS_MS = [800, 2000, 4000, 7000, 11000]
let retryTimers = []
let retryAttempt = 0
let loadSeq = 0

const isButtonVisible = computed(() => (
  hasLoaded.value && userStore.isAuthenticated && apps.value.length > 0
))

function clearRetryTimers() {
  retryTimers.forEach((id) => window.clearTimeout(id))
  retryTimers = []
}

function scheduleEmptyRetries() {
  clearRetryTimers()
  if (!userStore.isAuthenticated || apps.value.length > 0) {
    return
  }
  RETRY_DELAYS_MS.slice(retryAttempt).forEach((delay) => {
    const timer = window.setTimeout(() => {
      retryAttempt += 1
      void loadApps({ scheduleRetries: false })
    }, delay)
    retryTimers.push(timer)
  })
}

const loadApps = async ({ scheduleRetries = true } = {}) => {
  const seq = ++loadSeq
  try {
    isLoading.value = true
    const next = await collectVisibleAppsMenuItems()
    if (seq !== loadSeq) {
      return
    }
    apps.value = next
    if (next.length > 0) {
      retryAttempt = RETRY_DELAYS_MS.length
      clearRetryTimers()
    } else if (scheduleRetries) {
      scheduleEmptyRetries()
    }
  } catch (error) {
    if (seq !== loadSeq) {
      return
    }
    logError('Ошибка загрузки приложений:', error)
    apps.value = []
    if (scheduleRetries) {
      scheduleEmptyRetries()
    }
  } finally {
    if (seq === loadSeq) {
      isLoading.value = false
      hasLoaded.value = true
    }
  }
}

defineExpose({
  closeDropdown,
})

const goToApp = async (app) => {
  closeDropdown()
  if (typeof app.onClick === 'function') {
    try {
      const opened = await app.onClick()
      if (opened === false) {
        logError(`Приложение не открылось (обработчик вернул false): ${app.id || app.name || ''}`)
      }
    } catch (error) {
      logError('Ошибка открытия приложения:', error)
    }
    return
  }
  if (app.route) {
    router.push(app.route)
  }
}

function onAccessOrScopeChanged() {
  if (!userStore.isAuthenticated) {
    return
  }
  retryAttempt = 0
  void loadApps({ scheduleRetries: true })
}

function onBridgeGroupChanged(payload) {
  if (payload?.group !== APPS_MENU_ITEMS_GROUP) {
    return
  }
  onAccessOrScopeChanged()
}

onMounted(async () => {
  window.addEventListener('access-token-changed', onAccessOrScopeChanged)
  window.addEventListener('session-scope-changed', onAccessOrScopeChanged)
  bridge.subscribe('group.changed', onBridgeGroupChanged)
  await loadApps()
})

onUnmounted(() => {
  window.removeEventListener('access-token-changed', onAccessOrScopeChanged)
  window.removeEventListener('session-scope-changed', onAccessOrScopeChanged)
  bridge.unsubscribe('group.changed', onBridgeGroupChanged)
  clearRetryTimers()
})

watch(isOpen, async (open) => {
  if (open) {
    await loadApps({ scheduleRetries: false })
  }
})

watch(() => userStore.isAuthenticated, async (authenticated) => {
  if (authenticated) {
    retryAttempt = 0
    await loadApps({ scheduleRetries: true })
  } else {
    clearRetryTimers()
    apps.value = []
    hasLoaded.value = true
  }
})

watch(isButtonVisible, (visible) => {
  emit('visibility-change', visible)
  if (!visible) {
    closeDropdown()
  }
}, { immediate: true })
</script>

<template>
  <div v-if="isButtonVisible" ref="dropdownRef" class="apps-menu-wrapper">
    <HoverTooltip :text="t('menu.apps.title')">
      <button
        type="button"
        class="header-btn apps-menu-btn"
        :class="{ 'apps-menu-btn--open': isOpen }"
        :aria-label="t('menu.apps.title')"
        :aria-expanded="isOpen"
        aria-haspopup="true"
        @click.stop="toggleDropdown"
      >
        <LucideIcon :name="CORE_ICON.apps" :size="props.iconSize" aria-hidden="true" />
      </button>
    </HoverTooltip>
    <Transition name="dropdown">
      <div v-if="isOpen" class="apps-dropdown-menu">
        <LoadingContentArea :loading="isLoading" min-height="3rem">
          <div v-if="apps.length === 0" class="apps-menu__empty text-muted text-center py-3">
            {{ t('menu.apps.empty') }}
          </div>
          <div v-else class="apps-menu__grid">
            <div
              v-for="(app, index) in apps"
              :key="app.name"
              @click="goToApp(app)"
              class="apps-menu__item"
              :title="app.title"
              :style="{ transitionDelay: `${index * 30}ms` }"
            >
              <div class="apps-menu__icon">
                <LucideIcon v-if="app.icon" :name="app.icon" :size="18" />
                <span v-else class="apps-menu__icon-placeholder">{{ app.title.charAt(0) }}</span>
              </div>
              <div class="apps-menu__title">{{ app.title }}</div>
            </div>
          </div>
        </LoadingContentArea>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.apps-menu-wrapper {
  position: relative;
  display: inline-block;
}

.apps-menu-btn {
  border: none;
  background-color: transparent;
  color: inherit;
  // Scoped background перекрывает глобальный .header-btn:hover
  &:hover,
  &--open {
    background-color: var(--color-hover-background);
  }
}

.apps-dropdown-menu {
  @include dropdown-menu-base;
  left: 50%;
  transform: translate(-50%, -8px);
  min-width: min(240px, calc(100vw - 1rem));
  max-width: min(320px, calc(100vw - 1rem));
  padding: 0.375rem;

  :deep(.loading-content-area--content) {
    min-height: 0 !important;
  }
}

.apps-menu__empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.25rem;
}

.apps-menu__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.25rem;

  @media (width < $ui-bp-sm) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.apps-menu__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.625rem 0.375rem;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.15s ease;
  text-align: center;
  min-height: 0;

  &:hover {
    background-color: var(--color-hover-background);

    .apps-menu__icon {
      background-color: color-mix(in srgb, var(--color-accent) 16%, var(--color-secondary-background, #f8f9fa));
      border-color: color-mix(in srgb, var(--color-accent) 28%, var(--color-border, #dee2e6));
      color: var(--color-accent);
    }
  }

  &:active {
    transform: scale(0.97);
  }

  @include ui-reduced-motion;
}

.apps-menu__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  color: var(--color-primary-text);
  border: 1px solid color-mix(in srgb, var(--color-border, #dee2e6) 80%, transparent);
  border-radius: 9px;
  background-color: color-mix(
    in srgb,
    var(--color-secondary-background, #f8f9fa) 88%,
    var(--color-accent) 12%
  );
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.apps-menu__icon-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8125rem;
  line-height: 1;
  color: inherit;
}

.apps-menu__title {
  font-size: 0.6875rem;
  color: var(--color-primary-text);
  text-align: center;
  word-break: break-word;
  line-height: 1.25;
  font-weight: 500;
  max-width: 100%;
}
</style>

<style lang="scss">
.apps-dropdown-menu.dropdown-enter-active,
.apps-dropdown-menu.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.apps-dropdown-menu.dropdown-enter-from {
  opacity: 0;
  transform: translate(-50%, -16px) !important;
}

.apps-dropdown-menu.dropdown-enter-to {
  opacity: 1;
  transform: translate(-50%, -8px) !important;
}

.apps-dropdown-menu.dropdown-leave-from {
  opacity: 1;
  transform: translate(-50%, -8px) !important;
}

.apps-dropdown-menu.dropdown-leave-to {
  opacity: 0;
  transform: translate(-50%, -16px) !important;
}
</style>
