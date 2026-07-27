<script setup>
import { computed } from 'vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const props = defineProps({
  href: {
    type: String,
    default: '#main-content',
  },
  label: {
    type: String,
    default: undefined,
  },
})

const resolvedLabel = computed(() => props.label ?? t('components.skipLink.toMain'))

function onSkip(event) {
  event.preventDefault()
  const id = props.href.startsWith('#') ? props.href.slice(1) : 'main-content'
  const target = typeof document !== 'undefined' ? document.getElementById(id) : null
  if (!target) return
  target.focus({ preventScroll: true })
  target.scrollIntoView({ block: 'start', behavior: 'smooth' })
}
</script>

<template>
  <a class="ergo-skip-link" :href="href" @click="onSkip">{{ resolvedLabel }}</a>
</template>
