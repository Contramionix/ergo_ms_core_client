<script setup>
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Info,
  Users,
  AlertCircle,
} from 'lucide-vue-next'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import { formatFileSize } from '@/js/utils/file-helpers.js'
import { useImportUsers } from './js/useImportUsers.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const {
  breadcrumbItems,
  canDownloadPasswords,
  currentStats,
  currentStep,
  downloadPasswords,
  downloadingPasswords,
  downloadingTemplate,
  fileInput,
  getLogClass,
  getLogIcon,
  handleDownloadTemplate,
  handleDragOver,
  handleDrop,
  handleFileSelect,
  hasAdminAccess,
  importLogs,
  importResults,
  importStatus,
  isCheckingAccess,
  isImporting,
  logsContainer,
  passwordsDownloaded,
  persistWelcomeEmailSettings,
  progressBarClass,
  progressPercent,
  removeFile,
  resetWelcomeEmailTemplate,
  resumeImport,
  savedTaskId,
  selectedFile,
  sendWelcomeEmails,
  startImport,
  triggerFileInput,
  welcomeEmailBody,
  welcomeEmailSubject,
  welcomePlaceholders,
} = useImportUsers()
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
    <SpinnerLoading color="primary" />
  </div>

  <div v-else-if="hasAdminAccess" class="admin-page">
    <div class="page-header">
      <h1 class="page-title">{{ t('admin.importUsers.title') }}</h1>
      <p class="page-subtitle">{{ t('admin.importUsers.subtitle') }}</p>
    </div>

    <div class="import-users-shell">
      <Breadcrumbs :items="breadcrumbItems" class="import-users-breadcrumbs" />

      <div class="content-card">
      <div class="iu-body">
        <div
          v-if="savedTaskId && !isImporting && !importResults"
          class="iu-alert iu-alert--warning d-flex align-items-center justify-content-between flex-wrap gap-3"
        >
          <div class="iu-alert__content d-flex align-items-start gap-2">
            <AlertCircle :size="18" class="flex-shrink-0 mt-1" />
            <span>{{ t('admin.importUsers.draftNotice') }}</span>
          </div>
          <button
            type="button"
            class="btn btn-primary d-inline-flex align-items-center gap-2 flex-shrink-0"
            @click="resumeImport"
          >
            {{ t('admin.importUsers.resumeTracking') }}
          </button>
        </div>

        <div class="iu-steps" aria-hidden="true">
          <div
            class="iu-step"
            :class="{ 'iu-step--active': currentStep >= 0, 'iu-step--done': currentStep > 0 }"
          >
            <span class="iu-step__num">1</span>
            <span class="iu-step__label">{{ t('admin.importUsers.stepFile') }}</span>
          </div>
          <div class="iu-step__line" :class="{ 'iu-step__line--done': currentStep > 0 }" />
          <div
            class="iu-step"
            :class="{ 'iu-step--active': currentStep >= 1, 'iu-step--done': currentStep > 1 }"
          >
            <span class="iu-step__num">2</span>
            <span class="iu-step__label">{{ t('admin.importUsers.stepSettings') }}</span>
          </div>
          <div class="iu-step__line" :class="{ 'iu-step__line--done': currentStep > 1 }" />
          <div
            class="iu-step"
            :class="{ 'iu-step--active': currentStep >= 2, 'iu-step--done': currentStep > 2 }"
          >
            <span class="iu-step__num">3</span>
            <span class="iu-step__label">{{ t('admin.importUsers.stepUpload') }}</span>
          </div>
          <div class="iu-step__line" :class="{ 'iu-step__line--done': currentStep > 2 }" />
          <div class="iu-step" :class="{ 'iu-step--active': currentStep >= 3 }">
            <span class="iu-step__num">4</span>
            <span class="iu-step__label">{{ t('admin.importUsers.stepResult') }}</span>
          </div>
        </div>

        <section class="iu-section">
          <div class="iu-section__head">
            <div>
              <h2 class="iu-section__title">{{ t('admin.importUsers.prepareTitle') }}</h2>
              <p class="iu-section__desc">
                {{ t('admin.importUsers.prepareHint') }}
              </p>
            </div>
            <button
              type="button"
              class="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-2 flex-shrink-0"
              :disabled="isImporting || downloadingTemplate"
              @click="handleDownloadTemplate"
            >
              <Loader2 v-if="downloadingTemplate" :size="15" class="iu-spinner" />
              <Download v-else :size="15" />
              <span>{{ downloadingTemplate ? t('admin.importUsers.downloadingTemplate') : t('admin.importUsers.downloadTemplate') }}</span>
            </button>
          </div>

          <div class="iu-alert iu-alert--info">
            <Info :size="18" class="flex-shrink-0 mt-1" />
            <div class="iu-alert__content">
              <span class="iu-alert__title">{{ t('admin.importUsers.requirementsTitle') }}</span>
              <ul class="iu-requirements-list mb-0">
                <li>{{ t('admin.importUsers.reqFormat') }}</li>
                <li v-html="t('admin.importUsers.reqColumnsHtml')"></li>
                <li v-html="t('admin.importUsers.reqOptionalHtml')"></li>
                <li>{{ t('admin.importUsers.reqPasswords') }}</li>
                <li>{{ t('admin.importUsers.reqDuplicates') }}</li>
                <li>{{ t('admin.importUsers.reqRemoveSample') }}</li>
              </ul>
            </div>
          </div>

          <div
            class="iu-upload"
            :class="{
              'iu-upload--filled': selectedFile,
              'iu-upload--disabled': isImporting,
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

            <template v-if="!selectedFile">
              <div class="iu-upload__icon-wrap">
                <Upload :size="28" />
              </div>
              <p class="iu-upload__title">{{ t('admin.importUsers.dropTitle') }}</p>
              <p class="iu-upload__hint">{{ t('admin.importUsers.dropHint') }}</p>
            </template>

            <template v-else>
              <div class="iu-file-row">
                <div class="iu-file-row__icon">
                  <FileSpreadsheet :size="28" />
                </div>
                <div class="iu-file-row__info">
                  <p class="iu-file-row__name">{{ selectedFile.name }}</p>
                  <p class="iu-file-row__meta">{{ formatFileSize(selectedFile.size) }}</p>
                </div>
                <button
                  type="button"
                  class="btn-action btn-action--delete"
                  :aria-label="t('admin.importUsers.removeFile')"
                  :disabled="isImporting"
                  @click.stop="removeFile"
                >
                  <XCircle :size="16" />
                </button>
              </div>
            </template>
          </div>
        </section>

        <section class="iu-section">
          <div class="iu-section__head">
            <div>
              <h2 class="iu-section__title">{{ t('admin.importUsers.welcomeTitle') }}</h2>
              <p class="iu-section__desc mb-0">
                {{ t('admin.importUsers.welcomeDefaultHint') }}
              </p>
            </div>
          </div>

          <div
            class="iu-email-option"
            :class="{ 'iu-email-option--active': sendWelcomeEmails }"
          >
            <div class="iu-email-option__row">
              <input
                id="sendWelcomeEmails"
                v-model="sendWelcomeEmails"
                type="checkbox"
                class="iu-email-option__input"
                :disabled="isImporting"
                @change="persistWelcomeEmailSettings"
              />
              <label class="iu-email-option__label" for="sendWelcomeEmails">
                <span class="iu-email-option__text">
                  <strong>{{ t('admin.importUsers.welcomeToggle') }}</strong>
                  <small>{{ t('admin.importUsers.welcomeToggleHint') }}</small>
                </span>
              </label>
            </div>
          </div>

          <div v-if="sendWelcomeEmails" class="iu-email-settings">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <h3 class="iu-section__title mb-0">{{ t('admin.importUsers.welcomeTextTitle') }}</h3>
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                :disabled="isImporting"
                @click="resetWelcomeEmailTemplate"
              >
                {{ t('admin.importUsers.resetTemplate') }}
              </button>
            </div>

            <div>
              <label class="form-label" for="welcomeEmailSubject">{{ t('admin.importUsers.emailSubject') }}</label>
              <input
                id="welcomeEmailSubject"
                v-model="welcomeEmailSubject"
                type="text"
                class="form-control"
                maxlength="200"
                :disabled="isImporting"
                @input="persistWelcomeEmailSettings"
              />
            </div>

            <div>
              <label class="form-label" for="welcomeEmailBody">{{ t('admin.importUsers.emailBody') }}</label>
              <textarea
                id="welcomeEmailBody"
                v-model="welcomeEmailBody"
                class="form-control iu-email-settings__textarea"
                rows="8"
                maxlength="5000"
                :disabled="isImporting"
                @input="persistWelcomeEmailSettings"
              />
            </div>

            <p v-if="welcomePlaceholders.length" class="form-text text-muted mb-0">
              {{ t('admin.importUsers.placeholders') }}
              <code
                v-for="placeholder in welcomePlaceholders"
                :key="placeholder.key"
                class="me-2"
              >{{ '{' + placeholder.key + '}' }}</code>
            </p>
          </div>
        </section>

        <div class="iu-actions">
          <button
            type="button"
            class="btn btn-primary d-inline-flex align-items-center gap-2"
            :disabled="!selectedFile || isImporting"
            @click="startImport"
          >
            <Loader2 v-if="isImporting" :size="16" class="iu-spinner" />
            <Users v-else :size="16" />
            <span>{{ isImporting ? t('admin.importUsers.importing') : t('admin.importUsers.startImport') }}</span>
          </button>
        </div>

        <section v-if="isImporting || importResults" class="iu-section">
          <div class="iu-section__head">
            <div>
              <h2 class="iu-section__title">{{ t('admin.importUsers.progressTitle') }}</h2>
              <p class="iu-section__desc mb-0">{{ importStatus || t('admin.importUsers.waitingStart') }}</p>
            </div>
            <p class="iu-progress-percent mb-0">{{ Math.round(progressPercent) }}%</p>
          </div>

          <div class="iu-progress-bar" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
            <div
              class="iu-progress-bar__fill"
              :class="progressBarClass"
              :style="{ width: progressPercent + '%' }"
            />
          </div>

          <div class="iu-stats">
            <div class="iu-stat">
              <span class="iu-stat__value">{{ currentStats.total || importResults?.total || 0 }}</span>
              <span class="iu-stat__label">{{ t('admin.importUsers.statTotal') }}</span>
            </div>
            <div class="iu-stat iu-stat--info">
              <span class="iu-stat__value">{{ currentStats.processed || importResults?.total || 0 }}</span>
              <span class="iu-stat__label">{{ t('admin.importUsers.statProcessed') }}</span>
            </div>
            <div class="iu-stat iu-stat--success">
              <span class="iu-stat__value">{{ currentStats.created || importResults?.created || 0 }}</span>
              <span class="iu-stat__label">{{ t('admin.importUsers.statCreated') }}</span>
            </div>
            <div class="iu-stat iu-stat--warning">
              <span class="iu-stat__value">{{ currentStats.skipped || importResults?.skipped || 0 }}</span>
              <span class="iu-stat__label">{{ t('admin.importUsers.statSkipped') }}</span>
            </div>
          </div>
        </section>

        <template v-if="importResults">
          <div
            class="iu-alert"
            :class="importResults.success ? 'iu-alert--success' : 'iu-alert--danger'"
          >
            <CheckCircle v-if="importResults.success" :size="20" class="flex-shrink-0" />
            <XCircle v-else :size="20" class="flex-shrink-0" />
            <div class="iu-alert__content">
              <span class="iu-alert__title">
                {{ importResults.success ? t('admin.importUsers.resultSuccess') : t('admin.importUsers.resultError') }}
              </span>
              <ul class="iu-result-list mb-0">
                <li>{{ t('admin.importUsers.resultCreated') }} <strong>{{ importResults.created }}</strong></li>
                <li>{{ t('admin.importUsers.resultSkipped') }} <strong>{{ importResults.skipped }}</strong></li>
                <li v-if="importResults.emailsSent > 0">
                  {{ t('admin.importUsers.resultEmailsSent') }} <strong>{{ importResults.emailsSent }}</strong>
                </li>
                <li v-if="importResults.emailsFailed > 0">
                  {{ t('admin.importUsers.resultEmailsFailed') }} <strong>{{ importResults.emailsFailed }}</strong>
                </li>
                <li v-if="importResults.emailsSkippedNoEmail > 0">
                  {{ t('admin.importUsers.resultEmailsNoEmail') }} <strong>{{ importResults.emailsSkippedNoEmail }}</strong>
                </li>
                <li v-if="importResults.errors.length > 0">
                  {{ t('admin.importUsers.resultErrors') }} <strong>{{ importResults.errors.length }}</strong>
                </li>
              </ul>
            </div>
          </div>

          <div
            v-if="canDownloadPasswords"
            class="iu-alert iu-alert--warning d-flex align-items-center justify-content-between flex-wrap gap-3"
          >
            <div class="iu-alert__content">
              <span class="iu-alert__title">{{ t('admin.importUsers.passwordsReady') }}</span>
              <span class="small">{{ t('admin.importUsers.passwordsHint') }}</span>
            </div>
            <button
              type="button"
              class="btn btn-warning d-inline-flex align-items-center gap-2 flex-shrink-0"
              :disabled="downloadingPasswords"
              @click="downloadPasswords"
            >
              <Loader2 v-if="downloadingPasswords" :size="16" class="iu-spinner" />
              <Download v-else :size="16" />
              <span>{{ downloadingPasswords ? t('admin.importUsers.downloading') : t('admin.importUsers.downloadPasswords') }}</span>
            </button>
          </div>

          <div v-else-if="importResults.success && passwordsDownloaded" class="iu-alert iu-alert--muted">
            {{ t('admin.importUsers.passwordsDownloaded') }}
          </div>
        </template>

        <section v-if="importLogs.length > 0" class="iu-section iu-logs">
          <h2 class="iu-section__title mb-0">{{ t('admin.importUsers.logTitle') }}</h2>
          <div ref="logsContainer" class="iu-logs__container">
            <div
              v-for="(log, index) in importLogs"
              :key="index"
              class="iu-log-entry"
              :class="getLogClass(log.level)"
            >
              <component
                :is="getLogIcon(log.level)"
                v-if="getLogIcon(log.level)"
                :size="16"
                class="flex-shrink-0 mt-1"
              />
              <span class="iu-log-entry__message">{{ log.message }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';
@import './import-users.scss';

.loading-container {
  min-height: min(400px, 50dvh);
}

.import-users-shell {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

:deep(.import-users-breadcrumbs) {
  margin-bottom: 0;
}
</style>
