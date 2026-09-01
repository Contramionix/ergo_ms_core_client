import { defineAsyncComponent, markRaw } from 'vue'

export const MINIGAMES = [
  {
    id: 'tictactoe',
    labelKey: 'minigames.tabTictactoe',
    icon: 'Grid3x3',
    component: markRaw(defineAsyncComponent(() => import('./tictactoe/TicTacToeGame.vue'))),
  },
  {
    id: 'battleship',
    labelKey: 'minigames.tabBattleship',
    icon: 'Ship',
    component: markRaw(defineAsyncComponent(() => import('./battleship/BattleshipGame.vue'))),
  },
  {
    id: 'pulsehop',
    labelKey: 'minigames.tabPulsehop',
    icon: 'Zap',
    component: markRaw(defineAsyncComponent(() => import('./pulsehop/PulseHopGame.vue'))),
  },
  {
    id: 'twenty48',
    labelKey: 'minigames.tabTwenty48',
    icon: 'Hash',
    component: markRaw(defineAsyncComponent(() => import('./twenty48/Twenty48Game.vue'))),
  },
]

export const DEFAULT_MINIGAME_ID = MINIGAMES[0].id

export function findMinigame(id) {
  return MINIGAMES.find((game) => game.id === id) ?? MINIGAMES[0]
}
