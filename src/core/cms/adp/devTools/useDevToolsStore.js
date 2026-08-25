import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { clientEnv } from '@/js/clientEnv.js'
import { router, revalidateCurrentRoute } from '@/js/routers.js'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { invalidatePermissionsSnapshot } from '@/core/cms/adp/js/accessControl.js'
import { bumpSessionAccessEpoch } from '@/core/cms/adp/js/sessionAccessEpoch.js'
import { invalidateAdminAccessCache } from '@/core/cms/adp/admin/js/adminAccessCache.js'
import { logError } from '@/js/utils/logError.js'
import {
  clearDevToolsSession,
  fetchDevToolsPermissionCatalog,
  fetchDevToolsRoles,
  fetchDevToolsStatus,
  saveDevToolsSession,
  searchDevToolsUsers,
} from './devToolsApi.js'

const HIDDEN_KEY = 'ergo-dev-tools-hidden'
const RECENT_KEY = 'ergo-dev-tools-recent'
const EMPTY_PREVIEW = {
  view_as_regular: false,
  as_user_public_id: null,
  as_user_label: null,
  role_name: null,
  extra_grants: [],
  extra_denies: [],
  effective_is_admin: false,
}

function readJson(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) {
      return fallback
    }
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function pairKey(item) {
  return `${item.module_name}:${item.permission_key}`
}

function toKeySet(items) {
  return new Set((items || []).map((item) => pairKey(item)))
}

function pickPreview(data) {
  const payload = data || {}
  return {
    view_as_regular: Boolean(payload.view_as_regular),
    as_user_public_id: payload.as_user_public_id || null,
    as_user_label: payload.as_user_label || null,
    role_name: payload.role_name || null,
    extra_grants: payload.extra_grants || [],
    extra_denies: payload.extra_denies || [],
    effective_is_admin: Boolean(payload.effective_is_admin),
  }
}

export const useDevToolsStore = defineStore('devTools', () => {
  const available = ref(false)
  const ready = ref(false)
  const panelOpen = ref(false)
  const hidden = ref(readJson(HIDDEN_KEY, false) === true)
  const preview = ref({ ...EMPTY_PREVIEW })
  const roles = ref([])
  const catalog = ref([])
  const userResults = ref([])
  const recentUsers = ref(readJson(RECENT_KEY, []) || [])
  const applying = ref(false)
  const basePermissions = ref([])
  const effectivePermissions = ref([])
  let applyQueue = Promise.resolve()

  const isActive = computed(() => {
    const current = preview.value
    return Boolean(
      current.view_as_regular
      || current.as_user_public_id
      || current.role_name
      || (current.extra_grants || []).length
      || (current.extra_denies || []).length,
    )
  })

  const baseKeys = computed(() => toKeySet(basePermissions.value))
  const effectiveKeys = computed(() => toKeySet(effectivePermissions.value))

  function persistHidden(value) {
    hidden.value = value
    sessionStorage.setItem(HIDDEN_KEY, JSON.stringify(value))
  }

  function persistRecent() {
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(recentUsers.value.slice(0, 8)))
  }

  function rememberUser(user) {
    if (!user?.public_id) {
      return
    }
    recentUsers.value = [
      user,
      ...recentUsers.value.filter((item) => item.public_id !== user.public_id),
    ].slice(0, 8)
    persistRecent()
  }

  function applyServerPreview(data) {
    const payload = data || {}
    preview.value = pickPreview(payload)
    basePermissions.value = payload.base_permissions || []
    effectivePermissions.value = payload.effective_permissions || []
  }

  async function bootstrap() {
    if (!clientEnv.devToolsEnabled) {
      available.value = false
      ready.value = true
      return
    }
    try {
      const status = await fetchDevToolsStatus()
      if (!status?.success || status.status === 404 || status.status === 403) {
        available.value = false
        return
      }
      const data = status.data || {}
      available.value = Boolean(data.enabled)
      applyServerPreview(data.preview || {})
      if (!available.value) {
        return
      }
      const [rolesResponse, catalogResponse] = await Promise.all([
        fetchDevToolsRoles(),
        fetchDevToolsPermissionCatalog(),
      ])
      roles.value = rolesResponse?.data?.roles || []
      catalog.value = catalogResponse?.data?.modules || []
    } catch (error) {
      available.value = false
      logError('Не удалось включить режим разработчика', error)
    } finally {
      ready.value = true
    }
  }

  async function reloadSessionUi() {
    invalidatePermissionsSnapshot()
    invalidateAdminAccessCache()
    const userStore = useUserStore()
    await userStore.reloadSessionBootstrap()
    window.dispatchEvent(new CustomEvent('menu-updated', { detail: { fromCache: true } }))
    bumpSessionAccessEpoch()
    const viewingWithoutAdmin = isActive.value && !preview.value.effective_is_admin
    if (router?.currentRoute?.value?.meta?.requiresGlobalAdmin && viewingWithoutAdmin) {
      await router.replace({ name: 'AppHome' })
      return
    }
    await revalidateCurrentRoute()
  }

  async function applyPreview(next) {
    const payload = pickPreview({ ...EMPTY_PREVIEW, ...next })
    preview.value = payload
    applyQueue = applyQueue.then(async () => {
      applying.value = true
      try {
        const response = await saveDevToolsSession(payload)
        if (response?.success) {
          applyServerPreview(response.data || payload)
        }
        await reloadSessionUi()
      } catch (error) {
        logError('Не удалось сохранить режим разработчика', error)
      } finally {
        applying.value = false
      }
    })
    return applyQueue
  }

  async function patchPreview(partial) {
    return applyPreview({ ...preview.value, ...partial })
  }

  async function setViewAsRegular(enabled) {
    if (!enabled) {
      return applyPreview({ ...EMPTY_PREVIEW })
    }
    return patchPreview({ view_as_regular: true })
  }

  async function setAsUser(user) {
    if (!user) {
      return patchPreview({
        as_user_public_id: null,
        as_user_label: null,
        view_as_regular: true,
        extra_grants: [],
        extra_denies: [],
      })
    }
    if (preview.value.as_user_public_id === user.public_id) {
      return patchPreview({
        as_user_public_id: null,
        as_user_label: null,
        view_as_regular: true,
        extra_grants: [],
        extra_denies: [],
      })
    }
    rememberUser(user)
    return patchPreview({
      view_as_regular: true,
      as_user_public_id: user.public_id,
      as_user_label: user.full_name || user.username,
      extra_grants: [],
      extra_denies: [],
    })
  }

  async function setRoleName(roleName) {
    if (!roleName) {
      return patchPreview({
        role_name: null,
        extra_grants: [],
        extra_denies: [],
      })
    }
    const isAdminRole = roles.value.some(
      (role) => role.name === roleName && role.role_type === 'admin',
    )
    return patchPreview({
      view_as_regular: !isAdminRole,
      role_name: roleName,
      extra_grants: [],
      extra_denies: [],
    })
  }

  function isPermissionChecked(moduleName, permissionKey) {
    const key = pairKey({
      module_name: moduleName,
      permission_key: permissionKey,
    })
    if ((preview.value.extra_denies || []).some((item) => pairKey(item) === key)) {
      return false
    }
    if (preview.value.effective_is_admin) {
      return true
    }
    return effectiveKeys.value.has(key)
  }

  async function setPermission(moduleName, permissionKey, granted) {
    const pair = { module_name: moduleName, permission_key: permissionKey }
    const key = pairKey(pair)
    const grants = (preview.value.extra_grants || []).filter((item) => pairKey(item) !== key)
    const denies = (preview.value.extra_denies || []).filter((item) => pairKey(item) !== key)
    const baseHas = baseKeys.value.has(key) || Boolean(preview.value.effective_is_admin)
    if (granted && !baseHas) {
      grants.push(pair)
    } else if (!granted && baseHas) {
      denies.push(pair)
    }
    return patchPreview({
      view_as_regular: true,
      extra_grants: grants,
      extra_denies: denies,
    })
  }

  async function searchUsers(query) {
    try {
      const response = await searchDevToolsUsers(query)
      const payload = response?.data || {}
      userResults.value = payload.users || []
    } catch (error) {
      userResults.value = []
      logError('Не удалось найти пользователей для режима разработчика', error)
    }
  }

  async function resetPreview() {
    preview.value = { ...EMPTY_PREVIEW }
    basePermissions.value = []
    effectivePermissions.value = []
    try {
      await clearDevToolsSession()
      await reloadSessionUi()
    } catch (error) {
      logError('Не удалось сбросить режим разработчика', error)
    }
  }

  function hideFab() {
    panelOpen.value = false
    persistHidden(true)
  }

  function showFab() {
    persistHidden(false)
  }

  function togglePanel() {
    panelOpen.value = !panelOpen.value
  }

  return {
    available,
    ready,
    panelOpen,
    hidden,
    preview,
    roles,
    catalog,
    userResults,
    recentUsers,
    applying,
    isActive,
    bootstrap,
    setViewAsRegular,
    setAsUser,
    setRoleName,
    isPermissionChecked,
    setPermission,
    searchUsers,
    resetPreview,
    hideFab,
    showFab,
    togglePanel,
  }
})
