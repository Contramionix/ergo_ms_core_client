<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import HoverTooltip from '@/components/HoverTooltip.vue'
import { listMenuItemTrailing } from '@/integrations/menuItemTrailing.js'
import { safeNavigateByName } from './composables/safeMenuNavigate.js'
import MenuTrailingBadge from './MenuTrailingBadge.vue'

const props = defineProps({
  item: { type: Object, required: true },
})

const router = useRouter()

const extras = computed(() => {
  return listMenuItemTrailing(props.item)
    .map((entry) => {
      const count = typeof entry.count === 'function'
        ? Number(entry.count() || 0)
        : Number(entry.count || 0)
      const visible = typeof entry.isVisible === 'function'
        ? Boolean(entry.isVisible())
        : true
      const title = typeof entry.title === 'function'
        ? String(entry.title() || '')
        : String(entry.title || '')
      return {
        ...entry,
        count,
        visible,
        title,
      }
    })
    .filter((entry) => entry.visible && (entry.component || entry.count > 0))
})

function matchedRouteName(entry) {
  const route = entry.route
  if (route && typeof route === 'object' && typeof route.name === 'string' && route.name) {
    return route.name
  }
  const wanted = entry.match?.routeName
  if (Array.isArray(wanted)) {
    return wanted.find((name) => typeof name === 'string' && name) || ''
  }
  return typeof wanted === 'string' ? wanted : ''
}

async function onExtraClick(event, entry) {
  event.preventDefault()
  event.stopPropagation()
  if (typeof entry.onClick === 'function') {
    await entry.onClick({ router })
    return
  }
  const routeName = matchedRouteName(entry)
  if (routeName) {
    await safeNavigateByName(router, routeName)
  }
}
</script>

<template>
  <span v-for="entry in extras" :key="entry.id" class="menu-item__trailing-extra" @click="onExtraClick($event, entry)">
    <component :is="entry.component" v-if="entry.component" />
    <HoverTooltip v-else :text="entry.title" wrap>
      <MenuTrailingBadge :count="entry.count" :title="entry.title" />
    </HoverTooltip>
  </span>
</template>

<style scoped>
.menu-item__trailing-extra {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
}
</style>
