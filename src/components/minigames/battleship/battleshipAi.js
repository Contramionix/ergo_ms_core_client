import {
  BATTLESHIP_SIZE,
  adjacentUnshot,
  blockedByContact,
  cellCol,
  cellRow,
} from './battleshipLogic.js'

const HUNT_SLIP = 0.3

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function openHits(board, memory) {
  return memory.hits.filter((index) => {
    const cell = board.cells[index]
    return cell.hit && cell.shipId !== null && !board.ships[cell.shipId].sunk
  })
}

function lineEnds(board, hits) {
  const rows = hits.map((index) => cellRow(index))
  const cols = hits.map((index) => cellCol(index))
  const sameRow = rows.every((row) => row === rows[0])
  const sameCol = cols.every((col) => col === cols[0])
  const ends = []
  if (sameRow) {
    const minCol = Math.min(...cols)
    const maxCol = Math.max(...cols)
    ends.push(rows[0] * BATTLESHIP_SIZE + (minCol - 1))
    ends.push(rows[0] * BATTLESHIP_SIZE + (maxCol + 1))
  } else if (sameCol) {
    const minRow = Math.min(...rows)
    const maxRow = Math.max(...rows)
    ends.push((minRow - 1) * BATTLESHIP_SIZE + cols[0])
    ends.push((maxRow + 1) * BATTLESHIP_SIZE + cols[0])
  }
  return ends.filter((index) => {
    if (index < 0 || index >= board.cells.length) {
      return false
    }
    return !board.cells[index].shot
  })
}

function lineGaps(board, hits) {
  const rows = hits.map((index) => cellRow(index))
  const cols = hits.map((index) => cellCol(index))
  const sameRow = rows.every((row) => row === rows[0])
  const sameCol = cols.every((col) => col === cols[0])
  const gaps = []
  if (sameRow) {
    const minCol = Math.min(...cols)
    const maxCol = Math.max(...cols)
    for (let col = minCol + 1; col < maxCol; col += 1) {
      const index = rows[0] * BATTLESHIP_SIZE + col
      if (!board.cells[index].shot) {
        gaps.push(index)
      }
    }
  } else if (sameCol) {
    const minRow = Math.min(...rows)
    const maxRow = Math.max(...rows)
    for (let row = minRow + 1; row < maxRow; row += 1) {
      const index = row * BATTLESHIP_SIZE + cols[0]
      if (!board.cells[index].shot) {
        gaps.push(index)
      }
    }
  }
  return gaps
}

function targetShots(board, memory) {
  const hits = openHits(board, memory)
  memory.hits = hits
  if (!hits.length) {
    return []
  }
  if (hits.length >= 2) {
    const ends = lineEnds(board, hits)
    if (ends.length) {
      return ends
    }
    const gaps = lineGaps(board, hits)
    if (gaps.length) {
      return gaps
    }
    return []
  }
  return adjacentUnshot(board, hits[0])
}

function huntShots(board) {
  const blocked = blockedByContact(board)
  const open = board.cells
    .filter((cell) => !cell.shot && !blocked.has(cell.index))
    .map((cell) => cell.index)
  const parity = open.filter((index) => (cellRow(index) + cellCol(index)) % 2 === 0)
  if (parity.length && Math.random() > HUNT_SLIP) {
    return parity
  }
  return open
}

export function createBotMemory() {
  return { hits: [] }
}

export function rememberBotShot(memory, index, result) {
  if (result === 'hit') {
    memory.hits.push(index)
  }
}

export function pickBotShot(board, memory) {
  const targets = targetShots(board, memory)
  if (targets.length) {
    return pick(targets)
  }
  const hunt = huntShots(board)
  return hunt.length ? pick(hunt) : -1
}
