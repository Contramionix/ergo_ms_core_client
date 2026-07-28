<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ModuleThemeScope from '@/components/ModuleThemeScope.vue'
import { useUiModes } from '@/composables/useUiModes.js'

defineProps({
  keepAliveMax: { type: Number, default: 15 },
  useKeepAlive: { type: Boolean, default: true },
})

const route = useRoute()
const { reducedMotionActive } = useUiModes()

const moduleKey = computed(() => route.meta?.moduleKey || null)

function cachedRouteKey(activeRoute) {
  const matched = activeRoute.matched
  if (matched?.length) {
    for (let i = matched.length - 1; i >= 0; i -= 1) {
      const cacheGroup = matched[i]?.meta?.cacheGroup
      if (cacheGroup) {
        return cacheGroup
      }
    }
  }

  // Ключ — запись верхнего RouterView (родитель при nested), не leaf-имя.
  // Иначе вкладки модуля (PorosityAnalysisMain ↔ List) пересоздают ParentLayout
  // и дергают навигацию из‑за layout-route transition.
  const top = matched?.[0]
  return top?.name ?? top?.path ?? activeRoute.name ?? activeRoute.path
}
</script>

<template>
  <RouterView v-slot="{ Component, route: activeRoute }">
    <Transition name="layout-route" :css="!reducedMotionActive">
      <div :key="cachedRouteKey(activeRoute)" class="layout-route-view">
        <ModuleThemeScope :module-key="activeRoute.meta?.moduleKey || moduleKey">
          <KeepAlive v-if="useKeepAlive" :max="keepAliveMax">
            <component :is="Component" v-if="Component" />
          </KeepAlive>
          <component v-else-if="Component" :is="Component" />
        </ModuleThemeScope>
      </div>
    </Transition>
  </RouterView>
</template>
