/** In-memory реестр отложенных отмен (toast Undo, стек, batch). */

let nextEntryId = 1

/**
 * @typedef {object} UndoRegistryEntry
 * @property {number} id
 * @property {string} group
 * @property {string} kind
 * @property {string} message
 * @property {number} createdAt
 * @property {() => Promise<void>|void} onUndo
 * @property {object} [undoAudit]
 * @property {string} [undoLabel]
 * @property {number} [timeoutMs]
 * @property {() => Promise<void>|void} [batchUndo]
 * @property {object} [batchContext]
 */

/**
 * @typedef {object} UndoGroupState
 * @property {UndoRegistryEntry[]} entries
 * @property {number|null} visibleToastId
 * @property {number|null} suppressExpireForToastId
 * @property {(() => void)|null} onStackEmpty
 * @property {number} lifetimeMs
 * @property {Record<string, () => Promise<void>|void>} batchUndoByKind
 */

/** @type {Map<string, UndoGroupState>} */
const groups = new Map()

function createGroupState(entry) {
  return {
    entries: [],
    visibleToastId: null,
    suppressExpireForToastId: null,
    onStackEmpty: null,
    lifetimeMs: entry.timeoutMs ?? 5000,
    batchUndoByKind: {},
  }
}

function getGroupState(group, entry) {
  let state = groups.get(group)
  if (!state) {
    state = createGroupState(entry)
    groups.set(group, state)
  }
  return state
}

/**
 * @param {string} group
 * @param {Omit<UndoRegistryEntry, 'id'|'group'|'createdAt'> & { group?: string }} entry
 * @param {{ stackMax?: number }} [options]
 * @returns {UndoRegistryEntry}
 */
export function pushUndoEntry(group, entry, options = {}) {
  const kind = String(entry.kind || 'default').trim() || 'default'
  const state = getGroupState(group, entry)
  if (typeof entry.onStackEmpty === 'function') {
    state.onStackEmpty = entry.onStackEmpty
  }
  if (entry.timeoutMs != null) {
    state.lifetimeMs = entry.timeoutMs
  }
  if (typeof entry.batchUndo === 'function') {
    state.batchUndoByKind[kind] = entry.batchUndo
  }

  /** @type {UndoRegistryEntry} */
  const stored = {
    id: nextEntryId++,
    group,
    kind,
    message: entry.message,
    createdAt: Date.now(),
    onUndo: entry.onUndo,
    undoAudit: entry.undoAudit,
    undoLabel: entry.undoLabel,
    timeoutMs: entry.timeoutMs,
    batchUndo: entry.batchUndo,
    batchContext: entry.batchContext,
  }
  state.entries.push(stored)

  const stackMax = Math.max(1, options.stackMax ?? 1)
  while (state.entries.length > stackMax) {
    state.entries.shift()
  }

  return stored
}

/**
 * @param {string} group
 * @param {string} [kind]
 */
export function countUndoEntries(group, kind = null) {
  const state = groups.get(group)
  if (!state) {
    return 0
  }
  if (!kind) {
    return state.entries.length
  }
  return state.entries.filter((item) => item.kind === kind).length
}

/**
 * @param {string} group
 * @param {string} [kind]
 * @returns {UndoRegistryEntry|null}
 */
export function getOldestUndoEntry(group, kind = null) {
  const state = groups.get(group)
  if (!state?.entries.length) {
    return null
  }
  if (!kind) {
    return state.entries[0]
  }
  return state.entries.find((item) => item.kind === kind) || null
}

/**
 * @param {string} group
 * @param {number} entryId
 */
export function removeUndoEntry(group, entryId) {
  const state = groups.get(group)
  if (!state) {
    return
  }
  state.entries = state.entries.filter((item) => item.id !== entryId)
  if (!state.entries.length) {
    groups.delete(group)
  }
}

/**
 * @param {string} group
 * @param {string} [kind]
 */
export function clearUndoEntries(group, kind = null) {
  const state = groups.get(group)
  if (!state) {
    return
  }
  if (!kind) {
    groups.delete(group)
    return
  }
  state.entries = state.entries.filter((item) => item.kind !== kind)
  if (!state.entries.length) {
    groups.delete(group)
  }
}

/** @returns {UndoGroupState|null} */
export function getUndoGroupState(group) {
  return groups.get(group) || null
}

/** @param {string} group */
export function deleteUndoGroup(group) {
  groups.delete(group)
}

/**
 * @param {string} group
 * @param {(state: UndoGroupState) => void} patch
 */
export function patchUndoGroupState(group, patch) {
  const state = groups.get(group)
  if (state && typeof patch === 'function') {
    patch(state)
  }
}

/**
 * @param {string} group
 * @param {string} kind
 * @returns {boolean}
 */
export function canBatchUndoKind(group, kind) {
  const state = groups.get(group)
  if (!state) {
    return false
  }
  const count = countUndoEntries(group, kind)
  if (count <= 1) {
    return false
  }
  return Boolean(state.batchUndoByKind[kind] || getOldestUndoEntry(group, kind)?.batchUndo)
}
