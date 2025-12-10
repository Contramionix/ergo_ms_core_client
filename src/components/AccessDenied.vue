<template>
  <div class="access-denied" :class="{ 'access-denied--bordered': bordered }">
    <div class="card shadow-sm">
      <div class="card-body">
        <h4 class="card-title mb-3">{{ title }}</h4>
        <p class="mb-4">{{ message }}</p>

        <div v-if="showActions" class="d-flex gap-2 flex-wrap">
          <button
            v-if="showBack"
            class="btn btn-secondary"
            type="button"
            @click="goBack"
          >
            {{ backText }}
          </button>
          <button
            v-if="showHome"
            class="btn btn-primary"
            type="button"
            @click="goHome"
          >
            {{ homeText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  title: {
    type: String,
    default: 'Доступ ограничен',
  },
  message: {
    type: String,
    default:
      'Доступ к этой странице ограничен настройками вашей организации. При необходимости обратитесь к администратору.',
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
    default: 'Назад',
  },
  homeText: {
    type: String,
    default: 'На главную',
  },
  homeRouteName: {
    type: String,
    default: 'CRMRemasteredDashboard',
  },
  bordered: {
    type: Boolean,
    default: false,
  },
})

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

