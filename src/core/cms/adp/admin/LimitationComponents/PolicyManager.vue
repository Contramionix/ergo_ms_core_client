<template>
  <div class="limitation-card">
    <div class="limitation-card__header d-flex align-items-center justify-content-between flex-wrap gap-2">
      <h5 class="limitation-card__title">Доступ к URL для ролей и ролевых групп</h5>
      <button
        class="btn btn-sm btn-outline-secondary"
        @click="refreshPolicies"
        :disabled="policyLoading"
      >
        <span v-if="policyLoading" class="spinner-border spinner-border-sm me-1" role="status"></span>
        Обновить список
      </button>
    </div>
    <div class="limitation-card__body">
      <div class="row g-3 align-items-end mb-4">
        <div class="col-md-4">
          <label class="form-label">Страница / URL</label>
          <select v-model="localSelectedPage" class="form-select">
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

      <form @submit.prevent="handlePolicySubmit" class="policy-form mb-4">
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
            <div class="btn-group w-100" role="group">
              <input
                type="radio"
                class="btn-check"
                name="policyTargetType"
                id="policyTargetRole"
                value="role"
                v-model="policyForm.targetType"
              />
              <label class="btn btn-outline-secondary" for="policyTargetRole">Роль</label>
              <input
                type="radio"
                class="btn-check"
                name="policyTargetType"
                id="policyTargetGroup"
                value="role_group"
                v-model="policyForm.targetType"
              />
              <label class="btn btn-outline-secondary" for="policyTargetGroup">Ролевая группа</label>
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
          <button type="submit" class="btn btn-accent" :disabled="policySaving">
            <span v-if="policySaving" class="spinner-border spinner-border-sm me-1" role="status"></span>
            {{ policyForm.id ? 'Обновить политику' : 'Добавить политику' }}
          </button>
        </div>
      </form>

      <div class="table-responsive">
        <table class="table table-hover align-middle limitation-table">
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
                <div class="spinner-border spinner-border-sm" role="status"></div>
              </td>
            </tr>
            <tr v-for="policy in filteredPolicies" :key="policy.id">
              <td>{{ policy.name }}</td>
              <td class="text-monospace">{{ policy.resource_path }}</td>
              <td>{{ renderPolicyTarget(policy) }}</td>
              <td>
                <span :class="['action-badge', policy.action === 'allow' ? 'action-badge--allow' : 'action-badge--deny']">
                  {{ policy.action_display }}
                </span>
              </td>
              <td>
                <span :class="['pattern-badge', policy.is_pattern ? 'pattern-badge--yes' : 'pattern-badge--no']">
                  {{ policy.is_pattern ? 'Да' : 'Нет' }}
                </span>
              </td>
              <td>{{ policy.priority }}</td>
              <td>
                <div class="d-flex gap-1">
                  <button class="btn btn-sm btn-outline-secondary" @click="startPolicyEdit(policy)">
                    Изменить
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="$emit('request-delete', policy)">
                    Удалить
                  </button>
                </div>
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
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { CreatePolicy, GetPolicies, UpdatePolicy } from '@/core/cms/adp/admin/js/GroupsPolitics'

const props = defineProps({
  pages: { type: Array, required: true },
  roles: { type: Array, required: true },
  roleGroups: { type: Array, required: true },
  policies: { type: Array, required: true },
  selectedPagePath: { type: String, default: '' }
})

const emit = defineEmits(['update:policies', 'update:selectedPagePath', 'request-delete'])

const toast = useToast()
const policyLoading = ref(false)
const policySaving = ref(false)
const policySearch = ref('')
const showOnlySelected = ref(true)

const localSelectedPage = computed({
  get: () => props.selectedPagePath,
  set: (val) => emit('update:selectedPagePath', val)
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

const filteredPolicies = computed(() => {
  const query = policySearch.value.trim().toLowerCase()
  return props.policies
    .filter((policy) => {
      const matchesPage =
        showOnlySelected.value && props.selectedPagePath
          ? policy.resource_path === props.selectedPagePath
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

watch(() => props.selectedPagePath, (newPath) => {
  if (!policyForm.id) {
    policyForm.resource_path = newPath || ''
  }
})

async function refreshPolicies() {
  try {
    policyLoading.value = true
    const response = await GetPolicies()
    emit('update:policies', response || [])
    toast.success('Политики обновлены')
  } catch (error) {
    logError('Ошибка загрузки политик', error)
    toast.error('Не удалось обновить политики')
  } finally {
    policyLoading.value = false
  }
}

function renderPolicyTarget(policy) {
  if (policy.role_name) return `Роль · ${policy.role_name}`
  if (policy.role_group_name) return `Группа · ${policy.role_group_name}`
  return '—'
}

function resetPolicyForm() {
  policyForm.id = null
  policyForm.name = ''
  policyForm.resource_path = props.selectedPagePath || ''
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
    logError('Ошибка сохранения политики', error)
    toast.error('Не удалось сохранить политику')
  } finally {
    policySaving.value = false
  }
}

defineExpose({ refreshPolicies, resetPolicyForm })
</script>

<style scoped>
.limitation-card {
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-primary-background);
}

.limitation-card__header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.limitation-card__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.limitation-card__body {
  padding: 1.25rem;
}

.policy-form {
  padding: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  background: var(--color-secondary-background);
}

.limitation-table {
  border-collapse: separate;
  border-spacing: 0;
}

.limitation-table thead th {
  background: var(--color-secondary-background);
  color: var(--color-secondary-text);
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-bottom: 1px solid var(--color-border);
  padding: 0.6rem 0.75rem;
}

.limitation-table tbody tr {
  transition: background-color 0.15s ease;
}

.limitation-table tbody tr:hover {
  background-color: var(--color-hover-background);
}

.limitation-table tbody td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-primary-text);
}

.text-monospace {
  font-family: monospace;
  font-size: 0.875rem;
}

.action-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.action-badge--allow {
  background-color: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
}

.action-badge--deny {
  background-color: color-mix(in srgb, #dc3545 15%, transparent);
  color: #dc3545;
}

.pattern-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  font-weight: 500;
}

.pattern-badge--yes {
  background-color: color-mix(in srgb, var(--color-accent) 10%, transparent);
  color: var(--color-accent);
}

.pattern-badge--no {
  background-color: var(--color-secondary-background);
  color: var(--color-secondary-text);
}

.btn-accent {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.btn-accent:hover {
  opacity: 0.9;
}
</style>
