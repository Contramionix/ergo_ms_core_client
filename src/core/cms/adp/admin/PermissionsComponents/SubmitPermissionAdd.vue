<script setup>
import { ref, computed, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import ModalCenter from '@/components/ModalCenter.vue'
import SelectBox from '@/components/SelectBox.vue'
import PolicyActionToggle from '@/core/cms/adp/admin/PermissionsComponents/PolicyActionToggle.vue'
import PolicyResourcePathField from '@/core/cms/adp/admin/PermissionsComponents/PolicyResourcePathField.vue'
import { createPolicy } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { buildDefaultPolicyName } from '@/core/cms/adp/admin/js/policyNameUtils.js'
import {
  getPolicyTypeOptions,
  getPolicyTargetTypeOptions,
  mapRoleSelectOptions,
  mapRoleGroupSelectOptions,
} from '@/core/cms/js/adminSelectOptions.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()
const policyTypeOptions = computed(() => getPolicyTypeOptions())
const targetTypeOptions = computed(() => getPolicyTargetTypeOptions())

const props = defineProps({
  visible: { type: Boolean, default: false },
  modalId: { type: String, default: 'policyAdd' },
  roles: { type: Array, required: true },
  roleGroups: { type: Array, required: true },
  pages: { type: Array, default: () => [] },
  modulePageGroups: { type: Array, default: () => [] },
  moduleCatalog: { type: Array, default: () => [] },
  apiPages: { type: Array, default: () => [] },
  apiModulePageGroups: { type: Array, default: () => [] },
  apiModuleCatalog: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:visible', 'addPermission'])

const name = ref('')
const policyType = ref('url')
const action = ref('deny')
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
const isApiPolicy = computed(() => policyType.value === 'api')
const catalogPages = computed(() => (isApiPolicy.value ? props.apiPages : props.pages))
const catalogModulePageGroups = computed(() => (
  isApiPolicy.value ? props.apiModulePageGroups : props.modulePageGroups
))
const catalogModuleCatalog = computed(() => (
  isApiPolicy.value ? props.apiModuleCatalog : props.moduleCatalog
))
const catalogMode = computed(() => (isApiPolicy.value ? 'api' : 'url'))

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
    pages: catalogPages.value,
    targetType: targetType.value,
    role: selectedRole.value,
    roleGroup: selectedRoleGroup.value,
  }),
)

watch(policyType, () => {
  resourcePath.value = ''
  isPattern.value = false
  showErrorResource.value = false
})

const resetForm = () => {
  name.value = ''
  policyType.value = 'url'
  action.value = 'deny'
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

watch(targetType, (type) => {
  if (type === 'role_group') {
    selectedRoleId.value = null
  } else {
    selectedRoleGroupId.value = null
  }
  showErrorTarget.value = false
})

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
    @close="closeModal"
  >
    <form :id="formId" class="policy-form" @submit.prevent="submitForm" novalidate>
      <div class="policy-form__row">
        <PolicyActionToggle
          v-model="action"
          :label="t('admin.policies.action')"
        />
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

      <PolicyResourcePathField
        :pages="catalogPages"
        :module-page-groups="catalogModulePageGroups"
        :module-catalog="catalogModuleCatalog"
        :catalog-mode="catalogMode"
        :resource-path="resourcePath"
        :is-pattern="isPattern"
        :invalid="showErrorResource"
        @update:resource-path="resourcePath = $event"
        @update:is-pattern="isPattern = $event"
      />

      <div class="policy-form__section">
        <SelectBox
          id="targetTypeAdd"
          v-model="targetType"
          :label="t('admin.policies.applyTo')"
          :options="targetTypeOptions"
          value-key="id"
          label-key="name"
          :include-all-option="false"
        />

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

      <div
        class="policy-form__disclosure"
        :class="{ 'policy-form__disclosure--open': showAdvanced }"
      >
        <button
          type="button"
          class="policy-form__disclosure-toggle"
          :aria-expanded="showAdvanced"
          @click="showAdvanced = !showAdvanced"
        >
          <ChevronDown :size="18" class="policy-form__disclosure-icon" aria-hidden="true" />
          <span>{{ t('admin.policies.showAdvanced') }}</span>
        </button>

        <div v-show="showAdvanced" class="policy-form__disclosure-body">
          <div>
            <label class="form-label" for="policyNameInput">{{ t('admin.policies.nameLabel') }}</label>
            <input
              id="policyNameInput"
              type="text"
              class="form-control"
              v-model="name"
              :class="{ 'is-invalid': showErrorName }"
              :placeholder="t('admin.policies.namePlaceholder')"
              @input="nameManuallyEdited = true"
            />
            <div v-if="showErrorName" class="invalid-feedback d-block">{{ t('admin.policies.nameRequired') }}</div>
          </div>

          <div>
            <label class="form-label" for="priorityInput">{{ t('admin.policies.priority') }}</label>
            <input
              id="priorityInput"
              type="number"
              class="form-control"
              v-model.number="priority"
            />
            <small class="form-text text-muted">{{ t('admin.policies.priorityHelp') }}</small>
          </div>
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

<style scoped lang="scss">
.policy-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.policy-form__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;

  @media (width < $ui-bp-md) {
    grid-template-columns: 1fr;
  }
}

.policy-form__section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.policy-form__disclosure {
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  background: var(--color-primary-background);
  overflow: hidden;
}

.policy-form__disclosure-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: var(--color-secondary-background);
  color: var(--color-primary-text);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: var(--color-hover-background);
  }
}

.policy-form__disclosure-icon {
  flex-shrink: 0;
  color: var(--color-accent);
  transition: transform 0.15s ease;
}

.policy-form__disclosure--open .policy-form__disclosure-icon {
  transform: rotate(180deg);
}

.policy-form__disclosure-body {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1rem;
  border-top: 1px solid var(--color-border);
}
</style>
