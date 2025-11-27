<script setup>
import PermissionTableHeader from '@/core/cms/adp/admin/PermissionsComponents/PermissionTableHeader.vue'
import PermissionTable from '@/core/cms/adp/admin/PermissionsComponents/PermissionTable.vue'
import ModulePermissionManager from '@/core/cms/adp/admin/PermissionsComponents/ModulePermissionManager.vue'
import { GetPolicies, GetRoles, GetRoleGroups } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { ref, onMounted } from 'vue' 

const rows = ref([])
const roles = ref([])
const roleGroups = ref([])

const loadPolicies = async () => {
  const policies = await GetPolicies()
  rows.value = policies.map(policy => ({
    id: policy.id,
    name: policy.name,
    policy_type: policy.policy_type_display,
    action: policy.action_display,
    resource_path: policy.resource_path,
    is_pattern: policy.is_pattern,
    priority: policy.priority,
    role_name: policy.role_name,
    role_group_name: policy.role_group_name,
    raw_role: policy.role,
    raw_role_group: policy.role_group
  }))
}

const updatePermissions = async () => {
  try {
    await loadPolicies()
  } catch (error) {
    console.error('Error fetching policies:', error)
  }
}

const loadRefs = async () => {
  roles.value = await GetRoles()
  roleGroups.value = await GetRoleGroups()
}

onMounted(async () => {
  try {
    await Promise.all([loadRefs(), loadPolicies()])
  } catch (error) {
    console.error('Error initializing permissions data:', error)
  }
})

const rowsPerPage = ref(30)
const handleChangeRows = newRowsPerPage => (rowsPerPage.value = newRowsPerPage)

const searchQuery = ref('')
const handleSearchQuery = query => (searchQuery.value = query)
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <div class="card">
      <div class="mb-3">
        <PermissionTableHeader
          :roles="roles"
          :roleGroups="roleGroups"
          @changeRowsPerPage="handleChangeRows"
          @searchRowData="handleSearchQuery"
          @updatePermissions="updatePermissions"
        />
      </div>

      <PermissionTable 
        :rows="rows"
        :roles="roles"
        :roleGroups="roleGroups"
        :headers="['Название','Тип политики', 'Действие', 'Ресурс', 'Цель', 'Шаблон', 'Приоритет', 'Действия']"
        :rowsPerPage="rowsPerPage"
        :searchQuery="searchQuery"  
        @updatePermissions="updatePermissions"
      />
    </div>

    <ModulePermissionManager :role-groups="roleGroups" />
  </div>
</template>


<style scoped lang="scss"></style>
