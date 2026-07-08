<script setup>
import { ref, onMounted } from 'vue'
import ModulePermissionManager from '@/core/cms/adp/admin/PermissionsComponents/ModulePermissionManager.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { getRoleGroups } from '@/core/cms/adp/admin/js/adminAccessApi.js'

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
      Права на действия внутри модулей для ролевых групп. Список модулей формируется автоматически
      из папки modules/ — для любого модуля можно добавить права вручную или выбрать из каталога модуля.
      Доступ к маршрутам настраивается на вкладке «Доступ к маршрутам».
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
