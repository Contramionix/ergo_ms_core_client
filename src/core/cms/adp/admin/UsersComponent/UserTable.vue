<script setup>
import { computed, ref, watch } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import ChangeUserRoleForm from '@/core/cms/adp/admin/UsersComponent/SubmitUserChanges.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const props = defineProps({
  headers: { type: Array, required: true },
  rows: { type: Array, required: true },
  rowsPerPage: { type: Number, default: 5 },
  searchQuery: { type: String, default: '' },
  roles: { type: Array, default: () => [] },
  roleGroups: { type: Array, default: () => [] }
})

const emit = defineEmits(['updateUserGroupsAndPermissions'])
const data = ref(props.rows)

watch(
  () => props.rows,
  newRows => {
    data.value = [...newRows]
  }
)

const currentPage = ref(1)

const rowSelected = ref({
  user_id: 0,
  user: '',
  username: '',
  role: null,
  role_groups: []
})

const changeRow = row => {
  rowSelected.value = { ...row }
}

const filteredRows = computed(() => {
  return data.value.filter(row =>
    row.user.toLowerCase().includes(props.searchQuery.toLowerCase())
  )
})

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * props.rowsPerPage
  const end = start + props.rowsPerPage
  return filteredRows.value.slice(start, end)
})

const refreshAssignments = async () => {
  emit('updateUserGroupsAndPermissions')
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
        <tr v-for="row in paginatedRows" :key="row.user_id">
          <td>
            <div class="d-flex align-items-center gap-3">
              <UserAvatar :user-id="row.user_id" size="small" />
              <div class="d-flex flex-column">
                <span class="fw-semibold">{{ row.user }}</span>
                <small class="text-muted">{{ row.username }} · {{ row.email }}</small>
              </div>
            </div>
          </td>
          <td>{{ row.role?.name || 'Не назначена' }}</td>
          <td>
            <div class="d-flex flex-wrap gap-2">
              <small
                v-for="group in row.role_groups"
                :key="group.id"
                class="bg-primary-subtle text-primary rounded px-2 py-1"
              >
                {{ group.name }}
              </small>
              <span v-if="row.role_groups.length === 0" class="text-muted">—</span>
            </div>
          </td>
          <td>
            <div class="d-flex align-items-center flex-wrap gap-2">
              <button
                class="btn btn-sm btn-outline-primary"
                data-bs-toggle="modal"
                data-bs-target="#userRoleEdit"
                @click="changeRow(row)"
              >
                Изменить
              </button>
              <ModalCenter title="Назначение роли пользователю" modalId="userRoleEdit">
                <ChangeUserRoleForm
                  :row="rowSelected"
                  :roles="roles"
                  :roleGroups="roleGroups"
                  @changeUserGroupsAndPermissions="refreshAssignments"
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
