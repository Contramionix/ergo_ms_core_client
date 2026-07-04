<script setup>
import { ref, onMounted } from 'vue'
import ModulePermissionManager from '@/core/cms/adp/admin/PermissionsComponents/ModulePermissionManager.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { GetRoleGroups } from '@/core/cms/adp/admin/js/GroupsPolitics'

const roleGroups = ref([])
const isLoading = ref(true)

onMounted(async () => {
  try {
    roleGroups.value = await GetRoleGroups()
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
      Права на действия внутри модулей (просмотр, редактирование и т.п.) для ролевых групп.
      Доступ к маршрутам настраивается на вкладке «Страницы» или в «URL-политиках».
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
