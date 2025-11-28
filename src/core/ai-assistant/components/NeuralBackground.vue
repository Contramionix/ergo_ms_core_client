<template>
  <div class="neural-background" ref="containerRef">
    <canvas ref="canvasRef" class="neural-canvas"></canvas>
    <div class="neural-overlay"></div>
    <div class="neural-grid"></div>
    <div class="neural-scanlines"></div>
    <div class="neural-vignette"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const containerRef = ref(null)
const canvasRef = ref(null)

let animationId = null
let nodes = []
let connections = []
let mouse = { x: 0, y: 0 }
let ctx = null
let width = 0
let height = 0

const props = defineProps({
  nodeCount: {
    type: Number,
    default: 50
  },
  connectionDistance: {
    type: Number,
    default: 150
  },
  nodeColor: {
    type: String,
    default: '#3ae8ff'
  },
  lineColor: {
    type: String,
    default: '#3ae8ff'
  }
})

class Node {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 0.5
    this.vy = (Math.random() - 0.5) * 0.5
    this.radius = Math.random() * 2 + 1
    this.pulsePhase = Math.random() * Math.PI * 2
    this.pulseSpeed = 0.02 + Math.random() * 0.02
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.pulsePhase += this.pulseSpeed

    // Отталкивание от границ
    if (this.x < 0 || this.x > width) this.vx *= -1
    if (this.y < 0 || this.y > height) this.vy *= -1

    // Притяжение к курсору
    const dx = mouse.x - this.x
    const dy = mouse.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 200 && dist > 0) {
      const force = (200 - dist) / 200 * 0.01
      this.vx += (dx / dist) * force
      this.vy += (dy / dist) * force
    }

    // Ограничение скорости
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (speed > 1) {
      this.vx = (this.vx / speed) * 1
      this.vy = (this.vy / speed) * 1
    }
  }

  draw() {
    const pulse = Math.sin(this.pulsePhase) * 0.5 + 0.5
    const r = this.radius + pulse * 1.5
    
    ctx.beginPath()
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
    ctx.fillStyle = props.nodeColor
    ctx.fill()

    // Glow effect
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 4)
    gradient.addColorStop(0, `${props.nodeColor}40`)
    gradient.addColorStop(1, 'transparent')
    ctx.beginPath()
    ctx.arc(this.x, this.y, r * 4, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()
  }
}

const initCanvas = () => {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  ctx = canvas.getContext('2d')
  width = container.offsetWidth
  height = container.offsetHeight
  canvas.width = width
  canvas.height = height

  // Создание узлов
  nodes = []
  for (let i = 0; i < props.nodeCount; i++) {
    nodes.push(new Node(
      Math.random() * width,
      Math.random() * height
    ))
  }
}

const drawConnections = () => {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x
      const dy = nodes[i].y - nodes[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < props.connectionDistance) {
        const opacity = (1 - dist / props.connectionDistance) * 0.6
        ctx.beginPath()
        ctx.moveTo(nodes[i].x, nodes[i].y)
        ctx.lineTo(nodes[j].x, nodes[j].y)
        ctx.strokeStyle = `${props.lineColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`
        ctx.lineWidth = opacity * 2
        ctx.stroke()
      }
    }
  }
}

const animate = () => {
  if (!ctx) return
  
  ctx.clearRect(0, 0, width, height)
  
  // Обновление и отрисовка
  nodes.forEach(node => {
    node.update()
    node.draw()
  })
  
  drawConnections()
  
  animationId = requestAnimationFrame(animate)
}

const handleResize = () => {
  initCanvas()
}

const handleMouseMove = (e) => {
  const rect = containerRef.value?.getBoundingClientRect()
  if (rect) {
    mouse.x = e.clientX - rect.left
    mouse.y = e.clientY - rect.top
  }
}

onMounted(() => {
  initCanvas()
  animate()
  
  window.addEventListener('resize', handleResize)
  containerRef.value?.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', handleResize)
  containerRef.value?.removeEventListener('mousemove', handleMouseMove)
})
</script>

<style lang="scss" scoped>
@import '../styles/variables';

.neural-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: all;
  z-index: 0;
}

.neural-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.neural-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    ellipse at 50% 0%,
    transparent 0%,
    rgba(5, 5, 8, 0.4) 50%,
    rgba(5, 5, 8, 0.8) 100%
  );
  pointer-events: none;
}

.neural-grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba($neon-cyan, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba($neon-cyan, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  pointer-events: none;
}

.neural-scanlines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.02) 2px,
    rgba(0, 0, 0, 0.02) 4px
  );
  pointer-events: none;
  animation: scanline-move 8s linear infinite;
}

.neural-vignette {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    ellipse at 50% 50%,
    transparent 0%,
    transparent 60%,
    rgba(5, 5, 8, 0.6) 100%
  );
  pointer-events: none;
}

@keyframes scanline-move {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 0 100%;
  }
}
</style>

