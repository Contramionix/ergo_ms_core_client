<!--
  КОМПОНЕНТ ГРУППЫ МЕНЮ
  
  Представляет отдельную секцию (группу) в боковом меню с возможностью
  содержать подразделы. Поддерживает различные типы навигации и 
  адаптивное отображение в зависимости от состояния родительского меню.
  
  Функциональность:
  - Отображение основного пункта меню с иконкой и названием
  - Сворачивание/разворачивание списка подразделов с анимацией
  - Поддержка многоуровневой вложенности через компонент MenuItem
  - Поддержка обычных Vue маршрутов (RouterLink навигация)
  - Адаптивное скрытие/показ элементов в зависимости от hover состояния
  - Активное состояние для текущей страницы/раздела
  - Плавные анимации появления подразделов с задержкой
  
  Props:
  - data: объект секции меню из menu-sections.js
  - isOpen: состояние открытости группы
  - isCollapsed: состояние сворачивания родительского меню
  - isHovering: состояние наведения на свернутое меню
  - nestedOpenStates: объект с состояниями открытости вложенных групп
  
  События:
  - toggle: переключение состояния группы
  - navigate: навигация для вложенных элементов без routeName
  - toggle-nested: переключение состояния вложенной группы
-->

<script setup>
import { ChevronRight, Dot } from 'lucide-vue-next'
import { computed, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MenuItem from './MenuItem.vue'
import { iconMapping } from '@/config/icons-mapping.js'
import { MENU_ICON_SIZES_KEY, getDefaultMenuIconSizes } from './composables/useMenuIconSizes'
import { isMenuItemActive } from './composables/isMenuItemActive.js'

const props = defineProps({
  data: { type: Object, required: true },
  isOpen: { type: Boolean, required: true },
  isCollapsed: { type: Boolean, required: true },
  isHovering: { type: Boolean, required: true },
  nestedOpenStates: { type: Object, default: () => ({}) },
})

const injectedIconSizes = inject(MENU_ICON_SIZES_KEY, null)
const iconSizes = computed(() => injectedIconSizes?.value ?? getDefaultMenuIconSizes())

// Иконка группы: поддерживаем как прямой компонент, так и строковый ключ из конфигурации
const groupIcon = computed(() => {
  const rawIcon = props.data.icon
  if (!rawIcon) return null

  // Если иконка задана строкой — пробуем взять из iconMapping
  if (typeof rawIcon === 'string') {
    return iconMapping[rawIcon] || null
  }

  // Если это уже компонент, возвращаем как есть
  return rawIcon
})

// Объединяем list и children в один массив для отображения, сохраняя порядок по order
const menuItems = computed(() => {
  const allItems = []
  
  if (props.data.list) {
    props.data.list.forEach(item => {
      allItems.push({ ...item, isList: true })
    })
  }
  
  if (props.data.children) {
    props.data.children.forEach(item => {
      allItems.push({ ...item, isList: false })
    })
  }
  
  // Сортируем по order, чтобы сохранить исходный порядок из API
  allItems.sort((a, b) => {
    const orderA = a.order !== undefined ? a.order : (a.isList ? 999999 : 0)
    const orderB = b.order !== undefined ? b.order : (b.isList ? 999999 : 0)
    return orderA - orderB
  })
  
  return allItems
})

// Проверяем, есть ли вообще элементы для отображения
const hasMenuItems = computed(() => {
  return (props.data.list && props.data.list.length > 0) || 
         (props.data.children && props.data.children.length > 0)
})

const router = useRouter()
const route = useRoute()
const emit = defineEmits(['toggle', 'navigate', 'toggle-nested', 'reset-offcanvas-page'])

// Проверяем, находится ли пользователь на странице группы или её подстраницах
const isCurrentGroupPage = computed(() => {
  // Проверяем основную страницу группы
  if (route.name === props.data.routeName) {
    return true
  }
  
  // Проверяем, является ли текущий роут дочерним роутом для группы
  if (props.data.routeName && route.name && route.name.startsWith(props.data.routeName) && route.name !== props.data.routeName) {
    try {
      const parentRoute = router.resolve({ name: props.data.routeName })
      if (parentRoute && parentRoute.path && route.path.startsWith(parentRoute.path)) {
        return true
      }
    } catch (e) {
      return true
    }
  }
  
  // Проверяем подстраницы через рекурсивную функцию
  if (menuItems.value.length > 0) {
    return checkChildrenActiveRecursive(menuItems.value)
  }

  return false
})

const checkChildrenActiveRecursive = (children) => {
  if (!children || children.length === 0) return false

  return children.some((item) => {
    if (isMenuItemActive(item, { route, router })) {
      return true
    }

    const nestedChildren = [
      ...(item.list || []),
      ...(item.children || []),
    ]
    if (nestedChildren.length > 0) {
      return checkChildrenActiveRecursive(nestedChildren)
    }

    return false
  })
}

// Обработчик переключения вложенных групп
function handleToggleNested(groupId) {
  emit('toggle-nested', groupId)
}

// Обработчик навигации для вложенных элементов
function handleNestedNavigate(item) {
  emit('navigate', item)
}

function handleResetOffcanvasPage() {
  emit('reset-offcanvas-page')
}

function routeClick(event) {
  event.preventDefault() // Всегда блокируем стандартную навигацию RouterLink
  
  // Проверяем, является ли элемент внешней ссылкой
  const externalUrl = props.data.externalUrl || props.data.external_url
  if (props.data.item_type === 'external' && externalUrl) {
    window.open(externalUrl, '_blank', 'noopener,noreferrer')
    return
  }
  
  if (hasMenuItems.value) {
    // Если у элемента есть подменю
    if (props.isOpen) {
      // Если группа открыта - просто закрываем, не переходим никуда
      emit('toggle')
    } 
    else {
      // Если группа закрыта - открываем
      emit('toggle')
      
      // Переходим на основную страницу только если пользователь НЕ находится в пределах этой группы
      if (!isCurrentGroupPage.value) {
        router.push({ name: props.data.routeName })
      }
    }
  } else {
    // Если подменю нет - просто переходим на страницу
    router.push({ name: props.data.routeName })
  }
}
</script>

<template>
  <li class="side-menu__group side-group">
    <div class="side-title nav-btn" :class="{ 'side-title--active': isCurrentGroupPage }" @click="routeClick($event)">
      <div class="side-title__label">
        <div class="side-icon icon-flex">
          <component v-if="groupIcon" :is="groupIcon" :size="iconSizes.item" />
          <Dot v-else :size="iconSizes.item" />
        </div>
        <div
          class="side-title__name text-smooth-animation"
          :class="{ hidden: !isHovering }"
          :title="data.title"
        >
          {{ data.title }}
        </div>
      </div>
      <div v-if="isHovering && hasMenuItems" class="nav-icon icon-flex">
        <ChevronRight :size="iconSizes.chevronGroup" :class="{ rotated: isOpen }" />
      </div>
    </div>

    <ul v-if="hasMenuItems" class="side-group__list" :class="(isCollapsed || isHovering) && isOpen ? 'is-open' : ''">
      <MenuItem
        v-for="(item, index) in menuItems"
        :key="index"
        :item="item"
        :level="0"
        :isHovering="isHovering"
        :openStates="nestedOpenStates"
        :style="{ transitionDelay: `${index * 50}ms` }"
        @navigate="handleNestedNavigate"
        @reset-offcanvas-page="handleResetOffcanvasPage"
        @toggle-group="handleToggleNested"
      />
    </ul>
  </li>
</template>

<style lang="scss" scoped>
.side-group {
  @include flex-column-gap(2px);
}

.side-title,
.side-subtitle {
  @include flex-row-gap(0, center, space-between);
  cursor: pointer;
  color: var(--color-primary-text);
  text-decoration: none;

  &__label {
    @include flex-row-gap($padding-internal, center);
    flex: 1;
    min-width: 0; // Позволяет flex элементам сжиматься ниже их естественной ширины
  }
}

.side-title--active {
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
}
.side-subtitle--active .nav-icon,
.side-subtitle--active .side-subtitle__name {
  color: var(--bs-primary);
  padding-left: 0.5rem;
}

.nav-btn {
  padding: $padding-internal $padding-external;
  border-radius: $radius-small;
  transition: all $transition;
  overflow: hidden;

  &:not(.side-title--active):hover {
    background-color: var(--color-secondary-background);
  }
  &.side-title--active:hover {
    background-color: var(--bs-primary-border-subtle);
  }
}

.side-subtitle--active {
  background-color: var(--bs-primary-bg-subtle);
  color: var(--bs-primary);
}

.side-title__name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.side-icon {
  flex-shrink: 0;
}

.side-subtitle__name {
  white-space: nowrap;
  overflow: visible;
  text-overflow: unset;
  flex: 1;
}

.nav-icon svg {
  transition: transform 0.3s ease;
}
.rotated {
  transform: rotate(90deg);
}

.side-group__list {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  padding: 0;
  margin: 0;
  list-style: none;

  transition:
    max-height 0.5s ease,
    opacity 0.5s ease-in-out;
}

.side-group__list.is-open {
  max-height: none;
  opacity: 1;
}

.side-group__list-item {
  opacity: 0;
  transform: translateY(-10px);
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.side-group__list.is-open .side-group__list-item {
  opacity: 1;
  transform: translateY(0);
}
</style>