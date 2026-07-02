<template>
  <div class="limitation-card">
    <div class="limitation-card__header">
      <h5 class="limitation-card__title">Управление ограничениями</h5>
    </div>
    <div class="limitation-card__body">
      <div class="row">
        <div class="col-md-6 mb-4">
          <h6 class="section-subtitle">Список страниц</h6>
          <div class="table-responsive">
            <table class="table table-hover align-middle limitation-table">
              <thead>
                <tr>
                  <th>Путь</th>
                  <th>Тип страницы</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(page, index) in pages" :key="index">
                  <td class="text-monospace">{{ page.path }}</td>
                  <td>
                    <SelectBox
                      v-model="page.type"
                      :options="PAGE_ACCESS_TYPE_OPTIONS"
                      value-key="id"
                      label-key="name"
                      :include-all-option="false"
                      fixed-trigger-label-font-size
                      @change="onPageTypeChange(page)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="col-md-6">
          <h6 class="section-subtitle">Компоненты</h6>
          <form @submit.prevent="addComponent" class="component-form">
            <div class="mb-2">
              <SelectBox
                id="pageSelect"
                v-model="newComponent.page_path"
                label="Выберите страницу:"
                :options="closedPagePathOptions"
                value-key="id"
                label-key="name"
                :include-all-option="false"
                fixed-trigger-label-font-size
              />
            </div>
            <div class="mb-2">
              <label for="componentId" class="form-label">ID компонента:</label>
              <input
                id="componentId"
                type="text"
                v-model="newComponent.id"
                class="form-control"
                required
              />
            </div>
            <button type="submit" class="btn btn-accent btn-sm">Добавить компонент</button>
          </form>

          <hr class="my-3" />

          <div class="table-responsive">
            <table class="table table-hover align-middle limitation-table">
              <thead>
                <tr>
                  <th>Страница</th>
                  <th>ID Компонента</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in components" :key="index">
                  <td class="text-monospace">{{ item.page_path }}</td>
                  <td>
                    <div v-if="editingIndex === index">
                      <input
                        type="text"
                        v-model="editingData"
                        class="form-control form-control-sm"
                        autofocus
                        @blur="saveEdit(index)"
                        @keyup.enter="saveEdit(index)"
                      />
                    </div>
                    <div v-else>{{ item.id }}</div>
                  </td>
                  <td>
                    <div class="d-flex gap-1">
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        @click="startEditing(index)"
                      >
                        Изменить
                      </button>
                      <button
                        class="btn btn-sm btn-outline-danger"
                        @click="$emit('delete-component', index, item.page_path, item.id)"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="components.length === 0">
                  <td colspan="3" class="text-center text-muted py-3">Нет добавленных компонентов</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import SelectBox from '@/components/SelectBox.vue'
import { AddPageComponent, UpdatePageComponent } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { PAGE_ACCESS_TYPE_OPTIONS, mapPagePathOptions } from '@/core/cms/js/adminSelectOptions.js'

const props = defineProps({
  pages: { type: Array, required: true },
  components: { type: Array, required: true }
})

const emit = defineEmits(['page-type-change', 'component-added', 'delete-component'])

const toast = useToast()
const editingIndex = ref(null)
const editingData = ref('')
const newComponent = ref({ page_path: '', id: '' })

const closedOrLimitedPages = computed(() => {
  return props.pages.filter((p) => p.type !== 'withoutliminations')
})

const closedPagePathOptions = computed(() => mapPagePathOptions(closedOrLimitedPages.value))

watch(
  closedPagePathOptions,
  (options) => {
    if (!newComponent.value.page_path && options.length) {
      newComponent.value.page_path = options[0].id
    }
  },
  { immediate: true },
)

function onPageTypeChange(page) {
  emit('page-type-change', page)
}

async function addComponent() {
  if (!newComponent.value.page_path || !newComponent.value.id) return

  const exists = props.components.some(
    (c) => c.page_path === newComponent.value.page_path && c.id === newComponent.value.id
  )
  if (exists) {
    toast.error('Такой компонент уже существует на этой странице')
    return
  }

  await AddPageComponent(newComponent.value.page_path, newComponent.value.id)
  emit('component-added', { ...newComponent.value })
  newComponent.value.id = ''
  toast.success('Компонент добавлен')
}

function startEditing(index) {
  if (editingIndex.value !== index || editingIndex.value === null) {
    editingIndex.value = index
    editingData.value = props.components[index].id
  } else {
    editingData.value = ''
    editingIndex.value = null
  }
}

async function saveEdit(index) {
  if (editingIndex.value === null) return

  const original = props.components[index]
  const updated = editingData.value

  await UpdatePageComponent(original.page_path, original.id, updated)
  props.components[index].id = updated

  editingIndex.value = null
  editingData.value = null
  toast.success('Компонент обновлен')
}
</script>

<style scoped>
.limitation-card {
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-primary-background);
}

.limitation-card__header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.limitation-card__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.limitation-card__body {
  padding: 1.25rem;
}

.section-subtitle {
  font-weight: 600;
  color: var(--color-secondary-text);
  margin-bottom: 0.75rem;
}

.limitation-table {
  border-collapse: separate;
  border-spacing: 0;
}

.limitation-table thead th {
  background: var(--color-secondary-background);
  color: var(--color-secondary-text);
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-bottom: 1px solid var(--color-border);
  padding: 0.6rem 0.75rem;
}

.limitation-table tbody tr {
  transition: background-color 0.15s ease;
}

.limitation-table tbody tr:hover {
  background-color: var(--color-hover-background);
}

.limitation-table tbody td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-primary-text);
}

.text-monospace {
  font-family: monospace;
  font-size: 0.875rem;
}

.component-form {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  background: var(--color-secondary-background);
}

.btn-accent {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.btn-accent:hover {
  opacity: 0.9;
}
</style>
