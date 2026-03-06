<template>
  <div class="msng-sys">
    <component :is="iconComponent" v-if="iconComponent" :size="14" class="msng-sys__icon" />
    <span class="msng-sys__text">{{ displayText }}</span>
    <span class="msng-sys__time">{{ formattedTime }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Plus,
  RefreshCw,
  ArrowRightLeft,
  Upload,
  CheckCircle2,
  Info,
} from 'lucide-vue-next'

const props = defineProps({
  message: { type: Object, required: true },
})

const ICON_MAP = {
  created: Plus,
  updated: RefreshCw,
  status_change: ArrowRightLeft,
  upload: Upload,
  completed: CheckCircle2,
}

const iconComponent = computed(
  () => ICON_MAP[props.message.activity_type] || Info,
)

const displayText = computed(
  () => props.message.description || props.message.text || '',
)

const formattedTime = computed(() => {
  if (!props.message.created_at) return ''
  const d = new Date(props.message.created_at)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
})
</script>

<style lang="scss" scoped>
.msng-sys {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  margin: 0.35rem auto;
  max-width: 85%;
  background: var(--bs-tertiary-bg, #e9ecef);
  border-radius: 1rem;
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
  text-align: center;

  &__icon {
    flex-shrink: 0;
    opacity: 0.7;
  }

  &__text {
    line-height: 1.3;
  }

  &__time {
    flex-shrink: 0;
    opacity: 0.6;
    font-size: 0.65rem;
  }
}
</style>
