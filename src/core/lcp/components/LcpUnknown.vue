<template>
  <div class="alert alert-warning">
    <strong>Неизвестный компонент:</strong> {{ component.type }}
  </div>
</template>

<script setup>
defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false }
})
</script>


