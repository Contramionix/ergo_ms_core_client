<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  ArrowLeft,
  MailPlus,
  Copy,
  RotateCcw,
  Ban,
  AlertCircle,
} from 'lucide-vue-next'
import DataTable from '@/components/DataTable.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import { CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'
import {
  fetchInvitations,
  createInvitation,
  revokeInvitation,
  resendInvitation,
} from '@/core/cms/adp/admin/js/invitationService'

const router = useRouter()
const toast = useToast()

const hasAdminAccess = ref(false)
const isCheckingAccess = ref(true)
const isLoading = ref(false)
const rows = ref([])
const totalItems = ref(0)
const registrationMode = ref('open')
const currentPage = ref(1)
const rowsPerPage = ref(12)
const searchQuery = ref('')

const showCreateModal = ref(false)
const isCreating = ref(false)
const createForm = ref({
  email: '',
  note: '',
  send_email: true,
})
const createError = ref('')

const invitationModeEnabled = computed(() => registrationMode.value === 'invitation')

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
  { key: 'actions', label: '', headerStyle: { textAlign: 'right' }, cellStyle: { textAlign: 'right' } },
]

const getItemKey = (item) => item.id

const formatDateTime = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('ru-RU')
}

const extractApiError = (error, fallback = 'Не удалось выполнить операцию') => {
  const data = error?.response?.data
  if (!data) {
    return fallback
  }
  if (typeof data.error === 'string') {
    return data.error
  }
  if (typeof data.detail === 'string') {
    return data.detail
  }
  const firstFieldError = Object.values(data).find((value) => Array.isArray(value) && value.length)
  if (firstFieldError) {
    return String(firstFieldError[0])
  }
  return fallback
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
    registrationMode.value = data.registration_mode || 'open'
    if (data.page) {
      currentPage.value = data.page
    }
  } catch (error) {
    console.error('Ошибка загрузки приглашений:', error)
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
    console.error('Ошибка проверки прав доступа:', error)
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
  createForm.value = { email: '', note: '', send_email: true }
  createError.value = ''
  showCreateModal.value = true
}

const closeCreateModal = () => {
  showCreateModal.value = false
}

const submitCreate = async () => {
  createError.value = ''
  if (!createForm.value.email.trim()) {
    createError.value = 'Укажите email'
    return
  }

  isCreating.value = true
  try {
    const result = await createInvitation({
      email: createForm.value.email.trim(),
      note: createForm.value.note.trim(),
      send_email: createForm.value.send_email,
    })
    if (result.email_warning) {
      toast.warning(`Приглашение создано, но письмо не отправлено: ${result.email_warning}`)
    } else if (createForm.value.send_email) {
      toast.success('Приглашение создано и отправлено на email')
    } else {
      toast.success('Приглашение создано')
    }
    closeCreateModal()
    await loadInvitations()
  } catch (error) {
    createError.value = extractApiError(error, 'Не удалось создать приглашение')
  } finally {
    isCreating.value = false
  }
}

const copyInviteLink = async (item) => {
  try {
    await navigator.clipboard.writeText(item.invite_url)
    toast.success('Ссылка скопирована')
  } catch {
    toast.error('Не удалось скопировать ссылку')
  }
}

const handleResend = async (item) => {
  try {
    await resendInvitation(item.id)
    toast.success('Приглашение отправлено повторно')
  } catch (error) {
    toast.error(error.response?.data?.error || 'Не удалось отправить приглашение')
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
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
    <SpinnerLoading color="primary" />
  </div>

  <div v-else-if="hasAdminAccess" class="card">
    <div class="mb-3">
      <button type="button" class="btn btn-link px-0 text-decoration-none" @click="goBack">
        <ArrowLeft :size="16" class="me-1" style="vertical-align: -2px;" />
        К списку пользователей
      </button>
    </div>

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
        <p class="text-muted mb-0 small">Отправляйте ссылки новым пользователям для регистрации в системе.</p>
      </div>
      <div class="col-12 col-sm d-flex flex-wrap align-items-center justify-content-center justify-content-sm-end gap-3">
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
          class="btn btn-primary d-inline-flex align-items-center gap-2"
          :disabled="!invitationModeEnabled"
          @click="openCreateModal"
        >
          <MailPlus :size="18" />
          <span>Создать приглашение</span>
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
      <template #cell-status="{ item }">
        <span class="badge" :class="statusClass[item.status] || 'text-bg-secondary'">
          {{ statusLabels[item.status] || item.status }}
        </span>
      </template>

      <template #cell-expires_at="{ item }">
        {{ formatDateTime(item.expires_at) }}
      </template>

      <template #cell-actions="{ item }">
        <div class="d-inline-flex gap-2">
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            title="Копировать ссылку"
            @click="copyInviteLink(item)"
          >
            <Copy :size="16" />
          </button>
          <button
            v-if="item.status === 'pending'"
            type="button"
            class="btn btn-sm btn-outline-primary"
            title="Отправить повторно"
            @click="handleResend(item)"
          >
            <RotateCcw :size="16" />
          </button>
          <button
            v-if="item.status === 'pending'"
            type="button"
            class="btn btn-sm btn-outline-danger"
            title="Отозвать"
            @click="handleRevoke(item)"
          >
            <Ban :size="16" />
          </button>
        </div>
      </template>
    </DataTable>

    <div
      v-if="showCreateModal"
      class="modal fade show d-block"
      tabindex="-1"
      style="background: rgba(0,0,0,0.5);"
      @click.self="closeCreateModal"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Новое приглашение</h5>
            <button type="button" class="btn-close" @click="closeCreateModal" />
          </div>
          <div class="modal-body">
            <div v-if="createError" class="alert alert-danger">{{ createError }}</div>

            <div class="mb-3">
              <label class="form-label" for="invite-email">Email</label>
              <input
                id="invite-email"
                v-model="createForm.email"
                type="email"
                class="form-control"
                placeholder="user@example.com"
                :disabled="isCreating"
              />
            </div>

            <div class="mb-3">
              <label class="form-label" for="invite-note">Примечание (необязательно)</label>
              <input
                id="invite-note"
                v-model="createForm.note"
                type="text"
                class="form-control"
                placeholder="Например: отдел аналитики"
                :disabled="isCreating"
              />
            </div>

            <div class="form-check">
              <input
                id="invite-send-email"
                v-model="createForm.send_email"
                class="form-check-input"
                type="checkbox"
                :disabled="isCreating"
              />
              <label class="form-check-label" for="invite-send-email">
                Отправить ссылку на email
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" :disabled="isCreating" @click="closeCreateModal">
              Отмена
            </button>
            <button type="button" class="btn btn-primary" :disabled="isCreating" @click="submitCreate">
              {{ isCreating ? 'Создание...' : 'Создать' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
