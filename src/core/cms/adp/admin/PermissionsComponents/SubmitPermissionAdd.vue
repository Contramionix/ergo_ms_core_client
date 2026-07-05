<script setup>
import { ref, computed } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import SelectBox from '@/components/SelectBox.vue'
import { CreatePolicy } from '@/core/cms/adp/admin/js/GroupsPolitics'
import {
  POLICY_TYPE_OPTIONS,
  POLICY_ACTION_OPTIONS,
  mapRoleSelectOptions,
  mapRoleGroupSelectOptions,
} from '@/core/cms/js/adminSelectOptions.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  modalId: { type: String, default: 'policyAdd' },
  roles: { type: Array, required: true },
  roleGroups: { type: Array, required: true },
})

const emit = defineEmits(['update:visible', 'addPermission'])

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

const resetForm = () => {
  name.value = ''
  policyType.value = 'url'
  action.value = 'allow'
  resourcePath.value = ''
  isPattern.value = false
  priority.value = 0
  targetType.value = 'role'
  selectedRoleId.value = null
  selectedRoleGroupId.value = null
  showErrorName.value = false
  showErrorResource.value = false
  showErrorTarget.value = false
}

const closeModal = () => {
  resetForm()
  emit('update:visible', false)
}

const submitForm = async () => {
  showErrorName.value = !name.value.trim()
  showErrorResource.value = !resourcePath.value.trim()
  showErrorTarget.value =
    (targetType.value === 'role' && !selectedRoleId.value) ||
    (targetType.value === 'role_group' && !selectedRoleGroupId.value)

  if (showErrorName.value || showErrorResource.value || showErrorTarget.value) {
    return
  }

  try {
    isSubmitting.value = true
    await CreatePolicy({
      name: name.value.trim(),
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
  <ModalCenter :modal-id="modalId" standalone :visible="visible" title="Добавить новую политику" size="lg" scrollable @closemodal="closeModal">
    <form :id="formId" @submit.prevent="submitForm" novalidate>
      <div class="form-floating mb-3" v-auto-animate>
        <input type="text" id="policyNameInput" class="form-control" v-model="name" :class="{ 'is-invalid': showErrorName }" placeholder="Введите название политики"/>
        <label for="policyNameInput">Введите название политики</label>
        <div v-if="showErrorName" class="invalid-feedback">Название обязательно для заполнения.</div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-md-6">
          <SelectBox
            id="policyTypeSelect"
            v-model="policyType"
            label="Тип политики"
            :options="POLICY_TYPE_OPTIONS"
            value-key="id"
            label-key="name"
            :include-all-option="false" />
        </div>
        <div class="col-md-6">
          <SelectBox
            id="actionSelect"
            v-model="action"
            label="Действие"
            :options="POLICY_ACTION_OPTIONS"
            value-key="id"
            label-key="name"
            :include-all-option="false" />
        </div>
      </div>

      <div class="form-floating mb-3" v-auto-animate>
        <input type="text" id="resourceInput" class="form-control" v-model="resourcePath" :class="{ 'is-invalid': showErrorResource }" placeholder="Введите путь ресурса"/>
        <label for="resourceInput">Путь ресурса</label>
        <div v-if="showErrorResource" class="invalid-feedback">Ресурс обязателен.</div>
      </div>

      <div class="form-check form-switch mb-3">
        <input class="form-check-input" type="checkbox" role="switch" id="patternSwitch" v-model="isPattern" />
        <label class="form-check-label" for="patternSwitch">Использовать шаблон (wildcards)</label>
      </div>

      <div class="mb-3">
        <label for="priorityInput" class="form-label">Приоритет</label>
        <input type="number" id="priorityInput" class="form-control" v-model.number="priority"/>
        <small class="text-muted">Больший приоритет применяется в первую очередь.</small>
      </div>

      <div class="mb-3">
        <label class="form-label d-block">Цель политики</label>
        <div class="btn-group mb-2" role="group">
          <input type="radio" class="btn-check" name="targetTypeAdd" id="targetRoleAdd" value="role" v-model="targetType"/>
          <label class="btn btn-outline-primary" for="targetRoleAdd">Роль</label>

          <input type="radio" class="btn-check" name="targetTypeAdd" id="targetGroupAdd" value="role_group" v-model="targetType"/>
          <label class="btn btn-outline-primary" for="targetGroupAdd">Ролевая группа</label>
        </div>

        <SelectBox
          v-if="targetType === 'role'"
          v-model="selectedRoleId"
          :options="roleSelectOptions"
          value-key="id"
          label-key="name"
          all-label="Выберите роль"
          cast-to-number />

        <SelectBox
          v-else
          v-model="selectedRoleGroupId"
          :options="roleGroupSelectOptions"
          value-key="id"
          label-key="name"
          all-label="Выберите ролевую группу"
          cast-to-number />

        <div v-if="showErrorTarget" class="invalid-feedback d-block">
          Необходимо выбрать цель политики.
        </div>
      </div>
    </form>

    <template #footer>
      <button type="button" class="ui-btn ui-btn--secondary" :disabled="isSubmitting" @click="closeModal">
        Отмена
      </button>
      <button type="submit" :form="formId" class="ui-btn ui-btn--primary" :disabled="isSubmitting">
        {{ isSubmitting ? 'Сохранение...' : 'Добавить' }}
      </button>
    </template>
  </ModalCenter>
</template>