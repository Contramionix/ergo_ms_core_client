<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  GetModulePermissions,
  CreateModulePermission,
  DeleteModulePermission
} from '@/core/cms/adp/admin/js/GroupsPolitics'

const props = defineProps({
  roleGroups: { type: Array, required: true }
})

const permissions = ref([])
const selectedRoleGroup = ref('')

const form = ref({
  module_name: '',
  permission_key: '',
  permission_name: '',
  role_group: '',
  is_granted: true,
  description: ''
})

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
    role_group: '',
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
  <div class="card">
    <div class="card-header d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between">
      <div>
        <h5 class="mb-0">Права модулей</h5>
        <small class="text-muted">Управление доступом к функционалу модулей по ролевым группам</small>
      </div>
      <select class="form-select w-auto" v-model="selectedRoleGroup">
        <option value="">Все группы</option>
        <option v-for="group in roleGroups" :key="group.id" :value="group.id">
          {{ group.name }}
        </option>
      </select>
    </div>
    <div class="card-body">
      <form class="row g-3 mb-4" @submit.prevent="submitForm">
        <div class="col-md-3">
          <label class="form-label">Модуль</label>
          <input
            type="text"
            class="form-control"
            v-model="form.module_name"
            :class="{ 'is-invalid': showErrors.module_name }"
            placeholder="Например, cms"
          />
          <div v-if="showErrors.module_name" class="invalid-feedback">Укажите модуль</div>
        </div>
        <div class="col-md-3">
          <label class="form-label">Ключ разрешения</label>
          <input
            type="text"
            class="form-control"
            v-model="form.permission_key"
            :class="{ 'is-invalid': showErrors.permission_key }"
            placeholder="view_dashboard"
          />
          <div v-if="showErrors.permission_key" class="invalid-feedback">Укажите ключ</div>
        </div>
        <div class="col-md-3">
          <label class="form-label">Название</label>
          <input
            type="text"
            class="form-control"
            v-model="form.permission_name"
            :class="{ 'is-invalid': showErrors.permission_name }"
            placeholder="Просмотр панели"
          />
          <div v-if="showErrors.permission_name" class="invalid-feedback">Укажите название</div>
        </div>
        <div class="col-md-3">
          <label class="form-label">Ролевая группа</label>
          <select
            class="form-select"
            v-model="form.role_group"
            :class="{ 'is-invalid': showErrors.role_group }"
          >
            <option value="">Выберите группу</option>
            <option v-for="group in roleGroups" :key="group.id" :value="group.id">
              {{ group.name }}
            </option>
          </select>
          <div v-if="showErrors.role_group" class="invalid-feedback">Выберите ролевую группу</div>
        </div>
        <div class="col-md-8">
          <label class="form-label">Описание</label>
          <input type="text" class="form-control" v-model="form.description" placeholder="Опционально" />
        </div>
        <div class="col-md-2 d-flex align-items-center">
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="grantedSwitch" v-model="form.is_granted" />
            <label class="form-check-label" for="grantedSwitch">Разрешено</label>
          </div>
        </div>
        <div class="col-md-2 d-flex align-items-center justify-content-end">
          <button type="submit" class="btn btn-primary w-100">Сохранить</button>
        </div>
      </form>

      <div class="table-responsive">
        <table class="table table-striped align-middle">
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
              <td>{{ permission.module_name }}</td>
              <td>{{ permission.permission_key }}</td>
              <td>{{ permission.permission_name }}</td>
              <td>{{ permission.role_group_name }}</td>
              <td>{{ permission.description || '—' }}</td>
              <td>
                <span :class="permission.is_granted ? 'badge bg-success-subtle text-success' : 'badge bg-secondary'">
                  {{ permission.is_granted ? 'Разрешено' : 'Запрещено' }}
                </span>
              </td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" @click="deletePermission(permission.id)">
                  Удалить
                </button>
              </td>
            </tr>
            <tr v-if="filteredPermissions.length === 0">
              <td colspan="7" class="text-center text-muted">Нет настроенных прав для выбранного фильтра</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

