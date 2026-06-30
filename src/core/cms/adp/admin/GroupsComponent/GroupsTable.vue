<script setup>
import { computed, ref, watch } from 'vue'
import { Settings, Trash2 } from 'lucide-vue-next'
import GroupForm from '@/core/cms/adp/admin/GroupsComponent/SubmitGroupsAdd.vue'
import { DeleteRoleGroup } from '@/core/cms/adp/admin/js/GroupsPolitics'

const props = defineProps({
  headers: { type: Array, required: true },
  rows: { type: Array, required: true },
  rowsPerPage: { type: Number, default: 5 },
  searchQuery: { type: String, default: '' },
})

const emit = defineEmits(['updateGroups'])
const data = ref(props.rows)

watch(
  () => props.rows,
  newRows => {
    data.value = [...newRows]
  }
)

const currentPage = ref(1)

const rowSelected = ref({
  id: null,
  name: '',
  parent_role: null,
  parent_role_name: '',
  description: '',
  is_active: true
})

const changingRow = row => {
  rowSelected.value = { ...row }
}

const filteredRows = computed(() => {
  return data.value.filter(row =>
    row.name.toLowerCase().includes(props.searchQuery.toLowerCase())
  )
})

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * props.rowsPerPage
  const end = start + props.rowsPerPage
  return filteredRows.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredRows.value.length / props.rowsPerPage)
})

const showEditModal = ref(false)

const changeGroup = () => {
  emit('updateGroups')
}

const openEditModal = row => {
  changingRow(row)
  showEditModal.value = true
}

const deleteGroup = async groupId => {
  await DeleteRoleGroup(groupId)
  emit('updateGroups')
}
</script>

<template>
  <div class="groups-table">
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th v-for="(header, index) in headers" :key="index" scope="col">
              {{ header }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in paginatedRows" :key="row.id" class="table-row">
            <td>
              <span class="cell-text">{{ row.name }}</span>
            </td>
            <td>
              <span class="cell-muted">{{ row.parent_role_name || '—' }}</span>
            </td>
            <td>
              <span class="cell-muted">{{ row.description || '—' }}</span>
            </td>
            <td>
              <span :class="['status-badge', row.is_active ? 'badge-active' : 'badge-inactive']">
                {{ row.is_active ? 'Активна' : 'Неактивна' }}
              </span>
            </td>
            <td>
              <div class="actions-cell">
                <button
                  class="btn-action btn-action--edit"
                  @click="openEditModal(row)"
                  type="button"
                  aria-label="Изменить группу"
                >
                  <Settings :size="15" />
                </button>
                <button
                  class="btn-action btn-action--delete"
                  @click="deleteGroup(row.id)"
                  type="button"
                  aria-label="Удалить группу"
                >
                  <Trash2 :size="15" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="paginatedRows.length === 0" class="empty-state">
      <p class="empty-state__text">Группы не найдены</p>
    </div>

    <div v-if="totalPages > 1" class="pagination-wrapper">
      <button
        class="btn btn-sm btn-outline-secondary"
        :disabled="currentPage <= 1"
        @click="currentPage--"
      >
        Назад
      </button>
      <span class="pagination-info">{{ currentPage }} / {{ totalPages }}</span>
      <button
        class="btn btn-sm btn-outline-secondary"
        :disabled="currentPage >= totalPages"
        @click="currentPage++"
      >
        Далее
      </button>
    </div>

    <GroupForm
      v-model:visible="showEditModal"
      modal-id="groupEdit"
      mode="update"
      :group="rowSelected"
      @change-group="changeGroup()"
    />
  </div>
</template>

<style scoped lang="scss">
.groups-table {
  .table {
    margin-bottom: 0;
    border-collapse: separate;
    border-spacing: 0;

    thead th {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--color-secondary-text);
      border-bottom: 1px solid var(--color-border);
      padding: 0.75rem 1rem;
      white-space: nowrap;
    }

    tbody .table-row {
      transition: background-color 0.15s ease;

      &:hover {
        background-color: var(--color-hover-background);
      }

      td {
        padding: 0.75rem 1rem;
        vertical-align: middle;
        border-bottom: 1px solid var(--color-border);
        font-size: 0.875rem;
      }
    }
  }
}

.cell-text {
  color: var(--color-primary-text);
  font-weight: 500;
}

.cell-muted {
  color: var(--color-secondary-text);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;

  &.badge-active {
    background-color: rgba(var(--bs-success-rgb, 25, 135, 84), 0.1);
    color: var(--bs-success, #198754);
  }

  &.badge-inactive {
    background-color: rgba(var(--bs-secondary-rgb, 108, 117, 125), 0.1);
    color: var(--bs-secondary, #6c757d);
  }
}

.actions-cell {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  color: var(--color-secondary-text);

  &:hover {
    background-color: var(--color-hover-background);
    color: var(--color-primary-text);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    &:hover {
      background: transparent;
      color: var(--color-secondary-text);
    }
  }

  &--delete:hover:not(:disabled) {
    color: var(--bs-danger, #dc3545);
    background-color: rgba(var(--bs-danger-rgb, 220, 53, 69), 0.08);
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;

  &__text {
    color: var(--color-secondary-text);
    font-size: 0.875rem;
    margin: 0;
  }
}

.pagination-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.pagination-info {
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
}
</style>
