<template>
  <ModalCenter standalone :visible="true" modal-id="menuSeparatorModal" :title="isEditing ? t('admin.menu.editSeparatorTitle') : t('admin.menu.addSeparatorTitle')" @closemodal="$emit('close')">
    <form @submit.prevent="handleSubmit">
      <div class="mb-3">
        <label class="form-label">{{ t('admin.menu.name') }} <span class="text-danger">*</span></label>
        <input v-model="form.name" type="text" class="form-control" required :placeholder="t('admin.menu.separatorNamePlaceholder')"/>
        <div class="form-text">{{ t('admin.menu.separatorHelp') }}</div>
      </div>
    </form>
    <div class="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
      <button type="button" class="ui-btn ui-btn--secondary" @click="$emit('close')">{{ t('common.cancel') }}</button>
      <button type="button" class="ui-btn ui-btn--primary" @click="handleSubmit" :disabled="!isFormValid">
        {{ isEditing ? t('common.save') : t('common.create') }}
      </button>
    </div>
  </ModalCenter>
</template>

<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { ref, computed, watch } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'

const { t } = useAppI18n()


const props = defineProps({
  separator: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['save', 'close'])

const isEditing = computed(() => !!props.separator?.id)

const form = ref({
  name: '',
  before_order: 0,
  is_active: true
})

watch(() => props.separator, (newSeparator) => {
  if (newSeparator) {
    form.value = {
      id: newSeparator.id,
      name: newSeparator.name || '',
      before_order: newSeparator.before_order || 0,
      is_active: newSeparator.is_active !== false
    }
  } else {
    form.value = {
      name: '',
      before_order: 0,
      is_active: true
    }
  }
}, { immediate: true })

const isFormValid = computed(() => {
  return !!form.value.name
})

function handleSubmit() {
  if (!isFormValid.value) return
  emit('save', { ...form.value })
}
</script>