<template>
  <div class="tab-bar">
    <nav ref="navRef" class="tab-bar__nav" :class="{ 'tab-bar__nav--scroll': isScrollOverflow }" role="tablist" :aria-label="resolvedAriaLabel">
      <div v-if="isMenuOverflow" ref="measureRef" class="tab-bar__measure" aria-hidden="true">
        <span v-for="tab in normalizedTabs" :key="`measure-${tab.id}`" class="tab-bar__tab">
          <component :is="tab.icon" v-if="tab.icon" :size="16" class="tab-bar__icon" />
          <span class="tab-bar__text">{{ tab.name }}</span>
          <span v-if="tab.count" class="tab-bar__badge">{{ tab.count }}</span>
        </span>
        <span class="tab-bar__tab tab-bar__more-trigger">
          <span class="tab-bar__text">{{ moreLabel }}</span>
          <ChevronDown :size="14" class="tab-bar__icon" />
        </span>
      </div>

      <div class="tab-bar__list">
        <button v-for="tab in displayedTabs" :key="tab.id" type="button" role="tab" class="tab-bar__tab" :class="{ 'tab-bar__tab--active': modelValue === tab.id }" :aria-selected="modelValue === tab.id" @click="selectTab(tab.id)">
          <component :is="tab.icon" v-if="tab.icon" :size="16" class="tab-bar__icon" />
          <span class="tab-bar__text">{{ tab.name }}</span>
          <span v-if="tab.count" class="tab-bar__badge">{{ tab.count }}</span>
        </button>

        <DropDown v-if="overflowTabs.length" ref="moreDropdownRef" class="tab-bar__more" compact dropdown-menu-class="dropdown-menu-end" :menu-min-width="180">
          <template #main>
            <span class="tab-bar__tab tab-bar__more-trigger">
              <span class="tab-bar__text">{{ moreLabel }}</span>
              <ChevronDown :size="14" class="tab-bar__icon" aria-hidden="true" />
            </span>
          </template>
          <template #list>
            <li v-for="tab in overflowTabs" :key="tab.id">
              <a class="dropdown-item" href="#" role="menuitem" @click.prevent="selectTab(tab.id)">
                <component :is="tab.icon" v-if="tab.icon" :size="16" class="tab-bar__icon" />
                <span class="tab-bar__text">{{ tab.name }}</span>
                <span v-if="tab.count" class="tab-bar__badge">{{ tab.count }}</span>
              </a>
            </li>
          </template>
        </DropDown>
      </div>
    </nav>
    <div v-if="$slots.default" class="tab-bar__content">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronDown } from '@lucide/vue'
import DropDown from '@/components/DropDown.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  tabs: {
    type: Array,
    default: () => [],
  },
  overflow: {
    type: String,
    default: 'scroll',
    validator: (value) => value === 'scroll' || value === 'menu',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const { t } = useAppI18n()
const navRef = ref(null)
const measureRef = ref(null)
const moreDropdownRef = ref(null)
const fitCount = ref(0)
let resizeObserver = null

const normalizedTabs = computed(() => (
  Array.isArray(props.tabs)
    ? props.tabs.filter((tab) => tab && tab.id != null)
    : []
))

const isScrollOverflow = computed(() => props.overflow !== 'menu')
const isMenuOverflow = computed(() => props.overflow === 'menu')

const moreLabel = computed(() => t('components.tabBar.more'))
const resolvedAriaLabel = computed(() => (
  props.ariaLabel || t('components.tabBar.ariaLabel')
))

const splitTabs = computed(() => {
  const all = normalizedTabs.value
  if (!isMenuOverflow.value || fitCount.value >= all.length) {
    return { displayed: all, overflow: [] }
  }

  const visibleLimit = Math.max(1, Math.min(fitCount.value, all.length - 1))
  let displayed = all.slice(0, visibleLimit)
  let overflow = all.slice(visibleLimit)
  const activeId = props.modelValue
  const activeIndex = overflow.findIndex((tab) => tab.id === activeId)
  if (activeIndex >= 0) {
    const [activeTab] = overflow.splice(activeIndex, 1)
    const displaced = displayed[displayed.length - 1]
    displayed = [...displayed.slice(0, -1), activeTab]
    overflow = [displaced, ...overflow]
  }
  return { displayed, overflow }
})

const displayedTabs = computed(() => splitTabs.value.displayed)
const overflowTabs = computed(() => splitTabs.value.overflow)

function selectTab(tabId) {
  emit('update:modelValue', tabId)
  moreDropdownRef.value?.closeDropdown()
}

function measureOverflow() {
  if (!isMenuOverflow.value) {
    fitCount.value = normalizedTabs.value.length
    return
  }
  const nav = navRef.value
  const measure = measureRef.value
  if (!nav || !measure) return

  const styles = getComputedStyle(nav)
  const available = nav.clientWidth
    - Number.parseFloat(styles.paddingLeft || '0')
    - Number.parseFloat(styles.paddingRight || '0')
  const items = [...measure.children]
  if (!items.length) {
    fitCount.value = 0
    return
  }

  const moreWidth = items[items.length - 1]?.offsetWidth || 0
  const tabWidths = items.slice(0, -1).map((el) => el.offsetWidth)
  const total = tabWidths.reduce((sum, width) => sum + width, 0)
  if (total <= available) {
    fitCount.value = tabWidths.length
    return
  }

  const room = Math.max(0, available - moreWidth)
  let used = 0
  let count = 0
  for (const width of tabWidths) {
    if (used + width > room) break
    used += width
    count += 1
  }
  fitCount.value = count
}

function scheduleMeasure() {
  nextTick(() => {
    requestAnimationFrame(measureOverflow)
  })
}

onMounted(() => {
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(scheduleMeasure)
    if (navRef.value) resizeObserver.observe(navRef.value)
  } else {
    window.addEventListener('resize', scheduleMeasure)
  }
  scheduleMeasure()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', scheduleMeasure)
})

watch(
  () => [props.overflow, normalizedTabs.value.map((tab) => [tab.id, tab.name, tab.count])],
  scheduleMeasure,
  { flush: 'post' },
)
</script>

<style scoped lang="scss">
@use '@/scss/ui/mixins' as *;

.tab-bar {
  min-width: 0;
}

.tab-bar__nav {
  position: relative;
  min-width: 0;
  border-bottom: 1.5px solid var(--ui-border, var(--color-border));
  border-radius: 6px 6px 0 0;
}

.tab-bar__list,
.tab-bar__measure {
  display: flex;
  align-items: stretch;
  padding: 0 0.5rem;
}

.tab-bar__list {
  min-width: 0;
}

.tab-bar__nav--scroll .tab-bar__list {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.tab-bar__nav:not(.tab-bar__nav--scroll) .tab-bar__list {
  overflow: hidden;
}

.tab-bar__measure {
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  visibility: hidden;
  pointer-events: none;
}

.tab-bar__tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  color: var(--ui-text-muted, var(--color-secondary-text));
  font-size: 0.875rem;
  font-weight: var(--u-font-weight-normal);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
  position: relative;

  @include ui-reduced-motion;
  @include ui-a11y-focus;

  &:hover {
    color: var(--ui-accent, var(--color-accent));
    background-color: color-mix(in srgb, var(--ui-accent, var(--color-accent)) 5%, transparent);
  }

  &--active {
    color: var(--ui-accent, var(--color-accent));
    border-bottom-color: var(--ui-accent, var(--color-accent));
    background-color: transparent;
  }
}

.tab-bar__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tab-bar__text {
  white-space: nowrap;
}

.tab-bar__badge {
  background-color: var(--ui-text-muted, var(--color-secondary-text));
  color: var(--ui-surface, var(--color-primary-background));
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
  min-width: 1.25rem;
  text-align: center;
  line-height: 1.25;
}

.tab-bar__tab--active .tab-bar__badge {
  background-color: var(--ui-accent, var(--color-accent));
}

.tab-bar__more {
  display: inline-flex;
  align-self: stretch;
  flex: 0 0 auto;

  :deep(.dropdown-button) {
    display: inline-flex;
    align-items: stretch;
    height: 100%;
  }
}

.tab-bar__more-trigger {
  height: 100%;
}

.tab-bar__content {
  margin-top: 1rem;
}
</style>