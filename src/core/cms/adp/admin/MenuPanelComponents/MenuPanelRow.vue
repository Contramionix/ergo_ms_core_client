<template>
  <tr :class="{ 'table-secondary': level > 0 }">
    <td>
      <span :style="{ paddingLeft: `${level * 20}px` }">
        {{ item.order }}
      </span>
    </td>
    <td>
      <span :style="{ paddingLeft: `${level * 20}px` }">
        <component 
          v-if="item.icon && iconComponent" 
          :is="iconComponent" 
          :size="16" 
          class="me-2 text-muted"
          style="vertical-align: middle;"
        />
        {{ item.name }}
      </span>
    </td>
    <td>
      <code v-if="item.route_name" class="text-primary">{{ item.route_name }}</code>
      <span v-else class="text-muted">—</span>
    </td>
    <td>
      <span v-if="item.icon" class="badge bg-light text-dark">{{ item.icon }}</span>
      <span v-else class="text-muted">—</span>
    </td>
    <td>
      <span class="badge" :class="itemTypeBadgeClass">
        {{ itemTypeLabel }}
      </span>
    </td>
    <td>
      <span 
        class="badge" 
        :class="item.is_active ? 'bg-success' : 'bg-secondary'"
      >
        {{ item.is_active ? 'Активен' : 'Неактивен' }}
      </span>
    </td>
    <td>
      <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-primary" @click="$emit('edit', item)">
          <Edit :size="14" />
        </button>
        <button class="btn btn-outline-danger" @click="$emit('delete', item)">
          <Trash :size="14" />
        </button>
      </div>
    </td>
  </tr>
  
  <!-- Рекурсивно рендерим дочерние элементы -->
  <template v-if="item.children && item.children.length > 0">
    <MenuPanelRow
      v-for="child in item.children"
      :key="child.id"
      :item="child"
      :level="level + 1"
      @edit="$emit('edit', $event)"
      @delete="$emit('delete', $event)"
    />
  </template>
</template>

<script setup>
import { computed, shallowRef, watch } from 'vue'
import { Edit, Trash } from 'lucide-vue-next'
import { getLucideIconAsync } from '@/js/lucideIconLoader.js'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  }
})

defineEmits(['edit', 'delete'])

// Динамическая загрузка иконки
const iconComponent = shallowRef(null)

watch(() => props.item.icon, async (iconName) => {
  iconComponent.value = iconName ? await getLucideIconAsync(iconName) : null
}, { immediate: true })

// Метки типов элементов
const itemTypeLabels = {
  route: 'Маршрут',
  offcanvas: 'Боковая панель',
  external: 'Внешняя ссылка'
}

const itemTypeLabel = computed(() => {
  return itemTypeLabels[props.item.item_type] || (props.item.item_type === 'group' ? 'Маршрут' : props.item.item_type)
})

const itemTypeBadgeClass = computed(() => {
  const classes = {
    route: 'bg-primary',
    offcanvas: 'bg-warning text-dark',
    external: 'bg-secondary'
  }
  return classes[props.item.item_type] || (props.item.item_type === 'group' ? 'bg-primary' : 'bg-light text-dark')
})
</script>

