import { hideBootstrapMask } from '@/js/bootstrapMask.js'
import { tGlobal } from '@/i18n/index.js'

/** Отдельный чанк: не должен попадать в sync/preload граф main на Slow 3G. */
export async function showBootFailure(error) {
  hideBootstrapMask()
  try {
    const { logError } = await import('@/js/utils/logError.js')
    logError(tGlobal('errors.boot.failedLog'), error)
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    const root = document.getElementById('app')
    if (root) {
      root.textContent = tGlobal('errors.boot.failed')
    }
  }
}
