<script setup>
import { computed, ref, watch } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import ChangePermissionForm from '@/core/cms/adp/admin/PermissionsComponents/SubmitPermissionChange.vue'
import { DeletePolicy } from '@/core/cms/adp/admin/js/GroupsPolitics'

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

const changingRow = row => {
  rowSelected.value = { ...row }
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
  await DeletePolicy(policyId)
  emit('updatePermissions')
}
</script>

<template>
  <div class="table-responsive">
    <table class="table table-hover">
      <thead>
        <tr>
          <th v-for="(header, index) in headers" :key="index" scope="col" class="fw-bold">
            {{ header }}
          </th>
        </tr>
      </thead>
      <tbody class="table-group-divider">
        <tr v-for="row in paginatedRows" :key="row.id">
          <td>{{ row.name }}</td>
          <td>{{ row.policy_type }}</td>
          <td>{{ row.action }}</td>
          <td>{{ row.resource_path }}</td>
          <td>{{ row.role_name || row.role_group_name || '—' }}</td>
          <td>
            <span :class="row.is_pattern ? 'badge bg-info-subtle text-info' : 'badge bg-light text-muted'">
              {{ row.is_pattern ? 'Да' : 'Нет' }}
            </span>
          </td>
          <td>{{ row.priority }}</td>
          <td>
            <div class="d-flex align-items-center flex-wrap gap-2">
              <button
                class="btn btn-sm btn-outline-primary"
                data-bs-toggle="modal"
                data-bs-target="#policyEdit"
                @click="changingRow(row)"
              >
                Изменить
              </button>
              <button class="btn btn-sm btn-outline-danger" @click="deletePermission(row.id)">
                Удалить
              </button>
              <ModalCenter title="Редактировать политику" modalId="policyEdit">
                <ChangePermissionForm
                  :row="rowSelected"
                  :roles="roles"
                  :roleGroups="roleGroups"
                  @changePermission="changePermission()"
                />
              </ModalCenter>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss"></style>