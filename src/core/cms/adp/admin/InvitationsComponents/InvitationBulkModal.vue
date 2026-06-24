<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import {
  Download,
  Upload,
  FileSpreadsheet,
  XCircle,
  Copy,
  Mail,
  AlertCircle,
} from 'lucide-vue-next'
import {
  downloadInvitationTemplate,
  parseInvitationEmailsFromFile,
  buildEmailPreviewList,
} from '@/core/cms/adp/admin/js/invitationExcel'
import {
  bulkCreateInvitations,
  bulkSendInvitations,
} from '@/core/cms/adp/admin/js/invitationService'

const props = defineProps({
  visible: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'completed'])

const toast = useToast()
const fileInput = ref(null)
const selectedFile = ref(null)
const isParsing = ref(false)
const isCreating = ref(false)
const isSending = ref(false)
const parseError = ref('')
const emailPreview = ref([])
const createdInvitations = ref([])
const skippedInvitations = ref([])
const sendResults = ref(null)

const readyEmails = computed(() => emailPreview.value.filter((item) => item.canInvite))
const hasPreview = computed(() => emailPreview.value.length > 0)
const canCreate = computed(() => readyEmails.value.length > 0 && !createdInvitations.value.length)
const canSendEmails = computed(() => createdInvitations.value.length > 0 && !isSending.value)

const resetState = () => {
  selectedFile.value = null
  isParsing.value = false
  isCreating.value = false
  isSending.value = false
  parseError.value = ''
  emailPreview.value = []
  createdInvitations.value = []
  skippedInvitations.value = []
  sendResults.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const close = () => {
  const hadChanges = createdInvitations.value.length > 0
  resetState()
  emit('close')
  if (hadChanges) {
    emit('completed')
  }
}

const triggerFileInput = () => {
  if (!isParsing.value && !isCreating.value && !isSending.value) {
    fileInput.value?.click()
  }
}

const processFile = async (file) => {
  if (!file) {
    return
  }

  const fileName = file.name.toLowerCase()
  if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
    parseError.value = 'Поддерживаются только файлы Excel (.xlsx, .xls) и CSV (.csv)'
    return
  }

  selectedFile.value = file
  parseError.value = ''
  emailPreview.value = []
  createdInvitations.value = []
  skippedInvitations.value = []
  sendResults.value = null
  isParsing.value = true

  try {
    const rawEmails = await parseInvitationEmailsFromFile(file)
    emailPreview.value = buildEmailPreviewList(rawEmails)
    if (!emailPreview.value.length) {
      parseError.value = 'В файле не найдено email-адресов'
    }
  } catch (error) {
    parseError.value = error.message || 'Не удалось прочитать файл'
    emailPreview.value = []
  } finally {
    isParsing.value = false
  }
}

const handleFileSelect = (event) => {
  processFile(event.target.files[0])
}

const handleDragOver = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

const handleDrop = (event) => {
  event.preventDefault()
  processFile(event.dataTransfer.files[0])
}

const removeFile = () => {
  resetState()
}

const handleDownloadTemplate = async () => {
  try {
    await downloadInvitationTemplate()
  } catch {
    parseError.value = 'Не удалось сформировать шаблон'
  }
}

const extractApiError = (apiError, fallback = 'Не удалось выполнить операцию') => {
  const data = apiError?.response?.data
  if (!data) {
    return fallback
  }
  if (typeof data.error === 'string') {
    return data.error
  }
  return fallback
}

const createInvitations = async () => {
  if (!canCreate.value) {
    return
  }

  isCreating.value = true
  parseError.value = ''

  try {
    const result = await bulkCreateInvitations({
      emails: readyEmails.value.map((item) => item.email),
      send_email: false,
    })
    createdInvitations.value = result.created || []
    skippedInvitations.value = [
      ...emailPreview.value
        .filter((item) => !item.canInvite)
        .map((item) => ({ email: item.email, reason: item.statusLabel })),
      ...(result.skipped || []),
    ]
    if (createdInvitations.value.length) {
      toast.success(`Создано приглашений: ${createdInvitations.value.length}`)
    }
  } catch (apiError) {
    parseError.value = extractApiError(apiError, 'Не удалось создать приглашения')
  } finally {
    isCreating.value = false
  }
}

const sendEmails = async () => {
  if (!canSendEmails.value) {
    return
  }

  isSending.value = true
  parseError.value = ''

  try {
    const result = await bulkSendInvitations({
      invitation_ids: createdInvitations.value.map((item) => item.id),
    })
    sendResults.value = result
    const sentCount = result.sent?.length || 0
    if (sentCount) {
      toast.success(`Отправлено писем: ${sentCount}`)
    }
    if (result.failed?.length) {
      toast.warning(`Не удалось отправить: ${result.failed.length}`)
    }
  } catch (apiError) {
    parseError.value = extractApiError(apiError, 'Не удалось отправить письма')
  } finally {
    isSending.value = false
  }
}

const copyInviteLink = async (inviteUrl) => {
  try {
    await navigator.clipboard.writeText(inviteUrl)
    toast.success('Ссылка скопирована')
  } catch {
    parseError.value = 'Не удалось скопировать ссылку'
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) {
    return '0 Б'
  }
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

const previewStatusClass = {
  ready: 'text-bg-success',
  duplicate: 'text-bg-warning',
  invalid: 'text-bg-danger',
}
</script>

<template>
  <div
    v-if="visible"
    class="modal fade show d-block"
    tabindex="-1"
    style="background: rgba(0,0,0,0.5);"
    @click.self="close"
  >
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Массовая рассылка приглашений</h5>
          <button type="button" class="btn-close" :disabled="isCreating || isSending" @click="close" />
        </div>

        <div class="modal-body">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <p class="text-muted small mb-0">
              Загрузите Excel-файл с email-адресами. Сначала проверьте список, создайте приглашения, затем отправьте письма.
            </p>
            <button
              type="button"
              class="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-2"
              :disabled="disabled || isCreating || isSending"
              @click="handleDownloadTemplate"
            >
              <Download :size="16" />
              <span>Скачать шаблон</span>
            </button>
          </div>

          <div
            class="upload-zone mb-3"
            :class="{ 'has-file': selectedFile, 'is-disabled': isParsing || isCreating || isSending }"
            @click="triggerFileInput"
            @dragover="handleDragOver"
            @drop="handleDrop"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".xlsx,.xls,.csv"
              class="d-none"
              @change="handleFileSelect"
            />
            <template v-if="!selectedFile">
              <Upload :size="40" class="text-muted mb-2" />
              <p class="mb-1">Перетащите файл сюда или нажмите для выбора</p>
              <p class="text-muted small mb-0">В шаблоне один столбец — Email</p>
            </template>
            <template v-else>
              <div class="d-flex align-items-center gap-3">
                <FileSpreadsheet :size="36" class="text-success flex-shrink-0" />
                <div class="flex-grow-1 text-start">
                  <p class="mb-0 fw-medium">{{ selectedFile.name }}</p>
                  <p class="mb-0 text-muted small">{{ formatFileSize(selectedFile.size) }}</p>
                </div>
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm"
                  :disabled="isParsing || isCreating || isSending"
                  @click.stop="removeFile"
                >
                  <XCircle :size="16" />
                </button>
              </div>
            </template>
          </div>

          <div v-if="isParsing" class="text-center text-muted py-3">Чтение файла...</div>

          <div v-if="parseError" class="alert alert-danger d-flex align-items-start gap-2">
            <AlertCircle :size="18" class="flex-shrink-0 mt-1" />
            <span>{{ parseError }}</span>
          </div>

          <div v-if="hasPreview && !isParsing" class="mb-3">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
              <h6 class="mb-0">Адреса из файла</h6>
              <span class="text-muted small">
                Готово: {{ readyEmails.length }} из {{ emailPreview.length }}
              </span>
            </div>
            <div class="table-responsive preview-table">
              <table class="table table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th style="width: 180px;">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in emailPreview" :key="`${item.email}-${item.row}`">
                    <td>{{ item.email }}</td>
                    <td>
                      <span class="badge" :class="previewStatusClass[item.status] || 'text-bg-secondary'">
                        {{ item.statusLabel }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="createdInvitations.length" class="mb-3">
            <h6 class="mb-2">Созданные приглашения</h6>
            <div class="table-responsive preview-table">
              <table class="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th style="width: 200px;">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in createdInvitations" :key="item.id">
                    <td>{{ item.email }}</td>
                    <td>
                      <button
                        type="button"
                        class="btn btn-sm invitation-btn invitation-btn--copy d-inline-flex align-items-center gap-1"
                        @click="copyInviteLink(item.invite_url)"
                      >
                        <Copy :size="14" />
                        <span>Копировать ссылку</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="skippedInvitations.length" class="alert alert-warning py-2 mb-0">
            <strong>Пропущено: {{ skippedInvitations.length }}</strong>
            <ul class="mb-0 mt-2 small">
              <li v-for="item in skippedInvitations.slice(0, 5)" :key="`${item.email}-${item.reason}`">
                {{ item.email }} — {{ item.reason }}
              </li>
              <li v-if="skippedInvitations.length > 5" class="text-muted">
                и ещё {{ skippedInvitations.length - 5 }}...
              </li>
            </ul>
          </div>

          <div v-if="sendResults" class="alert alert-success mt-3 mb-0">
            Отправлено писем: {{ sendResults.sent?.length || 0 }}.
            <span v-if="sendResults.failed?.length">
              Ошибок: {{ sendResults.failed.length }}.
            </span>
          </div>
        </div>

        <div class="modal-footer flex-wrap gap-2">
          <button
            type="button"
            class="btn invitation-modal-btn invitation-modal-btn--cancel"
            :disabled="isCreating || isSending"
            @click="close"
          >
            {{ createdInvitations.length ? 'Закрыть' : 'Отмена' }}
          </button>

          <button
            v-if="canCreate"
            type="button"
            class="btn invitation-modal-btn invitation-modal-btn--copy"
            :disabled="disabled || isCreating || isParsing"
            @click="createInvitations"
          >
            {{ isCreating ? 'Создание...' : `Создать приглашения (${readyEmails.length})` }}
          </button>

          <button
            v-if="createdInvitations.length"
            type="button"
            class="btn btn-primary d-inline-flex align-items-center gap-2"
            :disabled="!canSendEmails || disabled"
            @click="sendEmails"
          >
            <Mail :size="16" />
            <span>{{ isSending ? 'Отправка...' : `Отправить письма (${createdInvitations.length})` }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.upload-zone {
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(.is-disabled) {
    border-color: #0d6efd;
    background-color: rgba(13, 110, 253, 0.05);
  }

  &.has-file {
    border-style: solid;
    border-color: #198754;
    background-color: rgba(25, 135, 84, 0.05);
    cursor: default;
  }

  &.is-disabled {
    opacity: 0.7;
    cursor: wait;
  }
}

.preview-table {
  max-height: 240px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
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
  }
}

.invitation-modal-btn {
  font-weight: 500;
  border-width: 1px;
  border-style: solid;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  &--cancel {
    color: var(--color-primary-text);
    border-color: var(--color-border);
    background-color: var(--color-secondary-background);

    &:hover:not(:disabled) {
      background-color: var(--color-hover-background);
      border-color: var(--color-primary-text);
      color: var(--color-primary-text);
    }
  }

  &--copy {
    color: var(--color-accent);
    border-color: var(--color-accent);
    background-color: color-mix(in srgb, var(--color-accent) 12%, transparent);

    &:hover:not(:disabled) {
      color: #fff;
      background-color: var(--color-accent);
      border-color: var(--color-accent);
    }
  }
}
</style>
