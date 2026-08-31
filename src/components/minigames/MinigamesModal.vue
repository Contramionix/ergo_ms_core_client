<script setup>
import { computed, ref } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { DEFAULT_MINIGAME_ID, findMinigame, MINIGAMES } from './games.js'
import './ensureMinigamesLocales.js'

const props = defineProps({
  show: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])
const { t } = useAppI18n()

const activeId = ref(DEFAULT_MINIGAME_ID)
const activeGame = computed(() => findMinigame(activeId.value))

function selectGame(id) {
  activeId.value = id
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <ModalCenter
    standalone
    :visible="props.show"
    modal-id="minigamesModal"
    :show-title="false"
    :modal-aria-label="t('minigames.label')"
    :show-footer="false"
    :z-index="10020"
    custom-class="minigames-modal-root"
    dialog-class="modal-xl"
    body-class="p-0 minigames-modal-body"
    @close="handleClose"
  >
    <div class="minigames-modal__layout">
      <nav class="minigames-modal__nav" :aria-label="t('minigames.label')">
        <p class="minigames-modal__intro">{{ t('minigames.intro') }}</p>
        <ul class="minigames-modal__list">
          <li v-for="game in MINIGAMES" :key="game.id">
            <button
              type="button"
              class="minigames-modal__item"
              :class="{ 'minigames-modal__item--active': activeId === game.id }"
              :aria-current="activeId === game.id ? 'page' : undefined"
              @click="selectGame(game.id)"
            >
              <span class="minigames-modal__icon" aria-hidden="true">
                <LucideIcon :name="game.icon" :size="18" />
              </span>
              <span class="minigames-modal__label">{{ t(game.labelKey) }}</span>
            </button>
          </li>
        </ul>
      </nav>
      <div class="minigames-modal__panel">
        <KeepAlive>
          <component :is="activeGame.component" :key="activeGame.id" />
        </KeepAlive>
      </div>
    </div>
  </ModalCenter>
</template>

<style scoped lang="scss">
.minigames-modal__layout {
  display: flex;
  align-items: stretch;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;

  @media (width < $ui-bp-md) {
    flex-direction: column;
  }
}

.minigames-modal__nav {
  display: flex;
  flex-direction: column;
  flex: 0 0 260px;
  max-width: 280px;
  min-height: 0;
  padding: 1.25rem 0.75rem 0.75rem;
  overflow: hidden;
  background-color: var(--color-secondary-background);
  border-right: 1px solid var(--color-secondary-background);

  @media (width < $ui-bp-md) {
    flex: 0 0 auto;
    max-width: none;
    width: 100%;
    padding: 0.75rem 0.5rem 0.5rem;
    overflow: visible;
    border-right: none;
    border-bottom: 1px solid var(--color-secondary-background);
  }
}

.minigames-modal__intro {
  margin: 0 0 0.75rem;
  padding: 0 0.5rem;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--color-secondary-text);

  @media (width < $ui-bp-md) {
    display: none;
  }
}

.minigames-modal__list {
  margin: 0;
  padding: 0;
  list-style: none;

  @media (width < $ui-bp-md) {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.25rem;
    overflow-x: auto;
  }
}

.minigames-modal__item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  min-height: 2.75rem;
  margin-bottom: 0.125rem;
  padding: 0.5rem 0.75rem;
  font: inherit;
  font-size: 0.9375rem;
  text-align: left;
  color: var(--color-primary-text);
  background: transparent;
  border: none;
  border-radius: $radius-usual;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background-color: var(--color-hover-background);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--color-accent, #d0322d) 45%, transparent);
    outline-offset: 2px;
  }

  &--active {
    font-weight: 600;
    background-color: var(--color-hover-background);
  }

  @media (width < $ui-bp-md) {
    width: auto;
    min-height: 2.5rem;
    margin-bottom: 0;
    white-space: nowrap;
  }
}

.minigames-modal__icon {
  display: inline-flex;
  flex-shrink: 0;
  opacity: 0.9;
}

.minigames-modal__label {
  flex: 1;
  min-width: 0;
}

.minigames-modal__panel {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: 2.5rem 2.5rem 1.25rem 1.5rem;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-hover-background) transparent;

  @media (width < $ui-bp-md) {
    padding: 1rem;
  }
}
</style>

<style lang="scss">
.minigames-modal-body.modal-body {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 0;
}

.minigames-modal-root.modal .modal-dialog {
  --bs-modal-width: 86rem;
  width: min(96vw, 86rem);
  max-width: calc(100% - 2rem);
  height: min(89dvh, 55rem);
  max-height: 91dvh;
  transition: none !important;

  @media (width < $ui-bp-md) {
    width: calc(100% - 1rem);
    max-width: calc(100% - 1rem);
    height: min(91dvh, 55rem);
    max-height: 93dvh;
    margin: 0.5rem auto;
  }
}

.minigames-modal-root.modal .modal-content {
  height: 100%;
  min-height: 0;
}

.minigames-modal-root.modal {
  transition: none !important;
}
</style>
