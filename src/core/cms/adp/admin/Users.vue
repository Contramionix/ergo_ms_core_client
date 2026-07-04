<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/js/utils/toast.js'
import { Settings, Upload, MailPlus, UserPlus, FilePenLine } from 'lucide-vue-next'
import DataTable from '@/components/DataTable.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import AdminUserSettingsModal from '@/core/cms/adp/admin/UsersComponent/AdminUserSettingsModal.vue'
import AdminUserCreateModal from '@/core/cms/adp/admin/UsersComponent/AdminUserCreateModal.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { formatDateShort, formatDateTime } from '@/js/utils/timeUtils.js'
import { GetAdminUsers, GetRoles, GetRoleGroupOptions, CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { presenceStore, seedFromUsers } from '@/core/cms/adp/js/presence/presenceStore.js'
import { useAdminPresenceFeed } from '@/core/cms/adp/admin/js/useAdminPresenceFeed.js'
import SelectBox from '@/components/SelectBox.vue'
import { PRESENCE_FILTER_OPTIONS } from '@/core/cms/js/adminSelectOptions.js'
import { fetchProfileSettings } from '@/core/cms/adp/js/profileSettings.js'
import { fetchAdminProfileChangeRequests } from '@/core/cms/adp/admin/js/profileChangeRequestService.js'

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
const showUserCreate = ref(false)
const selectedUserId = ref(null)

const rowsPerPage = ref(12)
const searchQuery = ref('')
const currentPage = ref(1)
const presenceFilter = ref('all')
const profileSelfEditEnabled = ref(true)
const pendingProfileChangeCount = ref(0)

const isOnlineFilter = computed(() => presenceFilter.value === 'online')

let searchDebounceTimer = null
let presenceReloadTimer = null

const schedulePresenceReload = () => {
  if (!isOnlineFilter.value) {
    return
  }
  if (presenceReloadTimer) {
    clearTimeout(presenceReloadTimer)
  }
  presenceReloadTimer = setTimeout(() => {
    loadUsers()
  }, 500)
}

watch(
  () => presenceStore.state.entries,
  (entries) => {
    if (isOnlineFilter.value) {
      const prevCount = rows.value.length
      rows.value = rows.value
        .filter((row) => {
          const status = entries[String(row.user_id)]
          return status ? status.isOnline : row.is_online
        })
        .map((row) => {
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

      if (rows.value.length !== prevCount) {
        totalUsers.value = Math.max(0, totalUsers.value - (prevCount - rows.value.length))
      }

      const rowIds = new Set(rows.value.map((row) => row.user_id))
      const hasNewOnline = Object.entries(entries).some(
        ([id, status]) => status?.isOnline && !rowIds.has(Number(id)),
      )
      if (hasNewOnline) {
        schedulePresenceReload()
      }
      return
    }

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
      online_only: isOnlineFilter.value || undefined,
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
    await Promise.all([loadRefs(), loadUsers(), loadProfileChangeMeta()])
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
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  if (presenceReloadTimer) {
    clearTimeout(presenceReloadTimer)
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

watch(presenceFilter, () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1
  }
  loadUsers()
})

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

const openUserCreate = () => {
  showUserCreate.value = true
}

const handleUserCreated = async () => {
  currentPage.value = 1
  await loadUsers()
}

const goToImport = () => {
  router.push({ name: 'ImportUsersPanel' })
}

const goToInvitations = () => {
  router.push({ name: 'InvitationsPanel' })
}

const goToProfileChangeRequests = () => {
  router.push({ name: 'ProfileChangeRequestsPanel' })
}

const loadProfileChangeMeta = async () => {
  try {
    const settings = await fetchProfileSettings(true)
    profileSelfEditEnabled.value = settings.profile_self_edit_enabled !== false
    if (!profileSelfEditEnabled.value) {
      const data = await fetchAdminProfileChangeRequests({ page: 1, page_size: 1, status: 'pending' })
      pendingProfileChangeCount.value = data.pending_count ?? 0
    } else {
      pendingProfileChangeCount.value = 0
    }
  } catch (error) {
    logError('Ошибка загрузки настроек профиля:', error)
  }
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
        <div class="table-header users-toolbar">
          <div class="filters-wrapper">
            <div class="search-wrapper">
              <label for="users-search" class="form-label mb-1">Поиск</label>
              <input
                id="users-search"
                type="search"
                class="form-control search-input"
                placeholder="Поиск по пользователям..."
                @input="handleSearchQuery($event.target.value)"
              />
            </div>
            <div class="presence-filter">
              <SelectBox
                id="users-presence-filter"
                v-model="presenceFilter"
                label="Фильтрация"
                :options="PRESENCE_FILTER_OPTIONS"
                value-key="id"
                label-key="name"
                :include-all-option="false"
                fixed-trigger-label-font-size
              />
            </div>
          </div>
          <div class="actions-wrapper">
            <button type="button" class="btn btn-primary d-flex align-items-center gap-2" @click="openUserCreate">
              <UserPlus :size="16" />
              <span>Создать пользователя</span>
            </button>
            <button type="button" class="btn btn-primary d-flex align-items-center gap-2" @click="goToInvitations">
              <MailPlus :size="16" />
              <span>Управление приглашениями</span>
            </button>
            <button
              v-if="!profileSelfEditEnabled"
              type="button"
              class="btn btn-primary d-flex align-items-center gap-2"
              @click="goToProfileChangeRequests"
            >
              <FilePenLine :size="16" />
              <span>
                Заявки на изменение данных
                <span v-if="pendingProfileChangeCount > 0">({{ pendingProfileChangeCount }})</span>
              </span>
            </button>
            <button type="button" class="btn btn-primary d-flex align-items-center gap-2" @click="goToImport">
              <Upload :size="16" />
              <span>Загрузка пользователей</span>
            </button>
          </div>
        </div>

    <LoadingContentArea :loading="isLoadingUsers">
    <DataTable :items="rows" :columns="columns" :items-per-page="rowsPerPage" :current-page="currentPage" :total-items="totalUsers" :get-item-key="getItemKey" :enable-pagination="true" @update:current-page="handlePageChange">
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
    </LoadingContentArea>

    <AdminUserSettingsModal v-model:show="showUserSettings" :user-id="selectedUserId" :roles="roles" :role-groups="roleGroups" @saved="handleUserSaved" @deleted="handleUserDeleted"/>
    <AdminUserCreateModal v-model:show="showUserCreate" :roles="roles" :role-groups="roleGroups" @created="handleUserCreated"/>
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

.filters-wrapper {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
  flex: 1 1 auto;
  min-width: 0;
}

.users-toolbar {
  align-items: flex-end;
}

.users-toolbar .actions-wrapper {
  align-items: flex-end;
}

.users-toolbar .actions-wrapper .btn {
  min-height: 38px;
}

.search-wrapper {
  flex: 1 1 220px;
  min-width: 180px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
}

.search-wrapper .search-input {
  min-height: 38px;
}

.presence-filter {
  flex: 0 1 220px;
  min-width: 180px;
}
</style>