<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { Loader2, Settings, Upload } from 'lucide-vue-next'
import DataTable from '@/components/DataTable.vue'
import ModalCenter from '@/components/ModalCenter.vue'
import ChangeUserRoleForm from '@/core/cms/adp/admin/UsersComponent/SubmitUserChanges.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { GetAdminUsers, GetRoles, GetRoleGroupOptions, CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'

const router = useRouter()
const toast = useToast()
const rows = ref([])
const roles = ref([])
const roleGroups = ref([])
const hasAdminAccess = ref(false)
const isCheckingAccess = ref(true)

const loadUsers = async () => {
  const users = await GetAdminUsers()
  rows.value = users.map(user => ({
    user_id: user.user_id,
    user: user.full_name || user.username,
    username: user.username,
    email: user.email,
    first_name: user.first_name || null,
    last_name: user.last_name || null,
    date_joined: user.date_joined || null,
    role: user.role,
    role_groups: user.role_groups,
    avatar_url: user.avatar_url || null
  }))
}

const loadRefs = async () => {
  roles.value = await GetRoles()
  roleGroups.value = await GetRoleGroupOptions()
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
    const accessData = await CheckAccessToAdminPanel()
    if (!accessData.access_to_panel) {
      toast.error('У вас нет доступа к административной панели')
      router.push({ name: 'AccessDenied' })
      return
    }
    hasAdminAccess.value = true
    await Promise.all([loadRefs(), loadUsers()])
  } catch (error) {
    console.error('Ошибка проверки прав доступа или загрузки данных:', error)
    if (!hasAdminAccess.value) {
      toast.error('Ошибка проверки прав доступа')
      router.push({ name: 'AccessDenied' })
    }
  } finally {
    isCheckingAccess.value = false
  }
})

const rowsPerPage = ref(12)

const searchQuery = ref('')
const handleSearchQuery = query => (searchQuery.value = query)

const currentPage = ref(1)

const filteredRows = computed(() => {
  if (!searchQuery.value) {
    return rows.value
  }
  const query = searchQuery.value.toLowerCase()
  return rows.value.filter(row =>
    row.user.toLowerCase().includes(query) ||
    row.username.toLowerCase().includes(query) ||
    row.email.toLowerCase().includes(query)
  )
})

const columns = [
  { 
    key: 'user', 
    label: 'Пользователь'
  },
  { 
    key: 'date_joined', 
    label: 'Дата регистрации',
    headerStyle: { textAlign: 'center' },
    cellStyle: { textAlign: 'center' }
  },
  { 
    key: 'role', 
    label: 'Роль',
    headerStyle: { textAlign: 'center' },
    cellStyle: { textAlign: 'center' }
  },
  { 
    key: 'role_groups', 
    label: 'Группы',
    headerStyle: { textAlign: 'center' },
    cellStyle: { textAlign: 'center' }
  },
  { 
    key: 'actions', 
    label: '',
    headerStyle: { textAlign: 'right' },
    cellStyle: { textAlign: 'right' }
  }
]

const rowSelected = ref({
  user_id: 0,
  user: '',
  username: '',
  role: null,
  role_groups: []
})

const changeRow = row => {
  rowSelected.value = { ...row }
}

const refreshAssignments = async () => {
  await updateUserAssignments()
}

const goToImport = () => {
  router.push({ name: 'ImportUsersPanel' })
}

const getItemKey = (item) => item.user_id
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
    <Loader2 :size="48" class="text-primary spinner" />
  </div>
  
  <div v-else-if="hasAdminAccess" class="card">
    <div class="mb-1">
      <div class="row align-items-center gap-3 gap-sm-0">
        <div class="col-12 col-sm-auto">
          <h4 class="mb-0">Список пользователей</h4>
        </div>
        <div class="col-12 col-sm d-flex flex-wrap align-items-center justify-content-center justify-content-sm-end gap-3">
          <label class="mb-0">
            <input type="search" class="form-control" placeholder="Поиск..." @input="handleSearchQuery($event.target.value)"/>
          </label>
          <button type="button" class="btn btn-outline-primary d-inline-flex align-items-center gap-2" @click="goToImport">
            <Upload :size="18" class="flex-shrink-0" />
            <span>Импорт пользователей</span>
          </button>
        </div>
      </div>
    </div>

    <DataTable :items="filteredRows" :columns="columns" :items-per-page="rowsPerPage" :current-page="currentPage" :get-item-key="getItemKey" :enable-pagination="true" @update:current-page="currentPage = $event">
      <template #cell-user="{ item }">
        <div class="d-flex align-items-center gap-3">
          <UserAvatar :user-id="item.user_id" :custom-avatar-url="item.avatar_url" :title="item.user" :size="32" :first-name="item.first_name" :last-name="item.last_name" />
          <div class="d-flex flex-column">
            <span class="fw-semibold">{{ item.user }}</span>
            <small class="text-muted">{{ item.username }} · {{ item.email }}</small>
          </div>
        </div>
      </template>

      <template #cell-date_joined="{ item }">
        {{ item.date_joined ? new Date(item.date_joined).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—' }}
      </template>

      <template #cell-role="{ item }">
        {{ item.role?.name || 'Не назначена' }}
      </template>

      <template #cell-role_groups="{ item }">
        <div class="d-flex flex-wrap gap-2 justify-content-center">
          <small v-for="group in item.role_groups" :key="group.id" class="bg-primary-subtle text-primary rounded px-2 py-1">
            {{ group.name }}
          </small>
          <span v-if="item.role_groups.length === 0" class="text-muted">—</span>
        </div>
      </template>

      <template #cell-actions="{ item }">
        <div class="d-flex justify-content-end">
          <button class="btn btn-sm btn-settings user-action-btn" data-bs-toggle="modal" data-bs-target="#userRoleEdit" @click="changeRow(item)">
            <Settings size="18" />
          </button>
        </div>
      </template>
    </DataTable>

    <ModalCenter title="Назначение роли пользователю" modal-id="userRoleEdit">
      <ChangeUserRoleForm :row="rowSelected" :roles="roles" :role-groups="roleGroups" @change-user-groups-and-permissions="refreshAssignments"/>
    </ModalCenter>
  </div>
</template>


<style scoped lang="scss">
.spinner {
  animation: spin 1s linear infinite;
}

:deep(.table tbody tr) {
  .user-action-btn {
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  &:hover .user-action-btn {
    opacity: 1;
  }
}

.btn-settings {
  &:hover {
    background-color: var(--color-hover-background);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>