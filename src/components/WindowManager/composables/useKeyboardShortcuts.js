import { onMounted, onBeforeUnmount } from 'vue'

/**
 * Composable для обработки горячих клавиш управления окнами
 */
export function useKeyboardShortcuts(windowManagerStore) {
  /**
   * Обработчик нажатий клавиш
   */
  function handleKeyDown(e) {
    // Игнорируем, если пользователь вводит текст в input, textarea, или contenteditable
    const target = e.target
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('[contenteditable="true"]')
    ) {
      // Разрешаем только Esc для закрытия модальных окон
      if (e.key === 'Escape') {
        handleEscape(e)
      }
      return
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey

    // Ctrl/Cmd + 1-4 - переключение между окнами
    if (ctrlOrCmd && !e.shiftKey && !e.altKey) {
      const windowIndex = parseInt(e.key) - 1
      if (windowIndex >= 0 && windowIndex <= 3) {
        e.preventDefault()
        switchToWindow(windowIndex)
        return
      }
    }

    // Ctrl/Cmd + W - закрыть активное окно
    if (ctrlOrCmd && e.key === 'w' && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      closeActiveWindow()
      return
    }

    // Ctrl/Cmd + D - открепить активное окно
    if (ctrlOrCmd && e.key === 'd' && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      detachActiveWindow()
      return
    }

    // Esc - закрыть модальные окна или распределить окна по сетке
    if (e.key === 'Escape' && !ctrlOrCmd && !e.shiftKey && !e.altKey) {
      handleEscape(e)
      return
    }

    // Ctrl/Cmd + G - распределить окна по сетке
    if (ctrlOrCmd && e.key === 'g' && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      arrangeWindows()
      return
    }
  }

  /**
   * Переключение на окно по индексу (1-4)
   */
  function switchToWindow(index) {
    const windows = windowManagerStore.windows
    if (windows.length === 0) return

    // Если индекс больше количества окон, используем последнее окно
    const targetIndex = Math.min(index, windows.length - 1)
    const targetWindow = windows[targetIndex]

    if (targetWindow) {
      windowManagerStore.setActiveWindow(targetWindow.id)
    }
  }

  /**
   * Закрытие активного окна
   */
  function closeActiveWindow() {
    const activeWindow = windowManagerStore.activeWindow
    if (activeWindow) {
      windowManagerStore.closeWindow(activeWindow.id)
    }
  }

  /**
   * Открепление активного окна
   */
  function detachActiveWindow() {
    const activeWindow = windowManagerStore.activeWindow
    if (activeWindow && !activeWindow.isDetached) {
      windowManagerStore.detachWindow(activeWindow.id)
    } else if (activeWindow && activeWindow.isDetached) {
      // Если уже откреплено, прикрепляем обратно
      windowManagerStore.dockWindow(activeWindow.id)
    }
  }

  /**
   * Распределение окон по сетке
   */
  function arrangeWindows() {
    if (windowManagerStore.windows.length > 0) {
      windowManagerStore.arrangeWindowsInGrid()
    }
  }

  /**
   * Обработка клавиши Esc
   */
  function handleEscape(e) {
    // Закрываем модальные окна, если они открыты
    // Проверяем наличие модальных окон через событие
    const modalElements = document.querySelectorAll('.modal.show, .modal[style*="display"]')
    if (modalElements.length > 0) {
      // Если есть открытые модальные окна, закрываем их
      // Это будет обработано стандартными обработчиками Bootstrap
      return
    }

    // Если нет модальных окон, можно добавить другую логику
    // Например, сброс выделения или возврат к предыдущему состоянию
  }

  // Устанавливаем обработчик при монтировании
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  // Удаляем обработчик при размонтировании
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    // Можно экспортировать функции для ручного вызова, если нужно
    switchToWindow,
    closeActiveWindow,
    detachActiveWindow,
    arrangeWindows
  }
}


