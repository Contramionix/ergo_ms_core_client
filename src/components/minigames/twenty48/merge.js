export const MERGE_SIZE = 4
export const MERGE_WIN = 2048

let nextTileId = 1

function makeTile(value) {
  const tile = { id: nextTileId, value }
  nextTileId += 1
  return tile
}

export function emptyMergeBoard() {
  return Array.from({ length: MERGE_SIZE }, () => Array(MERGE_SIZE).fill(null))
}

export function cloneMergeBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
}

function emptyCells(board) {
  const cells = []
  for (let row = 0; row < MERGE_SIZE; row += 1) {
    for (let col = 0; col < MERGE_SIZE; col += 1) {
      if (!board[row][col]) {
        cells.push({ row, col })
      }
    }
  }
  return cells
}

export function spawnMergeTile(board) {
  const open = emptyCells(board)
  if (!open.length) {
    return null
  }
  const cell = open[Math.floor(Math.random() * open.length)]
  const value = Math.random() < 0.9 ? 2 : 4
  const tile = makeTile(value)
  board[cell.row][cell.col] = tile
  return { ...cell, value, id: tile.id }
}

function slideLine(cells) {
  const packed = []
  for (let index = 0; index < cells.length; index += 1) {
    if (cells[index]) {
      packed.push({ tile: cells[index], from: index })
    }
  }
  const next = Array(cells.length).fill(null)
  const traces = []
  let gained = 0
  let dest = 0
  let index = 0
  while (index < packed.length) {
    const current = packed[index]
    const ahead = packed[index + 1]
    if (ahead && current.tile.value === ahead.tile.value) {
      const merged = makeTile(current.tile.value * 2)
      next[dest] = merged
      traces.push({
        id: current.tile.id,
        value: current.tile.value,
        from: current.from,
        to: dest,
        kind: 'slide',
      })
      traces.push({
        id: ahead.tile.id,
        value: ahead.tile.value,
        from: ahead.from,
        to: dest,
        kind: 'slide',
      })
      traces.push({
        id: merged.id,
        value: merged.value,
        from: dest,
        to: dest,
        kind: 'merge',
        parents: [current.tile.id, ahead.tile.id],
      })
      gained += merged.value
      dest += 1
      index += 2
    } else {
      next[dest] = current.tile
      traces.push({
        id: current.tile.id,
        value: current.tile.value,
        from: current.from,
        to: dest,
        kind: 'slide',
      })
      dest += 1
      index += 1
    }
  }
  const moved = traces.some((trace) => trace.from !== trace.to || trace.kind === 'merge')
  return { line: next, traces, gained, moved }
}

function readLine(board, dir, index) {
  const line = []
  for (let step = 0; step < MERGE_SIZE; step += 1) {
    if (dir === 'left') {
      line.push(board[index][step])
    } else if (dir === 'right') {
      line.push(board[index][MERGE_SIZE - 1 - step])
    } else if (dir === 'up') {
      line.push(board[step][index])
    } else {
      line.push(board[MERGE_SIZE - 1 - step][index])
    }
  }
  return line
}

function writeLine(board, dir, index, line) {
  for (let step = 0; step < MERGE_SIZE; step += 1) {
    if (dir === 'left') {
      board[index][step] = line[step]
    } else if (dir === 'right') {
      board[index][MERGE_SIZE - 1 - step] = line[step]
    } else if (dir === 'up') {
      board[step][index] = line[step]
    } else {
      board[MERGE_SIZE - 1 - step][index] = line[step]
    }
  }
}

function lineCell(dir, index, step) {
  if (dir === 'left') {
    return { row: index, col: step }
  }
  if (dir === 'right') {
    return { row: index, col: MERGE_SIZE - 1 - step }
  }
  if (dir === 'up') {
    return { row: step, col: index }
  }
  return { row: MERGE_SIZE - 1 - step, col: index }
}

export function canMergeMove(board) {
  if (emptyCells(board).length) {
    return true
  }
  for (let row = 0; row < MERGE_SIZE; row += 1) {
    for (let col = 0; col < MERGE_SIZE; col += 1) {
      const value = board[row][col]?.value
      if (col + 1 < MERGE_SIZE && board[row][col + 1]?.value === value) {
        return true
      }
      if (row + 1 < MERGE_SIZE && board[row + 1][col]?.value === value) {
        return true
      }
    }
  }
  return false
}

export function maxMergeTile(board) {
  let max = 0
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.value > max) {
        max = cell.value
      }
    }
  }
  return max
}

export function listMergeTiles(board) {
  const tiles = []
  for (let row = 0; row < MERGE_SIZE; row += 1) {
    for (let col = 0; col < MERGE_SIZE; col += 1) {
      const cell = board[row][col]
      if (cell) {
        tiles.push({ id: cell.id, value: cell.value, row, col })
      }
    }
  }
  return tiles
}

function resetTileIds() {
  nextTileId = 1
}

export function createMergeGame() {
  resetTileIds()
  const board = emptyMergeBoard()
  spawnMergeTile(board)
  const spawn = spawnMergeTile(board)
  return {
    board,
    score: 0,
    won: false,
    over: false,
    spawn,
    traces: [],
  }
}

export function resetMergeGame(state) {
  const next = createMergeGame()
  state.board = next.board
  state.score = 0
  state.won = false
  state.over = false
  state.spawn = next.spawn
  state.traces = []
  return state
}

export function applyMergeMove(state, dir) {
  if (state.over) {
    return false
  }
  const next = cloneMergeBoard(state.board)
  let gained = 0
  let moved = false
  const traces = []
  for (let index = 0; index < MERGE_SIZE; index += 1) {
    const result = slideLine(readLine(next, dir, index))
    writeLine(next, dir, index, result.line)
    gained += result.gained
    moved = moved || result.moved
    for (const trace of result.traces) {
      const from = lineCell(dir, index, trace.from)
      const to = lineCell(dir, index, trace.to)
      traces.push({
        ...trace,
        fromRow: from.row,
        fromCol: from.col,
        row: to.row,
        col: to.col,
      })
    }
  }
  if (!moved) {
    return false
  }
  state.board = next
  state.score += gained
  state.traces = traces
  state.spawn = spawnMergeTile(next)
  if (!state.won && maxMergeTile(next) >= MERGE_WIN) {
    state.won = true
  }
  state.over = !canMergeMove(next)
  return true
}
