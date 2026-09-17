<template>
  <span v-if="visible && label" class="document-viewer-page-hud" role="status" aria-live="polite">{{ label }}</span>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { countDocxPages, docxPageAtViewport } from '@/js/utils/documentViewerDocx.js'

const HUD_HIDE_MS = 900

const props = defineProps({
  stage: {
    default: null,
  },
  host: {
    default: null,
  },
  active: {
    type: Boolean,
    default: false,
  },
})

const { t } = useAppI18n()
const visible = ref(false)
const current = ref(1)
const total = ref(0)
let hideTimer = 0
let boundStage = null

const label = computed(() => {
  if (total.value < 2) {
    return ''
  }
  return t('components.documentViewer.pageOf', {
    current: current.value,
    total: total.value,
  })
})

function clearHideTimer() {
  window.clearTimeout(hideTimer)
  hideTimer = 0
}

function hideHud() {
  visible.value = false
  clearHideTimer()
}

function onStageScroll() {
  if (!props.active || !props.host || !props.stage) {
    hideHud()
    return
  }
  const pages = countDocxPages(props.host)
  total.value = pages
  if (pages < 2) {
    hideHud()
    return
  }
  current.value = docxPageAtViewport(props.host, props.stage)
  visible.value = true
  clearHideTimer()
  hideTimer = window.setTimeout(hideHud, HUD_HIDE_MS)
}

function unbindStage() {
  if (!boundStage) {
    return
  }
  boundStage.removeEventListener('scroll', onStageScroll)
  boundStage = null
}

function bindStage(el) {
  unbindStage()
  if (!el) {
    return
  }
  boundStage = el
  boundStage.addEventListener('scroll', onStageScroll, { passive: true })
}

watch(
  () => [props.stage, props.active],
  ([stage, active]) => {
    if (!active) {
      unbindStage()
      hideHud()
      return
    }
    bindStage(stage)
  },
  { immediate: true },
)

onUnmounted(() => {
  unbindStage()
  hideHud()
})
</script>

<style scoped lang="scss">
.document-viewer-page-hud {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  z-index: 2;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  transform: translateX(-50%);
  background-color: var(--bs-tooltip-bg, rgba(0, 0, 0, 0.85));
  color: var(--bs-tooltip-color, #fff);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>