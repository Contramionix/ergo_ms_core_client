<script setup>
import LucideIcon from '@/components/LucideIcon.vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { moduleManager } from '@/modules/index.js'
import { useDropdown } from '@/composables/useDropdown.js'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'

const emit = defineEmits(['dropdown-toggle'])
const router = useRouter()
const { dropdownRef, isOpen, toggleDropdown, closeDropdown } = useDropdown(emit)
const apps = ref([])
const isLoading = ref(true)

const loadApps = async () => {
  try {
    isLoading.value = true

    if (!moduleManager.initialized) {
      await moduleManager.initialize()
    }

    apps.value = []
  } catch (error) {
    logError('Ошибка загрузки приложений:', error)
    apps.value = []
  } finally {
    isLoading.value = false
  }
}

defineExpose({
  closeDropdown,
})

const goToApp = (app) => {
  if (app.route) {
    router.push(app.route)
  }
  closeDropdown()
}

onMounted(async () => {
  await loadApps()
})
</script>

<template>
  <div ref="dropdownRef" class="apps-menu-wrapper">
    <HoverTooltip text="Приложения">
      <div @click.stop="toggleDropdown" class="header-btn">
        <LucideIcon name="Grid3x3" :size="20" />
      </div>
    </HoverTooltip>
    <Transition name="dropdown">
      <div v-if="isOpen" class="apps-dropdown-menu">
        <LoadingContentArea :loading="isLoading" min-height="6rem">
          <div v-if="apps.length === 0" class="apps-menu__empty text-muted text-center py-3">
            Нет доступных приложений
          </div>
          <div v-else class="apps-menu__grid">
            <div
              v-for="(app, index) in apps"
              :key="app.name"
              @click="goToApp(app)"
              class="apps-menu__item"
              :title="app.title"
              :style="{ transitionDelay: `${index * 30}ms` }"
            >
              <div class="apps-menu__icon">
                <component v-if="app.icon" :is="app.icon" :size="24" />
                <div v-else class="apps-menu__icon-placeholder">{{ app.title.charAt(0) }}</div>
              </div>
              <div class="apps-menu__title">{{ app.title }}</div>
            </div>
          </div>
        </LoadingContentArea>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.apps-menu-wrapper {
  position: relative;
  display: inline-block;
}

.apps-dropdown-menu {
  @include dropdown-menu-base;
  left: 50%;
  transform: translate(-50%, -8px);
  min-width: 280px;
  max-width: 400px;
  padding: 1rem;
}

.apps-menu__empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.apps-menu__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.apps-menu__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  min-height: 90px;

  &:hover {
    background-color: var(--color-hover-background);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
}

.apps-menu__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 0.5rem;
  color: var(--color-primary-text);
  border: 2px solid var(--color-border, #dee2e6);
  border-radius: 8px;
  background-color: var(--color-secondary-background, #f8f9fa);
  padding: 6px;
}

.apps-menu__icon-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: var(--color-secondary-background);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-primary-text);
}

.apps-menu__title {
  font-size: 0.75rem;
  color: var(--color-primary-text);
  text-align: center;
  word-break: break-word;
  line-height: 1.2;
  font-weight: 500;
}
</style>

<style lang="scss">
.apps-dropdown-menu.dropdown-enter-active,
.apps-dropdown-menu.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.apps-dropdown-menu.dropdown-enter-from {
  opacity: 0;
  transform: translate(-50%, -16px) !important;
}

.apps-dropdown-menu.dropdown-enter-to {
  opacity: 1;
  transform: translate(-50%, -8px) !important;
}

.apps-dropdown-menu.dropdown-leave-from {
  opacity: 1;
  transform: translate(-50%, -8px) !important;
}

.apps-dropdown-menu.dropdown-leave-to {
  opacity: 0;
  transform: translate(-50%, -16px) !important;
}
</style>
