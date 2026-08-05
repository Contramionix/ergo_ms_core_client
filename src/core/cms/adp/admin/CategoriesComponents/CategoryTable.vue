<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { computed, ref, watch, defineAsyncComponent } from 'vue'
import { Settings, Trash2 } from 'lucide-vue-next'
import { deleteRole } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import Pagination from '@/components/Pagination.vue'
import { useBreakpoint } from '@/composables/useBreakpoint.js'

const { t } = useAppI18n()


const ChangeCategoryForm = defineAsyncComponent(() =>
  import('@/core/cms/adp/admin/CategoriesComponents/SubmitCategoryChange.vue'),
)

const props = defineProps({
  headers: { type: Array, required: true },
  rows: { type: Array, required: true },
  rowsPerPage: { type: Number, default: 5 },
  searchQuery: { type: String, default: '' },
  serverPaginated: { type: Boolean, default: false },
  totalItems: { type: Number, default: 0 },
  currentPage: { type: Number, default: 1 },
})

const emit = defineEmits(['updateCategories', 'pageChange'])
const data = ref(props.rows)
const { isMdUp, isSmUp } = useBreakpoint()
const showDescription = computed(() => isMdUp.value)
const useCards = computed(() => !isSmUp.value)

watch(
  () => props.rows,
  newRows => {
    data.value = [...newRows]
  }
)

const currentPage = computed(() => props.currentPage)

const goToPage = (page) => {
  emit('pageChange', page)
}

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

const paginatedRows = computed(() => {
  if (props.serverPaginated) {
    return data.value
  }
  const start = (currentPage.value - 1) * props.rowsPerPage
  const end = start + props.rowsPerPage
  return data.value.slice(start, end)
})

const totalPages = computed(() => {
  const total = props.serverPaginated ? props.totalItems : data.value.length
  return Math.max(1, Math.ceil(total / props.rowsPerPage))
})

const showEditModal = ref(false)

const changeCategory = () => {
  emit('updateCategories')
}

const openEditModal = row => {
  changingRow(row)
  showEditModal.value = true
}

const removeRole = async (roleId) => {
  await deleteRole(roleId)
  emit('updateCategories')
}
</script>

<template>
  <div class="category-table">
    <div v-if="useCards && paginatedRows.length" class="admin-cards">
      <article v-for="row in paginatedRows" :key="row.id" class="admin-card">
        <div class="admin-card__title">{{ row.name }}</div>
        <div class="admin-card__meta">
          <span :class="['status-badge', row.is_system ? 'badge-system' : 'badge-regular']">
            {{ row.is_system ? t('admin.roles.system') : t('admin.roles.custom') }}
          </span>
        </div>
        <div class="actions-cell admin-card__actions">
          <button
            class="btn-action btn-action--edit"
            @click="openEditModal(row)"
            type="button"
            :aria-label="t('admin.roles.editAria')"
          >
            <Settings :size="15" />
          </button>
          <button
            class="btn-action btn-action--delete"
            :disabled="row.is_system"
            @click="removeRole(row.id)"
            type="button"
            :aria-label="t('admin.roles.deleteAria')"
          >
            <Trash2 :size="15" />
          </button>
        </div>
      </article>
    </div>

    <div v-else-if="!useCards" class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">{{ headers[0] }}</th>
            <th v-if="showDescription" scope="col">{{ headers[1] }}</th>
            <th scope="col">{{ headers[2] }}</th>
            <th scope="col">{{ headers[3] }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in paginatedRows" :key="row.id" class="table-row">
            <td>
              <span class="cell-text">{{ row.name }}</span>
            </td>
            <td v-if="showDescription">
              <span class="cell-muted">{{ row.description || '—' }}</span>
            </td>
            <td>
              <span :class="['status-badge', row.is_system ? 'badge-system' : 'badge-regular']">
                {{ row.is_system ? t('admin.roles.system') : t('admin.roles.custom') }}
              </span>
            </td>
            <td>
              <div class="actions-cell">
                <button
                  class="btn-action btn-action--edit"
                  @click="openEditModal(row)"
                  type="button"
                  :aria-label="t('admin.roles.editAria')"
                >
                  <Settings :size="15" />
                </button>
                <button
                  class="btn-action btn-action--delete"
                  :disabled="row.is_system"
                  @click="removeRole(row.id)"
                  type="button"
                  :aria-label="t('admin.roles.deleteAria')"
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
      <p class="empty-state__text">{{ t('admin.roles.empty') }}</p>
    </div>

    <Pagination
      v-if="totalPages > 1"
      :model-value="currentPage"
      :total-pages="totalPages"
      :total-items="serverPaginated ? totalItems : data.length"
      :page-size="rowsPerPage"
      :visible-count="paginatedRows.length"
      variant="simple"
      layout="toolbar"
      @update:model-value="goToPage"
    />

    <ChangeCategoryForm
      v-if="showEditModal"
      v-model:visible="showEditModal"
      modal-id="roleEdit"
      :row="rowSelected"
      @change-category="changeCategory()"
    />
  </div>
</template>

<style scoped lang="scss">
.category-table {
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

  &.badge-system {
    background-color: rgba(var(--bs-primary-rgb, 13, 110, 253), 0.1);
    color: var(--bs-primary, #0d6efd);
  }

  &.badge-regular {
    background-color: rgba(var(--bs-success-rgb, 25, 135, 84), 0.1);
    color: var(--bs-success, #198754);
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
  min-width: 2rem;
  min-height: 2rem;
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

  @media (hover: none), (width < $ui-bp-sm) {
    width: 2.75rem;
    height: 2.75rem;
    min-width: 2.75rem;
    min-height: 2.75rem;
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

.admin-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.admin-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: var(--color-primary-background);

  &__title {
    font-weight: 600;
    color: var(--color-primary-text);
    word-break: break-word;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  &__actions {
    justify-content: flex-end;
    padding-top: 0.35rem;
    border-top: 1px solid var(--color-border);
  }
}

</style>
