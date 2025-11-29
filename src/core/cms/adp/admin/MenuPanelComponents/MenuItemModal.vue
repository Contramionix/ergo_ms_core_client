<template>
  <div class="modal fade show d-block" tabindex="-1" @click.self="$emit('close')">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            {{ isEditing ? 'Редактирование элемента меню' : 'Добавление элемента меню' }}
          </h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <!-- Название -->
            <div class="mb-3">
              <label class="form-label">Название <span class="text-danger">*</span></label>
              <input 
                v-model="form.name" 
                type="text" 
                class="form-control"
                required
                placeholder="Название пункта меню"
              />
            </div>
            
            <!-- Тип элемента -->
            <div class="mb-3">
              <label class="form-label">Тип элемента <span class="text-danger">*</span></label>
              <select v-model="form.item_type" class="form-select" required>
                <option value="route">Маршрут Vue</option>
                <option value="group">Группа</option>
                <option value="offcanvas">Боковая панель</option>
                <option value="external">Внешняя ссылка</option>
              </select>
            </div>
            
            <!-- Маршрут (для route и group) -->
            <div v-if="form.item_type === 'route' || form.item_type === 'group'" class="mb-3">
              <label class="form-label">
                Имя маршрута Vue 
                <span v-if="form.item_type === 'route'" class="text-danger">*</span>
              </label>
              <input 
                v-model="form.route_name" 
                type="text" 
                class="form-control"
                :required="form.item_type === 'route'"
                placeholder="Например: User, Settings, BI"
              />
              <div class="form-text">
                Имя маршрута из Vue Router (routeName)
              </div>
            </div>
            
            <!-- Страница (для offcanvas) -->
            <div v-if="form.item_type === 'offcanvas'" class="mb-3">
              <label class="form-label">Страница боковой панели <span class="text-danger">*</span></label>
              <select v-model="form.page" class="form-select" required>
                <option value="">Выберите страницу</option>
                <option value="datasets">Датасеты</option>
                <option value="connections">Подключения</option>
                <option value="charts">Графики</option>
                <option value="dashboards">Дашборды</option>
              </select>
            </div>
            
            <!-- Внешняя ссылка -->
            <div v-if="form.item_type === 'external'" class="mb-3">
              <label class="form-label">URL <span class="text-danger">*</span></label>
              <input 
                v-model="form.external_url" 
                type="url" 
                class="form-control"
                required
                placeholder="https://example.com"
              />
            </div>
            
            <!-- Иконка -->
            <div class="mb-3">
              <label class="form-label">Иконка</label>
              <div class="input-group">
                <input 
                  v-model="form.icon" 
                  type="text" 
                  class="form-control"
                  placeholder="Название иконки Lucide"
                  list="iconsList"
                />
                <span class="input-group-text">
                  <component 
                    v-if="iconComponent" 
                    :is="iconComponent" 
                    :size="20"
                  />
                  <HelpCircle v-else :size="20" class="text-muted" />
                </span>
              </div>
              <datalist id="iconsList">
                <option v-for="icon in availableIcons" :key="icon" :value="icon" />
              </datalist>
              <div class="form-text">
                Иконки из библиотеки Lucide (например: CircleUserRound, Settings)
              </div>
            </div>
            
            <!-- Родительский элемент -->
            <div class="mb-3">
              <label class="form-label">Родительский элемент</label>
              <select v-model="form.parent" class="form-select">
                <option 
                  v-for="option in filteredParentOptions" 
                  :key="option.id" 
                  :value="option.id"
                >
                  {{ option.name }}
                </option>
              </select>
            </div>
            
            <!-- Переключатели -->
            <div class="mb-3">
              <div class="form-check">
                <input 
                  v-model="form.is_active" 
                  type="checkbox" 
                  class="form-check-input"
                  id="isActive"
                />
                <label class="form-check-label" for="isActive">
                  Активен
                </label>
              </div>
            </div>
            
            <!-- Разрешённые роли -->
            <div class="mb-3">
              <label class="form-label">Разрешённые роли</label>
              <div class="border rounded p-2" style="max-height: 150px; overflow-y: auto;">
                <div 
                  v-for="role in roles" 
                  :key="role.id" 
                  class="form-check"
                >
                  <input 
                    v-model="form.allowed_roles" 
                    type="checkbox" 
                    class="form-check-input"
                    :id="`role-${role.id}`"
                    :value="role.id"
                  />
                  <label class="form-check-label" :for="`role-${role.id}`">
                    {{ role.name }}
                  </label>
                </div>
                <div v-if="roles.length === 0" class="text-muted">
                  Роли не найдены
                </div>
              </div>
              <div class="form-text">
                Если не выбрано ни одной роли, доступно всем пользователям
              </div>
            </div>
            
            <!-- Разрешённые ролевые группы -->
            <div class="mb-3">
              <label class="form-label">Разрешённые ролевые группы</label>
              <div class="border rounded p-2" style="max-height: 150px; overflow-y: auto;">
                <div 
                  v-for="group in roleGroups" 
                  :key="group.id" 
                  class="form-check"
                >
                  <input 
                    v-model="form.allowed_role_groups" 
                    type="checkbox" 
                    class="form-check-input"
                    :id="`group-${group.id}`"
                    :value="group.id"
                  />
                  <label class="form-check-label" :for="`group-${group.id}`">
                    {{ group.name }} ({{ group.parent_role_name }})
                  </label>
                </div>
                <div v-if="roleGroups.length === 0" class="text-muted">
                  Ролевые группы не найдены
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            Отмена
          </button>
          <button 
            type="button" 
            class="btn btn-primary" 
            @click="handleSubmit"
            :disabled="!isFormValid"
          >
            {{ isEditing ? 'Сохранить' : 'Создать' }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
</template>

<script setup>
import { ref, computed, watch, shallowRef } from 'vue'
import { HelpCircle } from 'lucide-vue-next'
import * as LucideIcons from 'lucide-vue-next'

const props = defineProps({
  item: {
    type: Object,
    default: null
  },
  parentOptions: {
    type: Array,
    default: () => []
  },
  roles: {
    type: Array,
    default: () => []
  },
  roleGroups: {
    type: Array,
    default: () => []
  },
  availableIcons: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['save', 'close'])

const isEditing = computed(() => !!props.item?.id)

// Форма
const form = ref({
  name: '',
  route_name: '',
  icon: '',
  item_type: 'route',
  page: '',
  external_url: '',
  parent: null,
  order: 0,
  is_active: true,
  allowed_roles: [],
  allowed_role_groups: []
})

// Инициализация формы при редактировании
watch(() => props.item, (newItem) => {
  if (newItem) {
    form.value = {
      id: newItem.id,
      name: newItem.name || '',
      route_name: newItem.route_name || '',
      icon: newItem.icon || '',
      item_type: newItem.item_type || 'route',
      page: newItem.page || '',
      external_url: newItem.external_url || '',
      parent: newItem.parent || null,
      order: newItem.order || 0,
      is_active: newItem.is_active !== false,
      allowed_roles: newItem.allowed_roles || [],
      allowed_role_groups: newItem.allowed_role_groups || []
    }
  } else {
    // Сброс формы для нового элемента
    form.value = {
      name: '',
      route_name: '',
      icon: '',
      item_type: 'route',
      page: '',
      external_url: '',
      parent: null,
      order: 0,
      is_active: true,
      allowed_roles: [],
      allowed_role_groups: []
    }
  }
}, { immediate: true })

// Фильтруем родительские опции (нельзя выбрать самого себя)
const filteredParentOptions = computed(() => {
  if (!props.item?.id) {
    return props.parentOptions
  }
  return props.parentOptions.filter(opt => opt.id !== props.item.id)
})

// Динамическая загрузка иконки для предпросмотра
const iconComponent = shallowRef(null)

watch(() => form.value.icon, (iconName) => {
  if (iconName && LucideIcons[iconName]) {
    iconComponent.value = LucideIcons[iconName]
  } else {
    iconComponent.value = null
  }
}, { immediate: true })

// Валидация формы
const isFormValid = computed(() => {
  if (!form.value.name) return false
  
  if (form.value.item_type === 'route' && !form.value.route_name) {
    return false
  }
  
  if (form.value.item_type === 'offcanvas' && !form.value.page) {
    return false
  }
  
  if (form.value.item_type === 'external' && !form.value.external_url) {
    return false
  }
  
  return true
})

function handleSubmit() {
  if (!isFormValid.value) return
  
  emit('save', { ...form.value })
}
</script>

<style scoped>
.modal.show {
  background-color: rgba(0, 0, 0, 0.5);
}
</style>

