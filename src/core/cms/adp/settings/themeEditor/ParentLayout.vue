<script setup>
import { ref, computed } from 'vue'
import { useRoute, onBeforeRouteLeave } from 'vue-router'
import ThemeEditor from './ThemeEditor.vue'
import ThemePreview from './ThemePreview.vue'
import { restoreSiteThemeAfterEditor } from '@/js/theme-service.js'
import { Edit, Eye } from 'lucide-vue-next'

const route = useRoute()
const activeView = ref('editor')

const showToggle = computed(() => route.name === 'ThemeEditor')

onBeforeRouteLeave(async () => {
  await restoreSiteThemeAfterEditor()
})
</script>

<template>
  <div class="theme-editor-layout container-fluid px-3">
    <div class="row justify-content-center">
      <div class="col-12">
        <div v-if="showToggle" class="d-flex justify-content-center mb-4">
          <div class="btn-group" role="group">
            <button
              type="button"
              class="btn"
              :class="activeView === 'editor' ? 'btn-primary' : 'btn-outline-primary'"
              @click="activeView = 'editor'"
            >
              <Edit :size="18" class="me-2" />
              Редактор
            </button>
            <button
              type="button"
              class="btn"
              :class="activeView === 'preview' ? 'btn-primary' : 'btn-outline-primary'"
              @click="activeView = 'preview'"
            >
              <Eye :size="18" class="me-2" />
              Предпросмотр
            </button>
          </div>
        </div>

        <ThemeEditor v-if="activeView === 'editor'" />
        <ThemePreview v-else />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.theme-editor-layout {
  padding: 0;
}
</style>
