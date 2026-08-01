<script setup>
import { Grid3x3 } from 'lucide-vue-next'
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDropdown } from '@/composables/useDropdown.js'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import { collectVisibleAppsMenuItems } from '@/integrations/appsMenu.js'
import { logError } from '@/js/utils/logError.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const props = defineProps({
  iconSize: {
    type: Number,
    default: 20,
  },
})

const { t } = useAppI18n()
const emit = defineEmits(['dropdown-toggle', 'visibility-change'])
const router = useRouter()
const { dropdownRef, isOpen, toggleDropdown, closeDropdown } = useDropdown(emit)
const apps = ref([])
const isLoading = ref(true)
const hasLoaded = ref(false)

const isButtonVisible = computed(() => hasLoaded.value && apps.value.length > 0)

const loadApps = async () => {
  try {
    isLoading.value = true
    apps.value = await collectVisibleAppsMenuItems()
  } catch (error) {
    logError('Ошибка загрузки приложений:', error)
    apps.value = []
  } finally {
    isLoading.value = false
    hasLoaded.value = true
  }
}

defineExpose({
  closeDropdown,
})

const goToApp = async (app) => {
  closeDropdown()
  if (typeof app.onClick === 'function') {
    try {
      await app.onClick()
    } catch (error) {
      logError('Ошибка открытия приложения:', error)
    }
    return
  }
  if (app.route) {
    router.push(app.route)
  }
}

onMounted(async () => {
  await loadApps()
})

watch(isOpen, async (open) => {
  if (open) {
    await loadApps()
  }
})

watch(isButtonVisible, (visible) => {
  emit('visibility-change', visible)
  if (!visible) {
    closeDropdown()
  }
}, { immediate: true })
</script>

<template>
  <div v-if="isButtonVisible" ref="dropdownRef" class="apps-menu-wrapper">
    <HoverTooltip :text="t('menu.apps.title')">
      <button
        type="button"
        class="header-btn apps-menu-btn"
        :class="{ 'apps-menu-btn--open': isOpen }"
        :aria-label="t('menu.apps.title')"
        :aria-expanded="isOpen"
        aria-haspopup="true"
        @click.stop="toggleDropdown"
      >
        <Grid3x3 :size="props.iconSize" aria-hidden="true" />
      </button>
    </HoverTooltip>
    <Transition name="dropdown">
      <div v-if="isOpen" class="apps-dropdown-menu">
        <LoadingContentArea :loading="isLoading" min-height="6rem">
          <div v-if="apps.length === 0" class="apps-menu__empty text-muted text-center py-3">
            {{ t('menu.apps.empty') }}
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

.apps-menu-btn {
  border: none;
  background-color: transparent;
  color: inherit;
  // Scoped background перекрывает глобальный .header-btn:hover
  &:hover,
  &--open {
    background-color: var(--color-hover-background);
  }
}

.apps-dropdown-menu {
  @include dropdown-menu-base;
  left: 50%;
  transform: translate(-50%, -8px);
  min-width: min(280px, calc(100vw - 1rem));
  max-width: min(400px, calc(100vw - 1rem));
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

  @media (width < $ui-bp-sm) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
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
