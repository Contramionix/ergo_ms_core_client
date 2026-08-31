<script setup>
import { computed, onUnmounted, reactive, ref } from 'vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { getReducedMotionActive } from '@/composables/useUiModes.js'
import BattleshipBoard from './BattleshipBoard.vue'
import BattleshipFleet from './BattleshipFleet.vue'
import { createBotMemory, pickBotShot, rememberBotShot } from './battleshipAi.js'
import {
  BATTLESHIP_COLS,
  allShipsPlaced,
  allShipsSunk,
  cellCol,
  cellRow,
  createRandomBoard,
  fireAt,
  placeFleetRandom,
} from './battleshipLogic.js'

const { t } = useAppI18n()

const phase = ref('place')
const turn = ref('player')
const lastBotShot = ref(-1)
const lastEvent = ref({ actor: '', result: 'place', length: 0, cell: -1 })
const shotLog = ref([])
const busy = ref(false)
const player = reactive(createRandomBoard())
const enemy = reactive(createRandomBoard())
const botMemory = reactive(createBotMemory())

let botToken = 0

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, getReducedMotionActive() ? 0 : ms)
  })
}

function assignBoard(target, source) {
  target.cells = source.cells
  target.ships = source.ships
}

function resetMatch() {
  botToken += 1
  busy.value = false
  phase.value = 'place'
  turn.value = 'player'
  lastBotShot.value = -1
  lastEvent.value = { actor: '', result: 'place', length: 0, cell: -1 }
  shotLog.value = []
  assignBoard(player, createRandomBoard())
  assignBoard(enemy, createRandomBoard())
  botMemory.hits = []
}

function cellTitle(cell) {
  const name = t('minigames.battleship.cell', {
    col: BATTLESHIP_COLS[cellCol(cell.index)],
    row: cellRow(cell.index) + 1,
  })
  if (!cell.shot) {
    return `${name}, ${t('minigames.battleship.unknown')}`
  }
  if (cell.hit) {
    return `${name}, ${t('minigames.battleship.hit')}`
  }
  return `${name}, ${t('minigames.battleship.miss')}`
}

function randomFleet() {
  placeFleetRandom(player)
}

function pushLog(actor, result, cell, length) {
  if (result === 'idle' || result === 'ready' || result === 'place') {
    return
  }
  shotLog.value = [{ actor, result, cell, length }, ...shotLog.value].slice(0, 6)
}

function startBattle() {
  if (!allShipsPlaced(player)) {
    return
  }
  phase.value = 'battle'
  turn.value = 'player'
  lastEvent.value = { actor: 'you', result: 'ready', length: 0, cell: -1 }
}

async function botTurn() {
  const token = botToken
  busy.value = true
  turn.value = 'bot'
  while (token === botToken && phase.value === 'battle' && turn.value === 'bot') {
    await delay(420)
    if (token !== botToken) {
      return
    }
    const index = pickBotShot(player, botMemory)
    const { result, ship } = fireAt(player, index)
    if (result === 'idle') {
      break
    }
    rememberBotShot(botMemory, index, result)
    lastBotShot.value = index
    lastEvent.value = { actor: 'bot', result, length: ship?.length ?? 0, cell: index }
    pushLog('bot', result, index, ship?.length ?? 0)
    if (result === 'fleet') {
      phase.value = 'over'
      break
    }
    if (result === 'miss') {
      turn.value = 'player'
      break
    }
  }
  busy.value = false
}

async function fireEnemy(index) {
  if (phase.value !== 'battle' || turn.value !== 'player' || busy.value) {
    return
  }
  const { result, ship } = fireAt(enemy, index)
  if (result === 'idle') {
    return
  }
  lastEvent.value = { actor: 'you', result, length: ship?.length ?? 0, cell: index }
  pushLog('you', result, index, ship?.length ?? 0)
  if (result === 'fleet') {
    phase.value = 'over'
    return
  }
  if (result === 'miss') {
    await botTurn()
  }
}

const canStart = computed(() => allShipsPlaced(player) && phase.value === 'place')

const statusText = computed(() => {
  const event = lastEvent.value
  const shot = event.cell >= 0
    ? t('minigames.battleship.cell', {
        col: BATTLESHIP_COLS[cellCol(event.cell)],
        row: cellRow(event.cell) + 1,
      })
    : ''
  if (phase.value === 'place') {
    return t('minigames.battleship.placeReady')
  }
  if (event.result === 'fleet' && event.actor === 'you') {
    return t('minigames.battleship.win')
  }
  if (event.result === 'fleet' && event.actor === 'bot') {
    return t('minigames.battleship.lose')
  }
  if (event.actor === 'bot' && event.result === 'miss') {
    return t('minigames.battleship.botMiss', { cell: shot })
  }
  if (event.actor === 'bot' && event.result === 'hit') {
    return t('minigames.battleship.botHit', { cell: shot })
  }
  if (event.actor === 'bot' && event.result === 'sunk') {
    return t('minigames.battleship.botSunk', { cell: shot, length: event.length })
  }
  if (event.actor === 'you' && event.result === 'miss') {
    return t('minigames.battleship.missTurn', { cell: shot })
  }
  if (event.actor === 'you' && event.result === 'hit') {
    return t('minigames.battleship.hitAgain', { cell: shot })
  }
  if (event.actor === 'you' && event.result === 'sunk') {
    return t('minigames.battleship.sunkAgain', { cell: shot, length: event.length })
  }
  if (turn.value === 'bot') {
    return t('minigames.battleship.botTurn')
  }
  return t('minigames.battleship.yourTurn')
})

function logLabel(entry) {
  const cell = t('minigames.battleship.cell', {
    col: BATTLESHIP_COLS[cellCol(entry.cell)],
    row: cellRow(entry.cell) + 1,
  })
  const who = entry.actor === 'you'
    ? t('minigames.battleship.logYou')
    : t('minigames.battleship.logBot')
  const kind = entry.result === 'sunk' || entry.result === 'fleet'
    ? t('minigames.battleship.logSunk')
    : entry.result === 'hit'
      ? t('minigames.battleship.logHit')
      : t('minigames.battleship.logMiss')
  return `${who}: ${cell} — ${kind}`
}

onUnmounted(() => {
  botToken += 1
})
</script>

<template>
  <div class="sea" :class="{ 'is-battle': phase !== 'place' }">
    <div v-if="phase === 'place'" class="sea__tools">
      <button type="button" class="ui-btn ui-btn--secondary" @click="randomFleet">
        {{ t('minigames.battleship.random') }}
      </button>
      <button type="button" class="ui-btn ui-btn--primary" :disabled="!canStart" @click="startBattle">
        {{ t('minigames.battleship.start') }}
      </button>
    </div>

    <div class="sea__theaters">
      <section class="sea__theater sea__theater--you">
        <h3 class="sea__caption">{{ t('minigames.battleship.yourBoard') }}</h3>
        <div class="sea__stage">
          <BattleshipFleet
            v-if="phase !== 'place'"
            class="sea__fleet"
            :board="player"
            :label="t('minigames.battleship.yourFleet')"
          />
          <BattleshipBoard
            :board="player"
            :label="t('minigames.battleship.yourBoard')"
            show-ships
            :last-shot="lastBotShot"
            :cell-name="cellTitle"
          />
        </div>
      </section>

      <section v-if="phase !== 'place'" class="sea__theater sea__theater--enemy">
        <h3 class="sea__caption">{{ t('minigames.battleship.enemyBoard') }}</h3>
        <div class="sea__stage">
          <BattleshipBoard
            :board="enemy"
            :label="t('minigames.battleship.enemyBoard')"
            :show-ships="allShipsSunk(enemy)"
            :interactive="phase === 'battle' && turn === 'player' && !busy"
            :cell-name="cellTitle"
            @cell-click="fireEnemy"
          />
          <BattleshipFleet
            class="sea__fleet"
            :board="enemy"
            :label="t('minigames.battleship.enemyBoard')"
          />
        </div>
      </section>
    </div>

    <p class="sea__status" aria-live="polite">{{ statusText }}</p>

    <ol
      v-if="shotLog.length"
      class="sea__log"
      :aria-label="t('minigames.battleship.log')"
    >
      <li v-for="(entry, index) in shotLog" :key="`${entry.cell}-${index}`">
        {{ logLabel(entry) }}
      </li>
    </ol>

    <button type="button" class="ui-btn ui-btn--secondary sea__again" @click="resetMatch">
      {{ t('minigames.again') }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.sea {
  text-align: center;
}

.sea__tools {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.45rem;
  margin-bottom: 1rem;
}

.sea__theaters {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.1rem 1.4rem;
  align-items: start;
}

.sea.is-battle .sea__theaters {
  @media (min-width: 44rem) {
    grid-template-columns: 1fr 1fr;
  }
}

.sea__caption {
  margin: 0 0 0.45rem;
  font-size: 0.8125rem;
  font-weight: 600;
}

.sea__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
}

.sea__fleet {
  flex: 0 0 auto;
}

@media (max-width: 43.99rem) {
  .sea__stage {
    flex-direction: column;
  }

  .sea__fleet {
    order: -1;
    width: 100%;
  }
}

.sea__status {
  margin: 1rem 0 0;
  min-height: 2.6em;
  font-size: 0.875rem;
  line-height: 1.45;
}

.sea__log {
  margin: 0.55rem auto 0;
  padding: 0;
  max-width: 22rem;
  list-style: none;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--ui-text-muted, var(--color-secondary-text, #5b616e));
}

.sea__again {
  margin-top: 0.85rem;
}
</style>
