<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import SelectBox from '@/components/SelectBox.vue'
import {
  GetModulePermissions,
  CreateModulePermission,
  DeleteModulePermission
} from '@/core/cms/adp/admin/js/GroupsPolitics'
import { mapRoleGroupSelectOptions } from '@/core/cms/js/adminSelectOptions.js'

const props = defineProps({
  roleGroups: { type: Array, required: true }
})

const permissions = ref([])
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

const showErrors = ref({
  module_name: false,
  permission_key: false,
  permission_name: false,
  role_group: false
})

const loadPermissions = async () => {
  const roleGroupId = selectedRoleGroup.value || null
  const data = await GetModulePermissions(roleGroupId)
  permissions.value = Array.isArray(data) ? data : (data.results || [])
}

watch(selectedRoleGroup, async () => {
  await loadPermissions()
})

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

  await CreateModulePermission({
    module_name: form.value.module_name.trim(),
    permission_key: form.value.permission_key.trim(),
    permission_name: form.value.permission_name.trim(),
    description: form.value.description,
    role_group: form.value.role_group,
    is_granted: form.value.is_granted
  })

  await loadPermissions()
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
  await DeleteModulePermission(permissionId)
  await loadPermissions()
}

const filteredPermissions = computed(() => permissions.value)

onMounted(async () => {
  await loadPermissions()
})
</script>

<template>
  <div class="module-permission-manager">
    <div class="module-permission-manager__header">
      <div>
        <h5 class="mb-0">Права модулей</h5>
        <small class="text-secondary-custom">Управление доступом к функционалу модулей по ролевым группам</small>
      </div>
      <SelectBox
        v-model="selectedRoleGroup"
        :options="roleGroupSelectOptions"
        value-key="id"
        label-key="name"
        all-label="Все группы"
        cast-to-number :full-width="false"
      />
    </div>

    <div class="module-permission-manager__body">
      <form class="module-permission-manager__form" @submit.prevent="submitForm">
        <div class="row g-2">
          <div class="col-md-3">
            <input
              type="text"
              class="form-control form-control-sm"
              v-model="form.module_name"
              :class="{ 'is-invalid': showErrors.module_name }"
              placeholder="Модуль"
            />
            <div v-if="showErrors.module_name" class="invalid-feedback">Укажите модуль</div>
          </div>
          <div class="col-md-3">
            <input
              type="text"
              class="form-control form-control-sm"
              v-model="form.permission_key"
              :class="{ 'is-invalid': showErrors.permission_key }"
              placeholder="Ключ (view_dashboard)"
            />
            <div v-if="showErrors.permission_key" class="invalid-feedback">Укажите ключ</div>
          </div>
          <div class="col-md-3">
            <input
              type="text"
              class="form-control form-control-sm"
              v-model="form.permission_name"
              :class="{ 'is-invalid': showErrors.permission_name }"
              placeholder="Название"
            />
            <div v-if="showErrors.permission_name" class="invalid-feedback">Укажите название</div>
          </div>
          <div class="col-md-3">
            <SelectBox
              v-model="form.role_group"
              :options="roleGroupSelectOptions"
              value-key="id"
              label-key="name"
              all-label="Группа"
              cast-to-number />
            <div v-if="showErrors.role_group" class="invalid-feedback d-block">Выберите группу</div>
          </div>
        </div>
        <div class="row g-2 mt-1">
          <div class="col-md-6">
            <input
              type="text"
              class="form-control form-control-sm"
              v-model="form.description"
              placeholder="Описание (опционально)"
            />
          </div>
          <div class="col-md-3 d-flex align-items-center">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="grantedSwitch" v-model="form.is_granted" />
              <label class="form-check-label small" for="grantedSwitch">Разрешено</label>
            </div>
          </div>
          <div class="col-md-3 d-flex align-items-center justify-content-end">
            <button type="submit" class="btn btn-primary btn-sm w-100">Сохранить</button>
          </div>
        </div>
      </form>

      <div class="table-responsive mt-3">
        <table class="module-permission-table">
          <thead>
            <tr>
              <th>Модуль</th>
              <th>Ключ</th>
              <th>Название</th>
              <th>Группа</th>
              <th>Описание</th>
              <th>Статус</th>
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
                  {{ permission.is_granted ? 'Разрешено' : 'Запрещено' }}
                </span>
              </td>
              <td class="text-end">
                <button class="btn btn-sm btn-icon btn-outline-danger" @click="deletePermission(permission.id)" title="Удалить">
                  <Trash2 :size="14" />
                </button>
              </td>
            </tr>
            <tr v-if="filteredPermissions.length === 0">
              <td colspan="7" class="text-center text-muted py-4">Нет настроенных прав для выбранного фильтра</td>
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
</style>
