<template>
  <div class="access-denied" :class="{ 'access-denied--bordered': bordered }">
    <div class="card shadow-sm">
      <div class="card-body">
        <h4 class="card-title mb-3">{{ resolvedTitle }}</h4>
        <p class="mb-4">{{ resolvedMessage }}</p>

        <div v-if="showActions" class="d-flex gap-2 flex-wrap">
          <button
            v-if="showBack"
            class="ui-btn ui-btn--secondary"
            type="button"
            @click="goBack"
          >
            {{ resolvedBackText }}
          </button>
          <button
            v-if="showHome"
            class="ui-btn ui-btn--primary"
            type="button"
            @click="goHome"
          >
            {{ resolvedHomeText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const props = defineProps({
  title: {
    type: String,
    default: undefined,
  },
  message: {
    type: String,
    default: undefined,
  },
  showActions: {
    type: Boolean,
    default: true,
  },
  showBack: {
    type: Boolean,
    default: true,
  },
  showHome: {
    type: Boolean,
    default: true,
  },
  backText: {
    type: String,
    default: undefined,
  },
  homeText: {
    type: String,
    default: undefined,
  },
  homeRouteName: {
    type: String,
    default: 'AppHome',
  },
  bordered: {
    type: Boolean,
    default: false,
  },
})

const resolvedTitle = computed(() => props.title ?? t('components.accessDenied.title'))
const resolvedMessage = computed(() => props.message ?? t('components.accessDenied.description'))
const resolvedBackText = computed(() => props.backText ?? t('common.back'))
const resolvedHomeText = computed(() => props.homeText ?? t('components.notFound.goHome'))

const router = useRouter()

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    goHome()
  }
}

const goHome = () => {
  if (props.homeRouteName) {
    router.push({ name: props.homeRouteName })
  }
}
</script>

<style scoped>
.access-denied {
  padding: 24px 0;
  display: flex;
  justify-content: center;
}

.access-denied--bordered {
  border: 1px dashed var(--bs-border-color);
  border-radius: 12px;
  padding: 24px;
}

.card {
  max-width: 720px;
  width: 100%;
}
</style>
