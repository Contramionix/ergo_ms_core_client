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
} from 'lucide-vue-next'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import { formatFileSize } from '@/js/utils/file-helpers.js'
import { useImportUsers } from './js/useImportUsers.js'

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
      <h1 class="page-title">Загрузка пользователей</h1>
      <p class="page-subtitle">Массовое создание учётных записей из файла Excel или CSV</p>
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
            <span>Есть незавершённая загрузка. Вы можете продолжить отслеживание прогресса.</span>
          </div>
          <button
            type="button"
            class="btn btn-primary d-inline-flex align-items-center gap-2 flex-shrink-0"
            @click="resumeImport"
          >
            Продолжить отслеживание
          </button>
        </div>

        <div class="iu-steps" aria-hidden="true">
          <div
            class="iu-step"
            :class="{ 'iu-step--active': currentStep >= 0, 'iu-step--done': currentStep > 0 }"
          >
            <span class="iu-step__num">1</span>
            <span class="iu-step__label">Файл</span>
          </div>
          <div class="iu-step__line" :class="{ 'iu-step__line--done': currentStep > 0 }" />
          <div
            class="iu-step"
            :class="{ 'iu-step--active': currentStep >= 1, 'iu-step--done': currentStep > 1 }"
          >
            <span class="iu-step__num">2</span>
            <span class="iu-step__label">Настройки</span>
          </div>
          <div class="iu-step__line" :class="{ 'iu-step__line--done': currentStep > 1 }" />
          <div
            class="iu-step"
            :class="{ 'iu-step--active': currentStep >= 2, 'iu-step--done': currentStep > 2 }"
          >
            <span class="iu-step__num">3</span>
            <span class="iu-step__label">Загрузка</span>
          </div>
          <div class="iu-step__line" :class="{ 'iu-step__line--done': currentStep > 2 }" />
          <div class="iu-step" :class="{ 'iu-step--active': currentStep >= 3 }">
            <span class="iu-step__num">4</span>
            <span class="iu-step__label">Результат</span>
          </div>
        </div>

        <section class="iu-section">
          <div class="iu-section__head">
            <div>
              <h2 class="iu-section__title">Подготовка файла</h2>
              <p class="iu-section__desc">
                Загрузите таблицу с пользователями. Для каждого нового аккаунта будет сгенерирован случайный пароль.
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
              <span>{{ downloadingTemplate ? 'Формирование...' : 'Скачать шаблон' }}</span>
            </button>
          </div>

          <div class="iu-alert iu-alert--info">
            <Info :size="18" class="flex-shrink-0 mt-1" />
            <div class="iu-alert__content">
              <span class="iu-alert__title">Требования к файлу</span>
              <ul class="iu-requirements-list mb-0">
                <li>Формат: Excel (<code>.xlsx</code>, <code>.xls</code>) или CSV (<code>.csv</code>)</li>
                <li>Обязательные столбцы: <code>Фамилия</code>, <code>Имя</code>, <code>Логин</code></li>
                <li>Опциональные столбцы: <code>Отчество</code>, <code>E-mail</code></li>
                <li>После импорта пароли можно один раз скачать в Excel-файле</li>
                <li>Дубликаты определяются по логину; по E-mail — если в настройках сервера включена проверка уникальности email</li>
                <li>Перед загрузкой удалите пример строки из шаблона</li>
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
              <p class="iu-upload__title">Перетащите файл или нажмите для выбора</p>
              <p class="iu-upload__hint">Поддерживаются Excel (.xlsx, .xls) и CSV (.csv)</p>
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
                  aria-label="Удалить файл"
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
              <h2 class="iu-section__title">Приветственные письма</h2>
              <p class="iu-section__desc mb-0">
                По умолчанию письма не отправляются. Они уходят только пользователям с указанным E-mail.
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
                  <strong>Отправлять приветственные письма на электронную почту</strong>
                  <small>Можно настроить тему и текст письма перед загрузкой</small>
                </span>
              </label>
            </div>
          </div>

          <div v-if="sendWelcomeEmails" class="iu-email-settings">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <h3 class="iu-section__title mb-0">Текст приветственного письма</h3>
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                :disabled="isImporting"
                @click="resetWelcomeEmailTemplate"
              >
                Сбросить шаблон
              </button>
            </div>

            <div>
              <label class="form-label" for="welcomeEmailSubject">Тема письма</label>
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
              <label class="form-label" for="welcomeEmailBody">Текст письма</label>
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
              Доступные подстановки:
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
            <span>{{ isImporting ? 'Загрузка...' : 'Начать загрузку' }}</span>
          </button>
        </div>

        <section v-if="isImporting || importResults" class="iu-section">
          <div class="iu-section__head">
            <div>
              <h2 class="iu-section__title">Прогресс загрузки</h2>
              <p class="iu-section__desc mb-0">{{ importStatus || 'Ожидание запуска...' }}</p>
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
              <span class="iu-stat__label">Всего строк</span>
            </div>
            <div class="iu-stat iu-stat--info">
              <span class="iu-stat__value">{{ currentStats.processed || importResults?.total || 0 }}</span>
              <span class="iu-stat__label">Обработано</span>
            </div>
            <div class="iu-stat iu-stat--success">
              <span class="iu-stat__value">{{ currentStats.created || importResults?.created || 0 }}</span>
              <span class="iu-stat__label">Создано</span>
            </div>
            <div class="iu-stat iu-stat--warning">
              <span class="iu-stat__value">{{ currentStats.skipped || importResults?.skipped || 0 }}</span>
              <span class="iu-stat__label">Пропущено</span>
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
                {{ importResults.success ? 'Загрузка завершена' : 'Ошибка загрузки' }}
              </span>
              <ul class="iu-result-list mb-0">
                <li>Создано пользователей: <strong>{{ importResults.created }}</strong></li>
                <li>Пропущено (дубликаты или ошибки): <strong>{{ importResults.skipped }}</strong></li>
                <li v-if="importResults.emailsSent > 0">
                  Отправлено приветственных писем: <strong>{{ importResults.emailsSent }}</strong>
                </li>
                <li v-if="importResults.emailsFailed > 0">
                  Не удалось отправить писем: <strong>{{ importResults.emailsFailed }}</strong>
                </li>
                <li v-if="importResults.emailsSkippedNoEmail > 0">
                  Без E-mail (письма не отправлены): <strong>{{ importResults.emailsSkippedNoEmail }}</strong>
                </li>
                <li v-if="importResults.errors.length > 0">
                  Ошибок: <strong>{{ importResults.errors.length }}</strong>
                </li>
              </ul>
            </div>
          </div>

          <div
            v-if="canDownloadPasswords"
            class="iu-alert iu-alert--warning d-flex align-items-center justify-content-between flex-wrap gap-3"
          >
            <div class="iu-alert__content">
              <span class="iu-alert__title">Файл с паролями готов</span>
              <span class="small">Скачивание доступно один раз. Сохраните файл в надёжное место.</span>
            </div>
            <button
              type="button"
              class="btn btn-warning d-inline-flex align-items-center gap-2 flex-shrink-0"
              :disabled="downloadingPasswords"
              @click="downloadPasswords"
            >
              <Loader2 v-if="downloadingPasswords" :size="16" class="iu-spinner" />
              <Download v-else :size="16" />
              <span>{{ downloadingPasswords ? 'Скачивание...' : 'Скачать пароли (Excel)' }}</span>
            </button>
          </div>

          <div v-else-if="importResults.success && passwordsDownloaded" class="iu-alert iu-alert--muted">
            Файл с паролями уже был скачан. Повторная выгрузка недоступна.
          </div>
        </template>

        <section v-if="importLogs.length > 0" class="iu-section iu-logs">
          <h2 class="iu-section__title mb-0">Журнал загрузки</h2>
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
  min-height: 400px;
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
