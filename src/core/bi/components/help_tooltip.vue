<template>
    <span ref="wrapperRef" class="help-icon-wrapper" @mouseenter="onEnter" @mouseleave="onLeave">
        <HelpCircle class="lucide" :size="size" />
    </span>
    <div v-if="visible" ref="tooltipRef" class="tooltip-fixed" :class="[currentPlacement, tooltipClass]" :style="tooltipStyle">
        <slot>
            <span v-if="text">{{ text }}</span>
        </slot>
    </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { HelpCircle } from 'lucide-vue-next'

const props = defineProps({
    text: { type: String, default: '' },
    size: { type: Number, default: 18 },
    tooltipClass: { type: String, default: '' },
    offset: { type: Number, default: 8 },
})

const visible = ref(false)
const tooltipStyle = ref({ top: '0px', left: '0px' })
const wrapperRef = ref(null)
const tooltipRef = ref(null)
const currentPlacement = ref('top')

function choosePlacement(triggerRect, tooltipRect, gap) {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const spaces = {
        top: triggerRect.top,
        bottom: viewportHeight - triggerRect.bottom,
        left: triggerRect.left,
        right: viewportWidth - triggerRect.right,
    }

    const fits = {
        top: spaces.top >= tooltipRect.height + gap,
        bottom: spaces.bottom >= tooltipRect.height + gap,
        left: spaces.left >= tooltipRect.width + gap,
        right: spaces.right >= tooltipRect.width + gap,
    }

    if (fits.top) return 'top'
    if (fits.bottom) return 'bottom'
    if (fits.right) return 'right'
    if (fits.left) return 'left'

    // Если нигде не помещается целиком — выбираем сторону с максимальным пространством
    const maxSide = Object.keys(spaces).reduce((a, b) => (spaces[a] > spaces[b] ? a : b))
    return maxSide
}

function updatePosition() {
    if (!wrapperRef.value || !tooltipRef.value) return
    const rect = wrapperRef.value.getBoundingClientRect()
    const tipRect = tooltipRef.value.getBoundingClientRect()
    const gap = props.offset
    const placement = choosePlacement(rect, tipRect, gap)
    currentPlacement.value = placement

    if (placement === 'top') {
        tooltipStyle.value = {
            top: `${rect.top + window.scrollY}px`,
            left: `${rect.left + rect.width / 2 + window.scrollX}px`,
        }
    } else if (placement === 'bottom') {
        tooltipStyle.value = {
            top: `${rect.bottom + window.scrollY}px`,
            left: `${rect.left + rect.width / 2 + window.scrollX}px`,
        }
    } else if (placement === 'left') {
        tooltipStyle.value = {
            top: `${rect.top + rect.height / 2 + window.scrollY}px`,
            left: `${rect.left + window.scrollX}px`,
        }
    } else {
        tooltipStyle.value = {
            top: `${rect.top + rect.height / 2 + window.scrollY}px`,
            left: `${rect.right + window.scrollX}px`,
        }
    }
}

async function onEnter() {
    visible.value = true
    await nextTick()
    updatePosition()
}

function onLeave() {
    visible.value = false
}
</script>

<style scoped lang="scss">
.help-icon-wrapper{
    display: inline-flex;
    align-items: center;
}

.lucide{
    vertical-align: middle;
}

.tooltip-fixed{
    position: fixed;
    background-color: var(--color-primary-background);
    color: var(--color-primary-text);
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 9999;
    max-width: 360px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);

    &::after{
        content: '';
        position: absolute;
        width: 0; height: 0;
        border-style: solid;
    }
}

/* Расположения с «усиком» к иконке */
.tooltip-fixed.top{
    transform: translate(-50%, calc(-100% - 8px));
}
.tooltip-fixed.top::after{
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 8px 6px 0 6px;
    border-color: var(--color-primary-background) transparent transparent transparent;
}

.tooltip-fixed.left{
    transform: translate(calc(-100% - 8px), -50%);
}
.tooltip-fixed.left::after{
    top: 50%;
    right: -8px;
    transform: translateY(-50%);
    border-width: 6px 0 6px 8px;
    border-color: transparent transparent transparent var(--color-primary-background);
}

.tooltip-fixed.bottom{
    transform: translate(-50%, 8px);
}
.tooltip-fixed.bottom::after{
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    border-width: 8px 6px 0 6px;
    border-color: var(--color-primary-background) transparent transparent transparent;
}

.tooltip-fixed.right{
    transform: translate(8px, -50%);
}
.tooltip-fixed.right::after{
    top: 50%;
    left: -8px;
    transform: translateY(-50%);
    border-width: 6px 8px 6px 0;
    border-color: transparent var(--color-primary-background) transparent transparent;
}
</style>


