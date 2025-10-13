<script setup>
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { onMounted, ref, watch } from 'vue'
import { ChevronLeft, Cog, Minus } from 'lucide-vue-next'

import {
  allMenuSections,
  getSeparator,
  shouldShowSeparator,
  AdminPanelMenuSection
} from '@/js/menu-sections.js'

import MenuGroup from '@/components/menu/MenuGroup.vue'
import MenuToolbar from '@/components/menu/MenuToolbar.vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import { CheckAccessToAdminPanel, GetClosedPagesForUser } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { useUserStore } from '@/core/cms/js/userStore.js'
const props = defineProps({
  isVisible: Boolean,
  currentPage: String
})
watch(
  () => props.isVisible,
  (newValue) => {
    if (!newValue) {
      isHovering.value = true
    } else {
      // Пересчитываем ширину когда меню становится видимым
      initializeMenuWidth()
      // Дополнительно обновляем через короткий промежуток
      setTimeout(() => {
        updateMenuWidth()
      }, 50)
    }
  },
)


const emit = defineEmits(['left-padding', 'open-datasets', 'open-sidebar', 'reset-page', 'menu-state-change'])
const userStore = useUserStore()

// Состояние меню
const isCollapsed = ref(false)
const isHovering = ref(true)
const menuWidth = ref(260) // Добавляем реактивную ширину меню
const minMenuWidth = 260 // Минимальная ширина
const maxMenuWidth = Infinity // Максимальная ширина (без жёсткого ограничения для исключения горизонтального скролла)

// Состояние для отслеживания активных выпадающих элементов тулбара
const isToolbarDropdownActive = ref(false)

// Немедленно рассчитываем начальную ширину при создании компонента
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const initialWidth = calculateOptimalWidth()
    if (initialWidth > menuWidth.value) {
      menuWidth.value = initialWidth
    }
  }, 0)
}

// Функция для обрезки текста до определенного количества символов (аналогично MenuToolbar.vue)
const truncateText = (text, maxLength = 30) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Функция для получения отображаемого имени пользователя (аналогично MenuToolbar.vue)
const getDisplayUserName = () => {
  if (!userStore.user) return 'Гость'

  if (userStore.displayName === 'Гость') return 'Гость'

  const firstName = userStore.user.first_name?.trim()
  const lastName = userStore.user.last_name?.trim()

  const cleanFirstName = firstName === ' ' ? '' : firstName
  const cleanLastName = lastName === ' ' ? '' : lastName

  let fullName = ''

  if (cleanFirstName && cleanLastName) {
    fullName = `${cleanFirstName} ${cleanLastName}`
  } else if (cleanFirstName) {
    fullName = cleanFirstName
  } else if (cleanLastName) {
    fullName = cleanLastName
  } else {
    return 'Гость'
  }

  // Ограничиваем длину имени до 30 символов (как в MenuToolbar.vue)
  return truncateText(fullName, 30)
}

// Функция для расчета ширины тулбара на основе содержимого
const calculateToolbarWidth = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0
  }

  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    context.font = '14px system-ui, -apple-system, sans-serif'
    
    // Рассчитываем ширину элементов тулбара:
    let toolbarWidth = 0
    
    // 1. Аватар пользователя: 40px
    toolbarWidth += 40
    
    // 2. Имя пользователя + статус "В сети"
    if (userStore.user) {
      // Используем отображаемое имя (с обрезкой до 30 символов)
      const displayName = getDisplayUserName()
      
      // Ширина отображаемого имени пользователя
      const nameWidth = context.measureText(displayName).width
      // Ширина статуса "В сети" (меньший шрифт)
      context.font = '12px system-ui, -apple-system, sans-serif'
      const statusWidth = context.measureText('В сети').width
      context.font = '14px system-ui, -apple-system, sans-serif' // возвращаем обратно
      
      // Берем максимальную ширину из имени и статуса
      toolbarWidth += Math.max(nameWidth, statusWidth) + 15 // +15px для отступов
    } else {
      toolbarWidth += 60 // примерная ширина для "Гость"
    }
    
    // 3. Отступ между именем и кнопками
    toolbarWidth += 15
    
    // 4. Кнопки (AI ассистент, смена темы, уведомления)
    // Каждая кнопка ~32px (24px иконка + 8px padding)
    toolbarWidth += 32 * 3 // 3 кнопки
    
    // 5. Отступы между кнопками (2px между кнопками)
    toolbarWidth += 2 * 2 // между 3 кнопками = 2 промежутка
    
    // 6. Отступы тулбара (padding: 10px + margin: 3% от каждой стороны)
    // Примерно 20px с каждой стороны = 40px
    toolbarWidth += 40
    
    // 7. Дополнительный запас для комфортного размещения
    toolbarWidth += 20
    
    return toolbarWidth
  } catch {
    // В случае ошибки возвращаем базовую ширину
    return 280
  }
}

// Функция для расчета оптимальной ширины меню
const calculateOptimalWidth = () => {
  // Проверяем, что мы находимся в браузере
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return minMenuWidth
  }
  
  // Создаем временный элемент для измерения текста
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  context.font = '14px system-ui, -apple-system, sans-serif' // Шрифт как в CSS
  
  let maxWidth = 0
  
  // Проверяем ширину названия сайта
  const siteNameWidth = context.measureText(siteName.value || 'ERGO MS').width + 80 // +80px для иконки и отступов
  maxWidth = Math.max(maxWidth, siteNameWidth)
  
  // Проверяем все секции меню
  if (menuSections.value && Array.isArray(menuSections.value)) {
    menuSections.value.forEach(section => {
    if (!section || !section.title) return
    
    // Ширина основного пункта меню
    const titleWidth = context.measureText(section.title).width + 100 // +100px для иконки, отступов и стрелки
    maxWidth = Math.max(maxWidth, titleWidth)
    
    // Ширина подпунктов
    if (section.list && Array.isArray(section.list)) {
      section.list.forEach(item => {
        if (!item || !item.name) return
        const itemWidth = context.measureText(item.name).width + 120 // +120px для отступов и точки
        maxWidth = Math.max(maxWidth, itemWidth)
      })
    }
  })
  }
  
  // Проверяем разделители
  if (menuSections.value && Array.isArray(menuSections.value)) {
    for (let i = 0; i < menuSections.value.length; i++) {
      if (shouldShowSeparator(i)) {
        const separatorText = getSeparator(i)
        if (separatorText) {
          const separatorWidth = context.measureText(separatorText).width + 80
          maxWidth = Math.max(maxWidth, separatorWidth)
        }
      }
    }
  }
  
  // Рассчитываем ширину тулбара и учитываем её
  const toolbarWidth = calculateToolbarWidth()
  maxWidth = Math.max(maxWidth, toolbarWidth)
  
  // Добавляем небольшой запас для комфортного размещения
  maxWidth += 10
  
  // Ограничиваем только минимум, верхний предел не ограничиваем, чтобы меню расширялось без появления горизонтального скролла
  return Math.max(maxWidth, minMenuWidth)
}

const toggleMenu = () => {
  isCollapsed.value = !isCollapsed.value
  const padding = isCollapsed.value ? '120px' : `${menuWidth.value + 40}px`
  emit('left-padding', padding)
  emit('menu-state-change', isCollapsed.value, menuWidth.value)
}

// Первоначальная установка ширины
const initializeMenuWidth = () => {
  if (typeof window !== 'undefined') {
    // Сразу рассчитываем оптимальную ширину
    const newWidth = calculateOptimalWidth()
    menuWidth.value = newWidth
    
    // Устанавливаем правильный padding при инициализации
    setTimeout(() => {
      if (!isCollapsed.value) {
        emit('left-padding', `${menuWidth.value + 40}px`)
      }
      emit('menu-state-change', isCollapsed.value, menuWidth.value)
    }, 100)
    
    // Дополнительно обновляем через небольшой промежуток для надежности
    setTimeout(() => {
      updateMenuWidth()
    }, 300)
  }
}

// Дебаунс функция для пересчета ширины
let widthUpdateTimeout = null

// Обновляем ширину при изменении содержимого
const updateMenuWidth = () => {
  if (typeof window !== 'undefined') {
    // Отменяем предыдущий таймер
    if (widthUpdateTimeout) {
      clearTimeout(widthUpdateTimeout)
    }
    
    // Устанавливаем новый таймер с дебаунсингом
    widthUpdateTimeout = setTimeout(() => {
      const newWidth = calculateOptimalWidth()
      if (newWidth !== menuWidth.value) {
        menuWidth.value = newWidth
        if (!isCollapsed.value) {
          emit('left-padding', `${newWidth + 40}px`)
        }
        emit('menu-state-change', isCollapsed.value, menuWidth.value)
      }
    }, 150)
  }
}

// Функция для настройки отслеживания изменений
const setupWidthTracking = () => {
  if (typeof window === 'undefined') {
    return
  }

  // Отслеживаем изменения размера окна
  window.addEventListener('resize', updateMenuWidth)
  
  // Принудительно пересчитываем ширину при загрузке
  updateMenuWidth()
}

const handleMouseEnter = () => {
  if (isCollapsed.value) isHovering.value = true
}
const handleMouseLeave = () => {
  // Если есть активные выпадающие элементы тулбара, не скрываем меню
  if (isCollapsed.value && !isToolbarDropdownActive.value) {
    isHovering.value = false
  }
}

// Функции для управления состоянием выпадающих элементов тулбара
const setToolbarDropdownActive = (active) => {
  isToolbarDropdownActive.value = active
  if (active && isCollapsed.value) {
    isHovering.value = true
  }
}

const route = useRoute()
const openGroupRouteName = ref(null)
const preventAutoOpen = ref(false)
const nestedOpenStates = ref({})

// Рекурсивная функция для поиска родительской группы по маршруту
const findParentGroupByRoute = (routeName, menuSections) => {
  for (let section of menuSections) {
    // Проверяем основную группу
    if (section.routeName === routeName) {
      return section.routeName
    }
    
    // Проверяем прямые дочерние элементы
    if (section.list && Array.isArray(section.list)) {
      for (let item of section.list) {
        if (item.routeName === routeName) {
          return section.routeName
        }
      }
    }
    
    // Рекурсивно проверяем children
    if (section.children && Array.isArray(section.children)) {
      const found = findParentInChildren(routeName, section.children)
      if (found) {
        return section.routeName
      }
    }
  }
  return null
}

// Рекурсивная функция для поиска в дочерних элементах
const findParentInChildren = (routeName, children) => {
  for (let child of children) {
    if (child.routeName === routeName) {
      return true
    }
    if (child.children && Array.isArray(child.children)) {
      if (findParentInChildren(routeName, child.children)) {
        return true
      }
    }
  }
  return false
}

// Рекурсивная функция для открытия всех вложенных групп в пути к активному элементу
const openNestedGroupsForRoute = (routeName, menuSections) => {
  const findAndOpenNestedGroups = (routeName, children, parentId = '') => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const childId = `${child.routeName || child.page || child.name}_${parentId ? parentId + '_' : ''}${i}`
      
      if (child.routeName === routeName) {
        // Найден целевой элемент, открываем все родительские группы
        return true
      }
      
      if (child.children && Array.isArray(child.children)) {
        if (findAndOpenNestedGroups(routeName, child.children, childId)) {
          // Открываем текущую группу, так как целевой элемент найден в её дочерних элементах
          nestedOpenStates.value[childId] = true
          return true
        }
      }
    }
    return false
  }
  
  // Проходим по всем секциям
  for (let section of menuSections) {
    if (section.children && Array.isArray(section.children)) {
      findAndOpenNestedGroups(routeName, section.children)
    }
  }
}

watch(
  () => route.matched,
  (newMatched) => {
    if (preventAutoOpen.value) {
      preventAutoOpen.value = false
      return
    }
    
    if (menuSections.value && Array.isArray(menuSections.value)) {
      const currentRouteName = newMatched[0]?.name
      
      // Находим родительскую группу для текущего маршрута
      const parentGroup = findParentGroupByRoute(currentRouteName, menuSections.value)
      
      if (parentGroup) {
        openGroupRouteName.value = parentGroup
        
        // Открываем все необходимые вложенные группы
        openNestedGroupsForRoute(currentRouteName, menuSections.value)
      }
    }
  },
  { immediate: false },
)

onMounted(async()=>{
  let closedpages = await GetClosedPagesForUser()  
  for (let clpage of closedpages)
  {
      let name = router.getRoutes().find(p=> p.path == clpage.path).name
      for(let menusection of menuSections.value){
        if(menusection.routeName == name){
          let index = menuSections.value.indexOf(menusection)
          menuSections.value.splice(index,1)
        }
        else{
        let b = menusection.list
        if(b!= null){
          for(let i=0; i<b.length; i++){
          if(b[i].path == name){
            menusection.list.splice(i,1)
            break
          }
        }
        }
      }
    }
  }
  const checkadm = await CheckAccessToAdminPanel()
  if(!checkadm.access_to_panel)
  {
    let index = menuSections.value.indexOf(AdminPanelMenuSection);
    if (index !== -1) {
      menuSections.value.splice(index, 1);
    }
  }
  else if (!checkadm.access_to_category){
    AdminPanelMenuSection.list.splice(0,1)
  }
  
  // Рассчитываем оптимальную ширину после загрузки данных
  initializeMenuWidth()
  
  // Настраиваем отслеживание изменений ширины
  setupWidthTracking()
}
)

const toggleGroup = (routeName) => {
  if (openGroupRouteName.value === routeName) {
    // Если закрываем группу, устанавливаем флаг для предотвращения автоматического открытия
    preventAutoOpen.value = true
    openGroupRouteName.value = null
  } else {
    openGroupRouteName.value = routeName
  }
}

// Обработчик переключения вложенных групп
const toggleNestedGroup = (groupId) => {
  nestedOpenStates.value[groupId] = !nestedOpenStates.value[groupId]
}

function handleAction(action) {
  if (action === 'openDatasetSidebar') {
    emit('open-datasets')
  }
}

const router = useRouter()

function handleNavigate(item) {
  if (['datasets', 'connections', 'charts', 'dashboards'].includes(item.page)) {
    emit('open-sidebar', item.page)
  } else if (item.path) {
    router.push({ name: item.path })
  }
}

function resetCurrentPage() {
  emit('reset-page')  
}

// Список секций меню загружается из JSON конфигурации
const menuSections = ref([...allMenuSections])

const separators = (index) => {
  return getSeparator(index)
}

const hasSeparator = (index) => {
  return shouldShowSeparator(index)
}

const siteName = ref('...')

// Следим за изменениями в меню для пересчета ширины
watch(menuSections, updateMenuWidth, { deep: true })
watch(siteName, updateMenuWidth)

// Специальная логика для обновления имени пользователя
watch(() => userStore.user, (newUser, oldUser) => {
  // Проверяем, изменилось ли имя пользователя
  const oldName = oldUser ? `${oldUser.first_name || ''} ${oldUser.last_name || ''}`.trim() : ''
  const newName = newUser ? `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim() : ''
  
  if (oldName !== newName && newName) {
    // Если имя изменилось и меню свернуто, сначала расширяем его
    if (isCollapsed.value) {
      isHovering.value = true
      // Небольшая задержка для плавного расширения
      setTimeout(() => {
        updateMenuWidth()
      }, 100)
    } else {
      updateMenuWidth()
    }
  } else {
    updateMenuWidth()
  }
}, { deep: true })

onMounted(async () => {
  try {
    const res = await apiClient.get(endpoints.settings.lastSettings)
    if (res.success) {
      const settings = Array.isArray(res.data) ? res.data[0] : res.data
      siteName.value = settings?.site_name || 'ERGO MS'
    } else {
      siteName.value = 'ERGO MS'
    }
  } catch {
    // Тихо устанавливаем значение по умолчанию без логирования ошибки
    siteName.value = 'ERGO MS'
  }
  
  // Обновляем ширину после загрузки названия сайта
  initializeMenuWidth()
  
  // Настраиваем отслеживание изменений ширины (дублируем для надежности)
  setTimeout(() => {
    setupWidthTracking()
  }, 500)
})

</script>

<template>
  <aside
    class="side-menu card p-0"
    :class="{ collapsed: isCollapsed, hovering: isHovering, 'is-hidden': !isVisible }"
    :style="{ '--menu-width': `${menuWidth}px` }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="side-menu__header side-header">
      <RouterLink to="/" class="side-menu__logo">
        <div class="side-header__icon">
          <Cog :size="32" />
        </div>
        <div class="side-header__title text-smooth-animation" :class="{ hidden: !isHovering }">
          {{ siteName }}
        </div>
      </RouterLink>
      <div class="side-menu__toggle">
        <button @click="toggleMenu" class="btn btn-primary">
          <ChevronLeft :class="{ rotated: isCollapsed }" :size="20" class="menu-group__chevron" />
        </button>
      </div>
    </div>
    <div class="side-header__shadow" style="display: block"></div>
    <PerfectScrollbar :tag="'ul'" :options="{ suppressScrollX: true, wheelPropagation: false }" class="side-menu__list p-3" :class="{ short: !isHovering }">
      <li v-for="(section, index) in menuSections" :key="index">
        <!-- Сепаратор перед секцией -->
        <div v-if="hasSeparator(index)" class="side-menu__divider side-divider py-3">
          <div class="side-divider__icon"><Minus :size="20" /></div>
          <div class="side-divider__name text-smooth-animation" :class="{ hidden: !isHovering }">
            {{ separators(index) }}
          </div>
        </div>
        
        <MenuGroup
          :is-hovering="isHovering"
          :is-collapsed="!isCollapsed"
          :is-open="openGroupRouteName === section.routeName"
          :data="section"
          :current-page="props.currentPage"
          :nested-open-states="nestedOpenStates"
          @toggle="toggleGroup(section.routeName)"
          @action="handleAction"
          @navigate="handleNavigate"
          @reset-page="resetCurrentPage"
          @toggle-nested="toggleNestedGroup"
        />
      </li>
    </PerfectScrollbar>
    <MenuToolbar 
      :is-collapsed="isCollapsed" 
      :is-hovering="isHovering" 
      @dropdown-state-change="setToolbarDropdownActive"
    />
  </aside>
  
</template>

<style lang="scss" scoped>
// Меню
.side-menu {
  position: fixed;
  inline-size: var(--menu-width, 260px);
  padding: $padding-external;
  height: 100dvh;

  transform: translateX(0);
  z-index: 1005;

  transition: all $transition;

  &.is-hidden {
    transform: translateX(-110%);
  }

  &.collapsed {
    width: 84px;
  }

  &.hovering {
    width: var(--menu-width, 260px);
  }
}

// Шапка меню
.side-header {
  position: relative;
  padding: 15px 0 15px 26px;

  a {
    @include flex-row-gap($padding-internal, center);
    text-decoration: none;
  }
}

// Тень
.side-header__shadow {
  position: absolute;
  top: 3.3125rem;
  width: 100%;
  height: 2rem;
  background: linear-gradient(var(--bs-card-bg) 41%, rgba(255, 255, 255, 0));
  pointer-events: none;
  z-index: 2;

  transition: background $transition;
}

// Иконка логотипа
.side-header__icon {
  width: 32px;
  height: 32px;
  color: var(--color-primary-text);
}

// Заголовок
.side-header__title {
  flex-grow: 1;

  color: var(--color-primary-text);
  font-size: $font-size-h1;
  font-weight: bold;
  white-space: nowrap;
  text-overflow: ellipsis;
  user-select: none;

  overflow: hidden;
}

// Кнопка переключения
.side-menu__toggle {
  position: absolute;
  top: 50%;
  right: 0;

  transform: translate(50%, -50%);
  cursor: pointer;

  border: 6px solid var(--bs-body-bg);
  border-radius: 50%;
  transition: border 0.5s ease;

  button {
    @include flex-row-gap(0, center, center);

    border-radius: 50%;
    height: 26px;
    width: 26px;
    padding: 0;
  }
}

// Анимация иконки
.menu-group__chevron {
  transition: transform 0.3s ease;

  &.rotated {
    transform: rotate(180deg);
  }
}

// Список меню
.side-menu__list {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;

  list-style: none;
  padding: 0;
  margin: 0;
  overflow-x: hidden;

  &.short {
    overflow: hidden;
  }
}

// Разделитель
.side-divider {
  @include flex-row-gap($padding-internal, center);
  padding: $padding-internal $padding-external;
  overflow: hidden;

  &__name,
  &__icon {
    user-select: none;
    color: var(--color-secondary-text);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

// Принудительно скрываем горизонтальный скролл внутри PerfectScrollbar
.ps {
  overflow-x: hidden !important;
}
.ps__rail-x,
.ps__thumb-x {
  display: none !important;
}
</style>
