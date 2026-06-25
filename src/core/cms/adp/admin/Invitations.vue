<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  MailPlus,
  Copy,
  Mail,
  Ban,
  AlertCircle,
  FileSpreadsheet,
  ArrowLeft,
  Trash2,
} from 'lucide-vue-next'
import DataTable from '@/components/DataTable.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDateTime } from '@/js/utils/timeUtils.js'
import { CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'
import {
  fetchInvitations,
  revokeInvitation,
  resendInvitation,
  clearInvitations,
} from '@/core/cms/adp/admin/js/invitationService'
import { copyTextToClipboard } from '@/js/utils/clipboard.js'
import InvitationCreateModal from '@/core/cms/adp/admin/InvitationsComponents/InvitationCreateModal.vue'
import InvitationBulkModal from '@/core/cms/adp/admin/InvitationsComponents/InvitationBulkModal.vue'

const router = useRouter()
const toast = useToast()

const hasAdminAccess = ref(false)
const isCheckingAccess = ref(true)
const isLoading = ref(false)
const rows = ref([])
const totalItems = ref(0)
const totalAll = ref(0)
const inactiveCount = ref(0)
const registrationMode = ref('open')
const currentPage = ref(1)
const rowsPerPage = ref(12)
const searchQuery = ref('')

const showCreateModal = ref(false)
const showBulkModal = ref(false)

const confirmDialog = reactive({
  show: false,
  title: 'Очистка приглашений',
  message: '',
  confirmText: 'Удалить',
  variant: 'danger',
  loading: false,
  scope: 'inactive',
})

const invitationModeEnabled = computed(() => registrationMode.value === 'invitation')
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / rowsPerPage.value)))
const listSummary = computed(() => {
  if (!totalItems.value) {
    return 'Нет приглашений'
  }

  const parts = [`Всего: ${totalItems.value}`]
  if (totalPages.value > 1) {
    parts.push(`страница ${currentPage.value} из ${totalPages.value}`)
  }
  if (inactiveCount.value > 0) {
    parts.push(`неактивных: ${inactiveCount.value}`)
  }
  return parts.join(' · ')
})

const statusLabels = {
  pending: 'Ожидает',
  used: 'Использовано',
  expired: 'Истекло',
  revoked: 'Отозвано',
}

const statusClass = {
  pending: 'text-bg-primary',
  used: 'text-bg-success',
  expired: 'text-bg-secondary',
  revoked: 'text-bg-danger',
}

let searchDebounceTimer = null

const columns = [
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Статус', headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' } },
  { key: 'invited_by_name', label: 'Пригласил' },
  { key: 'expires_at', label: 'Действует до', headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' } },
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
    })
    rows.value = data.invitations || []
    totalItems.value = data.total ?? rows.value.length
    totalAll.value = data.total_all ?? totalItems.value
    inactiveCount.value = data.inactive_count ?? 0
    registrationMode.value = data.registration_mode || 'open'
    if (data.page) {
      currentPage.value = data.page
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
    const accessData = await CheckAccessToAdminPanel()
    if (!accessData.access_to_panel) {
      toast.error('У вас нет доступа к административной панели')
      router.push({ name: 'AccessDenied' })
      return
    }
    hasAdminAccess.value = true
    await loadInvitations()
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
  loadInvitations()
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
    loadInvitations()
  }, 300)
}

const openCreateModal = () => {
  showCreateModal.value = true
}

const openBulkModal = () => {
  showBulkModal.value = true
}

const handleInvitationCreated = ({ sendEmail, emailWarning }) => {
  if (emailWarning) {
    toast.warning(`Приглашение создано, но письмо не отправлено: ${emailWarning}`)
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
  try {
    await revokeInvitation(item.id)
    toast.success('Приглашение отозвано')
    await loadInvitations()
  } catch (error) {
    toast.error(error.response?.data?.error || 'Не удалось отозвать приглашение')
  }
}

const goBack = () => {
  router.push({ name: 'UsersPanel' })
}

const closeConfirmDialog = () => {
  if (!confirmDialog.loading) {
    confirmDialog.show = false
  }
}

const openClearConfirm = (scope) => {
  confirmDialog.scope = scope
  confirmDialog.confirmText = scope === 'all' ? 'Удалить все' : 'Удалить неактивные'
  confirmDialog.message = scope === 'all'
    ? `Будут безвозвратно удалены все приглашения (${totalAll.value}).\n\nОжидающие ссылки перестанут работать.`
    : `Будут удалены использованные, истёкшие и отозванные приглашения (${inactiveCount.value}).\n\nОжидающие приглашения останутся.`
  confirmDialog.show = true
}

const handleClearConfirm = async () => {
  if (confirmDialog.loading) {
    return
  }

  confirmDialog.loading = true
  try {
    const result = await clearInvitations(confirmDialog.scope)
    if (result.deleted > 0) {
      toast.success(`Удалено приглашений: ${result.deleted}`)
    } else {
      toast.info(result.message || 'Нет приглашений для удаления')
    }
    confirmDialog.show = false
    currentPage.value = 1
    await loadInvitations()
  } catch (error) {
    toast.error(error.response?.data?.error || 'Не удалось очистить приглашения')
  } finally {
    confirmDialog.loading = false
  }
}
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
      <SpinnerLoading color="primary" />
    </div>

    <div v-else-if="hasAdminAccess" class="card">
      <button
        type="button"
        class="btn btn-link back-to-users px-0 mb-3 d-inline-flex align-items-center gap-2"
        @click="goBack"
      >
        <ArrowLeft :size="18" />
        <span>К пользователям</span>
      </button>

    <div v-if="!invitationModeEnabled" class="alert alert-warning d-flex align-items-start gap-2">
      <AlertCircle :size="18" class="flex-shrink-0 mt-1" />
      <div>
        Режим регистрации по приглашениям не включён.
        Установите <code>API_REGISTRATION_MODE=invitation</code> в <code>.env</code> и перезапустите API.
      </div>
    </div>

    <div class="row align-items-center gap-3 gap-sm-0 mb-3">
      <div class="col-12 col-sm-auto">
        <h4 class="mb-1">Приглашения на регистрацию</h4>
        <p class="text-muted mb-0 small">
          Создавайте ссылки вручную или загружайте список email из Excel для массовой рассылки.
        </p>
        <p v-if="!isLoading && invitationModeEnabled" class="text-muted mb-0 small invitations-summary">
          {{ listSummary }} · {{ rowsPerPage }} на странице
        </p>
      </div>
      <div class="col-12 col-sm d-flex flex-wrap align-items-center justify-content-center justify-content-sm-end gap-2">
        <label class="mb-0">
          <input
            type="search"
            class="form-control"
            placeholder="Поиск по email..."
            @input="handleSearchQuery($event.target.value)"
          />
        </label>
        <button
          type="button"
          class="btn btn-outline-danger d-inline-flex align-items-center gap-2"
          :disabled="!invitationModeEnabled || isLoading || inactiveCount === 0"
          title="Удалить использованные, истёкшие и отозванные приглашения"
          @click="openClearConfirm('inactive')"
        >
          <Trash2 :size="18" />
          <span class="d-none d-md-inline">Очистить неактивные</span>
        </button>
        <button
          type="button"
          class="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
          :disabled="!invitationModeEnabled || isLoading || totalAll === 0"
          title="Удалить все приглашения, включая ожидающие"
          @click="openClearConfirm('all')"
        >
          <Trash2 :size="18" />
          <span class="d-none d-lg-inline">Очистить все</span>
        </button>
        <button
          type="button"
          class="btn btn-outline-primary d-inline-flex align-items-center gap-2"
          :disabled="!invitationModeEnabled"
          @click="openBulkModal"
        >
          <FileSpreadsheet :size="18" />
          <span>Загрузить из Excel</span>
        </button>
        <button
          type="button"
          class="btn btn-primary d-inline-flex align-items-center gap-2"
          :disabled="!invitationModeEnabled"
          @click="openCreateModal"
        >
          <MailPlus :size="18" />
          <span>Одно приглашение</span>
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="d-flex justify-content-center py-5">
      <SpinnerLoading color="primary" />
    </div>

    <DataTable
      v-else
      :items="rows"
      :columns="columns"
      :items-per-page="rowsPerPage"
      :current-page="currentPage"
      :total-items="totalItems"
      :get-item-key="getItemKey"
      :enable-pagination="true"
      @update:current-page="handlePageChange"
    >
      <template #cell-email="{ item }">
        <div class="d-flex align-items-center gap-2 invitation-email-cell">
          <span class="invitation-email-text">{{ item.email }}</span>
          <button
            type="button"
            class="btn btn-sm btn-link p-0 invitation-email-copy"
            title="Скопировать email"
            @click.stop="copyEmail(item.email)"
          >
            <Copy :size="14" />
          </button>
        </div>
      </template>

      <template #cell-status="{ item }">
        <span class="badge" :class="statusClass[item.status] || 'text-bg-secondary'">
          {{ statusLabels[item.status] || item.status }}
        </span>
      </template>

      <template #cell-expires_at="{ item }">
        {{ formatDateTimeValue(item.expires_at) }}
      </template>

      <template #cell-actions="{ item }">
        <div class="d-inline-flex flex-wrap justify-content-end gap-2 invitation-actions">
          <button
            type="button"
            class="btn btn-sm invitation-btn invitation-btn--copy d-inline-flex align-items-center gap-1"
            :disabled="item.status === 'revoked'"
            :title="item.status === 'revoked' ? 'Ссылка недоступна: приглашение отозвано' : 'Скопировать ссылку на регистрацию'"
            @click.stop="copyInviteLink(item)"
          >
            <Copy :size="14" />
            <span class="d-none d-xl-inline">Ссылка</span>
          </button>
          <button
            v-if="item.status === 'pending'"
            type="button"
            class="btn btn-sm invitation-btn invitation-btn--mail d-inline-flex align-items-center gap-1"
            title="Отправить письмо с приглашением"
            @click.stop="handleResend(item)"
          >
            <Mail :size="14" />
            <span class="d-none d-xl-inline">Письмо</span>
          </button>
          <button
            v-if="item.status === 'pending'"
            type="button"
            class="btn btn-sm invitation-btn invitation-btn--revoke d-inline-flex align-items-center gap-1"
            title="Отозвать приглашение"
            @click.stop="handleRevoke(item)"
          >
            <Ban :size="14" />
            <span class="d-none d-xl-inline">Отозвать</span>
          </button>
        </div>
      </template>
    </DataTable>

    <InvitationCreateModal
      :visible="showCreateModal"
      :disabled="!invitationModeEnabled"
      @close="showCreateModal = false"
      @created="handleInvitationCreated"
    />

    <InvitationBulkModal
      :visible="showBulkModal"
      :disabled="!invitationModeEnabled"
      @close="showBulkModal = false"
      @completed="handleBulkCompleted"
    />

    <ConfirmDialog
      :show="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      cancel-text="Отмена"
      :variant="confirmDialog.variant"
      :loading="confirmDialog.loading"
      @confirm="handleClearConfirm"
      @cancel="closeConfirmDialog"
      @close="closeConfirmDialog"
    />
  </div>
</template>

<style scoped lang="scss">
.loading-container {
  min-height: 400px;
}

.back-to-users {
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 500;

  &:hover {
    color: var(--color-accent);
    opacity: 0.85;
  }
}

.invitations-summary {
  margin-top: 0.25rem;
}

.invitation-email-cell {
  min-width: 0;
}

.invitation-email-text {
  user-select: text;
  cursor: text;
  word-break: break-all;
}

.invitation-email-copy {
  flex-shrink: 0;
  color: var(--color-accent);
  line-height: 1;

  &:hover {
    color: var(--color-accent);
    opacity: 0.85;
  }
}

@media (max-width: 1199px) {
  .invitation-actions :deep(.btn-sm) {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
}

.invitation-btn {
  font-weight: 500;
  border-width: 1px;
  border-style: solid;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &--copy {
    color: var(--color-accent);
    border-color: var(--color-accent);
    background-color: color-mix(in srgb, var(--color-accent) 12%, transparent);

    &:hover:not(:disabled) {
      color: #fff;
      background-color: var(--color-accent);
      border-color: var(--color-accent);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      color: var(--color-secondary-text);
      border-color: var(--color-border);
      background-color: var(--color-secondary-background);
    }
  }

  &--mail {
    color: var(--bs-primary);
    border-color: var(--bs-primary);
    background-color: color-mix(in srgb, var(--bs-primary) 12%, transparent);

    &:hover {
      color: #fff;
      background-color: var(--bs-primary);
      border-color: var(--bs-primary);
    }
  }

  &--revoke {
    color: var(--bs-danger);
    border-color: var(--bs-danger);
    background-color: color-mix(in srgb, var(--bs-danger) 12%, transparent);

    &:hover {
      color: #fff;
      background-color: var(--bs-danger);
      border-color: var(--bs-danger);
    }
  }
}
</style>
