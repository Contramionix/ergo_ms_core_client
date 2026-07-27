<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import ModalCenter from '@/components/ModalCenter.vue'
import SelectBox from '@/components/SelectBox.vue'
import { createRoleGroup, getRoles, updateRoleGroup } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { mapRoleSelectOptions } from '@/core/cms/js/adminSelectOptions.js'
import { extractApiError } from '@/js/utils/apiErrorMessage.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const props = defineProps({
  visible: { type: Boolean, default: false },
  modalId: { type: String, default: 'groupAdd' },
  mode: {
    type: String,
    default: 'create',
    validator: value => ['create', 'update'].includes(value),
  },
  group: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:visible', 'addGroup', 'changeGroup'])

const isEditMode = computed(() => props.mode === 'update')
const modalTitle = computed(() =>
  isEditMode.value ? t('admin.groups.editTitle') : t('admin.groups.addTitle'),
)
const toast = useToast()

const name = ref('')
const roles = ref([])
const parentRoleId = ref(null)
const description = ref('')
const isActive = ref(true)
const isSubmitting = ref(false)
const groupId = ref(null)

const showErrorName = ref(false)
const showErrorRole = ref(false)

const availableRoles = computed(() => roles.value.filter(role => !role.is_system))
const roleSelectOptions = computed(() => mapRoleSelectOptions(availableRoles.value))
const submitButtonText = computed(() => {
  if (isSubmitting.value) {
    return t('common.saving')
  }
  return isEditMode.value ? t('common.edit') : t('common.add')
})

const formId = computed(() => `${props.modalId}-form`)

const loadRoles = async () => {
  try {
    const response = await getRoles()
    roles.value = response
  } catch (error) {
    toast.error(t('admin.groups.loadRolesError'))
    logError('getRoles error:', error)
  }
}

onMounted(() => {
  loadRoles()
})

const syncWithGroup = group => {
  if (!group) {
    return
  }
  groupId.value = group.id ?? null
  name.value = group.name || ''
  parentRoleId.value = group.parent_role || null
  description.value = group.description || ''
  isActive.value = group.is_active ?? true
}

watch(
  () => props.group,
  async newGroup => {
    if (!isEditMode.value || !newGroup) {
      return
    }
    if (!roles.value.length) {
      await loadRoles()
    }
    syncWithGroup(newGroup)
  },
  { immediate: true },
)

watch(
  () => props.visible,
  open => {
    if (!open) {
      return
    }
    if (isEditMode.value && props.group) {
      syncWithGroup(props.group)
    }
    showErrorName.value = false
    showErrorRole.value = false
  },
)

const resetForm = () => {
  name.value = ''
  parentRoleId.value = null
  description.value = ''
  isActive.value = true
  groupId.value = null
  showErrorName.value = false
  showErrorRole.value = false
}

const closeModal = () => {
  if (isEditMode.value && props.group) {
    syncWithGroup(props.group)
  } else {
    resetForm()
  }
  emit('update:visible', false)
}

const submitForm = async () => {
  showErrorName.value = !name.value.trim()
  showErrorRole.value = !parentRoleId.value

  if (showErrorName.value || showErrorRole.value || (isEditMode.value && !groupId.value)) {
    return
  }

  try {
    isSubmitting.value = true
    const payload = {
      name: name.value.trim(),
      parent_role: parentRoleId.value,
      description: description.value || '',
      is_active: isActive.value,
    }

    if (isEditMode.value) {
      await updateRoleGroup(groupId.value, payload)
      toast.success(t('admin.groups.updated'))
      emit('changeGroup')
      syncWithGroup({
        ...payload,
        id: groupId.value,
      })
    } else {
      await createRoleGroup(payload)
      toast.success(t('admin.groups.created'))
      emit('addGroup')
      resetForm()
    }

    emit('update:visible', false)
  } catch (error) {
    const defaultMessage = isEditMode.value
      ? t('admin.groups.updateFailed')
      : t('admin.groups.createFailed')
    toast.error(extractApiError(error, defaultMessage))
    logError('SubmitRoleGroup error:', error)
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
    :title="modalTitle"
    size="md"
    scrollable
    @closemodal="closeModal"
  >
    <form :id="formId" @submit.prevent="submitForm" novalidate>
      <div class="form-floating mb-3" v-auto-animate>
        <input
          type="text"
          id="nameInput"
          class="form-control"
          v-model="name"
          :class="{ 'is-invalid': showErrorName }"
          :placeholder="t('admin.groups.namePlaceholder')"
        />
        <label for="nameInput">{{ t('admin.groups.namePlaceholder') }}</label>
        <div v-if="showErrorName" class="invalid-feedback">{{ t('admin.groups.nameRequired') }}</div>
      </div>

      <div class="mb-3">
        <SelectBox
          id="roleSelect"
          v-model="parentRoleId"
          :label="t('admin.groups.parentRole')"
          :options="roleSelectOptions"
          value-key="id"
          label-key="name"
          :all-label="t('admin.groups.selectRole')"
          cast-to-number
          :disabled="availableRoles.length === 0" />
        <div v-if="availableRoles.length === 0" class="form-text text-danger">
          {{ t('admin.groups.noRoles') }}
        </div>
        <div v-if="showErrorRole" class="invalid-feedback d-block">{{ t('admin.groups.parentRequired') }}</div>
      </div>

      <div class="form-floating mb-3">
        <textarea
          id="groupDescription"
          class="form-control"
          style="height: 100px"
          v-model="description"
          :placeholder="t('admin.groups.descriptionPlaceholder')"
        ></textarea>
        <label for="groupDescription">{{ t('admin.groups.descriptionPlaceholder') }}</label>
      </div>

      <div class="form-check mb-3">
        <input class="form-check-input" type="checkbox" id="activeCheckbox" v-model="isActive" />
        <label class="form-check-label" for="activeCheckbox">
          {{ t('admin.groups.activeLabel') }}
        </label>
      </div>
    </form>

    <template #footer>
      <button type="button" class="ui-btn ui-btn--secondary" :disabled="isSubmitting" @click="closeModal">
        {{ t('common.cancel') }}
      </button>
      <button type="submit" :form="formId" class="ui-btn ui-btn--primary" :disabled="isSubmitting">
        {{ submitButtonText }}
      </button>
    </template>
  </ModalCenter>
</template>
