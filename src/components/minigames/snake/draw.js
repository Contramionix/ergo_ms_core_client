import { SNAKE_COLS, SNAKE_ROWS, visualSnake } from './world.js'

const TONE = {
  bg: '#f4efe4',
  board: '#e7dfd0',
  line: 'rgba(92, 78, 58, 0.12)',
  snake: '#22c55e',
  snakeDark: '#15803d',
  head: '#166534',
  food: '#eab308',
  foodEdge: '#a16207',
  dead: '#78716c',
  deadHead: '#44403c',
}

function layout(width, height) {
  const pad = 10
  const cell = Math.floor(Math.min((width - pad * 2) / SNAKE_COLS, (height - pad * 2) / SNAKE_ROWS))
  const gridW = cell * SNAKE_COLS
  const gridH = cell * SNAKE_ROWS
  return {
    cell,
    gridW,
    gridH,
    originX: (width - gridW) / 2,
    originY: (height - gridH) / 2,
  }
}

function cellBox(col, row, box) {
  return {
    x: box.originX + col * box.cell,
    y: box.originY + row * box.cell,
    s: box.cell,
  }
}

function roundRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function drawSnakeWorld(ctx, state, width, height) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = TONE.bg
  ctx.fillRect(0, 0, width, height)

  const box = layout(width, height)
  if (box.cell < 4) {
    return
  }

  ctx.fillStyle = TONE.board
  roundRect(ctx, box.originX - 4, box.originY - 4, box.gridW + 8, box.gridH + 8, 12)
  ctx.fill()

  ctx.strokeStyle = TONE.line
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let col = 1; col < SNAKE_COLS; col += 1) {
    const x = Math.round(box.originX + col * box.cell) + 0.5
    ctx.moveTo(x, box.originY)
    ctx.lineTo(x, box.originY + box.gridH)
  }
  for (let row = 1; row < SNAKE_ROWS; row += 1) {
    const y = Math.round(box.originY + row * box.cell) + 0.5
    ctx.moveTo(box.originX, y)
    ctx.lineTo(box.originX + box.gridW, y)
  }
  ctx.stroke()

  if (state.food) {
    const food = cellBox(state.food.c, state.food.r, box)
    const inset = Math.max(2, box.cell * 0.22)
    ctx.fillStyle = TONE.food
    roundRect(ctx, food.x + inset, food.y + inset, food.s - inset * 2, food.s - inset * 2, 6)
    ctx.fill()
    ctx.strokeStyle = TONE.foodEdge
    ctx.stroke()
  }

  const parts = visualSnake(state)
  const inset = Math.max(1.5, box.cell * 0.12)
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i]
    const tile = cellBox(part.c, part.r, box)
    const head = i === 0
    ctx.fillStyle = state.alive
      ? head
        ? TONE.head
        : i % 2 === 0
          ? TONE.snakeDark
          : TONE.snake
      : head
        ? TONE.deadHead
        : TONE.dead
    roundRect(
      ctx,
      tile.x + inset,
      tile.y + inset,
      tile.s - inset * 2,
      tile.s - inset * 2,
      head ? 7 : 5,
    )
    ctx.fill()
  }
}
