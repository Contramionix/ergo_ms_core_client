<template>
  <ModalCenter modal-id="menuItemModal" :title="isEditing ? 'Редактирование элемента меню' : 'Добавление элемента меню'" custom-class="show d-block" dialog-class="modal-lg" @closemodal="$emit('close')">
    <form @submit.prevent="handleSubmit">
      <div class="mb-3">
        <label class="form-label">Название <span class="text-danger">*</span></label>
        <input v-model="form.name" type="text" class="form-control" required placeholder="Название пункта меню"/>
      </div>

      <div class="mb-3">
        <label class="form-label">Тип элемента <span class="text-danger">*</span></label>
        <select v-model="form.item_type" class="form-select" required>
          <option value="route">Маршрут Vue</option>
          <option value="offcanvas">Боковая панель</option>
          <option value="external">Внешняя ссылка</option>
        </select>
      </div>

      <div v-if="form.item_type === 'route'" class="mb-3">
        <label class="form-label">Имя маршрута Vue</label>
        <input v-model="form.route_name" type="text" class="form-control" placeholder="Например: User, Settings, BI"/>
        <div class="form-text">Имя маршрута из Vue Router (routeName). Оставьте пустым для папки без перехода на страницу.</div>
      </div>

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

      <div v-if="form.item_type === 'external'" class="mb-3">
        <label class="form-label">URL <span class="text-danger">*</span></label>
        <input v-model="form.external_url" type="url" class="form-control" required placeholder="https://example.com"/>
      </div>

      <div class="mb-3">
        <label class="form-label">Иконка</label>
        <SelectBox :model-value="form.icon || null" :options="LUCIDE_ICON_NAMES" searchable search-placeholder="Поиск иконки..." :include-all-option="true" all-label="Не выбрана" :virtualized="true" :item-height="36" :overscan="8" @update:model-value="v => form.icon = v ?? ''">
          <template #option="{ value, label }">
            <span class="d-inline-flex align-items-center gap-2">
              <component v-if="LucideIcons[value]" :is="LucideIcons[value]" :size="18"/>
              <span>{{ label }}</span>
            </span>
          </template>
          <template #selected="{ label }">
            <span class="d-inline-flex align-items-center gap-2">
              <component v-if="iconComponent" :is="iconComponent" :size="20"/>
              <span>{{ label }}</span>
            </span>
          </template>
        </SelectBox>
        <div class="form-text">Иконки из библиотеки <a href="https://lucide.dev/icons/" target="_blank" rel="noopener noreferrer" class="text-decoration-none">Lucide</a></div>
      </div>

      <div class="mb-3">
        <label class="form-label">Родительский элемент</label>
        <select v-model="form.parent" class="form-select">
          <option v-for="option in filteredParentOptions" :key="option.id" :value="option.id">
            {{ option.name }}
          </option>
        </select>
      </div>

      <div class="mb-3">
        <div class="form-check">
          <input v-model="form.is_active" type="checkbox" class="form-check-input" id="isActive"/>
          <label class="form-check-label" for="isActive">Активен</label>
        </div>
      </div>

      <div class="mb-3">
        <label class="form-label">Разрешённые роли</label>
        <div class="border rounded p-2" style="max-height: 150px; overflow-y: auto;">
          <div v-for="role in roles" :key="role.id" class="form-check">
            <input v-model="form.allowed_roles" type="checkbox" class="form-check-input" :id="`role-${role.id}`" :value="role.id"/>
            <label class="form-check-label" :for="`role-${role.id}`">
              {{ role.name }}
            </label>
          </div>
          <div v-if="roles.length === 0" class="text-muted">Роли не найдены</div>
        </div>
        <div class="form-text">Если не выбрано ни одной роли, доступно всем пользователям</div>
      </div>

      <div class="mb-3">
        <label class="form-label">Разрешённые ролевые группы</label>
        <div class="border rounded p-2" style="max-height: 150px; overflow-y: auto;">
          <div v-for="group in roleGroups" :key="group.id" class="form-check">
            <input v-model="form.allowed_role_groups" type="checkbox" class="form-check-input" :id="`group-${group.id}`" :value="group.id"/>
            <label class="form-check-label" :for="`group-${group.id}`">
              {{ group.name }} ({{ group.parent_role_name }})
            </label>
          </div>
          <div v-if="roleGroups.length === 0" class="text-muted">Ролевые группы не найдены</div>
        </div>
      </div>
    </form>

    <div class="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
      <button type="button" class="btn btn-secondary" @click="$emit('close')">Отмена</button>
      <button type="button" class="btn btn-primary" @click="handleSubmit" :disabled="!isFormValid">
        {{ isEditing ? 'Сохранить' : 'Создать' }}
      </button>
    </div>
  </ModalCenter>
  <div class="modal-backdrop fade show" @click="$emit('close')"></div>
</template>

<script setup>
import { ref, computed, watch, shallowRef } from 'vue'
import * as LucideIcons from 'lucide-vue-next'
import ModalCenter from '@/components/ModalCenter.vue'
import SelectBox from '@/components/SelectBox.vue'

const LUCIDE_ICON_NAMES = Object.keys(LucideIcons)
  .filter(key => key !== 'default' && !key.endsWith('Icon') && /^[A-Z]/.test(key) && (typeof LucideIcons[key] === 'function' || (typeof LucideIcons[key] === 'object' && LucideIcons[key] !== null)))
  .sort()

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
  }
})

const emit = defineEmits(['save', 'close'])

const isEditing = computed(() => !!props.item?.id)

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

watch(() => props.item, (newItem) => {
  if (newItem) {
    form.value = {
      id: newItem.id,
      name: newItem.name || '',
      route_name: newItem.route_name || '',
      icon: newItem.icon || '',
      item_type: (newItem.item_type === 'group' ? 'route' : newItem.item_type) || 'route',
      page: newItem.page || '',
      external_url: newItem.external_url || '',
      parent: newItem.parent || null,
      order: newItem.order || 0,
      is_active: newItem.is_active !== false,
      allowed_roles: newItem.allowed_roles || [],
      allowed_role_groups: newItem.allowed_role_groups || []
    }
  } else {
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

const filteredParentOptions = computed(() => {
  if (!props.item?.id) {
    return props.parentOptions
  }
  return props.parentOptions.filter(opt => opt.id !== props.item.id)
})

const iconComponent = shallowRef(null)

watch(() => form.value.icon, (iconName) => {
  if (iconName && LucideIcons[iconName]) {
    iconComponent.value = LucideIcons[iconName]
  } else {
    iconComponent.value = null
  }
}, { immediate: true })

const isFormValid = computed(() => {
  if (!form.value.name) return false
  
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