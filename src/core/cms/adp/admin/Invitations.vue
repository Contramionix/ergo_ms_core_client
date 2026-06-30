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

    <div v-else-if="hasAdminAccess" class="admin-page">
      <div class="page-header">
        <h1 class="page-title">Приглашения</h1>
        <p class="page-subtitle">Создавайте ссылки вручную или загружайте список email из Excel для массовой рассылки</p>
      </div>

      <div class="content-card">
        <button
          type="button"
          class="btn btn-primary d-inline-flex align-items-center gap-2 align-self-start"
          @click="goBack"
        >
          <ArrowLeft :size="16" />
          <span>К пользователям</span>
        </button>

    <div v-if="!invitationModeEnabled" class="alert alert-warning d-flex align-items-start gap-2 mb-0">
      <AlertCircle :size="18" class="flex-shrink-0 mt-1" />
      <div>
        Режим регистрации по приглашениям не включён.
        Измените настройки сервера.
      </div>
    </div>

    <p v-if="!isLoading && invitationModeEnabled" class="text-muted mb-0 small invitations-summary">
      {{ listSummary }} · {{ rowsPerPage }} на странице
    </p>

    <div class="table-header">
      <div class="search-wrapper">
        <input
          type="search"
          class="form-control search-input"
          placeholder="Поиск по email..."
          @input="handleSearchQuery($event.target.value)"
        />
      </div>
      <div class="actions-wrapper">
        <button
          type="button"
          class="btn btn-primary d-flex align-items-center gap-2"
          :disabled="!invitationModeEnabled || isLoading || inactiveCount === 0"
          title="Удалить использованные, истёкшие и отозванные приглашения"
          @click="openClearConfirm('inactive')"
        >
          <Trash2 :size="16" />
          <span>Очистить неактивные</span>
        </button>
        <button
          type="button"
          class="btn btn-primary d-flex align-items-center gap-2"
          :disabled="!invitationModeEnabled || isLoading || totalAll === 0"
          title="Удалить все приглашения, включая ожидающие"
          @click="openClearConfirm('all')"
        >
          <Trash2 :size="16" />
          <span>Очистить все</span>
        </button>
        <button
          type="button"
          class="btn btn-primary d-flex align-items-center gap-2"
          :disabled="!invitationModeEnabled"
          @click="openBulkModal"
        >
          <FileSpreadsheet :size="16" />
          <span>Загрузить из Excel</span>
        </button>
        <button
          type="button"
          class="btn btn-primary d-flex align-items-center gap-2"
          :disabled="!invitationModeEnabled"
          @click="openCreateModal"
        >
          <MailPlus :size="16" />
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
            class="btn-action"
            title="Скопировать email"
            aria-label="Скопировать email"
            @click.stop="copyEmail(item.email)"
          >
            <Copy :size="15" />
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
        <div class="actions-cell">
          <button
            type="button"
            class="btn-action"
            :disabled="item.status === 'revoked'"
            :title="item.status === 'revoked' ? 'Ссылка недоступна: приглашение отозвано' : 'Скопировать ссылку на регистрацию'"
            aria-label="Скопировать ссылку"
            @click.stop="copyInviteLink(item)"
          >
            <Copy :size="15" />
          </button>
          <button
            v-if="item.status === 'pending'"
            type="button"
            class="btn-action"
            title="Отправить письмо с приглашением"
            aria-label="Отправить письмо"
            @click.stop="handleResend(item)"
          >
            <Mail :size="15" />
          </button>
          <button
            v-if="item.status === 'pending'"
            type="button"
            class="btn-action btn-action--delete"
            title="Отозвать приглашение"
            aria-label="Отозвать приглашение"
            @click.stop="handleRevoke(item)"
          >
            <Ban :size="15" />
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
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';

.loading-container {
  min-height: 400px;
}

.invitations-summary {
  margin-top: 0;
}

.invitation-email-cell {
  min-width: 0;
}

.invitation-email-text {
  user-select: text;
  cursor: text;
  word-break: break-all;
}
</style>
