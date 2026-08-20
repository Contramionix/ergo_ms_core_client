<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { computed } from 'vue'
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Moon,
  Pencil,
  RotateCcw,
  Sun,
  Trash2,
} from '@lucide/vue'
import {
  resolveThemeDisplayDescription,
  resolveThemeDisplayName,
} from './resolveSystemThemeLabel.js'

const { t, tm } = useAppI18n()

const props = defineProps({
  theme: {
    type: Object,
    required: true,
  },
  presentation: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  resetting: {
    type: Boolean,
    default: false,
  },
  isModuleScope: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'select',
  'edit',
  'activate',
  'toggle-available',
  'reset',
  'duplicate',
  'delete',
  'discard-draft',
  'discard-pair-draft',
])

const previewStyle = computed(() => {
  const p = props.presentation.preview || {}
  return {
    '--picker-bg': p.background,
    '--picker-header': p.header,
    '--picker-card': p.card,
    '--picker-text': p.text,
    '--picker-muted': p.muted,
    '--picker-accent': p.accent,
    '--picker-border': p.border,
    '--theme-card-accent': props.presentation.accent || p.accent || 'var(--color-accent)',
  }
})

const isDark = computed(() => props.theme.base_theme === 'dark')

const displayName = computed(() => resolveThemeDisplayName(props.theme.name, tm))

const displayDescription = computed(() => (
  resolveThemeDisplayDescription(props.theme.name, props.theme.description || '', tm)
))

function onCardKeydown(event) {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    emit('edit', props.theme)
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('select', props.theme)
  }
}
</script>

<template>
  <article
    class="theme-picker-card"
    :class="{
      'is-selected': selected,
      'is-active-theme': isModuleScope ? theme.is_active : theme.is_default,
      'is-draft': theme.is_draft || theme.is_draft_pair,
    }"
    :style="previewStyle"
    tabindex="0"
    :aria-current="selected ? 'true' : undefined"
    :aria-label="t('settings.themes.themeAria', { name: displayName })"
    @click="emit('select', theme)"
    @dblclick="emit('edit', theme)"
    @keydown="onCardKeydown"
  >
    <div class="theme-picker-card__preview" aria-hidden="true">
      <div class="theme-picker-card__chrome">
        <span class="theme-picker-card__dot" />
        <span class="theme-picker-card__dot" />
        <span class="theme-picker-card__dot" />
      </div>
      <div class="theme-picker-card__header" />
      <div class="theme-picker-card__body">
        <div class="theme-picker-card__panel">
          <span class="theme-picker-card__line theme-picker-card__line--wide" />
          <span class="theme-picker-card__line" />
          <span class="theme-picker-card__cta" />
        </div>
      </div>
    </div>

    <div class="theme-picker-card__meta">
      <div class="theme-picker-card__title-row">
        <template v-if="theme.is_pair">
          <Sun :size="14" class="theme-picker-card__icon" aria-hidden="true" />
          <Moon :size="14" class="theme-picker-card__icon" aria-hidden="true" />
        </template>
        <component
          :is="isDark ? Moon : Sun"
          v-else
          :size="14"
          class="theme-picker-card__icon"
          aria-hidden="true"
        />
        <h3 class="theme-picker-card__name">{{ displayName }}</h3>
        <span
          v-if="isModuleScope ? theme.is_active : theme.is_default"
          class="theme-picker-card__check"
          :title="isModuleScope ? t('settings.themes.badgeActive') : t('settings.themes.badgeSiteDefault')"
          aria-hidden="true"
        >
          <Check :size="12" />
        </span>
      </div>

      <div class="theme-picker-card__badges">
        <span v-if="theme.is_draft" class="theme-picker-card__badge theme-picker-card__badge--draft">
          {{ t('settings.themes.badgeDraft') }}
        </span>
        <span
          v-if="theme.is_draft_pair"
          class="theme-picker-card__badge theme-picker-card__badge--draft"
        >
          {{ t('settings.themes.badgeDraftPair') }}
        </span>
        <span
          v-if="presentation.isAccessibility"
          class="theme-picker-card__badge theme-picker-card__badge--a11y"
        >
          {{ t('settings.themes.badgeA11y') }}
        </span>
        <span
          v-if="theme.is_system"
          class="theme-picker-card__badge theme-picker-card__badge--muted"
        >
          {{ t('settings.themes.badgeSystem') }}
        </span>
        <span
          v-if="!isModuleScope && theme.is_default"
          class="theme-picker-card__badge theme-picker-card__badge--active"
        >
          {{ t('settings.themes.badgeStandard') }}
        </span>
        <span
          v-else-if="theme.is_active"
          class="theme-picker-card__badge theme-picker-card__badge--active"
        >
          {{ t('settings.themes.badgeActive') }}
        </span>
        <span
          v-if="!isModuleScope && theme.is_available"
          class="theme-picker-card__badge theme-picker-card__badge--catalog"
        >
          {{ t('settings.themes.badgeInCatalog') }}
        </span>
      </div>

      <p class="theme-picker-card__desc">
        {{ displayDescription || t('settings.themes.noDescription') }}
      </p>

      <div class="theme-picker-card__swatches" aria-hidden="true">
        <template v-if="presentation.dual">
          <div class="theme-picker-card__swatch-row">
            <Sun :size="11" class="theme-picker-card__swatch-mode" />
            <span
              v-for="(c, i) in presentation.light"
              :key="`l-${i}`"
              class="theme-picker-card__swatch"
              :class="{ 'is-accent': i === presentation.light.length - 1 }"
              :style="{ background: c }"
            />
          </div>
          <div class="theme-picker-card__swatch-row">
            <Moon :size="11" class="theme-picker-card__swatch-mode" />
            <span
              v-for="(c, i) in presentation.dark"
              :key="`d-${i}`"
              class="theme-picker-card__swatch"
              :class="{ 'is-accent': i === presentation.dark.length - 1 }"
              :style="{ background: c }"
            />
          </div>
        </template>
        <div v-else class="theme-picker-card__swatch-row">
          <span
            v-for="(c, i) in presentation.colors"
            :key="i"
            class="theme-picker-card__swatch"
            :class="{ 'is-accent': i === presentation.colors.length - 2 }"
            :style="{ background: c }"
          />
        </div>
      </div>
    </div>

    <div class="theme-picker-card__actions" @click.stop>
      <button
        v-if="isModuleScope && !theme.is_active && !theme.is_draft && !theme.is_draft_pair"
        type="button"
        class="ui-btn ui-btn--secondary theme-picker-card__apply"
        @click="emit('activate', theme)"
      >
        <span>{{ t('settings.themes.apply') }}</span>
      </button>
      <button
        v-else-if="!isModuleScope && !theme.is_default && !theme.is_draft && !theme.is_draft_pair"
        type="button"
        class="ui-btn ui-btn--secondary theme-picker-card__apply"
        @click="emit('activate', theme)"
      >
        <span>{{ t('settings.themes.siteDefaultShort') }}</span>
      </button>
      <div class="actions-cell theme-picker-card__icon-actions">
        <button
          type="button"
          class="btn-action"
          :title="t('settings.themes.editTheme')"
          :aria-label="t('settings.themes.editThemeAria', { name: displayName })"
          @click="emit('edit', theme)"
        >
          <Pencil :size="15" />
        </button>
        <button
          v-if="!isModuleScope && !theme.is_draft && !theme.is_draft_pair"
          type="button"
          class="btn-action"
          :title="theme.is_available ? t('settings.themes.removeFromQuick') : t('settings.themes.addToQuick')"
          :aria-label="theme.is_available ? t('settings.themes.removeFromQuick') : t('settings.themes.addToQuick')"
          :disabled="theme.is_default && theme.is_available"
          @click="emit('toggle-available', theme)"
        >
          <component :is="theme.is_available ? EyeOff : Eye" :size="15" />
        </button>
        <button
          v-if="theme.is_system && !theme.is_draft_pair"
          type="button"
          class="btn-action"
          :title="t('settings.themes.resetToDefaults')"
          :aria-label="t('settings.themes.resetToDefaults')"
          :disabled="resetting"
          @click="emit('reset', theme)"
        >
          <RotateCcw :size="15" />
        </button>
        <button
          v-if="!theme.is_draft && !isModuleScope"
          type="button"
          class="btn-action"
          :title="t('settings.themes.duplicate')"
          :aria-label="t('settings.themes.duplicateThemeAria')"
          @click="emit('duplicate', theme)"
        >
          <Copy :size="15" />
        </button>
        <button
          v-if="theme.is_draft_pair"
          type="button"
          class="btn-action btn-action--delete"
          :title="t('settings.themes.deleteDraftPair')"
          :aria-label="t('settings.themes.deleteDraftPair')"
          @click="emit('discard-pair-draft')"
        >
          <Trash2 :size="15" />
        </button>
        <button
          v-if="theme.is_draft"
          type="button"
          class="btn-action btn-action--delete"
          :title="t('settings.themes.deleteDraft')"
          :aria-label="t('settings.themes.deleteDraft')"
          @click="emit('discard-draft')"
        >
          <Trash2 :size="15" />
        </button>
        <button
          v-if="!theme.is_system && !theme.is_draft && !theme.is_pair"
          type="button"
          class="btn-action btn-action--delete"
          :title="t('common.delete')"
          :aria-label="t('settings.themes.deleteThemeAria')"
          @click="emit('delete', theme)"
        >
          <Trash2 :size="15" />
        </button>
      </div>
    </div>
  </article>
</template>

<style lang="scss">
@import '@/core/cms/adp/admin/admin-page.scss';
</style>

<style lang="scss" scoped>
.theme-picker-card {
  --picker-motion: 200ms;
  --picker-ease: cubic-bezier(0.22, 1, 0.36, 1);

  content-visibility: auto;
  contain-intrinsic-size: auto 18rem;

  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: var(--color-primary-background);
  cursor: pointer;
  outline: none;
  transition: border-color var(--picker-motion) var(--picker-ease);

  &:hover,
  &:focus-within {
    border-color: color-mix(in srgb, var(--theme-card-accent, var(--color-accent)) 45%, var(--color-border));
  }

  &:focus-visible {
    border-color: var(--theme-card-accent, var(--color-accent));
    outline: 2px solid color-mix(in srgb, var(--theme-card-accent, var(--color-accent)) 45%, transparent);
    outline-offset: 2px;
  }

  &.is-selected {
    border-color: var(--theme-card-accent, var(--color-accent));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--theme-card-accent, var(--color-accent)) 40%, transparent);
  }

  &.is-active-theme:not(.is-selected) {
    border-color: color-mix(in srgb, var(--bs-success, #198754) 55%, var(--color-border));
  }

  &:hover :deep(.btn-action),
  &:focus-within :deep(.btn-action) {
    color: var(--color-primary-text);
  }
}

.theme-picker-card__preview {
  position: relative;
  overflow: hidden;
  border-radius: 0.5rem;
  border: 1px solid var(--picker-border);
  background: var(--picker-bg);
  min-height: 5.5rem;
}

.theme-picker-card__chrome {
  display: flex;
  gap: 0.25rem;
  padding: 0.35rem 0.5rem;
  background: color-mix(in srgb, var(--picker-header) 88%, var(--picker-border));
  border-bottom: 1px solid var(--picker-border);
}

.theme-picker-card__dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--picker-muted) 55%, transparent);
}

.theme-picker-card__header {
  height: 0.85rem;
  background: var(--picker-header);
  border-bottom: 1px solid var(--picker-border);
}

.theme-picker-card__body {
  padding: 0.55rem;
}

.theme-picker-card__panel {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem;
  border-radius: 0.35rem;
  background: var(--picker-card);
  border: 1px solid var(--picker-border);
}

.theme-picker-card__line {
  display: block;
  height: 0.35rem;
  width: 62%;
  border-radius: 999px;
  background: color-mix(in srgb, var(--picker-text) 22%, transparent);

  &--wide {
    width: 88%;
  }
}

.theme-picker-card__cta {
  display: block;
  margin-top: 0.15rem;
  width: 2.75rem;
  height: 0.7rem;
  border-radius: 0.25rem;
  background: var(--picker-accent);
}

.theme-picker-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

.theme-picker-card__title-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.theme-picker-card__icon {
  flex-shrink: 0;
  color: var(--ui-text);
}

.theme-picker-card__name {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-primary-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-picker-card__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  flex-shrink: 0;
  margin-left: auto;
  background: color-mix(in srgb, var(--bs-success, #198754) 18%, var(--color-primary-background));
  color: var(--bs-success, #198754);
  border: 1px solid color-mix(in srgb, var(--bs-success, #198754) 40%, var(--color-border));
}

.theme-picker-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.theme-picker-card__badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1.35;

  &--muted {
    background: var(--ui-surface-2);
    color: var(--ui-text);
  }

  &--a11y {
    background: color-mix(in srgb, var(--theme-card-accent, var(--color-accent)) 14%, var(--color-secondary-background));
    color: var(--color-primary-text);
  }

  &--active {
    background: color-mix(in srgb, var(--bs-success, #198754) 16%, var(--color-primary-background));
    color: var(--bs-success, #198754);
    border: 1px solid color-mix(in srgb, var(--bs-success, #198754) 35%, var(--color-border));
    font-weight: 600;
  }

  &--catalog {
    background: color-mix(in srgb, var(--color-accent) 16%, var(--color-secondary-background));
    color: var(--color-primary-text);
  }

  &--draft {
    background: color-mix(in srgb, var(--color-accent) 12%, var(--color-secondary-background));
    color: var(--color-accent);
  }
}

.theme-picker-card__desc {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.35;
  color: color-mix(in srgb, var(--ui-text) 88%, var(--ui-text-muted));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.theme-picker-card__swatches {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.theme-picker-card__swatch-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.theme-picker-card__swatch-mode {
  color: var(--ui-text-muted);
  flex-shrink: 0;
}

.theme-picker-card__swatch {
  width: 0.95rem;
  height: 0.95rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ui-text) 14%, transparent);
  flex-shrink: 0;

  &.is-accent {
    width: 1.1rem;
    height: 1.1rem;
    border-width: 2px;
  }
}

.theme-picker-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  margin-top: auto;
  min-width: 0;
  width: 100%;
}

.theme-picker-card__apply {
  flex: 1 1 100%;
  min-width: 0;
  min-height: 1.85rem;
  padding: 0.3rem 0.7rem;
  font-size: 0.75rem;
  justify-content: center;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.theme-picker-card__icon-actions {
  flex: 0 0 auto;
  margin-left: 0;
  max-width: 100%;
  flex-wrap: wrap;
}

@media (prefers-reduced-motion: reduce) {
  .theme-picker-card {
    --picker-motion: 0ms;
  }
}
</style>
