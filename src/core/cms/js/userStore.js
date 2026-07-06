import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { apiClient } from '@/js/api/manager.js'
import { mediaApiClient } from '@/js/api/media-api-client.js'
import { cmsEndpoints as endpoints } from '@/core/cms/js/endpoints.js'
import { profileService } from '@/core/cms/js/profileService.js'
import { applyMenuBootstrap } from '@/core/cms/js/menuService.js'
import { applyPermissionsBootstrap, invalidatePermissionsSnapshot } from '@/core/cms/adp/js/accessControl.js'
import {
  clearSessionBootstrapCache,
  setSessionBootstrapCache,
} from '@/core/cms/js/sessionBootstrapCache.js'
import { invalidateAdminAccessCache } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { applyRealtimeConfigFromApi } from '@/js/realtime/config.js'
import { resetPresenceConnection } from '@/core/cms/adp/js/presence/usePresenceConnection.js'
import { resetPresenceStore } from '@/core/cms/adp/js/presence/presenceStore.js'
import {
  ensureAvatarDisplaySrc,
  invalidateAvatar,
  clearAvatarCache,
  avatarCacheKey,
} from '@/js/avatarCache.js'
import { showBootstrapMask } from '@/js/bootstrapMask.js'
import { logError, logWarn } from '@/js/utils/logError.js'
import Cookies from 'js-cookie'

export const useUserStore = defineStore('userStore', () => {
  const toast = useToast()

  // ==== STATES ====
  const user = ref(null)
  const profile = ref(null)
  const avatarUrl = ref(null) // null означает использование стандартного аватара
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const accessToPanel = ref(false)
  let initializationPromise = null // Промис текущей инициализации для предотвращения гонки условий
  let bootstrapPromise = null
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

  const greetingName = computed(() => {
    if (!user.value) return 'пользователь'

    const firstName =
      user.value.first_name?.trim() || profile.value?.firstName?.trim() || ''
    const middleName =
      user.value.middle_name?.trim() || profile.value?.middleName?.trim() || ''

    if (firstName && middleName) return `${firstName} ${middleName}`
    if (firstName) return firstName
    return user.value.username || 'пользователь'
  })

  const menuUserName = computed(() => {
    if (!user.value) return 'Гость'

    if (user.value.initials_name?.trim()) {
      return user.value.initials_name
    }
    if (user.value.full_name?.trim()) {
      return user.value.full_name
    }
    return fullName.value
  })

  const menuUserNameTruncated = computed(() => {
    const name = menuUserName.value
    if (name.length > 30) {
      return `${name.substring(0, 30)}...`
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
    accessToPanel.value = false
    clearSessionBootstrapCache()
    invalidateAdminAccessCache()
    invalidatePermissionsSnapshot()
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
  
  // Агрегированная загрузка сессии (session-bootstrap)
  const loadSessionBootstrap = async () => {
    if (isInitialized.value) {
      return true
    }
    if (bootstrapPromise) {
      return bootstrapPromise
    }

    bootstrapPromise = (async () => {
      try {
        isLoading.value = true
        const response = await apiClient.get(endpoints.auth.sessionBootstrap)
        if (!response?.success) {
          throw new Error('Не удалось загрузить данные сессии')
        }

        const data = response.data || response
        setSessionBootstrapCache(data)

        if (data.user) {
          updateUserData(data.user)
        }
        if (data.profile) {
          profile.value = profileService.formatProfileData(data.profile)
        }
        if (data.avatar_url) {
          avatarUrl.value = data.avatar_url
        } else {
          avatarUrl.value = null
        }
        if (data.menu) {
          await applyMenuBootstrap(data.menu)
        }
        if (data.realtime) {
          applyRealtimeConfigFromApi(data.realtime)
        }
        if (data.permissions) {
          applyPermissionsBootstrap(data.permissions)
        }
        accessToPanel.value = Boolean(data.access_to_panel)

        isInitialized.value = true
        return true
      } catch (error) {
        logError('Ошибка загрузки session-bootstrap:', error)
        resetUserState()
        return false
      } finally {
        isLoading.value = false
        bootstrapPromise = null
      }
    })()

    return bootstrapPromise
  }

  // Инициализация пользователя (legacy / fallback)
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
        logError('Ошибка инициализации пользователя:', error)
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
        logWarn('Endpoint menu не найден, загружаем полный профиль')
        // Fallback: загружаем полный профиль, если menu endpoint недоступен
        await loadProfile()
        return
      }

      const response = await apiClient.get(endpoints.auth.menu)
      
      const userData = response?.data || response
      
      if (userData?.username && !userData.adp_profile && userData.initials_name !== undefined) {
        updateUserData(userData)
        return
      }
      
      logWarn('Menu endpoint вернул полные данные вместо легковесных, используем fallback')
      await loadProfile()
    } catch (error) {
      logError('Ошибка загрузки данных меню:', error)
      try {
        await loadProfile()
      } catch (profileError) {
        logError('Ошибка загрузки профиля:', profileError)
      }
    }
  }

  // Загрузка полного профиля пользователя
  const loadProfile = async (force = false) => {
    // Если профиль уже загружается, ждем завершения
    if (loadProfilePromise) {
      return await loadProfilePromise
    }
    
    // Если профиль уже загружен, не делаем повторный запрос
    if (profile.value && !force) {
      return profile.value
    }

    // Создаем новый промис загрузки профиля
    loadProfilePromise = (async () => {
      try {
        const profileData = await profileService.getProfile()
        profile.value = profileService.formatProfileData(profileData)
        updateUserData(profileData)
        if (force) {
          await loadMenuData()
        }
        return profile.value
      } catch (error) {
        logError('Ошибка загрузки профиля:', error)
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
        const newUrl = response.data[0].image
        const prevUrl = avatarUrl.value
        if (prevUrl && avatarCacheKey(prevUrl) === avatarCacheKey(newUrl)) {
          return
        }
        avatarUrl.value = newUrl
      }
    } catch (error) {
      logError('Ошибка загрузки аватара:', error)
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && user.value) {
        loadAvatar()
      }
    })
  }

  // Обновление профиля
  const updateProfile = async (profileData) => {
    try {
      isLoading.value = true
      await profileService.updateProfile(profileData)
      await loadProfile(true)
      toast.success('Профиль успешно обновлен')
      return profile.value

    } catch (error) {
      logError('Ошибка обновления профиля:', error)
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

      const uploadResult = await mediaApiClient.upload(file, {
        targetDir: 'avatars/',
        allowedTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
        maxSize: 5 * 1024 * 1024,
      })

      await apiClient.post(endpoints.userAvatars.create, {
        image_path: uploadResult.path,
      })

      // Сбрасываем кеш старой аватарки, затем перезагружаем новую
      invalidateAvatar(avatarUrl.value)
      await loadAvatar()
      toast.success('Аватар успешно обновлён')
      return true

    } catch (error) {
      logError('Ошибка обновления аватара:', error)
      toast.error('Ошибка загрузки аватара')
      return false
    }
  }

  // Сброс аватара
  const resetAvatar = async () => {
    try {
      await apiClient.delete(endpoints.userAvatars.deleteCurrent)
      invalidateAvatar(avatarUrl.value)
      avatarUrl.value = null // Используем стандартный аватар
      toast.success('Аватар сброшен')
      return true

    } catch (error) {
      logError('Ошибка сброса аватара:', error)
      toast.error('Ошибка сброса аватара')
      return false
    }
  }

  // Выход из системы
  const logout = () => {
    // Скрываем интерфейс до сброса состояния, иначе аватарка на миг
    // схлопывается в гостевую иконку перед полным переходом на /login.
    showBootstrapMask()
    resetPresenceConnection()
    resetPresenceStore()
    clearAvatarCache()
    resetUserState()
    isInitialized.value = false
    
    Cookies.remove('csrftoken')

    window.location.href = '/login'
  }

  // Гарантирует полную готовность пользователя перед входом в интерфейс:
  // базовые данные, профиль (first_name/last_name для стабильных инициалов) и
  // прогретый кеш аватарки. Идемпотентна — вызывается при входе и при загрузке.
  const ensureUserReady = async () => loadSessionBootstrap()

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
        loadProfile(true),
        loadAvatar()
      ])
      return true
    } catch (error) {
      logError('Ошибка обновления данных:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const warmupAvatar = () => {
    if (!avatarUrl.value) {
      return
    }
    ensureAvatarDisplaySrc(avatarUrl.value).catch(() => {})
  }

  return {
    // States
    user,
    profile,
    avatarUrl,
    isLoading,
    isInitialized,
    accessToPanel,
    
    // Getters
    isAuthenticated,
    fullName,
    displayName,
    greetingName,
    menuUserName,
    menuUserNameTruncated,
    userEmail,
    userRole,
    hasCustomAvatar,
    
    // Actions
    initializeUser,
    loadSessionBootstrap,
    loadProfile,
    loadAvatar,
    updateProfile,
    updateAvatar,
    resetAvatar,
    logout,
    ensureUserReady,
    refreshUserData,
    refreshAllData,
    warmupAvatar,
  }
}) 