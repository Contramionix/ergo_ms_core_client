<script setup>
import { computed } from 'vue'

const props = defineProps({
  module: {
    type: Object,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

function handleClick() {
  emit('click', props.module)
}
</script>

<template>
  <div
    class="module-icon"
    :class="{ 'module-icon--active': isActive }"
    @click="handleClick"
    :title="module.name"
    role="button"
    tabindex="0"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div class="module-icon__container">
      <component
        v-if="module.icon"
        :is="module.icon"
        :size="24"
        class="module-icon__icon"
      />
      <div
        v-else
        class="module-icon__placeholder"
      >
        {{ module.name?.charAt(0)?.toUpperCase() || '?' }}
      </div>
    </div>
    <div
      v-if="isActive"
      class="module-icon__indicator"
    />
  </div>
</template>

<style scoped lang="scss">
@import './styles/dock.scss';
</style>

