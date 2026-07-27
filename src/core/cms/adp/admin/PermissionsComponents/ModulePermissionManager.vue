<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { ref, computed, watch, onMounted } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import SelectBox from '@/components/SelectBox.vue'
import {
  getModulePermissions,
  createModulePermission,
  deleteModulePermission,
  getModuleCatalog,
} from '@/core/cms/adp/admin/js/adminAccessApi.js'
import {
  mapRoleGroupSelectOptions,
  mapModuleCatalogSelectOptions,
  mapModulePermissionSelectOptions,
} from '@/core/cms/js/adminSelectOptions.js'

const { t } = useAppI18n()

const props = defineProps({
  roleGroups: { type: Array, required: true }
})

const permissions = ref([])
const moduleCatalog = ref([])
const selectedRoleGroup = ref(null)

const form = ref({
  module_name: '',
  permission_key: '',
  permission_name: '',
  role_group: null,
  is_granted: true,
  description: ''
})

const roleGroupSelectOptions = computed(() =>
  mapRoleGroupSelectOptions(props.roleGroups, { withParent: false }),
)

const moduleSelectOptions = computed(() =>
  mapModuleCatalogSelectOptions(moduleCatalog.value),
)

const selectedModuleEntry = computed(() =>
  moduleCatalog.value.find((item) => item.module_name === form.value.module_name) || null,
)

const permissionSelectOptions = computed(() => {
  const permissionsMap = selectedModuleEntry.value?.permissions || {}
  return mapModulePermissionSelectOptions(permissionsMap)
})

const useCustomPermissionKey = ref(false)

const canPickPermissionFromCatalog = computed(
  () => permissionSelectOptions.value.length > 0 && !useCustomPermissionKey.value,
)

const showErrors = ref({
  module_name: false,
  permission_key: false,
  permission_name: false,
  role_group: false
})

const loadModuleCatalog = async () => {
  const data = await getModuleCatalog()
  moduleCatalog.value = Array.isArray(data?.modules) ? data.modules : []
}

const loadPermissions = async () => {
  const roleGroupId = selectedRoleGroup.value || null
  const data = await getModulePermissions(roleGroupId)
  permissions.value = Array.isArray(data) ? data : (data.results || [])
}

watch(selectedRoleGroup, async () => {
  await loadPermissions()
})

watch(
  () => form.value.module_name,
  () => {
    form.value.permission_key = ''
    form.value.permission_name = ''
    useCustomPermissionKey.value = false
  },
)

watch(
  () => form.value.permission_key,
  (key) => {
    const permissionsMap = selectedModuleEntry.value?.permissions || {}
    if (key && permissionsMap[key]) {
      form.value.permission_name = permissionsMap[key]
    }
  },
)

const submitForm = async () => {
  showErrors.value = {
    module_name: !form.value.module_name.trim(),
    permission_key: !form.value.permission_key.trim(),
    permission_name: !form.value.permission_name.trim(),
    role_group: !form.value.role_group
  }

  if (
    showErrors.value.module_name ||
    showErrors.value.permission_key ||
    showErrors.value.permission_name ||
    showErrors.value.role_group
  ) {
    return
  }

  await createModulePermission({
    module_name: form.value.module_name.trim(),
    permission_key: form.value.permission_key.trim(),
    permission_name: form.value.permission_name.trim(),
    description: form.value.description,
    role_group: form.value.role_group,
    is_granted: form.value.is_granted
  })

  await loadPermissions()
  await loadModuleCatalog()
  form.value = {
    module_name: '',
    permission_key: '',
    permission_name: '',
    role_group: null,
    is_granted: true,
    description: ''
  }
}

const deletePermission = async permissionId => {
  await deleteModulePermission(permissionId)
  await loadPermissions()
}

const filteredPermissions = computed(() => permissions.value)

onMounted(async () => {
  await Promise.all([loadModuleCatalog(), loadPermissions()])
})
</script>

<template>
  <div class="module-permission-manager">
    <div class="module-permission-manager__header">
      <div>
        <h5 class="mb-0">{{ t('admin.modulePermissions.title') }}</h5>
        <small class="text-secondary-custom">{{ t('admin.modulePermissions.subtitle') }}</small>
      </div>
      <SelectBox
        v-model="selectedRoleGroup"
        :options="roleGroupSelectOptions"
        value-key="id"
        label-key="name"
        :all-label="t('admin.modulePermissions.allGroups')"
        cast-to-number :full-width="false"
      />
    </div>

    <div class="module-permission-manager__body">
      <form class="module-permission-manager__form" @submit.prevent="submitForm">
        <div class="row g-2">
          <div class="col-md-3">
            <SelectBox
              v-model="form.module_name"
              :options="moduleSelectOptions"
              value-key="id"
              label-key="name"
              :all-label="t('admin.modulePermissions.module')"
              searchable
              :include-all-option="false"
              :class="{ 'is-invalid': showErrors.module_name }"
            />
            <div v-if="showErrors.module_name" class="invalid-feedback d-block">{{ t('admin.modulePermissions.selectModuleRequired') }}</div>
          </div>
          <div class="col-md-3">
            <SelectBox
              v-if="canPickPermissionFromCatalog"
              v-model="form.permission_key"
              :options="permissionSelectOptions"
              value-key="id"
              label-key="name"
              :all-label="t('admin.modulePermissions.permissionKey')"
              searchable
              :include-all-option="false"
              :class="{ 'is-invalid': showErrors.permission_key }"
            />
            <input
              v-else
              type="text"
              class="form-control form-control-sm"
              v-model="form.permission_key"
              :class="{ 'is-invalid': showErrors.permission_key }"
              :placeholder="t('admin.modulePermissions.keyPlaceholder')"
            />
            <div v-if="showErrors.permission_key" class="invalid-feedback d-block">{{ t('admin.modulePermissions.keyRequiredShort') }}</div>
            <button
              v-if="permissionSelectOptions.length > 0"
              type="button"
              class="btn btn-link btn-sm px-0 mt-1 module-permission-manager__toggle-key"
              @click="useCustomPermissionKey = !useCustomPermissionKey"
            >
              {{ useCustomPermissionKey ? t('admin.modulePermissions.chooseFromList') : t('admin.modulePermissions.enterNewKey') }}
            </button>
          </div>
          <div class="col-md-3">
            <input
              type="text"
              class="form-control form-control-sm"
              v-model="form.permission_name"
              :class="{ 'is-invalid': showErrors.permission_name }"
              :placeholder="t('admin.modulePermissions.namePlaceholder')"
              :readonly="canPickPermissionFromCatalog && !!form.permission_key"
            />
            <div v-if="showErrors.permission_name" class="invalid-feedback">{{ t('admin.modulePermissions.nameRequiredShort') }}</div>
          </div>
          <div class="col-md-3">
            <SelectBox
              v-model="form.role_group"
              :options="roleGroupSelectOptions"
              value-key="id"
              label-key="name"
              :all-label="t('admin.modulePermissions.group')"
              cast-to-number />
            <div v-if="showErrors.role_group" class="invalid-feedback d-block">{{ t('admin.modulePermissions.selectGroupRequired') }}</div>
          </div>
        </div>
        <div class="row g-2 mt-1">
          <div class="col-md-6">
            <input
              type="text"
              class="form-control form-control-sm"
              v-model="form.description"
              :placeholder="t('admin.modulePermissions.description')"
            />
          </div>
          <div class="col-md-3 d-flex align-items-center">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="grantedSwitch" v-model="form.is_granted" />
              <label class="form-check-label small" for="grantedSwitch">{{ t('admin.modulePermissions.granted') }}</label>
            </div>
          </div>
          <div class="col-md-3 d-flex align-items-center justify-content-end">
            <button type="submit" class="btn btn-primary btn-sm w-100">{{ t('admin.modulePermissions.save') }}</button>
          </div>
        </div>
      </form>

      <div class="table-responsive mt-3">
        <table class="module-permission-table">
          <thead>
            <tr>
              <th>{{ t('admin.modulePermissions.headersModule') }}</th>
              <th>{{ t('admin.modulePermissions.headersKey') }}</th>
              <th>{{ t('admin.modulePermissions.headersName') }}</th>
              <th>{{ t('admin.modulePermissions.headersGroup') }}</th>
              <th>{{ t('admin.modulePermissions.headersDesc') }}</th>
              <th>{{ t('admin.modulePermissions.headersStatus') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="permission in filteredPermissions" :key="permission.id">
              <td class="fw-medium">{{ permission.module_name }}</td>
              <td class="text-monospace">{{ permission.permission_key }}</td>
              <td>{{ permission.permission_name }}</td>
              <td>{{ permission.role_group_name }}</td>
              <td class="text-secondary-custom">{{ permission.description || '—' }}</td>
              <td>
                <span :class="permission.is_granted ? 'badge bg-success-subtle text-success' : 'badge bg-danger-subtle text-danger'">
                  {{ permission.is_granted ? t('admin.modulePermissions.granted') : t('admin.modulePermissions.denied') }}
                </span>
              </td>
              <td class="text-end">
                <button type="button" class="btn btn-sm btn-icon btn-outline-danger" @click="deletePermission(permission.id)" :title="t('admin.modulePermissions.delete')" :aria-label="t('admin.modulePermissions.delete')">
                  <Trash2 :size="14" aria-hidden="true" />
                </button>
              </td>
            </tr>
            <tr v-if="filteredPermissions.length === 0">
              <td colspan="7" class="text-center text-muted py-4">{{ t('admin.modulePermissions.empty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.module-permission-manager {
  background-color: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
}

.module-permission-manager__header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.module-permission-manager__body {
  padding: 1.25rem;
}

.module-permission-manager__form {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.module-permission-table {
  width: 100%;
  border-collapse: collapse;

  th {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-secondary-text);
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }

  td {
    padding: 0.6rem 0.75rem;
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

.text-secondary-custom {
  color: var(--color-secondary-text);
}

.text-monospace {
  font-family: var(--bs-font-monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  font-size: 0.8125rem;
}

.module-permission-manager__toggle-key {
  font-size: 0.75rem;
  text-decoration: none;
}
</style>
