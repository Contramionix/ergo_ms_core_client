<template>
  <div class="assistant-button-container">
    <!-- Кнопка перехода в AI Hub -->
    <div
      v-if="!isActive"
      class="assistant-expand-button"
      @click="goToHub"
      title="Открыть AI Hub"
    >
      <ExternalLink :size="16" />
    </div>
    
    <!-- Основная кнопка -->
    <div
      class="assistant-button"
      :class="{ 'assistant-button--active': isActive, 'assistant-button--pulse': isPulsing }"
      @click="toggleChat"
    >
      <Bot :size="24" class="assistant-button__icon" />
      <div v-if="hasNewMessage" class="assistant-button__notification"></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Bot, ExternalLink } from 'lucide-vue-next'

const router = useRouter()
const emit = defineEmits(['toggle-chat'])

const isActive = ref(false)
const isPulsing = ref(false)
const hasNewMessage = ref(false)

const toggleChat = () => {
  isActive.value = !isActive.value
  emit('toggle-chat', isActive.value)
}

const goToHub = () => {
  router.push('/ai-assistant')
}

const startPulsing = () => {
  isPulsing.value = true
}

const stopPulsing = () => {
  isPulsing.value = false
}

const showNotification = () => {
  hasNewMessage.value = true
}

const hideNotification = () => {
  hasNewMessage.value = false
}

const setActive = (value) => {
  isActive.value = value
}

defineExpose({
  startPulsing,
  stopPulsing,
  showNotification,
  hideNotification,
  setActive,
})
</script>

<style scoped>
.assistant-button-container {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.assistant-expand-button {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #6c757d, #495057);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid #fff;
  color: white;
  opacity: 0;
  transform: scale(0.8) translateY(10px);
}

.assistant-button-container:hover .assistant-expand-button {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.assistant-expand-button:hover {
  background: linear-gradient(135deg, #495057, #343a40);
  transform: scale(1.1) translateY(0);
}

.assistant-button {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #dc3545, #c82333);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(220, 53, 69, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 3px solid #fff;
}

.assistant-button:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 8px 25px rgba(220, 53, 69, 0.4);
  background: linear-gradient(135deg, #e74c3c, #dc3545);
}

.assistant-button--active {
  background: linear-gradient(135deg, #28a745, #1e7e34);
  box-shadow: 0 4px 16px rgba(40, 167, 69, 0.3);
}

.assistant-button--pulse {
  animation: pulseRed 1.5s infinite;
}

.assistant-button__icon {
  color: white;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.assistant-button:hover .assistant-button__icon {
  transform: scale(1.15) rotate(5deg);
}

.assistant-button__notification {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #ffc107, #e0a800);
  border-radius: 50%;
  border: 2px solid white;
  animation: bounceNotification 2s infinite;
}

@keyframes pulseRed {
  0% {
    box-shadow:
      0 4px 16px rgba(220, 53, 69, 0.3),
      0 0 0 0 rgba(220, 53, 69, 0.7);
  }
  70% {
    box-shadow:
      0 4px 16px rgba(220, 53, 69, 0.3),
      0 0 0 15px rgba(220, 53, 69, 0);
  }
  100% {
    box-shadow:
      0 4px 16px rgba(220, 53, 69, 0.3),
      0 0 0 0 rgba(220, 53, 69, 0);
  }
}

@keyframes bounceNotification {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-4px) scale(1.1);
  }
  60% {
    transform: translateY(-2px);
  }
}

@media (max-width: 768px) {
  .assistant-button-container {
    bottom: 15px;
    left: 15px;
  }
  
  .assistant-button {
    width: 55px;
    height: 55px;
  }

  .assistant-button__icon {
    width: 22px;
    height: 22px;
  }
  
  .assistant-expand-button {
    width: 32px;
    height: 32px;
  }
}
</style>
