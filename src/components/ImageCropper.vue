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
  }
})

const containerRef = ref(null)
const canvasRef = ref(null)
const imageRef = ref(null)

// Состояние изображения
const imageLoaded = ref(false)
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
const dragStartCropWidth = ref(0)
const dragStartCropHeight = ref(0)
const resizeHandle = ref(null)

// Размеры контейнера
const containerWidth = ref(400)
const containerHeight = ref(400)

// Курсор
const currentCursor = ref('default')

let ctx = null
let animationFrameId = null
let resizeObserver = null
const requestSmoothDraw = () => {
  if (animationFrameId) return
  animationFrameId = requestAnimationFrame(() => {
    animationFrameId = null
    draw()
  })
}

// Загрузка изображения
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.value = img
      imageLoaded.value = true
      initializeCropArea()
      resolve(img)
    }
    img.onerror = reject
    img.src = src
  })
}

function getDisplayRect() {
  if (!imageRef.value) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const img = imageRef.value
  const scaleX = containerWidth.value / img.width
  const scaleY = containerHeight.value / img.height
  // Масштабируем чтобы изображение полностью помещалось с небольшим отступом
  const scale = Math.min(scaleX, scaleY) * 0.95

  const width = img.width * scale
  const height = img.height * scale
  const x = (containerWidth.value - width) / 2
  const y = (containerHeight.value - height) / 2

  return { x, y, width, height }
}

// Инициализация области кадрирования
function initializeCropArea() {
  if (!imageRef.value || !containerRef.value) return

  const container = containerRef.value
  const containerRect = container.getBoundingClientRect()
  
  containerWidth.value = containerRect.width
  containerHeight.value = containerRect.height

  const displayRect = getDisplayRect()

  // Вычисляем размер области кадрирования с учетом aspect ratio (80% от изображения)
  // и гарантируем что он не меньше минимального значения
  const maxCropSize = Math.min(displayRect.width, displayRect.height / props.aspectRatio)
  const desiredSize = maxCropSize * 0.8
  const cropSize = Math.max(desiredSize, props.minWidth, props.minHeight * props.aspectRatio)
  
  // Ограничиваем сверху, чтобы не выходить за границы изображения
  cropWidth.value = Math.min(cropSize, displayRect.width, displayRect.height * props.aspectRatio)
  cropHeight.value = cropWidth.value / props.aspectRatio
  
  // Центрируем область кадрирования
  cropX.value = displayRect.x + (displayRect.width - cropWidth.value) / 2
  cropY.value = displayRect.y + (displayRect.height - cropHeight.value) / 2

  requestSmoothDraw()
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
  const { x: displayX, y: displayY, width: displayWidth, height: displayHeight } = getDisplayRect()

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

  // Рисуем круг, вписанный в квадрат рамки
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(51, 153, 255, 0.7)'
  ctx.lineWidth = 2
  const radius = Math.min(cropWidth.value, cropHeight.value) / 2
  ctx.arc(
    cropX.value + cropWidth.value / 2,
    cropY.value + cropHeight.value / 2,
    radius,
    0,
    Math.PI * 2
  )
  ctx.stroke()

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

// Обновление курсора в зависимости от позиции
function updateCursor(x, y) {
  const handle = getResizeHandle(x, y)
  if (handle) {
    // Курсоры для углов
    const cursors = {
      'nw': 'nwse-resize',
      'ne': 'nesw-resize',
      'sw': 'nesw-resize',
      'se': 'nwse-resize'
    }
    currentCursor.value = cursors[handle]
  } else if (isPointInCropArea(x, y)) {
    currentCursor.value = 'move'
  } else {
    currentCursor.value = 'default'
  }
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
    dragStartCropWidth.value = cropWidth.value
    dragStartCropHeight.value = cropHeight.value
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

    // Используем начальные значения для вычислений
    const startX = dragStartCropX.value
    const startY = dragStartCropY.value
    const startW = dragStartCropWidth.value
    const startH = dragStartCropHeight.value

    let newX = startX
    let newY = startY
    let newWidth = startW
    let newHeight = startH

    // Вычисляем изменение размера на основе перемещения мыши
    // Используем среднее значение delta для плавного масштабирования с сохранением пропорций
    let sizeDelta = 0

    switch (resizeHandle.value) {
      case 'nw': // Верхний левый - уменьшение при движении вправо/вниз
        sizeDelta = (-deltaX - deltaY) / 2
        newWidth = startW + sizeDelta
        newHeight = newWidth / props.aspectRatio
        newX = startX + startW - newWidth
        newY = startY + startH - newHeight
        break
      case 'ne': // Верхний правый - увеличение при движении вправо, уменьшение при движении вниз
        sizeDelta = (deltaX - deltaY) / 2
        newWidth = startW + sizeDelta
        newHeight = newWidth / props.aspectRatio
        // X остаётся на месте (правый край двигается)
        newY = startY + startH - newHeight
        break
      case 'sw': // Нижний левый - уменьшение при движении вправо, увеличение при движении вниз
        sizeDelta = (-deltaX + deltaY) / 2
        newWidth = startW + sizeDelta
        newHeight = newWidth / props.aspectRatio
        newX = startX + startW - newWidth
        // Y остаётся на месте (нижний край двигается)
        break
      case 'se': // Нижний правый - увеличение при движении вправо/вниз
        sizeDelta = (deltaX + deltaY) / 2
        newWidth = startW + sizeDelta
        newHeight = newWidth / props.aspectRatio
        // X и Y остаются на месте
        break
    }

    // Минимальные размеры
    const minW = props.minWidth
    const minH = props.minHeight

    // Получаем границы изображения
    const { x: imgMinX, y: imgMinY, width: dispW, height: dispH } = getDisplayRect()
    const imgMaxX = imgMinX + dispW
    const imgMaxY = imgMinY + dispH

    // Ограничиваем минимальный размер
    if (newWidth < minW) {
      const oldWidth = newWidth
      newWidth = minW
      newHeight = newWidth / props.aspectRatio
      // Корректируем позицию в зависимости от угла
      if (resizeHandle.value === 'nw' || resizeHandle.value === 'sw') {
        newX = newX - (newWidth - oldWidth)
      }
      if (resizeHandle.value === 'nw' || resizeHandle.value === 'ne') {
        newY = newY - (newHeight - (oldWidth / props.aspectRatio))
      }
    }

    // Ограничиваем по границам изображения
    // Левая граница
    if (newX < imgMinX) {
      if (resizeHandle.value === 'nw' || resizeHandle.value === 'sw') {
        const overflow = imgMinX - newX
        newX = imgMinX
        newWidth = newWidth - overflow
        newHeight = newWidth / props.aspectRatio
        if (resizeHandle.value === 'nw') {
          newY = startY + startH - newHeight
        }
      }
    }

    // Верхняя граница
    if (newY < imgMinY) {
      if (resizeHandle.value === 'nw' || resizeHandle.value === 'ne') {
        const overflow = imgMinY - newY
        newY = imgMinY
        newHeight = newHeight - overflow
        newWidth = newHeight * props.aspectRatio
        if (resizeHandle.value === 'nw') {
          newX = startX + startW - newWidth
        }
      }
    }

    // Правая граница
    if (newX + newWidth > imgMaxX) {
      if (resizeHandle.value === 'ne' || resizeHandle.value === 'se') {
        newWidth = imgMaxX - newX
        newHeight = newWidth / props.aspectRatio
        if (resizeHandle.value === 'ne') {
          newY = startY + startH - newHeight
        }
      }
    }

    // Нижняя граница
    if (newY + newHeight > imgMaxY) {
      if (resizeHandle.value === 'sw' || resizeHandle.value === 'se') {
        newHeight = imgMaxY - newY
        newWidth = newHeight * props.aspectRatio
        if (resizeHandle.value === 'sw') {
          newX = startX + startW - newWidth
        }
      }
    }

    // Финальная проверка минимальных размеров
    if (newWidth >= minW && newHeight >= minH) {
      cropX.value = newX
      cropY.value = newY
      cropWidth.value = newWidth
      cropHeight.value = newHeight
    }

    requestSmoothDraw()
  } else if (isDragging.value) {
    const deltaX = x - dragStartX.value
    const deltaY = y - dragStartY.value

    let newX = dragStartCropX.value + deltaX
    let newY = dragStartCropY.value + deltaY
    const { x: minX, y: minY, width: dispW, height: dispH } = getDisplayRect()
    const maxX = minX + dispW - cropWidth.value
    const maxY = minY + dispH - cropHeight.value

    // Ограничиваем перемещение границами изображения
    newX = Math.max(minX, Math.min(newX, maxX))
    newY = Math.max(minY, Math.min(newY, maxY))

    cropX.value = newX
    cropY.value = newY

    requestSmoothDraw()
  } else {
    // Обновляем курсор когда не перетаскиваем
    updateCursor(x, y)
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

  window.addEventListener('resize', handleResize)
  
  // Наблюдаем за изменением размеров контейнера
  if (containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0 && (width !== containerWidth.value || height !== containerHeight.value)) {
          containerWidth.value = width
          containerHeight.value = height
          initializeCropArea()
        }
      }
    })
    resizeObserver.observe(containerRef.value)
  }
  
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
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
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

  // Используем те же координаты что и при отображении
  const displayRect = getDisplayRect()
  const img = imageRef.value
  
  // Вычисляем масштаб отображения
  const scale = displayRect.width / img.width

  // Вычисляем координаты области кадрирования относительно изображения
  const sourceX = (cropX.value - displayRect.x) / scale
  const sourceY = (cropY.value - displayRect.y) / scale
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
  requestSmoothDraw()
}

// Масштабирование
function scale(x, y) {
  imageScaleX.value *= x
  imageScaleY.value *= y
  requestSmoothDraw()
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
  requestSmoothDraw()
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
      :style="{ display: 'block', width: '100%', height: '100%', cursor: currentCursor }"
    ></canvas>
  </div>
</template>

<style scoped lang="scss">
.image-cropper-container {
  width: 100%;
  max-width: 100%;
  height: 100%;
  min-height: 250px;
  background-color: var(--color-secondary-background);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  border-radius: 8px;
  
  .cropper-canvas {
    width: 100%;
    height: 100%;
    touch-action: none;
    user-select: none;
  }
}
</style>