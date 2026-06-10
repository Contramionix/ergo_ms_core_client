/**
 * Композабл панели настроек уведомлений.
 *
 * Загружает секции каталога (модули -> категории -> события, 2 канала),
 * хранит локальное состояние чекбоксов и сохраняет изменения
 * с debounce-батчингом (optimistic UI, откат при ошибке).
 */

import { computed, ref } from 'vue'
import { notificationsApi } from './notifications-api'

const SAVE_DEBOUNCE_MS = 400

export function useNotificationSettings() {
  const loading = ref(true)
  const saving = ref(false)
  const loadError = ref(false)
  const globalSwitches = ref({ in_app: true, email: true })
  const sections = ref([])

  let pendingItems = new Map()
  let pendingGlobal = {}
  let saveTimer = null
  let onSaveError = null

  const hasSections = computed(() => sections.value.length > 0)

  async function load() {
    loading.value = true
    loadError.value = false
    try {
      const response = await notificationsApi.getPreferences()
      const data = response?.data ?? {}
      globalSwitches.value = { in_app: true, email: true, ...(data.global || {}) }
      sections.value = Array.isArray(data.sections) ? data.sections : []
    } catch {
      loadError.value = true
      sections.value = []
    } finally {
      loading.value = false
    }
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(flush, SAVE_DEBOUNCE_MS)
  }

  async function flush() {
    saveTimer = null
    if (!pendingItems.size && !Object.keys(pendingGlobal).length) return

    const payload = {}
    if (Object.keys(pendingGlobal).length) payload.global = { ...pendingGlobal }
    if (pendingItems.size) payload.items = Array.from(pendingItems.values())

    pendingItems = new Map()
    pendingGlobal = {}

    saving.value = true
    try {
      await notificationsApi.patchPreferences(payload)
    } catch {
      if (typeof onSaveError === 'function') onSaveError()
      await load()
    } finally {
      saving.value = false
    }
  }

  function applyLocalEventState(sourceModule, eventKey, channel, enabled) {
    const section = sections.value.find((s) => s.module === sourceModule)
    if (!section) return
    for (const category of section.categories || []) {
      const event = (category.events || []).find((e) => e.event_key === eventKey)
      if (event?.channels?.[channel]) {
        event.channels[channel].enabled = enabled
        return
      }
    }
  }

  function toggleEvent(sourceModule, eventKey, channel, enabled) {
    applyLocalEventState(sourceModule, eventKey, channel, enabled)
    pendingItems.set(`${sourceModule}|${eventKey}|${channel}`, {
      source_module: sourceModule,
      event_key: eventKey,
      channel,
      enabled,
    })
    scheduleSave()
  }

  function toggleGlobal(channel, enabled) {
    globalSwitches.value = { ...globalSwitches.value, [channel]: enabled }
    pendingGlobal[channel] = enabled
    scheduleSave()
  }

  function setSaveErrorHandler(handler) {
    onSaveError = handler
  }

  return {
    loading,
    saving,
    loadError,
    globalSwitches,
    sections,
    hasSections,
    load,
    toggleEvent,
    toggleGlobal,
    setSaveErrorHandler,
  }
}
