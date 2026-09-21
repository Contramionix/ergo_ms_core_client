<template>
  <div class="ag">
    <button
      v-show="data"
      type="button"
      class="ag__filters-btn"
      :aria-expanded="filtersOpen"
      aria-controls="graph-atlas-filters"
      @click="filtersOpen = !filtersOpen"
    >
      <SlidersHorizontal :size="16" />
      <span>{{ resolvedFiltersLabel }}</span>
    </button>
    <div v-show="data && filtersOpen" id="graph-atlas-filters">
      <slot name="filters" />
    </div>

    <div
      ref="stageRef"
      class="ag__stage"
      :class="{ 'ag__stage--fullscreen': isFullscreen }"
    >
      <div
        class="atlas ag__canvas"
        :class="{ 'atlas--embed': embed }"
        ref="rootEl"
        @pointerenter="canvasHot = true"
        @pointerleave="canvasHot = false"
      >
        <div class="atlas__viewport">
          <canvas class="atlas__map" :aria-label="resolvedCanvasLabel" />
        </div>
        <div
          class="ag__zoom"
          role="group"
          :aria-label="resolvedZoomGroup"
          @pointerdown.stop
          @click.stop
        >
          <button
            type="button"
            class="ag__zoom-btn"
            :aria-label="resolvedZoomIn"
            @click="zoomIn"
          >
            <ZoomIn :size="16" />
          </button>
          <button
            type="button"
            class="ag__zoom-btn"
            :aria-label="resolvedZoomOut"
            @click="zoomOut"
          >
            <ZoomOut :size="16" />
          </button>
          <button
            type="button"
            class="ag__zoom-btn"
            :aria-label="resolvedFit"
            @click="fitView"
          >
            <Maximize2 :size="16" />
          </button>
          <button
            type="button"
            class="ag__zoom-btn"
            :aria-label="isFullscreen
              ? resolvedFullscreenExit
              : resolvedFullscreen"
            :aria-pressed="isFullscreen"
            @click="toggleFullscreen"
          >
            <Minimize2 v-if="isFullscreen" :size="16" />
            <Fullscreen v-else :size="16" />
          </button>
        </div>

        <slot name="loading">
          <SpinnerLoading v-if="loading" class="atlas__state" :loading-text="resolvedLoadingText" />
        </slot>
        <slot v-if="error && !data" name="error" />
        <slot v-else-if="empty && !data" name="empty" />

        <slot name="panel" />
        <div class="atlas__tip" />
        <div v-show="data" class="atlas__hint">
          <slot name="hint" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ZoomIn, ZoomOut, Maximize2, Fullscreen, Minimize2, SlidersHorizontal } from '@lucide/vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import { mountGraphAtlas } from '@/js/graphAtlas/engine.js'
import { useGraphFullscreen } from '@/js/useGraphFullscreen.js'

const props = defineProps({
  data: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  empty: { type: Boolean, default: false },
  embed: { type: Boolean, default: false },
  focusId: { type: String, default: '' },
  egoIds: { type: Array, default: () => [] },
  debug: { type: Boolean, default: false },
  filters: { type: Object, default: () => ({}) },
  strings: { type: Object, default: () => ({}) },
  filtersLabel: { type: String, default: '' },
  canvasLabel: { type: String, default: '' },
  loadingText: { type: String, default: '' },
  zoomGroupLabel: { type: String, default: '' },
  zoomInLabel: { type: String, default: '' },
  zoomOutLabel: { type: String, default: '' },
  fitLabel: { type: String, default: '' },
  fullscreenLabel: { type: String, default: '' },
  fullscreenExitLabel: { type: String, default: '' },
})

const emit = defineEmits(['select'])

const { t } = useAppI18n()
const { locale } = useI18n()
const rootEl = ref(null)
const stageRef = ref(null)
const canvasHot = ref(false)
const filtersOpen = ref(false)

let api = null

const { isFullscreen, toggleFullscreen } = useGraphFullscreen(stageRef, {
  onToggle: () => { api?.resize?.() },
})

const resolvedFiltersLabel = computed(
  () => props.filtersLabel || t('components.graphAtlas.filters'),
)
const resolvedCanvasLabel = computed(
  () => props.canvasLabel || t('components.graphAtlas.canvasLabel'),
)
const resolvedLoadingText = computed(
  () => props.loadingText || t('components.graphAtlas.loading'),
)
const resolvedZoomGroup = computed(
  () => props.zoomGroupLabel || t('components.graphAtlas.zoomGroup'),
)
const resolvedZoomIn = computed(
  () => props.zoomInLabel || t('components.graphAtlas.zoomIn'),
)
const resolvedZoomOut = computed(
  () => props.zoomOutLabel || t('components.graphAtlas.zoomOut'),
)
const resolvedFit = computed(
  () => props.fitLabel || t('components.graphAtlas.fit'),
)
const resolvedFullscreen = computed(
  () => props.fullscreenLabel || t('components.graphAtlas.fullscreen'),
)
const resolvedFullscreenExit = computed(
  () => props.fullscreenExitLabel || t('components.graphAtlas.fullscreenExit'),
)

function egoIdsForEngine() {
  if (props.egoIds?.length) return props.egoIds.filter(Boolean)
  if (props.embed && props.focusId) return [props.focusId]
  return []
}

function destroy() {
  api?.destroy()
  api = null
}

function onEngineSelect(node) {
  emit('select', node)
}

function zoomIn() {
  api?.zoomBy(1.25)
}

function zoomOut() {
  api?.zoomBy(0.8)
}

function fitView() {
  api?.fit()
}

function mount() {
  destroy()
  if (!rootEl.value || !props.data) return
  api = mountGraphAtlas(rootEl.value, {
    data: props.data,
    strings: props.strings,
    locale: locale.value,
    debug: props.debug,
    filters: props.filters || {},
    egoIds: egoIdsForEngine(),
    onSelect: onEngineSelect,
  })
  if (props.focusId) api.selectById(props.focusId, !egoIdsForEngine().length)
}

function onFullscreenHotkey(event) {
  if (event.key !== 'f' && event.key !== 'F') return
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
  if (!isFullscreen.value && !canvasHot.value) return
  event.preventDefault()
  toggleFullscreen()
}

function pushFilters() {
  api?.setFilters(props.filters || {})
}

watch(() => props.data, () => mount())
watch(
  () => [props.embed, props.focusId, ...(props.egoIds || [])],
  () => {
    if (!api) return
    const ids = egoIdsForEngine()
    api.setEgoIds(ids)
    if (props.focusId) api.selectById(props.focusId, false)
  },
)
watch(() => props.filters, (next, prev) => {
  if (!api) return
  const areas = next?.areas
  const prevAreas = prev?.areas
  if (areas && areas !== prevAreas) {
    api.setAreas(areas)
  }
  pushFilters()
}, { deep: true })

onMounted(() => {
  document.addEventListener('keydown', onFullscreenHotkey)
  mount()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onFullscreenHotkey)
  destroy()
})

defineExpose({
  selectById: (id, fly = false) => api?.selectById(id, fly),
  unselect: () => api?.unselect(),
  resize: () => api?.resize(),
})
</script>

<style src="./GraphAtlas.chrome.scss"></style>
<style src="./GraphAtlas.canvas.scss"></style>
