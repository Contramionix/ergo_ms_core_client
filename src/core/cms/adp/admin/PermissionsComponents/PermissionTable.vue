<script setup>
import { computed, ref, watch } from 'vue'
import { Pencil, Trash2 } from 'lucide-vue-next'
import ChangePermissionForm from '@/core/cms/adp/admin/PermissionsComponents/SubmitPermissionChange.vue'
import { deletePolicy } from '@/core/cms/adp/admin/js/adminAccessApi.js'

const props = defineProps({
  headers: { type: Array, required: true },
  rows: { type: Array, required: true },
  rowsPerPage: { type: Number, default: 5 },
  searchQuery: { type: String, default: '' },
  roles: { type: Array, required: true },
  roleGroups: { type: Array, required: true }
})

const emit = defineEmits(['updatePermissions'])
const data = ref(props.rows)
const rowSelected = ref({})
const showEditModal = ref(false)

const changingRow = row => {
  rowSelected.value = { ...row }
}

const openEditModal = row => {
  changingRow(row)
  showEditModal.value = true
}

watch(
  () => props.rows,
  newRows => {
    data.value = [...newRows]
  }
)

const currentPage = ref(1)

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

const changePermission = () => {
  emit('updatePermissions')
}

const deletePermission = async (policyId) => {
  await deletePolicy(policyId)
  emit('updatePermissions')
}

const getActionBadgeClass = action => {
  const normalized = (action || '').toLowerCase()
  if (normalized === 'allow' || normalized === 'разрешить') {
    return 'badge bg-success-subtle text-success'
  }
  if (normalized === 'deny' || normalized === 'запретить') {
    return 'badge bg-danger-subtle text-danger'
  }
  return 'badge bg-secondary-subtle text-secondary'
}
</script>

<template>
  <div class="table-responsive">
    <table class="permission-table">
      <thead>
        <tr>
          <th v-for="(header, index) in headers" :key="index">
            {{ header }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in paginatedRows" :key="row.id">
          <td class="fw-medium">{{ row.name }}</td>
          <td>{{ row.policy_type }}</td>
          <td>
            <span :class="getActionBadgeClass(row.action)">{{ row.action }}</span>
          </td>
          <td class="text-monospace small">{{ row.resource_path }}</td>
          <td>{{ row.role_name || row.role_group_name || '—' }}</td>
          <td>
            <span :class="row.is_pattern ? 'badge bg-info-subtle text-info' : 'badge bg-light text-muted'">
              {{ row.is_pattern ? 'Шаблон' : 'Точный' }}
            </span>
          </td>
          <td>{{ row.priority }}</td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <button class="btn btn-sm btn-icon btn-outline-primary" @click="openEditModal(row)" title="Изменить">
                <Pencil :size="14" />
              </button>
              <button class="btn btn-sm btn-icon btn-outline-danger" @click="deletePermission(row.id)" title="Удалить">
                <Trash2 :size="14" />
              </button>
            </div>
          </td>
        </tr>
        <tr v-if="paginatedRows.length === 0">
          <td :colspan="headers.length" class="text-center text-muted py-4">
            Политики не найдены
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <ChangePermissionForm v-model:visible="showEditModal" modal-id="policyEdit" :row="rowSelected" :roles="roles" :role-groups="roleGroups" @change-permission="changePermission()"/>
</template>

<style scoped lang="scss">
.permission-table {
  width: 100%;
  border-collapse: collapse;

  th {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-secondary-text);
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
    color: var(--color-primary-text);
    font-size: 0.875rem;
  }

  tbody tr {
    transition: background-color 0.15s ease;

    &:hover {
      background-color: var(--color-hover-background);
    }
  }
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
}

.text-monospace {
  font-family: var(--bs-font-monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
}
</style>
