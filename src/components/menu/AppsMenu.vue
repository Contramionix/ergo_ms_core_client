<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'
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
import { hideAllHoverTooltips } from '@/js/utils/hoverTooltipLayer.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { OVERLAY_MENU_Z_INDEX } from '@/js/utils/overlayZIndex.js'

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
const menuEl = ref(null)
const triggerBtn = ref(null)
const menuStyle = ref({})

const { dropdownRef, isOpen, toggleDropdown, closeDropdown } = useDropdown(emit, {
  getExtraNodes: () => [menuEl.value].filter(Boolean),
})

const apps = ref([])
const isLoading = ref(true)
const hasLoaded = ref(false)
/** Повторные попытки: remotes/токен часто появляются позже первой сборки. */
const RETRY_DELAYS_MS = [800, 2000, 4000, 7000, 11000]
let retryTimers = []
let retryAttempt = 0
let loadSeq = 0

const VIEWPORT_PADDING = 8
const MENU_GAP = 8
/** Квадратная ячейка иконки (кнопка без подписи). */
const CELL_PX = 44
const CELL_GAP_PX = 4
const MENU_PAD_PX = 6
const MAX_COLS = 4

const isButtonVisible = computed(() => (
  hasLoaded.value && userStore.isAuthenticated && apps.value.length > 0
))

const tooltipText = computed(() => (
  isOpen.value ? '' : t('menu.apps.title')
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
    // null — токен/снимок прав ещё не готовы: не фиксируем «пусто», ждём retry.
    if (next === null) {
      if (scheduleRetries) {
        scheduleEmptyRetries()
      }
      return
    }
    apps.value = next
    hasLoaded.value = true
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
    hasLoaded.value = true
    if (scheduleRetries) {
      scheduleEmptyRetries()
    }
  } finally {
    if (seq === loadSeq) {
      isLoading.value = false
    }
  }
}

/**
 * Сколько колонок/рядов влезает в свободное место у кнопки.
 * Ширина панели фиксируется под сетку, лишние ряды уходят в прокрутку.
 */
function computeGridMetrics(count, availableWidth, availableHeight) {
  const n = Math.max(count, 1)
  const maxColsByWidth = Math.max(
    1,
    Math.floor((availableWidth - MENU_PAD_PX * 2 + CELL_GAP_PX) / (CELL_PX + CELL_GAP_PX)),
  )
  // 1–2: в ряд; до 6: до 3 колонок; дальше до 4 — чтобы панель не раздувалась.
  const preferred = n <= 2 ? n : n <= 6 ? Math.min(3, n) : Math.min(MAX_COLS, n)
  const cols = Math.max(1, Math.min(MAX_COLS, maxColsByWidth, preferred))
  const maxRowsByHeight = Math.max(
    1,
    Math.floor((availableHeight - MENU_PAD_PX * 2 + CELL_GAP_PX) / (CELL_PX + CELL_GAP_PX)),
  )
  const rowsNeeded = Math.ceil(n / cols)
  const visibleRows = Math.min(rowsNeeded, maxRowsByHeight)
  const width = MENU_PAD_PX * 2 + cols * CELL_PX + Math.max(0, cols - 1) * CELL_GAP_PX
  const maxHeight = MENU_PAD_PX * 2 + visibleRows * CELL_PX + Math.max(0, visibleRows - 1) * CELL_GAP_PX
  return { cols, width, maxHeight }
}

function updateMenuPosition() {
  const trigger = triggerBtn.value
  if (!trigger) {
    return
  }

  const triggerRect = trigger.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const spaceAbove = triggerRect.top - MENU_GAP - VIEWPORT_PADDING
  const spaceBelow = vh - VIEWPORT_PADDING - (triggerRect.bottom + MENU_GAP)
  const openUp = spaceAbove >= spaceBelow
  const availableHeight = Math.max(CELL_PX + MENU_PAD_PX * 2, openUp ? spaceAbove : spaceBelow)
  const availableWidth = Math.max(CELL_PX + MENU_PAD_PX * 2, vw - VIEWPORT_PADDING * 2)

  const metrics = computeGridMetrics(apps.value.length, availableWidth, availableHeight)

  let left = triggerRect.left + triggerRect.width / 2 - metrics.width / 2
  left = Math.min(left, vw - VIEWPORT_PADDING - metrics.width)
  left = Math.max(VIEWPORT_PADDING, left)

  let top
  if (openUp) {
    top = triggerRect.top - MENU_GAP - metrics.maxHeight
  } else {
    top = triggerRect.bottom + MENU_GAP
  }
  top = Math.min(Math.max(top, VIEWPORT_PADDING), vh - VIEWPORT_PADDING)

  menuStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${metrics.width}px`,
    maxHeight: `${metrics.maxHeight}px`,
    zIndex: OVERLAY_MENU_Z_INDEX,
    '--apps-cols': String(metrics.cols),
    '--apps-cell': `${CELL_PX}px`,
    '--apps-gap': `${CELL_GAP_PX}px`,
    '--apps-pad': `${MENU_PAD_PX}px`,
  }
}

defineExpose({
  closeDropdown,
})

const goToApp = async (app) => {
  hideAllHoverTooltips()
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

function onWindowChange() {
  if (!isOpen.value) {
    return
  }
  updateMenuPosition()
}

onMounted(async () => {
  window.addEventListener('access-token-changed', onAccessOrScopeChanged)
  window.addEventListener('session-scope-changed', onAccessOrScopeChanged)
  window.addEventListener('resize', onWindowChange)
  window.addEventListener('scroll', onWindowChange, true)
  bridge.subscribe('group.changed', onBridgeGroupChanged)
  await loadApps()
})

onUnmounted(() => {
  window.removeEventListener('access-token-changed', onAccessOrScopeChanged)
  window.removeEventListener('session-scope-changed', onAccessOrScopeChanged)
  window.removeEventListener('resize', onWindowChange)
  window.removeEventListener('scroll', onWindowChange, true)
  bridge.unsubscribe('group.changed', onBridgeGroupChanged)
  clearRetryTimers()
})

onBeforeUnmount(() => {
  clearRetryTimers()
})

watch(isOpen, async (open) => {
  if (open) {
    hideAllHoverTooltips()
    await loadApps({ scheduleRetries: false })
    await nextTick()
    updateMenuPosition()
    requestAnimationFrame(() => updateMenuPosition())
  } else {
    hideAllHoverTooltips()
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

watch(() => apps.value.length, () => {
  if (isOpen.value) {
    nextTick(() => updateMenuPosition())
  }
})
</script>

<template>
  <div v-if="isButtonVisible" ref="dropdownRef" class="apps-menu-wrapper">
    <HoverTooltip :text="tooltipText">
      <button
        ref="triggerBtn"
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
    <Teleport to="body">
      <Transition name="apps-dropdown">
        <div
          v-if="isOpen"
          ref="menuEl"
          class="apps-dropdown-menu"
          :style="menuStyle"
          role="menu"
          :aria-label="t('menu.apps.title')"
          @click.stop
        >
          <LoadingContentArea :loading="isLoading" min-height="2.75rem">
            <div v-if="apps.length === 0" class="apps-menu__empty text-muted text-center py-2">
              {{ t('menu.apps.empty') }}
            </div>
            <ul v-else class="apps-menu__grid">
              <li v-for="app in apps" :key="app.name" class="apps-menu__cell">
                <HoverTooltip :text="app.title">
                  <button
                    type="button"
                    class="apps-menu__item"
                    role="menuitem"
                    :aria-label="app.title"
                    @click="goToApp(app)"
                  >
                    <span class="apps-menu__icon" aria-hidden="true">
                      <LucideIcon v-if="app.icon" :name="app.icon" :size="18" />
                      <span v-else class="apps-menu__icon-placeholder">{{ app.title.charAt(0) }}</span>
                    </span>
                  </button>
                </HoverTooltip>
              </li>
            </ul>
          </LoadingContentArea>
        </div>
      </Transition>
    </Teleport>
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

  &:hover,
  &--open {
    background-color: var(--color-hover-background);
  }
}
</style>

<!-- Teleport в body: scoped-стили на меню не действуют без отдельного блока -->
<style lang="scss">
.apps-dropdown-menu {
  position: fixed;
  box-sizing: border-box;
  margin: 0;
  padding: var(--apps-pad, 6px);
  overflow-x: hidden;
  overflow-y: auto;
  background-color: var(--bs-card-bg, var(--color-secondary-background, #fff));
  border: 1px solid color-mix(in srgb, var(--color-border, #dee2e6) 80%, transparent);
  border-radius: 0.5rem;
  box-shadow: 0 0.25rem 0.75rem 0 rgba(34, 48, 62, 0.14);

  .loading-content-area--content {
    min-height: 0 !important;
  }
}

.apps-menu__empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem;
  font-size: 0.8125rem;
}

.apps-menu__grid {
  display: grid;
  grid-template-columns: repeat(var(--apps-cols, 3), var(--apps-cell, 44px));
  gap: var(--apps-gap, 4px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.apps-menu__cell {
  width: var(--apps-cell, 44px);
  height: var(--apps-cell, 44px);
  margin: 0;
  padding: 0;

  /* Перебивает inline-flex из HoverTooltip (scoped), чтобы ячейка была квадратом. */
  > .hover-tooltip.hover-tooltip {
    display: flex;
    width: 100%;
    height: 100%;
  }
}

.apps-menu__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.15s ease;

  &:hover,
  &:focus-visible {
    background-color: var(--color-hover-background);
    outline: none;

    .apps-menu__icon {
      background-color: color-mix(in srgb, var(--color-accent) 16%, var(--color-secondary-background, #f8f9fa));
      border-color: color-mix(in srgb, var(--color-accent) 28%, var(--color-border, #dee2e6));
      color: var(--color-accent);
    }
  }

  &:active {
    transform: scale(0.96);
  }
}

.apps-menu__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  color: var(--color-primary-text);
  border: 1px solid color-mix(in srgb, var(--color-border, #dee2e6) 80%, transparent);
  border-radius: 0.5rem;
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

.apps-dropdown-enter-active,
.apps-dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.apps-dropdown-enter-from,
.apps-dropdown-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
