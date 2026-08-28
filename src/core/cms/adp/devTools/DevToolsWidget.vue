<script setup>
import { onMounted } from 'vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { clientEnv } from '@/js/clientEnv.js'
import DevToolsPanel from './DevToolsPanel.vue'
import { useDevToolsStore } from './useDevToolsStore.js'

const { t } = useAppI18n()
const store = useDevToolsStore()

onMounted(() => {
  if (clientEnv.devToolsEnabled) {
    store.bootstrap()
  }
})
</script>

<template>
  <div v-if="clientEnv.devToolsEnabled && store.available" class="dev-tools-widget">
    <button
      v-if="store.hidden"
      type="button"
      class="dev-tools-widget__peek"
      :aria-label="t('devTools.show')"
      @click="store.showFab()"
    >
      <LucideIcon name="Eye" :size="16" />
    </button>

    <template v-else>
      <div v-if="store.panelOpen" class="dev-tools-widget__panel">
        <DevToolsPanel />
      </div>
      <button
        type="button"
        class="dev-tools-widget__fab"
        :class="{ 'is-active': store.isActive || store.panelOpen }"
        :aria-label="store.panelOpen ? t('devTools.close') : t('devTools.open')"
        :aria-expanded="store.panelOpen ? 'true' : 'false'"
        @click="store.togglePanel()"
      >
        <LucideIcon :name="store.isActive ? 'EyeOff' : 'Eye'" :size="20" />
      </button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.dev-tools-widget {
  position: fixed;
  right: max(1rem, env(safe-area-inset-right, 0px));
  bottom: max(1rem, env(safe-area-inset-bottom, 0px));
  z-index: 1035;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.65rem;
}

.dev-tools-widget__fab,
.dev-tools-widget__peek {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-border);
  background: var(--color-surface, #fff);
  color: inherit;
  line-height: 0;
  cursor: pointer;
  box-shadow: 0 8px 24px color-mix(in srgb, #000 16%, transparent);
}

.dev-tools-widget__fab {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
}

.dev-tools-widget__fab.is-active {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.dev-tools-widget__peek {
  width: 1.75rem;
  height: 2.5rem;
  border-radius: 0.75rem 0 0 0.75rem;
  margin-right: -1rem;
}

.dev-tools-widget__panel {
  width: min(24rem, calc(100vw - 2rem));
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 0.85rem;
  background: var(--color-surface, #fff);
  box-shadow: 0 16px 40px color-mix(in srgb, #000 18%, transparent);
}
</style>
