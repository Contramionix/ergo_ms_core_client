<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const TRANSITION_MS = 300

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  left: {
    type: String,
    default: '0',
  },
  width: {
    type: String,
    default: '768px',
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
  closeOnEsc: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['close'])

const isClosing = ref(false)
const isPanelOpen = ref(false)
const titleId = useId()

const isRendered = computed(() => props.visible || isClosing.value)

const panelStyle = computed(() => ({
  '--side-drawer-left': props.left,
  '--side-drawer-width': props.width,
}))

function requestClose() {
  if (isClosing.value || !props.visible) {
    return
  }

  isClosing.value = true
  isPanelOpen.value = false
  window.setTimeout(() => {
    emit('close')
    isClosing.value = false
  }, TRANSITION_MS)
}

async function openPanel() {
  isPanelOpen.value = false
  await nextTick()
  requestAnimationFrame(() => {
    if (props.visible && !isClosing.value) {
      isPanelOpen.value = true
    }
  })
}

function onBackdropClick() {
  if (props.closeOnBackdrop) {
    requestClose()
  }
}

function onKeydown(event) {
  if (event.key !== 'Escape' || !props.closeOnEsc || !props.visible) {
    return
  }
  requestClose()
}

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) {
      isPanelOpen.value = false
      isClosing.value = false
      return
    }
    isClosing.value = false
    openPanel()
  },
)

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible && props.closeOnEsc) {
      window.addEventListener('keydown', onKeydown)
      return
    }
    window.removeEventListener('keydown', onKeydown)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  isPanelOpen.value = false
  isClosing.value = false
})

defineExpose({ requestClose })
</script>

<template>
  <Teleport to="body">
    <template v-if="isRendered">
      <div
        class="side-drawer-backdrop"
        :class="{ 'side-drawer-backdrop--visible': isPanelOpen }"
        :style="panelStyle"
        @click="onBackdropClick"
      />

      <aside
        class="side-drawer"
        :class="{
          'side-drawer--open': isPanelOpen,
        }"
        :style="panelStyle"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
        tabindex="-1"
      >
        <header class="side-drawer__header">
          <slot name="header">
            <h2 :id="titleId" class="side-drawer__title">
              {{ title }}
            </h2>
            <button
              type="button"
              class="btn-close"
              aria-label="Закрыть"
              @click="requestClose"
            />
          </slot>
        </header>

        <div class="side-drawer__body">
          <slot />
        </div>
      </aside>
    </template>
  </Teleport>
</template>

<style scoped lang="scss">
$drawer-radius: 12px;
$drawer-z-backdrop: 1040;
$drawer-z-panel: 1050;
$drawer-anchor-transition: 0.3s ease-in-out;

.side-drawer-backdrop {
  position: fixed;
  top: 0;
  left: var(--side-drawer-left, 0);
  width: calc(100vw - var(--side-drawer-left, 0px));
  height: 100dvh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: $drawer-z-backdrop;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.3s ease-in-out,
    left $drawer-anchor-transition,
    width $drawer-anchor-transition;

  &--visible {
    opacity: 1;
  }
}

.side-drawer {
  position: fixed;
  top: 0;
  left: var(--side-drawer-left, 0);
  width: var(--side-drawer-width, 768px);
  height: 100dvh;
  z-index: $drawer-z-panel;
  display: flex;
  flex-direction: column;
  background-color: var(--bs-card-bg);
  border-left: none;
  border-radius: 0 $drawer-radius $drawer-radius 0;
  box-shadow: none;
  transform: translateX(-100%);
  transition:
    transform 0.3s ease-in-out,
    left $drawer-anchor-transition;

  &--open {
    transform: translateX(0);
  }
}

.side-drawer__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1rem 0.5rem;
  background-color: var(--bs-card-bg);
}

.side-drawer__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.2;
  color: var(--color-primary-text);
}

.side-drawer__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background-color: var(--bs-card-bg);
}

@media (width < 1200px) {
  .side-drawer-backdrop,
  .side-drawer {
    left: 0;
    width: 100vw;
    border-radius: 0;
  }

  .side-drawer-backdrop {
    width: 100vw;
  }
}
</style>
