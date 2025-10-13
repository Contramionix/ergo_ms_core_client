<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue'
import { CircleUserRound, Power } from 'lucide-vue-next'
import { useUserStore } from '@/core/cms/js/userStore.js'
import DefaultAvatar from '@/components/DefaultAvatar.vue'
import { Dropdown } from 'bootstrap/dist/js/bootstrap.bundle.min.js'

const userStore = useUserStore()
const dropdownElement = ref(null)
let dropdownInstance = null

const emit = defineEmits(['dropdown-toggle'])

// Обработка ошибки загрузки изображения
const onImageError = () => {
  console.error('Ошибка загрузки аватара в UserMenu')
}

// Инициализируем пользователя при загрузке компонента
onMounted(async () => {
  if (!userStore.isInitialized) {
    await userStore.initializeUser()
  }
  
  // Инициализируем Bootstrap dropdown
  await nextTick()
  if (dropdownElement.value) {
    dropdownInstance = new Dropdown(dropdownElement.value)
    
    // Добавляем обработчики событий для отслеживания состояния dropdown
    dropdownElement.value.addEventListener('show.bs.dropdown', () => {
      emit('dropdown-toggle', true)
    })
    
    dropdownElement.value.addEventListener('hide.bs.dropdown', () => {
      emit('dropdown-toggle', false)
    })
  }
})

// Очищаем instance при размонтировании
onUnmounted(() => {
  if (dropdownInstance) {
    dropdownInstance.dispose()
    dropdownInstance = null
  }
})


// Инициализация пользователя при загрузке
const userDropdownMenu = ref([
  {
    id: 1,
    title: 'Профиль',
    icon: CircleUserRound,
    link: { name: 'User' },
  },
  {
    id: 2,
    title: 'Выход',
    icon: Power,
    link: { name: 'logout' },
  },
])
</script>

<template>
  <div class="dropdown">
    <div
      ref="dropdownElement"
      class="tools__avatar avatar"
      data-bs-toggle="dropdown"
      aria-expanded="false"
      data-bs-offset="16,20"
    >
      <!-- Показываем загруженное изображение если есть -->
      <img 
        v-if="userStore.hasCustomAvatar"
        :src="userStore.avatarUrl"
        :alt="userStore.displayName"
        class="user-avatar-image"
        @error="onImageError"
      />
      <!-- Показываем стандартный аватар если нет кастомного -->
      <DefaultAvatar 
        v-else
        size="medium"
        :clickable="true"
        :title="userStore.displayName"
      />
    </div>
    <ul class="dropdown-menu dropdown-menu-end">
      <!-- Информация о пользователе -->
      <li class="dropdown-header px-3 py-2 border-bottom">
        <div class="d-flex align-items-center">
          <div class="me-2">
            <!-- Показываем загруженное изображение если есть -->
            <img 
              v-if="userStore.hasCustomAvatar"
              :src="userStore.avatarUrl"
              :alt="userStore.displayName"
              class="user-avatar-small"
              @error="onImageError"
            />
            <!-- Показываем стандартный аватар если нет кастомного -->
            <DefaultAvatar 
              v-else
              size="small"
              :title="userStore.displayName"
            />
          </div>
          <div class="flex-grow-1 min-width-0">
            <div class="fw-semibold text-truncate">{{ userStore.displayName }}</div>
            <small class="text-muted text-truncate d-block">{{ userStore.userEmail }}</small>
          </div>
        </div>
        <div v-if="userStore.isLoading" class="mt-1">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Загрузка...</span>
          </div>
        </div>
      </li>
      
      <!-- Меню -->
      <li v-for="item in userDropdownMenu" :key="item.id">
        <RouterLink
          :to="item.link"
          class="dropdown-item header-dropdown-item"
          active-class="active"
          :style="{ transitionDelay: `${item.id * 50}ms` }"
        >
          <span class="icon-flex">
            <component :is="item.icon" :size="22" />
          </span>
          <span>{{ item.title }}</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.avatar img {
  width: 40px;
  height: 40px;
}

.dropdown .dropdown-menu-end {
  inset: 0 0 auto auto;
  transform: translate(16px, 60px);
  min-width: 280px;
}

.dropdown-item {
  @include flex-row-gap(12px, center);
  transition: all $transition;
  padding: $padding-internal $padding-external;
}

.dropdown-header {
  background-color: var(--bs-gray-50);
  border-bottom: 1px solid var(--bs-border-color);
  
  .text-truncate {
    max-width: 200px;
  }
}

.min-width-0 {
  min-width: 0;
}

// Стили для загруженных изображений аватара
.user-avatar-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    transform: scale(1.05);
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
}

.user-avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}


 
</style>
