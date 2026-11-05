<script setup>
/**
 * Анимированная Lucide-иконка по тому же имени, что LucideIcon.
 * Глиф без анимации в пакете и режим «без анимаций» остаются статическим LucideIcon.
 */
import { computed, shallowRef, watch } from 'vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { LUCIDE_STROKE_WIDTH } from '@/config/coreIconNames.js'
import { useUiModes } from '@/composables/useUiModes.js'
import { normalizeLucideIconName } from '@/js/lucideIconLoader.js'
import { getLucideMotionIconAsync } from '@/js/lucideMotionIconLoader.js'

const props = defineProps({
  name: {
    type: String,
    default: '',
  },
  size: {
    type: [Number, String],
    default: 20,
  },
  strokeWidth: {
    type: [Number, String],
    default: LUCIDE_STROKE_WIDTH,
  },
  iconClass: {
    type: [String, Object, Array],
    default: '',
  },
  animate: {
    type: [Boolean, String],
    default: false,
  },
  animateOnHover: {
    type: [Boolean, String],
    default: false,
  },
  animateOnTap: {
    type: [Boolean, String],
    default: false,
  },
  animateOnView: {
    type: [Boolean, String],
    default: false,
  },
  animation: {
    type: String,
    default: '',
  },
  clip: {
    type: Boolean,
    default: false,
  },
  triggerTarget: {
    type: String,
    default: '',
  },
  persistOnAnimateEnd: {
    type: Boolean,
    default: false,
  },
  initialOnAnimateEnd: {
    type: Boolean,
    default: false,
  },
})

const { reducedMotionActive } = useUiModes()
const MotionIcon = shallowRef(null)
let requestId = 0

const sizePx = computed(() => {
  const raw = props.size
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(Math.round(raw))
  }
  const text = String(raw ?? '').trim()
  if (/^\d+(\.\d+)?$/.test(text)) {
    return String(Math.round(Number(text)))
  }
  return ''
})

const sizeCss = computed(() => {
  if (sizePx.value) {
    return `${sizePx.value}px`
  }
  const text = String(props.size ?? '').trim()
  return text || '1em'
})

const showStatic = computed(() => reducedMotionActive.value || !MotionIcon.value)

watch(
  () => [props.name, reducedMotionActive.value],
  async ([name, reduced]) => {
    const id = ++requestId
    if (reduced || !normalizeLucideIconName(name)) {
      MotionIcon.value = null
      return
    }
    const component = await getLucideMotionIconAsync(name)
    if (id !== requestId) {
      return
    }
    MotionIcon.value = component
  },
  { immediate: true },
)
</script>

<template>
  <LucideIcon v-if="showStatic" :name="name" :size="size" :stroke-width="strokeWidth" :icon-class="iconClass"/>
  <span v-else class="icon-flex lucide-icon-host" :data-icon-size="sizePx || null" v-csp-style="sizePx ? undefined : { width: sizeCss, height: sizeCss }">
    <component :is="MotionIcon" :size="size" :stroke-width="strokeWidth" :class="iconClass" :animate="animate || undefined" :animate-on-hover="animateOnHover || undefined" :animate-on-tap="animateOnTap || undefined" :animate-on-view="animateOnView || undefined" :animation="animation || undefined" :clip="clip || undefined" :trigger-target="triggerTarget || undefined" :persist-on-animate-end="persistOnAnimateEnd || undefined" :initial-on-animate-end="initialOnAnimateEnd || undefined"/>
  </span>
</template>

<style scoped lang="scss">
.lucide-icon-host {
  width: 1em;
  height: 1em;
  line-height: 0;

  @for $size from 10 through 64 {
    &[data-icon-size='#{$size}'] {
      width: #{$size}px;
      height: #{$size}px;
    }
  }

  :deep(svg) {
    display: block;
    width: 100%;
    height: 100%;
    aspect-ratio: 1;
  }
}
</style>