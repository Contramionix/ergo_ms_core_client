<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Settings } from 'lucide-vue-next'
import Cookies from 'js-cookie'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'save'])

const expandAllGroups = ref(false)
const COOKIE_NAME = 'menu_panel_expand_all_groups'

// Управление прокруткой страницы
const disableBodyScroll = () => { 
  document.body.style.overflow = 'hidden' 
}

const enableBodyScroll = () => { 
  document.body.style.overflow = '' 
}

// Загрузка значения из куки
function loadFromCookie() {
  const value = Cookies.get(COOKIE_NAME)
  expandAllGroups.value = value === 'true'
}

// Сохранение значения в куку
function saveToCookie() {
  Cookies.set(COOKIE_NAME, expandAllGroups.value.toString(), { expires: 365 })
}

// Отслеживаем изменения show и управляем прокруткой
watch(() => props.show, (isOpen) => {
  if (isOpen) {
    disableBodyScroll()
    loadFromCookie()
  } else {
    enableBodyScroll()
  }
})

// Очищаем при размонтировании
onUnmounted(() => {
  enableBodyScroll()
})

// Инициализация при монтировании
onMounted(() => {
  loadFromCookie()
})

function handleSave() {
  saveToCookie()
  emit('save', expandAllGroups.value)
  emit('close')
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <div 
    v-if="show" 
    class="modal fade show d-block" 
    tabindex="-1"
    style="background-color: rgba(0, 0, 0, 0.5); z-index: 9999;"
    @click.self="handleClose"
  >
    <div class="modal-dialog modal-dialog-centered" style="z-index: 10000;">
      <div class="modal-content">
        <div class="modal-header border-0 pb-0">
          <div class="d-flex align-items-center gap-2">
            <Settings :size="24" class="text-primary" />
            <h5 class="modal-title mb-0">Настройки страницы</h5>
          </div>
          <button 
            type="button" 
            class="btn-close" 
            @click="handleClose"
            aria-label="Закрыть"
          ></button>
        </div>
        
        <div class="modal-body pt-2">
          <div class="form-check">
            <input 
              class="form-check-input" 
              type="checkbox" 
              :id="'expandAllGroups'"
              v-model="expandAllGroups"
            />
            <label class="form-check-label" :for="'expandAllGroups'">
              Раскрывать все родительские группы
            </label>
          </div>
        </div>
        
        <div class="modal-footer border-0 pt-2">
          <button 
            type="button" 
            class="btn btn-secondary" 
            @click="handleClose"
          >
            Отмена
          </button>
          <button 
            type="button" 
            class="btn btn-primary"
            @click="handleSave"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 9999 !important;
}

.modal-dialog {
  z-index: 10000 !important;
  position: relative !important;
}

.modal-content {
  border: none;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  z-index: 10001 !important;
  position: relative !important;
}

.modal-header, .modal-footer {
  padding: 1.5rem;
}

.modal-body {
  padding: 0 1.5rem 1rem;
  color: #6c757d;
}

.form-check {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  margin: 0;
}

.form-check-input {
  margin: 0;
  cursor: pointer;
  flex-shrink: 0;
  width: 1.25em;
  height: 1.25em;
  margin-top: 0.125em;
}

.form-check-label {
  cursor: pointer;
  user-select: none;
  margin: 0;
  line-height: 1.5;
  display: flex;
  align-items: center;
}

.btn {
  border-radius: 8px;
  font-weight: 500;
}

.btn-close:focus {
  box-shadow: none;
}
</style>

