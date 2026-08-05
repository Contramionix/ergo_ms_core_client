import { computed } from 'vue'
import { useRouteQueryState } from '@/composables/useRouteQueryState.js'

/**
 * Стандартное состояние list-поиска в URL: q + page (+ доп. фильтры).
 *
 * @param {Record<string, object>} [extraSchema]
 * @param {object} [options] — опции useRouteQueryState
 */
export function useListSearch(extraSchema = {}, options = {}) {
  const schema = {
    q: { default: '' },
    page: { default: 1, type: 'number' },
    ...extraSchema,
  }

  const routeOptions = {
    debounceKeys: ['q'],
    ...options,
  }

  const { state, patchState, resetState, watchState } = useRouteQueryState(schema, routeOptions)

  const searchQuery = computed(() => state.value.q)
  const currentPage = computed(() => state.value.page)

  const handleSearchQuery = (query) => {
    patchState({ q: query })
  }

  const goToPage = (page) => {
    patchState({ page }, { immediate: true })
  }

  return {
    state,
    searchQuery,
    currentPage,
    patchState,
    resetState,
    watchState,
    handleSearchQuery,
    goToPage,
  }
}
