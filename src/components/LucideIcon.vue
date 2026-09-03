<script setup>
/**
 * Единый рендер динамической Lucide-иконки по каноническому имени (PascalCase).
 * Модули и декларации (меню, apps, settings) передают строку — не Vue-компонент.
 */
import { computed, shallowRef, watch } from 'vue'
import { LUCIDE_STROKE_WIDTH } from '@/config/coreIconNames.js'
import { getLucideIconAsync, normalizeLucideIconName } from '@/js/lucideIconLoader.js'

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
})

const IconComponent = shallowRef(null)

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

watch(
  () => props.name,
  async (name) => {
    const key = normalizeLucideIconName(name)
    IconComponent.value = key ? await getLucideIconAsync(key) : null
  },
  { immediate: true },
)
</script>

<template>
  <span
    v-if="IconComponent"
    class="icon-flex lucide-icon-host"
    :data-icon-size="sizePx || null"
    v-csp-style="sizePx ? undefined : { width: sizeCss, height: sizeCss }"
  >
    <component
      :is="IconComponent"
      :size="size"
      :stroke-width="strokeWidth"
      :class="iconClass"
    />
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
