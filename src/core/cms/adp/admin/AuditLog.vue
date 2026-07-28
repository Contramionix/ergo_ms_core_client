<script setup>
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logError } from '@/js/utils/logError.js'
import { useToast } from '@/js/utils/toast.js'
import { checkAccessToAdminPanel } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { accessDeniedState } from '@/js/accessDeniedState'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import { tGlobal } from '@/i18n/index.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const AuditLogPanel = defineAsyncComponent(() =>
  import('@/core/audit/components/AuditLogPanel.vue'),
)
const ClientMonitorPanel = defineAsyncComponent(() =>
  import('@/core/client_monitor/components/ClientMonitorPanel.vue'),
)

const { t } = useAppI18n()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const isCheckingAccess = ref(true)
const hasAdminAccess = ref(false)

const tabs = computed(() => [
  { id: 'audit', label: t('admin.audit.tabAudit') },
  { id: 'client', label: t('admin.audit.tabClient') },
])

const activeTab = computed(() => {
  const tab = typeof route.query.tab === 'string' ? route.query.tab : 'audit'
  return tabs.value.some((item) => item.id === tab) ? tab : 'audit'
})

function selectTab(tabId) {
  if (tabId === activeTab.value) {
    return
  }

  router.replace({
    path: route.path,
    query: tabId === 'audit' ? {} : { tab: tabId },
  })
}

onMounted(async () => {
  try {
    const accessData = await checkAccessToAdminPanel()
    if (!accessData.access_to_panel) {
      toast.error(tGlobal('admin.audit.noAdminAccess'))
      accessDeniedState.active = true
      accessDeniedState.title = tGlobal('admin.access.deniedTitle')
      accessDeniedState.message = tGlobal('admin.access.adminRequired')
      return
    }
    hasAdminAccess.value = true
  } catch (error) {
    logError('Аудит: ошибка проверки прав', error)
    accessDeniedState.active = true
    accessDeniedState.title = tGlobal('admin.access.deniedTitle')
    accessDeniedState.message = tGlobal('admin.audit.accessCheckFailed')
  } finally {
    isCheckingAccess.value = false
  }
})
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
    <SpinnerLoading color="primary" />
  </div>

  <div v-else-if="hasAdminAccess" class="admin-page">
    <div class="page-header">
      <h1 class="page-title">{{ tGlobal('admin.audit.pageTitle') }}</h1>
      <p class="page-subtitle">{{ tGlobal('admin.audit.pageSubtitle') }}</p>
    </div>

    <ul class="nav nav-tabs audit-log-tabs" role="tablist">
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

    <div class="content-card" role="tabpanel">
      <AuditLogPanel
        v-if="activeTab === 'audit'"
        search-input-id="audit-search-admin"
      />
      <ClientMonitorPanel v-else-if="activeTab === 'client'" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';

.loading-container {
  min-height: min(400px, 50dvh);
}

.audit-log-tabs {
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
