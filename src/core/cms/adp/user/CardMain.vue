<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { Briefcase, Calendar, MapPin } from 'lucide-vue-next'
import { useUserStore } from '@/core/cms/js/userStore'
import UserAvatar from '@/components/UserAvatar.vue'
import { logError } from '@/js/utils/logError.js'

const userStore = useUserStore()

const profileData = ref(null)
const loading = ref(true)

// Вычисляемые свойства для отображения данных
const displayUserInfo = computed(() => {
  if (!profileData.value && !userStore.user) {
    return {
      username: 'Пользователь',
      profession: '',
      location: 'Не указано',
      registration: 'Неизвестно'
    }
  }

  const profile = profileData.value
  const user = userStore.user

  return {
    username: profile?.fullName || userStore.fullName || 'Гость',
    profession: profile?.bio || '',
    location: profile?.city && profile?.country 
      ? `${profile.city}, ${profile.country}` 
      : profile?.city || profile?.country || 'Не указано',
    registration: user?.date_joined 
      ? formatRegistrationDate(user.date_joined)
      : 'Неизвестно'
  }
})

// Форматирование даты регистрации
function formatRegistrationDate(dateString) {
  if (!dateString) return 'Неизвестно'
  
  const date = new Date(dateString)
  const options = { year: 'numeric', month: 'long' }
  return date.toLocaleDateString('ru-RU', options)
}

// Загрузка профиля
async function fetchProfile() {
  try {
    loading.value = true
    
    // Инициализируем пользователя если еще не инициализирован
    if (!userStore.isInitialized) {
      await userStore.initializeUser()
    }
    
    // Используем данные из userStore, если они уже загружены
    if (userStore.profile) {
      profileData.value = userStore.profile
      return
    }
    
    await userStore.loadProfile()
    
    // Используем данные из store после загрузки
    if (userStore.profile) {
      profileData.value = userStore.profile
    }
  } catch (error) {
    logError('Ошибка загрузки профиля:', error)
    if (userStore.profile) {
      profileData.value = userStore.profile
    }
  } finally {
    loading.value = false
  }
}

// Следим за изменениями в userStore для автоматического обновления
watch(() => userStore.profile, (newProfile) => {
  if (newProfile && !loading.value) {
    // Просто обновляем локальные данные из store без нового запроса
    profileData.value = newProfile
  }
}, { deep: true })

// Функция для принудительного обновления данных (экспортируем для использования в других компонентах)
const refreshData = async () => {
  loading.value = true
  await fetchProfile()
}

// Подписываемся на обновления из userStore
watch(() => userStore.user, async (newUser, oldUser) => {
  if (newUser && (!oldUser || newUser.id !== oldUser.id)) {
    await refreshData()
  }
})

onMounted(async () => {
  // Инициализируем профиль из userStore если он есть
  if (userStore.profile) {
    profileData.value = userStore.profile
    loading.value = false
  }
  
  // Загружаем профиль
  await fetchProfile()
})

// Экспортируем функцию для внешнего использования
defineExpose({
  refreshData
})
</script>


<template>
  <div class="profile__cover col-12">
    <img src="@/core/cms/assets/profile-cover.png" alt="Profile Cover" />
  </div>
  <div class="profile__basic basic card col-12">
    <div class="row px-0 px-lg-3">
      <div class="col-12 col-xxl-2 col-lg-3">
        <div class="basic__avatar avatar rounded-circle overflow-hidden mx-auto d-flex justify-content-center align-items-center">
          <UserAvatar 
            :size="120"
            :title="displayUserInfo.username"
          />
        </div>
      </div>
      <div class="col-12 col-xxl-10 col-lg-9">
        <div
          class="basic__user d-flex flex-column flex-md-row align-items-md-center justify-content-start justify-content-md-between"
        >
          <div class="basic__data d-flex flex-column gap-2 text-center text-md-start">
            <!-- Показываем спиннер загрузки во время загрузки -->
            <h3 class="basic__username">
              <span v-if="loading" class="d-inline-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status">
                  <span class="visually-hidden">Загрузка...</span>
                </div>
                Загрузка...
              </span>
              <span v-else>{{ displayUserInfo.username }}</span>
            </h3>
            <div class="basic__about">
              <ul
                class="list-unstyled mb-3 mb-lg-0 d-flex align-items-center flex-wrap justify-content-lg-start justify-content-center gap-3"
              >
                <li v-if="displayUserInfo.profession" class="d-flex align-items-center gap-2">
                  <div class="icon-flex text-muted"><Briefcase :size="22" /></div>
                  <div class="text-muted">{{ displayUserInfo.profession }}</div>
                </li>
                <li class="d-flex align-items-center gap-2">
                  <div class="icon-flex text-muted"><MapPin :size="22" /></div>
                  <div class="text-muted">{{ displayUserInfo.location }}</div>
                </li>
                <li class="d-flex align-items-center gap-2">
                  <div class="icon-flex text-muted"><Calendar :size="22" /></div>
                  <div class="text-muted">{{ displayUserInfo.registration }}</div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.profile__cover {
  overflow: hidden;
  border-radius: 0.375rem 0.375rem 0 0;
  
  img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
  }

  @media (width <= 992px) {
    img {
      height: 180px;
    }
  }
  @media (width <= 575px) {
    img {
      height: 120px;
    }
  }
}

.basic {
  position: relative;
  min-height: 150px;
  height: auto;
  border-radius: 0 0 0.375rem 0.375rem;

  @media (width <= 992px) {
    height: 200px;
  }
  @media (width <= 767px) {
    height: 250px;
  }
  @media (width <= 575px) {
    height: 220px;
  }
  @media (width <= 415px) {
    height: 260px;
  }

  & .row {
    position: absolute;
    top: -50px;
    left: 12px;

    width: 100%;
  }
}

.basic__avatar {
  width: 180px;
  height: 180px;

  @media (width <= 992px) {
    width: 150px;
    height: 150px;
  }
  @media (width <= 575px) {
    width: 120px;
    height: 120px;
  }
}

.basic__user {
  margin-top: 85px;

  @media (width >= 1400px) {
    padding-left: 3%;
  }

  @media (width <= 992px) {
    margin-top: 16px;
  }
}
</style>
