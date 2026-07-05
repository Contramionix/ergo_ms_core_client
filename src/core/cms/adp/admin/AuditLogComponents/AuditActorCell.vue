<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

import UserAvatar from '@/components/UserAvatar.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import {
  buildActorNameVariants,
  parseErgoFullNameParts,
} from '@/js/userAvatar.js'

const props = defineProps({
  actorLabel: { type: String, default: '' },
  actorRef: { type: [String, null], default: null },
  actorId: { type: [Number, String, null], default: null },
  actorFirstName: { type: String, default: '' },
  actorLastName: { type: String, default: '' },
  actorMiddleName: { type: String, default: '' },
})

const nameWrapEl = ref(null)
const labelEl = ref(null)
const measureEl = ref(null)
const displayName = ref('')
const isOverflowing = ref(false)

const nameParts = computed(() => {
  const hasStructured = Boolean(
    props.actorFirstName?.trim()
    || props.actorLastName?.trim()
    || props.actorMiddleName?.trim(),
  )
  if (hasStructured) {
    return {
      lastName: (props.actorLastName || '').trim(),
      firstName: (props.actorFirstName || '').trim(),
      middleName: (props.actorMiddleName || '').trim(),
    }
  }
  return parseErgoFullNameParts(props.actorLabel)
})

const variants = computed(() => buildActorNameVariants({
  ...nameParts.value,
  fallbackLabel: props.actorLabel,
}))

const hasDisplay = computed(() => Boolean(variants.value.expandedDisplay))

const tooltipText = computed(() => {
  if (!displayName.value) return ''
  const { compactDisplay, fullName } = variants.value
  if (compactDisplay && displayName.value === compactDisplay) {
    return fullName
  }
  return isOverflowing.value ? fullName : ''
})

function measureTextWidth(text) {
  const el = measureEl.value
  if (!el || !text) return 0
  el.textContent = text
  return el.scrollWidth
}

function textFits(text, maxWidth) {
  if (!text || maxWidth <= 0) return false
  return measureTextWidth(text) <= maxWidth
}

function checkOverflow() {
  const label = labelEl.value
  isOverflowing.value = Boolean(label && label.scrollWidth > label.clientWidth)
}

function updateDisplay() {
  const wrap = nameWrapEl.value
  const label = labelEl.value
  const measure = measureEl.value
  const { expandedDisplay, compactDisplay } = variants.value

  if (label && measure) {
    const style = window.getComputedStyle(label)
    measure.style.font = style.font
    measure.style.letterSpacing = style.letterSpacing
  }

  if (!expandedDisplay) {
    displayName.value = ''
    isOverflowing.value = false
    return
  }

  const maxWidth = wrap?.clientWidth ?? 0

  if (maxWidth <= 0) {
    displayName.value = expandedDisplay
    nextTick(checkOverflow)
    return
  }

  if (textFits(expandedDisplay, maxWidth)) {
    displayName.value = expandedDisplay
  } else if (compactDisplay) {
    displayName.value = compactDisplay
  } else {
    displayName.value = expandedDisplay
  }

  nextTick(checkOverflow)
}

let resizeObserver = null

function setupObserver() {
  resizeObserver?.disconnect()
  if (!nameWrapEl.value) return
  resizeObserver = new ResizeObserver(() => updateDisplay())
  resizeObserver.observe(nameWrapEl.value)
}

onMounted(() => {
  nextTick(() => {
    updateDisplay()
    setupObserver()
  })
})

watch(
  () => [
    props.actorLabel,
    props.actorRef,
    props.actorId,
    props.actorFirstName,
    props.actorLastName,
    props.actorMiddleName,
  ],
  () => nextTick(updateDisplay),
)

watch(displayName, () => nextTick(checkOverflow))

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div v-if="hasDisplay" class="audit-actor">
    <UserAvatar
      :user-ref="actorRef"
      :user-id="actorRef ? null : actorId"
      :title="variants.fullName"
      :first-name="nameParts.firstName"
      :last-name="nameParts.lastName"
      :size="28"
    />
    <div ref="nameWrapEl" class="audit-actor__name">
      <HoverTooltip :text="tooltipText" wrap>
        <span ref="labelEl" class="audit-actor__label">{{ displayName }}</span>
      </HoverTooltip>
    </div>
    <span ref="measureEl" class="audit-actor__measure" aria-hidden="true" />
  </div>
  <span v-else class="text-muted">—</span>
</template>

<style scoped lang="scss">
.audit-actor {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  position: relative;

  &__name {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__label {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__measure {
    position: absolute;
    left: 0;
    top: 0;
    visibility: hidden;
    pointer-events: none;
    white-space: nowrap;
    height: auto;
    width: auto;
    overflow: visible;
  }
}
</style>
