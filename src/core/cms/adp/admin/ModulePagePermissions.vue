<script setup>
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { useModulePagePermissions } from './js/useModulePagePermissions'
import { useToast } from '@/js/utils/toast.js'
import { apiClient } from '@/js/api/manager'
import { CreatePolicy, UpdatePolicy, DeletePolicy } from '@/core/cms/adp/admin/js/GroupsPolitics'

const {
  modules,
  selectedModuleKey,
  selectedPagePath,
  visiblePages,
  selectedPage,
  roles,
  roleGroups,
  pagePolicies,
  isLoading,
  errorMessage,
  handleSelectModule,
  handleSelectPage,
  loadData
} = useModulePagePermissions()

const toast = useToast()
const isSyncing = ref(false)
const isSavingAccess = ref(false)

const pageAccessByRoleGroup = computed(() => {
  const map = {}

  for (const policy of pagePolicies.value || []) {
    if (!policy.raw_role_group) {
      continue
    }

    const groupId = policy.raw_role_group
    const isAllowed =
      policy.action === 'Разрешить' ||
      policy.action === 'Allow' ||
      policy.action === 'allow'

    map[groupId] = {
      id: policy.id,
      allowed: isAllowed,
      name: policy.name,
      priority: policy.priority ?? 0,
      is_pattern: Boolean(policy.is_pattern),
      resource_path: policy.resource_path
    }
  }

  return map
})

const pageAccessByRole = computed(() => {
  const map = {}

  for (const policy of pagePolicies.value || []) {
    if (!policy.raw_role) {
      continue
    }

    const roleId = policy.raw_role
    const isAllowed =
      policy.action === 'Разрешить' ||
      policy.action === 'Allow' ||
      policy.action === 'allow'

    map[roleId] = {
      id: policy.id,
      allowed: isAllowed,
      name: policy.name,
      priority: policy.priority ?? 0,
      is_pattern: Boolean(policy.is_pattern),
      resource_path: policy.resource_path
    }
  }

  return map
})

const adminRoleIds = computed(() => {
  const ids = new Set()

  for (const role of roles.value || []) {
    const type = (role.role_type || '').toString().toLowerCase()
    if (role.is_system && (type === 'admin' || type === 'administrator')) {
      ids.add(role.id)
    }
  }

  return ids
})

const handleSyncRoutes = async () => {
  if (isSyncing.value) {
    return
  }

  try {
    isSyncing.value = true
    await apiClient.post('cms/patch-all-project-pages', {}, true)
    await loadData()
    toast.success('Маршруты модулей синхронизированы')
  } catch (error) {
    // eslint-disable-next-line no-console
    logError('Ошибка синхронизации маршрутов модулей', error)
    toast.error('Не удалось синхронизировать маршруты. Попробуйте позже.')
  } finally {
    isSyncing.value = false
  }
}

const getGroupAccessState = groupId => {
  const current = pageAccessByRoleGroup.value[groupId]

  if (!current) {
    return 'inherit'
  }

  return current.allowed ? 'allow' : 'deny'
}

const getRoleAccessState = roleId => {
  if (adminRoleIds.value.has(roleId)) {
    return 'allow'
  }

  const current = pageAccessByRole.value[roleId]

  if (!current) {
    return 'inherit'
  }

  return current.allowed ? 'allow' : 'deny'
}

const setPageAccessStateForGroup = async (roleGroup, state) => {
  if (!selectedPage.value || !roleGroup) {
    return
  }

  if (isSavingAccess.value) {
    return
  }

  const current = pageAccessByRoleGroup.value[roleGroup.id] || null
  const pageLabel = selectedPage.value.label || selectedPage.value.path
  const defaultName = `Доступ к странице ${pageLabel} для группы ${roleGroup.name}`

  try {
    isSavingAccess.value = true

    if (state === 'inherit') {
      if (current?.id) {
        await DeletePolicy(current.id)
      }
    } else if (state === 'allow') {
      if (current) {
        await UpdatePolicy(current.id, {
          name: current.name || defaultName,
          policy_type: 'url',
          action: 'allow',
          resource_path: current.resource_path || selectedPage.value.path,
          is_pattern: current.is_pattern ?? false,
          priority: current.priority ?? 0,
          role: null,
          role_group: roleGroup.id
        })
      } else {
        await CreatePolicy({
          name: defaultName,
          policy_type: 'url',
          action: 'allow',
          resource_path: selectedPage.value.path,
          is_pattern: false,
          priority: 0,
          role: null,
          role_group: roleGroup.id
        })
      }
    } else if (state === 'deny') {
      if (current) {
        await UpdatePolicy(current.id, {
          name: current.name || defaultName,
          policy_type: 'url',
          action: 'deny',
          resource_path: current.resource_path || selectedPage.value.path,
          is_pattern: current.is_pattern ?? false,
          priority: current.priority ?? 0,
          role: null,
          role_group: roleGroup.id
        })
      } else {
        await CreatePolicy({
          name: defaultName,
          policy_type: 'url',
          action: 'deny',
          resource_path: selectedPage.value.path,
          is_pattern: false,
          priority: 0,
          role: null,
          role_group: roleGroup.id
        })
      }
    }

    await loadData()
    toast.success('Доступ к странице обновлён')
  } catch (error) {
    // eslint-disable-next-line no-console
    logError('Ошибка изменения доступа к странице', error)
    toast.error('Не удалось изменить доступ. Попробуйте позже.')
  } finally {
    isSavingAccess.value = false
  }
}

const setPageAccessStateForRole = async (role, state) => {
  if (!selectedPage.value || !role) {
    return
  }

  if (adminRoleIds.value.has(role.id)) {
    return
  }

  if (isSavingAccess.value) {
    return
  }

  const current = pageAccessByRole.value[role.id] || null
  const pageLabel = selectedPage.value.label || selectedPage.value.path
  const defaultName = `Доступ к странице ${pageLabel} для роли ${role.name}`

  try {
    isSavingAccess.value = true

    if (state === 'inherit') {
      if (current?.id) {
        await DeletePolicy(current.id)
      }
    } else if (state === 'allow') {
      if (current) {
        await UpdatePolicy(current.id, {
          name: current.name || defaultName,
          policy_type: 'url',
          action: 'allow',
          resource_path: current.resource_path || selectedPage.value.path,
          is_pattern: current.is_pattern ?? false,
          priority: current.priority ?? 0,
          role: role.id,
          role_group: null
        })
      } else {
        await CreatePolicy({
          name: defaultName,
          policy_type: 'url',
          action: 'allow',
          resource_path: selectedPage.value.path,
          is_pattern: false,
          priority: 0,
          role: role.id,
          role_group: null
        })
      }
    } else if (state === 'deny') {
      if (current) {
        await UpdatePolicy(current.id, {
          name: current.name || defaultName,
          policy_type: 'url',
          action: 'deny',
          resource_path: current.resource_path || selectedPage.value.path,
          is_pattern: current.is_pattern ?? false,
          priority: current.priority ?? 0,
          role: role.id,
          role_group: null
        })
      } else {
        await CreatePolicy({
          name: defaultName,
          policy_type: 'url',
          action: 'deny',
          resource_path: selectedPage.value.path,
          is_pattern: false,
          priority: 0,
          role: role.id,
          role_group: null
        })
      }
    }

    await loadData()
    toast.success('Доступ к странице обновлён')
  } catch (error) {
    // eslint-disable-next-line no-console
    logError('Ошибка изменения доступа к странице по роли', error)
    toast.error('Не удалось изменить доступ. Попробуйте позже.')
  } finally {
    isSavingAccess.value = false
  }
}

const isGroupAccessAllowed = groupId => getGroupAccessState(groupId) === 'allow'

const isRoleAccessAllowed = roleId => getRoleAccessState(roleId) === 'allow'

const handleToggleGroupAccess = roleGroup => {
  const currentState = getGroupAccessState(roleGroup.id)
  const nextState = currentState === 'allow' ? 'deny' : 'allow'
  return setPageAccessStateForGroup(roleGroup, nextState)
}

const handleToggleRoleAccess = role => {
  const currentState = getRoleAccessState(role.id)
  const nextState = currentState === 'allow' ? 'deny' : 'allow'
  return setPageAccessStateForRole(role, nextState)
}

onMounted(async () => {
  await loadData()
})
</script>

<template>
  <div>
    <div class="row">
      <div class="col-12 mb-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
        <div>
          <h2 class="admin-section-title">Модули и страницы</h2>
          <p class="admin-section-subtitle">
            Выберите модуль и страницу слева, чтобы настроить политики доступа и модульные права для неё.
          </p>
        </div>
        <div class="d-flex gap-2">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            :disabled="isSyncing"
            @click="handleSyncRoutes"
          >
            <span
              v-if="isSyncing"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            ></span>
            <span v-if="isSyncing">Синхронизация...</span>
            <span v-else>Синхронизировать маршруты</span>
          </button>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-12 col-lg-4">
        <div class="card h-100 module-page-permissions__sidebar-card">
          <div class="card-header">
            <h5 class="mb-0">Модули и страницы</h5>
          </div>
          <div class="card-body p-0">
            <LoadingContentArea :loading="isLoading" min-height="10rem">
            <div v-if="errorMessage" class="p-3">
              <div class="alert alert-danger mb-0">
                {{ errorMessage }}
              </div>
            </div>
            <div v-else class="row g-0">
              <div class="col-12 col-sm-5 border-end">
                <div class="list-group list-group-flush">
                  <button
                    v-for="module in modules"
                    :key="module.key"
                    type="button"
                    class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                    :class="{ active: module.key === selectedModuleKey }"
                    @click="handleSelectModule(module.key)"
                  >
                    <span class="text-truncate">{{ module.title }}</span>
                    <span class="badge bg-secondary rounded-pill ms-2">
                      {{
                        module.submodules
                          ? module.submodules.reduce((acc, sub) => acc + (sub.pages ? sub.pages.length : 0), 0)
                          : 0
                      }}
                    </span>
                  </button>
                  <div v-if="modules.length === 0" class="p-3 text-muted small">
                    Страницы не найдены.
                  </div>
                </div>
              </div>
              <div class="col-12 col-sm-7">
                <div class="p-2 border-start-sm h-100 d-flex flex-column module-page-permissions__pages-card">
                  <div class="mb-2">
                    <div class="fw-semibold small text-uppercase text-muted">Страницы модуля</div>
                  </div>
                  <div class="flex-grow-1 overflow-auto">
                    <button
                      v-for="page in visiblePages"
                      :key="page.path"
                      type="button"
                      class="btn w-100 text-start mb-1 module-page-permissions__page-btn"
                      :class="{
                        'btn-outline-secondary': page.path !== selectedPagePath,
                        'btn-primary': page.path === selectedPagePath
                      }"
                      @click="handleSelectPage(page.path)"
                    >
                      <div class="d-flex flex-column">
                        <span class="fw-semibold text-truncate">{{ page.label }}</span>
                        <small class="text-monospace text-truncate">{{ page.path }}</small>
                      </div>
                    </button>
                    <div v-if="visiblePages.length === 0" class="text-muted small">
                      Выберите модуль, чтобы увидеть список его страниц.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </LoadingContentArea>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-8">
        <div class="d-flex flex-column gap-3">
          <div class="card">
            <div class="card-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
              <div>
                <h5 class="mb-1">
                  Доступ к странице
                  <span v-if="selectedPage">
                    «{{ selectedPage.label }}»
                  </span>
                  <span v-else class="text-muted">не выбранной страницы</span>
                </h5>
                <p class="mb-0 text-muted small" v-if="selectedPage">
                  URL: <span class="text-monospace">{{ selectedPage.path }}</span>
                </p>
              </div>
            </div>

            <div class="card-body">
              <div v-if="!selectedPage" class="alert alert-info mb-0">
                Выберите страницу слева, чтобы управлять доступом к ней.
              </div>
              <div v-else class="d-flex flex-column gap-4">
                <section>
                  <p class="text-muted small mb-3">
                    Управляйте доступом <strong>ролевых групп</strong> к выбранной странице.
                  </p>
                  <div class="list-group">
                    <div
                      v-for="group in roleGroups"
                      :key="group.id"
                      class="list-group-item d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2"
                    >
                      <div class="me-3">
                        <div class="fw-semibold">{{ group.name }}</div>
                        <div class="text-muted small">
                          {{ group.parent_role_name || 'Ролевая группа' }}
                        </div>
                      </div>

                      <div class="permission-toggle d-flex align-items-center gap-2">
                        <span class="small text-muted d-none d-md-inline">Доступ к странице</span>
                        <button
                          type="button"
                          class="permission-toggle-switch"
                          :class="{ 'permission-toggle-switch--on': isGroupAccessAllowed(group.id) }"
                          :disabled="isSavingAccess"
                          @click="handleToggleGroupAccess(group)"
                          :aria-pressed="isGroupAccessAllowed(group.id)"
                          aria-label="Переключить доступ к странице"
                        >
                          <span class="permission-toggle-switch__thumb"></span>
                        </button>
                      </div>
                    </div>

                    <div v-if="roleGroups.length === 0" class="list-group-item text-muted small">
                      Ролевые группы не найдены. Сначала создайте хотя бы одну группу.
                    </div>
                  </div>
                </section>

                <section>
                  <h6 class="mb-2">Доступ по ролям</h6>
                  <p class="text-muted small mb-3">
                    Точно так же настройте доступ для конкретных <strong>ролей</strong>. Ролевые политики имеют такой же
                    приоритет, как и политики ролевых групп, подробности зависят от конфигурации сервера.
                  </p>

                  <div class="list-group">
                    <div
                      v-for="role in roles"
                      :key="role.id"
                      class="list-group-item d-flex flex-column gap-2"
                    >
                      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                        <div class="me-3">
                          <div class="fw-semibold">
                            {{ role.name }}
                          </div>
                          <div class="text-muted small">
                            {{ role.role_type_display || 'Роль' }}
                          </div>
                        </div>

                        <div class="permission-toggle d-flex align-items-center gap-2">
                          <span class="small text-muted d-none d-md-inline">Доступ к странице</span>
                          <button
                            type="button"
                            class="permission-toggle-switch"
                            :class="{ 'permission-toggle-switch--on': isRoleAccessAllowed(role.id) }"
                            :disabled="isSavingAccess || adminRoleIds.has(role.id)"
                            @click="handleToggleRoleAccess(role)"
                            :aria-pressed="isRoleAccessAllowed(role.id)"
                            aria-label="Переключить доступ к странице"
                          >
                            <span class="permission-toggle-switch__thumb"></span>
                          </button>
                        </div>
                      </div>

                      <div
                        v-if="adminRoleIds.has(role.id)"
                        class="mt-1 p-2 rounded border permission-warning d-flex align-items-center gap-2"
                      >
                        <AlertTriangle class="permission-warning__icon flex-shrink-0" size="26" />
                        <div class="small permission-warning__text">
                          Вы не можете изменять это право для этой роли, потому что системные администраторы всегда имеют
                          полный доступ к страницам и управляются на уровне конфигурации системы.
                        </div>
                      </div>
                    </div>

                    <div v-if="roles.length === 0" class="list-group-item text-muted small">
                      Роли не найдены. Сначала создайте хотя бы одну роль.
                    </div>
                  </div>

                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin-section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary-text);
  margin-bottom: 0.25rem;
}

.admin-section-subtitle {
  font-size: 0.875rem;
  color: var(--color-secondary-text);
  margin-bottom: 0;
}

.module-page-permissions__sidebar-card {
  max-height: 70vh;
  overflow-y: auto;
}

.module-page-permissions__pages-card {
  max-height: 70vh;
  overflow-y: auto;
}

.module-page-permissions__page-btn {
  padding: 0.4rem 0.6rem;
  font-size: 0.875rem;
}

.permission-toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  width: 2.75rem;
  height: 1.5rem;
  padding: 0;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background-color: var(--color-secondary-background);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.permission-toggle-switch__thumb {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  background-color: var(--bs-danger);
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.25);
  transform: translateX(0.125rem);
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.permission-toggle-switch--on {
  border-color: var(--bs-success);
  background-color: rgba(25, 135, 84, 0.25);
}

.permission-toggle-switch--on .permission-toggle-switch__thumb {
  background-color: var(--bs-success);
  transform: translateX(1.375rem);
}

.permission-warning {
  background-color: var(--bs-warning-bg-subtle, #fff3cd);
  border-color: var(--bs-warning-border-subtle, #ffeeba);
}

.permission-warning__icon {
  color: var(--bs-warning);
}

.permission-warning__text {
  color: var(--color-primary-text);
}

.text-monospace {
  font-family: var(--bs-font-monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
      monospace);
}

@media (max-width: 575.98px) {
  .module-page-permissions__page-btn {
    font-size: 0.8rem;
  }
}
</style>
