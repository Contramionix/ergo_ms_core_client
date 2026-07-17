<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

import { useDropdown } from '@/composables/useDropdown.js'
import { OVERLAY_MENU_Z_INDEX } from '@/js/utils/overlayZIndex.js'

const props = defineProps({
  makeCenter: { type: Boolean, default: false },
  dropdownMenuClass: { type: String, default: '' },
  /** Зазор между триггером и меню по вертикали, px (legacy: offset "0,N") */
  offset: { type: String, default: '0,4' },
  inset: { type: String, default: '0 0 auto auto' },
  transform: { type: String, default: 'translate(0px, 40px)' },
  menuMinWidth: { type: Number, default: 160 },
})

const emit = defineEmits(['dropdown-toggle'])

const menuEl = ref(null)
const menuStyle = ref({
  top: '0px',
  left: '0px',
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
  const maxWidth = Math.max(0, window.innerWidth - VIEWPORT_PADDING * 2)
  const minWidth = Math.max(props.menuMinWidth, triggerRect.width)
  const width = Math.min(minWidth, maxWidth)

  let left
  if (alignEnd.value) {
    left = triggerRect.right - width
  } else if (props.makeCenter) {
    left = triggerRect.left + triggerRect.width / 2 - width / 2
  } else {
    left = triggerRect.left
  }
  left = Math.min(left, window.innerWidth - VIEWPORT_PADDING - width)
  left = Math.max(VIEWPORT_PADDING, left)

  let top = triggerRect.bottom + gap
  const menuHeight = menuEl.value?.getBoundingClientRect().height || 0

  if (menuHeight && top + menuHeight > window.innerHeight - VIEWPORT_PADDING) {
    const aboveTop = triggerRect.top - menuHeight - gap
    if (aboveTop >= VIEWPORT_PADDING) {
      top = aboveTop
    }
  }

  const style = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    minWidth: `${width}px`,
    maxWidth: `${maxWidth}px`,
    zIndex: OVERLAY_MENU_Z_INDEX,
    display: 'block',
  }

  if (menuHeight) {
    const maxHeight = window.innerHeight - VIEWPORT_PADDING * 2
    if (menuHeight > maxHeight) {
      style.maxHeight = `${maxHeight}px`
      style.overflowY = 'auto'
    }
  }

  menuStyle.value = style
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
  <div ref="dropdownRef" :class="makeCenter ? 'dropdown-center' : 'dropdown'">
    <div
      class="dropdown-button rounded p-2"
      role="button"
      tabindex="0"
      :aria-expanded="isOpen"
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
        :class="dropdownMenuClass"
        :style="menuStyle"
        @click.stop
      >
        <slot name="list" />
      </ul>
    </teleport>
  </div>
</template>

<style lang="scss">
// Кнопка открытия
.dropdown-button {
  cursor: pointer;
  transition: all $transition;

  &:hover {
    background-color: var(--color-secondary-background);
  }
}

// Пункт меню
.dropdown-item {
  @include flex-row-gap(0.625rem, center);
  transition: background-color $transition;
  padding: $padding-internal $padding-external;
  cursor: pointer;
}

// Teleport-меню: позиция через fixed, без Bootstrap JS
.dropdown-menu-teleport {
  background-color: var(--bs-card-bg, var(--bs-body-bg));
  border: 1px solid var(--bs-border-color, var(--ui-border));
  border-radius: var(--bs-border-radius, 0.375rem);
  box-shadow: var(--bs-box-shadow, 0 0.5rem 1rem rgba(0, 0, 0, 0.15));
  padding: 0.5rem 0;
  margin: 0;
  list-style: none;
}

.dropdown-menu-teleport .dropdown-item {
  opacity: 1;
  transform: none;
}

// Legacy: inline-меню в DOM (без teleport) — скрыто, пока DropDown не открыт через JS
.dropdown .dropdown-menu:not(.dropdown-menu-teleport),
.dropdown-center .dropdown-menu:not(.dropdown-menu-teleport) {
  background-color: var(--bs-card-bg);
  transition:
    max-height 0.3s,
    opacity 0.2s 0.1s,
    visibility 0s 0.3s;
  max-height: 0;
  display: block;
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.dropdown .dropdown-menu-end:not(.dropdown-menu-teleport) {
  inset: v-bind(inset);
  transform: v-bind(transform);
}

.dropdown .dropdown-menu.show:not(.dropdown-menu-teleport),
.dropdown-center .dropdown-menu.show:not(.dropdown-menu-teleport) {
  transition:
    max-height 0.3s,
    opacity 0.2s,
    visibility 0s;
  max-height: 190px;
  opacity: 1;
  visibility: visible;
  pointer-events: all;
}
</style>
