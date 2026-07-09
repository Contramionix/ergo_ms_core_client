<script setup>
defineProps({
  keepAliveMax: { type: Number, default: 15 },
  useKeepAlive: { type: Boolean, default: true },
})

function cachedRouteKey(activeRoute) {
  return activeRoute.name ?? activeRoute.path
}
</script>

<template>
  <RouterView v-slot="{ Component, route: activeRoute }">
    <Transition name="layout-route">
      <div :key="cachedRouteKey(activeRoute)" class="layout-route-view">
        <KeepAlive v-if="useKeepAlive" :max="keepAliveMax">
          <component :is="Component" v-if="Component" />
        </KeepAlive>
        <component v-else :is="Component" v-if="Component" />
      </div>
    </Transition>
  </RouterView>
</template>
