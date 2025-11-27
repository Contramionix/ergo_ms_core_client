<script setup>
import { ref, watch } from 'vue'
import { UpdatePolicy } from '@/core/cms/adp/admin/js/GroupsPolitics'

const props = defineProps({
  row: { type: Object, required: true },
  roles: { type: Array, required: true },
  roleGroups: { type: Array, required: true }
})

const emit = defineEmits(['changePermission'])

const policyId = ref(null)
const name = ref('')
const policyType = ref('url')
const action = ref('allow')
const resourcePath = ref('')
const isPattern = ref(false)
const priority = ref(0)
const targetType = ref('role')
const selectedRoleId = ref('')
const selectedRoleGroupId = ref('')

const showErrorName = ref(false)
const showErrorResource = ref(false)
const showErrorTarget = ref(false)

watch(
  () => props.row,
  newRow => {
    policyId.value = newRow.id
    name.value = newRow.name || ''
    policyType.value = newRow.policy_type === 'Компонент' ? 'component' : 'url'
    action.value = newRow.action === 'Запретить' ? 'deny' : 'allow'
    resourcePath.value = newRow.resource_path || ''
    isPattern.value = Boolean(newRow.is_pattern)
    priority.value = newRow.priority ?? 0
    if (newRow.raw_role) {
      targetType.value = 'role'
      selectedRoleId.value = newRow.raw_role
      selectedRoleGroupId.value = ''
    } else if (newRow.raw_role_group) {
      targetType.value = 'role_group'
      selectedRoleGroupId.value = newRow.raw_role_group
      selectedRoleId.value = ''
    } else {
      targetType.value = 'role'
      selectedRoleId.value = ''
      selectedRoleGroupId.value = ''
    }
  },
  { immediate: true }
)

const submitForm = async () => {
  showErrorName.value = !name.value.trim()
  showErrorResource.value = !resourcePath.value.trim()
  showErrorTarget.value =
    (targetType.value === 'role' && !selectedRoleId.value) ||
    (targetType.value === 'role_group' && !selectedRoleGroupId.value)

  if (showErrorName.value || showErrorResource.value || showErrorTarget.value || !policyId.value) {
    return
  }

  await UpdatePolicy(policyId.value, {
    name: name.value.trim(),
    policy_type: policyType.value,
    action: action.value,
    resource_path: resourcePath.value.trim(),
    is_pattern: isPattern.value,
    priority: priority.value,
    role: targetType.value === 'role' ? selectedRoleId.value : null,
    role_group: targetType.value === 'role_group' ? selectedRoleGroupId.value : null
  })

  emit('changePermission')
}
</script>

<template>
  <form @submit.prevent="submitForm" novalidate>
    <div class="form-floating mb-3" v-auto-animate>
      <input
        type="text"
        id="policyNameEdit"
        class="form-control"
        v-model="name"
        :class="{ 'is-invalid': showErrorName }"
        placeholder="Введите название политики"
      />
      <label for="policyNameEdit">Введите название политики</label>
      <div v-if="showErrorName" class="invalid-feedback">Название обязательно для заполнения.</div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <label for="policyTypeEdit" class="form-label">Тип политики</label>
        <select id="policyTypeEdit" class="form-select" v-model="policyType">
          <option value="url">URL</option>
          <option value="component">Компонент</option>
        </select>
      </div>
      <div class="col-md-6">
        <label for="actionEdit" class="form-label">Действие</label>
        <select id="actionEdit" class="form-select" v-model="action">
          <option value="allow">Разрешить</option>
          <option value="deny">Запретить</option>
        </select>
      </div>
    </div>

    <div class="form-floating mb-3" v-auto-animate>
      <input
        type="text"
        id="resourceEdit"
        class="form-control"
        v-model="resourcePath"
        :class="{ 'is-invalid': showErrorResource }"
        placeholder="Введите путь ресурса"
      />
      <label for="resourceEdit">Путь ресурса</label>
      <div v-if="showErrorResource" class="invalid-feedback">Ресурс обязателен.</div>
    </div>

    <div class="form-check form-switch mb-3">
      <input class="form-check-input" type="checkbox" role="switch" id="patternSwitchEdit" v-model="isPattern" />
      <label class="form-check-label" for="patternSwitchEdit">Использовать шаблон</label>
    </div>

    <div class="mb-3">
      <label for="priorityEdit" class="form-label">Приоритет</label>
      <input
        type="number"
        id="priorityEdit"
        class="form-control"
        v-model.number="priority"
      />
    </div>

    <div class="mb-3">
      <label class="form-label d-block">Цель политики</label>
      <div class="btn-group mb-2" role="group">
        <input
          type="radio"
          class="btn-check"
          name="targetTypeEdit"
          id="targetRoleEdit"
          value="role"
          v-model="targetType"
        />
        <label class="btn btn-outline-primary" for="targetRoleEdit">Роль</label>

        <input
          type="radio"
          class="btn-check"
          name="targetTypeEdit"
          id="targetGroupEdit"
          value="role_group"
          v-model="targetType"
        />
        <label class="btn btn-outline-primary" for="targetGroupEdit">Ролевая группа</label>
      </div>

      <select
        v-if="targetType === 'role'"
        class="form-select"
        v-model="selectedRoleId"
        :class="{ 'is-invalid': showErrorTarget }"
      >
        <option value="" disabled>Выберите роль</option>
        <option v-for="role in props.roles" :key="role.id" :value="role.id">
          {{ role.name }} ({{ role.role_type_display }})
        </option>
      </select>

      <select
        v-else
        class="form-select"
        v-model="selectedRoleGroupId"
        :class="{ 'is-invalid': showErrorTarget }"
      >
        <option value="" disabled>Выберите ролевую группу</option>
        <option v-for="group in props.roleGroups" :key="group.id" :value="group.id">
          {{ group.name }} · {{ group.parent_role_name }}
        </option>
      </select>

      <div v-if="showErrorTarget" class="invalid-feedback d-block">
        Необходимо выбрать цель политики.
      </div>
    </div>

    <div class="mt-3 text-end">
      <button type="submit" class="btn btn-primary" data-bs-dismiss="modal">
        Сохранить
      </button>
    </div>
  </form>
</template>

