<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/js/utils/toast.js'
import { Settings, Upload, MailPlus, Radio } from 'lucide-vue-next'
import DataTable from '@/components/DataTable.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import AdminUserSettingsModal from '@/core/cms/adp/admin/UsersComponent/AdminUserSettingsModal.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { formatDateShort, formatDateTime } from '@/js/utils/timeUtils.js'
import { GetAdminUsers, GetRoles, GetRoleGroupOptions, CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { presenceStore, seedFromUsers } from '@/core/cms/adp/js/presence/presenceStore.js'
import { useAdminPresenceFeed } from '@/core/cms/adp/admin/js/useAdminPresenceFeed.js'

const router = useRouter()
const toast = useToast()
const { connect: connectAdminPresenceFeed, disconnect: disconnectAdminPresenceFeed } = useAdminPresenceFeed()
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

watch(
  () => presenceStore.state.entries,
  (entries) => {
    rows.value = rows.value.map((row) => {
      const status = entries[String(row.user_id)]
      if (!status) {
        return row
      }
      return {
        ...row,
        is_online: status.isOnline,
        last_seen: status.lastSeen,
      }
    })
  },
  { deep: true },
)

const mapUserToRow = (user) => ({
  user_id: user.user_id,
  user: user.full_name || user.username,
  username: user.username,
  email: user.email,
  first_name: user.first_name || null,
  last_name: user.last_name || null,
  date_joined: user.date_joined || null,
  is_online: Boolean(user.is_online),
  last_seen: user.last_seen || null,
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
    seedFromUsers(data.users || [])
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
    connectAdminPresenceFeed()
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

onUnmounted(() => {
  disconnectAdminPresenceFeed()
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
    key: 'last_activity',
    label: 'Последняя активность',
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

const goToOnline = () => {
  router.push({ name: 'OnlineUsersPanel' })
}

const getItemKey = (item) => item.user_id
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
      <SpinnerLoading color="primary" />
    </div>

    <div v-else-if="hasAdminAccess" class="admin-page">
      <div class="page-header">
        <h1 class="page-title">Пользователи</h1>
        <p class="page-subtitle">Управление учётными записями, ролями и группами пользователей системы</p>
      </div>

      <div class="content-card">
        <div class="table-header">
          <div class="search-wrapper">
            <input
              type="search"
              class="form-control search-input"
              placeholder="Поиск по пользователям..."
              @input="handleSearchQuery($event.target.value)"
            />
          </div>
          <div class="actions-wrapper">
            <button type="button" class="btn btn-primary d-flex align-items-center gap-2" @click="goToOnline">
              <Radio :size="16" />
              <span>Онлайн</span>
            </button>
            <button type="button" class="btn btn-primary d-flex align-items-center gap-2" @click="goToInvitations">
              <MailPlus :size="16" />
              <span>Приглашения</span>
            </button>
            <button type="button" class="btn btn-primary d-flex align-items-center gap-2" @click="goToImport">
              <Upload :size="16" />
              <span>Импорт пользователей</span>
            </button>
          </div>
        </div>

    <div v-if="isLoadingUsers" class="d-flex justify-content-center align-items-center py-5">
      <SpinnerLoading color="primary" />
    </div>

    <DataTable v-else :items="rows" :columns="columns" :items-per-page="rowsPerPage" :current-page="currentPage" :total-items="totalUsers" :get-item-key="getItemKey" :enable-pagination="true" @update:current-page="handlePageChange">
      <template #cell-user="{ item }">
        <div class="d-flex align-items-center gap-3">
          <UserAvatar :user-id="item.user_id" :custom-avatar-url="item.avatar_url" :title="item.user" :size="32" :first-name="item.first_name" :last-name="item.last_name" show-online-status show-presence-tooltip />
          <div class="d-flex flex-column">
            <span class="fw-semibold">{{ item.user }}</span>
            <small class="text-muted">{{ item.username }} · {{ item.email }}</small>
          </div>
        </div>
      </template>

      <template #cell-date_joined="{ item }">
        {{ item.date_joined ? formatDateShort(item.date_joined) : '—' }}
      </template>

      <template #cell-last_activity="{ item }">
        <span v-if="item.is_online" class="presence-online">В сети</span>
        <span v-else-if="item.last_seen">{{ formatDateTime(item.last_seen) }}</span>
        <span v-else class="text-muted">—</span>
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
        <div class="actions-cell">
          <button
            type="button"
            class="btn-action btn-action--edit"
            aria-label="Настройки пользователя"
            @click="openUserSettings(item)"
          >
            <Settings :size="15" />
          </button>
        </div>
      </template>
    </DataTable>

    <AdminUserSettingsModal v-model:show="showUserSettings" :user-id="selectedUserId" :roles="roles" :role-groups="roleGroups" @saved="handleUserSaved" @deleted="handleUserDeleted"/>
      </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';

.loading-container {
  min-height: 400px;
}

.presence-online {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--bs-success, #198754);
  font-weight: 500;

  &::before {
    content: '';
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: currentColor;
  }
}
</style>