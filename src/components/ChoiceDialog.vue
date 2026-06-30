<script setup>
import { computed } from 'vue'
import { AlertTriangle, X } from 'lucide-vue-next'
import ModalCenter from '@/components/ModalCenter.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Выберите действие' },
  message: { type: String, default: '' },
  choices: {
    type: Array,
    default: () => [],
    validator: (choices) => choices.length === 0 || choices.every(choice =>
      choice.label && choice.value && choice.variant
    ),
  },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['choice', 'cancel', 'close'])

const isVisible = computed(() => props.show && !!props.message && props.choices.length > 0)

function handleChoice(choice) {
  if (!props.loading) {
    emit('choice', choice.value)
  }
}

function handleCancel() {
  if (!props.loading) {
    emit('cancel')
    emit('close')
  }
}

function handleClose() {
  if (!props.loading) {
    emit('close')
  }
}

function getButtonClass(variant) {
  const baseClass = 'btn'
  switch (variant) {
    case 'danger': return `${baseClass} btn-danger`
    case 'warning': return `${baseClass} btn-warning`
    case 'primary': return `${baseClass} btn-primary`
    case 'secondary': return `${baseClass} btn-secondary`
    default: return `${baseClass} btn-secondary`
  }
}
</script>

<template>
  <ModalCenter
    standalone
    modal-id="choiceDialog"
    :visible="isVisible"
    custom-class="choice-dialog"
    :close-on-backdrop="!loading"
    :close-on-esc="!loading"
    @close="handleClose"
  >
    <template #title>
      <AlertTriangle :size="24" class="text-warning" />
      <span>{{ title }}</span>
    </template>

    <p class="mb-3 cd-message">{{ message }}</p>

    <div class="d-grid gap-2">
      <button
        v-for="choice in choices"
        :key="choice.value"
        :class="getButtonClass(choice.variant)"
        @click="handleChoice(choice)"
        :disabled="loading"
      >
        <span
          v-if="loading"
          class="spinner-border spinner-border-sm me-2"
          role="status"
        ></span>
        <component
          v-if="choice.icon"
          :is="choice.icon"
          :size="16"
          class="me-2"
        />
        {{ choice.label }}
      </button>
    </div>

    <template #footer>
      <button
        type="button"
        class="btn btn-secondary"
        @click="handleCancel"
        :disabled="loading"
      >
        <X :size="16" class="me-2" />
        Отмена
      </button>
    </template>
  </ModalCenter>
</template>

<style scoped>
.cd-message {
  color: #6c757d;
}

.btn {
  border-radius: 8px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.d-grid .btn {
  width: 100%;
}
</style>
