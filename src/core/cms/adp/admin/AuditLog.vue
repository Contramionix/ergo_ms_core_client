<script setup>
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { logError } from '@/js/utils/logError.js'
import { useToast } from '@/js/utils/toast.js'
import { checkAccessToAdminPanel } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { accessDeniedState } from '@/js/accessDeniedState'
import SpinnerLoading from '@/components/SpinnerLoading.vue'

const AuditLogPanel = defineAsyncComponent(() =>
  import('@/core/audit/components/AuditLogPanel.vue'),
)

const toast = useToast()

const isCheckingAccess = ref(true)
const hasAdminAccess = ref(false)

onMounted(async () => {
  try {
    const accessData = await checkAccessToAdminPanel()
    if (!accessData.access_to_panel) {
      toast.error('У вас нет доступа к административной панели')
      accessDeniedState.active = true
      accessDeniedState.title = 'Доступ запрещён'
      accessDeniedState.message = 'Требуются права администратора.'
      return
    }
    hasAdminAccess.value = true
  } catch (error) {
    logError('Аудит: ошибка проверки прав', error)
    accessDeniedState.active = true
    accessDeniedState.title = 'Доступ запрещён'
    accessDeniedState.message = 'Не удалось проверить права доступа.'
  } finally {
    isCheckingAccess.value = false
  }
})
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
    <SpinnerLoading color="primary" />
  </div>

  <div v-else-if="hasAdminAccess" class="admin-page">
    <div class="page-header">
      <h1 class="page-title">Журнал действий</h1>
      <p class="page-subtitle">Централизованный аудит действий пользователей в ядре и модулях</p>
    </div>

    <div class="content-card">
      <AuditLogPanel search-input-id="audit-search-admin" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';

.loading-container {
  min-height: min(400px, 50dvh);
}
</style>
