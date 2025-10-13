<script setup>
import { Bell } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { onMounted, ref } from 'vue'

const router = useRouter()
const emit = defineEmits(['dropdown-toggle'])
const dropdownRef = ref(null)

const notificationGoTo = (routeName) => {
  router.push({ name: routeName })
}

// Обработчики событий dropdown
onMounted(() => {
  if (dropdownRef.value) {
    const dropdownElement = dropdownRef.value.querySelector('[data-bs-toggle="dropdown"]')
    if (dropdownElement) {
      dropdownElement.addEventListener('show.bs.dropdown', () => {
        emit('dropdown-toggle', true)
      })
      
      dropdownElement.addEventListener('hide.bs.dropdown', () => {
        emit('dropdown-toggle', false)
      })
    }
  }
})
</script>

<template>
  <div ref="dropdownRef" class="dropdown-center header-dropdown-center">
    <div data-bs-toggle="dropdown" aria-expanded="false" data-bs-offset="0,20">
      <div class="header-btn" v-tooltip title="Уведомления">
        <Bell :size="24" />
      </div>
    </div>
    <ul class="dropdown-menu header-dropdown-menu">
      <li class="dropdown-item d-block" @click="notificationGoTo('Messenger')">
        <p class="fw-bold mb-0">Сообщение!</p>
        <span class="text-primary">Перейти ➝</span>
      </li>
      <li class="dropdown-item d-block" @click="notificationGoTo('Email')">
        <p class="fw-bold mb-0">Письмо!</p>
        <span class="text-primary">Перейти ➝</span>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss"></style>
