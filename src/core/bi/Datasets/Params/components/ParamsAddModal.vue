<template>
    <ModalCenter :title="modalTitle" :modal-id="props.modalId">
        <form @submit.prevent="onAdd">
            <div class="form-grid">
                <div class="mb-3">
                    <div class="form-label-container">
                        <label class="form-label">Название</label>
                        <HelpTooltip :size="18">
                            <div class="tooltip-title">Ограничения на имя параметра:</div>
                            <ul class="tooltip-list">
                                <li>Допускаются только латинские буквы (A–Z, a–z), цифры, знак тире "-" и нижнее подчёркивание "_".</li>
                                <li>Длина имени не должна превышать 36 символов.</li>
                                <li>Имя не должно начинаться с символа нижнего подчёркивания: <code>_name</code>.</li>
                                <li>Зарезервированные имена, которые нельзя использовать: <code>tab</code>, <code>state</code>, <code>mode</code>, <code>focus</code>, <code>grid</code>, <code>tz</code>, <code>from</code>, <code>to</code>.</li>
                            </ul>
                        </HelpTooltip>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <input v-model="name" type="text" class="form-control" :class="{ 'is-invalid': attemptedSubmit && isNameInvalid }" placeholder="" />
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">Тип</label>
                    <DataTypeCombobox v-model="type" />
                </div>

                <div class="mb-3">
                    <label class="form-label">Значение по умолчанию</label>
                    <template v-if="type === 'boolean'">
                        <div class="d-flex align-items-center gap-3">
                            <div class="form-check form-check-inline m-0">
                                <input class="form-check-input" :class="{ 'is-invalid': attemptedSubmit && isDefaultInvalid }" type="radio" name="defaultBool"
                                       :value="true" v-model="defaultValue" id="defaultBoolTrue">
                                <label class="form-check-label" for="defaultBoolTrue">True</label>
                            </div>
                            <div class="form-check form-check-inline m-0">
                                <input class="form-check-input" :class="{ 'is-invalid': attemptedSubmit && isDefaultInvalid }" type="radio" name="defaultBool"
                                       :value="false" v-model="defaultValue" id="defaultBoolFalse">
                                <label class="form-check-label" for="defaultBoolFalse">False</label>
                            </div>
                        </div>
                    </template>
                    <template v-else>
                        <input
                            v-model="defaultValue"
                            :type="inputType"
                            :step="inputStep"
                            :inputmode="inputMode"
                            class="form-control"
                            :class="{ 'is-invalid': attemptedSubmit && isDefaultInvalid }"
                            placeholder=""
                            @keydown="handleNumberKeydown"
                            @input="handleNumberInput"
                            @paste="handleNumberPaste"
                        />
                    </template>
                </div>
            </div>

            <div class="d-flex justify-content-end gap-2 mt-4">
                <button type="button" class="btn btn-light" data-bs-dismiss="modal">Отмена</button>
                <button type="submit" class="btn btn-primary" :disabled="attemptedSubmit && !canSubmit">{{ submitButtonText }}</button>
            </div>
        </form>
    </ModalCenter>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, defineExpose } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import { HelpCircle } from 'lucide-vue-next'
import DataTypeCombobox from '@/core/bi/components/combobox_datetype.vue'
import HelpTooltip from '@/core/bi/components/help_tooltip.vue'

const props = defineProps({
    modalId: { type: String, default: 'paramsAddModal' },
    existingNames: { type: Array, default: () => [] },
})

const emit = defineEmits(['submit', 'update'])

const name = ref('')
const type = ref('string')
const defaultValue = ref('')
const attemptedSubmit = ref(false)
const isEditMode = ref(false)
const editIndex = ref(null)
const originalName = ref('')


const inputType = computed(() => {
    if (type.value === 'integer' || type.value === 'float') return 'number'
    if (type.value === 'date') return 'date'
    if (type.value === 'datetime') return 'datetime-local'
    return 'text'
})

const inputStep = computed(() => {
    if (type.value === 'float') return 'any'
    if (type.value === 'integer') return '1'
    return undefined
})

const inputMode = computed(() => {
    if (type.value === 'float') return 'decimal'
    if (type.value === 'integer') return 'numeric'
    return undefined
})

const reservedNames = new Set(['tab','state','mode','focus','grid','tz','from','to'])

const isNameEmpty = computed(() => String(name.value || '').trim() === '')
const isNameTooLong = computed(() => String(name.value || '').length > 36)
const isNameStartsWithUnderscore = computed(() => String(name.value || '').startsWith('_'))
const isNamePatternInvalid = computed(() => !/^[A-Za-z0-9_-]+$/.test(String(name.value || '')))
const isNameReserved = computed(() => reservedNames.has(String(name.value || '').toLowerCase()))
const isNameDuplicate = computed(() => {
    const current = String(name.value || '')
    if (!current) return false
    const list = Array.isArray(props.existingNames) ? props.existingNames : []
    const skip = String(originalName.value || '')
    return list.some(n => String(n) === current && current !== skip)
})

const isNameInvalid = computed(() => {
    if (isNameEmpty.value) return true
    if (isNameTooLong.value) return true
    if (isNameStartsWithUnderscore.value) return true
    if (isNamePatternInvalid.value) return true
    if (isNameReserved.value) return true
    if (isNameDuplicate.value) return true
    return false
})

const isDefaultInvalid = computed(() => {
    const val = defaultValue.value
    if (type.value === 'boolean') return val === null || val === ''
    if (type.value === 'integer') {
        if (val === '' || val === null) return true
        return Number.isNaN(parseInt(val, 10))
    }
    if (type.value === 'float') {
        if (val === '' || val === null) return true
        return Number.isNaN(parseFloat(String(val).replace(',', '.')))
    }
    return String(val || '').trim() === ''
})

const canSubmit = computed(() => !isNameInvalid.value && !isDefaultInvalid.value)

const modalTitle = computed(() => isEditMode.value ? 'Редактирование параметра' : 'Добавление параметра')
const submitButtonText = computed(() => isEditMode.value ? 'Сохранить' : 'Добавить')

function resetForm() {
    name.value = ''
    type.value = 'string'
    defaultValue.value = ''
    attemptedSubmit.value = false
    isEditMode.value = false
    editIndex.value = null
    originalName.value = ''
}

function onAdd() {
    if (!canSubmit.value) {
        attemptedSubmit.value = true
        return
    }
    let emittedDefault = defaultValue.value
    if (type.value === 'integer' && emittedDefault !== '' && emittedDefault !== null) {
        emittedDefault = parseInt(emittedDefault, 10)
    }
    if (type.value === 'float' && emittedDefault !== '' && emittedDefault !== null) {
        emittedDefault = parseFloat(String(emittedDefault).replace(',', '.'))
    }
    if (isEditMode.value) {
        emit('update', {
            index: editIndex.value,
            name: name.value,
            type: type.value,
            default: emittedDefault,
        })
    } else {
        emit('submit', {
            name: name.value,
            type: type.value,
            default: emittedDefault,
        })
    }
    try {
        const anyWindow = window
        if (modalEl && anyWindow && anyWindow.bootstrap && anyWindow.bootstrap.Modal) {
            const instance = anyWindow.bootstrap.Modal.getOrCreateInstance(modalEl)
            instance.hide()
        } else if (modalEl) {
            const closeBtn = modalEl.querySelector('[data-bs-dismiss="modal"]')
            if (closeBtn && typeof closeBtn.click === 'function') {
                closeBtn.click()
            }
        }
    } catch (e) {
        // игнорируем ошибки закрытия модалки
    }
}

watch(type, (newType) => {
    if (newType === 'boolean') {
        // Не затираем уже установленное булево значение при редактировании
        if (typeof defaultValue.value !== 'boolean') {
            defaultValue.value = null
        }
    } else {
        defaultValue.value = ''
    }
})

let modalEl = null
let backdropEl = null
let escHandler = null
let dismissClickHandler = null
const onModalHidden = () => {
    resetForm()
}

onMounted(() => {
    modalEl = document.getElementById(props.modalId)
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', onModalHidden)
    }
})

onBeforeUnmount(() => {
    if (modalEl) {
        modalEl.removeEventListener('hidden.bs.modal', onModalHidden)
    }
    removeFallbackListeners()
})

function handleNumberKeydown(event) {
    if (type.value !== 'integer') return
    const blockedKeys = ['.', ',', 'e', 'E']
    if (blockedKeys.includes(event.key)) {
        event.preventDefault()
    }
}

function handleNumberInput(event) {
    if (type.value !== 'integer') return
    const value = String(event.target.value)
    let sanitized = value.replace(/[^0-9-]/g, '')
    sanitized = sanitized.replace(/(?!^)-/g, '')
    defaultValue.value = sanitized
}

function handleNumberPaste(event) {
    if (type.value !== 'integer') return
    const paste = (event.clipboardData || window.clipboardData).getData('text')
    if (/[.,]/.test(paste)) {
        event.preventDefault()
        const sanitized = paste.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '')
        const input = event.target
        const start = input.selectionStart
        const end = input.selectionEnd
        const current = String(input.value)
        input.value = current.slice(0, start) + sanitized + current.slice(end)
        // Тригерим обновление v-model
        defaultValue.value = input.value
    }
}

function showModalFallback(){
    if (!modalEl) return
    if (!modalEl.classList.contains('show')) {
        modalEl.style.display = 'block'
        modalEl.removeAttribute('aria-hidden')
        modalEl.setAttribute('aria-modal', 'true')
        modalEl.classList.add('show')
        document.body.classList.add('modal-open')
        backdropEl = document.createElement('div')
        backdropEl.className = 'modal-backdrop fade show'
        document.body.appendChild(backdropEl)
        addFallbackListeners()
    }
}

function hideModalFallback(){
    if (!modalEl) return
    modalEl.style.display = 'none'
    modalEl.setAttribute('aria-hidden', 'true')
    modalEl.removeAttribute('aria-modal')
    modalEl.classList.remove('show')
    document.body.classList.remove('modal-open')
    if (backdropEl && backdropEl.parentNode) {
        backdropEl.parentNode.removeChild(backdropEl)
    }
    backdropEl = null
    removeFallbackListeners()
    onModalHidden()
}

function addFallbackListeners(){
    if (!modalEl) return
    escHandler = (e) => {
        if (e.key === 'Escape') hideModal()
    }
    document.addEventListener('keydown', escHandler)
    dismissClickHandler = (e) => {
        const target = e.target
        if (!target) return
        const dismissEl = target.closest('[data-bs-dismiss="modal"]')
        if (dismissEl && modalEl.contains(dismissEl)) {
            e.preventDefault()
            hideModal()
        }
    }
    modalEl.addEventListener('click', dismissClickHandler)
    if (backdropEl) {
        backdropEl.addEventListener('click', hideModal)
    }
}

function removeFallbackListeners(){
    if (escHandler) {
        document.removeEventListener('keydown', escHandler)
        escHandler = null
    }
    if (dismissClickHandler && modalEl) {
        modalEl.removeEventListener('click', dismissClickHandler)
        dismissClickHandler = null
    }
    if (backdropEl) {
        backdropEl.removeEventListener('click', hideModal)
    }
}

function hideModal(){
    try{
        const anyWindow = window
        if (modalEl && anyWindow && anyWindow.bootstrap && anyWindow.bootstrap.Modal) {
            const instance = anyWindow.bootstrap.Modal.getOrCreateInstance(modalEl)
            instance.hide()
        } else {
            hideModalFallback()
        }
    }catch(_){
        hideModalFallback()
    }
}

function open(payload){
    if (!payload || !payload.row) return
    const row = payload.row
    isEditMode.value = true
    editIndex.value = payload.index
    name.value = row.name || ''
    originalName.value = row.name || ''
    type.value = row.type || 'string'
    if (type.value === 'boolean') {
        defaultValue.value = typeof row.defaultValue === 'boolean' ? row.defaultValue : null
    } else {
        defaultValue.value = row.defaultValue ?? ''
    }
    attemptedSubmit.value = false
    try {
        const anyWindow = window
        if (modalEl && anyWindow && anyWindow.bootstrap && anyWindow.bootstrap.Modal) {
            const instance = anyWindow.bootstrap.Modal.getOrCreateInstance(modalEl)
            instance.show()
        } else if (modalEl) {
            showModalFallback()
        }
    } catch (e) {
        showModalFallback()
    }
}

defineExpose({ open })
</script>

<style scoped lang="scss">
.form-grid{
    display: grid;
    grid-template-columns: 1fr;
}

.form-label-container{
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 0 0 8px 0;
}

.form-label-container .form-label{
    margin: 0;
    line-height: 1.2;
    display: inline-flex;
    align-items: center;
}

.form-label-container .lucide{
    display: flex;
    justify-content: center;
    align-items: center;
}


.select-icon{
    position: absolute;
    top: 50%;
    left: 12px;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

.lucide{
    vertical-align: middle;
}

.tooltip-title{
    font-weight: 600;
    margin-bottom: 6px;
}

.tooltip-list{
    margin: 0;
    padding-left: 18px;
}

.tooltip-list li{
    margin: 4px 0;
}
</style>

