<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { Briefcase, Calendar, MapPin } from 'lucide-vue-next'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { useUserStore } from '@/core/cms/js/userStore'
import { useProfile } from '@/core/cms/js/profileService.js'
import DefaultAvatar from '@/components/DefaultAvatar.vue'

const userStore = useUserStore()
const { getProfile, formatProfileData } = useProfile()

const profileData = ref(null)
const loading = ref(true)
const avatarLoading = ref(!userStore.avatarUrl)

const userInfo = ref({
  image: userStore.avatarUrl || null,
  username: 'Загрузка...',
  profession: 'Загрузка...',
  location: 'Загрузка...',
  registration: 'Загрузка...',
})

// Вычисляемые свойства для отображения данных
const displayUserInfo = computed(() => {
  if (!profileData.value && !userStore.user) {
    return {
      image: userInfo.value.image,
      username: 'Пользователь',
      profession: '',
      location: 'Не указано',
      registration: 'Неизвестно'
    }
  }

  const profile = profileData.value
  const user = userStore.user

  return {
    image: userInfo.value.image,
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

// Удален код для инициалов - теперь используем DefaultAvatar

// Проверяем, есть ли у пользователя кастомный аватар
const hasCustomAvatar = computed(() => {
  return !avatarLoading.value && displayUserInfo.value.image
})

// Форматирование даты регистрации
function formatRegistrationDate(dateString) {
  if (!dateString) return 'Неизвестно'
  
  const date = new Date(dateString)
  const options = { year: 'numeric', month: 'long' }
  return date.toLocaleDateString('ru-RU', options)
}

// Загрузка аватара
async function fetchAvatar() {
  try {
    console.log('🔄 fetchAvatar начало, userStore.avatarUrl:', userStore.avatarUrl)
    avatarLoading.value = true
    
    // Сначала проверяем, есть ли аватар в userStore
    if (userStore.avatarUrl) {
      userInfo.value.image = userStore.avatarUrl
      avatarLoading.value = false
      console.log('✅ Используем аватар из userStore:', userStore.avatarUrl)
      return
    }
    
    const resp = await apiClient.get(endpoints.userAvatars.list)
    if (resp.data.length && resp.data[0].image) {
      userInfo.value.image = resp.data[0].image
      console.log('✅ Загружен аватар с сервера:', resp.data[0].image)
    } else {
      // Не устанавливаем дефолтное изображение - оставляем null
      userInfo.value.image = null
      console.log('🚫 Нет аватара на сервере, оставляем null')
    }
  } catch (error) {
    // В случае ошибки тоже оставляем null вместо дефолтного изображения
    userInfo.value.image = null
    console.log('❌ Ошибка загрузки аватара:', error)
  } finally {
    avatarLoading.value = false
    console.log('🏁 fetchAvatar завершён, userInfo.value.image:', userInfo.value.image)
  }
}

// Загрузка профиля
async function fetchProfile() {
  try {
    loading.value = true
    
    // Инициализируем пользователя если еще не инициализирован
    if (!userStore.isInitialized) {
      await userStore.initializeUser()
    }
    
    // Загружаем полный профиль
    const response = await getProfile()
    profileData.value = formatProfileData(response)
  } catch (error) {
    console.error('Ошибка загрузки профиля:', error)
    // Если профиль не загрузился, используем данные из userStore
  } finally {
    loading.value = false
  }
}

// Следим за изменениями в userStore для автоматического обновления
watch(() => userStore.profile, async (newProfile) => {
  if (newProfile && !loading.value) {
    // Перезагружаем данные профиля если они изменились в store
    await fetchProfile()
  }
}, { deep: true })

// Следим за изменениями аватара в userStore
watch(() => userStore.avatarUrl, (newAvatarUrl) => {
  if (newAvatarUrl && newAvatarUrl !== userInfo.value.image) {
    userInfo.value.image = newAvatarUrl
    avatarLoading.value = false
  } else if (!newAvatarUrl && userInfo.value.image) {
    // Если avatarUrl стал null, тоже обнуляем image
    userInfo.value.image = null
    avatarLoading.value = false
  }
})

// Функция для принудительного обновления данных (экспортируем для использования в других компонентах)
const refreshData = async () => {
  loading.value = true
  avatarLoading.value = true
  
  await Promise.all([
    fetchProfile(),
    fetchAvatar()
  ])
}

// Подписываемся на обновления из userStore
watch(() => userStore.user, async (newUser, oldUser) => {
  if (newUser && (!oldUser || newUser.id !== oldUser.id)) {
    await refreshData()
  }
})

onMounted(async () => {
  console.log('🔍 CardMain onMounted - userStore.avatarUrl:', userStore.avatarUrl)
  
  // Принудительно убеждаемся что нет дефолтного изображения
  if (!userStore.avatarUrl) {
    userInfo.value.image = null
    avatarLoading.value = true
    console.log('🚫 Нет аватара в userStore, устанавливаем image = null')
  } else {
    userInfo.value.image = userStore.avatarUrl
    avatarLoading.value = false
    console.log('✅ Есть аватар в userStore:', userStore.avatarUrl)
  }
  
  // Запускаем загрузку параллельно
  await Promise.all([
    fetchProfile(),
    fetchAvatar()
  ])
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
        <div class="basic__avatar avatar rounded-circle overflow-hidden mx-auto">
          <!-- Показываем спиннер загрузки пока грузится аватар -->
          <div v-if="avatarLoading" class="avatar-loading d-flex align-items-center justify-content-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Загрузка аватара...</span>
            </div>
          </div>
          <!-- Показываем загруженное изображение если есть -->
          <img 
            v-else-if="hasCustomAvatar"
            :src="displayUserInfo.image" 
            :alt="displayUserInfo.username" 
            class="hq-avatar hq-avatar-primary" 
          />
          <!-- Показываем стандартный аватар если нет кастомного -->
          <div 
            v-else
            class="d-flex align-items-center justify-content-center"
            style="width: 100%; height: 100%;"
          >
            <DefaultAvatar 
              size="large"
              :title="displayUserInfo.username"
            />
          </div>
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
.profile__cover img {
  width: 100%;
  height: 200px;
  object-fit: cover;

  @media (width <= 992px) {
    height: 180px;
  }
  @media (width <= 575px) {
    height: 120px;
  }
}

.basic {
  position: relative;
  min-height: 150px;
  height: auto;

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

  img {
    width: 100%;
    height: 100%;
  }
  
  .avatar-loading {
    width: 100%;
    height: 100%;
    background-color: var(--bs-gray-100);
    
    .spinner-border {
      width: 2.5rem;
      height: 2.5rem;
      
      @media (width <= 992px) {
        width: 2rem;
        height: 2rem;
      }
      @media (width <= 575px) {
        width: 1.5rem;
        height: 1.5rem;
      }
    }
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
