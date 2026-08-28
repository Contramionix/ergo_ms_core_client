<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

import { useDropdown } from '@/composables/useDropdown.js'
import { OVERLAY_MENU_Z_INDEX } from '@/js/utils/overlayZIndex.js'

const props = defineProps({
  makeCenter: { type: Boolean, default: false },
  dropdownMenuClass: { type: String, default: '' },
  /** Зазор между триггером и меню по вертикали, px (формат offset "0,N") */
  offset: { type: String, default: '0,4' },
  menuMinWidth: { type: Number, default: 160 },
  /** Компактные пункты (меньший шрифт и отступы) */
  compact: { type: Boolean, default: false },
  /** bottom — под триггером; right — справа от триггера (длинные каталоги) */
  placement: { type: String, default: 'bottom' },
})

const emit = defineEmits(['dropdown-toggle'])

const menuEl = ref(null)
const menuStyle = ref({
  '--dropdown-menu-top': '0px',
  '--dropdown-menu-left': '0px',
  '--dropdown-menu-max-height': 'min(80dvh, calc(100dvh - 16px))',
  minWidth: '0px',
})

const { dropdownRef, isOpen, toggleDropdown, closeDropdown } = useDropdown(emit, {
  getExtraNodes: () => [menuEl.value].filter(Boolean),
})

const alignEnd = computed(() => props.dropdownMenuClass.includes('dropdown-menu-end'))

const VIEWPORT_PADDING = 8

function parseVerticalGap() {
  const parts = String(props.offset || '0,4').split(',')
  const y = Number.parseInt(parts[1], 10)
  return Number.isFinite(y) ? Math.max(0, y) : 4
}

function updateMenuPosition() {
  const root = dropdownRef.value
  if (!root) return

  const trigger = root.querySelector('.dropdown-button')
  if (!trigger) return

  const triggerRect = trigger.getBoundingClientRect()
  const gap = parseVerticalGap()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const maxWidth = Math.max(0, vw - VIEWPORT_PADDING * 2)
  const minWidth = Math.min(Math.max(props.menuMinWidth, triggerRect.width), maxWidth)

  const menuRect = menuEl.value?.getBoundingClientRect()
  const menuWidth = Math.min(
    Math.max(menuRect?.width || 0, minWidth),
    maxWidth,
  )
  const menuHeight = menuRect?.height || 0
  const spaceBelow = vh - VIEWPORT_PADDING - (triggerRect.bottom + gap)
  const spaceAbove = triggerRect.top - gap - VIEWPORT_PADDING

  let left
  let top
  let available

  if (props.placement === 'right') {
    left = triggerRect.right + gap
    if (left + menuWidth > vw - VIEWPORT_PADDING) {
      left = triggerRect.left - gap - menuWidth
    }
    const maxBox = Math.max(0, vh - VIEWPORT_PADDING * 2)
    top = triggerRect.top
    if (menuHeight) {
      top = Math.min(top, vh - VIEWPORT_PADDING - Math.min(menuHeight, maxBox))
    }
    top = Math.min(Math.max(top, VIEWPORT_PADDING), vh - VIEWPORT_PADDING)
    available = Math.max(0, vh - VIEWPORT_PADDING - top)
  } else {
    if (alignEnd.value) {
      left = triggerRect.right - menuWidth
    } else if (props.makeCenter) {
      left = triggerRect.left + triggerRect.width / 2 - menuWidth / 2
    } else {
      left = triggerRect.left
    }
    const openUp = menuHeight
      ? menuHeight > spaceBelow && spaceAbove > spaceBelow
      : spaceBelow < 240 && spaceAbove > spaceBelow
    available = Math.max(0, openUp ? spaceAbove : spaceBelow)
    if (openUp) {
      const usedHeight = menuHeight ? Math.min(menuHeight, available) : available
      top = triggerRect.top - gap - usedHeight
    } else {
      top = triggerRect.bottom + gap
    }
    top = Math.min(top, vh - VIEWPORT_PADDING - Math.min(menuHeight || available, available))
    top = Math.max(VIEWPORT_PADDING, top)
  }

  left = Math.min(left, vw - VIEWPORT_PADDING - menuWidth)
  left = Math.max(VIEWPORT_PADDING, left)

  menuStyle.value = {
    '--dropdown-menu-top': `${top}px`,
    '--dropdown-menu-left': `${left}px`,
    '--dropdown-menu-max-height': `${available}px`,
    minWidth: `${minWidth}px`,
    maxWidth: `${maxWidth}px`,
    zIndex: OVERLAY_MENU_Z_INDEX,
  }
}

watch(isOpen, (open) => {
  if (!open) return
  nextTick(() => {
    updateMenuPosition()
    requestAnimationFrame(() => updateMenuPosition())
  })
})

function onWindowChange() {
  if (!isOpen.value) return
  updateMenuPosition()
}

onMounted(() => {
  window.addEventListener('resize', onWindowChange)
  window.addEventListener('scroll', onWindowChange, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowChange)
  window.removeEventListener('scroll', onWindowChange, true)
})

defineExpose({
  closeDropdown,
})
</script>

<template>
  <div
    ref="dropdownRef"
    class="dropdown-root"
    :class="makeCenter ? 'dropdown-center' : 'dropdown'"
  >
    <div
      class="dropdown-button"
      role="button"
      tabindex="0"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      @click.stop="toggleDropdown"
      @keydown.enter.prevent="toggleDropdown"
      @keydown.space.prevent="toggleDropdown"
    >
      <slot name="main" />
    </div>
    <teleport to="body">
      <ul
        v-if="isOpen"
        ref="menuEl"
        class="dropdown-menu show dropdown-menu-teleport"
        :class="[dropdownMenuClass, { 'dropdown-menu-teleport--compact': compact }]"
        :style="menuStyle"
        role="menu"
        @click.stop
      >
        <slot name="list" />
      </ul>
    </teleport>
  </div>
</template>

<style lang="scss">
// Корень и триггер — bare: размер = слот #main, без Bootstrap p-2
.dropdown-root.dropdown,
.dropdown-root.dropdown-center {
  display: inline-flex;
  align-items: center;
  line-height: 0;
  vertical-align: middle;
}

.dropdown-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  line-height: 0;
  background: transparent;
  border: none;
  cursor: pointer;
}

// Пункт меню
.dropdown-item {
  @include flex-row-gap(0.625rem, center);
  transition: background-color $transition;
  padding: $padding-internal $padding-external;
  cursor: pointer;
}

// Teleport-меню: позиция через fixed, без Bootstrap JS
.dropdown-menu-teleport.dropdown-menu {
  position: fixed !important;
  top: var(--dropdown-menu-top, 0) !important;
  left: var(--dropdown-menu-left, 0) !important;
  right: auto !important;
  bottom: auto !important;
  display: block !important;
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  max-height: var(--dropdown-menu-max-height, min(80dvh, calc(100dvh - 16px))) !important;
  overflow-x: hidden;
  overflow-y: auto !important;
  transform: none !important;
  margin: 0 !important;
  background-color: var(--bs-card-bg, var(--bs-body-bg));
  border: 1px solid var(--bs-border-color, var(--ui-border));
  border-radius: var(--bs-border-radius, 0.375rem);
  box-shadow: var(--bs-box-shadow, 0 0.5rem 1rem rgba(0, 0, 0, 0.15));
  padding: 0.5rem 0;
  list-style: none;
}

.dropdown-menu-teleport .dropdown-item {
  opacity: 1 !important;
  transform: none !important;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  visibility: visible !important;
  pointer-events: auto !important;
}

.dropdown-menu-teleport--compact {
  padding: 2px 0;
  min-width: 0;
}

.dropdown-menu-teleport--compact .dropdown-item {
  padding: 6px 10px;
  font-size: 0.85rem;
  line-height: 1.2;
  gap: 0.4rem;
}
</style>
