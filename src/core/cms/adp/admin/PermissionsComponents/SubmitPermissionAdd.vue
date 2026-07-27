<script setup>
import { ref, computed, watch } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import SelectBox from '@/components/SelectBox.vue'
import PolicyResourcePathField from '@/core/cms/adp/admin/PermissionsComponents/PolicyResourcePathField.vue'
import { createPolicy } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { buildDefaultPolicyName } from '@/core/cms/adp/admin/js/policyNameUtils.js'
import {
  getPolicyTypeOptions,
  getPolicyActionOptions,
  mapRoleSelectOptions,
  mapRoleGroupSelectOptions,
} from '@/core/cms/js/adminSelectOptions.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()
const policyTypeOptions = computed(() => getPolicyTypeOptions())
const policyActionOptions = computed(() => getPolicyActionOptions())

const props = defineProps({
  visible: { type: Boolean, default: false },
  modalId: { type: String, default: 'policyAdd' },
  roles: { type: Array, required: true },
  roleGroups: { type: Array, required: true },
  pages: { type: Array, default: () => [] },
  modulePageGroups: { type: Array, default: () => [] },
  moduleCatalog: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:visible', 'addPermission'])

const name = ref('')
const policyType = ref('url')
const action = ref('allow')
const resourcePath = ref('')
const isPattern = ref(false)
const priority = ref(0)
const targetType = ref('role_group')
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

const resetForm = () => {
  name.value = ''
  policyType.value = 'url'
  action.value = 'allow'
  resourcePath.value = ''
  isPattern.value = false
  priority.value = 0
  targetType.value = 'role_group'
  selectedRoleId.value = null
  selectedRoleGroupId.value = null
  showAdvanced.value = false
  nameManuallyEdited.value = false
  showErrorName.value = false
  showErrorResource.value = false
  showErrorTarget.value = false
}

const closeModal = () => {
  resetForm()
  emit('update:visible', false)
}

watch(
  [suggestedPolicyName, () => nameManuallyEdited.value],
  ([suggestedName, manuallyEdited]) => {
    if (!manuallyEdited) {
      name.value = suggestedName
    }
  },
)

const submitForm = async () => {
  const resolvedName = name.value.trim() || suggestedPolicyName.value.trim()

  showErrorName.value = !resolvedName
  showErrorResource.value = !resourcePath.value.trim()
  showErrorTarget.value =
    (targetType.value === 'role' && !selectedRoleId.value) ||
    (targetType.value === 'role_group' && !selectedRoleGroupId.value)

  if (showErrorName.value || showErrorResource.value || showErrorTarget.value) {
    return
  }

  try {
    isSubmitting.value = true
    await createPolicy({
      name: resolvedName,
      policy_type: policyType.value,
      action: action.value,
      resource_path: resourcePath.value.trim(),
      is_pattern: isPattern.value,
      priority: priority.value,
      role: targetType.value === 'role' ? selectedRoleId.value : null,
      role_group: targetType.value === 'role_group' ? selectedRoleGroupId.value : null,
    })

    emit('addPermission')
    resetForm()
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
    :title="t('admin.policies.addTitle')"
    size="xl"
    scrollable
    @closemodal="closeModal"
  >
    <form :id="formId" @submit.prevent="submitForm" novalidate>
      <div class="row g-3 mb-3">
        <div class="col-md-6">
          <SelectBox
            id="actionSelect"
            v-model="action"
            :label="t('admin.policies.action')"
            :options="policyActionOptions"
            value-key="id"
            label-key="name"
            :include-all-option="false"
          />
        </div>
        <div class="col-md-6">
          <SelectBox
            id="policyTypeSelect"
            v-model="policyType"
            :label="t('admin.policies.type')"
            :options="policyTypeOptions"
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
        <label class="form-label d-block">{{ t('admin.policies.applyTo') }}</label>
        <div class="btn-group mb-2" role="group">
          <input
            type="radio"
            class="btn-check"
            name="targetTypeAdd"
            id="targetGroupAdd"
            value="role_group"
            v-model="targetType"
          />
          <label class="btn btn-outline-primary" for="targetGroupAdd">{{ t('admin.policies.targetGroup') }}</label>

          <input
            type="radio"
            class="btn-check"
            name="targetTypeAdd"
            id="targetRoleAdd"
            value="role"
            v-model="targetType"
          />
          <label class="btn btn-outline-primary" for="targetRoleAdd">{{ t('admin.policies.targetRole') }}</label>
        </div>

        <SelectBox
          v-if="targetType === 'role_group'"
          v-model="selectedRoleGroupId"
          :options="roleGroupSelectOptions"
          value-key="id"
          label-key="name"
          :all-label="t('admin.policies.selectGroup')"
          cast-to-number
        />

        <SelectBox
          v-else
          v-model="selectedRoleId"
          :options="roleSelectOptions"
          value-key="id"
          label-key="name"
          :all-label="t('admin.policies.selectRole')"
          cast-to-number
        />

        <div v-if="showErrorTarget" class="invalid-feedback d-block">
          {{ t('admin.policies.targetRequired') }}
        </div>
      </div>

      <div class="mb-3">
        <button
          type="button"
          class="btn btn-link btn-sm px-0"
          @click="showAdvanced = !showAdvanced"
        >
          {{ showAdvanced ? t('admin.policies.hideAdvanced') : t('admin.policies.showAdvanced') }}
        </button>
      </div>

      <div v-if="showAdvanced" class="border rounded p-3 mb-2">
        <div class="form-floating mb-3" v-auto-animate>
          <input
            type="text"
            id="policyNameInput"
            class="form-control"
            v-model="name"
            :class="{ 'is-invalid': showErrorName }"
            :placeholder="t('admin.policies.namePlaceholder')"
            @input="nameManuallyEdited = true"
          />
          <label for="policyNameInput">{{ t('admin.policies.nameLabel') }}</label>
          <div v-if="showErrorName" class="invalid-feedback">{{ t('admin.policies.nameRequired') }}</div>
        </div>

        <div class="mb-0">
          <label for="priorityInput" class="form-label">{{ t('admin.policies.priority') }}</label>
          <input
            type="number"
            id="priorityInput"
            class="form-control"
            v-model.number="priority"
          />
          <small class="text-muted">{{ t('admin.policies.priorityHelp') }}</small>
        </div>
      </div>
    </form>

    <template #footer>
      <button type="button" class="ui-btn ui-btn--secondary" :disabled="isSubmitting" @click="closeModal">
        {{ t('common.cancel') }}
      </button>
      <button type="submit" :form="formId" class="ui-btn ui-btn--primary" :disabled="isSubmitting">
        {{ isSubmitting ? t('common.saving') : t('common.add') }}
      </button>
    </template>
  </ModalCenter>
</template>
