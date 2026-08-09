<template>
  <div class="settings-card-row" :class="[ `settings-card-row--control-${controlSize}`, { 'settings-card-row--last': last, 'settings-card-row--block': block, }, ]">
    <template v-if="!block">
      <component :is="labelFor ? 'label' : 'div'" v-if="label || hint || $slots.label || $slots.hint" class="settings-card-row__label-block" :class="{ 'settings-card-row__label-block--plain': !hint && !$slots.hint }" :for="labelFor || undefined">
        <slot name="label">
          <span v-if="label" class="settings-card-row__label">{{ label }}</span>
        </slot>
        <slot name="hint">
          <span v-if="hint" class="settings-card-row__hint">{{ hint }}</span>
        </slot>
      </component>

      <div v-if="$slots.default" class="settings-card-row__control">
        <slot />
      </div>
    </template>
    <slot v-else />
  </div>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  labelFor: {
    type: String,
    default: '',
  },
  last: {
    type: Boolean,
    default: false,
  },
  /** Строка на всю ширину без label/control (например, палитра) */
  block: {
    type: Boolean,
    default: false,
  },
  /** Ширина слота контрола: md — панели системы, sm — уведомления, auto — кнопки */
  controlSize: {
    type: String,
    default: 'md',
    validator: (value) => ['md', 'sm', 'auto'].includes(value),
  },
})
</script>

<style scoped lang="scss">
.settings-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--color-border);

  @media (width < $ui-bp-sm) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
}

.settings-card-row--last {
  border-bottom: none;
}

.settings-card-row--block {
  display: block;
}

.settings-card-row__label-block {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  flex: 1 1 auto;
  margin: 0;
}

.settings-card-row__label-block--plain {
  justify-content: center;
}

.settings-card-row__label {
  font-size: 0.875rem;
  color: var(--color-primary-text);
  margin: 0;
}

.settings-card-row__hint {
  font-size: 0.75rem;
  color: var(--color-secondary-text);
  opacity: 0.85;
}

.settings-card-row__control {
  flex: 0 0 auto;
  min-width: 0;

  :deep(.select-box) {
    --select-box-font-size: 0.8125rem;
    --select-box-icon-size: 14px;
    --select-box-trigger-min-height: 30px;
    --select-box-item-padding-y: 0.25rem;
    --select-box-item-padding-x: 0.5rem;
  }

  :deep(.select-trigger) {
    line-height: 1.2;
  }
}

.settings-card-row--control-md .settings-card-row__control {
  width: clamp(11rem, 50%, 14rem);

  @media (width < $ui-bp-sm) {
    width: 100%;
  }
}

.settings-card-row--control-sm .settings-card-row__control {
  width: clamp(9rem, 40%, 12rem);

  @media (width < $ui-bp-sm) {
    width: 100%;
  }
}

.settings-card-row--control-auto .settings-card-row__control {
  width: auto;
  flex-shrink: 0;
}
</style>
