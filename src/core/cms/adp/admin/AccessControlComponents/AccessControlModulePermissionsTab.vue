<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { ref, onMounted } from 'vue'
import ModulePermissionManager from '@/core/cms/adp/admin/PermissionsComponents/ModulePermissionManager.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { getRoleGroups } from '@/core/cms/adp/admin/js/adminAccessApi.js'

const { t } = useAppI18n()

const roleGroups = ref([])
const isLoading = ref(true)

onMounted(async () => {
  try {
    roleGroups.value = await getRoleGroups()
  } catch (error) {
    logError('Ошибка загрузки ролевых групп', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="d-flex flex-column gap-3">
    <p class="access-control-tab-desc mb-0">
      {{ t('admin.access.modulesTabHint1') }}
      {{ t('admin.access.modulesTabHint2') }}
      {{ t('admin.access.modulesTabHint3') }}
    </p>

    <LoadingContentArea :loading="isLoading" min-height="12rem">
      <ModulePermissionManager :role-groups="roleGroups" />
    </LoadingContentArea>
  </div>
</template>

<style scoped lang="scss">
.access-control-tab-desc {
  font-size: 0.875rem;
  color: var(--color-secondary-text);
}
</style>
