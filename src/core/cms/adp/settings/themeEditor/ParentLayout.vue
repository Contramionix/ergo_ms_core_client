<script setup>
import { ref, provide, onMounted, computed, defineAsyncComponent } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { restoreSiteThemeAfterEditor } from '@/js/theme-service.js'
import { createThemeEditor, THEME_EDITOR_KEY } from './useThemeEditor.js'
import { Edit, Eye } from 'lucide-vue-next'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const ThemeEditor = defineAsyncComponent({
  loader: () => import('./ThemeEditor.vue'),
  loadingComponent: SpinnerLoading,
  delay: 80,
})
const ThemePreview = defineAsyncComponent(() => import('./ThemePreview.vue'))

const { t } = useAppI18n()
const editor = createThemeEditor()
provide(THEME_EDITOR_KEY, editor)

const activeView = ref('editor')
const { isDirty, confirmLeaveIfDirty, applyEditorPreview, init } = editor

const dirtyHint = computed(() => (isDirty.value ? t('settings.themes.dirtyHint') : ''))

function setView(view) {
  if (view === activeView.value) {
    return
  }
  activeView.value = view
  if (view === 'preview') {
    applyEditorPreview()
  }
}

onMounted(() => {
  // Параллельно: чанк галереи (defineAsyncComponent) + список тем с API.
  void import('./ThemeEditor.vue')
  init()
})

onBeforeRouteLeave(async () => {
  const ok = await confirmLeaveIfDirty()
  if (!ok) {
    return false
  }
  await restoreSiteThemeAfterEditor()
  return true
})
</script>

<template>
  <div class="admin-page theme-editor-layout">
    <div class="theme-editor-shell">
      <div class="page-header">
        <div class="theme-editor-layout__title-row">
          <h1 class="page-title mb-0">{{ t('settings.themes.panelTitle') }}</h1>
          <span
            class="theme-editor-layout__dirty"
            :class="{ 'is-visible': isDirty }"
            :title="dirtyHint"
            :aria-hidden="!isDirty"
          >
            {{ t('settings.themes.dirtyBanner') }}
          </span>
        </div>
        <p class="page-subtitle">
          {{ t('settings.themes.pageSubtitle') }}
        </p>
      </div>

      <div
        class="theme-editor-layout__segment"
        role="tablist"
        :aria-label="t('settings.themes.modeAria')"
      >
        <button
          type="button"
          class="theme-editor-layout__segment-btn"
          :class="{ active: activeView === 'editor' }"
          role="tab"
          :aria-selected="activeView === 'editor'"
          @click="setView('editor')"
        >
          <Edit :size="16" aria-hidden="true" />
          <span>{{ t('settings.themes.editor') }}</span>
        </button>
        <button
          type="button"
          class="theme-editor-layout__segment-btn"
          :class="{ active: activeView === 'preview' }"
          role="tab"
          :aria-selected="activeView === 'preview'"
          @click="setView('preview')"
        >
          <Eye :size="16" aria-hidden="true" />
          <span>{{ t('settings.themes.preview') }}</span>
        </button>
      </div>
    </div>

    <div class="theme-editor-layout__view-host">
      <Transition name="theme-view" mode="out-in">
        <div
          v-if="activeView === 'editor'"
          key="editor"
          class="theme-editor-shell"
        >
          <ThemeEditor />
        </div>
        <div
          v-else
          key="preview"
          class="theme-editor-shell theme-editor-shell--preview"
        >
          <ThemePreview />
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/core/cms/adp/admin/admin-page.scss';

.theme-editor-layout {
  --theme-editor-motion: 320ms;
  --theme-editor-ease: cubic-bezier(0.22, 1, 0.36, 1);
  width: 100%;
  max-width: none;
  box-sizing: border-box;
  padding: 1.5rem clamp(1rem, 2.5vw, 2.5rem) 2rem;
}

.theme-editor-shell {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: var(--ui-text);

  --color-primary-text: var(--ui-text);
  --color-secondary-text: color-mix(in srgb, var(--ui-text) 92%, var(--ui-text-muted));
  --color-primary-background: var(--ui-surface);
  --color-secondary-background: var(--ui-surface-2);
  --color-border: var(--ui-border);
  --color-hover-background: var(--ui-hover);
  --color-background: var(--ui-bg);
  --bs-body-color: var(--ui-text);
  --bs-secondary-color: color-mix(in srgb, var(--ui-text) 92%, var(--ui-text-muted));
  --bs-heading-color: var(--ui-text);
  --bs-border-color: var(--ui-border);

  &--preview {
    --color-primary-text: unset;
    --color-secondary-text: unset;
    --color-primary-background: unset;
    --color-secondary-background: unset;
    --color-border: unset;
    --color-hover-background: unset;
    --color-background: unset;
  }
}

.theme-editor-layout__view-host {
  position: relative;
  min-height: 12rem;
}

.theme-editor-layout__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  min-height: 2.25rem;
}

.theme-editor-layout__dirty {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.625rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: color-mix(in srgb, var(--bs-warning, #ffc107) 18%, var(--ui-surface));
  color: var(--ui-text);
  border: 1px solid color-mix(in srgb, var(--bs-warning, #ffc107) 40%, var(--ui-border));
  opacity: 0;
  transform: translateY(-2px);
  max-width: 0;
  overflow: hidden;
  padding-left: 0;
  padding-right: 0;
  border-width: 0;
  margin: 0;
  pointer-events: none;
  transition:
    opacity var(--theme-editor-motion) var(--theme-editor-ease),
    transform var(--theme-editor-motion) var(--theme-editor-ease),
    max-width var(--theme-editor-motion) var(--theme-editor-ease),
    padding var(--theme-editor-motion) var(--theme-editor-ease),
    border-width var(--theme-editor-motion) var(--theme-editor-ease);

  &.is-visible {
    opacity: 1;
    transform: translateY(0);
    max-width: 16rem;
    padding: 0.2rem 0.625rem;
    border-width: 1px;
    pointer-events: auto;
  }
}

.theme-editor-layout__segment {
  display: inline-flex;
  align-items: stretch;
  padding: 0.25rem;
  gap: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.625rem;
  background: var(--ui-surface-2);
  width: fit-content;
  max-width: 100%;
}

.theme-editor-layout__segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--ui-text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color var(--theme-editor-motion) var(--theme-editor-ease),
    color var(--theme-editor-motion) var(--theme-editor-ease),
    box-shadow var(--theme-editor-motion) var(--theme-editor-ease);

  &:hover {
    background: var(--ui-hover);
  }

  &.active {
    background: var(--ui-surface);
    color: var(--ui-text);
    box-shadow: 0 0 0 1px var(--ui-border);
  }

  &:focus-visible {
    outline: 2px solid var(--ui-accent, var(--bs-primary));
    outline-offset: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .theme-editor-layout {
    --theme-editor-motion: 0ms;
  }

  .theme-editor-layout__segment-btn,
  .theme-editor-layout__dirty {
    transition: none !important;
  }

  .theme-editor-layout__dirty:not(.is-visible) {
    display: none;
  }

  .theme-editor-layout__dirty.is-visible {
    max-width: none;
    opacity: 1;
    transform: none;
    padding: 0.2rem 0.625rem;
    border-width: 1px;
  }
}
</style>

<style lang="scss">
.theme-view-enter-active,
.theme-view-leave-active {
  transition:
    opacity 320ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.theme-view-enter-from,
.theme-view-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (prefers-reduced-motion: reduce) {
  .theme-view-enter-active,
  .theme-view-leave-active {
    transition: none !important;
  }

  .theme-view-enter-from,
  .theme-view-leave-to {
    opacity: 1;
    transform: none;
  }
}
</style>
