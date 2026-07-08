<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AccessControlPoliciesTab from '@/core/cms/adp/admin/AccessControlComponents/AccessControlPoliciesTab.vue'
import AccessControlModulePermissionsTab from '@/core/cms/adp/admin/AccessControlComponents/AccessControlModulePermissionsTab.vue'

const TABS = [
  { id: 'policies', label: 'Доступ к маршрутам' },
  { id: 'modules', label: 'Модульные права' },
]

const route = useRoute()
const router = useRouter()

const activeTab = computed(() => {
  const tab = typeof route.query.tab === 'string' ? route.query.tab : 'policies'
  const normalizedTab = tab === 'pages' ? 'policies' : tab
  return TABS.some((item) => item.id === normalizedTab) ? normalizedTab : 'policies'
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
      <h2 class="access-control__title">Доступ и права</h2>
      <p class="access-control__subtitle">
        Настройка доступа к маршрутам и прав модулей для ролей и ролевых групп.
      </p>
    </div>

    <ul class="nav nav-tabs access-control__tabs" role="tablist">
      <li v-for="tab in TABS" :key="tab.id" class="nav-item" role="presentation">
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
  border-bottom: 1px solid var(--color-border);

  .nav-link {
    color: var(--color-secondary-text);
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    font-weight: 500;
    background: transparent;

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
}
</style>
