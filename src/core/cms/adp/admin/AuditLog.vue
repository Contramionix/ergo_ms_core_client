<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { logError } from '@/js/utils/logError.js'
import { useToast } from '@/js/utils/toast.js'
import { checkAccessToAdminPanel } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import AuditLogPanel from '@/core/audit/components/AuditLogPanel.vue'

const router = useRouter()
const toast = useToast()

const isCheckingAccess = ref(true)
const hasAdminAccess = ref(false)

onMounted(async () => {
  try {
    const accessData = await checkAccessToAdminPanel()
    if (!accessData.access_to_panel) {
      toast.error('У вас нет доступа к административной панели')
      router.push({ name: 'AccessDenied' })
      return
    }
    hasAdminAccess.value = true
  } catch (error) {
    logError('Аудит: ошибка проверки прав', error)
    router.push({ name: 'AccessDenied' })
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
  min-height: 400px;
}
</style>
