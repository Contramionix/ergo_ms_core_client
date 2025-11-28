<script setup>
import { ref, watch, computed } from 'vue'
import { UpdateRole } from '@/core/cms/adp/admin/js/GroupsPolitics'

const emit = defineEmits(['changeCategory'])

const props = defineProps({
  row: { type: Object, required: true },
})

const roleId = ref(null)
const name = ref('')
const roleType = ref('user')
const description = ref('')
const isSystem = ref(false)

const showErrorName = ref(false)

watch(
  () => props.row,
  newRow => {
    roleId.value = newRow.id
    name.value = newRow.name || ''
    roleType.value = newRow.role_type || 'user'
    description.value = newRow.description || ''
    isSystem.value = Boolean(newRow.is_system)
  },
  { immediate: true }
)

const submitForm = async () => {
  showErrorName.value = !name.value.trim()

  if (showErrorName.value || !roleId.value) {
    return
  }

  await UpdateRole(roleId.value, {
    name: name.value.trim(),
    role_type: roleType.value,
    description: description.value || ''
  })

  emit('changeCategory')
}

const canDismiss = computed(() => name.value.trim() !== '')
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
        id="descriptionInputChange"
        class="form-control"
        style="height: 100px"
        v-model="description"
        placeholder="Описание роли"
      ></textarea>
      <label for="descriptionInputChange">Описание роли</label>
    </div>

    <div class="mt-3 text-end">
      <button type="submit" class="btn btn-primary" :data-bs-dismiss="canDismiss ? 'modal' : ''">
        Изменить
      </button>
    </div>
  </form>
</template>

<style scoped lang="scss"></style>
