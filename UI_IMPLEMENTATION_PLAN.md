# План реализации нового UI с 4 окнами и переключением модулей

## Анализ текущей архитектуры

### Текущее состояние системы:
- **Vue 3** с Composition API
- **Pinia** для state management (уже используется)
- **Vue Router** для маршрутизации
- **Модульная система** с автоматическим обнаружением через `ModuleManager`
- **Bootstrap 5** для базовых стилей
- **Lucide Vue Next** для иконок
- Текущий layout: боковое меню (`LayoutMenu.vue`) + основной контент через `RouterView`

### Ключевые компоненты для интеграции:
- `ModuleManager` - управление модулями и их конфигурациями
- `MenuManager` - управление конфигурацией меню из модулей
- `RouteManager` - управление роутами модулей
- `IconManager` - управление иконками модулей

---

## Фаза 1: Базовая структура окон и dock (Приоритет: ВЫСОКИЙ)

### 1.1 Создание Pinia Store для управления окнами

**Файл:** `core/client/src/stores/windowManager.js`

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'

export const useWindowManagerStore = defineStore('windowManager', () => {
  // Состояние окон
  const windows = ref([])
  const maxWindows = ref(4)
  const activeWindowId = ref(null)
  
  // Доступные модули (загружаются из ModuleManager)
  const availableModules = ref([])
  
  // Computed
  const activeWindow = computed(() => 
    windows.value.find(w => w.id === activeWindowId.value)
  )
  
  const canOpenNewWindow = computed(() => 
    windows.value.length < maxWindows.value
  )
  
  // Actions
  function createWindow(moduleId, moduleConfig) {
    if (!canOpenNewWindow.value) {
      throw new Error('Достигнут максимум окон')
    }
    
    const window = {
      id: uuidv4(),
      moduleId,
      title: moduleConfig.title || moduleConfig.name,
      route: moduleConfig.route || { name: moduleConfig.routeName },
      position: calculateInitialPosition(windows.value.length),
      size: calculateInitialSize(),
      isMinimized: false,
      isMaximized: false,
      isDetached: false,
      zIndex: getNextZIndex(),
      isActive: true,
      moduleConfig
    }
    
    windows.value.push(window)
    setActiveWindow(window.id)
    saveWindowsToStorage()
    
    return window
  }
  
  function closeWindow(windowId) {
    const index = windows.value.findIndex(w => w.id === windowId)
    if (index !== -1) {
      windows.value.splice(index, 1)
      if (activeWindowId.value === windowId && windows.value.length > 0) {
        setActiveWindow(windows.value[windows.value.length - 1].id)
      }
      saveWindowsToStorage()
    }
  }
  
  function setActiveWindow(windowId) {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      windows.value.forEach(w => {
        w.isActive = w.id === windowId
        if (w.isActive) {
          w.zIndex = getNextZIndex()
        }
      })
      activeWindowId.value = windowId
      saveWindowsToStorage()
    }
  }
  
  function updateWindowPosition(windowId, position) {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      window.position = position
      saveWindowsToStorage()
    }
  }
  
  function updateWindowSize(windowId, size) {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      window.size = size
      saveWindowsToStorage()
    }
  }
  
  function toggleMinimize(windowId) {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      window.isMinimized = !window.isMinimized
      saveWindowsToStorage()
    }
  }
  
  function toggleMaximize(windowId) {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      window.isMaximized = !window.isMaximized
      saveWindowsToStorage()
    }
  }
  
  function detachWindow(windowId) {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      window.isDetached = true
      saveWindowsToStorage()
    }
  }
  
  function dockWindow(windowId) {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      window.isDetached = false
      saveWindowsToStorage()
    }
  }
  
  async function loadAvailableModules() {
    const { moduleManager } = await import('@/modules/index.js')
    await moduleManager.initialize()
    const menuConfig = await moduleManager.getMenuConfig()
    const iconManager = moduleManager.icons
    
    availableModules.value = (menuConfig.menuSections || []).map(section => ({
      id: section.routeName?.toLowerCase() || section.name?.toLowerCase(),
      name: section.title || section.name,
      icon: iconManager.getIcon(section.icon),
      iconName: section.icon,
      route: section.routeName ? { name: section.routeName } : null,
      routeName: section.routeName
    }))
  }
  
  // Вспомогательные функции
  function calculateInitialPosition(index) {
    const gap = 20
    const baseX = gap
    const baseY = gap
    const offsetX = (index % 2) * 50
    const offsetY = Math.floor(index / 2) * 50
    
    return {
      x: baseX + offsetX,
      y: baseY + offsetY
    }
  }
  
  function calculateInitialSize() {
    const isMobile = window.innerWidth < 768
    const isTablet = window.innerWidth < 1200
    
    if (isMobile) {
      return { width: '100%', height: '100%' }
    } else if (isTablet) {
      return { width: '50%', height: '50%' }
    } else {
      return { width: '50%', height: '50%' }
    }
  }
  
  function getNextZIndex() {
    return Math.max(...windows.value.map(w => w.zIndex), 0) + 1
  }
  
  // LocalStorage
  function saveWindowsToStorage() {
    try {
      const windowsData = windows.value.map(w => ({
        id: w.id,
        moduleId: w.moduleId,
        position: w.position,
        size: w.size,
        isMinimized: w.isMinimized,
        isMaximized: w.isMaximized,
        isDetached: w.isDetached,
        zIndex: w.zIndex
      }))
      localStorage.setItem('windowManager_windows', JSON.stringify(windowsData))
      localStorage.setItem('windowManager_activeWindowId', activeWindowId.value)
    } catch (e) {
      console.error('Ошибка сохранения окон:', e)
    }
  }
  
  function loadWindowsFromStorage() {
    try {
      const saved = localStorage.getItem('windowManager_windows')
      const activeId = localStorage.getItem('windowManager_activeWindowId')
      
      if (saved) {
        const windowsData = JSON.parse(saved)
        // Восстанавливаем только структуру, модули загрузятся отдельно
        windows.value = windowsData
        if (activeId) {
          activeWindowId.value = activeId
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки окон:', e)
    }
  }
  
  return {
    // State
    windows,
    maxWindows,
    activeWindowId,
    availableModules,
    // Computed
    activeWindow,
    canOpenNewWindow,
    // Actions
    createWindow,
    closeWindow,
    setActiveWindow,
    updateWindowPosition,
    updateWindowSize,
    toggleMinimize,
    toggleMaximize,
    detachWindow,
    dockWindow,
    loadAvailableModules,
    loadWindowsFromStorage,
    saveWindowsToStorage
  }
})
```

### 1.2 Создание компонента WindowManager

**Файл:** `core/client/src/components/WindowManager/WindowManager.vue`

**Основные функции:**
- Управление сеткой окон (2x2 по умолчанию)
- Обработка drag & drop для изменения позиций
- Управление z-index для активного окна
- Адаптивная сетка для разных размеров экранов

**Структура:**
```
WindowManager/
├── WindowManager.vue          # Главный компонент
├── Window.vue                 # Компонент окна
├── WindowHeader.vue           # Заголовок окна
├── WindowContent.vue          # Контент окна
└── composables/
    ├── useWindowDrag.js       # Логика перетаскивания
    ├── useWindowResize.js     # Логика изменения размера
    └── useWindowGrid.js       # Логика сетки окон
```

### 1.3 Создание компонента ModuleDock

**Файл:** `core/client/src/components/ModuleDock/ModuleDock.vue`

**Основные функции:**
- Горизонтальная прокрутка иконок модулей
- Круглые иконки с анимацией при наведении
- Подсветка активного модуля
- Плавная прокрутка (swipe на мобильных)
- Клик по иконке открывает модуль в активном окне или создает новое

**Структура:**
```
ModuleDock/
├── ModuleDock.vue             # Главный компонент
├── ModuleIcon.vue             # Иконка модуля
└── composables/
    └── useDockScroll.js       # Логика прокрутки
```

---

## Фаза 2: Drag & Drop и Resize окон (Приоритет: ВЫСОКИЙ)

### 2.1 Реализация drag & drop

**Библиотека:** Использовать нативный HTML5 Drag & Drop API или библиотеку из модуля lsp (если доступна)

**Файл:** `core/client/src/components/WindowManager/composables/useWindowDrag.js`

**Функциональность:**
- Перетаскивание окон по сетке
- Визуальная обратная связь при перетаскивании
- Ограничения на перемещение (не выходить за границы контейнера)
- Автоматическое переключение позиций окон при наложении

### 2.2 Реализация resize окон

**Файл:** `core/client/src/components/WindowManager/composables/useWindowResize.js`

**Функциональность:**
- Resize handles по углам и краям окон
- Минимальные и максимальные размеры
- Сохранение пропорций при изменении размера (опционально)
- Debounce для оптимизации производительности

### 2.3 Реализация сетки окон

**Файл:** `core/client/src/components/WindowManager/composables/useWindowGrid.js`

**Функциональность:**
- Автоматическое распределение окон в сетке 2x2
- Адаптивная сетка для разных размеров экранов:
  - Мобильные (< 768px): 1 окно на весь экран
  - Планшеты (768px - 1200px): 2 окна в ряд
  - Десктоп (> 1200px): 4 окна в сетке 2x2
- Перераспределение окон при изменении размера экрана

---

## Фаза 3: Открепление/прикрепление окон (Приоритет: СРЕДНИЙ)

### 3.1 Реализация открепления окон

**Вариант 1:** Использовать overlay с абсолютным позиционированием (рекомендуется)

**Файл:** `core/client/src/components/WindowManager/DetachedWindow.vue`

**Функциональность:**
- Создание overlay для открепленного окна
- Синхронизация состояния между основным окном и открепленным
- Управление позицией и размером открепленного окна
- Возможность закрытия открепленного окна

**Вариант 2:** Использовать `window.open()` для нового окна браузера (менее предпочтительно из-за ограничений браузера)

### 3.2 Реализация прикрепления окон

**Функциональность:**
- Возврат открепленного окна в основную сетку
- Восстановление позиции и размера
- Плавная анимация при прикреплении

---

## Фаза 4: Анимации и полировка UI (Приоритет: СРЕДНИЙ)

### 4.1 Анимации окон

**Анимации для реализации:**
1. **Открытие окна**: fade-in + scale (0.95 → 1.0)
2. **Закрытие окна**: fade-out + scale (1.0 → 0.95)
3. **Открепление**: transform + fade
4. **Прикрепление**: обратная анимация
5. **Переключение модулей**: slide + fade
6. **Hover на иконки dock**: scale(1.1) + shadow

**Файл:** `core/client/src/components/WindowManager/styles/animations.scss`

### 4.2 Стилизация окон

**Файл:** `core/client/src/components/WindowManager/styles/window.scss`

**Стили:**
- Тени для глубины (box-shadow)
- Скругленные углы (border-radius: 8px)
- Градиенты для заголовков окон
- Hover эффекты на кнопках управления
- Плавные переходы для всех интерактивных элементов

### 4.3 Стилизация dock

**Файл:** `core/client/src/components/ModuleDock/styles/dock.scss`

**Стили:**
- Полупрозрачный фон с blur эффектом (backdrop-filter: blur(10px))
- Круглые иконки с отступами
- Анимация масштабирования при наведении
- Плавная прокрутка
- Адаптивная высота для мобильных устройств

---

## Фаза 5: Интеграция с модулями и роутинг (Приоритет: ВЫСОКИЙ)

### 5.1 Интеграция с ModuleManager

**Модификации:**
- Использовать `ModuleManager` для загрузки списка модулей
- Использовать `MenuManager` для получения конфигурации меню
- Использовать `IconManager` для получения иконок модулей
- Использовать `RouteManager` для получения роутов модулей

**Файл:** `core/client/src/components/WindowManager/composables/useModuleIntegration.js`

### 5.2 Роутинг внутри окон

**Проблема:** Каждое окно должно иметь свой `RouterView` для отображения контента модуля

**Решение:**
- Создать отдельный router instance для каждого окна (не рекомендуется)
- Использовать именованные views в основном router (рекомендуется)
- Использовать query параметры для идентификации окна

**Рекомендуемый подход:**
Использовать динамические компоненты с lazy loading:

```vue
<component 
  :is="windowComponent" 
  :window-id="window.id"
  :module-config="window.moduleConfig"
/>
```

Где `windowComponent` загружается динамически на основе `moduleConfig.routeName`.

### 5.3 Сохранение состояния модулей

**Функциональность:**
- Сохранение состояния каждого модуля при переключении окон
- Восстановление состояния при возврате к окну
- Использование `keep-alive` для компонентов модулей

---

## Фаза 6: Обработка событий и горячие клавиши (Приоритет: НИЗКИЙ)

### 6.1 Горячие клавиши

**Реализация:**
- `Ctrl/Cmd + 1-4` - переключение между окнами
- `Ctrl/Cmd + W` - закрыть активное окно
- `Ctrl/Cmd + D` - открепить активное окно
- `Esc` - закрыть модальные окна внутри окон

**Файл:** `core/client/src/components/WindowManager/composables/useKeyboardShortcuts.js`

### 6.2 Обработка событий мыши и тач-событий

**Функциональность:**
- Поддержка touch событий для мобильных устройств
- Обработка swipe жестов для dock
- Обработка pinch-to-zoom для изменения размера окон (опционально)

---

## Фаза 7: Оптимизация и тестирование (Приоритет: ВЫСОКИЙ)

### 7.1 Оптимизация производительности

**Меры:**
- Виртуализация для большого количества модулей в dock (если нужно)
- Lazy loading компонентов модулей
- Debounce для resize событий
- Оптимизация анимаций (использование transform вместо изменения размеров)
- Мемоизация вычислений в computed свойствах

### 7.2 Тестирование

**Области тестирования:**
- Тестирование на разных размерах экранов (мобильные, планшеты, десктоп)
- Тестирование drag & drop функциональности
- Тестирование открепления/прикрепления окон
- Тестирование переключения модулей
- Тестирование сохранения состояния
- Тестирование горячих клавиш
- Тестирование производительности с большим количеством окон

### 7.3 Доступность

**Реализация:**
- ARIA атрибуты для всех интерактивных элементов
- Keyboard navigation
- Screen reader поддержка
- Контрастность цветов (соответствие WCAG)

---

## Интеграция с существующей системой

### Модификация App.vue

**Изменения:**
- Добавить условие для выбора между старым и новым layout
- Создать новый `LayoutWindows.vue` для нового UI
- Сохранить обратную совместимость со старым `LayoutMenu.vue`

### Модификация LayoutMenu.vue

**Опционально:**
- Добавить переключатель между старым и новым UI (для постепенного перехода)
- Или полностью заменить на новый UI

### Создание нового LayoutWindows.vue

**Файл:** `core/client/src/LayoutWindows.vue`

**Структура:**
```vue
<template>
  <div class="windows-layout">
    <WindowManager :windows="windows" />
    <ModuleDock 
      :modules="availableModules"
      :active-module="activeModule"
      @module-select="handleModuleSelect"
    />
  </div>
</template>
```

---

## Структура файлов для реализации

```
core/client/src/
├── stores/
│   └── windowManager.js                    # Pinia store для управления окнами
├── components/
│   ├── WindowManager/
│   │   ├── WindowManager.vue               # Главный компонент управления окнами
│   │   ├── Window.vue                       # Компонент отдельного окна
│   │   ├── WindowHeader.vue                 # Заголовок окна с кнопками управления
│   │   ├── WindowContent.vue                # Контент окна
│   │   ├── DetachedWindow.vue               # Открепленное окно (overlay)
│   │   ├── composables/
│   │   │   ├── useWindowDrag.js            # Логика перетаскивания
│   │   │   ├── useWindowResize.js          # Логика изменения размера
│   │   │   ├── useWindowGrid.js            # Логика сетки окон
│   │   │   ├── useModuleIntegration.js     # Интеграция с модулями
│   │   │   └── useKeyboardShortcuts.js     # Горячие клавиши
│   │   └── styles/
│   │       ├── window.scss                  # Стили окон
│   │       └── animations.scss              # Анимации
│   ├── ModuleDock/
│   │   ├── ModuleDock.vue                   # Нижняя панель с модулями
│   │   ├── ModuleIcon.vue                   # Иконка модуля в dock
│   │   ├── composables/
│   │   │   └── useDockScroll.js            # Логика прокрутки
│   │   └── styles/
│   │       └── dock.scss                    # Стили dock
│   └── WindowControls/
│       ├── DetachButton.vue                 # Кнопка открепления окна
│       ├── DockButton.vue                   # Кнопка прикрепления окна
│       └── WindowActions.vue                # Кнопки управления окном
├── LayoutWindows.vue                         # Новый layout с окнами
└── App.vue                                   # Модификация для выбора layout
```

---

## Порядок реализации (пошаговый)

### Шаг 1: Подготовка инфраструктуры
1. ✅ Создать Pinia store `windowManager.js`
2. ✅ Создать базовую структуру компонентов WindowManager
3. ✅ Создать базовую структуру компонентов ModuleDock

### Шаг 2: Базовая функциональность окон
1. ✅ Реализовать создание/закрытие окон
2. ✅ Реализовать отображение окон в сетке
3. ✅ Реализовать переключение активного окна
4. ✅ Реализовать базовую стилизацию окон

### Шаг 3: Интеграция с модулями
1. ✅ Интегрировать с ModuleManager для загрузки модулей
2. ✅ Реализовать отображение контента модулей в окнах
3. ✅ Реализовать роутинг внутри окон

### Шаг 4: Dock функциональность
1. ✅ Реализовать отображение иконок модулей в dock
2. ✅ Реализовать открытие модулей из dock
3. ✅ Реализовать прокрутку dock
4. ✅ Реализовать подсветку активного модуля

### Шаг 5: Drag & Drop и Resize
1. ✅ Реализовать перетаскивание окон
2. ✅ Реализовать изменение размера окон
3. ✅ Реализовать автоматическое перераспределение в сетке

### Шаг 6: Дополнительные функции
1. ✅ Реализовать открепление/прикрепление окон
2. ✅ Реализовать сворачивание/разворачивание окон
3. ✅ Реализовать сохранение состояния в localStorage

### Шаг 7: Анимации и полировка
1. ✅ Добавить анимации для всех действий
2. ✅ Улучшить стилизацию
3. ✅ Оптимизировать производительность

### Шаг 8: Тестирование и доработка
1. ✅ Тестирование на разных устройствах
2. ✅ Исправление багов
3. ✅ Оптимизация производительности
4. ✅ Улучшение доступности

---

## Важные замечания

### Совместимость
- Сохранить обратную совместимость со старым UI (опционально)
- Обеспечить плавный переход между старым и новым UI

### Производительность
- Использовать lazy loading для компонентов модулей
- Оптимизировать анимации (transform вместо изменения размеров)
- Debounce для resize и drag событий

### Адаптивность
- Мобильные устройства: окна занимают весь экран
- Планшеты: 2 окна в ряд
- Десктоп: 4 окна в сетке 2x2

### Безопасность
- Валидация данных при сохранении в localStorage
- Обработка ошибок при загрузке модулей
- Защита от XSS при отображении контента модулей

---

## Оценка времени реализации

- **Фаза 1**: 3-5 дней
- **Фаза 2**: 3-4 дня
- **Фаза 3**: 2-3 дня
- **Фаза 4**: 2-3 дня
- **Фаза 5**: 2-3 дня
- **Фаза 6**: 1-2 дня
- **Фаза 7**: 2-3 дня

**Итого:** 15-23 дня (3-4.5 недели)

---

## Риски и митигация

### Риск 1: Производительность с большим количеством окон
**Митигация:** Использовать виртуализацию и lazy loading

### Риск 2: Сложность интеграции с существующими модулями
**Митигация:** Использовать существующий ModuleManager, минимальные изменения в модулях

### Риск 3: Проблемы с роутингом в нескольких окнах
**Митигация:** Использовать динамические компоненты вместо отдельных router instances

### Риск 4: Проблемы с откреплением окон
**Митигация:** Использовать overlay вместо window.open() для лучшего контроля

---

## Дополнительные возможности (опционально, после основной реализации)

1. **Split view** - разделение окна на части
2. **Tabbed windows** - вкладки внутри окна
3. **Window presets** - сохраненные конфигурации окон
4. **Мини-карта всех окон** - визуальное представление всех окон
5. **Поиск модулей в dock** - быстрый поиск модулей
6. **Группировка окон** - группировка связанных окон
7. **Темы оформления** - различные темы для окон

