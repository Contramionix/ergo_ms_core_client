/**
 * Ранняя маска загрузки и режимы UI — до основного бандла (см. index.html, bootstrapMask.js).
 * Сборка: hashed /assets/bootstrap-early-*.js (immutable); dev: middleware /js/bootstrap-early.js.
 */
document.documentElement.classList.add('app-bootstrapping')

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
      } catch (e2) {
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
  } catch (e) {
    /* private mode / blocked storage */
  }
})()

var loader = document.getElementById('ergo-boot-loader')
if (loader) {
  loader.hidden = false
  loader.setAttribute('aria-busy', 'true')
}
