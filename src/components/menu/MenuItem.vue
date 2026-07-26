<!--
  КОМПОНЕНТ ЭЛЕМЕНТА МЕНЮ
  
  Рекурсивный компонент для отображения элементов меню с поддержкой неограниченной вложенности.
  Поддерживает обычные Vue маршруты и группировку элементов.
  
  Props:
  - item: объект элемента меню
  - level: уровень вложенности (для отступов)
  - isHovering: состояние наведения на свернутое меню
  - openStates: объект с состояниями открытости групп
  
  События:
  - navigate: навигация для вложенных элементов без routeName
  - toggle-group: переключение состояния группы
-->

<script setup>
import { ChevronRight, Dot } from 'lucide-vue-next'
import { computed, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { iconMapping } from '@/config/icons-mapping.js'
import { MENU_ICON_SIZES_KEY, getDefaultMenuIconSizes } from './composables/useMenuIconSizes'
import { isMenuItemActive } from './composables/isMenuItemActive.js'
import { canNavigateToRoute, isSameMenuRoutePath, safeNavigateByName } from './composables/safeMenuNavigate.js'
import { buildMenuItemGroupId } from './composables/useMenuNavigation.js'
import MenuPeekLabel from '@/components/menu/MenuPeekLabel.vue'

const props = defineProps({
  item: { type: Object, required: true },
  level: { type: Number, default: 0 },
  isHovering: { type: Boolean, required: true },
  openStates: { type: Object, required: true }
})

const router = useRouter()
const route = useRoute()
const emit = defineEmits(['navigate', 'toggle-group'])

const injectedIconSizes = inject(MENU_ICON_SIZES_KEY, null)
const iconSizes = computed(() => injectedIconSizes?.value ?? getDefaultMenuIconSizes())

const groupId = computed(() => buildMenuItemGroupId(props.item, props.level))

// Объединяем children и list в один массив для отображения, сохраняя порядок по order
const allChildren = computed(() => {
  const allItems = []

  if (props.item.list) {
    props.item.list.forEach((item) => {
      allItems.push({ ...item, isList: true })
    })
  }

  if (props.item.children) {
    props.item.children.forEach((item) => {
      allItems.push({ ...item, isList: false })
    })
  }

  allItems.sort((a, b) => {
    const orderA = a.order !== undefined ? a.order : (a.isList ? 999999 : 0)
    const orderB = b.order !== undefined ? b.order : (b.isList ? 999999 : 0)
    return orderA - orderB
  })

  return allItems
})

// Проверка, является ли элемент группой (имеет дочерние элементы)
const isGroup = computed(() => {
  return allChildren.value.length > 0
})

// Состояние открытости группы
const isOpen = computed(() => {
  return props.openStates[groupId.value] || false
})

const isActive = computed(() => isMenuItemActive(props.item, { route, router }))

const isGroupActive = computed(() => {
  if (!isGroup.value) return false

  return checkChildrenActiveRecursive(allChildren.value)
})

const checkChildrenActiveRecursive = (children) => {
  if (!children || children.length === 0) return false

  return children.some((child) => {
    if (isMenuItemActive(child, { route, router })) {
      return true
    }

    const nestedChildren = [
      ...(child.list || []),
      ...(child.children || []),
    ]
    if (nestedChildren.length > 0) {
      return checkChildrenActiveRecursive(nestedChildren)
    }

    return false
  })
}

// Обработка клика по элементу
const handleClick = (event) => {
  event.preventDefault()
  
  // Проверяем, является ли элемент внешней ссылкой
  const externalUrl = props.item.externalUrl
  if (props.item.item_type === 'external' && externalUrl) {
    window.open(externalUrl, '_blank', 'noopener,noreferrer')
    return
  }
  
  if (isGroup.value) {
    const routeName = props.item.routeName
    const hasTargetRoute = canNavigateToRoute(router, routeName)
    const targetRoute = hasTargetRoute ? router.resolve({ name: routeName }) : null

    if (isOpen.value) {
      emit('toggle-group', groupId.value)
      return
    }

    emit('toggle-group', groupId.value)

    if (hasTargetRoute && !isSameMenuRoutePath(route.path, targetRoute?.path)) {
      safeNavigateByName(router, routeName)
    }
    return
  } else if (props.item.isOffcanvas || props.item.page) {
    emit('navigate', props.item)
  } else if (props.item.routeName) {
    safeNavigateByName(router, props.item.routeName)
  }
}

// Иконка элемента
const itemIcon = computed(() => {
  if (!props.item.icon) return null
  return typeof props.item.icon === 'string' ? iconMapping[props.item.icon] : props.item.icon
})

// Вычисление отступа в зависимости от уровня вложенности
const paddingLeft = computed(() => `${20 + (props.level * 16)}px`)
</script>

<template>
  <li class="menu-item" :class="{ 'menu-item--group': isGroup }">
    <div
      class="menu-item__content nav-btn"
      :class="{ 'menu-item--active': isActive || isGroupActive }"
      :style="{ paddingLeft: paddingLeft }"
      @click="handleClick"
    >
      <div class="menu-item__label">
        <div class="menu-item__icon icon-flex">
          <component v-if="itemIcon" :is="itemIcon" :size="iconSizes.item" />
          <Dot v-else :size="iconSizes.item" />
        </div>
        <MenuPeekLabel
          :text="item.name || item.title"
          :visible="isHovering"
          :title="item.name || item.title"
          class="menu-item__name"
        />
      </div>
      <div
        v-if="isGroup"
        class="menu-item__chevron icon-flex text-smooth-animation"
        :class="{ hidden: !isHovering }"
      >
        <ChevronRight :size="iconSizes.chevronNested" :class="{ rotated: isOpen }" />
      </div>
    </div>
    <div v-if="isGroup" class="menu-item__children-wrap" :class="{ 'is-open': isOpen }">
      <ul class="menu-item__children">
        <MenuItem
          v-for="(child, index) in allChildren"
          :key="index"
          :item="child"
          :level="level + 1"
          :isHovering="isHovering"
          :openStates="openStates"
          :style="{ transitionDelay: `${index * 30}ms` }"
          @navigate="$emit('navigate', $event)"
          @toggle-group="$emit('toggle-group', $event)"
        />
      </ul>
    </div>
  </li>
</template>

<style lang="scss" scoped>
.menu-item {
  @include flex-column-gap(2px);
}

.menu-item__content {
  @include flex-row-gap(0, center, space-between);
  cursor: pointer;
  color: var(--color-primary-text);
  text-decoration: none;
  padding: $padding-internal $padding-external;
  min-height: var(--menu-item-height, 36px);
  box-sizing: border-box;
  border-radius: $radius-small;
  transition:
    background-color $transition,
    color $transition;
  overflow: hidden;
  
  &:not(.menu-item--active):hover {
    background-color: var(--color-secondary-background);
  }
}

.menu-item__label {
  @include flex-row-gap($padding-internal, center);
  flex: 1;
  min-width: 0; // Позволяет flex элементам сжиматься ниже их естественной ширины
}

.menu-item__icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  min-width: 20px;
}

.menu-item__name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  line-height: var(--menu-label-line-height, 1.25);
}

.menu-item__chevron svg {
  transition: transform 0.3s ease;
}

.rotated {
  transform: rotate(90deg);
}

// Активные состояния - точно такие же как в MenuGroup
.menu-item--active {
  background-color: var(--bs-primary-bg-subtle);
  color: var(--bs-primary);
  
  .menu-item__icon,
  .menu-item__name {
    color: var(--bs-primary);
  }
  
  &:hover {
    background-color: var(--bs-primary-border-subtle);
  }
}

.menu-item--group-active {
  background-color: var(--color-secondary-background);
  
  &:hover {
    background-color: var(--bs-primary-bg-subtle);
  }
}

// Дочерние элементы
.menu-item__children-wrap {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows $transition,
    opacity $transition;

  &.is-open {
    grid-template-rows: 1fr;
    opacity: 1;
  }
}

.menu-item__children {
  overflow: hidden;
  min-height: 0;
  padding: 0;
  margin: 0;
  list-style: none;
}

// Анимация появления дочерних элементов
.menu-item__children-wrap:not(.is-open) .menu-item {
  opacity: 0;
  transform: translateY(-6px);
}

.menu-item__children-wrap.is-open .menu-item {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
</style> 