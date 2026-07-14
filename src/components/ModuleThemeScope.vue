<script setup>
import { ref, watch, onMounted, onBeforeUnmount, provide } from 'vue'
import { handleRouteModuleTheme } from '@/js/module-theme-service.js'
import { getActiveModuleKey } from '@/js/module-theme-manager.js'
import { MODULE_THEME_CHANGE_EVENT } from '@/js/module-theme-manager.js'
import { getCurrentThemeMode, THEME_CHANGE_EVENT } from '@/js/theme-manager.js'

const props = defineProps({
  moduleKey: {
    type: String,
    default: null,
  },
})

const resolvedBaseTheme = ref(getCurrentThemeMode())

function syncResolvedMode() {
  resolvedBaseTheme.value = getCurrentThemeMode()
}

function onModuleThemeChange(event) {
  if (event?.detail?.moduleKey !== props.moduleKey) {
    return
  }
  syncResolvedMode()
}

async function applyForModuleKey(key) {
  await handleRouteModuleTheme(key)
  syncResolvedMode()
}

watch(
  () => props.moduleKey,
  (key) => {
    applyForModuleKey(key)
  },
  { immediate: false },
)

onMounted(() => {
  window.addEventListener(MODULE_THEME_CHANGE_EVENT, onModuleThemeChange)
  window.addEventListener(THEME_CHANGE_EVENT, syncResolvedMode)
  applyForModuleKey(props.moduleKey)
})

onBeforeUnmount(() => {
  window.removeEventListener(MODULE_THEME_CHANGE_EVENT, onModuleThemeChange)
  window.removeEventListener(THEME_CHANGE_EVENT, syncResolvedMode)
  if (getActiveModuleKey() === props.moduleKey) {
    handleRouteModuleTheme(null)
  }
})

provide('ergoModuleThemeKey', props.moduleKey)
</script>

<template>
  <div
    class="module-theme-scope"
    :data-ergo-module-theme="moduleKey || undefined"
    :data-bs-theme="moduleKey ? resolvedBaseTheme : undefined"
  >
    <slot />
  </div>
</template>

<style scoped>
.module-theme-scope {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
}
</style>
