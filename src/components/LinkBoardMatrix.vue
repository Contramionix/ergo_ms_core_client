<template>
  <div class="link-board-matrix" :class="{ 'link-board-matrix--edit': editable }">
    <div class="link-board-matrix__wrap">
      <table>
        <thead>
          <tr>
            <th class="link-board-matrix__name-col">{{ rightLabel }}</th>
            <th
              v-for="(item, index) in leftItems"
              :key="item.id"
              :data-col="index"
              :class="{ 'link-board-matrix__hc': isColHot(item.id) }"
              @pointerenter="onEnterLeft(item.id)"
              @pointerleave="onLeave"
            >
              {{ item.code || item.title }}
            </th>
            <th class="link-board-matrix__tot" :title="t('components.linkBoard.matrixTotalTitle')">
              {{ t('components.linkBoard.matrixTotal') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in orderedGroups" :key="group.id">
            <tr v-if="group.label" class="link-board-matrix__group">
              <td :colspan="leftItems.length + 2">{{ group.label }}</td>
            </tr>
            <tr
              v-for="item in group.items"
              :key="item.id"
              :class="{ 'link-board-matrix__hr': isRowHot(item.id) }"
            >
              <td
                class="link-board-matrix__name"
                @pointerenter="onEnterRight(item.id)"
                @pointerleave="onLeave"
              >
                {{ item.label }}
              </td>
              <td
                v-for="(left, index) in leftItems"
                :key="`${item.id}|${left.id}`"
                class="link-board-matrix__cell"
                :class="{
                  'link-board-matrix__hc': isColHot(left.id),
                  'link-board-matrix__hr': isRowHot(item.id),
                }"
                :data-col="index"
                @pointerenter="onEnterCell(left.id, item.id)"
                @pointerleave="onLeave"
                @click="onCycle(left.id, item.id)"
              >
                <span
                  class="link-board-chip"
                  :class="chipClass(left.id, item.id)"
                  :title="levelTitle(left.id, item.id)"
                >{{ levelShort(left.id, item.id) }}</span>
              </td>
              <td
                class="link-board-matrix__tot"
                :class="{ 'link-board-matrix__warn': !rightCount(item.id) }"
              >
                {{ rightCount(item.id) }}
              </td>
            </tr>
          </template>
        </tbody>
        <tfoot>
          <tr class="link-board-matrix__foot">
            <td>{{ t('components.linkBoard.matrixFooter') }}</td>
            <td
              v-for="item in leftItems"
              :key="`ft-${item.id}`"
              :class="{ 'link-board-matrix__warn': isWeak(item.id) }"
            >
              {{ leftCount(item.id) }}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { cycleLevel, linkKey, orderRightGroups } from './linkBoardModel.js'

const props = defineProps({
  leftItems: { type: Array, default: () => [] },
  rightGroups: { type: Array, default: () => [] },
  linkMap: { type: Map, default: () => new Map() },
  leftCounts: { type: Map, default: () => new Map() },
  rightCounts: { type: Map, default: () => new Map() },
  weakIds: { type: Set, default: () => new Set() },
  activeLeftIds: { type: Set, default: null },
  activeRightIds: { type: Set, default: null },
  editable: { type: Boolean, default: false },
  rightLabel: { type: String, default: '' },
})

const emit = defineEmits(['enter', 'leave', 'cycle'])

const { t } = useAppI18n()

const orderedGroups = computed(() => (
  orderRightGroups(props.rightGroups, props.leftItems, props.linkMap)
))

function leftCount(id) {
  return props.leftCounts.get(String(id)) || 0
}

function rightCount(id) {
  return props.rightCounts.get(String(id)) || 0
}

function isWeak(id) {
  return props.weakIds.has(String(id))
}

function isColHot(id) {
  return Boolean(props.activeLeftIds) && props.activeLeftIds.has(String(id))
}

function isRowHot(id) {
  return Boolean(props.activeRightIds) && props.activeRightIds.has(String(id))
}

function levelOf(from, to) {
  return props.linkMap.get(linkKey(from, to))?.level || 0
}

function chipClass(from, to) {
  const level = levelOf(from, to)
  return level ? `link-board-chip--l${level}` : ''
}

function levelTitle(from, to) {
  const level = levelOf(from, to)
  if (!level) {
    return ''
  }
  const keys = ['', 'levelKnow', 'levelAble', 'levelMaster']
  return t(`components.linkBoard.${keys[level]}`)
}

function levelShort(from, to) {
  const level = levelOf(from, to)
  if (!level) {
    return ''
  }
  const keys = ['', 'levelShortKnow', 'levelShortAble', 'levelShortMaster']
  return t(`components.linkBoard.${keys[level]}`)
}

function onEnterLeft(id) {
  emit('enter', { kind: 'left', id: String(id) })
}

function onEnterRight(id) {
  emit('enter', { kind: 'right', id: String(id) })
}

function onEnterCell(from, to) {
  emit('enter', { kind: 'cell', from: String(from), to: String(to) })
}

function onLeave() {
  emit('leave')
}

function onCycle(from, to) {
  if (!props.editable) {
    return
  }
  emit('cycle', { from: String(from), to: String(to), level: cycleLevel(levelOf(from, to)) })
}
</script>

<style scoped lang="scss">
@use '@/scss/ui/mixins' as *;

.link-board-matrix {
  overflow-x: auto;
  @include ui-reduced-motion;
}

.link-board-matrix__wrap {
  min-width: 100%;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

th,
td {
  padding: 0.3rem 0.25rem;
  border-bottom: 0.5px solid var(--ui-border);
  text-align: center;
}

th {
  font-weight: 500;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.link-board-matrix__name-col,
.link-board-matrix__name {
  text-align: left;
  color: var(--ui-text);
  width: 30%;
}

.link-board-matrix__tot {
  width: 34px;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}

.link-board-matrix__group td {
  text-align: left;
  font-size: 0.6875rem;
  color: var(--ui-text-muted);
  padding-top: 0.65rem;
  border-bottom: 0;
}

.link-board-matrix__foot td {
  border-bottom: 0;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}

.link-board-matrix__warn {
  color: var(--ui-warning);
}

.link-board-matrix__hr,
.link-board-matrix__hc {
  background: var(--ui-surface-2);
}

.link-board-matrix__hr.link-board-matrix__hc {
  background: var(--ui-accent-soft);
}

.link-board-matrix--edit .link-board-matrix__cell {
  cursor: pointer;
}

.link-board-chip {
  display: inline-flex;
  width: 24px;
  height: 22px;
  border-radius: 5px;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 500;
  box-sizing: border-box;

  &--l1 {
    border: 1px solid var(--ui-accent);
    color: var(--ui-accent);
  }

  &--l2 {
    background: var(--ui-accent-soft);
    color: var(--ui-accent);
  }

  &--l3 {
    background: var(--ui-accent);
    color: var(--ui-accent-text);
  }
}

.link-board-matrix--edit .link-board-matrix__cell:hover .link-board-chip:not([class*='--l']) {
  border: 1px dashed var(--ui-border-strong);
}
</style>
