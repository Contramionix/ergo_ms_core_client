<script setup>
import { computed, onMounted } from 'vue'
import { Bot, Boxes, Cloud, Code2, GitBranch, Layers } from 'lucide-vue-next'

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
    icon: Layers,
    title: 'Связанный backend и frontend',
    text: 'Изменения в серверной логике порождают соответствующие изменения на клиенте, при этом слои остаются архитектурно независимыми — без рутинной синхронизации API, типов и эндпоинтов.',
  },
  {
    icon: Boxes,
    title: 'Истинная модульность',
    text: 'Каждый модуль — самостоятельный репозиторий. Ядро автоматически обнаруживает его, подключает меню, права доступа и связи с другими модулями через единую интеграционную систему.',
  },
  {
    icon: Bot,
    title: 'Специализированный AI',
    text: 'ИИ, обученный архитектуре ERGOMS: проектирование модулей из требований на естественном языке, генерация кода с учётом паттернов платформы и места компонента в экосистеме.',
    inProgress: true,
  },
  {
    icon: Code2,
    title: 'Модули на любом языке',
    text: 'Go или Rust для нагрузки, Python для аналитики, удобный стек для бизнес-логики — разные языки в одной системе без потери целостности и эргономики разработки.',
    inProgress: true,
  },
  {
    icon: Cloud,
    title: 'Автооркестрация',
    text: 'Контейнеризация и распределение модулей по серверам: масштабирование, балансировка нагрузки и взаимодействие компонентов без погружения в DevOps-рутину.',
  },
  {
    icon: GitBranch,
    title: 'Версионирование модулей',
    text: 'Управление версиями с пониманием структуры модулей и их зависимостей: обновления, откаты и совместимость на уровне компонентов, а не отдельных файлов.',
    inProgress: true,
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
        <h2 class="app-shell__card-title">О ERGOMS</h2>
        <p class="app-shell__card-text">
          ERGOMS — концептуально новый подход к созданию веб-систем: целостная экосистема
          для интеллектуального проектирования, где автоматизация, модульность и искусственный
          интеллект работают в синергии. Разработчик описывает функциональность на высоком
          уровне, а платформа берёт на себя синхронизацию слоёв, интеграцию модулей
          и инфраструктурную рутину — превращая кодирование в проектирование систем.
        </p>
        <p class="app-shell__card-text app-shell__card-text--muted">
          Специализированный AI, поддержка модулей на любом языке и интеллектуальное
          версионирование компонентов находятся в процессе реализации.
          Для начала работы выберите нужный раздел в боковом меню — настройки профиля
          и уведомления доступны через панель пользователя внизу меню.
        </p>
      </section>

      <section class="app-home__highlights" aria-label="Инновации ERGOMS">
        <ul class="app-home__highlights-list">
          <li v-for="(item, index) in highlights" :key="item.title" class="app-home__highlight" :style="{ '--item-delay': `${index * 80}ms` }">
            <span class="app-home__highlight-icon" aria-hidden="true">
              <component :is="item.icon" :size="22" />
            </span>
            <div>
              <div class="app-home__highlight-heading">
                <h3 class="app-home__highlight-title">{{ item.title }}</h3>
                <span v-if="item.inProgress" class="app-home__highlight-badge">В разработке</span>
              </div>
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
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.app-home__highlight-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.app-home__highlight-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 14%, var(--color-primary-background));
  border: 1px solid color-mix(in srgb, var(--color-accent) 28%, var(--color-border));
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