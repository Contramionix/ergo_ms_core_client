<!-- NavigationButtons.vue -->
<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
})
const scrollContainer = ref(null)
const isScrolledToEnd = ref(false)
const isScrolledToStart = ref(true)

// Computed свойство для контроля видимости навигации
const showNavigation = computed(() => {
  return props.data && props.data.length > 0
})

const handleScroll = () => {
  const container = scrollContainer.value
  if (container) {
    const scrollLeft = container.scrollLeft
    const scrollWidth = container.scrollWidth
    const clientWidth = container.clientWidth

    isScrolledToEnd.value = scrollLeft + clientWidth >= scrollWidth - 0.4
    isScrolledToStart.value = scrollLeft <= 0.4
  }
}
</script>

<template>
  <div
    class="navbar-scroll"
    :class="{ 
      scrolledToEnd: isScrolledToEnd, 
      isScrolledToStart: isScrolledToStart,
      'd-none': !showNavigation
    }"
  >
    <div class="navbar-scroll-wrapper py-1" ref="scrollContainer" @scroll="handleScroll">
      <ul class="navbar-nav flex-row gap-1">
        <li v-for="(item, index) in data" :key="index" class="nav-item">
          <RouterLink
            :to="{ name: item.link }"
            class="btn fw-bold text-center"
            exact-active-class="btn-primary"
          >
            <div class="d-flex align-items-center justify-content-center gap-1">
              <div class="icon-flex"><component v-if="item.icon" :is="item.icon" :size="20" /></div>
              <div class="fw-bold">{{ item.title }}</div>
            </div>
          </RouterLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="scss">
li {
  cursor: pointer;

  a:not(.btn-primary):hover {
    background-color: var(--bs-primary-bg-subtle);
    color: var(--bs-primary);
  }
}

.navbar-scroll {
  position: relative;
  flex-grow: 1;
}

.navbar-scroll-wrapper {
  white-space: nowrap;
  overflow-x: scroll;
  overflow-y: hidden;
  position: relative;
  scrollbar-width: none;

  ::-webkit-scrollbar {
    display: none;
  }
}
</style>