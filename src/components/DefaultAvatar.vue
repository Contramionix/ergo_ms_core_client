<template>
  <div class="default-avatar" :class="{ 'default-avatar--clickable': clickable }" :style="avatarStyle" :title="resolvedTitle">
    <span v-if="initials" class="default-avatar__initials" :style="initialsStyle">
      {{ initials }}
    </span>
    <User v-else :size="iconSize" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { User } from 'lucide-vue-next'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const GRADIENTS = [
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #2bc0b4 0%, #84e8b3 100%)',
  'linear-gradient(135deg, #f4834f 0%, #f6b99d 100%)',
  'linear-gradient(135deg, #9b59b6 0%, #e78fce 100%)',
  'linear-gradient(135deg, #5c6bc0 0%, #7c83fd 100%)',
  'linear-gradient(135deg, #e74c3c 0%, #f6a09e 100%)',
  'linear-gradient(135deg, #f1c40f 0%, #fae37b 100%)',
]

const props = defineProps({
  size: {
    type: Number,
    default: 40
  },
  clickable: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: undefined
  },
  firstName: {
    type: String,
    default: null
  },
  lastName: {
    type: String,
    default: null
  },
  colorKey: {
    type: String,
    default: null
  }
})

const resolvedTitle = computed(() => props.title ?? t('common.user'))

const initials = computed(() => {
  const first = props.firstName?.trim()
  const last = props.lastName?.trim()
  if (first && last) return (last[0] + first[0]).toUpperCase()

  const words = resolvedTitle.value.trim().split(/\s+/).filter(w => w.length > 0)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()

  return null
})

const gradientIndex = computed(() => {
  const key = (props.colorKey || '').trim() || initials.value || resolvedTitle.value.trim()
  let hash = 0
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return hash % GRADIENTS.length
})

const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  background: GRADIENTS[gradientIndex.value],
}))

const initialsStyle = computed(() => ({
  fontSize: `${Math.round(props.size * 0.38)}px`,
}))

const iconSize = computed(() => Math.round(props.size * 0.5))
</script>

<style scoped lang="scss">
.default-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  user-select: none;
  box-sizing: border-box;
  flex-shrink: 0;

  .user-avatar & {
    width: 100% !important;
    height: 100% !important;
  }

  // Анимируем только hover. Фон/размер/инициалы меняются мгновенно, чтобы
  // смена данных пользователя не выглядела как повторная «подгрузка» аватарки.
  &--clickable {
    cursor: pointer;
    transition:
      transform 0.2s ease,
      filter 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      transform: scale(1.05);
      filter: brightness(1.1);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }
  }

  &__initials {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.02em;
    color: #fff;
  }
}
</style>