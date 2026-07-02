<template>
  <ModalCenter standalone :visible="true" modal-id="menuItemModal" :title="isEditing ? 'Редактирование элемента меню' : 'Добавление элемента меню'" dialog-class="modal-lg" @closemodal="$emit('close')">
    <form @submit.prevent="handleSubmit">
      <div class="mb-3">
        <label class="form-label">Название <span class="text-danger">*</span></label>
        <input v-model="form.name" type="text" class="form-control" required placeholder="Название пункта меню" style="background-color: var(--var-primary-background)"/>
      </div>

      <div class="mb-3">
        <label class="form-label">Тип элемента <span class="text-danger">*</span></label>
        <SelectBox :model-value="form.item_type" :options="itemTypeOptions" value-key="id" label-key="name" :include-all-option="false" @update:model-value="v => form.item_type = v"/>
      </div>

      <div v-if="form.item_type === 'route'" class="mb-3">
        <label class="form-label">Имя маршрута Vue</label>
        <SelectBox v-if="!useManualRouteInput" :model-value="form.route_name || null" :options="routeOptions" value-key="id" label-key="name" :include-all-option="true" all-label="Пусто (вкладка без перехода на страницу)" searchable search-placeholder="Поиск маршрута..." @update:model-value="v => form.route_name = v ?? ''"/>
        <input v-else v-model="form.route_name" type="text" class="form-control" placeholder="Например: User, AdminPanel, MenuPanel" style="background-color: var(--var-primary-background)"/>
        <div class="form-text" v-if="!useManualRouteInput">Названия маршрутов на кириллице прописаны в файлах <code>routes.js</code> в каждом модуле в атрибуте <code>meta.title</code>.</div>
        <div class="form-text" v-else>Введите техническое имя маршрута (ключ из <code>routes.js</code>). Пусто — вкладка без перехода.</div>
        <div class="form-check mt-2">
          <input v-model="useManualRouteInput" type="checkbox" class="form-check-input" id="useManualRouteInput"/>
          <label class="form-check-label" for="useManualRouteInput">Ввести имя маршрута вручную</label>
        </div>
      </div>

      <div v-if="form.item_type === 'offcanvas'" class="mb-3">
        <label class="form-label">Идентификатор страницы <span class="text-danger">*</span></label>
        <input v-model="form.page" type="text" class="form-control" required placeholder="Например: datasets" style="background-color: var(--var-primary-background)"/>
      </div>

      <div v-if="form.item_type === 'external'" class="mb-3">
        <label class="form-label">URL <span class="text-danger">*</span></label>
        <input v-model="form.external_url" type="url" class="form-control" style="background-color: var(--var-primary-background)" required placeholder="https://ergoms.com"/>
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
        <SelectBox :model-value="form.parent" :options="filteredParentOptions" value-key="id" label-key="name" depth-key="depth" :option-indent-per-level="0" :include-all-option="false" all-label="-- Нет (корневой элемент) --" @update:model-value="v => form.parent = v"/>
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
</template>

<script setup>
import { ref, computed, watch, shallowRef, onMounted } from 'vue'
import * as LucideIcons from 'lucide-vue-next'
import { getAvailableRouteOptions } from '@/modules/index.js'
import ModalCenter from '@/components/ModalCenter.vue'
import SelectBox from '@/components/SelectBox.vue'

const LUCIDE_ICON_NAMES = Object.keys(LucideIcons)
  .filter(key => key !== 'default' && !key.endsWith('Icon') && /^[A-Z]/.test(key) && (typeof LucideIcons[key] === 'function' || (typeof LucideIcons[key] === 'object' && LucideIcons[key] !== null)))
  .sort()

const itemTypeOptions = [
  { id: 'route', name: 'Маршрут Vue' },
  { id: 'offcanvas', name: 'Боковая панель' },
  { id: 'external', name: 'Внешняя ссылка' }
]

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

const routeOptions = ref([])
const useManualRouteInput = ref(false)

onMounted(() => {
  getAvailableRouteOptions().then(opts => { routeOptions.value = opts })
})

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