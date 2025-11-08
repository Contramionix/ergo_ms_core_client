<template>
  <div class="assistant-typing">
    <div class="assistant-typing__avatar">
      <Bot :size="20" />
    </div>
    <div class="assistant-typing__dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
</template>

<script setup>
import { Bot } from 'lucide-vue-next'
</script>

<style scoped>
.assistant-typing {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}

.assistant-typing__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #dc3545, #c82333);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.assistant-typing__dots {
  display: flex;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.assistant-typing__dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6c757d;
  animation: typing 1.4s infinite;
}

.assistant-typing__dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.assistant-typing__dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}
</style>

