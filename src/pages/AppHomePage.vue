<script setup>
import { computed, onMounted } from 'vue'
import { Boxes, Cog, ShieldCheck, Users } from 'lucide-vue-next'

import SiteWordmark from '@/components/SiteWordmark.vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { useSiteName } from '@/composables/useSiteName.js'
import { formatWeekdayDate } from '@/js/utils/timeUtils.js'

const userStore = useUserStore()
const { ensureSiteNameLoaded } = useSiteName()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) {
    return 'Доброе утро'
  }
  if (hour < 18) {
    return 'Добрый день'
  }
  return 'Добрый вечер'
})

const userLabel = computed(() => userStore.greetingName)

const formattedDate = computed(() => formatWeekdayDate(new Date()))

const highlights = [
  {
    icon: Boxes,
    title: 'Модульная архитектура',
    text: 'Ядро системы объединяет независимые модули — LMS, CRM, проекты, аналитику и другие сервисы в одном интерфейсе.',
  },
  {
    icon: Users,
    title: 'Работа в организации',
    text: 'Доступ к данным и функциям определяется вашей ролью и принадлежностью к организации или подразделению.',
  },
  {
    icon: ShieldCheck,
    title: 'Гибкие права доступа',
    text: 'Администратор настраивает роли, политики и видимость разделов — каждый пользователь видит только то, что ему доступно.',
  },
  {
    icon: Cog,
    title: 'Единая среда',
    text: 'Общее меню, профиль, уведомления и настройки — всё в одном месте, без переключения между разными приложениями.',
  },
]

async function loadSiteName() {
  await ensureSiteNameLoaded()
}

onMounted(loadSiteName)
</script>

<template>
  <div class="app-shell">
    <div class="app-shell__content">
      <header class="app-shell__hero app-shell__hero--centered">
        <div class="app-shell__brand app-shell__brand--centered">
          <p class="app-shell__eyebrow app-shell__eyebrow--date">{{ formattedDate }}</p>
          <h1 class="app-shell__title">
            <SiteWordmark class="site-wordmark--hero site-wordmark--centered" />
          </h1>
          <p class="app-shell__subtitle">
            {{ greeting }}, <span class="app-home__username">{{ userLabel }}</span>!
          </p>
        </div>
      </header>

      <section class="app-shell__card" aria-label="О системе">
        <h2 class="app-shell__card-title">О платформе</h2>
        <p class="app-shell__card-text">
          ERGOMS
          — корпоративная веб-платформа для управления бизнес-процессами,
          обучением, проектами и аналитикой. Система построена на модульной архитектуре:
          ядро обеспечивает авторизацию, меню и общие сервисы, а подключаемые модули
          расширяют функциональность под задачи вашей организации.
        </p>
        <p class="app-shell__card-text app-shell__card-text--muted">
          Для начала работы выберите нужный раздел в боковом меню. Настройки профиля
          и уведомления доступны через панель пользователя внизу меню.
        </p>
      </section>

      <section class="app-home__highlights" aria-label="Возможности платформы">
        <ul class="app-home__highlights-list">
          <li v-for="(item, index) in highlights" :key="item.title" class="app-home__highlight" :style="{ '--item-delay': `${index * 80}ms` }">
            <span class="app-home__highlight-icon" aria-hidden="true">
              <component :is="item.icon" :size="22" />
            </span>
            <div>
              <h3 class="app-home__highlight-title">{{ item.title }}</h3>
              <p class="app-home__highlight-text">{{ item.text }}</p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import '@/scss/_app-shell-page.scss';

.app-home__username {
  color: var(--color-primary-text);
  font-weight: 600;
}

.app-home__highlights {
  animation: app-shell-fade-up 0.8s ease 0.18s both;
}

.app-home__highlights-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.app-home__highlight {
  display: flex;
  gap: 0.875rem;
  padding: 1.15rem 1.2rem;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--color-secondary-background) 55%, var(--color-primary-background));
  animation: app-shell-fade-up 0.55s ease var(--item-delay, 0ms) both;
}

.app-home__highlight-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-primary-background));
}

.app-home__highlight-title {
  margin: 0 0 0.35rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.app-home__highlight-text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-secondary-text);
}

@media (width < 768px) {
  .app-home__highlights-list {
    grid-template-columns: 1fr;
  }
}
</style>