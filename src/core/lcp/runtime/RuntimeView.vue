<template>
  <div class="lcp-runtime">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
    </div>

    <div v-else-if="error" class="alert alert-danger m-4">
      {{ error }}
    </div>

    <div v-else-if="!page" class="text-center py-5 text-muted">
      <FileQuestion :size="64" class="mb-3 opacity-50" />
      <h4>Страница не найдена</h4>
      <router-link to="/lcp" class="btn btn-primary mt-3">
        Вернуться на главную
      </router-link>
    </div>

    <div v-else class="lcp-runtime__content">
      <RuntimeComponent
        v-for="item in page.component_tree"
        :key="item.uid"
        :component="item"
        :edit-mode="false"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { FileQuestion } from 'lucide-vue-next'
import lcpApi from '../js/api'
import RuntimeComponent from './RuntimeComponent.vue'

const route = useRoute()

const loading = ref(true)
const error = ref(null)
const page = ref(null)

async function loadPage() {
  const moduleSlug = route.params.moduleSlug
  const pageSlug = route.params.pageSlug
  
  if (!moduleSlug) return
  
  loading.value = true
  error.value = null
  
  try {
    const { data } = await lcpApi.pages.getByPath(moduleSlug, pageSlug || null)
    page.value = data
  } catch (e) {
    error.value = 'Не удалось загрузить страницу'
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch(() => route.params, loadPage, { immediate: true })
</script>

<style scoped>
.lcp-runtime {
  min-height: 100vh;
}

.lcp-runtime__content {
  padding: 1rem;
}
</style>


