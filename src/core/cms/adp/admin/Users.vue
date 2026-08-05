<script setup>
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useRouteQueryState } from '@/composables/useRouteQueryState.js'
import { useToast } from '@/js/utils/toast.js'
import { Settings, Upload, MailPlus, UserPlus, FilePenLine } from 'lucide-vue-next'
import DataTable from '@/components/DataTable.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { formatDateShort, formatDateTime } from '@/js/utils/timeUtils.js'
import { getAdminUsers, getRoles, getRoleGroupOptions, checkAccessToAdminPanel } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { presenceStore, seedFromUsers } from '@/core/cms/adp/js/presence/presenceStore.js'
import { useAdminPresenceFeed } from '@/core/cms/adp/admin/js/useAdminPresenceFeed.js'
import SelectBox from '@/components/SelectBox.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import SearchInput from '@/components/SearchInput.vue'
import { getPresenceFilterOptions } from '@/core/cms/js/adminSelectOptions.js'
import { fetchProfileSettings } from '@/core/cms/adp/js/profileSettings.js'
import { fetchAdminProfileChangeRequests } from '@/core/cms/adp/admin/js/profileChangeRequestService.js'
import { accessDeniedState } from '@/js/accessDeniedState'
import { tGlobal } from '@/i18n/index.js'
import { prefetchRouteByName } from '@/js/utils/prefetchRoute.js'

const AdminUserSettingsModal = defineAsyncComponent(() =>
  import('@/core/cms/adp/admin/UsersComponent/AdminUserSettingsModal.vue'),
)
const AdminUserCreateModal = defineAsyncComponent(() =>
  import('@/core/cms/adp/admin/UsersComponent/AdminUserCreateModal.vue'),
)

const router = useRouter()
const toast = useToast()

const breadcrumbItems = computed(() => [
  { label: tGlobal('admin.users.breadcrumb') },
])

const presenceFilterOptions = computed(() => getPresenceFilterOptions())

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
const selectedUserRef = ref(null)

const rowsPerPage = ref(12)
const profileSelfEditEnabled = ref(true)

const { state: listState, patchState, watchState } = useRouteQueryState({
  q: { default: '' },
  page: { default: 1, type: 'number' },
  presence: { default: 'all', enum: ['all', 'online', 'offline'] },
}, { debounceKeys: ['q'] })

const searchQuery = computed(() => listState.value.q)
const currentPage = computed(() => listState.value.page)
const presenceFilter = computed({
  get: () => listState.value.presence,
  set: (value) => {
    patchState({ presence: value }, { immediate: true })
  },
})
const pendingProfileChangeCount = ref(0)
const isQueryWatchReady = ref(false)

const isOnlineFilter = computed(() => presenceFilter.value === 'online')

const profileChangeRequestsTooltip = computed(() => {
  const label = tGlobal('admin.users.profileChangeLink')
  const count = pendingProfileChangeCount.value
  return count > 0 ? `${label} (${count})` : label
})

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
    const statusFor = (row) => (row.public_id ? entries[String(row.public_id)] : null)

    if (isOnlineFilter.value) {
      const prevCount = rows.value.length
      rows.value = rows.value
        .filter((row) => {
          const status = statusFor(row)
          return status ? status.isOnline : row.is_online
        })
        .map((row) => {
          const status = statusFor(row)
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

      const rowIds = new Set(
        rows.value.map((row) => row.public_id).filter(Boolean).map(String),
      )
      const hasNewOnline = Object.entries(entries).some(
        ([id, status]) => status?.isOnline && !rowIds.has(String(id)),
      )
      if (hasNewOnline) {
        schedulePresenceReload()
      }
      return
    }

    rows.value = rows.value.map((row) => {
      const status = statusFor(row)
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
  public_id: user.public_id ?? null,
  user: user.full_name || user.username,
  username: user.username,
  email: user.email,
  first_name: user.first_name || null,
  last_name: user.last_name || null,
  date_joined: user.date_joined || null,
  is_active: user.is_active !== false,
  is_online: Boolean(user.is_online),
  last_seen: user.last_seen || null,
  role: user.role,
  role_groups: user.role_groups,
  avatar_url: user.avatar_url || null,
})

const loadUsers = async () => {
  isLoadingUsers.value = true
  try {
    const data = await getAdminUsers({
      page: currentPage.value,
      page_size: rowsPerPage.value,
      q: searchQuery.value.trim() || undefined,
      online_only: isOnlineFilter.value || undefined,
    })
    rows.value = (data.users || []).map(mapUserToRow)
    seedFromUsers(data.users || [])
    totalUsers.value = data.total ?? rows.value.length
    if (data.page && data.page !== listState.value.page) {
      await patchState({ page: data.page }, { immediate: true, silent: true })
    }
  } catch (error) {
    logError('Ошибка загрузки пользователей:', error)
    toast.error(tGlobal('admin.users.loadError'))
  } finally {
    isLoadingUsers.value = false
  }
}

const loadRefs = async () => {
  const [nextRoles, nextRoleGroups] = await Promise.all([
    getRoles(),
    getRoleGroupOptions(),
  ])
  roles.value = nextRoles
  roleGroups.value = nextRoleGroups
}

onMounted(async () => {
  try {
    const accessData = await checkAccessToAdminPanel()
    if (!accessData.access_to_panel) {
      toast.error(tGlobal('admin.users.noAdminAccess'))
      accessDeniedState.active = true
      accessDeniedState.title = tGlobal('admin.access.deniedTitle')
      accessDeniedState.message = tGlobal('admin.access.adminRequired')
      return
    }
    hasAdminAccess.value = true
    isCheckingAccess.value = false
    // Prefetch чанка модалки пока грузится список — открытие пользователя без waterfall.
    void import('@/core/cms/adp/admin/UsersComponent/AdminUserSettingsModal.vue')
    await Promise.all([loadRefs(), loadUsers(), loadProfileChangeMeta()])
    connectAdminPresenceFeed()
  } catch (error) {
    logError('Ошибка проверки прав доступа или загрузки данных:', error)
    if (!hasAdminAccess.value) {
      toast.error(tGlobal('admin.users.accessCheckError'))
      accessDeniedState.active = true
      accessDeniedState.title = tGlobal('admin.access.deniedTitle')
      accessDeniedState.message = tGlobal('admin.users.accessCheckFailed')
    }
  } finally {
    isQueryWatchReady.value = true
  }
})

onUnmounted(() => {
  disconnectAdminPresenceFeed()
  if (presenceReloadTimer) {
    clearTimeout(presenceReloadTimer)
  }
})

watchState(() => {
  if (!isQueryWatchReady.value || !hasAdminAccess.value) {
    return
  }
  loadUsers()
})

const handlePageChange = (page) => {
  patchState({ page: Number(page) }, { immediate: true })
}

const handleSearchQuery = (query) => {
  patchState({ q: query })
}

const columns = computed(() => [
  {
    key: 'user',
    label: tGlobal('admin.users.colUser'),
  },
  {
    key: 'date_joined',
    label: tGlobal('admin.users.colRegistered'),
    headerStyle: { textAlign: 'center' },
    cellStyle: { textAlign: 'center' },
    hideBelow: 'md',
  },
  {
    key: 'last_activity',
    label: tGlobal('admin.users.colLastActive'),
    headerStyle: { textAlign: 'center' },
    cellStyle: { textAlign: 'center' },
    hideBelow: 'lg',
  },
  {
    key: 'role',
    label: tGlobal('admin.users.colRole'),
    headerStyle: { textAlign: 'center' },
    cellStyle: { textAlign: 'center' },
  },
  {
    key: 'role_groups',
    label: tGlobal('admin.users.colGroups'),
    headerStyle: { textAlign: 'center' },
    cellStyle: { textAlign: 'center' },
    hideBelow: 'md',
  },
  {
    key: 'actions',
    label: '',
    headerStyle: { textAlign: 'right' },
    cellStyle: { textAlign: 'right' },
  },
])

const openUserSettings = (item) => {
  if (!item?.public_id) {
    toast.error(tGlobal('admin.users.openSettingsMissingId'))
    return
  }
  selectedUserRef.value = item.public_id
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
  if (listState.value.page !== 1) {
    await patchState({ page: 1 }, { immediate: true })
  } else {
    await loadUsers()
  }
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

function prefetchAdminRoute(name) {
  prefetchRouteByName(router, name)
}

function prefetchUserCreateModal() {
  void import('@/core/cms/adp/admin/UsersComponent/AdminUserCreateModal.vue')
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

function formatRoleGroupsTooltip(groups) {
  if (!groups?.length) return ''
  return groups.map((group) => group.name).join(', ')
}

const getItemKey = (item) => item.user_id
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
      <SpinnerLoading color="primary" />
    </div>

    <div v-else-if="hasAdminAccess" class="admin-page">
      <div class="page-header">
        <h1 class="page-title">{{ tGlobal('admin.users.title') }}</h1>
        <p class="page-subtitle">{{ tGlobal('admin.users.subtitle') }}</p>
      </div>

      <div class="users-shell">
        <Breadcrumbs :items="breadcrumbItems" trailing-separator class="users-breadcrumbs" />

        <div class="content-card">
        <div class="table-header users-toolbar">
          <div class="filters-wrapper">
            <SearchInput id="users-search" :model-value="searchQuery" layout="fixed" :placeholder="tGlobal('admin.users.search')" :show-icon="true" background="primary" focus-border="primary" @update:model-value="handleSearchQuery"/>
            <div class="presence-filter">
              <HoverTooltip :text="tGlobal('admin.users.filterTooltip')">
                <SelectBox id="users-presence-filter" v-model="presenceFilter" :options="presenceFilterOptions" value-key="id" label-key="name" :include-all-option="false"/>
              </HoverTooltip>
            </div>
          </div>
          <div class="actions-wrapper">
            <HoverTooltip :text="tGlobal('admin.users.createTooltip')">
              <button type="button" class="btn users-toolbar-icon-btn" :aria-label="tGlobal('admin.users.createTooltip')" @mouseenter="prefetchUserCreateModal" @focus="prefetchUserCreateModal" @click="openUserCreate">
                <UserPlus :size="20" aria-hidden="true" />
              </button>
            </HoverTooltip>
            <HoverTooltip :text="tGlobal('admin.users.invitationsTooltip')">
              <button type="button" class="btn users-toolbar-icon-btn" :aria-label="tGlobal('admin.users.invitationsTooltip')" @mouseenter="prefetchAdminRoute('InvitationsPanel')" @focus="prefetchAdminRoute('InvitationsPanel')" @click="goToInvitations">
                <MailPlus :size="20" aria-hidden="true" />
              </button>
            </HoverTooltip>
            <HoverTooltip v-if="!profileSelfEditEnabled" :text="profileChangeRequestsTooltip">
              <button type="button" class="btn users-toolbar-icon-btn" :aria-label="profileChangeRequestsTooltip" @mouseenter="prefetchAdminRoute('ProfileChangeRequestsPanel')" @focus="prefetchAdminRoute('ProfileChangeRequestsPanel')" @click="goToProfileChangeRequests">
                <FilePenLine :size="20" aria-hidden="true" />
              </button>
            </HoverTooltip>
            <HoverTooltip :text="tGlobal('admin.users.importTooltip')">
              <button type="button" class="btn users-toolbar-icon-btn" :aria-label="tGlobal('admin.users.importTooltip')" @mouseenter="prefetchAdminRoute('ImportUsersPanel')" @focus="prefetchAdminRoute('ImportUsersPanel')" @click="goToImport">
                <Upload :size="20" aria-hidden="true" />
              </button>
            </HoverTooltip>
          </div>
        </div>

    <LoadingContentArea :loading="isLoadingUsers">
    <DataTable :items="rows" :columns="columns" :items-per-page="rowsPerPage" :current-page="currentPage" :total-items="totalUsers" :get-item-key="getItemKey" :enable-pagination="true" @update:current-page="handlePageChange">
      <template #cell-user="{ item }">
        <div class="d-flex align-items-center gap-3">
          <UserAvatar :user-ref="item.public_id" :custom-avatar-url="item.avatar_url" :title="item.user" :size="32" :first-name="item.first_name" :last-name="item.last_name" show-online-status show-presence-tooltip />
          <div class="d-flex flex-column">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span class="fw-semibold">{{ item.user }}</span>
              <span v-if="!item.is_active" class="user-status-badge user-status-badge--suspended">{{ tGlobal('admin.users.suspended') }}</span>
            </div>
            <small class="text-muted">{{ item.username }} · {{ item.email }}</small>
          </div>
        </div>
      </template>

      <template #cell-date_joined="{ item }">
        {{ item.date_joined ? formatDateShort(item.date_joined) : '—' }}
      </template>

      <template #cell-last_activity="{ item }">
        <span v-if="item.is_online" class="presence-online">{{ tGlobal('admin.users.presenceOnline') }}</span>
        <span v-else-if="item.last_seen">{{ formatDateTime(item.last_seen) }}</span>
        <span v-else class="text-muted">—</span>
      </template>

      <template #cell-role="{ item }">
        {{ item.role?.name || tGlobal('admin.users.roleUnassigned') }}
      </template>

      <template #cell-role_groups="{ item }">
        <span v-if="!item.role_groups?.length" class="text-muted">—</span>
        <HoverTooltip v-else wrap :text="formatRoleGroupsTooltip(item.role_groups)">
          <span class="role-groups-count" :aria-label="formatRoleGroupsTooltip(item.role_groups)">
            {{ item.role_groups.length }}
          </span>
        </HoverTooltip>
      </template>

      <template #cell-actions="{ item }">
        <div class="actions-cell">
          <button type="button" class="btn-action btn-action--edit" :aria-label="tGlobal('admin.users.settingsAria')" @click="openUserSettings(item)">
            <Settings :size="15" />
          </button>
        </div>
      </template>
    </DataTable>
    </LoadingContentArea>

    <AdminUserSettingsModal v-if="showUserSettings" v-model:show="showUserSettings" :user-ref="selectedUserRef" :roles="roles" :role-groups="roleGroups" @saved="handleUserSaved" @deleted="handleUserDeleted"/>
    <AdminUserCreateModal v-if="showUserCreate" v-model:show="showUserCreate" :roles="roles" :role-groups="roleGroups" @created="handleUserCreated"/>
        </div>
      </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';

.loading-container {
  min-height: min(400px, 50dvh);
}

.users-shell {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

:deep(.users-breadcrumbs) {
  margin-bottom: 0;
}

.role-groups-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.25rem;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  background: var(--bs-secondary-bg-subtle, var(--color-secondary-background));
  color: var(--color-primary-text);
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
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 0.75rem;

  .filters-wrapper {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) 220px;
    gap: 0.75rem;
    min-width: 0;
  }

  .presence-filter {
    width: 220px;
  }

  @media (width < $ui-bp-md) {
    grid-template-columns: 1fr;

    .filters-wrapper {
      grid-template-columns: 1fr;
    }

    .presence-filter {
      width: 100%;
      max-width: none;
    }

    .actions-wrapper {
      width: 100%;
      justify-content: flex-start;
    }
  }
}

.users-toolbar .actions-wrapper {
  align-items: flex-end;
  flex-shrink: 0;

  :deep(.hover-tooltip) {
    flex: 0 0 auto;
  }
}

.users-toolbar-icon-btn {
  display: inline-flex;
  background-color: transparent;
  border-radius: 1.5rem;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  padding: 0;

  &:hover {
    background-color: var(--color-hover-background);
  }

  @media (width < $ui-bp-md) {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
  }
}

.presence-filter {
  width: 220px;
  max-width: 220px;
  box-sizing: border-box;

  @media (width < $ui-bp-md) {
    width: 100%;
    max-width: none;
  }

  :deep(.hover-tooltip) {
    display: contents;
  }

  :deep(.select-box),
  :deep(.dropdown) {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  :deep(.select-trigger) {
    display: flex;
    width: 100%;
    max-width: 100%;
    min-height: 38px;
    box-sizing: border-box;
  }
}

.user-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1.2;

  &--suspended {
    color: var(--bs-warning-text-emphasis, #997404);
    background: color-mix(in srgb, var(--bs-warning, #ffc107) 18%, transparent);
  }
}
</style>