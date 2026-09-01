export const SWEEP_ROWS = 9
export const SWEEP_COLS = 9
export const SWEEP_MINES = 10

function cellKey(row, col) {
  return `${row}:${col}`
}

export function sweepNeighbors(row, col) {
  const list = []
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue
      }
      const nextRow = row + dy
      const nextCol = col + dx
      if (nextRow < 0 || nextRow >= SWEEP_ROWS || nextCol < 0 || nextCol >= SWEEP_COLS) {
        continue
      }
      list.push({ row: nextRow, col: nextCol })
    }
  }
  return list
}

function makeCell() {
  return {
    mine: false,
    open: false,
    flag: false,
    wrong: false,
    count: 0,
  }
}

function emptyBoard() {
  return Array.from({ length: SWEEP_ROWS }, () => Array.from({ length: SWEEP_COLS }, makeCell))
}

function recount(board) {
  for (let row = 0; row < SWEEP_ROWS; row += 1) {
    for (let col = 0; col < SWEEP_COLS; col += 1) {
      const cell = board[row][col]
      if (cell.mine) {
        cell.count = 0
        continue
      }
      cell.count = sweepNeighbors(row, col).filter((item) => board[item.row][item.col].mine).length
    }
  }
}

function forbiddenKeys(row, col) {
  const keys = new Set([cellKey(row, col)])
  for (const item of sweepNeighbors(row, col)) {
    keys.add(cellKey(item.row, item.col))
  }
  return keys
}

function placeMines(board, safeRow, safeCol) {
  let blocked = forbiddenKeys(safeRow, safeCol)
  const free = []
  for (let row = 0; row < SWEEP_ROWS; row += 1) {
    for (let col = 0; col < SWEEP_COLS; col += 1) {
      if (!blocked.has(cellKey(row, col))) {
        free.push({ row, col })
      }
    }
  }
  if (free.length < SWEEP_MINES) {
    blocked = new Set([cellKey(safeRow, safeCol)])
    free.length = 0
    for (let row = 0; row < SWEEP_ROWS; row += 1) {
      for (let col = 0; col < SWEEP_COLS; col += 1) {
        if (!blocked.has(cellKey(row, col))) {
          free.push({ row, col })
        }
      }
    }
  }
  for (let left = SWEEP_MINES; left > 0 && free.length; left -= 1) {
    const pick = Math.floor(Math.random() * free.length)
    const spot = free.splice(pick, 1)[0]
    board[spot.row][spot.col].mine = true
  }
  recount(board)
}

function openSafe(state, row, col) {
  const cell = state.board[row][col]
  if (cell.open || cell.flag || cell.mine) {
    return
  }
  cell.open = true
  state.opened += 1
  if (cell.count === 0) {
    for (const item of sweepNeighbors(row, col)) {
      openSafe(state, item.row, item.col)
    }
  }
}

function revealMines(state) {
  for (let row = 0; row < SWEEP_ROWS; row += 1) {
    for (let col = 0; col < SWEEP_COLS; col += 1) {
      const cell = state.board[row][col]
      if (cell.mine && !cell.flag) {
        cell.open = true
      }
      if (cell.flag && !cell.mine) {
        cell.wrong = true
      }
    }
  }
}

function flagHiddenMines(state) {
  for (let row = 0; row < SWEEP_ROWS; row += 1) {
    for (let col = 0; col < SWEEP_COLS; col += 1) {
      const cell = state.board[row][col]
      if (cell.mine && !cell.flag) {
        cell.flag = true
        state.flags += 1
      }
    }
  }
}

function checkWin(state) {
  if (state.over) {
    return
  }
  if (state.opened < SWEEP_ROWS * SWEEP_COLS - SWEEP_MINES) {
    return
  }
  state.over = true
  state.won = true
  flagHiddenMines(state)
}

export function createSweepGame() {
  return {
    board: emptyBoard(),
    armed: false,
    over: false,
    won: false,
    boomRow: -1,
    boomCol: -1,
    flags: 0,
    opened: 0,
    seconds: 0,
    running: false,
  }
}

export function resetSweepGame(state) {
  const next = createSweepGame()
  Object.assign(state, next)
  return state
}

export function tickSweepClock(state) {
  if (state.running && !state.over) {
    state.seconds += 1
  }
}

export function toggleSweepFlag(state, row, col) {
  if (state.over) {
    return false
  }
  const cell = state.board[row][col]
  if (cell.open) {
    return false
  }
  cell.flag = !cell.flag
  state.flags += cell.flag ? 1 : -1
  return true
}

export function revealSweepCell(state, row, col) {
  if (state.over) {
    return false
  }
  const cell = state.board[row][col]
  if (cell.open || cell.flag) {
    return false
  }
  if (!state.armed) {
    placeMines(state.board, row, col)
    state.armed = true
    state.running = true
  }
  if (cell.mine) {
    cell.open = true
    state.over = true
    state.won = false
    state.running = false
    state.boomRow = row
    state.boomCol = col
    revealMines(state)
    return true
  }
  openSafe(state, row, col)
  checkWin(state)
  if (state.over) {
    state.running = false
  }
  return true
}

export function chordSweepCell(state, row, col) {
  if (state.over) {
    return false
  }
  const cell = state.board[row][col]
  if (!cell.open || cell.count < 1) {
    return false
  }
  const around = sweepNeighbors(row, col)
  const flagged = around.filter((item) => state.board[item.row][item.col].flag).length
  if (flagged !== cell.count) {
    return false
  }
  let changed = false
  for (const item of around) {
    if (state.over) {
      break
    }
    const next = state.board[item.row][item.col]
    if (!next.open && !next.flag) {
      changed = revealSweepCell(state, item.row, item.col) || changed
    }
  }
  return changed
}

export function listSweepCells(state) {
  const cells = []
  for (let row = 0; row < SWEEP_ROWS; row += 1) {
    for (let col = 0; col < SWEEP_COLS; col += 1) {
      const cell = state.board[row][col]
      cells.push({
        row,
        col,
        index: row * SWEEP_COLS + col,
        mine: cell.mine,
        open: cell.open,
        flag: cell.flag,
        wrong: cell.wrong,
        count: cell.count,
        boom: state.boomRow === row && state.boomCol === col,
      })
    }
  }
  return cells
}
