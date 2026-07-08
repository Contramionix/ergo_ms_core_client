<script setup>
import { ref, watch, computed } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import SelectBox from '@/components/SelectBox.vue'
import PolicyResourcePathField from '@/core/cms/adp/admin/PermissionsComponents/PolicyResourcePathField.vue'
import { updatePolicy } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { buildDefaultPolicyName } from '@/core/cms/adp/admin/js/policyNameUtils.js'
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
  pages: { type: Array, default: () => [] },
  modulePageGroups: { type: Array, default: () => [] },
  moduleCatalog: { type: Array, default: () => [] },
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
const showAdvanced = ref(false)
const nameManuallyEdited = ref(false)

const roleSelectOptions = computed(() => mapRoleSelectOptions(props.roles))
const roleGroupSelectOptions = computed(() => mapRoleGroupSelectOptions(props.roleGroups))

const showErrorName = ref(false)
const showErrorResource = ref(false)
const showErrorTarget = ref(false)

const formId = computed(() => `${props.modalId}-form`)

const selectedRole = computed(() =>
  props.roles.find((role) => role.id === selectedRoleId.value) || null,
)

const selectedRoleGroup = computed(() =>
  props.roleGroups.find((group) => group.id === selectedRoleGroupId.value) || null,
)

const suggestedPolicyName = computed(() =>
  buildDefaultPolicyName({
    resourcePath: resourcePath.value,
    pages: props.pages,
    targetType: targetType.value,
    role: selectedRole.value,
    roleGroup: selectedRoleGroup.value,
  }),
)

const syncWithRow = (newRow) => {
  policyId.value = newRow.id
  name.value = newRow.name || ''
  policyType.value = newRow.policy_type === 'Компонент' ? 'component' : 'url'
  action.value = newRow.action === 'Запретить' ? 'deny' : 'allow'
  resourcePath.value = newRow.resource_path || ''
  isPattern.value = Boolean(newRow.is_pattern)
  priority.value = newRow.priority ?? 0
  nameManuallyEdited.value = true
  showAdvanced.value = Boolean(newRow.name) || Number(newRow.priority ?? 0) !== 0

  if (newRow.raw_role) {
    targetType.value = 'role'
    selectedRoleId.value = newRow.raw_role
    selectedRoleGroupId.value = null
  } else if (newRow.raw_role_group) {
    targetType.value = 'role_group'
    selectedRoleGroupId.value = newRow.raw_role_group
    selectedRoleId.value = null
  } else {
    targetType.value = 'role_group'
    selectedRoleId.value = null
    selectedRoleGroupId.value = null
  }
}

watch(
  () => props.row,
  (newRow) => {
    if (newRow?.id) {
      syncWithRow(newRow)
    }
  },
  { immediate: true },
)

watch(
  () => props.visible,
  (open) => {
    if (open && props.row?.id) {
      syncWithRow(props.row)
      showErrorName.value = false
      showErrorResource.value = false
      showErrorTarget.value = false
    }
  },
)

watch(
  [suggestedPolicyName, () => nameManuallyEdited.value],
  ([suggestedName, manuallyEdited]) => {
    if (!manuallyEdited) {
      name.value = suggestedName
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
  const resolvedName = name.value.trim() || suggestedPolicyName.value.trim()

  showErrorName.value = !resolvedName
  showErrorResource.value = !resourcePath.value.trim()
  showErrorTarget.value =
    (targetType.value === 'role' && !selectedRoleId.value) ||
    (targetType.value === 'role_group' && !selectedRoleGroupId.value)

  if (showErrorName.value || showErrorResource.value || showErrorTarget.value || !policyId.value) {
    return
  }

  try {
    isSubmitting.value = true
    await updatePolicy(policyId.value, {
      name: resolvedName,
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
    size="xl"
    scrollable
    @closemodal="closeModal"
  >
    <form :id="formId" @submit.prevent="submitForm" novalidate>
      <div class="row g-3 mb-3">
        <div class="col-md-6">
          <SelectBox
            id="actionEdit"
            v-model="action"
            label="Действие"
            :options="POLICY_ACTION_OPTIONS"
            value-key="id"
            label-key="name"
            :include-all-option="false"
          />
        </div>
        <div class="col-md-6">
          <SelectBox
            id="policyTypeEdit"
            v-model="policyType"
            label="Тип политики"
            :options="POLICY_TYPE_OPTIONS"
            value-key="id"
            label-key="name"
            :include-all-option="false"
          />
        </div>
      </div>

      <PolicyResourcePathField
        :pages="pages"
        :module-page-groups="modulePageGroups"
        :module-catalog="moduleCatalog"
        :resource-path="resourcePath"
        :is-pattern="isPattern"
        :invalid="showErrorResource"
        @update:resource-path="resourcePath = $event"
        @update:is-pattern="isPattern = $event"
      />

      <div class="mb-3 mt-3">
        <label class="form-label d-block">Кому применить</label>
        <div class="btn-group mb-2" role="group">
          <input
            type="radio"
            class="btn-check"
            name="targetTypeEdit"
            id="targetGroupEdit"
            value="role_group"
            v-model="targetType"
          />
          <label class="btn btn-outline-primary" for="targetGroupEdit">Ролевая группа</label>

          <input
            type="radio"
            class="btn-check"
            name="targetTypeEdit"
            id="targetRoleEdit"
            value="role"
            v-model="targetType"
          />
          <label class="btn btn-outline-primary" for="targetRoleEdit">Роль</label>
        </div>

        <SelectBox
          v-if="targetType === 'role_group'"
          v-model="selectedRoleGroupId"
          :options="roleGroupSelectOptions"
          value-key="id"
          label-key="name"
          all-label="Выберите ролевую группу"
          cast-to-number
        />

        <SelectBox
          v-else
          v-model="selectedRoleId"
          :options="roleSelectOptions"
          value-key="id"
          label-key="name"
          all-label="Выберите роль"
          cast-to-number
        />

        <div v-if="showErrorTarget" class="invalid-feedback d-block">
          Необходимо выбрать цель политики.
        </div>
      </div>

      <div class="mb-3">
        <button
          type="button"
          class="btn btn-link btn-sm px-0"
          @click="showAdvanced = !showAdvanced"
        >
          {{ showAdvanced ? 'Скрыть дополнительные параметры' : 'Дополнительные параметры' }}
        </button>
      </div>

      <div v-if="showAdvanced" class="border rounded p-3 mb-2">
        <div class="form-floating mb-3" v-auto-animate>
          <input
            type="text"
            id="policyNameEdit"
            class="form-control"
            v-model="name"
            :class="{ 'is-invalid': showErrorName }"
            placeholder="Введите название политики"
            @input="nameManuallyEdited = true"
          />
          <label for="policyNameEdit">Название политики</label>
          <div v-if="showErrorName" class="invalid-feedback">Название обязательно для заполнения.</div>
        </div>

        <div class="mb-0">
          <label for="priorityEdit" class="form-label">Приоритет</label>
          <input
            type="number"
            id="priorityEdit"
            class="form-control"
            v-model.number="priority"
          />
        </div>
      </div>
    </form>

    <template #footer>
      <button type="button" class="ui-btn ui-btn--secondary" :disabled="isSubmitting" @click="closeModal">
        Отмена
      </button>
      <button type="submit" :form="formId" class="ui-btn ui-btn--primary" :disabled="isSubmitting">
        {{ isSubmitting ? 'Сохранение...' : 'Сохранить' }}
      </button>
    </template>
  </ModalCenter>
</template>
