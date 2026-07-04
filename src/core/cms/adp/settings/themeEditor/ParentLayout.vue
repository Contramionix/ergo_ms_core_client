<script setup>
import { ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import ThemeEditor from './ThemeEditor.vue'
import ThemePreview from './ThemePreview.vue'
import { restoreSiteThemeAfterEditor } from '@/js/theme-service.js'
import { Edit, Eye } from 'lucide-vue-next'

const activeView = ref('editor')

onBeforeRouteLeave(async () => {
  await restoreSiteThemeAfterEditor()
})
</script>

<template>
  <div class="admin-page theme-editor-layout">
    <div class="theme-editor-shell">
      <div class="page-header">
        <h1 class="page-title">Темы оформления</h1>
        <p class="page-subtitle">
          Создание, редактирование и активация цветовых схем интерфейса
        </p>
      </div>

      <div class="view-toggle actions-wrapper">
        <button
          type="button"
          class="btn d-inline-flex align-items-center gap-2"
          :class="activeView === 'editor' ? 'btn-primary' : 'btn-outline-secondary'"
          @click="activeView = 'editor'"
        >
          <Edit :size="16" />
          <span>Редактор</span>
        </button>
        <button
          type="button"
          class="btn d-inline-flex align-items-center gap-2"
          :class="activeView === 'preview' ? 'btn-primary' : 'btn-outline-secondary'"
          @click="activeView = 'preview'"
        >
          <Eye :size="16" />
          <span>Предпросмотр</span>
        </button>
      </div>
    </div>

    <div v-if="activeView === 'editor'" class="theme-editor-shell">
      <ThemeEditor />
    </div>
    <ThemePreview v-else-if="activeView === 'preview'" />
  </div>
</template>

<style scoped lang="scss">
@import '@/core/cms/adp/admin/admin-page.scss';

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
}

.view-toggle {
  margin-top: -0.5rem;
}
</style>
