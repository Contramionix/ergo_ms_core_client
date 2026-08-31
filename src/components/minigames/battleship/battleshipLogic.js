export const BATTLESHIP_SIZE = 10
export const BATTLESHIP_FLEET = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1]
export const BATTLESHIP_COLS = 'АБВГДЕЖЗИК'

export function cellIndex(row, col) {
  return row * BATTLESHIP_SIZE + col
}

export function cellRow(index) {
  return Math.floor(index / BATTLESHIP_SIZE)
}

export function cellCol(index) {
  return index % BATTLESHIP_SIZE
}

export function inBounds(row, col) {
  return row >= 0 && col >= 0 && row < BATTLESHIP_SIZE && col < BATTLESHIP_SIZE
}

export function shipCells(row, col, length, horizontal) {
  const cells = []
  for (let i = 0; i < length; i += 1) {
    const r = horizontal ? row : row + i
    const c = horizontal ? col + i : col
    if (!inBounds(r, c)) {
      return null
    }
    cells.push(cellIndex(r, c))
  }
  return cells
}

function otherOccupied(board, ignoreShipId) {
  const occupied = new Set()
  for (const ship of board.ships) {
    if (ship.id === ignoreShipId || !ship.placed) {
      continue
    }
    for (const index of ship.cells) {
      occupied.add(index)
    }
  }
  return occupied
}

function touchesOtherShip(cells, occupied) {
  for (const index of cells) {
    const row = cellRow(index)
    const col = cellCol(index)
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        const r = row + dr
        const c = col + dc
        if (!inBounds(r, c)) {
          continue
        }
        const neighbor = cellIndex(r, c)
        if (cells.includes(neighbor)) {
          continue
        }
        if (occupied.has(neighbor)) {
          return true
        }
      }
    }
  }
  return false
}

export function canPlaceShip(board, cells, ignoreShipId = null) {
  if (!cells?.length) {
    return false
  }
  const occupied = otherOccupied(board, ignoreShipId)
  if (cells.some((index) => occupied.has(index))) {
    return false
  }
  return !touchesOtherShip(cells, occupied)
}

export function createEmptyBoard() {
  return {
    cells: Array.from({ length: BATTLESHIP_SIZE * BATTLESHIP_SIZE }, (_, index) => ({
      index,
      shipId: null,
      shot: false,
      hit: false,
    })),
    ships: BATTLESHIP_FLEET.map((length, id) => ({
      id,
      length,
      cells: [],
      hits: 0,
      sunk: false,
      horizontal: true,
      placed: false,
    })),
  }
}

function paintShips(board) {
  for (const cell of board.cells) {
    cell.shipId = null
  }
  for (const ship of board.ships) {
    if (!ship.placed) {
      continue
    }
    for (const index of ship.cells) {
      board.cells[index].shipId = ship.id
    }
  }
}

export function removeShip(board, shipId) {
  const ship = board.ships[shipId]
  if (!ship) {
    return
  }
  ship.cells = []
  ship.placed = false
  ship.hits = 0
  ship.sunk = false
  paintShips(board)
}

export function placeShip(board, shipId, row, col, horizontal) {
  const ship = board.ships[shipId]
  if (!ship) {
    return false
  }
  const cells = shipCells(row, col, ship.length, horizontal)
  if (!canPlaceShip(board, cells, shipId)) {
    return false
  }
  ship.cells = cells
  ship.horizontal = horizontal
  ship.placed = true
  paintShips(board)
  return true
}

export function rotateShip(board, shipId) {
  const ship = board.ships[shipId]
  if (!ship?.placed) {
    return false
  }
  const origin = ship.cells[0]
  return placeShip(board, shipId, cellRow(origin), cellCol(origin), !ship.horizontal)
}

export function allShipsPlaced(board) {
  return board.ships.every((ship) => ship.placed)
}

export function allShipsSunk(board) {
  return board.ships.every((ship) => ship.sunk)
}

export const FLEET_LENGTHS = [4, 3, 2, 1]

export function fleetGroups(board) {
  return FLEET_LENGTHS.map((length) => {
    const ships = board.ships.filter((ship) => ship.length === length)
    return {
      length,
      total: ships.length,
      alive: ships.filter((ship) => !ship.sunk).length,
    }
  })
}

export function placeFleetRandom(board) {
  for (let round = 0; round < 40; round += 1) {
    const next = createEmptyBoard()
    let ready = true
    for (const ship of next.ships) {
      let placed = false
      for (let attempt = 0; attempt < 160 && !placed; attempt += 1) {
        const horizontal = Math.random() < 0.5
        const row = Math.floor(Math.random() * BATTLESHIP_SIZE)
        const col = Math.floor(Math.random() * BATTLESHIP_SIZE)
        placed = placeShip(next, ship.id, row, col, horizontal)
      }
      if (!placed) {
        ready = false
        break
      }
    }
    if (!ready) {
      continue
    }
    board.cells = next.cells
    board.ships = next.ships
    return true
  }
  return false
}

export function createRandomBoard() {
  const board = createEmptyBoard()
  placeFleetRandom(board)
  return board
}

export function markHaloAroundShip(board, ship) {
  for (const index of ship.cells) {
    const row = cellRow(index)
    const col = cellCol(index)
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) {
          continue
        }
        const r = row + dr
        const c = col + dc
        if (!inBounds(r, c)) {
          continue
        }
        const neighbor = board.cells[cellIndex(r, c)]
        if (neighbor.shot || neighbor.shipId !== null) {
          continue
        }
        neighbor.shot = true
        neighbor.hit = false
      }
    }
  }
}

export function fireAt(board, index) {
  const cell = board.cells[index]
  if (!cell || cell.shot || allShipsSunk(board)) {
    return { result: 'idle' }
  }
  cell.shot = true
  if (cell.shipId === null) {
    return { result: 'miss' }
  }
  cell.hit = true
  const ship = board.ships[cell.shipId]
  ship.hits += 1
  if (ship.hits >= ship.length) {
    ship.sunk = true
    markHaloAroundShip(board, ship)
    return { result: allShipsSunk(board) ? 'fleet' : 'sunk', ship }
  }
  return { result: 'hit', ship }
}

export function adjacentUnshot(board, index) {
  const row = cellRow(index)
  const col = cellCol(index)
  const next = []
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const r = row + dr
    const c = col + dc
    if (!inBounds(r, c)) {
      continue
    }
    const neighbor = board.cells[cellIndex(r, c)]
    if (!neighbor.shot) {
      next.push(neighbor.index)
    }
  }
  return next
}

const DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]]

export function blockedByContact(board) {
  const blocked = new Set()
  for (const cell of board.cells) {
    if (!cell.hit || cell.shipId === null) {
      continue
    }
    const row = cellRow(cell.index)
    const col = cellCol(cell.index)
    const ship = board.ships[cell.shipId]
    for (const [dr, dc] of DIAGONAL) {
      const r = row + dr
      const c = col + dc
      if (inBounds(r, c)) {
        blocked.add(cellIndex(r, c))
      }
    }
    if (!ship.sunk) {
      continue
    }
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) {
          continue
        }
        const r = row + dr
        const c = col + dc
        if (inBounds(r, c)) {
          blocked.add(cellIndex(r, c))
        }
      }
    }
  }
  return blocked
}
