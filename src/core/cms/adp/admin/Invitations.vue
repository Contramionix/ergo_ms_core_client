<script setup>
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useRouteQueryState } from '@/composables/useRouteQueryState.js'
import { useToast } from '@/js/utils/toast.js'
import { MailPlus, Copy, Mail, Ban, FileSpreadsheet, Trash2, Eraser, } from 'lucide-vue-next'
import DataTable from '@/components/DataTable.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import SelectBox from '@/components/SelectBox.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import SearchInput from '@/components/SearchInput.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import { runWithConfirm, confirmAction } from '@/js/utils/confirm.js'
import { formatDateTime } from '@/js/utils/timeUtils.js'
import { checkAccessToAdminPanel } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { accessDeniedState } from '@/js/accessDeniedState'
import { fetchInvitations, revokeInvitation, resendInvitation, clearInvitations, } from '@/core/cms/adp/admin/js/invitationService'
import { copyTextToClipboard } from '@/js/utils/clipboard.js'

const InvitationCreateModal = defineAsyncComponent(() =>
  import('@/core/cms/adp/admin/InvitationsComponents/InvitationCreateModal.vue'),
)
const InvitationBulkModal = defineAsyncComponent(() =>
  import('@/core/cms/adp/admin/InvitationsComponents/InvitationBulkModal.vue'),
)

const toast = useToast()

const breadcrumbItems = [
  { label: 'Пользователи', to: { name: 'UsersPanel' } },
  { label: 'Управление приглашениями' },
]

const hasAdminAccess = ref(false)
const isCheckingAccess = ref(true)
const isLoading = ref(false)
const rows = ref([])
const totalItems = ref(0)
const totalAll = ref(0)
const inactiveCount = ref(0)
const pendingCount = ref(0)
const registrationMode = ref('open')
const rowsPerPage = ref(12)

const { state: listState, patchState, watchState } = useRouteQueryState({
  q: { default: '' },
  page: { default: 1, type: 'number' },
  status: { default: 'all', enum: ['all', 'pending', 'used', 'expired', 'revoked'] },
}, { debounceKeys: ['q'] })

const searchQuery = computed(() => listState.value.q)
const currentPage = computed(() => listState.value.page)
const statusFilter = computed({
  get: () => listState.value.status,
  set: (value) => {
    patchState({ status: value }, { immediate: true })
  },
})

const showCreateModal = ref(false)
const showBulkModal = ref(false)
const isQueryWatchReady = ref(false)

const STATUS_OPTIONS = [
  { id: 'all', name: 'Все статусы' },
  { id: 'pending', name: 'Ожидают' },
  { id: 'used', name: 'Использованы' },
  { id: 'expired', name: 'Истекли' },
  { id: 'revoked', name: 'Отозваны' },
]

const REGISTRATION_MODE_LABELS = {
  open: 'Открытая',
  invitation: 'Только по приглашениям',
  closed: 'Закрыта',
}

const registrationModeLabel = computed(
  () => REGISTRATION_MODE_LABELS[registrationMode.value] || registrationMode.value,
)

const tableEmptyText = computed(() => {
  if (searchQuery.value.trim() || statusFilter.value !== 'all') {
    return 'Приглашения не найдены'
  }
  return 'Нет приглашений'
})

const statusLabels = {
  pending: 'Ожидает',
  used: 'Использовано',
  expired: 'Истекло',
  revoked: 'Отозвано',
}

const statusClass = {
  pending: 'invitations-status--pending',
  used: 'invitations-status--used',
  expired: 'invitations-status--expired',
  revoked: 'invitations-status--revoked',
}

const columns = [
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Статус', headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' } },
  { key: 'invited_by_name', label: 'Пригласил', hideBelow: 'md' },
  { key: 'created_at', label: 'Создано', headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' }, hideBelow: 'lg' },
  { key: 'expires_at', label: 'Действует до', headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' }, hideBelow: 'md' },
  { key: 'actions', label: 'Действия', headerStyle: { textAlign: 'right' }, cellStyle: { textAlign: 'right' } },
]

const getItemKey = (item) => item.id

const formatDateTimeValue = (value) => {
  if (!value) return '—'
  return formatDateTime(value)
}

const loadInvitations = async () => {
  isLoading.value = true
  try {
    const data = await fetchInvitations({
      page: currentPage.value,
      page_size: rowsPerPage.value,
      search: searchQuery.value.trim() || undefined,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    })
    rows.value = data.invitations || []
    totalItems.value = data.total ?? rows.value.length
    totalAll.value = data.total_all ?? totalItems.value
    inactiveCount.value = data.inactive_count ?? 0
    pendingCount.value = data.pending_count ?? 0
    registrationMode.value = data.registration_mode || 'open'
    if (data.page && data.page !== listState.value.page) {
      await patchState({ page: data.page }, { immediate: true, silent: true })
    }
  } catch (error) {
    logError('Ошибка загрузки приглашений:', error)
    toast.error('Не удалось загрузить список приглашений')
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    const accessData = await checkAccessToAdminPanel()
    if (!accessData.access_to_panel) {
      toast.error('У вас нет доступа к административной панели')
      accessDeniedState.active = true
      accessDeniedState.title = 'Доступ запрещён'
      accessDeniedState.message = 'Требуются права администратора.'
      return
    }
    hasAdminAccess.value = true
    isCheckingAccess.value = false
    await loadInvitations()
  } catch (error) {
    logError('Ошибка проверки прав доступа:', error)
    toast.error('Ошибка проверки прав доступа')
    accessDeniedState.active = true
    accessDeniedState.title = 'Доступ запрещён'
    accessDeniedState.message = 'Не удалось проверить права доступа.'
  } finally {
    isQueryWatchReady.value = true
  }
})

watchState(() => {
  if (!isQueryWatchReady.value || !hasAdminAccess.value) {
    return
  }
  loadInvitations()
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

const openCreateModal = () => {
  showCreateModal.value = true
}

const openBulkModal = () => {
  showBulkModal.value = true
}

const handleInvitationCreated = ({ sendEmail, emailWarning }) => {
  if (emailWarning) {
    toast.warning('Приглашение создано, но письмо не отправлено')
  } else if (sendEmail) {
    toast.success('Приглашение создано и отправлено на email')
  } else {
    toast.success('Приглашение создано, ссылка скопирована в буфер обмена')
  }
  loadInvitations()
}

const handleBulkCompleted = () => {
  toast.success('Список приглашений обновлён')
  loadInvitations()
}

const copyInviteLink = async (item) => {
  if (item.status === 'revoked') {
    return
  }

  const inviteUrl = item.invite_url?.trim()
  if (!inviteUrl) {
    toast.error('Ссылка приглашения недоступна')
    return
  }

  try {
    await copyTextToClipboard(inviteUrl)
    toast.success('Ссылка скопирована')
  } catch {
    toast.error('Не удалось скопировать ссылку')
  }
}

const copyEmail = async (email) => {
  const normalizedEmail = email?.trim()
  if (!normalizedEmail) {
    return
  }

  try {
    await copyTextToClipboard(normalizedEmail)
    toast.success('Email скопирован')
  } catch {
    toast.error('Не удалось скопировать email')
  }
}

const handleResend = async (item) => {
  try {
    await resendInvitation(item.id)
    toast.success('Письмо с приглашением отправлено')
  } catch (error) {
    toast.error(error.response?.data?.error || 'Не удалось отправить письмо')
  }
}

const handleRevoke = async (item) => {
  const confirmed = await confirmAction({
    title: 'Отозвать приглашение',
    message: `Отозвать приглашение для ${item.email}?\n\nСсылка перестанет работать.`,
    confirmText: 'Отозвать',
    cancelText: 'Отмена',
    variant: 'danger',
  })
  if (!confirmed) {
    return
  }

  try {
    await revokeInvitation(item.id)
    toast.success('Приглашение отозвано')
    await loadInvitations()
  } catch (error) {
    toast.error(error.response?.data?.error || 'Не удалось отозвать приглашение')
  }
}

const openClearConfirm = async (scope) => {
  const options = {
    title: 'Очистка приглашений',
    confirmText: scope === 'all' ? 'Удалить все' : 'Удалить неактивные',
    variant: 'danger',
    message: scope === 'all'
      ? `Будут безвозвратно удалены все приглашения (${totalAll.value}).\n\nОжидающие ссылки перестанут работать.`
      : `Будут удалены использованные, истёкшие и отозванные приглашения (${inactiveCount.value}).\n\nОжидающие приглашения останутся.`,
  }

  await runWithConfirm(options, async () => {
    const result = await clearInvitations(scope)
    if (result.deleted > 0) {
      toast.success(`Удалено приглашений: ${result.deleted}`)
    } else {
      toast.info(result.message || 'Нет приглашений для удаления')
    }
    await patchState({ page: 1 }, { immediate: true })
    if (listState.value.page === 1) {
      await loadInvitations()
    }
  })
}
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
    <SpinnerLoading color="primary" />
  </div>

  <div v-else-if="hasAdminAccess" class="admin-page">
    <div class="page-header">
      <h1 class="page-title">Управление приглашениями</h1>
      <p class="page-subtitle">
        Создавайте ссылки вручную или загружайте список email из Excel для массовой рассылки
      </p>
    </div>

    <div class="invitations-shell">
      <Breadcrumbs :items="breadcrumbItems" class="invitations-breadcrumbs" />

      <div class="content-card">
      <div class="invitations-stats">
        <span class="invitations-stat">
          Режим регистрации: <strong>{{ registrationModeLabel }}</strong>
        </span>
        <span class="invitations-stat">
          Всего в системе: <strong>{{ totalAll }}</strong>
        </span>
        <span class="invitations-stat">
          Ожидают: <strong>{{ pendingCount }}</strong>
        </span>
        <span v-if="inactiveCount > 0" class="invitations-stat">
          Неактивных: <strong>{{ inactiveCount }}</strong>
        </span>
      </div>

      <div class="table-header invitations-toolbar">
        <div class="filters-wrapper">
          <SearchInput id="invitations-search" :model-value="searchQuery" layout="fixed" placeholder="Email, примечание, кто пригласил..." :show-icon="true" background="primary" focus-border="primary" @update:model-value="handleSearchQuery"/>
          <div class="status-filter">
            <HoverTooltip text="Статус приглашений">
              <SelectBox id="invitations-status" v-model="statusFilter" :options="STATUS_OPTIONS" value-key="id" label-key="name" :include-all-option="false" @update:model-value="handleStatusFilterChange"/>
            </HoverTooltip>
          </div>
        </div>

        <div class="actions-wrapper">
          <HoverTooltip text="Одно приглашение">
            <span class="invitations-icon-btn-wrap">
              <button type="button" class="btn invitations-toolbar-icon-btn" aria-label="Одно приглашение" :disabled="isLoading" @click="openCreateModal">
                <MailPlus :size="20" aria-hidden="true" />
              </button>
            </span>
          </HoverTooltip>
          <HoverTooltip text="Загрузить из Excel">
            <span class="invitations-icon-btn-wrap">
              <button type="button" class="btn invitations-toolbar-icon-btn" aria-label="Загрузить из Excel" :disabled="isLoading" @click="openBulkModal">
                <FileSpreadsheet :size="20" aria-hidden="true" />
              </button>
            </span>
          </HoverTooltip>
          <HoverTooltip text="Очистить неактивные">
            <span class="invitations-icon-btn-wrap">
              <button type="button" class="btn invitations-toolbar-icon-btn" aria-label="Очистить неактивные" :disabled="isLoading || inactiveCount === 0" @click="openClearConfirm('inactive')">
                <Eraser :size="20" aria-hidden="true" />
              </button>
            </span>
          </HoverTooltip>
          <HoverTooltip text="Очистить все">
            <span class="invitations-icon-btn-wrap">
              <button type="button" class="btn invitations-toolbar-icon-btn invitations-toolbar-icon-btn--danger" aria-label="Очистить все" :disabled="isLoading || totalAll === 0" @click="openClearConfirm('all')">
                <Trash2 :size="20" aria-hidden="true" />
              </button>
            </span>
          </HoverTooltip>
        </div>
      </div>

      <LoadingContentArea :loading="isLoading">
        <DataTable :items="rows" :columns="columns" :items-per-page="rowsPerPage" :current-page="currentPage" :total-items="totalItems" :empty-text="tableEmptyText" :get-item-key="getItemKey" :enable-pagination="true" @update:current-page="handlePageChange">
        <template #cell-email="{ item }">
          <div class="invitations-email-cell">
            <div class="d-flex align-items-center gap-2">
              <span class="invitations-email-text">{{ item.email }}</span>
              <button type="button" class="btn-action" title="Скопировать email" aria-label="Скопировать email" @click.stop="copyEmail(item.email)">
                <Copy :size="15" />
              </button>
            </div>
            <small v-if="item.note" class="invitations-email-note">{{ item.note }}</small>
          </div>
        </template>

        <template #cell-status="{ item }">
          <span class="invitations-status" :class="statusClass[item.status] || 'invitations-status--expired'">
            {{ statusLabels[item.status] || item.status }}
          </span>
        </template>

        <template #cell-invited_by_name="{ item }">
          {{ item.invited_by_name || '—' }}
        </template>

        <template #cell-created_at="{ item }">
          {{ formatDateTimeValue(item.created_at) }}
        </template>

        <template #cell-expires_at="{ item }">
          {{ formatDateTimeValue(item.expires_at) }}
        </template>

        <template #cell-actions="{ item }">
          <div class="actions-cell">
            <button type="button" class="btn-action" :disabled="item.status === 'revoked'" :title="item.status === 'revoked' ? 'Ссылка недоступна: приглашение отозвано' : 'Скопировать ссылку на регистрацию'" aria-label="Скопировать ссылку" @click.stop="copyInviteLink(item)">
              <Copy :size="15" />
            </button>
            <button v-if="item.status === 'pending'" type="button" class="btn-action" title="Отправить письмо с приглашением" aria-label="Отправить письмо" @click.stop="handleResend(item)">
              <Mail :size="15" />
            </button>
            <button v-if="item.status === 'pending'" type="button" class="btn-action btn-action--delete" title="Отозвать приглашение" aria-label="Отозвать приглашение" @click.stop="handleRevoke(item)">
              <Ban :size="15" />
            </button>
          </div>
        </template>
        </DataTable>
      </LoadingContentArea>

      <InvitationCreateModal v-if="showCreateModal" :visible="showCreateModal" @close="showCreateModal = false" @created="handleInvitationCreated"/>
      <InvitationBulkModal v-if="showBulkModal" :visible="showBulkModal" @close="showBulkModal = false" @completed="handleBulkCompleted"/>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';

.loading-container {
  min-height: min(400px, 50dvh);
}

.invitations-shell {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

:deep(.invitations-breadcrumbs) {
  margin-bottom: 0;
}

.invitations-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
}

.invitations-stat {
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

.filters-wrapper {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
  flex: 1 1 auto;
  min-width: 0;
}

.invitations-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
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

  .actions-wrapper {
    flex-shrink: 0;

    :deep(.hover-tooltip) {
      flex: 0 0 auto;
    }
  }

  @media (width < $ui-bp-md) {
    grid-template-columns: 1fr;

    .filters-wrapper {
      grid-template-columns: 1fr;
    }

    .status-filter {
      width: 100%;
      max-width: none;
    }

    .actions-wrapper {
      width: 100%;
      justify-content: flex-start;
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

.invitations-icon-btn-wrap {
  display: inline-flex;
}

.invitations-toolbar-icon-btn {
  display: inline-flex;
  background-color: transparent;
  border-radius: 1.5rem;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  padding: 0;
  border: none;

  &:hover:not(:disabled) {
    background-color: var(--color-hover-background);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  &--danger {
    color: var(--bs-danger, #dc3545);

    &:hover:not(:disabled) {
      background-color: rgba(var(--bs-danger-rgb, 220, 53, 69), 0.08);
    }
  }

  @media (width < $ui-bp-md) {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
  }
}

.invitations-email-cell {
  min-width: 0;
}

.invitations-email-text {
  user-select: text;
  cursor: text;
  word-break: break-all;
  color: var(--color-primary-text);
}

.invitations-email-note {
  display: block;
  margin-top: 0.125rem;
  color: var(--color-secondary-text);
}

.invitations-status {
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

  &--used {
    background: color-mix(in srgb, var(--bs-success, #198754) 14%, transparent);
    color: var(--bs-success, #198754);
  }

  &--expired {
    background: var(--color-secondary-background);
    color: var(--color-secondary-text);
  }

  &--revoked {
    background: color-mix(in srgb, var(--bs-danger, #dc3545) 12%, transparent);
    color: var(--bs-danger, #dc3545);
  }
}
</style>
