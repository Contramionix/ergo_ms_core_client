<script setup>
import { computed, ref, watch } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
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

const changeGroup = () => {
  emit('updateGroups')
}

const deleteGroup = async groupId => {
  await DeleteRoleGroup(groupId)
  emit('updateGroups')
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
          <td>{{ row.parent_role_name || '—' }}</td>
          <td>{{ row.description || '—' }}</td>
          <td>
            <span :class="row.is_active ? 'badge bg-success-subtle text-success' : 'badge bg-secondary'">
              {{ row.is_active ? 'Да' : 'Нет' }}
            </span>
          </td>
          <td>
            <div class="d-flex align-items-center flex-wrap gap-2">
              <button
                class="btn btn-sm btn-outline-primary"
                data-bs-toggle="modal"
                data-bs-target="#groupEdit"
                @click="changingRow(row)"
              >
                Изменить
              </button>
              <button class="btn btn-sm btn-outline-danger" @click="deleteGroup(row.id)">
                Удалить
              </button>
              <ModalCenter title="Редактировать ролевую группу" modalId="groupEdit">
                <GroupForm @changeGroup="changeGroup()" :group="rowSelected" mode="update" />
              </ModalCenter>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss"></style>
