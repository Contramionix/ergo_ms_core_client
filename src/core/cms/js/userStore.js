import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { apiClient } from '@/js/api/manager.js'
import { endpoints } from '@/js/api/endpoints.js'
import { profileService } from '@/core/cms/js/profileService.js'
import Cookies from 'js-cookie'

export const useUserStore = defineStore('userStore', () => {
  const toast = useToast()

  // ==== STATES ====
  const user = ref(null)
  const profile = ref(null)
  const avatarUrl = ref(null) // null означает использование стандартного аватара
  const isLoading = ref(false)
  const isInitialized = ref(false)
  let initializationPromise = null // Промис текущей инициализации для предотвращения гонки условий
  let loadProfilePromise = null // Промис текущей загрузки профиля для предотвращения гонки условий


  const isAuthenticated = computed(() => !!user.value)
  const fullName = computed(() => {
    if (!user.value) return 'Гость'
    
    // Сначала проверяем полное имя из профиля (собирается из отдельных полей)
    if (profile.value?.fullName && profile.value.fullName !== user.value.username) {
      return profile.value.fullName
    }
    
    // Собираем полное имя из отдельных полей пользователя
    const firstName = user.value.first_name?.trim() || ''
    const middleName = user.value.middle_name?.trim() || ''
    const lastName = user.value.last_name?.trim() || ''
    
    const nameParts = [firstName, middleName, lastName].filter(part => part && part.trim())
    const fullName = nameParts.join(' ')

    // Если нет ни имени, ни фамилии, возвращаем username или "Гость"
    if (!fullName) {
      return user.value.username || 'Гость'
    }
    
    return fullName
  })
  
  const displayName = computed(() => {
    const name = fullName.value
    if (name === 'Гость') return name
    
    // Если имя длинное, сокращаем до "Имя Ф."
    const parts = name.split(' ')
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0]} ${parts[1].charAt(0)}.`
    }
    return name
  })

  const userEmail = computed(() => user.value?.email || 'email не указан')
  const userRole = computed(() => profile.value?.role || 'Пользователь')
  const hasCustomAvatar = computed(() => !!avatarUrl.value)

  // ==== ACTIONS ====
  
  // Сброс состояния пользователя
  const resetUserState = () => {
    user.value = null
    profile.value = null
    avatarUrl.value = null
  }

  // Обновление базовой информации пользователя
  const updateUserData = (data) => {
    if (data) {
      user.value = {
        ...user.value,
        ...data
      }
    }
  }
  
  // Инициализация пользователя
  const initializeUser = async () => {
    // Если уже инициализирован, возвращаем успех
    if (isInitialized.value) return true
    
    // Если инициализация уже идет, ждем её завершения
    if (initializationPromise) {
      return await initializationPromise
    }

    // Создаем новый промис инициализации
    initializationPromise = (async () => {
      try {
        isLoading.value = true
        
        // Проверяем авторизацию (успешный ответ означает валидный токен)
        const authResponse = await apiClient.get(endpoints.auth.protected)
        if (!authResponse?.success) {
          throw new Error('Пользователь не авторизован')
        }

        // Загружаем минимальные данные для меню (id, username, email, full_name, initials_name)
        // full_name и initials_name доступны только через эндпоинт меню, не в профиле
        await loadMenuData()
        
        // Загружаем аватар
        await loadAvatar()
        
        isInitialized.value = true
        return true

      } catch (error) {
        console.error('Ошибка инициализации пользователя:', error)
        resetUserState()
        return false
      } finally {
        isLoading.value = false
        initializationPromise = null // Очищаем промис после завершения
      }
    })()

    return await initializationPromise
  }

  // Загрузка минимальных данных для меню
  const loadMenuData = async () => {
    try {
      // Проверяем, что endpoint существует
      if (!endpoints?.auth?.menu) {
        console.warn('Endpoint menu не найден, загружаем полный профиль')
        // Fallback: загружаем полный профиль, если menu endpoint недоступен
        await loadProfile()
        return
      }

      const response = await apiClient.get(endpoints.auth.menu)
      
      const userData = response?.data || response
      
      if (userData && userData.username && !userData.adp_profile && !userData.first_name) {
        user.value = userData
        return
      }
      
      console.warn('Menu endpoint вернул полные данные вместо легковесных, используем fallback')
      await loadProfile()
    } catch (error) {
      console.error('Ошибка загрузки данных меню:', error)
      try {
        await loadProfile()
      } catch (profileError) {
        console.error('Ошибка загрузки профиля:', profileError)
      }
    }
  }

  // Загрузка полного профиля пользователя
  const loadProfile = async () => {
    // Если профиль уже загружается, ждем завершения
    if (loadProfilePromise) {
      return await loadProfilePromise
    }
    
    // Если профиль уже загружен, не делаем повторный запрос
    if (profile.value) {
      return profile.value
    }

    // Создаем новый промис загрузки профиля
    loadProfilePromise = (async () => {
      try {
        const profileData = await profileService.getProfile()
        profile.value = profileService.formatProfileData(profileData)
        updateUserData(profileData)
        return profile.value
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error)
        // Не показываем ошибку пользователю, профиль может быть пустым
        return null
      } finally {
        loadProfilePromise = null // Очищаем промис после завершения
      }
    })()

    return await loadProfilePromise
  }

  // Загрузка аватара пользователя
  const loadAvatar = async () => {
    try {
      const response = await apiClient.get(endpoints.userAvatars.list)
      if (response.data?.length && response.data[0].image) {
        avatarUrl.value = response.data[0].image
      }
    } catch (error) {
      console.error('Ошибка загрузки аватара:', error)
      // Оставляем дефолтный аватар
    }
  }

  // Обновление профиля
  const updateProfile = async (profileData) => {
    try {
      isLoading.value = true
      const updatedProfile = await profileService.updateProfile(profileData)
      profile.value = profileService.formatProfileData(updatedProfile)
      updateUserData(updatedProfile)
      toast.success('Профиль успешно обновлен')
      return updatedProfile

    } catch (error) {
      console.error('Ошибка обновления профиля:', error)
      toast.error('Ошибка обновления профиля')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // Обновление аватара
  const updateAvatar = async (file) => {
    try {
      if (!file || !file.type.startsWith('image/')) {
        toast.error('Пожалуйста, выберите изображение!')
        return false
      }

      const formData = new FormData()
      formData.append('image', file)
      
      await apiClient.post(endpoints.userAvatars.create, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      
      // Перезагружаем аватар
      await loadAvatar()
      toast.success('Аватар успешно обновлён')
      return true

    } catch (error) {
      console.error('Ошибка обновления аватара:', error)
      toast.error('Ошибка загрузки аватара')
      return false
    }
  }

  // Сброс аватара
  const resetAvatar = async () => {
    try {
      await apiClient.delete(endpoints.userAvatars.deleteCurrent)
      avatarUrl.value = null // Используем стандартный аватар
      toast.success('Аватар сброшен')
      return true

    } catch (error) {
      console.error('Ошибка сброса аватара:', error)
      toast.error('Ошибка сброса аватара')
      return false
    }
  }

  // Выход из системы
  const logout = () => {
    resetUserState()
    isInitialized.value = false
    
    // Очищаем куки
    Cookies.remove('csrftoken')
    
    // Очищаем активную организацию при выходе
    try {
      const STORAGE_KEY = 'crm_active_organization'
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Ошибка очистки активной организации при выходе:', error)
    }
    
    // Перенаправляем на страницу входа
    window.location.href = '/login'
  }

  // Принудительная перезагрузка данных пользователя
  const refreshUserData = async () => {
    isInitialized.value = false
    return await initializeUser()
  }

  // Обновление всех данных (профиль + аватар) для реактивности компонентов
  const refreshAllData = async () => {
    try {
      isLoading.value = true
      await Promise.all([
        loadProfile(),
        loadAvatar()
      ])
      return true
    } catch (error) {
      console.error('Ошибка обновления данных:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    // States
    user,
    profile,
    avatarUrl,
    isLoading,
    isInitialized,
    
    // Getters
    isAuthenticated,
    fullName,
    displayName,
    userEmail,
    userRole,
    hasCustomAvatar,
    
    // Actions
    initializeUser,
    loadProfile,
    loadAvatar,
    updateProfile,
    updateAvatar,
    resetAvatar,
    logout,
    refreshUserData,
    refreshAllData
  }
}) 