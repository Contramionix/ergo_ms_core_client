import { ref, onMounted, unref, watch } from 'vue'
import { logError } from '@/js/utils/logError.js'
import { useListSearch } from '@/composables/useListSearch.js'

function defaultMapMeta(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      page_size: data.length,
    }
  }
  return {
    items: data.items
      ?? data.users
      ?? data.invitations
      ?? data.requests
      ?? data.results
      ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    page_size: data.page_size ?? 20,
  }
}

/**
 * Серверный list с поиском: route state → fetch → rows/total.
 *
 * @param {object} options
 * @param {(params: object) => Promise<unknown>} options.fetchItems
 * @param {Record<string, object>} [options.extraSchema]
 * @param {object} [options.routeOptions]
 * @param {import('vue').Ref<number>|number} [options.pageSize]
 * @param {(items: unknown[]) => unknown[]} [options.mapRows]
 * @param {(data: unknown) => { items: unknown[], total: number, page?: number, page_size?: number }} [options.mapMeta]
 * @param {(state: object, pageSize: number) => object} [options.buildParams]
 * @param {boolean} [options.immediate=true]
 */
export function useServerSearchList({
  fetchItems,
  extraSchema = {},
  routeOptions = {},
  pageSize = 12,
  mapRows = (items) => items,
  mapMeta = defaultMapMeta,
  buildParams = (state, pageSizeValue) => {
    const q = String(state.q || '').trim()
    return {
      q: q || undefined,
      page: state.page,
      page_size: pageSizeValue,
    }
  },
  immediate = true,
} = {}) {
  const rows = ref([])
  const total = ref(0)
  const isLoading = ref(false)
  const isQueryWatchReady = ref(false)

  const listSearch = useListSearch(extraSchema, routeOptions)
  const { watchState, state, patchState } = listSearch

  const load = async () => {
    isLoading.value = true
    try {
      const pageSizeValue = Number(unref(pageSize)) || 12
      const data = await fetchItems(buildParams(state.value, pageSizeValue))
      const meta = mapMeta(data)
      rows.value = mapRows(meta.items)
      total.value = meta.total
      if (meta.page && meta.page !== state.value.page) {
        await patchState({ page: meta.page }, { immediate: true, silent: true })
      }
    } catch (error) {
      logError('useServerSearchList: ошибка загрузки списка', error)
      rows.value = []
      total.value = 0
    } finally {
      isLoading.value = false
    }
  }

  watch(
    () => unref(pageSize),
    () => {
      if (!isQueryWatchReady.value) {
        return
      }
      load()
    },
  )

  watchState(() => {
    if (!isQueryWatchReady.value) {
      return
    }
    load()
  })

  onMounted(async () => {
    if (immediate) {
      await load()
    }
    isQueryWatchReady.value = true
  })

  return {
    ...listSearch,
    rows,
    total,
    isLoading,
    isQueryWatchReady,
    load,
    pageSize,
  }
}
