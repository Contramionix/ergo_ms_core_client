<template>
  <div class="advanced-settings-modal-overlay" @click.self="handleClose">
    <div class="advanced-settings-modal-container">
      <div class="advanced-settings-modal-header">
        <h6 class="advanced-settings-modal-title">Настройки группы селекторов</h6>
        <button class="advanced-settings-modal-close" @click="handleClose" title="Закрыть">
          <span class="close-icon">×</span>
        </button>
      </div>
      <div class="advanced-settings-modal-content">
        <div class="settings-section">
          <h6 class="section-title">Параметры группы</h6>

          <div class="setting-item">
            <label class="setting-label">
              <input
                type="checkbox"
                class="setting-checkbox"
                :checked="props.settings.applyButton"
                @change="onSettingsChange({ applyButton: $event.target.checked })"
              />
              Кнопка «Применить»
            </label>
            <span class="setting-hint">Добавляет кнопку для применения выбранных фильтров</span>
          </div>

          <div class="setting-item">
            <label class="setting-label">
              <input
                type="checkbox"
                class="setting-checkbox"
                :checked="props.settings.clearButton"
                @change="onSettingsChange({ clearButton: $event.target.checked })"
              />
              Кнопка «Сбросить»
            </label>
            <span class="setting-hint">Добавляет кнопку для сброса всех фильтров</span>
          </div>

          <div class="setting-item">
            <label class="setting-label">
              <input
                type="checkbox"
                class="setting-checkbox"
                :checked="props.settings.autoHeight"
                @change="onSettingsChange({ autoHeight: $event.target.checked })"
              />
              Автовысота
            </label>
            <span class="setting-hint">Автоматически подстраивает высоту под содержимое</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="handleClose">
            Отмена
          </button>
          <button class="btn btn-primary" @click="handleSave">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  settings: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'save', 'update:settings']);

function handleClose() {
  emit('close');
}

function handleSave() {
  emit('save');
}

function onSettingsChange(partial) {
  const newSettings = {
    ...props.settings,
    ...partial
  };

  emit('update:settings', newSettings);
}
</script>

<style scoped lang="scss">
.advanced-settings-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.advanced-settings-modal-container {
  background: var(--color-primary-background);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.advanced-settings-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px 24px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border);
}

.advanced-settings-modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-primary-text);
  margin: 0;
}

.advanced-settings-modal-close {
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-secondary-text);
  border-radius: 6px;

  &:hover {
    color: var(--color-primary-text);
    background: var(--color-hover-background);
  }

  .close-icon {
    font-size: 24px;
    font-weight: 300;
  }
}

.advanced-settings-modal-content {
  padding: 24px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: visible;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-primary-text);
  cursor: pointer;
}

.setting-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-accent);
  cursor: pointer;
}

.setting-hint {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-left: 26px;
  line-height: 1.4;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.modal-actions .btn {
  padding: 8px 20px;
  border-radius: 0.5rem;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}
</style>

