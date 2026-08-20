<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { ref, computed } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { tGlobal } from '@/i18n/index.js'
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
} from '@lucide/vue'
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
import { extractApiError } from '@/js/utils/apiErrorMessage.js'
import { formatFileSize } from '@/js/utils/file-helpers.js'
import { logError } from '@/js/utils/logError.js'
import ModalCenter from '@/components/ModalCenter.vue'

const { t } = useAppI18n()

defineProps({
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
    parseError.value = tGlobal('admin.invitations.fileTypeError')
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
      parseError.value = tGlobal('admin.invitations.noEmailsInFile')
    }
  } catch (error) {
    parseError.value = error.message || tGlobal('admin.invitations.readFileError')
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
    parseError.value = tGlobal('admin.invitations.templateError')
  }
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
      toast.success(tGlobal('admin.invitations.createdCount', { count: createdInvitations.value.length }))
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
        toast.success(tGlobal('admin.invitations.sentCount', { count: sentItems.length }))
      }
      if (warnings.length) {
        toast.warning(tGlobal('admin.invitations.sendFailedCount', { count: warnings.length }))
      }
    }
  } catch (apiError) {
    logError('Ошибка массового создания приглашений', apiError)
    parseError.value = extractApiError(apiError, tGlobal('admin.invitations.createBulkFailed'))
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
      toast.success(tGlobal('admin.invitations.sentCount', { count: sentCount }))
    }
    if (result.failed?.length) {
      toast.warning(tGlobal('admin.invitations.sendFailedCount', { count: result.failed.length }))
    }
  } catch (apiError) {
    logError('Ошибка отправки приглашений', apiError)
    parseError.value = extractApiError(apiError, tGlobal('admin.invitations.sendMailFailed'))
  } finally {
    isSending.value = false
  }
}

const copyInviteLink = async (inviteUrl) => {
  const normalizedUrl = inviteUrl?.trim()
  if (!normalizedUrl) {
    toast.error(tGlobal('admin.invitations.linkUnavailable'))
    return
  }

  try {
    await copyTextToClipboard(normalizedUrl)
    toast.success(tGlobal('admin.invitations.linkCopied'))
  } catch {
    toast.error(tGlobal('admin.invitations.linkCopyFailed'))
  }
}

const previewStatusClass = {
  ready: 'ibm-status--ready',
  duplicate: 'ibm-status--duplicate',
  invalid: 'ibm-status--invalid',
}
</script>

<template>
  <ModalCenter
    standalone
    modal-id="invitationBulkModal"
    size="lg"
    :visible="visible"
    :close-on-esc="false"
    custom-class="invitation-bulk-modal"
    @close="close"
  >
    <template #title>
      <span class="ibm-header">
        <span class="ibm-header__icon">
          <Users :size="22" />
        </span>
        <span>
          <span class="ibm-header__title">{{ t('admin.invitations.bulkTitle') }}</span>
          <span class="ibm-header__subtitle">
            {{ t('admin.invitations.bulkSubtitle') }}
          </span>
        </span>
      </span>
    </template>

    <div class="ibm-body">
      <div class="ibm-steps" aria-hidden="true">
            <div class="ibm-step" :class="{ 'ibm-step--active': currentStep >= 0, 'ibm-step--done': currentStep > 0 }">
              <span class="ibm-step__num">1</span>
              <span class="ibm-step__label">{{ t('admin.invitations.bulkStepFile') }}</span>
            </div>
            <div class="ibm-step__line" :class="{ 'ibm-step__line--done': currentStep > 0 }" />
            <div class="ibm-step" :class="{ 'ibm-step--active': currentStep >= 1, 'ibm-step--done': currentStep > 1 }">
              <span class="ibm-step__num">2</span>
              <span class="ibm-step__label">{{ t('admin.invitations.bulkStepCheck') }}</span>
            </div>
            <div class="ibm-step__line" :class="{ 'ibm-step__line--done': currentStep > 1 }" />
            <div class="ibm-step" :class="{ 'ibm-step--active': currentStep >= 2, 'ibm-step--done': currentStep > 2 }">
              <span class="ibm-step__num">3</span>
              <span class="ibm-step__label">{{ t('admin.invitations.bulkStepReady') }}</span>
            </div>
          </div>

          <section class="ibm-section">
            <div class="ibm-section__head">
              <div>
                <h6 class="ibm-section__title">{{ t('admin.invitations.bulkTemplateTitle') }}</h6>
                <p class="ibm-section__desc mb-0">
                  <span v-html="t('admin.invitations.bulkTemplateHintAlt')"></span>
                </p>
              </div>
              <button
                type="button"
                class="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2 flex-shrink-0"
                :disabled="disabled || isCreating || isSending"
                @click="handleDownloadTemplate"
              >
                <Download :size="15" />
                <span>{{ t('admin.invitations.bulkDownloadTemplate') }}</span>
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
                <p class="mb-0 fw-medium">{{ t('admin.invitations.bulkReading') }}</p>
              </template>

              <template v-else-if="!selectedFile">
                <div class="ibm-upload__icon-wrap">
                  <Upload :size="28" />
                </div>
                <p class="ibm-upload__title mb-1">{{ t('admin.invitations.bulkDropTitle') }}</p>
                <p class="ibm-upload__hint mb-0">{{ t('admin.invitations.bulkDropHint') }}</p>
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
                    :aria-label="t('admin.invitations.bulkRemoveFile')"
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
              <h6 class="ibm-section__title mb-0">{{ t('admin.invitations.bulkParsedTitleAlt') }}</h6>
            </div>

            <div class="ibm-stats">
              <div class="ibm-stat">
                <span class="ibm-stat__value">{{ previewStats.total }}</span>
                <span class="ibm-stat__label">{{ t('admin.invitations.bulkStatTotal') }}</span>
              </div>
              <div class="ibm-stat ibm-stat--success">
                <span class="ibm-stat__value">{{ previewStats.ready }}</span>
                <span class="ibm-stat__label">{{ t('admin.invitations.bulkStatReady') }}</span>
              </div>
              <div class="ibm-stat ibm-stat--warning">
                <span class="ibm-stat__value">{{ previewStats.duplicate }}</span>
                <span class="ibm-stat__label">{{ t('admin.invitations.bulkStatDup') }}</span>
              </div>
              <div class="ibm-stat ibm-stat--danger">
                <span class="ibm-stat__value">{{ previewStats.invalid }}</span>
                <span class="ibm-stat__label">{{ t('admin.invitations.bulkStatErr') }}</span>
              </div>
            </div>

            <div class="ibm-table-wrap">
              <table class="table table-sm mb-0 ibm-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th class="ibm-table__status-col">{{ t('admin.invitations.bulkColStatus') }}</th>
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
                  <strong>{{ t('admin.invitations.bulkSendReadyTitle') }}</strong>
                  <small>{{ t('admin.invitations.bulkSendReadyHintAlt') }}</small>
                </span>
              </label>
            </div>
          </section>

          <section v-if="createdInvitations.length" class="ibm-section">
            <div class="ibm-section__head">
              <h6 class="ibm-section__title mb-0 d-flex align-items-center gap-2">
                <CheckCircle2 :size="18" class="text-success" />
                {{ t('admin.invitations.bulkCreateInvites') }}
              </h6>
              <span class="ibm-badge">{{ createdInvitations.length }}</span>
            </div>

            <div class="ibm-table-wrap">
              <table class="table table-sm mb-0 ibm-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th class="ibm-table__action-col">{{ t('admin.invitations.copyLink') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in createdInvitations" :key="item.id">
                    <td class="ibm-table__email">{{ item.email }}</td>
                    <td>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                        :title="t('admin.invitations.copyLink')"
                        @click.stop="copyInviteLink(item.invite_url)"
                      >
                        <Copy :size="14" />
                        <span>{{ t('admin.invitations.bulkCopy') }}</span>
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
              <strong>{{ t('admin.invitations.bulkSkipped') }} {{ skippedInvitations.length }}</strong>
              <ul class="mb-0 mt-2 ps-3">
                <li v-for="item in skippedInvitations.slice(0, 5)" :key="`${item.email}-${item.reason}`">
                  {{ item.email }} — {{ item.reason }}
                </li>
                <li v-if="skippedInvitations.length > 5" class="text-muted">
                  {{ t('admin.invitations.bulkAndMore', { count: skippedInvitations.length - 5 }) }}..
                </li>
              </ul>
            </div>
          </div>

          <div v-if="sendResults" class="ibm-alert ibm-alert--success">
            <CheckCircle2 :size="18" class="flex-shrink-0" />
            <span>
              {{ t('admin.invitations.bulkResultSent').split(':')[0] }}: {{ sendResults.sent?.length || 0 }}.
              <template v-if="sendResults.failed?.length">
                {{ t('admin.invitations.bulkResultFailed', { count: sendResults.failed.length }) }}.
              </template>
            </span>
      </div>
    </div>

    <template #footer>
      <div class="ibm-footer">
        <button
          type="button"
          class="ui-btn ui-btn--secondary"
          :disabled="isCreating || isSending"
          @click="close"
        >
          {{ createdInvitations.length ? t('admin.invitations.bulkDone') : t('admin.invitations.bulkCancel') }}
        </button>

        <div class="ibm-footer-actions">
          <button
            v-if="canCreate"
            type="button"
            class="ui-btn ui-btn--primary d-inline-flex align-items-center gap-2"
            :disabled="disabled || isCreating || isParsing"
            @click="createInvitations"
          >
            <Loader2 v-if="isCreating" :size="16" class="ibm-upload__loader" />
            <span>{{ isCreating ? t('admin.invitations.bulkCreating') : t('admin.invitations.bulkCreateReady', { count: readyEmails.length }) }}</span>
          </button>

          <button
            v-if="createdInvitations.length && canSendEmails"
            type="button"
            class="ui-btn ui-btn--primary d-inline-flex align-items-center gap-2"
            :disabled="disabled || isSending"
            @click="sendEmails"
          >
            <Loader2 v-if="isSending" :size="16" class="spinner" />
            <Mail v-else :size="16" />
            <span>{{ isSending ? t('admin.invitations.bulkSending') : t('admin.invitations.bulkSendEmails', { count: createdInvitations.length }) }}</span>
          </button>
        </div>
      </div>
    </template>
  </ModalCenter>
</template>

<style scoped lang="scss">
@import "./InvitationBulkModal.scoped.scss";
</style>
