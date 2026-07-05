<script setup>
import { computed, inject } from 'vue'
import { MENU_PEEK_STATE_KEY } from './composables/useMenuPeekState.js'

const props = defineProps({
  text: {
    type: String,
    default: '',
  },
  visible: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    default: '',
  },
})

const peekState = inject(MENU_PEEK_STATE_KEY, null)

// Peek-reveal только при hover на свёрнутое меню (не при закреплении кнопкой).
const usePeekReveal = computed(() => {
  const state = peekState?.value
  if (!state?.collapsed) {
    return false
  }
  return state.peekActive === true
})
const labelTitle = computed(() => props.title || props.text)
</script>

<template>
  <span
    v-if="usePeekReveal"
    class="menu-peek-label"
    :title="labelTitle"
  >
    {{ text }}
  </span>
  <span
    v-else
    class="text-smooth-animation"
    :class="{ hidden: !visible }"
    :title="labelTitle"
  >
    {{ text }}
  </span>
</template>

<style scoped lang="scss">
.menu-peek-label {
  display: inline;
  min-width: 0;
  white-space: nowrap;
}
</style>
