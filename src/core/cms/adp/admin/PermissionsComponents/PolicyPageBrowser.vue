<script setup>
import { computed, ref, watch } from 'vue'
import SearchInput from '@/components/SearchInput.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { matchSearchQuery } from '@/js/utils/searchQuery.js'

const { t } = useAppI18n()

const props = defineProps({
  groups: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
  /** 'url' | 'api' — подписи каталога */
  catalogMode: { type: String, default: 'url' },
})

const catalogStatsText = computed(() => {
  if (props.catalogMode === 'api') {
    return t('admin.policies.modulesEndpointsStats', {
      modules: props.groups.length,
      endpoints: totalPagesCount.value,
    })
  }
  return t('admin.policies.modulesPagesStats', {
    modules: props.groups.length,
    pages: totalPagesCount.value,
  })
})

const catalogEmptyText = computed(() => (
  props.catalogMode === 'api'
    ? t('admin.policies.apiCatalogEmpty')
    : t('admin.policies.catalogEmpty')
))

const pagesSectionTitle = computed(() => (
  props.catalogMode === 'api'
    ? t('admin.policies.endpoints')
    : t('admin.policies.pages')
))

const emit = defineEmits(['update:modelValue'])

const selectedModuleKey = ref(null)
const searchQuery = ref('')

const hasGroups = computed(() => props.groups.length > 0)

const isSearchActive = computed(() => Boolean(searchQuery.value.trim()))

const filteredGroups = computed(() => {
  if (!isSearchActive.value) {
    return props.groups
  }

  const query = searchQuery.value
  return props.groups
    .map((group) => ({
      ...group,
      pages: group.pages.filter((page) => {
        const haystack = `${page.label} ${page.title} ${page.path}`
        return matchSearchQuery(haystack, query)
      }),
    }))
    .filter((group) => group.pages.length > 0)
})

const activeGroup = computed(() => {
  if (isSearchActive.value) {
    return null
  }

  const groups = props.groups
  if (!groups.length) {
    return null
  }

  const current = groups.find((group) => group.key === selectedModuleKey.value)
  return current || groups[0]
})

const visiblePages = computed(() => {
  if (isSearchActive.value) {
    return filteredGroups.value.flatMap((group) =>
      group.pages.map((page) => ({
        ...page,
        moduleLabel: group.label,
      })),
    )
  }

  return (activeGroup.value?.pages || []).map((page) => ({
    ...page,
    moduleLabel: activeGroup.value?.label || '',
  }))
})

const totalPagesCount = computed(() =>
  props.groups.reduce((count, group) => count + group.pages.length, 0),
)

watch(
  () => props.catalogMode,
  () => {
    searchQuery.value = ''
  },
)

watch(
  () => props.groups,
  (groups) => {
    if (!groups.length) {
      selectedModuleKey.value = null
      return
    }

    if (!groups.some((group) => group.key === selectedModuleKey.value)) {
      selectedModuleKey.value = groups[0].key
    }
  },
  { immediate: true },
)

watch(
  () => props.modelValue,
  (path) => {
    if (!path) {
      return
    }

    const matchedGroup = props.groups.find((group) =>
      group.pages.some((page) => page.path === path),
    )
    if (matchedGroup) {
      selectedModuleKey.value = matchedGroup.key
    }
  },
  { immediate: true },
)

function selectModule(moduleKey) {
  selectedModuleKey.value = moduleKey
  searchQuery.value = ''
}

function selectPage(path) {
  emit('update:modelValue', path)
}
</script>

<template>
  <div class="policy-page-browser">
    <div class="policy-page-browser__toolbar">
      <SearchInput
        v-model="searchQuery"
        :placeholder="t('admin.policies.searchBrowser')"
        layout="grow"
        :show-icon="true"
      />
      <div class="policy-page-browser__toolbar-meta">
        <div class="policy-page-browser__stats small">
          {{ catalogStatsText }}
        </div>
        <div v-if="$slots.actions" class="policy-page-browser__actions">
          <slot name="actions" />
        </div>
      </div>
    </div>

    <div v-if="!hasGroups" class="alert alert-warning py-2 small mb-0">
      {{ catalogEmptyText }}
    </div>

    <template v-else>
      <div v-if="isSearchActive" class="policy-page-browser__search-results">
        <div class="policy-page-browser__section-title">{{ t('admin.policies.searchResults') }}</div>
        <div class="policy-page-browser__pages-list">
          <button
            v-for="page in visiblePages"
            :key="page.path"
            type="button"
            class="policy-page-browser__page-btn"
            :class="{ 'policy-page-browser__page-btn--active': modelValue === page.path }"
            @click="selectPage(page.path)"
          >
            <span class="policy-page-browser__page-title">{{ page.title || page.label }}</span>
            <span class="policy-page-browser__page-meta">
              <span class="policy-page-browser__page-module">{{ page.moduleLabel }}</span>
              <span class="policy-page-browser__page-path">{{ page.path }}</span>
            </span>
          </button>
          <div v-if="visiblePages.length === 0" class="policy-page-browser__empty small px-2 py-3">
            {{ t('admin.policies.nothingFound') }}
          </div>
        </div>
      </div>

      <div v-else class="policy-page-browser__layout">
        <div class="policy-page-browser__modules">
          <div class="policy-page-browser__section-title">{{ t('admin.policies.modules') }}</div>
          <div class="policy-page-browser__modules-list">
            <button
              v-for="group in groups"
              :key="group.key"
              type="button"
              class="policy-page-browser__module-btn"
              :class="{ 'policy-page-browser__module-btn--active': group.key === activeGroup?.key }"
              @click="selectModule(group.key)"
            >
              <span class="policy-page-browser__module-label">{{ group.label }}</span>
              <span class="policy-page-browser__count">{{ group.pages.length }}</span>
            </button>
          </div>
        </div>

        <div class="policy-page-browser__pages">
          <div class="policy-page-browser__section-title">
            {{ pagesSectionTitle }}
            <span v-if="activeGroup">· {{ activeGroup.label }}</span>
          </div>
          <div class="policy-page-browser__pages-list">
            <button
              v-for="page in visiblePages"
              :key="page.path"
              type="button"
              class="policy-page-browser__page-btn"
              :class="{ 'policy-page-browser__page-btn--active': modelValue === page.path }"
              @click="selectPage(page.path)"
            >
              <span class="policy-page-browser__page-title">{{ page.title || page.label }}</span>
              <span class="policy-page-browser__page-path">{{ page.path }}</span>
            </button>
            <div v-if="visiblePages.length === 0" class="policy-page-browser__empty small px-2 py-3">
              {{
                catalogMode === 'api'
                  ? t('admin.policies.noEndpointsInModule')
                  : t('admin.policies.noPagesInModule')
              }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.policy-page-browser {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.policy-page-browser__toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.policy-page-browser__toolbar-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.policy-page-browser__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.policy-page-browser__stats {
  padding-left: 0.125rem;
  color: var(--color-primary-text);
  opacity: 0.72;
}

.policy-page-browser__layout {
  display: grid;
  grid-template-columns: minmax(180px, 34%) minmax(0, 1fr);
  gap: 0.75rem;
  min-height: 280px;
  max-height: 360px;
}

.policy-page-browser__section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--color-primary-text);
  margin-bottom: 0.5rem;

  span {
    color: var(--color-primary-text);
    opacity: 0.65;
  }
}

.policy-page-browser__modules,
.policy-page-browser__pages,
.policy-page-browser__search-results {
  border: 1px solid var(--color-border);
  border-radius: 0.625rem;
  background: var(--color-primary-background);
  padding: 0.75rem;
  min-height: 0;
}

.policy-page-browser__modules-list,
.policy-page-browser__pages-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  max-height: 300px;
  overflow: auto;
}

.policy-page-browser__module-btn,
.policy-page-browser__page-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-primary-background);
  color: var(--color-primary-text);
  padding: 0.55rem 0.7rem;
  text-align: left;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.policy-page-browser__page-btn {
  flex-direction: column;
  align-items: flex-start;
}

.policy-page-browser__module-btn:hover,
.policy-page-browser__page-btn:hover {
  background: var(--color-hover-background);
  border-color: color-mix(in srgb, var(--color-primary-text) 22%, var(--color-border));
}

.policy-page-browser__module-btn--active,
.policy-page-browser__page-btn--active {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-primary-background));
}

.policy-page-browser__module-label,
.policy-page-browser__page-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.policy-page-browser__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-secondary-background);
  color: var(--color-primary-text);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.policy-page-browser__module-btn--active .policy-page-browser__count {
  border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-border));
  background: color-mix(in srgb, var(--color-accent) 16%, var(--color-primary-background));
  color: var(--color-accent);
}

.policy-page-browser__page-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
}

.policy-page-browser__page-module {
  font-size: 0.75rem;
  color: var(--color-primary-text);
  opacity: 0.7;
}

.policy-page-browser__page-path {
  font-size: 0.75rem;
  color: var(--color-primary-text);
  opacity: 0.68;
  font-family: var(--font-family-mono);
  word-break: break-all;
}

.policy-page-browser__empty {
  color: var(--color-primary-text);
  opacity: 0.7;
}

@media (width < $ui-bp-md) {
  .policy-page-browser__layout {
    grid-template-columns: 1fr;
    max-height: none;
  }

  .policy-page-browser__modules-list,
  .policy-page-browser__pages-list {
    max-height: 180px;
  }
}
</style>
