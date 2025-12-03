<template>
  <button :class="buttonClasses" :style="component.styles" @click="handleClick">
    <component v-if="iconComponent" :is="iconComponent" :size="16" class="me-1" />
    {{ component.props?.text || 'Кнопка' }}
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import * as Icons from 'lucide-vue-next'

const props = defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false }
})

const router = useRouter()

const buttonClasses = computed(() => {
  const variant = props.component.props?.variant || 'primary'
  return ['btn', `btn-${variant}`, ...(props.component.classes || [])]
})

const iconComponent = computed(() => {
  const iconName = props.component.props?.icon
  return iconName ? (Icons[iconName] || null) : null
})

function handleClick() {
  if (props.editMode) return
  
  const href = props.component.props?.href
  if (href) {
    if (href.startsWith('http')) {
      window.open(href, '_blank')
    } else {
      router.push(href)
    }
  }
}
</script>


