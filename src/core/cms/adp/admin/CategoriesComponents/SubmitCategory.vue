<script setup>
import { ref, computed } from 'vue'
import { CreateRole } from '@/core/cms/adp/admin/js/GroupsPolitics'

const emit = defineEmits(['addCategory'])

const name = ref('')
const description = ref('')

const showErrorName = ref(false)
const DEFAULT_ROLE_TYPE = 'user'

const submitForm = async () => {
  showErrorName.value = !name.value.trim()

  if (showErrorName.value) {
    return
  }

  await CreateRole({
    name: name.value.trim(),
    role_type: DEFAULT_ROLE_TYPE,
    description: description.value || ''
  })

  emit('addCategory')
  name.value = ''
  description.value = ''
}

const canDismiss = computed(() => name.value.trim() !== '')

const close = () => {
  name.value = ''
  description.value = ''
}

defineExpose({ close })
</script>

<template>
  <form @submit.prevent="submitForm" novalidate>
    <div class="form-floating mb-3" v-auto-animate>
      <input
        type="text"
        id="nameInput"
        class="form-control"
        v-model="name"
        :class="{ 'is-invalid': showErrorName }"
        placeholder="Введите название роли"
      />
      <label for="nameInput">Введите название роли</label>
      <div v-if="showErrorName" class="invalid-feedback">Название обязательно для заполнения.</div>
    </div>

    <div class="form-floating mb-3" v-auto-animate>
      <textarea
        id="descriptionInput"
        class="form-control"
        style="height: 100px"
        v-model="description"
        placeholder="Описание роли"
      ></textarea>
      <label for="descriptionInput">Описание роли</label>
    </div>

    <div class="mt-3 text-end">
      <button type="submit" class="btn btn-primary" :data-bs-dismiss="canDismiss ? 'modal' : ''">
        Добавить
      </button>
    </div>
  </form>
</template>

<style scoped lang="scss"></style>
