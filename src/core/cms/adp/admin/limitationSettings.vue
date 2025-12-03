<template>
  <div class="container-fluid mt-4">
    <div class="row justify-content-center">
      <div class="col-md-10">
        <div class="card shadow-sm">
          <div class="card-header bg-primary text-white">
            <h4 class="mb-0">Управление ограничениями</h4>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6 mb-4">
                <h5>Список страниц</h5>
                <table class="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Путь</th>
                      <th>Тип страницы</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(page, index) in pages" :key="index">
                      <td>{{ page.path }}</td>
                      <td>
                        <select
                          v-model="page.type"
                          class="form-select form-select-sm"
                          @change="onPageTypeChange(page)"
                        >
                          <option value="withoutliminations">Открытая</option>
                          <option value="closepage">Закрытая</option>
                          <option value="withliminations">С ограничениями</option>
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="col-md-6">
                <h5>Компоненты</h5>
                <form @submit.prevent="addComponent" class="mb-3">
                  <div class="mb-2">
                    <label for="pageSelect" class="form-label">Выберите страницу:</label>
                    <select id="pageSelect" v-model="newComponent.page_path" class="form-select">
                      <option v-for="page in ClosedOrWithLiminationsPages" :key="page.path" :value="page.path">
                        {{ page.path }}
                      </option>
                    </select>
                  </div>
                  <div class="mb-2">
                    <label for="componentId" class="form-label">ID компонента:</label>
                    <input
                      id="componentId"
                      type="text"
                      v-model="newComponent.id"
                      class="form-control"
                      required
                    />
                  </div>
                  <button type="submit" class="btn btn-primary">Добавить компонент</button>
                </form>

                <hr />

                <table class="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>Страница</th>
                      <th>ID Компонента</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in components" :key="index">
                      <td>{{ item.page_path }}</td>
                      <td>
                        <div v-if="editingIndex === index">
                          <input
                            type="text"
                            v-model="editingData"
                            class="form-control form-control-sm"
                            autofocus
                            @blur="saveEdit(index)"
                            @keyup.enter="saveEdit(index)"
                          />
                        </div>
                        <div v-else>
                          {{ item.id }}
                        </div>
                      </td>
                      <td>
                        <button
                          class="btn btn-sm btn-warning me-2"
                          @click="startEditing(index)"
                        >
                          Изменить
                        </button>
                        <button
                          class="btn btn-sm btn-danger"
                          @click="deleteComponent(index, item.page_path, item.id)"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                    <tr v-if="components.length === 0">
                      <td colspan="3" class="text-center">Нет добавленных компонентов</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm mt-4">
          <div class="card-header bg-primary text-white d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h4 class="mb-0">Доступ к URL для ролей и ролевых групп</h4>
            <button
              class="btn btn-outline-light btn-sm"
              @click="refreshPolicies"
              :disabled="policyLoading"
            >
              <span v-if="policyLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
              Обновить список
            </button>
          </div>
          <div class="card-body">
            <div class="row g-3 align-items-end mb-4">
              <div class="col-md-4">
                <label class="form-label">Страница / URL</label>
                <select v-model="selectedPagePath" class="form-select">
                  <option value="">Все страницы</option>
                  <option v-for="page in pages" :key="page.path" :value="page.path">
                    {{ page.path }}
                  </option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Поиск по политикам</label>
                <input
                  type="text"
                  class="form-control"
                  placeholder="Название, URL или цель"
                  v-model="policySearch"
                />
              </div>
              <div class="col-md-4">
                <div class="form-check form-switch mt-4 pt-1">
                  <input
                    id="showOnlySelected"
                    class="form-check-input"
                    type="checkbox"
                    v-model="showOnlySelected"
                  />
                  <label class="form-check-label" for="showOnlySelected">
                    Показывать только выбранную страницу
                  </label>
                </div>
              </div>
            </div>

            <form @submit.prevent="handlePolicySubmit" class="border rounded p-3 mb-4 bg-light">
              <div class="row g-3">
                <div class="col-md-4">
                  <label class="form-label">Название политики</label>
                  <input
                    type="text"
                    class="form-control"
                    v-model="policyForm.name"
                    placeholder="Например, Доступ к /admin для роли"
                  />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Путь (URL)</label>
                  <input
                    type="text"
                    class="form-control"
                    v-model="policyForm.resource_path"
                    placeholder="/AdminPanel"
                    required
                  />
                </div>
                <div class="col-md-2">
                  <label class="form-label">Действие</label>
                  <select class="form-select" v-model="policyForm.action">
                    <option value="allow">Разрешить</option>
                    <option value="deny">Запретить</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <label class="form-label">Приоритет</label>
                  <input
                    type="number"
                    class="form-control"
                    v-model.number="policyForm.priority"
                    placeholder="0"
                  />
                </div>
              </div>
              <div class="row g-3 mt-1">
                <div class="col-md-4">
                  <label class="form-label">Цель политики</label>
                  <div class="btn-group w-100" role="group" aria-label="Тип цели">
                    <input
                      type="radio"
                      class="btn-check"
                      name="policyTargetType"
                      id="policyTargetRole"
                      value="role"
                      v-model="policyForm.targetType"
                    />
                    <label class="btn btn-outline-primary" for="policyTargetRole">Роль</label>

                    <input
                      type="radio"
                      class="btn-check"
                      name="policyTargetType"
                      id="policyTargetGroup"
                      value="role_group"
                      v-model="policyForm.targetType"
                    />
                    <label class="btn btn-outline-primary" for="policyTargetGroup">Ролевая группа</label>
                  </div>
                </div>
                <div class="col-md-4" v-if="policyForm.targetType === 'role'">
                  <label class="form-label">Роль</label>
                  <select class="form-select" v-model="policyForm.role">
                    <option value="">Выберите роль</option>
                    <option v-for="role in roles" :key="role.id" :value="role.id">
                      {{ role.name }} ({{ role.role_type_display }})
                    </option>
                  </select>
                </div>
                <div class="col-md-4" v-else>
                  <label class="form-label">Ролевая группа</label>
                  <select class="form-select" v-model="policyForm.role_group">
                    <option value="">Выберите ролевую группу</option>
                    <option v-for="group in roleGroups" :key="group.id" :value="group.id">
                      {{ group.name }} · {{ group.parent_role_name }}
                    </option>
                  </select>
                </div>
                <div class="col-md-2 d-flex align-items-center">
                  <div class="form-check form-switch mt-4 pt-2">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      id="policyIsPattern"
                      v-model="policyForm.is_pattern"
                    />
                    <label class="form-check-label" for="policyIsPattern">Шаблон</label>
                  </div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Описание</label>
                  <textarea
                    class="form-control"
                    rows="2"
                    v-model="policyForm.description"
                    placeholder="Дополнительные подробности (необязательно)"
                  ></textarea>
                </div>
              </div>
              <div class="d-flex justify-content-end gap-2 mt-3">
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  @click="resetPolicyForm"
                  v-if="policyForm.id"
                >
                  Отменить
                </button>
                <button type="submit" class="btn btn-primary" :disabled="policySaving">
                  <span v-if="policySaving" class="spinner-border spinner-border-sm me-2" role="status"></span>
                  {{ policyForm.id ? 'Обновить политику' : 'Добавить политику' }}
                </button>
              </div>
            </form>

            <div class="table-responsive">
              <table class="table table-bordered table-striped align-middle">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>URL</th>
                    <th>Цель</th>
                    <th>Действие</th>
                    <th>Шаблон</th>
                    <th>Приоритет</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="policyLoading">
                    <td colspan="7" class="text-center py-4">
                      <div class="spinner-border text-primary" role="status"></div>
                    </td>
                  </tr>
                  <tr v-for="policy in filteredPolicies" :key="policy.id">
                    <td>{{ policy.name }}</td>
                    <td>{{ policy.resource_path }}</td>
                    <td>{{ renderPolicyTarget(policy) }}</td>
                    <td>
                      <span :class="policy.action === 'allow' ? 'badge bg-success' : 'badge bg-danger'">
                        {{ policy.action_display }}
                      </span>
                    </td>
                    <td>
                      <span :class="policy.is_pattern ? 'badge bg-info text-dark' : 'badge bg-secondary'">
                        {{ policy.is_pattern ? 'Да' : 'Нет' }}
                      </span>
                    </td>
                    <td>{{ policy.priority }}</td>
                    <td>
                      <button class="btn btn-sm btn-outline-primary me-2" @click="startPolicyEdit(policy)">
                        Изменить
                      </button>
                      <button class="btn btn-sm btn-outline-danger" @click="requestPolicyDeletion(policy)">
                        Удалить
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!policyLoading && filteredPolicies.length === 0">
                    <td colspan="7" class="text-center text-muted py-4">
                      Нет политик для выбранных условий
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div
    v-if="showErrorModal"
    class="modal fade show d-block"
    tabindex="-1"
    style="background-color: rgba(0,0,0,0.5);"
  >
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title text-danger">Ошибка</h5>
          <button type="button" class="btn-close" @click="closeModal()"></button>
        </div>
        <div class="modal-body">
          {{ errorMessage }}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal()">Закрыть</button>
        </div>
      </div>
    </div>
  </div>

  <ConfirmDialog
    :show="confirmDialog.show"
    :message="confirmDialog.message"
    :confirm-text="confirmDialog.confirmText"
    :variant="confirmDialog.variant"
    :loading="confirmDialog.loading"
    @confirm="handleConfirmDialog"
    @cancel="closeConfirmDialog"
    @close="closeConfirmDialog"
  />
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useToast } from 'vue-toastification'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import {
  AddPageComponent,
  CreatePolicy,
  DeletePolicy,
  GetPageComponents,
  GetPages,
  GetPolicies,
  GetRoleGroups,
  GetRoles,
  PutPages,
  RemovePageComponent,
  UpdatePageComponent,
  UpdatePolicy
} from '@/core/cms/adp/admin/js/GroupsPolitics'

const toast = useToast()

const editingIndex = ref(null)
const editingData = ref('')
const showErrorModal = ref(false)
const errorMessage = ref('')
const prevTypes = reactive({})
const pages = ref([])
const components = ref([])

const roles = ref([])
const roleGroups = ref([])
const policies = ref([])
const policyLoading = ref(false)
const policySaving = ref(false)
const selectedPagePath = ref('')
const policySearch = ref('')
const showOnlySelected = ref(true)

const confirmDialog = reactive({
  show: false,
  message: '',
  confirmText: 'Удалить',
  variant: 'danger',
  loading: false,
  action: null
})

const newComponent = ref({
  page_path: '',
  id: ''
})

const policyForm = reactive({
  id: null,
  name: '',
  resource_path: '',
  action: 'allow',
  priority: 0,
  targetType: 'role',
  role: '',
  role_group: '',
  is_pattern: false,
  description: ''
})

onMounted(async () => {
  await initializeData()
})

async function initializeData() {
  try {
    policyLoading.value = true
    const [pagesResponse, componentsResponse, rolesResponse, roleGroupsResponse, policiesResponse] = await Promise.all([
      GetPages(),
      GetPageComponents(),
      GetRoles(),
      GetRoleGroups(),
      GetPolicies()
    ])

    pages.value = pagesResponse.pages || []
    components.value = componentsResponse || []
    roles.value = rolesResponse || []
    roleGroups.value = roleGroupsResponse || []
    policies.value = policiesResponse || []

    for (const page of pages.value) {
      prevTypes[page.path] = page.type
    }

    if (!selectedPagePath.value && pages.value.length > 0) {
      selectedPagePath.value = pages.value[0].path
    }
    policyForm.resource_path = selectedPagePath.value || ''
  } catch (error) {
    console.error('Ошибка инициализации ограничений', error)
    toast.error('Не удалось загрузить данные ограничений. Попробуйте позже.')
  } finally {
    policyLoading.value = false
  }
}

async function refreshPolicies() {
  try {
    policyLoading.value = true
    const response = await GetPolicies()
    policies.value = response || []
    toast.success('Политики обновлены')
  } catch (error) {
    console.error('Ошибка загрузки политик', error)
    toast.error('Не удалось обновить политики')
  } finally {
    policyLoading.value = false
  }
}

const ClosedOrWithLiminationsPages = computed(() => {
  return pages.value.filter((p) => p.type !== 'withoutliminations')
})

const filteredPolicies = computed(() => {
  const query = policySearch.value.trim().toLowerCase()
  return policies.value
    .filter((policy) => {
      const matchesPage =
        showOnlySelected.value && selectedPagePath.value
          ? policy.resource_path === selectedPagePath.value
          : true

      const matchesQuery = query
        ? [policy.name, policy.resource_path, policy.role_name, policy.role_group_name]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query))
        : true

      return matchesPage && matchesQuery
    })
    .sort((a, b) => b.priority - a.priority)
})

watch(
  () => pages.value,
  (newPages) => {
    if (!selectedPagePath.value && newPages.length > 0) {
      selectedPagePath.value = newPages[0].path
    }
  },
  { deep: true }
)

watch(selectedPagePath, (newPath) => {
  if (!policyForm.id) {
    policyForm.resource_path = newPath || ''
  }
})

function closeModal() {
  showErrorModal.value = false
}

async function addComponent() {
  if (newComponent.value.page_path && newComponent.value.id) {
    const existsIndex = components.value.findIndex(
      (c) => c.page_path === newComponent.value.page_path && c.id === newComponent.value.id
    )

    if (existsIndex > -1) {
      toast.error('Такой компонент уже существует на этой странице')
      return
    }
    await AddPageComponent(newComponent.value.page_path, newComponent.value.id)
    components.value.push({ ...newComponent.value })
    newComponent.value.id = ''
    toast.success('Компонент добавлен')
  }
}

function startEditing(index) {
  if (editingIndex.value !== index || editingIndex.value === null) {
    editingIndex.value = index
    editingData.value = components.value[index].id
  } else {
    editingData.value = ''
    editingIndex.value = null
  }
}

async function saveEdit(index) {
  if (editingIndex.value === null) return

  const original = components.value[index]
  const updated = editingData.value

  await UpdatePageComponent(original.page_path, original.id, updated)

  components.value[index].id = updated

  editingIndex.value = null
  editingData.value = null
  toast.success('Компонент обновлен')
}

async function deleteComponent(index, path, compid) {
  const response = await RemovePageComponent(path, compid)
  if (response.message === 'Компонент успешно удален') {
    components.value.splice(index, 1)
    toast.success('Компонент удален')
  } else {
    errorMessage.value = response.message
    showErrorModal.value = true
  }
}

async function onPageTypeChange(page) {
  if (page.type === 'withoutliminations') {
    const hasComponents = components.value.some((component) => component.page_path === page.path)

    if (hasComponents) {
      toast.error(`Невозможно сделать страницу "${page.path}" открытой, так как на ней есть компоненты.`)
      page.type = prevTypes[page.path]
      return
    }
  }
  prevTypes[page.path] = page.type
  await PutPages(page.path, page.type)
  toast.success('Тип страницы обновлен')
}

function renderPolicyTarget(policy) {
  if (policy.role_name) {
    return `Роль · ${policy.role_name}`
  }
  if (policy.role_group_name) {
    return `Группа · ${policy.role_group_name}`
  }
  return '—'
}

function resetPolicyForm() {
  policyForm.id = null
  policyForm.name = ''
  policyForm.resource_path = selectedPagePath.value || ''
  policyForm.action = 'allow'
  policyForm.priority = 0
  policyForm.targetType = 'role'
  policyForm.role = ''
  policyForm.role_group = ''
  policyForm.is_pattern = false
  policyForm.description = ''
}

function startPolicyEdit(policy) {
  policyForm.id = policy.id
  policyForm.name = policy.name
  policyForm.resource_path = policy.resource_path
  policyForm.action = policy.action
  policyForm.priority = policy.priority
  policyForm.is_pattern = policy.is_pattern
  policyForm.description = policy.description || ''
  if (policy.role) {
    policyForm.targetType = 'role'
    policyForm.role = policy.role
    policyForm.role_group = ''
  } else {
    policyForm.targetType = 'role_group'
    policyForm.role_group = policy.role_group
    policyForm.role = ''
  }
}

async function handlePolicySubmit() {
  if (!policyForm.resource_path) {
    toast.error('Укажите путь для политики')
    return
  }

  if (policyForm.targetType === 'role' && !policyForm.role) {
    toast.error('Выберите роль для политики')
    return
  }

  if (policyForm.targetType === 'role_group' && !policyForm.role_group) {
    toast.error('Выберите ролевую группу для политики')
    return
  }

  const payload = {
    name: policyForm.name || `Политика для ${policyForm.resource_path}`,
    policy_type: 'url',
    action: policyForm.action,
    resource_path: policyForm.resource_path,
    is_pattern: policyForm.is_pattern,
    priority: policyForm.priority || 0,
    description: policyForm.description,
    role: policyForm.targetType === 'role' ? policyForm.role : null,
    role_group: policyForm.targetType === 'role_group' ? policyForm.role_group : null
  }

  try {
    policySaving.value = true
    if (policyForm.id) {
      await UpdatePolicy(policyForm.id, payload)
      toast.success('Политика обновлена')
    } else {
      await CreatePolicy(payload)
      toast.success('Политика создана')
    }
    await refreshPolicies()
    resetPolicyForm()
  } catch (error) {
    console.error('Ошибка сохранения политики', error)
    toast.error('Не удалось сохранить политику')
  } finally {
    policySaving.value = false
  }
}

function requestPolicyDeletion(policy) {
  confirmDialog.message = `Удалить политику «${policy.name}» для ${renderPolicyTarget(policy)}?`
  confirmDialog.confirmText = 'Удалить'
  confirmDialog.variant = 'danger'
  confirmDialog.show = true
  confirmDialog.action = async () => {
    await DeletePolicy(policy.id)
    toast.success('Политика удалена')
    await refreshPolicies()
  }
}

function closeConfirmDialog() {
  if (confirmDialog.loading) {
    return
  }
  confirmDialog.show = false
  confirmDialog.action = null
}

async function handleConfirmDialog() {
  if (!confirmDialog.action) {
    closeConfirmDialog()
    return
  }
  try {
    confirmDialog.loading = true
    await confirmDialog.action()
  } catch (error) {
    console.error('Ошибка выполнения подтвержденного действия', error)
    toast.error('Не удалось выполнить действие')
  } finally {
    confirmDialog.loading = false
    closeConfirmDialog()
  }
}
</script>

<style scoped>
.card {
  border-radius: 0.5rem;
}
.form-select-sm {
  font-size: 0.875rem;
}
input.form-control-sm {
  height: calc(1.5em + 0.5rem + 2px);
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}
.bg-light {
  background-color: #f8f9fa !important;
}
</style>

