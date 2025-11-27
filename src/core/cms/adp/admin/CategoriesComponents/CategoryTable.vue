<script setup>
import { computed, ref, watch } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import ChangeCategoryForm from '@/core/cms/adp/admin/CategoriesComponents/SubmitCategoryChange.vue'
import { DeleteRole } from '@/core/cms/adp/admin/js/GroupsPolitics'

const props = defineProps({
  headers: { type: Array, required: true },
  rows: { type: Array, required: true },
  rowsPerPage: { type: Number, default: 5 },
  searchQuery: { type: String, default: '' },
})

const emit = defineEmits(['updateCategories'])
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
  role_type: 'user',
  description: '',
  is_system: false
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

const changeCategory = () => {
  emit('updateCategories')
}

const deleteRole = async (roleId) => {
  await DeleteRole(roleId)
  emit('updateCategories')
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
          <td>{{ row.role_type_display }}</td>
          <td>{{ row.description || '—' }}</td>
          <td>
            <span
              :class="row.is_system ? 'badge bg-secondary' : 'badge bg-success-subtle text-success'"
            >
              {{ row.is_system ? 'Да' : 'Нет' }}
            </span>
          </td>
          <td>
            <div class="d-flex align-items-center flex-wrap gap-2">
              <button
                class="btn btn-sm btn-outline-primary"
                data-bs-toggle="modal"
                data-bs-target="#roleEdit"
                @click="changingRow(row)"
              >
                Изменить
              </button>
              <button
                class="btn btn-sm btn-outline-danger"
                :disabled="row.is_system"
                @click="deleteRole(row.id)"
              >
                Удалить
              </button>
              <ModalCenter title="Редактировать роль" modalId="roleEdit">
                <ChangeCategoryForm @changeCategory="changeCategory()" :row="rowSelected" />
              </ModalCenter>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss"></style>
