<template>
  <div class="neural-typing">
    <div class="typing-avatar">
      <Sparkles :size="18" />
      <div class="avatar-pulse"></div>
    </div>
    <div class="typing-content">
      <div class="typing-label">Neural обрабатывает</div>
      <div class="typing-wave">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Sparkles } from 'lucide-vue-next'
</script>

<style lang="scss" scoped>
$neon-cyan: #3ae8ff;
$neon-purple: #a855f7;
$dark-elevated: #13161f;

.neural-typing {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  margin-bottom: 1rem;
}

.typing-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, $neon-cyan, $neon-purple);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  box-shadow: 
    0 0 20px rgba($neon-cyan, 0.4),
    0 0 40px rgba($neon-cyan, 0.2);
}

.avatar-pulse {
  position: absolute;
  inset: -6px;
  border: 1px solid $neon-cyan;
  border-radius: 16px;
  animation: pulse-expand 2s ease-out infinite;
}

@keyframes pulse-expand {
  0% {
    transform: scale(0.8);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}

.typing-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.typing-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: #5a6882;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.typing-wave {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 20px;

  span {
    width: 3px;
    height: 8px;
    background: $neon-cyan;
    border-radius: 2px;
    animation: wave 1.2s ease-in-out infinite;
    box-shadow: 0 0 8px rgba($neon-cyan, 0.5);

    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.1s; }
    &:nth-child(3) { animation-delay: 0.2s; }
    &:nth-child(4) { animation-delay: 0.3s; }
    &:nth-child(5) { animation-delay: 0.4s; }
  }
}

@keyframes wave {
  0%, 60%, 100% {
    height: 8px;
    opacity: 0.5;
  }
  30% {
    height: 20px;
    opacity: 1;
  }
}
</style>
