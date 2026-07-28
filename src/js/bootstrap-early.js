/**
 * Ранняя маска загрузки и режимы UI — до основного бандла (см. index.html, bootstrapMask.js).
 * Сборка: hashed /assets/bootstrap-early-*.js (immutable); dev: middleware /js/bootstrap-early.js.
 */
document.documentElement.classList.add('app-bootstrapping')

;(function applyEarlyTheme() {
  try {
    var root = document.documentElement
    var pref = localStorage.getItem('theme') || 'auto'
    var resolved
    if (pref === 'dark' || pref === 'light') {
      resolved = pref
    } else {
      resolved =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
    }
    root.setAttribute('data-bs-theme', resolved)

    var raw = localStorage.getItem('activeTheme')
    if (!raw) {
      return
    }
    var theme = JSON.parse(raw)
    var colors = theme && theme.colors
    if (!colors) {
      return
    }
    var accent = colors.accent
    var background = colors.background
    if (!accent && !background) {
      return
    }
    var style = document.getElementById('custom-theme-styles')
    if (!style) {
      style = document.createElement('style')
      style.id = 'custom-theme-styles'
      ;(document.head || root).appendChild(style)
    }
    var css = 'html[data-bs-theme="' + resolved + '"]{'
    if (background) {
      css += '--color-background:' + background + '!important;'
    }
    if (accent) {
      css +=
        '--color-accent:' +
        accent +
        '!important;--bs-primary:' +
        accent +
        '!important;'
      var hex = String(accent).trim()
      if (hex.charAt(0) === '#' && hex.length >= 7) {
        var rawHex = hex.slice(1)
        var r = parseInt(rawHex.substring(0, 2), 16)
        var g = parseInt(rawHex.substring(2, 4), 16)
        var b = parseInt(rawHex.substring(4, 6), 16)
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          css += '--bs-primary-rgb:' + r + ',' + g + ',' + b + '!important;'
        }
      }
    }
    css += '}'
    style.textContent = css
  } catch (_e) {
    /* private mode / blocked storage / bad cache */
  }
})()

;(function applyEarlyUiModes() {
  try {
    var motion = localStorage.getItem('ergo_ui_motion') || 'system'
    var images = localStorage.getItem('ergo_ui_images') || 'system'
    var contrast = localStorage.getItem('ergo_ui_contrast') || 'system'
    var a11y = localStorage.getItem('ergo_ui_a11y') || 'default'
    var root = document.documentElement
    var reduce = motion === 'reduce'
    if (motion === 'system' && window.matchMedia) {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } else if (motion === 'full') {
      reduce = false
    }

    var contrastMore = contrast === 'more'
    if (contrast === 'system' && window.matchMedia) {
      try {
        contrastMore =
          window.matchMedia('(prefers-contrast: more)').matches ||
          window.matchMedia('(prefers-contrast: custom)').matches ||
          window.matchMedia('(forced-colors: active)').matches
      } catch (_e2) {
        contrastMore = false
      }
    } else if (contrast === 'normal') {
      contrastMore = false
    }

    root.setAttribute('data-ergo-motion-pref', motion)
    root.setAttribute('data-ergo-motion', reduce ? 'reduce' : 'full')
    root.setAttribute('data-ergo-images-pref', images)
    root.setAttribute('data-ergo-images', images === 'off' ? 'off' : 'on')
    root.setAttribute('data-ergo-contrast-pref', contrast)
    root.setAttribute('data-ergo-contrast', contrastMore ? 'more' : 'normal')
    root.setAttribute('data-ergo-a11y', a11y === 'assist' ? 'assist' : 'default')
    // Синхрон с SHELL_DESKTOP_MIN / $ui-shell-desktop-min (Bootstrap xl = 1200)
    var compact = window.innerWidth < 1200
    root.setAttribute('data-ergo-layout', compact ? 'compact' : 'wide')

    if (images === 'system') {
      var pixel =
        'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      var img = new Image()
      var settled = false
      var finish = function (disabled) {
        if (settled) return
        settled = true
        if (disabled && (localStorage.getItem('ergo_ui_images') || 'system') === 'system') {
          root.setAttribute('data-ergo-images', 'off')
        }
      }
      img.onload = function () {
        finish(!(img.naturalWidth > 0 && img.naturalHeight > 0))
      }
      img.onerror = function () {
        finish(true)
      }
      img.src = pixel
      window.setTimeout(function () {
        if (!settled) {
          finish(!(img.naturalWidth > 0 && img.naturalHeight > 0))
        }
      }, 400)
    }
  } catch (_e) {
    /* private mode / blocked storage */
  }
})()

var loader = document.getElementById('ergo-boot-loader')
if (loader) {
  loader.hidden = false
  loader.setAttribute('aria-busy', 'true')
}
