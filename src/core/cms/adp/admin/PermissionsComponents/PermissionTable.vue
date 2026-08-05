<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { computed, ref, watch, defineAsyncComponent } from 'vue'
import { Pencil, Trash2 } from 'lucide-vue-next'
import { deletePolicy } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { matchSearchQuery } from '@/js/utils/searchQuery.js'
import { useRouteQueryState } from '@/composables/useRouteQueryState.js'
import Pagination from '@/components/Pagination.vue'
import { useBreakpoint } from '@/composables/useBreakpoint.js'

const { t } = useAppI18n()


const ChangePermissionForm = defineAsyncComponent(() =>
  import('@/core/cms/adp/admin/PermissionsComponents/SubmitPermissionChange.vue'),
)

const props = defineProps({
  headers: { type: Array, required: true },
  rows: { type: Array, required: true },
  rowsPerPage: { type: Number, default: 5 },
  searchQuery: { type: String, default: '' },
  roles: { type: Array, required: true },
  roleGroups: { type: Array, required: true },
  pages: { type: Array, default: () => [] },
  modulePageGroups: { type: Array, default: () => [] },
  moduleCatalog: { type: Array, default: () => [] },
  getPageLabel: { type: Function, default: null },
  getPageTitle: { type: Function, default: null },
})

const emit = defineEmits(['updatePermissions'])
const data = ref(props.rows)
const rowSelected = ref({})
const showEditModal = ref(false)
const { isMdUp, isLgUp, isSmUp } = useBreakpoint()
const showPolicyType = computed(() => isMdUp.value)
const showPatternPriority = computed(() => isLgUp.value)
const useCards = computed(() => !isSmUp.value)
const visibleColCount = computed(() => {
  let count = 5 // name, action, resource, target, actions
  if (showPolicyType.value) count += 1
  if (showPatternPriority.value) count += 2
  return count
})

const changingRow = (row) => {
  rowSelected.value = { ...row }
}

const openEditModal = (row) => {
  changingRow(row)
  showEditModal.value = true
}

watch(
  () => props.rows,
  (newRows) => {
    data.value = [...newRows]
  },
)

const { state: listState, patchState } = useRouteQueryState({
  q: { default: '' },
  page: { default: 1, type: 'number' },
}, { preserveKeys: ['tab'] })

const currentPage = computed(() => listState.value.page)

const goToPage = (page) => {
  patchState({ page }, { immediate: true })
}

const filteredRows = computed(() => {
  const query = props.searchQuery
  if (!String(query || '').trim()) {
    return data.value
  }

  return data.value.filter((row) => {
    const resourceLabel = resolveResourceLabel(row.resource_path)
    return matchSearchQuery(row.name, query)
      || matchSearchQuery(resourceLabel, query)
      || matchSearchQuery(row.action, query)
      || matchSearchQuery(row.target_type, query)
  })
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredRows.value.length / props.rowsPerPage))
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

const getActionBadgeClass = (action) => {
  const normalized = (action || '').toLowerCase()
  const allowLabel = t('admin.policies.allow').toLowerCase()
  const denyLabel = t('admin.policies.deny').toLowerCase()
  if (normalized === 'allow' || normalized === allowLabel) {
    return 'badge bg-success-subtle text-success'
  }
  if (normalized === 'deny' || normalized === denyLabel) {
    return 'badge bg-danger-subtle text-danger'
  }
  return 'badge bg-secondary-subtle text-secondary'
}

const resolveResourceLabel = (path) => {
  if (typeof props.getPageLabel === 'function') {
    return props.getPageLabel(path)
  }
  return path || ''
}

const resolveResourceTitle = (path) => {
  if (typeof props.getPageTitle === 'function') {
    return props.getPageTitle(path)
  }
  return ''
}
</script>

<template>
  <div v-if="useCards && paginatedRows.length" class="admin-cards">
    <article v-for="row in paginatedRows" :key="row.id" class="admin-card">
      <div class="admin-card__title">{{ row.name }}</div>
      <div class="admin-card__meta">
        <span :class="getActionBadgeClass(row.action)">{{ row.action }}</span>
        <span class="cell-muted">{{ row.role_name || row.role_group_name || '—' }}</span>
      </div>
      <div class="admin-card__resource">
        <div v-if="resolveResourceTitle(row.resource_path)" class="fw-medium">
          {{ resolveResourceTitle(row.resource_path) }}
        </div>
        <div class="text-monospace small text-muted">{{ row.resource_path }}</div>
      </div>
      <div class="d-flex align-items-center justify-content-end gap-2 admin-card__actions">
        <button type="button" class="btn btn-sm btn-icon btn-outline-primary" @click="openEditModal(row)" :title="t('admin.policies.edit')" :aria-label="t('admin.policies.edit')">
          <Pencil :size="14" aria-hidden="true" />
        </button>
        <button type="button" class="btn btn-sm btn-icon btn-outline-danger" @click="deletePermission(row.id)" :title="t('admin.policies.delete')" :aria-label="t('admin.policies.delete')">
          <Trash2 :size="14" aria-hidden="true" />
        </button>
      </div>
    </article>
  </div>
  <div v-else-if="useCards" class="text-center text-muted py-4">
    {{ t('admin.policies.emptyPolicies') }}
  </div>

  <div v-else class="table-responsive">
    <table class="permission-table">
      <thead>
        <tr>
          <th>{{ headers[0] }}</th>
          <th v-if="showPolicyType">{{ headers[1] }}</th>
          <th>{{ headers[2] }}</th>
          <th>{{ headers[3] }}</th>
          <th>{{ headers[4] }}</th>
          <th v-if="showPatternPriority">{{ headers[5] }}</th>
          <th v-if="showPatternPriority">{{ headers[6] }}</th>
          <th>{{ headers[7] }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in paginatedRows" :key="row.id">
          <td class="fw-medium">{{ row.name }}</td>
          <td v-if="showPolicyType">{{ row.policy_type }}</td>
          <td>
            <span :class="getActionBadgeClass(row.action)">{{ row.action }}</span>
          </td>
          <td>
            <div v-if="resolveResourceTitle(row.resource_path)" class="fw-medium">
              {{ resolveResourceTitle(row.resource_path) }}
            </div>
            <div class="text-monospace small text-muted">{{ row.resource_path }}</div>
          </td>
          <td>{{ row.role_name || row.role_group_name || '—' }}</td>
          <td v-if="showPatternPriority">
            <span :class="row.is_pattern ? 'badge bg-info-subtle text-info' : 'badge bg-light text-muted'">
              {{ row.is_pattern ? t('admin.policies.pattern') : t('admin.policies.exact') }}
            </span>
          </td>
          <td v-if="showPatternPriority">{{ row.priority }}</td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <button type="button" class="btn btn-sm btn-icon btn-outline-primary" @click="openEditModal(row)" :title="t('admin.policies.edit')" :aria-label="t('admin.policies.edit')">
                <Pencil :size="14" aria-hidden="true" />
              </button>
              <button type="button" class="btn btn-sm btn-icon btn-outline-danger" @click="deletePermission(row.id)" :title="t('admin.policies.delete')" :aria-label="t('admin.policies.delete')">
                <Trash2 :size="14" aria-hidden="true" />
              </button>
            </div>
          </td>
        </tr>
        <tr v-if="paginatedRows.length === 0">
          <td :colspan="visibleColCount" class="text-center text-muted py-4">
            {{ t('admin.policies.emptyPolicies') }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <Pagination
    v-if="totalPages > 1"
    :model-value="currentPage"
    :total-pages="totalPages"
    :total-items="filteredRows.length"
    :page-size="rowsPerPage"
    :visible-count="paginatedRows.length"
    variant="simple"
    layout="toolbar"
    @update:model-value="goToPage"
  />

  <ChangePermissionForm
    v-if="showEditModal"
    v-model:visible="showEditModal"
    modal-id="policyEdit"
    :row="rowSelected"
    :roles="roles"
    :role-groups="roleGroups"
    :pages="pages"
    :module-page-groups="modulePageGroups"
    :module-catalog="moduleCatalog"
    @change-permission="changePermission()"
  />
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
  min-width: 2rem;
  min-height: 2rem;
  padding: 0;

  @media (hover: none), (width < $ui-bp-sm) {
    width: 2.75rem;
    height: 2.75rem;
    min-width: 2.75rem;
    min-height: 2.75rem;
  }
}

.text-monospace {
  font-family: var(--bs-font-monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
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

  &__resource {
    min-width: 0;
  }

  &__actions {
    padding-top: 0.35rem;
    border-top: 1px solid var(--color-border);
  }
}

.cell-muted {
  color: var(--color-secondary-text);
  font-size: 0.875rem;
}

</style>
