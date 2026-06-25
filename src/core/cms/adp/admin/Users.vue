<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { Settings, Upload, MailPlus } from 'lucide-vue-next'
import DataTable from '@/components/DataTable.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import AdminUserSettingsModal from '@/core/cms/adp/admin/UsersComponent/AdminUserSettingsModal.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { formatDateShort } from '@/js/utils/timeUtils.js'
import { GetAdminUsers, GetRoles, GetRoleGroupOptions, CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'

const router = useRouter()
const toast = useToast()
const rows = ref([])
const totalUsers = ref(0)
const roles = ref([])
const roleGroups = ref([])
const hasAdminAccess = ref(false)
const isCheckingAccess = ref(true)
const isLoadingUsers = ref(false)
const showUserSettings = ref(false)
const selectedUserId = ref(null)

const rowsPerPage = ref(12)
const searchQuery = ref('')
const currentPage = ref(1)

let searchDebounceTimer = null

const mapUserToRow = (user) => ({
  user_id: user.user_id,
  user: user.full_name || user.username,
  username: user.username,
  email: user.email,
  first_name: user.first_name || null,
  last_name: user.last_name || null,
  date_joined: user.date_joined || null,
  role: user.role,
  role_groups: user.role_groups,
  avatar_url: user.avatar_url || null,
})

const loadUsers = async () => {
  isLoadingUsers.value = true
  try {
    const data = await GetAdminUsers({
      page: currentPage.value,
      page_size: rowsPerPage.value,
      search: searchQuery.value.trim() || undefined,
    })
    rows.value = (data.users || []).map(mapUserToRow)
    totalUsers.value = data.total ?? rows.value.length
    if (data.page) {
      currentPage.value = data.page
    }
  } catch (error) {
    logError('Ошибка загрузки пользователей:', error)
    toast.error('Не удалось загрузить список пользователей')
  } finally {
    isLoadingUsers.value = false
  }
}

const loadRefs = async () => {
  roles.value = await GetRoles()
  roleGroups.value = await GetRoleGroupOptions()
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
    logError('Ошибка проверки прав доступа или загрузки данных:', error)
    if (!hasAdminAccess.value) {
      toast.error('Ошибка проверки прав доступа')
      router.push({ name: 'AccessDenied' })
    }
  } finally {
    isCheckingAccess.value = false
  }
})

const handlePageChange = (page) => {
  currentPage.value = page
  loadUsers()
}

const handleSearchQuery = (query) => {
  searchQuery.value = query
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    if (currentPage.value !== 1) {
      currentPage.value = 1
    }
    loadUsers()
  }, 300)
}

const columns = [
  {
    key: 'user',
    label: 'Пользователь',
  },
  {
    key: 'date_joined',
    label: 'Дата регистрации',
    headerStyle: { textAlign: 'center' },
    cellStyle: { textAlign: 'center' },
  },
  {
    key: 'role',
    label: 'Роль',
    headerStyle: { textAlign: 'center' },
    cellStyle: { textAlign: 'center' },
  },
  {
    key: 'role_groups',
    label: 'Группы',
    headerStyle: { textAlign: 'center' },
    cellStyle: { textAlign: 'center' },
  },
  {
    key: 'actions',
    label: '',
    headerStyle: { textAlign: 'right' },
    cellStyle: { textAlign: 'right' },
  },
]

const openUserSettings = (item) => {
  selectedUserId.value = item.user_id
  showUserSettings.value = true
}

const handleUserSaved = async () => {
  await loadUsers()
}

const handleUserDeleted = async () => {
  await loadUsers()
}

const goToImport = () => {
  router.push({ name: 'ImportUsersPanel' })
}

const goToInvitations = () => {
  router.push({ name: 'InvitationsPanel' })
}

const getItemKey = (item) => item.user_id
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
      <SpinnerLoading color="primary" />
    </div>

    <div v-else-if="hasAdminAccess" class="card">
      <div class="admin-section-header">
        <h2>Пользователи</h2>
        <p class="text-muted">Управление учётными записями, ролями и группами пользователей системы</p>
      </div>

      <div class="mb-1">
        <div class="row align-items-center gap-3 gap-sm-0">
          <div class="col-12 col-sm-auto">
            <h4 class="mb-0">Список пользователей</h4>
          </div>
          <div class="col-12 col-sm d-flex flex-wrap align-items-center justify-content-center justify-content-sm-end gap-3">
            <label class="mb-0">
              <input type="search" class="form-control" placeholder="Поиск..." @input="handleSearchQuery($event.target.value)"/>
            </label>
            <button type="button" class="btn btn-outline-primary d-inline-flex align-items-center gap-2" @click="goToInvitations">
              <MailPlus :size="18" class="flex-shrink-0" />
              <span>Приглашения</span>
            </button>
            <button type="button" class="btn btn-outline-primary d-inline-flex align-items-center gap-2" @click="goToImport">
              <Upload :size="18" class="flex-shrink-0" />
              <span>Импорт пользователей</span>
            </button>
          </div>
        </div>
      </div>

    <div v-if="isLoadingUsers" class="d-flex justify-content-center align-items-center py-5">
      <SpinnerLoading color="primary" />
    </div>

    <DataTable v-else :items="rows" :columns="columns" :items-per-page="rowsPerPage" :current-page="currentPage" :total-items="totalUsers" :get-item-key="getItemKey" :enable-pagination="true" @update:current-page="handlePageChange">
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
        {{ item.date_joined ? formatDateShort(item.date_joined) : '—' }}
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
          <button type="button" class="btn btn-sm btn-settings user-action-btn" @click="openUserSettings(item)">
            <Settings size="18" />
          </button>
        </div>
      </template>
    </DataTable>

    <AdminUserSettingsModal v-model:show="showUserSettings" :user-id="selectedUserId" :roles="roles" :role-groups="roleGroups" @saved="handleUserSaved" @deleted="handleUserDeleted"/>
  </div>
</template>

<style scoped lang="scss">
.loading-container {
  min-height: 400px;
}

.admin-section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);

  h2 {
    margin-bottom: 0.25rem;
    color: var(--color-primary-text);
    font-size: 1.5rem;
    font-weight: 600;
  }

  p {
    margin-bottom: 0;
    font-size: 0.875rem;
  }
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
</style>