<template>
  <div class="link-board">
    <div class="link-board__toolbar">
      <div
        v-if="!hideViewSwitch"
        class="link-board__switch"
        role="group"
        :aria-label="t('components.linkBoard.viewLabel')"
      >
        <button
          type="button"
          class="link-board__switch-btn"
          :class="{ 'link-board__switch-btn--active': view === 'links' }"
          :aria-pressed="view === 'links'"
          @click="setView('links')"
        >
          {{ t('components.linkBoard.viewLinks') }}
        </button>
        <button
          type="button"
          class="link-board__switch-btn"
          :class="{ 'link-board__switch-btn--active': view === 'matrix' }"
          :aria-pressed="view === 'matrix'"
          @click="setView('matrix')"
        >
          {{ t('components.linkBoard.viewMatrix') }}
        </button>
      </div>
      <ToggleSwitch
        v-if="editable && view === 'matrix'"
        v-model="editing"
        :label="t('components.linkBoard.edit')"
      />
      <span class="link-board__spacer" />
      <div class="link-board__legend">
        <span>
          <svg width="26" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="26" y2="4" stroke="currentColor" stroke-width="1.2" />
          </svg>
          {{ t('components.linkBoard.legendKnow') }}
        </span>
        <span>
          <svg width="26" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="26" y2="4" stroke="currentColor" stroke-width="2.4" />
          </svg>
          {{ t('components.linkBoard.legendAble') }}
        </span>
        <span>
          <svg width="26" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="26" y2="4" stroke="currentColor" stroke-width="3.8" />
          </svg>
          {{ t('components.linkBoard.legendMaster') }}
        </span>
      </div>
    </div>

    <p v-if="gapsText" class="link-board__gaps">
      <AlertTriangle :size="16" aria-hidden="true" />
      <span>{{ gapsText }}</span>
    </p>

    <LinkBoardCanvas
      v-if="view === 'links'"
      :left-items="leftItems"
      :right-groups="rightGroups"
      :link-map="linkMap"
      :left-counts="counts.left"
      :right-counts="counts.right"
      :weak-ids="weakIds"
      :active-left-ids="activeLeftIds"
      :active-right-ids="activeRightIds"
      :pinned="pinned"
      @enter="onEnterSide"
      @leave="onLeave"
      @toggle="onToggle"
    >
      <template v-if="$slots['left-card']" #left-card="slotProps">
        <slot name="left-card" v-bind="slotProps" />
      </template>
      <template v-if="$slots['right-pill']" #right-pill="slotProps">
        <slot name="right-pill" v-bind="slotProps" />
      </template>
    </LinkBoardCanvas>

    <LinkBoardMatrix
      v-else
      :left-items="leftItems"
      :right-groups="rightGroups"
      :link-map="linkMap"
      :left-counts="counts.left"
      :right-counts="counts.right"
      :weak-ids="weakIds"
      :active-left-ids="activeLeftIds"
      :active-right-ids="activeRightIds"
      :editable="editable && editing"
      :right-label="resolvedRightLabel"
      @enter="onEnterSelection"
      @leave="onLeave"
      @cycle="onCycle"
    />

    <div class="link-board__info">
      <slot name="info" v-bind="infoScope">
        <template v-if="!selection">{{ hintText }}</template>
        <template v-else-if="infoLeftItem">
          <strong>{{ infoLeftItem.code || infoLeftItem.title }}</strong>
          <template v-if="infoLeftItem.code"> {{ infoLeftItem.title }}</template>
          <br>
          {{ leftRelatedText || t('components.linkBoard.noRelated') }}
        </template>
        <template v-else-if="infoRightItem">
          <strong>{{ infoRightItem.label }}</strong>
          {{ rightRelatedText }}
        </template>
        <template v-else-if="selection.kind === 'cell'">
          <strong>{{ cellPairLabel }}</strong>
          : {{ cellLevelText }}
          <template v-if="editable && editing"> {{ t('components.linkBoard.cellClick') }}</template>
          <br>
          {{ infoCellLeft?.title }}
        </template>
      </slot>
      <slot v-if="selection" name="info-extra" v-bind="infoScope" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { AlertTriangle } from '@lucide/vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import LinkBoardCanvas from './LinkBoardCanvas.vue'
import LinkBoardMatrix from './LinkBoardMatrix.vue'
import { ensureLinkBoardI18n } from './linkBoardI18n.js'
import {
  countsFromLinks,
  flattenRightItems,
  indexLinks,
  linkKey,
  relatedByLevel,
  relatedLeftIds,
  relatedRightIds,
  weakLeftItems,
  orphanRightItems,
} from './linkBoardModel.js'

ensureLinkBoardI18n()

const props = defineProps({
  leftItems: { type: Array, default: () => [] },
  rightGroups: { type: Array, default: () => [] },
  links: { type: Array, default: () => [] },
  weakThreshold: { type: Number, default: 2 },
  editable: { type: Boolean, default: false },
  rightLabel: { type: String, default: '' },
  modelValue: { type: String, default: 'links' },
  hideViewSwitch: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'select', 'update:link'])

const { t } = useAppI18n()
const editing = ref(false)
const hover = ref(null)
const pinned = ref(null)

const view = computed(() => (props.modelValue === 'matrix' ? 'matrix' : 'links'))

watch(view, () => {
  pinned.value = null
  hover.value = null
})

const linkMap = computed(() => indexLinks(props.links))
const rightItems = computed(() => flattenRightItems(props.rightGroups))
const counts = computed(() => countsFromLinks(linkMap.value, props.leftItems, rightItems.value))
const weakList = computed(() => weakLeftItems(props.leftItems, counts.value.left, props.weakThreshold))
const weakIds = computed(() => new Set(weakList.value.map((item) => String(item.id))))
const orphans = computed(() => orphanRightItems(rightItems.value, counts.value.right))

const leftById = computed(() => {
  const map = new Map()
  for (const item of props.leftItems || []) {
    map.set(String(item.id), item)
  }
  return map
})

const rightById = computed(() => {
  const map = new Map()
  for (const item of rightItems.value) {
    map.set(String(item.id), item)
  }
  return map
})

const selection = computed(() => pinned.value || hover.value)

const activeLeftIds = computed(() => {
  const current = selection.value
  if (!current) {
    return null
  }
  if (current.kind === 'left') {
    return new Set([current.id])
  }
  if (current.kind === 'right') {
    return new Set(relatedLeftIds(current.id, linkMap.value))
  }
  if (current.kind === 'cell') {
    return new Set([current.from])
  }
  return null
})

const activeRightIds = computed(() => {
  const current = selection.value
  if (!current) {
    return null
  }
  if (current.kind === 'right') {
    return new Set([current.id])
  }
  if (current.kind === 'left') {
    return new Set(relatedRightIds(current.id, linkMap.value))
  }
  if (current.kind === 'cell') {
    return new Set([current.to])
  }
  return null
})

const resolvedRightLabel = computed(() => props.rightLabel || t('components.linkBoard.matrixRight'))
const hintText = computed(() => (
  props.editable
    ? t('components.linkBoard.hintEdit')
    : t('components.linkBoard.hint')
))

const gapsText = computed(() => {
  const parts = []
  if (weakList.value.length) {
    parts.push(t('components.linkBoard.weakCoverage', {
      threshold: props.weakThreshold,
      items: weakList.value.map((item) => item.code || item.title).join(', '),
    }))
  }
  if (orphans.value.length) {
    parts.push(t('components.linkBoard.orphans', {
      items: orphans.value.map((item) => item.label).join(', '),
    }))
  }
  return parts.join(' ')
})

const infoLeftItem = computed(() => {
  const current = selection.value
  if (current?.kind === 'left') {
    return leftById.value.get(current.id) || null
  }
  return null
})

const infoRightItem = computed(() => {
  const current = selection.value
  if (current?.kind === 'right') {
    return rightById.value.get(current.id) || null
  }
  return null
})

const infoCellLeft = computed(() => (
  selection.value?.kind === 'cell' ? leftById.value.get(selection.value.from) || null : null
))

const leftRelatedText = computed(() => {
  const item = infoLeftItem.value
  if (!item || selection.value?.kind === 'cell') {
    return ''
  }
  const grouped = relatedByLevel(item.id, linkMap.value)
  const parts = [3, 2, 1].map((level) => {
    const names = grouped[level]
      .map((id) => rightById.value.get(id)?.label)
      .filter(Boolean)
    if (!names.length) {
      return ''
    }
    const label = t(`components.linkBoard.${['', 'levelKnow', 'levelAble', 'levelMaster'][level]}`)
    const titled = label.charAt(0).toUpperCase() + label.slice(1)
    return `${titled}: ${names.join(', ')}.`
  }).filter(Boolean)
  return parts.join(' ')
})

const rightRelatedText = computed(() => {
  const item = infoRightItem.value
  if (!item) {
    return ''
  }
  const ids = relatedLeftIds(item.id, linkMap.value)
  if (!ids.length) {
    return t('components.linkBoard.unlinked')
  }
  const list = ids.map((id) => {
    const left = leftById.value.get(id)
    const level = linkMap.value.get(linkKey(id, item.id))?.level || 0
    const levelLabel = level
      ? t(`components.linkBoard.${['', 'levelKnow', 'levelAble', 'levelMaster'][level]}`)
      : ''
    const name = left?.code || left?.title || id
    return levelLabel ? `${name} (${levelLabel})` : name
  })
  return t('components.linkBoard.forms', { list: list.join(', ') })
})

const cellPairLabel = computed(() => {
  const current = selection.value
  if (current?.kind !== 'cell') {
    return ''
  }
  const left = leftById.value.get(current.from)
  const right = rightById.value.get(current.to)
  return t('components.linkBoard.pair', {
    left: left?.code || left?.title || current.from,
    right: right?.label || current.to,
  })
})

const cellLevelText = computed(() => {
  const current = selection.value
  if (current?.kind !== 'cell') {
    return ''
  }
  const level = linkMap.value.get(linkKey(current.from, current.to))?.level || 0
  if (!level) {
    return t('components.linkBoard.cellNone')
  }
  return t(`components.linkBoard.${['', 'levelKnow', 'levelAble', 'levelMaster'][level]}`)
})

const infoScope = computed(() => ({
  selection: selection.value,
  leftItem: infoLeftItem.value || infoCellLeft.value,
  rightItem: infoRightItem.value,
  relatedRight: (infoLeftItem.value
    ? relatedRightIds(infoLeftItem.value.id, linkMap.value).map((id) => rightById.value.get(id)).filter(Boolean)
    : []),
  relatedLeft: (infoRightItem.value
    ? relatedLeftIds(infoRightItem.value.id, linkMap.value).map((id) => leftById.value.get(id)).filter(Boolean)
    : []),
  hint: hintText.value,
}))

function setView(next) {
  if (next === view.value) {
    return
  }
  pinned.value = null
  hover.value = null
  emit('update:modelValue', next)
}

function onEnterSide(side, id) {
  if (pinned.value) {
    return
  }
  hover.value = { kind: side, id: String(id) }
}

function onEnterSelection(next) {
  if (pinned.value) {
    return
  }
  hover.value = next
}

function onLeave() {
  if (!pinned.value) {
    hover.value = null
  }
}

function onToggle(side, id) {
  const key = String(id)
  if (pinned.value?.kind === side && pinned.value.id === key) {
    pinned.value = null
    emit('select', null)
    return
  }
  pinned.value = { kind: side, id: key }
  hover.value = null
  emit('select', pinned.value)
}

function onCycle({ from, to, level }) {
  emit('update:link', { from, to, level })
}

watch(() => props.editable, (value) => {
  if (!value) {
    editing.value = false
  }
})

watch(() => [props.leftItems, props.rightGroups, props.links], () => {
  pinned.value = null
  hover.value = null
})
</script>

<style scoped lang="scss">
@use '@/scss/ui/mixins' as *;

.link-board {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
  @include ui-reduced-motion;
}

.link-board__toolbar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}

.link-board__switch {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.2rem;
  width: fit-content;
  max-width: 100%;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-surface-2);
}

.link-board__switch-btn {
  padding: 0.3rem 0.7rem;
  border: 0;
  border-radius: calc(var(--ui-radius) - 0.15rem);
  background: transparent;
  color: var(--ui-text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;

  &--active {
    background: var(--ui-surface);
    color: var(--ui-text);
    box-shadow: 0 0 0 1px var(--ui-border);
  }
}

.link-board__spacer {
  flex: 1;
}

.link-board__legend {
  display: flex;
  gap: 0.9rem;
  font-size: 0.75rem;
  flex-wrap: wrap;
  align-items: center;

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  svg {
    color: var(--ui-border-strong);
  }
}

.link-board__gaps {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--ui-warning);
}

.link-board__info {
  min-height: 2.75rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--ui-text-muted);

  strong {
    font-weight: 500;
    color: var(--ui-text);
  }
}
</style>
