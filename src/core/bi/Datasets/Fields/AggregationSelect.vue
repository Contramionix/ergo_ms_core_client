<template>
  <div class="agg-select">
    <button ref="chipRef" class="agg-chip" :class="aggregationColorMap[modelValue]" @click="show = !show" type="button">
      {{ labelByValue(modelValue) }}
    </button>
    <div v-if="show" ref="dropdownRef" class="agg-dropdown" :class="{ 'agg-dropdown-up': openUpward }" @mouseleave="show = false">
      <div v-for="opt in options" :key="opt.value" class="agg-dropdown-item" :class="aggregationColorMap[opt.value]" @click="select(opt.value)">
        {{ opt.label }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: String,
  options: Array,
  aggregationColorMap: Object
})
const emit = defineEmits(['update:modelValue'])

const show = ref(false)
const openUpward = ref(false)
const chipRef = ref(null)
const dropdownRef = ref(null)

function select(value) {
  emit('update:modelValue', value)
  show.value = false
}

function labelByValue(val) {
  const opt = props.options.find(o => o.value === val)
  return opt ? opt.label : ''
}

function getScrollContainer(el) {
  if (!el) return null
  let parent = el.parentElement
  while (parent) {
    const style = getComputedStyle(parent)
    const overflowY = style.overflowY || style.overflow
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return parent
    parent = parent.parentElement
  }
  return null
}

function updateDropdownPlacement() {
  const chip = chipRef.value
  const dropdown = dropdownRef.value
  if (!chip || !dropdown) return
  const chipRect = chip.getBoundingClientRect()
  const dropdownHeight = dropdown.getBoundingClientRect().height
  const gap = 4
  const scrollContainer = getScrollContainer(chip)
  const visibleBottom = scrollContainer
    ? scrollContainer.getBoundingClientRect().bottom
    : window.innerHeight
  const spaceBelow = visibleBottom - chipRect.bottom
  openUpward.value = spaceBelow < dropdownHeight + gap
}

function handleClickOutside(event) {
  if (!event.target.closest('.agg-select')) show.value = false
}

watch(show, (v) => {
  if (v) {
    window.addEventListener('mousedown', handleClickOutside)
    nextTick(() => {
      requestAnimationFrame(() => {
        updateDropdownPlacement()
      })
    })
  } else {
    window.removeEventListener('mousedown', handleClickOutside)
  }
})
</script>

<style scoped lang="scss">

.agg-select {
  display: inline-block;
  position: relative;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  border-radius: 0.7rem;
  font-size: 1rem;
  font-weight: 500;
  width: 100%;
  text-align: center;
  line-height: 1.25;
  margin: 0;
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  transition: background 0.15s, color 0.15s;
}
.agg-chip:hover {
  filter: brightness(1.12);
}

.agg-primary   { background: #26404a; color: var(--color-primary-text);}
.agg-info      { background: #1e4050; color: var(--color-primary-text);}
.agg-success   { background: #18382c; color: var(--color-primary-text);}
.agg-warning   { background: #544514; color: var(--color-primary-text);}
.agg-secondary { background: #23233a; color: var(--color-primary-text);}
.agg-danger    { background: #3b1c1c; color: var(--color-primary-text);}
.agg-dark      { background: #1a1c20; color: var(--color-primary-text);}

.agg-chip {
  padding: 0.4em;
  font-size: 1em;
  border: none;
  border-radius: 9px;
  font-weight: 500;
  cursor: pointer;
  min-width: 80px;
  text-align: center;
}
.agg-dropdown {
  position: absolute;
  z-index: 20;
  min-width: 100%;
  background: var(--color-primary-background);
  box-shadow: 0 2px 14px #0007;
  border-radius: 10px;
  padding: 0.4em 0;
  margin-top: 4px;
  top: 100%;
}
.agg-dropdown.agg-dropdown-up {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 4px;
}
.agg-dropdown-item {
  padding: 0.35em 1.2em;
  font-size: 1em;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.13s;
  margin-bottom: 2px;
}
.agg-dropdown-item:last-child {
  margin-bottom: 0;
}
.agg-dropdown-item:hover {
  filter: brightness(1.18);
}

</style>

<style lang="scss">
[data-bs-theme='light'] .agg-select {
  .agg-chip.agg-primary {
    background: #c5e1eb;
    color: #0d3d47;
  }
  .agg-chip.agg-info {
    background: #b8d4e0;
    color: #0d3240;
  }
  .agg-chip.agg-success {
    background: #c2e0c8;
    color: #0d2e14;
  }
  .agg-chip.agg-warning {
    background: #e8dcb0;
    color: #3d3008;
  }
  .agg-chip.agg-secondary {
    background: #d4d4e0;
    color: #1a1a2e;
  }
  .agg-chip.agg-danger {
    background: #e8c4c4;
    color: #4a1515;
  }
  .agg-chip.agg-dark {
    background: #e0e0e4;
    color: #1a1c20;
  }
  .agg-dropdown {
    background: var(--color-primary-background);
    box-shadow: 0 2px 14px rgba(0, 0, 0, 0.08);
  }
  .agg-dropdown-item.agg-primary {
    background: #c5e1eb;
    color: #0d3d47;
  }
  .agg-dropdown-item.agg-info {
    background: #b8d4e0;
    color: #0d3240;
  }
  .agg-dropdown-item.agg-success {
    background: #c2e0c8;
    color: #0d2e14;
  }
  .agg-dropdown-item.agg-warning {
    background: #e8dcb0;
    color: #3d3008;
  }
  .agg-dropdown-item.agg-secondary {
    background: #d4d4e0;
    color: #1a1a2e;
  }
  .agg-dropdown-item.agg-danger {
    background: #e8c4c4;
    color: #4a1515;
  }
  .agg-dropdown-item.agg-dark {
    background: #e0e0e4;
    color: #1a1c20;
  }
  .agg-dropdown-item:hover {
    filter: brightness(0.96);
  }
}
</style>