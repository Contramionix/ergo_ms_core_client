<script setup>
import { computed, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const AccessControlPoliciesTab = defineAsyncComponent(() =>
  import('@/core/cms/adp/admin/AccessControlComponents/AccessControlPoliciesTab.vue'),
)
const AccessControlModulePermissionsTab = defineAsyncComponent(() =>
  import('@/core/cms/adp/admin/AccessControlComponents/AccessControlModulePermissionsTab.vue'),
)

const { t } = useAppI18n()

const tabs = computed(() => [
  { id: 'policies', label: t('admin.access.tabPolicies') },
  { id: 'modules', label: t('admin.access.tabModules') },
])

const route = useRoute()
const router = useRouter()

const activeTab = computed(() => {
  const tab = typeof route.query.tab === 'string' ? route.query.tab : 'policies'
  return tabs.value.some((item) => item.id === tab) ? tab : 'policies'
})

function selectTab(tabId) {
  if (tabId === activeTab.value) {
    return
  }

  router.replace({
    path: route.path,
    query: { ...route.query, tab: tabId },
  })
}
</script>

<template>
  <div class="access-control d-flex flex-column gap-4">
    <div class="access-control__header">
      <h2 class="access-control__title">{{ t('admin.access.title') }}</h2>
      <p class="access-control__subtitle">
        {{ t('admin.access.subtitle') }}
      </p>
    </div>

    <ul class="nav nav-tabs access-control__tabs" role="tablist">
      <li v-for="tab in tabs" :key="tab.id" class="nav-item" role="presentation">
        <button
          type="button"
          class="nav-link"
          :class="{ active: activeTab === tab.id }"
          role="tab"
          :aria-selected="activeTab === tab.id"
          @click="selectTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </li>
    </ul>

    <div class="access-control__panel" role="tabpanel">
      <AccessControlPoliciesTab v-if="activeTab === 'policies'" />
      <AccessControlModulePermissionsTab v-else-if="activeTab === 'modules'" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.access-control__title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary-text);
  margin-bottom: 0.25rem;
}

.access-control__subtitle {
  font-size: 0.875rem;
  color: var(--color-secondary-text);
  margin-bottom: 0;
}

.access-control__tabs {
  display: flex;
  flex-wrap: nowrap;
  border-bottom: 1px solid var(--color-border);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;

  .nav-item {
    flex: 0 0 auto;
  }

  .nav-link {
    color: var(--color-secondary-text);
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    font-weight: 500;
    background: transparent;
    white-space: nowrap;

    &:hover {
      color: var(--color-primary-text);
      border-bottom-color: var(--color-border);
    }

    &.active {
      color: var(--color-accent);
      border-bottom-color: var(--color-accent);
      background: transparent;
    }
  }

  @media (width < $ui-bp-sm) {
    .nav-link {
      padding: 0.5rem 0.75rem;
      font-size: 0.8125rem;
    }
  }
}
</style>
