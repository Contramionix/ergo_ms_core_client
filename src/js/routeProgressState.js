import { reactive } from 'vue'

export const routeProgressState = reactive({
  active: false,
  phase: 'idle',
})

let finishTimer = null

export function startRouteProgress() {
  if (finishTimer) {
    clearTimeout(finishTimer)
    finishTimer = null
  }
  routeProgressState.active = true
  routeProgressState.phase = 'start'
}

export function finishRouteProgress() {
  if (!routeProgressState.active) {
    return
  }
  routeProgressState.phase = 'finish'
  finishTimer = setTimeout(() => {
    routeProgressState.active = false
    routeProgressState.phase = 'idle'
    finishTimer = null
  }, 320)
}
