<script setup>
import { computed } from 'vue'
import {
  Home,
  User,
  Bell,
  Search,
  ChevronRight,
  FileText,
  MoreVertical,
} from 'lucide-vue-next'
import { useThemeEditor } from './useThemeEditor.js'

const {
  previewMeta,
  currentTheme,
} = useThemeEditor()

const canvasTheme = computed(() => (
  previewMeta.value.variant === 'dark' ? 'dark' : 'light'
))

const colors = computed(() => currentTheme.colors || {})
</script>

<template>
  <div class="theme-preview">
    <div class="theme-preview__meta">
      <span class="theme-preview__meta-label">Вариант</span>
      <strong>{{ previewMeta.variantLabel }}</strong>
    </div>

    <div class="content-card content-card--flush">
      <div
        class="theme-preview__canvas"
        :data-bs-theme="canvasTheme"
      >
        <div
          class="preview-header"
          :style="{ background: colors.headerBackground || 'var(--color-header-background)' }"
        >
          <div class="container-fluid px-4 py-3">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center gap-3">
                <div
                  class="preview-logo"
                  :style="{
                    background: colors.secondaryBackground || 'var(--color-secondary-background)',
                    color: colors.accent || 'var(--color-accent)',
                  }"
                >
                  <Home :size="24" />
                </div>
                <nav class="d-flex gap-3">
                  <a
                    href="#"
                    class="preview-nav-link"
                    :style="{ color: colors.primaryText || 'var(--color-primary-text)' }"
                    @click.prevent
                  >Главная</a>
                  <a
                    href="#"
                    class="preview-nav-link"
                    :style="{ color: colors.primaryText || 'var(--color-primary-text)' }"
                    @click.prevent
                  >О нас</a>
                  <a
                    href="#"
                    class="preview-nav-link"
                    :style="{ color: colors.primaryText || 'var(--color-primary-text)' }"
                    @click.prevent
                  >Контакты</a>
                </nav>
              </div>
              <div class="d-flex align-items-center gap-2">
                <button
                  type="button"
                  class="preview-btn-icon"
                  :style="{ color: colors.primaryText || 'var(--color-primary-text)' }"
                  aria-label="Поиск"
                >
                  <Search :size="20" />
                </button>
                <button
                  type="button"
                  class="preview-btn-icon"
                  :style="{ color: colors.primaryText || 'var(--color-primary-text)' }"
                  aria-label="Уведомления"
                >
                  <Bell :size="20" />
                </button>
                <button
                  type="button"
                  class="preview-btn-icon"
                  :style="{ color: colors.primaryText || 'var(--color-primary-text)' }"
                  aria-label="Профиль"
                >
                  <User :size="20" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          class="preview-content"
          :style="{
            background: colors.background || 'var(--color-background)',
            minHeight: '600px',
          }"
        >
          <div class="container-fluid px-4 py-4">
            <div class="row g-4 mb-4">
              <div class="col-12 col-md-6 col-lg-4">
                <div
                  class="preview-card"
                  :style="{
                    background: colors.primaryBackground || 'var(--color-primary-background)',
                    borderColor: colors.border || 'var(--color-border)',
                  }"
                >
                  <div
                    class="preview-card-header"
                    :style="{ borderColor: colors.border || 'var(--color-border)' }"
                  >
                    <h5 :style="{ color: colors.primaryText || 'var(--color-primary-text)' }">
                      Карточка 1
                    </h5>
                  </div>
                  <div class="preview-card-body">
                    <p :style="{ color: colors.secondaryText || 'var(--color-secondary-text)' }">
                      Пример текста в карточке. Здесь может быть любой контент.
                    </p>
                    <button
                      type="button"
                      class="preview-btn"
                      :style="{ background: colors.accent || 'var(--color-accent)', color: '#fff' }"
                    >
                      Действие
                    </button>
                  </div>
                </div>
              </div>

              <div class="col-12 col-md-6 col-lg-4">
                <div
                  class="preview-card"
                  :style="{
                    background: colors.primaryBackground || 'var(--color-primary-background)',
                    borderColor: colors.border || 'var(--color-border)',
                  }"
                >
                  <div
                    class="preview-card-header"
                    :style="{ borderColor: colors.border || 'var(--color-border)' }"
                  >
                    <h5 :style="{ color: colors.primaryText || 'var(--color-primary-text)' }">
                      Карточка 2
                    </h5>
                  </div>
                  <div class="preview-card-body">
                    <p :style="{ color: colors.secondaryText || 'var(--color-secondary-text)' }">
                      Ещё одна карточка с контентом для демонстрации темы.
                    </p>
                    <button
                      type="button"
                      class="preview-btn-secondary"
                      :style="{
                        borderColor: colors.border || 'var(--color-border)',
                        color: colors.primaryText || 'var(--color-primary-text)',
                      }"
                    >
                      Вторичная кнопка
                    </button>
                  </div>
                </div>
              </div>

              <div class="col-12 col-md-6 col-lg-4">
                <div
                  class="preview-card"
                  :style="{
                    background: colors.secondaryBackground || 'var(--color-secondary-background)',
                    borderColor: colors.border || 'var(--color-border)',
                  }"
                >
                  <div
                    class="preview-card-header"
                    :style="{ borderColor: colors.border || 'var(--color-border)' }"
                  >
                    <h5 :style="{ color: colors.primaryText || 'var(--color-primary-text)' }">
                      Карточка 3
                    </h5>
                  </div>
                  <div class="preview-card-body">
                    <p :style="{ color: colors.secondaryText || 'var(--color-secondary-text)' }">
                      Карточка с вторичным фоном для разнообразия.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="row mb-4">
              <div class="col-12 col-lg-6">
                <div
                  class="preview-card"
                  :style="{
                    background: colors.primaryBackground || 'var(--color-primary-background)',
                    borderColor: colors.border || 'var(--color-border)',
                  }"
                >
                  <div
                    class="preview-card-header"
                    :style="{ borderColor: colors.border || 'var(--color-border)' }"
                  >
                    <h5 :style="{ color: colors.primaryText || 'var(--color-primary-text)' }">
                      Форма
                    </h5>
                  </div>
                  <div class="preview-card-body">
                    <div class="mb-3">
                      <label
                        class="form-label"
                        for="preview-name"
                        :style="{ color: colors.primaryText || 'var(--color-primary-text)' }"
                      >Имя</label>
                      <input
                        id="preview-name"
                        type="text"
                        class="form-control preview-input"
                        :style="{
                          background: colors.secondaryBackground || 'var(--color-secondary-background)',
                          borderColor: colors.border || 'var(--color-border)',
                          color: colors.primaryText || 'var(--color-primary-text)',
                        }"
                        placeholder="Введите имя"
                      />
                    </div>
                    <button
                      type="button"
                      class="preview-btn"
                      :style="{ background: colors.accent || 'var(--color-accent)', color: '#fff' }"
                    >
                      Отправить
                    </button>
                  </div>
                </div>
              </div>

              <div class="col-12 col-lg-6">
                <div
                  class="preview-card"
                  :style="{
                    background: colors.primaryBackground || 'var(--color-primary-background)',
                    borderColor: colors.border || 'var(--color-border)',
                  }"
                >
                  <div
                    class="preview-card-header"
                    :style="{ borderColor: colors.border || 'var(--color-border)' }"
                  >
                    <h5 :style="{ color: colors.primaryText || 'var(--color-primary-text)' }">
                      Список элементов
                    </h5>
                  </div>
                  <div class="preview-list">
                    <div
                      v-for="i in 4"
                      :key="i"
                      class="preview-list-item"
                      :style="{
                        borderColor: colors.border || 'var(--color-border)',
                        background: colors.primaryBackground || 'var(--color-primary-background)',
                        '--hover-bg': colors.hoverBackground || 'var(--color-hover-background)',
                      }"
                    >
                      <div class="d-flex align-items-center gap-3">
                        <div
                          class="preview-icon"
                          :style="{
                            background: colors.secondaryBackground || 'var(--color-secondary-background)',
                            color: colors.accent || 'var(--color-accent)',
                          }"
                        >
                          <FileText :size="20" />
                        </div>
                        <div class="flex-grow-1">
                          <div
                            :style="{
                              color: colors.primaryText || 'var(--color-primary-text)',
                              fontWeight: 500,
                            }"
                          >
                            Элемент списка {{ i }}
                          </div>
                          <div
                            :style="{
                              color: colors.secondaryText || 'var(--color-secondary-text)',
                              fontSize: '0.875rem',
                            }"
                          >
                            Описание элемента
                          </div>
                        </div>
                        <ChevronRight
                          :size="20"
                          :style="{ color: colors.secondaryText || 'var(--color-secondary-text)' }"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="preview-card"
              :style="{
                background: colors.primaryBackground || 'var(--color-primary-background)',
                borderColor: colors.border || 'var(--color-border)',
              }"
            >
              <div
                class="preview-card-header"
                :style="{ borderColor: colors.border || 'var(--color-border)' }"
              >
                <h5 :style="{ color: colors.primaryText || 'var(--color-primary-text)' }">
                  Кнопки и элементы управления
                </h5>
              </div>
              <div class="preview-card-body">
                <div class="d-flex flex-wrap gap-3 align-items-center">
                  <button
                    type="button"
                    class="preview-btn"
                    :style="{ background: colors.accent || 'var(--color-accent)', color: '#fff' }"
                  >
                    Основная кнопка
                  </button>
                  <button
                    type="button"
                    class="preview-btn-secondary"
                    :style="{
                      borderColor: colors.border || 'var(--color-border)',
                      color: colors.primaryText || 'var(--color-primary-text)',
                    }"
                  >
                    Вторичная кнопка
                  </button>
                  <button
                    type="button"
                    class="preview-btn-icon-sm"
                    :style="{ color: colors.primaryText || 'var(--color-primary-text)' }"
                    aria-label="Ещё"
                  >
                    <MoreVertical :size="16" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/core/cms/adp/admin/admin-page.scss';

.theme-preview {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  .theme-preview__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--ui-text);
  }

  .theme-preview__meta-label {
    color: var(--ui-text-muted);
  }

  .theme-preview__meta-sep {
    color: var(--ui-text-muted);
  }

  .content-card--flush {
    padding: 0;
    overflow: hidden;
  }

  .theme-preview__canvas {
    overflow: hidden;
    border-radius: inherit;
  }

  .preview-header {
    border-bottom: 1px solid var(--color-border, #e0e0e0);
  }

  .preview-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
  }

  .preview-nav-link {
    text-decoration: none;
    font-weight: 500;
    transition: color 0.15s ease;

    &:hover {
      color: var(--color-accent, #d0322d) !important;
    }
  }

  .preview-btn-icon {
    background: transparent;
    border: none;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: var(--color-hover-background, #e1e1e1);
    }
  }

  .preview-card {
    border: 1px solid;
    border-radius: 8px;
    overflow: hidden;
  }

  .preview-card-header {
    padding: 1rem;
    border-bottom: 1px solid;

    h5 {
      margin: 0;
      font-size: 1rem;
    }
  }

  .preview-card-body {
    padding: 1rem;
  }

  .preview-btn {
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s ease;

    &:hover {
      opacity: 0.9;
    }
  }

  .preview-btn-secondary {
    border: 1px solid;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    background: transparent;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: var(--color-hover-background, #e1e1e1);
    }
  }

  .preview-input {
    &::placeholder {
      color: var(--color-secondary-text, #6e6e6e);
    }
  }

  .preview-list {
    padding: 0.5rem 0;
  }

  .preview-list-item {
    padding: 1rem;
    border-bottom: 1px solid;
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
      background: var(--hover-bg, var(--color-hover-background, #e1e1e1)) !important;
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .preview-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .preview-btn-icon-sm {
    background: transparent;
    border: none;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
  }
}

@media (prefers-reduced-motion: reduce) {
  .theme-preview {
    .preview-nav-link,
    .preview-btn-icon,
    .preview-btn,
    .preview-btn-secondary,
    .preview-list-item {
      transition: none;
    }
  }
}
</style>
