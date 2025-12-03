<template>
  <div class="props-editor">
    <!-- Текстовые свойства -->
    <div v-if="hasTextProp" class="lcp-properties__field">
      <label class="lcp-properties__field-label">Текст</label>
      <textarea 
        v-model="localProps.text" 
        class="form-control form-control-sm"
        rows="2"
        @input="emitUpdate"
      ></textarea>
    </div>

    <!-- Заголовок -->
    <div v-if="hasTitleProp" class="lcp-properties__field">
      <label class="lcp-properties__field-label">Заголовок</label>
      <input 
        v-model="localProps.title" 
        type="text" 
        class="form-control form-control-sm"
        @input="emitUpdate"
      >
    </div>

    <!-- Уровень заголовка -->
    <div v-if="componentType === 'Heading'" class="lcp-properties__field">
      <label class="lcp-properties__field-label">Уровень</label>
      <select v-model="localProps.level" class="form-select form-select-sm" @change="emitUpdate">
        <option :value="1">H1</option>
        <option :value="2">H2</option>
        <option :value="3">H3</option>
        <option :value="4">H4</option>
        <option :value="5">H5</option>
        <option :value="6">H6</option>
      </select>
    </div>

    <!-- Изображение -->
    <div v-if="componentType === 'Image'" class="lcp-properties__field">
      <label class="lcp-properties__field-label">URL изображения</label>
      <input 
        v-model="localProps.src" 
        type="text" 
        class="form-control form-control-sm"
        placeholder="https://..."
        @input="emitUpdate"
      >
    </div>

    <div v-if="componentType === 'Image'" class="lcp-properties__field">
      <label class="lcp-properties__field-label">Alt текст</label>
      <input 
        v-model="localProps.alt" 
        type="text" 
        class="form-control form-control-sm"
        @input="emitUpdate"
      >
    </div>

    <!-- Кнопка -->
    <div v-if="componentType === 'Button'" class="lcp-properties__field">
      <label class="lcp-properties__field-label">Вариант</label>
      <select v-model="localProps.variant" class="form-select form-select-sm" @change="emitUpdate">
        <option value="primary">Primary</option>
        <option value="secondary">Secondary</option>
        <option value="success">Success</option>
        <option value="danger">Danger</option>
        <option value="warning">Warning</option>
        <option value="info">Info</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="link">Link</option>
        <option value="outline-primary">Outline Primary</option>
        <option value="outline-secondary">Outline Secondary</option>
      </select>
    </div>

    <!-- Ссылка -->
    <div v-if="hasLinkProp" class="lcp-properties__field">
      <label class="lcp-properties__field-label">Ссылка</label>
      <input 
        v-model="localProps.href" 
        type="text" 
        class="form-control form-control-sm"
        placeholder="/path или https://..."
        @input="emitUpdate"
      >
    </div>

    <!-- Иконка -->
    <div v-if="hasIconProp" class="lcp-properties__field">
      <label class="lcp-properties__field-label">Иконка</label>
      <input 
        v-model="localProps.icon" 
        type="text" 
        class="form-control form-control-sm"
        placeholder="Home, Settings, User..."
        @input="emitUpdate"
      >
    </div>

    <!-- Input специфичные -->
    <template v-if="componentType === 'Input'">
      <div class="lcp-properties__field">
        <label class="lcp-properties__field-label">Placeholder</label>
        <input 
          v-model="localProps.placeholder" 
          type="text" 
          class="form-control form-control-sm"
          @input="emitUpdate"
        >
      </div>
      <div class="lcp-properties__field">
        <label class="lcp-properties__field-label">Тип</label>
        <select v-model="localProps.type" class="form-select form-select-sm" @change="emitUpdate">
          <option value="text">Текст</option>
          <option value="number">Число</option>
          <option value="email">Email</option>
          <option value="password">Пароль</option>
          <option value="tel">Телефон</option>
          <option value="url">URL</option>
        </select>
      </div>
    </template>

    <!-- DataTable специфичные -->
    <template v-if="componentType === 'DataTable'">
      <div class="lcp-properties__field">
        <label class="lcp-properties__field-label">Источник данных</label>
        <input 
          v-model="localProps.dataSource" 
          type="text" 
          class="form-control form-control-sm"
          placeholder="ds_название"
          @input="emitUpdate"
        >
      </div>
      <div class="lcp-properties__field">
        <label class="lcp-properties__field-label">Колонки (JSON)</label>
        <textarea 
          v-model="columnsJson" 
          class="form-control form-control-sm font-monospace"
          rows="4"
          @input="updateColumns"
        ></textarea>
      </div>
    </template>

    <!-- Нет специфичных свойств -->
    <div v-if="!hasAnyProps" class="text-muted small">
      Нет настраиваемых свойств
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  props: { type: Object, default: () => ({}) },
  componentType: { type: String, default: '' }
})

const emit = defineEmits(['update'])

const localProps = ref({ ...props.props })
const columnsJson = ref(JSON.stringify(props.props.columns || [], null, 2))

// Определение доступных свойств по типу
const hasTextProp = computed(() => ['Text', 'Button', 'Link', 'Badge'].includes(props.componentType))
const hasTitleProp = computed(() => ['Card', 'Modal', 'Alert'].includes(props.componentType))
const hasLinkProp = computed(() => ['Button', 'Link', 'Image'].includes(props.componentType))
const hasIconProp = computed(() => ['Button', 'Link', 'StatCard', 'MenuItem'].includes(props.componentType))

const hasAnyProps = computed(() => {
  return hasTextProp.value || hasTitleProp.value || hasLinkProp.value || hasIconProp.value ||
    ['Heading', 'Image', 'Input', 'DataTable'].includes(props.componentType)
})

watch(() => props.props, (newProps) => {
  localProps.value = { ...newProps }
  columnsJson.value = JSON.stringify(newProps.columns || [], null, 2)
}, { deep: true })

function emitUpdate() {
  emit('update', { ...localProps.value })
}

function updateColumns() {
  try {
    localProps.value.columns = JSON.parse(columnsJson.value)
    emitUpdate()
  } catch (e) {
    // Невалидный JSON - не обновляем
  }
}
</script>


