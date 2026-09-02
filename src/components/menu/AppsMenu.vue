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
/** Квадратная плитка без подписи: крупнее кнопок тулбара, чтобы сетка читалась. */
const CELL_PX = 56
const ICON_PX = 24
const CELL_GAP_PX = 8
const MENU_PAD_PX = 10
const BORDER_PX = 2
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

function chromePx() {
  return MENU_PAD_PX * 2 + BORDER_PX
}

function gridSize(count, stride) {
  return count * CELL_PX + Math.max(0, count - 1) * stride
}

/**
 * Сколько колонок/рядов влезает в свободное место у кнопки.
 * Высота панели = содержимое + рамка; прокрутка только если ряды не влезают.
 */
function computeGridMetrics(count, availableWidth, availableHeight) {
  const n = Math.max(count, 1)
  const innerWidth = Math.max(CELL_PX, availableWidth - chromePx())
  const innerHeight = Math.max(CELL_PX, availableHeight - chromePx())
  const maxColsByWidth = Math.max(1, Math.floor((innerWidth + CELL_GAP_PX) / (CELL_PX + CELL_GAP_PX)))
  // 1–2: в ряд; до 6: до 3 колонок; дальше до 4 — чтобы панель не раздувалась.
  const preferred = n <= 2 ? n : n <= 6 ? Math.min(3, n) : Math.min(MAX_COLS, n)
  const cols = Math.max(1, Math.min(MAX_COLS, maxColsByWidth, preferred))
  const maxRowsByHeight = Math.max(1, Math.floor((innerHeight + CELL_GAP_PX) / (CELL_PX + CELL_GAP_PX)))
  const rowsNeeded = Math.ceil(n / cols)
  const visibleRows = Math.min(rowsNeeded, maxRowsByHeight)
  const fits = rowsNeeded <= maxRowsByHeight
  return {
    cols,
    width: chromePx() + gridSize(cols, CELL_GAP_PX),
    height: chromePx() + gridSize(visibleRows, CELL_GAP_PX),
    overflowY: fits ? 'hidden' : 'auto',
  }
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
  const availableHeight = Math.max(chromePx() + CELL_PX, openUp ? spaceAbove : spaceBelow)
  const availableWidth = Math.max(chromePx() + CELL_PX, vw - VIEWPORT_PADDING * 2)

  const metrics = computeGridMetrics(apps.value.length, availableWidth, availableHeight)

  let left = triggerRect.left + triggerRect.width / 2 - metrics.width / 2
  left = Math.min(left, vw - VIEWPORT_PADDING - metrics.width)
  left = Math.max(VIEWPORT_PADDING, left)

  let top
  if (openUp) {
    top = triggerRect.top - MENU_GAP - metrics.height
  } else {
    top = triggerRect.bottom + MENU_GAP
  }
  top = Math.min(Math.max(top, VIEWPORT_PADDING), vh - VIEWPORT_PADDING)

  menuStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${metrics.width}px`,
    height: `${metrics.height}px`,
    overflowY: metrics.overflowY,
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
          <LoadingContentArea :loading="isLoading" min-height="0">
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
                      <LucideIcon v-if="app.icon" :name="app.icon" :size="ICON_PX" />
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
  padding: var(--apps-pad, 10px);
  overflow-x: hidden;
  overflow-y: hidden;
  background-color: var(--bs-card-bg, var(--color-secondary-background, #fff));
  border: 1px solid color-mix(in srgb, var(--color-border, #dee2e6) 80%, transparent);
  border-radius: 0.75rem;
  box-shadow: 0 0.25rem 0.75rem 0 rgba(34, 48, 62, 0.14);

  .loading-content-area,
  .loading-content-area--content,
  .loading-content-area__slot {
    min-height: 0 !important;
    height: 100%;
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
  grid-template-columns: repeat(var(--apps-cols, 3), var(--apps-cell, 56px));
  grid-auto-rows: var(--apps-cell, 56px);
  gap: var(--apps-gap, 8px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.apps-menu__cell {
  width: var(--apps-cell, 56px);
  height: var(--apps-cell, 56px);
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
  width: 2.5rem;
  height: 2.5rem;
  color: var(--color-primary-text);
  border: 1px solid color-mix(in srgb, var(--color-border, #dee2e6) 80%, transparent);
  border-radius: 0.625rem;
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
