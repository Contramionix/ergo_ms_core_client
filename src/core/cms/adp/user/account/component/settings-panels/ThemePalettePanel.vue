<script setup>
import { computed, onMounted, ref } from 'vue'
import { Check, RotateCcw } from 'lucide-vue-next'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { useToast } from '@/js/utils/toast.js'
import { useUserThemePreference } from '@/core/cms/js/userThemePreference.js'

const toast = useToast()
const {
  selectedThemeId,
  defaultThemeId,
  catalog,
  loading,
  loadThemeCatalog,
  loadUserThemePreference,
  selectUserTheme,
  resetUserThemeToSiteDefault,
} = useUserThemePreference()

const busyId = ref(null)

const usingSiteDefault = computed(() => selectedThemeId.value == null)

const effectiveSelectedId = computed(() => (
  selectedThemeId.value ?? defaultThemeId.value
))

function swatches(theme) {
  const c = theme?.colors || {}
  return [
    c.background || '#f5f5f5',
    c.primaryBackground || '#fff',
    c.primaryText || '#222',
    c.accent || '#888',
  ]
}

async function refresh() {
  await Promise.all([loadThemeCatalog(), loadUserThemePreference()])
}

async function onSelect(theme) {
  if (!theme?.id || busyId.value) {
    return
  }
  busyId.value = theme.id
  try {
    await selectUserTheme(theme.id)
    toast.success(`Палитра «${theme.name}» применена`)
  } catch (e) {
    toast.error(e.message || 'Не удалось выбрать тему')
  } finally {
    busyId.value = null
  }
}

async function onResetSite() {
  if (busyId.value) {
    return
  }
  busyId.value = 'reset'
  try {
    await resetUserThemeToSiteDefault()
    toast.success('Используется стандарт сайта')
  } catch (e) {
    toast.error(e.message || 'Не удалось сбросить палитру')
  } finally {
    busyId.value = null
  }
}

onMounted(() => {
  void refresh()
})
</script>

<template>
  <div class="theme-palette-panel">
    <div class="theme-palette-panel__head">
      <div>
        <h2 class="theme-palette-panel__title">Палитра</h2>
        <p class="theme-palette-panel__hint">
          Выберите тему из каталога, опубликованного администратором.
        </p>
      </div>
      <div class="theme-palette-panel__head-actions">
        <button
          type="button"
          class="btn btn-sm theme-palette-panel__action"
          :disabled="usingSiteDefault || Boolean(busyId)"
          @click="onResetSite"
        >
          <RotateCcw :size="14" aria-hidden="true" />
          Как на сайте
        </button>
      </div>
    </div>

    <LoadingContentArea :loading="loading" min-height="8rem">
      <p
        v-if="!catalog.length"
        class="theme-palette-panel__empty"
      >
        Администратор ещё не открыл темы для выбора.
      </p>
      <div
        v-else
        class="theme-palette-panel__grid"
        role="list"
      >
        <article
          v-for="theme in catalog"
          :key="theme.id"
          class="theme-palette-card"
          :class="{
            'is-selected': effectiveSelectedId === theme.id && !usingSiteDefault,
          }"
          role="listitem"
        >
          <button
            type="button"
            class="theme-palette-card__main"
            :aria-pressed="effectiveSelectedId === theme.id && !usingSiteDefault ? 'true' : 'false'"
            :aria-label="`Выбрать тему ${theme.name}`"
            :disabled="Boolean(busyId)"
            @click="onSelect(theme)"
          >
            <div
              class="theme-palette-card__swatches"
              aria-hidden="true"
            >
              <span
                v-for="(color, idx) in swatches(theme)"
                :key="idx"
                class="theme-palette-card__swatch"
                :style="{ background: color }"
              />
            </div>
            <div class="theme-palette-card__meta">
              <span class="theme-palette-card__name">{{ theme.name }}</span>
              <span
                v-if="theme.id === defaultThemeId"
                class="theme-palette-card__badge"
              >
                Стандарт сайта
              </span>
              <span
                v-if="effectiveSelectedId === theme.id && !usingSiteDefault"
                class="theme-palette-card__check"
                aria-hidden="true"
              >
                <Check :size="12" />
              </span>
            </div>
          </button>
        </article>
      </div>
      <p
        v-if="usingSiteDefault && defaultThemeId"
        class="theme-palette-panel__status"
      >
        Сейчас используется стандарт сайта
        <template v-if="catalog.find((t) => t.id === defaultThemeId)">
          «{{ catalog.find((t) => t.id === defaultThemeId)?.name }}»
        </template>
      </p>
    </LoadingContentArea>
  </div>
</template>

<style scoped lang="scss">
.theme-palette-panel {
  width: 100%;
}

.theme-palette-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;

  @media (width < $ui-bp-sm) {
    flex-direction: column;
  }
}

.theme-palette-panel__title {
  margin: 0 0 0.25rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.theme-palette-panel__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
  max-width: 36rem;
}

.theme-palette-panel__head-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-shrink: 0;
}

.theme-palette-panel__action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 400;
  font-size: 0.8125rem;
  line-height: 1;
  min-height: 30px;
  padding: 0.25rem 0.65rem;
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;

  :deep(svg) {
    display: block;
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: var(--color-secondary-background);
    color: var(--color-primary-text);
  }

  &:disabled {
    opacity: 0.55;
  }
}

.theme-palette-panel__empty,
.theme-palette-panel__status {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
}

.theme-palette-panel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.625rem;
}

.theme-palette-card {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  background: var(--color-primary-background);
  overflow: hidden;

  &.is-selected {
    border-color: var(--color-accent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 35%, transparent);
  }
}

.theme-palette-card__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.625rem;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: inherit;

  &:disabled {
    opacity: 0.65;
    cursor: wait;
  }
}

.theme-palette-card__swatches {
  display: flex;
  gap: 0.25rem;
  height: 1.75rem;
}

.theme-palette-card__swatch {
  flex: 1 1 0;
  border-radius: 0.3rem;
  border: 1px solid var(--color-border);
}

.theme-palette-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.theme-palette-card__name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-primary-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.theme-palette-card__badge {
  font-size: 0.6875rem;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bs-success, #198754) 18%, var(--color-secondary-background));
  color: var(--color-primary-text);
}

.theme-palette-card__check {
  display: inline-flex;
  margin-left: auto;
  width: 1.1rem;
  height: 1.1rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--bs-success, #198754);
  color: #fff;
}
</style>
