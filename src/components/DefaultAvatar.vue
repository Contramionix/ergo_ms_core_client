<template>
  <div 
    class="default-avatar"
    :class="{ 'default-avatar--clickable': clickable }"
    :style="avatarStyle"
    :title="title"
  >
    <User :size="iconSize" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { User } from 'lucide-vue-next'

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
    default: 'Пользователь'
  }
})

const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`
}))

const iconSize = computed(() => Math.round(props.size * 0.5))
</script>

<style scoped lang="scss">
.default-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  color: #1976d2;
  transition: all 0.2s ease;
  user-select: none;
  box-sizing: border-box;
  flex-shrink: 0;
  
  // Когда используется внутри UserAvatar, наследуем размеры от родителя
  .user-avatar & {
    width: 100% !important;
    height: 100% !important;
  }
  
  &--clickable {
    cursor: pointer;
    
    &:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 16px rgba($color: #1976d2, $alpha: 0.15);
      background: linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%);
    }
  }
}
</style>
