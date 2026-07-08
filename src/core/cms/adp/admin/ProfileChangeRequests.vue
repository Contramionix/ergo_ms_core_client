<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/js/utils/toast.js'
import { Check, X, AlertCircle } from 'lucide-vue-next'
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
import {
  fetchAdminProfileChangeRequests,
  approveProfileChangeRequest,
  rejectProfileChangeRequest,
} from '@/core/cms/adp/admin/js/profileChangeRequestService.js'

const router = useRouter()
const toast = useToast()

const breadcrumbItems = [
  { label: 'Пользователи', to: { name: 'UsersPanel' } },
  { label: 'Заявки на изменение данных' },
]

const hasAdminAccess = ref(false)
const isCheckingAccess = ref(true)
const isLoading = ref(false)
const rows = ref([])
const totalItems = ref(0)
const pendingCount = ref(0)
const profileSelfEditEnabled = ref(true)
const currentPage = ref(1)
const rowsPerPage = ref(12)
const searchQuery = ref('')
const statusFilter = ref('pending')

const STATUS_OPTIONS = [
  { id: 'all', name: 'Все статусы' },
  { id: 'pending', name: 'На рассмотрении' },
  { id: 'approved', name: 'Одобрено' },
  { id: 'rejected', name: 'Отклонено' },
]

const statusLabels = {
  pending: 'На рассмотрении',
  approved: 'Одобрено',
  rejected: 'Отклонено',
}

const statusClass = {
  pending: 'profile-change-status--pending',
  approved: 'profile-change-status--approved',
  rejected: 'profile-change-status--rejected',
}

const profileEditModeLabel = computed(() => (
  profileSelfEditEnabled.value ? 'Самостоятельное' : 'Через заявки'
))

const tableEmptyText = computed(() => {
  if (searchQuery.value.trim() || statusFilter.value !== 'all') {
    return 'Заявки не найдены'
  }
  return 'Нет заявок'
})

const columns = [
  { key: 'user', label: 'Пользователь' },
  { key: 'current_email', label: 'Текущий email' },
  { key: 'email', label: 'Новый email' },
  { key: 'current_full_name', label: 'Текущее ФИО' },
  { key: 'requested_full_name', label: 'Новое ФИО' },
  { key: 'current_phone', label: 'Текущий телефон' },
  { key: 'phone', label: 'Новый телефон' },
  { key: 'comment', label: 'Комментарий' },
  { key: 'status', label: 'Статус', headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' } },
  { key: 'created_at', label: 'Создано', headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' } },
  { key: 'actions', label: 'Действия', headerStyle: { textAlign: 'right' }, cellStyle: { textAlign: 'right' } },
]

let searchDebounceTimer = null

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
      search: searchQuery.value.trim() || undefined,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    })
    rows.value = data.requests || []
    totalItems.value = data.total ?? rows.value.length
    pendingCount.value = data.pending_count ?? 0
    profileSelfEditEnabled.value = data.profile_self_edit_enabled !== false
    if (data.page) {
      currentPage.value = data.page
    }
  } catch (error) {
    logError('Ошибка загрузки заявок на изменение данных профиля:', error)
    toast.error('Не удалось загрузить реестр заявок')
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    const accessData = await checkAccessToAdminPanel()
    if (!accessData.access_to_panel) {
      toast.error('У вас нет доступа к административной панели')
      router.push({ name: 'AccessDenied' })
      return
    }
    hasAdminAccess.value = true
    await loadRequests()
  } catch (error) {
    logError('Ошибка проверки прав доступа:', error)
    toast.error('Ошибка проверки прав доступа')
    router.push({ name: 'AccessDenied' })
  } finally {
    isCheckingAccess.value = false
  }
})

onUnmounted(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
})

const handlePageChange = (page) => {
  currentPage.value = page
  loadRequests()
}

const handleSearchQuery = (query) => {
  searchQuery.value = query
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    if (currentPage.value !== 1) {
      currentPage.value = 1
    }
    loadRequests()
  }, 300)
}

const handleStatusFilterChange = () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1
  }
  loadRequests()
}

const handleApprove = async (item) => {
  const details = []
  if (isChanged(item.current_email, item.email)) {
    details.push(`email «${item.email}»`)
  }
  if (isChanged(item.current_full_name, item.requested_full_name)) {
    details.push(`ФИО «${item.requested_full_name}»`)
  }
  if (isChanged(item.current_phone, item.phone)) {
    details.push(`телефон «${item.phone}»`)
  }

  const ok = await confirmAction({
    title: 'Одобрить заявку',
    message: `Применить ${details.join(', ') || 'изменения'} для пользователя ${item.username}?`,
    confirmText: 'Одобрить',
    variant: 'primary',
  })
  if (!ok) {
    return
  }

  try {
    await approveProfileChangeRequest(item.id)
    toast.success('Заявка одобрена')
    await loadRequests()
  } catch (error) {
    logError('Ошибка одобрения заявки:', error)
    toast.error(error?.response?.data?.error || 'Не удалось одобрить заявку')
  }
}

const handleReject = async (item) => {
  const ok = await confirmAction({
    title: 'Отклонить заявку',
    message: `Отклонить заявку пользователя ${item.username}?`,
    confirmText: 'Отклонить',
    variant: 'danger',
  })
  if (!ok) {
    return
  }

  try {
    await rejectProfileChangeRequest(item.id)
    toast.success('Заявка отклонена')
    await loadRequests()
  } catch (error) {
    logError('Ошибка отклонения заявки:', error)
    toast.error(error?.response?.data?.error || 'Не удалось отклонить заявку')
  }
}
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
    <SpinnerLoading color="primary" />
  </div>

  <div v-else-if="hasAdminAccess" class="admin-page">
    <div class="page-header">
      <h1 class="page-title">Заявки на изменение данных профиля</h1>
      <p class="page-subtitle">
        Реестр заявок пользователей на изменение email, фамилии, имени и отчества
      </p>
    </div>

    <div class="profile-change-shell">
      <Breadcrumbs :items="breadcrumbItems" class="profile-change-breadcrumbs" />

      <div class="content-card">
        <div class="profile-change-stats">
          <span class="profile-change-stat">
            Редактирование профиля: <strong>{{ profileEditModeLabel }}</strong>
          </span>
          <span class="profile-change-stat">
            Всего: <strong>{{ totalItems }}</strong>
          </span>
          <span class="profile-change-stat">
            На рассмотрении: <strong>{{ pendingCount }}</strong>
          </span>
        </div>

        <div v-if="profileSelfEditEnabled" class="profile-change-alert">
          <AlertCircle :size="18" class="flex-shrink-0" aria-hidden="true" />
          <div>
            Сейчас пользователи могут менять email, ФИО и телефон самостоятельно. Чтобы включить заявки,
            установите <code>API_USER_PROFILE_SELF_EDIT_ENABLED=false</code> в .env.
          </div>
        </div>

        <div class="table-header profile-change-toolbar">
          <div class="filters-wrapper">
            <SearchInput id="profile-change-requests-search" :model-value="searchQuery" layout="fixed" placeholder="Пользователь, email, ФИО, телефон..." :show-icon="true" background="primary" focus-border="primary" @update:model-value="handleSearchQuery"/>
            <div class="status-filter">
              <HoverTooltip text="Статус заявки">
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
                <HoverTooltip text="Одобрить заявку">
                  <button type="button" class="btn-action" aria-label="Одобрить заявку" @click.stop="handleApprove(item)">
                    <Check :size="15" />
                  </button>
                </HoverTooltip>
                <HoverTooltip text="Отклонить заявку">
                  <button type="button" class="btn-action btn-action--delete" aria-label="Отклонить заявку" @click.stop="handleReject(item)">
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
  min-height: 400px;
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
}

.status-filter {
  width: 220px;
  max-width: 220px;
  box-sizing: border-box;

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