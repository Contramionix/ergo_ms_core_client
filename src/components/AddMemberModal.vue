<template>
  <ModalCenter standalone :visible="show" :modal-id="modalId" :title="title" :dialog-class="'modal-md'" @close="close">
    <div class="add-member-modal-content">
      <div class="pb-2 search-container">
        <div class="input-group border-0">
          <span class="input-group-text bg-transparent border-0">
            <Search :size="18" class="text-muted" />
          </span>
          <input v-model.trim="searchQuery" type="text" class="form-control border-0" placeholder="Поиск" @input="handleSearch"/>
        </div>
      </div>

      <div class="px-3 pb-2 border-bottom tabs-container">
        <div class="d-flex gap-2 tabs-scroll">
          <button v-for="tab in resolvedTabs" :key="tab.key" type="button" class="btn btn-sm border-0 px-3 py-1 filter-tab text-nowrap"
            :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="users-list-container">
        <LoadingContentArea
          :loading="isLoading"
          :reset-key="show ? `${organizationId}-${activeTab}` : null"
          min-height="10rem"
          loading-text="Загрузка пользователей..."
        >
          <div v-if="filteredUsers.length === 0" class="empty-state">
            <div class="text-muted">Пользователи не найдены</div>
          </div>

          <div v-else class="users-list">
          <div v-for="user in filteredUsers" :key="user.id" class="user-item" 
            :class="{ 
              'user-item-assigned': isAssigned(user.id),
              'user-item-selected': isSelected(user.id)
            }"
            @click="selectUser(user)"
          >
            <div class="d-flex align-items-center gap-3 p-3">
              <div class="avatar-wrapper">
                <UserAvatar :userId="user.id" :user-ref="user.public_id" :size="48" :title="user.full_name || user.username" :avatar-url="user.avatar_url" :first-name="user.first_name" :last-name="user.last_name" />
                <div v-if="isSelected(user.id) || isAssigned(user.id)" class="check-badge" :class="{ 'check-badge-assigned': isAssigned(user.id) && !isSelected(user.id) }">
                  <Check :size="12" stroke-width="3" />
                </div>
              </div>
              <div class="flex-grow-1 min-width-0">
                <div class="fw-semibold text-truncate" :class="{ 'text-primary': isSelected(user.id), 'text-success': isAssigned(user.id) && !isSelected(user.id) }">
                  {{ user.full_name || user.username }}
                </div>
                <div v-if="user.role_group_name" class="text-muted small text-truncate">{{ user.role_group_name }}</div>
                <div v-else-if="user.position" class="text-muted small text-truncate">{{ user.position }}</div>
                <div v-if="user.department_name" class="text-muted small text-truncate fst-italic">{{ user.department_name }}</div>
              </div>
            </div>
          </div>
        </div>
        </LoadingContentArea>
      </div>

      <div class="px-3 pt-2 border-top d-flex justify-content-end align-items-center buttons-container">
        <button type="button" class="btn btn-link text-primary text-decoration-none cancel-btn" @click="close">Отмена</button>
        <button v-if="hasChanges" type="button" class="btn btn-primary" @click="assignSelected">
          {{ buttonText }}
        </button>
      </div>
    </div>
  </ModalCenter>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Check } from 'lucide-vue-next'
import ModalCenter from '@/components/ModalCenter.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { useToast } from '@/js/utils/toast.js'
import { parseFullNameParts, seedUserPublicInfoCache } from '@/js/userAvatar'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Назначить эксперта'
  },
  projectId: {
    type: Number,
    default: null
  },
  organizationId: {
    type: Number,
    default: null
  },
  tabs: {
    type: Array,
    default: () => [{ key: 'all', label: 'Все' }],
  },
  assignedExpertIds: {
    type: Array,
    default: () => [],
  },
  /**
   * Режим работы модального окна:
   * - 'experts' - загрузка только экспертов с правом project_ed_expert (по умолчанию)
   * - 'members' - загрузка всех участников организации (включая подразделения)
   */
  mode: {
    type: String,
    default: 'experts',
    validator: (value) => ['experts', 'members'].includes(value)
  },
  /**
   * Массив ID пользователей, которых нужно исключить из списка доступных для выбора
   */
  excludedUserIds: {
    type: Array,
    default: () => []
  },
})

const emit = defineEmits(['close', 'selected', 'selectedMultiple', 'deselected'])

const toast = useToast()

const modalId = 'addMemberModal'

const searchQuery = ref('')
const activeTab = ref('all')
const isLoading = ref(false)
const users = ref([])
const selectedUsers = ref([])
const deselectedAssignedIds = ref(new Set())

const resolvedTabs = computed(() => {
  const raw = Array.isArray(props.tabs) ? props.tabs : []
  const hasAll = raw.some((t) => (t?.key || '') === 'all')
  return hasAll ? raw : [{ key: 'all', label: 'Все' }, ...raw]
})

const activeRoleGroupId = computed(() => {
  if (activeTab.value === 'all') return null
  const tab = resolvedTabs.value.find((t) => t?.key === activeTab.value)
  return tab?.roleGroupId ?? tab?.role_group_id ?? tab?.role_group ?? null
})

const assignedExpertIdsSet = computed(() => {
  const ids = Array.isArray(props.assignedExpertIds) ? props.assignedExpertIds : []
  return new Set(ids.map(id => Number(id)).filter(id => Number.isFinite(id)))
})

function isAssigned(userId) {
  if (!userId) return false
  const numId = Number(userId)
  if (deselectedAssignedIds.value.has(numId)) return false
  return assignedExpertIdsSet.value.has(numId)
}

function isSelected(userId) {
  if (!userId) return false
  return selectedUsers.value.some(u => u.id === userId)
}

const hasChanges = computed(() => {
  return selectedUsers.value.length > 0 || deselectedAssignedIds.value.size > 0
})

const buttonText = computed(() => {
  const selectedCount = selectedUsers.value.length
  const deselectedCount = deselectedAssignedIds.value.size
  
  if (deselectedCount > 0 && selectedCount === 0) {
    return `Изменить (${deselectedCount})`
  } else if (deselectedCount > 0 && selectedCount > 0) {
    return `Изменить (${selectedCount} + ${deselectedCount})`
  } else {
    return `Назначить (${selectedCount})`
  }
})

const excludedUserIdsSet = computed(() => {
  const ids = Array.isArray(props.excludedUserIds) ? props.excludedUserIds : []
  return new Set(ids.map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0))
})

const filteredUsers = computed(() => {
  let filtered = users.value

  // Исключаем пользователей из excludedUserIds
  if (excludedUserIdsSet.value.size > 0) {
    filtered = filtered.filter(user => {
      if (!user?.id) return true
      const userId = Number(user.id)
      return !excludedUserIdsSet.value.has(userId)
    })
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(user => {
      const fullName = (user.full_name || '').toLowerCase()
      const username = (user.username || '').toLowerCase()
      return fullName.includes(query) || username.includes(query)
    })
  }

  return filtered
})

function normalizeModalUser(raw) {
  const fullName = raw.full_name || raw.fullName || ''
  const fallbackName = fullName || raw.username || ''
  const { firstName, lastName } = parseFullNameParts(fallbackName)

  return {
    id: raw.id,
    public_id: raw.public_id ?? raw.publicId ?? null,
    username: raw.username || '',
    full_name: fallbackName,
    first_name: firstName,
    last_name: lastName,
    position: raw.position || '',
    role_group_name: raw.role_group_name || '',
    avatar_url: raw.avatar_url ?? null,
    department_name: raw.department_name || null,
  }
}

function applyLoadedUsers(list) {
  const normalized = (Array.isArray(list) ? list : []).map(normalizeModalUser)
  users.value = normalized
  seedUserPublicInfoCache(normalized)
}

/**
 * Загружает кандидатов-экспертов (режим 'experts')
 */
async function loadExpertCandidates() {
  const params = {
    organization_id: props.organizationId,
    q: searchQuery.value || '',
    limit: 200,
  }
  if (activeRoleGroupId.value) {
    params.role_group_id = activeRoleGroupId.value
  }
  const resp = await apiClient.get(endpoints.project_ed.expert_candidates.list, params)
  return resp.data?.candidates || []
}

/**
 * Загружает всех участников организации (режим 'members')
 * Включает участников из всех подразделений организации
 * Исключает всех проректоров из списка
 */
async function loadOrganizationMembers() {
  const params = {
    organization_id: props.organizationId,
    search: searchQuery.value || '',
    limit: 200,
  }
  const resp = await apiClient.get('/organizations/members/', params)
  
  // Преобразуем формат ответа под формат компонента
  const members = resp.data?.results || resp.data || []
  
  // Фильтруем проректоров - исключаем всех, у кого роль начинается с "Проректор"
  const filteredMembers = members.filter(member => {
    const roleName = (member.role?.name || '').trim()
    // Исключаем проректоров (роль начинается с "Проректор", но не "Проректор по...")
    if (roleName.toLowerCase().startsWith('проректор')) {
      return false
    }
    return true
  })
  
  return filteredMembers.map((member) => ({
    id: member.user?.id || member.id,
    username: member.user?.username || member.username || '',
    full_name: member.user?.full_name || member.full_name || '',
    position: member.role?.name || member.position || '',
    role_group_name: member.role?.name || '',
    avatar_url: member.user?.avatar_url || member.avatar_url || null,
    department_name: member.department?.name || null,
  }))
}

async function loadCandidates() {
  if (!props.organizationId) {
    logWarn('AddMemberModal: organizationId не передан')
    users.value = []
    return
  }
  try {
    isLoading.value = true

    const list = props.mode === 'members'
      ? await loadOrganizationMembers()
      : await loadExpertCandidates()

    applyLoadedUsers(list)
  } catch (e) {
    logError('Ошибка загрузки пользователей:', e)
    const msg = e.response?.data?.error || 'Ошибка загрузки пользователей'
    toast.error(msg)
    users.value = []
  } finally {
    isLoading.value = false
  }
}

function handleSearch() {
  loadCandidates()
}

function selectUser(user) {
  if (!user?.id) return
  
  const userId = user.id
  const numId = Number(userId)
  const isCurrentlyAssigned = assignedExpertIdsSet.value.has(numId)
  const isDeselected = deselectedAssignedIds.value.has(numId)
  
  if (isCurrentlyAssigned) {
    if (isDeselected) {
      deselectedAssignedIds.value.delete(numId)
    } else {
      deselectedAssignedIds.value.add(numId)
    }
    return
  }
  
  const index = selectedUsers.value.findIndex(u => u.id === userId)
  
  if (index >= 0) {
    selectedUsers.value.splice(index, 1)
  } else {
    selectedUsers.value.push(user)
  }
}

function assignSelected() {
  if (!hasChanges.value) return
  
  if (deselectedAssignedIds.value.size > 0) {
    emit('deselected', Array.from(deselectedAssignedIds.value))
  }
  
  if (selectedUsers.value.length > 0) {
    if (selectedUsers.value.length === 1) {
      emit('selected', selectedUsers.value[0])
    } else {
      emit('selectedMultiple', selectedUsers.value)
    }
  }
  
  close()
}

function close() {
  emit('close')
  searchQuery.value = ''
  activeTab.value = 'all'
  selectedUsers.value = []
  deselectedAssignedIds.value = new Set()
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    loadCandidates()
  }
}, { immediate: true })

watch(activeTab, () => {
  if (props.show) {
    loadCandidates()
  }
})

watch(resolvedTabs, () => {
  if (!resolvedTabs.value.some((t) => t?.key === activeTab.value)) {
    activeTab.value = 'all'
  }
})
</script>

<style lang="scss" scoped>
.add-member-modal-content {
  display: flex;
  flex-direction: column;
  height: 70vh;
  min-height: 600px;
  max-height: 700px;
}

.users-list-container {
  flex: 1;
  overflow-y: auto;
  height: 0;
  display: flex;
  flex-direction: column;

  .loading-state,
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
}

.users-list {
  .user-item {
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;

    &:hover {
      background-color: var(--color-hover-background);
    }

    .avatar-wrapper {
      position: relative;
      flex-shrink: 0;

      .check-badge {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 18px;
        height: 18px;
        background-color: var(--color-accent);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--bs-body-bg, #fff);
        color: #fff;

        &.check-badge-assigned {
          background-color: var(--bs-success, #198754);
        }
      }
    }

    .min-width-0 {
      min-width: 0;
    }

    .text-truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.tabs-container {
  .tabs-scroll {
    overflow-x: auto;
    scrollbar-width: thin;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      height: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--bs-gray-400, #ced4da);
      border-radius: 2px;
    }
  }
}

.filter-tab {
  background: transparent;
  color: var(--bs-body-color, #212529);
  position: relative;
  transition: color 0.15s ease-in-out;
  flex-shrink: 0;

  &:hover {
    color: var(--color-accent);
    background: transparent;
  }

  &.active {
    color: var(--color-accent);
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background-color: var(--color-accent);
    }
  }
}

.search-container {
  .input-group {
    border: none !important;
  }

  .form-control {
    background-color: var(--color-primary-background);
    border: none !important;
    border-color: transparent !important;
    box-shadow: none !important;

    &:focus {
      border: none !important;
      border-color: transparent !important;
      box-shadow: none !important;
      outline: none !important;
    }
  }

  .input-group-text {
    border: none !important;
    border-color: transparent !important;
    padding-right: 0.5rem !important;

    &:focus,
    &:focus-within {
      border: none !important;
      border-color: transparent !important;
      box-shadow: none !important;
    }
  }

  .input-group:focus-within {
    border: none !important;

    .form-control,
    .input-group-text {
      border: none !important;
      border-color: transparent !important;
      box-shadow: none !important;
      outline: none !important;
    }
  }
}

.buttons-container {
  gap: 10px;
}

.cancel-btn {
  font-weight: 600;
  transition: background-color 0.15s ease-in-out;

  &:hover {
    background-color: var(--color-secondary-background);
    text-decoration: none;
  }
}

@media (max-width: 768px) {
  .add-member-modal-content {
    height: 80vh;
    min-height: 500px;
    max-height: 600px;
  }
}
</style>

