<template>
  <div class="container py-4" style="max-width: 720px;">
    <div class="mb-4">
      <router-link to="/lcp/modules" class="text-decoration-none d-inline-flex align-items-center gap-1 text-muted">
        <ArrowLeft :size="18" />
        Назад к модулям
      </router-link>
    </div>

    <div class="card border-0 shadow-sm">
      <div class="card-header bg-white">
        <h4 class="mb-0 d-flex align-items-center gap-2">
          <Plus class="text-primary" />
          Создать модуль
        </h4>
      </div>
      <div class="card-body">
        <form @submit.prevent="createModule">
          <!-- Название -->
          <div class="mb-3">
            <label class="form-label">Название модуля <span class="text-danger">*</span></label>
            <input 
              v-model="form.name" 
              type="text" 
              class="form-control"
              :class="{ 'is-invalid': errors.name }"
              placeholder="Например: CRM, Склад, Задачи"
              required
            >
            <div v-if="errors.name" class="invalid-feedback">{{ errors.name }}</div>
          </div>

          <!-- Slug -->
          <div class="mb-3">
            <label class="form-label">Slug (URL) <span class="text-danger">*</span></label>
            <div class="input-group">
              <span class="input-group-text">/lcp/</span>
              <input 
                v-model="form.slug" 
                type="text" 
                class="form-control"
                :class="{ 'is-invalid': errors.slug }"
                placeholder="crm"
                required
              >
            </div>
            <div v-if="errors.slug" class="invalid-feedback d-block">{{ errors.slug }}</div>
            <div class="form-text">Только латинские буквы, цифры и дефис</div>
          </div>

          <!-- Описание -->
          <div class="mb-3">
            <label class="form-label">Описание</label>
            <textarea 
              v-model="form.description" 
              class="form-control" 
              rows="3"
              placeholder="Краткое описание модуля"
            ></textarea>
          </div>

          <!-- Иконка и цвет -->
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Иконка</label>
              <select v-model="form.icon" class="form-select">
                <option v-for="icon in availableIcons" :key="icon" :value="icon">
                  {{ icon }}
                </option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">Цвет</label>
              <select v-model="form.color" class="form-select">
                <option value="primary">Primary (синий)</option>
                <option value="success">Success (зелёный)</option>
                <option value="danger">Danger (красный)</option>
                <option value="warning">Warning (жёлтый)</option>
                <option value="info">Info (голубой)</option>
                <option value="secondary">Secondary (серый)</option>
                <option value="dark">Dark (тёмный)</option>
              </select>
            </div>
          </div>

          <!-- Превью -->
          <div class="mb-4">
            <label class="form-label">Превью</label>
            <div class="d-flex align-items-center gap-3 p-3 bg-light rounded">
              <div 
                class="rounded-3 p-3"
                :class="`bg-${form.color} bg-opacity-10`"
              >
                <component :is="getIcon(form.icon)" :class="`text-${form.color}`" :size="32" />
              </div>
              <div>
                <h5 class="mb-0">{{ form.name || 'Название модуля' }}</h5>
                <small class="text-muted">/lcp/{{ form.slug || 'slug' }}</small>
              </div>
            </div>
          </div>

          <!-- Кнопки -->
          <div class="d-flex gap-2">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
              {{ saving ? 'Создание...' : 'Создать модуль' }}
            </button>
            <router-link to="/lcp/modules" class="btn btn-outline-secondary">
              Отмена
            </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as Icons from 'lucide-vue-next'
import { ArrowLeft, Plus } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import lcpApi from './js/api'

const router = useRouter()
const toast = useToast()

const form = ref({
  name: '',
  slug: '',
  description: '',
  icon: 'Box',
  color: 'primary'
})

const errors = ref({})
const saving = ref(false)

const availableIcons = [
  'Box', 'FolderKanban', 'Users', 'ShoppingCart', 'Package', 
  'FileText', 'Calendar', 'Settings', 'Database', 'BarChart3',
  'MessageSquare', 'Mail', 'Phone', 'MapPin', 'Globe',
  'Briefcase', 'Building', 'Truck', 'CreditCard', 'PieChart'
]

const getIcon = (name) => Icons[name] || Icons.Box

// Авто-генерация slug из названия
watch(() => form.value.name, (name) => {
  if (!form.value.slug || form.value.slug === slugify(form.value.name.slice(0, -1))) {
    form.value.slug = slugify(name)
  }
})

function slugify(text) {
  const translitMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  }
  
  return text
    .toLowerCase()
    .split('')
    .map(char => translitMap[char] || char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

async function createModule() {
  errors.value = {}
  
  // Валидация
  if (!form.value.name.trim()) {
    errors.value.name = 'Название обязательно'
    return
  }
  if (!form.value.slug.trim()) {
    errors.value.slug = 'Slug обязателен'
    return
  }
  if (!/^[a-z0-9-]+$/.test(form.value.slug)) {
    errors.value.slug = 'Только латинские буквы, цифры и дефис'
    return
  }
  
  saving.value = true
  try {
    const { data } = await lcpApi.modules.create(form.value)
    toast.success('Модуль создан!')
    router.push(`/lcp/editor/${data.slug}`)
  } catch (e) {
    if (e.response?.data) {
      errors.value = e.response.data
    } else {
      toast.error('Ошибка создания модуля')
    }
    console.error(e)
  } finally {
    saving.value = false
  }
}
</script>


