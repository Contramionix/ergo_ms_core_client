<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { ref, computed, onMounted } from 'vue'
import { useRouteQueryState } from '@/composables/useRouteQueryState.js'
import { useToast } from '@/js/utils/toast.js'
import { Check, X, AlertCircle } from '@lucide/vue'
import DataTable from '@/components/DataTable.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import SearchInput from '@/components/SearchInput.vue'
import SelectBox from '@/components/SelectBox.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { formatDateTime } from '@/js/utils/timeUtils.js'
import { confirmAction } from '@/js/utils/confirm.js'
import { checkAccessToAdminPanel } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { accessDeniedState } from '@/js/accessDeniedState'
import { tGlobal } from '@/i18n/index.js'
import {
  fetchAdminProfileChangeRequests,
  approveProfileChangeRequest,
  rejectProfileChangeRequest,
} from '@/core/cms/adp/admin/js/profileChangeRequestService.js'

const { t } = useAppI18n()

const toast = useToast()

const breadcrumbItems = computed(() => [
  { label: tGlobal('admin.users.breadcrumb'), to: { name: 'UsersPanel' } },
  { label: t('admin.profileChange.breadcrumb') },
])

const hasAdminAccess = ref(false)
const isCheckingAccess = ref(true)
const isLoading = ref(false)
const rows = ref([])
const totalItems = ref(0)
const pendingCount = ref(0)
const profileSelfEditEnabled = ref(true)
const rowsPerPage = ref(12)
const isQueryWatchReady = ref(false)

const { state: listState, patchState, watchState } = useRouteQueryState({
  q: { default: '' },
  page: { default: 1, type: 'number' },
  status: { default: 'pending', enum: ['all', 'pending', 'approved', 'rejected'] },
}, { debounceKeys: ['q'] })

const searchQuery = computed(() => listState.value.q)
const currentPage = computed(() => listState.value.page)
const statusFilter = computed({
  get: () => listState.value.status,
  set: (value) => {
    patchState({ status: value }, { immediate: true })
  },
})

const STATUS_OPTIONS = [
  { id: 'all', name: tGlobal('admin.profileChange.allStatuses') },
  { id: 'pending', name: tGlobal('admin.profileChange.pending') },
  { id: 'approved', name: tGlobal('admin.profileChange.approved') },
  { id: 'rejected', name: tGlobal('admin.profileChange.rejected') },
]

const statusLabels = {
  pending: tGlobal('admin.profileChange.pending'),
  approved: tGlobal('admin.profileChange.approved'),
  rejected: tGlobal('admin.profileChange.rejected'),
}

const statusClass = {
  pending: 'profile-change-status--pending',
  approved: 'profile-change-status--approved',
  rejected: 'profile-change-status--rejected',
}

const profileEditModeLabel = computed(() => (
  profileSelfEditEnabled.value ? tGlobal('admin.profileChange.modeSelf') : tGlobal('admin.profileChange.modeRequests')
))

const tableEmptyText = computed(() => {
  if (searchQuery.value.trim() || statusFilter.value !== 'all') {
    return tGlobal('admin.profileChange.notFound')
  }
  return tGlobal('admin.profileChange.none')
})

const columns = [
  { key: 'user', label: tGlobal('admin.profileChange.colUser') },
  { key: 'current_email', label: tGlobal('admin.profileChange.colCurrentEmail'), hideBelow: 'lg' },
  { key: 'email', label: tGlobal('admin.profileChange.colNewEmail') },
  { key: 'current_full_name', label: tGlobal('admin.profileChange.colCurrentFio'), hideBelow: 'lg' },
  { key: 'requested_full_name', label: tGlobal('admin.profileChange.colNewFio'), hideBelow: 'md' },
  { key: 'current_phone', label: tGlobal('admin.profileChange.colCurrentPhone'), hideBelow: 'lg' },
  { key: 'phone', label: tGlobal('admin.profileChange.colNewPhone'), hideBelow: 'md' },
  { key: 'comment', label: tGlobal('admin.profileChange.colComment'), hideOnCompact: true },
  { key: 'status', label: tGlobal('admin.profileChange.colStatus'), headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' } },
  { key: 'created_at', label: tGlobal('admin.profileChange.colCreated'), headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' }, hideBelow: 'md' },
  { key: 'actions', label: tGlobal('admin.profileChange.colActions'), headerStyle: { textAlign: 'right' }, cellStyle: { textAlign: 'right' } },
]

const getItemKey = (item) => item.id

const formatValue = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : value
  return normalized ? normalized : '—'
}

const isChanged = (currentValue, newValue) => {
  const current = typeof currentValue === 'string' ? currentValue.trim() : currentValue
  const next = typeof newValue === 'string' ? newValue.trim() : newValue
  return Boolean(next) && current !== next
}

const loadRequests = async () => {
  isLoading.value = true
  try {
    const data = await fetchAdminProfileChangeRequests({
      page: currentPage.value,
      page_size: rowsPerPage.value,
      q: searchQuery.value.trim() || undefined,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    })
    rows.value = data.requests || []
    totalItems.value = data.total ?? rows.value.length
    pendingCount.value = data.pending_count ?? 0
    profileSelfEditEnabled.value = data.profile_self_edit_enabled !== false
    if (data.page && data.page !== listState.value.page) {
      await patchState({ page: data.page }, { immediate: true, silent: true })
    }
  } catch (error) {
    logError('Ошибка загрузки заявок на изменение данных профиля:', error)
    toast.error(tGlobal('admin.profileChange.loadError'))
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    const accessData = await checkAccessToAdminPanel()
    if (!accessData.access_to_panel) {
      toast.error(tGlobal('admin.users.noAdminAccess'))
      accessDeniedState.active = true
      accessDeniedState.title = tGlobal('admin.access.deniedTitle')
      accessDeniedState.message = tGlobal('admin.access.adminRequired')
      return
    }
    hasAdminAccess.value = true
    isCheckingAccess.value = false
    await loadRequests()
  } catch (error) {
    logError('Ошибка проверки прав доступа:', error)
    toast.error(tGlobal('admin.users.accessCheckError'))
    accessDeniedState.active = true
    accessDeniedState.title = tGlobal('admin.access.deniedTitle')
    accessDeniedState.message = tGlobal('admin.users.accessCheckFailed')
  } finally {
    isQueryWatchReady.value = true
  }
})

watchState(() => {
  if (!isQueryWatchReady.value || !hasAdminAccess.value) {
    return
  }
  loadRequests()
})

const handlePageChange = (page) => {
  patchState({ page: Number(page) }, { immediate: true })
}

const handleSearchQuery = (query) => {
  patchState({ q: query })
}

const handleStatusFilterChange = () => {
  patchState({ status: statusFilter.value }, { immediate: true })
}

const handleApprove = async (item) => {
  const details = []
  if (isChanged(item.current_email, item.email)) {
    details.push(`email «${item.email}»`)
  }
  if (isChanged(item.current_full_name, item.requested_full_name)) {
    details.push(tGlobal('admin.profileChange.detailFio', { value: item.requested_full_name }))
  }
  if (isChanged(item.current_phone, item.phone)) {
    details.push(tGlobal('admin.profileChange.detailPhone', { value: item.phone }))
  }

  const ok = await confirmAction({
    title: tGlobal('admin.profileChange.approve'),
    message: tGlobal('admin.profileChange.approveMessageQ', { details: details.join(', ') || tGlobal('admin.profileChange.changesFallback'), username: item.username }),
    confirmText: tGlobal('admin.profileChange.approveConfirm'),
    variant: 'primary',
  })
  if (!ok) {
    return
  }

  try {
    await approveProfileChangeRequest(item.id)
    toast.success(tGlobal('admin.profileChange.approvedToast'))
    await loadRequests()
  } catch (error) {
    logError('Ошибка одобрения заявки:', error)
    toast.error(error?.response?.data?.error || tGlobal('admin.profileChange.approveError'))
  }
}

const handleReject = async (item) => {
  const ok = await confirmAction({
    title: tGlobal('admin.profileChange.reject'),
    message: tGlobal('admin.profileChange.rejectMessageQ', { username: item.username }),
    confirmText: tGlobal('admin.profileChange.rejectConfirm'),
    variant: 'danger',
  })
  if (!ok) {
    return
  }

  try {
    await rejectProfileChangeRequest(item.id)
    toast.success(tGlobal('admin.profileChange.rejectedToast'))
    await loadRequests()
  } catch (error) {
    logError('Ошибка отклонения заявки:', error)
    toast.error(error?.response?.data?.error || tGlobal('admin.profileChange.rejectError'))
  }
}
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
    <SpinnerLoading color="primary" />
  </div>

  <div v-else-if="hasAdminAccess" class="admin-page">
    <div class="page-header">
      <h1 class="page-title">{{ t('admin.profileChange.title') }}</h1>
      <p class="page-subtitle">
        {{ t('admin.profileChange.subtitleAlt') }}
      </p>
    </div>

    <div class="profile-change-shell">
      <Breadcrumbs :items="breadcrumbItems" class="profile-change-breadcrumbs" />

      <div class="content-card">
        <div class="profile-change-stats">
          <span class="profile-change-stat">
            {{ t('admin.profileChange.editMode') }} <strong>{{ profileEditModeLabel }}</strong>
          </span>
          <span class="profile-change-stat">
            {{ t('admin.profileChange.totalLabel') }} <strong>{{ totalItems }}</strong>
          </span>
          <span class="profile-change-stat">
            {{ t('admin.profileChange.pendingLabel') }} <strong>{{ pendingCount }}</strong>
          </span>
        </div>

        <div v-if="profileSelfEditEnabled" class="profile-change-alert">
          <AlertCircle :size="18" class="flex-shrink-0" aria-hidden="true" />
          <div>
            <span v-html="t('admin.profileChange.envHint')"></span>
          </div>
        </div>

        <div class="table-header profile-change-toolbar">
          <div class="filters-wrapper">
            <SearchInput id="profile-change-requests-search" :model-value="searchQuery" layout="fixed" :placeholder="t('admin.profileChange.searchPlaceholder')" :show-icon="true" background="primary" focus-border="primary" @update:model-value="handleSearchQuery"/>
            <div class="status-filter">
              <HoverTooltip :text="t('admin.profileChange.statusTooltip')">
                <SelectBox id="profile-change-requests-status" v-model="statusFilter" :options="STATUS_OPTIONS" value-key="id" label-key="name" :include-all-option="false" @update:model-value="handleStatusFilterChange"/>
              </HoverTooltip>
            </div>
          </div>
        </div>

        <LoadingContentArea :loading="isLoading">
          <DataTable :items="rows" :columns="columns" :items-per-page="rowsPerPage" :current-page="currentPage" :total-items="totalItems" :empty-text="tableEmptyText" :get-item-key="getItemKey" :enable-pagination="true" @update:current-page="handlePageChange">
            <template #cell-user="{ item }">
              <div class="d-flex align-items-center gap-3">
                <UserAvatar :user-ref="item.public_id" :title="item.current_full_name || item.username" :size="32"/>
                <div class="d-flex flex-column min-w-0">
                  <span class="fw-semibold">{{ item.current_full_name || item.username }}</span>
                  <small class="text-muted">{{ item.username }} · {{ item.user_email || '—' }}</small>
                </div>
              </div>
            </template>

            <template #cell-current_email="{ item }">
              {{ formatValue(item.current_email) }}
            </template>

            <template #cell-email="{ item }">
              <span :class="{ 'profile-change-value--changed': isChanged(item.current_email, item.email) }">
                {{ formatValue(item.email) }}
              </span>
            </template>

            <template #cell-current_full_name="{ item }">
              {{ formatValue(item.current_full_name) }}
            </template>

            <template #cell-requested_full_name="{ item }">
              <span :class="{ 'profile-change-value--changed': isChanged(item.current_full_name, item.requested_full_name) }">
                {{ formatValue(item.requested_full_name) }}
              </span>
            </template>

            <template #cell-current_phone="{ item }">
              {{ formatValue(item.current_phone) }}
            </template>

            <template #cell-phone="{ item }">
              <span :class="{ 'profile-change-value--changed': isChanged(item.current_phone, item.phone) }">
                {{ formatValue(item.phone) }}
              </span>
            </template>

            <template #cell-comment="{ item }">
              <span v-if="item.comment">{{ item.comment }}</span>
              <span v-else-if="item.admin_comment" class="text-muted">{{ item.admin_comment }}</span>
              <span v-else class="text-muted">—</span>
            </template>

            <template #cell-status="{ item }">
              <div class="profile-change-status-cell">
                <span class="profile-change-status" :class="statusClass[item.status]">
                  {{ statusLabels[item.status] || item.status }}
                </span>
                <small v-if="item.status !== 'pending' && item.reviewed_by_name" class="profile-change-reviewed">
                  {{ item.reviewed_by_name }}
                  <template v-if="item.reviewed_at"> · {{ formatDateTime(item.reviewed_at) }}</template>
                </small>
              </div>
            </template>

            <template #cell-created_at="{ item }">
              {{ item.created_at ? formatDateTime(item.created_at) : '—' }}
            </template>

            <template #cell-actions="{ item }">
              <div v-if="item.status === 'pending'" class="actions-cell">
                <HoverTooltip :text="t('admin.profileChange.approve')">
                  <button type="button" class="btn-action" :aria-label="t('admin.profileChange.approve')" @click.stop="handleApprove(item)">
                    <Check :size="15" />
                  </button>
                </HoverTooltip>
                <HoverTooltip :text="t('admin.profileChange.reject')">
                  <button type="button" class="btn-action btn-action--delete" :aria-label="t('admin.profileChange.reject')" @click.stop="handleReject(item)">
                    <X :size="15" />
                  </button>
                </HoverTooltip>
              </div>
              <span v-else class="text-muted">—</span>
            </template>
          </DataTable>
        </LoadingContentArea>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';

.loading-container {
  min-height: min(400px, 50dvh);
}

.profile-change-shell {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

:deep(.profile-change-breadcrumbs) {
  margin-bottom: 0;
}

.profile-change-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
}

.profile-change-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
  background: var(--color-secondary-background);

  strong {
    color: var(--color-primary-text);
    font-weight: 600;
  }
}

.profile-change-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  border: 1px solid color-mix(in srgb, var(--bs-warning, #ffc107) 35%, var(--color-border));
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-primary-text);
  background: color-mix(in srgb, var(--bs-warning, #ffc107) 10%, var(--color-primary-background));

  code {
    font-size: 0.8125rem;
  }
}

.filters-wrapper {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
  flex: 1 1 auto;
  min-width: 0;
}

.profile-change-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: end;
  gap: 0.75rem;

  .filters-wrapper {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) 220px;
    gap: 0.75rem;
    min-width: 0;
  }

  .status-filter {
    width: 220px;
  }

  @media (width < $ui-bp-md) {
    .filters-wrapper {
      grid-template-columns: 1fr;
    }

    .status-filter {
      width: 100%;
      max-width: none;
    }
  }
}

.status-filter {
  width: 220px;
  max-width: 220px;
  box-sizing: border-box;

  @media (width < $ui-bp-md) {
    width: 100%;
    max-width: none;
  }

  :deep(.hover-tooltip) {
    display: contents;
  }

  :deep(.select-box),
  :deep(.dropdown) {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  :deep(.select-trigger) {
    display: flex;
    width: 100%;
    max-width: 100%;
    min-height: 38px;
    box-sizing: border-box;
  }
}

.profile-change-value--changed {
  font-weight: 600;
  color: var(--color-primary-text);
}

.profile-change-status-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.profile-change-reviewed {
  color: var(--color-secondary-text);
  font-size: 0.75rem;
  line-height: 1.2;
  text-align: center;
}

.profile-change-status {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;

  &--pending {
    background: color-mix(in srgb, var(--color-accent, #0d6efd) 14%, transparent);
    color: var(--color-accent, #0d6efd);
  }

  &--approved {
    background: color-mix(in srgb, var(--bs-success, #198754) 14%, transparent);
    color: var(--bs-success, #198754);
  }

  &--rejected {
    background: color-mix(in srgb, var(--bs-danger, #dc3545) 12%, transparent);
    color: var(--bs-danger, #dc3545);
  }
}

.min-w-0 {
  min-width: 0;
}
</style>