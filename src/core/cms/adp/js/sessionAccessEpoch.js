import { ref } from 'vue'

/** Счётчик смены overlay прав: KeepAlive-страницы должны пересоздаться. */
export const sessionAccessEpoch = ref(0)

export function bumpSessionAccessEpoch() {
  sessionAccessEpoch.value += 1
}
