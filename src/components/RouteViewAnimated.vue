<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ModuleThemeScope from '@/components/ModuleThemeScope.vue'

defineProps({
  keepAliveMax: { type: Number, default: 15 },
  useKeepAlive: { type: Boolean, default: true },
})

const route = useRoute()

const moduleKey = computed(() => route.meta?.moduleKey || null)

function cachedRouteKey(activeRoute) {
  return activeRoute.name ?? activeRoute.path
}
</script>

<template>
  <RouterView v-slot="{ Component, route: activeRoute }">
    <Transition name="layout-route">
      <div :key="cachedRouteKey(activeRoute)" class="layout-route-view">
        <ModuleThemeScope :module-key="activeRoute.meta?.moduleKey || moduleKey">
          <KeepAlive v-if="useKeepAlive" :max="keepAliveMax">
            <component :is="Component" v-if="Component" />
          </KeepAlive>
          <component v-else :is="Component" v-if="Component" />
        </ModuleThemeScope>
      </div>
    </Transition>
  </RouterView>
</template>
