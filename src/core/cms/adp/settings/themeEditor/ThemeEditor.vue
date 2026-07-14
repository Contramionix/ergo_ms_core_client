<script setup>
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Copy,
  Trash2,
  Check,
  Sun,
  Moon,
} from 'lucide-vue-next'
import SelectBox from '@/components/SelectBox.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import ColorPicker from './ColorPicker.vue'
import { useThemeEditor } from './useThemeEditor.js'

const {
  BASE_THEME_OPTIONS,
  activateTheme,
  bootstrapCategories,
  changeBaseTheme,
  canEditCurrentTheme,
  changeEditingVariant,
  changeScope,
  selectedScope,
  scopeOptions,
  isModuleScope,
  isEditingModulePair,
  modulePairHasUnsavedVariant,
  colorDescriptions,
  createNewTheme,
  currentTheme,
  deleteTheme,
  discardDraft,
  discardModulePairDraft,
  displayThemes,
  duplicateTheme,
  exportTheme,
  fileInput,
  getDefaultValue,
  handleFileImport,
  importTheme,
  isNewTheme,
  loading,
  moduleTokenEntries,
  resetSystemTheme,
  resetToDefaults,
  resettingThemeId,
  saveTheme,
  saveModulePair,
  saving,
  selectTheme,
  selectedThemeId,
  editingVariant,
  showBootstrapColors,
  updateBootstrapColor,
  updateColor,
  updateModuleToken,
} = useThemeEditor()
</script>

<template>
  <div class="theme-editor">
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      class="visually-hidden"
      @change="handleFileImport"
    />

    <div class="row g-4">
      <div class="col-12 col-lg-4">
        <section class="theme-editor__section">
          <div class="table-header mb-3">
            <h2 class="admin-section-heading mb-0">Список тем</h2>
            <div class="actions-wrapper">
              <button
                type="button"
                class="btn btn-primary d-inline-flex align-items-center gap-2"
                @click="createNewTheme"
              >
                <Plus :size="16" />
                <span>Новая тема</span>
              </button>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label small text-muted mb-1">Область</label>
            <SelectBox
              :model-value="selectedScope"
              :options="scopeOptions"
              value-key="id"
              label-key="name"
              :include-all-option="false"
              @update:model-value="changeScope"
            />
          </div>

          <div class="content-card content-card--flush">
            <LoadingContentArea :loading="loading" min-height="8rem">
              <div class="theme-list">
                <div
                  v-for="theme in displayThemes"
                  :key="theme.id"
                  class="theme-item"
                  :class="{
                    active: selectedThemeId === theme.id,
                    'is-active-theme': theme.is_active,
                    'is-draft-theme': theme.is_draft,
                  }"
                  @click="selectTheme(theme)"
                >
                  <div class="theme-info">
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                      <template v-if="theme.is_pair">
                        <Sun :size="14" class="theme-icon" />
                        <Moon :size="14" class="theme-icon" />
                      </template>
                      <component
                        v-else
                        :is="theme.base_theme === 'dark' ? Moon : Sun"
                        :size="16"
                        class="theme-icon"
                      />
                      <span class="theme-name">{{ theme.name }}</span>
                      <span v-if="theme.is_draft" class="theme-badge theme-badge--draft">Черновик</span>
                      <span v-if="theme.is_draft_pair" class="theme-badge theme-badge--draft">Черновик пары</span>
                      <span v-if="theme.is_system" class="theme-badge theme-badge--muted">Системная</span>
                      <span v-if="theme.is_active" class="theme-badge theme-badge--active">Активна</span>
                    </div>
                    <small>{{ theme.description || 'Без описания' }}</small>
                  </div>

                  <div class="theme-actions actions-cell">
                    <button
                      v-if="theme.is_system && !theme.is_draft_pair"
                      type="button"
                      class="btn-action"
                      title="Сбросить к начальным значениям"
                      :disabled="resettingThemeId === theme.id || resettingThemeId === theme.module_pair"
                      @click.stop="resetSystemTheme(theme)"
                    >
                      <RotateCcw :size="15" />
                    </button>
                    <button
                      v-if="!theme.is_active && !theme.is_draft && !theme.is_draft_pair"
                      type="button"
                      class="btn-action"
                      title="Активировать"
                      @click.stop="activateTheme(theme)"
                    >
                      <Check :size="15" />
                    </button>
                    <button
                      v-if="!theme.is_draft && !isModuleScope"
                      type="button"
                      class="btn-action btn-action--edit"
                      title="Дублировать"
                      @click.stop="duplicateTheme(theme)"
                    >
                      <Copy :size="15" />
                    </button>
                    <button
                      v-if="theme.is_draft_pair"
                      type="button"
                      class="btn-action btn-action--delete"
                      title="Удалить черновик пары"
                      @click.stop="discardModulePairDraft"
                    >
                      <Trash2 :size="15" />
                    </button>
                    <button
                      v-if="theme.is_draft"
                      type="button"
                      class="btn-action btn-action--delete"
                      title="Удалить черновик"
                      @click.stop="discardDraft"
                    >
                      <Trash2 :size="15" />
                    </button>
                    <button
                      v-if="!theme.is_system && !theme.is_draft && !theme.is_pair"
                      type="button"
                      class="btn-action btn-action--delete"
                      title="Удалить"
                      @click.stop="deleteTheme(theme)"
                    >
                      <Trash2 :size="15" />
                    </button>
                  </div>
                </div>
              </div>
            </LoadingContentArea>
          </div>
        </section>
      </div>

      <div class="col-12 col-lg-8">
        <section class="theme-editor__section">
          <div class="table-header mb-3">
            <h2 class="admin-section-heading mb-0">
              <template v-if="isEditingModulePair">
                Редактирование пары
                <span class="theme-editor__variant-label">
                  ({{ editingVariant === 'dark' ? 'тёмный' : 'светлый' }} вариант)
                </span>
              </template>
              <template v-else>
                {{ isNewTheme ? 'Новая тема' : 'Редактирование' }}
              </template>
            </h2>
            <div class="actions-wrapper">
              <button
                v-if="isEditingModulePair"
                type="button"
                class="btn btn-outline-primary d-inline-flex align-items-center gap-2"
                :disabled="saving || !canEditCurrentTheme"
                @click="saveModulePair"
              >
                <Save :size="16" />
                <span>{{ saving ? 'Сохранение...' : 'Сохранить пару' }}</span>
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                :disabled="!canEditCurrentTheme"
                title="Сбросить цвета текущего варианта"
                @click="resetToDefaults"
              >
                <RotateCcw :size="16" />
                <span>Сбросить</span>
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                @click="importTheme"
              >
                <Upload :size="16" />
                <span>Импорт</span>
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                @click="exportTheme"
              >
                <Download :size="16" />
                <span>Экспорт</span>
              </button>
              <button
                type="button"
                class="btn btn-primary d-inline-flex align-items-center gap-2"
                :disabled="saving || !canEditCurrentTheme"
                @click="saveTheme"
              >
                <Save :size="16" />
                <span>
                  {{
                    saving
                      ? 'Сохранение...'
                      : (isEditingModulePair ? 'Сохранить вариант' : 'Сохранить')
                  }}
                </span>
              </button>
            </div>
          </div>

          <div class="content-card">
            <div v-if="isEditingModulePair" class="theme-editor__variant-tabs mb-4">
              <span class="theme-editor__variant-tabs-label">Редактируемый вариант</span>
              <div class="theme-editor__variant-tabs-group" role="tablist">
                <button
                  type="button"
                  class="theme-editor__variant-tab"
                  :class="{ active: editingVariant === 'light' }"
                  role="tab"
                  :aria-selected="editingVariant === 'light'"
                  @click="changeEditingVariant('light')"
                >
                  <Sun :size="16" />
                  <span>Светлый</span>
                </button>
                <button
                  type="button"
                  class="theme-editor__variant-tab"
                  :class="{ active: editingVariant === 'dark' }"
                  role="tab"
                  :aria-selected="editingVariant === 'dark'"
                  @click="changeEditingVariant('dark')"
                >
                  <Moon :size="16" />
                  <span>Тёмный</span>
                </button>
              </div>
              <p class="form-text small text-muted mb-0">
                Цвета и токены задаются отдельно для каждого варианта. На сайте показывается вариант по глобальной теме пользователя.
              </p>
            </div>

            <div class="row g-3 mb-4">
              <div class="col-12 col-md-4">
                <label class="form-label" for="theme-name">Название пары</label>
                <input
                  id="theme-name"
                  v-model="currentTheme.name"
                  type="text"
                  class="form-control theme-editor__input"
                  :disabled="!canEditCurrentTheme"
                  placeholder="Название темы"
                />
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label" for="theme-author">Автор</label>
                <input
                  id="theme-author"
                  v-model="currentTheme.author"
                  type="text"
                  class="form-control theme-editor__input"
                  :disabled="!canEditCurrentTheme"
                  placeholder="Автор"
                />
              </div>
              <div v-if="!isModuleScope" class="col-12 col-md-4">
                <SelectBox
                  id="theme-base"
                  label="Базовая тема"
                  :model-value="currentTheme.base_theme"
                  :options="BASE_THEME_OPTIONS"
                  :include-all-option="false"
                  :disabled="!canEditCurrentTheme"
                  @update:model-value="changeBaseTheme"
                >
                  <template #selected="{ option, label }">
                    <span class="theme-editor__select-option">
                      <component v-if="option?.icon" :is="option.icon" :size="16" />
                      <span>{{ label }}</span>
                    </span>
                  </template>
                  <template #option="{ option, label }">
                    <span class="theme-editor__select-option">
                      <component v-if="option?.icon" :is="option.icon" :size="16" />
                      <span>{{ label }}</span>
                    </span>
                  </template>
                </SelectBox>
              </div>
              <div class="col-12">
                <label class="form-label" for="theme-description">Описание</label>
                <input
                  id="theme-description"
                  v-model="currentTheme.description"
                  type="text"
                  class="form-control theme-editor__input"
                  :disabled="!canEditCurrentTheme"
                  placeholder="Описание темы"
                />
              </div>
            </div>

            <div class="form-check form-switch mb-4">
              <input
                id="showBootstrap"
                v-model="showBootstrapColors"
                class="form-check-input"
                type="checkbox"
              />
              <label class="form-check-label" for="showBootstrap">
                Показать Bootstrap переменные
              </label>
            </div>

            <h3 class="admin-section-heading mb-3">
              Основные цвета
              <span v-if="isEditingModulePair" class="theme-editor__variant-label">
                — {{ editingVariant === 'dark' ? 'тёмный' : 'светлый' }} вариант
              </span>
            </h3>
            <div class="row">
              <div
                v-for="(desc, key) in colorDescriptions"
                :key="key || `color-${desc.label}`"
                class="col-12 col-md-6"
              >
                <ColorPicker
                  :label="desc.label"
                  :value="currentTheme.colors[key] || ''"
                  :description="desc.description"
                  :disabled="!canEditCurrentTheme"
                  @update:value="updateColor(key, $event)"
                />
              </div>
            </div>

            <template v-if="isModuleScope && moduleTokenEntries.length">
              <hr class="theme-editor__divider" />
              <h3 class="admin-section-heading mb-3">
                Токены модуля
                <span class="theme-editor__variant-label">
                  — {{ editingVariant === 'dark' ? 'тёмный' : 'светлый' }} вариант
                </span>
              </h3>
              <div class="row g-3">
                <div
                  v-for="entry in moduleTokenEntries"
                  :key="entry.key"
                  class="col-12 col-md-6"
                >
                  <label class="form-label">{{ entry.label }}</label>
                  <input
                    type="text"
                    class="form-control theme-editor__input"
                    :value="entry.value"
                    :disabled="!canEditCurrentTheme"
                    @input="updateModuleToken(entry.key, $event.target.value)"
                  />
                </div>
              </div>
            </template>

            <template v-if="showBootstrapColors">
              <template v-for="(category, categoryKey) in bootstrapCategories" :key="categoryKey">
                <hr class="theme-editor__divider" />
                <h3 class="admin-section-heading mb-3">{{ category.label }}</h3>
                <div class="row">
                  <div
                    v-for="(varConfig, key) in category.variables"
                    :key="key || `${categoryKey}-${varConfig.label}`"
                    class="col-12 col-md-6"
                  >
                    <ColorPicker
                      :label="varConfig.label"
                      :value="currentTheme.bootstrap_colors[key] || getDefaultValue(key)"
                      :description="varConfig.variable"
                      :disabled="!canEditCurrentTheme"
                      @update:value="updateBootstrapColor(key, $event)"
                    />
                  </div>
                </div>
              </template>
            </template>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/core/cms/adp/admin/admin-page.scss';

.theme-editor {
  .admin-section-heading {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-primary-text);
  }

  .theme-editor__variant-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-secondary-text);
  }

  .theme-editor__variant-tabs {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .theme-editor__variant-tabs-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary-text);
  }

  .theme-editor__variant-tabs-group {
    display: inline-flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .theme-editor__variant-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-secondary-background);
    color: var(--color-primary-text);
    font-size: 0.875rem;
    transition: background-color 0.15s ease, border-color 0.15s ease;

    &:hover {
      background: var(--color-hover-background);
    }

    &.active {
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 12%, var(--color-primary-background));
    }
  }

  .content-card--flush {
    padding: 0;
    overflow: hidden;
  }

  .form-label,
  .form-check-label {
    color: var(--color-primary-text);
    font-size: 0.875rem;
  }

  .theme-editor__input {
    border: 1px solid var(--color-border);
    background: var(--color-secondary-background);
    color: var(--color-primary-text);
    border-radius: 0.5rem;
    font-size: 0.875rem;

    &:focus {
      border-color: var(--color-primary-text);
      box-shadow: none;
    }

    &::placeholder {
      color: var(--color-secondary-text);
    }

    &:disabled {
      opacity: 0.65;
    }
  }

  .theme-editor__select-option {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .theme-editor__divider {
    border-color: var(--color-border);
    margin: 1.5rem 0;
    opacity: 1;
  }

  .theme-list {
    max-height: 600px;
    overflow-y: auto;
  }

  .theme-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: var(--color-hover-background);
    }

    &.active {
      background-color: color-mix(in srgb, var(--color-accent) 14%, var(--color-primary-background));
      border-left: 3px solid var(--color-accent);
    }

    &.is-active-theme:not(.active) {
      border-left: 3px solid var(--bs-success, #198754);
    }
  }

  .theme-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    overflow: hidden;
    min-width: 0;

    small {
      color: color-mix(in srgb, var(--ui-text) 88%, var(--ui-text-muted));
      font-size: 0.8125rem;
    }
  }

  .theme-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--color-primary-text);
  }

  .theme-icon {
    flex-shrink: 0;
    color: var(--ui-text);
  }

  .theme-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 500;
    line-height: 1.4;

    &--muted {
      background: var(--ui-surface-2);
      color: var(--ui-text);
    }

    &--active {
      background: rgba(var(--bs-success-rgb, 25, 135, 84), 0.12);
      color: var(--bs-success, #198754);
    }

    &--draft {
      background: rgba(var(--bs-primary-rgb, 13, 110, 253), 0.1);
      color: var(--color-accent, var(--bs-primary, #0d6efd));
    }
  }

  .theme-item.is-draft-theme.active {
    border-left-color: var(--color-accent, var(--bs-primary, #0d6efd));
  }

  .theme-actions {
    opacity: 1;
    transition: opacity 0.15s ease;
    flex-shrink: 0;

    :deep(.btn-action) {
      color: var(--ui-text);

      &:hover:not(:disabled) {
        color: var(--ui-text);
      }
    }
  }

  .theme-item:hover .theme-actions,
  .theme-item.active .theme-actions {
    opacity: 1;
  }
}
</style>
