<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/js/utils/toast.js'
import { ArrowLeft, Check, X, AlertCircle } from 'lucide-vue-next'
import DataTable from '@/components/DataTable.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import SearchInput from '@/components/SearchInput.vue'
import SelectBox from '@/components/SelectBox.vue'
import { formatDateTime } from '@/js/utils/timeUtils.js'
import { confirmAction } from '@/js/utils/confirm.js'
import { CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'
import {
  fetchAdminProfileChangeRequests,
  approveProfileChangeRequest,
  rejectProfileChangeRequest,
} from '@/core/cms/adp/admin/js/profileChangeRequestService.js'

const router = useRouter()
const toast = useToast()

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
  pending: 'text-bg-primary',
  approved: 'text-bg-success',
  rejected: 'text-bg-danger',
}

const listSummary = computed(() => {
  if (!totalItems.value) {
    return 'Нет заявок'
  }

  const parts = [`Всего: ${totalItems.value}`]
  if (pendingCount.value > 0) {
    parts.push(`ожидают: ${pendingCount.value}`)
  }
  return parts.join(' · ')
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
    const accessData = await CheckAccessToAdminPanel()
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

const goBack = () => {
  router.push({ name: 'UsersPanel' })
}

const handleApprove = async (item) => {
  const ok = await confirmAction({
    title: 'Одобрить заявку',
    message: `Применить email «${item.email}» и ФИО «${item.requested_full_name}» для пользователя ${item.username}?`,
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

    <div class="content-card">
      <button type="button" class="btn btn-primary d-inline-flex align-items-center gap-2 align-self-start" @click="goBack">
        <ArrowLeft :size="16" />
        <span>К пользователям</span>
      </button>

      <div v-if="profileSelfEditEnabled" class="alert alert-warning d-flex align-items-start gap-2 mb-0">
        <AlertCircle :size="18" class="flex-shrink-0 mt-1" />
        <div>
          Сейчас пользователи могут менять email, ФИО и телефон самостоятельно. Чтобы включить заявки,
          установите <code>API_USER_PROFILE_SELF_EDIT_ENABLED=false</code> в .env.
        </div>
      </div>

      <p class="text-muted mb-0 small requests-summary">
        {{ listSummary }} · {{ rowsPerPage }} на странице
      </p>

      <div class="table-header users-toolbar">
        <div class="filters-wrapper">
          <SearchInput id="profile-change-requests-search" :model-value="searchQuery" label="Поиск" layout="fixed" placeholder="Пользователь, email, ФИО, телефон..." :show-icon="true" background="primary" focus-border="primary" @update:model-value="handleSearchQuery"/>
          <div class="status-filter">
            <SelectBox id="profile-change-requests-status" v-model="statusFilter" label="Статус" :options="STATUS_OPTIONS" value-key="id" label-key="name" :include-all-option="false" @update:model-value="handleStatusFilterChange"/>
          </div>
        </div>
      </div>

      <LoadingContentArea :loading="isLoading">
      <DataTable :items="rows" :columns="columns" :items-per-page="rowsPerPage" :current-page="currentPage" :total-items="totalItems" :get-item-key="getItemKey" :enable-pagination="true" @update:current-page="handlePageChange">
        <template #cell-user="{ item }">
          <div class="d-flex flex-column">
            <span class="fw-semibold">{{ item.username }}</span>
            <small class="text-muted">{{ item.user_email || '—' }}</small>
          </div>
        </template>

        <template #cell-comment="{ item }">
          <span v-if="item.comment">{{ item.comment }}</span>
          <span v-else-if="item.admin_comment" class="text-muted">{{ item.admin_comment }}</span>
          <span v-else class="text-muted">—</span>
        </template>

        <template #cell-status="{ item }">
          <span class="badge" :class="statusClass[item.status]">
            {{ statusLabels[item.status] || item.status }}
          </span>
        </template>

        <template #cell-created_at="{ item }">
          {{ item.created_at ? formatDateTime(item.created_at) : '—' }}
        </template>

        <template #cell-actions="{ item }">
          <div v-if="item.status === 'pending'" class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1" @click="handleApprove(item)">
              <Check :size="14" />
              Одобрить
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1" @click="handleReject(item)">
              <X :size="14" />
              Отклонить
            </button>
          </div>
          <span v-else class="text-muted small">
            {{ item.reviewed_by_name || '—' }}
          </span>
        </template>
      </DataTable>
      </LoadingContentArea>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';

.loading-container {
  min-height: 400px;
}

.requests-summary {
  margin-top: 0;
}

.filters-wrapper {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
  flex: 1 1 auto;
  min-width: 0;
}

.users-toolbar {
  align-items: flex-end;
}

.status-filter {
  flex: 0 1 220px;
  min-width: 180px;

  :deep(.select-box) {
    --select-box-font-size: 0.875rem;
  }
}
</style>