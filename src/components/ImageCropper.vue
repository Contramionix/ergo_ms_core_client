<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  imageSrc: {
    type: String,
    required: true
  },
  aspectRatio: {
    type: Number,
    default: 1 // Квадратное кадрирование для аватара
  },
  minWidth: {
    type: Number,
    default: 200
  },
  minHeight: {
    type: Number,
    default: 200
  },
  viewMode: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['crop', 'cancel'])

const containerRef = ref(null)
const canvasRef = ref(null)
const imageRef = ref(null)

// Состояние изображения
const imageLoaded = ref(false)
const imageWidth = ref(0)
const imageHeight = ref(0)
const imageRotation = ref(0)
const imageScaleX = ref(1)
const imageScaleY = ref(1)

// Состояние области кадрирования
const cropX = ref(0)
const cropY = ref(0)
const cropWidth = ref(0)
const cropHeight = ref(0)
const isDragging = ref(false)
const isResizing = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartCropX = ref(0)
const dragStartCropY = ref(0)
const resizeHandle = ref(null)

// Размеры контейнера
const containerWidth = ref(400)
const containerHeight = ref(400)

let ctx = null
let animationFrameId = null

// Загрузка изображения
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.value = img
      imageWidth.value = img.width
      imageHeight.value = img.height
      imageLoaded.value = true
      initializeCropArea()
      resolve(img)
    }
    img.onerror = reject
    img.src = src
  })
}

// Инициализация области кадрирования
function initializeCropArea() {
  if (!imageRef.value || !containerRef.value) return

  const img = imageRef.value
  const container = containerRef.value
  const containerRect = container.getBoundingClientRect()
  
  containerWidth.value = containerRect.width
  containerHeight.value = containerRect.height

  // Вычисляем масштаб для отображения изображения
  const scaleX = containerWidth.value / img.width
  const scaleY = containerHeight.value / img.height
  const scale = Math.min(scaleX, scaleY) * 0.8 // 80% от контейнера

  // Вычисляем размер области кадрирования с учетом aspect ratio
  const cropSize = Math.min(containerWidth.value * 0.6, containerHeight.value * 0.6)
  
  cropWidth.value = cropSize
  cropHeight.value = cropSize / props.aspectRatio
  
  // Центрируем область кадрирования
  cropX.value = (containerWidth.value - cropWidth.value) / 2
  cropY.value = (containerHeight.value - cropHeight.value) / 2

  draw()
}

// Отрисовка
function draw() {
  if (!canvasRef.value || !imageRef.value || !imageLoaded.value) return

  ctx = canvasRef.value.getContext('2d')
  const canvas = canvasRef.value
  const img = imageRef.value

  // Очищаем canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Устанавливаем размеры canvas
  canvas.width = containerWidth.value
  canvas.height = containerHeight.value

  // Вычисляем масштаб для отображения изображения
  const scaleX = containerWidth.value / img.width
  const scaleY = containerHeight.value / img.height
  const scale = Math.min(scaleX, scaleY) * 0.8

  const displayWidth = img.width * scale
  const displayHeight = img.height * scale
  const displayX = (containerWidth.value - displayWidth) / 2
  const displayY = (containerHeight.value - displayHeight) / 2

  // Сохраняем контекст
  ctx.save()

  // Применяем трансформации (поворот, отражение)
  ctx.translate(containerWidth.value / 2, containerHeight.value / 2)
  ctx.rotate((imageRotation.value * Math.PI) / 180)
  ctx.scale(imageScaleX.value, imageScaleY.value)
  ctx.translate(-containerWidth.value / 2, -containerHeight.value / 2)

  // Рисуем изображение
  ctx.drawImage(img, displayX, displayY, displayWidth, displayHeight)

  // Восстанавливаем контекст
  ctx.restore()

  // Рисуем затемнение вне области кадрирования
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Вырезаем область кадрирования
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillRect(cropX.value, cropY.value, cropWidth.value, cropHeight.value)
  ctx.globalCompositeOperation = 'source-over'

  // Рисуем рамку кадрирования
  ctx.strokeStyle = '#39f'
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.strokeRect(cropX.value, cropY.value, cropWidth.value, cropHeight.value)

  // Рисуем углы для изменения размера
  const cornerSize = 10
  ctx.fillStyle = '#39f'
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2

  // Углы
  const corners = [
    [cropX.value, cropY.value], // Верхний левый
    [cropX.value + cropWidth.value, cropY.value], // Верхний правый
    [cropX.value, cropY.value + cropHeight.value], // Нижний левый
    [cropX.value + cropWidth.value, cropY.value + cropHeight.value] // Нижний правый
  ]

  corners.forEach(([x, y]) => {
    ctx.fillRect(x - cornerSize / 2, y - cornerSize / 2, cornerSize, cornerSize)
    ctx.strokeRect(x - cornerSize / 2, y - cornerSize / 2, cornerSize, cornerSize)
  })

  // Рисуем направляющие линии
  ctx.strokeStyle = 'rgba(51, 153, 255, 0.5)'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])

  // Вертикальные линии
  ctx.beginPath()
  ctx.moveTo(cropX.value + cropWidth.value / 3, cropY.value)
  ctx.lineTo(cropX.value + cropWidth.value / 3, cropY.value + cropHeight.value)
  ctx.moveTo(cropX.value + (cropWidth.value * 2) / 3, cropY.value)
  ctx.lineTo(cropX.value + (cropWidth.value * 2) / 3, cropY.value + cropHeight.value)
  ctx.stroke()

  // Горизонтальные линии
  ctx.beginPath()
  ctx.moveTo(cropX.value, cropY.value + cropHeight.value / 3)
  ctx.lineTo(cropX.value + cropWidth.value, cropY.value + cropHeight.value / 3)
  ctx.moveTo(cropX.value, cropY.value + (cropHeight.value * 2) / 3)
  ctx.lineTo(cropX.value + cropWidth.value, cropY.value + (cropHeight.value * 2) / 3)
  ctx.stroke()
}

// Проверка, находится ли точка в области кадрирования
function isPointInCropArea(x, y) {
  return (
    x >= cropX.value &&
    x <= cropX.value + cropWidth.value &&
    y >= cropY.value &&
    y <= cropY.value + cropHeight.value
  )
}

// Проверка, находится ли точка в углу для изменения размера
function getResizeHandle(x, y) {
  const cornerSize = 15
  const corners = [
    { x: cropX.value, y: cropY.value, handle: 'nw' }, // Верхний левый
    { x: cropX.value + cropWidth.value, y: cropY.value, handle: 'ne' }, // Верхний правый
    { x: cropX.value, y: cropY.value + cropHeight.value, handle: 'sw' }, // Нижний левый
    { x: cropX.value + cropWidth.value, y: cropY.value + cropHeight.value, handle: 'se' } // Нижний правый
  ]

  for (const corner of corners) {
    if (
      Math.abs(x - corner.x) < cornerSize &&
      Math.abs(y - corner.y) < cornerSize
    ) {
      return corner.handle
    }
  }
  return null
}

// Обработка начала перетаскивания
function handleMouseDown(event) {
  if (!imageLoaded.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const handle = getResizeHandle(x, y)
  if (handle) {
    isResizing.value = true
    resizeHandle.value = handle
    dragStartX.value = x
    dragStartY.value = y
    dragStartCropX.value = cropX.value
    dragStartCropY.value = cropY.value
  } else if (isPointInCropArea(x, y)) {
    isDragging.value = true
    dragStartX.value = x
    dragStartY.value = y
    dragStartCropX.value = cropX.value
    dragStartCropY.value = cropY.value
  }
}

// Обработка перемещения мыши
function handleMouseMove(event) {
  if (!imageLoaded.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  if (isResizing.value && resizeHandle.value) {
    const deltaX = x - dragStartX.value
    const deltaY = y - dragStartY.value

    let newX = dragStartCropX.value
    let newY = dragStartCropY.value
    let newWidth = cropWidth.value
    let newHeight = cropHeight.value

    switch (resizeHandle.value) {
      case 'nw': // Верхний левый
        newX = Math.max(0, dragStartCropX.value + deltaX)
        newY = Math.max(0, dragStartCropY.value + deltaY)
        newWidth = cropWidth.value - deltaX
        newHeight = cropHeight.value - deltaY
        break
      case 'ne': // Верхний правый
        newY = Math.max(0, dragStartCropY.value + deltaY)
        newWidth = cropWidth.value + deltaX
        newHeight = cropHeight.value - deltaY
        break
      case 'sw': // Нижний левый
        newX = Math.max(0, dragStartCropX.value + deltaX)
        newWidth = cropWidth.value - deltaX
        newHeight = cropHeight.value + deltaY
        break
      case 'se': // Нижний правый
        newWidth = cropWidth.value + deltaX
        newHeight = cropHeight.value + deltaY
        break
    }

    // Применяем aspect ratio
    if (newWidth / newHeight !== props.aspectRatio) {
      newHeight = newWidth / props.aspectRatio
    }

    // Проверяем минимальные размеры
    if (newWidth >= props.minWidth && newHeight >= props.minHeight) {
      // Проверяем границы
      if (newX + newWidth <= containerWidth.value && newY + newHeight <= containerHeight.value) {
        cropX.value = newX
        cropY.value = newY
        cropWidth.value = newWidth
        cropHeight.value = newHeight
      }
    }

    draw()
  } else if (isDragging.value) {
    const deltaX = x - dragStartX.value
    const deltaY = y - dragStartY.value

    let newX = dragStartCropX.value + deltaX
    let newY = dragStartCropY.value + deltaY

    // Ограничиваем перемещение границами контейнера
    newX = Math.max(0, Math.min(newX, containerWidth.value - cropWidth.value))
    newY = Math.max(0, Math.min(newY, containerHeight.value - cropHeight.value))

    cropX.value = newX
    cropY.value = newY

    draw()
  }
}

// Обработка отпускания мыши
function handleMouseUp() {
  isDragging.value = false
  isResizing.value = false
  resizeHandle.value = null
}

// Обработка изменения размера окна
function handleResize() {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    containerWidth.value = rect.width
    containerHeight.value = rect.height
    initializeCropArea()
  }
}

// Инициализация
onMounted(async () => {
  await nextTick()
  if (props.imageSrc) {
    await loadImage(props.imageSrc)
  }

  window.addEventListener('resize', handleResize)
  if (canvasRef.value) {
    canvasRef.value.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Обработка touch событий для мобильных устройств
  if (canvasRef.value) {
    canvasRef.value.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      handleMouseDown({
        clientX: touch.clientX,
        clientY: touch.clientY
      })
    })

    window.addEventListener('touchmove', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      handleMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY
      })
    })

    window.addEventListener('touchend', (e) => {
      e.preventDefault()
      handleMouseUp()
    })
  }
})

// Обновление при изменении изображения
watch(() => props.imageSrc, async (newSrc) => {
  if (newSrc) {
    await loadImage(newSrc)
  }
}, { immediate: true })

// Очистка
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})

// Получение обрезанного canvas
function getCroppedCanvas(options = {}) {
  if (!imageRef.value || !imageLoaded.value) {
    return null
  }

  const defaultOptions = {
    width: 400,
    height: 400,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
    fillColor: '#fff',
    ...options
  }

  // Создаем новый canvas для результата
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = defaultOptions.width
  outputCanvas.height = defaultOptions.height
  const outputCtx = outputCanvas.getContext('2d')

  // Настраиваем сглаживание
  outputCtx.imageSmoothingEnabled = defaultOptions.imageSmoothingEnabled
  outputCtx.imageSmoothingQuality = defaultOptions.imageSmoothingQuality

  // Вычисляем реальные координаты области кадрирования на исходном изображении
  const img = imageRef.value
  const scaleX = containerWidth.value / img.width
  const scaleY = containerHeight.value / img.height
  const scale = Math.min(scaleX, scaleY) * 0.8

  const displayWidth = img.width * scale
  const displayHeight = img.height * scale
  const displayX = (containerWidth.value - displayWidth) / 2
  const displayY = (containerHeight.value - displayHeight) / 2

  // Вычисляем координаты области кадрирования относительно изображения
  const sourceX = (cropX.value - displayX) / scale
  const sourceY = (cropY.value - displayY) / scale
  const sourceWidth = cropWidth.value / scale
  const sourceHeight = cropHeight.value / scale

  // Создаем временный canvas для трансформаций
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = img.width
  tempCanvas.height = img.height
  const tempCtx = tempCanvas.getContext('2d')

  // Применяем трансформации
  tempCtx.save()
  tempCtx.translate(img.width / 2, img.height / 2)
  tempCtx.rotate((imageRotation.value * Math.PI) / 180)
  tempCtx.scale(imageScaleX.value, imageScaleY.value)
  tempCtx.translate(-img.width / 2, -img.height / 2)
  tempCtx.drawImage(img, 0, 0)
  tempCtx.restore()

  // Вырезаем область кадрирования
  outputCtx.fillStyle = defaultOptions.fillColor
  outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height)
  outputCtx.drawImage(
    tempCanvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputCanvas.width,
    outputCanvas.height
  )

  return outputCanvas
}

// Конвертация canvas в Blob
function canvasToBlob(canvas, mimeType = 'image/jpeg', quality = 0.9) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob)
    }, mimeType, quality)
  })
}

// Экспорт функции для получения обрезанного файла
async function getCroppedFile(mimeType = 'image/jpeg', quality = 0.9) {
  const canvas = getCroppedCanvas()
  if (!canvas) {
    return null
  }

  const blob = await canvasToBlob(canvas, mimeType, quality)
  const file = new File([blob], 'avatar.jpg', { type: mimeType })
  return file
}

// Поворот изображения
function rotate(degrees = 90) {
  imageRotation.value = (imageRotation.value + degrees) % 360
  draw()
}

// Масштабирование
function scale(x, y) {
  imageScaleX.value *= x
  imageScaleY.value *= y
  draw()
}

// Сброс
function reset() {
  imageRotation.value = 0
  imageScaleX.value = 1
  imageScaleY.value = 1
  initializeCropArea()
}

// Зеркальное отражение
function flip(horizontal = true) {
  if (horizontal) {
    imageScaleX.value *= -1
  } else {
    imageScaleY.value *= -1
  }
  draw()
}

// Экспорт методов
defineExpose({
  getCroppedCanvas,
  getCroppedFile,
  rotate,
  scale,
  reset,
  flip
})
</script>

<template>
  <div ref="containerRef" class="image-cropper-container">
    <canvas 
      ref="canvasRef" 
      class="cropper-canvas"
      style="display: block; width: 100%; height: 100%; cursor: move;"
    ></canvas>
  </div>
</template>

<style scoped lang="scss">
.image-cropper-container {
  width: 100%;
  max-width: 100%;
  height: 400px;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  border-radius: 8px;
  
  @media (max-width: 768px) {
    height: 300px;
  }
  
  .cropper-canvas {
    width: 100%;
    height: 100%;
    touch-action: none;
    user-select: none;
  }
}
</style>