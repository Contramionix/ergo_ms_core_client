<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Settings } from 'lucide-vue-next'
import Cookies from 'js-cookie'
import ModalCenter from '@/components/ModalCenter.vue'

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'save'])

const expandAllGroups = ref(false)
const COOKIE_NAME = 'menu_panel_expand_all_groups'

const disableBodyScroll = () => {
  document.body.style.overflow = 'hidden'
}

const enableBodyScroll = () => {
  document.body.style.overflow = ''
}

function loadFromCookie() {
  const value = Cookies.get(COOKIE_NAME)
  expandAllGroups.value = value === 'true'
}

function saveToCookie() {
  Cookies.set(COOKIE_NAME, expandAllGroups.value.toString(), { expires: 365 })
}

watch(() => props.show, (isOpen) => {
  if (isOpen) {
    disableBodyScroll()
    loadFromCookie()
  } else {
    enableBodyScroll()
  }
})

onUnmounted(() => {
  enableBodyScroll()
})

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
  <template v-if="show">
    <ModalCenter modal-id="menuSettingsModal" title="Настройки страницы" custom-class="show d-block" @closemodal="handleClose">
      <template #title>
        <Settings :size="24" class="text-primary" /><span>Настройки страницы</span>
      </template>
      <div class="form-check">
        <input class="form-check-input" type="checkbox" id="expandAllGroups" v-model="expandAllGroups"/>
        <label class="form-check-label" for="expandAllGroups">Раскрывать все родительские группы</label>
      </div>
      <div class="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
        <button type="button" class="btn btn-secondary" @click="handleClose">Отмена</button>
        <button type="button" class="btn btn-primary" @click="handleSave">Сохранить</button>
      </div>
    </ModalCenter>
    <div class="modal-backdrop fade show" @click="handleClose"></div>
  </template>
</template>

<style scoped>
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
</style>