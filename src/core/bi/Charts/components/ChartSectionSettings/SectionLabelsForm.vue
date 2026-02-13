<template>
  <div class="section-form">
    <div class="section-form-row">
      <label class="section-form-label">Перекрытие подписей</label>
      <div class="section-form-toggle-group">
        <button v-for="opt in BOOL_OPTIONS" :key="String(opt.value)" type="button" class="section-form-toggle-btn" :class="{ active: model.labelOverlap === opt.value }" @click="update('labelOverlap', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
    <div class="section-form-row">
      <label class="section-form-label">Подпись внутри</label>
      <div class="section-form-toggle-group">
        <button v-for="opt in BOOL_OPTIONS" :key="String(opt.value)" type="button" class="section-form-toggle-btn" :class="{ active: model.innerLabel === opt.value }" @click="update('innerLabel', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
const BOOL_OPTIONS = [
  { value: true, label: 'Вкл' },
  { value: false, label: 'Выкл' },
]

const model = defineModel({ type: Object, required: true })

function update(key, value) {
  model.value = { ...model.value, [key]: value }
}
</script>

<style lang="scss" scoped>
.section-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .section-form-label {
    margin: 0;
    flex-shrink: 0;
    width: 140px;
    min-width: 140px;
    font-size: 0.875rem;
    color: var(--color-secondary-text);
  }
}

.section-form-toggle-group {
  display: flex;
  gap: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-secondary-background);

  .section-form-toggle-btn {
    flex: 1;
    min-width: 60px;
    padding: 6px 10px;
    font-size: 0.875rem;
    border: none;
    background: var(--color-secondary-background);
    color: var(--color-secondary-text);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &.active {
      background: #0b5ed7;
      color: white;
    }

    &:hover:not(.active) {
      background: var(--color-hover-background);
    }
  }
}
</style>
