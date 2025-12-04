<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick, watch } from 'vue'
import { CircleUserRound, Power, Building2 } from 'lucide-vue-next'
import { useUserStore } from '@/core/cms/js/userStore.js'
import DefaultAvatar from '@/components/DefaultAvatar.vue'
import { Dropdown } from 'bootstrap/dist/js/bootstrap.bundle.min.js'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { logout as authLogout } from '@/core/cms/adp/js/auth-index'

const userStore = useUserStore()
const dropdownElement = ref(null)
let dropdownInstance = null

const organizations = ref([])
const hasOrganizations = computed(() => organizations.value.length > 0)

const emit = defineEmits(['dropdown-toggle'])

const baseMenuItems = [
  {
    id: 1,
    title: 'Профиль',
    icon: CircleUserRound,
    link: { name: 'User' },
  },
  {
    id: 3,
    title: 'Выход',
    icon: Power,
    link: { name: 'logout' },
  },
]

const organizationMenuItem = {
  id: 2,
  title: 'Организация',
  icon: Building2,
  link: { name: 'OrganizationSettingsMain' },
}

const menuItems = computed(() => {
  const items = baseMenuItems.slice()
  if (hasOrganizations.value) {
    items.splice(1, 0, organizationMenuItem)
  }
  return items
})

// Нормализация ответа от API организаций
const normalizeOrganizationsResponse = (data) => {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.results)) {
    return data.results
  }

  return []
}

// Загрузка организаций пользователя
const fetchUserOrganizations = async () => {
  // Проверяем наличие эндпоинта (модуль organizations может быть не установлен)
  if (!endpoints?.organizations?.list) {
    return []
  }

  try {
    const response = await apiClient.get(endpoints.organizations.list)
    return normalizeOrganizationsResponse(response.data)
  } catch {
    return []
  }
}

// Состояние ошибки загрузки аватара
const avatarLoadError = ref(false)

// Сбрасываем ошибку при изменении URL аватара
watch(() => userStore.avatarUrl, () => {
  avatarLoadError.value = false
})

// Обработка ошибки загрузки изображения
const onImageError = () => {
  console.error('Ошибка загрузки аватара в UserMenu:', userStore.avatarUrl)
  avatarLoadError.value = true
}

// Централизованный выход из аккаунта
const handleLogout = async () => {
  try {
    // Очищаем токены и связанные с ними данные через auth-сервис
    await authLogout()
  } catch (error) {
    console.error('Ошибка при logout через auth сервис:', error)
  }

  try {
    // Дополнительно очищаем токены API-клиента (на случай разных сценариев выхода)
    apiClient.logout()
  } catch (error) {
    console.error('Ошибка при logout через apiClient:', error)
  }

  // Сбрасываем состояние пользователя и выполняем редирект на /login
  userStore.logout()

  // Закрываем dropdown, если он ещё видим (на случай, если редирект не сработает мгновенно)
  if (dropdownInstance) {
    try {
      dropdownInstance.hide()
    } catch (_) {
      // игнорируем ошибки закрытия dropdown
    }
  }
}

// Инициализируем пользователя при загрузке компонента
onMounted(async () => {
  let isUserReady = userStore.isInitialized
  if (!isUserReady) {
    isUserReady = await userStore.initializeUser()
  }

  if (isUserReady) {
    organizations.value = await fetchUserOrganizations()
  } else {
    organizations.value = []
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
      <!-- Показываем загруженное изображение если есть и нет ошибки -->
      <img 
        v-if="userStore.hasCustomAvatar && !avatarLoadError"
        :src="userStore.avatarUrl"
        :alt="userStore.displayName"
        class="user-avatar-image"
        @error="onImageError"
      />
      <!-- Показываем стандартный аватар если нет кастомного или ошибка загрузки -->
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
            <!-- Показываем загруженное изображение если есть и нет ошибки -->
            <img 
              v-if="userStore.hasCustomAvatar && !avatarLoadError"
              :src="userStore.avatarUrl"
              :alt="userStore.displayName"
              class="user-avatar-small"
              @error="onImageError"
            />
            <!-- Показываем стандартный аватар если нет кастомного или ошибка загрузки -->
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
      <li v-for="(item, index) in menuItems" :key="item.id">
        <!-- Для пункта "Выход" выполняем централизованный logout без роутинга -->
        <button
          v-if="item.link?.name === 'logout'"
          type="button"
          class="dropdown-item header-dropdown-item w-100 text-start"
          :style="{ transitionDelay: `${(index + 1) * 50}ms` }"
          @click="handleLogout"
        >
          <span class="icon-flex">
            <component :is="item.icon" :size="22" />
          </span>
          <span>{{ item.title }}</span>
        </button>
        <RouterLink
          v-else
          :to="item.link"
          class="dropdown-item header-dropdown-item"
          active-class="active"
          :style="{ transitionDelay: `${(index + 1) * 50}ms` }"
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
