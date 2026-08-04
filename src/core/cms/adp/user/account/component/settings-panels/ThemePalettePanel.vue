<script setup>
import { computed, onMounted, ref } from 'vue'
import { Check, RotateCcw } from 'lucide-vue-next'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { useThemeMode } from '@/composables/useThemeMode.js'
import { useUserThemePreference } from '@/core/cms/js/userThemePreference.js'
import { useToast } from '@/js/utils/toast.js'
import { resolveThemeDisplayName } from '@/core/cms/adp/settings/themeEditor/resolveSystemThemeLabel.js'

const { t, tm } = useAppI18n()

function themeLabel(pair) {
  return resolveThemeDisplayName(pair?.name, tm)
}
const toast = useToast()
const {
  selectedThemeId,
  selectedThemePair,
  defaultThemePair,
  catalog,
  loading,
  loadThemeCatalog,
  loadUserThemePreference,
  selectUserTheme,
  resetUserThemeToSiteDefault,
} = useUserThemePreference()

const { resolvedMode } = useThemeMode()

const busyId = ref(null)

const usingSiteDefault = computed(() => selectedThemeId.value == null)

const effectiveSelectedPair = computed(() => (
  selectedThemePair.value ?? defaultThemePair.value
))

/** Вариант пары под текущий режим (light/dark); одиночная тема — какой есть. */
function resolveVariant(pair) {
  return pair?.variants?.[resolvedMode.value] || pair?.variants?.light || pair?.variants?.dark || null
}

function swatches(pair) {
  const c = resolveVariant(pair)?.colors || {}
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

async function onSelect(pair) {
  const variant = resolveVariant(pair)
  if (!variant?.id || busyId.value) {
    return
  }
  busyId.value = pair.pair_key
  try {
    await selectUserTheme(variant.id)
  } catch (e) {
    toast.error(e.message || t('settings.themes.selectFailed'))
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
  } catch (e) {
    toast.error(e.message || t('settings.themes.resetFailed'))
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
        <h2 class="theme-palette-panel__title">{{ t('settings.themes.palette') }}</h2>
        <p class="theme-palette-panel__hint">
          {{ t('settings.themes.paletteHint') }}
        </p>
      </div>
      <div class="theme-palette-panel__head-actions">
        <button
          type="button"
          class="btn btn-sm theme-palette-panel__action d-inline-flex align-items-center"
          :disabled="usingSiteDefault || Boolean(busyId)"
          @click="onResetSite"
        >
          <RotateCcw :size="14" class="theme-palette-panel__action-icon" aria-hidden="true" />
          <span>{{ t('settings.themes.siteDefaultBtn') }}</span>
        </button>
      </div>
    </div>

    <LoadingContentArea :loading="loading" min-height="8rem">
      <p
        v-if="!catalog.length"
        class="theme-palette-panel__empty"
      >
        {{ t('settings.themes.emptyCatalog') }}
      </p>
      <div
        v-else
        class="theme-palette-panel__grid"
        role="list"
      >
        <article
          v-for="pair in catalog"
          :key="pair.pair_key"
          class="theme-palette-card"
          :class="{
            'is-selected': effectiveSelectedPair === pair.pair_key && !usingSiteDefault,
          }"
          role="listitem"
        >
          <button
            type="button"
            class="theme-palette-card__main"
            :aria-pressed="effectiveSelectedPair === pair.pair_key && !usingSiteDefault ? 'true' : 'false'"
            :aria-label="t('settings.themes.selectTheme', { name: themeLabel(pair) })"
            :disabled="Boolean(busyId)"
            @click="onSelect(pair)"
          >
            <div
              class="theme-palette-card__swatches"
              aria-hidden="true"
            >
              <span
                v-for="(color, idx) in swatches(pair)"
                :key="idx"
                class="theme-palette-card__swatch"
                :style="{ background: color }"
              />
            </div>
            <div class="theme-palette-card__meta">
              <span class="theme-palette-card__name">{{ themeLabel(pair) }}</span>
              <span
                v-if="pair.is_default"
                class="theme-palette-card__badge"
              >
                {{ t('settings.themes.badgeSiteDefault') }}
              </span>
              <span
                v-if="effectiveSelectedPair === pair.pair_key && !usingSiteDefault"
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
        v-if="usingSiteDefault && defaultThemePair"
        class="theme-palette-panel__status"
      >
        {{ t('settings.themes.siteDefault') }}
        <template v-if="catalog.find((pair) => pair.pair_key === defaultThemePair)">
          «{{ themeLabel(catalog.find((pair) => pair.pair_key === defaultThemePair)) }}»
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
  justify-content: center;
  gap: 0.35rem;
  font-weight: 400;
  font-size: 0.8125rem;
  line-height: 1.2;
  min-height: 30px;
  padding: 0.25rem 0.5rem;
  --bs-btn-font-size: 0.8125rem;
  --bs-btn-line-height: 1.2;
  --bs-btn-padding-y: 0.25rem;
  --bs-btn-padding-x: 0.5rem;
  text-align: center;
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;

  &:hover:not(:disabled) {
    background: var(--color-secondary-background);
    color: var(--color-primary-text);
  }

  &:disabled {
    opacity: 0.55;
  }
}

.theme-palette-panel__action-icon {
  display: block;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
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
