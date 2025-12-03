<template>
  <div class="styles-editor">
    <!-- CSS классы -->
    <div class="lcp-properties__field">
      <label class="lcp-properties__field-label">CSS классы</label>
      <input 
        v-model="classesString" 
        type="text" 
        class="form-control form-control-sm"
        placeholder="class1 class2..."
        @input="updateClasses"
      >
    </div>

    <!-- Отступы -->
    <div class="lcp-properties__field">
      <label class="lcp-properties__field-label">Margin</label>
      <div class="row g-1">
        <div class="col-3">
          <select v-model="localStyles.marginTop" class="form-select form-select-sm" @change="emitStyles">
            <option value="">-</option>
            <option v-for="i in 6" :key="i" :value="`mt-${i-1}`">{{ i-1 }}</option>
          </select>
        </div>
        <div class="col-3">
          <select v-model="localStyles.marginRight" class="form-select form-select-sm" @change="emitStyles">
            <option value="">-</option>
            <option v-for="i in 6" :key="i" :value="`me-${i-1}`">{{ i-1 }}</option>
          </select>
        </div>
        <div class="col-3">
          <select v-model="localStyles.marginBottom" class="form-select form-select-sm" @change="emitStyles">
            <option value="">-</option>
            <option v-for="i in 6" :key="i" :value="`mb-${i-1}`">{{ i-1 }}</option>
          </select>
        </div>
        <div class="col-3">
          <select v-model="localStyles.marginLeft" class="form-select form-select-sm" @change="emitStyles">
            <option value="">-</option>
            <option v-for="i in 6" :key="i" :value="`ms-${i-1}`">{{ i-1 }}</option>
          </select>
        </div>
      </div>
      <small class="text-muted">Top, Right, Bottom, Left</small>
    </div>

    <div class="lcp-properties__field">
      <label class="lcp-properties__field-label">Padding</label>
      <div class="row g-1">
        <div class="col-3">
          <select v-model="localStyles.paddingTop" class="form-select form-select-sm" @change="emitStyles">
            <option value="">-</option>
            <option v-for="i in 6" :key="i" :value="`pt-${i-1}`">{{ i-1 }}</option>
          </select>
        </div>
        <div class="col-3">
          <select v-model="localStyles.paddingRight" class="form-select form-select-sm" @change="emitStyles">
            <option value="">-</option>
            <option v-for="i in 6" :key="i" :value="`pe-${i-1}`">{{ i-1 }}</option>
          </select>
        </div>
        <div class="col-3">
          <select v-model="localStyles.paddingBottom" class="form-select form-select-sm" @change="emitStyles">
            <option value="">-</option>
            <option v-for="i in 6" :key="i" :value="`pb-${i-1}`">{{ i-1 }}</option>
          </select>
        </div>
        <div class="col-3">
          <select v-model="localStyles.paddingLeft" class="form-select form-select-sm" @change="emitStyles">
            <option value="">-</option>
            <option v-for="i in 6" :key="i" :value="`ps-${i-1}`">{{ i-1 }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Цвет фона -->
    <div class="lcp-properties__field">
      <label class="lcp-properties__field-label">Фон</label>
      <select v-model="localStyles.background" class="form-select form-select-sm" @change="emitStyles">
        <option value="">Нет</option>
        <option value="bg-primary">Primary</option>
        <option value="bg-secondary">Secondary</option>
        <option value="bg-success">Success</option>
        <option value="bg-danger">Danger</option>
        <option value="bg-warning">Warning</option>
        <option value="bg-info">Info</option>
        <option value="bg-light">Light</option>
        <option value="bg-dark">Dark</option>
        <option value="bg-white">White</option>
      </select>
    </div>

    <!-- Цвет текста -->
    <div class="lcp-properties__field">
      <label class="lcp-properties__field-label">Цвет текста</label>
      <select v-model="localStyles.textColor" class="form-select form-select-sm" @change="emitStyles">
        <option value="">Авто</option>
        <option value="text-primary">Primary</option>
        <option value="text-secondary">Secondary</option>
        <option value="text-success">Success</option>
        <option value="text-danger">Danger</option>
        <option value="text-warning">Warning</option>
        <option value="text-info">Info</option>
        <option value="text-light">Light</option>
        <option value="text-dark">Dark</option>
        <option value="text-muted">Muted</option>
        <option value="text-white">White</option>
      </select>
    </div>

    <!-- Выравнивание -->
    <div class="lcp-properties__field">
      <label class="lcp-properties__field-label">Выравнивание текста</label>
      <select v-model="localStyles.textAlign" class="form-select form-select-sm" @change="emitStyles">
        <option value="">Авто</option>
        <option value="text-start">Слева</option>
        <option value="text-center">По центру</option>
        <option value="text-end">Справа</option>
      </select>
    </div>

    <!-- Ширина -->
    <div class="lcp-properties__field">
      <label class="lcp-properties__field-label">Ширина</label>
      <select v-model="localStyles.width" class="form-select form-select-sm" @change="emitStyles">
        <option value="">Авто</option>
        <option value="w-25">25%</option>
        <option value="w-50">50%</option>
        <option value="w-75">75%</option>
        <option value="w-100">100%</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  styles: { type: Object, default: () => ({}) },
  classes: { type: Array, default: () => [] }
})

const emit = defineEmits(['update-styles', 'update-classes'])

const localStyles = ref({ ...props.styles })
const classesString = ref(props.classes.join(' '))

watch(() => props.styles, (newStyles) => {
  localStyles.value = { ...newStyles }
}, { deep: true })

watch(() => props.classes, (newClasses) => {
  classesString.value = newClasses.join(' ')
}, { deep: true })

function emitStyles() {
  emit('update-styles', { ...localStyles.value })
}

function updateClasses() {
  const classes = classesString.value.split(' ').filter(c => c.trim())
  emit('update-classes', classes)
}
</script>


