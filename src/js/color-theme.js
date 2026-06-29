/**
 * СИСТЕМА УПРАВЛЕНИЯ ЦВЕТОВЫМИ ТЕМАМИ
 * 
 * Данный модуль реализует переключение между светлой, темной и автоматической
 * цветовыми темами приложения на основе Bootstrap темизации.
 * 
 * Интегрирован с theme-manager.js для поддержки кастомных тем.
 */

import {
  loadThemeFromLocalStorage,
  applyTheme,
  resolveThemeMode,
  readThemePreference,
} from './theme-manager.js'

;(() => {
  'use strict'

  const getStoredTheme = () => localStorage.getItem('theme')
  const setStoredTheme = (theme) => localStorage.setItem('theme', theme)

  const getPreferredTheme = () => readThemePreference()

  /**
   * Устанавливает тему с учетом кастомных настроек
   */
  const setTheme = (themeMode) => {
    // Сначала проверяем, есть ли активная кастомная тема
    const savedTheme = loadThemeFromLocalStorage()
    
    // Если есть сохранённая тема - используем её
    if (savedTheme && savedTheme.colors && Object.keys(savedTheme.colors).length > 0) {
      applyTheme(savedTheme, false) // Не перезаписываем localStorage
      return
    }
    
    // Иначе используем стандартную логику
    const actualMode = resolveThemeMode(themeMode)
    
    // Устанавливаем атрибут Bootstrap
    document.documentElement.setAttribute('data-bs-theme', actualMode)
    
    // Удаляем кастомные стили - SCSS применится автоматически
    const styleElement = document.getElementById('custom-theme-styles')
    if (styleElement) {
      styleElement.textContent = ''
    }
  }

  setTheme(getPreferredTheme())

  const showActiveTheme = (theme, focus = false) => {
    const themeSwitcher = document.querySelector('#bd-theme')

    if (!themeSwitcher) {
      return
    }

    const themeSwitcherText = document.querySelector('#bd-theme-text')
    const activeThemeIcon = document.querySelector('.theme-icon-active use')
    const btnToActive = document.querySelector(`[data-bs-theme-value="${theme}"]`)
    
    if (!btnToActive) {
      return
    }
    
    const svgOfActiveBtn = btnToActive.querySelector('svg use')?.getAttribute('href')

    document.querySelectorAll('[data-bs-theme-value]').forEach((element) => {
      element.classList.remove('active')
      element.setAttribute('aria-pressed', 'false')
    })

    btnToActive.classList.add('active')
    btnToActive.setAttribute('aria-pressed', 'true')
    
    if (activeThemeIcon && svgOfActiveBtn) {
      activeThemeIcon.setAttribute('href', svgOfActiveBtn)
    }
    
    if (themeSwitcherText) {
      const themeSwitcherLabel = `${themeSwitcherText.textContent} (${btnToActive.dataset.bsThemeValue})`
      themeSwitcher.setAttribute('aria-label', themeSwitcherLabel)
    }

    if (focus) {
      themeSwitcher.focus()
    }
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const storedTheme = getStoredTheme()
    if (storedTheme !== 'light' && storedTheme !== 'dark') {
      setTheme(getPreferredTheme())
    }
  })

  window.addEventListener('DOMContentLoaded', () => {
    showActiveTheme(getPreferredTheme())

    document.querySelectorAll('[data-bs-theme-value]').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const theme = toggle.getAttribute('data-bs-theme-value')
        setStoredTheme(theme)
        setTheme(theme)
        showActiveTheme(theme, true)
      })
    })
  })
})()
