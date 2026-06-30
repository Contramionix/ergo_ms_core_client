<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, SearchX } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const attemptedPath = computed(() => route.fullPath || route.path)
</script>

<template>
  <div class="app-shell">
    <div class="app-shell__content">
      <header class="app-shell__hero">
        <div class="app-shell__brand">
          <div class="app-shell__logo" aria-hidden="true">
            <SearchX :size="40" />
          </div>
          <div>
            <p class="app-shell__eyebrow">Ошибка 404</p>
            <h1 class="app-shell__title">Страница не найдена</h1>
            <p class="app-shell__subtitle">
              Запрошенный адрес недоступен или был перемещён
            </p>
          </div>
        </div>
      </header>

      <section class="app-shell__card" aria-label="Информация об ошибке">
        <h2 class="app-shell__card-title">Что произошло?</h2>
        <p class="app-shell__card-text">
          Страница по адресу
          <code class="not-found__path">{{ attemptedPath }}</code>
          не существует. Возможно, ссылка устарела, адрес введён с ошибкой
          или у вас нет доступа к этому разделу.
        </p>
        <p class="app-shell__card-text app-shell__card-text--muted">
          Проверьте правильность адреса или вернитесь на главную страницу системы.
        </p>
        <div class="app-shell__actions">
          <button type="button" class="btn btn-primary not-found__btn" @click="router.push({ name: 'AppHome' })">
            <ArrowLeft :size="18" />
            На главную
          </button>
          <button type="button" class="btn btn-outline-secondary not-found__btn" @click="router.back()">
            Назад
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/scss/_app-shell-page.scss';

.not-found__path {
  display: inline-block;
  max-width: 100%;
  margin: 0 0.2rem;
  padding: 0.15rem 0.45rem;
  border-radius: 0.375rem;
  font-size: 0.9em;
  word-break: break-all;
  color: var(--color-primary-text);
  background: var(--color-secondary-background);
  border: 1px solid var(--color-border);
}

.not-found__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
</style>
