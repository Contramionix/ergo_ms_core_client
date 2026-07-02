<script setup>
import { ref, watch, computed } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import SelectBox from '@/components/SelectBox.vue'
import { UpdatePolicy } from '@/core/cms/adp/admin/js/GroupsPolitics'
import {
  POLICY_TYPE_OPTIONS,
  POLICY_ACTION_OPTIONS,
  mapRoleSelectOptions,
  mapRoleGroupSelectOptions,
} from '@/core/cms/js/adminSelectOptions.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  modalId: { type: String, default: 'policyEdit' },
  row: { type: Object, required: true },
  roles: { type: Array, required: true },
  roleGroups: { type: Array, required: true },
})

const emit = defineEmits(['update:visible', 'changePermission'])

const policyId = ref(null)
const name = ref('')
const policyType = ref('url')
const action = ref('allow')
const resourcePath = ref('')
const isPattern = ref(false)
const priority = ref(0)
const targetType = ref('role')
const selectedRoleId = ref(null)
const selectedRoleGroupId = ref(null)
const isSubmitting = ref(false)

const roleSelectOptions = computed(() => mapRoleSelectOptions(props.roles))
const roleGroupSelectOptions = computed(() => mapRoleGroupSelectOptions(props.roleGroups))

const showErrorName = ref(false)
const showErrorResource = ref(false)
const showErrorTarget = ref(false)

const formId = computed(() => `${props.modalId}-form`)

const syncWithRow = newRow => {
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
    selectedRoleGroupId.value = null
  } else if (newRow.raw_role_group) {
    targetType.value = 'role_group'
    selectedRoleGroupId.value = newRow.raw_role_group
    selectedRoleId.value = null
  } else {
    targetType.value = 'role'
    selectedRoleId.value = null
    selectedRoleGroupId.value = null
  }
}

watch(
  () => props.row,
  newRow => {
    if (newRow?.id) {
      syncWithRow(newRow)
    }
  },
  { immediate: true },
)

watch(
  () => props.visible,
  open => {
    if (open && props.row?.id) {
      syncWithRow(props.row)
      showErrorName.value = false
      showErrorResource.value = false
      showErrorTarget.value = false
    }
  },
)

const closeModal = () => {
  if (props.row?.id) {
    syncWithRow(props.row)
  }
  showErrorName.value = false
  showErrorResource.value = false
  showErrorTarget.value = false
  emit('update:visible', false)
}

const submitForm = async () => {
  showErrorName.value = !name.value.trim()
  showErrorResource.value = !resourcePath.value.trim()
  showErrorTarget.value =
    (targetType.value === 'role' && !selectedRoleId.value) ||
    (targetType.value === 'role_group' && !selectedRoleGroupId.value)

  if (showErrorName.value || showErrorResource.value || showErrorTarget.value || !policyId.value) {
    return
  }

  try {
    isSubmitting.value = true
    await UpdatePolicy(policyId.value, {
      name: name.value.trim(),
      policy_type: policyType.value,
      action: action.value,
      resource_path: resourcePath.value.trim(),
      is_pattern: isPattern.value,
      priority: priority.value,
      role: targetType.value === 'role' ? selectedRoleId.value : null,
      role_group: targetType.value === 'role_group' ? selectedRoleGroupId.value : null,
    })

    emit('changePermission')
    emit('update:visible', false)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <ModalCenter
    :modal-id="modalId"
    standalone
    :visible="visible"
    title="Редактировать политику"
    size="lg"
    scrollable
    @closemodal="closeModal"
  >
    <form :id="formId" @submit.prevent="submitForm" novalidate>
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
          <SelectBox
            id="policyTypeEdit"
            v-model="policyType"
            label="Тип политики"
            :options="POLICY_TYPE_OPTIONS"
            value-key="id"
            label-key="name"
            :include-all-option="false"
            fixed-trigger-label-font-size
          />
        </div>
        <div class="col-md-6">
          <SelectBox
            id="actionEdit"
            v-model="action"
            label="Действие"
            :options="POLICY_ACTION_OPTIONS"
            value-key="id"
            label-key="name"
            :include-all-option="false"
            fixed-trigger-label-font-size
          />
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

        <SelectBox
          v-if="targetType === 'role'"
          v-model="selectedRoleId"
          :options="roleSelectOptions"
          value-key="id"
          label-key="name"
          all-label="Выберите роль"
          cast-to-number
          fixed-trigger-label-font-size
        />

        <SelectBox
          v-else
          v-model="selectedRoleGroupId"
          :options="roleGroupSelectOptions"
          value-key="id"
          label-key="name"
          all-label="Выберите ролевую группу"
          cast-to-number
          fixed-trigger-label-font-size
        />

        <div v-if="showErrorTarget" class="invalid-feedback d-block">
          Необходимо выбрать цель политики.
        </div>
      </div>
    </form>

    <template #footer>
      <button type="button" class="btn btn-secondary" :disabled="isSubmitting" @click="closeModal">
        Отмена
      </button>
      <button type="submit" :form="formId" class="btn btn-primary" :disabled="isSubmitting">
        {{ isSubmitting ? 'Сохранение...' : 'Сохранить' }}
      </button>
    </template>
  </ModalCenter>
</template>
