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
  Loader2,
  Users,
  CheckCircle2,
  AlertTriangle,
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
import { copyTextToClipboard } from '@/js/utils/clipboard.js'
import { useSafeModalBackdrop } from '@/js/utils/useSafeModalBackdrop.js'

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
const sendEmailsOnCreate = ref(false)
const emailsAlreadySent = ref(false)

const readyEmails = computed(() => emailPreview.value.filter((item) => item.canInvite))
const hasPreview = computed(() => emailPreview.value.length > 0)
const canCreate = computed(() => readyEmails.value.length > 0 && !createdInvitations.value.length)
const canSendEmails = computed(() =>
  createdInvitations.value.length > 0 && !isSending.value && !emailsAlreadySent.value,
)

const previewStats = computed(() => {
  const items = emailPreview.value
  return {
    total: items.length,
    ready: items.filter((item) => item.status === 'ready').length,
    invalid: items.filter((item) => item.status === 'invalid').length,
    duplicate: items.filter((item) => item.status === 'duplicate').length,
  }
})

const currentStep = computed(() => {
  if (createdInvitations.value.length) {
    return 3
  }
  if (hasPreview.value) {
    return 2
  }
  if (selectedFile.value) {
    return 1
  }
  return 0
})

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
  sendEmailsOnCreate.value = false
  emailsAlreadySent.value = false
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

const { onBackdropMouseDown, onBackdropClick } = useSafeModalBackdrop(close)

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
  emailsAlreadySent.value = false
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
    const shouldSendEmail = sendEmailsOnCreate.value
    const result = await bulkCreateInvitations({
      emails: readyEmails.value.map((item) => item.email),
      send_email: shouldSendEmail,
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
    if (shouldSendEmail) {
      emailsAlreadySent.value = true
      const warnings = result.email_warnings || []
      const sentItems = createdInvitations.value.filter((item) => !item.email_warning)
      sendResults.value = {
        sent: sentItems.map((item) => ({ id: item.id, email: item.email })),
        failed: warnings.map((item) => ({ email: item.email, error: item.warning })),
      }
      if (sentItems.length) {
        toast.success(`Отправлено писем: ${sentItems.length}`)
      }
      if (warnings.length) {
        toast.warning(`Не удалось отправить: ${warnings.length}`)
      }
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
    emailsAlreadySent.value = true
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
  const normalizedUrl = inviteUrl?.trim()
  if (!normalizedUrl) {
    toast.error('Ссылка приглашения недоступна')
    return
  }

  try {
    await copyTextToClipboard(normalizedUrl)
    toast.success('Ссылка скопирована')
  } catch {
    toast.error('Не удалось скопировать ссылку')
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
  ready: 'ibm-status--ready',
  duplicate: 'ibm-status--duplicate',
  invalid: 'ibm-status--invalid',
}
</script>

<template>
  <div
    v-if="visible"
    class="modal fade show d-block invitation-bulk-modal"
    tabindex="-1"
    @mousedown.self="onBackdropMouseDown"
    @click.self="onBackdropClick"
  >
    <div class="modal-dialog modal-lg modal-dialog-scrollable" @mousedown.stop>
      <div class="modal-content">
        <div class="modal-header">
          <div class="ibm-header">
            <div class="ibm-header__icon">
              <Users :size="22" />
            </div>
            <div>
              <h5 class="modal-title mb-1">Массовая рассылка приглашений</h5>
              <p class="ibm-header__subtitle mb-0">
                Загрузите Excel, проверьте адреса и создайте приглашения
              </p>
            </div>
          </div>
          <button
            type="button"
            class="btn-close"
            :disabled="isCreating || isSending"
            @click="close"
          />
        </div>

        <div class="modal-body">
          <div class="ibm-steps" aria-hidden="true">
            <div class="ibm-step" :class="{ 'ibm-step--active': currentStep >= 0, 'ibm-step--done': currentStep > 0 }">
              <span class="ibm-step__num">1</span>
              <span class="ibm-step__label">Файл</span>
            </div>
            <div class="ibm-step__line" :class="{ 'ibm-step__line--done': currentStep > 0 }" />
            <div class="ibm-step" :class="{ 'ibm-step--active': currentStep >= 1, 'ibm-step--done': currentStep > 1 }">
              <span class="ibm-step__num">2</span>
              <span class="ibm-step__label">Проверка</span>
            </div>
            <div class="ibm-step__line" :class="{ 'ibm-step__line--done': currentStep > 1 }" />
            <div class="ibm-step" :class="{ 'ibm-step--active': currentStep >= 2, 'ibm-step--done': currentStep > 2 }">
              <span class="ibm-step__num">3</span>
              <span class="ibm-step__label">Готово</span>
            </div>
          </div>

          <section class="ibm-section">
            <div class="ibm-section__head">
              <div>
                <h6 class="ibm-section__title">Шаблон и загрузка</h6>
                <p class="ibm-section__desc mb-0">
                  В файле один столбец — <code>Email</code>. Поддерживаются .xlsx, .xls и .csv.
                </p>
              </div>
              <button
                type="button"
                class="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2 flex-shrink-0"
                :disabled="disabled || isCreating || isSending"
                @click="handleDownloadTemplate"
              >
                <Download :size="15" />
                <span>Шаблон</span>
              </button>
            </div>

            <div
              class="ibm-upload"
              :class="{
                'ibm-upload--filled': selectedFile,
                'ibm-upload--disabled': isParsing || isCreating || isSending,
              }"
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

              <template v-if="isParsing">
                <Loader2 :size="32" class="ibm-upload__loader" />
                <p class="mb-0 fw-medium">Чтение файла...</p>
              </template>

              <template v-else-if="!selectedFile">
                <div class="ibm-upload__icon-wrap">
                  <Upload :size="28" />
                </div>
                <p class="ibm-upload__title mb-1">Перетащите файл или нажмите для выбора</p>
                <p class="ibm-upload__hint mb-0">Excel или CSV с колонкой email</p>
              </template>

              <template v-else>
                <div class="ibm-file-row">
                  <div class="ibm-file-row__icon">
                    <FileSpreadsheet :size="28" />
                  </div>
                  <div class="ibm-file-row__info">
                    <p class="ibm-file-row__name mb-0">{{ selectedFile.name }}</p>
                    <p class="ibm-file-row__meta mb-0">{{ formatFileSize(selectedFile.size) }}</p>
                  </div>
                  <button
                    type="button"
                    class="btn-action btn-action--delete"
                    aria-label="Удалить файл"
                    :disabled="isParsing || isCreating || isSending"
                    @click.stop="removeFile"
                  >
                    <XCircle :size="16" />
                  </button>
                </div>
              </template>
            </div>
          </section>

          <div v-if="parseError" class="ibm-alert ibm-alert--danger">
            <AlertCircle :size="18" class="flex-shrink-0" />
            <span>{{ parseError }}</span>
          </div>

          <section v-if="hasPreview && !isParsing" class="ibm-section">
            <div class="ibm-section__head">
              <h6 class="ibm-section__title mb-0">Адреса из файла</h6>
            </div>

            <div class="ibm-stats">
              <div class="ibm-stat">
                <span class="ibm-stat__value">{{ previewStats.total }}</span>
                <span class="ibm-stat__label">Всего</span>
              </div>
              <div class="ibm-stat ibm-stat--success">
                <span class="ibm-stat__value">{{ previewStats.ready }}</span>
                <span class="ibm-stat__label">Готово</span>
              </div>
              <div class="ibm-stat ibm-stat--warning">
                <span class="ibm-stat__value">{{ previewStats.duplicate }}</span>
                <span class="ibm-stat__label">Дубликаты</span>
              </div>
              <div class="ibm-stat ibm-stat--danger">
                <span class="ibm-stat__value">{{ previewStats.invalid }}</span>
                <span class="ibm-stat__label">Ошибки</span>
              </div>
            </div>

            <div class="ibm-table-wrap">
              <table class="table table-sm mb-0 ibm-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th class="ibm-table__status-col">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in emailPreview" :key="`${item.email}-${item.row}`">
                    <td class="ibm-table__email">{{ item.email }}</td>
                    <td>
                      <span class="ibm-status" :class="previewStatusClass[item.status] || 'ibm-status--muted'">
                        {{ item.statusLabel }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section
            v-if="hasPreview && canCreate"
            class="ibm-email-option"
            :class="{ 'ibm-email-option--active': sendEmailsOnCreate }"
          >
            <div class="form-check m-0">
              <input
                id="sendEmailsOnCreate"
                v-model="sendEmailsOnCreate"
                type="checkbox"
                class="form-check-input ibm-email-option__input"
                :disabled="disabled || isCreating || isSending || isParsing"
              />
              <label class="form-check-label ibm-email-option__label" for="sendEmailsOnCreate">
                <Mail :size="18" />
                <span>
                  <strong>Отправить письма сразу при создании</strong>
                  <small>Если выключено — письма можно отправить отдельной кнопкой ниже</small>
                </span>
              </label>
            </div>
          </section>

          <section v-if="createdInvitations.length" class="ibm-section">
            <div class="ibm-section__head">
              <h6 class="ibm-section__title mb-0 d-flex align-items-center gap-2">
                <CheckCircle2 :size="18" class="text-success" />
                Созданные приглашения
              </h6>
              <span class="ibm-badge">{{ createdInvitations.length }}</span>
            </div>

            <div class="ibm-table-wrap">
              <table class="table table-sm mb-0 ibm-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th class="ibm-table__action-col">Ссылка</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in createdInvitations" :key="item.id">
                    <td class="ibm-table__email">{{ item.email }}</td>
                    <td>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                        title="Копировать ссылку"
                        @click.stop="copyInviteLink(item.invite_url)"
                      >
                        <Copy :size="14" />
                        <span>Копировать</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <div v-if="skippedInvitations.length" class="ibm-alert ibm-alert--warning">
            <AlertTriangle :size="18" class="flex-shrink-0" />
            <div>
              <strong>Пропущено: {{ skippedInvitations.length }}</strong>
              <ul class="mb-0 mt-2 ps-3">
                <li v-for="item in skippedInvitations.slice(0, 5)" :key="`${item.email}-${item.reason}`">
                  {{ item.email }} — {{ item.reason }}
                </li>
                <li v-if="skippedInvitations.length > 5" class="text-muted">
                  и ещё {{ skippedInvitations.length - 5 }}...
                </li>
              </ul>
            </div>
          </div>

          <div v-if="sendResults" class="ibm-alert ibm-alert--success">
            <CheckCircle2 :size="18" class="flex-shrink-0" />
            <span>
              Отправлено писем: {{ sendResults.sent?.length || 0 }}.
              <template v-if="sendResults.failed?.length">
                Ошибок отправки: {{ sendResults.failed.length }}.
              </template>
            </span>
          </div>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            :disabled="isCreating || isSending"
            @click="close"
          >
            {{ createdInvitations.length ? 'Закрыть' : 'Отмена' }}
          </button>

          <div class="ibm-footer-actions">
            <button
              v-if="canCreate"
              type="button"
              class="btn btn-primary d-inline-flex align-items-center gap-2"
              :disabled="disabled || isCreating || isParsing"
              @click="createInvitations"
            >
              <Loader2 v-if="isCreating" :size="16" class="ibm-upload__loader" />
              <span>{{ isCreating ? 'Создание...' : `Создать приглашения (${readyEmails.length})` }}</span>
            </button>

            <button
              v-if="createdInvitations.length && canSendEmails"
              type="button"
              class="btn btn-primary d-inline-flex align-items-center gap-2"
              :disabled="disabled || isSending"
              @click="sendEmails"
            >
              <Loader2 v-if="isSending" :size="16" class="spinner" />
              <Mail v-else :size="16" />
              <span>{{ isSending ? 'Отправка...' : `Отправить письма (${createdInvitations.length})` }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '../admin-page.scss';

.invitation-bulk-modal {
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  border: 1px solid var(--color-border);
  background: var(--color-primary-background);
  border-radius: 12px;
  overflow: hidden;
}

.modal-header {
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-secondary-background);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-secondary-background);
}

.ibm-header {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
}

.ibm-header__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-accent) 14%, var(--color-primary-background));
  color: var(--color-accent);
  flex-shrink: 0;
}

.ibm-header__subtitle {
  font-size: 0.875rem;
  color: var(--color-secondary-text);
}

.ibm-steps {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-secondary-background);
}

.ibm-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-secondary-text);
  min-width: 0;

  &--active {
    color: var(--color-primary-text);

    .ibm-step__num {
      border-color: var(--color-accent);
      background: var(--color-accent);
      color: #fff;
    }
  }

  &--done {
    color: var(--color-primary-text);

    .ibm-step__num {
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 18%, transparent);
      color: var(--color-accent);
    }
  }
}

.ibm-step__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.ibm-step__label {
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}

.ibm-step__line {
  flex: 1;
  height: 2px;
  min-width: 1rem;
  margin: 0 0.5rem;
  background: var(--color-border);
  border-radius: 1px;

  &--done {
    background: var(--color-accent);
  }
}

.ibm-section {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.ibm-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.ibm-section__title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.ibm-section__desc {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  color: var(--color-secondary-text);

  code {
    font-size: 0.8125rem;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    background: var(--color-secondary-background);
    border: 1px solid var(--color-border);
  }
}

.ibm-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 148px;
  padding: 1.5rem;
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  background: var(--color-secondary-background);
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(.ibm-upload--disabled):not(.ibm-upload--filled) {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 6%, var(--color-secondary-background));
  }

  &--filled {
    border-style: solid;
    border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
    cursor: default;
  }

  &--disabled {
    opacity: 0.75;
    cursor: wait;
  }
}

.ibm-upload__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.25rem;
  height: 3.25rem;
  margin-bottom: 0.75rem;
  border-radius: 12px;
  background: var(--color-primary-background);
  color: var(--color-accent);
  border: 1px solid var(--color-border);
}

.ibm-upload__title {
  font-weight: 600;
  color: var(--color-primary-text);
}

.ibm-upload__hint {
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
}

.ibm-upload__loader {
  margin-bottom: 0.75rem;
  color: var(--color-accent);
  animation: ibm-spin 0.75s linear infinite;
}

.ibm-file-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  text-align: left;
}

.ibm-file-row__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-primary-background));
  color: var(--color-accent);
  flex-shrink: 0;
}

.ibm-file-row__info {
  flex: 1;
  min-width: 0;
}

.ibm-file-row__name {
  font-weight: 600;
  color: var(--color-primary-text);
  word-break: break-all;
}

.ibm-file-row__meta {
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
}

.ibm-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.625rem;
}

.ibm-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  padding: 0.625rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-secondary-background);

  &--success .ibm-stat__value { color: #198754; }
  &--warning .ibm-stat__value { color: #ca8a04; }
  &--danger .ibm-stat__value { color: #dc3545; }
}

.ibm-stat__value {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-primary-text);
}

.ibm-stat__label {
  font-size: 0.75rem;
  color: var(--color-secondary-text);
}

.ibm-table-wrap {
  max-height: 220px;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-primary-background);
}

.ibm-table {
  color: var(--color-primary-text);

  thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--color-secondary-background);

    th {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--color-secondary-text);
      border-bottom: 1px solid var(--color-border);
      padding: 0.625rem 0.875rem;
    }
  }

  tbody td {
    padding: 0.625rem 0.875rem;
    border-color: var(--color-border);
    vertical-align: middle;
  }

  tbody tr:hover {
    background: var(--color-hover-background, color-mix(in srgb, var(--color-accent) 4%, transparent));
  }
}

.ibm-table__email {
  word-break: break-all;
  user-select: text;
}

.ibm-table__status-col {
  width: 160px;
}

.ibm-table__action-col {
  width: 140px;
}

.ibm-status {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;

  &--ready {
    background: color-mix(in srgb, #198754 16%, transparent);
    color: #198754;
  }

  &--duplicate {
    background: color-mix(in srgb, #ca8a04 16%, transparent);
    color: #ca8a04;
  }

  &--invalid {
    background: color-mix(in srgb, #dc3545 16%, transparent);
    color: #dc3545;
  }

  &--muted {
    background: var(--color-secondary-background);
    color: var(--color-secondary-text);
  }
}

.ibm-email-option {
  padding: 0.875rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-secondary-background);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &--active {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 16%, transparent);
  }
}

.ibm-email-option__input {
  width: 1.25rem;
  height: 1.25rem;
  margin-top: 0.2rem;
  cursor: pointer;
  border: 2px solid var(--color-secondary-text);

  &:checked {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
  }
}

.ibm-email-option__label {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  cursor: pointer;
  color: var(--color-primary-text);

  svg {
    flex-shrink: 0;
    margin-top: 0.1rem;
    color: var(--color-accent);
  }

  span {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  small {
    font-weight: 400;
    color: var(--color-secondary-text);
  }
}

.ibm-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.875rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;

  &--danger {
    border: 1px solid color-mix(in srgb, #dc3545 35%, var(--color-border));
    background: color-mix(in srgb, #dc3545 8%, var(--color-primary-background));
    color: var(--color-primary-text);
  }

  &--warning {
    border: 1px solid color-mix(in srgb, #ca8a04 35%, var(--color-border));
    background: color-mix(in srgb, #ca8a04 8%, var(--color-primary-background));
    color: var(--color-primary-text);
  }

  &--success {
    border: 1px solid color-mix(in srgb, #198754 35%, var(--color-border));
    background: color-mix(in srgb, #198754 8%, var(--color-primary-background));
    color: var(--color-primary-text);
  }
}

.ibm-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 700;
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  color: var(--color-accent);
}

.ibm-footer-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-left: auto;
}

@keyframes ibm-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 576px) {
  .ibm-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ibm-step__label {
    display: none;
  }

  .modal-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .ibm-footer-actions {
    margin-left: 0;
    width: 100%;

    .btn {
      flex: 1;
    }
  }
}
</style>
