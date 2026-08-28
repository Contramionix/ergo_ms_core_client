<script setup>
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  getToastSettingsSnapshot,
  getToastTimeouts,
  subscribeToastSettingsChange,
} from '@/js/utils/toastSettings.js'

const snapshot = ref(getToastSettingsSnapshot())

let unsubscribe = () => {}
onMounted(() => {
  unsubscribe = subscribeToastSettingsChange(() => {
    snapshot.value = getToastSettingsSnapshot()
  })
})
onUnmounted(() => {
  unsubscribe()
})

function sonnerDuration(timeout) {
  if (timeout === false || timeout === 0) {
    return Number.POSITIVE_INFINITY
  }
  return timeout
}

function defaultSwipeDirections(position) {
  const [y, x] = String(position || '').split('-')
  const directions = []
  if (y) directions.push(y)
  if (x) directions.push(x)
  return directions
}

const position = computed(() => snapshot.value.position)
const maxToasts = computed(() => snapshot.value.maxToasts)
const duration = computed(() => sonnerDuration(
  getToastTimeouts(snapshot.value.durationPreset).default,
))
const swipeDirections = computed(() => (
  snapshot.value.draggable ? defaultSwipeDirections(snapshot.value.position) : []
))
</script>

<template>
  <Toaster
    :position="position"
    :visible-toasts="maxToasts"
    :duration="duration"
    :close-button="false"
    expand
    :gap="8"
    :swipe-directions="swipeDirections"
    class="ergo-toast-container"
    :toast-options="{ unstyled: true, closeButton: false }"
  />
</template>
