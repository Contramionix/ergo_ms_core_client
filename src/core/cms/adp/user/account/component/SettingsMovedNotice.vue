<script setup>
import { Settings, Cog } from 'lucide-vue-next'
</script>

<template>
  <div class="settings-moved-notice">
    <div class="settings-moved-notice__card">
      <div class="settings-moved-notice__icon-wrap" aria-hidden="true">
        <Settings :size="32" class="settings-moved-notice__icon" />
      </div>

      <h1 class="settings-moved-notice__title">Настройки профиля переехали!</h1>

      <p class="settings-moved-notice__text">
        Редактирование профиля и других персональных настроек больше не доступно на этой странице.
        Все настройки теперь открываются в модальном окне.
      </p>

      <ol class="settings-moved-notice__steps">
        <li class="settings-moved-notice__step">
          <span class="settings-moved-notice__step-icon" aria-hidden="true">
            <Settings :size="18" />
          </span>
          <span>
            Нажмите на <strong>шестерёнку</strong> в боковом меню системы (внизу панели пользователя).
          </span>
        </li>
        <li class="settings-moved-notice__step">
          <span class="settings-moved-notice__step-icon" aria-hidden="true">
            <Cog :size="18" />
          </span>
          <span>
            Выберите пункт <strong>«Настройки»</strong> в открывшемся меню.
          </span>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped lang="scss">
.settings-moved-notice {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 2rem 1rem;
}

.settings-moved-notice__card {
  width: 100%;
  max-width: 36rem;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  padding: 2rem 1.75rem;
  text-align: center;
}

.settings-moved-notice__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  margin-bottom: 1rem;
  border-radius: 50%;
  background: var(--color-secondary-background);
  color: var(--color-primary-text);
}

.settings-moved-notice__icon {
  flex-shrink: 0;
}

.settings-moved-notice__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-primary-text);
  margin: 0 0 0.75rem;
}

.settings-moved-notice__text {
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--color-secondary-text);
  margin: 0 0 1.5rem;
}

.settings-moved-notice__steps {
  list-style: none;
  margin: 0;
  padding: 0;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.settings-moved-notice__step {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: var(--color-primary-text);
}

.settings-moved-notice__step-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  margin-top: 0.1rem;
  border-radius: 0.375rem;
  background: var(--color-secondary-background);
  color: var(--color-primary-text);
}
</style>
