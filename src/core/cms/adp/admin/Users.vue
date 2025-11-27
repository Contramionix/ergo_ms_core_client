<script setup>
import UserTableHeader from '@/core/cms/adp/admin/UsersComponent/UserTableHeader.vue'
import UserTable from '@/core/cms/adp/admin/UsersComponent/UserTable.vue'
import { GetAdminUsers, GetRoles, GetRoleGroups } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { ref, onMounted } from 'vue' 

const rows = ref([])
const roles = ref([])
const roleGroups = ref([])

const loadUsers = async () => {
  const users = await GetAdminUsers()
  rows.value = users.map(user => ({
    user_id: user.user_id,
    user: user.full_name || user.username,
    username: user.username,
    email: user.email,
    role: user.role,
    role_groups: user.role_groups
  }))
}

const loadRefs = async () => {
  roles.value = await GetRoles()
  roleGroups.value = await GetRoleGroups()
}

const updateUserAssignments = async () => {
  try {
    await loadUsers()
  } catch (error) {
    console.error('Error fetching users:', error)
  }
}

onMounted(async () => {
  try {
    await Promise.all([loadRefs(), loadUsers()])
  } catch (error) {
    console.error('Error fetching user data:', error)
  }
})

const rowsPerPage = ref(30)
const handleChangeRows = newRowsPerPage => (rowsPerPage.value = newRowsPerPage)

const searchQuery = ref('')
const handleSearchQuery = query => (searchQuery.value = query)
</script>

<template>
  <div class="card">
    <div class="mb-3">
      <UserTableHeader @changeRowsPerPage="handleChangeRows" @searchRowData="handleSearchQuery"/>
    </div>

    <UserTable 
      :rows="rows"
      :roles="roles"
      :roleGroups="roleGroups"
      :headers="['Пользователь', 'Роль', 'Группы', 'Действия']"
      :rowsPerPage="rowsPerPage"
      :searchQuery="searchQuery"  
      @updateUserGroupsAndPermissions="updateUserAssignments"
    />
  </div>
</template>


<style scoped lang="scss"></style>
