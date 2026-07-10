import { computed, nextTick, onScopeDispose, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

function readQueryValue(raw, rule) {
  if (raw == null || raw === '') {
    return rule.default
  }

  if (rule.deserialize) {
    return rule.deserialize(raw)
  }

  if (rule.type === 'number') {
    const parsed = Number(raw)
    const min = typeof rule.min === 'number' ? rule.min : 1
    return Number.isFinite(parsed) && parsed >= min ? parsed : rule.default
  }

  const value = String(raw)
  if (Array.isArray(rule.enum) && rule.enum.length > 0 && !rule.enum.includes(value)) {
    return rule.default
  }

  return value
}

function writeQueryValue(value, rule) {
  if (rule.serialize) {
    return rule.serialize(value)
  }

  if (rule.type === 'number') {
    return String(value)
  }

  return String(value)
}

function isDefaultValue(value, rule) {
  return value === rule.default
}

function pickPreservedQuery(query, preserveKeys = []) {
  const preserved = {}
  for (const key of preserveKeys) {
    const value = query[key]
    if (value != null && value !== '') {
      preserved[key] = value
    }
  }
  return preserved
}

function parseQueryState(query, schema) {
  const result = {}
  for (const [key, rule] of Object.entries(schema)) {
    result[key] = readQueryValue(query[key], rule)
  }
  return result
}

function buildQueryFromState(state, schema, preserveKeys, currentQuery) {
  const next = pickPreservedQuery(currentQuery, preserveKeys)

  for (const [key, rule] of Object.entries(schema)) {
    const value = state[key]
    if (value == null || value === '' || isDefaultValue(value, rule)) {
      continue
    }
    next[key] = writeQueryValue(value, rule)
  }

  return next
}

function areStatesEqual(left, right, schema) {
  return Object.keys(schema).every((key) => left[key] === right[key])
}

/**
 * Синхронизация состояния list-фильтров с route.query.
 *
 * @param {Record<string, { default: unknown, type?: 'string'|'number', enum?: string[], min?: number, serialize?: Function, deserialize?: Function }>} schema
 * @param {{ debounceKeys?: string[], debounceMs?: number, replace?: boolean, preserveKeys?: string[], resetPageOnChange?: boolean, pageKey?: string }} [options]
 */
export function useRouteQueryState(schema, options = {}) {
  const route = useRoute()
  const router = useRouter()

  const {
    debounceKeys = [],
    debounceMs = 300,
    replace = true,
    preserveKeys = [],
    resetPageOnChange = true,
    pageKey = 'page',
  } = options

  const debounceTimers = new Map()
  let pendingPatch = null
  let suppressWatchDepth = 0

  const state = computed(() => parseQueryState(route.query, schema))

  function clearDebounceTimers() {
    for (const timer of debounceTimers.values()) {
      clearTimeout(timer)
    }
    debounceTimers.clear()
    pendingPatch = null
  }

  function navigateWithState(nextState) {
    const query = buildQueryFromState(nextState, schema, preserveKeys, route.query)
    const method = replace ? 'replace' : 'push'
    return router[method]({ path: route.path, query })
  }

  function flushPendingPatch(options = {}) {
    if (!pendingPatch) {
      return Promise.resolve()
    }
    const patch = pendingPatch
    pendingPatch = null
    return applyNavigate({ ...state.value, ...patch }, options)
  }

  async function applyNavigate(nextState, { silent = false } = {}) {
    if (silent) {
      suppressWatchDepth += 1
    }

    try {
      await navigateWithState(nextState)
      if (silent) {
        await nextTick()
      }
    } finally {
      if (silent) {
        suppressWatchDepth -= 1
      }
    }
  }

  function patchState(partial, { immediate = false, silent = false } = {}) {
    const merged = { ...state.value, ...partial }

    const changedFilterKeys = Object.keys(partial).filter((key) => key !== pageKey)
    if (
      resetPageOnChange
      && pageKey in schema
      && changedFilterKeys.length > 0
      && !Object.prototype.hasOwnProperty.call(partial, pageKey)
    ) {
      merged[pageKey] = schema[pageKey].default
    }

    if (areStatesEqual(merged, state.value, schema)) {
      return Promise.resolve()
    }

    const shouldDebounce = !immediate && changedFilterKeys.some((key) => debounceKeys.includes(key))
    if (shouldDebounce) {
      pendingPatch = { ...(pendingPatch || {}), ...partial }
      if (resetPageOnChange && pageKey in schema && changedFilterKeys.length > 0) {
        pendingPatch[pageKey] = schema[pageKey].default
      }

      const debounceKey = changedFilterKeys.find((key) => debounceKeys.includes(key)) || 'patch'
      if (debounceTimers.has(debounceKey)) {
        clearTimeout(debounceTimers.get(debounceKey))
      }

      return new Promise((resolve) => {
        const timer = setTimeout(async () => {
          debounceTimers.delete(debounceKey)
          await flushPendingPatch({ silent })
          resolve()
        }, debounceMs)
        debounceTimers.set(debounceKey, timer)
      })
    }

    pendingPatch = null
    return applyNavigate(merged, { silent })
  }

  function resetState() {
    const defaults = Object.fromEntries(
      Object.entries(schema).map(([key, rule]) => [key, rule.default]),
    )
    return patchState(defaults, { immediate: true })
  }

  function watchState(callback, watchOptions = {}) {
    return watch(
      state,
      (nextState, prevState) => {
        if (suppressWatchDepth > 0) {
          return
        }
        if (prevState && areStatesEqual(nextState, prevState, schema)) {
          return
        }
        callback(nextState, prevState)
      },
      { ...watchOptions, deep: false },
    )
  }

  onScopeDispose(() => {
    clearDebounceTimers()
  })

  return {
    state,
    patchState,
    resetState,
    watchState,
  }
}

/**
 * Собирает объект для FilterMenu из плоского route state.
 *
 * @param {Record<string, unknown>} state
 * @param {Record<string, string>} mapping queryKey -> objectKey
 */
export function filtersObjectFromState(state, mapping) {
  const result = {}
  for (const [queryKey, objectKey] of Object.entries(mapping)) {
    result[objectKey] = state[queryKey] ?? ''
  }
  return result
}

/**
 * Преобразует объект FilterMenu в patch для route state.
 *
 * @param {Record<string, unknown>} filters
 * @param {Record<string, string>} mapping queryKey -> objectKey
 */
export function filtersObjectToPatch(filters, mapping) {
  const patch = {}
  for (const [queryKey, objectKey] of Object.entries(mapping)) {
    patch[queryKey] = filters[objectKey] ?? ''
  }
  return patch
}
