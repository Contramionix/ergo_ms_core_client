<!--
  MemberPickerModal — универсальная UI-оболочка multi-select выбора пользователей.
  Загрузка данных — через prop fetchUsers (доменная логика в модулях).
  Не путать с organizations/client/components/AddMemberModal.vue (форма участника организации).
-->
<template>
  <ModalCenter standalone :visible="show" :modal-id="modalId" :title="title" :dialog-class="'modal-md'" @close="close">
    <div class="member-picker-modal-content">
      <div class="pb-2 search-container">
        <SearchInput v-model="searchQuery" placeholder="Поиск" :show-icon="true" @update:model-value="handleSearch"/>
      </div>

      <div v-if="resolvedTabs.length > 1" class="px-3 pb-2 border-bottom tabs-container">
        <div class="d-flex gap-2 tabs-scroll">
          <button v-for="tab in resolvedTabs" :key="tab.key" type="button" class="btn btn-sm border-0 px-3 py-1 filter-tab text-nowrap"
            :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="users-list-container">
        <LoadingContentArea :loading="isLoading" :reset-key="show ? listResetKey ?? activeTab : null" min-height="10rem" loading-text="Загрузка пользователей...">
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
                <UserAvatar :user-ref="user.public_id" :size="48" :title="user.full_name || user.username" :avatar-url="user.avatar_url" :first-name="user.first_name" :last-name="user.last_name" />
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
import { Check } from 'lucide-vue-next'
import ModalCenter from '@/components/ModalCenter.vue'
import SearchInput from '@/components/SearchInput.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { useToast } from '@/js/utils/toast.js'
import { logError, logWarn } from '@/js/utils/logError.js'
import { parseFullNameParts, seedUserPublicInfoCache } from '@/js/userAvatar'

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Назначить',
  },
  tabs: {
    type: Array,
    default: () => [{ key: 'all', label: 'Все' }],
  },
  assignedUserIds: {
    type: Array,
    default: () => [],
  },
  excludedUserIds: {
    type: Array,
    default: () => [],
  },
  listResetKey: {
    type: [String, Number],
    default: null,
  },
  fetchUsers: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['close', 'selected', 'selectedMultiple', 'deselected'])

const toast = useToast()

const modalId = 'memberPickerModal'

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

const assignedUserIdsSet = computed(() => {
  const ids = Array.isArray(props.assignedUserIds) ? props.assignedUserIds : []
  return new Set(ids.map(id => Number(id)).filter(id => Number.isFinite(id)))
})

function isAssigned(userId) {
  if (!userId) return false
  const numId = Number(userId)
  if (deselectedAssignedIds.value.has(numId)) return false
  return assignedUserIdsSet.value.has(numId)
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
  if (excludedUserIdsSet.value.size === 0) {
    return users.value
  }
  return users.value.filter(user => {
    if (!user?.id) return true
    const userId = Number(user.id)
    return !excludedUserIdsSet.value.has(userId)
  })
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

async function loadCandidates() {
  if (typeof props.fetchUsers !== 'function') {
    logWarn('MemberPickerModal: fetchUsers не передан')
    users.value = []
    return
  }
  try {
    isLoading.value = true
    const list = await props.fetchUsers({
      search: searchQuery.value || '',
      activeTab: activeTab.value,
      roleGroupId: activeRoleGroupId.value,
    })
    applyLoadedUsers(list)
  } catch (e) {
    logError('Ошибка загрузки пользователей:', e)
    const msg = e.response?.data?.error || e.message || 'Ошибка загрузки пользователей'
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
  const isCurrentlyAssigned = assignedUserIdsSet.value.has(numId)
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
.member-picker-modal-content {
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
  :deep(.search-input) {
    --search-input-border-radius: 0;
    --search-input-height: 38px;
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
  .member-picker-modal-content {
    height: 80vh;
    min-height: 500px;
    max-height: 600px;
  }
}
</style>
