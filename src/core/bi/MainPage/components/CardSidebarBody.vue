<script setup>

const props = defineProps({
  icon: { type: [Object, String, Function], required: true },
  icolor: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  targetPage: { type: String, required: true },
  clickable: { type: Boolean, default: false },
  clickRoute: { type: String, default: null }
})

const emit = defineEmits(['open', 'cardClick'])

const triggerSidebar = (event) => {
  event.stopPropagation()
  emit('open', props.targetPage)
}

const handleCardClick = () => {
  if (props.clickable) {
    emit('cardClick', props.clickRoute)
  }
}
</script>

<template>
  <div 
    class="card-body" 
    :class="{ 'clickable': clickable }"
    @click="handleCardClick"
  >
    <div class="card-icon">
      <component class="mb-3 card-icon-accent" :style="{ color: icolor }" :is="icon" :size="35" />
    </div>
    <div class="card-title">
      <h5 class="mb-3">{{ title }}</h5>
    </div>
    <div class="card-description">
      <p class="mb-3">{{ description }}</p>
    </div>
    <div class="card-button">
      <button class="btn btn-primary" @click="triggerSidebar">Открыть</button>
    </div>
  </div>
</template>

<style scoped>
.card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 12pt;
  box-sizing: border-box;
  transition: all 0.3s ease;
  cursor: default;
}

.card-body.clickable {
  cursor: pointer;
}

.card-body.clickable:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.card-icon{
  display: flex;
  justify-content: center;
  align-items: center;
}
.card-description {
  flex: 1 1 auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
}
.card-button {
  display: flex;
  justify-content: center;
}
</style>
