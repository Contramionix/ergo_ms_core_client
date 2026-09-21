<script setup>
import { computed } from 'vue'

const props = defineProps({
  count: { type: Number, default: 0 },
  title: { type: String, default: '' },
})

const label = computed(() => {
  const count = Math.max(0, Number(props.count) || 0)
  if (count <= 0) {
    return ''
  }
  return count > 99 ? '99+' : String(count)
})
</script>

<template>
  <button v-if="label" type="button" class="menu-trailing-badge" :aria-label="title || label">
    {{ label }}
  </button>
</template>

<style lang="scss" scoped>
.menu-trailing-badge {
  flex: 0 0 auto;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border: 0;
  border-radius: 9px;
  background: var(--ui-accent);
  color: var(--ui-accent-text);
  font-size: 10px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  cursor: pointer;
}
</style>