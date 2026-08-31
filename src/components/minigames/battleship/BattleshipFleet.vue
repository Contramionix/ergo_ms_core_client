<script setup>
import { computed } from 'vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { fleetGroups } from './battleshipLogic.js'

const props = defineProps({
  board: { type: Object, required: true },
  label: { type: String, required: true },
})

const { t } = useAppI18n()

const groups = computed(() => fleetGroups(props.board))
</script>

<template>
  <ul class="sea-fleet" :aria-label="label">
    <li
      v-for="group in groups"
      :key="group.length"
      class="sea-fleet__row"
      :class="{ 'is-gone': group.alive === 0 }"
    >
      <span class="sea-fleet__hull" aria-hidden="true">
        <span
          v-for="slot in group.length"
          :key="slot"
          class="sea-fleet__deck"
        />
      </span>
      <span class="sea-fleet__count">
        {{ t('minigames.battleship.remaining', { n: group.alive }) }}
      </span>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.sea-fleet {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
  text-align: left;
}

.sea-fleet__row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 1.35rem;
  color: var(--ui-text, var(--color-primary-text, #14151a));

  &.is-gone {
    color: var(--maint-accent, #d0322d);
    opacity: 0.55;
  }
}

.sea-fleet__hull {
  display: flex;
  gap: 2px;
  min-width: 2.4rem;
}

.sea-fleet__deck {
  width: 0.52rem;
  height: 0.52rem;
  border-radius: 2px;
  background: color-mix(in srgb, currentColor 55%, transparent);
}

.sea-fleet__row.is-gone .sea-fleet__deck {
  background: var(--maint-accent, #d0322d);
}

.sea-fleet__count {
  font-size: 0.68rem;
  line-height: 1.2;
  white-space: nowrap;
}

@media (max-width: 43.99rem) {
  .sea-fleet {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
